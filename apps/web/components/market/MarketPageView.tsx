import type { AssetClass } from '@zenkuu/data'
import { getRanking, YAHOO_UNIVERSE } from '@zenkuu/data'
import { EmptyState, SourceNote } from '@zenkuu/ui'

import { AssetClassTabs } from '@/components/market/AssetClassTabs'
import { MarketBrowser } from '@/components/market/MarketBrowser'
import { MarketHighlights } from '@/components/market/MarketHighlights'
import { MarketStatsStrip } from '@/components/market/MarketStatsStrip'
import type { MarketSort, SortDirection } from '@/components/market/MarketTable'
import { getContent } from '@/lib/content'
import { marketHref } from '@/lib/asset-routes'
import { getWatchlistIds } from '@/lib/watchlist-actions'
import { getPhrase } from '@/lib/content'

/**
 * Corps commun à toutes les pages de classement.
 *
 * Les six classes d'actifs partagent exactement la même page ; seuls changent le
 * fournisseur interrogé, la taille de l'univers et les colonnes disponibles. Écrire
 * six pages quasi identiques garantirait qu'elles divergent au premier correctif —
 * on centralise donc ici, et chaque route ne fournit que ses libellés.
 */

/**
 * Réglages par classe.
 *
 * `sortable` traduit une réalité de la source : seul CoinGecko sait trier
 * l'intégralité du marché côté serveur. Les univers Yahoo sont récupérés en entier,
 * donc déjà complets — mais ils n'ont ni capitalisation ni pagination, ce qui rend
 * les en-têtes de tri sans objet.
 */
/**
 * ── `clientPerPage` : LE PIED DE TABLEAU RETROUVE SES TROIS BLOCS ─────────────
 *
 * Fournie, elle fait paginer le tableau DANS LE NAVIGATEUR sur les lignes déjà
 * reçues. Le pied porte alors les trois choses qu'on attend de lui — le décompte, les
 * numéros de page au centre, et le sélecteur de lignes — au lieu du compteur seul
 * poussé à gauche par `justify-between`.
 *
 * Elle n'est PAS fournie pour les classes dont la source pagine elle-même : les
 * deux mécanismes s'excluent (voir `MarketTable`), et sur ces classes le nombre de
 * lignes servies est décidé en amont.
 *
 * ── POURQUOI LA CRYPTO PASSE DE 50 À 250 LIGNES ──────────────────────────────
 *
 * Ce n'est pas une envie de tableaux plus longs. Les boutons « Échangeables » et
 * « Tous les actifs » comptent ce que le composant A REÇU : à cinquante lignes par
 * page servies par le serveur, ils annonçaient « 46 · 50 » — c'est-à-dire le partage
 * d'une PAGE, présenté comme celui du marché. Deux cent cinquante est le maximum
 * qu'une seule réponse CoinGecko porte ; au-delà, il faudrait une requête par
 * tranche, et la page cesserait d'être servie depuis le cache partagé.
 *
 * Le décompte reste donc borné, et la ligne sous le tableau le DIT : « sur les 250
 * plus grandes capitalisations ». C'est une portée annoncée, pas un total inventé —
 * le catalogue en compte plus de dix-huit mille, et aucune source gratuite ne donne
 * le partage échangeables/référencés sur cet ensemble.
 */
const CONFIG: Record<
  AssetClass,
  { perPage: number; sortable: boolean; paginated: boolean; clientPerPage?: number }
> = {
  crypto: { perPage: 250, sortable: true, paginated: false, clientPerPage: 25 },
  forex: { perPage: 40, sortable: false, paginated: false, clientPerPage: 25 },
  /* Vingt-cinq par page, et c'est une contrainte de la SOURCE : Yahoo n'a pas
     d'appel groupé — un symbole, une requête — et son limiteur plafonne à soixante
     par fenêtre. Les quatre-vingt-dix-neuf actions de l'univers sont donc servies par
     tranches, ce que `listAssets` honore désormais réellement. */
  stock: { perPage: 25, sortable: false, paginated: true },
  etf: { perPage: 25, sortable: false, paginated: true },
  commodity: { perPage: 20, sortable: false, paginated: false, clientPerPage: 25 },
  index: { perPage: 30, sortable: false, paginated: false, clientPerPage: 25 },
  nft: { perPage: 20, sortable: false, paginated: false },
}

