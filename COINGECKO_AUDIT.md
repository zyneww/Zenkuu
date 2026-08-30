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
- [ ] Page coin, onglet Vue d'ensemble — `/fr/coins/bitcoin`
- [ ] Page coin, onglet Tokenomique — `/fr/coins/bitcoin#tokenomics`
- [ ] Page coin, onglet Données financières — `/fr/coins/bitcoin#financials`
- [ ] Page coin, onglet Prédominance — `/fr/coins/bitcoin#dominance`
- [ ] Page coin, onglet Données historiques — `/fr/coins/bitcoin/historical_data`
- [ ] Page coin, onglet Prédiction — `/fr/coins/bitcoin/prediction`
- [ ] Catégories — `/fr/categories`
- [ ] Page de catégorie — `/fr/categories/meme-token`
- [ ] Exchanges, spot — `/fr/platesformes`
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
  après correction — une seule correspondance chacun, masquée aux deux (bannière hors
  du flux normal à cette taille de fenêtre pour le premier ; nœud dans le panneau
  paramètres non ouvert pour le second) ; ni le survol ni le focus n'ont donc pu être
  mesurés pour ces deux — l'ouverture réelle du panneau qui les révèle reste hors de
  portée (voir Notes).
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
  restent réellement masqués — une seule correspondance chacun, elle-même masquée.
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

## Synthèse — données sans source gratuite

Rassemblée au fil de l'audit à partir du champ « Données requises » de chaque entrée.
Posée en question à l'exploitant à la fin du sous-projet A.

| Donnée | Pages concernées | Source CoinGecko | Équivalent gratuit |
|---|---|---|---|
| Prix du gaz Ethereum (Gwei) | Accueil | Etherscan (« Données par Etherscan ») | Aucun parmi les sources listées (CoinGecko, Binance, Frankfurter, Yahoo Finance, CoinPaprika, alternative.me, DefiLlama, RSS) |
