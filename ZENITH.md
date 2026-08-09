# ZENITH — Cahier des charges produit & technique

> Référence produit du projet. Ce document décrit la cible ; l'état réel du code est
> suivi dans la section « État d'avancement » en fin de fichier.

## 0. Résumé exécutif

ZENITH est une plateforme **de suivi et d'analyse de marché multi-actifs, 100 % lecture seule** (pas de trading, pas de portefeuille connecté à un wallet/broker) couvrant cryptomonnaies, forex, actions, ETF, matières premières, indices et NFT. Elle s'inspire de trois références sans les copier :

- **AniList** → structure de page et hiérarchie de l'information (nav, colonne principale + sidebar de widgets, grilles de cartes).
- **CoinGecko** → profondeur de contenu, pages actif, classements, outils (convertisseur, comparateur, screener, catégories).
- **OKX** → langage visuel des pages de détail d'un actif (sidebar marché, moyennes mobiles, animations), *sans aucune fonction d'ordre/trading*.

Objectif business : devenir une référence d'analyse de marché généraliste, monétisable via publicité, abonnement premium et affiliation — sans jamais franchir la ligne du conseil financier ou du courtage.

---

## 1. Vision & positionnement

- **Mission** : offrir la vue la plus complète et la plus rapide sur *n'importe quelle classe d'actif* au même endroit, avec une expérience plus moderne que les sites existants.
- **Différenciateur** : la plupart des concurrents sont mono-actif (CoinGecko = crypto, TradingView = payant pour le pro, OKX = exchange orienté trading). ZENITH est **multi-actifs, gratuit à l'usage, 100 % lecture seule** — donc sans les contraintes réglementaires liées à l'exécution d'ordres.
- **Identité de marque** : le nom « Zenith » (sommet) est filé dans toute l'expérience — progression, ascension, records personnels.
- **Non-objectif explicite** : ni exchange, ni broker, ni robo-advisor. Aucun bouton *Acheter / Vendre / Trader / Connecter un wallet* nulle part.

---

## 2. Portée fonctionnelle par classe d'actif

| Classe d'actif | Pages / fonctionnalités attendues |
|---|---|
| **Cryptomonnaies** | Classement global, pages actif (prix, market cap, supply, ATH/ATL, historique OHLC, convertisseur), catégories/secteurs, heatmap sectorielle, tendances, gainers/losers, fear & greed index |
| **Forex** | Paires majeures/mineures/exotiques, convertisseur, graphique historique, corrélations entre devises |
| **Actions** | Fiche valeur (cours, capitalisation, PER, dividendes, résultats trimestriels), classement par secteur/marché/pays |
| **ETF** | Fiche ETF (TER, actifs sous gestion, composition sectorielle/géographique, performance) |
| **Matières premières** | Énergie (pétrole, gaz), métaux précieux et industriels, agricoles |
| **Indices** | Composition, poids des composants, performance historique, comparaison entre indices |
| **NFT** *(extension)* | Collections, volume, floor price, historique |

**Fonctionnalités transverses** : barre de stats globale sticky · stats agrégées par catégorie · heatmap sectorielle (D3/SVG) · watchlists et portefeuille **de suivi manuel** (aucune connexion wallet/broker) · screener multi-critères · comparateur d'actifs (2 à 4 côte à côte) · calendrier économique / résultats / événements crypto · actualités agrégées filtrables.

---

## 3. Design & expérience utilisateur

### 3.1 Design system (tranché, en place)

- Police d'interface : **Inter** · police d'affichage : **IBM Plex Sans** · nombres : **JetBrains Mono**
- Rayon de bordure : **12 px** (plafond des boutons)
- Échelle d'espacement : **4 px**
- Palette : **« ciel au zénith » — azur et or, sur blanc froid**
- **Header horizontalement centré** (écart volontaire par rapport à CoinGecko, aligné à gauche)

Les jetons sont définis dans `apps/web/app/globals.css` (bloc `@theme`) et nulle part ailleurs.

#### Palette « ciel au zénith »

Lecture littérale du nom du site : le zénith est le point du ciel à la verticale de
l'observateur, celui que le soleil atteint à midi. D'où deux couleurs, et une hiérarchie
stricte entre elles.

| Rôle | Clair | Sombre | Emploi |
|---|---|---|---|
| `--color-brand` | `#0369a1` | `#0ea5e9` | Liens, boutons, focus — **porte l'interface** |
| `--color-brand-strong` | `#075985` | `#7dd3fc` | Survol et emphase |
| `--color-on-brand` | `#ffffff` | `#0b1622` | Texte **sur** aplat de marque |
| `--color-accent` | `#f59e0b` | `#fbbf24` | Or solaire — **décor seul en thème clair** |
| `--color-accent-strong` | `#b45309` | `#fcd34d` | Or porteur de sens |

Trois points qu'une évolution ne doit pas défaire :

- **L'azur porte, l'or ponctue.** Inverser les rôles donnerait un site jaune, illisible et
  criard. En thème clair l'or plafonne à **2,05:1** — sous le seuil de 3:1 exigé même d'un
  composant d'interface : il ne peut porter ni texte, ni bordure signifiante, ni icône seule.
- **`--color-on-brand` existe parce que `text-white` en dur ne peut pas être correct dans les
  deux thèmes.** L'azur est sombre en clair (blanc dessus : 5,93:1) et lumineux en sombre
  (blanc dessus : 2,77:1, sous le seuil AA). La couleur du texte doit basculer avec le fond.
- **Un jeton déclaré n'existe pas forcément à l'exécution.** Tailwind 4 élague de `:root` tout
  jeton de thème qu'aucune classe utilitaire ne consomme, alors que le bloc `.dark` sort
  toujours en entier. Toute lecture de ces variables en JavaScript doit prévoir la valeur vide.

**Neutres du thème sombre — d'après `companiesmarketcap.com`.** Les deux tons sont
relevés au navigateur sur ce site (mesurés, pas estimés) : `#2b2d3e` pour ses tableaux
et sa barre haute, `#343e59` pour son fond de page. Une ardoise bleutée nettement plus
claire que le bleu-nuit précédent — moins « terminal de nuit », plus « application de
bureau ». Les accents azur sont inchangés.

