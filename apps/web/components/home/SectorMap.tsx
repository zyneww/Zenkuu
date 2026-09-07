'use client'

import { Info } from 'lucide-react'
import { useMemo, useState } from 'react'


import { Link, type AppHref } from '@/i18n/navigation'
import { Money } from '@/components/locale/Money'
import { usePhrase } from '@/components/locale/ContentProvider'
import { squarify } from '@/components/tools/treemap'
import { useFormatters } from '@/components/locale/useFormatters'

/** Un actif à l'intérieur d'un secteur. Les deux grandeurs sont portées ensemble. */
export interface SectorAsset {
  id: string
  symbol: string
  name: string
  href: AppHref
  image?: string
  marketCap: number
  volume24h?: number
  change24h?: number
}

/** Un secteur, avec sa propre taille et les actifs que la source lui rattache. */
export interface SectorNode {
  id: string
  name: string
  href: AppHref
  marketCap: number
  volume24h?: number
  assets: SectorAsset[]
}

/**
 * Les deux grandeurs proposées par les onglets.
 *
 * DEUX ET NON TROIS, contrairement à la référence, et c'est une contrainte de source
 * assumée : elle publie des revenus, une valeur bloquée et des utilisateurs actifs
 * parce qu'elle instrumente les protocoles eux-mêmes. Nos secteurs viennent d'un
 * agrégateur de cotations, qui en publie deux. Un troisième onglet demanderait
 * d'inventer la grandeur qu'il affiche (§5).
 */
const METRICS = [
  { id: 'marketCap', label: 'Capitalisation' },
  { id: 'volume24h', label: 'Volume 24 h' },
] as const

type MetricId = (typeof METRICS)[number]['id']

/**
 * Teintes de secteur, dans l'ordre d'attribution.
 *
 * Les six jetons de série du design system, et rien d'autre — ce sont les seules
 * couleurs du site dont l'écart de teinte est réglé pour qu'on les distingue les unes
 * des autres. Au-delà de six secteurs, la roue recommence : deux groupes éloignés
 * partagent alors une teinte, ce qui est sans conséquence puisque chacun porte son
 * nom en clair.
 */
const HUES = [
  'var(--color-data-4)',
  'var(--color-data-1)',
  'var(--color-data-3)',
  'var(--color-data-6)',
  'var(--color-data-5)',
  'var(--color-data-2)',
] as const

/**
 * Fond d'une tuile : la teinte du secteur, versée dans le noir de fond.
 *
 * ⚠️ MÉLANGÉ AU `tile-ground` ET NON AU CANVAS. Les jetons de série s'inversent d'un
 * thème à l'autre — `--color-data-1` vaut #0284c7 en clair et #38bdf8 en sombre —, et
 * un mélange avec le canvas donnerait donc un pastel clair en thème clair, sous un
 * texte blanc. `--color-tile-ground` est sombre dans les deux thèmes, pour la même
 * raison que `--color-heat-*` : une tuile porte du texte blanc, toujours.
 *
 * `weight` monte avec la part de la tuile dans son secteur — la plus grosse est la
 * plus lumineuse. C'est ce qui donne à la figure sa lecture en un coup d'œil, avant
 * même qu'une étiquette ne soit lue.
 */
function tileFill(hue: string, weight: number): string {
  const percent = Math.round(16 + 40 * Math.min(1, Math.max(0, weight)))
  return `color-mix(in oklab, ${hue} ${percent}%, var(--color-tile-ground))`
}

/** Hauteur de la bande de titre d'un secteur, en pourcentage de la figure. */
const HEADER_SHARE = 11

/**
 * Une tuile POSÉE, c'est-à-dire ramenée aux coordonnées de la figure entière.
 *
 * `asset` vaut `null` pour la part du secteur que la source ne détaille pas — voir
 * l'en-tête du composant. Le type est déclaré plutôt qu'inféré parce que les deux
 * branches du `flatMap` qui le produit n'ont pas la même forme, et qu'une inférence
 * sur une union de tableaux ne se recolle pas.
 */
