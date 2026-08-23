'use client'

import { Cell, Customized, Pie, PieChart } from 'recharts'

import { ChartContainer } from '@/components/ui/chart'

import type { Tally, Verdict } from '@/lib/indicators'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * JAUGE DE SYNTHÈSE TECHNIQUE — CINQ SECTEURS ET UNE AIGUILLE
 * ══════════════════════════════════════════════════════════════════════════════
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
 * Cinq secteurs distincts plutôt qu'un dégradé du rouge au vert. Un dégradé
 * suggérerait une mesure continue et donc une précision que ce calcul n'a pas : le
 * score est un décompte de signaux discrets, et deux positions séparées de trois
 * degrés ne veulent rien dire de différent. Les secteurs avouent la granularité
 * réelle.
 *
 * ── CE QUI A CHANGÉ : LE CADRAN EST UN `Pie`, L'AIGUILLE RESTE À LA MAIN ──────
 *
 * Les cinq secteurs étaient tracés par un constructeur de chemin maison — vingt-cinq
 * lignes de `M`/`A`/`L` et deux fonctions de projection polaire — écrit pour éviter
 * qu'un arc épaissi au `stroke-width` ne fasse déborder ses extrémités et chevaucher
 * les jonctions rouge/gris. C'est exactement ce qu'un secteur de `recharts` fait
 * nativement : un chemin fermé, sans trait, sans débordement.
 *
 * L'AIGUILLE, ELLE, N'A PAS D'ÉQUIVALENT dans la bibliothèque — aucune figure de
 * `recharts` ne pointe une position. Elle est donc dessinée par `<Customized>`, le
 * point d'extension prévu pour cela : le tracé vit DANS le `<svg>` du graphique, au
 * même repère et sous les mêmes transformations que les secteurs, au lieu d'être un
 * calque superposé qu'il faudrait recaler à chaque changement de taille.
 *
 * La supprimer aurait été plus simple, et faux : sans elle, seule la teinte du texte
 * dirait le verdict, et un cadran à cinq secteurs tous allumés n'indiquerait plus
 * rien du tout.
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

/** Les cinq secteurs, du plus baissier au plus haussier. Parts égales par construction. */
const SEGMENTS: { verdict: Verdict; fill: string }[] = [
  { verdict: 'strongSell', fill: 'var(--color-down)' },
  { verdict: 'sell', fill: 'color-mix(in srgb, var(--color-down) 55%, transparent)' },
  { verdict: 'neutral', fill: 'var(--color-border-subtle)' },
  { verdict: 'buy', fill: 'color-mix(in srgb, var(--color-up) 55%, transparent)' },
  { verdict: 'strongBuy', fill: 'var(--color-up)' },
]

/*
 * Géométrie du cadran, en pixels.
 *
 * Elle est FIXE et non relative : `recharts` place ses secteurs à partir d'un centre
 * et de deux rayons, et l'aiguille doit partir du même centre. Deux expressions en
 * pourcentage — une pour le `Pie`, une pour l'aiguille — divergeraient au premier
 * changement de boîte, et l'aiguille sortirait de son moyeu sans que rien ne le dise.
 */
const WIDTH = 160
const HEIGHT = 92
const CENTER_X = WIDTH / 2
const CENTER_Y = 78
const RADIUS = 68
const THICKNESS = 12

/** Une part par secteur, toutes égales : c'est le cadran, pas une donnée. */
const DIAL = SEGMENTS.map((segment) => ({ ...segment, weight: 1 }))

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

  return (
    <div className="flex flex-col items-center">
      <p className="text-[0.6875rem] font-medium uppercase tracking-wide text-ink-muted">{title}</p>

      <ChartContainer
        config={{}}
        role="img"
        aria-label={`${title} : ${VERDICT_LABELS[tally.verdict]}. ${tally.buy} signaux d’achat, ${tally.neutral} neutres, ${tally.sell} de vente.`}
        /* `aspect-auto` écrase le 16/9 par défaut de `ChartContainer` : un demi-cadran
           est deux fois plus large que haut, et la géométrie ci-dessus est exprimée
           dans cette boîte-là. */
        className="mt-2 aspect-auto"
        style={{ width: WIDTH, height: HEIGHT }}
      >
        <PieChart>
          <Pie
            data={DIAL}
            dataKey="weight"
            nameKey="verdict"
            cx={CENTER_X}
            cy={CENTER_Y}
            innerRadius={RADIUS - THICKNESS}
            outerRadius={RADIUS}
            /* Demi-cercle, du bord gauche au bord droit. */
            startAngle={180}
            endAngle={0}
            /* Deux degrés de respiration entre secteurs : c'est ce que le retrait de
               `- 2` sur chaque angle de fin produisait dans le tracé manuel. Sans eux,
               les cinq teintes se touchent et le cadran redevient un dégradé — ce que
               la note ci-dessus explique qu'il ne doit pas être. */
            paddingAngle={2}
            stroke="none"
            isAnimationActive={false}
          >
            {DIAL.map((segment) => (
              <Cell key={segment.verdict} fill={segment.fill} />
            ))}
          </Pie>

          <Customized component={<Needle angle={angle} />} />
        </PieChart>
      </ChartContainer>

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

/**
 * L'aiguille et son moyeu.
 *
 * `angle` est en degrés, 0 pointant vers le haut du cadran ; le décalage de 90°
 * convertit vers le repère trigonométrique du SVG, où 0 pointe vers la droite.
 */
function Needle({ angle }: { angle: number }) {
  const radians = ((angle - 90) * Math.PI) / 180
  const length = RADIUS - THICKNESS - 6

  return (
    <g>
      <line
        x1={CENTER_X}
        y1={CENTER_Y}
        x2={CENTER_X + Math.cos(radians) * length}
        y2={CENTER_Y + Math.sin(radians) * length}
        stroke="var(--color-ink)"
        strokeWidth={2.5}
        strokeLinecap="round"
      />
      <circle cx={CENTER_X} cy={CENTER_Y} r={4} fill="var(--color-ink)" />
    </g>
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
