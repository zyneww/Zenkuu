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

  /**
   * PRÉSENTATION RÉDIGÉE — la seule donnée de ce dépôt qui ne vienne d'aucune source.
   *
   * ── POURQUOI ELLE EXISTE, ET POURQUOI ELLE EST BORNÉE ───────────────────────
   *
   * Relevé sur les pages réellement servies : la fiche du bitcoin porte 19 200
   * caractères, celle du CAC 40 sept mille cinq cents. L'écart ne tient pas à
   * l'importance des deux actifs mais à leurs sources — CoinGecko publie une notice
   * pour chaque jeton, Yahoo n'en publie aucune pour un indice ou un contrat à terme.
   * Une fiche d'indice s'ouvrait donc sur un cours et se refermait dessus.
   *
   * Ce champ ne décrit QUE des faits structurels et stables : ce que l'instrument
   * mesure, comment il est construit, où il se négocie. Jamais un chiffre de marché,
   * jamais une valeur qui bouge — ce serait précisément la donnée périmée que le §5
   * proscrit, et elle n'aurait ici aucune source pour se corriger.
   *
   * ⚠️ L'affichage doit ATTRIBUER ce texte à ZENKUU et non à la source de cotation.
   * Une notice rédigée par nous, présentée sous le nom d'un fournisseur, serait une
   * fausse attribution — voir `AssetAbout`.
   */
  about?: string
}

export const YAHOO_UNIVERSE: Record<
  Extract<AssetClass, 'stock' | 'etf' | 'commodity' | 'index'>,
  UniverseEntry[]
