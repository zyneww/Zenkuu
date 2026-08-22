'use client'

import { useMemo, useState } from 'react'

import type { AssetClass, MarketAsset } from '@zenkuu/data'
import { EmptyState } from '@zenkuu/ui'

import {
  CompareAnalysis,
  SupplyAnalysis,
  VolumeAnalysis,
} from '@/components/home/analyses/ClassAnalyses'
import { usePhrase } from '@/components/locale/ContentProvider'
import { MarketTable } from '@/components/market/MarketTable'
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
 * ESPACE DE MARCHÉ — PASTILLES, TABLEAU, ET LES TROIS ANALYSES QUI SUIVENT
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── POURQUOI UN SEUL COMPOSANT PLUTÔT QUE TROIS ─────────────────────────────
 *
 * La rangée de pastilles, le tableau et les trois cartes d'analyse partagent UN état :
 * la classe sélectionnée. Le découper en composants frères aurait demandé de remonter
 * cet état dans un parent qui n'aurait rien fait d'autre, ou de le pousser dans un
 * contexte pour un seul niveau de profondeur. Il vit donc là où il est lu.
 *
 * ── LA FORME VIENT DE tokenomist.ai/overview, LE CONTENU EST À NOUS ─────────
 *
 * Chez eux, la rangée de pastilles porte des narratifs crypto et recharge tous les
 * blocs situés en dessous. Ici elle porte les sept CLASSES D'ACTIF qui structurent
 * réellement le site — c'est la seule découpe dont chaque pastille mène à des données
 * que nous possédons.
 *
 * ── POURQUOI PAS DE PASTILLE « TOUT » ───────────────────────────────────────
 *
 * Parce qu'il n'existe pas de classement mélangé. Les sept classes viennent de trois
 * fournisseurs (CoinGecko, Yahoo, BCE), chacun avec sa propre notion de
 * capitalisation — celle d'une paire de devises n'existe pas, celle d'un indice n'a
 * pas le même sens que celle d'une action. Un « Tout » trié par capitalisation
 * mettrait côte à côte des nombres qui ne se comparent pas.
 *
 * ── L'ÉTAT EST LOCAL, ET LES DONNÉES SONT TOUTES DÉJÀ LÀ ────────────────────
 *
 * Les sept classements arrivent AVEC la page, dans un seul rendu serveur. Changer de
 * pastille ne déclenche donc aucune requête, et les trois analyses se recalculent dans
 * la foulée. C'est ce qui permet de ne pas passer par l'URL — et donc de ne pas rendre
 * la page dynamique, ce qui lui coûterait son cache de trois minutes pour tout le monde.
 */
