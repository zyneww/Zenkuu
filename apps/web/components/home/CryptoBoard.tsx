import { getCryptoGlobalStats, getCryptoOverview, getRanking } from '@zenkuu/data'
import { EmptyState } from '@zenkuu/ui'

import { ROWS } from '@/components/home/overview-rows'
import { MarketBrowser } from '@/components/market/MarketBrowser'
import { getContent } from '@/lib/content'
import { getWatchlistIds } from '@/lib/watchlist-actions'

/** Base des liens du tableau — fiches d'actif et tri par URL. */
const BASE_PATH = '/crypto'

/** Lignes par page, valeur de départ du sélecteur du pied de tableau. */
const PER_PAGE = 25

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * LE TABLEAU DE COTATIONS — LES CENT PREMIÈRES CAPITALISATIONS
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── CE QU'IL PORTE, ET POURQUOI RIEN N'EN EST RÉÉCRIT ICI ──────────────────
 *
 * `MarketBrowser` existait déjà pour `/crypto` et rend exactement les colonnes de la
 * référence : rang, étoile de suivi, actif avec logo et ticker, cours, 1 h, 24 h, 7 j,
 * 30 j, volume, capitalisation, courbe 7 jours. Il y ajoute les vues rapides (tous /
 * tendance / gagnants / perdants / suivis) et le sélecteur de lignes.
 *
 * ⚠️ Ce qu'il ne porte PLUS, et volontairement : la recherche de page, le partage
 * « échangeables seulement », le sélecteur de période et « Personnaliser ». Quatre
 * groupes de contrôles au-dessus d'un tableau qu'on vient lire, dont trois ne
 * portaient que sur les lignes affichées.
 *
 * L'accueil ne lui passe qu'un univers et une liste de suivi : c'est le composant, et
 * non la page, qui décide de la forme d'un tableau de cotations — sans quoi l'accueil
 * et `/crypto` divergeraient au premier ajustement de colonne.
 *
 * ── CENT LIGNES, PAGINÉES CÔTÉ CLIENT, ET C'EST UN ARBITRAGE ───────────────
 *
 * La référence pagine côté SERVEUR : sa page 2 va chercher cent autres lignes, sur
 * cent dix pages. Reprendre ce mode ici demanderait de lire un numéro dans l'URL, donc
 * de rendre cette page DYNAMIQUE : elle perdrait son cache de trois minutes partagé
 * par tous les visiteurs, et chaque page vue déclencherait son propre appel amont —
 * sur un quota gratuit qui n'en autorise qu'une poignée.
 *
 * Les cent lignes sont donc servies EN UNE FOIS, courbes comprises, et le tableau les
 * découpe dans le navigateur. Le lecteur y gagne : changer de page, trier ou filtrer
 * n'attend aucun aller-retour. Ce qui est payé en échange est la taille de la charge
 * utile — cent actifs avec leur courbe — et c'est payé UNE FOIS toutes les trois
 * minutes pour tout le monde, puisque la page est statique.
 *
 * Au-delà de cent, `/crypto` prend le relais et pagine, lui, côté serveur : c'est là
 * que mène le lien « Cryptomonnaies » du menu, pour le lecteur qui veut la page 2.
 *
 * ── LE MÊME `ROWS` QUE LES CARTES, ET CE N'EST PAS UN DÉTAIL ───────────────
 *
 * La clé de cache de `getCryptoOverview` contient la devise ET la limite. Écrire un
 * nombre différent de celui de `HomeWidgets` ferait un SECOND appel réseau pour un
 * univers identique. `ROWS` est donc importé plutôt que redéclaré.
 */
