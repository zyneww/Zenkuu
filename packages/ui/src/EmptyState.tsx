import type { ReactNode } from 'react'

interface EmptyStateProps {
  title: string
  description?: string | null
  /** Origine de la donnée manquante, affichée en petit. */
  source?: string | null
  action?: ReactNode
  tone?: 'neutral' | 'warning'
  compact?: boolean
}

/**
 * État vide explicite — la contrepartie visible de la règle « zéro donnée factice ».
 *
 * Ce composant est ce qui s'affiche partout où une source n'est pas disponible.
 * Il dit ce qui manque et pourquoi ; il ne remplit jamais l'espace avec un
 * placeholder chiffré, un « 0 » ou un graphique vide qui laisserait croire à une
 * mesure réelle (§5).
 */
export function EmptyState({
  title,
  description,
  source,
  action,
  tone = 'neutral',
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-card border border-dashed text-center ${
        tone === 'warning'
          ? 'border-brand/40 bg-brand-soft'
          : 'border-border-subtle bg-surface-muted'
      } ${compact ? 'gap-1 px-4 py-6' : 'gap-3 px-6 py-14'}`}
    >
      {/* ═══════════════════════════════════════════════════════════════════
          LA FORME PLEINE EMPRUNTE À DUOLINGO ; LA FORME `compact` NE LUI EMPRUNTE RIEN
          ═══════════════════════════════════════════════════════════════════

          La direction du site reste CoinGecko — dense, sobre, hiérarchie fine. Duolingo
          n'inspire que des surfaces ponctuelles, et celle-ci en est une : un état vide
          n'est PAS une ligne de données, c'est un message. La sobriété d'un tableau y
          produisait un écran qui chuchote au moment où il a le plus à dire.

          Trois valeurs, relevées le 2026-09-07 sur duolingo.com (voir
          DUOLINGO_STYLE_TOKENS.md) :

            · la marque passe de 28 à 44 px — chez eux l'illustration mène, le texte suit ;
            · le titre passe de 14 px/500 à 18 px/700 — leur graisse est unique (700
              partout), et la hiérarchie se fait par la TAILLE, pas par le poids ;
            · la respiration passe de `py-10 gap-2` à `py-14 gap-3`.

          ⚠️ `compact` NE BOUGE PAS D'UN PIXEL, ET C'EST LA FRONTIÈRE. C'est la forme qui
          vit DANS les panneaux de données — `NarrativesPanel` s'en sert, et vingt-trois
          autres appels aussi. Elle garde `gap-1 px-4 py-6`, sa marque de 28 px et son
          titre de 14 px. La densité commence là où Duolingo s'arrête.

          ⚠️ CE QUI N'A PAS ÉTÉ EMPRUNTÉ, alors que ce serait le plus reconnaissable :
          leur vert #58CC02 (le site a déjà une marque), leurs capitales à 0,8 px
          d'interlettrage (elles coûtent 15 à 20 % de largeur en français) et leur bouton
          à tranche de 3,33 px (le bouton principal porte déjà un enfoncement MESURÉ chez
          Backpack — l'échanger contre une convention non mesurée serait une perte). */}
      <AscentMark size={compact ? 28 : 44} />
      <p className={compact ? 'text-sm font-medium text-ink' : 'text-lg font-bold text-ink'}>
        {title}
      </p>
      {description ? (
        <p className="max-w-sm text-xs leading-relaxed text-ink-muted">{description}</p>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
      {source ? <p className="mt-1 text-[0.6875rem] text-ink-muted">Source : {source}</p> : null}
    </div>
  )
}

/**
 * Marque d'ascension — PLACEHOLDER.
 *
 * La mascotte du §10 doit prendre cette place une fois le visuel déposé dans
 * `apps/web/public/brand/`. En attendant, un chevron géométrique neutre : il ne
 * prétend pas être la mascotte et n'introduit aucune identité inventée.
 */
function AscentMark({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="text-brand/60"
    >
      <path
        d="M3 18l5.5-6.5L13 16l8-11"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