export function MarketWorkspace({ boards }: { boards: ClassBoardEntry[] }) {
  const t = usePhrase()
  const [active, setActive] = useState<AssetClass>(boards[0]?.assetClass ?? 'crypto')
  /*
   * ── « ÉCHANGEABLES SEULEMENT » ────────────────────────────────────────────
   *
   * Reprend la place de leur interrupteur « Top 300 », avec un critère qui a plus de
   * sens chez nous. Un actif référencé n'est pas forcément un actif qui S'ÉCHANGE :
   * beaucoup de lignes portent un cours hérité de la dernière transaction connue,
   * parfois vieille de plusieurs jours, avec un volume nul depuis. Elles gonflent les
   * classements et faussent les moyennes des analyses situées en dessous.
   *
   * Le critère est un VOLUME 24 H STRICTEMENT POSITIF. C'est le seul dont nous
   * disposons, et il ne suppose rien : soit la source publie un volume, soit non.
   *
   * ÉTEINT par défaut, contrairement au leur. Allumé d'entrée, il retirerait des
   * lignes sans que le lecteur ait demandé quoi que ce soit — et sur les classes dont
   * la source ne publie AUCUN volume, il viderait le tableau entier.
   */
  const [tradableOnly, setTradableOnly] = useState(false)

  const board = boards.find((entry) => entry.assetClass === active) ?? boards[0]

  const assets = useMemo(() => {
    const rows = board?.assets ?? []
    if (!tradableOnly) return rows
    return rows.filter((asset) => (asset.volume24h ?? 0) > 0)
  }, [board, tradableOnly])

  if (!board) return null

  return (
    <div className="flex flex-col gap-5">
      {/* ── LA RANGÉE DE PASTILLES ──────────────────────────────────────────
          `role="tablist"` et non une simple liste de boutons : ces sept commandes
          pilotent une seule zone de contenu, et c'est exactement ce qu'un lecteur
          d'écran doit entendre.

          `overflow-x-auto` + `scrollbar-none` : à sept pastilles la rangée tient sur
          un écran d'ordinateur mais déborde sur un téléphone. Elle défile alors du
          doigt, comme celle de la référence, plutôt que de passer à la ligne — deux
          rangées de pastilles se liraient comme deux niveaux de filtre. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          role="tablist"
          aria-label={t('Classes d’actifs')}
          className="scrollbar-none -mx-1 flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto px-1 py-0.5"
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

        {/* INTERRUPTEUR — un vrai `<button>` porteur de `aria-pressed`, et non une
            case à cocher déguisée. `aria-pressed` est ce qui fait annoncer « activé »
            ou « désactivé » par un lecteur d'écran sur un bouton à deux états. */}
        <button
          type="button"
          aria-pressed={tradableOnly}
          onClick={() => setTradableOnly((value) => !value)}
          title={t(
            'N’afficher que les actifs dont la source publie un volume sur 24 heures',
          )}
          className="flex shrink-0 items-center gap-2 text-sm text-ink-muted transition-colors hover:text-ink"
        >
          <span
            aria-hidden="true"
            className={`relative h-[18px] w-8 shrink-0 rounded-pill transition-colors duration-150 ${
              tradableOnly ? 'bg-brand' : 'bg-surface-muted'
            }`}
          >
            <span
              className={`absolute top-[3px] size-3 rounded-pill bg-panel transition-all duration-150 ${
                tradableOnly ? 'left-[17px]' : 'left-[3px]'
              }`}
            />
          </span>
          {t('Échangeables seulement')}
        </button>
      </div>

      {/* ── LE TABLEAU ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-normal text-ink-muted">
            {t('Cotations — {classe}').replace('{classe}', board.label)}
          </h2>
          <Link
            href={board.href}
            className="shrink-0 text-sm text-brand transition-colors hover:text-brand-strong"
          >
            {t('Tout voir')} <span aria-hidden="true">→</span>
          </Link>
        </div>

        {/* `id` STABLE d'une classe à l'autre : c'est le même panneau qui change de
            contenu, et `aria-controls` plus haut le désigne par ce nom. */}
        <div id="accueil-cotations" role="tabpanel">
          {assets.length > 0 ? (
            <MarketTable
              /* `key` sur la classe : sans elle, React réutilise l'instance d'un
                 tableau à l'autre et garde les préférences de colonnes de la classe
                 précédente — une colonne « Capitalisation » restait alors demandée
                 sur les devises, qui n'en ont pas. */
              key={board.assetClass}
              assets={assets}
              assetClass={board.assetClass}
              page={1}
              perPage={assets.length}
              sortBy="marketCap"
              direction="desc"
              /* Le tri par en-tête écrit dans l'URL et recharge la page : il n'a pas
                 de sens ici, où la page ne lit aucun paramètre. Le lecteur qui veut
                 trier suit « Tout voir ». */
              sortable={false}
              paginated={false}
              basePath={board.href}
              chartPosition="end"
            />
          ) : (
            <EmptyState
              title={
                tradableOnly
                  ? t('Aucun actif échangeable dans cette classe')
                  : t('Aucune cotation pour cette classe')
              }
              description={
                tradableOnly
                  ? t('La source de cette classe ne publie pas de volume sur 24 heures.')
                  : board.reason
              }
              compact
            />
          )}
        </div>
      </div>

      {/* ── LES TROIS ANALYSES QUI SUIVENT LA PASTILLE ──────────────────────
          Deux colonnes à partir de 1280 px, comme la grille d'analyses de la
          référence. En dessous, une seule : deux figures côte à côte sur un écran
          d'ordinateur portable rendent les libellés d'abscisse illisibles. */}
      <div className="grid items-start gap-4 xl:grid-cols-2">
        <div className="flex flex-col gap-4">
          <SupplyAnalysis assets={assets} label={board.label} />
        </div>
        <div className="flex flex-col gap-4">
          <VolumeAnalysis assets={assets} label={board.label} />
          <CompareAnalysis assets={assets} label={board.label} />
        </div>
      </div>
    </div>
  )
}