export async function CryptoBoard() {
  const fr = await getContent()

  /*
    Le troisième appel ne coûte RIEN de plus : `getCryptoGlobalStats('eur')` est déjà
    lu par `PriceHeader`, en haut de la même page, et le cache applicatif est partagé.
    On y prend le nombre d'actifs du catalogue — celui-là même que le sous-titre de la
    page annonce — pour que le pied de tableau puisse écrire « sur 19 340 » plutôt que
    de s'arrêter aux lignes reçues.
  */
  /*
    ── LES DEUX AUTRES UNIVERS PARTENT AVEC LA PAGE ──────────────────────────

    « Actions » et « Devises » étaient des LIENS : cliquer quittait l'accueil. Ils
    sont désormais des onglets, et leur contenu doit être là quand on clique — le
    cahier des charges demande une bascule sans saut ni flash, ce qu'un chargement au
    clic ne peut pas donner.

    Le coût est modeste : quelques dizaines de lignes sans courbes, contre deux cent
    cinquante cryptomonnaies avec leurs sparklines. Et la page étant statique, il est
    payé une fois toutes les trois minutes pour tous les visiteurs, pas une fois par
    clic.

    ⚠️ Les LISTES DE SUIVI ne sont demandées que pour la crypto. L'onglet « Favoris »
    filtre la liste crypto — c'est ce que fait `onlyFollowed` dans `MarketBrowser` —
    et charger trois listes pour n'en filtrer qu'une coûterait deux requêtes de base
    de données par visite pour rien.
  */
  const [overview, watchlist, globals, stocks, forex] = await Promise.all([
    getCryptoOverview('eur', ROWS),
    getWatchlistIds('crypto'),
    getCryptoGlobalStats('eur'),
    getRanking({ assetClass: 'stock', page: 1, perPage: 50, currency: 'eur' }),
    getRanking({ assetClass: 'forex', page: 1, perPage: 50, currency: 'eur' }),
  ])

  const assets = overview.ok ? overview.data.topByMarketCap : []

  /*
    Un univers qui n'a pas répondu n'est PAS proposé : `ClassTabs` ne rend que les
    onglets qu'on lui déclare, et un onglet menant à un tableau vide se lit comme une
    panne du site plutôt que comme une panne de source.
  */
  const otherUniverses = {
    ...(stocks.ok && stocks.data.length > 0
      ? {
          actions: {
            assets: stocks.data,
            assetClass: 'stock' as const,
            basePath: '/actions',
            /* `catalogue` et non `apercu` : une action n'a ni offre en circulation ni
               courbe de sept jours, et la grille crypto lui alignerait des tirets. */
            columnSet: 'catalogue' as const,
          },
        }
      : {}),
    ...(forex.ok && forex.data.length > 0
      ? {
          devises: {
            assets: forex.data,
            assetClass: 'forex' as const,
            basePath: '/devises',
            columnSet: 'catalogue' as const,
          },
        }
      : {}),
  }

  /*
    ── LE TOTAL VIENT DE LA SOURCE, ET N'EST PAS DEVINÉ ──────────────────────

    `activeAssets` est le décompte que CoinGecko publie lui-même, et c'est déjà le
    nombre écrit dans le sous-titre de la page. Le réutiliser garantit que les deux
    ne peuvent pas se contredire à l'écran.

    Absent — source en panne — le tableau retombe sur ses lignes reçues : il pagine
    les 250 qu'il détient et le compteur le dit. Inventer un total serait le seul
    mensonge qu'une barre de pagination sache produire (§5).
  */
  const catalogue = globals.ok ? globals.data.activeAssets : undefined

  return (
    <section className="flex flex-col gap-3">
      {/* Le titre « Cotations — cryptomonnaies » a été RETIRÉ (demande explicite).
          Il redisait, en petit et en gris, ce que le titre de la page annonce déjà en
          grand deux blocs plus haut — « Cours et prix des cryptomonnaies en temps
          réel » — et la rangée d'onglets qui ouvre désormais le tableau tient seule le
          rôle de repère visuel qu'il occupait. */}
      {assets.length > 0 ? (
        <MarketBrowser
          assets={assets}
          assetClass="crypto"
          page={1}
          perPage={PER_PAGE}
          sortBy="marketCap"
          direction="desc"
          /* `sortable` gouverne le tri PAR URL, celui qui recharge la page : il n'a
             pas de sens ici, où la page ne lit aucun paramètre. Le tri des en-têtes
             se fait EN MÉMOIRE, activé par `clientPerPage` — les 250 lignes sont
             déjà là, les réordonner n'attend aucun aller-retour. */
          sortable={false}
          /* `paginated` gouverne la pagination PAR LIENS, celle qui navigue. Elle
             reste fausse : c'est `clientPerPage` qui donne ses crans à ce tableau,
             et les deux modes s'excluent — voir `MarketTable`. */
          paginated={false}
          clientPerPage={PER_PAGE}
          basePath={BASE_PATH}
          /* Fournie, donc la colonne principale devient « Variation (24 h) » et
             `MarketTable` ajoute 1 H, 7 J et 30 J à côté — les quatre fenêtres du
             tableau de la référence, dans le même ordre. */
          period="24h"
          watchlist={watchlist}
          /* La courbe entre le cours et le volume plutôt qu'en fin de ligne : elle
             illustre alors la variation qu'elle jouxte, ce qui est la lecture de la
             référence. En fin de ligne elle se lit comme une vignette de complément,
             ce qui convient aux classes sans capitalisation, pas à celle-ci. */
          chartPosition="inline"
          /* ── LES QUATRE AJOUTS DE LA REFONTE ────────────────────────────────
             Onglets à la place des vues rapides, champ de filtre, bascule de devise,
             et le nombre total d'actifs du catalogue — c'est lui qui autorise le
             tableau à dépasser les lignes reçues, en allant chercher les suivantes
             sur `/api/cotations`. Voir `MarketBrowser`. */
          boardTabs
          searchable
          currencyPicker
          otherUniverses={otherUniverses}
          {...(catalogue !== undefined ? { remoteTotal: catalogue } : {})}
        />
      ) : (
        <EmptyState
          title={fr.states.unavailableTitle}
          description={overview.ok ? fr.market.emptyPage : overview.reason}
          source={overview.source?.label ?? null}
          tone={overview.ok ? 'neutral' : 'warning'}
        />
      )}
    </section>
  )
}
