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

- Police : **Inter**
- Rayon de bordure : **12 px**
- Échelle d'espacement : **4 px**
- Palette : **claire, crème/orange**
- **Header horizontalement centré** (écart volontaire par rapport à CoinGecko, aligné à gauche)

Les jetons sont définis dans `apps/web/app/globals.css` (bloc `@theme`) et nulle part ailleurs.

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
- Le design system (Inter, rayon 12 px, échelle 4 px, palette crème/orange claire) est la base par défaut ; tout changement de thème doit être explicitement demandé.

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
- **Accessibilité** : contrastes suffisants (vigilance particulière sur la palette crème/orange claire), navigation clavier, alternatives textuelles.
- **Internationalisation** : français au lancement ; structure permettant d'ajouter des langues plus tard sans refonte, sans l'implémenter au MVP.

---

## 10. Identité visuelle — logo et mascotte

- **Logo** : pictogramme minimaliste noir/blanc — un personnage courant au sommet d'une courbe ascendante, brandissant un drapeau étoilé. Usages : favicon, logo du header, OG image, écran de chargement.
- **Mascotte** : même personnage en pose de victoire. Usages : états vides, onboarding, pages d'erreur, badges/jalons, bloc newsletter.

Fil narratif à filer dans les micro-textes : la métaphore de l'ascension et du sommet (« nouveaux sommets », « en route vers le zenith »).

> ⚠️ **À faire** : déposer les deux visuels dans `apps/web/public/brand/` (`logo.svg` ou `logo.png`, `mascotte.png`). Tant qu'ils sont absents, le header et les états vides utilisent un chevron géométrique neutre — un placeholder assumé, qui ne prétend pas reproduire l'identité. Voir `LogoMark` dans `apps/web/components/Header.tsx` et `AscentMark` dans `packages/ui/src/EmptyState.tsx`.
>
> *(Nom de la mascotte à valider : « Zeni » ou « Cimo » — point ouvert, non bloquant.)*

---

## 11. Méthode de travail

- Poser les questions de cadrage avant d'implémenter plutôt que trancher silencieusement.
- En cas de conflit entre ce document et une contrainte déjà en place dans le code, signaler le conflit plutôt que choisir seul.
- Ce document est la référence produit globale ; il complète les prompts ciblés des tâches en cours.

---

## État d'avancement

### Livré

| Élément | Emplacement |
|---|---|
| Monorepo Turborepo + Bun, TypeScript strict | racine, `packages/config` |
| Couche d'adaptateurs (§4) avec interface commune | `packages/data/src/types.ts`, `registry.ts` |
| Cache TTL 5 min + déduplication des appels concurrents | `packages/data/src/cache.ts` |
| Limitation de débit à fenêtre glissante, gestion des 429 | `packages/data/src/http.ts` |
| Adaptateur CoinGecko (crypto) — sans clé, clé optionnelle | `packages/data/src/providers/coingecko.ts` |
| Adaptateur Frankfurter/BCE (forex) — sans clé | `packages/data/src/providers/frankfurter.ts` |
| Design system crème/orange, contrastes AA | `apps/web/app/globals.css` |
| Header centré (§7) | `apps/web/components/Header.tsx` |
| Accueil : stats globales, tendances, gainers/losers, forex, couverture, watchlist vide | `apps/web/app/page.tsx` |
| Classement crypto : tri serveur, pagination, sparklines | `apps/web/app/crypto/page.tsx` |
| Page 404 | `apps/web/app/not-found.tsx` |

### Décisions prises

