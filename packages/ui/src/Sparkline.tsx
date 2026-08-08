interface SparklineProps {
  values: number[] | undefined
  width?: number
  height?: number
  /** Description pour les lecteurs d'écran. */
  label: string
}

/**
 * Mini-graphique en SVG pur.
 *
 * Aucune dépendance et aucun JavaScript côté client : le tracé est calculé au
 * rendu serveur. Sur un tableau de 50 lignes, une bibliothèque de graphiques
 * coûterait bien plus que le gain visuel (§9, Core Web Vitals).
 */
export function Sparkline({ values, width = 120, height = 32, label }: SparklineProps) {
  if (!values || values.length < 2) {
    return <span className="text-xs text-ink-muted">—</span>
  }

  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min

  const first = values[0] as number
  const last = values[values.length - 1] as number
  const rising = last >= first

  // Série parfaitement plate : une ligne médiane, sinon la division par `span`
  // produirait NaN et le tracé disparaîtrait sans explication.
  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width
      const y = span === 0 ? height / 2 : height - ((value - min) / span) * height
      return `${x.toFixed(2)},${y.toFixed(2)}`
    })
    .join(' ')

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={label}
      className="overflow-visible"
      preserveAspectRatio="none"
    >
      <polyline
        points={points}
        fill="none"
        stroke={rising ? 'var(--color-up)' : 'var(--color-down)'}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}
