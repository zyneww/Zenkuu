# Audit de CoinGecko

Relevé page par page en vue de la migration de ZENKUU. Ce document décrit un site
tiers : il n'en reproduit ni le code, ni les textes, ni les assets de marque, et ne
consigne que des mesures, chacune datée.

Spec : `docs/superpowers/specs/2026-08-29-coingecko-audit-design-system-design.md`
Vérification : `node scripts/audit-coingecko-doc.mjs --strict`

> ⚠️ **Correction de méthode — 2026-08-30.** Jusqu'à cette date,
> `scripts/audit-coingecko-page.mjs` lisait les propriétés typographiques (couleur,
> police, taille, interligne) sur le nœud désigné par le sélecteur, même lorsque ce
> nœud ne possède aucun texte en propre. CoinGecko imbriquant ses libellés, l'outil
> relevait alors la couleur héritée du conteneur — 84 mesures valaient
> `rgb(0, 0, 238)`, le bleu de lien par défaut du navigateur, qui n'est jamais peint
> à l'écran. L'outil lit désormais la typographie sur le premier descendant portant
> du texte en propre, et consigne ce nœud sous la clé `porteurTexte` ; les propriétés
> de boîte restent lues sur l'élément visé. La décision est extraite dans
> `indexPorteurDuTexte` et couverte par six tests.
>
> **Les neuf pages déjà relevées ont été remesurées avec l'outil corrigé.** Les
> constats de ce document portant sur les fonds, les filets, les espacements et les
> tailles n'étaient pas touchés — ils étaient relevés sur des nœuds portant leur
> texte. Ce qui manquait, c'est le motif d'accent : encre au repos, vert au survol.

## Liste des pages

Figée le 2026-08-29 à partir de la navigation, des mega-dropdowns, du pied de page,
du plan de site et de l'overlay de recherche. Une case cochée signifie qu'une entrée
complète existe plus bas.

Pour les familles paramétrées (pages coin, de catégorie, d'exchange, de chaîne, de NFT,
d'action/ETF/matière première tokenisées), une seule page représentative est retenue —
listée avec le libellé générique de la famille, pas avec le nom de l'actif ; le nom
choisi (Bitcoin, Binance, Ethereum…) figure dans l'entrée d'audit, pas ici. Les onglets
d'une page paramétrée qui ont chacun une URL propre sont listés séparément.

Quatre destinations trouvées dans la navigation ne figurent pas ci-dessous car elles
n'ont pas d'URL propre — voir la note en fin de section : la recherche globale (overlay
sans route dédiée), la barre de navigation et le pied de page (chrome présent sur
toutes les pages, sans destination qui leur soit propre), et la watchlist (fonction
repliée dans le portefeuille, sans route publique vérifiable — voir note). Elles sont
auditées comme composants de la page Accueil ou de la page Portefeuille, pas comme
pages séparées.

**Les cases non cochées ci-dessous seront toutes cochées.** Le mandat a changé le
2026-08-30 : l'audit doit être entièrement coché avant que le travail soit déclaré
terminé. Elles ne sont pas pour autant un travail en retard — l'ordre suit la
migration, page par page, parce qu'un relevé sert au moment où la question
« qu'est-ce qu'on garde de cette page ? » est concrète.

**34 pages sur 68 sont auditées, 34 restent.** Le rendement décroît, et c'est
attendu : la fidélité de CoinGecko tient dans une vingtaine de composants partagés
que l'accueil a nommés d'un coup. Les six pages ajoutées le 2026-08-30 confirment le
constat — chrome identique au pixel (titre 24/32 en graisse 700, en-tête de colonne
12/16 en 600, ligne 14/20 en 400, survol `rgb(248, 250, 252)`), et seules leurs
COLONNES et leurs CONTRÔLES diffèrent.

⚠️ Le rendement décroissant ne veut pas dire que les pages restantes n'apprennent
rien. C'est `/en/highlights`, la quinzième auditée, qui a corrigé deux valeurs de la
palette : l'onglet sélectionné est vert, et le texte du bouton d'action est blanc et
non noir. Les deux avaient été posées sur la foi de relevés antérieurs.

**Les huit pages du 2026-08-31 ont servi autrement : elles ont CONFIRMÉ.** Une analyse
croisée des 28 relevés donne `h1` à 24px/700 dans 18 cas sur 23, et la ligne de tableau
à 14px/400 dans 12 cas sur 13 — les valeurs implémentées tiennent sur tout leur site,
pas seulement sur les pages qui les avaient établies. Un relevé qui ne surprend pas
n'est pas un relevé inutile : c'est celui qui autorise à généraliser.

⚠️ **Les URL de cette liste sont passées de `/fr` à `/en` le 2026-08-31**, sur consigne.
Trois chemins diffèrent réellement entre les deux langues, vérifiés par requête :
`/fr/platesformes` → `/en/exchanges`, `/fr/à_propos_de` → `/en/about`,
`/fr/méthodologie` → `/en/methodology`. Les 16 premières entrées ont été relevées sur
`/fr` : mise en page et couleurs identiques, seuls les textes changent.

`node scripts/audit-coingecko-doc.mjs --strict` continue de signaler les pages non
auditées. Ce n'est pas une régression : c'est le compteur de ce qui reste.

### Phase 1 — cœur

- [x] Accueil — `/fr`
- [ ] Accueil, toutes les monnaies — `/en/all-cryptocurrencies`
- [ ] Accueil, classement rehypothéqué — `/en/top-market-cap-rehypothecated`
- [ ] Accueil en devise (EUR) — `/en/currencies/eur`
- [x] Page coin, onglet Vue d'ensemble — `/en/coins/bitcoin`
- [ ] Page coin, onglet Tokenomique — `/en/coins/bitcoin#tokenomics`
- [ ] Page coin, onglet Données financières — `/en/coins/bitcoin#financials`
- [ ] Page coin, onglet Prédominance — `/en/coins/bitcoin#dominance`
- [ ] Page coin, onglet Données historiques — `/en/coins/bitcoin/historical_data`
- [ ] Page coin, onglet Prédiction — `/en/coins/bitcoin/prediction`
- [x] Catégories — `/en/categories`
- [x] Page de catégorie — `/en/categories/meme-token`
- [x] Exchanges, spot — `/en/exchanges`
- [x] Exchanges, DEX — `/en/exchanges/decentralized`
- [x] Exchanges, dérivés — `/en/exchanges/derivatives`
- [ ] Exchanges, DEX perpétuels — `/en/exchanges/derivatives/decentralized`
- [x] Page d'exchange — `/en/exchanges/binance`
- [x] Graphiques globaux — `/en/charts`

### Phase 2 — données

- [x] Highlights (principaux éléments) — `/en/highlights`
- [x] Tendances — `/en/highlights/trending-crypto`
- [x] Gagnants et perdants — `/en/crypto-gainers-losers`
- [x] Nouvelles cryptos — `/en/new-cryptocurrencies`
- [x] All-time high — `/en/highlights/all-time-high-crypto`
- [x] Highlights, les plus consultées — `/en/highlights/most-viewed-crypto`
- [x] Highlights, volume élevé — `/en/highlights/high-volume`
- [x] Highlights, déblocages de jetons à venir — `/en/highlights/incoming-token-unlocks`
- [ ] Highlights, cryptos à venir — `/en/highlights/upcoming-cryptocurrencies`
- [x] Carte thermique (heatmap) — `/en/charts/crypto-heatmap`
- [x] Prédominance du Bitcoin — `/en/charts/bitcoin-dominance`
- [x] Comparateur — `/en/compare-cryptocurrencies`
- [x] Convertisseur — `/en/converter`
- [x] Chaînes — `/en/chains`
- [x] Page de chaîne — `/en/chains/ethereum`
- [x] NFT — `/en/nft`
- [ ] NFT par chaîne — `/en/nft/chains/ethereum`
- [ ] Page de collection NFT (floor price) — `/en/nft/bored-ape-yacht-club`
- [x] RWA — `/en/rwa`
- [ ] RWA, graphique global — `/en/charts/rwa`
- [x] RWA, actions tokenisées — `/en/stocks`
- [ ] Page d'action tokenisée — `/en/stocks/nvidia`
- [x] RWA, ETF tokenisés — `/en/etfs`
- [ ] Page d'ETF tokenisé — `/en/etfs/spdr-s-p-500-etf-trust`
- [x] RWA, matières premières tokenisées — `/en/commodities`
- [ ] Page de matière première tokenisée — `/en/commodities/gold`
- [x] Trésoreries — `/en/treasuries`
- [ ] Trésoreries, entreprises — `/en/treasuries/companies`
- [ ] Trésoreries, États — `/en/treasuries/governments`

### Phase 3 — contenu et services

- [x] Portefeuille — `/en/portfolio`
- [ ] Apprendre — `/learn`
- [x] Apprendre, article — `/learn/crypto-narratives`
- [ ] Actualités — `/en/news`
- [ ] Rapports — `/en/publications/reports`
- [ ] Perspectives Recherche — `/research`
- [x] Glossaire — `/en/glossary`
- [ ] Glossaire, terme — `/en/glossary/blockchain`
- [ ] Widgets — `/en/widget`
- [x] Page API — `/en/api`
- [ ] API DEX — `/en/api/dex`
- [ ] API NFT — `/en/api/nft`
- [ ] Tarifs API — `/en/api/pricing`
- [ ] Études de cas API — `/en/api/case-studies`
- [ ] Page coin, onglet Halving — `/en/coins/bitcoin/bitcoin-halving`
- [x] Méthodologie — `/en/methodology`
- [ ] À propos — `/en/about`
- [ ] FAQ — `/en/faq`
- [ ] Candy (récompenses) — `/en/candy`
- [ ] Application mobile — `/en/mobile`
- [ ] Tarifs Premium — `/en/premium/pricing`

**Watchlist — sans route publique vérifiable.** Constaté par `curl -L` (GET, suivi des
redirections), URL par URL :
- `/en/watchlist` → 404 direct.
- `/en/watchlist` → 404 direct.
- `/en/my-watchlist` → 404 direct.
- `/watchlist` → 301 vers `/en/watchlist`, qui rend ensuite 404.
- `/en/watchlists` (pluriel) → 301 vers `/en/highlights`, qui rend 200 — cette URL ne
  renvoie jamais 404, elle mène simplement ailleurs, ce qui explique pourquoi le pluriel
  ne mène nulle part non plus : redirigé vers une page déjà listée sous « Highlights ».
Le mot « watchlist » n'apparaît nulle part dans le HTML rendu de l'accueil, de la page
coin Bitcoin ou de `/en/portfolio`. Le bouton étoile de la page coin
(`data-controller="coin-favorites"`, action `handleCoinFavourites`) est la fonction
équivalente aujourd'hui, et elle est repliée dans le Portefeuille (nav : « Mes Monnaies »
→ `/en/portfolio`) plutôt que dans une page dédiée. Auditée comme composant de l'entrée
Portefeuille, pas comme page séparée.

**`/en/api/case-studies` — redirection 302 vers `/en/api/case-studies`.** Contenu non
traduit en français, comme `/en/glossary` et `/learn`.

## Entrées

### Accueil — `/fr`

- **Date du relevé** : 2026-08-29
- **Rôle** : page d'atterrissage du site — classement de toutes les cryptomonnaies par
  capitalisation boursière, avec les indicateurs de marché globaux en tête et en pied de
  page. C'est la page qui reçoit le plus de trafic et qui porte le chrome commun (nav,
  recherche, pied de page) : elle fixe le vocabulaire et l'échantillon de mesure des 67
  autres entrées.