- **Thème clair crème/orange** confirmé (et non le thème sombre d'AniList).
- **QuestDB, Dragonfly, BullMQ, Docker différés** jusqu'à l'ingestion planifiée. Le cache mémoire actuel implémente `CacheStore` : la bascule vers Dragonfly ne touchera qu'un point d'instanciation.
- **Tri par variation non exposé** sur le classement : CoinGecko ne sait pas trier par variation à l'échelle du marché, et trier une page de 50 lignes ressemblerait à un classement global sans en être un. Les plus fortes hausses/baisses sont calculées sur un univers explicitement annoncé (250 plus grandes capitalisations).

### Reste à faire — par ordre logique

1. Page de détail d'un actif (§3.3) — à concevoir avec une 2ᵉ classe d'actif en tête pour ne pas figer le template.
2. Recherche universelle.
3. Clerk + Turso/Drizzle → watchlist réellement persistée.
4. Adaptateur Twelve Data (actions/ETF/indices), puis Alpha Vantage (matières premières).
5. SEO : sitemap dynamique, JSON-LD par type d'actif.
6. Dragonfly + QuestDB + BullMQ quand l'ingestion d'historique OHLC démarre.
7. Heatmap sectorielle, convertisseur, comparateur, calendrier, actualités.


### Livré

| Élément | Emplacement |
|---|---|
| Monorepo Turborepo + Bun, TypeScript strict | racine, `packages/config` |
| Couche d'adaptateurs avec interface commune (§4) | `packages/data/src/types.ts`, `registry.ts` |
| Cache à TTL étagés + déduplication des appels concurrents | `packages/data/src/cache.ts`, `queries.ts` |
| Limitation de débit à fenêtre glissante, gestion des 429 | `packages/data/src/http.ts` |
| **CoinGecko** — crypto : classements, fiches, historiques, catégories, tendances | `providers/coingecko.ts` |
| **Frankfurter/BCE** — devises, sans clé | `providers/frankfurter.ts` |
| **Yahoo Finance** — actions, ETF, matières premières, indices, sans clé | `providers/yahoo.ts` |
| **RSS** — actualités (Cointelegraph, CoinDesk) | `providers/news.ts` |
| **Alternative.me** — indice Fear & Greed | `providers/sentiment.ts` |
| Design system clair crème/orange **+ thème sombre type AniList** | `apps/web/app/globals.css` |
| Bascule de thème, suivi système, sans flash au chargement | `components/ThemeScript.tsx`, `ThemeToggle.tsx` |
| Header centré avec 4 menus déroulants accessibles | `components/NavBar.tsx`, `content/navigation.ts` |
| Logo et mascotte en masque CSS (suivent le thème) | `public/brand/`, `.brand-mark` |
| Favicon simplifié, lisible à 16 px | `app/icon.svg` |
| Accueil : synthèse, tendances, hausses/baisses, narratifs, actus, sentiment | `app/page.tsx`, `components/home/` |
| Six classements + six fiches d'actif façon Kraken | `app/{crypto,devises,actions,etf,matieres-premieres,indices}/` |
| Catégories, actualités, sentiment, mouvements | `app/{categories,actualites,sentiment}/` |
| Titres d'onglet « Zenith \| Page » | `app/layout.tsx` |

### Contraintes externes mesurées

- **CoinGecko sans clé plafonne à ~5 requêtes/minute** (salve de 40 requêtes : 5 succès puis 429).
  L'accueil a été ramené de 8 à 5 appels et les fiches de 3 à 2 pour tenir dans ce budget.
  Une clé Demo gratuite porte le plafond à 30/min et devient nécessaire dès qu'un robot
  d'indexation parcourt plusieurs fiches d'affilée (§9). Voir `.env.example`.
- **Yahoo Finance est un endpoint non officiel** : il exige un User-Agent de navigateur et
  peut fermer sans préavis. `v7/quote` (requêtes groupées) est déjà fermé, d'où une requête
  par symbole. Le registre place les fournisseurs sous clé AVANT lui : écrire l'adaptateur
  Twelve Data ou Finnhub le remplace sans toucher aux pages.

### Décisions prises

- **Thème clair par défaut, sombre disponible**, préférence système respectée au premier chargement.
- **Widgets CoinGecko reconstruits nativement** plutôt qu'embarqués : les widgets officiels sont
  des iframes non thémables, chargent du JavaScript tiers et ne suivraient pas le mode sombre.
- **Panneau « Tendances » sans colonne de prix** : la source ne cote qu'en dollars et un second
  appel dépasserait le quota. Rang et variation sont réellement publiés en euros, le prix non.
- **QuestDB, Dragonfly, BullMQ, Docker différés** jusqu'à l'ingestion planifiée.

### Reste à faire

1. Recherche universelle.
2. Clerk + Turso/Drizzle → watchlist réellement persistée.
3. Adaptateurs Twelve Data / Finnhub pour sortir de la dépendance à Yahoo.
4. SEO : sitemap dynamique, JSON-LD par type d'actif.
5. Comparateur, convertisseur, screener, heatmap sectorielle, calendrier économique.
6. Dragonfly + QuestDB + BullMQ quand l'ingestion d'historique OHLC démarre.
