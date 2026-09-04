import type { AssetClass } from '@zenkuu/data'
import { getCryptoGlobalStats, getRanking, YAHOO_UNIVERSE } from '@zenkuu/data'
import { EmptyState, SourceNote } from '@zenkuu/ui'

import type { AppHref } from '@/i18n/navigation'
import { GlobalStatsBar } from '@/components/home/GlobalStatsBar'
import { AssetClassTabs } from '@/components/market/AssetClassTabs'
import { MarketBrowser } from '@/components/market/MarketBrowser'
import { MarketFaq } from '@/components/market/MarketFaq'
import { MarketHighlights } from '@/components/market/MarketHighlights'
import { MarketStatsStrip } from '@/components/market/MarketStatsStrip'
import type { MarketSort, SortDirection } from '@/components/market/MarketTable'
import { getContent } from '@/lib/content'
import { marketHref } from '@/lib/asset-routes'
import { DEFAULT_ROWS } from '@/lib/limits'
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
  crypto: { perPage: 250, sortable: true, paginated: false, clientPerPage: DEFAULT_ROWS },
  forex: { perPage: 40, sortable: false, paginated: false, clientPerPage: DEFAULT_ROWS },
  /* Vingt-cinq par page, et c'est une contrainte de la SOURCE : Yahoo n'a pas
     d'appel groupé — un symbole, une requête — et son limiteur plafonne à soixante
     par fenêtre. Les quatre-vingt-dix-neuf actions de l'univers sont donc servies par
     tranches, ce que `listAssets` honore désormais réellement. */
  stock: { perPage: 25, sortable: false, paginated: true },
  etf: { perPage: 25, sortable: false, paginated: true },
  commodity: { perPage: 20, sortable: false, paginated: false, clientPerPage: DEFAULT_ROWS },
  index: { perPage: 30, sortable: false, paginated: false, clientPerPage: DEFAULT_ROWS },
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
  basePath?: AppHref
  /** Destination des onglets de classe — voir `AssetClassTabs`. */
  classHref?: (assetClass: AssetClass) => AppHref
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

  /**
   * ══════════════════════════════════════════════════════════════════════════
   * LA MISE EN PAGE DE CATALOGUE — CE QUE LES SIX PAGES DE CLASSE DEMANDENT
   * ══════════════════════════════════════════════════════════════════════════
   *
   * Relevée sur `cryptorank.io/all-coins-list`. Elle change quatre choses à la page
   * ordinaire, et chacune répond à un point de la référence :
   *
   *   · les CHIFFRES GLOBAUX sous le titre — capitalisation, volume, dominances,
   *     nombre d'actifs. Réservés à la crypto : c'est la seule classe dont une
   *     source publie un agrégat de marché. Voir plus bas.
   *   · la GRILLE DE COLONNES `catalogue` — capitalisation avant volume, offre en
   *     circulation, courbe en fin de ligne.
   *   · la RANGÉE D'OUTILS complète — champ de filtre et fourchettes.
   *   · la FAQ de bas de page.
   *
   * ⚠️ ELLE N'EST PAS LE DÉFAUT, et ce n'est pas une hésitation. `/classements` et
   * `/derives` passent par ce même composant : leur donner la grille de catalogue
   * changerait deux pages que personne n'a demandé de changer, et la FAQ y répondrait
   * à des questions qu'elles ne posent pas. Le drapeau est donc porté par
   * `ClassMarketPage`, c'est-à-dire par les six routes concernées et elles seules.
   */
  catalogue?: boolean
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
  catalogue = false,
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
  /*
   * ── LES CHIFFRES GLOBAUX NE SONT DEMANDÉS QUE LÀ OÙ ILS EXISTENT ──────────
   *
   * La référence ouvre sur six chiffres : nombre de devises, capitalisation, volume
   * 24 h, dominances Bitcoin et Ether, prix du gaz Ethereum. Les cinq premiers sont
   * publiés par notre agrégat crypto — c'est exactement ce que `GlobalStatsBar` rend
   * déjà sur l'accueil, et le réutiliser garantit que les deux pages ne peuvent pas
   * afficher deux capitalisations différentes.
   *
   * ⚠️ LE PRIX DU GAZ MANQUE, et il manquera tant qu'aucune source ne le publie : rien
   * dans `packages/data` n'interroge de nœud Ethereum. Le sixième chiffre est donc
   * absent plutôt qu'estimé (§5).
   *
   * Les cinq autres classes n'ont pas d'équivalent — Yahoo ne publie pas d'agrégat de
   * marché pour les actions ou les devises — et gardent la bande calculée sur les
   * lignes reçues, qui est leur seul repère honnête.
   */
  const wantsGlobals = catalogue && assetClass === 'crypto'

  const [ranking, watchlist, globals] = await Promise.all([
    getRanking({
      assetClass,
      page,
      perPage: config.perPage,
      sortBy,
      sortDirection: direction,
      currency: 'eur',
    }),
    getWatchlistIds(assetClass),
    wantsGlobals ? getCryptoGlobalStats('eur') : Promise.resolve(null),
  ])

  /*
   * ── LA PORTÉE DE LA BANDE CALCULÉE, DÉCIDÉE AVANT LE RENDU ────────────────
   *
   * `null` quand les chiffres globaux la remplacent — voir plus bas. Sinon une PHRASE
   * complète avec un emplacement nommé, et non un fragment concaténé : le nombre se
   * place où la grammaire de chaque langue l'exige, ce qu'une chaîne coupée en deux
   * autour de la variable interdit.
   *
   * Trois portées et non deux, depuis que la crypto reçoit tout son lot d'un coup :
   * elle n'est ni « cette page » (le tableau en découpe 250 en dix) ni « tous les
   * actifs suivis » (le catalogue en compte des milliers). `assetClass` tranche, parce
   * que la portée dépend de ce que la SOURCE sait servir, pas du mode de pagination
   * du tableau.
   */
  const scope = globals?.ok
    ? null
    : (config.paginated
        ? t('les {n} actifs de cette page')
        : assetClass === 'crypto'
          ? t('les {n} plus grandes capitalisations')
          : t('les {n} actifs suivis dans cette classe')
      ).replace('{n}', String(ranking.ok ? ranking.data.length : 0))

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <h1 className="display-xl text-ink">{title}</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-ink-muted">{subtitle}</p>
      </header>

      {/* Les chiffres globaux se posent SOUS le titre et AU-DESSUS des onglets de
          classe, comme sur la référence : ils qualifient le marché, pas la classe
          qu'on est en train de lire. Placés après les onglets, ils se liraient comme
          une propriété de la classe active — ce qu'ils ne sont pas. */}
      {globals?.ok ? <GlobalStatsBar stats={globals.data} /> : null}

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

          {/* La bande calculée s'efface quand les chiffres globaux sont là : deux
              rangées d'agrégats l'une sous l'autre, dont la seconde ne porte que sur
              les lignes reçues, feraient douter de la première. Elle reste partout
              ailleurs, où elle est le seul repère disponible.

              ⚠️ LE TERNAIRE EST DANS `scope`, PAS AUTOUR DE LA BALISE. Enrouler la
              balise dans un conteneur d'expression obligeait à garder, en position
              d'attribut, deux commentaires de bloc que SWC refuse à cet endroit alors
              que `tsc` les accepte — et l'erreur rendue désignait la balise SUIVANTE,
              donc jamais sa cause. Décider la portée avant le rendu supprime
              l'imbrication et la question avec elle. */}
          {scope === null ? null : <MarketStatsStrip assets={ranking.data} scopeLabel={scope} />}

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
            {...(config.clientPerPage
              ? {
                  /*
                    CENT LIGNES PAR DÉFAUT SUR LES PAGES DE CATALOGUE, contre
                    vingt-cinq ailleurs. C'est le cran de la référence — « Rows : 100 »
                    — et il se justifie ici et pas ailleurs : ces pages EXISTENT pour
                    parcourir un catalogue, et vingt-cinq lignes imposent dix clics
                    pour traverser ce qu'une seule réponse a déjà servi. Le lecteur
                    garde la main : le sélecteur du pied de tableau propose les autres
                    crans.
                  */
                  clientPerPage: catalogue ? 100 : config.clientPerPage,
                }
              : {})}
            {...(universeTotal !== undefined ? { total: universeTotal } : {})}
            {...(catalogue
              ? { columnSet: 'catalogue' as const, searchable: true, rangeFilters: true }
              : {})}
          />

          <SourceNote
            strings={{ source: t('Source :'), dated: t('données du {date}') }}
            label={ranking.source.label}
            href={ranking.source.attributionUrl}
            updatedAt={ranking.data[0]?.lastUpdated}
          />

          {/* La FAQ ferme la page, APRÈS la note de source : elle commente le tableau
              et la façon dont il est bâti, ce qui suppose d'avoir vu les deux. */}
          {catalogue ? <MarketFaq assetClass={assetClass} /> : null}
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
