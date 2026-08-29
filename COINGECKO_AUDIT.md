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

- [ ] Accueil — `/fr`
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

**Watchlist — sans route publique vérifiable.** `/fr/watchlist`, `/en/watchlist`,
`/watchlist`, `/fr/watchlists` et `/fr/my-watchlist` répondent tous 404 (constaté par
`curl -I` et `curl -L`, backend CoinGecko réel — en-tête `x-runtime` présent, pas un
artefact de CDN). Le mot « watchlist » n'apparaît nulle part dans le HTML rendu de
l'accueil, de la page coin Bitcoin ou de `/fr/portfolio`. Le bouton étoile de la page coin
(`data-controller="coin-favorites"`, action `handleCoinFavourites`) est la fonction
équivalente aujourd'hui, et elle est repliée dans le Portefeuille (nav : « Mes Monnaies »
→ `/fr/portfolio`) plutôt que dans une page dédiée. Auditée comme composant de l'entrée
Portefeuille, pas comme page séparée.

**`/fr/api/case-studies` — redirection 302 vers `/en/api/case-studies`.** Contenu non
traduit en français, comme `/en/glossary` et `/learn`.

## Entrées

## Synthèse — données sans source gratuite

Rassemblée au fil de l'audit à partir du champ « Données requises » de chaque entrée.
Posée en question à l'exploitant à la fin du sous-projet A.

| Donnée | Pages concernées | Source CoinGecko | Équivalent gratuit |
|---|---|---|---|
