import { Link } from '@/i18n/navigation'

import type { MarketCategory } from '@zenkuu/data'
import { formatCurrency, formatPercent } from '@zenkuu/ui'

/**
 * Carte thermique des secteurs — pavage calculé CÔTÉ SERVEUR, sans bibliothèque.
 *
 * Deux variables sur une seule figure : la SURFACE porte la capitalisation, la
 * COULEUR porte la variation. C'est précisément ce qu'un tableau fait mal — il faut y
 * lire deux colonnes et les rapprocher ligne à ligne — et ce qu'une carte thermique
 * donne d'un coup d'œil : un grand rectangle rouge ne dit pas la même chose qu'un
 * petit, alors que dans un tableau les deux affichent « −4 % ».
 *
 * ── POURQUOI PAS LA BIBLIOTHÈQUE DE GRAPHIQUES ────────────────────────────────
 *
 * La première version passait par le composant `Treemap` de Recharts. Elle imposait
 * trois coûts qu'une carte thermique ne justifie pas : le composant devient client,
 * la bibliothèque entière descend au navigateur, et le rendu attend l'hydratation —
 * pour une figure dont RIEN n'est interactif au-delà d'un lien par tuile.
 *
 * Le pavage ci-dessous est calculé une seule fois, au rendu serveur, par l'algorithme
 * « squarifié » de Bruls, Huizing et van Wijk. Il descend au navigateur sous forme de
 * div positionnées en pourcentages : zéro octet de JavaScript, responsive par
 * construction, lisible sans JavaScript, et chaque tuile est un vrai lien — donc
 * ouvrable dans un onglet et atteignable au clavier, ce qu'un `<rect>` SVG cliquable
 * n'est pas.
 *
 * Les graphiques de la bibliothèque restent la règle ailleurs : ils gagnent dès qu'il
 * y a une infobulle au survol, un sélecteur de période ou une animation d'entrée.
 * Aucune des trois ici.
 *
 * ⚠️ LES SURFACES NE PARTAGENT PAS UN TOUT. Un actif appartient à plusieurs secteurs
 * — Bitcoin relève de « Layer 1 » comme de « Proof of Work » —, si bien que la somme
 * des rectangles dépasse largement la capitalisation mondiale. La figure compare les
 * secteurs ENTRE EUX. C'est écrit sous la carte, parce qu'une carte thermique suggère
 * fortement le contraire.
 */

/** Au-delà de ce seuil, l'intensité de couleur sature. */
const CLAMP = 10

interface Tile {
  id: string
  name: string
  value: number
  change?: number
  volume?: number
  /** Position en POURCENTAGES du conteneur — d'où la réactivité sans JavaScript. */
  x: number
  y: number
  width: number
  height: number
}

/**
 * Teinte d'un secteur.
 *
 * `color-mix` plutôt qu'une échelle de teintes codée en dur : les deux couleurs
 * sémantiques suivent alors la bascule de thème sans une ligne de JavaScript.
 *
 * L'intensité est plafonnée à ±10 % : sans plafond, un secteur minuscule à +300 %
 * écraserait l'échelle et rendrait tout le reste uniformément pâle.
 */
function toneFor(change: number | undefined): string {
  if (change === undefined) return 'var(--color-surface-muted)'

  const intensity = Math.min(Math.abs(change), CLAMP) / CLAMP
  const base = change >= 0 ? 'var(--color-up)' : 'var(--color-down)'
  const weight = Math.round(16 + intensity * 60)
  return `color-mix(in srgb, ${base} ${weight}%, var(--color-surface))`
}

/**
 * Pavage squarifié.
 *
 * L'algorithme empile les éléments dans une bande tant que cela AMÉLIORE le pire
 * rapport d'aspect de la bande, puis ferme la bande et repart sur l'espace restant.
 * C'est ce qui évite les rectangles filiformes d'un découpage naïf — et un rectangle
 * filiforme est un rectangle dont on ne peut pas lire l'étiquette, donc une case
 * perdue.
 */
function squarify(items: { id: string; name: string; value: number; change?: number; volume?: number }[]): Tile[] {
  const total = items.reduce((sum, item) => sum + item.value, 0)
  if (total <= 0) return []

  const tiles: Tile[] = []
  // Espace restant, en pourcentages.
  let x = 0
  let y = 0
  let width = 100
  let height = 100

  let remaining = [...items]
  let remainingValue = total

  /** Pire rapport d'aspect d'une bande, la mesure que l'algorithme minimise. */
  function worst(row: number[], side: number, scale: number): number {
    if (row.length === 0 || side === 0) return Infinity
    const sum = row.reduce((acc, value) => acc + value, 0)
    const area = sum * scale
    if (area === 0) return Infinity
    const max = Math.max(...row)
    const min = Math.min(...row)
    return Math.max((side * side * max * scale) / (area * area), (area * area) / (side * side * min * scale))
  }

  while (remaining.length > 0) {
    const horizontal = width >= height
    const side = horizontal ? height : width
    // Surface d'une unité de valeur dans l'espace restant.
    const scale = (width * height) / remainingValue

    const row: typeof remaining = []
    let rowValues: number[] = []

    while (remaining.length > 0) {
      const candidate = remaining[0] as (typeof remaining)[number]
      const next = [...rowValues, candidate.value]
      if (row.length > 0 && worst(next, side, scale) > worst(rowValues, side, scale)) break
      row.push(candidate)
      rowValues = next
      remaining = remaining.slice(1)
    }

    const rowValue = rowValues.reduce((sum, value) => sum + value, 0)
    // Épaisseur de la bande : sa surface divisée par sa longueur.
    const thickness = (rowValue * scale) / side

    let offset = 0
    for (const item of row) {
      const share = rowValue > 0 ? item.value / rowValue : 0
      const length = share * side

      tiles.push({
        ...item,
        x: horizontal ? x : x + offset,
        y: horizontal ? y + offset : y,
        width: horizontal ? thickness : length,
        height: horizontal ? length : thickness,
      })

      offset += length
    }

    if (horizontal) {
      x += thickness
      width -= thickness
    } else {
      y += thickness
      height -= thickness
    }

    remainingValue -= rowValue
    // Garde-fou : sans elle, une valeur résiduelle nulle ferait diverger `scale`.
    if (remainingValue <= 0 || width <= 0.01 || height <= 0.01) break
  }

  return tiles
}

