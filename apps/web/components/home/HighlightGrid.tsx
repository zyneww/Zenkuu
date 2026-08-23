import type { ReactNode } from 'react'

import {
  MOVERS_UNIVERSE_SIZE,
  getCryptoOverview,
  getNewListings,
  getTopNarratives,
  getTrendingCrypto,
  type DataResult,
  type MarketCategory,
  type NewListing,
  type NewsItem,
} from '@zenkuu/data'
import { ChangeBadge, EmptyState } from '@zenkuu/ui'

import { HighlightPanel } from '@/components/home/HighlightPanel'
import { TrendingPanel } from '@/components/home/TrendingPanel'
import { Money } from '@/components/locale/Money'
import { Link } from '@/i18n/navigation'
import { assetHref } from '@/lib/asset-routes'
import { getContent, getPhrase } from '@/lib/content'

/**
 * Lignes par panneau.
 *
 * Cinq, et la valeur est commune aux six : la grille tient en deux rangées de trois,
 * et deux panneaux voisins de hauteurs différentes se lisent comme un défaut
 * d'alignement plutôt que comme une différence de contenu. C'est aussi la profondeur
 * de `HighlightPanel` et de `TrendingPanel`, qu'on ne redéfinit donc pas ici.
 */
export const ROWS = 5

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * LA GRILLE DE PANNEAUX — SIX MODULES DE MÊME POIDS, DEUX RANGÉES
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── CE QU'ELLE REPREND À COINGECKO, ET CE QU'ELLE EN DÉPLACE ────────────────
 *
 * Chez eux, ces six contenus vivent à TROIS endroits : deux panneaux de palmarès
 * collés au bloc de tête (« Trending », « Top Gainers »), une vue « Highlights »
 * qu'il faut activer par un interrupteur pour voir les quatre autres, et une colonne
 * latérale droite qui porte les narratifs et le fil d'actualités.
 *
 * Les trois sont réunis ici en UNE grille de six modules égaux. Trois raisons, et la
 * première est la seule qui compte vraiment :
 *
 *   · un contenu derrière un interrupteur n'existe pas pour la plupart des lecteurs.
 *     « Highlights » est éteint par défaut chez eux ; les nouvelles cotations et les
 *     plus fortes baisses ne sont donc jamais vues par quelqu'un qui ne sait pas
 *     qu'elles existent ;
 *   · une colonne latérale de 280 px impose une largeur fixe à tout le reste de la
 *     page — y compris au tableau, qui est ce qu'on vient lire. Les narratifs et les
 *     actualités n'ont pas besoin d'être PERSISTANTS, ils ont besoin d'être VUS ;
 *   · six modules de même poids ne hiérarchisent pas, et c'est correct ici : aucun
 *     de ces six n'a de raison de primer sur les cinq autres.
 *
 * ── LA SILHOUETTE QUI EN RÉSULTE ────────────────────────────────────────────
 *
 * Bandeau de cinq tuiles, grille de six modules, tableau pleine largeur. Aucune
 * colonne latérale, aucun interrupteur, aucun bloc de tête composé. C'est
 * l'inverse exact de la mise en page de la référence, à contenu identique.
 *
 * ── QUATRE APPELS, ET LE PLUS CHER EST DÉJÀ PAYÉ ────────────────────────────
 *
 * `getCryptoOverview` alimente ICI les hausses et les baisses, et alimente aussi le
 * TABLEAU plus bas — un seul appel réseau pour les trois, puisque les paramètres sont
 * identiques et que le cache applicatif les déduplique. Les trois autres touchent des
 * points de terminaison distincts et partent en parallèle.
 *
 * Le fil d'actualités, lui, arrive de la page : elle l'a déjà demandé pour son propre
 * compte, le redemander ici paierait deux fois la même agrégation.
 */
