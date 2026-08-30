'use client'

import { useState } from 'react'

import type { AssetClass, MarketAsset } from '@zenkuu/data'
import { EmptyState } from '@zenkuu/ui'

import { usePhrase } from '@/components/locale/ContentProvider'
import { MarketTable, type WatchlistContext } from '@/components/market/MarketTable'
import { Link } from '@/i18n/navigation'

/**
 * Un classement déjà chargé, pour une classe d'actif.
 *
 * `assets` VIDE et `reason` renseigné décrivent une classe sans source — l'état normal
 * des NFT aujourd'hui (§5). Les deux champs ne se contredisent jamais parce que la
 * page ne les construit qu'à partir d'un seul `DataResult`.
 */
export interface ClassBoardEntry {
  assetClass: AssetClass
  label: string
  href: string
  assets: MarketAsset[]
  reason: string | null
}

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * RANGÉE DE CLASSES + TABLEAU — LE CŒUR DE L'ACCUEIL
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── CE QUE C'EST, ET D'OÙ ÇA VIENT ──────────────────────────────────────────
 *
 * La forme est celle de tokenomist.ai/overview : une rangée de pastilles au-dessus
 * d'un tableau dense, qui recharge le tableau sans quitter la page. Le CONTENU des
 * pastilles, lui, n'a rien de commun avec les leurs — ils y mettent des narratifs
 * crypto (« DeFi », « Layer 2 », « Liquid Restaking »), nous y mettons les sept
 * classes d'actifs qui structurent réellement le site. C'est la seule découpe dont
 * chaque pastille mène à des données que nous possédons.
 *
 * ── POURQUOI PAS DE PASTILLE « TOUT » ───────────────────────────────────────
 *
 * Parce qu'il n'existe pas de classement mélangé. Les sept classes viennent de trois
 * fournisseurs distincts (CoinGecko, Yahoo, BCE), chacun avec sa propre notion de
 * capitalisation — celle d'une paire de devises n'existe pas, celle d'un indice n'a
 * pas le même sens que celle d'une action. Un « Tout » trié par capitalisation
 * mettrait donc côte à côte des nombres qui ne se comparent pas. La crypto ouvre à sa
 * place : c'est la classe la plus fournie et de loin la plus consultée.
 *
 * ── L'ÉTAT EST LOCAL, ET LES DONNÉES SONT TOUTES DÉJÀ LÀ ────────────────────
 *
 * Les sept classements arrivent AVEC la page, dans un seul rendu serveur. Changer de
 * pastille ne déclenche donc aucune requête : le tableau se réaffiche, point. C'est
 * ce qui permet de ne pas passer par l'URL — et donc de ne pas rendre la page
 * dynamique, ce qui lui coûterait son cache de trois minutes pour tout le monde.
 *
 * Le prix est un paquet plus lourd : sept classements courts au lieu d'un. C'est
 * pourquoi la page n'en demande que quinze lignes par classe, quand `/marches` en
 * sert cinquante — l'accueil montre une tête de classement, pas un classement.
 *
 * ── UN SEUL TABLEAU EST MONTÉ À LA FOIS ─────────────────────────────────────
 *
 * `MarketTable` tient des préférences de colonnes par instance. Rendre les sept et
 * n'en montrer qu'un ferait vivre sept jeux de préférences concurrents pour un seul
 * tableau visible — et paierait sept fois le coût d'hydratation. On ne monte que la
 * classe active.
 */
export function ClassBoard({
  boards,
  watchlist,
}: {
  boards: ClassBoardEntry[]
  watchlist?: WatchlistContext
}) {
  const t = usePhrase()
  const [active, setActive] = useState<AssetClass>(boards[0]?.assetClass ?? 'crypto')

  const board = boards.find((entry) => entry.assetClass === active) ?? boards[0]
  if (!board) return null

  return (
    <section className="flex flex-col gap-4">
      {/* ── LA RANGÉE DE PASTILLES ──────────────────────────────────────────
          `role="tablist"` et non une simple liste de boutons : ces sept commandes
          pilotent une seule zone de contenu, et c'est exactement ce qu'un lecteur
          d'écran doit entendre. `aria-controls` désigne le tableau, dont l'identifiant
          ne change pas d'une classe à l'autre — c'est le même panneau qui se remplit.

          `overflow-x-auto` + `scrollbar-none` : à sept pastilles la rangée tient sur
          un écran d'ordinateur mais déborde sur un téléphone. Elle défile alors du
          doigt, comme celle de la référence, plutôt que de passer à la ligne — deux
          rangées de pastilles se liraient comme deux niveaux de filtre. */}
      <div
        role="tablist"
        aria-label={t('Classes d’actifs')}
        className="scrollbar-none -mx-1 flex items-center gap-1.5 overflow-x-auto px-1 py-0.5"
      >
        {boards.map((entry) => {
          const selected = entry.assetClass === active
          return (
            <button
              key={entry.assetClass}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls="accueil-cotations"
              onClick={() => setActive(entry.assetClass)}
              className={`h-[30px] shrink-0 rounded-pill border px-3.5 text-sm transition-colors duration-150 ${
                selected
                  ? 'border-brand/45 bg-brand-soft font-medium text-brand'
                  : 'border-border-subtle bg-surface text-ink-muted hover:border-ink-muted/40 hover:text-ink'
              }`}
            >
              {entry.label}
            </button>
          )
        })}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-sm font-normal text-ink-muted">
            {t('Cotations — {classe}').replace('{classe}', board.label)}
          </h3>
          <Link
            href={board.href}
            className="shrink-0 text-sm text-ink transition-colors hover:text-brand"
          >
            {t('Tout voir')} <span aria-hidden="true">→</span>
          </Link>
        </div>

        {/* `id` STABLE d'une classe à l'autre : c'est le même panneau qui change de
            contenu, et `aria-controls` ci-dessus le désigne par ce nom. */}
        <div id="accueil-cotations" role="tabpanel">
          {board.assets.length > 0 ? (
            <MarketTable
              /* `key` sur la classe : sans elle, React réutilise l'instance d'un
                 tableau à l'autre et garde les préférences de colonnes de la classe
                 précédente — une colonne « Capitalisation » restait alors demandée sur
                 les devises, qui n'en ont pas. */
              key={board.assetClass}
              assets={board.assets}
              assetClass={board.assetClass}
              page={1}
              perPage={board.assets.length}
              sortBy="marketCap"
              direction="desc"
              /* Le tri par en-tête écrit dans l'URL et recharge la page : il n'a pas de
                 sens ici, où la page ne lit aucun paramètre. Le lecteur qui veut trier
                 suit « Tout voir ». */
              sortable={false}
              paginated={false}
              basePath={board.href}
              chartPosition="end"
              {...(watchlist ? { watchlist } : {})}
            />
          ) : (
            <EmptyState
              title={t('Aucune cotation pour cette classe')}
              description={board.reason}
              compact
            />
          )}
        </div>
      </div>
    </section>
  )
}
