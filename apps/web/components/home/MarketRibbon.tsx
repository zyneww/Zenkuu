import { getCryptoOverview, getNewListings, type MarketAsset, type NewListing } from '@zenkuu/data'
import { ChangeBadge, formatCurrency } from '@zenkuu/ui'

import { AssetLogo } from '@/components/asset/AssetLogo'
import { ROWS } from '@/components/home/overview-rows'
import { Money } from '@/components/locale/Money'
import { Link } from '@/i18n/navigation'
import { assetHref } from '@/lib/asset-routes'
import { buildListingIndex, matchListing, type ListingMatch } from '@/lib/listing-match'
import { getPhrase } from '@/lib/content'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * LE RUBAN DE MARCHÉ — LA TÊTE DE PAGE D'UNE PLACE DE COTATION
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── CE QU'IL REMPLACE ───────────────────────────────────────────────────────
 *
 * `HighlightsRow` posait ici une grille de sept vignettes repliable — capitalisation,
 * dominance, volume mondial, indice altcoin, peur et avidité, S&P 500 et or, pools en
 * tendance. C'était la disposition de CRYPTORANK, et elle répondait à la question
 * « dans quel état est le marché ? ».
 *
 * Ce bloc reprend celle de MEXC, qui répond à une autre : « qu'est-ce qui bouge, là,
 * maintenant ? ». Un bandeau de cours, puis trois cartes de trois lignes.
 *
 * ⚠️ CE QUI EST PARTI N'EST PAS PERDU, et il faut savoir où le retrouver :
 *
 *     capitalisation, volume, dominances  →  `PriceHeader`, deux blocs plus haut, qui
 *                                            les affichait DÉJÀ — le doublon partait
 *                                            avec la grille
 *     peur et avidité                     →  /sentiment, qui en porte aussi l'historique
 *     pools en tendance                   →  `MarketWidgets`, en bas de cette page
 *     indice altcoin                      →  /graphiques
 *     S&P 500 et or                       →  /indices et /matieres-premieres
 *
 * ── LES TROIS CARTES, ET POURQUOI CE NE SONT PAS CELLES DE LA RÉFÉRENCE ─────
 *
 * MEXC aligne « Hot Tokens », « Hot Futures » et « Newest / Calendar ». Deux de ces
 * trois supposent une place d'échange que ce site n'est pas :
 *
 *   · « Hot Futures » demande un carnet de contrats perpétuels par paire. Nous n'en
 *     tenons aucun — /perpetuels lit des taux de financement, pas des paires cotées.
 *   · le « Calendar » de la troisième est un CALENDRIER DES COTATIONS À VENIR, avec
 *     compte à rebours. Aucune de nos sources ne publie de listing futur : ni
 *     CoinGecko, ni Coinpaprika. Fabriquer un compte à rebours reviendrait à annoncer
 *     une date que personne ne nous a donnée, ce que le §5 interdit sans réserve.
 *
 * Les trois cartes portent donc ce que nos sources documentent réellement, dans le
 * même gabarit :
 *
 *     Hot Tokens   →  LES PLUS ÉCHANGÉES, par volume 24 h — c'est la mesure que
 *                     « hot » recouvre chez la référence, et nous l'avons
 *     Hot Futures  →  PLUS FORTES HAUSSES, déjà calculées par `getCryptoOverview`
 *     Newest       →  NOUVEAUTÉS, la moitié gauche de la troisième carte : les
 *                     cotations RÉCENTES, qui sont un fait mesuré. Le lien mène à la
 *                     page complète, là où la référence ouvre son calendrier.
 *
 * ── LE COÛT RÉSEAU EST D'UN SEUL APPEL ─────────────────────────────────────
 *
 * `getCryptoOverview('eur', ROWS)` partage sa clé de cache avec `CryptoBoard`, juste
 * en dessous : le bandeau, les deux premières cartes et l'index de rapprochement des
 * nouveautés sortent tous de cette réponse déjà payée. Seul `getNewListings` s'ajoute,
 * et il est lui-même partagé avec `/nouvelles-cotations`.
 */