export async function HighlightGrid({ news }: { news: DataResult<NewsItem[]> }) {
  const fr = await getContent()
  const t = await getPhrase()

  const [overview, trending, listings, narratives] = await Promise.all([
    getCryptoOverview('eur', ROWS),
    getTrendingCrypto('eur'),
    getNewListings(ROWS),
    getTopNarratives(ROWS),
  ])

  return (
    <section
      aria-label={t('Points saillants du marché')}
      /* TROIS COLONNES FIXES et non `auto-fit` : le nombre de modules est connu et
         vaut six, donc la grille peut le dire. `auto-fit` en donnait cinq sur un écran
         large — les six modules se rangeaient en 5 + 1, le sixième s'étirant seul sur
         toute la largeur à côté de quatre colonnes vides. Deux rangées de trois se
         lisent comme un bloc ; une rangée orpheline se lit comme un défaut. */
      className="grid gap-3 md:grid-cols-2 xl:grid-cols-3"
    >
      <TrendingPanel
        assets={trending.ok ? trending.data : null}
        unavailableReason={trending.ok ? undefined : trending.reason}
      />

      <HighlightPanel
        title={fr.home.gainersTitle}
        assets={overview.ok ? overview.data.gainers : null}
        hint={fr.home.moversHint(MOVERS_UNIVERSE_SIZE)}
        href="/crypto?vue=gagnants"
        unavailableReason={overview.ok ? undefined : overview.reason}
        limit={ROWS}
      />

      <HighlightPanel
        title={fr.home.losersTitle}
        assets={overview.ok ? overview.data.losers : null}
        hint={fr.home.moversHint(MOVERS_UNIVERSE_SIZE)}
        href="/crypto?vue=perdants"
        unavailableReason={overview.ok ? undefined : overview.reason}
        limit={ROWS}
      />

      <ListingPanel result={listings} />

      <NarrativePanel result={narratives} />

      <NewsPanel result={news} />
    </section>
  )
}

/**
 * Cadre commun des trois panneaux écrits ici.
 *
 * Il reproduit celui de `HighlightPanel` et de `TrendingPanel` plutôt que de leur être
 * imposé : les deux existaient avant, leur en-tête porte un titre et un lien, et les
 * factoriser aurait demandé de toucher deux composants stables pour n'économiser que
 * six lignes de balisage. Ce qui doit rester identique — le fond, le filet, le rayon,
 * la gouttière — est écrit une fois ici et une fois là, et le jour où l'un des deux
 * bouge, la grille le montre immédiatement puisque les six panneaux se touchent.
 */