Deux choses à ne pas défaire :

- **Leur hiérarchie de surfaces est inversée ; la nôtre ne l'est pas.** Chez eux le
  fond de page est plus CLAIR que le tableau. Copier cette inversion casserait le
  contrat de `bg-surface` (« surface surélevée, donc plus claire ») dans une trentaine
  de composants, et ferait tomber le rouge de baisse à 3,83:1 — sous le seuil AA. Leurs
  deux tons sont donc repris à l'identique mais **dans l'ordre inverse** : leur ton de
  tableau devient le canvas, leur ton de page devient la surface des cartes.
- **C'est l'ÉCART entre les deux qui compte, pas leur valeur absolue** : 1,28:1 chez eux
  comme ici. Une première tentative avait glissé un troisième ton sous les deux leurs ;
  elle gardait leurs couleurs mais écrasait la séparation à 1,07:1, et les cartes
  cessaient de se détacher du fond. `surface-muted` part donc **en retrait** (`#232532`)
  plutôt qu'en surélévation.

Contrastes vérifiés au navigateur sur les trois surfaces, texte par texte. La plus
exigeante en sombre est `surface` (#343e59) : ink 9,0 · ink-muted 5,1 · brand-strong 6,4
· hausse 5,5 · baisse 4,8. En clair : ink 17,1 · ink-muted 7,2 · brand 5,7 · hausse 5,2
· baisse 6,2. Aucun couple sous 4,5:1.

⚠️ `--color-brand` n'est qu'à **3,8:1** sur la surface des cartes en thème sombre :
suffisant pour un composant d'interface (seuil 3:1), **insuffisant pour du texte**. Tout
texte de marque posé sur une carte passe par `--color-brand-strong`.

**Système de mise en forme — `kraken/DESIGN.md`.** Installé via
`npx getdesign@latest add kraken`, il sert de référence de GRAMMAIRE visuelle : échelle de
rayons, rythme de page, hiérarchie typographique, tiers d'élévation, géométrie des composants.

Il en est repris le système, **jamais la palette**. Le violet `#7132f5` et le near-black
`#101114` sont l'identité d'une marque tierce : les reprendre serait du plagiat, alors
qu'adopter une échelle de rayons ou un rythme de bande ne l'est pas — ce sont des conventions
de mise en forme.

Ce template **remplace** la grammaire « coinbase » appliquée précédemment (conservée pour
mémoire dans `DESIGN.md`), sur deux points où les deux se contredisaient frontalement et où
aucune superposition n'était possible :

| | coinbase (avant) | kraken (retenu) |
|---|---|---|
| Graisse d'affichage | 400 | **700** |
| Géométrie des boutons | pilule | **12 px** (« Don't use pill buttons ») |

Éléments effectivement adoptés :

- **Titres d'affichage en graisse 700**, interlettrage négatif, plafonnés à 48 px (`.display-*`).
  Les tailles plafonnent plus bas qu'avant parce que graisse et taille se compensent : un titre
  de 80 px en graisse 400 reste aéré, le même en 700 devient un mur.
- **Système à deux polices** : IBM Plex Sans pour les titres, Inter pour l'interface. C'est ce
  dédoublement qui donne à une page sa voix, davantage que le choix de l'une ou l'autre fonte
  prise isolément. La fonte de marque de Kraken étant propriétaire, on retient le repli que le
  template désigne lui-même.
- **Police à chasse fixe sur tous les nombres** (JetBrains Mono, branchée sur la classe
  `.tabular` déjà présente partout). En chasse proportionnelle, un « 1 » est plus étroit
  qu'un « 8 » : une colonne de cotation se décale visuellement à chaque rafraîchissement.
- **Boutons à 12 px.** La pilule survit, mais son domaine se réduit aux pastilles et puces de
  filtre — la distinction sépare visuellement ce qui déclenche une action de ce qui bascule
  un état.
- **Échelle de rayons complète** (`xs` 4 → `xl` 24 + `pill`), dont `--radius-card` (12 px)
  reste le cran de référence du §3.1.
- **Un seul tier d'ombre** : empiler cinq niveaux produit une hiérarchie que personne ne
  perçoit.

**Coquille de page.** Le rythme, plus que la couleur, est ce qui éloignait les pages de leur
référence : elles ouvraient sur un titre de 24 px collé en haut, sans respiration ni point
d'entrée. La coquille reprise est : bande de tête large (titre 48 px, chapô, repères chiffrés)
→ bandes espacées → renvoi méthodologique. **Aucune bande promotionnelle** : ZENITH informe,
il ne vend rien — la place qu'occuperait un appel à l'inscription sur une plateforme d'échange
renvoie ici à la méthodologie.

⚠️ **Les capitalisations par secteur ne s'additionnent pas.** Un même actif appartient à
plusieurs secteurs — Bitcoin relève de « Layer 1 » comme de « Proof of Work ». Toute somme le
compterait deux fois et publierait un total faux. Les repères chiffrés d'une bande de tête sont
donc des **dénombrements** (combien de secteurs, combien en hausse), qui restent exacts même
quand les ensembles se recoupent. Afficher une « capitalisation totale » exigerait une
déduplication par actif que la source ne fournit pas (§5).

#### Page de cotation crypto (`/crypto`)

Seule des six pages de classement à **ne pas** passer par `MarketPageView`, le corps commun.
Tout ce qui la caractérise — capitalisation mondiale, sentiment, tendances, plus fortes
hausses — repose sur des requêtes qui n'existent que pour la crypto ; les glisser dans le
corps commun aurait imposé cinq gardes conditionnelles à des pages qui n'en ont que faire.
Les onglets de classes d'actifs y disparaissent aussi : la page ne parle que de crypto, et le
saut vers les autres classes reste assuré par le menu de l'en-tête.

Structure : bande de tête centrée (titre 48 px + capitalisation mondiale en une phrase) →
trois cartes (capitalisation + sentiment, tendances, meilleures performances) → onglets de vue
et sélecteur de période → tableau.

| Élément de la référence | Traitement chez ZENITH |
|---|---|
| Bouton « Acheter » par ligne | **Écarté** — §7, plateforme 100 % lecture seule. Remplacé par l'étoile de suivi |
| Carte « Biais de trading » (% achat/vente) | **Écartée** — aucune source ne publie la pression acheteur/vendeur. Remplacée par l'indice Fear & Greed, réel et cité |
| Sélecteur `1H · 24h · 1S · 1M · 1A · 5A` | Cinq crans réels ; **le cran 5 ans est omis**, la source ne le publie pas (§5) |
| Onglet « Nouveautés » | **Écarté** — pas de date d'ajout dans la source |
| Chips « Échangeables (652) » | **Écartés** — ZENITH n'est pas une place de marché |
| Prix dans la carte « Tendance » | **Absents** — l'endpoint des tendances ne cote qu'en dollars |

Trois pièges que toute évolution de cette page doit respecter :

- **« Gagnants » se filtre par SIGNE, pas par rang.** `getCryptoOverview` trie l'univers par
  variation puis en découpe les extrémités : demander 50 lignes d'un univers de
  `MOVERS_UNIVERSE_SIZE` = 100 ferait se rejoindre les deux listes au milieu, et le bas de
  « Gagnants » afficherait des actifs en baisse. La liste raccourcit les jours de marché
  atone — c'est l'information à ne pas masquer par une longueur fixe.
- **La portée du classement s'écrit à l'écran.** Ce n'est pas « les plus fortes hausses du
  marché » mais « parmi les 100 plus grandes capitalisations » : une hausse de +900 % sur un
  jeton illiquide n'a pas le même sens, et taire le filtre reviendrait à le laisser croire.
- **Vues et périodes vivent dans l'URL** (`?vue=`, `?periode=`), pas dans un état React — une
  vue « plus fortes hausses sur 1 an » doit être partageable, mettable en favori et indexable.
  Les onglets sont donc des `<Link>`, pas des boutons.

Deux ajouts de plomberie que cette page a rendus nécessaires :

- `ListAssetsParams.ids` — filtrage par identifiants. Sans lui, l'onglet « Tendance » n'aurait
  affiché qu'un nom et une variation, la source des tendances ne publiant ni prix ni
  capitalisation. Coûte **un** appel réseau, mis en cache et payé seulement si l'onglet est
  ouvert. Un fournisseur qui ignore ce paramètre renvoie plus large, jamais faux : l'appelant
  reste tenu de refiltrer.
- `getWatchlistIds(assetClass)` — lecture **groupée** de la liste de suivi. `getWatchlistState`
  interroge la base par actif : correct sur une fiche, ruineux sur cinquante lignes.

Le sélecteur de période, lui, ne coûte **rien** : CoinGecko renvoie déjà
`1h,24h,7d,14d,30d,1y` dans l'appel du classement.

#### Fiche d'un actif (`/crypto/[id]` et les cinq autres classes)

**La moitié des modules était déjà payée.** L'appel `/coins/{id}` récupérait la réponse
complète mais n'en typait qu'une fraction : `links`, `platforms`,
`fully_diluted_valuation`, `total_value_locked`, `ath_change_percentage` et
`current_price` (un dictionnaire de toutes les devises) étaient reçus puis jetés. Les
contrats, explorateurs, valorisation diluée, écart au record, convertisseur et cours
mondiaux ne coûtent donc **aucun appel réseau** — c'est du mappage, pas de la collecte.

Disposition **délibérément différente** de la référence du secteur, qui empile trois
colonnes (rail de statistiques, graphique, actualités). Ici : graphique **pleine largeur**
sous l'en-tête → bandes horizontales (variations, repères, places) → contexte en deux
colonnes. Le rail vertical est couché en bandes : même information, ordre de lecture
inverse. Une convention de contenu se reprend ; une mise en page se réinvente.

| Module | Coût réseau |
|---|---|
| Amplitude 24 h, variations 1 h → 1 an, FDV, TVL, écart aux extrêmes | aucun |
| Contrats par chaîne, explorateurs, livre blanc, code source, communauté | aucun |
| Convertisseur, cours dans d'autres devises | aucun |
| **Places de cotation** | **un appel**, mis en cache 30 min |

Quatre points à ne pas défaire :

- **`/coins/{id}/tickers` ne convertit QUE vers `btc`, `eth` et `usd`** — jamais l'euro,
  contrairement au reste de l'API. Demander « eur » renvoyait zéro ligne exploitable et
  vidait la section en silence. Le provider résout la devise sur ce que la réponse
  contient réellement et la déclare dans `currency` ; convertir nous-mêmes empilerait un
  cours et un taux horodatés différemment (§5).
- **Les cotations `is_stale` et `is_anomaly` sont écartées dans l'adaptateur.** La source
  les signale elle-même : un prix faux à côté de prix justes est pire que pas de prix, le
  lecteur n'ayant aucun moyen de les distinguer.
- **La FDV est reprise telle quelle, jamais recalculée** en `prix × offre totale` : la
  source applique ses propres règles sur les jetons verrouillés ou brûlés.
- **`StatsTab` et `AboutTab` ont été supprimés** d'`AssetWorkspace`, pas seulement retirés
  de sa barre d'onglets : leur contenu vit désormais en bandes pleine largeur. Deux
  implémentations d'un même affichage auraient divergé au premier ajustement. Les trois
  onglets restants portent chacun un contenu unique.

Trois modules de la référence sont **absents et le resteront** : Tokenomics, Holders et
Financials reposent sur des données propriétaires qu'aucune source gratuite ne publie.

**Liens sortants vers les places de cotation** : prévus par le §8 (« liens sortants vers
des exchanges tiers — jamais de widget de trading intégré »). La distinction tient — ZENITH
n'exécute rien, ne détient rien, n'intègre aucun tunnel d'achat. `nofollow` marque
l'absence de caution, `noopener` protège de `window.opener`.

#### Blog (`/blog`) — système complet, contenu à zéro

Le système entier est en place ; **`ARTICLES` est vide** et le reste (§5 : de faux billets
signés de faux auteurs à de fausses dates sont exactement ce que la règle proscrit). Tout se
peuple **de lui-même** à la première entrée ajoutée au tableau : aucun composant à retoucher.

Disposition **volontairement différente** de la référence, qui empile sous-barre collante,
héro, puis carrousel « Featured » à flèches. Ici : une à la une en pleine largeur → filtres
intégrés au flux → grille à deux colonnes → archives en liste compacte au-delà de six
articles. Le carrousel est écarté pour une raison de lecture, pas de style : il cache
derrière des flèches ce qu'une grille montre d'un coup, et sur un blog peu fourni il simule
un volume inexistant.

| Ce qui dérive automatiquement | De quoi |
|---|---|
| Temps de lecture | nombre de mots / 200 — **jamais saisi à la main**, un chiffre écrit en dur diverge dès la première relecture |
| Ancres du sommaire | titre de section, diacritiques retirés (`#methodologie`, pas `#m%C3%A9thodologie`) |
| Flux RSS, plan du site, articles liés | le tableau `ARTICLES` |
| Indexation de `/blog` | `robots: noindex` **tant que le tableau est vide**, rouvert seul à la première publication |

Points à ne pas défaire :

- **Le flux RSS répond même à vide.** Un abonné d'aujourd'hui recevra les articles du jour où
  ils paraîtront ; un flux qui répondrait 404 en attendant obligerait à se réabonner.
- **`dc:creator` et non `<author>`** : la spécification RSS 2.0 attend une adresse e-mail dans
  `<author>`, un nom y rend le flux non conforme.
- **La découverte RSS est déclarée à la racine** (`app/layout.tsx`). Toute page qui redéfinit
  `alternates` écrase l'objet hérité et doit la réémettre — c'est le cas de `/blog` et de
  `/blog/[slug]`.
- **`generateStaticParams` renvoie un tableau vide**, donc toute URL `/blog/<quoi-que-ce-soit>`
  répond 404. C'est le comportement juste : une adresse d'article inexistant ne doit pas
  rendre une page vide indexable.
- **Pas de vignette sur les cartes.** ZENITH n'a pas de banque d'illustrations : une image
  générique par billet est du remplissage visuel, un cadre « image à venir » est pire.
- **Deux destinations de partage seulement** (copier le lien, X), sans script tiers. Les
  boutons officiels des réseaux embarquent des traceurs ; un lien `intent` fait le même
  travail. Une rangée de six pastilles colorées est par ailleurs un ornement de gabarit
  (§3.1.1).

**Infolettre volontairement inactive.** Aucune infrastructure d'envoi n'existe. Collecter
réellement stockerait des adresses personnelles sans finalité ; faire semblant d'accepter
serait un mensonge. Le champ est donc `disabled`, la raison écrite dessous, et l'alternative
qui **fonctionne** — le flux RSS — est mise en avant à côté, pas reléguée en note.

#### Logo de l'en-tête

`logo2.svg` est un **bitmap tracé**, pas un logo vectoriel natif : 382 chemins, 222 Ko à
l'origine. Trois traitements ont été nécessaires, et chacun répond à un défaut mesuré :

- **Optimisé à 65 Ko** (`svgo --precision=1 --multipass`, −71 %) sans perte visible. Le
  fichier d'origine faisait expirer le rendu du navigateur.
- **`viewBox` recadré** de `0 0 1152 767` à `99 206 933 326`. La zone de dessin n'était
  remplie qu'à 32 % — le logotype (917×310) flottait sous 28 % de marge et se réduisait à
  une vignette illisible à hauteur d'en-tête. Aucun chemin n'a été touché.
- **`dark:invert`** plutôt que le masque CSS de l'ancien logo. Un masque ne lit que la
  silhouette et aurait aplati en une teinte un dessin qui mêle 259 aplats sombres et 117
  clairs. L'inversion est ici **exacte** : le fichier ne contient aucune couleur saturée
  (vérifié — aucun aplat dont R, G et B s'écartent de plus de 12). Sur un logo coloré, ce
  serait à proscrire.

### 3.1.1 Ce qui fait « gabarit généré » — et qui est proscrit

Une passe a retiré du site les conventions qui signalent une page produite à partir
d'un modèle plutôt qu'écrite. Elles sont listées ici **pour ne pas revenir** :

| Proscrit | Pourquoi |
|---|---|
| **Emoji dans l'interface de données** (🔥 🚀 📉 🏔️) | Registre de réseau social. Aucune page de cotation professionnelle n'en pose sur un panneau de marché |
| **Surtitre en petites capitales colorées** au-dessus d'un titre (« NOS PARTIS PRIS ») | Occupe une ligne pour annoncer que la ligne suivante est un titre |
| **Sous-titre qui paraphrase son titre** | « Tendances / Les actifs les plus consultés » : un panneau qui explique ce qu'il vient d'annoncer traite son lecteur en débutant permanent |
| **Bandeau de N garanties** icône-au-dessus-du-libellé | Annonce en quatre mots ce que les sections développent juste en dessous |
| **Alternance gauche/droite** pilotée par `index % 2` | Symétrie décidée par la parité d'un compteur, pas par le propos |
| **Une icône par section**, choisie par synonymie | Un œil pour « donnée absente », une boussole pour « aucun intérêt » : n'ajoute aucune information |
| **Encadré identique répété** en fin de chaque section | Répété quatre fois, il cesse d'être lu |
| **Filet ou pastille colorée décorative** au-dessus d'un titre | Ornement de gabarit ; ne distingue rien que le titre ne dise |
| **Rangée de N boutons de même poids** centrée en bas de page | Ne hiérarchise rien : demande au lecteur de choisir à la place de l'auteur |
| **Titre vague + glose** | Préférer un titre précis qui se lit seul (« Secteurs les plus actifs · 24 h », pas « Narratifs du jour » + explication) |

**Ce qui reste, en revanche** : les précisions de PÉRIMÈTRE (« parmi les 100 plus
grandes capitalisations ») et de FRAÎCHEUR (« taux publiés une fois par jour ouvré »).
Elles ne glosent pas le titre, elles empêchent une lecture fausse — c'est le §5, pas
de la décoration. Elles restent typographiquement subordonnées.

**Registre : vouvoiement, partout.** Le site en comptait 29 occurrences et trois
passages tutoyaient (« Ajoute ton premier actif », « Ta watchlist est vide »). Un
produit qui change de registre d'un écran à l'autre n'a pas été relu. De même,
« watchlist » disparaît du texte affiché au profit de « liste de suivi » : la
navigation dit « Suivi », et un produit sérieux n'emploie pas deux mots pour la même
chose.

**Typographie des nombres — deux règles non négociables :**

- `formatPercent` pose une **espace fine insécable** (U+202F) devant le signe pourcent.
  Typographie française, et surtout : une espace ordinaire est un point de coupure.
- Tout montant est enveloppé par `Amount` dans `Money.tsx` (`whitespace-nowrap`), et
  `ChangeBadge` porte la même règle. Un montant formaté contient jusqu'à trois espaces
  (« 11,8 Md $ ») : dans les colonnes étroites, « Md $ » atterrissait sous son nombre.
  **Un nombre séparé de son unité se lit comme un affichage cassé** — c'est le défaut
  qui trahissait le plus sûrement un produit inachevé.

### 3.2 Ce qu'on emprunte à AniList — et ce qu'on n'emprunte PAS

La capture de référence AniList est en thème sombre ; ZENITH est en thème clair. On reprend la **structure**, pas la palette :

- Barre de navigation horizontale fixe : logo, liens principaux par classe d'actif, recherche universelle, compte/watchlist.
- Disposition en deux colonnes sur les pages de flux : colonne principale (tendances, activité de marché) + colonne latérale de widgets compacts (top gainers/losers, calendrier à venir, watchlist en aperçu).
- Grilles de cartes homogènes pour les listes d'actifs, réutilisées partout.

### 3.3 Pages de détail d'un actif (inspiration OKX)

Template générique unique, avec champs conditionnels selon le type d'actif, reprenant la structure d'une page CoinGecko avec le langage visuel d'OKX :

- Sidebar de marché (autres actifs de la même catégorie)
- Graphique avec moyennes mobiles superposables
- Dégradé de profondeur du carnet d'ordres **si la donnée est publiquement disponible** (sinon le module est omis — jamais de données inventées)
- Animations de mise à jour de prix (flash vert/rouge)
- **Aucun bouton Acheter/Vendre/Trader/Déposer/Retirer.**

### 3.4 Autres exigences

Mobile-first, entièrement responsive. Mode sombre en option (non requis au MVP).

---

## 4. Architecture technique

| Composant | Choix | Rôle |
|---|---|---|
| Monorepo | **Turborepo** + **Bun** | Gestion du monorepo, runtime/package manager |
| Frontend | **Next.js** (App Router) + **Tailwind CSS 4** | Rendu SSR/ISR, UI |
| Authentification | **Clerk** | Comptes utilisateurs, sessions |
| Base relationnelle | **Turso** (libSQL) + **Drizzle ORM** | Utilisateurs, watchlists, portefeuilles, préférences |
| Base séries temporelles | **QuestDB** | Historique OHLC haute fréquence |
| Cache | **Dragonfly** (compatible Redis) | Cache API, TTL 5 min |
| Files de tâches | **BullMQ** | Ingestion planifiée, calculs d'agrégats |
| Conteneurisation | **Docker** | Orchestration locale de QuestDB, Dragonfly, etc. |
| Monitoring | **Sentry** | Suivi des erreurs en production |

**Principe d'architecture non négociable** : isoler chaque fournisseur de données derrière une **couche d'adaptateur** (un module par fournisseur, interface commune en sortie), afin de pouvoir changer de fournisseur sans toucher au reste de l'application. Les conditions des API gratuites changent souvent : c'est une nécessité, pas un raffinement.

---

## 5. Sources de données — 100 % gratuites

| Classe d'actif | Source principale | Limite gratuite | Rôle |
|---|---|---|---|
| Crypto — prix/marché | **CoinGecko API** | Publique sans clé (~5–15 req/min) ; clé Demo gratuite recommandée | Source de vérité crypto |
| Crypto — actualités | **CoinGecko News** | Inclus | Actus crypto |
| Actions / ETF / Indices | **Twelve Data** | ~800 requêtes/jour | Couverture large, 50+ bourses |
| Actions / ETF / matières premières / forex (complément) | **Alpha Vantage** | ~25 requêtes/jour | Indicateurs techniques, fondamentaux, séries matières premières |
| Actions (secours, fin de journée) | **Marketstack** | Palier gratuit limité | 70+ bourses |
| Forex — taux de référence | **Frankfurter** (BCE) | Illimité, sans clé | Taux quotidiens fiables |
| Données macro | **FRED** | Gratuit (clé requise) | Contexte macro |
| Actualités générales | **NewsData.io** | Palier gratuit limité | Actus forex/actions/macro |
| NFT | **Reservoir API** | Palier gratuit | Données multi-marketplaces |

> Les conditions des offres gratuites évoluent : à reconfirmer avant chaque nouvelle intégration.

**Règle absolue : zéro donnée factice/mock/placeholder, à aucun stade (dev, staging, prod).** Si une donnée n'est pas disponible gratuitement, le module est masqué ou affiche un état vide explicite — jamais une valeur inventée.

Cette règle est appliquée **structurellement**, pas par discipline : voir `MarketDataProvider.isConfigured()` dans `packages/data/src/types.ts` et le type `DataResult` dans `packages/data/src/queries.ts`. Une source non disponible ne peut pas produire de nombre — elle produit un état vide que l'appelant est obligé de traiter.

---

## 6. Feuille de route

**Phase MVP** — accueil · classement par classe d'actif · page de détail d'un actif (template générique) · recherche universelle · watchlist de suivi

**Phase V1** — convertisseur multi-actifs · comparateur · heatmap sectorielle (D3/SVG) · calendrier économique · fil d'actualités filtrable

**Phase V2** — screener multi-critères · portefeuille de suivi enrichi (P&L sur saisie manuelle, alertes de prix) · support NFT · multilingue si pertinent

Le site est développé **en français**. Aucune autre langue ne doit être ajoutée sans consigne explicite.

---

## 7. Contraintes non négociables

- **Plateforme 100 % lecture seule** : aucune fonction d'ordre, de dépôt, de retrait ou de connexion à un wallet/broker, sur aucune page.
- **Zéro donnée mock/test/placeholder**, à aucun stade du développement.
- **Toutes les API et outils utilisés doivent être 100 % gratuits**.
- **Header horizontalement centré**.
- Le design system (Inter + IBM Plex Sans, rayon 12 px, échelle 4 px, palette azur/or « ciel au zénith ») est la base par défaut ; tout changement de thème doit être explicitement demandé.

---

## 8. Monétisation

À activer progressivement, sans dégrader l'expérience ni la vitesse :

1. **Publicité display** sur les pages à fort trafic organique — emplacements non intrusifs, pas d'interstitiels.
2. **Abonnement premium** (« Zenith Pro ») : sans publicité, alertes de prix, export CSV, filtres de screener avancés. Facturation Stripe (compatible Clerk Billing).
3. **Affiliation** : module « Où suivre/acheter cet actif » avec liens sortants vers des exchanges tiers — **jamais de widget de trading intégré**, uniquement des liens externes, pour préserver le positionnement lecture seule.

*(Priorité entre ces trois leviers : décision business à trancher après le MVP, selon la traction.)*

---

## 9. Exigences non fonctionnelles

- **Performance** : SSR/ISR, cache en amont des API externes (TTL 5 min), Core Web Vitals soignés, logos optimisés.
- **SEO** : une page indexable par actif, sitemap dynamique, meta et JSON-LD par type d'actif, URLs canoniques. Le SEO organique est le principal moteur d'acquisition.
- **Sécurité** : clés d'API en variables d'environnement uniquement, rate limiting côté ZENITH pour ne jamais dépasser les quotas gratuits.
- **Accessibilité** : contrastes suffisants (vigilance particulière sur l'or, décoratif seul en thème clair, et sur tout texte posé sur un aplat de marque — voir `--color-on-brand` au §3.1), navigation clavier, alternatives textuelles.
- **Internationalisation** : français au lancement ; structure permettant d'ajouter des langues plus tard sans refonte, sans l'implémenter au MVP.

---

## 10. Identité visuelle — logo et mascotte

- **Logo** : pictogramme minimaliste noir/blanc — un personnage courant au sommet d'une courbe ascendante, brandissant un drapeau étoilé. Usages : favicon, logo du header, OG image, écran de chargement.
- **Mascotte** : même personnage en pose de victoire. Usages : états vides, onboarding, pages d'erreur, badges/jalons, bloc newsletter.

Fil narratif à filer dans les micro-textes : la métaphore de l'ascension et du sommet (« nouveaux sommets », « en route vers le zenith »).

> ✅ **Fait** : les visuels sont en place dans `apps/web/public/brand/` (`logo.svg`, `footer-logo.svg`, `mascotte.svg`). Ils sont appliqués en masque CSS (`.brand-mark`) et suivent donc le thème clair/sombre sans duplication de fichier. Le favicon dérive du même tracé, simplifié pour rester lisible à 16 px (`app/icon.svg`).
>
> *(Nom de la mascotte à valider : « Zeni » ou « Cimo » — point ouvert, non bloquant.)*

---

## 11. Méthode de travail

- Poser les questions de cadrage avant d'implémenter plutôt que trancher silencieusement.
- En cas de conflit entre ce document et une contrainte déjà en place dans le code, signaler le conflit plutôt que choisir seul.
- Ce document est la référence produit globale ; il complète les prompts ciblés des tâches en cours.

---

## État d'avancement

> Section unique et faisant foi. Elle a été fusionnée le 9 août 2026 : le fichier
> portait jusque-là **deux** blocs « Livré » et **deux** blocs « Reste à faire »
> empilés, sans indication de celui qui primait — et le §10 réclamait des visuels
> déjà livrés. Une carte fausse coûte plus cher qu'une carte absente : n'ajoutez pas
> un bloc par-dessus, modifiez celui-ci.

### Livré

| Élément | Emplacement |
|---|---|
| Monorepo Turborepo + Bun, TypeScript strict | racine, `packages/config` |
| Couche d'adaptateurs à interface commune (§4) | `packages/data/src/types.ts`, `registry.ts` |
| Cache à TTL étagés + déduplication des appels concurrents | `packages/data/src/cache.ts`, `queries.ts` |
| Limitation de débit à fenêtre glissante, gestion des 429 | `packages/data/src/http.ts` |
| **CoinGecko** — crypto : classements, fiches, historiques, catégories, tendances, **OHLC** | `providers/coingecko.ts` |
| **Frankfurter/BCE** — devises, sans clé | `providers/frankfurter.ts` |
| **Yahoo Finance** — actions, ETF, matières premières, indices, **OHLC + volume** | `providers/yahoo.ts` |
| **RSS** — actualités (Cointelegraph, CoinDesk) | `providers/news.ts` |
| **Alternative.me** — indice Fear & Greed | `providers/sentiment.ts` |
| Design system clair azur/or **+ thème sombre** | `apps/web/app/globals.css` |
| Bascule de thème, suivi système, sans flash au chargement | `components/ThemeScript.tsx`, `ThemeToggle.tsx` |
| Header centré avec 4 menus déroulants accessibles | `components/NavBar.tsx`, `content/navigation.ts` |
| Sélecteur langue/devise (globe), 2 colonnes + recherche | `components/locale/LocalePanel.tsx` |
| Logo et mascotte en masque CSS (suivent le thème) | `public/brand/`, `.brand-mark` |
| Favicon simplifié, lisible à 16 px | `app/icon.svg` |
| Recherche universelle toutes classes d'actifs | `app/api/recherche/`, overlay du header |
| Accueil : synthèse, tendances, hausses/baisses, narratifs, actus, sentiment | `app/page.tsx`, `components/home/` |
| Six classements + six fiches d'actif | `app/{crypto,devises,actions,etf,matieres-premieres,indices}/` |
| Catégories, actualités, sentiment, mouvements | `app/{categories,actualites,sentiment}/` |
| **Comptes utilisateurs (Clerk)** — dégradation propre sans clé | `lib/auth.ts`, `components/auth/`, `app/{connexion,inscription}/` |
| **Graphiques enrichis** — 5 types, volume, moyenne mobile, lignes de prix, légende | `components/asset/PriceChartInteractive.tsx` |
| **Centre d'aide** — 12 articles, 4 catégories, recherche locale, 1 page par article | `content/aide.ts`, `app/aide/` |
| **Apprendre** — 9 fiches par thème et par niveau | `content/apprendre.ts`, `app/apprendre/` |
| **Pourquoi ZENITH**, **Bien démarrer**, **API & développeurs**, **Nouveautés** | `app/{pourquoi-zenith,bien-demarrer,developpeurs,nouveautes}/` |
| **SEO** — sitemap dynamique (189 URL), `robots.txt`, JSON-LD, canoniques | `app/sitemap.ts`, `app/robots.ts`, `components/seo/JsonLd.tsx`, `lib/site.ts` |
| **Turso + Drizzle** — watchlist persistée, préférences | `packages/db/`, `app/suivi/`, `lib/watchlist-actions.ts` |
| **Contexte Clerk serveur** (`proxy.ts`, conditionné à `AUTH_ENABLED`) | `apps/web/proxy.ts` |
| **Listings refondus** — onglets inter-classes, synthèse, filtre et vues rapides | `components/market/{AssetClassTabs,MarketStatsStrip,MarketBrowser}.tsx` |
| **Secteurs refondus** — bandeau de tête, grille/tableau filtrable | `components/categories/` |
| **Actualités refondues** — cartes, article en tête, filtres de rubrique | `components/news/NewsFeed.tsx` |
| **4 flux RSS, 3 rubriques réelles** (crypto, marchés, économie) | `packages/data/src/providers/news.ts` |
| **Fiches actif** — statistiques clés hors onglets, historique daté | `components/asset/{AssetKeyStats,PriceHistoryTable}.tsx` |
| **Aide** — tuiles de rubriques + pages `/aide/rubrique/[id]` | `app/aide/`, `content/aide.ts` |
| **Apprendre** — parcours conseillé, recherche, sommaire des thèmes | `app/apprendre/`, `components/learn/` |
| **Pourquoi ZENITH** — garanties, sections alternées, tableau comparatif | `app/pourquoi-zenith/page.tsx` |
| **À propos** — récit + chiffres produit calculés depuis le code | `components/about/KeyFigures.tsx` |
| **Panneau paramètres unifié** (langue / devise / thème 3 états) | `components/settings/SettingsPanel.tsx`, `lib/stores/settings.ts` |
| **Filtres « mouvements »** — période × univers, en pilules | `components/market/MoversFilters.tsx`, `content/movers.ts` |
| **`/crypto/all-coins`** — classement complet, 100 par page | `app/crypto/all-coins/page.tsx` |
| **Widgets natifs** — ticker, convertisseur, classement compact + intégration | `components/widgets/`, `app/{widgets,embed}/` |
| **Attribution CoinGecko conforme aux CGU** | `components/Footer.tsx`, `app/embed/ticker/page.tsx` |
| **Tests** — Vitest sur la logique de classement | `packages/data/src/queries.test.ts` |

### Contraintes externes mesurées

- **CoinGecko sans clé plafonne à ~5 requêtes/minute** (salve de 40 requêtes : 5 succès puis 429).
  L'accueil a été ramené de 8 à 5 appels et les fiches de 3 à 2 pour tenir dans ce budget.
  Une clé Demo gratuite porte le plafond à 30/min et devient nécessaire dès qu'un robot
  d'indexation parcourt plusieurs fiches d'affilée (§9). Voir `.env.example`.
- **L'OHLC de CoinGecko vit derrière un endpoint séparé et NE CONTIENT PAS de volume.**
  D'où deux décisions : les bougies ne sont chargées qu'au clic sur « Chandeliers »
  (jamais au rendu de la fiche), et la case « Volume » est grisée dans cette vue.
  Le volume des vues en ligne, lui, est extrait de `total_volumes` déjà présent dans la
  réponse `market_chart` — coût API nul.
- **CoinGecko n'accepte que 1, 7, 14, 30, 90, 180 et 365 jours** sur `/ohlc` ; toute autre
  valeur renvoie 401. `getOhlc` aligne donc la demande sur la fenêtre autorisée supérieure.
- **`per_page` plafonne à 250 chez CoinGecko.** D'où les univers de « mouvements » limités à
  Top 100 / 250 / 500 : 1 000 coûterait quatre appels et « toutes les cryptomonnaies » une
  soixantaine, sur un budget de cinq par minute. Proposer une option irréalisable serait pire
  que de ne pas l'offrir.
- **Les fenêtres de variation sont GRATUITES.** `price_change_percentage=1h,24h,7d,14d,30d,1y`
  est servi dans la même réponse que le classement : changer de période sur `/crypto/mouvements`
  ne déclenche aucun appel.
- **Yahoo Finance est un endpoint non officiel** : il exige un User-Agent de navigateur et
  peut fermer sans préavis. `v7/quote` (requêtes groupées) est déjà fermé, d'où une requête
  par symbole. Le registre place les fournisseurs sous clé AVANT lui : écrire l'adaptateur
  Twelve Data ou Finnhub le remplace sans toucher aux pages.

### Décisions prises

- **Thème clair par défaut, sombre disponible**, préférence système respectée au premier chargement.
- **Widgets CoinGecko reconstruits nativement** plutôt qu'embarqués : les widgets officiels sont
  des iframes non thémables, chargent du JavaScript tiers et ne suivraient pas le mode sombre.
  L'attribution exigée par leurs CGU est portée par le pied de page.
- **Panneau « Tendances » sans colonne de prix** : la source ne cote qu'en dollars et un second
  appel dépasserait le quota. Rang et variation sont réellement publiés en euros, le prix non.
- **Tri par variation non exposé** sur les classements : la source ne sait pas trier par variation
  à l'échelle du marché. Les hausses/baisses sont calculées sur un univers explicitement annoncé.
- **Pas de page `/compte`** : le `<UserButton>` de Clerk porte déjà profil et déconnexion. Une page
  dédiée n'aura de contenu propre qu'avec la watchlist persistée — elle exigera alors un
  `clerkMiddleware()`, lui-même à conditionner à `AUTH_ENABLED` sous peine de faire tomber
  TOUTES les routes en l'absence de clé.
- **`AUTH_ENABLED` est figé à la compilation.** `NEXT_PUBLIC_*` est substitué par le bundler et
  `/connexion` est prérendue statiquement : ajouter les clés Clerk à un déploiement déjà bâti
  ne suffit pas, il faut **rebâtir**.
- **Graphiques : périmètre volontairement restreint.** Sont écartés heatmap, aire empilée,
  historique infini, temps réel (aucun flux WebSocket gratuit ; le cache est à 5 min), alertes
  de prix (elles supposent la persistance) et loupe. Ce sont des démos de lightweight-charts,
  pas des besoins du site.
- **Blog non indexé tant qu'il est vide** (`robots: index: false`) : une page vide indexée dégrade
  la perception de qualité du domaine entier. Aucun article fictif n'est publié (§5).
- **Attribution CoinGecko AJOUTÉE, pas retirée.** Les CGU de l'API (§4.1.4) imposent
  « Powered by CoinGecko » en police ≥ 10 px, sans distinguer le palier gratuit des offres
  payantes, et aucun plan n'autorise le retrait. La consigne initiale de suppression du
  watermark visait les *widgets* embarqués — or ZENITH n'en utilise aucun, ils sont
  reconstruits nativement. Le white-label Pro contredirait par ailleurs le §7 (tout gratuit).
- **Widgets natifs plutôt qu'iframes** : une iframe ne suit pas le thème sombre, charge du
  JavaScript tiers sur chaque page hôte et impose un watermark non contrôlé. Les nôtres
  partagent le cache et le limiteur de débit du site. Route `/embed/ticker` pour l'intégration,
  avec attribution reproduite — la page hôte n'affiche pas notre pied de page.
- **Zustand pour les préférences**, avec DOUBLE ÉCRITURE de la clé `zenith-theme` :
  `ThemeScript` s'exécute avant l'hydratation et lit un format brut que `persist` ne produit
  pas. Sans cette double écriture, le flash de thème clair revenait au rechargement.
- **Les données partagées serveur/client vivent hors des modules `'use client'`.**
  Next.js transforme TOUS les exports d'un tel module en références client : un composant
  serveur qui les importe reçoit un stub, et l'indexation y renvoie `undefined` — sans que
  TypeScript le voie. Cas réel corrigé : `content/movers.ts`.
- **Grille de langues affichée sans traduction**, sur décision explicite du porteur du projet.
  Réserve maintenue et matérialisée dans l'interface : chaque langue non traduite porte la
  mention « interface en français », pour ne pas promettre une traduction inexistante.
- **QuestDB, Dragonfly, BullMQ, Docker différés** jusqu'à l'ingestion planifiée.

### Reste à faire

1. **Configuration ESLint absente** : `bun run lint` est déclaré dans les `package.json`
   mais aucune configuration n'existe — la commande ne peut pas s'exécuter.
2. **Alertes de prix** — le schéma et l'authentification sont en place ; il manque la
   table d'alertes et l'exécution planifiée (donc BullMQ, point 7).
3. Adaptateurs **Twelve Data / Finnhub** pour sortir de la dépendance à Yahoo.
4. Comparateur, screener, heatmap sectorielle, calendrier économique.
   *(Le convertisseur existe désormais comme widget ; reste à en faire une page dédiée.)*
5. **NFT** (Reservoir) — classe d'actif du §2 non encore abordée.
6. Couverture de test : seule `rankMovers` est testée. Le store de paramètres ne l'est pas
   (`persist` demande un environnement DOM non configuré).
7. Dragonfly + QuestDB + BullMQ quand l'ingestion d'historique OHLC démarre.

### Mise en service — à faire par l'exploitant

Trois variables conditionnent des fonctionnalités entières. Le site tourne sans elles,
mais en annonçant explicitement ce qui manque (§5) :

| Variable | Sans elle |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | `robots.txt` interdit TOUTE indexation, et le sitemap publie des URL `localhost`. **À renseigner impérativement en production.** |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` + `CLERK_SECRET_KEY` | Pas de comptes ; `/connexion` et `/inscription` affichent un état vide. Rappel : la valeur est figée **à la compilation**, un redéploiement ne suffit pas, il faut **rebâtir**. |
| `TURSO_DATABASE_URL` (+ `TURSO_AUTH_TOKEN`) | Le bouton « Suivre » signale que le suivi n'est pas conservé. Après configuration : `cd packages/db && bun run db:push`. |

### Vérifié / non vérifié

- ✅ `tsc --noEmit` et `next build` passent ; **59 pages** générées.
- ✅ `bun run test` — 4 tests Vitest sur `rankMovers` (tri par période, exclusion des
  variations absentes, non-mutation de l'entrée).
- ✅ Filtres `/crypto/mouvements` vérifiés en HTTP sur quatre combinaisons période × univers.
- ✅ Graphiques testés dans le navigateur : chandeliers, volume, moyenne mobile et lignes
  de prix rendus avec des données CoinGecko réelles.
- ✅ `robots.txt`, `sitemap.xml` (189 URL) et le JSON-LD (`Dataset`, `Article`,
  `BreadcrumbList`, `WebSite`) vérifiés dans la sortie HTTP réelle.
- ❌ **Le chemin Clerk n'a jamais été exercé** : sans `.env.local`, seule la branche
  « non configuré » est testée. `<SignIn />`, `<UserButton>` et `proxy.ts` compilent,
  mais leur fonctionnement n'est pas prouvé.
- ❌ **Les écritures Turso n'ont jamais été exercées** : sans base configurée, seul le
  chemin « non disponible » est testé. Le schéma, les requêtes Drizzle et les actions
  serveur compilent ; aucune insertion réelle n'a été effectuée.
