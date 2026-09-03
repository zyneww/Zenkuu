import type { AssetClass, AssetTicker } from '@zenkuu/data'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * DU SYMBOLE DE NOTRE SOURCE À CELUI DE TRADINGVIEW
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── POURQUOI CETTE TRADUCTION EXISTE ────────────────────────────────────────
 *
 * L'interrupteur « Original / TradingView » de la barre d'outils était réservé à la
 * crypto, et la raison n'était pas un choix de produit : le symbole était construit en
 * dur comme `BINANCE:{SYM}USDT`, ce qui n'a de sens que pour un jeton. Sur une action,
 * une matière première ou un indice, la formule aurait produit `BINANCE:GC=FUSDT` —
 * un symbole que TradingView ne connaît pas, donc un cadre vide portant « Ce symbole
 * n'existe pas ».
 *
 * Le moteur externe est donc offert partout où l'on sait NOMMER l'actif chez lui, et
 * nulle part ailleurs. C'est la seule règle : mieux vaut un interrupteur absent qu'un
 * interrupteur qui ouvre un graphique vide.
 *
 * ── LES QUATRE FAÇONS DE TRADUIRE, ET LEUR DEGRÉ DE CERTITUDE ───────────────
 *
 * 1. CRYPTO — LU DANS LES COTATIONS DE L'ACTIF, plus deviné.
 *
 *    ⚠️ CE CAS RENDAIT `BINANCE:{SYM}USDT` ET C'ÉTAIT UNE SUPPOSITION, ce que cette
 *    note assumait : « un jeton non coté chez Binance ne résout pas ». Le défaut est
 *    plus large qu'il n'y paraissait — Binance ne cote qu'une fraction des actifs de
 *    notre univers, et pour tous les autres l'interrupteur « TradingView » était offert
 *    puis ouvrait un cadre vide portant « Ce symbole n'existe pas ». Relevé au
 *    navigateur sur `/crypto/hyperliquid`, dixième capitalisation du marché : HYPE se
 *    négocie sur KuCoin, OKX, Coinbase, Kraken et Bitget, et sur aucun d'eux Binance.
 *
 *    La fiche connaît pourtant la réponse : elle charge la TABLE DES PLACES, qui dit
 *    exactement où l'actif se négocie et pour quel volume. On y prend la place la plus
 *    active parmi celles que TradingView cote (`TV_EXCHANGES`), et l'on écrit son
 *    symbole. Ce n'est plus une supposition sur l'EXISTENCE du marché — seul le
 *    préfixe de place reste une correspondance, et la table ne contient que des places
 *    vérifiées chez TradingView.
 *
 *    Sans cotations — la table a sa propre requête, elle peut échouer — on rend `null`
 *    et l'interrupteur disparaît. C'est la règle du fichier : mieux vaut pas de bouton
 *    qu'un bouton qui ouvre un cadre vide.
 *
 * 2. ACTIONS ET ETF — le ticker nu. TradingView résout `NVDA` ou `SPY` sans préfixe de
 *    place. Le seul écart de graphie est le TIRET des actions à catégories multiples :
 *    Yahoo écrit `BRK-B`, TradingView `BRK.B`.
 *
 * 3. DEVISES — dérivé. Yahoo suffixe ses paires en `=X` ; les retirer donne exactement
 *    le symbole TradingView, préfixé `FX:`.
 *
 * 4. MATIÈRES PREMIÈRES ET INDICES — une TABLE, et il n'y avait pas d'alternative. Les
 *    codes Yahoo (`GC=F`, `^GSPC`) ne se dérivent pas : le premier désigne un contrat
 *    générique dont TradingView nomme l'échéance courante `GC1!` et qu'il rattache à sa
 *    place de cotation, le second est une convention propre à Yahoo. Les deux univers
 *    sont FERMÉS et courts — douze contrats, huit indices, écrits au dépôt dans
 *    `yahoo-universe.ts` — ce qui rend la table tenable et vérifiable.
 *
 * ⚠️ UN SYMBOLE ABSENT DE LA TABLE REND `null`, ET C'EST LE COMPORTEMENT VOULU.
 * L'interrupteur disparaît alors de la barre pour cet actif. Ajouter une matière
 * première à l'univers sans l'ajouter ici ne casse rien — elle perd seulement l'accès
 * au moteur externe, ce qui se corrige en une ligne.
 */

