'use client'

import { Plus, X } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { useMemo, useState } from 'react'

import type { AssetClass, MarketAsset } from '@zenkuu/data'
import { ChangeBadge, formatPercent } from '@zenkuu/ui'

import { AssetLogo } from '@/components/asset/AssetLogo'
import { COMPARE_LIMIT } from '@/lib/limits'
import { AreaPlot } from '@/components/charts/AreaPlot'
import { dataColor } from '@/components/charts/chart-theme'
import { Money } from '@/components/locale/Money'
import { AssetPicker } from '@/components/tools/AssetPicker'
import {
  alignSeries,
  offsetLabel,
  offsetTick,
  windowLabel,
} from '@/components/tools/compare-series'
import { assetHref } from '@/lib/asset-routes'

/**
 * Comparateur de deux à six actifs, TOUTES CLASSES CONFONDUES.
 *
 * ⚠️ LE GRAPHIQUE EST EN BASE 100, PAS EN PRIX. Superposer les cours bruts de Bitcoin
 * et d'un jeton à 0,003 € donnerait une ligne plate et une ligne collée à l'axe :
 * l'échelle serait dictée par le plus cher, et la forme du second serait invisible.
 * En ramenant chaque série à 100 à son premier point, on compare ce qui est
 * comparable — la TRAJECTOIRE — et l'axe devient lisible pour tous.
 *
 * Conséquence à dire : l'axe des ordonnées n'affiche pas des euros. C'est écrit sous
 * le graphique, faute de quoi le lecteur lira « 118 » comme un prix.
 *
 * ── LA RESTRICTION À LA CRYPTO EST LEVÉE, ET CE N'EST PAS UN SIMPLE ÉLARGISSEMENT ─
 *
 * La page annonçait auparavant : « Rapprocher une action et une cryptomonnaie
 * supposerait de mettre en regard des champs que deux sources ne définissent pas de la
 * même façon. » L'argument était bon, et il tenait sur DEUX obstacles distincts qu'il
 * confondait en un seul.
 *
 *   1. LES CHAMPS ABSENTS. Yahoo ne publie pas la capitalisation d'une action — elle
 *      vit derrière un endpoint fermé. Ce n'est pas une incompatibilité de définition,
 *      c'est un trou : la ligne s'affiche « — », comme partout ailleurs sur le site.
 *      Une ligne vide est honnête ; refuser toute la comparaison pour l'éviter ne
 *      l'était pas davantage, cela cachait aussi les huit lignes qui, elles, se
 *      comparent parfaitement.
 *
 *   2. LES CHAMPS QUI NE VEULENT PAS DIRE LA MÊME CHOSE. Le « volume » d'une place
 *      boursière se compte en TITRES échangés, celui d'un agrégateur crypto en
 *      monnaie. Les aligner dans une même ligne serait faux. Ceux-là sont donc
 *      marqués : voir `Scope` plus bas, qui décide ligne par ligne.
 *
 * Le troisième obstacle, lui, n'avait pas été vu : les SÉRIES ne couvrent pas la même
 * durée d'une source à l'autre. Il est traité dans `compare-series.ts`.
 *
 * ── POURQUOI LE PLAFOND S'ARRÊTE À SIX, MÊME EN OFFRE PRO ────────────────────
 *
 * Ce n'est pas une limite technique mais une limite de LISIBILITÉ, et c'est pour ça
 * qu'elle existe des deux côtés. La palette de données compte six teintes ordonnées
 * par distance perceptuelle (§3.1) : à la septième, deux courbes deviendraient
 * indiscernables et la comparaison — l'objet même de la page — cesserait de
 * fonctionner. Vendre « jusqu'à dix actifs » serait vendre un graphique illisible.
 *
 * Quatre en offre gratuite, six en offre Pro : le §2 promet « 2 à 4 », la promesse
 * est donc tenue sans abonnement, et l'abonnement AJOUTE deux emplacements plutôt
 * que d'en reprendre.
 */

/**
 * Ce qu'une ligne du tableau exige pour être comparable entre classes.
 *
 * `always` : la grandeur a le même sens partout — un cours est un cours, une variation
 * en pourcentage aussi.
 *
 * `sameClass` : la grandeur existe partout mais ne se DÉFINIT pas pareil. Le volume en
 * est le cas d'école — titres échangés d'un côté, montant en monnaie de l'autre — et
 * le rang aussi : « 4ᵉ » ne dit rien si l'on ne sait pas 4ᵉ de quoi. Ces lignes ne
 * s'affichent que si tous les actifs comparés relèvent d'une même classe.
 */
