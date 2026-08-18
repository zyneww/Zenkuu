import type { Phrases } from '@/content/phrases'

/**
 * Phrase table — English.
 *
 * Keys are the French source strings; see `content/phrases.ts` for why. A missing key
 * falls back to French rather than to an empty string, so this file may grow one
 * section at a time without ever leaving a hole in a page.
 *
 * ── WHAT IS DELIBERATELY NOT TRANSLATED ───────────────────────────────────────
 *
 * `ZENKUU` is the product name and stays as it is in every language, capitals
 * included. Ticker symbols and provider names travel the same way.
 */
export const enPhrases: Phrases = {
  /* ── Navigation ─────────────────────────────────────────────────────────── */
  Parcourir: 'Browse',
  Données: 'Data',
  Analyse: 'Analysis',
  Actualités: 'News',
  Plus: 'More',

  Palmarès: 'Rankings',
  Classements: 'Rankings',
  'Le classement complet, page par page': 'The full ranking, page by page',
  'Nouvelles cryptomonnaies': 'New cryptocurrencies',
  'Les actifs référencés le plus récemment': 'The most recently listed assets',
  'Activité du marché': 'Market activity',
  'Places de cotation': 'Exchanges',
  'Où le marché s’échange, et avec quelle confiance':
    'Where the market trades, and how trustworthy each venue is',
  'Places de dérivés': 'Derivatives venues',
  'Où se portent les positions à effet de levier': 'Where leveraged positions sit',
  Nouveautés: 'What’s new',
  'Ce qui a changé récemment': 'What changed recently',

  Visualisations: 'Charts',
  'Graphiques globaux': 'Global charts',
  'Capitalisation, dominance, secteurs et trésoreries':
    'Market cap, dominance, sectors and treasuries',
  'Heatmap sectorielle': 'Sector heatmap',
  'Les secteurs en un coup d’œil': 'Sectors at a glance',
  Indicateurs: 'Indicators',
  'Indice de sentiment': 'Sentiment index',
  'Fear & Greed du marché crypto': 'Crypto market Fear & Greed',
  'Carte macroéconomique': 'Macroeconomic map',
  'Inflation, chômage, dette : l’état des économies':
    'Inflation, unemployment, debt: the state of economies',
  Outils: 'Tools',
  Screener: 'Screener',
  'Filtrer le marché sur vos critères': 'Filter the market on your own criteria',
  Comparateur: 'Comparator',
  'Deux à quatre actifs côte à côte': 'Two to four assets side by side',
  Convertisseur: 'Converter',
  'Conversion entre actifs et devises': 'Convert between assets and currencies',

  'Toute l’actualité': 'All news',
  Blog: 'Blog',
  'Le fil complet, toutes sources confondues': 'The full feed, all sources combined',
  'Analyses et coulisses du produit': 'Analysis and product behind-the-scenes',

  'Suivi du marché': 'Market tracking',
  'Ma liste de suivi': 'My watchlist',
  'Les actifs rattachés à votre compte': 'The assets attached to your account',
  'Mes alertes': 'My alerts',
  'Un courriel au franchissement d’un seuil de prix':
    'An email when a price threshold is crossed',
  'Mon compte': 'My account',
  'Liste de suivi, alertes et écrans, retrouvés partout':
    'Watchlist, alerts and screens, found everywhere',

  Apprendre: 'Learn',
  'Comprendre les marchés, pas à pas': 'Understanding markets, step by step',
  'Bien démarrer': 'Getting started',
  'Prendre en main ZENKUU en cinq minutes': 'Get to grips with ZENKUU in five minutes',
  'Centre d’aide': 'Help centre',
  'Questions fréquentes et assistance': 'Frequently asked questions and support',
  Ressources: 'Resources',
  'Méthodologie & sources': 'Methodology & sources',
  'D’où viennent nos chiffres, et à quelle fréquence':
    'Where our figures come from, and how often',
  'API & développeurs': 'API & developers',
  'Accéder aux données par programme': 'Access the data programmatically',
  ZENKUU: 'ZENKUU',
  'À propos': 'About',
  'Notre positionnement et nos limites': 'Our positioning and our limits',
  'Pourquoi ZENKUU': 'Why ZENKUU',
  'Nos partis pris, et ce qu’on refuse de faire':
    'The choices we made, and what we refuse to do',
  'Volumes et exposition, ou extrêmes du jour': 'Volumes and exposure, or the day’s extremes',

  /* ── Titres et chapeaux de page ─────────────────────────────────────────── */
  "Données de trading": "Trading data",
  "L’activité du marché crypto en quatre plans : les agrégats mondiaux, la répartition du volume entre les places, l’exposition sur les produits dérivés, puis les mouvements de la période.": "Crypto market activity from four angles: global aggregates, how volume is split across venues, exposure on derivatives, then the period’s movers.",
  "Points marquants": "Highlights",
  "Ce qui sort de l’ordinaire aujourd’hui : ce qu’on regarde, ce qui bouge, ce qui s’échange, ce qui apparaît.": "What stands out today: what people are watching, what is moving, what is trading, what is new.",
  "Comment les chiffres affichés sur ZENKUU sont collectés, vérifiés et présentés — et ce qu’ils ne disent pas.": "How the figures shown on ZENKUU are collected, checked and presented — and what they do not say.",
  "Classements crypto": "Crypto rankings",
  "Quatre palmarès à confronter : ce qui monte, ce qui baisse, ce qui s’échange le plus, et ce qui tourne le plus vite au regard de sa taille.": "Four rankings to compare: what is rising, what is falling, what trades most, and what turns over fastest relative to its size.",
  "Deux à six actifs côte à côte, toutes classes confondues : trajectoires ramenées à une base commune, puis les chiffres qui les séparent.": "Two to six assets side by side, across every class: paths rebased to a common start, then the figures that set them apart.",
  "Carte thermique du marché": "Market heatmap",
  "Le marché en un coup d’œil : la surface porte la capitalisation, la couleur porte la variation. Basculez entre les pièces et les secteurs, et cliquez un rectangle pour l’ouvrir.": "The market at a glance: area carries market cap, colour carries the change. Switch between coins and sectors, and click a rectangle to open it.",
  "Dérivés": "Derivatives",
  "Les contrats les plus actifs, leur intérêt ouvert et leur taux de financement. Un contrat perpétuel n’a pas d’échéance : son taux de financement est ce qui le raccroche au cours au comptant.": "The most active contracts, their open interest and their funding rate. A perpetual contract has no expiry: its funding rate is what tethers it to the spot price.",
  "Les trois cents actifs dont la source a relevé un cours pour la première fois le plus récemment, du plus récent au plus ancien. Ceux que nous suivons par ailleurs portent leur logo et mènent à leur fiche.": "The three hundred assets for which the source most recently recorded a first price, newest first. Those we also track carry their logo and link to their page.",
  "Paramètres": "Settings",
  "Vos réglages d’affichage, votre compte et l’origine des chiffres. ZENKUU n’exécute aucun ordre et ne détient aucun fonds : il n’y a ici ni moyen de paiement, ni limite de transaction, ni vérification d’identité — et rien à payer, le site n’ayant pas d’offre payante.": "Your display settings, your account and where the figures come from. ZENKUU executes no orders and holds no funds: there is no payment method here, no transaction limit and no identity check — and nothing to pay, since the site has no paid plan.",
  "Les places de contrats perpétuels, classées par l’exposition qu’elles portent réellement — l’intérêt ouvert — et non par le volume qu’elles affichent. ZENKUU ne référence aucun carnet d’ordres et ne permet aucune transaction : ce registre situe l’activité, il n’y donne pas accès.": "Perpetual-contract venues, ranked by the exposure they actually carry — open interest — rather than by the volume they report. ZENKUU lists no order book and enables no transaction: this register locates activity, it does not give access to it.",
  "Où s’échange le marché au comptant": "Where the spot market trades",
  "Les places d’échange classées par note de confiance, avec le volume qu’elles déclarent sur 24 heures et la part qu’il représente dans ce classement. ZENKUU ne référence aucun carnet d’ordres et ne permet aucune transaction : ce registre situe l’activité, il n’y donne pas accès.": "Exchanges ranked by trust score, with the volume they report over 24 hours and the share it represents in this ranking. ZENKUU lists no order book and enables no transaction: this register locates activity, it does not give access to it.",
  "Tableau de bord": "Dashboard",
  "Vos actifs suivis et vos préférences d’affichage. ZENKUU n’exécute aucun ordre et ne détient aucun fonds : il n’y a donc ici ni solde, ni portefeuille, ni performance — seulement ce que vous avez choisi de suivre.": "The assets you follow and your display preferences. ZENKUU executes no orders and holds no funds: there is no balance here, no portfolio and no performance — only what you have chosen to follow.",

  /* ── Compte ─────────────────────────────────────────── */
  "Se connecter": "Sign in",
  "Vérification…": "Verifying…",
}
