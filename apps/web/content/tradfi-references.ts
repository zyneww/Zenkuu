import type { AssetClass } from '@zenkuu/data'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * REPÈRES DE FINANCE TRADITIONNELLE — DES QUANTITÉS, PAS DES CAPITALISATIONS
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── LE PROBLÈME QUE CE FICHIER RÉSOUT ───────────────────────────────────────
 *
 * Mettre un actif « face à la finance traditionnelle » demande de comparer des
 * TAILLES : combien pèse ce jeton à côté de l'or, d'Apple, du cuivre. Aucune de nos
 * sources ne publie ces tailles. Yahoo donne un cours et rien d'autre pour une action ;
 * une matière première n'a même pas de capitalisation au sens propre — un contrat à
 * terme sur l'or ne « capitalise » rien.
 *
 * ── CE QU'ON STOCKE, ET POURQUOI CE N'EST PAS UNE CAPITALISATION ────────────
 *
 * Une capitalisation figée au dépôt serait périmée le lendemain et fausse le
 * surlendemain. On stocke donc la QUANTITÉ — nombre d'actions en circulation, stock
 * d'or extrait — et la capitalisation se calcule au rendu :
 *
 *     taille = cours du jour × quantité déclarée
 *
 * Le cours est vivant, la quantité bouge lentement et se publie. Le produit est donc
 * juste à l'instant où on le lit, et la seule chose à tenir à jour est un nombre qui
 * change une fois par trimestre.
 *
 * ⚠️ LA QUANTITÉ EST DANS L'UNITÉ DU COURS, ET C'EST LE PIÈGE DE CE FICHIER. L'or se
 * cote à l'once troy, le cuivre à la livre, une action à l'unité. Mélanger les deux
 * — des tonnes en face d'un cours à l'once — donnerait un nombre plausible et faux
 * d'un facteur trente-deux mille. Chaque entrée porte donc son unité EN TOUTES
 * LETTRES, et la conversion depuis la source est faite ici, une fois, avec son calcul.
 *
 * ── CE QUE CES CHIFFRES SONT, ET NE SONT PAS ────────────────────────────────
 *
 * Ce sont des ESTIMATIONS PUBLIÉES, chacune avec sa source et sa date. Le stock d'or
 * mondial n'est pas mesuré, il est estimé par le World Gold Council ; le cuivre
 * cumulé extrait vient de l'USGS ; le nombre d'actions vient des dépôts trimestriels
 * des sociétés. L'interface le dit, et affiche la date de chaque relevé.
 *
 * Ce ne sont PAS des mesures de marché, et la comparaison qui en découle n'est pas une
 * prévision : « ×12 pour égaler l'or » dit un RAPPORT DE TAILLES, pas une trajectoire.
 */

export interface TradFiReference {
  /** Nom affiché. */
  name: string
  symbol: string
  /**
   * Classe et identifiant CHEZ NOUS, pour retrouver le cours du jour.
   *
   * ⚠️ `id` EST LE SLUG, PAS LE SYMBOLE. Yahoo cote l'or « GC=F » ; nos URLs et nos
   * lignes de classement portent « gc-f », parce que `=`, `^` et `.` exigeraient un
   * encodage systématique et donneraient des adresses illisibles — voir `toSlug` dans
   * `yahoo-universe.ts`. Mettre le symbole brut ici fait échouer la jointure en
   * silence : la ligne disparaît simplement de la table, sans erreur.
   */
  assetClass: Extract<AssetClass, 'commodity' | 'stock'>
  id: string
  /**
   * Quantité en circulation, EXPRIMÉE DANS L'UNITÉ DU COURS.
   *
   * Voir l'avertissement en tête : c'est le seul champ dont une erreur ne se voit pas
   * à l'écran, puisque le produit reste un grand nombre plausible.
   */
  units: number
  /** L'unité, écrite pour que la relecture soit possible sans ouvrir la source. */
  unit: string
  /** Le calcul qui a produit `units`, quand il y en a un. */
  derivation?: string
  /** Qui publie l'estimation, et à quelle date elle a été relevée. */
  source: string
  asOf: string
}

/** Une once troy par tonne métrique — la constante qui fait toute la conversion. */
const OZ_PER_TONNE = 32_150.7
/** Livres avoirdupois par tonne métrique. */
const LB_PER_TONNE = 2_204.62

export const TRADFI_REFERENCES: TradFiReference[] = [
  {
    name: 'Or',
    symbol: 'GC=F',
    assetClass: 'commodity',
    id: 'gc-f',
    /* 216 265 tonnes extraites depuis toujours et encore détenues, converties en
       onces troy parce que le contrat se cote à l'once. */
    units: 216_265 * OZ_PER_TONNE,
    unit: 'onces troy',
    derivation: '216 265 t × 32 150,7 oz/t',
    source: 'World Gold Council — stock d’or extrait',
    asOf: '2024',
  },
  {
    name: 'Argent',
    symbol: 'SI=F',
    assetClass: 'commodity',
    id: 'si-f',
    units: 1_740_000 * OZ_PER_TONNE,
    unit: 'onces troy',
    derivation: '1 740 000 t × 32 150,7 oz/t',
    source: 'The Silver Institute — production cumulée',
    asOf: '2024',
  },
  {
    name: 'Cuivre',
    symbol: 'HG=F',
    assetClass: 'commodity',
    id: 'hg-f',
    /* Le cuivre se cote à la LIVRE et non à l'once : la constante change, et c'est
       exactement l'erreur que l'avertissement en tête décrit. */
    units: 700_000_000 * LB_PER_TONNE,
    unit: 'livres',
    derivation: '700 Mt × 2 204,62 lb/t',
    source: 'USGS — production cumulée de cuivre',
    asOf: '2024',
  },
  {
    name: 'Apple',
    symbol: 'AAPL',
    assetClass: 'stock',
    id: 'aapl',
    units: 14_840_000_000,
    unit: 'actions',
    source: 'Dépôt trimestriel Apple Inc.',
    asOf: '2025-T3',
  },
  {
    name: 'Microsoft',
    symbol: 'MSFT',
    assetClass: 'stock',
    id: 'msft',
    units: 7_430_000_000,
    unit: 'actions',
    source: 'Dépôt trimestriel Microsoft Corp.',
    asOf: '2025-T3',
  },
  {
    name: 'NVIDIA',
    symbol: 'NVDA',
    assetClass: 'stock',
    id: 'nvda',
    units: 24_400_000_000,
    unit: 'actions',
    source: 'Dépôt trimestriel NVIDIA Corp.',
    asOf: '2025-T3',
  },
  {
    name: 'Alphabet',
    symbol: 'GOOGL',
    assetClass: 'stock',
    id: 'googl',
    units: 12_100_000_000,
    unit: 'actions',
    source: 'Dépôt trimestriel Alphabet Inc.',
    asOf: '2025-T3',
  },
]
