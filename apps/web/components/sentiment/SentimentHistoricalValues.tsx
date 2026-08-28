import type { SentimentPoint } from '@zenkuu/data'

import { sentimentBand } from '@/components/sentiment/bands'

/**
 * « Valeurs historiques » — trois relevés passés, en anneaux.
 *
 * ── LES POINTS SONT LUS, JAMAIS INTERPOLÉS ─────────────────────────────────
 *
 * Chaque repère est le relevé du jour demandé, pris tel quel dans la série. S'il
 * manque, la colonne DISPARAÎT au lieu d'afficher le point le plus proche : l'indice
 * n'étant publié qu'une fois par jour, un décalage de deux jours passerait inaperçu
 * et ferait comparer le lecteur à autre chose que ce qu'il croit (§5).
 *
 * ── POURQUOI DES ANNEAUX ET NON DES NOMBRES ────────────────────────────────
 *
 * C'est la forme de la référence, et elle porte quelque chose que trois nombres
 * alignés ne portent pas : la position sur l'échelle. « 29 » ne dit rien tant qu'on
 * n'a pas en tête que le maximum est 100 ; un anneau au tiers rempli le dit sans
 * qu'on ait à le savoir.
 */

/** Périmètre du cercle de rayon 20 — le tracé est ouvert au prorata de la valeur. */
const RADIUS = 20
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export function SentimentHistoricalValues({
  points,
  label,
}: {
  points: SentimentPoint[]
  /** Traducteur de valeur en nom de zone, fourni par la page qui tient le contenu. */
  label: (value: number) => string
}) {
  const at = (daysAgo: number): SentimentPoint | undefined => points[points.length - 1 - daysAgo]

  const columns = [
    { caption: 'Hier', point: at(1) },
    { caption: 'Il y a 7 j', point: at(7) },
    { caption: 'Il y a 1 mois', point: at(30) },
  ].filter((column): column is { caption: string; point: SentimentPoint } => Boolean(column.point))

  if (columns.length === 0) return null

  return (
    <dl className="grid grid-cols-3 gap-3">
      {columns.map((column) => {
        const { value } = column.point
        const band = sentimentBand(value)

        return (
          /* Chaque repère dans sa PROPRE carte, comme sur la référence : trois
             colonnes nues sur le fond de la carte parente se lisaient comme une seule
             grille, alors que ce sont trois relevés distincts. */
          <div
            key={column.caption}
            className="space-y-2 rounded-card border border-border-subtle bg-surface-muted px-3 py-2.5"
          >
            <dt className="space-y-0.5">
              <span className="block text-sm font-semibold text-ink">{column.caption}</span>
              <span className="block text-xs text-ink-muted">{label(value)}</span>
            </dt>

            <dd>
              <svg
                viewBox="0 0 48 48"
                className="h-14 w-14"
                role="img"
                aria-label={`${value} sur 100`}
              >
                <circle
                  cx="24"
                  cy="24"
                  r={RADIUS}
                  fill="none"
                  className="stroke-border-subtle"
                  strokeWidth="4"
                />
                {/* Le tracé démarre EN HAUT et tourne dans le sens horaire : la
                    rotation de −90° compense le départ à trois heures des cercles
                    SVG, qui ferait commencer la course sur le côté. */}
                <circle
                  cx="24"
                  cy="24"
                  r={RADIUS}
                  fill="none"
                  stroke={band.color}
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={`${(value / 100) * CIRCUMFERENCE} ${CIRCUMFERENCE}`}
                  transform="rotate(-90 24 24)"
                />
                <text
                  x="24"
                  y="24"
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="fill-ink text-[15px] font-semibold tabular-nums"
                >
                  {value}
                </text>
              </svg>
            </dd>
          </div>
        )
      })}
    </dl>
  )
}
