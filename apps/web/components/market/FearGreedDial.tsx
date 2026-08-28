import type { SentimentIndex } from '@zenkuu/data'

import { Link } from '@/i18n/navigation'
import { weave } from '@/components/locale/emphasise'
import { getPhrase } from '@/lib/content'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * L'INDICE DE PEUR ET D'AVIDITÉ, EN CADRAN
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Le premier cadre de la colonne étroite chez la référence : un demi-cercle gradué
 * du rouge au vert, une aiguille, le nombre au centre et le libellé dessous.
 *
 * ── POURQUOI UN CADRAN ET NON UNE BARRE ─────────────────────────────────────
 *
 * L'indice n'est pas une quantité — ce n'est ni une somme ni un pourcentage de
 * quelque chose — mais une POSITION sur une échelle bornée. Une barre de progression
 * suggère un remplissage, donc un objectif à atteindre ; un cadran ne suggère rien
 * d'autre qu'un curseur entre deux extrêmes, ce qui est exactement le sens ici.
 *
 * ── LE TRACÉ EST UN SVG ÉCRIT À LA MAIN, ET C'EST LE PLUS COURT CHEMIN ──────
 *
 * Un demi-anneau gradué en cinq zones est un `path` en arc et cinq segments colorés.
 * Le faire porter par une bibliothèque de graphiques demanderait de configurer un
 * type de tracé, ses axes, sa légende et son thème pour produire une figure qui n'a
 * ni axe, ni légende, ni données à échelonner.
 *
 * L'aiguille est posée par une ROTATION, pas par un calcul de coordonnées : l'angle
 * est la seule variable, et le lire dans le style rend le rapport valeur → position
 * vérifiable d'un coup d'œil.
 *
 * ── CE QUE LES SEUILS VALENT ────────────────────────────────────────────────
 *
 * Ils sont ceux de la SOURCE, pas les nôtres : c'est elle qui publie « Extreme Fear »,
 * « Fear », « Neutral », « Greed », « Extreme Greed » avec la valeur. Le libellé
 * affiché est donc le sien, traduit — et non un classement refait ici, qui finirait
 * par diverger de ses bornes sans que rien ne le signale.
 */

/** Les cinq zones du cadran, du rouge au vert. `to` est exclusif sauf pour la dernière. */
const ZONES = [
  { to: 25, color: 'var(--color-down)' },
  { to: 45, color: 'color-mix(in oklab, var(--color-down) 55%, var(--color-ink-muted))' },
  { to: 55, color: 'var(--color-ink-muted)' },
  { to: 75, color: 'color-mix(in oklab, var(--color-up) 55%, var(--color-ink-muted))' },
  { to: 100, color: 'var(--color-up)' },
]

const RADIUS = 52
const CENTER_X = 64
const CENTER_Y = 60
const STROKE = 10

/** Point du demi-cercle pour une valeur de 0 à 100 — 0 à gauche, 100 à droite. */
function pointAt(value: number): { x: number; y: number } {
  const angle = Math.PI * (1 - value / 100)
  return {
    x: CENTER_X + RADIUS * Math.cos(angle),
    y: CENTER_Y - RADIUS * Math.sin(angle),
  }
}

export async function FearGreedDial({
  index,
  label,
}: {
  index: SentimentIndex
  /** Libellé de la source, déjà traduit par l'appelant — voir la note ci-dessus. */
  label: string
}) {
  const t = await getPhrase()
  const value = Math.min(100, Math.max(0, index.value))

  return (
    <section className="rounded-card border border-border-subtle bg-surface p-5">
      <h2 className="text-sm font-semibold text-ink">{t('Indice de peur et d’avidité')}</h2>

      <div className="mt-4 flex flex-col items-center">
        <svg
          viewBox="0 0 128 72"
          className="h-[4.5rem] w-32"
          role="img"
          aria-label={`${index.value} sur 100 — ${label}`}
        >
          {ZONES.map((zone, position) => {
            const from = position === 0 ? 0 : (ZONES[position - 1]?.to ?? 0)
            const start = pointAt(from)
            const end = pointAt(zone.to)
            return (
              <path
                key={zone.to}
                d={`M ${start.x} ${start.y} A ${RADIUS} ${RADIUS} 0 0 1 ${end.x} ${end.y}`}
                fill="none"
                stroke={zone.color}
                strokeWidth={STROKE}
                strokeLinecap="butt"
              />
            )
          })}

          {/*
            ── UNE PASTILLE SUR L'ARC, ET NON UNE AIGUILLE DEPUIS LE CENTRE ───

            ⚠️ L'AIGUILLE A ÉTÉ ESSAYÉE, ET ELLE PASSAIT SUR LE NOMBRE. Un trait
            partant du centre traverse tout l'intérieur du demi-cercle — c'est-à-dire
            précisément l'espace où se lit la valeur. Il fallait choisir entre sortir
            le nombre du cadran, ce qui le détache de ce qu'il mesure, et raccourcir
            l'aiguille au point qu'elle ne désigne plus rien.

            La pastille résout les deux : posée SUR l'arc, elle occupe la seule zone
            que le nombre n'utilise pas, et elle désigne une graduation au lieu d'une
            direction. C'est aussi ce que fait la référence.
          */}
          {(() => {
            const marker = pointAt(value)
            return (
              <circle
                cx={marker.x}
                cy={marker.y}
                r={5}
                fill="var(--color-ink)"
                stroke="var(--color-canvas)"
                strokeWidth={2.5}
              />
            )
          })()}

          {/* Le nombre est DANS le SVG, donc centré sur le cadran quoi qu'il arrive :
              posé en HTML sous la figure, il fallait le remonter d'une marge négative
              devinée, qui se décalait dès que le corps de texte changeait. */}
          <text
            x={CENTER_X}
            y={CENTER_Y - 4}
            textAnchor="middle"
            className="tabular fill-[var(--color-ink)] text-[1.75rem] font-semibold"
          >
            {index.value}
          </text>
        </svg>

        <p className="mt-1 text-xs font-medium text-ink-muted">{label}</p>
      </div>

      <p className="mt-4 border-t border-border-subtle pt-3 text-xs leading-relaxed text-ink-muted">
        {weave(
          t(
            '0 = peur extrême, 100 = avidité extrême. [Méthode et historique](/sentiment).',
          ),
          (href, label, key) => (
            <Link key={key} href={href} className="underline underline-offset-2 hover:text-ink">
              {label}
            </Link>
          ),
        )}
      </p>
    </section>
  )
}