/**
 * Places de cotation crypto : identifiant CoinGecko → préfixe TradingView.
 *
 * ── CE QUI EST DEDANS, ET CE QUI N'Y EST PAS ─────────────────────────────────
 *
 * Les plateformes CENTRALISÉES dont TradingView publie les paires. Chaque entrée a été
 * vérifiée chez lui : un préfixe inventé produirait exactement le cadre vide que cette
 * table existe pour supprimer.
 *
 * Les plateformes DÉCENTRALISÉES en sont absentes, et ce n'est pas un oubli. TradingView
 * les indexe par ADRESSE DE CONTRAT et par réseau, pas par couple place/paire ; la
 * cotation d'un pool ne se déduit donc pas de ce que notre source publie. Une fiche dont
 * toutes les places sont des DEX perd l'interrupteur, ce qui est le comportement voulu.
 *
 * ⚠️ AJOUTER UNE ENTRÉE SANS L'AVOIR VÉRIFIÉE CHEZ TRADINGVIEW RÉINTRODUIT LE DÉFAUT.
 * La table est courte exprès : elle couvre les places qui portent l'essentiel du volume,
 * et une place absente fait simplement retomber le choix sur la suivante.
 */
const TV_EXCHANGES: Record<string, string> = {
  binance: 'BINANCE',
  binanceus: 'BINANCEUS',
  gdax: 'COINBASE',
  kraken: 'KRAKEN',
  bitstamp: 'BITSTAMP',
  bitfinex: 'BITFINEX',
  gemini: 'GEMINI',
  okex: 'OKX',
  bybit_spot: 'BYBIT',
  kucoin: 'KUCOIN',
  gate: 'GATEIO',
  bitget: 'BITGET',
  mxc: 'MEXC',
  htx: 'HTX',
  crypto_com: 'CRYPTOCOM',
  bingx: 'BINGX',
  upbit: 'UPBIT',
  bithumb: 'BITHUMB',
  poloniex: 'POLONIEX',
  whitebit: 'WHITEBIT',
  bitmart: 'BITMART',
  coinex: 'COINEX',
  phemex: 'PHEMEX',
  bitrue: 'BITRUE',
}

/**
 * Devises de cotation retenues, de la plus souhaitable à la moins.
 *
 * L'ordre porte un arbitrage : un graphique en USDT est ce que regarde le marché, un
 * graphique en euros ou en bitcoin raconte une autre histoire (la paire y mêle deux
 * variations). On préfère donc le dollar sous toutes ses formes, et l'on renonce
 * plutôt que de tracer une paire exotique.
 */
const TV_QUOTES = ['USDT', 'USD', 'USDC']

/**
 * La meilleure paire cotée pour cet actif, en notation TradingView.
 *
 * « Meilleure » se lit dans cet ordre : la devise de cotation d'abord (voir
 * `TV_QUOTES`), le VOLUME ensuite. La devise passe devant parce qu'un graphique en
 * USDT sur une petite place reste lisible, là qu'un graphique en BTC sur une grosse
 * place trace autre chose que le cours de l'actif.
 */
function fromTickers(tickers: readonly AssetTicker[]): string | null {
  let best: { rank: number; volume: number; symbol: string } | null = null

  for (const ticker of tickers) {
    const exchange = ticker.exchangeId ? TV_EXCHANGES[ticker.exchangeId] : undefined
    if (!exchange) continue

    const quote = ticker.target.toUpperCase()
    const rank = TV_QUOTES.indexOf(quote)
    if (rank === -1) continue

    const volume = ticker.volume24h ?? 0
    if (best && (best.rank < rank || (best.rank === rank && best.volume >= volume))) continue

    best = { rank, volume, symbol: `${exchange}:${ticker.base.toUpperCase()}${quote}` }
  }

  return best?.symbol ?? null
}

/** Contrats à terme : place de cotation + échéance courante, notation TradingView. */
const COMMODITIES: Record<string, string> = {
  'GC=F': 'COMEX:GC1!',
  'SI=F': 'COMEX:SI1!',
  'HG=F': 'COMEX:HG1!',
  'PL=F': 'NYMEX:PL1!',
  'CL=F': 'NYMEX:CL1!',
  'BZ=F': 'NYMEX:BZ1!',
  'NG=F': 'NYMEX:NG1!',
  'ZW=F': 'CBOT:ZW1!',
  'ZC=F': 'CBOT:ZC1!',
  'KC=F': 'ICEUS:KC1!',
  'SB=F': 'ICEUS:SB1!',
  'CC=F': 'ICEUS:CC1!',
}