const MAX_PAGE = 100

export interface MarketPageViewProps {
  assetClass: AssetClass
  title: string
  subtitle: string
  searchParams: Record<string, string | string[] | undefined>
  /** Surcharge la taille de page par défaut de la classe (voir `/classements`). */
  perPage?: number
  /** Surcharge la base des liens de tri et de pagination, pour les pages dérivées. */
  basePath?: string
  /** Destination des onglets de classe — voir `AssetClassTabs`. */
  classHref?: (assetClass: AssetClass) => string
  /**
   * Barre d'onglets de REMPLACEMENT.
   *
   * Les six pages de classement veulent `AssetClassTabs`, qui renvoie vers les pages
   * dédiées. « Parcourir » veut la sienne, qui reste sur place et porte un onglet
   * supplémentaire (les dérivés) dont `AssetClassTabs` ne sait rien — et ne doit rien
   * savoir, puisqu'il énumère des CLASSES et qu'un contrat n'en est pas une.
   *
   * Un nœud déjà rendu plutôt qu'un drapeau : ce composant n'a pas à connaître la
   * liste des barres possibles, seulement où poser celle qu'on lui donne.
   *
   * `null` SUPPRIME la barre au lieu d'en poser une. C'est ce dont « Parcourir » a
   * besoin : sa barre porte un trait qui GLISSE d'un onglet à l'autre, et un trait ne
   * glisse que si son nœud survit à la navigation. Rendue ici, elle serait remontée
   * puis démontée à chaque passage entre les dérivés et une classe d'actif, qui ne
   * traversent pas le même arbre — le trait sauterait au lieu de parcourir.
   *
   * D'où la distinction entre `undefined` (aucun avis, on met la barre par défaut) et
   * `null` (avis explicite : pas de barre ici).
   */
  tabs?: React.ReactNode | null
  /** Inséré entre les onglets et le bandeau de points saillants. */
  children?: React.ReactNode
}

/** Lecture défensive des paramètres d'URL : ils sont saisissables à la main. */
function readPage(raw: string | string[] | undefined): number {
  const value = Number(Array.isArray(raw) ? raw[0] : raw)
  if (!Number.isInteger(value) || value < 1) return 1
  return Math.min(value, MAX_PAGE)
}

