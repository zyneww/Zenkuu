'use client'

import { Star } from 'lucide-react'
import { useMemo, useState } from 'react'

import type { AssetClass, MarketAsset } from '@zenkuu/data'
import { EmptyState } from '@zenkuu/ui'

import { CHANGE_PERIODS, periodMeta, type ChangePeriod } from '@/components/market/crypto-views'
import {
  MarketTable,
  type MarketSort,
  type SortDirection,
  type WatchlistContext,
} from '@/components/market/MarketTable'
import { usePhrase } from '@/components/locale/ContentProvider'
import { ExpandingSearch } from '@/components/ui/ExpandingSearch'

/**
 * ── LES VUES RAPIDES, ET CE QU'ELLES PEUVENT HONNÊTEMENT PROMETTRE ──────────
 *
 * TradingView en aligne cinq : populaires, tendance, gagnants, perdants, nouveautés.
 * Quatre sont reprises ici ; « nouveautés » ne l'est pas, et l'omission est un choix.
 * Une date de référencement n'existe pas dans `MarketAsset` — la reconstituer depuis
 * le rang ou la capitalisation donnerait un classement qui RESSEMBLE à des nouveautés
 * sans en être, ce que le §5 interdit. La page `/nouvelles-cotations` répond à cette
 * question avec la donnée qui convient.
 *
 * « Tendance » n'est pas non plus un palmarès de popularité — nous n'avons pas de
 * mesure d'audience. C'est la ROTATION : le volume rapporté à la capitalisation, qui
 * dit quelle part du flottant a changé de mains aujourd'hui. Un actif dont 40 % de la
 * capitalisation s'échange en une journée sort de son régime ordinaire, et c'est un
 * fait mesuré, pas une inférence. L'infobulle du bouton le dit.
 */
type QuickView = 'all' | 'trending' | 'gainers' | 'losers' | 'watchlist'

const QUICK_VIEWS: { key: QuickView; label: string; hint: string }[] = [
  { key: 'all', label: 'Tous', hint: 'L’ordre du classement, sans filtre' },
  {
    key: 'trending',
    label: 'Tendance',
    hint: 'Les plus fort taux de rotation — volume 24 h rapporté à la capitalisation',
  },
  { key: 'gainers', label: 'Gagnants', hint: 'Variation positive sur la période choisie' },
  { key: 'losers', label: 'Perdants', hint: 'Variation négative sur la période choisie' },
]

/**
 * ── « ÉCHANGEABLES » VS « TOUS LES ACTIFS » ─────────────────────────────────
 *
 * Repris de CoinGecko, où le partage vaut d'être expliqué : un actif référencé n'est
 * pas forcément un actif qui S'ÉCHANGE. Beaucoup de lignes portent un cours hérité de
 * la dernière transaction connue, parfois vieille de plusieurs jours, avec un volume
 * nul depuis. Elles gonflent les classements et faussent les moyennes.
 *
 * Le critère est ici un VOLUME 24 H STRICTEMENT POSITIF. C'est le seul dont nous
 * disposons, et il est exact au sens où il ne suppose rien : soit la source publie un
 * volume, soit elle n'en publie pas.
 */
type Scope = 'tradable' | 'all'

interface MarketBrowserProps {
  assets: MarketAsset[]
  assetClass: AssetClass
  page: number
  perPage: number
  sortBy: MarketSort
  direction: SortDirection
  sortable: boolean
  paginated: boolean
  basePath: string
  period?: ChangePeriod
  watchlist?: WatchlistContext
  chartPosition?: 'inline' | 'end'
  /**
   * Vues rapides et sélecteur de période.
   *
   * Désactivés sur la page crypto dédiée, où des onglets de même nom remplissent ce
   * rôle — et le remplissent MIEUX : ils classent l'univers entier côté serveur, là
   * où ces boutons ne portent que sur les lignes de la page affichée. Laisser les
   * deux offrirait au lecteur deux réponses différentes à la même question.
   */
  quickViews?: boolean
}

/**
 * Barre d'outils du classement : recherche, vues rapides, portée et période.
 *
 * ── TOUT CE QUI EST ICI PORTE SUR LA PAGE AFFICHÉE, ET C'EST ÉCRIT ──────────
 *
 * Un filtre qui ne porte que sur cinquante lignes parmi plusieurs milliers serait
 * trompeur s'il se présentait comme une recherche globale. La ligne de décompte le
 * dit à chaque filtrage, et l'état vide renvoie vers la recherche de l'en-tête, qui
 * elle interroge tout le catalogue.
 *
 * Le TRI, lui, reste côté serveur via l'URL : c'est le seul moyen d'ordonner
 * réellement l'ensemble du classement, et cela garde les vues triées partageables et
 * indexables. La différence entre les deux mécanismes n'est pas un accident
 * d'implémentation — elle suit ce que la source sait faire.
 *
 * Ce composant est client, donc `MarketTable` l'est aussi par transitivité. Aucun
 * effet sur le référencement : Next.js rend les composants client dans le HTML
 * initial — le tableau part complet, la recherche s'y greffe après hydratation.
 */