function Panel({
  title,
  hint,
  href,
  action,
  children,
}: {
  title: string
  hint?: string
  href?: string
  action?: string
  children: ReactNode
}) {
  return (
    <section className="flex h-full flex-col rounded-card border border-border-subtle bg-surface p-4">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-ink">{title}</h2>
          {hint ? <p className="mt-0.5 text-[0.6875rem] text-ink-muted">{hint}</p> : null}
        </div>
        {href && action ? (
          <Link
            href={href}
            prefetch={false}
            className="shrink-0 text-xs font-medium text-brand-strong hover:underline"
          >
            {action}
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  )
}

/**
 * NOUVELLES COTATIONS.
 *
 * La DATE N'EST PAS AFFICHÉE, et c'est un choix plutôt qu'un oubli. `firstDataAt` est
 * le premier relevé de PRIX connu de la source, pas la date de création du jeton ;
 * l'écrire dans une ligne de cinq colonnes obligerait à l'abréger, et une date abrégée
 * dans un panneau intitulé « nouvelles cotations » se lira « créé le » quoi qu'on
 * fasse. Le sous-titre dit ce que le classement contient réellement, et
 * `/nouvelles-cotations` a la place d'afficher la date avec sa légende.
 */
async function ListingPanel({ result }: { result: DataResult<NewListing[]> }) {
  const fr = await getContent()
  const t = await getPhrase()
  const rows = result.ok ? result.data.slice(0, ROWS) : []

  return (
    <Panel
      title={t('Nouvelles cotations')}
      hint={t('Les dernières entrées au catalogue de la source')}
      href="/nouvelles-cotations"
      action={fr.home.seeAll}
    >
      {rows.length > 0 ? (
        <ol className="flex flex-1 flex-col divide-y divide-border-subtle">
          {rows.map((row, index) => (
            <li key={row.id} className="flex-1">
              <Link
                href={assetHref('crypto', row.id)}
                prefetch={false}
                className="flex h-full items-center gap-2 py-1.5 transition-opacity hover:opacity-75"
              >
                <span className="tabular w-3 shrink-0 text-[0.6875rem] text-ink-muted">
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1 truncate text-xs font-medium text-ink">
                  {row.name}
                  <span className="ml-1 uppercase text-ink-muted">{row.symbol}</span>
                </span>
                <span className="tabular shrink-0 text-xs text-ink">
                  <Money value={row.price} from={row.currency} />
                </span>
                <span className="w-16 shrink-0 text-right">
                  <ChangeBadge value={row.change24h} size="sm" />
                </span>
              </Link>
            </li>
          ))}
        </ol>
      ) : (
        <EmptyState
          title={fr.states.unavailableTitle}
          description={result.ok ? null : result.reason}
          compact
        />
      )}
    </Panel>
  )
}

/**
 * SECTEURS LES PLUS ACTIFS.
 *
 * `getTopNarratives` classe sur la VALEUR ABSOLUE de la variation : un secteur qui
 * perd 9 % bouge autant qu'un qui en gagne 9, et n'en retenir que les hausses ferait
 * un panneau qui ne décrit le marché qu'un jour sur deux. Le titre du dictionnaire dit
 * « les plus actifs » et non « en hausse », ce qui est exactement ce que le classement
 * mesure.
 */
async function NarrativePanel({ result }: { result: DataResult<MarketCategory[]> }) {
  const fr = await getContent()
  const t = await getPhrase()
  const rows = result.ok ? result.data.slice(0, ROWS) : []

  return (
    <Panel
      title={fr.home.narrativesTitle}
      hint={t('Capitalisation du secteur supérieure à 1 Md $')}
      href="/categories"
      action={fr.home.seeAll}
    >
      {rows.length > 0 ? (
        <ol className="flex flex-1 flex-col divide-y divide-border-subtle">
          {rows.map((row, index) => (
            <li key={row.id} className="flex-1">
              <Link
                href={`/categories/${row.id}`}
                prefetch={false}
                className="flex h-full items-center gap-2 py-1.5 transition-opacity hover:opacity-75"
              >
                <span className="tabular w-3 shrink-0 text-[0.6875rem] text-ink-muted">
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1 truncate text-xs font-medium text-ink">
                  {row.name}
                </span>
                <span className="tabular shrink-0 text-xs text-ink-muted">
                  <Money value={row.marketCap} from="eur" compact />
                </span>
                <span className="w-16 shrink-0 text-right">
                  <ChangeBadge value={row.marketCapChange24h} size="sm" />
                </span>
              </Link>
            </li>
          ))}
        </ol>
      ) : (
        <EmptyState
          title={fr.states.unavailableTitle}
          description={result.ok ? null : result.reason}
          compact
        />
      )}
    </Panel>
  )
}

/**
 * FIL D'ACTUALITÉS — cinq titres, leur éditeur, leur date.
 *
 * ── PAS DE VIGNETTE, ET C'EST CE QUI LE DISTINGUE DE `NewsBoard` ────────────
 *
 * `NewsBoard` rend quatre cartes à couverture engendrée, pleine largeur, en bas de
 * page. Ici il faut cinq titres dans la hauteur d'un panneau de palmarès : une
 * couverture y prendrait la place de deux titres pour n'ajouter aucune information.
 * C'est la même donnée dans deux formes, et les deux formes ont chacune leur endroit.
 *
 * ── `<a>` NATIF, ET TROIS ATTRIBUTS QUI NE SONT PAS DÉCORATIFS ─────────────
 *
 * La destination est un site tiers, hors du routeur. `nofollow` en plus de
 * `noopener noreferrer` : nous CITONS ces éditeurs, nous ne leur transmettons pas de
 * signal de classement.
 */
async function NewsPanel({ result }: { result: DataResult<NewsItem[]> }) {
  const fr = await getContent()
  const rows = result.ok ? result.data.slice(0, ROWS) : []

  return (
    <Panel title={fr.home.newsTitle} href="/actualites" action={fr.home.seeAll}>
      {rows.length > 0 ? (
        <ol className="flex flex-1 flex-col divide-y divide-border-subtle">
          {rows.map((item) => (
            <li key={item.id} className="flex-1">
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="group flex h-full flex-col justify-center gap-0.5 py-1.5"
              >
                <span className="line-clamp-2 text-xs font-medium leading-snug text-ink group-hover:text-brand-strong">
                  {item.title}
                </span>
                <span className="text-[0.6875rem] text-ink-muted">
                  {item.source}
                  {item.publishedAt ? ` · ${item.publishedAt.slice(0, 10)}` : ''}
                </span>
              </a>
            </li>
          ))}
        </ol>
      ) : (
        <EmptyState
          title={fr.states.unavailableTitle}
          description={result.ok ? null : result.reason}
          compact
        />
      )}
    </Panel>
  )
}
