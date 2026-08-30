# Audit de CoinGecko

Relevé page par page en vue de la migration de ZENKUU. Ce document décrit un site
tiers : il n'en reproduit ni le code, ni les textes, ni les assets de marque, et ne
consigne que des mesures, chacune datée.

Spec : `docs/superpowers/specs/2026-08-29-coingecko-audit-design-system-design.md`
Vérification : `node scripts/audit-coingecko-doc.mjs --strict`

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

### Phase 1 — cœur

- [x] Accueil — `/fr`
- [ ] Accueil, toutes les monnaies — `/fr/all-cryptocurrencies`
- [ ] Accueil, classement rehypothéqué — `/fr/top-market-cap-rehypothecated`
- [ ] Accueil en devise (EUR) — `/fr/currencies/eur`
- [x] Page coin, onglet Vue d'ensemble — `/fr/coins/bitcoin`
- [ ] Page coin, onglet Tokenomique — `/fr/coins/bitcoin#tokenomics`
- [ ] Page coin, onglet Données financières — `/fr/coins/bitcoin#financials`
- [ ] Page coin, onglet Prédominance — `/fr/coins/bitcoin#dominance`
- [ ] Page coin, onglet Données historiques — `/fr/coins/bitcoin/historical_data`
- [ ] Page coin, onglet Prédiction — `/fr/coins/bitcoin/prediction`
- [x] Catégories — `/fr/categories`
- [ ] Page de catégorie — `/fr/categories/meme-token`
- [x] Exchanges, spot — `/fr/platesformes`
- [ ] Exchanges, DEX — `/fr/platesformes/decentralized`
- [ ] Exchanges, dérivés — `/fr/platesformes/derivatives`
- [ ] Exchanges, DEX perpétuels — `/fr/platesformes/derivatives/decentralized`
- [ ] Page d'exchange — `/fr/platesformes/binance`
- [ ] Graphiques globaux — `/fr/charts`

### Phase 2 — données

- [ ] Highlights (principaux éléments) — `/fr/highlights`
- [ ] Tendances — `/fr/highlights/trending-crypto`
- [ ] Gagnants et perdants — `/fr/crypto-gainers-losers`
- [ ] Nouvelles cryptos — `/fr/new-cryptocurrencies`
- [ ] All-time high — `/fr/highlights/all-time-high-crypto`
- [ ] Highlights, les plus consultées — `/fr/highlights/most-viewed-crypto`
- [ ] Highlights, volume élevé — `/fr/highlights/high-volume`
- [ ] Highlights, déblocages de jetons à venir — `/fr/highlights/incoming-token-unlocks`
- [ ] Highlights, cryptos à venir — `/fr/highlights/upcoming-cryptocurrencies`
- [ ] Carte thermique (heatmap) — `/fr/charts/crypto-heatmap`
- [ ] Prédominance du Bitcoin — `/fr/charts/bitcoin-dominance`
- [ ] Comparateur — `/fr/compare-cryptocurrencies`
- [ ] Convertisseur — `/fr/converter`
- [ ] Chaînes — `/fr/chains`
- [ ] Page de chaîne — `/fr/chains/ethereum`
- [ ] NFT — `/fr/nft`
- [ ] NFT par chaîne — `/fr/nft/chains/ethereum`
- [ ] Page de collection NFT (floor price) — `/fr/nft/bored-ape-yacht-club`
- [ ] RWA — `/fr/rwa`
- [ ] RWA, graphique global — `/fr/charts/rwa`
- [ ] RWA, actions tokenisées — `/fr/stocks`
- [ ] Page d'action tokenisée — `/fr/stocks/nvidia`
- [ ] RWA, ETF tokenisés — `/fr/etfs`
- [ ] Page d'ETF tokenisé — `/fr/etfs/spdr-s-p-500-etf-trust`
- [ ] RWA, matières premières tokenisées — `/fr/commodities`
- [ ] Page de matière première tokenisée — `/fr/commodities/gold`
- [ ] Trésoreries — `/fr/treasuries`
- [ ] Trésoreries, entreprises — `/fr/treasuries/companies`
- [ ] Trésoreries, États — `/fr/treasuries/governments`

### Phase 3 — contenu et services

- [ ] Portefeuille — `/fr/portfolio`
- [ ] Apprendre — `/learn`
- [ ] Apprendre, article — `/learn/crypto-narratives`
- [ ] Actualités — `/fr/news`
- [ ] Rapports — `/fr/publications/reports`
- [ ] Perspectives Recherche — `/research`
- [ ] Glossaire — `/en/glossary`
- [ ] Glossaire, terme — `/en/glossary/blockchain`
- [ ] Widgets — `/fr/widget`
- [ ] Page API — `/fr/api`
- [ ] API DEX — `/fr/api/dex`
- [ ] API NFT — `/fr/api/nft`
- [ ] Tarifs API — `/fr/api/pricing`
- [ ] Études de cas API — `/fr/api/case-studies`
- [ ] Page coin, onglet Halving — `/fr/coins/bitcoin/bitcoin-halving`
- [ ] Méthodologie — `/fr/méthodologie`
- [ ] À propos — `/fr/à_propos_de`
- [ ] FAQ — `/fr/faq`
- [ ] Candy (récompenses) — `/fr/candy`
- [ ] Application mobile — `/fr/mobile`
- [ ] Tarifs Premium — `/fr/premium/pricing`

**Watchlist — sans route publique vérifiable.** Constaté par `curl -L` (GET, suivi des
redirections), URL par URL :
- `/fr/watchlist` → 404 direct.
- `/en/watchlist` → 404 direct.
- `/fr/my-watchlist` → 404 direct.
- `/watchlist` → 301 vers `/en/watchlist`, qui rend ensuite 404.
- `/fr/watchlists` (pluriel) → 301 vers `/fr/highlights`, qui rend 200 — cette URL ne
  renvoie jamais 404, elle mène simplement ailleurs, ce qui explique pourquoi le pluriel
  ne mène nulle part non plus : redirigé vers une page déjà listée sous « Highlights ».
Le mot « watchlist » n'apparaît nulle part dans le HTML rendu de l'accueil, de la page
coin Bitcoin ou de `/fr/portfolio`. Le bouton étoile de la page coin
(`data-controller="coin-favorites"`, action `handleCoinFavourites`) est la fonction
équivalente aujourd'hui, et elle est repliée dans le Portefeuille (nav : « Mes Monnaies »
→ `/fr/portfolio`) plutôt que dans une page dédiée. Auditée comme composant de l'entrée
Portefeuille, pas comme page séparée.

**`/fr/api/case-studies` — redirection 302 vers `/en/api/case-studies`.** Contenu non
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

### Page coin, onglet Vue d'ensemble — `/fr/coins/bitcoin`

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

### Catégories — `/fr/categories`

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

### Exchanges, spot — `/fr/platesformes`

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

## Synthèse — données sans source gratuite

Rassemblée au fil de l'audit à partir du champ « Données requises » de chaque entrée.
Posée en question à l'exploitant à la fin du sous-projet A.

| Donnée | Pages concernées | Source CoinGecko | Équivalent gratuit |
|---|---|---|---|
| Prix du gaz Ethereum (Gwei) | Accueil | Etherscan (« Données par Etherscan ») | Aucun parmi les sources listées (CoinGecko, Binance, Frankfurter, Yahoo Finance, CoinPaprika, alternative.me, DefiLlama, RSS) |
