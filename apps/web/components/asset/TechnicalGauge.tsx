import type { Tally, Verdict } from '@/lib/indicators'

/**
 * Jauge de synthèse technique.
 *
 * ── UNE AIGUILLE, ET LES TROIS COMPTES À CÔTÉ ─────────────────────────────────
 *
 * L'aiguille seule serait un oracle : elle affirmerait « achat fort » sans dire sur
 * quoi elle s'appuie, et un lecteur n'aurait aucun moyen de distinguer un verdict
 * porté par quinze indicateurs unanimes d'un verdict porté par deux voix contre une.
 * Les trois compteurs sous l'arc rendent cette différence visible d'un regard, et
 * c'est ce qui transforme une opinion en résumé.
 *
 * ── POURQUOI L'ARC N'EST PAS CONTINU ──────────────────────────────────────────
 *
 * Cinq segments distincts plutôt qu'un dégradé du rouge au vert. Un dégradé
 * suggérerait une mesure continue et donc une précision que ce calcul n'a pas : le
 * score est un décompte de signaux discrets, et deux positions séparées de trois
 * degrés ne veulent rien dire de différent. Les segments avouent la granularité
 * réelle.
 */

const VERDICT_LABELS: Record<Verdict, string> = {
  strongSell: 'Vente forte',
  sell: 'Vente',
  neutral: 'Neutre',
  buy: 'Achat',
  strongBuy: 'Achat fort',
}

const VERDICT_TONE: Record<Verdict, string> = {
  strongSell: 'text-down',
  sell: 'text-down',
  neutral: 'text-ink-muted',
  buy: 'text-up',
  strongBuy: 'text-up',
}

/** Les cinq segments, du plus baissier au plus haussier. */
const SEGMENTS: { verdict: Verdict; fill: string }[] = [
  { verdict: 'strongSell', fill: 'var(--color-down)' },
  { verdict: 'sell', fill: 'color-mix(in srgb, var(--color-down) 55%, transparent)' },
  { verdict: 'neutral', fill: 'var(--color-border-subtle)' },
  { verdict: 'buy', fill: 'color-mix(in srgb, var(--color-up) 55%, transparent)' },
  { verdict: 'strongBuy', fill: 'var(--color-up)' },
]

const RADIUS = 68
const THICKNESS = 12
const CENTER_X = 80
const CENTER_Y = 78

export function TechnicalGauge({ tally, title }: { tally: Tally; title: string }) {
  const total = tally.buy + tally.neutral + tally.sell
  const score = total === 0 ? 0 : (tally.buy - tally.sell) / total

  /*
   * L'aiguille est bridée à ±0,9 plutôt qu'à ±1.
   *
   * À l'extrême exact, elle se confond avec le bord de l'arc et sort visuellement du
   * cadran. Un demi-degré de marge suffirait techniquement ; 10 % laissent l'aiguille
   * lisible même quand tous les indicateurs sont unanimes, cas fréquent sur une
   * tendance franche.
   */
  const angle = Math.min(Math.max(score, -0.9), 0.9) * 90
  const radians = ((angle - 90) * Math.PI) / 180
  const needleLength = RADIUS - THICKNESS - 6

  return (
    <div className="flex flex-col items-center">
      <p className="text-[0.6875rem] font-medium uppercase tracking-wide text-ink-muted">{title}</p>

      <svg
        viewBox="0 0 160 92"
        className="mt-2 w-full max-w-[160px]"
        role="img"
        aria-label={`${title} : ${VERDICT_LABELS[tally.verdict]}. ${tally.buy} signaux d’achat, ${tally.neutral} neutres, ${tally.sell} de vente.`}
      >
        {SEGMENTS.map((segment, index) => (
          <path
            key={segment.verdict}
            // Cinq secteurs de 36° couvrant le demi-cercle, du bord gauche (180°) au
            // bord droit (360°).
            d={arc(180 + index * 36, 180 + (index + 1) * 36 - 2)}
            fill={segment.fill}
          />
        ))}

        <line
          x1={CENTER_X}
          y1={CENTER_Y}
          x2={CENTER_X + Math.cos(radians) * needleLength}
          y2={CENTER_Y + Math.sin(radians) * needleLength}
          stroke="var(--color-ink)"
          strokeWidth={2.5}
          strokeLinecap="round"
        />
        <circle cx={CENTER_X} cy={CENTER_Y} r={4} fill="var(--color-ink)" />
      </svg>

      <p className={`mt-1 text-sm font-semibold ${VERDICT_TONE[tally.verdict]}`}>
        {VERDICT_LABELS[tally.verdict]}
      </p>

      <div className="mt-2 flex items-center gap-3 text-[0.6875rem] text-ink-muted">
        <Count label="Vente" value={tally.sell} tone="text-down" />
        <Count label="Neutre" value={tally.neutral} />
        <Count label="Achat" value={tally.buy} tone="text-up" />
      </div>
    </div>
  )
}

function Count({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <span className="flex flex-col items-center">
      <span className={`tabular text-sm font-semibold ${tone ?? 'text-ink'}`}>{value}</span>
      <span>{label}</span>
    </span>
  )
}

/**
 * Secteur d'anneau entre deux angles, en degrés SVG (0° à droite, sens horaire).
 *
 * Tracé en un seul chemin fermé plutôt qu'en arc épaissi par `stroke-width` : un
 * trait épais déborde de ses extrémités selon le `stroke-linecap`, et les segments
 * voisins se chevauchent alors de quelques pixels — visible sur les jonctions
 * rouge/gris.
 */
function arc(startDegrees: number, endDegrees: number): string {
  const outer = RADIUS
  const inner = RADIUS - THICKNESS

  const start = (startDegrees * Math.PI) / 180
  const end = (endDegrees * Math.PI) / 180

  const x = (radius: number, angle: number) => CENTER_X + Math.cos(angle) * radius
  const y = (radius: number, angle: number) => CENTER_Y + Math.sin(angle) * radius

  return [
    `M ${x(outer, start)} ${y(outer, start)}`,
    `A ${outer} ${outer} 0 0 1 ${x(outer, end)} ${y(outer, end)}`,
    `L ${x(inner, end)} ${y(inner, end)}`,
    `A ${inner} ${inner} 0 0 0 ${x(inner, start)} ${y(inner, start)}`,
    'Z',
  ].join(' ')
}
