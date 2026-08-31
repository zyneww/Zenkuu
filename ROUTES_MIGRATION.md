# Correspondance des routes — ZENKUU → CoinGecko

Régénéré le 2026-08-31, audit complet (68/68). ZENKUU : 65 routes.

La correspondance se fait par le RÔLE de la page, pas par la ressemblance des URL.

> **26 redirections sont posées** depuis les chemins de la référence vers leurs
> équivalents ZENKUU — voir `redirects()` dans `apps/web/next.config.ts`. Elles ne
> couvrent QUE les chemins dont l'équivalent existe : rediriger vers une page qui ne
> répond pas à la demande serait pire qu'un 404.

## 1. Routes ZENKUU avec équivalent

| Route ZENKUU | Équivalent | Audité |
|---|---|---|
| `/` | `/` | ✅ |
| `/a-propos` | `/about` | ✅ |
| `/actions` | `/stocks` | ✅ |
| `/actions/[id]` | `/stocks/nvidia` | ✅ |
| `/actualites` | `/news` | ✅ |
| `/aide` | `/faq` | ✅ |
| `/aide/[slug]` | `/faq` | ✅ |
| `/aide/rubrique/[id]` | `/faq` | ✅ |
| `/apprendre` | `/learn` | ✅ |
| `/apprendre/[slug]` | `/learn/crypto-narratives` | ✅ |
| `/blog` | `/publications/reports` | ✅ |
| `/blog/[slug]` | `/publications/reports` | ✅ |
| `/categories` | `/categories` | ✅ |
| `/categories/[id]` | `/categories/meme-token` | ✅ |
| `/categories/ecosystemes` | `/chains` | ✅ |
| `/classements` | `/highlights` | ✅ |
| `/classements/[type]` | `/crypto-gainers-losers` | ✅ |
| `/comparateur` | `/compare-cryptocurrencies` | ✅ |
| `/convertisseur` | `/converter` | ✅ |
| `/crypto` | `/all-cryptocurrencies` | ✅ |
| `/crypto/[id]` | `/coins/bitcoin` | ✅ |
| `/crypto/[id]/halving` | `/coins/bitcoin/bitcoin-halving` | ✅ |
| `/crypto/[id]/historique` | `/coins/bitcoin/historical_data` | ✅ |
| `/derives` | `/exchanges/derivatives` | ✅ |
| `/devises` | `/currencies/eur` | ✅ |
| `/devises/[id]` | `/currencies/eur` | ✅ |
| `/embed/graphique` | `/widget` | ✅ |
| `/embed/ticker` | `/widget` | ✅ |
| `/etf` | `/etfs` | ✅ |
| `/etf/[id]` | `/etfs/spdr-s-p-500-etf-trust` | ✅ |
| `/glossaire` | `/glossary` | ✅ |
| `/graphiques` | `/charts` | ✅ |
| `/graphiques/actifs-reels` | `/charts/rwa` | ✅ |
| `/graphiques/dominance` | `/charts/bitcoin-dominance` | ✅ |
| `/graphiques/nft` | `/nft` | ✅ |
| `/graphiques/tresoreries` | `/treasuries` | ✅ |
| `/heatmap` | `/charts/crypto-heatmap` | ✅ |
| `/matieres-premieres` | `/commodities` | ✅ |
| `/matieres-premieres/[id]` | `/commodities/gold` | ✅ |
| `/nouveautes` | `/highlights/upcoming-cryptocurrencies` | ✅ |
| `/nouvelles-cotations` | `/new-cryptocurrencies` | ✅ |
| `/perpetuels` | `/exchanges/derivatives/decentralized` | ✅ |
| `/places` | `/exchanges` | ✅ |
| `/places/[id]` | `/platesformes/binance` | ⬜ |
| `/resoudre/[terme]` | `/glossary/blockchain` | ✅ |
| `/tableau-de-bord` | `/portfolio` | ✅ |

## 2. Routes ZENKUU sans équivalent

Chacune avec sa raison. Aucune n'est un oubli : ce sont des fonctions que la
référence n'a pas, ou des pages de compte qu'elle traite en modale.

| Route ZENKUU | Pourquoi |
|---|---|
| `/actions/[id]/metriques/[metrique]` | Page de métrique : motif propre à ZENKUU, sans équivalent |
| `/bien-demarrer` | Contenu éditorial propre à ZENKUU |
| `/connexion` | Compte : la référence ouvre une modale, pas une route dédiée |
| `/crypto/[id]/metriques/[metrique]` | Page de métrique : motif propre à ZENKUU, sans équivalent |
| `/devises/[id]/metriques/[metrique]` | Page de métrique : motif propre à ZENKUU, sans équivalent |
| `/etf/[id]/metriques/[metrique]` | Page de métrique : motif propre à ZENKUU, sans équivalent |
| `/graphiques/saison-altcoins` | Fonction ZENKUU sans équivalent relevé |
| `/indices` | Fonction ZENKUU sans équivalent relevé |
| `/indices/[id]` | Idem |
| `/indices/[id]/metriques/[metrique]` | Page de métrique : motif propre à ZENKUU, sans équivalent |
| `/inscription` | Compte : idem, modale sans route propre |
| `/macro` | Fonction ZENKUU sans équivalent relevé |
| `/matieres-premieres/[id]/metriques/[metrique]` | Page de métrique : motif propre à ZENKUU, sans équivalent |
| `/parametres` | Compte : réglages, aucune page publique équivalente |
| `/pool/[network]/[address]` | Pool DEX : la référence le traite sur GeckoTerminal, hors périmètre |
| `/pourquoi-zenkuu` | Contenu éditorial propre à ZENKUU (identité du site) |
| `/rachats` | Fonction ZENKUU sans équivalent relevé |
| `/screener` | Fonction ZENKUU sans équivalent relevé sur les 68 pages |
| `/sentiment` | Fonction ZENKUU sans équivalent relevé |

## 3. Pages de la référence sans route ZENKUU

Les pages à créer pour que l'arborescence soit complète. **La moitié est bloquée**
par une donnée hors de portée — voir `MIGRATION_RAPPORT.md`, section « Bloqué ».

| Page | Rôle |
|---|---|
| `/top-market-cap-rehypothecated` | Accueil, classement rehypothéqué |
| `/coins/bitcoin/prediction` | Page coin, onglet Prédiction |
| `/exchanges/decentralized` | Exchanges, DEX |
| `/exchanges/binance` | Page d'exchange |
| `/highlights/trending-crypto` | Tendances |
| `/highlights/most-viewed-crypto` | Highlights, les plus consultées |
| `/highlights/high-volume` | Highlights, volume élevé |
| `/highlights/incoming-token-unlocks` | Highlights, déblocages de jetons à venir |
| `/chains/ethereum` | Page de chaîne |
| `/nft/chains/ethereum` | NFT par chaîne |
| `/nft/bored-ape-yacht-club` | Page de collection NFT (floor price) |
| `/rwa` | RWA |
| `/treasuries/companies` | Trésoreries, entreprises |
| `/treasuries/governments` | Trésoreries, États |
| `/research` | Perspectives Recherche |
| `/api` | Page API |
| `/api/dex` | API DEX |
| `/api/nft` | API NFT |
| `/api/pricing` | Tarifs API |
| `/api/case-studies` | Études de cas API |
| `/methodology` | Méthodologie |
| `/candy` | Candy (récompenses) |
| `/mobile` | Application mobile |
| `/premium/pricing` | Tarifs Premium |
