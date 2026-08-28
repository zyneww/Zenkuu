import { SENTIMENT_BANDS, sentimentBand, sentimentRamp } from '@/components/sentiment/bands'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * LE CADRAN DE L'INDICE — COURONNE DE GRADUATIONS, CINQ ZONES, AIGUILLE
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── LA GÉOMÉTRIE EST CELLE DE LA RÉFÉRENCE, RELEVÉE AU NAVIGATEUR ──────────
 *
 * Pas déduite d'une capture : lue dans le DOM de la page de référence. D'où les
 * rayons qui suivent, qui n'ont rien d'arbitraire —
 *
 *     couronne de graduations   133 → 153   (100 traits d'un pixel)
 *     bande colorée             117, épaisse de 18   (soit 108 → 126)
 *     plateau intérieur         108
 *     chiffres et pointillés     88
 *     aiguille                   45 → 118
 *     libellés courbés          160
 *
 * ── LA COURONNE EST UNE JAUGE DE PROGRESSION, PAS UN ORNEMENT ──────────────
 *
 * C'est le détail qui fait le cadran, et il se serait perdu à l'œil : les cent
 * traits ne sont PAS tous colorés. Ceux qui précèdent la valeur du jour portent le
 * dégradé ; les suivants sont gris. La couronne dit donc deux choses à la fois — où
 * commence chaque zone, et jusqu'où le marché est monté aujourd'hui.
 *
 * ── LES LIBELLÉS SE COLORENT JUSQU'À LA ZONE ATTEINTE ──────────────────────
 *
 * Même logique, relevée sur la référence à 73 : « Avidité extrême » y était gris
 * pendant que les quatre premiers portaient leur teinte. Une zone qu'on n'a pas
 * atteinte n'a pas à s'annoncer en couleur.
 *
 * ── AUCUN JAVASCRIPT ───────────────────────────────────────────────────────
 *
 * Du SVG calculé au rendu serveur. `SentimentGauge`, dans la colonne latérale de
 * l'accueil, passe par `recharts` et donc par un îlot client ; ici la géométrie tient
 * dans ce fichier et n'a besoin d'aucune bibliothèque. Une figure statique n'a pas à
 * attendre l'hydratation, et les moteurs de recherche la lisent telle quelle.
 */

/* Repère IDENTIQUE à celui de la référence, à la hauteur près : elle s'arrête à 176,
   c'est-à-dire à la ligne d'horizon du demi-disque. Six unités de plus laissent
   respirer le jambage du grand nombre, posé juste au-dessus. */
const VIEW_W = 348
const VIEW_H = 182
const CX = 174
const CY = 176

const TICK_INNER = 133
const TICK_OUTER = 153
const TICK_COUNT = 100

const BAND_RADIUS = 117
const BAND_WIDTH = 18
const PLATE = 108
const NUMBERS = 88
const LABEL_ARC = 160
const NEEDLE_FROM = 45
const NEEDLE_TO = 118

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

/** Arc simple entre deux valeurs de l'indice, à tracer au trait. */
function arcPath(from: number, to: number, radius: number): string {
  const [x1, y1] = point(angleOf(from), radius)
  const [x2, y2] = point(angleOf(to), radius)
  /* `sweep = 1` : les angles DÉCROISSENT de `from` vers `to`, ce qui se parcourt
     dans le sens horaire à l'écran. Aucune zone ne couvrant un demi-tour,
     `large-arc` reste à 0. */
  return `M ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2}`
}

export function SentimentDial({
  value,
  label,
}: {
  value: number
  /** Libellé français de la zone, décidé par l'appelant qui tient le dictionnaire. */
  label: string
}) {
  const active = sentimentBand(value)
  const activeIndex = SENTIMENT_BANDS.indexOf(active)
  const needleAngle = angleOf(value)

  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      className="h-auto w-full"
      role="img"
      aria-label={`${value} sur 100 — ${label}`}
    >
      <defs>
        {/* Chemins INVISIBLES sur lesquels courent les noms de zones. Un `<text>`
            pivoté d'un bloc reste droit ; seul `textPath` couche les lettres une à
            une le long de la courbe, ce que fait la référence. */}
        {SENTIMENT_BANDS.map((band) => (
          <path
            key={`arc-${band.id}`}
            id={`sentiment-arc-${band.id}`}
            d={arcPath(band.from, band.to, LABEL_ARC)}
            fill="none"
          />
        ))}
      </defs>

      {/* ── Couronne de graduations ─────────────────────────────────────────── */}
      {Array.from({ length: TICK_COUNT }, (_, index) => {
        /* Le trait est centré sur sa part d'échelle plutôt que posé sur sa borne :
           cent traits sur cent unités, chacun au milieu de la sienne. */
        const tickValue = index + 0.5
        const angle = angleOf(tickValue)
        const [x1, y1] = point(angle, TICK_INNER)
        const [x2, y2] = point(angle, TICK_OUTER)

        return (
          <line
            key={index}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            strokeWidth={1}
            style={{
              stroke:
                tickValue <= value ? sentimentRamp(tickValue / 100) : 'var(--color-border-subtle)',
            }}
          />
        )
      })}

      {/* ── Bande colorée ───────────────────────────────────────────────────── */}
      {SENTIMENT_BANDS.map((band, index) => (
        <path
          key={band.id}
          /* Une demi-unité retranchée de chaque côté, sauf aux extrémités : la
             référence sépare ses zones par un mince intervalle, sans quoi les cinq
             couleurs se touchent et l'arc paraît continu. */
          d={arcPath(
            index === 0 ? band.from : band.from + 0.5,
            index === SENTIMENT_BANDS.length - 1 ? band.to : band.to - 0.5,
            BAND_RADIUS,
          )}
          fill="none"
          stroke={band.color}
          strokeWidth={BAND_WIDTH}
        />
      ))}

      {/* Plateau intérieur : il masque ce qui dépasse de la bande vers le centre et
          donne au cadran son fond, légèrement détaché de la carte. */}
      <path
        d={`${arcPath(0, 100, PLATE)} L ${CX - PLATE} ${CY} Z`}
        className="fill-surface-muted"
      />

      {/* ── Pointillés et chiffres, sur le même cercle ──────────────────────── */}
      {Array.from({ length: 16 }, (_, index) => {
        /* Seize points répartis sur le demi-cercle, en sautant les cinq positions
           où un chiffre est déjà écrit — un point sous un « 50 » ne se voit pas et
           salit le chiffre. */
        const dotValue = ((index + 1) / 17) * 100
        if ([0, 25, 50, 75, 100].some((tick) => Math.abs(tick - dotValue) < 4)) return null
        const [dx, dy] = point(angleOf(dotValue), NUMBERS)
        return <circle key={index} cx={dx} cy={dy} r={1} className="fill-ink-muted" />
      })}

      {[0, 25, 50, 75, 100].map((tick) => {
        const [tx, ty] = point(angleOf(tick), NUMBERS)
        return (
          <text
            key={tick}
            x={tx}
            y={ty}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-ink-muted text-[12px] tabular-nums"
          >
            {tick}
          </text>
        )
      })}

      {/* ── Noms de zones, couchés le long de l'arc ─────────────────────────── */}
      {SENTIMENT_BANDS.map((band, index) => (
        <text
          key={`${band.id}-label`}
          className="text-[12px] font-semibold uppercase"
          style={{
            /* Coloré jusqu'à la zone atteinte, gris au-delà — voir l'en-tête. */
            fill: index <= activeIndex ? band.color : 'var(--color-ink-muted)',
          }}
        >
          <textPath href={`#sentiment-arc-${band.id}`} startOffset="50%" textAnchor="middle">
            {band.short}
          </textPath>
        </text>
      ))}

      {/* ── Aiguille ────────────────────────────────────────────────────────── */}
      {/* Un polygone effilé plutôt qu'un segment d'épaisseur constante : la pointe
          désigne une graduation, le pied ne masque pas le centre du cadran. Il est
          dessiné pointe en haut puis pivoté — écrire ses trois sommets en
          trigonométrie aurait triplé le calcul pour le même résultat. */}
      <polygon
        points={`-3,-${NEEDLE_FROM} 3,-${NEEDLE_FROM} 0,-${NEEDLE_TO}`}
        className="fill-ink"
        transform={`translate(${CX} ${CY}) rotate(${90 - needleAngle})`}
      />
      <circle cx={CX} cy={CY} r={5} className="fill-ink" />

      {/* Le grand nombre est posé DANS l'ouverture du cadran, au ras de la ligne
          d'horizon : l'aiguille s'arrête à 45 unités du centre, la zone du bas lui
          est donc acquise quelle que soit la valeur du jour. */}
      <text
        x={CX}
        y={CY - 4}
        textAnchor="middle"
        className="fill-ink text-[30px] font-bold tabular-nums"
      >
        {value}
      </text>
    </svg>
  )
}
