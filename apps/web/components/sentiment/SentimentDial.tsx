import { SENTIMENT_BANDS } from '@/components/sentiment/bands'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * LE CADRAN DE L'INDICE — CINQ ZONES, DES GRADUATIONS, UNE AIGUILLE
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── POURQUOI UNE AIGUILLE ICI, ALORS QUE `SentimentGauge` S'EN PASSE ────────
 *
 * Ce n'est pas une contradiction, ce sont deux lectures différentes.
 *
 * `SentimentGauge` vit dans une colonne latérale de 176 px, à côté d'autres cartes :
 * il y montre la COURSE parcourue depuis zéro, parce qu'une aiguille de 40 px sans
 * graduations ne se compare à rien. Ce cadran-ci est la figure principale d'une page
 * qui ne parle que de lui : il porte ses cinq zones nommées et ses graduations, et
 * dans ce contexte l'aiguille redevient la bonne réponse — elle DÉSIGNE une position
 * sur une échelle qui est, elle, entièrement dessinée.
 *
 * ── AUCUN JAVASCRIPT ───────────────────────────────────────────────────────
 *
 * Du SVG calculé au rendu serveur. La jauge de la colonne latérale passe par
 * `recharts`, donc par un îlot client ; ici la géométrie tient en trente lignes de
 * trigonométrie et n'a pas besoin d'une bibliothèque de graphiques. Une page dont la
 * figure de tête est statique n'a aucune raison d'attendre l'hydratation pour
 * l'afficher — et les moteurs de recherche la lisent telle quelle.
 *
 * ── LES TEINTES SONT CELLES DE LA HEATMAP ──────────────────────────────────
 *
 * `heat-down` → `heat-down-dim` → `gold` → `heat-up-dim` → `heat-up` : une rampe à
 * cinq crans déjà définie dans le thème, déjà réglée pour le clair ET le sombre.
 * En inventer une ici aurait produit un rouge de cette page différent du rouge du
 * reste du site.
 */

/** Rayon extérieur de l'anneau, dans le repère du `viewBox`. */
const OUTER = 118
/** Rayon intérieur — l'écart avec `OUTER` fait l'épaisseur de l'anneau. */
const INNER = 88
/*
 * ⚠️ LE REPÈRE EST PLUS LARGE QUE L'ANNEAU, ET C'EST UNE CONTRAINTE DE LISIBILITÉ.
 *
 * Les noms de zones étaient écrits en 9 unités. `audit-responsive` les a relevés sur
 * les six formats : sous le plancher de 11 px du projet, un libellé de marché n'est
 * plus lisible à bout de bras. Les passer à 11 les faisait déborder d'un repère de
 * 280 de large — « Avidité extrême » couché le long de l'arc mesure alors près de
 * quatre-vingt-dix unités.
 *
 * Le repère gagne donc quarante unités de large et le centre se décale d'autant :
 * l'anneau garde exactement sa taille, seule la marge où vivent les libellés grandit.
 */
const CX = 160
/* Le centre est calé en BAS du viewBox : un demi-disque n'occupe que la moitié
   haute, et centrer verticalement réserverait en pure perte une bande vide. */
const CY = 158

/** Angle, en degrés, correspondant à une valeur de l'indice. 0 → 180°, 100 → 0°. */
function angleOf(value: number): number {
  return 180 - (Math.min(100, Math.max(0, value)) / 100) * 180
}

/**
 * Point du cercle, en coordonnées SVG.
 *
 * ⚠️ Le `y` est SOUSTRAIT, et c'est la seule subtilité de tout ce fichier : en SVG
 * l'axe vertical descend, alors que la trigonométrie le fait monter. Sans ce signe,
 * le cadran se dessine à l'envers, sous la ligne d'horizon.
 */
function point(angle: number, radius: number): [number, number] {
  const rad = (angle * Math.PI) / 180
  return [CX + radius * Math.cos(rad), CY - radius * Math.sin(rad)]
}

