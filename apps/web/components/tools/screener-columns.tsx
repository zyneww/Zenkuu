import type { MarketAsset } from '@zenkuu/data'
import { ChangeBadge } from '@zenkuu/ui'

import { Money, Quantity } from '@/components/locale/Money'

/**
 * JEUX DE COLONNES DU SCREENER — repris de TradingView.
 *
 * ── CE QUE CETTE STRUCTURE RÉSOUT ─────────────────────────────────────────────
 *
 * Le tableau montrait cinq colonnes figées : prix, 24 h, 7 j, volume,
 * capitalisation. C'est le bon défaut, et c'est très insuffisant pour un outil qui
 * s'appelle un screener — dès qu'on filtre sur la rotation ou sur l'offre, la colonne
 * qui porte le critère n'est pas à l'écran. On règle un curseur en aveugle, puis on
 * ouvre une fiche pour vérifier ce que le filtre a fait.
 *
 * TradingView répond à cela par une rangée d'onglets — « Vue d'ensemble »,
 * « Performance », « Évaluation », « Dividendes »… — qui change les COLONNES sans
 * toucher aux filtres. C'est la bonne réponse : le filtre dit ce qu'on cherche, le jeu
 * de colonnes dit ce qu'on veut voir, et les deux questions sont indépendantes.
 *
 * ── POURQUOI QUATRE JEUX ET PAS DOUZE ─────────────────────────────────────────
 *
 * La référence en aligne une douzaine, dont la moitié n'a de sens que pour une action
 * — compte de résultat, bilan, cash flow, dividendes. Nous n'avons pas ces données, et
 * un onglet qui s'ouvrirait sur une grille de tirets ferait passer un outil complet
 * pour une démonstration bridée. Les quatre jeux ci-dessous ne portent QUE des champs
 * réellement présents dans la réponse de classement.
 *
 * ── UNE COLONNE PORTE SA PROPRE CLÉ DE TRI ────────────────────────────────────
 *
 * `sortValue` renvoie un nombre, ou `null` quand la donnée manque. La distinction
 * compte : les lignes sans valeur sont rejetées EN FIN de tri quel que soit le sens,
 * plutôt que traitées comme des zéros — un actif dont la capitalisation n'est pas
 * publiée n'a pas une capitalisation nulle, et le classer premier en tri croissant
 * serait un contresens.
 */

export interface ScreenerColumn {
  key: string
  label: string
  /** Aide affichée au survol de l'en-tête, quand la colonne n'est pas évidente. */
  hint?: string
  /** Valeur numérique de tri, ou `null` si la donnée manque. */
  sortValue: (asset: MarketAsset) => number | null
  render: (asset: MarketAsset) => React.ReactNode
  /**
   * Point de rupture en dessous duquel la colonne disparaît.
   *
   * Un tableau de sept colonnes sur 375 pixels n'est pas un tableau, c'est un
   * défilement latéral. Chaque jeu déclare donc ce qu'il sacrifie en premier.
   */
  hideBelow?: 'sm' | 'md' | 'lg'
}

export interface ColumnSet {
  id: string
  label: string
  hint: string
  columns: ScreenerColumn[]
}

/** Rotation quotidienne : volume 24 h rapporté à la capitalisation, en pourcentage. */
function turnover(asset: MarketAsset): number | null {
  const cap = asset.marketCap
  const volume = asset.volume24h
  if (!cap || cap <= 0 || volume === undefined) return null
  return (volume / cap) * 100
}

/** Part de l'offre maximale déjà émise, en pourcentage. */
function issued(asset: MarketAsset): number | null {
  const max = asset.maxSupply
  const circulating = asset.circulatingSupply
  if (!max || max <= 0 || circulating === undefined) return null
  return (circulating / max) * 100
}

/**
 * Écart entre le cours et le plus haut historique, en pourcentage.
 *
 * ── CALCULÉ ICI, ET C'EST LÉGITIME ────────────────────────────────────────────
 *
 * Le site s'interdit de dériver des chiffres de marché, et la règle vaut. Elle ne
 * s'applique pas à celui-ci pour deux raisons : les deux termes sont PUBLIÉS par la
 * source — cours et plus haut historique — et la formule est celle que la source
 * documente elle-même pour ce même écart. On refait donc son calcul avec ses
 * nombres, on n'estime rien.
 *
 * Le champ `athChangePercent` existe bien, mais seulement sur la fiche détaillée :
 * la réponse de classement, qui alimente ce tableau, ne le porte pas. L'alternative
 * serait une colonne vide sur 250 lignes.
 */
function fromHigh(asset: MarketAsset): number | null {
  const { ath, price } = asset
  if (!ath || ath <= 0 || !price) return null
  return ((price - ath) / ath) * 100
}

/** Amplitude du jour rapportée au cours, en pourcentage. */
function dayRange(asset: MarketAsset): number | null {
  const { high24h, low24h, price } = asset
  if (high24h === undefined || low24h === undefined || !price) return null
  return ((high24h - low24h) / price) * 100
}

