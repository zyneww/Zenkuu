/**
 * Univers de symboles suivis par l'adaptateur Yahoo.
 *
 * Pourquoi une liste écrite à la main ? Parce que Yahoo n'expose aucun endpoint
 * « lister tous les actifs » : on ne peut interroger qu'un symbole à la fois. Toute
 * page de classement suppose donc un univers défini en amont. C'est une contrainte
 * de la source, pas un choix de conception — le jour où l'on passe à Twelve Data ou
 * Finnhub, qui exposent de vrais listings, ce fichier disparaît.
 *
 * Le choix des valeurs est orienté lecteur francophone : le CAC 40 et les grandes
 * européennes figurent aux côtés des mégacapitalisations américaines, là où un site
 * anglo-saxon n'afficherait que ces dernières.
 */

import type { AssetClass } from '../types'

export interface UniverseEntry {
  /** Symbole Yahoo, encodé tel quel dans l'URL. */
  symbol: string
  /** Libellé affiché — Yahoo renvoie parfois des noms tronqués ou en majuscules. */
  name: string
}

export const YAHOO_UNIVERSE: Record<
  Extract<AssetClass, 'stock' | 'etf' | 'commodity' | 'index'>,
  UniverseEntry[]
> = {
  stock: [
    { symbol: 'AAPL', name: 'Apple' },
    { symbol: 'MSFT', name: 'Microsoft' },
    { symbol: 'NVDA', name: 'NVIDIA' },
    { symbol: 'AMZN', name: 'Amazon' },
    { symbol: 'GOOGL', name: 'Alphabet' },
    { symbol: 'META', name: 'Meta Platforms' },
    { symbol: 'TSLA', name: 'Tesla' },
    { symbol: 'JPM', name: 'JPMorgan Chase' },
    { symbol: 'V', name: 'Visa' },
    { symbol: 'XOM', name: 'ExxonMobil' },
    { symbol: 'MC.PA', name: 'LVMH' },
    { symbol: 'OR.PA', name: 'L’Oréal' },
    { symbol: 'TTE.PA', name: 'TotalEnergies' },
    { symbol: 'AIR.PA', name: 'Airbus' },
    { symbol: 'SAN.PA', name: 'Sanofi' },
    { symbol: 'BNP.PA', name: 'BNP Paribas' },
    { symbol: 'ASML.AS', name: 'ASML' },
    { symbol: 'SAP.DE', name: 'SAP' },
  ],

  etf: [
    { symbol: 'SPY', name: 'SPDR S&P 500' },
    { symbol: 'QQQ', name: 'Invesco QQQ (Nasdaq 100)' },
    { symbol: 'VOO', name: 'Vanguard S&P 500' },
    { symbol: 'VTI', name: 'Vanguard Total Stock Market' },
    { symbol: 'IWM', name: 'iShares Russell 2000' },
    { symbol: 'EEM', name: 'iShares Marchés émergents' },
    { symbol: 'GLD', name: 'SPDR Gold Shares' },
    { symbol: 'AGG', name: 'iShares Core US Aggregate Bond' },
    { symbol: 'IWDA.AS', name: 'iShares Core MSCI World (UCITS)' },
    { symbol: 'VWCE.DE', name: 'Vanguard FTSE All-World (UCITS)' },
  ],

  commodity: [
    { symbol: 'GC=F', name: 'Or' },
    { symbol: 'SI=F', name: 'Argent' },
    { symbol: 'PL=F', name: 'Platine' },
    { symbol: 'HG=F', name: 'Cuivre' },
    { symbol: 'CL=F', name: 'Pétrole WTI' },
    { symbol: 'BZ=F', name: 'Pétrole Brent' },
    { symbol: 'NG=F', name: 'Gaz naturel' },
    { symbol: 'ZW=F', name: 'Blé' },
    { symbol: 'ZC=F', name: 'Maïs' },
    { symbol: 'KC=F', name: 'Café' },
    { symbol: 'SB=F', name: 'Sucre' },
    { symbol: 'CC=F', name: 'Cacao' },
  ],

  index: [
    { symbol: '^FCHI', name: 'CAC 40' },
    { symbol: '^GSPC', name: 'S&P 500' },
    { symbol: '^DJI', name: 'Dow Jones Industrial' },
    { symbol: '^IXIC', name: 'Nasdaq Composite' },
    { symbol: '^GDAXI', name: 'DAX' },
    { symbol: '^FTSE', name: 'FTSE 100' },
    { symbol: '^STOXX50E', name: 'Euro Stoxx 50' },
    { symbol: '^N225', name: 'Nikkei 225' },
    { symbol: '^HSI', name: 'Hang Seng' },
    { symbol: '^VIX', name: 'VIX (volatilité)' },
  ],
}

/** Retrouve une entrée depuis un identifiant d'URL (symbole en minuscules, sans caractère spécial). */
export function findUniverseEntry(
  slug: string,
): { entry: UniverseEntry; assetClass: AssetClass } | null {
  for (const [assetClass, entries] of Object.entries(YAHOO_UNIVERSE)) {
    const entry = entries.find((candidate) => toSlug(candidate.symbol) === slug)
    if (entry) return { entry, assetClass: assetClass as AssetClass }
  }
  return null
}

/**
 * Transforme un symbole Yahoo en fragment d'URL propre.
 *
 * Les symboles bruts contiennent `^`, `=` et `.` — caractères qui exigeraient un
 * encodage systématique et donneraient des URLs illisibles du type `/indices/%5EFCHI`.
 * On les normalise donc : `^FCHI` → `fchi`, `GC=F` → `gc-f`, `MC.PA` → `mc-pa`.
 */
export function toSlug(symbol: string): string {
  return symbol
    .toLowerCase()
    .replace(/[\^]/g, '')
    .replace(/[=.]/g, '-')
}
