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

/**
 * Famille d'une matière première.
 *
 * Elle sert à TEINTER la pastille de l'actif : l'or et l'argent partagent un fond
 * doré, le pétrole et le gaz un fond ardoise, le blé et le café un fond vert. La
 * couleur porte donc une information — « de quelle nature est cette matière » — que
 * l'emoji seul ne donnerait qu'au prix d'un examen attentif.
 */
export type CommodityFamily = 'precious' | 'industrial' | 'energy' | 'agricultural'

export interface UniverseEntry {
  /** Symbole Yahoo, encodé tel quel dans l'URL. */
  symbol: string
  /** Libellé affiché — Yahoo renvoie parfois des noms tronqués ou en majuscules. */
  name: string

  /* ── Identité — ajoutée pour le logo, la pastille et le bloc descriptif ──────
   *
   * Ces champs vivent ICI plutôt que dans une table séparée, et c'est délibéré :
   * ce fichier est déjà la liste des actifs suivis. Une seconde liste des mêmes
   * actifs divergerait à la première valeur ajoutée — on l'inscrirait dans l'une
   * en oubliant l'autre, et le défaut ne se verrait qu'à l'affichage.
   *
   * Tous facultatifs : un actif qui n'en porte aucun se rend proprement, avec un
   * monogramme et sans bloc d'identité. Aucun n'est jamais deviné (§5).
   */

  /**
   * Domaine de l'émetteur, pour construire l'URL du logo.
   *
   * Un domaine et NON un ticker, parce qu'un ticker n'est unique qu'au sein d'une
   * place : `SAN` désigne Sanofi à Paris et Banco Santander à Madrid. Les
   * fournisseurs de logos indexent donc par domaine.
   *
   * Pour un ETF, c'est le domaine de la SOCIÉTÉ DE GESTION (SPY → ssga.com) : un
   * fonds n'a pas de site propre, et son gestionnaire est ce qui l'identifie.
   */
  domain?: string
  /** Secteur d'activité, tel qu'un lecteur le nommerait — pas une nomenclature. */
  sector?: string
  /** Pays du siège social, en toutes lettres et en français. */
  country?: string
  /** Place de cotation principale. */
  exchange?: string
  /** Matières premières uniquement — teinte de la pastille. */
  family?: CommodityFamily
  /**
   * Matières premières uniquement — l'icône elle-même.
   *
   * Un emoji plutôt qu'un pictogramme dessiné : le rendu diffère certes entre
   * Windows, macOS et Android, mais une matière première n'a ni logo ni identité
   * visuelle propre, et un jeu d'icônes sur mesure serait du travail de dessin pour
   * une information qu'un emoji transmet immédiatement.
   */
  emoji?: string
}

export const YAHOO_UNIVERSE: Record<
  Extract<AssetClass, 'stock' | 'etf' | 'commodity' | 'index'>,
  UniverseEntry[]
