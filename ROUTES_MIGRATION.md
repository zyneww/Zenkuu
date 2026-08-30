# Correspondance des routes — ZENKUU → CoinGecko

Établi le 2026-08-30. ZENKUU : 62 routes. CoinGecko : 68 pages, 65 chemins distincts.

La correspondance se fait par le RÔLE de la page, pas par la ressemblance des URL.
Ce document ne décide rien : il rend la décision visible, page par page.

> ⚠️ Aucune redirection n'est encore posée. Renommer une route casse les liens
> internes et les URL déjà partagées ; chaque bascule doit venir avec sa
> redirection depuis l'ancienne adresse.

## 1. Routes ZENKUU avec équivalent CoinGecko

| Route ZENKUU | Équivalent CoinGecko | Équivalent audité ? |
|---|---|---|
| `/` | `/` | ✅ audité |
| `/a-propos` | `/à_propos_de` | ⬜ non audité |
| `/actions` | `/stocks` | ⬜ non audité |
| `/actions/[id]` | `/stocks/nvidia` | ⬜ non audité |
| `/actualites` | `/news` | ⬜ non audité |
| `/aide` | `/faq` | ⬜ non audité |
| `/aide/[slug]` | `/faq` | ⬜ non audité |
| `/aide/rubrique/[id]` | `/faq` | ⬜ non audité |
| `/apprendre` | `/learn` | ⬜ non audité |
| `/apprendre/[slug]` | `/learn/crypto-narratives` | ✅ audité |
| `/blog` | `/publications/reports` | ⬜ non audité |
| `/blog/[slug]` | `/publications/reports` | ⬜ non audité |
| `/categories` | `/categories` | ✅ audité |
| `/categories/[id]` | `/categories/meme-token` | ✅ audité |
| `/categories/ecosystemes` | `/chains` | ⬜ non audité |
| `/classements` | `/highlights` | ⬜ non audité |
| `/classements/[type]` | `/highlights/trending-crypto` | ⬜ non audité |
| `/comparateur` | `/compare-cryptocurrencies` | ⬜ non audité |
| `/convertisseur` | `/converter` | ⬜ non audité |
| `/crypto` | `/all-cryptocurrencies` | ⬜ non audité |
| `/crypto/[id]` | `/coins/bitcoin` | ✅ audité |
| `/derives` | `/platesformes/derivatives` | ⬜ non audité |
| `/devises` | `/currencies/eur` | ⬜ non audité |
| `/devises/[id]` | `/currencies/eur` | ⬜ non audité |
| `/embed/graphique` | `/widget` | ⬜ non audité |
| `/embed/ticker` | `/widget` | ⬜ non audité |
| `/etf` | `/etfs` | ⬜ non audité |
| `/etf/[id]` | `/etfs/spdr-s-p-500-etf-trust` | ⬜ non audité |
| `/graphiques` | `/charts` | ✅ audité |
| `/graphiques/actifs-reels` | `/charts/rwa` | ⬜ non audité |
| `/graphiques/dominance` | `/charts/bitcoin-dominance` | ⬜ non audité |
| `/graphiques/nft` | `/nft` | ⬜ non audité |
| `/graphiques/tresoreries` | `/treasuries` | ⬜ non audité |
| `/heatmap` | `/charts/crypto-heatmap` | ⬜ non audité |
| `/matieres-premieres` | `/commodities` | ⬜ non audité |
| `/matieres-premieres/[id]` | `/commodities/gold` | ⬜ non audité |
| `/nouveautes` | `/highlights/upcoming-cryptocurrencies` | ⬜ non audité |
| `/nouvelles-cotations` | `/new-cryptocurrencies` | ⬜ non audité |
| `/places` | `/platesformes` | ✅ audité |
| `/places/[id]` | `/platesformes/binance` | ✅ audité |
| `/resoudre/[terme]` | `/glossary/blockchain` | ⬜ non audité |
| `/tableau-de-bord` | `/portefeuille` | ⬜ non audité |

## 2. Routes ZENKUU sans équivalent

Chacune est à trancher : transformer en page CoinGecko voisine, ou supprimer avec redirection.