> = {
  /*
   * ── QUATRE-VINGT-DIX-NEUF VALEURS, CONTRE DIX-HUIT ────────────────────────
   *
   * L'ordre n'est pas décoratif : `listAssets` sert les symboles PAR TRANCHES de
   * `perPage`, dans cet ordre exact. Les mégacapitalisations américaines ouvrent
   * donc la première page, puis viennent la place de Paris, Francfort, le reste de
   * l'Europe et Tokyo. Déplacer une ligne change ce que voit le premier écran.
   *
   * ⚠️ CHAQUE SYMBOLE COÛTE UNE REQUÊTE — Yahoo n'expose aucun appel groupé, et le
   * limiteur du fournisseur plafonne à 60 requêtes par fenêtre. C'est la raison pour
   * laquelle les actions et les ETF sont désormais paginés CÔTÉ SERVEUR (voir
   * `MarketPageView`) : une page froide en interroge vingt-cinq, pas quatre-vingt-dix-neuf.
   */
  stock: [
    // prettier-ignore-start
    // ── États-Unis, mégacapitalisations ─────────────────────────────────────
    { symbol: 'AAPL', name: 'Apple', domain: 'apple.com', sector: 'Technologie', country: 'États-Unis', exchange: 'NASDAQ' },
    { symbol: 'MSFT', name: 'Microsoft', domain: 'microsoft.com', sector: 'Technologie', country: 'États-Unis', exchange: 'NASDAQ' },
    { symbol: 'NVDA', name: 'NVIDIA', domain: 'nvidia.com', sector: 'Semi-conducteurs', country: 'États-Unis', exchange: 'NASDAQ' },
    { symbol: 'AMZN', name: 'Amazon', domain: 'amazon.com', sector: 'Commerce en ligne', country: 'États-Unis', exchange: 'NASDAQ' },
    { symbol: 'GOOGL', name: 'Alphabet', domain: 'abc.xyz', sector: 'Technologie', country: 'États-Unis', exchange: 'NASDAQ' },
    { symbol: 'META', name: 'Meta Platforms', domain: 'meta.com', sector: 'Réseaux sociaux', country: 'États-Unis', exchange: 'NASDAQ' },
    { symbol: 'TSLA', name: 'Tesla', domain: 'tesla.com', sector: 'Automobile', country: 'États-Unis', exchange: 'NASDAQ' },
    { symbol: 'BRK-B', name: 'Berkshire Hathaway', domain: 'berkshirehathaway.com', sector: 'Conglomérat', country: 'États-Unis', exchange: 'NYSE' },
    { symbol: 'AVGO', name: 'Broadcom', domain: 'broadcom.com', sector: 'Semi-conducteurs', country: 'États-Unis', exchange: 'NASDAQ' },
    { symbol: 'LLY', name: 'Eli Lilly', domain: 'lilly.com', sector: 'Pharmacie', country: 'États-Unis', exchange: 'NYSE' },
    { symbol: 'JPM', name: 'JPMorgan Chase', domain: 'jpmorganchase.com', sector: 'Banque', country: 'États-Unis', exchange: 'NYSE' },
    { symbol: 'V', name: 'Visa', domain: 'visa.com', sector: 'Paiements', country: 'États-Unis', exchange: 'NYSE' },
    { symbol: 'MA', name: 'Mastercard', domain: 'mastercard.com', sector: 'Paiements', country: 'États-Unis', exchange: 'NYSE' },
    { symbol: 'WMT', name: 'Walmart', domain: 'walmart.com', sector: 'Distribution', country: 'États-Unis', exchange: 'NYSE' },
    { symbol: 'UNH', name: 'UnitedHealth', domain: 'unitedhealthgroup.com', sector: 'Santé', country: 'États-Unis', exchange: 'NYSE' },
    { symbol: 'XOM', name: 'ExxonMobil', domain: 'exxonmobil.com', sector: 'Énergie', country: 'États-Unis', exchange: 'NYSE' },
    { symbol: 'JNJ', name: 'Johnson & Johnson', domain: 'jnj.com', sector: 'Santé', country: 'États-Unis', exchange: 'NYSE' },
    { symbol: 'PG', name: 'Procter & Gamble', domain: 'pg.com', sector: 'Biens de consommation', country: 'États-Unis', exchange: 'NYSE' },
    { symbol: 'HD', name: 'Home Depot', domain: 'homedepot.com', sector: 'Distribution', country: 'États-Unis', exchange: 'NYSE' },
    { symbol: 'COST', name: 'Costco', domain: 'costco.com', sector: 'Distribution', country: 'États-Unis', exchange: 'NASDAQ' },
    { symbol: 'ORCL', name: 'Oracle', domain: 'oracle.com', sector: 'Logiciel', country: 'États-Unis', exchange: 'NYSE' },
    { symbol: 'ABBV', name: 'AbbVie', domain: 'abbvie.com', sector: 'Pharmacie', country: 'États-Unis', exchange: 'NYSE' },
    { symbol: 'MRK', name: 'Merck', domain: 'merck.com', sector: 'Pharmacie', country: 'États-Unis', exchange: 'NYSE' },
    { symbol: 'KO', name: 'Coca-Cola', domain: 'coca-colacompany.com', sector: 'Boissons', country: 'États-Unis', exchange: 'NYSE' },
    { symbol: 'PEP', name: 'PepsiCo', domain: 'pepsico.com', sector: 'Boissons', country: 'États-Unis', exchange: 'NASDAQ' },
    // ── États-Unis, suite ───────────────────────────────────────────────────
    { symbol: 'BAC', name: 'Bank of America', domain: 'bankofamerica.com', sector: 'Banque', country: 'États-Unis', exchange: 'NYSE' },
    { symbol: 'CVX', name: 'Chevron', domain: 'chevron.com', sector: 'Énergie', country: 'États-Unis', exchange: 'NYSE' },
    { symbol: 'AMD', name: 'AMD', domain: 'amd.com', sector: 'Semi-conducteurs', country: 'États-Unis', exchange: 'NASDAQ' },
    { symbol: 'CRM', name: 'Salesforce', domain: 'salesforce.com', sector: 'Logiciel', country: 'États-Unis', exchange: 'NYSE' },
    { symbol: 'NFLX', name: 'Netflix', domain: 'netflix.com', sector: 'Divertissement', country: 'États-Unis', exchange: 'NASDAQ' },
    { symbol: 'ADBE', name: 'Adobe', domain: 'adobe.com', sector: 'Logiciel', country: 'États-Unis', exchange: 'NASDAQ' },
    { symbol: 'CSCO', name: 'Cisco', domain: 'cisco.com', sector: 'Réseaux', country: 'États-Unis', exchange: 'NASDAQ' },
    { symbol: 'INTC', name: 'Intel', domain: 'intel.com', sector: 'Semi-conducteurs', country: 'États-Unis', exchange: 'NASDAQ' },
    { symbol: 'QCOM', name: 'Qualcomm', domain: 'qualcomm.com', sector: 'Semi-conducteurs', country: 'États-Unis', exchange: 'NASDAQ' },
    { symbol: 'TXN', name: 'Texas Instruments', domain: 'ti.com', sector: 'Semi-conducteurs', country: 'États-Unis', exchange: 'NASDAQ' },
    { symbol: 'DIS', name: 'Walt Disney', domain: 'thewaltdisneycompany.com', sector: 'Divertissement', country: 'États-Unis', exchange: 'NYSE' },
    { symbol: 'MCD', name: 'McDonald’s', domain: 'mcdonalds.com', sector: 'Restauration', country: 'États-Unis', exchange: 'NYSE' },
    { symbol: 'IBM', name: 'IBM', domain: 'ibm.com', sector: 'Technologie', country: 'États-Unis', exchange: 'NYSE' },
    { symbol: 'CAT', name: 'Caterpillar', domain: 'caterpillar.com', sector: 'Machines', country: 'États-Unis', exchange: 'NYSE' },
    { symbol: 'BA', name: 'Boeing', domain: 'boeing.com', sector: 'Aéronautique', country: 'États-Unis', exchange: 'NYSE' },
    { symbol: 'PFE', name: 'Pfizer', domain: 'pfizer.com', sector: 'Pharmacie', country: 'États-Unis', exchange: 'NYSE' },
    { symbol: 'NKE', name: 'Nike', domain: 'nike.com', sector: 'Équipement sportif', country: 'États-Unis', exchange: 'NYSE' },
    { symbol: 'GS', name: 'Goldman Sachs', domain: 'goldmansachs.com', sector: 'Banque', country: 'États-Unis', exchange: 'NYSE' },
    { symbol: 'UBER', name: 'Uber', domain: 'uber.com', sector: 'Mobilité', country: 'États-Unis', exchange: 'NYSE' },
    { symbol: 'PLTR', name: 'Palantir', domain: 'palantir.com', sector: 'Logiciel', country: 'États-Unis', exchange: 'NASDAQ' },
    { symbol: 'COIN', name: 'Coinbase', domain: 'coinbase.com', sector: 'Place de cotation crypto', country: 'États-Unis', exchange: 'NASDAQ' },
    { symbol: 'MSTR', name: 'Strategy (MicroStrategy)', domain: 'strategy.com', sector: 'Logiciel · trésorerie bitcoin', country: 'États-Unis', exchange: 'NASDAQ' },
    // ── France — Euronext Paris ─────────────────────────────────────────────
    { symbol: 'MC.PA', name: 'LVMH', domain: 'lvmh.com', sector: 'Luxe', country: 'France', exchange: 'Euronext Paris' },
    { symbol: 'OR.PA', name: 'L’Oréal', domain: 'loreal.com', sector: 'Cosmétiques', country: 'France', exchange: 'Euronext Paris' },
    { symbol: 'TTE.PA', name: 'TotalEnergies', domain: 'totalenergies.com', sector: 'Énergie', country: 'France', exchange: 'Euronext Paris' },
    { symbol: 'AIR.PA', name: 'Airbus', domain: 'airbus.com', sector: 'Aéronautique', country: 'France', exchange: 'Euronext Paris' },
    { symbol: 'SAN.PA', name: 'Sanofi', domain: 'sanofi.com', sector: 'Pharmacie', country: 'France', exchange: 'Euronext Paris' },
    { symbol: 'BNP.PA', name: 'BNP Paribas', domain: 'bnpparibas.com', sector: 'Banque', country: 'France', exchange: 'Euronext Paris' },
    { symbol: 'RMS.PA', name: 'Hermès', domain: 'hermes.com', sector: 'Luxe', country: 'France', exchange: 'Euronext Paris' },
    { symbol: 'EL.PA', name: 'EssilorLuxottica', domain: 'essilorluxottica.com', sector: 'Optique', country: 'France', exchange: 'Euronext Paris' },
    { symbol: 'SU.PA', name: 'Schneider Electric', domain: 'se.com', sector: 'Équipement électrique', country: 'France', exchange: 'Euronext Paris' },
    { symbol: 'AI.PA', name: 'Air Liquide', domain: 'airliquide.com', sector: 'Gaz industriels', country: 'France', exchange: 'Euronext Paris' },
    { symbol: 'SAF.PA', name: 'Safran', domain: 'safran-group.com', sector: 'Aéronautique', country: 'France', exchange: 'Euronext Paris' },
    { symbol: 'DG.PA', name: 'Vinci', domain: 'vinci.com', sector: 'Construction', country: 'France', exchange: 'Euronext Paris' },
    { symbol: 'CS.PA', name: 'AXA', domain: 'axa.com', sector: 'Assurance', country: 'France', exchange: 'Euronext Paris' },
    { symbol: 'KER.PA', name: 'Kering', domain: 'kering.com', sector: 'Luxe', country: 'France', exchange: 'Euronext Paris' },
    { symbol: 'ACA.PA', name: 'Crédit Agricole', domain: 'credit-agricole.com', sector: 'Banque', country: 'France', exchange: 'Euronext Paris' },
    { symbol: 'GLE.PA', name: 'Société Générale', domain: 'societegenerale.com', sector: 'Banque', country: 'France', exchange: 'Euronext Paris' },
    { symbol: 'ORA.PA', name: 'Orange', domain: 'orange.com', sector: 'Télécoms', country: 'France', exchange: 'Euronext Paris' },
    { symbol: 'CAP.PA', name: 'Capgemini', domain: 'capgemini.com', sector: 'Services informatiques', country: 'France', exchange: 'Euronext Paris' },
    { symbol: 'HO.PA', name: 'Thales', domain: 'thalesgroup.com', sector: 'Défense', country: 'France', exchange: 'Euronext Paris' },
    { symbol: 'DSY.PA', name: 'Dassault Systèmes', domain: '3ds.com', sector: 'Logiciel', country: 'France', exchange: 'Euronext Paris' },
    { symbol: 'RI.PA', name: 'Pernod Ricard', domain: 'pernod-ricard.com', sector: 'Spiritueux', country: 'France', exchange: 'Euronext Paris' },
    { symbol: 'BN.PA', name: 'Danone', domain: 'danone.com', sector: 'Agroalimentaire', country: 'France', exchange: 'Euronext Paris' },
    // ── Allemagne — Xetra ───────────────────────────────────────────────────
    { symbol: 'SAP.DE', name: 'SAP', domain: 'sap.com', sector: 'Logiciel', country: 'Allemagne', exchange: 'Xetra' },
    { symbol: 'SIE.DE', name: 'Siemens', domain: 'siemens.com', sector: 'Industrie', country: 'Allemagne', exchange: 'Xetra' },
    { symbol: 'ALV.DE', name: 'Allianz', domain: 'allianz.com', sector: 'Assurance', country: 'Allemagne', exchange: 'Xetra' },
    { symbol: 'MBG.DE', name: 'Mercedes-Benz Group', domain: 'mercedes-benz.com', sector: 'Automobile', country: 'Allemagne', exchange: 'Xetra' },
    { symbol: 'BMW.DE', name: 'BMW', domain: 'bmwgroup.com', sector: 'Automobile', country: 'Allemagne', exchange: 'Xetra' },
    { symbol: 'VOW3.DE', name: 'Volkswagen', domain: 'volkswagen-group.com', sector: 'Automobile', country: 'Allemagne', exchange: 'Xetra' },
    { symbol: 'BAS.DE', name: 'BASF', domain: 'basf.com', sector: 'Chimie', country: 'Allemagne', exchange: 'Xetra' },
    { symbol: 'DTE.DE', name: 'Deutsche Telekom', domain: 'telekom.com', sector: 'Télécoms', country: 'Allemagne', exchange: 'Xetra' },
    { symbol: 'IFX.DE', name: 'Infineon', domain: 'infineon.com', sector: 'Semi-conducteurs', country: 'Allemagne', exchange: 'Xetra' },
    { symbol: 'RHM.DE', name: 'Rheinmetall', domain: 'rheinmetall.com', sector: 'Défense', country: 'Allemagne', exchange: 'Xetra' },
    // ── Reste de l'Europe ───────────────────────────────────────────────────
    { symbol: 'ASML.AS', name: 'ASML', domain: 'asml.com', sector: 'Semi-conducteurs', country: 'Pays-Bas', exchange: 'Euronext Amsterdam' },
    { symbol: 'INGA.AS', name: 'ING Groep', domain: 'ing.com', sector: 'Banque', country: 'Pays-Bas', exchange: 'Euronext Amsterdam' },
    { symbol: 'PRX.AS', name: 'Prosus', domain: 'prosus.com', sector: 'Investissement technologique', country: 'Pays-Bas', exchange: 'Euronext Amsterdam' },
    { symbol: 'ADYEN.AS', name: 'Adyen', domain: 'adyen.com', sector: 'Paiements', country: 'Pays-Bas', exchange: 'Euronext Amsterdam' },
    { symbol: 'NESN.SW', name: 'Nestlé', domain: 'nestle.com', sector: 'Agroalimentaire', country: 'Suisse', exchange: 'SIX' },
    { symbol: 'NOVN.SW', name: 'Novartis', domain: 'novartis.com', sector: 'Pharmacie', country: 'Suisse', exchange: 'SIX' },
    { symbol: 'ROG.SW', name: 'Roche', domain: 'roche.com', sector: 'Pharmacie', country: 'Suisse', exchange: 'SIX' },
    { symbol: 'SHEL.L', name: 'Shell', domain: 'shell.com', sector: 'Énergie', country: 'Royaume-Uni', exchange: 'London Stock Exchange' },
    { symbol: 'AZN.L', name: 'AstraZeneca', domain: 'astrazeneca.com', sector: 'Pharmacie', country: 'Royaume-Uni', exchange: 'London Stock Exchange' },
    { symbol: 'HSBA.L', name: 'HSBC', domain: 'hsbc.com', sector: 'Banque', country: 'Royaume-Uni', exchange: 'London Stock Exchange' },
    { symbol: 'ULVR.L', name: 'Unilever', domain: 'unilever.com', sector: 'Biens de consommation', country: 'Royaume-Uni', exchange: 'London Stock Exchange' },
    { symbol: 'SAN.MC', name: 'Banco Santander', domain: 'santander.com', sector: 'Banque', country: 'Espagne', exchange: 'BME' },
    { symbol: 'ITX.MC', name: 'Inditex (Zara)', domain: 'inditex.com', sector: 'Habillement', country: 'Espagne', exchange: 'BME' },
    { symbol: 'ENI.MI', name: 'Eni', domain: 'eni.com', sector: 'Énergie', country: 'Italie', exchange: 'Borsa Italiana' },
    { symbol: 'RACE.MI', name: 'Ferrari', domain: 'ferrari.com', sector: 'Automobile de luxe', country: 'Italie', exchange: 'Borsa Italiana' },
    { symbol: 'NOVO-B.CO', name: 'Novo Nordisk', domain: 'novonordisk.com', sector: 'Pharmacie', country: 'Danemark', exchange: 'Nasdaq Copenhague' },
    // ── Japon — Tokyo Stock Exchange ────────────────────────────────────────
    { symbol: '7203.T', name: 'Toyota', domain: 'toyota.com', sector: 'Automobile', country: 'Japon', exchange: 'Tokyo Stock Exchange' },
    { symbol: '6758.T', name: 'Sony', domain: 'sony.com', sector: 'Électronique', country: 'Japon', exchange: 'Tokyo Stock Exchange' },
    { symbol: '6861.T', name: 'Keyence', domain: 'keyence.com', sector: 'Automatisation', country: 'Japon', exchange: 'Tokyo Stock Exchange' },
    { symbol: '9984.T', name: 'SoftBank Group', domain: 'group.softbank', sector: 'Investissement technologique', country: 'Japon', exchange: 'Tokyo Stock Exchange' },
    // prettier-ignore-end
  ],

  // `domain` = société de GESTION, pas le fonds : un ETF n'a pas de site propre.
  etf: [
    // prettier-ignore-start
    // ── Indices larges, cotés aux États-Unis ────────────────────────────────
    { symbol: 'SPY', name: 'SPDR S&P 500', domain: 'ssga.com', sector: 'Actions américaines', country: 'États-Unis', exchange: 'NYSE Arca' },
    { symbol: 'IVV', name: 'iShares Core S&P 500', domain: 'ishares.com', sector: 'Actions américaines', country: 'États-Unis', exchange: 'NYSE Arca' },
    { symbol: 'VOO', name: 'Vanguard S&P 500', domain: 'vanguard.com', sector: 'Actions américaines', country: 'États-Unis', exchange: 'NYSE Arca' },
    { symbol: 'QQQ', name: 'Invesco QQQ (Nasdaq 100)', domain: 'invesco.com', sector: 'Actions technologiques', country: 'États-Unis', exchange: 'NASDAQ' },
    { symbol: 'VTI', name: 'Vanguard Total Stock Market', domain: 'vanguard.com', sector: 'Actions américaines', country: 'États-Unis', exchange: 'NYSE Arca' },
    { symbol: 'DIA', name: 'SPDR Dow Jones Industrial', domain: 'ssga.com', sector: 'Actions américaines', country: 'États-Unis', exchange: 'NYSE Arca' },
    { symbol: 'IWM', name: 'iShares Russell 2000', domain: 'ishares.com', sector: 'Petites capitalisations', country: 'États-Unis', exchange: 'NYSE Arca' },
    { symbol: 'VEA', name: 'Vanguard Developed Markets', domain: 'vanguard.com', sector: 'Actions développées hors US', country: 'États-Unis', exchange: 'NYSE Arca' },
    { symbol: 'VWO', name: 'Vanguard Emerging Markets', domain: 'vanguard.com', sector: 'Marchés émergents', country: 'États-Unis', exchange: 'NYSE Arca' },
    { symbol: 'EEM', name: 'iShares Marchés émergents', domain: 'ishares.com', sector: 'Marchés émergents', country: 'États-Unis', exchange: 'NYSE Arca' },
    { symbol: 'EFA', name: 'iShares MSCI EAFE', domain: 'ishares.com', sector: 'Europe · Asie · Océanie', country: 'États-Unis', exchange: 'NYSE Arca' },
    { symbol: 'VXUS', name: 'Vanguard Total International Stock', domain: 'vanguard.com', sector: 'Actions internationales', country: 'États-Unis', exchange: 'NASDAQ' },
    // ── Styles et facteurs ──────────────────────────────────────────────────
    { symbol: 'VUG', name: 'Vanguard Growth', domain: 'vanguard.com', sector: 'Croissance', country: 'États-Unis', exchange: 'NYSE Arca' },
    { symbol: 'VTV', name: 'Vanguard Value', domain: 'vanguard.com', sector: 'Valeur', country: 'États-Unis', exchange: 'NYSE Arca' },
    { symbol: 'SCHD', name: 'Schwab US Dividend Equity', domain: 'schwab.com', sector: 'Dividendes', country: 'États-Unis', exchange: 'NYSE Arca' },
    { symbol: 'ARKK', name: 'ARK Innovation', domain: 'ark-invest.com', sector: 'Innovation de rupture', country: 'États-Unis', exchange: 'NYSE Arca' },
    // ── Secteurs ────────────────────────────────────────────────────────────
    { symbol: 'XLK', name: 'SPDR Technologie', domain: 'ssga.com', sector: 'Technologie', country: 'États-Unis', exchange: 'NYSE Arca' },
    { symbol: 'XLF', name: 'SPDR Finance', domain: 'ssga.com', sector: 'Finance', country: 'États-Unis', exchange: 'NYSE Arca' },
    { symbol: 'XLE', name: 'SPDR Énergie', domain: 'ssga.com', sector: 'Énergie', country: 'États-Unis', exchange: 'NYSE Arca' },
    { symbol: 'XLV', name: 'SPDR Santé', domain: 'ssga.com', sector: 'Santé', country: 'États-Unis', exchange: 'NYSE Arca' },
    { symbol: 'XLY', name: 'SPDR Consommation discrétionnaire', domain: 'ssga.com', sector: 'Consommation', country: 'États-Unis', exchange: 'NYSE Arca' },
    { symbol: 'XLI', name: 'SPDR Industrie', domain: 'ssga.com', sector: 'Industrie', country: 'États-Unis', exchange: 'NYSE Arca' },
    { symbol: 'SMH', name: 'VanEck Semiconductor', domain: 'vaneck.com', sector: 'Semi-conducteurs', country: 'États-Unis', exchange: 'NASDAQ' },
    { symbol: 'SOXX', name: 'iShares Semiconductor', domain: 'ishares.com', sector: 'Semi-conducteurs', country: 'États-Unis', exchange: 'NASDAQ' },
    // ── Obligations ─────────────────────────────────────────────────────────
    { symbol: 'AGG', name: 'iShares Core US Aggregate Bond', domain: 'ishares.com', sector: 'Obligations', country: 'États-Unis', exchange: 'NYSE Arca' },
    { symbol: 'BND', name: 'Vanguard Total Bond Market', domain: 'vanguard.com', sector: 'Obligations', country: 'États-Unis', exchange: 'NASDAQ' },
    { symbol: 'TLT', name: 'iShares 20+ Year Treasury', domain: 'ishares.com', sector: 'Obligations d’État longues', country: 'États-Unis', exchange: 'NASDAQ' },
    { symbol: 'LQD', name: 'iShares Investment Grade Corporate', domain: 'ishares.com', sector: 'Obligations d’entreprises', country: 'États-Unis', exchange: 'NYSE Arca' },
    { symbol: 'HYG', name: 'iShares High Yield Corporate', domain: 'ishares.com', sector: 'Obligations à haut rendement', country: 'États-Unis', exchange: 'NYSE Arca' },
    // ── Matières premières et crypto au comptant ────────────────────────────
    { symbol: 'GLD', name: 'SPDR Gold Shares', domain: 'ssga.com', sector: 'Métaux précieux', country: 'États-Unis', exchange: 'NYSE Arca' },
    { symbol: 'SLV', name: 'iShares Silver Trust', domain: 'ishares.com', sector: 'Métaux précieux', country: 'États-Unis', exchange: 'NYSE Arca' },
    { symbol: 'IBIT', name: 'iShares Bitcoin Trust', domain: 'ishares.com', sector: 'Bitcoin au comptant', country: 'États-Unis', exchange: 'NASDAQ' },
    { symbol: 'FBTC', name: 'Fidelity Wise Origin Bitcoin', domain: 'fidelity.com', sector: 'Bitcoin au comptant', country: 'États-Unis', exchange: 'NYSE Arca' },
    { symbol: 'ETHA', name: 'iShares Ethereum Trust', domain: 'ishares.com', sector: 'Ether au comptant', country: 'États-Unis', exchange: 'NASDAQ' },
    // ── UCITS — les fonds accessibles depuis l'Europe ───────────────────────
    { symbol: 'IWDA.AS', name: 'iShares Core MSCI World (UCITS)', domain: 'ishares.com', sector: 'Actions mondiales', country: 'Irlande', exchange: 'Euronext Amsterdam' },
    { symbol: 'VWCE.DE', name: 'Vanguard FTSE All-World (UCITS)', domain: 'vanguard.com', sector: 'Actions mondiales', country: 'Irlande', exchange: 'Xetra' },
    { symbol: 'EUNL.DE', name: 'iShares Core MSCI World (dist.)', domain: 'ishares.com', sector: 'Actions mondiales', country: 'Irlande', exchange: 'Xetra' },
    { symbol: 'CSPX.L', name: 'iShares Core S&P 500 (UCITS)', domain: 'ishares.com', sector: 'Actions américaines', country: 'Irlande', exchange: 'London Stock Exchange' },
    { symbol: 'IUSQ.DE', name: 'iShares MSCI ACWI (UCITS)', domain: 'ishares.com', sector: 'Actions mondiales', country: 'Irlande', exchange: 'Xetra' },
    { symbol: 'CW8.PA', name: 'Amundi MSCI World (UCITS)', domain: 'amundi.com', sector: 'Actions mondiales', country: 'Luxembourg', exchange: 'Euronext Paris' },
    { symbol: 'ESE.PA', name: 'BNPP Easy S&P 500 (UCITS)', domain: 'bnpparibas-am.com', sector: 'Actions américaines', country: 'Luxembourg', exchange: 'Euronext Paris' },
    { symbol: 'EQQQ.PA', name: 'Invesco EQQQ Nasdaq 100 (UCITS)', domain: 'invesco.com', sector: 'Actions technologiques', country: 'Irlande', exchange: 'Euronext Paris' },
    // prettier-ignore-end
  ],

  commodity: [
    { symbol: 'GC=F', name: 'Or', emoji: '🥇', family: 'precious', about:
        'Contrat à terme sur l\'or négocié au COMEX, coté en dollars par once troy (31,1 grammes). Le cours affiché est celui de l\'échéance la plus proche, celle qui concentre l\'essentiel des échanges. L\'or ne verse aucun revenu : sa valorisation dépend donc entièrement de ce que les acheteurs sont prêts à payer pour ne pas détenir autre chose.', },
    { symbol: 'SI=F', name: 'Argent', emoji: '🥈', family: 'precious', about:
        'Contrat à terme sur l\'argent au COMEX, coté en dollars par once troy. L\'argent a une double nature — métal précieux et métal industriel, très employé en électronique et dans le photovoltaïque — ce qui le rend nettement plus volatil que l\'or.', },
    { symbol: 'PL=F', name: 'Platine', emoji: '⚪', family: 'precious', about:
        'Contrat à terme sur le platine, coté en dollars par once troy. Sa demande est d\'abord industrielle : pots catalytiques, chimie, verre. La production est concentrée sur très peu de pays, ce qui rend le cours sensible aux événements miniers.', },
    { symbol: 'HG=F', name: 'Cuivre', emoji: '🟠', family: 'industrial', about:
        'Contrat à terme sur le cuivre au COMEX, coté en dollars par livre (453 grammes). Surnommé « docteur cuivre » parce que sa demande suit la construction et le réseau électrique : son cours est lu comme un indicateur avancé de l\'activité industrielle mondiale.', },
    { symbol: 'CL=F', name: 'Pétrole WTI', emoji: '🛢️', family: 'energy', about:
        'Pétrole brut léger américain, livrable à Cushing dans l\'Oklahoma. C\'est la référence du marché nord-américain. Son écart avec le Brent reflète les contraintes de transport depuis l\'intérieur des terres, et il s\'est déjà inversé lors de crises logistiques.', },
    { symbol: 'BZ=F', name: 'Pétrole Brent', emoji: '🛢️', family: 'energy', about:
        'Pétrole brut de mer du Nord, coté à l\'ICE. C\'est la référence mondiale : la majorité des barils échangés hors Amérique du Nord se prixent par rapport à lui, parce qu\'il est livrable par voie maritime et donc accessible depuis n\'importe quel port.', },
    { symbol: 'NG=F', name: 'Gaz naturel', emoji: '🔥', family: 'energy', about:
        'Contrat à terme sur le gaz naturel au hub de Henry, en Louisiane, coté en dollars par million de BTU. Le gaz se transporte mal : son prix est donc RÉGIONAL, et le cours américain peut diverger fortement du prix européen (TTF) pour la même molécule.', },
    { symbol: 'ZW=F', name: 'Blé', emoji: '🌾', family: 'agricultural', about:
        'Contrat à terme sur le blé au CBOT de Chicago, coté en cents par boisseau. Le cours dépend des récoltes de l\'hémisphère nord et de la mer Noire ; c\'est l\'une des matières premières les plus directement exposées aux conflits et aux aléas climatiques.', },
    { symbol: 'ZC=F', name: 'Maïs', emoji: '🌽', family: 'agricultural', about:
        'Contrat à terme sur le maïs au CBOT, coté en cents par boisseau. Une part importante de la récolte américaine part vers l\'éthanol et l\'alimentation animale : le cours suit donc autant l\'énergie et l\'élevage que la demande alimentaire directe.', },
    { symbol: 'KC=F', name: 'Café', emoji: '☕', family: 'agricultural', about:
        'Contrat à terme sur le café arabica, coté à l\'ICE en cents par livre. L\'arabica pousse en altitude et supporte mal la chaleur : une gelée ou une sécheresse au Brésil suffit à faire bouger le cours mondial de plusieurs dizaines de pour cent.', },
    { symbol: 'SB=F', name: 'Sucre', emoji: '🍬', family: 'agricultural', about:
        'Contrat à terme sur le sucre brut (contrat n° 11) coté à l\'ICE, en cents par livre. Le Brésil arbitre en permanence sa canne entre sucre et éthanol : le cours du sucre est donc partiellement indexé sur celui du pétrole.', },
    { symbol: 'CC=F', name: 'Cacao', emoji: '🍫', family: 'agricultural', about:
        'Contrat à terme sur le cacao coté à l\'ICE, en dollars par tonne. La production est concentrée sur quelques pays d\'Afrique de l\'Ouest, et les arbres mettent des années à produire : l\'offre ne réagit pas au prix à court terme, ce qui explique l\'ampleur des mouvements.', },
  ],

  // Pas de `domain` : un indice n'est pas une entreprise et n'a pas de logo. Son
  // monogramme (« CA » pour CAC 40) suffit à le distinguer dans une liste.
  index: [
    { symbol: '^FCHI', name: 'CAC 40', country: 'France', exchange: 'Euronext Paris', about:
        'Indice de référence de la place de Paris, composé de 40 valeurs choisies parmi les cent plus fortes capitalisations d\'Euronext Paris. La pondération se fait sur le flottant — les titres réellement échangeables — et aucune valeur ne peut dépasser 15 % de l\'indice, ce qui l\'empêche d\'être emporté par un seul titre. C\'est un indice de PRIX : les dividendes versés n\'y sont pas réintégrés, à la différence du DAX allemand. Comparer les deux performances brutes revient donc à comparer deux choses différentes.', },
    { symbol: '^GSPC', name: 'S&P 500', country: 'États-Unis', exchange: 'NYSE', about:
        'Cinq cents grandes entreprises cotées aux États-Unis, pondérées par leur capitalisation flottante. La sélection n\'est pas mécanique : un comité arbitre les entrées et les sorties sur des critères de taille, de liquidité et de rentabilité. C\'est l\'indice que la gestion indicielle mondiale suit le plus, ce qui en fait autant un baromètre qu\'une destination de flux.', },
    { symbol: '^DJI', name: 'Dow Jones Industrial', country: 'États-Unis', exchange: 'NYSE', about:
        'Trente valeurs américaines, et une construction qui n\'a pas d\'équivalent parmi les grands indices : la pondération se fait sur le PRIX de l\'action, pas sur la capitalisation. Une entreprise dont le titre vaut 500 dollars y pèse donc dix fois plus qu\'une entreprise cotée 50, quelle que soit sa taille réelle. C\'est le plus ancien indice boursier encore publié, et cette méthode est un héritage de l\'époque où il fallait pouvoir le calculer à la main.', },
    { symbol: '^IXIC', name: 'Nasdaq Composite', country: 'États-Unis', exchange: 'NASDAQ', about:
        'Toutes les valeurs cotées au Nasdaq — plusieurs milliers — pondérées par capitalisation. À ne pas confondre avec le Nasdaq 100, qui n\'en retient que les cent premières hors sociétés financières et que suivent la plupart des produits indiciels. La composante technologique y domine largement, ce qui en fait un indicateur de secteur autant qu\'un indice de marché.', },
    { symbol: '^GDAXI', name: 'DAX', country: 'Allemagne', exchange: 'Xetra', about:
        'Quarante valeurs allemandes depuis septembre 2021, contre trente auparavant. C\'est un indice de PERFORMANCE : les dividendes y sont réinvestis, ce qui gonfle mécaniquement sa progression de long terme par rapport à un indice de prix comme le CAC 40. Les deux ne se comparent pas directement.', },
    { symbol: '^FTSE', name: 'FTSE 100', country: 'Royaume-Uni', exchange: 'London Stock Exchange', about:
        'Les cent plus fortes capitalisations de la Bourse de Londres. Sa particularité est ailleurs que dans sa méthode : ses composantes réalisent l\'essentiel de leur chiffre d\'affaires hors du Royaume-Uni. Une livre sterling qui baisse gonfle donc leurs revenus convertis, et l\'indice monte souvent quand la devise recule.', },
    { symbol: '^STOXX50E', name: 'Euro Stoxx 50', country: 'Zone euro', exchange: 'Eurex', about:
        'Cinquante valeurs de premier plan de la zone euro, réparties sur une dizaine de pays. C\'est l\'indice paneuropéen le plus suivi par les produits dérivés, et le point de comparaison naturel d\'un portefeuille européen — là où le CAC 40 ne décrit qu\'une place.', },
    { symbol: '^N225', name: 'Nikkei 225', country: 'Japon', exchange: 'Tokyo Stock Exchange', about:
        'Deux cent vingt-cinq valeurs japonaises, pondérées par le prix comme le Dow Jones et non par la capitalisation. Publié en continu depuis 1950, il reste la référence de la place de Tokyo malgré cette méthode ancienne, que le TOPIX — pondéré par capitalisation — corrige.', },
    { symbol: '^HSI', name: 'Hang Seng', country: 'Hong Kong', exchange: 'HKEX', about:
        'Principales valeurs cotées à Hong Kong, dont une part croissante d\'entreprises de Chine continentale. C\'est la fenêtre la plus accessible sur l\'économie chinoise pour un investisseur étranger, les places de Shanghai et de Shenzhen restant partiellement fermées.', },
    { symbol: '^VIX', name: 'VIX (volatilité)', country: 'États-Unis', exchange: 'CBOE', about:
        'Ce n\'est pas un indice d\'actions. Le VIX mesure la volatilité IMPLICITE à trente jours déduite du prix des options sur le S&P 500 : autrement dit, l\'ampleur des mouvements que le marché est en train de payer pour se couvrir. Il monte quand les actions chutent, d\'où son surnom d\'« indice de la peur ». Il ne s\'achète pas directement — seuls des contrats à terme et des produits dérivés le suivent, et ils ne reproduisent pas sa valeur.', },

    // ── Les vingt ajouts ────────────────────────────────────────────────────
    // prettier-ignore-start
    { symbol: '^NDX', name: 'Nasdaq 100', country: 'États-Unis', exchange: 'NASDAQ', about:
        'Les cent plus fortes capitalisations du Nasdaq hors sociétés financières. C\'est LUI, et non le Nasdaq Composite, que suivent la quasi-totalité des produits indiciels « Nasdaq » — dont l\'ETF QQQ. La concentration y est extrême : une poignée de valeurs technologiques en fait la moitié.', },
    { symbol: '^RUT', name: 'Russell 2000', country: 'États-Unis', exchange: 'NYSE', about:
        'Deux mille petites capitalisations américaines, extraites du Russell 3000 après retrait des mille plus grandes. C\'est le baromètre des entreprises tournées vers le marché intérieur américain : il diverge souvent du S&P 500, dont les composantes réalisent une large part de leur activité à l\'étranger.', },
    { symbol: '^SOX', name: 'Philadelphia Semiconductor', country: 'États-Unis', exchange: 'NASDAQ', about:
        'Une trentaine de concepteurs, fabricants et équipementiers de semi-conducteurs. Sa particularité est d\'être CYCLIQUE au sens fort : la demande de puces amplifie les cycles de l\'électronique, de l\'automobile et des centres de données, ce qui en fait l\'un des indices sectoriels les plus volatils.', },
    { symbol: '^STOXX', name: 'STOXX Europe 600', country: 'Europe', exchange: 'Eurex', about:
        'Six cents valeurs réparties sur dix-sept pays européens, zone euro comprise mais pas seulement — le Royaume-Uni et la Suisse y figurent. C\'est l\'indice le plus large de l\'Europe cotée, et le point de comparaison qui convient à un portefeuille européen diversifié, là où l\'Euro Stoxx 50 se limite à cinquante valeurs de la seule zone euro.', },
    { symbol: '^N100', name: 'Euronext 100', country: 'Zone euro', exchange: 'Euronext', about:
        'Les cent plus fortes capitalisations cotées sur les places d\'Euronext — Paris, Amsterdam, Bruxelles, Lisbonne, Dublin, Oslo et Milan. Il donne une lecture de l\'infrastructure boursière continentale plutôt que d\'un pays.', },
    { symbol: '^AEX', name: 'AEX (Amsterdam)', country: 'Pays-Bas', exchange: 'Euronext Amsterdam', about:
        'Vingt-cinq valeurs néerlandaises. Sa composition est très concentrée sur quelques géants — semi-conducteurs, brasserie, pétrole, paiements — ce qui rend l\'indice sensible à des trajectoires d\'entreprise individuelles autant qu\'à l\'économie du pays.', },
    { symbol: '^IBEX', name: 'IBEX 35', country: 'Espagne', exchange: 'BME', about:
        'Trente-cinq valeurs de la Bourse de Madrid, pondérées par le flottant. Les banques et les services aux collectivités y pèsent lourd, et plusieurs composantes réalisent une part importante de leur activité en Amérique latine — ce qui expose l\'indice au risque de change de cette région.', },
    { symbol: '^SSMI', name: 'SMI (Suisse)', country: 'Suisse', exchange: 'SIX', about:
        'Vingt valeurs suisses. Trois d\'entre elles — deux laboratoires pharmaceutiques et un groupe agroalimentaire — en représentent à elles seules près de la moitié. Il est réputé défensif : ses secteurs dominants réagissent peu au cycle économique.', },
    { symbol: '^BFX', name: 'BEL 20', country: 'Belgique', exchange: 'Euronext Bruxelles', about:
        'Vingt valeurs de la Bourse de Bruxelles. Petit indice d\'une petite place, il se lit surtout en complément d\'un indice paneuropéen plutôt que seul.', },
    { symbol: 'FTSEMIB.MI', name: 'FTSE MIB', country: 'Italie', exchange: 'Borsa Italiana', about:
        'Quarante valeurs de la Bourse de Milan. Les banques y occupent une place inhabituellement grande pour un grand indice européen, ce qui le rend particulièrement sensible aux taux et à l\'écart de rendement entre la dette italienne et la dette allemande.', },
    { symbol: '^OMX', name: 'OMX Stockholm 30', country: 'Suède', exchange: 'Nasdaq Stockholm', about:
        'Les trente valeurs les plus échangées de la Bourse de Stockholm. L\'industrie exportatrice y domine : l\'indice suit donc autant la demande mondiale et le cours de la couronne que l\'économie suédoise.', },
    { symbol: '^GSPTSE', name: 'S&P/TSX Composite', country: 'Canada', exchange: 'Toronto Stock Exchange', about:
        'Principal indice canadien, très pondéré en énergie, en matières premières et en banques. Il se comporte souvent comme un indice de ressources naturelles adossé à un système bancaire concentré, plutôt que comme un indice de marché large.', },
    { symbol: '^AXJO', name: 'S&P/ASX 200', country: 'Australie', exchange: 'ASX', about:
        'Deux cents valeurs australiennes. Les mines et les quatre grandes banques en font l\'essentiel : l\'indice est l\'un des plus directement exposés à la demande chinoise en minerai de fer.', },
    { symbol: '^BSESN', name: 'BSE Sensex', country: 'Inde', exchange: 'Bombay Stock Exchange', about:
        'Trente valeurs de la Bourse de Bombay, la plus ancienne d\'Asie. Avec le Nifty 50, c\'est l\'indice de référence du marché indien.', },
    { symbol: '^NSEI', name: 'Nifty 50', country: 'Inde', exchange: 'National Stock Exchange of India', about:
        'Cinquante valeurs de la National Stock Exchange, la place indienne la plus active en volume. C\'est lui, et non le Sensex, que suivent la plupart des produits dérivés et indiciels indiens.', },
    { symbol: '^KS11', name: 'KOSPI', country: 'Corée du Sud', exchange: 'Korea Exchange', about:
        'L\'ensemble des valeurs cotées à la Bourse de Séoul, pondérées par capitalisation. Les semi-conducteurs et l\'électronique y pèsent très lourd, ce qui en fait un indicateur avancé du cycle mondial des composants.', },
    { symbol: '^TWII', name: 'TAIEX (Taïwan)', country: 'Taïwan', exchange: 'Taiwan Stock Exchange', about:
        'Toutes les valeurs cotées à Taipei. Un seul fondeur de semi-conducteurs en représente une part considérable : l\'indice suit d\'abord la chaîne de fabrication mondiale des puces.', },
    { symbol: '^BVSP', name: 'Ibovespa', country: 'Brésil', exchange: 'B3', about:
        'Principal indice brésilien, dominé par les matières premières et les banques. Coté en réal, il faut distinguer sa performance locale de sa performance convertie en euro — les deux ont souvent divergé de plusieurs dizaines de points.', },
    { symbol: '^TNX', name: 'Rendement 10 ans américain', country: 'États-Unis', exchange: 'CBOE', about:
        'Ce n\'est pas un indice d\'actions mais un TAUX : le rendement à l\'échéance de l\'obligation d\'État américaine à dix ans, exprimé en pourcentage. Il sert de taux sans risque de référence à l\'échelle mondiale — c\'est le nombre par rapport auquel la plupart des autres actifs sont valorisés. Il monte quand le prix de l\'obligation baisse : les deux vont toujours en sens inverse.', },
    { symbol: 'DX-Y.NYB', name: 'Indice dollar (DXY)', country: 'États-Unis', exchange: 'ICE', about:
        'Le dollar américain mesuré contre un panier de six devises, dont l\'euro représente à lui seul près de 58 %. Ce n\'est donc pas « la force du dollar dans le monde » mais surtout sa force face à l\'euro et au yen — la composition du panier n\'a pas changé depuis 1999, et la Chine n\'y figure pas.', },
    // prettier-ignore-end
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