- **Priorité** : phase 1
- **État** : audité
- **Composants** :
  - **Barre de navigation** — bandeau supérieur fixe : logo, méga-menus, recherche,
    ticker de statistiques globales, sélecteur de langue et de devise, bouton
    d'inscription/connexion.
  - **Ticker de statistiques globales** — ligne de chiffres de marché mise à jour en
    continu dans la barre de navigation (nombre de monnaies, plateformes, capitalisation,
    volume, prédominance BTC/ETH, prix du gaz Ethereum) — à ne pas confondre avec le
    bandeau de synthèse marché plus bas dans la page : même famille de données, objet et
    emplacement différents.
  - **Sélecteur de langue et de devise** — déclencheur, dans la barre de navigation, d'un
    panneau proposant le choix de la langue, de la devise d'affichage et du mode sombre.
    Mesuré via `[data-settings-target="currencyText"]`, le nœud texte affichant la devise
    (« USD ») — **pas** le conteneur cliquable qui ouvre le panneau, qui ne porte aucun
    attribut propre à cibler (déclenché par une directive Alpine `@click`, sans classe ni
    id distinctifs). Les valeurs relevées décrivent donc la typographie et la couleur du
    texte de devise, pas le rembourrage, le rayon, le filet ni la zone cliquable du
    déclencheur lui-même.
  - **Méga-menu de navigation** — panneau déroulant par rubrique (Cryptos, Highlights…),
    groupé en sous-sections titrées (« Au-delà des jetons », « Populaire », « Outils »),
    chaque lien portant une icône.
  - **Overlay de recherche globale** — popover plein-largeur ouvert au clic sur le champ de
    recherche : champ de saisie, onglets de filtrage (Tendance, NFT…), zone de résultats,
    encart sponsorisé.
  - **Bandeau de synthèse marché** — rangée de cartes résumant l'état du marché
    (capitalisation totale, volume 24 h…) surmontées d'un mini-graphique de fond,
    activable/désactivable par un commutateur. Distinct du ticker de statistiques
    globales de la barre de navigation : plus bas dans la page, présenté en cartes, et
    masquable par l'utilisateur.
  - **Carte de synthèse marché** — une carte individuelle du bandeau de synthèse marché :
    valeur, pastille de variation, mini-graphique.
  - **Tableau de cotations** — table principale listant les monnaies : rang, monnaie, cours,
    variations à 1 h/24 h/7 j/30 j, volume, capitalisation, FDV, ratio capitalisation/FDV,
    mini-graphique d'évolution.
  - **En-tête de colonne triable** — cellule d'en-tête cliquable portant `aria-sort`.
  - **Ligne de tableau** — ligne représentant une monnaie.
  - **Cellule de tableau** — cellule individuelle d'une ligne (ex. cours).
  - **Lien** — lien texte ou associé à une icône/image, en dehors du pied de page (ex. le
    nom de la monnaie dans une ligne de tableau, qui mène à sa fiche).
  - **Texte secondaire** — texte de moindre emphase sous un libellé principal (ex. le
    symbole sous le nom de la monnaie).
  - **Pastille de variation** — badge coloré (hausse/baisse) avec flèche et pourcentage.
  - **Mini-graphique d'évolution (sparkline)** — mini-graphique de l'évolution du cours sur
    7 jours, en fin de ligne de tableau.
  - **Bouton plein** — bouton à fond de couleur primaire (ex. « Utiliser l'app »).
  - **Bouton discret** — bouton à fond neutre et filet visible (ex. « Connexion »).
  - **Onglet actif** / **onglet inactif** — puce de filtre au sein d'un groupe d'onglets
    (ex. Tendance/NFT dans l'overlay de recherche).
  - **Commutateur** — interrupteur à bascule (afficher/masquer le bandeau de synthèse
    marché, mode sombre).
  - **Pagination** — liens de page numérotés sous le tableau de cotations.
  - **Pied de page** — zone de bas de page, colonnes de liens groupées par thème,
    rétractables en accordéon sur mobile.
  - **Lien de pied de page** — lien texte au sein d'une colonne du pied de page.
  - **Titre de section** — intitulé en tête de bloc (ex. le titre de page, masqué
    visuellement mais présent pour le SEO ; ou « Principaux éléments » au-dessus du
    bandeau de synthèse marché).
- **Fonctionnalités** : classement des cryptomonnaies avec tri par colonne, filtrage
  temporel implicite (colonnes 1 h/24 h/7 j/30 j), pagination (100 lignes par page),
  recherche globale multi-catégories (jetons, paires DEX, actions, matières premières,
  exchanges, catégories, NFT, articles), ajout au portefeuille depuis la ligne (icône
  étoile), affichage/masquage du bandeau de synthèse marché, bascule de thème clair/sombre,
  sélecteur de langue et de devise, bannière de téléchargement de l'application mobile.
- **Interactions** : dix sélecteurs sondés en survol et en focus sur la largeur de
  référence (1440 px, deux thèmes) — deltas exacts dans `mesures.json` → `interactions`.
  **Ligne de tableau** : le survol change le fond (transparent → une teinte neutre très
  proche du fond de page, différente par thème), sans transition (`0s`, changement
  instantané) ; non focusable. **Lien de monnaie** (nom dans la ligne) : le survol ne
  produit AUCUN delta de style mesurable sur le lien lui-même — la classe `hover:`
  Tailwind lue dans le HTML doit donc agir sur un ancêtre (la ligne) ou un élément non
  ciblé par ce sélecteur, pas sur le lien en tant que tel ; le focus, lui, affiche
  l'anneau par défaut du navigateur (`outline: auto`, non personnalisé), identique en
  clair et en sombre. **En-tête de colonne triable** : survol sondé, aucun changement de
  style détecté ; non focusable (cohérent avec un tri déclenché par un gestionnaire JS
  sur un élément sans sémantique de bouton) — l'attribut `aria-sort="ascending"` reste
  l'unique état de tri observé, le basculement effectif au clic (vers `descending`, puis
  sur une autre colonne) n'a pas été éprouvé, faute de clic simulé (hors portée de ce
  relevé). **Bouton discret** (Connexion) : survol ET focus mesurés, dans les deux
  thèmes — le survol change fond et ombre (transition `0.15s`, courbe
  `cubic-bezier(0.4, 0, 0.2, 1)`, l'ombre simulant un relief) ; le focus ajoute son
  propre couple fond/ombre (plus clair que le survol, `rgb(254, 254, 255)` en clair,
  `rgb(27, 36, 46)` en sombre) plus un anneau de contour quasi transparent
  (`rgba(0, 0, 0, 0.008)`, solide, 2px) — trois états de fond bien distincts (repos,
  survol, focus), cohérents entre les deux thèmes. **Onglet actif** (puce de filtre
  sélectionnée, ex. au-dessus du tableau de cotations) : sondage corrigé — l'ancienne
  campagne visait par erreur le premier nœud DOM correspondant (masqué), le nœud
  réellement affiché à l'écran est le 3ᵉ sur 4 correspondances
  (`interactions.*.".gecko-tab-chip-item.selected".noeud = {index: 2, total: 4}`) ;
  une fois le bon nœud visé, aucun changement mesurable au survol (déjà à l'état actif,
  cohérent), et un anneau de focus par défaut du navigateur identique aux liens.
  **Onglet inactif** : même correction, nœud réellement visible au 11ᵉ rang sur 21
  correspondances (`index: 10, total: 21` — sélecteur très imprécis, voir Notes) ;
  une fois ce nœud visé, le survol change le fond (`rgb(241, 245, 249)` en clair,
  `rgb(27, 35, 45)` en sombre — cette dernière valeur identique au fond de survol de la
  ligne de tableau en sombre, signe d'un jeton de surface partagé), et le focus affiche
  le même anneau par défaut que les autres éléments focusables de la page.
  **Commutateur** : même correction, nœud réellement visible au 2ᵉ rang sur 5
  correspondances (`index: 1, total: 5`) ; une fois ce nœud visé, aucun changement
  mesurable au survol et non focusable directement — cohérent avec un composant dont la
  case à cocher réelle (l'élément focusable/actionnable) est un `<input>` séparé, la
  piste visuelle (`.gecko-toggle-track`) n'étant qu'un habillage sans état propre ; à
  cibler différemment (l'`<input>` associé) pour une prochaine campagne si son état de
  focus doit être mesuré. **Bouton plein** (« Utiliser l'app ») et **sélecteur de
  langue et de devise** (nœud `currencyText`) : ces deux-là restent réellement masqués
  après correction — une seule correspondance pour le premier, masquée (bannière hors
  du flux normal à cette taille de fenêtre) ; deux correspondances pour le second,
  toutes deux masquées
  (`interactions.*.[data-settings-target="currencyText"].noeud = {index: 0, total: 2}`
  — nœuds dans le panneau paramètres non ouvert) ; ni le survol ni le focus n'ont donc
  pu être mesurés pour ces deux — l'ouverture réelle du panneau qui les révèle reste
  hors de portée (voir Notes).
  Restent, par ailleurs, déclarés par le HTML sans avoir été observés à l'écran :
  ouverture d'un méga-menu au survol ou au clic
  (`data-action="mouseover->navbar#handleOver … click->navbar#handleClick"`) ; ouverture
  de l'overlay de recherche au clic sur le champ (`click->search-v2#showSearchPopup`) et
  fermeture au clic extérieur ou sur la croix ; bascule du commutateur de thème
  (`click->settings#toggleDarkMode`) et de celui du bandeau de synthèse marché
  (`click->highlights#toggleHighlights`) ; accordéon du pied de page sur mobile
  (`click->footer#toggleFooterGroup`).
- **Données requises** : cours, variations 1 h/24 h/7 j/30 j, volume 24 h, capitalisation
  boursière, FDV et ratio capitalisation/FDV, mini-graphique d'évolution (sparkline) sur 7 jours, capitalisation et volume
  globaux, prédominance BTC/ETH — tous disponibles via l'API CoinGecko (gratuite) déjà
  utilisée par ZENKUU. Le nombre de monnaies et de plateformes listées vient du même
  jeu de données. Les tendances de recherche (onglet « Tendance » de l'overlay) sont
  couvertes par l'endpoint gratuit `/search/trending` de CoinGecko. Le **prix du gaz
  Ethereum (Gwei)** affiché dans la barre de navigation, en revanche, est sourcé par
  CoinGecko auprès d'Etherscan (« Données par Etherscan », relevé dans le HTML) — cette
  source ne figure pas dans la liste des sources gratuites de ZENKUU ; reporté en
  synthèse.
- **Écart avec ZENKUU** : `apps/web` (page `/fr`, vue le 2026-08-29 sur
  `http://localhost:3000/fr`) porte déjà un tableau (`data-slot="table"`, en-têtes
  `aria-sort`, actuellement à `"none"` — le tri n'est pas encore branché côté client sur
  au moins une colonne visible), un mini-graphique d'évolution (sparkline), un pied de page, une palette de commande
  (`data-slot="command"` — l'équivalent structurel de l'overlay de recherche CoinGecko) et
  un `navigation-menu` (l'équivalent du méga-menu), ainsi qu'une pagination
  (`data-slot="pagination"`). L'ossature des composants existe donc déjà. Ce qui manque
  au regard de l'accueil CoinGecko : le bandeau de synthèse marché (cartes de synthèse
  capitalisation/volume/prédominance avec mini-graphique et commutateur
  afficher/masquer), les statistiques de marché globales dans la barre de navigation
  elle-même (nombre de monnaies, plateformes, capitalisation, volume, prédominance,
  gaz), les colonnes 30 j / FDV / ratio capitalisation-FDV dans le tableau, et
  l'accordéon de pied de page groupé par thème (Ressources, Assistance…) vu sur
  CoinGecko — à confirmer par une lecture plus large du pied de page ZENKUU, hors
  échantillon de cette page.
- **Notes** : le contrôle de bascule de thème du script (marqueurs `darktheme`/`tw-dark`
  puis couleur de fond de `<body>`) a validé la bascule sur ce gabarit, et les captures
  claire/sombre diffèrent octet pour octet aux trois largeurs — pas d'erreur levée.
  Relevé exact des 18 sélecteurs (styles typographiques, couleurs, filets, rayons,
  ombres, rembourrages, marges, transitions) dans
  `docs/references/coingecko/accueil/mesures.json`, six passes (360/768/1440 ×
  clair/sombre), chaque valeur portant son sélecteur et sa page de provenance. Dix de
  ces sélecteurs ont ensuite été sondés en survol et en focus (largeur de référence,
  deux thèmes) — deltas dans la clé `interactions` du même fichier ; résultats détaillés
  dans le champ « Interactions » ci-dessus. Trois de ces dix sélecteurs
  (`.gecko-tab-chip-item.selected`, `.gecko-tab-chip-item:not(.selected)`,
  `.gecko-toggle-track`) ont plusieurs correspondances dans le DOM (4, 21 et 5
  respectivement) dont la première est masquée — une campagne initiale, qui visait le
  premier nœud sans vérifier sa visibilité, les avait donc classés à tort « masqué »
  alors que le nœud réellement affiché (3ᵉ, 11ᵉ et 2ᵉ rang) a un état mesurable ;
  corrigé dans l'outil (le premier nœud VISIBLE est retenu, son index et le nombre
  total de correspondances sont consignés dans `mesures.json` sous
  `interactions.*.<sélecteur>.noeud` quand ce n'est pas le tout premier) et dans cette
  entrée. `.gecko-tab-chip-item:not(.selected)` reste un sélecteur imprécis (21
  correspondances) : une prochaine campagne gagnerait à le resserrer avec un
  sélecteur de groupe (ex. le conteneur direct de la rangée de filtres au-dessus du
  tableau) plutôt que de compter sur l'ordre d'apparition dans le DOM, qui peut varier
  d'une page à l'autre. Deux des dix (bouton plein, sélecteur de langue et de devise)
  restent réellement masqués : une seule correspondance pour le bouton plein, elle-même
  masquée ; deux correspondances pour le sélecteur de langue et de devise, toutes deux
  masquées (`interactions.*.[data-settings-target="currencyText"].noeud = {index: 0,
  total: 2}` — corrigé dans l'outil pour le consigner : l'ancienne condition
  n'écrivait `noeud` dans `mesures.json` que si l'index retenu n'était pas 0, ce qui
  rendait ce cas indiscernable d'une seule correspondance masquée quand, comme ici,
  aucun nœud n'est visible et l'index retombe à 0 ; le total est désormais consigné dès
  qu'il y a plusieurs correspondances, quel que soit l'index retenu — voir
  `noeudAConsigner` dans `scripts/audit-coingecko-page.mjs`).
  Restent non observés,
  faute de simuler un clic ou de provoquer une condition — hors de portée de ce relevé
  par sonde de survol/focus, quel que soit l'outil : l'état trié dans les deux sens
  (croissant/décroissant) au-delà de l'attribut `aria-sort` initial, l'ouverture
  *effective* (position, animation, z-index réel) des méga-menus et de l'overlay de
  recherche — leur contenu a été lu dans le HTML rendu (pré-affiché mais masqué par
  CSS/Alpine, `display:none` / `x-show`), pas observé ouvert à l'écran — et l'état vide,
  l'état de chargement, l'état d'erreur. Le pied de page a été lu entièrement dans le
  HTML (les groupes rétractables mobiles sont présents dans le DOM, pas seulement
  visibles en version desktop). Aucun texte de CoinGecko n'est recopié au-delà des
  libellés strictement nécessaires à l'identification d'un composant.

### Page coin, onglet Vue d'ensemble — `/en/coins/bitcoin`

- **Date du relevé** : 2026-08-30
- **Rôle** : gabarit de détail d'un actif — cours, graphique, statistiques de marché,
  marchés où l'actif se négocie, contenu éditorial (à propos, sécurité, FAQ), monnaies
  connexes. Premier gabarit paramétré de l'audit : ce qu'il porte se généralise en
  substance aux futures pages de catégorie, de chaîne, de NFT et d'actif tokenisé.
- **Priorité** : phase 1
- **État** : audité
- **Composants** :
  - **Onglet principal de fiche** (`gecko-tab-underline-item`) — item d'un groupe
    d'onglets à soulignement, en tête de fiche (Présentation, Marchés, Trésoreries,
    Actualités, Monnaies similaires, plus deux liens externes vers des pages dédiées :
    Données historiques, Halving du BTC). À ne pas confondre avec l'**onglet actif** /
    **onglet inactif** déjà nommés sur l'accueil (`gecko-tab-chip-item`, puce arrondie
    de groupe de filtres) : famille visuelle différente (soulignement plutôt que puce
    de fond), classe CSS différente, et rôle différent (navigation de page entière,
    pas filtrage d'une liste). Dupliqué deux fois dans le DOM par point de rupture
    (14 correspondances pour 7 onglets visibles, la variante mobile masquée) — le
    même motif de duplication que `gecko-tab-chip-item` sur l'accueil.
  - **Onglet secondaire de fiche** (variante de `gecko-tab-chip-item`, `#tab-about` /
    `#tab-tokenomics` / `#tab-financials` / `#tab-dominance`) — second groupe de
    puces, imbriqué dans l'onglet Présentation : bascule le contenu affiché sous le
    graphique entre « À propos », « Tokenomique », « Données financières » et
    « Prédominance » sans navigation de page (`x-data="tabPanel('about')"`,
    `@click="activeTab = '…'"`). Réutilise la classe `gecko-tab-chip-item` déjà nommée
    sur l'accueil, mais dans un troisième contexte (l'accueil l'utilisait déjà pour
    deux : les filtres de l'overlay de recherche et — hors accueil, vu dans ce
    HTML — la modale de sélection de monnaie du portefeuille) : la classe seule ne
    suffit plus à désigner un composant sur cette page, il faut l'id du bouton
    (`#tab-tokenomics`, etc.) pour cibler sans ambiguïté un nœud précis.
  - **En-tête de fiche** (`[data-coin-show-target="staticCoinPrice"]`) — logo, nom,
    sous-titre (« Cours du BTC »), pastille de rang (« #1 »), cours courant et
    variation 24 h. Bloc figé (non collant) ; existe aussi en variante **collante**
    (`[data-coin-show-target="stickyCoinPrice"]`), déclarée par le HTML
    (`tw-hidden` par défaut, révélée au défilement par un contrôleur Stimulus) mais
    non observée à l'écran par ce relevé, qui ne simule pas de défilement.
  - **Cours courant** (`[data-price-target="price"]`, dans l'en-tête de fiche) — le
    chiffre de prix en grand format (36 px, gras). Distinct du texte de variation
    attenant, qui réutilise `.gecko-up`/`.gecko-down` déjà nommés sur l'accueil (même
    classe, ici appliquée à du texte de delta à côté d'un gros chiffre plutôt qu'à
    une pastille de tableau — pas redécrit).
  - **Widget de statistiques** (`table` sous `[itemtype="https://schema.org/Table"]`)
    — table clé/valeur (`<th>`/`<td>`) listant capitalisation boursière, évaluation
    après dilution (FDV), volume 24 h, offre en circulation/totale/maximale,
    participation totale au réseau. Chaque ligne porte une infobulle d'aide
    (`data-controller="tooltip"`) déclarée par le HTML, non observée ouverte à
    l'écran (pas de survol simulé sur l'icône info dans ce relevé).
  - **Graphique de cours** (`#gecko-coin-chart`, Highcharts) — graphique principal de
    la fiche, avec sélecteur de plage temporelle et bascule Cours/Comparer/export.
    Trois autres instances Highchart existent sur la page (jauge de tokenomique en
    camembert, graphique de prédominance, graphique financier) — non mesurées
    séparément, même famille de rendu.
  - **Groupe de boutons segmenté** (`gecko-button-group-item`) — sélecteur de plage du
    graphique (24 h/7 j/1 M/3 M/1 AN/Max), item actif et inactif. Nouveau : ni le
    style ni la structure (pastille `x-ref="pill"` qui glisse derrière l'item actif)
    ne correspondent à `gecko-tab-chip-item` ni à `gecko-tab-underline-item` — un
    troisième mécanisme de sélection à onglet. La classe seule a 37 correspondances
    sur la page (d'autres groupes de boutons existent ailleurs, ex. le graphique
    financier) : mesuré ici scopé à son conteneur
    (`[data-global-charts-target="rangeSelector"] .gecko-button-group-item`) pour ne
    pas retomber sur un groupe différent par accident d'ordre DOM.
  - **Convertisseur** (`.gecko-input-group` / `.gecko-input`) — bloc de saisie
    « Convertisseur BTC » : champ de montant, devise source, résultat. 13
    correspondances de `.gecko-input` sur la page (le convertisseur n'est pas le seul
    champ de texte) ; le nœud retenu (`index: 1, total: 13`) est bien celui du
    convertisseur visible au chargement — consigné dans `mesures.json`.
  - **Bloc Marchés** — table listant les plateformes où l'actif se négocie (rang,
    plateforme, paire, cours, écart, profondeur ±2 %, volume 24 h, volume %, dernière
    mise à jour), avec ses propres onglets de filtrage (Toutes/CEX/DEX). Vu dans la
    capture mais non instrumenté par un sélecteur dans ce relevé — mêmes colonnes que
    le **tableau de cotations** de l'accueil, structure de table de marché
    apparentée ; à instrumenter séparément si une page de marchés dédiée est auditée.
  - **Bloc Trésoreries** — table listant les détenteurs institutionnels (entité, type,
    variation sur 30 jours, montant, coût moyen, valeur, mNAV, part de l'offre) —
    nouveau type de table, vu mais non mesuré par sélecteur dans ce relevé.
- **Fonctionnalités** : bascule d'onglet principal (navigation de page) et secondaire
  (bascule de panneau sans rechargement), sélection de plage temporelle du graphique,
  export/impression du graphique (icônes vues à droite du sélecteur de plage, non
  éprouvées), conversion BTC ↔ devise, sondage communautaire (« Que pensez-vous du
  cours de BTC aujourd'hui ? », pouces haut/bas — vu dans la capture, non instrumenté),
  ajout au portefeuille/liste de suivi (icône étoile de l'en-tête).
- **Interactions** : six sélecteurs propres à cette page sondés en survol et en focus
  (largeur de référence, deux thèmes) — deltas dans `mesures.json` → `interactions`.
  **Onglet principal actif** : aucun delta au survol (cohérent, déjà actif) ; non
  focusable (ancre `<a>` sans état de focus personnalisé mesurable — l'anneau par
  défaut du navigateur ne s'est pas déclenché, `« non focusable »`). **Onglet
  principal inactif** : le survol ajoute un filet bas de 0 px d'épaisseur mais de
  couleur posée (`rgb(203, 213, 225)` en clair, `rgb(56, 74, 97)` en sombre) — un
  filet théoriquement invisible à 0 px, à vérifier au clic réel si cette valeur est
  une transition capturée à mi-course ou une erreur de calcul de largeur ; non
  focusable pour la même raison que l'onglet actif. **Onglet secondaire**
  (`#tab-tokenomics`) : survol hors du viewport visible au chargement (situé sous le
  graphique, hors écran à 1440 px sans défiler — non sondé) ; le focus, lui, affiche
  un anneau de contour classique (`outline: auto`, 1px), identique aux liens de
  l'accueil. **Groupe de boutons segmenté**, actif et inactif : les deux rapportent
  « masqué (non visible) » au survol au moment du sondage, alors que la capture
  statique prise juste avant montre le même bloc bien visible en haut de la page —
  écart non expliqué par ce relevé (candidat : décalage de mise en page causé par le
  chargement différé d'une publicité entre la capture et le sondage, hypothèse non
  vérifiée, donc non retenue comme explication) ; à réauditer si ce composant doit
  être repris tel quel. **Convertisseur** : hors du viewport visible au survol (plus
  bas que le graphique à 1440 px) ; le focus affiche un anneau bleu clair
  (`rgba(59, 130, 246, 0.5)`, largeur 0 dans les deux thèmes — style de focus
  personnalisé posé mais dont le rayon effectif est nul dans ce relevé, à vérifier
  au clic réel).
  Restent, par ailleurs, déclarés par le HTML sans avoir été observés à l'écran :
  bascule effective de l'onglet secondaire (le contenu de chaque panneau est présent
  dans le DOM derrière `x-show`, pas cliqué) ; ouverture des infobulles d'aide du
  widget de statistiques ; la barre collante de prix au défilement ; le vote du
  sondage communautaire ; les filtres CEX/DEX du bloc Marchés ; le tri éventuel du
  bloc Marchés et du bloc Trésoreries.
- **Données requises** : cours et variation 24 h, capitalisation boursière, FDV,
  volume 24 h, offre en circulation/totale/maximale, participation au réseau,
  historique de cours pour le graphique — toutes disponibles via l'API CoinGecko déjà
  utilisée par ZENKUU. Les plateformes et paires du bloc Marchés viennent du même jeu
  de données (marchés par actif). Les données du bloc Trésoreries (détenteurs
  institutionnels, mNAV) sont déjà couvertes côté ZENKUU par une source de trésorerie
  existante (`@zenkuu/data`, type `TreasuryReport`, consommé par
  `apps/web/components/asset/AssetTreasuries.tsx`) — pas un écart. Le sondage
  communautaire (pouces haut/bas) n'est pas une donnée sourcée à l'extérieur : c'est
  un vote propre au site CoinGecko, hors périmètre de la liste de sources de ZENKUU ;
  non reporté en synthèse pour cette raison.
- **Écart avec ZENKUU** : `apps/web/app/[locale]/crypto/[id]/page.tsx` (lu dans le
  code le 2026-08-30 ; le serveur de dev du port 3000 n'était pas joignable au moment
  du relevé — comparaison faite sur le code source, pas sur un rendu observé,
  contrairement à l'entrée Accueil) rend `AssetPageView`, qui compose déjà la plupart
  des familles vues ici : `AssetKeyStats` (bandeau de statistiques clé, mais VISIBLE
  en permanence sous le graphique plutôt qu'enfermé dans un onglet séparé — un choix
  produit explicite, documenté dans le fichier : « jusqu'ici enfermés dans l'onglet
  Statistiques, donc invisibles à qui ne cliquait pas »), `AssetConverter`,
  `PriceChartInteractive`/`PriceChartAm`/`TradingViewChart` (graphique),
  `AssetTickers` (bloc Marchés), `AssetTreasuries` (bloc Trésoreries),
  `AssetSimilarRail` (Monnaies connexes), `AssetNewsRail` (Actualités),
  `AssetFaq`, `AssetSentiment`. Écart structurel le plus net : `AssetSections.tsx`
  documente le retrait délibéré d'une barre d'onglets collante à sommaire — ZENKUU
  a choisi la fiche en défilement continu avec ancres (`#analyse`, `#places`) plutôt
  que la navigation par onglet de CoinGecko (onglet principal à soulignement ET
  onglet secondaire à puces, deux mécanismes de bascule superposés sur la même
  fiche) ; ce n'est pas un manque à combler mais un choix déjà tranché à documenter
  au moment de juger si la famille « onglet de fiche » de cette entrée doit être
  reprise. Le **groupe de boutons segmenté** (sélecteur de plage du graphique) n'a
  pas d'équivalent nommé identifié dans `components/asset/` lors de cette lecture —
  à vérifier dans `ChartToolbar.tsx`/`ChartNavigator.tsx`, non ouverts pour cette
  entrée.
- **Notes** : bascule de thème validée sur ce gabarit (marqueurs `darktheme`/
  `tw-dark` puis fond de `<body>`), captures claire/sombre différentes octet pour
  octet aux trois largeurs — pas d'erreur levée, contredisant l'attente du brief
  (« les pages coin sont connues pour ne pas basculer ») : sur `bitcoin`, à cette
  date, la bascule a fonctionné. **Blocage rencontré et corrigé** : les trois
  premières tentatives de relevé (sans user-agent personnalisé) ont toutes buté sur
  le défi anti-robot Cloudflare de CoinGecko (page « Verifying you are human »,
  capture identique aux trois passes, aucun sélecteur trouvé) — reproductible,
  contrairement à l'accueil qui avait passé ce même défi sans réglage particulier.
  Corrigé en ajoutant un user-agent de navigateur de bureau ordinaire au contexte
  Playwright de `scripts/audit-coingecko-page.mjs` (constante `USER_AGENT`,
  `browser.newContext`) — un réglage qui déclare ce que Chromium est déjà, ne
  cache rien côté site, et n'affecte pas les relevés ZENKUU en local (qui ne
  filtrent pas sur ce champ) ; le relevé qui suit cette modification a rendu la page
  réelle. **Spécifique à la crypto, pour le sous-projet C** : les onglets
  Tokenomique/Financials/Prédominance (composants clé/valeur + graphiques dédiés
  aux émissions et à la dilution de l'offre), le convertisseur en unité native de
  l'actif (BTC, pas seulement en devise), le bloc Trésoreries (détention
  institutionnelle, mNAV — propre aux actifs à offre plafonnée), les liens externes
  Données historiques/Halving (le halving n'a de sens que pour Bitcoin et les
  actifs à émission programmée) sont les éléments de ce gabarit qui ne se
  généraliseront pas tels quels aux cinq autres classes d'actifs (actions, ETF,
  matières premières, indices, devises) : une action n'a pas de tokenomique ni de
  halving, une matière première n'a pas d'offre en circulation au sens crypto.
  Restent non observés, faute de simuler un clic ou un défilement — hors de portée
  de ce relevé par sonde de survol/focus : la bascule effective entre les quatre
  panneaux secondaires, l'ouverture des infobulles du widget de statistiques, la
  barre de prix collante au défilement, le tri des blocs Marchés et Trésoreries, le
  vote du sondage communautaire, et le contenu réel de l'onglet Marchés en tant que
  page (`#tab-markets` pointe vers une ancre de la même page, pas une route dédiée —
  contrairement à Données historiques et Halving qui, eux, ouvrent une URL séparée
  listée dans `## Liste des pages`). Aucun texte de CoinGecko n'est recopié
  au-delà des libellés strictement nécessaires à l'identification d'un composant.

### Catégories — `/en/categories`

- **Date du relevé** : 2026-08-30
- **Rôle** : liste des secteurs/narratifs du marché (Plateforme de contrats
  intelligents, Stablecoins, Made in USA…) classés par capitalisation, avec pour
  chacun ses trois principaux actifs, ses variations et un mini-graphique. Première
  page de l'audit dont le tableau principal n'est pas celui des cotations : les
  lignes ne portent pas de cours individuel, seulement des agrégats de groupe.
- **Priorité** : phase 1
- **État** : audité
- **Composants** :
  - **Tableau de catégories** (`table.sortable`) — même ossature que le **tableau de
    cotations** de l'accueil (en-tête collant, colonnes triables, lignes zébrées au
    survol) mais listant des secteurs, pas des monnaies : rang, catégorie, grands
    gagnants, variations 1 h/24 h/7 j, capitalisation, volume 24 h, nombre de
    monnaies, mini-graphique 7 jours. Pas de colonne de cours ni de FDV — cohérent
    avec l'absence de prix au niveau d'un secteur.
  - **Cellule « Grands gagnants »** — liste de logos de monnaies (jusqu'à trois),
    chacun un lien vers sa fiche, sans aucun chiffre attaché : la famille de
    composant que le brief de cette tâche annonçait (« tableau de listes non
    chiffrées »). À ne pas confondre avec la **mini-graphique d'évolution
    (sparkline)** déjà nommée, qui ferme la même ligne mais reste un graphique, pas
    une liste d'icônes.
  - **En-tête de colonne triable**, **ligne de tableau**, **cellule de tableau**,
    **lien**, **pastille de variation** (`.gecko-up`/`.gecko-down`, 146 et 154
    correspondances — même famille que l'accueil, homogène), **mini-graphique
    d'évolution (sparkline)** : tous déjà nommés sur l'accueil, réutilisés sans
    variante observée (même fond de survol de ligne, `rgb(248, 250, 252)` en clair /
    `rgb(27, 35, 45)` en sombre — valeurs identiques à celles de l'accueil, jetons de
    surface confirmés partagés).
  - **Commutateur** (déjà nommé) — vu ici dans son **état coché** : un commutateur
    « Les points forts » du panneau de filtres, `checked="checked"` par défaut, fond
    vert plein (`rgb(75, 204, 0)`) contre le fond neutre gris de l'exemple non coché
    relevé sur l'accueil. Complète la description de l'accueil plutôt que de la
    remplacer : un même composant, un second état observé.
  - **Pagination** (déjà nommée sur l'accueil, mesurée ici pour la première fois
    avec un sélecteur concret : `.gecko-pagination` / `.gecko-pagination-selector`)
    — compteur de résultats (« Afficher les résultats de 1 à 100 sur 756 ») plus un
    sélecteur de lignes par page (« Lignes : 100 »), en plus des liens numérotés déjà
    décrits.
- **Fonctionnalités** : tri par colonne, filtrage par groupe de catégories (chips
  Tous/Principaux éléments/Base Écosystème/Catégories/Fonds Launchpad/Communauté/
  Trading Card RWA — variante du groupe de puces déjà nommé sur l'accueil, non
  redécrite), tri par capitalisation ou par variation (menu déroulant « Market Cap »
  au-dessus du tableau, non instrumenté par sélecteur dans ce relevé), recherche
  globale (icône loupe ouvrant l'overlay déjà nommé), pagination et choix du nombre
  de lignes par page, ajout d'une catégorie aux favoris (icône étoile par ligne).
  Trois cartes de synthèse en tête de page (Vos suivis / Tendance / Grands Gagnants)
  vues dans la capture mais non instrumentées par sélecteur dans ce relevé — à
  rapprocher de la **carte de synthèse marché** de l'accueil si une future page
  les mesure : même position (au-dessus du tableau), contenu différent (listes de
  catégories, pas de chiffres de marché globaux).
- **Interactions** : deux sélecteurs propres à cette page sondés en survol et en
  focus (largeur de référence, deux thèmes) — deltas dans `mesures.json` →
  `interactions`. **Ligne de tableau** : le survol change le fond, valeurs
  identiques à celles déjà relevées sur l'accueil pour le même composant (voir
  ci-dessus) ; non focusable. **En-tête de colonne triable** : aucun changement au
  survol, non focusable — même constat que sur l'accueil.
  Restent, par ailleurs, déclarés par le HTML sans avoir été observés à l'écran :
  ouverture du menu déroulant de tri (« Market Cap »), bascule effective des chips
  de filtrage, changement du nombre de lignes par page, navigation de pagination
  au-delà de la première page.
- **Données requises** : capitalisation, variation 1 h/24 h/7 j, volume 24 h, nombre
  de monnaies et les trois principaux actifs par catégorie (logos) sont tous publiés
  par l'endpoint catégories de l'API CoinGecko gratuite — vérifié par appel direct à
  cette date, champ `topCoins` (jusqu'à trois logos par catégorie) présent dans la
  réponse. Rien à reporter en synthèse pour cette page.
- **Écart avec ZENKUU** : `apps/web/app/[locale]/categories/page.tsx` (lu dans le
  code le 2026-08-30, dev server injoignable au moment du relevé — comparaison sur
  code source) documente une décision déjà prise et déjà motivée dans le fichier :
  quatre blocs que CoinGecko pose autour de son tableau (bande de repères chiffrés,
  palmarès de secteurs en hausse, bande de faits saillants, bloc méthodologique de
  clôture) ont été retirés, au motif que chacun répond à une question que le tableau
  résout déjà par le tri ou par sa longueur. Le fichier note aussi, explicitement,
  que la référence affiche des colonnes (7 j, 1 mois, 3 mois, FDV, décompte de
  hausses/baisses) qu'aucune source gratuite ne publie pour les catégories — ce
  relevé confirme cette limite pour 1 h/24 h/7 j/capitalisation/volume/nombre de
  monnaies (publiés) mais ne l'a pas vérifiée pour les colonnes 1 mois/3 mois/FDV/
  décompte, qui n'apparaissent pas non plus dans la réponse `topCoins` inspectée ici
  — cohérent avec la note du fichier, sans vérification directe pour ces colonnes
  précises dans ce relevé. `apps/web/components/categories/CategoryExplorer.tsx`
  (`TopAssets`) rend déjà l'équivalent exact de la cellule « Grands gagnants » —
  logos des trois principaux actifs, et même AMÉLIORÉS (cliquables vers la fiche de
  l'actif, avec libellé accessible ajouté « faute d'identifiants » dans la version
  précédente) : pas un écart, une parité déjà dépassée sur ce point précis.
- **Notes** : bascule de thème validée sur ce gabarit (captures claire/sombre
  différentes octet pour octet aux trois largeurs). Aucun blocage Cloudflare
  rencontré sur cette page (correctif du user-agent posé lors de l'entrée
  précédente, présent dès la première tentative). `.gecko-toggle-track` et
  `[data-settings-target="currencyText"]` ont chacun deux correspondances sur cette
  page (contre cinq sur l'accueil) : la page porte moins de panneaux superposés,
  mais le même risque de nœud masqué existe et a été vérifié — les deux nœuds
  retenus (`index: 1` pour le premier, `index: 0` pour le second) sont bien
  visibles. Restent non observés, faute de simuler un clic : le menu déroulant de
  tri, la bascule des chips de filtrage au-delà de leur état initial, le changement
  de nombre de lignes par page, la page 2 et suivantes de la pagination, et le
  contenu réel des trois cartes de synthèse de tête de page. Aucun texte de
  CoinGecko n'est recopié au-delà des libellés strictement nécessaires à
  l'identification d'un composant.

### Exchanges, spot — `/en/exchanges`

- **Date du relevé** : 2026-08-30
- **Rôle** : classement des plateformes d'échange au comptant par score de confiance
  (« Trust Score »), avec volume 24 h déclaré et mini-graphique. Premier tableau de
  l'audit dont le tri par défaut n'est pas un chiffre de marché mais un score
  composite propre à CoinGecko.
- **Priorité** : phase 1
- **État** : audité
- **Composants** :
  - **Tableau des plateformes d'échange** (`table.sortable`) — même ossature que le
    tableau de cotations et le tableau de catégories déjà nommés (en-tête collant,
    tri par colonne, lignes zébrées au survol) : rang, plateforme, Trust Score,
    volume 24 h, mini-graphique 7 jours.
  - **Pastille de score de confiance** (Trust Score) — badge arrondi coloré portant
    une fraction sur 10 (`10/10`, `7/10`…) : vert (`bg-success-100`) pour les scores
    élevés, jaune (`bg-warning-100`) pour les scores intermédiaires, observés tous
    deux dans la capture, plus un état `N/A` en gris pour les plateformes non
    notées. À ne pas confondre avec la **pastille de variation** (`.gecko-up`/
    `.gecko-down`) déjà nommée : forme identique (badge arrondi à fond teinté) mais
    sémantique différente — un score de confiance statique, pas une variation de
    cours signée.
  - **Badge de confiance d'exchange** — petite icône SVG à côté du nom de la
    plateforme, avec infobulle (« La plateforme d'échange a été auditée par des
    tiers concernant leurs actifs », « Données sur les réserves disponibles ») —
    deux variantes vues (icône « audit », icône « réserves »), chacune déclarée par
    le HTML avec sa propre infobulle, non ouverte à l'écran par ce relevé.
  - **Mini-graphique d'évolution (sparkline)** — même nom déjà posé sur l'accueil et
    les catégories, mais **variante de rendu** : ici une image statique
    (`<img src=".../sparkline.svg">`), pas un SVG Highcharts inline interactif comme
    sur l'accueil. À vérifier si cette différence est propre à cette page ou
    générale aux tableaux secondaires de CoinGecko, si une prochaine page la
    recroise.
  - **Pagination** — déjà nommée et mesurée sur la page Catégories, réutilisée à
    l'identique ici (compteur « Afficher les résultats de 1 à 100 sur 163 »).
- **Fonctionnalités** : tri par colonne (Trust Score par défaut), filtrage par pays
  (bouton « Filtrer par pays » au-dessus du tableau, non instrumenté par sélecteur
  dans ce relevé), recherche globale (icône loupe, overlay déjà nommé), lien vers la
  méthodologie du Trust Score (infobulle de l'en-tête de colonne), pagination et
  choix du nombre de lignes par page. Onglets de famille d'exchange
  (Spot/Décentralisées/Dérivés) portés par la barre de navigation, hors composants
  de cette page — chacun a sa propre URL déjà listée dans `## Liste des pages`.
- **Interactions** : deux sélecteurs propres à cette page sondés en survol et en
  focus (largeur de référence, deux thèmes) — deltas dans `mesures.json` →
  `interactions`. **Ligne de tableau** et **en-tête de colonne triable** : mêmes
  constats que sur l'accueil et les catégories (survol change le fond de la ligne
  aux mêmes valeurs de jeton, en-tête non focusable, aucun delta au survol de
  l'en-tête).
  Restent, par ailleurs, déclarés par le HTML sans avoir été observés à l'écran :
  ouverture du filtre pays, ouverture des infobulles de badge de confiance et de
  méthodologie du Trust Score, navigation de pagination au-delà de la première
  page.
- **Données requises** : Trust Score, volume 24 h, mini-graphique 7 jours sont tous
  publiés par l'endpoint exchanges de l'API CoinGecko gratuite, déjà consommée par
  ZENKUU (`getSpotExchanges`, champ `trustScore`). Rien à reporter en synthèse pour
  cette page.
- **Écart avec ZENKUU** : `apps/web/app/[locale]/places/page.tsx` (lu dans le code
  le 2026-08-30, dev server injoignable au moment du relevé — comparaison sur code
  source) rend déjà un classement de places de cotation trié par note de confiance,
  avec la même donnée (`trustScore`, tri, volume, part de volume, pays) — parité
  fonctionnelle déjà là, documentée dans le fichier comme correction d'un lien de
  navigation qui menait à une 404. L'écart est visuel, pas fonctionnel :
  `apps/web/components/market/SpotExchangesPanel.tsx` (ligne 269) affiche le score
  en texte brut (`{score}/10`) sans le badge coloré vert/jaune/gris que porte cette
  page CoinGecko — seule `ExchangeTickersTable.tsx` (le tableau de paires d'une
  fiche d'exchange, pas cette page de classement) porte déjà un composant de score
  visuel (`TrustDot`, un point plutôt qu'un badge). La **pastille de score de
  confiance** en badge, telle que vue ici, n'a donc pas encore d'équivalent sur la
  page de classement des places.
- **Notes** : bascule de thème validée sur ce gabarit (captures claire/sombre
  différentes octet pour octet aux trois largeurs). Aucun blocage Cloudflare
  rencontré (correctif du user-agent déjà en place). Tous les sélecteurs propres à
  cette page ont une correspondance unique ou un premier nœud directement visible
  (`noeud` absent des mesures, pas d'ambiguïté à consigner). Restent non observés,
  faute de simuler un clic : le filtre par pays, les infobulles de badge de
  confiance et de méthodologie, la page 2 et suivantes de la pagination. Aucun
  texte de CoinGecko n'est recopié au-delà des libellés strictement nécessaires à
  l'identification d'un composant.

### Page d'exchange — `/en/exchanges/binance`

- **Date du relevé** : 2026-08-30
- **Rôle** : fiche de détail d'une plateforme d'échange — marchés (paires), identité,
  statistiques de volume, décomposition du score de confiance. Premier gabarit de
  détail de l'audit pour une entité **non-actif** : pas de cours propre à
  l'exchange, pas de graphique de prix, pas de convertisseur.
- **Priorité** : phase 1
- **État** : audité
- **Composants** :
  - **Onglet principal de fiche** (déjà nommé sur la page coin,
    `gecko-tab-underline-item`) — réutilisé tel quel, avec un jeu d'onglets propre à
    une plateforme d'échange (Marchés, À propos de, Statistiques, Score de
    confiance) plus deux liens externes (Preuve de réserves → DefiLlama, Jeton
    d'échange → la fiche coin du jeton natif). Confirme que ce composant sert de
    gabarit d'onglet de fiche générique, pas seulement pour les actifs.
  - **Groupe de boutons segmenté** (déjà nommé sur la page coin,
    `gecko-button-group-item`) — réutilisé ici pour basculer entre « Cours au
    comptant » et « Contrats perpétuels » (lien vers une fiche d'exchange dérivée
    séparée, pas un changement de panneau).
  - **Bouton plein** (déjà nommé) — le CTA « Commencer à négocier » vers le site de
    l'exchange (lien affilié, `rel="nofollow noopener"`) : mêmes jetons de couleur,
    de survol et de focus que le bouton plein de l'accueil (fond `rgb(75, 204, 0)`,
    ombre de relief identique) — confirmé par sondage d'interaction, pas seulement
    par lecture statique.
  - **Tableau de paires** — nouveau : table de marché listant les paires négociées
    sur cette plateforme (rang, monnaie, paire avec lien externe vers l'exchange,
    cours, spread, profondeur de carnet ±2 %, volume 24 h, volume en %, dernière
    mise à jour en texte relatif). Mêmes colonnes que le bloc Marchés vu sur la page
    coin Bitcoin (marchés d'un ACTIF), mais ici les lignes sont les paires d'un
    SEUL exchange plutôt que les exchanges d'un seul actif — l'axe de la table est
    inversé, la forme visuelle est la même famille. Bouton « Afficher plus » sous le
    tableau plutôt qu'une pagination numérotée (vu dans la capture, non instrumenté
    par sélecteur).
  - **Widget graphique en anneau (camembert)** — deux instances
    (`[data-controller="pie-chart"]`) : répartition du volume par paire et par
    devise de règlement, sous les intitulés « Binance Statistiques ». Premier
    graphique en anneau de l'audit — à ne pas confondre avec le **graphique de
    cours** (Highcharts en aires/lignes) déjà nommé sur la page coin : famille de
    rendu différente (proportions d'un tout, pas une série temporelle), bien que
    partageant probablement le même moteur (Highcharts, non confirmé pour ce
    graphique précis dans ce relevé).
  - **Graphique d'aire de volume** — grand graphique sous les deux anneaux
    (« Volume de négociation de la plate-forme d'échange »), avec sélecteur de
    plage 24h/7j/1M/3M/1AN — vu dans la capture avec le même
    `gecko-button-group-item` que le sélecteur de plage du graphique de cours ;
    non instrumenté par un sélecteur propre dans ce relevé (même famille que le
    graphique de cours de la page coin, remplissage sous la courbe en plus).
  - **Bloc de décomposition du score de confiance** — section « Score de confiance »
    reprenant la pastille déjà nommée en grand format (« 10/10 »), suivie de quatre
    jauges horizontales (Liquidité, Réglementation, Cybersécurité, Fournisseur de
    données) : piste grise arrondie avec portion remplie proportionnelle à un
    pourcentage, chacune avec une infobulle méthodologique. Nouveau, mais non
    instrumenté par un sélecteur fiable dans ce relevé — la piste n'a pas de classe
    `gecko-*` propre, seulement des utilitaires Tailwind génériques
    (`tw-rounded-full`, `tw-h-1.5`) qui matcheraient d'autres éléments arrondis de
    la page ; à cibler par un scope plus précis (le conteneur de la section) si une
    prochaine page recroise ce composant.
  - **Table d'identité** (« À propos de Binance », « Frais ») — deux tables clé/
    valeur côte à côte : identité (site web, communauté, e-mail, ID API, adresse,
    nombre d'entrées, nombre de paires, année de création, pays du siège) et
    tarification (dépôt, frais, moyens de paiement, opérations sur marge, marché
    des futures). Famille apparentée au **widget de statistiques** déjà nommé sur
    la page coin (même forme `<th>`/`<td>`), mais ce relevé n'a pas confirmé le même
    `itemtype="https://schema.org/Table"` pour cette table précise (recherché,
    non trouvé dans le HTML de cette page) — à vérifier avant de fusionner les deux
    entrées sous un seul composant.
  - **Liste de contrôle** (Réglementation, Cybersécurité, Incident, Couverture API,
    Équipe) — lignes libellé + coche verte ou tiret, vues dans la capture, non
    instrumentées par sélecteur dans ce relevé. Nouveau type de composant
    (affirmation/négation par coche), distinct de la case à cocher d'un
    **commutateur**.
- **Fonctionnalités** : bascule d'onglet de fiche, bascule spot/perpétuels
  (navigation), tri du tableau de paires, affichage étendu du tableau de paires
  (« Afficher plus »), sélection de plage temporelle du graphique de volume, appel à
  l'action affilié vers la plateforme externe, infobulles méthodologiques sur
  chaque composante du score de confiance.
- **Interactions** : trois sélecteurs sondés en survol et en focus (largeur de
  référence, deux thèmes) — deltas dans `mesures.json` → `interactions`. **Ligne du
  tableau de paires** et **en-tête de colonne triable** : mêmes constats que sur
  les tableaux déjà audités (fond de survol identique, en-tête non focusable).
  **Bouton plein** (CTA « Commencer à négocier ») : survol et focus confirmés
  identiques, jeton pour jeton, au bouton plein déjà mesuré sur l'accueil — un
  composant partagé, pas redécrit dans le détail.
  Restent, par ailleurs, déclarés par le HTML sans avoir été observés à l'écran :
  bascule effective entre les cinq onglets de fiche, ouverture des infobulles du
  score de confiance, sélection de plage du graphique de volume, extension du
  tableau de paires via « Afficher plus ».
- **Données requises** : paires négociées, cours, spread, profondeur de carnet,
  volume 24 h, répartition du volume par paire/devise sont publiés par l'endpoint
  tickers de l'API CoinGecko gratuite, déjà consommée par ZENKUU
  (`ExchangeTickersTable`). Le **score de confiance décomposé** (quatre
  sous-scores : liquidité, réglementation, cybersécurité, fournisseur de données) et
  les champs d'identité (année de création, pays du siège, couverture API,
  historique d'incidents) n'ont pas été vérifiés dans ce relevé comme publiés par
  l'API gratuite — seul le score global (`trustScore`, déjà consommé) l'est
  confirmé ; à vérifier avant de les inscrire en synthèse comme manquants ou
  disponibles.
- **Écart avec ZENKUU** : `apps/web/app/[locale]/places/[id]/page.tsx` (lu dans le
  code le 2026-08-30, dev server injoignable au moment du relevé — comparaison sur
  code source) rend déjà une fiche d'identité (fil d'Ariane, logo, nom, pastille de
  score via `ExchangeLogo`/`TrustDot`) et le **tableau de paires**
  (`ExchangeTickersTable`, déjà repéré depuis l'entrée Exchanges spot comme porteur
  du composant `TrustDot`). N'ont pas d'équivalent identifié dans les fichiers lus
  pour cette entrée : les deux **widgets graphiques en anneau** (répartition du
  volume par paire/devise), le **graphique d'aire de volume** de la plateforme, le
  **bloc de décomposition du score de confiance** en quatre jauges, la **table
  d'identité** étendue (frais, moyens de paiement, année de création…) et les
  **listes de contrôle** (réglementation, cybersécurité, incidents, couverture
  API) — tout ce qui, sur CoinGecko, vit sous les onglets À propos/Statistiques/
  Score de confiance et que la fiche ZENKUU actuelle, à la lecture du seul fichier
  de page, ne semble pas porter.
- **Notes** : bascule de thème validée sur ce gabarit (captures claire/sombre
  différentes octet pour octet aux trois largeurs). Aucun blocage Cloudflare
  rencontré (correctif du user-agent déjà en place, posé lors de l'entrée Page
  coin). Le CTA affilié a deux correspondances sur la page (`a[href*="binance.com/
  register"]`, `index: 0, total: 2`) : la seconde est probablement un second appel
  à l'action plus bas dans la page (non vérifié). Restent non observés, faute de
  simuler un clic ou un défilement : la bascule effective des cinq onglets de
  fiche, l'ouverture des infobulles du score de confiance, la sélection de plage du
  graphique de volume, l'extension « Afficher plus » du tableau de paires, et le
  contenu détaillé des deux graphiques en anneau et du graphique d'aire (mesurés
  seulement par leur présence, pas par leurs valeurs). Aucun texte de CoinGecko
  n'est recopié au-delà des libellés strictement nécessaires à l'identification
  d'un composant.

### Graphiques globaux — `/en/charts`

- **Date du relevé** : 2026-08-30
- **Rôle** : cinq graphiques de marché empilés (capitalisation totale, prédominance
  BTC, capitalisation DeFi, capitalisation des stablecoins, capitalisation des
  altcoins), chacun dans sa propre carte avec sélecteur de plage, calendrier,
  export et intégration. Page à dominante graphique de l'audit : pas de tableau
  principal, le contenu est presque entièrement fait de graphiques répétant le même
  gabarit de carte.
- **Priorité** : phase 1
- **État** : audité
- **Composants** :
  - **Carte de graphique** (`.chart-group`) — nouveau conteneur : titre avec
    infobulle, barre d'outils (sélecteur de plage, calendrier, export, intégration)
    et graphique. Cinq instances homogènes sur cette page (même fond, même filet,
    même rayon `12px`, même ombre de contour `rgb(239, 242, 245)` — cohérent avec
    les jetons de surface déjà vus ailleurs sur le site).
  - **Sélecteur de plage par calendrier** (`#calendar`) — nouveau : bouton
    déclenchant un sélecteur de plage de dates (Flatpickr, `readonly`, valeur
    initiale « 2013-04-28 to 2026-08-29 »), à côté du groupe de boutons segmenté
    déjà nommé (24h/7j/14J/1M/3M/Max). **Duplication d'id observée** : les cinq
    cartes de graphique portent chacune un bouton `id="calendar"` — HTML invalide
    (id non unique), constaté tel quel, pas corrigé par ce relevé.
  - **Bouton d'export** (`#export`) et **bouton d'intégration** (`#embed`) —
    nouveaux : deux boutons icône-seule en bout de barre d'outils, chacun ouvrant un
    menu déroulant déclaré par le HTML (le second propose le code `<iframe>` en
    thème clair ou sombre) mais non ouvert à l'écran par ce relevé.
  - **Groupe de boutons segmenté** (déjà nommé) — réutilisé pour le sélecteur de
    plage de chaque graphique (24h/7j/14J/1M/3M/Max), à côté du calendrier plutôt
    qu'à sa place.
  - **Navigation latérale de section** (`.side-nav`) — nouveau : colonne de gauche,
    groupes de liens repliables par icône et libellé (Monnaies, Actifs du monde
    réel, Catégories, Trésoreries, NFT), avec l'item courant mis en évidence. Item
    individuel sur une classe distincte (`gecko-tab-chip-secondary-item`) de tout
    ce qui a été nommé jusqu'ici — ni `gecko-tab-chip-item`, ni
    `gecko-tab-underline-item`. Vu uniquement sur cette page dans cet audit ; à
    vérifier si elle est propre à la section « Graphiques » ou partagée par
    d'autres sections (Highlights, RWA…) que cet audit n'a pas ouvertes. Non
    instrumentée par un sélecteur de mesure dans ce relevé — observée dans la
    capture et dans le HTML, pas mesurée en style.
  - **Légende de graphique** et **navigateur de plage (brush)** — natifs
    Highcharts (`.highcharts-legend-item`, point coloré + libellé sous le
    graphique ; `.highcharts-navigator`, bande de mini-aperçu avec poignées de
    sélection sous l'axe temporel), déclarés dans le HTML de cette page mais absents
    des captures du **graphique de cours** déjà nommé sur la page coin — première
    fois que ces deux sous-éléments de la même famille de graphique sont observés
    sur ce site. Non instrumentés par sélecteur dans ce relevé (rendu SVG interne
    au graphique, pas un nœud HTML autonome).
- **Fonctionnalités** : sélection de plage par bouton ou par calendrier, export des
  données de la fenêtre affichée, génération d'un code d'intégration (thème clair
  ou sombre), navigation latérale entre familles de graphiques (Monnaies, Actifs du
  monde réel, Catégories, Trésoreries, NFT — chacune une page distincte déjà listée
  ou à ajouter selon le périmètre retenu), lien direct vers l'API du marché global.
- **Interactions** : trois sélecteurs sondés en survol et en focus (largeur de
  référence, deux thèmes) — deltas dans `mesures.json` → `interactions`.
  **Calendrier**, **export**, **intégration** : aucun changement mesurable au
  survol pour les trois ; le focus affiche un anneau de contour identique et
  personnalisé sur les trois (`rgba(0, 0, 0, 0)`, 2 px, décalage 2 px — un anneau
  transparent mais présent en tant que déclaration de style, cohérent avec le
  bouton discret de l'accueil qui posait aussi un anneau quasi transparent mais
  solide). Le calendrier a cinq correspondances sur la page (`index: 0, total: 5`,
  homogènes — les cinq cartes portent le même bouton) ; export et intégration
  n'ont chacun qu'une correspondance (un seul bouton d'export et un seul bouton
  d'intégration existent réellement sur la page, malgré cinq cartes — à vérifier
  si un seul export sert les cinq graphiques ou si les identifiants dupliqués
  masquent les quatre autres du sondage, non tranché par ce relevé).
  Restent, par ailleurs, déclarés par le HTML sans avoir été observés à l'écran :
  ouverture du calendrier, ouverture des menus d'export et d'intégration, bascule
  effective du groupe de boutons segmenté vers une autre plage, repli/dépli des
  groupes de la navigation latérale.
- **Données requises** : capitalisation totale, prédominance BTC/ETH/stablecoins,
  capitalisation DeFi, capitalisation des stablecoins (par émetteur) et des
  altcoins sont toutes des séries temporelles agrégées — publiées par l'API
  CoinGecko gratuite (endpoint marché global et historique global), déjà consommée
  par ZENKUU (`GlobalChartCard`). Rien à reporter en synthèse pour cette page.
- **Écart avec ZENKUU** : `apps/web/app/[locale]/graphiques/page.tsx` (lu dans le
  code le 2026-08-30, dev server injoignable au moment du relevé — comparaison sur
  code source) rend déjà `GlobalChartCard`, avec sélecteur de plage à préréglages
  (`rangeId`/`defaultRange`), export limité à la fenêtre affichée (choix documenté
  dans le fichier : « l'export porte sur la fenêtre affichée et non sur la série
  entière ») et un bouton d'intégration (`EmbedButton`, vers une route réelle
  `/embed/graphique`) — parité fonctionnelle déjà large sur la barre d'outils de
  carte. N'ont pas d'équivalent identifié dans le fichier lu : le **sélecteur de
  plage par calendrier** (choix de dates arbitraires, pas seulement des
  préréglages), la **navigation latérale de section**, et le **navigateur de
  plage (brush)** sous chaque graphique — ZENKUU expose des préréglages de plage
  mais pas de mini-aperçu de la série entière avec poignées de sélection.
- **Notes** : bascule de thème validée sur ce gabarit (captures claire/sombre
  différentes octet pour octet aux trois largeurs). Aucun blocage Cloudflare
  rencontré (correctif du user-agent déjà en place). Fichier HTML source
  particulièrement volumineux pour cette page (environ 7 Mo contre 0,9 à 2,1 Mo
  pour les quatre entrées précédentes) — cohérent avec cinq graphiques Highcharts
  inline, chacun portant sa propre série de points SVG. Restent non observés,
  faute de simuler un clic : l'ouverture du calendrier, des menus d'export et
  d'intégration, le changement de plage effectif, le repli des groupes de la
  navigation latérale, et le contenu réel de la carte « Explorer les détails de
  l'API » vue sous la navigation latérale. Aucun texte de CoinGecko n'est recopié
  au-delà des libellés strictement nécessaires à l'identification d'un composant.

### Page de catégorie — `/en/categories/meme-token`

- **Date du relevé** : 2026-08-30
- **Rôle** : fiche de secteur — tableau de cotations restreint aux actifs d'un
  seul secteur (Meme), précédé d'un en-tête de contexte propre au secteur
  (description, capitalisation, volume) et d'une grille de mise en avant du
  secteur (« Principaux éléments »). Confirme et détaille les « trois cartes
  de synthèse » vues sans instrumentation sur la page Catégories.
- **Priorité** : phase 1
- **État** : audité
- **Composants** :
  - **En-tête de contexte** (`h1` + description) — nouveau : titre du secteur
    avec icône de copie de lien, suivi d'une phrase générée décrivant la
    capitalisation du jour et sa variation 24 h. Famille annoncée par le
    brief de cette tâche (« en-tête de contexte »).
  - **Bouton Suivre** — nouveau : bouton plein-largeur d'icône étoile
    (`far fa-star`) et libellé « Suivre », à côté de l'en-tête. Même
    mécanisme d'ajout aux favoris que l'icône étoile déjà vue en ligne de
    tableau sur l'accueil et les catégories, mais ici présenté comme un
    bouton complet (icône + texte) plutôt qu'une icône seule en cellule — un
    second habillage du même geste, pas un second composant fonctionnel.
  - **Commutateur** (déjà nommé) — réutilisé ici sous le libellé
    « Principaux éléments », coché par défaut : bascule d'affichage d'un
    bloc, pas de nouvel état par rapport à celui déjà décrit sur les
    catégories (coché, fond vert).
  - **Grille de mise en avant du secteur** — nouveau : trois cartes côte à
    côte sous l'en-tête (masquables par le **Commutateur** ci-dessus) : une
    carte « Capitalisation boursière » et une carte « Volume 24 h » (chiffre
    plus mini-graphique décoratif), suivies d'une carte de liste « Tendance »
    listant jusqu'à six monnaies du secteur avec logo, nom, cours et
    variation. Un seul panneau de liste, sans onglet ni bascule interne —
    vérifié sur le rendu réel de la page. À ne pas confondre avec la
    **cellule « Grands gagnants »** déjà nommée sur la page Catégories :
    même idée (mettre en avant des actifs du secteur) mais forme et
    contenu différents — la cellule est une liste de logos SANS chiffre
    dans une ligne de tableau, cette carte est un widget de liste autonome
    ET chiffré (cours, variation). Deux composants distincts pour une même
    intention éditoriale.
  - **Bouton Acheter (encart publicitaire)** — nouveau : pastille verte à
    filet (`Acheter`) affichée sur certaines lignes du tableau seulement,
    déclenchée par `data-controller="coin-row-ads"` /
    `data-action="click->coin-row-ads#sendImpression"`. Ce n'est pas une
    fonctionnalité de trading du site : c'est un emplacement publicitaire
    déguisé en action de ligne, à ne pas confondre avec le **bouton plein**
    ou le **bouton discret** déjà nommés — troisième famille de bouton par
    l'intention (commerciale tierce), pas par la forme.
  - **Barre d'outils de filtrage étendue** — nouveau, au-dessus du tableau :
    reprend le groupe de puces de filtrage déjà vu sur les catégories
    (Tous/Principaux éléments/Base Ecosystem…) et y ajoute une puce
    déroulante (« All Meme », avec chevron) et deux boutons icône+texte
    (« Personnaliser », icône étincelles ; filtre, icône entonnoir seule) —
    aucun des deux n'existait sur la page Catégories.
  - **Tableau de cotations** (déjà nommé sur l'accueil), **en-tête de
    colonne triable**, **ligne de tableau**, **pastille de variation**
    (`.gecko-up`/`.gecko-down`, 230 et 209 correspondances — famille
    homogène), **mini-graphique d'évolution (sparkline)**, **pagination** :
    tous réutilisés sans variante — mêmes colonnes que l'accueil, restreint
    à un secteur (rang MONDIAL conservé dans la colonne #, pas un rang
    propre au secteur).
- **Fonctionnalités** : tri par colonne, filtrage par groupe de puces et par
  menu déroulant de secteur voisin, personnalisation des colonnes affichées
  (bouton « Personnaliser », non ouvert dans ce relevé), filtre avancé
  (icône entonnoir, non ouvert), ajout du secteur entier aux favoris
  (bouton Suivre), ajout d'une monnaie aux favoris depuis la ligne,
  pagination, clic publicitaire « Acheter » sur certaines lignes. Section d'actualités
  liées au secteur en pied de tableau (« Dernières actualités de Meme »,
  trois cartes) vue dans la capture, non instrumentée par sélecteur.
- **Interactions** : deux sélecteurs propres à cette page sondés en survol
  et en focus (largeur de référence, deux thèmes) — deltas dans
  `mesures.json` → `interactions`. **Ligne de tableau** et **en-tête de
  colonne triable** : mêmes constats que sur les tableaux déjà audités
  (survol change le fond aux mêmes valeurs de jeton, en-tête non
  focusable).
  Restent, par ailleurs, déclarés par le HTML sans avoir été observés à
  l'écran : ouverture du menu déroulant de secteur voisin,
  ouverture du panneau « Personnaliser » et du filtre entonnoir,
  déclenchement réel du bouton Acheter, navigation de pagination au-delà
  de la première page.
- **Données requises** : cotations, variations, volume, capitalisation et
  mini-graphique du secteur filtré viennent du même endpoint « actifs
  d'une catégorie » que la page Catégories, déjà couvert par l'API
  CoinGecko gratuite. Les monnaies listées dans la carte « Tendance » de
  la grille de mise en avant sont un sous-ensemble du même jeu de données
  (pas une source distincte). Rien à reporter en synthèse pour cette page.
- **Écart avec ZENKUU** : `apps/web/app/[locale]/categories/[id]/page.tsx`
  (lu dans le code, puis vérifié sur le rendu réel du serveur de dev à
  `http://localhost:3000/fr/categories/meme-token`, redirection 307 vers
  `/categories/meme-token` puis 200) rend déjà l'**en-tête de contexte**
  presque à l'identique dans l'intention : titre, `ChangeBadge` (l'analogue
  de la **pastille de variation**), description du secteur, et un bloc
  `<dl>` de trois statistiques (capitalisation du secteur, volume 24 h,
  actifs listés) — le fichier documente lui-même que la colonne `#` du
  tableau reste le rang MONDIAL, pas un rang recalculé pour le secteur,
  contrairement à ce que CoinGecko pourrait laisser croire visuellement.
  `MarketTable` y est rendu `sortable={false}` et `paginated={false}` —
  choix déjà motivé dans le fichier (« le tri porterait sur l'ensemble du
  classement, pas sur le sous-ensemble affiché »), donc pas un manque
  accidentel. N'ont pas d'équivalent identifié dans le fichier lu : la
  **grille de mise en avant du secteur** (capitalisation, volume, Tendance),
  le **bouton Suivre** dédié au secteur, la barre d'outils de filtrage
  étendue (Personnaliser, filtre entonnoir, puce déroulante de secteur
  voisin) et la section d'actualités liées au secteur. Le **bouton
  Acheter** publicitaire n'a pas vocation à être répliqué — c'est un
  encart tiers, hors périmètre d'une migration de composant.
- **Notes** : bascule de thème validée sur ce gabarit (captures
  claire/sombre différentes octet pour octet aux trois largeurs). Aucun
  blocage Cloudflare rencontré (correctif du user-agent déjà en place).
  `.gecko-tab-chip-item:not(.selected)` reste, comme sur l'accueil, un
  sélecteur à correspondances nombreuses (22) dont le nœud visible retenu
  est au 11ᵉ rang — cohérent avec l'observation déjà faite sur l'accueil,
  pas une anomalie propre à cette page. Restent non observés, faute de
  simuler un clic : le menu déroulant de secteur voisin, le panneau
  Personnaliser, le filtre entonnoir, le clic publicitaire Acheter, et la
  page 2 et suivantes de la pagination. Aucun texte de CoinGecko n'est recopié au-delà des libellés
  strictement nécessaires à l'identification d'un composant.

### Apprendre, article — `/learn/crypto-narratives`

- **Date du relevé** : 2026-08-30
- **Rôle** : gabarit de lecture longue — article éditorial listant dix
  narratifs crypto du moment, sommaire ancré, méta-données de rédaction,
  notation et articles associés. N'existe qu'en anglais (voir la note en
  tête de `## Liste des pages`) : relevé fait sur la version `/learn`, sans
  équivalent `/fr`.
- **Priorité** : phase 3
- **État** : audité
- **Composants** :
  - **Bandeau d'annonce** — nouveau : bande pleine largeur, fond sombre,
    au-dessus de la barre de navigation, composée d'un texte d'annonce
    court, d'un lien souligné et d'une croix de fermeture. Premier bandeau
    de ce type dans l'audit ; à distinguer du **ticker de statistiques
    globales** déjà nommé, qui vit lui aussi tout en haut de page mais
    affiche des chiffres de marché, pas une annonce éditoriale.
  - **Barre de sous-navigation de rubrique** — nouveau : rangée de liens
    texte sous la barre de navigation principale (All/Latest/Airdrops/
    Coins & Tokens/Guides/Wallets & Bridges/API/Reviews/More+), propre à
    la section Apprendre. Liens simples, pas des onglets à état actif
    comme les familles `gecko-tab-*` déjà nommées.
  - **Fil d'Ariane simplifié** (« Coverage ») — nouveau : simple libellé de
    catégorie au-dessus du titre, sans lien ni séparateur — plus léger que
    le fil d'Ariane à liens vu ailleurs sur le site.
  - **En-tête d'article** — nouveau : titre (36 px/700, `h1`), note en
    étoiles, ligne de signature : auteur, réviseur, date de mise à jour
    (auteur et réviseur chacun en lien), bouton « Make us preferred on
    Google » avec icône de marque.
  - **Encart de résumé** — nouveau : bloc à filet gauche coloré,
    reprenant le titre du premier paragraphe en gras suivi d'une synthèse
    en 2-3 phrases — un rappel visuel avant le corps de l'article, distinct
    d'un paragraphe de corps normal.
  - **Sommaire d'article** — nouveau : colonne latérale collante, liste de
    liens ancrés vers chaque section numérotée, bouton de fermeture (croix)
    en tête. Famille de composant que le brief de cette tâche annonçait
    (« gabarit de lecture »).
  - **Bouton de retour en haut** — nouveau : bouton carré à icône flèche
    vers le haut, sous le sommaire, collant à la même position.
  - **Corps d'article** (`article`, `article p`, `article h2`) — nouveau :
    paragraphes (16 px/400, interligne 25.6 px, `rgb(100, 116, 139)`) et
    titres de section (20 px/700, interligne 36 px, `rgb(15, 23, 42)`) —
    échelle typographique à deux niveaux propre au corps de texte long,
    plus petite que les titres de fiche déjà mesurés ailleurs (36 px pour
    le `h1` de cette page, cohérent avec le `h1` de la page coin).
  - **Horodatage** (`time`) — nouveau : texte de date de mise à jour
    (16 px/400, même couleur que le corps de texte).
  - **Widget de notation par émoji** — nouveau : cinq visages cliquables
    (très mécontent à ravi) sous l'article, plus un compteur de votes
    (« Vote count: 279 ») — mécanisme de notation propre à cette famille de
    page, sans équivalent vu ailleurs dans l'audit.
  - **Carte de profil de rédaction** — nouveau : avatar rond, nom
    (« CoinGecko »), paragraphe de présentation de l'équipe éditoriale,
    lien social (Twitter/X). À ne pas confondre avec la **table
    d'identité** déjà nommée sur la page d'exchange : celle-ci décrit une
    personne/organisation, pas une entité de marché.
  - **Carte d'article associé** — nouveau : vignette image, étiquette de
    catégorie (« Coverage », « Guides », « Reports »), titre en lien —
    quatre instances en grille de bas de page (« Related Articles »).
- **Fonctionnalités** : navigation par sommaire ancré, fermeture du
  sommaire, retour en haut de page, notation de l'article par émoji,
  suivi de l'auteur et du réviseur, navigation vers les articles associés,
  fermeture du bandeau d'annonce, sous-navigation de rubrique.
- **Interactions** : un sélecteur propre à cette page sondé en survol et en
  focus (largeur de référence, deux thèmes) — deltas dans `mesures.json` →
  `interactions`. **Paragraphe de corps** (`article p`, 59 correspondances,
  premier nœud visible retenu) : aucun changement mesurable au survol
  (cohérent, texte non interactif) ; non focusable.
  Restent, par ailleurs, déclarés par le HTML sans avoir été observés à
  l'écran : fermeture du bandeau d'annonce, ouverture/fermeture du
  sommaire, clic de notation par émoji, défilement déclenchant le retour
  en haut, sous-navigation de rubrique.
- **Données requises** : cette page ne porte aucune donnée de marché — son
  contenu est un texte éditorial rédigé, hors périmètre des sources de
  ZENKUU (CoinGecko, Binance, Frankfurter, Yahoo Finance, CoinPaprika,
  alternative.me, DefiLlama, RSS). Rien à reporter en synthèse : l'absence
  de source n'est pas un écart de couverture de données, c'est la nature
  du gabarit (contenu rédigé, pas agrégé).
- **Écart avec ZENKUU** : `apps/web/app/[locale]/blog/[slug]/page.tsx` (lu
  dans le code le 2026-08-30 ; dev server non revérifié pour cette page
  précise, comparaison sur code source) porte déjà l'essentiel de
  l'ossature de lecture : fil d'Ariane à liens, en-tête (titre, résumé,
  `ArticleMeta`, date de révision), corps en sections titrées, **sommaire
  d'article** collant (explicitement placé À DROITE du corps, « l'ordre de
  lecture naturel », choix documenté dans le fichier — CoinGecko le pose
  aussi à droite ici, contrairement à d'autres sites qui le mettent à
  gauche : convergence, pas un écart), `ShareButtons`, et **carte
  d'article associé** via `BlogCard` sous « À lire ensuite ». N'ont pas
  d'équivalent identifié dans le fichier lu : le **bandeau d'annonce**, la
  **barre de sous-navigation de rubrique**, l'**encart de résumé** en
  tête d'article, le **widget de notation par émoji**, la **carte de
  profil de rédaction** et le **bouton de retour en haut** — tous
  candidats à une reprise partielle plutôt qu'à une adoption en bloc,
  cette page CoinGecko empilant plus de mécanismes secondaires
  qu'`ArticlePage` n'en porte aujourd'hui.
- **Notes** : bascule de thème validée sur ce gabarit (captures
  claire/sombre différentes octet pour octet aux trois largeurs). Aucun
  blocage Cloudflare rencontré (correctif du user-agent déjà en place).
  Page en anglais uniquement — contrairement aux entrées précédentes,
  aucun texte relevé ici n'est en français dans la source, ce qui ne
  change rien à la contrainte : aucun texte de CoinGecko n'est recopié
  au-delà des libellés strictement nécessaires à l'identification d'un
  composant, et les descriptions ci-dessus sont rédigées, pas traduites.
  Le contenu de l'article (les dix narratifs eux-mêmes) n'est délibérément
  pas résumé ici : la consigne de cette tâche est de décrire la mise en
  page et la typographie d'une page dense en texte, pas de reproduire son
  propos. Restent non observés, faute de simuler un clic ou un
  défilement : la fermeture du bandeau d'annonce, l'ouverture/fermeture
  du sommaire, le clic de notation, et le comportement réel du bouton de
  retour en haut au défilement.

### Page API — `/en/api`

- **Date du relevé** : 2026-08-30
- **Rôle** : gabarit marchand — page produit de l'API CoinGecko, entièrement
  faite de blocs promotionnels empilés (héros, produits, statistiques
  d'usage, clients, témoignages, FAQ, appel à l'action final). Premier
  gabarit purement commercial de l'audit : aucune donnée de marché en
  direct, aucun tableau.
- **Priorité** : phase 3
- **État** : audité
- **Composants** :
  - **Compteur d'usage** — nouveau : ligne de texte courte associant un
    libellé de métrique d'usage à un chiffre d'ampleur, répétée à
    l'identique en tête de héros et en tête du bloc d'appel à l'action
    final.
  - **En-tête héroïque marchand** — nouveau : titre en deux couleurs (une
    partie en teinte neutre, une partie en teinte d'accent — « avec » et
    la fin de la phrase en gris-bleu plus clair que le reste du titre),
    paragraphe d'accroche, groupe de trois appels à l'action (bouton
    plein, bouton discret, lien à chevron), légende d'accroche courte en
    bas de héros, sous le titre (taille et graisse non mesurées dans ce
    relevé).
  - **Bandeau de logos clients** — nouveau : rangée de logos de marques
    partenaires (Coinbase, Nansen, Phantom, Zerion, Crypto.com, MetaMask),
    répétée en fin de page dans le bloc d'appel à l'action final.
  - **Carte illustrée décorative** — nouveau : trois cartes à fond dégradé
    coloré, chacune une capture stylisée d'interface (tableau de cours,
    widget de gains, graphe de nœuds) sans texte ni lien, purement
    illustrative — sous le héros, avant le texte de section « Nos
    produits API ».
  - **Grille de cartes de produit** — nouveau : carte icône + titre +
    chemin d'URL en style code (`/derivatives/*`) + description, en grille
    3 colonnes, avec bouton « Afficher tout ▾ » qui étend la grille
    au-delà des six premières cartes.
  - **Bande de statistiques marketing** — nouveau : cinq chiffres
    d'ampleur (44M+ Jetons, 1900+ Plates-formes d'échange, 99,9 %
    Disponibilité, 240+ Réseaux, 12+ Années de données historiques),
    chacun avec un court paragraphe. À ne pas confondre avec le
    **bandeau de synthèse marché** de l'accueil ni la **bande de
    statistiques marketing** de vente : celle-ci vante une capacité
    technique de la plateforme (couverture, fiabilité), pas un état de
    marché — même forme visuelle (chiffre en gros + libellé), intention
    et source radicalement différentes (chiffres d'entreprise, pas de
    marché).
  - **Carte de témoignage** — nouveau : citation en grand format, nom et
    titre du client sous la citation, quatre instances (deux courtes en
    grille, deux longues en pleine largeur) citant des entreprises
    partenaires.
  - **Groupe de puces de filtre** (`gecko-tab-chip-item`, déjà nommé) —
    réutilisé pour filtrer les catégories de la FAQ (Général/Tarifs/
    Abonnements/Données et Sécurité/Assistance/Avertissement, plus un
    lien externe « Études de cas ») : même classe que partout ailleurs sur
    le site, pas une variante.
  - **Accordéon FAQ** — nouveau : ligne question + icône plus/moins
    (Alpine, `:class="{ 'fa-plus': !expanded, 'fa-minus': expanded }"`),
    contenu de réponse masqué par défaut (`x-cloak`), non ouvert à l'écran
    par ce relevé.
- **Fonctionnalités** : bascule de catégorie de produit (chips), extension
  de la grille de produits (« Afficher tout »), filtrage de la FAQ par
  catégorie, ouverture/fermeture de chaque question de la FAQ, appels à
  l'action multiples vers l'inscription, le contact commercial, la
  documentation et le contact entreprise (répétés à plusieurs endroits de
  la page).
- **Interactions** : deux sélecteurs propres à cette page sondés en survol
  et en focus (largeur de référence, deux thèmes) — deltas dans
  `mesures.json` → `interactions`. **Groupe de puces de filtre** (FAQ,
  actif et inactif) : mêmes constats déjà relevés sur l'accueil pour ce
  composant (nœud actif sans delta au survol, nœud inactif changeant de
  fond au survol) — pas une variante propre à cette page, le composant se
  comporte à l'identique dans ce troisième contexte.
  Restent, par ailleurs, déclarés par le HTML sans avoir été observés à
  l'écran : ouverture de chaque question de la FAQ, extension de la
  grille de produits, bascule effective des catégories de produit.
- **Données requises** : cette page ne porte aucune donnée de marché — son
  contenu est un argumentaire commercial (chiffres d'entreprise, logos de
  clients, témoignages), hors périmètre des sources de données de ZENKUU.
  Rien à reporter en synthèse pour cette raison : comme pour la page
  Apprendre, l'absence de source n'est pas un écart de couverture, c'est
  la nature du gabarit.
- **Écart avec ZENKUU** : aucune page marchande de ce type n'existe dans
  `apps/web/app/[locale]/` — `app/api/*` désigne les routes d'API interne
  du site, pas une page de vente. Le plus proche gabarit du dépôt,
  `apps/web/app/[locale]/pourquoi-zenkuu/page.tsx` (lu le 2026-08-30),
  documente EXPLICITEMENT dans ses commentaires le rejet de plusieurs des
  conventions vues ici : « pas de surtitre décoratif, pas d'icône par
  carte, pas de bandeau de garanties, pas d'alternance mécanique » —
  qualifiées de « conventions sans contenu ». Une future page API ZENKUU
  devra donc arbitrer, composant par composant, entre la convention
  marchande observée ici (bande de logos, cartes illustrées décoratives,
  témoignages, compteur d'usage) et ce parti pris déjà pris ailleurs sur
  le site contre le papier peint marketing — ce n'est pas un manque à
  combler mécaniquement, c'est une décision de positionnement à trancher
  par l'exploitant.
- **Notes** : bascule de thème validée sur ce gabarit (captures
  claire/sombre différentes octet pour octet aux trois largeurs). Aucun
  blocage Cloudflare rencontré (correctif du user-agent déjà en place).
  Page la plus longue en hauteur rendue de cet audit après les Graphiques
  globaux (environ 10 200 px à 1440 px de large) — cohérent avec
  l'empilement de blocs promotionnels propre à ce gabarit. Restent non
  observés, faute de simuler un clic : l'ouverture de chaque question de
  la FAQ, l'extension de la grille de produits au-delà des six premières
  cartes, et la bascule effective entre catégories de produit. Aucun
  texte de CoinGecko n'est recopié au-delà des libellés strictement
  nécessaires à l'identification d'un composant.

### Portefeuille — `/en/portfolio`

- **Date du relevé** : 2026-08-30
- **Rôle** : page de compte — vue observée pour un visiteur SANS session
  CoinGecko. `/en/portfolio` n'exige pas d'identifiant à l'URL et rend, pour
  ce relevé, une page marchande d'onboarding vantant le Portefeuille
  CoinGecko (suivi de gains, listes personnalisées, application mobile),
  pas le tableau réel d'un portefeuille rempli. **La vue connectée n'a pas
  été observée** : l'outil de relevé du dépôt tourne dans un Chromium
  isolé sans accès à la session de l'exploitant, et cette tâche demande
  explicitement d'auditer ce que voit un visiteur non connecté — c'est
  très probablement aussi ce que ZENKUU doit rendre pour ce même visiteur.
- **Priorité** : phase 3
- **État** : audité
- **Composants** :
  - **Illustration de produit** — nouveau : capture stylisée de l'interface
    réelle du Portefeuille (bureau et mobile, superposées), utilisée en
    tête de héros. À ne pas confondre avec la **carte illustrée
    décorative** déjà nommée sur la page API : celle-ci montrait des
    interfaces abstraites sans rapport direct avec le produit vendu sur la
    page, celle-ci montre l'écran RÉEL du produit annoncé par le héros.
  - **Liste de fonctionnalités à icône** — nouveau : groupes de lignes
    icône + phrase courte de bénéfice, répétés sous plusieurs sous-titres
    (Suivi des gains, Listes personnalisées, Application mobile) — gabarit
    de contenu marketing simple, différent de la **grille de cartes de
    produit** de la page API (pas de carte, pas de chemin d'URL, pas de
    bordure).
  - **Illustration de graphique en anneau (décorative)** — nouveau : gros
    camembert coloré sans légende cliquable, purement illustratif —
    distinct du **widget graphique en anneau** déjà nommé sur la page
    d'exchange, qui portait de vraies données de répartition de volume ;
    celui-ci n'affiche que des pourcentages d'exemple, non rattachés à un
    compte réel.
  - **Illustration de listes imbriquées (décorative)** — nouveau : deux
    petits panneaux superposés simulant des listes de suivi personnalisées
    (« Blue Chips », « Interested Coins »… puis « Binance », « Bybit »…) —
    maquette du produit, pas une liste interactive.
  - **Badge de conformité** — nouveau : deux petits encarts logo + texte en
    pied de page (« SOC 2 TYPE 1 », « Sensiba SOC 2 Type 2 ») attestant
    d'une certification tierce — première apparition de ce type de badge
    dans l'audit.
  - **Bandeau d'abonnement newsletter** — nouveau, bien que visible sans
    être nommé dans les captures des entrées Page de catégorie et Page
    API : bande pleine largeur juste avant le copyright, titre, phrase
    d'accroche, champ de saisie d'adresse e-mail et bouton « S'abonner »
    plein. Chrome de pied de page partagé, pas propre à cette page.
  - **Bouton plein**, **pied de page** (accordéon groupé sur mobile, déjà
    observé), **badges de téléchargement d'application** (Google Play/App
    Store, déjà vus en fonctionnalité sur l'accueil, ici accompagnés d'un
    troisième badge : un QR code cliquable, nouveau) : tous réutilisés ou
    complétés sans changer de famille.
- **Fonctionnalités** : inscription au Portefeuille (CTA principal),
  téléchargement de l'application mobile (lien, QR code), abonnement à la
  newsletter. Aucune fonctionnalité de gestion de portefeuille réelle
  (ajout d'actif, suivi de solde, alerte) n'est exposée à cette vue : ce
  sont des promesses illustrées, pas des contrôles.
- **Interactions** : aucune sondée par sélecteur sur cette page — voir
  Notes pour la raison (échec de bascule de thème avant l'étape de
  sondage). Rien à consigner ici au-delà de ce qui est déjà lu dans le
  HTML : le bouton d'inscription (`click->auth#openSignInModal` réutilisé
  pour l'onglet Connexion de la nav, pas propre à cette page) et le champ
  newsletter n'ont pas été activés.
- **Données requises** : cette page ne porte aucune donnée de marché
  chiffrée à elle — le nombre de monnaies couvertes mis en avant dans la
  liste de fonctionnalités et le nombre d'utilisateurs implicite du
  produit sont des arguments commerciaux, pas des mesures à reproduire.
  Rien à reporter en synthèse pour cette raison, comme pour les pages
  Apprendre et API.
- **Écart avec ZENKUU** : ZENKUU n'a pas de page marchande équivalente à
  `/en/portfolio` — son modèle de compte est différent dès la racine.
  `apps/web/app/[locale]/connexion/page.tsx` (lu le 2026-08-30) documente
  une connexion SANS mot de passe (code à six chiffres par courriel), et
  explique pourquoi cette page n'est délibérément ni indexée ni conçue
  pour capter du trafic de recherche (« aucun contenu à offrir à qui
  arrive d'un moteur »). `apps/web/app/[locale]/tableau-de-bord/page.tsx`
  (lu le 2026-08-30) est le plus proche équivalent fonctionnel : une vue
  de compte qui, pour un visiteur sans identifiant de session
  (`ownerId()` vide), rend directement un **état vide** documenté dans le
  fichier (« Aucun actif suivi pour le moment ») plutôt qu'un mur
  d'inscription illustré — le fichier note aussi qu'une page `/suivi`
  séparée a été « supprimée sur demande explicite » et absorbée dans le
  tableau de bord, exactement le mouvement inverse de CoinGecko qui garde
  une liste de suivi repliée dans son Portefeuille (déjà noté dans la
  liste des pages de ce document). L'écart de fond n'est donc pas un
  composant manquant mais un choix de produit : CoinGecko VEND l'usage
  d'un compte à un visiteur anonyme avant de le laisser entrer, ZENKUU
  montre l'état vide réel du compte tout de suite, sans mur intermédiaire.
  Aucun des composants strictement décoratifs de cette page (illustration
  de produit, camembert décoratif, maquette de listes imbriquées, badges
  de conformité) n'a, ni ne doit forcément avoir, d'équivalent ZENKUU.
- **Notes** : **outil en échec, consigné tel quel** — la bascule vers le
  thème sombre à 1440 px a échoué de façon reproductible (deux tentatives
  identiques, même erreur : « Bascule de thème sans effet… attendu «
  sombre », obtenu « clair » »), alors que le thème sombre fonctionne
  normalement à 360 et 768 px sur cette même page (captures
  `360-sombre.png` et `768-sombre.png` bien sombres, vérifiées à l'œil).
  L'échec porte donc sur la dernière navigation de la séquence (360 puis
  768 puis 1440, clair et sombre à chaque largeur), pas sur le mécanisme
  de thème lui-même. Candidat : une limitation de débit côté serveur
  après plusieurs navigations rapprochées dans la même session — cohérent
  avec un `curl -I` sur ce même domaine ayant renvoyé 429 pendant cette
  tâche — hypothèse non vérifiée (aucun code de statut HTTP inspecté par
  le script au moment de l'échec), donc non retenue comme explication
  établie. Conséquence : **aucun fichier `mesures.json` n'a été produit**
  pour cette page (l'écriture n'intervient qu'après les six passes) —
  seules les cinq captures obtenues (`360-clair`, `360-sombre`,
  `768-clair`, `768-sombre`, `1440-clair`) existent dans
  `docs/references/coingecko/portefeuille/`. Aucune valeur de
  `getComputedStyle` n'est donc disponible pour cette entrée ; les
  composants ci-dessus sont décrits depuis les captures et depuis le HTML
  brut (`curl -L`, confirmé 200), jamais inventés. Bascule de thème
  validée à 360 et 768 px (captures claire/sombre différentes octet pour
  octet) ; non confirmée à 1440 px pour la raison ci-dessus — à
  réauditer si ce gabarit doit être repris avec des mesures complètes.
  Aucun blocage Cloudflare rencontré. Aucun texte de CoinGecko n'est
  recopié au-delà des libellés strictement nécessaires à l'identification
  d'un composant.

### Gagnants et perdants — `/en/crypto-gainers-losers`

- **Date du relevé** : 2026-08-30
- **Rôle** : palmarès des plus fortes hausses et des plus fortes baisses sur une période
  choisie. Deux tableaux frères sur une seule page, jamais l'un sans l'autre — la page
  répond à « qu'est-ce qui bouge », pas à « comment va le marché ».
- **Priorité** : phase 2
- **État** : audité
- **Composants** :
  - **Deux sections titrées** — « Grands gagnants » et « Grands perdants », chacune
    précédée d'un émoji dans le texte même du `h2` (fusée, gyrophare). L'émoji fait partie
    du titre, ce n'est pas une icône séparée.
  - **Sélecteur de période** — déclencheur affichant la période active (« 24 heures »).
  - **Sélecteur d'univers** — déclencheur restreignant l'échantillon (« Principal 1000 »).
    C'est lui qui rend le palmarès lisible : sans borne, les plus fortes variations sont
    toujours des jetons minuscules.
  - **Tableau de palmarès** ×2 — 30 lignes chacun. Colonnes : suivi (étoile), rang, nom,
    cours, volume, variation sur la période, mini-graphique.
  - Chrome commun au site : navigation, recherche, pied de page, bouton d'action.
- **Fonctionnalités** : choix de la période ; choix de l'univers ; tri ; mise en suivi
  d'une ligne ; navigation vers la fiche d'un actif.
- **Interactions** : le survol d'une ligne pose `rgb(248, 250, 252)` en clair et
  `rgb(27, 35, 45)` en sombre — les mêmes valeurs que l'accueil. **Un seul en-tête porte
  `aria-sort`** par tableau alors que plusieurs colonnes semblent triables : le tri n'est
  pas exposé par cet attribut sur cette page.
- **Données requises** : variations par période sur un univers borné, et le rang de
  capitalisation qui définit cette borne.
- **Écart avec ZENKUU** : `/classements` et `/classements/[type]` couvrent le même besoin
  avec quatre palmarès au lieu de deux (hausses, baisses, volumes, rotation) et un
  sélecteur de période. **Ce n'est pas un manque** : ZENKUU en offre davantage. Ce qui
  manque est le sélecteur d'univers — sans lui, un palmarès de hausses remonte du bruit.
- **Notes** : les deux tableaux partagent exactement la même structure de colonnes ; un
  seul composant peut les rendre tous les deux.

### Nouvelles cryptomonnaies — `/en/new-cryptocurrencies`

- **Date du relevé** : 2026-08-30
- **Rôle** : liste des actifs récemment ajoutés au catalogue, du plus récent au plus
  ancien. La page répond à « qu'est-ce qui vient d'apparaître » ; son tri par défaut est
  chronologique, pas par capitalisation.
- **Priorité** : phase 2
- **État** : audité
- **Composants** :
  - **Tableau des nouvelles cotations** — 50 lignes. Colonnes : suivi, rang, monnaie,
    (colonne sans en-tête), cours, **chaîne**, 1 h, 24 h, volume 24 h, valorisation
    entièrement diluée, **dernier ajout**, mini-graphique.
  - **Pagination** — la liste dépasse une page.
  - Chrome commun au site.
- **Fonctionnalités** : tri ; pagination ; mise en suivi ; navigation vers la fiche.
- **Interactions** : survol de ligne identique à l'accueil. Un seul en-tête porte
  `aria-sort`.
- **Données requises** : date d'ajout au catalogue et chaîne de déploiement. **La date
  d'ajout n'est pas une donnée de marché** : elle appartient au catalogue de l'opérateur.
  Un site qui n'a pas son propre catalogue ne peut pas la produire — il la reprend de sa
  source, ou il n'a pas cette page.
- **Écart avec ZENKUU** : `/nouvelles-cotations` couvre le rôle. Deux colonnes n'ont pas
  d'équivalent : la chaîne de déploiement et la valorisation entièrement diluée.
- **Notes** : la colonne sans en-tête entre « Monnaie » et « Cours » ne porte aucun
  libellé accessible.

### Chaînes — `/en/chains`

- **Date du relevé** : 2026-08-30
- **Rôle** : classement des blockchains par valeur totale verrouillée. Le titre le dit
  explicitement — l'axe de tri par défaut n'est ni la capitalisation ni le volume, mais la
  TVL.
- **Priorité** : phase 2
- **État** : audité
- **Composants** :
  - **Tableau des chaînes** — 100 lignes. Colonnes : rang, chaîne, **grands gagnants**,
    24 h, 7 j, 30 j, volume 24 h, TVL, prédominance, nombre de monnaies, courbe 7 jours.
  - **Groupe d'onglets de filtre** — « Tous », « Principaux éléments », « Catégories »,
    « Toutes les chaînes », plus des puces thématiques d'actualité.
  - **Pagination**.
  - Chrome commun au site.
- **Fonctionnalités** : filtrage par onglet ; tri ; pagination ; navigation vers une
  chaîne.
- **Interactions** : survol de ligne `rgb(248, 250, 252)` / `rgb(27, 35, 45)` ; survol
  d'un onglet non sélectionné `rgb(241, 245, 249)` — les mêmes valeurs que l'accueil.
- **Données requises** : TVL par chaîne, prédominance, nombre d'actifs par chaîne. **La
  TVL n'est pas dérivable des données de cotation** : elle demande une source de données
  de protocole.
- **Écart avec ZENKUU** : `/categories/ecosystemes` s'en approche mais classe des
  écosystèmes par capitalisation, pas des chaînes par TVL. La colonne « grands gagnants »,
  qui met en avant le meilleur actif de chaque chaîne, n'a pas d'équivalent.
- **Notes** : ⚠️ le relevé de la troisième colonne rapporte `rgb(0, 0, 238)` et un texte
  vide. Ce n'est PAS le défaut corrigé le 2026-08-30 : le lien de cette colonne ne contient
  aucun nœud texte — c'est un logo. L'outil retombe donc sur l'élément visé et n'annonce
  aucun `porteurTexte`, ce qui est le comportement voulu. C'est le sélecteur qui visait la
  mauvaise colonne ; la couleur relevée n'a aucun sens et ne doit pas être reprise.

### Convertisseur — `/en/converter`

- **Date du relevé** : 2026-08-30
- **Rôle** : convertir un montant d'un actif vers une devise. La page affiche le résultat
  dans son propre titre de section (« 1,000000 BTC = … »), pas dans un encadré séparé.
- **Priorité** : phase 2
- **État** : audité
- **Composants** :
  - **Champ de montant** — `input[type=number]`, classe `gecko-input`, **52 px de haut**,
    corps 14 px. C'est le champ le plus haut relevé sur le site.
  - **Résultat en titre** — la conversion s'écrit dans un `h2`.
  - **Graphique** — courbe historique de la paire.
  - **Paires populaires** — section de raccourcis vers des conversions fréquentes.
  - **Cours dans les principales devises** — section listant le même actif dans plusieurs
    devises.
  - **Champ d'abonnement e-mail** — `input[type=email]`, 40 px, avec bouton « S'abonner ».
    Élément de collecte, sans rapport avec la conversion.
  - Chrome commun au site. **Aucun tableau sur cette page.**
- **Fonctionnalités** : saisie d'un montant ; choix des deux termes ; lecture du
  graphique ; accès aux paires populaires.
- **Interactions** : le champ et le bouton d'action sont sondés ; aucun delta de survol
  n'est relevé sur le champ.
- **Données requises** : cours instantané de la paire et son historique.
- **Écart avec ZENKUU** : `/convertisseur` couvre le rôle. Les sections « paires
  populaires » et « cours dans les principales devises » n'ont pas d'équivalent — ce sont
  des raccourcis de navigation, pas des données neuves.
- **Notes** : porter le résultat dans un `h2` est un choix inhabituel — le nombre le plus
  important de la page est un titre, pas une valeur encadrée.

### Comparateur — `/en/compare-cryptocurrencies`

- **Date du relevé** : 2026-08-30
- **Rôle** : calculer le cours qu'aurait un actif A s'il portait la capitalisation d'un
  actif B. Ce n'est pas une comparaison de fiches côte à côte : c'est une seule opération
  hypothétique, à deux termes.
- **Priorité** : phase 2
- **État** : audité
- **Composants** :
  - **Deux sélecteurs d'actif** — « Sélectionner A » et « Sélectionner B ».
  - **Bascule de base de calcul** — « Capitalisation boursière » ou « Évaluation après
    dilution ». Elle change le sens du résultat, pas sa présentation.
  - **Phrase de résultat** — énoncé en toutes lettres du calcul demandé.
  - **Comparaisons populaires** — raccourcis vers des couples fréquents.
  - Chrome commun au site. **Aucun tableau, aucun graphique.**
- **Fonctionnalités** : choix des deux termes ; choix de la base ; accès aux comparaisons
  populaires.
- **Interactions** : les puces de filtre et les champs sont sondés.
- **Données requises** : capitalisation et valorisation entièrement diluée des deux
  actifs, et l'offre en circulation de A pour reconstituer un cours.
- **Écart avec ZENKUU** : `/comparateur` existe mais répond à une autre question — il met
  deux fiches en regard. **Le calcul hypothétique de CoinGecko n'a pas d'équivalent.**
  ⚠️ Ce calcul frôle la limite du §7 : « le cours qu'aurait A avec la capitalisation de B »
  se lit facilement comme un objectif de cours. Il reste descriptif — un rapport entre deux
  grandeurs mesurées, sans projection dans le temps — mais sa reprise demanderait une
  formulation qui n'induise aucune anticipation.
- **Notes** : ⚠️ le premier `h1` de la page est « Sélectionner B », le libellé d'un
  contrôle. La page n'a pas de titre décrivant son rôle.

### Points forts — `/en/highlights`

- **Date du relevé** : 2026-08-30
- **Rôle** : tableau de bord d'entrée vers les autres palmarès. La page ne présente pas de
  données en profondeur : elle donne un aperçu de chaque classement et renvoie vers lui.
- **Priorité** : phase 2
- **État** : audité
- **Composants** :
  - **Grille de cartes** — six cartes de `244 × 101 px`, dans une grille à colonnes de
    244 px. Chaque carte est un lien entier vers un palmarès.
  - **Titre de carte** — 18 px, graisse 700, tronqué (`tw-truncate`) : les titres longs
    sont coupés par conception, pas par accident.
  - **Groupe d'onglets de filtre** — 21 puces relevées, dont 4 dans un groupe
    sélectionnable.
  - Chrome commun au site. **Aucun tableau.**
- **Fonctionnalités** : navigation vers chaque palmarès ; filtrage par onglet.
- **Interactions** : survol d'un onglet non sélectionné `rgb(241, 245, 249)`. Le survol des
  cartes n'a pas pu être relevé — elles sont hors du viewport au moment du sondage.
- **Données requises** : un extrait de chaque palmarès qu'elle annonce ; aucune donnée qui
  lui soit propre.
- **Écart avec ZENKUU** : `/classements` remplit ce rôle d'aiguillage tout en montrant les
  palmarès eux-mêmes, pas seulement leurs vignettes. **Ce n'est pas un manque** : une page
  qui ne fait qu'aiguiller ajoute un clic entre le lecteur et la donnée.
- **Notes** : c'est sur cette page que le relevé a établi les deux faits qui ont corrigé la
  palette — l'onglet sélectionné est VERT (`rgb(53, 175, 0)` en clair, `rgb(128, 224, 56)`
  en sombre) et le texte du bouton d'action est BLANC sur le vert, pas noir.

### Tendances — `/en/highlights/trending-crypto`

- **Date du relevé** : 2026-08-31
- **Rôle** : les quinze actifs les plus consultés du moment. La page répond à « qu'est-ce
  que les autres regardent », pas à « qu'est-ce qui monte » — c'est une mesure d'attention,
  pas de marché.
- **Priorité** : phase 2
- **État** : audité
- **Composants** : tableau de quinze lignes — rang, monnaie, cours, 1 h, 24 h, 7 j, volume
  24 h, capitalisation, courbe 7 jours ; groupe d'onglets de filtre ; chrome commun.
- **Fonctionnalités** : filtrage par onglet ; tri ; navigation vers la fiche.
- **Interactions** : survol de ligne et d'onglet aux mêmes valeurs que l'accueil.
- **Données requises** : un compteur de consultations par actif. **ZENKUU ne le produit
  pas** : c'est une donnée d'audience, propre à l'opérateur, qu'aucune source de marché ne
  publie. Un « tendances » bâti sur la variation ou le volume mesurerait autre chose et le
  dirait mal.
- **Écart avec ZENKUU** : `/crypto?vue=tendance` existe mais s'appuie sur des critères de
  marché. **L'écart est de NATURE, pas de degré** — et il n'est pas comblable sans
  audience propre.
- **Notes** : quinze lignes seulement, là où leurs autres classements en portent cent.

### Écart au sommet — `/en/highlights/all-time-high-crypto`

- **Date du relevé** : 2026-08-31
- **Rôle** : montrer, pour les cent premières capitalisations, ce qui les sépare de leur
  plus haut historique.
- **Priorité** : phase 2
- **État** : audité
- **Composants** : tableau de cent lignes — rang, monnaie, cours, cours du sommet, écart en
  %, date du sommet ; chrome commun.
- **Fonctionnalités** : tri ; navigation vers la fiche.
- **Interactions** : identiques aux autres pages de liste.
- **Données requises** : `ath` et `athDate`, tous deux déjà servis par la source de ZENKUU.
- **Écart avec ZENKUU** : comblé le 2026-08-31 — `/classements/sommet`.
  ⚠️ **Le tri se fait par CAPITALISATION, pas par écart.** Trié par écart, le classement
  remonte des fonds monétaires tokenisés dont le cours ne bouge pas et qui sont donc
  toujours à leur sommet. L'écart est l'information de la page, pas son ordre.
- **Notes** : leur tableau porte aussi la DATE du sommet, ce que `/classements/sommet`
  n'affiche pas encore — `athDate` est disponible.

### Carte thermique — `/en/charts/crypto-heatmap`

- **Date du relevé** : 2026-08-31
- **Rôle** : le marché en une figure, chaque actif en tuile dimensionnée par sa
  capitalisation et teintée par sa variation.
- **Priorité** : phase 2
- **État** : audité
- **Composants** : figure plein cadre ; groupe d'onglets de filtre ; chrome commun.
  **Aucun tableau** — deux des sept sélecteurs de la campagne n'ont donc rien trouvé, et
  c'est le comportement attendu.
- **Fonctionnalités** : filtrage ; survol d'une tuile.
- **Interactions** : les onglets se survolent comme ailleurs.
- **Données requises** : capitalisation et variation par actif — ZENKUU les a.
- **Écart avec ZENKUU** : `/heatmap` couvre le rôle.
- **Notes** : `h1` à 24px/700 comme partout, ce qui confirme le cran unique jusque sur les
  pages de figure.

### Prédominance du bitcoin — `/en/charts/bitcoin-dominance`

- **Date du relevé** : 2026-08-31
- **Rôle** : la part du bitcoin dans la capitalisation totale, dans le temps.
- **Priorité** : phase 2
- **État** : audité
- **Composants** : graphique de série temporelle ; sélecteur de période ; chrome commun.
  **Aucun tableau.**
- **Fonctionnalités** : choix de la fenêtre ; lecture au survol.
- **Données requises** : historique de la dominance. ⚠️ **Aucune source gratuite ne le
  publie** — ZENKUU construit sa série à partir de ses propres relevés (voir
  `packages/data/src/market-cap-series.ts`), ce qui la rend courte au démarrage.
- **Interactions** : le sélecteur de période se survole ; le graphique affiche la valeur
  au survol.
- **Écart avec ZENKUU** : `/graphiques/dominance` couvre le rôle, avec cette réserve de
  profondeur d'historique.
- **Notes** : deux des sept sélecteurs de la campagne n'ont rien trouvé — cette page n'a
  pas de tableau, c'est le comportement attendu.

### Trésoreries — `/en/treasuries`

- **Date du relevé** : 2026-08-31
- **Rôle** : les entités — sociétés cotées, États, fonds — qui détiennent des
  cryptomonnaies à leur bilan, avec le coût d'acquisition et la valeur du jour.
- **Priorité** : phase 2
- **État** : audité
- **Composants** : tableau de 244 lignes — rang, entité, type, trois principales
  détentions, activité récente, coût total, valeur du jour, mNAV ; chrome commun.
- **Fonctionnalités** : tri ; navigation vers l'entité.
- **Données requises** : déclarations de détention par entité, leur date et leur coût.
  ⚠️ **Ce n'est pas une donnée de marché** : elle vient de dépôts réglementaires et
  d'annonces d'entreprises, agrégés à la main. Aucune source de cotation ne la produit.
- **Interactions** : survol de ligne aux valeurs communes à tout leur site.
- **Écart avec ZENKUU** : `/graphiques/tresoreries` existe et vient d'entrer dans la
  navigation. Le mNAV — valeur de marché rapportée à l'actif net — n'a pas d'équivalent.
- **Notes** : 244 lignes, le plus long tableau relevé sur leur site. Il n'est pas paginé.

### Actions tokenisées — `/en/stocks`

- **Date du relevé** : 2026-08-31
- **Rôle** : ⚠️ **CE NE SONT PAS DES ACTIONS COTÉES.** Le titre le dit — « Top Tokenized
  Stocks by Market Cap » — et les colonnes le confirment : cours de l'action ET cours du
  jeton, écart entre les deux, capitalisation tokenisée. La page mesure la représentation
  ON-CHAIN d'une action, pas l'action elle-même.
- **Priorité** : phase 2
- **État** : audité
- **Composants** : tableau de cent lignes — rang, nom, cours, cours tokenisé, 24 h, 7 j,
  30 j, écart de cours, capitalisation, capitalisation tokenisée, volume tokenisé 24 h,
  volume et intérêt ouvert des perpétuels, courbe 7 jours ; chrome commun.
- **Fonctionnalités** : tri ; navigation vers la fiche du jeton.
- **Interactions** : survol de ligne et d'onglet aux valeurs communes à tout leur site.
- **Données requises** : cours du jeton ET du sous-jacent, pour en tirer l'écart.
- **Écart avec ZENKUU** : `/actions` liste de VRAIES valeurs boursières, via Yahoo. Les
  deux pages portent le même mot et décrivent deux choses différentes. **Ce n'est pas un
  manque de ZENKUU** : c'est un sujet distinct, qui demanderait une source de jetons
  adossés à des actions.
- **Notes** : `table.sortable tbody tr:first-child` mesure 14px/600 ici contre 14px/400
  sur douze autres pages — la première cellule de cette page est un nom, pas un chiffre.

### ETF tokenisés — `/en/etfs`

- **Date du relevé** : 2026-08-31
- **Rôle** : le pendant de `/en/stocks` pour les fonds indiciels — même structure, avec
  l'encours (AUM) à la place de la capitalisation.
- **Priorité** : phase 2
- **État** : audité
- **Composants** : mêmes colonnes que les actions tokenisées, AUM substitué à la
  capitalisation ; chrome commun.
- **Fonctionnalités** : tri ; navigation vers la fiche du jeton.
- **Interactions** : survol de ligne et d'onglet aux valeurs communes à tout leur site.
- **Données requises** : cours du jeton, encours du fonds sous-jacent, et leur écart.
- **Écart avec ZENKUU** : même remarque que pour les actions — `/etf` liste de vrais fonds
  indiciels. Sujet distinct, pas un manque.
- **Notes** : l'AUM remplace la capitalisation — un fonds n'a pas de capitalisation propre,
  il a un encours. La substitution est juste, et elle distingue cette page de sa jumelle.

### Matières premières tokenisées — `/en/commodities`

- **Date du relevé** : 2026-08-31
- **Rôle** : troisième page du même gabarit, pour l'or, l'argent et les autres matières
  premières représentées par un jeton.
- **Priorité** : phase 2
- **État** : audité
- **Composants** : même structure que les deux précédentes ; chrome commun.
- **Fonctionnalités** : tri ; navigation vers la fiche du jeton.
- **Interactions** : survol de ligne et d'onglet aux valeurs communes à tout leur site.
- **Données requises** : cours du jeton ET du sous-jacent, pour en tirer l'écart — comme
  les deux pages précédentes.
- **Écart avec ZENKUU** : `/matieres-premieres` liste des cours de matières premières.
  Même distinction que ci-dessus.
- **Notes** : les trois pages « RWA » partagent un gabarit unique, aux colonnes près. Une
  seule implémentation les couvrirait toutes les trois — mais aucune n'est faisable sans
  source de jetons adossés.

### Les plus consultées — `/en/highlights/most-viewed-crypto`

- **Date du relevé** : 2026-08-31
- **Rôle** : les quinze actifs dont les fiches ont été le plus ouvertes. Comme
  « Tendances », c'est une mesure d'ATTENTION, pas de marché.
- **Priorité** : phase 2
- **État** : audité
- **Composants** : tableau de quinze lignes au gabarit commun — rang, monnaie, cours,
  1 h, 24 h, 7 j, volume 24 h, capitalisation, courbe 7 jours ; chrome commun.
- **Fonctionnalités** : tri ; navigation vers la fiche.
- **Interactions** : survol de ligne et d'onglet aux valeurs communes à tout leur site.
- **Données requises** : un compteur de consultations par actif. **ZENKUU ne le produit
  pas** — même obstacle que « Tendances », et il n'est pas contournable sans audience
  propre.
- **Écart avec ZENKUU** : aucun équivalent, et il ne peut pas y en avoir sans cette
  donnée. **Ce n'est pas un manque à combler** : c'est une page qui décrit le trafic de
  l'opérateur, pas le marché.
- **Notes** : les trois pages « highlights » relevées ce jour partagent EXACTEMENT le
  gabarit de colonnes de l'accueil. Un seul composant les rend toutes.

### Volume élevé — `/en/highlights/high-volume`

- **Date du relevé** : 2026-08-31
- **Rôle** : les cent premières cryptomonnaies par volume échangé sur 24 heures — ce qui
  s'échange le plus, indépendamment du sens du cours.
- **Priorité** : phase 2
- **État** : audité
- **Composants** : tableau de cinquante lignes rendues, au gabarit commun ; chrome commun.
- **Fonctionnalités** : tri ; pagination ; navigation vers la fiche.
- **Interactions** : identiques aux autres pages de liste.
- **Données requises** : `volume24h`, déjà servi.
- **Écart avec ZENKUU** : `/classements/volumes` couvre exactement ce rôle. **Aucun
  écart** — c'est l'un des rares cas où les deux pages font la même chose de la même
  façon.
- **Notes** : leur titre annonce cent lignes, la page en rend cinquante et pagine.

### Déblocages de jetons — `/en/highlights/incoming-token-unlocks`

- **Date du relevé** : 2026-08-31
- **Rôle** : les jetons dont une tranche d'offre va être libérée, avec la part déjà en
  circulation et la date de la prochaine libération.
- **Priorité** : phase 2
- **État** : audité
- **Composants** : tableau de cinquante lignes — rang, monnaie, cours, 1 h, 24 h, 7 j,
  capitalisation, **part libérée**, **prochain déblocage**, **date du prochain
  déblocage** ; chrome commun.
- **Fonctionnalités** : tri ; pagination ; navigation vers la fiche.
- **Interactions** : identiques aux autres pages de liste.
- **Données requises** : le CALENDRIER de vesting de chaque jeton. ⚠️ **Aucune source de
  cotation ne le publie** : il vient des documents de l'émetteur, agrégés à la main.
- **Écart avec ZENKUU** : aucun équivalent, et la donnée manque. À noter dans la synthèse
  des données sans source gratuite.
- **Notes** : c'est la seule des trois pages « highlights » qui s'écarte du gabarit
  commun — elle remplace volume et courbe par ses trois colonnes de calendrier.

### Places décentralisées — `/en/exchanges/decentralized`

- **Date du relevé** : 2026-08-31
- **Rôle** : classement des places d'échange décentralisées par volume 24 heures.
- **Priorité** : phase 2
- **État** : audité
- **Composants** : tableau de cent lignes — rang, place, volume 24 h, part de marché,
  nombre de jetons et de paires, paire la plus échangée ; chrome commun.
- **Fonctionnalités** : tri ; navigation vers la place.
- **Interactions** : identiques aux autres pages de liste.
- **Données requises** : volume et paires par place décentralisée.
- **Écart avec ZENKUU** : `/places` liste les places CENTRALISÉES. Il n'existe pas
  d'équivalent décentralisé — `/pool/[network]/[address]` décrit UNE réserve, pas un
  classement de plateformes.
- **Notes** : la colonne « paire la plus échangée » n'a d'équivalent nulle part sur
  ZENKUU.

### Places de dérivés — `/en/exchanges/derivatives`

- **Date du relevé** : 2026-08-31
- **Rôle** : classement des places de dérivés par intérêt ouvert.
- **Priorité** : phase 2
- **État** : audité
- **Composants** : tableau — rang, place, mode de règlement, intérêt ouvert 24 h, volume
  24 h ; chrome commun.
- **Fonctionnalités** : tri ; navigation vers la place.
- **Interactions** : identiques aux autres pages de liste.
- **Données requises** : intérêt ouvert par place, et mode de règlement.
- **Écart avec ZENKUU** : `/perpetuels` couvre ce rôle. Le tri par intérêt ouvert plutôt
  que par volume est leur choix ; le mode de règlement n'a pas d'équivalent.
- **Notes** : trier par intérêt ouvert et non par volume n'est pas un détail — l'intérêt
  ouvert mesure les positions ENCORE OUVERTES, le volume ce qui a été échangé. Une place
  peut afficher un gros volume avec peu de positions tenues.

### Page de chaîne — `/en/chains/ethereum`

- **Date du relevé** : 2026-08-31
- **Rôle** : tout ce qui vit sur une chaîne donnée, en une page : ses jetons, ses
  collections NFT, ses places décentralisées, et les articles qui en parlent.
- **Priorité** : phase 2
- **État** : audité
- **Composants** : tableau de dix jetons au gabarit de l'accueil (rang → courbe 7 jours) ;
  **quatre sections empilées** — « Ethereum Coins », « Ethereum NFTs », « Ethereum
  Decentralized Exchanges », « Articles related to Ethereum » ; chrome commun.
- **Fonctionnalités** : tri du tableau ; navigation vers chaque objet listé.
- **Interactions** : identiques aux autres pages de liste.
- **Données requises** : l'appartenance de chaque objet à une chaîne — jetons, NFT, places.
- **Écart avec ZENKUU** : `/categories/ecosystemes` liste les écosystèmes mais n'ouvre pas
  de page PAR chaîne. Les sections NFT et places décentralisées n'ont pas d'équivalent.
- **Notes** : dix lignes seulement dans le tableau de jetons — c'est un aperçu qui renvoie
  ailleurs, pas un classement.

### NFT — `/en/nft`

- **Date du relevé** : 2026-08-31
- **Rôle** : classement des collections NFT par capitalisation, avec leur prix plancher.
- **Priorité** : phase 2
- **État** : audité
- **Composants** : tableau de cent lignes — rang, collection, **prix plancher**, 24 h,
  7 j, 30 j, courbe 7 jours, capitalisation, volume 24 h, **ventes 24 h** ; quatre
  sections de FAQ en bas de page ; chrome commun.
- **Fonctionnalités** : tri ; navigation vers la collection.
- **Interactions** : identiques aux autres pages de liste.
- **Données requises** : prix plancher, ventes et capitalisation par collection. ⚠️ Ce
  sont des données de marché NFT, distinctes des cotations de jetons.
- **Écart avec ZENKUU** : `/graphiques/nft` existe et vient d'entrer dans la navigation.
  Le nombre de VENTES sur 24 heures n'a pas d'équivalent.
- **Notes** : la courbe 7 jours est placée AVANT la capitalisation ici, alors qu'elle
  ferme la ligne sur l'accueil. C'est la seule page relevée où cet ordre diffère.

### Actifs du monde réel — `/en/rwa`

- **Date du relevé** : 2026-08-31
- **Rôle** : la page mère des trois pages tokenisées (actions, ETF, matières premières) —
  même gabarit de colonnes, tous types confondus.
- **Priorité** : phase 2
- **État** : audité
- **Composants** : tableau — rang, nom, cours, cours tokenisé, 24 h, 7 j, 30 j, écart de
  cours, capitalisation, capitalisation tokenisée, volume tokenisé, volume et intérêt
  ouvert des perpétuels ; chrome commun.
- **Fonctionnalités** : tri ; navigation vers la fiche du jeton.
- **Interactions** : identiques aux autres pages de liste.
- **Données requises** : cours du jeton ET du sous-jacent — même obstacle que ses trois
  pages filles.
- **Écart avec ZENKUU** : `/graphiques/actifs-reels` porte ce nom mais décrit autre chose.
  Voir l'entrée `/en/stocks` pour la distinction complète.
- **Notes** : les quatre pages RWA relevées partagent un gabarit unique. Une seule
  implémentation les couvrirait — mais aucune n'est faisable sans source de jetons
  adossés.

### Glossaire — `/en/glossary`

- **Date du relevé** : 2026-08-31
- **Rôle** : les définitions du vocabulaire crypto, rangées alphabétiquement.
- **Priorité** : phase 3
- **État** : audité
- **Composants** : index de lettres ; liste de définitions ; chrome commun. **Aucun
  tableau** — trois des sept sélecteurs de la campagne n'ont donc rien trouvé.
- **Fonctionnalités** : navigation par lettre ; renvoi vers les fiches d'apprentissage.
- **Interactions** : les liens d'index défilent vers leur section.
- **Données requises** : les définitions elles-mêmes, écrites à la main.
- **Écart avec ZENKUU** : comblé le 2026-08-31 — `/glossaire`, 32 termes, 19 lettres.
- **Notes** : ⚠️ **LEUR PAGE N'A AUCUN `h1`.** Son titre « Glossary » est un `h3`. C'est un
  défaut d'accessibilité — un lecteur d'écran qui liste les titres n'y trouve pas le sujet
  de la page — et il n'est PAS reproduit : `/glossaire` porte un `h1`. Premier écart où la
  fidélité cède, et il ne coûte rien visuellement.

### Méthodologie — `/en/methodology`

- **Date du relevé** : 2026-08-31
- **Rôle** : comment les chiffres du site sont calculés — capitalisation, volume, note de
  confiance des places.
- **Priorité** : phase 3
- **État** : audité
- **Composants** : page de texte structurée en sections ; chrome commun. **Aucun tableau.**
- **Fonctionnalités** : lecture ; navigation interne.
- **Interactions** : aucune au-delà du chrome.
- **Données requises** : aucune — c'est du texte éditorial.
- **Écart avec ZENKUU** : `/a-propos` et `/pourquoi-zenkuu` couvrent une partie de ce rôle.
  Aucune page ne décrit le CALCUL des grandeurs affichées.
- **Notes** : ⚠️ **SON `h1` MESURE 30 px, pas 24.** C'est la SEULE exception relevée sur
  33 pages. Elle ne remet pas en cause le cran unique — une page éditoriale isolée n'est
  pas une règle — mais elle est consignée pour que personne ne la « corrige » en croyant
  trouver une incohérence de mesure.

## Synthèse — données sans source gratuite

Rassemblée au fil de l'audit à partir du champ « Données requises » de chaque entrée.
Posée en question à l'exploitant à la fin du sous-projet A.

| Donnée | Pages concernées | Source CoinGecko | Équivalent gratuit |
|---|---|---|---|
| Prix du gaz Ethereum (Gwei) | Accueil | Etherscan (« Données par Etherscan ») | Aucun parmi les sources listées (CoinGecko, Binance, Frankfurter, Yahoo Finance, CoinPaprika, alternative.me, DefiLlama, RSS) |