interface PlacedTile {
  key: string
  placed: { left: number; top: number; width: number; height: number }
  asset: SectorAsset | null
  value: number
  weight: number
}

/**
 * CARTE DES SECTEURS — la figure d'ouverture de l'explorateur.
 *
 * ── CE QU'ELLE MONTRE QUE LA CARTE THERMIQUE NE MONTRAIT PAS ────────────────
 *
 * `MarketHeatmap` range cent actifs par taille, à plat. On y lit qui pèse et qui
 * bouge, jamais OÙ : Aave et Morpho y sont deux rectangles voisins par hasard, alors
 * qu'ils font le même métier. La question « quel secteur porte le marché » n'y a pas
 * de réponse, et c'est celle que pose un lecteur qui arrive sans idée précise.
 *
 * Ici les secteurs sont les groupes, et les actifs vivent DEDANS. La surface d'un
 * groupe est celle du secteur entier ; les actifs qu'on sait y rattacher la
 * remplissent, le reste demeure en fond teinté.
 *
 * ── POURQUOI UNE PART DE CHAQUE GROUPE RESTE ANONYME ────────────────────────
 *
 * La source publie la capitalisation d'un secteur et, pour l'illustrer, TROIS de ses
 * actifs. Elle ne publie pas la composition complète. On pourrait remplir le groupe en
 * répartissant le reste à parts égales entre des tuiles muettes : ce serait une donnée
 * inventée. Le fond teinté dit exactement ce qu'on sait — « ce secteur pèse ceci, en
 * voici les figures de proue » — et rien de plus (§5).
 *
 * ── LE DEUXIÈME NIVEAU DE `squarify` NE COÛTE RIEN ──────────────────────────
 *
 * L'algorithme rend des boîtes en POURCENTAGES de 0 à 100. Les replacer dans le
 * rectangle d'un parent revient donc à une règle de trois par côté, sans recalcul et
 * sans mesure du DOM. C'est ce qui permet à la figure d'être entièrement rendue en CSS
 * et de suivre la largeur de sa colonne sans une ligne de JavaScript au redimensionnement.
 */