/** Indices : chaque place nomme le sien à sa façon, aucune règle ne s'en déduit. */
const INDICES: Record<string, string> = {
  '^GSPC': 'SP:SPX',
  '^DJI': 'DJ:DJI',
  '^IXIC': 'NASDAQ:IXIC',
  '^FCHI': 'EURONEXT:PX1',
  '^GDAXI': 'XETR:DAX',
  '^FTSE': 'FTSE:UKX',
  '^STOXX50E': 'STOXX:SX5E',
  '^N225': 'TVC:NI225',
}

/**
 * Le symbole TradingView de cet actif, ou `null` si on ne sait pas le nommer.
 *
 * @param symbol Le symbole tel que NOTRE source l'écrit — jamais un libellé affiché.
 * @param tickers Les places qui cotent l'actif. Indispensable pour la crypto, ignoré
 *   pour les cinq autres classes, qui se nomment sans elles. Voir le cas 1 de l'en-tête.
 */
/**
 * ══════════════════════════════════════════════════════════════════════════════
 * LA CAPITALISATION A SON PROPRE SYMBOLE, ET SEULEMENT EN CRYPTO
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * TradingView trace un SYMBOLE, pas une grandeur : lui demander « la capitalisation de
 * Bitcoin » n'a de sens que s'il existe un symbole qui la cote. Il en existe un, et un
 * seul jeu — `CRYPTOCAP:BTC`, `CRYPTOCAP:ETH` — que TradingView calcule lui-même.
 *
 * ⚠️ IL N'Y A AUCUN ÉQUIVALENT AILLEURS. Ni pour les actions, ni pour les ETF, les
 * indices, les devises ou les matières premières : la capitalisation d'une entreprise
 * n'est pas un instrument coté. La barre grise donc son sélecteur sur ces classes
 * pendant que le moteur externe a la main, plutôt que de proposer un choix qui ne
 * changerait rien — voir `AssetWorkspace`.
 *
 * Le symbole est bâti sur le CODE de l'actif et non sur ses places de cotation : c'est
 * un agrégat mondial, il n'appartient à aucune bourse. Un code que TradingView ne
 * couvre pas affiche son propre message dans le cadre, comme pour tout symbole inconnu
 * — la limite est la même que celle décrite dans `TradingViewChart`.
 */
export function tradingViewMarketCapSymbol(
  assetClass: AssetClass,
  symbol: string,
): string | null {
  if (assetClass !== 'crypto') return null
  const raw = symbol.trim().toUpperCase()
  /* Le jeu `CRYPTOCAP` n'emploie que des lettres et des chiffres. Un code portant un
     tiret ou un point n'y figure pas, et le préfixer produirait un symbole introuvable
     plutôt qu'un `null` franc. */
  return /^[A-Z0-9]{1,12}$/.test(raw) ? `CRYPTOCAP:${raw}` : null
}

export function tradingViewSymbol(
  assetClass: AssetClass,
  symbol: string,
  tickers: readonly AssetTicker[] = [],
): string | null {
  const raw = symbol.trim()
  if (!raw) return null

  if (assetClass === 'crypto') return fromTickers(tickers)

  if (assetClass === 'stock' || assetClass === 'etf') {
    /* `BRK-B` → `BRK.B`. Le tiret ne sépare une catégorie d'action que chez Yahoo ;
       partout ailleurs, y compris chez TradingView, c'est un point. */
    return raw.toUpperCase().replace('-', '.')
  }

  if (assetClass === 'forex') {
    /* `EURUSD=X` → `FX:EURUSD`. Le suffixe est le seul écart, et il est constant. */
    const pair = raw.toUpperCase().replace(/=X$/, '')
    return /^[A-Z]{6}$/.test(pair) ? `FX:${pair}` : null
  }

  if (assetClass === 'commodity') return COMMODITIES[raw.toUpperCase()] ?? null
  if (assetClass === 'index') return INDICES[raw.toUpperCase()] ?? null

  /* `nft` : déclaré dans le domaine, alimenté par aucune source, et TradingView ne
     cote pas de collections. Rien à traduire. */
  return null
}