export function MarketBrowser({
  assets,
  quickViews = true,
  period,
  watchlist,
  ...tableProps
}: MarketBrowserProps) {
  const t = usePhrase()
  const [query, setQuery] = useState('')
  const [view, setView] = useState<QuickView>('all')
  const [scope, setScope] = useState<Scope>('all')

  /* Les identifiants suivis, en `Set` : le filtre les interroge une fois par ligne, et
     un `includes` sur un tableau ferait de ce filtre un parcours quadratique. */
  const followed = useMemo(() => new Set(watchlist?.ids ?? []), [watchlist])
  const followedCount = useMemo(
    () => assets.filter((asset) => followed.has(asset.id)).length,
    [assets, followed],
  )

  /*
   * La période vit dans un état LOCAL, à la différence de la page crypto dédiée qui
   * la porte dans l'URL. Le motif est le même que pour le tri des tableaux non
   * paginés : `/marches` lit déjà `classe`, `vue` et `page` dans son URL, et y ajouter
   * un quatrième paramètre pour un réglage de colonne rendrait les liens partagés
   * illisibles sans rien apporter — la colonne change, pas les données servies.
   *
   * `period` reçue en prop reste la valeur de départ : une page qui sait déjà quelle
   * période montrer garde la main sur le premier rendu.
   */
  const [localPeriod, setLocalPeriod] = useState<ChangePeriod>(period ?? '24h')
  const activePeriod = quickViews ? localPeriod : period
  const changeField = periodMeta(activePeriod ?? '24h').field

  /** Combien d'actifs de cette page portent un volume — le décompte des boutons. */
  const tradableCount = useMemo(
    () => assets.filter((asset) => (asset.volume24h ?? 0) > 0).length,
    [assets],
  )

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()

    const kept = assets.filter((asset) => {
      if (needle) {
        const haystack = `${asset.name} ${asset.symbol}`.toLowerCase()
        if (!haystack.includes(needle)) return false
      }

      if (scope === 'tradable' && (asset.volume24h ?? 0) <= 0) return false

      /* Le filtre des favoris porte sur la PAGE affichée, comme tous les autres de
         cette barre : un actif suivi qui n'est pas dans les cinquante lignes servies
         n'apparaîtra pas. La ligne de décompte sous la barre le dit déjà pour
         l'ensemble des filtres, et `/suivi` porte la liste complète. */
      if (view === 'watchlist' && !followed.has(asset.id)) return false

      const change = asset[changeField] as number | undefined

      // Une variation absente n'est ni une hausse ni une baisse : elle sort des deux
      // vues filtrées plutôt que d'être comptée arbitrairement comme nulle.
      if (view === 'gainers') return (change ?? 0) > 0
      if (view === 'losers') return (change ?? 0) < 0
      return true
    })

    /*
     * « Tendance » RÉORDONNE au lieu de filtrer, et c'est la seule vue dans ce cas.
     *
     * Filtrer sur un seuil de rotation supposerait qu'il existe une valeur au-delà de
     * laquelle un actif « est » tendance. Il n'y en a pas : la rotation ordinaire va
     * de 2 % sur une grande capitalisation à 300 % sur un jeton récent. Classer répond
     * à la vraie question — « lesquels sortent de leur régime ? » — sans avoir à
     * inventer une frontière.
     */
    if (view === 'trending') {
      return [...kept].sort((a, b) => turnover(b) - turnover(a))
    }

    return kept
  }, [assets, query, view, scope, changeField, followed])

  const filtering = query.trim().length > 0 || view !== 'all' || scope !== 'all'

  /*
   * ── LES PORTÉES SERONT-ELLES RENDUES ? LA QUESTION EST POSÉE ICI ───────────
   *
   * Elle l'était plus bas, en ligne dans le calcul des props du tableau. Deux
   * endroits en ont désormais besoin — la rangée du tableau, et celle-ci — et une
   * condition dupliquée finirait par diverger : les vues rapides descendraient
   * pendant que les portées resteraient, ou l'inverse, et la rangée se retrouverait
   * vide ou doublée.
   *
   * Le critère lui-même est inchangé et il est MESURÉ : voir la note du tableau plus
   * bas pour les deux bornes et ce que chacune corrige.
   */
  const hasScopeButtons = quickViews && tradableCount > 0 && tradableCount < assets.length

  /*
   * ── LES VUES RAPIDES, RENDUES UNE FOIS ET POSÉES À DEUX ENDROITS ───────────
   *
   * « Favoris · Tous · Tendance · Gagnants · Perdants » occupait TOUJOURS sa propre
   * rangée, en haut. Cela se défend là où les portées existent : elles tiennent la
   * rangée du dessous, et deux groupes de filtres sur une même ligne se liraient
   * comme un seul.
   *
   * Là où elles n'existent pas — ETF, indices, devises, matières premières, soit la
   * moitié des classes — la rangée du dessous ne portait plus QUE « Colonnes »,
   * poussé à droite par un `<span />` vide. Une rangée entière pour un bouton, avec
   * les vues rapides seules deux rangées plus haut : deux bandes à moitié vides
   * empilées au-dessus d'un tableau qu'on vient lire.
   *
   * Le groupe descend donc rejoindre « Colonnes » dans ce cas, ce qui économise une
   * rangée sans rien reprendre à personne — et le fait sans condition de classe
   * d'actif, en suivant simplement ce que la donnée permet.
   */
  const quickViewGroup = quickViews ? (
    <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Vue rapide">
      {/*
        ── « FAVORIS » OUVRE LA RANGÉE ────────────────────────────────────

        Il précède « Tous » et non l'inverse : c'est le seul filtre qui porte sur
        une liste que le lecteur a lui-même constituée, et on le cherche en
        premier quand on en a une. Il est ABSENT quand le suivi n'est pas
        disponible — un filtre qui ne pourrait jamais rien retenir n'a pas à
        occuper de place.
      */}
      {watchlist?.available ? (
        <button
          type="button"
          onClick={() => setView('watchlist')}
          aria-pressed={view === 'watchlist'}
          title={
            followedCount > 0
              ? 'Seuls les actifs de votre liste de suivi'
              : 'Votre liste de suivi est vide — cliquez l’étoile d’une ligne pour l’y ajouter'
          }
          className={`flex items-center gap-1.5 rounded-control px-2.5 py-1.5 text-xs font-medium transition-colors duration-150 ${
            view === 'watchlist'
              ? 'bg-brand-soft text-brand-strong'
              : 'text-ink-muted hover:bg-surface-muted hover:text-ink'
          }`}
        >
          <Star
            className={`h-3.5 w-3.5 ${view === 'watchlist' ? 'fill-current' : ''}`}
            aria-hidden="true"
          />
          {t('Favoris')}
          {followedCount > 0 ? (
            <span className="tabular text-[0.6875rem] opacity-70">{followedCount}</span>
          ) : null}
        </button>
      ) : null}

      {QUICK_VIEWS.map((entry) => (
        <button
          key={entry.key}
          type="button"
          onClick={() => setView(entry.key)}
          aria-pressed={view === entry.key}
          title={t(entry.hint)}
          className={`rounded-control px-2.5 py-1.5 text-xs font-medium transition-colors duration-150 ${
            view === entry.key
              ? 'bg-brand-soft text-brand-strong'
              : 'text-ink-muted hover:bg-surface-muted hover:text-ink'
          }`}
        >
          {t(entry.label)}
        </button>
      ))}
    </div>
  ) : null

  return (
    <div className="space-y-3">
      {/*
        ── UNE SEULE RANGÉE D'OUTILS, ET LE RESTE DESCEND AVEC « COLONNES » ──────

        Elle en comptait deux. La première portait les vues et un champ de recherche
        pleine largeur ; la seconde, à elle seule, les deux portées à gauche et les cinq
        périodes à droite. Quatre-vingts pixels de hauteur pour des réglages qu'on
        change une fois par visite, au-dessus d'un tableau qu'on vient lire.

        Les périodes REMONTENT ici — elles qualifient la colonne « Variation », donc le
        tableau, et non le sous-ensemble d'actifs. La recherche se replie en loupe (voir
        `ExpandingSearch`), ce qui libère la largeur qu'elle prenait. Les portées, elles,
        descendent à la hauteur de « Colonnes » : ce sont des réglages du même ordre —
        ce qu'on compte, ce qu'on affiche.
      */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Les vues rapides ne tiennent cette rangée QUE si les portées occupent celle
            du dessous. Sinon elles y descendent, et cette rangée n'a plus qu'un côté —
            voir la note de `quickViewGroup`. Le `<span />` garde alors la gauche, sans
            quoi `justify-between` sur un enfant unique collerait la période à gauche. */}
        {hasScopeButtons ? quickViewGroup : <span />}

        <div className="flex flex-wrap items-center gap-2">
          {quickViews ? (
            <div
              className="flex items-center gap-0.5 rounded-control border border-border-subtle p-0.5"
              role="group"
              aria-label={t('Période de variation')}
            >
              {CHANGE_PERIODS.map((entry) => (
                <button
                  key={entry.key}
                  type="button"
                  onClick={() => setLocalPeriod(entry.key)}
                  aria-pressed={localPeriod === entry.key}
                  title={t(`Variation ${entry.longLabel}`)}
                  className={`rounded-sm px-2 py-1 text-xs font-medium transition-colors duration-150 ${
                    localPeriod === entry.key
                      ? 'bg-brand text-on-brand'
                      : 'text-ink-muted hover:bg-surface-muted hover:text-ink'
                  }`}
                >
                  {t(entry.label)}
                </button>
              ))}
            </div>
          ) : null}

          <ExpandingSearch
            value={query}
            onChange={setQuery}
            placeholder={t('Filtrer cette page…')}
            label={t('Filtrer les actifs affichés sur cette page')}
          />
        </div>
      </div>

      {filtering ? (
        <p className="text-xs text-ink-muted" aria-live="polite">
          {visible.length} sur {assets.length} actif{assets.length > 1 ? 's' : ''} de cette page.
          Le filtre ne porte pas sur l’ensemble du classement.
        </p>
      ) : null}

      {visible.length === 0 ? (
        <EmptyState
          title="Aucun actif ne correspond sur cette page"
          description="Le filtre ne s’applique qu’aux lignes affichées. Utilisez la recherche de l’en-tête pour chercher dans l’ensemble des actifs suivis."
          compact
        />
      ) : (
        <MarketTable
          assets={visible}
          {...tableProps}
          {...(watchlist ? { watchlist } : {})}
          {...(activePeriod ? { period: activePeriod } : {})}
          /*
            ── LES PORTÉES DESCENDENT DANS LE TABLEAU, ET SEULEMENT OÙ ELLES SERVENT

            Elles occupaient une rangée à elles, sur toutes les classes d'actifs. Or
            « Échangeables » ne distingue quelque chose que là où une PART des lignes
            n'a pas de volume publié : sur les douze matières premières ou les dix
            indices, les deux boutons affichent le même nombre et retirent zéro ligne.
            Deux contrôles qui ne changent rien valent moins que leur absence.

            Le critère est donc MESURÉ, pas déclaré par classe : on les propose quand
            le partage sépare réellement la liste en deux parts NON VIDES. Une classe
            qui gagnerait des lignes sans volume les verrait apparaître d'elle-même,
            et une liste écrite à la main aurait ici vieilli sans qu'on s'en aperçoive.

            ⚠️ LES DEUX BORNES COMPTENT, et la seconde a été apprise à l'écran.
            Tester seulement `tradableCount < assets.length` laissait
            « Échangeables 0 · Tous les actifs 8 » sur les devises : la BCE ne publie
            aucun volume, donc AUCUNE paire n'est échangeable au sens de ce filtre.
            Un bouton qui vide le tableau n'est pas un filtre, c'est un piège.
          */
          {...(hasScopeButtons
            ? {
                scope,
                onScopeChange: setScope,
                tradableCount,
                totalCount: assets.length,
              }
            : /* Sans portées, la rangée du tableau accueille les vues rapides plutôt
                 que de n'afficher que « Colonnes » poussé à droite par du vide. */
              { leadingSlot: quickViewGroup })}
        />
      )}
    </div>
  )
}

/**
 * Rotation — volume 24 h rapporté à la capitalisation.
 *
 * Rend `-1` plutôt que `0` quand l'un des deux termes manque : cela range les actifs
 * non mesurables APRÈS ceux dont la rotation est nulle, ce qui est juste — « aucune
 * rotation » et « rotation inconnue » ne sont pas la même chose, et la seconde ne doit
 * pas s'intercaler dans un classement qu'elle ne peut pas rejoindre.
 */
function turnover(asset: MarketAsset): number {
  const cap = asset.marketCap ?? 0
  const volume = asset.volume24h ?? 0
  if (cap <= 0 || volume <= 0) return -1
  return volume / cap
}

/*
 * `ScopeButton` A DÉMÉNAGÉ DANS `MarketTable`.
 *
 * Les deux boutons de portée se rendent désormais à côté du sélecteur de colonnes,
 * c'est-à-dire dans le tableau. L'ÉTAT reste ici — c'est ce composant qui filtre la
 * liste — mais le dessin suit les boutons.
 */
