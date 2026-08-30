'use client'

/*
 * `'use client'` alors que ce module ne tient aucun état, et la raison n'est pas
 * cosmétique.
 *
 * `SpotExchangesTable` est importé par `SpotExchangesExplorer`, qui est un composant
 * client : son code part donc dans le navigateur, où `getPhrase()` — qui lit la locale
 * de la requête serveur — lève « `getLocale` is not supported in Client Components ».
 * L'erreur ne se voit ni au typage ni à la compilation, seulement au rendu.
 *
 * `SpotExchangesPanel`, lui, est rendu par une page serveur. Un même module ne peut
 * pas servir `getPhrase()` d'un côté et `usePhrase()` de l'autre : on tranche pour le
 * client, que le serveur sait rendre, plutôt que l'inverse.
 */

import { ArrowRight } from 'lucide-react'

import type { SpotExchange } from '@zenkuu/data'

import { Link } from '@/i18n/navigation'
import type { ExchangeSortKey } from '@/components/market/SpotExchangesExplorer'
import { SortableHeader, type SortState } from '@/components/ui/SortableTable'
import { usePhrase } from '@/components/locale/ContentProvider'

/**
 * Répartition du volume au comptant entre les places de marché.
 *
 * ⚠️ LE POINT DÉLICAT EST LE DÉNOMINATEUR. Le pourcentage affiché est la part de
 * chaque place dans le total des places AFFICHÉES, pas dans le marché mondial : la
 * source classe des centaines de plateformes, on en montre quelques dizaines. Écrire
 * « part de marché » serait faux d'un facteur inconnu. La colonne s'intitule donc
 * « part du volume affiché », et l'en-tête rappelle sur combien de places.
 *
 * Le volume est en BITCOIN parce que c'est l'unité dans laquelle la source le publie.
 * Le convertir en euros supposerait de choisir un cours et un instant — une mesure
 * deviendrait une estimation (§5).
 *
 * La note de confiance est reprise telle quelle, attribuée. C'est un jugement de la
 * source sur la qualité de la liquidité annoncée, pas une mesure : la présenter comme
 * un chiffre neutre au milieu des volumes serait la faire passer pour ce qu'elle
 * n'est pas, d'où la mention explicite sous le tableau.
 */
export function SpotExchangesPanel({ exchanges }: { exchanges: SpotExchange[] }) {
  const t = usePhrase()
  if (exchanges.length === 0) return null

  return (
    <section className="space-y-4" aria-labelledby="places-titre">
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
        <div className="min-w-0 space-y-1">
          <h2 id="places-titre" className="display-md text-ink">{t('Où s’échange le marché au comptant')}</h2>
          <p className="max-w-3xl text-sm leading-relaxed text-ink-muted">
            Les {exchanges.length} premières places par note de confiance, et le volume
            qu’elles déclarent sur 24 heures. ZENKUU ne référence aucun carnet d’ordres et
            ne permet aucune transaction : ce tableau situe l’activité, il n’y donne pas accès.
          </p>
        </div>

        {/* L'extrait DIT qu'il est un extrait. Sans ce lien, un lecteur arrivé ici
            croirait le classement complet et repartirait avec un dessus de panier pour
            un marché — c'est la même économie que le « voir en détail » des palmarès. */}
        <Link
          href="/places"
          className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-control px-2 text-sm font-medium text-ink transition-colors duration-150 hover:bg-surface-muted"
        >
          Le registre complet
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>

      <SpotExchangesTable exchanges={exchanges} />
    </section>
  )
}

/**
 * Le tableau seul, sans titre ni chapeau.
 *
 * Séparé du panneau parce que `/places` lui donne son PROPRE titre de niveau 1 : y
 * empiler le `h2` du panneau produirait deux titres pour un seul tableau, et un plan
 * de page où la section serait le sous-titre d'elle-même.
 */