type Scope = 'always' | 'sameClass'

export function ComparatorView({ assets }: { assets: MarketAsset[] }) {
  /* Un seul plafond désormais : l'abonnement qui en distinguait deux a été retiré
     du site. Voir `lib/limits.ts`. */
  const max = COMPARE_LIMIT

  const [selected, setSelected] = useState<string[]>(() =>
    assets.slice(0, 2).map((asset) => asset.id),
  )

  const chosen = useMemo(
    () =>
      selected
        .map((id) => assets.find((asset) => asset.id === id))
        .filter((asset): asset is MarketAsset => asset !== undefined),
    [assets, selected],
  )

  /* Une seule classe parmi les actifs retenus : la condition d'affichage des lignes
     `sameClass`. Calculé sur les actifs CHOISIS et non sur l'univers — c'est la
     comparaison en cours qui décide, pas ce qui serait comparable en théorie. */
  const classes = new Set(chosen.map((asset) => asset.assetClass))
  const homogeneous = classes.size <= 1

  /*
   * Une série sans durée déclarée est ÉCARTÉE, et non supposée de sept jours.
   *
   * Le champ s'appelle `sparkline7d` par héritage, mais trois sources l'alimentent avec
   * trois profondeurs différentes. Retomber sur sept jours pour celle qui ne le déclare
   * pas reviendrait à inventer l'échelle de temps d'une courbe — exactement le défaut
   * que `compare-series` existe pour corriger.
   */
  const alignment = useMemo(
    () =>
      alignSeries(
        chosen
          .filter((asset) => asset.sparkline7d && asset.sparklineSpanDays)
          .map((asset) => ({
            id: asset.id,
            values: asset.sparkline7d as number[],
            spanDays: asset.sparklineSpanDays as number,
          })),
      ),
    [chosen],
  )

  /**
   * Bornes de l'axe des ordonnées, calculées sur les séries réellement affichées.
   *
   * Sans elles, l'échelle par défaut part de zéro : sur sept jours, des trajectoires
   * comprises entre 99 et 101 se retrouvent écrasées en une ligne plate en haut du
   * cadre, et la comparaison — l'objet même de la page — devient illisible. Un axe
   * qui part de zéro n'est honnête que si zéro veut dire quelque chose ; ici, la
   * référence est 100, et c'est l'ÉCART à 100 qu'on lit.
   */
  const domain = useMemo<[number, number]>(() => {
    const values = (alignment?.series ?? []).flatMap((entry) =>
      entry.points.map((point) => point.y),
    )
    if (values.length === 0) return [90, 110]

    const min = Math.min(...values)
    const max = Math.max(...values)
    // Fenêtre minimale de deux points de pourcentage : une journée sans mouvement
    // donnerait sinon un domaine de largeur nulle, et un tracé collé à une seule
    // ligne de pixels.
    const pad = Math.max((max - min) * 0.12, 1)
    return [min - pad, max + pad]
  }, [alignment])

  /* Les couleurs suivent l'ordre de SÉLECTION et non celui du tracé : un actif dont
     la série manque ne sort pas du graphique en décalant la teinte de ses voisins. */
  const colorOf = (id: string) => dataColor(selected.indexOf(id))

  const plotSeries = useMemo(
    () =>
      (alignment?.series ?? []).map((entry) => ({
        id: entry.id,
        label: chosen.find((asset) => asset.id === entry.id)?.name ?? entry.id,
        color: colorOf(entry.id),
        points: entry.points,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `colorOf` se recalcule avec `selected`
    [alignment, chosen, selected],
  )

  function add(asset: MarketAsset) {
    setSelected((current) =>
      current.includes(asset.id) || current.length >= max ? current : [...current, asset.id],
    )
  }

  function remove(id: string) {
    // Toujours au moins un actif : une comparaison vide n'a rien à montrer, et le
    // graphique disparaîtrait sans que le lecteur comprenne pourquoi.
    setSelected((current) => (current.length > 1 ? current.filter((entry) => entry !== id) : current))
  }

  return (
    <div className="space-y-6">
      {/*
        ── LA SÉLECTION EST UNE RANGÉE DE CARTES, PLUS UNE LISTE DE PASTILLES ────

        Elle tenait en deux rangées de puces : les actifs retenus d'un côté, une
        douzaine de « + BTC » de l'autre, avec un champ de recherche entre les deux.
        Trois défauts qui se voient à l'usage :

          · les candidats proposés étaient les douze PREMIERS de l'univers, sans
            logo ni classe — une liste de sigles qu'il fallait décoder ;
          · rien ne reliait la couleur d'une courbe à l'actif qu'elle trace, sinon
            un carré de deux pixels ;
          · retirer un actif se faisait en cliquant sur son nom, ce qui est le geste
            que tout le reste du site réserve à « ouvrir ».

        Une carte par actif résout les trois : elle porte le logo, le nom, la classe,
        le cours, sa teinte en bandeau, et une croix qui ne veut dire que « retirer ».
        La dernière carte est le bouton d'ajout, qui ouvre le sélecteur commun du site
        — celui du convertisseur, avec sa recherche, ses groupes et son clavier.
      */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold text-ink">
            Actifs comparés ({chosen.length}/{max})
          </h2>

          {/*
            L'ANCIENNE INVITATION À S'ABONNER A DISPARU AVEC L'ABONNEMENT.

            Elle s'affichait au plafond et proposait d'en relever la limite. Il n'y a
            plus qu'un seul plafond, le même pour tout le monde ; le signaler ne
            mènerait donc nulle part. Le compteur « n/6 » du titre suffit à dire où
            l'on en est.
          */}
          {chosen.length >= max ? (
            <p className="text-xs text-ink-muted">Maximum atteint</p>
          ) : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {chosen.map((asset) => (
            <SlotCard
              key={asset.id}
              asset={asset}
              color={colorOf(asset.id)}
              onRemove={chosen.length > 1 ? () => remove(asset.id) : undefined}
            />
          ))}

          {chosen.length < max ? (
            <AssetPicker
              assets={assets}
              selectedIds={selected}
              onSelect={add}
              mode="multiple"
              disabledReason={(asset) =>
                selected.includes(asset.id)
                  ? 'déjà comparé'
                  : selected.length >= max
                    ? 'limite atteinte'
                    : null
              }
              triggerClassName="flex h-full min-h-[4.5rem] w-full items-center justify-center gap-2 rounded-card border border-dashed border-border-subtle bg-surface px-3 py-2.5 text-sm text-ink-muted transition-colors hover:border-brand hover:text-ink focus:border-brand focus:outline-none"
            >
              {() => (
                <>
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Ajouter un actif
                </>
              )}
            </AssetPicker>
          ) : null}
        </div>
      </div>

      {alignment ? (
        <div className="rounded-card border border-border-subtle bg-surface p-3">
          {/* Repère à 100 : la ligne de départ commune. Sans elle, on lit des courbes
              sans savoir de quel côté de la référence elles passent. */}
          <AreaPlot
            series={plotSeries}
            height={320}
            axes
            grid
            yDomain={domain}
            referenceLines={[100]}
            formatY={(value) => value.toFixed(1).replace('.', ',')}
            formatX={offsetTick}
            formatTooltipX={offsetLabel}
            formatTooltipY={(value) =>
              `${value.toFixed(1).replace('.', ',')} (${formatPercent(value - 100)})`
            }
          />

          <p className="mt-2 text-xs leading-relaxed text-ink-muted">
            <strong className="text-ink">{windowLabel(alignment.windowDays)}</strong>, chaque
            série ramenée à <strong className="text-ink">100</strong> au début de la période.
            L’axe ne porte donc pas des euros mais un écart relatif : 118 signifie « +18 %
            depuis le début de la période ». C’est le seul moyen de superposer des actifs
            dont les cours diffèrent d’un facteur mille.
            {!homogeneous ? (
              <>
                {' '}
                La fenêtre est celle de la série la plus courte : les sources ne publient
                pas toutes la même profondeur, et l’étendre obligerait à inventer le début
                des autres. Les actifs cotés en bourse n’y apparaissent qu’en paliers —
                une clôture par séance, rien entre deux.
              </>
            ) : null}
          </p>
        </div>
      ) : (
        <p className="rounded-card border border-border-subtle bg-surface px-4 py-10 text-center text-sm text-ink-muted">
          La source ne publie pas de série récente pour les actifs sélectionnés.
        </p>
      )}

      <div className="overflow-x-auto rounded-card border border-border-subtle">
        {/* PAS DE COLONNES PRIORITAIRES ICI — et c'est le seul tableau du site dans ce
            cas. Les colonnes SONT les actifs que le lecteur a lui-même choisis :
            en masquer une reviendrait à retirer de la comparaison ce qu'il vient d'y
            mettre. Le défilement latéral reste donc la réponse, mais le plancher de
            576 pixels disparaît sous `sm` : à deux actifs, le tableau tient dans un
            téléphone et n'a aucune raison de défiler. */}
        <table className="w-full border-collapse text-sm sm:min-w-[36rem]">
          <caption className="sr-only">Comparaison chiffrée</caption>
          <thead>
            <tr className="border-b border-border-subtle text-left">
              <th scope="col" className="px-3 py-2.5 text-xs font-medium text-ink-muted">
                Indicateur
              </th>
              {chosen.map((asset) => (
                <th key={asset.id} scope="col" className="px-3 py-2.5 text-right">
                  <Link
                    href={assetHref(asset.assetClass, asset.id)}
                    className="inline-flex items-center gap-1.5 text-ink hover:text-brand-strong"
                  >
                    <AssetLogo asset={asset} size={18} />
                    <span className="font-medium">{asset.symbol.toUpperCase()}</span>
                  </Link>
                  <span
                    className="mt-1 block h-0.5 w-full"
                    style={{ backgroundColor: colorOf(asset.id) }}
                    aria-hidden="true"
                  />
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-border-subtle">
            <Row label="Cours" scope="always" homogeneous={homogeneous}>
              {chosen.map((asset) => (
                <Cell key={asset.id}>
                  <Money value={asset.price} from={asset.currency} />
                </Cell>
              ))}
            </Row>

            {/* Le rang est INTERNE à une classe : « 4ᵉ » ne veut rien dire si l'un est
                4ᵉ crypto et l'autre 4ᵉ action. */}
            <Row label="Rang dans sa classe" scope="sameClass" homogeneous={homogeneous}>
              {chosen.map((asset) => (
                <Cell key={asset.id}>{asset.rank !== undefined ? `#${asset.rank}` : '—'}</Cell>
              ))}
            </Row>

            <Row label="Capitalisation" scope="always" homogeneous={homogeneous}>
              {chosen.map((asset) => (
                <Cell key={asset.id}>
                  <Money value={asset.marketCap} from={asset.currency} compact />
                </Cell>
              ))}
            </Row>

            {/* Volume : titres échangés en bourse, montant en monnaie chez les
                agrégateurs crypto. Deux grandeurs, un seul mot — la ligne disparaît
                dès que la comparaison mêle les classes. */}
            <Row label="Volume 24 h" scope="sameClass" homogeneous={homogeneous}>
              {chosen.map((asset) => (
                <Cell key={asset.id}>
                  <Money value={asset.volume24h} from={asset.currency} compact />
                </Cell>
              ))}
            </Row>

            <Row
              label="Rotation (volume / capitalisation)"
              scope="sameClass"
              homogeneous={homogeneous}
            >
              {chosen.map((asset) => (
                <Cell key={asset.id}>
                  {(asset.marketCap ?? 0) > 0 && asset.volume24h !== undefined
                    ? `${((asset.volume24h / (asset.marketCap as number)) * 100).toFixed(1).replace('.', ',')} %`
                    : '—'}
                </Cell>
              ))}
            </Row>

            {/* Les variations en pourcentage se comparent SANS RÉSERVE : ce sont des
                rapports sans unité, et le sens de « +3 % sur 24 h » est le même pour
                une action et pour un jeton. C'est le socle du tableau multi-classes. */}
            <Row label="Variation 24 h" scope="always" homogeneous={homogeneous}>
              {chosen.map((asset) => (
                <Cell key={asset.id}>
                  <ChangeBadge value={asset.change24h} size="sm" />
                </Cell>
              ))}
            </Row>
            <Row label="Variation 7 j" scope="always" homogeneous={homogeneous}>
              {chosen.map((asset) => (
                <Cell key={asset.id}>
                  <ChangeBadge value={asset.change7d} size="sm" />
                </Cell>
              ))}
            </Row>
            <Row label="Variation 30 j" scope="always" homogeneous={homogeneous}>
              {chosen.map((asset) => (
                <Cell key={asset.id}>
                  <ChangeBadge value={asset.change30d} size="sm" />
                </Cell>
              ))}
            </Row>

            <Row label="Plus haut 24 h" scope="always" homogeneous={homogeneous}>
              {chosen.map((asset) => (
                <Cell key={asset.id}>
                  <Money value={asset.high24h} from={asset.currency} />
                </Cell>
              ))}
            </Row>
            <Row label="Plus bas 24 h" scope="always" homogeneous={homogeneous}>
              {chosen.map((asset) => (
                <Cell key={asset.id}>
                  <Money value={asset.low24h} from={asset.currency} />
                </Cell>
              ))}
            </Row>

            <Row label="Offre en circulation" scope="sameClass" homogeneous={homogeneous}>
              {chosen.map((asset) => (
                <Cell key={asset.id}>
                  {asset.circulatingSupply !== undefined
                    ? new Intl.NumberFormat('fr-FR', {
                        notation: 'compact',
                        maximumFractionDigits: 1,
                      }).format(asset.circulatingSupply)
                    : '—'}
                </Cell>
              ))}
            </Row>
            <Row label="Part de l’offre maximale" scope="sameClass" homogeneous={homogeneous}>
              {chosen.map((asset) => (
                <Cell key={asset.id}>
                  {/* Rapport de deux valeurs publiées, pas une estimation : il dit
                      quelle part des jetons prévus circule déjà. Absent dès que l'une
                      des deux manque — beaucoup de jetons n'ont pas d'offre maximale. */}
                  {asset.maxSupply && asset.circulatingSupply
                    ? `${((asset.circulatingSupply / asset.maxSupply) * 100).toFixed(0)} %`
                    : '—'}
                </Cell>
              ))}
            </Row>
          </tbody>
        </table>
      </div>

      {!homogeneous ? (
        <p className="max-w-2xl text-xs leading-relaxed text-ink-muted">
          Certaines lignes disparaissent quand la comparaison mêle plusieurs classes —
          volume, rang, offre. Ce n’est pas une donnée manquante mais une grandeur qui
          change de définition : le volume d’une place boursière se compte en titres
          échangés, celui d’un agrégateur crypto en monnaie. Les aligner donnerait un
          rapport sans signification.
        </p>
      ) : null}
    </div>
  )
}

/**
 * Carte d'un actif retenu.
 *
 * La teinte est un BANDEAU sur toute la largeur et non une pastille : c'est elle qui
 * relie la carte à sa courbe, et une pastille de huit pixels perdue dans un coin ne
 * fait pas ce lien à trois mètres d'un écran.
 */
function SlotCard({
  asset,
  color,
  onRemove,
}: {
  asset: MarketAsset
  color: string
  /** Absent sur le dernier actif : une comparaison vide n'a rien à montrer. */
  onRemove?: (() => void) | undefined
}) {
  return (
    <div className="relative overflow-hidden rounded-card border border-border-subtle bg-surface">
      <span className="block h-1 w-full" style={{ backgroundColor: color }} aria-hidden="true" />

      <div className="flex items-start gap-2.5 p-3">
        <AssetLogo asset={asset} size={28} />

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-ink">{asset.name}</p>
          <p className="text-xs text-ink-muted">
            <span className="uppercase">{asset.symbol}</span>
            <span className="mx-1.5 text-border-subtle">·</span>
            {CLASS_SHORT[asset.assetClass]}
          </p>
          <p className="tabular mt-1 flex items-baseline gap-2 text-sm text-ink">
            <Money value={asset.price} from={asset.currency} />
            <ChangeBadge value={asset.change24h} size="sm" />
          </p>
        </div>

        {onRemove ? (
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Retirer ${asset.name} de la comparaison`}
            className="shrink-0 rounded-control p-1 text-ink-muted transition-colors duration-150 hover:bg-surface-muted hover:text-ink"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        ) : null}
      </div>
    </div>
  )
}

/** Libellés courts : la carte est étroite, « Matières premières » y tiendrait mal. */
const CLASS_SHORT: Record<AssetClass, string> = {
  crypto: 'Crypto',
  stock: 'Action',
  etf: 'ETF',
  index: 'Indice',
  commodity: 'Matière première',
  forex: 'Devise',
  nft: 'NFT',
}

function Row({
  label,
  scope,
  homogeneous,
  children,
}: {
  label: string
  scope: Scope
  homogeneous: boolean
  children: React.ReactNode
}) {
  /* La ligne DISPARAÎT au lieu d'afficher « — » : un tiret dit « la source ne publie
     pas », alors qu'ici la grandeur existe pour chaque actif — c'est sa comparaison
     qui n'a pas de sens. Deux absences différentes ne doivent pas se ressembler. */
  if (scope === 'sameClass' && !homogeneous) return null

  return (
    <tr className="transition-colors duration-150 hover:bg-surface-muted/60">
      <th scope="row" className="px-3 py-2.5 text-left text-xs font-normal text-ink-muted">
        {label}
      </th>
      {children}
    </tr>
  )
}

function Cell({ children }: { children: React.ReactNode }) {
  return <td className="tabular px-3 py-2.5 text-right text-ink">{children}</td>
}
