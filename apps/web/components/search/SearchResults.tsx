'use client'

import { Flame, TrendingUp } from 'lucide-react'

import { ChangeBadge } from '@/components/locale/ChangeBadge'

import { Link, type AppHref } from '@/i18n/navigation'
import { WatchlistStar } from '@/components/watchlist/WatchlistStar'
import { Money } from '@/components/locale/Money'
import { AssetThumb } from '@/components/search/AssetThumb'
import { useContent, usePhrase } from '@/components/locale/ContentProvider'
import { Badge } from '@/components/ui/badge'
import type { AssetClass, MarketCategory } from '@zenkuu/data'
import { useFormatters } from '@/components/locale/useFormatters'
import { useCallback, useMemo } from 'react'

import { CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command'
import { SearchRecent } from '@/components/search/SearchRecent'
import { SearchWatchlist } from '@/components/search/SearchWatchlist'
import { useRecentSearches } from '@/components/search/recent-searches'
import { HighlightMatch } from '@/components/search/HighlightMatch'
import type { SearchScope } from '@/components/search/SearchScopes'
import { Spinner } from '@/components/ui/spinner'
import { assetHref } from '@/lib/asset-routes'
import type { useAssetSearch } from '@/components/search/useAssetSearch'

/**
 * Corps de résultats, PARTAGÉ par le champ de l'en-tête et la fenêtre de recherche.
 *
 * Il ne porte aucune décision : ni l'ouverture, ni la position, ni le cadre. Il reçoit
 * l'état renvoyé par `useAssetSearch` et le met en forme. C'est ce qui permet aux deux
 * surfaces d'afficher exactement la même chose — y compris les cas que l'on oublie
 * toujours dans une copie : recherche en cours, aucun résultat, source crypto saturée.
 *
 * ── IL DOIT ÊTRE RENDU DANS UN `<CommandList>` ───────────────────────────────
 *
 * Ce composant ne rend que le CONTENU d'une liste `cmdk` : des groupes et des lignes.
 * Ses deux appelants l'enveloppent chacun dans le `Command`/`CommandList` qui convient
 * à sa forme — une fenêtre modale pour l'un, un tiroir sous le champ pour l'autre.
 * Rendu hors de ce contexte, cmdk lève.
 *
 * ⚠️ LES DEUX APPELANTS DOIVENT POSER `shouldFilter={false}`. Par défaut, cmdk filtre
 * lui-même les lignes sur la saisie du champ. Ici la recherche est faite PAR LE
 * SERVEUR : ce que ce composant reçoit est déjà le résultat, et laisser cmdk le
 * refiltrer ferait disparaître les bonnes réponses — « btc » ne contient pas
 * « Bitcoin » au sens de sa comparaison de chaînes, et la ligne serait masquée.
 *
 * ── CE QUE cmdk APPORTE, ET QUI ÉTAIT ÉCRIT À LA MAIN ────────────────────────
 *
 * `HeaderSearch` portait une fonction de trente lignes qui lisait les `a[href]` du
 * tiroir par `querySelectorAll` à chaque frappe pour déplacer le focus à la flèche.
 * cmdk fait mieux, et sans code : les flèches déplacent une SÉLECTION (l'élément
 * reste dans l'ordre du DOM, `aria-activedescendant` l'annonce), `Entrée` déclenche
 * la ligne sélectionnée, et la sélection se replace toute seule quand la liste change
 * sous elle — ce que l'index maison ne savait pas faire, il pointait régulièrement une
 * ligne disparue depuis la dernière réponse réseau.
 *
 * ── LES QUATRE ÉTATS, DANS L'ORDRE OÙ ILS SE PRÉSENTENT ───────────────────────
 *
 *   1. saisie trop courte  → tendances
 *   2. requête en vol      → « recherche en cours »
 *   3. résultats           → crypto d'abord, puis les autres classes
 *   4. rien                → message nommant la requête, ou panne de la source
 *
 * L'ordre compte : tester « aucun résultat » avant « en cours » ferait clignoter le
 * message d'absence à chaque frappe.
 */
export function SearchResults({
  scope = 'all',
  search,
  onNavigate,
}: {
  search: ReturnType<typeof useAssetSearch>
  /** La portée choisie aux onglets. `'all'` par défaut : sans onglets, tout s'affiche. */
  scope?: SearchScope
  onNavigate: () => void
}) {
  const fr = useContent()
  const t = usePhrase()

  /* L'historique vit dans le navigateur, pas dans le crochet de recherche : il ne
     dépend d'aucune requête et survit à la fermeture du panneau. Voir
     `recent-searches.ts`. */
  const recent = useRecentSearches()
  const { remember } = recent

  /*
   * ── CE QU'ON MÉMORISE : L'ACTIF OUVERT, PAS LA REQUÊTE TAPÉE ──────────────
   *
   * « bit », « bitc », « bitco » sont trois requêtes qui mènent au même endroit ; une
   * liste qui les garderait toutes serait une liste de frappes plutôt qu'une liste de
   * destinations. On retient donc la LIGNE CHOISIE, ce qui rend aussi l'historique
   * immédiatement cliquable — il porte des actifs, pas des chaînes à retaper.
   *
   * ⚠️ SEULS LES RÉSULTATS DE RECHERCHE ALIMENTENT L'HISTORIQUE. Ouvrir une tendance
   * ou une ligne de l'historique lui-même ne l'enrichit pas : on n'a rien CHERCHÉ, on
   * a suivi une suggestion, et la remonter en tête chasserait une recherche réelle de
   * la liste.
   */
  const ouvrirResultat = useCallback(
    (item: { id: string; assetClass: AssetClass; name: string; symbol: string; image?: string }) => {
      remember({
        id: item.id,
        assetClass: item.assetClass,
        name: item.name,
        symbol: item.symbol,
        ...(item.image ? { image: item.image } : {}),
      })
      onNavigate()
    },
    [remember, onNavigate],
  )
  const { results, loading, trending, categories, followed, showTrending, found: tous, query } = search
  const term = query.trim()

  /* La portée retranche, elle ne cherche pas : le serveur a déjà répondu, et restreindre
     ici évite un aller-retour à chaque changement d'onglet. */
  const found = scope === 'all' ? tous : tous.filter((item) => item.assetClass === scope)

  /*
   * ── LES GROUPES SE DÉDUISENT DES RÉSULTATS, ILS NE SONT PAS DÉCLARÉS ──────
   *
   * L'ordre est FIXE et écrit ici. Il suit la façon dont le site se présente —
   * cryptomonnaies d'abord, puis les marchés traditionnels dans l'ordre du menu — et
   * non le nombre de résultats de chaque famille.
   *
   * Un ordre par décompte se réarrangerait à chaque frappe : taper « bi » puis « bit »
   * ferait glisser le bloc qu'on visait sous le curseur. Un ordre stable se mémorise.
   *
   * ⚠️ UNE FAMILLE VIDE NE PRODUIT PAS DE GROUPE — d'où le `filter` final. Sans lui,
   * `CommandGroup` rendrait un intitulé suivi de rien, ce qui se lit comme une panne.
   */
  const groupes = useMemo(() => {
    const ordre: AssetClass[] = ['crypto', 'stock', 'etf', 'index', 'forex', 'commodity', 'nft']
    const parClasse = new Map<AssetClass, typeof found>()

    for (const item of found) {
      const liste = parClasse.get(item.assetClass)
      if (liste) liste.push(item)
      else parClasse.set(item.assetClass, [item])
    }

    return ordre
      .map((classe) => ({ classe, items: parClasse.get(classe) ?? [] }))
      .filter((groupe) => groupe.items.length > 0)
  }, [found])

  if (showTrending) {
    return (
      <>
        {/* ── L'HISTORIQUE PASSE AVANT LES TENDANCES ────────────────────────
            Ce que le lecteur a lui-même consulté vaut mieux qu'un classement
            général : c'est la seule liste du panneau qui lui soit propre. La
            référence fait le même partage — l'historique d'un côté, les plus
            consultés de l'autre —, et notre panneau étant en une colonne, la
            hiérarchie se dit par l'ordre. */}
        <SearchRecent entries={recent.entries} onClear={recent.clear} onNavigate={onNavigate} />

        {/* ── PUIS CE QU'IL SUIT, AVANT CE QUE TOUT LE MONDE REGARDE ───────
            Même échelle que ci-dessus : l'historique est ce que CE lecteur a fait,
            sa liste de suivi ce qu'il a CHOISI de garder, les tendances ce que les
            autres consultent. Du plus personnel au plus général.

            C'est la seule des trois à se montrer VIDE : un panneau qui tairait la
            liste de suivi à qui n'en a pas ne lui apprendrait jamais qu'elle existe. */}
        <SearchWatchlist followed={followed} onNavigate={onNavigate} />

        <CommandGroup
          heading={
            <GroupHeading
              title={fr.search.trendingTitle}
              hint={fr.search.trendingHint}
              /* La flamme de la référence, et non la courbe ascendante : celle-ci dit
               « ça monte », qui est faux d'un actif en tendance à la baisse. La flamme
               dit « on en parle », qui est ce que le classement mesure. */
              icon={<Flame className="size-3.5" aria-hidden="true" />}
              columns={t('Prix/24 h %')}
            />
          }
        >
          {/* ══════════════════════════════════════════════════════════════════
            LES TENDANCES PASSENT DES PASTILLES AUX LIGNES

            ⚠️ CECI RENVERSE UN CHOIX DOCUMENTÉ, et voici ce qu'il disait : « Relevé
            chez Backpack : champ vide → pastilles, trois par rangée ; champ rempli →
            lignes pleine largeur. Une pastille tient sur une demi-ligne : on en voit
            vingt d'un coup, ce qu'il faut pour PARCOURIR une sélection qu'on n'a pas
            demandée. »

            L'argument se tenait pour Backpack. La référence est désormais DropsTab, et
            elle fait l'inverse : ses tendances sont des lignes pleine largeur, portant
            chacune un cours et une variation.

            Ce n'est pas qu'un changement de goût. Une pastille ne peut PAS porter de
            cours — il n'y tient pas —, et un classement de tendances sans prix ne dit
            que des noms. Les lignes en montrent moins à la fois et disent beaucoup
            plus de chacune ; c'est le bon échange quand la liste fait huit entrées.

            `ResultRow` les rend sans modification : elle portait déjà le cours et la
            variation en option, pour cet usage exactement.
            ══════════════════════════════════════════════════════════════════ */}
          {trending.length > 0 ? (
            trending.map((asset) => (
              <ResultRow
                key={asset.id}
                href={assetHref(asset.assetClass, asset.id)}
                name={asset.name}
                symbol={asset.symbol}
                image={asset.image}
                {...(asset.rank !== undefined ? { rank: asset.rank } : {})}
                {...(asset.price !== undefined
                  ? { price: asset.price, currency: asset.currency }
                  : {})}
                {...(asset.change24h !== undefined ? { change24h: asset.change24h } : {})}
                /* L'étoile n'apparaît qu'une fois `/api/suivi` revenu ET le suivi
                 disponible sur cette instance. Voir la note de la propriété : une
                 étoile dont l'état de départ est faux retire au lieu d'ajouter. */
                {...(followed?.available
                  ? {
                      watch: {
                        assetClass: asset.assetClass,
                        assetId: asset.id,
                        following: followed.ids.has(asset.id),
                      },
                    }
                  : {})}
                onNavigate={onNavigate}
              />
            ))
          ) : (
            <p className="px-3 py-4 text-xs text-ink-muted">{fr.search.trendingEmpty}</p>
          )}
        </CommandGroup>

        {/* ══════════════════════════════════════════════════════════════════════
            LA SECONDE SECTION — RELEVÉE SUR LA RECHERCHE D'UNISWAP
            ══════════════════════════════════════════════════════════════════════

            Leur panneau ouvre sur DEUX listes : « Popular tokens » puis « Popular NFT
            collections », chacune précédée d'une icône de tendance, chaque ligne
            portant un logo rond, un nom, une mention grise dessous et une valeur
            cadrée à droite.

            ── POURQUOI PAS DES COLLECTIONS NFT, QUI SERAIT LA COPIE EXACTE ───────

            Parce que ZENKUU ne peut pas en publier un CLASSEMENT. L'endpoint qui
            classe les collections par volume (`/nfts/markets`) est réservé à l'offre
            payante de la source — il répond `error_code 10005`, vérifié, et c'est
            consigné dans `coingecko-extras.ts`. Ce site n'a qu'une SÉLECTION arrêtée
            de six collections, lues une par une.

            Intituler « populaires » une liste écrite à la main serait faux, et six
            appels séquencés derrière un limiteur ouvriraient le panneau en plusieurs
            secondes au lieu d'un instant.

            ── CE QUE LA SECTION PORTE À LA PLACE ────────────────────────────────

            Les catégories, qui sont un VRAI classement : `getTopNarratives` trie les
            secteurs par ampleur du mouvement sur vingt-quatre heures, au-dessus d'un
            milliard de capitalisation. Un seul appel, déjà partagé avec le panneau
            « Narratifs » de l'accueil, et servi dans la même réponse que les
            tendances ci-dessus.

            La grammaire de ligne est celle de ce panneau d'accueil — nom, puis
            capitalisation en gris dessous, variation à droite — transposée dans la
            géométrie des lignes de recherche. C'est exactement la disposition de la
            capture : le nom, un fait de TAILLE en gris dessous (chez eux « 8,888
            items »), et la valeur à droite.

            ⚠️ LA CAPITALISATION RESTE EN DOLLARS, ET N'EST PAS CONVERTIE. La source
            ne la publie qu'ainsi pour les catégories — c'est la même réserve que porte
            `NarrativesPanel`, et la convertir donnerait un montant juste au change du
            jour mais faussement précis sur une donnée déjà agrégée.
            ══════════════════════════════════════════════════════════════════════ */}
        {categories.length > 0 ? (
          <CommandGroup
            heading={
              <GroupHeading
                title={t('Catégories en vue')}
                /* La courbe ascendante, et non la flamme des tendances. Ici elle est
                   JUSTE : `getTopNarratives` classe par ampleur du mouvement, ce qui
                   est bien une variation. La flamme, elle, dit « on en parle » — ce
                   que mesure le classement des tendances, et pas celui-ci. */
                icon={<TrendingUp className="size-3.5" aria-hidden="true" />}
                /* PAS d'intitulé de colonne, contrairement aux tendances au-dessus.
                   Là-haut il en faut un : deux colonnes se suivent à droite, un cours
                   et une variation, et rien ne dit laquelle est laquelle. Ici la
                   droite ne porte qu'une pastille colorée signée — elle se décrit
                   seule, et un « 24 h % » de plus n'aurait fait qu'allonger un titre
                   déjà long dans un panneau de 26 rem. */
              />
            }
          >
            {categories.map((category) => (
              <CategoryRow key={category.id} category={category} onNavigate={onNavigate} />
            ))}
          </CommandGroup>
        ) : null}
      </>
    )
  }

  if (loading && !results) {
    return (
      /* `CommandEmpty` et non un `<p>` : cmdk le marque `role="presentation"` et le
         retire du décompte des lignes sélectionnables. Un paragraphe ordinaire posé
         dans la liste resterait annoncé comme une option par la synthèse vocale. */
      <CommandEmpty className="flex items-center justify-center gap-2 py-6 text-xs text-ink-muted">
        <Spinner className="size-3.5" />
        {fr.search.loading}
      </CommandEmpty>
    )
  }

  if (found.length > 0 && results) {
    return (
      <>
        {/* ══════════════════════════════════════════════════════════════════
            UN GROUPE PAR CLASSE D'ACTIF, ET NON « CRYPTO » PUIS « LE RESTE »

            La liste portait deux blocs : les cryptomonnaies, puis un fourre-tout
            intitulé « autres actifs » où actions, ETF, indices, devises et matières
            premières se mêlaient — chacun réduit à une pastille de classe collée à son
            nom.

            Backpack groupe par TYPE, un intitulé par famille : STOCKS, FUTURES, SPOT,
            EARN. C'est ce qui permet de balayer la liste sans lire : on saute au bloc
            qui nous intéresse, au lieu de trier des pastilles à l'œil.

            ⚠️ L'ORDRE DES GROUPES EST FIXE, PAS DÉCROISSANT PAR NOMBRE. Un ordre qui
            suivrait le décompte changerait à chaque frappe : le bloc qu'on visait se
            déplacerait sous le curseur entre deux lettres. Un ordre stable se mémorise
            et rend la liste prévisible.

            La pastille de classe disparaît des lignes : l'intitulé du groupe le dit
            déjà, et le répéter sur chaque ligne était du bruit. */}
        {groupes.map(({ classe, items }) => (
          <CommandGroup key={classe} heading={<GroupHeading title={fr.assetClass[classe]} />}>
            {items.map((item) => (
              <ResultRow
                key={`${classe}-${item.id}`}
                href={assetHref(item.assetClass, item.id)}
                name={item.name}
                symbol={item.symbol}
                image={item.image}
                rank={item.rank}
                query={term}
                onNavigate={() => ouvrirResultat(item)}
              />
            ))}
          </CommandGroup>
        ))}

        {/* Panne de la source crypto : on le dit au lieu de laisser croire qu'aucune
            cryptomonnaie ne correspond à la recherche (§5). */}
        {results.cryptoIndisponible ? (
          <p className="px-3 py-2 text-micro text-ink-muted">{fr.search.cryptoUnavailable}</p>
        ) : null}
      </>
    )
  }

  return (
    <CommandEmpty className="px-3 py-6 text-center text-xs text-ink-muted">
      {results?.cryptoIndisponible
        ? fr.search.cryptoUnavailable
        : t('Aucun actif ne correspond à « {requete} ».').replace('{requete}', query)}
    </CommandEmpty>
  )
}

/**
 * Intitulé d'un groupe.
 *
 * `CommandGroup` accepte un `heading` en `ReactNode`, ce qui permet d'y loger l'icône
 * et l'indice sans quitter la sémantique de cmdk — l'intitulé reste relié au groupe
 * par `aria-labelledby`, ce qu'un `<h2>` posé à côté ne ferait pas.
 */
function GroupHeading({
  title,
  hint,
  icon,
  /**
   * Intitulé de la colonne de droite, cadré sur elle.
   *
   * Il n'existe que pour les tendances, seules lignes à porter un cours : les
   * résultats de recherche n'en ont pas, et un en-tête de colonne au-dessus d'une
   * colonne absente annoncerait une donnée manquante plutôt que de la nommer.
   */
  columns,
}: {
  title: string
  hint?: string
  icon?: React.ReactNode
  columns?: string
}) {
  return (
    <span className="flex items-center gap-1.5">
      {icon}
      {title}
      {hint ? <span className="font-normal normal-case tracking-normal">· {hint}</span> : null}
      {columns ? (
        /* `ml-auto` plutôt qu'un `justify-between` sur le parent : l'icône, le titre et
           l'indice doivent rester groupés à gauche, et `justify-between` les aurait
           répartis sur toute la largeur dès qu'il y a trois enfants. */
        <span className="ml-auto pr-1 font-normal normal-case tracking-normal">{columns}</span>
      ) : null}
    </span>
  )
}

function ResultRow({
  href,
  name,
  symbol,
  image,
  rank,
  badge,
  price,
  currency,
  change24h,
  query,
  onNavigate,
  watch,
}: {
  href: AppHref
  name: string
  symbol: string
  image?: string
  rank?: number
  badge?: string
  /**
   * Étoile de suivi, à gauche de la ligne — la référence DropsTab la place là.
   *
   * ⚠️ ELLE N'ARRIVE QUE QUAND SON ÉTAT EST CONNU, jamais « par défaut à vide ».
   * `WatchlistStar` déclenche une BASCULE : rendue à « non suivi » sur un actif déjà
   * suivi, elle le RETIRERAIT au premier clic. C'est pourquoi la propriété est
   * facultative et que l'appelant l'omet tant que `/api/suivi` n'a pas répondu —
   * l'absence d'étoile ne trompe personne, une étoile à l'envers si.
   *
   * Les résultats de RECHERCHE n'en portent pas : ils mêlent les sept classes
   * d'actifs, quand la route de suivi n'en lit qu'une. Promettre l'étoile partout
   * demanderait sept lectures ou une lecture non filtrée ; les tendances, elles, sont
   * toutes des cryptomonnaies.
   */
  watch?: { assetClass: string; assetId: string; following: boolean }
  /* ── LE COUPLE COURS + VARIATION ─────────────────────────────────────
     Les trois voyagent ENSEMBLE ou pas du tout : un cours sans sa devise n'est
     qu'un nombre, et une variation sans son cours n'a rien à qualifier. Les
     résultats de RECHERCHE ne les portent pas — l'endpoint de recherche ne
     publie qu'un nom, un symbole et un rang — quand les TENDANCES, elles, sont
     rechargées enrichies. La ligne sert donc les deux formes. */
  price?: number
  currency?: string
  change24h?: number
  /**
   * Ce qui a été tapé, pour surligner la part correspondante du nom et du symbole.
   *
   * Optionnelle : la rangée des tendances s'affiche AVANT toute frappe, et n'a donc
   * rien à surligner. Absente, la ligne se rend en texte plein.
   */
  query?: string
  onNavigate: () => void
}) {
  return (
    /*
      ── `asChild` : LA LIGNE RESTE UN VRAI LIEN ────────────────────────────────

      Le réflexe avec cmdk est `onSelect` + `router.push`. Il est faux ici : un
      résultat de recherche doit s'ouvrir dans un onglet au clic milieu, se copier par
      le menu contextuel et exister pour les robots d'indexation — trois choses qu'un
      `<div>` qui navigue en JavaScript ne fait pas.

      `asChild` donne le comportement de cmdk (sélection à la flèche, `Entrée` qui
      déclenche) à un `<a href>` produit par le `Link` localisé de next-intl. La
      sélection clavier active alors le lien lui-même.

      ⚠️ `value` EST OBLIGATOIRE et doit être STABLE. cmdk s'en sert comme identité de
      ligne ; sans lui il retombe sur le texte rendu, et deux actifs homonymes sur deux
      classes différentes se confondraient. On y met le nom ET le symbole, ce qui rend
      aussi la ligne trouvable par les deux si le filtrage de cmdk était un jour
      réactivé.

      `rounded-control` et non `rounded-card` : ces lignes s'aboutent et se
      parcourent, elles ne se prennent pas une par une. Voir la doctrine des deux
      familles de rayons dans globals.css.
    */
    /*
      ── L'ÉTOILE EST POSÉE PAR-DESSUS LA LIGNE, ET NON DEDANS ───────────────

      ⚠️ UN `<button>` DANS UN `<a>` EST DU HTML INVALIDE, et le navigateur ne le répare
      pas gracieusement : il sort le bouton du lien à l'analyse — ce qui défait la mise
      en page — et un clic sur l'étoile navigue AUSSI. Or la ligne entière EST le lien :
      c'est ce que `asChild` obtient, et la note ci-dessus dit pourquoi on y tient.

      L'étoile vit donc en FRÈRE du lien, dans un conteneur positionné, et se superpose
      à une gouttière que le lien lui réserve. Deux éléments côte à côte dans le DOM,
      superposés à l'écran : le lien garde sa surface pleine largeur — donc son survol
      et sa surbrillance de sélection — et le bouton reçoit ses propres clics.

      ⚠️ LA GOUTTIÈRE EST UN ÉLÉMENT, PAS UN `padding`, ET C'EST UN CORRECTIF. Elle
      s'écrivait `pl-10` sur le `CommandItem`. Mesuré dans le navigateur : le `cn()` de
      shadcn a laissé coexister `px-2` et `pl-10` dans l'attribut, et la cascade a
      tranché pour `px-2` — l'étoile se retrouvait posée SUR le logo. Une cale dans le
      flux ne dépend d'aucun arbitrage : elle occupe sa largeur, le `gap` du lien fait
      le reste.

      cmdk le tolère, et ce n'est pas un pari : il collecte ses lignes par
      `querySelectorAll('[cmdk-item]')`, un sélecteur de DESCENDANCE, et sa logique de
      groupe cherche explicitement `closest('[cmdk-group-items] > *')` — c'est-à-dire
      qu'elle prévoit un conteneur intermédiaire.
    */
    <div className={watch ? 'relative' : undefined}>
      {watch ? (
        <span className="absolute left-3 top-1/2 z-10 -translate-y-1/2">
          <WatchlistStar
            assetClass={watch.assetClass}
            assetId={watch.assetId}
            label={name}
            symbol={symbol}
            /* Le chemin que le suivi fait réexplorer au cache. La fiche de l'actif est
               le seul écran où cet état vient du rendu serveur ; l'overlay, lui, le
               relira à sa prochaine ouverture. */
            path={`/crypto/${watch.assetId}`}
            initialFollowing={watch.following}
            available
          />
        </span>
      ) : null}

      <CommandItem
        asChild
        value={`${name} ${symbol}`}
        className="gap-3 rounded-control px-3 py-2 data-[selected=true]:bg-surface-muted"
      >
        <Link href={href} onClick={onNavigate}>
          {/* La cale de l'étoile : 32 px, sa largeur exacte. `aria-hidden` — c'est du
              vide, et la synthèse vocale annonce déjà le bouton qui se pose dessus. */}
          {watch ? <span aria-hidden="true" className="w-8 shrink-0" /> : null}

          {/* `AssetThumb` et non le bloc recopié qui tenait ici : c'est le composant
              qui porte le repli en monogramme ET, depuis le 2026-09-08, celui sur image
              rompue. Le bloc local ne connaissait que le premier des deux. */}
          <AssetThumb name={name} symbol={symbol} {...(image ? { image } : {})} />

          {/*
            ══════════════════════════════════════════════════════════════════════
            LE SYMBOLE PASSE DEVANT, LE NOM LE SUIT EN GRIS
            ══════════════════════════════════════════════════════════════════════

            La ligne s'écrivait « Ethereum … ETH … #2 » : le nom d'abord, le code rejeté
            à droite, le rang à l'extrême droite. Trois informations d'identité réparties
            sur toute la largeur, et l'œil devait traverser la ligne pour les réunir.

            Elles sont désormais GROUPÉES à gauche, dans l'ordre où on les reconnaît :
            `ETH` en gras — c'est ce qu'on tape et ce qu'on retient —, son rang collé
            contre lui en pastille, puis `Ethereum` en gris dessous. La droite de la
            ligne est rendue au COURS et à sa variation, qui sont l'autre moitié de ce
            qu'on vient chercher.

            Deux lignes de texte et non une : sur 26 rem, « Ethereum » à côté de « ETH »
            plus un cours plus un pourcentage se serait tronqué dès les noms longs.
          */}
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="flex items-center gap-1.5">
              {/* 13 px et graisse 500, mesurés chez Backpack — au lieu de 14 px en
                  600. Le symbole reste la voix la plus forte de la ligne, mais dans une
                  liste dense un demi-gras suffit à le détacher : la casse en capitales
                  fait déjà la moitié du travail. */}
              <span className="truncate text-[13px] font-medium uppercase text-ink">
                <HighlightMatch text={symbol} query={query ?? ''} />
              </span>

              {rank !== undefined ? (
                <span className="tabular shrink-0 rounded-[4px] bg-surface-muted px-1 text-micro leading-4 text-ink-muted">
                  {rank}
                </span>
              ) : badge ? (
                <Badge variant="secondary" className="shrink-0 px-1.5 py-0 text-micro font-normal">
                  {badge}
                </Badge>
              ) : null}
            </span>

            {/* 11 px, mesuré. Le nom est la SECONDE voix : on l'a déjà reconnu par son
                symbole, il ne sert qu'à lever un doute. */}
            <span className="truncate text-[11px] text-ink-muted">
              <HighlightMatch text={name} query={query ?? ''} />
            </span>
          </span>

          {/* Le cours n'apparaît que si la ligne le porte — voir la note des props. Le
              groupe entier disparaît alors, plutôt que de réserver une colonne vide qui
              décalerait le nom sur les résultats de recherche. */}
          {price !== undefined && currency ? (
            <span className="flex shrink-0 flex-col items-end gap-0.5">
              <span className="tabular text-sm text-ink">
                <Money value={price} from={currency} />
              </span>
              {change24h !== undefined ? <ChangeBadge value={change24h} size="sm" /> : null}
            </span>
          ) : null}
        </Link>
      </CommandItem>
    </div>
  )
}

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * LA LIGNE D'UNE CATÉGORIE — PROCHE DE `ResultRow`, MAIS PAS LA MÊME
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── POURQUOI UN COMPOSANT SÉPARÉ PLUTÔT QUE TROIS PROPRIÉTÉS DE PLUS ─────────
 *
 * `ResultRow` porte déjà onze propriétés, dont trois liées entre elles par un
 * commentaire (« cours, devise et variation voyagent ensemble ou pas du tout ») et
 * une quatrième — l'étoile de suivi — qui l'oblige à s'envelopper dans un conteneur
 * positionné. Une catégorie n'a AUCUNE de ces quatre : pas de symbole, pas de rang,
 * pas de cours convertible, et rien à suivre.
 *
 * L'y faire entrer aurait demandé de rendre facultatif ce qui ne l'est pas — le
 * symbole, qui est la voix principale de sa première ligne — et de brancher chaque
 * bloc sur son absence. Vingt lignes ici coûtent moins qu'un composant qui rend deux
 * objets différents selon ce qu'on ne lui passe pas.
 *
 * ── CE QUI EST DÉLIBÉRÉMENT PARTAGÉ ─────────────────────────────────────────
 *
 * La GÉOMÉTRIE, à la classe près : mêmes `gap-3 rounded-control px-3 py-2`, même
 * vignette de 22 px, mêmes corps de 13 et 11 px, même surbrillance de sélection. Les
 * deux sections doivent se parcourir comme une seule liste — c'est ce que fait la
 * capture d'Uniswap, dont les deux sections ont exactement la même ossature de ligne.
 */
function CategoryRow({
  category,
  onNavigate,
}: {
  category: MarketCategory
  onNavigate: () => void
}) {
  const nombres = useFormatters()
  const t = usePhrase()

  /* Le premier logo représentatif publié par la source (`top_3_coins`). Il ne coûte
     aucun appel — il arrive dans la même réponse que la catégorie. */
  const logo = category.topAssets?.[0]

  return (
    <CommandItem
      asChild
      /* Voir `ResultRow` : `value` est l'identité de ligne pour cmdk. Le nom seul
         suffit ici — deux secteurs homonymes n'existent pas dans cette source. */
      value={category.name}
      className="gap-3 rounded-control px-3 py-2 data-[selected=true]:bg-surface-muted"
    >
      <Link
        href={{ pathname: '/categories/[id]', params: { id: category.id } }}
        onClick={onNavigate}
      >
        {/* ⚠️ `AssetThumb`, ET C'EST UNE CORRECTION. Ce bloc était recopié ici — la
            TROISIÈME copie, alors que l'en-tête de ce composant explique qu'il existe
            justement parce qu'il avait été écrit deux fois. La catégorie « Robinhood
            Chain Meme » a montré le coût : elle porte une URL de logo qui 404, et la
            copie locale affichait l'icône d'image cassée du navigateur.

            Le symbole vaut le nom, faute de mieux : une catégorie n'en a pas, et
            `monogram` s'en sert pour tirer ses initiales. */}
        <AssetThumb
          name={category.name}
          symbol={category.name}
          {...(logo ? { image: logo } : {})}
        />

        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          {/* Pas de capitales ici, contrairement au symbole d'un actif : « Real World
              Assets » en capitales se lirait comme un sigle. */}
          <span className="truncate text-[13px] font-medium text-ink">{category.name}</span>

          {/* Le fait de TAILLE, en gris — la place qu'occupe « 8,888 items » dans la
              capture. En dollars et non converti : voir la réserve de la section. */}
          <span className="tabular truncate text-[11px] text-ink-muted">
            {nombres.currency(category.marketCap, 'USD', { compact: true }) ?? '—'}
            {/* Sans ce mot, la synthèse vocale lit « Real World Assets, 12 Md $ »
                sans dire de QUOI parle le montant — un cours ? un volume ? À l'œil la
                colonne se devine par sa place ; à l'oreille il n'y a pas de colonne. */}
            <span className="sr-only"> {t('Capitalisation')}</span>
          </span>
        </span>

        <ChangeBadge value={category.marketCapChange24h} size="sm" />
      </Link>
    </CommandItem>
  )
}
