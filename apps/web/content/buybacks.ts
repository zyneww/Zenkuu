/**
 * ══════════════════════════════════════════════════════════════════════════════
 * REGISTRE DES PROGRAMMES DE RACHAT — DÉCLARATIF, ET IL FAUT LE DIRE
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── CE QUE CE FICHIER EST, ET CE QU'IL N'EST PAS ────────────────────────────
 *
 * C'est un RECENSEMENT de programmes ANNONCÉS : un protocole a publié qu'il consacre
 * une part de ses revenus à racheter son propre jeton sur le marché. Chaque entrée
 * porte l'adresse de l'annonce ou de la documentation, et c'est elle qui fait foi.
 *
 * Ce n'est PAS une mesure. Zenkuu ne lit aujourd'hui aucun flux de rachat on-chain :
 * ni le montant déployé, ni sa cadence, ni la part de l'offre retirée. Ces colonnes
 * affichent donc « — », et la page le dit en toutes lettres. Inventer un montant
 * plausible serait le seul mensonge qu'un tableau sache produire (§5).
 *
 * ── POURQUOI UN FICHIER ÉCRIT ET NON UNE SOURCE ─────────────────────────────
 *
 * Aucune source gratuite ne publie la LISTE des programmes de rachat. Les agrégateurs
 * qui la tiennent — hypurrintel et ses semblables — la maintiennent à la main, comme
 * ici. Le registre est donc écrit au dépôt, versionné et relisible, plutôt que
 * dérivé d'une API qui n'existe pas.
 *
 * ⚠️ `coingeckoId` EST LA SEULE COLONNE QUI PARLE AU RESTE DU SITE. Elle raccorde
 * l'entrée au classement crypto pour en tirer cours, capitalisation et variation.
 * Un identifiant erroné ne casse rien : la ligne s'affiche avec ses colonnes de
 * marché à « — », exactement comme un jeton hors des 250 premiers.
 */

/** Ce que devient le jeton racheté. */
export type BuybackFate =
  /** Envoyé à une adresse d'où il ne peut plus sortir : l'offre baisse. */
  | 'burn'
  /** Conservé par le protocole : l'offre en circulation baisse, l'offre totale non. */
  | 'treasury'
  /** Redistribué aux détenteurs qui immobilisent le jeton. */
  | 'distribute'

export interface BuybackProgram {
  /** Nom du protocole, tel qu'il se nomme lui-même. */
  name: string
  symbol: string
  /** Identifiant CoinGecko — voir l'avertissement en tête de fichier. */
  coingeckoId: string
  /** Ce qui finance le rachat, en une ligne. */
  funding: string
  fate: BuybackFate
  /** Année d'entrée en vigueur du programme. */
  since: number
  /** Documentation ou annonce officielle. C'est cette adresse qui fait foi. */
  source: string
}

export const BUYBACK_PROGRAMS: BuybackProgram[] = [
  {
    name: 'Hyperliquid',
    symbol: 'HYPE',
    coingeckoId: 'hyperliquid',
    funding: 'Frais de la plateforme, via l’Assistance Fund',
    fate: 'treasury',
    since: 2024,
    source: 'https://hyperfoundation.org/',
  },
  {
    name: 'Pump.fun',
    symbol: 'PUMP',
    coingeckoId: 'pump-fun',
    funding: 'Revenus du protocole',
    fate: 'treasury',
    since: 2025,
    source: 'https://pump.fun/',
  },
  {
    name: 'Aave',
    symbol: 'AAVE',
    coingeckoId: 'aave',
    funding: 'Excédent du trésor de la DAO',
    fate: 'treasury',
    since: 2025,
    source: 'https://governance.aave.com/',
  },
  {
    name: 'Sky',
    symbol: 'SKY',
    coingeckoId: 'sky',
    funding: 'Excédent du protocole, via le Smart Burn Engine',
    fate: 'burn',
    since: 2024,
    source: 'https://sky.money/',
  },
  {
    name: 'Jupiter',
    symbol: 'JUP',
    coingeckoId: 'jupiter-exchange-solana',
    funding: 'Part des frais du protocole, via le Litterbox Trust',
    fate: 'treasury',
    since: 2025,
    source: 'https://jup.ag/',
  },
  {
    name: 'dYdX',
    symbol: 'DYDX',
    coingeckoId: 'dydx-chain',
    funding: 'Part des frais nets du protocole',
    fate: 'treasury',
    since: 2025,
    source: 'https://dydx.foundation/',
  },
  {
    name: 'Raydium',
    symbol: 'RAY',
    coingeckoId: 'raydium',
    funding: 'Part des frais de transaction',
    fate: 'burn',
    since: 2021,
    source: 'https://raydium.io/',
  },
]

export const BUYBACK_FATE_LABEL: Record<BuybackFate, string> = {
  burn: 'Brûlé',
  treasury: 'Conservé',
  distribute: 'Redistribué',
}