/** Secteur d'anneau entre deux valeurs de l'indice. */
function bandPath(from: number, to: number): string {
  const a1 = angleOf(from)
  const a2 = angleOf(to)
  const [ox1, oy1] = point(a1, OUTER)
  const [ox2, oy2] = point(a2, OUTER)
  const [ix1, iy1] = point(a1, INNER)
  const [ix2, iy2] = point(a2, INNER)

  /* `sweep = 1` sur l'arc extérieur : les angles DÉCROISSENT de `from` vers `to`,
     ce qui se parcourt dans le sens horaire à l'écran. Le retour par l'arc intérieur
     se fait donc en sens inverse, `sweep = 0`. Chaque zone couvrant moins d'un
     demi-tour, `large-arc` reste à 0 partout. */
  return [
    `M ${ox1} ${oy1}`,
    `A ${OUTER} ${OUTER} 0 0 1 ${ox2} ${oy2}`,
    `L ${ix2} ${iy2}`,
    `A ${INNER} ${INNER} 0 0 0 ${ix1} ${iy1}`,
    'Z',
  ].join(' ')
}

export function SentimentDial({
  value,
  label,
}: {
  value: number
  /** Libellé français de la zone, décidé par l'appelant qui tient le dictionnaire. */
  label: string
}) {
  const needleAngle = angleOf(value)
  const [nx, ny] = point(needleAngle, INNER - 10)

  return (
    <svg
      viewBox="0 0 320 212"
      className="h-auto w-full max-w-[20rem]"
      role="img"
      aria-label={`${value} sur 100 — ${label}`}
    >
      {/*
        LES CINQ ZONES SONT PLEINES, TOUTES.

        Une première version voilait les zones inactives pour faire ressortir celle de
        l'aiguille. Relevé au navigateur : en thème CLAIR, un voile à 32 % sur fond
        blanc délave l'arc au point que l'échelle rouge → verte cesse de se lire — or
        c'est la seule chose que l'anneau ait à dire, l'aiguille se chargeant d'indiquer
        où l'on est. La référence les garde saturées ; elle a raison.
      */}
      {SENTIMENT_BANDS.map((band) => (
        <path key={band.id} d={bandPath(band.from, band.to)} fill={band.color} />
      ))}

      {/* Graduations chiffrées, aux mêmes valeurs que la référence. Elles sont ce qui
          rend l'aiguille lisible : sans elles, une direction ne se convertit pas en
          nombre. */}
      {[0, 25, 50, 75, 100].map((tick) => {
        const [tx, ty] = point(angleOf(tick), INNER - 16)
        return (
          <text
            key={tick}
            x={tx}
            y={ty}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-ink-muted text-[11px]"
          >
            {tick}
          </text>
        )
      })}

      {/* Noms de zones, COUCHÉS LE LONG DE L'ARC comme sur la référence. Posés à
          l'horizontale, cinq libellés se chevaucheraient sur un demi-cercle de
          280 px de large. La rotation `90 − angle` rend le texte tangent : nul en
          haut, il se redresse vers la verticale aux deux extrémités. */}
      {SENTIMENT_BANDS.map((band) => {
        const mid = angleOf((band.from + band.to) / 2)
        const [lx, ly] = point(mid, OUTER + 17)
        return (
          <text
            key={`${band.id}-label`}
            x={lx}
            y={ly}
            textAnchor="middle"
            dominantBaseline="middle"
            transform={`rotate(${90 - mid} ${lx} ${ly})`}
            className="fill-ink-muted text-[11px] font-semibold uppercase"
          >
            {band.short}
          </text>
        )
      })}

      <line
        x1={CX}
        y1={CY}
        x2={nx}
        y2={ny}
        className="stroke-ink"
        strokeWidth={3}
        strokeLinecap="round"
      />
      <circle cx={CX} cy={CY} r={7} className="fill-ink" />
      <circle cx={CX} cy={CY} r={3} className="fill-surface" />

      {/* Le nombre est posé SOUS le moyeu, et pas au creux de l'arc comme la première
          version l'avait mis : l'aiguille balaie tout le demi-disque, et selon la
          valeur du jour elle traversait les chiffres. Relevé au navigateur à 73, où
          le trait coupait le « 3 ». Sous la ligne d'horizon, la zone est libre quelle
          que soit la valeur — et c'est aussi là que la référence le place. */}
      <text
        x={CX}
        y={CY + 32}
        textAnchor="middle"
        className="fill-ink text-[34px] font-bold tabular-nums"
      >
        {value}
      </text>
    </svg>
  )
}
