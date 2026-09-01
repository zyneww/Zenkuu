'use client'

import { usePhrase } from '@/components/locale/ContentProvider'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * LE VOCABULAIRE D'INTERACTION DES GRAPHIQUES — RELEVÉ SUR ASXN HYPERSCREENER
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Référence : hyperscreener.asxn.xyz/home, mesurée au navigateur le 2026-09-02. Le
 * relevé complet — palette, infobulle, épaisseurs, courbes de mouvement — vit dans
 * `CHARTS_AUDIT.md` ; ce fichier n'en porte que les CONTRÔLES.
 *
 * ── POURQUOI DES CONTRÔLES ET NON DES GRAPHIQUES ────────────────────────────
 *
 * Ce qui distingue leurs graphiques des nôtres n'est pas le tracé : les deux sites
 * emploient Recharts, et une courbe y est une courbe. C'est ce qui l'ENTOURE — des
 * puces de série qu'on éteint d'un clic, un sélecteur de période en lettres seules,
 * un filigrane derrière le tracé, une infobulle qui glisse.
 *
 * Ces pièces-là sont les mêmes d'un graphique à l'autre chez eux, et c'est
 * précisément ce qui donne à la page son unité. Les écrire une fois ici, plutôt que
 * dans chacune des treize figures du site, est ce qui reproduira cette unité — et ce
 * qui évitera qu'elle se défasse à la première figure ajoutée.
 *
 * ── CE QUI N'EST PAS COPIÉ ──────────────────────────────────────────────────
 *
 * Les COULEURS des contrôles sont celles de ZENKUU, pas celles d'ASXN. Ces pièces
 * lisent `--color-ink`, `--color-border-subtle`, `--color-brand` comme le reste du
 * site : un jeu de gris importé tel quel ferait une île au milieu de la page. C'est la
 * FORME qui est reprise — les tailles, les rayons, les rembourrages, les durées —,
 * mesurée chez eux et transposée dans notre palette.
 */

/* ─────────────────────────────────────────────────────────────────────────────
   LA PUCE DE SÉRIE

   Mesurée : `rounded-[4px] border border-foreground/30 px-2 py-1`, pastille de
   12 × 12 px à 2 px de rayon, libellé à 12 px, `transition-all duration-200
   cubic-bezier(0.4, 0, 0.2, 1)`.

   ⚠️ CETTE COURBE EST DÉJÀ CELLE DU PROJET. `cubic-bezier(0.4, 0, 0.2, 1)` est la
   valeur exacte de `--ease-standard`, posée dans `globals.css` bien avant ce relevé.
   Les 200 ms sont à un cran de `--duration-state` (150 ms) — on garde les nôtres
   plutôt que d'introduire une troisième durée pour cinquante millisecondes.

   ── L'ÉTAT ÉTEINT SE LIT SANS LA COULEUR ───────────────────────────────────

   Une puce éteinte perd sa pastille pleine (elle devient un contour) ET son libellé
   passe en encre atténuée. Deux signaux et non un : l'opacité seule laisserait un
   daltonien deviner l'état d'une série au ton de sa pastille (§9).
   ───────────────────────────────────────────────────────────────────────────── */
export function SeriesChip({
  label,
  color,
  active,
  onToggle,
}: {
  label: string
  /** Couleur de la série — un jeton CSS, jamais une valeur figée. */
  color: string
  active: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={active}
      className={`flex select-none items-center gap-2 rounded-[4px] border px-2 py-1 transition-[color,background-color,border-color,opacity] duration-[var(--duration-state)] ease-[var(--ease-standard)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
        active
          ? 'border-border-subtle text-ink hover:bg-surface-muted'
          : 'border-border-subtle/50 text-ink-muted hover:text-ink'
      }`}
    >
      <span
        aria-hidden="true"
        className="block size-3 shrink-0 rounded-[2px] border transition-colors duration-[var(--duration-state)] ease-[var(--ease-standard)]"
        style={{
          backgroundColor: active ? color : 'transparent',
          borderColor: color,
        }}
      />
      <span className="text-[length:var(--v2-text-2xs)] leading-none">{label}</span>
    </button>
  )
}

/**
 * « Deselect all » — le bouton qui ferme la rangée de puces chez eux.
 *
 * Il BASCULE plutôt qu'il n'éteint : une fois tout éteint, un bouton « tout éteindre »
 * ne fait plus rien et laisse le lecteur devant un graphique vide sans chemin de
 * retour. Le libellé suit l'état, donc le bouton dit toujours ce qu'il va faire.
 */
