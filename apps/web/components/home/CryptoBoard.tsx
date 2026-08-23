import { getCryptoOverview } from '@zenkuu/data'
import { EmptyState } from '@zenkuu/ui'

import { ROWS } from '@/components/home/MoversRow'
import { MarketBrowser } from '@/components/market/MarketBrowser'
import { Link } from '@/i18n/navigation'
import { getContent, getPhrase } from '@/lib/content'
import { getWatchlistIds } from '@/lib/watchlist-actions'

/** Destination de « Tout voir » — et base des liens de tri du tableau. */
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
 * 30 j, volume, capitalisation, courbe 7 jours. Il y ajoute ce qu'elle a ailleurs sur
 * la page — la recherche, les vues rapides (tous / tendance / gagnants / perdants /
 * suivis), le partage « échangeables seulement », le sélecteur de colonnes.
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
 * que mène « Tout voir », et c'est le lecteur qui veut la page 2 qui s'y adresse.
 *
 * ── LE MÊME `ROWS` QUE LES CARTES, ET CE N'EST PAS UN DÉTAIL ───────────────
 *
 * La clé de cache de `getCryptoOverview` contient la devise ET la limite. Écrire un
 * nombre différent de celui de `MoversRow` ferait un SECOND appel réseau pour un
 * univers identique. `ROWS` est donc importé plutôt que redéclaré.
 */
export async function CryptoBoard() {
  const fr = await getContent()
  const t = await getPhrase()

  const [overview, watchlist] = await Promise.all([
    getCryptoOverview('eur', ROWS),
    getWatchlistIds('crypto'),
  ])

  const assets = overview.ok ? overview.data.topByMarketCap : []

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-normal text-ink-muted">{t('Cotations — cryptomonnaies')}</h2>
        <Link
          href={BASE_PATH}
          className="shrink-0 text-sm text-brand transition-colors hover:text-brand-strong"
        >
          {fr.home.seeAll} <span aria-hidden="true">→</span>
        </Link>
      </div>

      {assets.length > 0 ? (
        <>
          <MarketBrowser
            assets={assets}
            assetClass="crypto"
            page={1}
            perPage={PER_PAGE}
            sortBy="marketCap"
            direction="desc"
            /* Le tri par en-tête écrit dans l'URL et recharge la page : il n'a pas de
               sens ici, où la page ne lit aucun paramètre. Le lecteur qui veut trier
               l'univers entier suit « Tout voir ». */
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
          />

          <p className="text-xs text-ink-muted">
            {t(
              'Les {n} plus grandes capitalisations. Recherche, vues et filtres portent sur ces lignes ; la recherche de l’en-tête interroge tout le catalogue.',
            ).replace('{n}', String(assets.length))}
          </p>
        </>
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