export async function MarketRibbon() {
  const t = await getPhrase()

  const [overview, listings] = await Promise.all([
    getCryptoOverview('eur', ROWS),
    /* 300 comme `/nouvelles-cotations`, et c'est OBLIGATOIRE : la limite fait partie
       de la clé de cache. Un nombre à nous ferait un second appel Coinpaprika pour
       une liste dont on ne garde que les trois premières lignes. */
    getNewListings(300),
  ])

  const universe = overview.ok ? overview.data.topByMarketCap : []

  /*
    « Les plus échangées » se CLASSE ICI plutôt que dans la couche de données.
    `getCryptoOverview` rend l'univers brut, trié par capitalisation ; le reclasser par
    volume est une opération de mémoire sur des lignes déjà reçues. Y ajouter un champ
    dans la requête créerait une seconde clé de cache pour le même appel réseau.

    Le filtre sur `volume24h` précède le tri, et n'est pas décoratif : un actif dont la
    source ne publie pas le volume vaudrait `undefined` dans la comparaison, ce qui
    range les lignes au hasard plutôt qu'en dernier.
  */
  const traded = universe
    .filter((asset) => asset.volume24h !== undefined)
    .toSorted((a, b) => (b.volume24h as number) - (a.volume24h as number))
    .slice(0, 3)

  const gainers = overview.ok ? overview.data.gainers.slice(0, 3) : []

  /* L'index de rapprochement est bâti sur l'univers DÉJÀ EN MÉMOIRE — c'est ce qui
     rend les nouveautés cliquables sans le second appel que fait
     `/nouvelles-cotations`, qui lui n'a pas cet univers sous la main. */
  const index = buildListingIndex(universe)
  const fresh = listings.ok ? listings.data.slice(0, 3) : []

  return (
    <section className="flex flex-col gap-4" aria-label={t('Repères du marché')}>
      <Ticker assets={universe.slice(0, 12)} />

      {/*
        TROIS CARTES ÉGALES, ET NON UNE GRILLE PONDÉRÉE. Contrairement à la rangée de
        repères qu'elles remplacent — dont les quatre colonnes portaient des contenus
        de largeurs très inégales — ces trois-là portent exactement la même chose :
        trois lignes de nom, cours et variation. Des colonnes égales sont ici la bonne
        réponse, et c'est celle de la référence.

        En dessous de `xl`, deux colonnes puis une : la troisième carte passe alors en
        pleine largeur plutôt que de comprimer les deux autres.
      */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card
          title={t('Les plus échangées')}
          linkLabel={t('Tout voir')}
          href="/classements/volumes"
          empty={t('Volumes indisponibles')}
        >
          {traded.map((asset) => (
            <AssetRow key={asset.id} asset={asset} />
          ))}
        </Card>

        <Card
          title={t('Plus fortes hausses')}
          linkLabel={t('Tout voir')}
          href="/classements/hausses"
          empty={t('Palmarès indisponible')}
        >
          {gainers.map((asset) => (
            <AssetRow key={asset.id} asset={asset} />
          ))}
        </Card>

        {/*
          ── L'UNITÉ EST ÉCRITE DANS L'INTITULÉ, ET C'EST OBLIGATOIRE ──────────

          Coinpaprika ne cote cet endpoint qu'en DOLLARS. Les deux cartes précédentes
          suivent la devise du site ; celle-ci ne le peut pas, et convertir
          appliquerait un taux qui n'est pas celui de la cotation (§5). Trois cartes
          côte à côte dont une seule change d'unité sans le dire seraient un piège de
          lecture — d'où le suffixe, à l'endroit où l'œil arrive avant les chiffres.
        */}
        <Card
          title={t('Nouveautés')}
          unit="USD"
          /* « Tout voir » et non « Calendrier », qui est le mot de la référence : ce
             lien mène à la liste des cotations PASSÉES, et promettre un calendrier
             ferait attendre des dates à venir que nous n'avons pas. */
          linkLabel={t('Tout voir')}
          href="/nouvelles-cotations"
          empty={t('Cotations récentes indisponibles')}
        >
          {fresh.map((listing) => (
            <ListingRow key={listing.id} listing={listing} index={index} />
          ))}
        </Card>
      </div>
    </section>
  )
}

/* ── LE BANDEAU ────────────────────────────────────────────────────────────── */

/**
 * Bandeau de cours, à défilement horizontal.
 *
 * ── STATIQUE, ET NON ANIMÉ ─────────────────────────────────────────────────
 *
 * Le bandeau déroulant est le réflexe, et c'est le mauvais choix ici. Une bande qui
 * se déplace toute seule ne peut être ni lue au rythme du lecteur, ni sélectionnée à
 * la souris, ni parcourue au clavier sans que le focus fuie sous le curseur — et
 * `prefers-reduced-motion` obligerait de toute façon à servir la version fixe à une
 * partie du public. La version fixe étant meilleure, elle est servie à tout le monde.
 *
 * `overflow-x-auto` fait le reste : sur un écran étroit la bande se fait glisser au
 * doigt, ce qui est le geste attendu, et sur un grand écran les douze entrées tiennent.
 */
function Ticker({ assets }: { assets: MarketAsset[] }) {
  if (assets.length === 0) return null

  return (
    <div
      /* Les deux filets et non un cadre : le bandeau est une BANDE qui traverse la
         page, pas une carte. Un contour fermé en ferait un huitième bloc dans une
         page qui en aligne déjà beaucoup.

         `scrollbar-none` — l'utilitaire du dépôt, pas une règle réécrite ici. La
         barre native mesurait quinze pixels sous une bande qui en fait trente-huit :
         elle se lisait comme un second filet, plus épais que les deux vrais. Le
         défilement reste possible au doigt, à la molette horizontale et au clavier ;
         seule la gouttière disparaît. C'est acceptable ICI et nulle part ailleurs :
         chacun de ces douze cours est aussi une ligne du tableau, quinze centimètres
         plus bas — rien n'est atteignable par ce seul geste. */
      className="scrollbar-none flex items-center gap-6 overflow-x-auto border-y border-border-subtle py-2.5"
    >
      {assets.map((asset) => (
        <Link
          key={asset.id}
          href={assetHref(asset.assetClass, asset.id)}
          prefetch={false}
          className="group flex shrink-0 items-center gap-2 text-sm"
        >
          <AssetLogo asset={asset} size={18} />
          <span className="font-medium uppercase text-ink group-hover:text-brand">
            {asset.symbol}
          </span>
          <span className="tabular text-ink">
            <Money value={asset.price} from={asset.currency} />
          </span>
          {/* Pas de `filled` : un aplat coloré répété douze fois sur une seule bande
              en ferait la ligne la plus bruyante de la page. Le chevron et le signe
              portent déjà le sens sans la couleur (§9). */}
          <ChangeBadge value={asset.change24h} periodLabel="sur 24 heures" size="sm" />
        </Link>
      ))}
    </div>
  )
}

/* ── LA COQUE DES CARTES ───────────────────────────────────────────────────── */

/**
 * Une carte du ruban : un intitulé, un lien de sortie, trois lignes.
 *
 * `children` est un tableau qui peut être VIDE — une source en panne, un palmarès sans
 * hausse. La carte garde alors sa place et dit ce qui manque, plutôt que de disparaître
 * et de laisser les deux autres s'élargir sous les yeux du lecteur.
 */
function Card({
  title,
  unit,
  linkLabel,
  href,
  empty,
  children,
}: {
  title: string
  unit?: string
  linkLabel: string
  href: string
  empty: string
  children: React.ReactNode
}) {
  const filled = Array.isArray(children) ? children.length > 0 : Boolean(children)

  return (
    <section className="flex flex-col rounded-panel border border-border-subtle bg-panel px-5 py-4 transition-colors duration-200 hover:border-ink-muted/35">
      <header className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-medium text-ink">
          {title}
          {unit ? (
            <span className="ml-1.5 text-xs font-normal text-ink-muted">{unit}</span>
          ) : null}
        </h2>
        {/* Le chevron est HORS du texte traduit : collé au libellé il finirait dans
            les chaînes de traduction, où il n'a rien à faire. */}
        <Link
          href={href}
          className="shrink-0 text-xs text-ink-muted transition-colors hover:text-brand"
        >
          {linkLabel}
          <span aria-hidden="true"> ›</span>
        </Link>
      </header>

      {filled ? (
        <div className="mt-3 flex flex-col gap-2.5">{children}</div>
      ) : (
        <p className="mt-3 text-xs text-ink-muted">{empty}</p>
      )}
    </section>
  )
}

/**
 * Une ligne de carte pour un actif du classement.
 *
 * Trois colonnes en `flex` et non une grille : le nom prend la place restante
 * (`min-w-0` + `truncate`), le cours et la variation gardent la leur. Une grille à
 * colonnes fixes couperait « Wrapped liquid staked Ether » au même endroit sur les
 * trois cartes, y compris là où la place ne manque pas.
 */
function AssetRow({ asset }: { asset: MarketAsset }) {
  return (
    <Link
      href={assetHref(asset.assetClass, asset.id)}
      prefetch={false}
      className="group flex items-center gap-2.5 text-sm"
    >
      <AssetLogo asset={asset} size={20} />
      <span className="min-w-0 flex-1 truncate font-medium uppercase text-ink group-hover:text-brand">
        {asset.symbol}
      </span>
      <span className="tabular shrink-0 text-ink">
        <Money value={asset.price} from={asset.currency} />
      </span>
      <span className="tabular w-16 shrink-0 text-right">
        <ChangeBadge value={asset.change24h} periodLabel="sur 24 heures" size="sm" />
      </span>
    </Link>
  )
}

/**
 * Une ligne de carte pour une cotation récente.
 *
 * ── LA DESTINATION EST DIRECTE QUAND ON SAIT, INDIRECTE QUAND ON CHERCHE ───
 *
 * Même mécanique que `NewListingsTable`, et pour la même raison : les identifiants de
 * Coinpaprika ne sont pas ceux de nos fiches. Le rapprochement se fait par symbole ET
 * nom — jamais par symbole seul, des dizaines de jetons réutilisant « SOL » ou « BTC »,
 * et un lien plausible et faux est pire qu'un lien absent. Sans correspondance, le
 * résolveur `/resoudre` cherche à la demande.
 *
 * Le montant est en DOLLARS et `formatCurrency` l'écrit comme tel, sans passer par
 * `Money` qui convertirait vers la devise du site — voir la note de la carte.
 */
function ListingRow({
  listing,
  index,
}: {
  listing: NewListing
  index: Map<string, ListingMatch>
}) {
  const match = matchListing(listing, index)
  const href = match ? `/crypto/${match.id}` : `/resoudre/${encodeURIComponent(listing.name)}`
  const source = match?.image ?? listing.logo

  return (
    <Link href={href} prefetch={false} className="group flex items-center gap-2.5 text-sm">
      {/*
        ── LE REPLI EST UNE PASTILLE MUETTE, ET NON UN MONOGRAMME ─────────────

        `NewListingsTable` écrit les initiales dans son repli, et c'est justifié chez
        lui : sa colonne d'identité porte le nom complet sur trois cents lignes, où la
        vignette aide à retrouver une ligne déjà vue. Ici il y en a TROIS, le symbole
        est à deux caractères de la pastille, et des initiales de huit pixels ne
        diraient rien que le mot d'à côté ne dise mieux.

        Ce composant est par ailleurs SERVEUR : il n'a pas le `onError` qui, là-bas,
        bascule vers le repli quand la vignette rend un 404. Le repli ne joue donc que
        sur l'absence d'adresse, ce que le type documente comme rare.
      */}
      {source ? (
        // eslint-disable-next-line @next/next/no-img-element -- vignette 20px hors domaines optimisés
        <img src={source} alt="" width={20} height={20} className="shrink-0 rounded-pill" loading="lazy" />
      ) : (
        <span className="size-5 shrink-0 rounded-pill bg-brand-soft" aria-hidden="true" />
      )}
      <span className="min-w-0 flex-1 truncate font-medium uppercase text-ink group-hover:text-brand">
        {listing.symbol}
      </span>
      <span className="tabular shrink-0 text-ink">{formatCurrency(listing.price, 'USD')}</span>
      <span className="tabular w-16 shrink-0 text-right">
        <ChangeBadge value={listing.change24h} periodLabel="sur 24 heures" size="sm" />
      </span>
    </Link>
  )
}