export function ChipToggleAll({
  allOff,
  onToggleAll,
}: {
  allOff: boolean
  onToggleAll: () => void
}) {
  const t = usePhrase()

  return (
    <button
      type="button"
      onClick={onToggleAll}
      className="select-none rounded-[4px] border border-border-subtle px-2 py-1 text-[length:var(--v2-text-2xs)] leading-none text-ink-muted transition-colors duration-[var(--duration-state)] ease-[var(--ease-standard)] hover:text-ink focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
    >
      {allOff ? t('Tout afficher') : t('Tout masquer')}
    </button>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   LE SÉLECTEUR DE PÉRIODE — DES LETTRES SEULES

   `D` `W` `M` `Y` sur leurs grands graphiques, `1D 7D 1M 3M 1Y` sur leurs cartes de
   tête. L'actif est ENCADRÉ sur les premiers, SOULIGNÉ sur les secondes — deux
   traitements pour deux densités, et non une inconséquence.

   ⚠️ LES LETTRES SONT TRADUITES, et ce n'est pas anodin. `D W M Y` sont les initiales
   de mots ANGLAIS ; les reprendre telles quelles servirait de l'anglais aux douze
   autres langues du site. Les libellés passent donc par la table, où « J S M A »
   répond en français et « T W M J » en allemand.

   Le `aria-label` porte le mot entier : une lettre isolée ne dit rien à la synthèse
   vocale, qui l'épellerait.
   ───────────────────────────────────────────────────────────────────────────── */
export function PeriodPicker<T extends string>({
  periods,
  active,
  onSelect,
  variant = 'boxed',
}: {
  periods: { key: T; letter: string; label: string }[]
  active: T
  onSelect: (key: T) => void
  /** `boxed` sur un grand graphique, `underlined` sur une carte de tête. */
  variant?: 'boxed' | 'underlined'
}) {
  return (
    <div role="group" className="flex items-center gap-1">
      {periods.map((p) => {
        const on = p.key === active
        return (
          <button
            key={p.key}
            type="button"
            onClick={() => onSelect(p.key)}
            aria-pressed={on}
            aria-label={p.label}
            title={p.label}
            className={
              variant === 'boxed'
                ? `min-w-7 rounded-[4px] border px-1.5 py-0.5 text-[length:var(--v2-text-2xs)] leading-none transition-colors duration-[var(--duration-state)] ease-[var(--ease-standard)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
                    on
                      ? 'border-brand text-brand-strong'
                      : 'border-transparent text-ink-muted hover:text-ink'
                  }`
                : `min-w-7 border-b-2 px-1 pb-0.5 text-[length:var(--v2-text-2xs)] leading-none transition-colors duration-[var(--duration-state)] ease-[var(--ease-standard)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
                    on
                      ? 'border-brand text-ink'
                      : 'border-transparent text-ink-muted hover:text-ink'
                  }`
            }
          >
            {p.letter}
          </button>
        )
      })}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   LE FILIGRANE

   `ZENKUU` derrière le tracé, à 7 % de l'encre du thème. La règle qui le peint vit
   dans `globals.css` (`.chart-filigrane`) — voir sa note pour le choix de l'opacité,
   qui n'est pas celle d'ASXN et ne pouvait pas l'être.

   Il attend un ancêtre positionné : les tracés du site posent tous leur conteneur en
   `relative`, et c'est aussi ce que fait `ChartContainer`.
   ───────────────────────────────────────────────────────────────────────────── */
export function ChartWatermark({ text = 'ZENKUU' }: { text?: string }) {
  return (
    <div aria-hidden="true" className="chart-filigrane">
      {text}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   LA RAMPE D'EMPILEMENT

   Cinq crans, du vert sombre au clair, pour les segments d'une même barre. Voir la
   note de `--chart-stack-*` dans `globals.css` : c'est une rampe et non une palette
   catégorielle, et les deux ne s'échangent pas.

   Au-delà de cinq séries, l'index reboucle. C'est acceptable ICI et nulle part
   ailleurs : une barre empilée à plus de cinq segments est illisible bien avant que
   deux d'entre eux ne se ressemblent — la question est alors de regrouper la queue
   sous un « Autres », comme le fait la référence.
   ───────────────────────────────────────────────────────────────────────────── */
export const STACK_COLORS = [
  'var(--chart-stack-1)',
  'var(--chart-stack-2)',
  'var(--chart-stack-3)',
  'var(--chart-stack-4)',
  'var(--chart-stack-5)',
] as const

export function stackColor(index: number): string {
  return STACK_COLORS[index % STACK_COLORS.length] as string
}

/**
 * La courbe SUPERPOSÉE aux barres — la seule couleur chaude.
 *
 * Chez eux c'est le volume cumulé. Le choix de l'orange est fonctionnel : la rampe
 * d'empilement est entièrement froide, donc une courbe chaude ne peut se confondre
 * avec aucun segment, quel qu'en soit le nombre.
 */
export const OVERLAY_COLOR = 'var(--chart-overlay)'