const percent = (value: number | null): React.ReactNode =>
  value === null ? <span className="text-ink-muted">—</span> : (
    <span className="tabular">{value.toFixed(1).replace('.', ',')} %</span>
  )

/* ── Colonnes réutilisées d'un jeu à l'autre ──────────────────────────────────
 *
 * Elles sont DÉFINIES UNE FOIS et citées dans plusieurs jeux : le prix apparaît dans
 * trois d'entre eux, et trois définitions divergeraient à la première retouche de
 * format. C'est aussi ce qui garantit qu'une même colonne trie de la même façon
 * quel que soit l'onglet où on la rencontre.
 */

const price: ScreenerColumn = {
  key: 'price',
  label: 'Prix',
  sortValue: (asset) => asset.price ?? null,
  render: (asset) => <Money value={asset.price} from={asset.currency} />,
}

const change24h: ScreenerColumn = {
  key: 'change24h',
  label: '24 h',
  sortValue: (asset) => asset.change24h ?? null,
  render: (asset) => <ChangeBadge value={asset.change24h} size="sm" />,
}

const change7d: ScreenerColumn = {
  key: 'change7d',
  label: '7 j',
  sortValue: (asset) => asset.change7d ?? null,
  render: (asset) => <ChangeBadge value={asset.change7d} size="sm" />,
}

const volume: ScreenerColumn = {
  key: 'volume24h',
  label: 'Volume 24 h',
  sortValue: (asset) => asset.volume24h ?? null,
  render: (asset) => <Money value={asset.volume24h} from={asset.currency} compact />,
}

const marketCap: ScreenerColumn = {
  key: 'marketCap',
  label: 'Capitalisation',
  sortValue: (asset) => asset.marketCap ?? null,
  render: (asset) => <Money value={asset.marketCap} from={asset.currency} compact />,
}

export const COLUMN_SETS: ColumnSet[] = [
  {
    id: 'apercu',
    label: 'Vue d’ensemble',
    hint: 'Cours, variations, taille',
    columns: [
      price,
      change24h,
      { ...change7d, hideBelow: 'sm' },
      { ...volume, hideBelow: 'md' },
      { ...marketCap, hideBelow: 'sm' },
    ],
  },
  {
    id: 'performance',
    label: 'Performance',
    hint: 'Variations et distance aux extrêmes',
    columns: [
      change24h,
      change7d,
      {
        key: 'athChange',
        label: 'Depuis le plus haut',
        hint: 'Écart entre le cours et le plus haut historique : (cours − plus haut) ÷ plus haut',
        sortValue: fromHigh,
        render: (asset) => <ChangeBadge value={fromHigh(asset) ?? undefined} size="sm" />,
        hideBelow: 'sm',
      },
      {
        key: 'dayRange',
        label: 'Amplitude du jour',
        hint: 'Écart entre le plus haut et le plus bas des 24 h, rapporté au cours',
        sortValue: dayRange,
        render: (asset) => percent(dayRange(asset)),
        hideBelow: 'md',
      },
      { ...price, hideBelow: 'sm' },
    ],
  },
  {
    id: 'liquidite',
    label: 'Liquidité',
    hint: 'Ce qui s’échange réellement',
    columns: [
      volume,
      {
        key: 'turnover',
        label: 'Rotation',
        hint: 'Volume 24 h ÷ capitalisation. Distingue un gros actif somnolent d’un petit actif très échangé.',
        sortValue: turnover,
        render: (asset) => percent(turnover(asset)),
      },
      marketCap,
      { ...price, hideBelow: 'md' },
      { ...change24h, hideBelow: 'sm' },
    ],
  },
  {
    id: 'offre',
    label: 'Offre',
    hint: 'Ce qui circule et ce qui reste à émettre',
    columns: [
      {
        key: 'circulating',
        label: 'En circulation',
        sortValue: (asset) => asset.circulatingSupply ?? null,
        render: (asset) => <Quantity value={asset.circulatingSupply} />,
      },
      {
        key: 'maxSupply',
        label: 'Offre maximale',
        hint: 'Absente quand le projet n’en fixe aucune — ce n’est pas un zéro.',
        sortValue: (asset) => asset.maxSupply ?? null,
        render: (asset) => <Quantity value={asset.maxSupply} />,
        hideBelow: 'sm',
      },
      {
        key: 'issued',
        label: 'Part émise',
        hint: 'Offre en circulation ÷ offre maximale',
        sortValue: issued,
        render: (asset) => percent(issued(asset)),
        hideBelow: 'md',
      },
      { ...marketCap, hideBelow: 'sm' },
    ],
  },
]

/** Classe Tailwind de masquage d'une colonne selon son point de rupture. */
export function hiddenClass(column: ScreenerColumn): string {
  if (column.hideBelow === 'sm') return 'hidden sm:table-cell'
  if (column.hideBelow === 'md') return 'hidden md:table-cell'
  if (column.hideBelow === 'lg') return 'hidden lg:table-cell'
  return ''
}