export function SectorMap({
  sectors,
  moreHref,
  note,
}: {
  sectors: SectorNode[]
  moreHref: AppHref
  /** Ce que la figure ne dit pas d'elle-même, en pied. Voir l'appelant. */
  note?: string
}) {
  const nombres = useFormatters()

  const t = usePhrase()
  const [metric, setMetric] = useState<MetricId>('marketCap')

  /* Le volume sectoriel n'est pas toujours publié. Proposer un onglet qui vide la
     figure serait pire que ne pas le proposer : on le retire quand la donnée manque. */
  const hasVolume = sectors.some((sector) => (sector.volume24h ?? 0) > 0)
  const active = hasVolume ? metric : 'marketCap'

  const groups = useMemo(() => {
    /* LA TEINTE SUIT LE SECTEUR, PAS SON RANG DU MOMENT. Attribuée à partir du
       classement de la grandeur active, elle changeait à chaque bascule d'onglet :
       le groupe vert devenait bleu, et l'œil croyait voir un secteur différent alors
       que seule la surface avait bougé. L'ordre de la prop est stable, il fait donc
       une meilleure clé. */
    const hueOf = new Map(sectors.map((sector, index) => [sector.id, HUES[index % HUES.length]]))

    const sized = sectors
      .map((sector) => ({ sector, value: sector[active] ?? 0 }))
      .filter((entry) => entry.value > 0)
      .sort((a, b) => b.value - a.value)

    const boxes = squarify(sized.map((entry) => ({ id: entry.sector.id, value: entry.value })))
    const byId = new Map(sized.map((entry) => [entry.sector.id, entry]))

    return boxes.flatMap((box) => {
      const entry = byId.get(box.id)
      if (!entry) return []

      const hue = (hueOf.get(box.id) ?? HUES[0]) as string

      /* La bande de titre est prélevée sur le HAUT du groupe, et les tuiles se
         partagent ce qui reste. Sur un groupe trop bas pour porter un titre lisible,
         elle est abandonnée — mieux vaut trois tuiles sans intitulé qu'un intitulé
         écrasé sur des tuiles invisibles. */
      const header = box.height >= HEADER_SHARE * 2 ? HEADER_SHARE : 0
      const innerTop = box.y + (box.height * header) / 100
      const innerHeight = box.height * (1 - header / 100)

      const assets = entry.sector.assets
        .map((asset) => ({ asset, value: asset[active] ?? 0 }))
        .filter((item) => item.value > 0)
        .sort((a, b) => b.value - a.value)

      const known = assets.reduce((sum, item) => sum + item.value, 0)

      /* Le reste du secteur — ce que la source ne détaille pas — occupe une tuile
         muette, dimensionnée par soustraction. Négative (les trois actifs illustrés
         pèsent parfois plus que l'agrégat publié, les deux relevés n'étant pas
         simultanés), elle disparaît plutôt que de fausser l'échelle. */
      const rest = Math.max(0, entry.value - known)

      const inner = squarify([
        ...assets.map((item) => ({ id: item.asset.id, value: item.value })),
        ...(rest > 0 ? [{ id: `${entry.sector.id}::rest`, value: rest }] : []),
      ])

      const byAsset = new Map(assets.map((item) => [item.asset.id, item]))
      const biggest = assets[0]?.value ?? 1

      return [
        {
          id: entry.sector.id,
          name: entry.sector.name,
          href: entry.sector.href,
          value: entry.value,
          hue,
          box,
          header,
          tiles: inner.map((cell): PlacedTile => {
            const item = byAsset.get(cell.id)

            return {
              key: cell.id,
              /* Coordonnées ramenées à la FIGURE : la boîte enfant est exprimée en
                 pourcentages de son parent, on la reporte donc dans le rectangle du
                 parent, lui-même en pourcentages du conteneur commun. */
              placed: {
                left: box.x + (box.width * cell.x) / 100,
                top: innerTop + (innerHeight * cell.y) / 100,
                width: (box.width * cell.width) / 100,
                height: (innerHeight * cell.height) / 100,
              },
              asset: item?.asset ?? null,
              value: item?.value ?? 0,
              weight: item ? item.value / biggest : 0,
            }
          }),
        },
      ]
    })
  }, [sectors, active])

  if (groups.length === 0) return null

  return (
    <div className="rounded-panel border border-border-subtle bg-panel">
      {/* ── EN-TÊTE : les onglets à gauche, la sortie à droite ─────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 pb-3 pt-3">
        <div className="flex items-center gap-1" role="tablist" aria-label={t('Grandeur mesurée')}>
          {(hasVolume ? METRICS : METRICS.slice(0, 1)).map((entry) => (
            <button
              key={entry.id}
              type="button"
              role="tab"
              aria-selected={active === entry.id}
              onClick={() => setMetric(entry.id)}
              className={`rounded-control px-2.5 py-1 text-xs font-medium transition-colors duration-150 ${
                active === entry.id
                  ? 'bg-surface-muted text-ink'
                  : 'text-ink-muted hover:bg-surface-muted hover:text-ink'
              }`}
            >
              {t(entry.label)}
            </button>
          ))}
        </div>

        <Link
          href={moreHref}
          className="shrink-0 text-xs font-medium text-ink transition-colors hover:text-brand"
        >
          {t('Voir l’aperçu complet')} <span aria-hidden="true">→</span>
        </Link>
      </div>

      {/* ── LA FIGURE ───────────────────────────────────────────────────────
          Hauteur fixe, positions en pourcentages : la figure suit la largeur de sa
          colonne sans qu'une seule mesure du DOM soit faite. */}
      <div className="relative h-[300px] w-full overflow-hidden px-1 pb-1 md:h-[340px]">
        <div className="relative h-full w-full">
          {groups.map((group) => (
            <div
              key={group.id}
              className="absolute overflow-hidden rounded-md"
              style={{
                left: `${group.box.x}%`,
                top: `${group.box.y}%`,
                width: `${group.box.width}%`,
                height: `${group.box.height}%`,
                padding: '1px',
                background: `color-mix(in oklab, ${group.hue} 10%, var(--color-tile-ground))`,
              }}
            >
              {group.header > 0 ? (
                <Link
                  href={group.href}
                  className="absolute inset-x-0 top-0 flex items-center gap-1.5 truncate px-1.5 text-micro font-medium text-white/85 transition-colors hover:text-white"
                  style={{ height: `${group.header}%` }}
                >
                  <span
                    className="h-1.5 w-1.5 shrink-0 rounded-pill"
                    style={{ background: group.hue }}
                    aria-hidden="true"
                  />
                  <span className="truncate">{group.name}</span>
                </Link>
              ) : (
                <span className="sr-only">{group.name}</span>
              )}
            </div>
          ))}

          {/* Les tuiles sont posées SUR les groupes plutôt que dedans : imbriquées,
              chaque tuile aurait dépendu de la taille rendue de son parent, ce qui
              impose un second système de coordonnées et un arrondi de plus. À plat,
              une seule échelle traverse toute la figure. */}
          {groups.flatMap((group) =>
            group.tiles.map((tile) => {
              const wide = tile.placed.width >= 7
              const tall = tile.placed.height >= 13

              if (!tile.asset) {
                return (
                  <div
                    key={`${group.id}-${tile.key}`}
                    aria-hidden="true"
                    className="absolute rounded-xs"
                    style={{
                      left: `${tile.placed.left}%`,
                      top: `${tile.placed.top}%`,
                      width: `${tile.placed.width}%`,
                      height: `${tile.placed.height}%`,
                      background: tileFill(group.hue, 0),
                      outline: '1px solid var(--color-tile-ground)',
                    }}
                  />
                )
              }

              const share = group.value > 0 ? tile.value / group.value : 0

              return (
                <Link
                  key={`${group.id}-${tile.key}`}
                  href={tile.asset.href}
                  title={tile.asset.name}
                  className="absolute overflow-hidden rounded-xs px-1 py-0.5 transition-[filter] duration-150 hover:brightness-125 focus-visible:brightness-125"
                  style={{
                    left: `${tile.placed.left}%`,
                    top: `${tile.placed.top}%`,
                    width: `${tile.placed.width}%`,
                    height: `${tile.placed.height}%`,
                    background: tileFill(group.hue, tile.weight),
                    outline: '1px solid var(--color-tile-ground)',
                  }}
                >
                  {wide && tall ? (
                    <span className="flex flex-col gap-0.5 leading-tight">
                      <span className="flex items-center gap-1">
                        {tile.asset.image ? (
                          /* eslint-disable-next-line @next/next/no-img-element -- logo distant, déjà dimensionné */
                          <img
                            src={tile.asset.image}
                            alt=""
                            aria-hidden="true"
                            loading="lazy"
                            className="h-3.5 w-3.5 shrink-0 rounded-pill"
                          />
                        ) : null}
                        <span className="truncate text-micro font-medium text-white">
                          {tile.asset.name}
                        </span>
                      </span>
                      <span className="tabular truncate text-micro text-white/70">
                        <Money value={tile.value} from="EUR" compact />
                        {share > 0 ? ` (${nombres.share(share * 100)})` : ''}
                      </span>
                    </span>
                  ) : (
                    <span className="sr-only">{tile.asset.name}</span>
                  )}
                </Link>
              )
            }),
          )}
        </div>
      </div>

      {note ? (
        <p className="flex items-start gap-1.5 border-t border-border-subtle px-4 py-2 text-micro text-ink-muted">
          <Info className="mt-px h-3 w-3 shrink-0" aria-hidden="true" />
          {note}
        </p>
      ) : null}
    </div>
  )
}