export async function MarketPageView({
  assetClass,
  title,
  subtitle,
  searchParams,
  perPage,
  basePath,
  classHref,
  tabs,
  children,
}: MarketPageViewProps) {
  const fr = await getContent()
  const t = await getPhrase()
  const base = CONFIG[assetClass]
  const config = { ...base, perPage: perPage ?? base.perPage }
  const listPath = basePath ?? marketHref(assetClass)

  /*
   * ── LE TOTAL EST UN FAIT LOCAL POUR LES CLASSES SERVIES PAR YAHOO ─────────
   *
   * `YAHOO_UNIVERSE` est une liste écrite au dépôt : sa longueur est connue sans
   * requête. La lire ici évite au pied de tableau d'écrire « Actifs 1 à 25 » avec deux
   * numéros de page, là où il peut écrire « Affichage de 1 à 25 sur 99 actifs » et
   * numéroter jusqu'au bout.
   *
   * `undefined` pour les autres : CoinGecko pagine lui-même et ne publie jamais son
   * total, et l'inventer serait le seul mensonge qu'une barre de pagination sache
   * produire. Le pied retombe alors sur ce qu'il peut prouver — voir `MarketTable`.
   */
  const universeTotal = config.paginated
    ? YAHOO_UNIVERSE[assetClass as keyof typeof YAHOO_UNIVERSE]?.length
    : undefined
  const page = readPage(searchParams['page'])
  const sortBy: MarketSort = searchParams['tri'] === 'volume' ? 'volume24h' : 'marketCap'
  const direction: SortDirection = searchParams['sens'] === 'asc' ? 'asc' : 'desc'

  /*
   * LE CLASSEMENT ET LA LISTE DE SUIVI PARTENT ENSEMBLE.
   *
   * `getWatchlistIds` lit la liste complète de la classe en UNE requête — voir son
   * en-tête, qui explique pourquoi `getWatchlistState` (un appel par actif) serait
   * ruineux ici. Sans base configurée, elle rend `available: false` et les étoiles se
   * rendent inertes plutôt que d'apparaître puis d'échouer au clic.
   *
   * `Promise.all` et non deux `await` : la liste de suivi vit dans notre base, le
   * classement chez un fournisseur distant. Les enchaîner ferait attendre l'un pour
   * l'autre sans qu'aucun ne dépende du résultat du premier.
   */
  const [ranking, watchlist] = await Promise.all([
    getRanking({
      assetClass,
      page,
      perPage: config.perPage,
      sortBy,
      sortDirection: direction,
      currency: 'eur',
    }),
    getWatchlistIds(assetClass),
  ])

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-ink">{title}</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-ink-muted">{subtitle}</p>
      </header>

      {/* Navigation inter-classes : le passage de /crypto à /actions ne devrait pas
          imposer un détour par le menu de l'en-tête. */}
      {tabs === undefined ? (
        <AssetClassTabs current={assetClass} {...(classHref ? { hrefFor: classHref } : {})} />
      ) : (
        tabs
      )}

      {children}

      {ranking.ok && ranking.data.length > 0 ? (
        <>
          {/* Bandeau AVANT la bande de statistiques : il répond à « que s'est-il
              passé ? », elle à « sur quoi porte ce que je lis ? ». La question du
              lecteur vient dans cet ordre. */}
          <MarketHighlights assets={ranking.data} assetClass={assetClass} />

          <MarketStatsStrip
            assets={ranking.data}
            /* LA PORTÉE EST UNE PHRASE, pas un fragment concaténé : le nombre y
               occupe un emplacement nommé, ce qui laisse chaque langue le placer où
               sa grammaire l'exige. */
            /* Trois portées et non deux, depuis que la crypto reçoit tout son lot
               d'un coup : elle n'est ni « cette page » (le tableau en découpe 250 en
               dix) ni « tous les actifs suivis » (le catalogue en compte des
               milliers). `assetClass` tranche, parce que la portée dépend de ce que
               la SOURCE sait servir, pas du mode de pagination du tableau. */
            scopeLabel={(config.paginated
              ? t('les {n} actifs de cette page')
              : assetClass === 'crypto'
                ? t('les {n} plus grandes capitalisations')
                : t('les {n} actifs suivis dans cette classe')
            ).replace('{n}', String(ranking.data.length))}
          />

          <MarketBrowser
            assets={ranking.data}
            assetClass={assetClass}
            page={page}
            perPage={config.perPage}
            sortBy={sortBy}
            direction={direction}
            sortable={config.sortable}
            paginated={config.paginated}
            basePath={listPath}
            watchlist={watchlist}
            {...(config.clientPerPage ? { clientPerPage: config.clientPerPage } : {})}
            {...(universeTotal !== undefined ? { total: universeTotal } : {})}
          />

          <SourceNote
            strings={{ source: t('Source :'), dated: t('données du {date}') }}
            label={ranking.source.label}
            href={ranking.source.attributionUrl}
            updatedAt={ranking.data[0]?.lastUpdated}
          />
        </>
      ) : (
        <EmptyState
          title={fr.states.unavailableTitle}
          // Une page vide au-delà du dernier rang n'est pas une panne : on le dit
          // plutôt que d'afficher un message d'erreur alarmant.
          description={ranking.ok ? fr.market.emptyPage : ranking.reason}
          source={ranking.source?.label ?? null}
          tone={ranking.ok ? 'neutral' : 'warning'}
        />
      )}
    </div>
  )
}