| Route ZENKUU | Pourquoi aucun équivalent |
|---|---|
| `/actions/[id]/metriques/[metrique]` | Page de métrique : motif propre à ZENKUU |
| `/bien-demarrer` | Contenu éditorial propre à ZENKUU |
| `/connexion` | Compte : CoinGecko ouvre une modale, pas une route dédiée |
| `/crypto/[id]/metriques/[metrique]` | Page de métrique : motif propre à ZENKUU |
| `/devises/[id]/metriques/[metrique]` | Page de métrique : motif propre à ZENKUU |
| `/etf/[id]/metriques/[metrique]` | Page de métrique : motif propre à ZENKUU |
| `/graphiques/saison-altcoins` | Fonction ZENKUU sans équivalent CoinGecko relevé |
| `/indices` | Fonction ZENKUU sans équivalent CoinGecko relevé |
| `/indices/[id]` | Idem |
| `/indices/[id]/metriques/[metrique]` | Page de métrique : motif propre à ZENKUU |
| `/inscription` | Compte : idem, modale sans route propre |
| `/macro` | Fonction ZENKUU sans équivalent CoinGecko relevé |
| `/matieres-premieres/[id]/metriques/[metrique]` | Page de métrique : motif propre à ZENKUU |
| `/parametres` | Compte : réglages, pas de page publique équivalente relevée |
| `/perpetuels` | Proche de /platesformes/derivatives, à fusionner ou distinguer |
| `/pool/[network]/[address]` | Pool DEX : CoinGecko le traite sur GeckoTerminal, hors périmètre |
| `/pourquoi-zenkuu` | Contenu éditorial propre à ZENKUU (identité du site) |
| `/rachats` | Fonction ZENKUU sans équivalent CoinGecko relevé |
| `/screener` | Fonction ZENKUU sans équivalent CoinGecko relevé |
| `/sentiment` | Fonction ZENKUU sans équivalent CoinGecko relevé |

## 3. Pages CoinGecko sans route ZENKUU

Ce sont les pages à créer pour que l'arborescence soit complète.

| Page CoinGecko | Rôle | Audité ? |
|---|---|---|
| `/top-market-cap-rehypothecated` | Accueil, classement rehypothéqué | ⬜ |
| `/coins/bitcoin/historical_data` | Page coin, onglet Données historiques | ⬜ |
| `/coins/bitcoin/prediction` | Page coin, onglet Prédiction | ⬜ |
| `/platesformes/decentralized` | Exchanges, DEX | ⬜ |
| `/platesformes/derivatives/decentralized` | Exchanges, DEX perpétuels | ⬜ |
| `/crypto-gainers-losers` | Gagnants et perdants | ⬜ |
| `/highlights/all-time-high-crypto` | All-time high | ⬜ |
| `/highlights/most-viewed-crypto` | Highlights, les plus consultées | ⬜ |
| `/highlights/high-volume` | Highlights, volume élevé | ⬜ |
| `/highlights/incoming-token-unlocks` | Highlights, déblocages de jetons à venir | ⬜ |
| `/chains/ethereum` | Page de chaîne | ⬜ |
| `/nft/chains/ethereum` | NFT par chaîne | ⬜ |
| `/nft/bored-ape-yacht-club` | Page de collection NFT (floor price) | ⬜ |
| `/rwa` | RWA | ⬜ |
| `/treasuries/companies` | Trésoreries, entreprises | ⬜ |
| `/treasuries/governments` | Trésoreries, États | ⬜ |
| `/portfolio` | Portefeuille | ✅ |
| `/research` | Perspectives Recherche | ⬜ |
| `/glossary` | Glossaire | ⬜ |
| `/api` | Page API | ✅ |
| `/api/dex` | API DEX | ⬜ |
| `/api/nft` | API NFT | ⬜ |
| `/api/pricing` | Tarifs API | ⬜ |
| `/api/case-studies` | Études de cas API | ⬜ |
| `/coins/bitcoin/bitcoin-halving` | Page coin, onglet Halving | ⬜ |
| `/méthodologie` | Méthodologie | ⬜ |
| `/candy` | Candy (récompenses) | ⬜ |
| `/mobile` | Application mobile | ⬜ |
| `/premium/pricing` | Tarifs Premium | ⬜ |
