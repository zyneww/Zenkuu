interface PricePoint {
  timestamp: number
  price: number
}

interface PriceChartProps {
  points: PricePoint[]
  currency: string
  /** Description lue par les technologies d'assistance. */
  label: string
  height?: number
  /** Formateur de prix injecté par l'appelant, pour rester cohérent avec le reste. */
  formatPrice: (value: number) => string | null
  formatDate: (timestamp: number) => string
}

/**
 * Graphique de cours en aire — SVG pur, rendu côté serveur.
 *
 * Aucune bibliothèque de graphiques et aucun JavaScript client : sur une page de
 * cotation, le graphique EST le contenu principal, donc l'élément qui détermine le
 * LCP (§9). Un Recharts ou un Chart.js ferait attendre un bundle de plusieurs
 * centaines de kilo-octets avant le premier tracé, pour un résultat visuellement
 * identique à ces quelques lignes.
 *
 * Le `viewBox` fait tout le travail de mise à l'échelle : le SVG s'étire à la
 * largeur disponible sans recalcul au redimensionnement.
 */
export function PriceChart({
  points,
  currency,
  label,
  height = 280,
  formatPrice,
  formatDate,
}: PriceChartProps) {
  if (points.length < 2) {
    return null
  }

  const width = 1000
  const padding = { top: 16, bottom: 24, left: 0, right: 0 }
  const plotHeight = height - padding.top - padding.bottom

  const prices = points.map((point) => point.price)
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  // Marge de 4 % en haut et en bas : sans elle, les extrêmes touchent le bord du
  // cadre et la courbe paraît tronquée.
  const span = max - min || max || 1
  const lower = min - span * 0.04
  const upper = max + span * 0.04
  const range = upper - lower

  const first = points[0] as PricePoint
  const last = points[points.length - 1] as PricePoint
  const rising = last.price >= first.price

  const toX = (index: number) => (index / (points.length - 1)) * width
  const toY = (price: number) => padding.top + plotHeight - ((price - lower) / range) * plotHeight

  const line = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'}${toX(index).toFixed(2)},${toY(point.price).toFixed(2)}`)
    .join(' ')

  const area = `${line} L${width},${padding.top + plotHeight} L0,${padding.top + plotHeight} Z`

  // Identifiant de dégradé unique par sens de variation : deux graphiques sur la même
  // page (fiche + comparable) partageraient sinon la même définition SVG.
  const gradientId = `zenith-chart-${rising ? 'up' : 'down'}`
  const stroke = rising ? 'var(--color-up)' : 'var(--color-down)'

  return (
    <figure className="w-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height={height}
        role="img"
        aria-label={label}
        preserveAspectRatio="none"
        className="overflow-visible"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity="0.22" />
            <stop offset="100%" stopColor={stroke} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Lignes de repère aux quarts : elles donnent l'échelle sans encombrer. */}
        {[0.25, 0.5, 0.75].map((ratio) => (
          <line
            key={ratio}
            x1="0"
            x2={width}
            y1={padding.top + plotHeight * ratio}
            y2={padding.top + plotHeight * ratio}
            stroke="var(--color-border-subtle)"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
        ))}

        <path d={area} fill={`url(#${gradientId})`} />
        <path
          d={line}
          fill="none"
          stroke={stroke}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      {/* Repères hors du SVG : dans un SVG étiré en `preserveAspectRatio="none"`,
          tout texte serait déformé horizontalement. */}
      <figcaption className="mt-1 flex justify-between text-[0.6875rem] text-ink-muted">
        <span>{formatDate(first.timestamp)}</span>
        <span className="tabular">
          {formatPrice(min)} — {formatPrice(max)} {currency}
        </span>
        <span>{formatDate(last.timestamp)}</span>
      </figcaption>
    </figure>
  )
}