export function SpotExchangesTable({
  exchanges,
  /*
   * DÉNOMINATEUR IMPOSÉ DE L'EXTÉRIEUR, et c'est la seule façon de paginer sans
   * mentir. Quand `SpotExchangesExplorer` ne passe qu'une tranche, le total calculé
   * ici ne serait que celui de cette tranche : la part affichée page 2 serait
   * rapportée à vingt-cinq places au lieu de cent. Voir la note de l'explorateur.
   */
  shareTotal,
  /** Rang de la première ligne — la numérotation doit survivre au changement de page. */
  startRank = 1,
  /*
   * TRI FACULTATIF, et il faut qu'il le soit.
   *
   * Ce tableau sert à deux endroits : le registre complet de `/places`, où il est
   * trié et paginé par `SpotExchangesExplorer`, et l'extrait de vingt-cinq lignes de
   * `/mouvements`, rendu CÔTÉ SERVEUR. Rendre le tri obligatoire aurait imposé
   * à l'extrait de devenir un composant client pour une fonction dont il n'a pas
   * l'usage — il montre un dessus de panier, pas un classement à explorer.
   *
   * Sans ces deux propriétés, les en-têtes restent donc de simples libellés.
   */
  sort,
  onToggleSort,
}: {
  exchanges: SpotExchange[]
  shareTotal?: number
  startRank?: number
  sort?: SortState<ExchangeSortKey> | null
  onToggleSort?: (key: ExchangeSortKey) => void
}) {
  const t = usePhrase()
  const total = shareTotal ?? exchanges.reduce((sum, exchange) => sum + exchange.volume24hBtc, 0)
  if (total <= 0) return null

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-card">
        {/* Colonnes prioritaires sous `sm` — voir la note de `MarketTable`. Ne restent
            que la place, son volume et sa part ; la barre de part est élastique, elle
            absorbe seule le rétrécissement. */}
        <table className="w-full border-collapse text-sm sm:min-w-[38rem]">
          <thead>
            <tr className="border-b border-border-subtle text-left">
              <HeadCell
                label="Place"
                sortKey="name"
                align="left"
                sort={sort}
                onToggle={onToggleSort}
              />
              <HeadCell
                label={t('Volume 24 h (BTC)')}
                sortKey="volume"
                sort={sort}
                onToggle={onToggleSort}
              />
              <HeadCell
                label={t('Part du volume affiché')}
                sortKey="share"
                align="left"
                sort={sort}
                onToggle={onToggleSort}
              />
              <HeadCell
                label="Confiance"
                sortKey="trust"
                className="hidden sm:table-cell"
                sort={sort}
                onToggle={onToggleSort}
              />
              <HeadCell
                label="Pays"
                sortKey="country"
                className="hidden lg:table-cell"
                sort={sort}
                onToggle={onToggleSort}
              />
            </tr>
          </thead>

          <tbody className="divide-y divide-border-subtle">
            {exchanges.map((exchange, index) => {
              const share = (exchange.volume24hBtc / total) * 100

              return (
                <tr key={exchange.id} className="transition-colors duration-150 hover:bg-surface-muted">
                  <td className="px-3 py-2.5">
                    <span className="flex items-center gap-2">
                      <span className="tabular w-5 shrink-0 text-xs text-ink-muted">
                        {startRank + index}
                      </span>
                      {exchange.image ? (
                        // eslint-disable-next-line @next/next/no-img-element -- vignettes servies par la source, hors domaines optimisés
                        <img
                          src={exchange.image}
                          alt=""
                          width={20}
                          height={20}
                          loading="lazy"
                          className="shrink-0 rounded-pill"
                        />
                      ) : null}

                      {/*
                        ── LE NOM MÈNE À LA PLACE, ET SORT DU SITE ───────────────────

                        La demande était de « pouvoir cliquer et être redirigé vers le
                        marché sélectionné ». Ce site n'a PAS de fiche par place — il
                        n'en a jamais eu, et en fabriquer une reviendrait à créer une
                        page par plateforme sans donnée propre à y mettre. Le lien mène
                        donc là où se trouve réellement le marché : chez la place
                        elle-même, dont la source publie l'adresse.

                        ── LE NOM MÈNE DÉSORMAIS À NOTRE FICHE, PAS AU SITE ─────

                        Il pointait vers la plateforme elle-même, en `nofollow` — un
                        choix cohérent avec le §1 tant qu'il n'existait rien chez nous
                        à quoi renvoyer. `/places/[id]` existe maintenant : profil,
                        volume, paires cotées, note de confiance.

                        Envoyer hors du site depuis un classement était surtout un
                        aller SANS RETOUR : on quittait le tableau pour une page
                        commerciale, et il fallait revenir en arrière pour comparer la
                        place suivante. La fiche garde le lecteur dans le même
                        registre, et c'est ELLE qui porte le lien sortant — une fois,
                        au bon endroit, toujours en `nofollow`.
                      */}
                      <Link
                        href={`/places/${exchange.id}`}
                        /*
                          PRÉCHARGEMENT COUPÉ, ET C'EST MESURÉ.

                          Next précharge tout `<Link>` qui ENTRE DANS LE CHAMP DE VISION,
                          en production uniquement — d'où un défaut invisible en
                          développement. Chaque ligne de ce tableau mène à `/places/[id]`,
                          une route dynamique dont le rendu interroge la source.

                          Relevé sur `/mouvements` en build de production : 23 requêtes de
                          préchargement, dont HUIT rendus complets de fiches de place, pour
                          un clic au plus. Elles passent par le même limiteur de débit que
                          la page qu'on est en train de lire — le préchargement affamait
                          donc le rendu courant, qui dépassait 120 secondes.

                          `false` coupe le viewport ET le survol. C'est le bon arbitrage
                          ici : une navigation légèrement moins instantanée, contre huit
                          rendus serveur épargnés à chaque affichage du tableau. Voir
                          OPTIMISATION.md, section « Réseau ».
                        */
                        prefetch={false}
                        className="truncate font-medium text-ink transition-colors duration-150 hover:text-brand"
                      >
                        {exchange.name}
                      </Link>
                    </span>
                  </td>

                  <td className="tabular px-3 py-2.5 text-right text-ink">
                    {new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(
                      exchange.volume24hBtc,
                    )}
                  </td>

                  <td className="px-3 py-2.5">
                    <span className="flex items-center gap-2">
                      {/* La barre est le vrai support de lecture : elle rend la
                          concentration du marché immédiate là où une colonne de
                          pourcentages demande de comparer chiffre à chiffre. */}
                      <span
                        className="h-1.5 flex-1 overflow-hidden rounded-pill bg-surface-muted"
                        role="img"
                        aria-label={`${share.toFixed(1)} % du volume affiché`}
                      >
                        <span
                          className="block h-full rounded-pill bg-brand"
                          style={{ width: `${Math.min(100, share).toFixed(2)}%` }}
                        />
                      </span>
                      <span className="tabular w-12 shrink-0 text-right text-xs text-ink-muted">
                        {share.toFixed(1)}&#8239;%
                      </span>
                    </span>
                  </td>

                  <td className="tabular hidden px-3 py-2.5 text-right text-ink-muted sm:table-cell">
                    {exchange.trustScore !== undefined ? `${exchange.trustScore}/10` : '—'}
                  </td>

                  <td className="hidden px-3 py-2.5 text-right text-xs text-ink-muted lg:table-cell">
                    {exchange.country ?? '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs leading-relaxed text-ink-muted">{t('La note de confiance est un jugement publié par la source sur la qualité de la liquidité déclarée — pas une mesure, et pas un avis de ZENKUU. Les volumes sont ceux annoncés par les places elles-mêmes.')}</p>
    </div>
  )
}

/**
 * En-tête de colonne, TRIABLE OU NON selon ce que l'appelant fournit.
 *
 * Le tableau sert deux contextes — le registre trié de `/places` et l'extrait rendu
 * côté serveur de `/mouvements` — et cette bascule est ce qui lui permet de
 * n'exister qu'en un seul exemplaire. Sans elle, il aurait fallu deux tableaux jumeaux
 * qui auraient divergé au premier ajustement de colonne.
 *
 * Le libellé et les classes de visibilité sont écrits UNE fois, dans les deux cas :
 * c'est précisément ce qui garantit que la version non triable ne se met pas à cacher
 * « Pays » à un point de rupture différent de l'autre.
 */
function HeadCell({
  label,
  sortKey,
  sort,
  onToggle,
  align = 'right',
  className = '',
}: {
  label: string
  sortKey: ExchangeSortKey
  sort?: SortState<ExchangeSortKey> | null
  onToggle?: (key: ExchangeSortKey) => void
  align?: 'left' | 'right'
  className?: string
}) {
  if (!onToggle) {
    return (
      <th
        scope="col"
        className={`px-3 py-2.5 text-[length:var(--v2-text-2xs)] font-semibold text-ink-muted ${align === 'right' ? 'text-right' : 'text-left'} ${className}`}
      >
        {label}
      </th>
    )
  }

  return (
    <SortableHeader
      label={label}
      sortKey={sortKey}
      sort={sort ?? null}
      onToggle={onToggle}
      align={align}
      className={className}
    />
  )
}