export function SectorHeatmap({
  categories,
  count = 40,
}: {
  categories: MarketCategory[]
  count?: number
}) {
  const items = categories
    .filter((category) => (category.marketCap ?? 0) > 0)
    .sort((a, b) => (b.marketCap ?? 0) - (a.marketCap ?? 0))
    .slice(0, count)
    .map((category) => ({
      id: category.id,
      name: category.name,
      value: category.marketCap as number,
      ...(category.marketCapChange24h !== undefined
        ? { change: category.marketCapChange24h }
        : {}),
      ...(category.volume24h !== undefined ? { volume: category.volume24h } : {}),
    }))

  const tiles = squarify(items)
  if (tiles.length === 0) return null

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-card border border-border-subtle p-0.5" role="group" aria-label="Nombre de secteurs">
          {[20, 40, 80].map((size) => (
            <Link
              key={size}
              href={size === 40 ? '/heatmap' : `/heatmap?secteurs=${size}`}
              aria-current={count === size ? 'page' : undefined}
              className={`rounded-sm px-2.5 py-1 text-xs font-medium transition-colors duration-150 ${
                count === size
                  ? 'bg-brand text-on-brand'
                  : 'text-ink-muted hover:bg-surface-muted hover:text-ink'
              }`}
            >
              {size} secteurs
            </Link>
          ))}
        </div>

        <Legend />
      </div>

      {/* Hauteur fixe en pixels, positions en pourcentages : la carte s'adapte en
          largeur sans que rien ne soit recalculé, et reste lisible en hauteur. */}
      <div
        className="relative w-full overflow-hidden rounded-card border border-border-subtle bg-surface"
        style={{ height: 'min(70vh, 560px)' }}
      >
        {tiles.map((tile) => (
          <Link
            key={tile.id}
            href={`/categories/${tile.id}`}
            title={`${tile.name} — ${formatCurrency(tile.value, 'USD', { compact: true }) ?? '—'}${
              tile.change !== undefined ? `, ${formatPercent(tile.change)} sur 24 h` : ''
            }`}
            className="absolute block overflow-hidden border border-canvas p-1.5 transition-opacity duration-150 hover:opacity-80"
            style={{
              left: `${tile.x}%`,
              top: `${tile.y}%`,
              width: `${tile.width}%`,
              height: `${tile.height}%`,
              backgroundColor: toneFor(tile.change),
            }}
          >
            {/* Étiquettes toujours présentes dans le DOM — donc lisibles par un
                lecteur d'écran et par un moteur — mais masquées visuellement quand la
                tuile est trop petite, pour ne pas déborder sur ses voisines. */}
            <span className="block truncate text-[0.6875rem] font-medium leading-tight text-ink">
              {tile.name}
            </span>
            {tile.height > 6 ? (
              <span className="tabular block truncate text-micro leading-tight text-ink-muted">
                {tile.change !== undefined ? formatPercent(tile.change) : '—'}
              </span>
            ) : null}
            {tile.height > 12 && tile.width > 12 ? (
              <span className="tabular block truncate text-micro leading-tight text-ink-muted">
                {formatCurrency(tile.value, 'USD', { compact: true }) ?? '—'}
              </span>
            ) : null}
          </Link>
        ))}
      </div>

      <p className="text-xs leading-relaxed text-ink-muted">
        Surface : capitalisation du secteur. Couleur : variation sur 24 heures, saturée
        au-delà de ±10 % pour qu’un petit secteur très volatil n’écrase pas l’échelle.
        Les surfaces <strong className="text-ink">ne partagent pas un tout</strong> — un
        actif appartient à plusieurs secteurs, leur somme dépasse donc la capitalisation
        mondiale. Montants publiés en dollars par la source.
      </p>
    </div>
  )
}

function Legend() {
  return (
    <div className="flex items-center gap-2 text-[0.6875rem] text-ink-muted">
      <span>−10 %</span>
      <span className="flex h-2.5 w-32 overflow-hidden rounded-pill border border-border-subtle" aria-hidden="true">
        {[-10, -6, -3, 0, 3, 6, 10].map((step) => (
          <span key={step} className="flex-1" style={{ backgroundColor: toneFor(step) }} />
        ))}
      </span>
      <span>+10 %</span>
    </div>
  )
}
