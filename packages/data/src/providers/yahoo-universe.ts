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