> = {
  stock: [
    // prettier-ignore-start
    { symbol: 'AAPL', name: 'Apple', domain: 'apple.com', sector: 'Technologie', country: 'États-Unis', exchange: 'NASDAQ' },
    { symbol: 'MSFT', name: 'Microsoft', domain: 'microsoft.com', sector: 'Technologie', country: 'États-Unis', exchange: 'NASDAQ' },
    { symbol: 'NVDA', name: 'NVIDIA', domain: 'nvidia.com', sector: 'Semi-conducteurs', country: 'États-Unis', exchange: 'NASDAQ' },
    { symbol: 'AMZN', name: 'Amazon', domain: 'amazon.com', sector: 'Commerce en ligne', country: 'États-Unis', exchange: 'NASDAQ' },
    { symbol: 'GOOGL', name: 'Alphabet', domain: 'abc.xyz', sector: 'Technologie', country: 'États-Unis', exchange: 'NASDAQ' },
    { symbol: 'META', name: 'Meta Platforms', domain: 'meta.com', sector: 'Réseaux sociaux', country: 'États-Unis', exchange: 'NASDAQ' },
    { symbol: 'TSLA', name: 'Tesla', domain: 'tesla.com', sector: 'Automobile', country: 'États-Unis', exchange: 'NASDAQ' },
    { symbol: 'JPM', name: 'JPMorgan Chase', domain: 'jpmorganchase.com', sector: 'Banque', country: 'États-Unis', exchange: 'NYSE' },
    { symbol: 'V', name: 'Visa', domain: 'visa.com', sector: 'Paiements', country: 'États-Unis', exchange: 'NYSE' },
    { symbol: 'XOM', name: 'ExxonMobil', domain: 'exxonmobil.com', sector: 'Énergie', country: 'États-Unis', exchange: 'NYSE' },
    { symbol: 'MC.PA', name: 'LVMH', domain: 'lvmh.com', sector: 'Luxe', country: 'France', exchange: 'Euronext Paris' },
    { symbol: 'OR.PA', name: 'L’Oréal', domain: 'loreal.com', sector: 'Cosmétiques', country: 'France', exchange: 'Euronext Paris' },
    { symbol: 'TTE.PA', name: 'TotalEnergies', domain: 'totalenergies.com', sector: 'Énergie', country: 'France', exchange: 'Euronext Paris' },
    { symbol: 'AIR.PA', name: 'Airbus', domain: 'airbus.com', sector: 'Aéronautique', country: 'France', exchange: 'Euronext Paris' },
    { symbol: 'SAN.PA', name: 'Sanofi', domain: 'sanofi.com', sector: 'Pharmacie', country: 'France', exchange: 'Euronext Paris' },
    { symbol: 'BNP.PA', name: 'BNP Paribas', domain: 'bnpparibas.com', sector: 'Banque', country: 'France', exchange: 'Euronext Paris' },
    { symbol: 'ASML.AS', name: 'ASML', domain: 'asml.com', sector: 'Semi-conducteurs', country: 'Pays-Bas', exchange: 'Euronext Amsterdam' },
    { symbol: 'SAP.DE', name: 'SAP', domain: 'sap.com', sector: 'Logiciel', country: 'Allemagne', exchange: 'Xetra' },
    // prettier-ignore-end
  ],

  // `domain` = société de GESTION, pas le fonds : un ETF n'a pas de site propre.
  etf: [
    // prettier-ignore-start
    { symbol: 'SPY', name: 'SPDR S&P 500', domain: 'ssga.com', sector: 'Actions américaines', country: 'États-Unis', exchange: 'NYSE Arca' },
    { symbol: 'QQQ', name: 'Invesco QQQ (Nasdaq 100)', domain: 'invesco.com', sector: 'Actions technologiques', country: 'États-Unis', exchange: 'NASDAQ' },
    { symbol: 'VOO', name: 'Vanguard S&P 500', domain: 'vanguard.com', sector: 'Actions américaines', country: 'États-Unis', exchange: 'NYSE Arca' },
    { symbol: 'VTI', name: 'Vanguard Total Stock Market', domain: 'vanguard.com', sector: 'Actions américaines', country: 'États-Unis', exchange: 'NYSE Arca' },
    { symbol: 'IWM', name: 'iShares Russell 2000', domain: 'ishares.com', sector: 'Petites capitalisations', country: 'États-Unis', exchange: 'NYSE Arca' },
    { symbol: 'EEM', name: 'iShares Marchés émergents', domain: 'ishares.com', sector: 'Marchés émergents', country: 'États-Unis', exchange: 'NYSE Arca' },
    { symbol: 'GLD', name: 'SPDR Gold Shares', domain: 'ssga.com', sector: 'Métaux précieux', country: 'États-Unis', exchange: 'NYSE Arca' },
    { symbol: 'AGG', name: 'iShares Core US Aggregate Bond', domain: 'ishares.com', sector: 'Obligations', country: 'États-Unis', exchange: 'NYSE Arca' },
    { symbol: 'IWDA.AS', name: 'iShares Core MSCI World (UCITS)', domain: 'ishares.com', sector: 'Actions mondiales', country: 'Irlande', exchange: 'Euronext Amsterdam' },
    { symbol: 'VWCE.DE', name: 'Vanguard FTSE All-World (UCITS)', domain: 'vanguard.com', sector: 'Actions mondiales', country: 'Irlande', exchange: 'Xetra' },
    // prettier-ignore-end
  ],

  commodity: [
    { symbol: 'GC=F', name: 'Or', emoji: '🥇', family: 'precious' },
    { symbol: 'SI=F', name: 'Argent', emoji: '🥈', family: 'precious' },
    { symbol: 'PL=F', name: 'Platine', emoji: '⚪', family: 'precious' },
    { symbol: 'HG=F', name: 'Cuivre', emoji: '🟠', family: 'industrial' },
    { symbol: 'CL=F', name: 'Pétrole WTI', emoji: '🛢️', family: 'energy' },
    { symbol: 'BZ=F', name: 'Pétrole Brent', emoji: '🛢️', family: 'energy' },
    { symbol: 'NG=F', name: 'Gaz naturel', emoji: '🔥', family: 'energy' },
    { symbol: 'ZW=F', name: 'Blé', emoji: '🌾', family: 'agricultural' },
    { symbol: 'ZC=F', name: 'Maïs', emoji: '🌽', family: 'agricultural' },
    { symbol: 'KC=F', name: 'Café', emoji: '☕', family: 'agricultural' },
    { symbol: 'SB=F', name: 'Sucre', emoji: '🍬', family: 'agricultural' },
    { symbol: 'CC=F', name: 'Cacao', emoji: '🍫', family: 'agricultural' },
  ],

  // Pas de `domain` : un indice n'est pas une entreprise et n'a pas de logo. Son
  // monogramme (« CA » pour CAC 40) suffit à le distinguer dans une liste.
  index: [
    { symbol: '^FCHI', name: 'CAC 40', country: 'France', exchange: 'Euronext Paris' },
    { symbol: '^GSPC', name: 'S&P 500', country: 'États-Unis', exchange: 'NYSE' },
    { symbol: '^DJI', name: 'Dow Jones Industrial', country: 'États-Unis', exchange: 'NYSE' },
    { symbol: '^IXIC', name: 'Nasdaq Composite', country: 'États-Unis', exchange: 'NASDAQ' },
    { symbol: '^GDAXI', name: 'DAX', country: 'Allemagne', exchange: 'Xetra' },
    { symbol: '^FTSE', name: 'FTSE 100', country: 'Royaume-Uni', exchange: 'London Stock Exchange' },
    { symbol: '^STOXX50E', name: 'Euro Stoxx 50', country: 'Zone euro', exchange: 'Eurex' },
    { symbol: '^N225', name: 'Nikkei 225', country: 'Japon', exchange: 'Tokyo Stock Exchange' },
    { symbol: '^HSI', name: 'Hang Seng', country: 'Hong Kong', exchange: 'HKEX' },
    { symbol: '^VIX', name: 'VIX (volatilité)', country: 'États-Unis', exchange: 'CBOE' },
  ],
}

/**
 * Retrouve une entrée par son symbole Yahoo EXACT (`AAPL`, `GC=F`, `^FCHI`).
 *
 * Distincte de `findUniverseEntry`, qui prend un fragment d'URL normalisé : les
 * deux clés ne se confondent pas (`GC=F` contre `gc-f`), et une seule fonction
 * acceptant les deux formes accepterait aussi les mélanges — donc échouerait
 * silencieusement sur une faute de frappe au lieu de la signaler.
 */
export function findUniverseEntryBySymbol(symbol: string): UniverseEntry | undefined {
  for (const entries of Object.values(YAHOO_UNIVERSE)) {
    const found = entries.find((entry) => entry.symbol === symbol)
    if (found) return found
  }
  return undefined
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
