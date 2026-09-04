import type { ReactNode } from 'react'

import { ChangeBadge } from '@/components/locale/ChangeBadge'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * LA CARTE DE STATISTIQUE — LE MOTIF DE TÊTE D'ASXN HYPERSCREENER
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Relevé sur hyperscreener.asxn.xyz le 2026-09-02 : un intitulé discret, une GRANDE
 * valeur, puis une ou deux variations en petit sous elle — « $8.59B » avec
 * « 24h +4.06% » et « 30d +136.67% ». Une courbe d'ambiance peut occuper le fond.
 *
 * ── CE QUI EN FAIT UN MOTIF, ET NON UNE CARTE DE PLUS ───────────────────────
 *
 * La HIÉRARCHIE, et elle tient en trois crans. L'intitulé est petit et atténué : on ne
 * le lit qu'une fois, pour savoir ce qu'on regarde. La valeur est très grande : c'est
 * elle qu'on vient chercher, et elle doit se lire d'un mètre. Les variations sont
 * petites mais colorées : on les remarque sans les chercher.
 *
 * Trois tailles, trois rôles. Une carte qui donnerait la même importance aux trois
 * obligerait à lire les trois pour trouver le chiffre.
 *
 * ── LES VARIATIONS SONT DEUX, ET DE DEUX ÉCHELLES DIFFÉRENTES ──────────────
 *
 * C'est le détail qui rend le motif utile : « 24h » dit ce qui vient de se passer,
 * « 30d » dit si c'est dans la tendance ou contre elle. Un seul des deux laisse la
 * question ouverte — une baisse de 4 % ne se lit pas pareil selon qu'elle suit un mois
 * de hausse ou un mois de baisse.
 *
 * La seconde est OPTIONNELLE : toutes les séries ne publient pas de fenêtre à trente
 * jours, et une variation absente disparaît plutôt que de s'afficher à zéro (§5).
 */
export function StatCard({
  label,
  value,
  change24h,
  change30d,
  change30dLabel,
  note,
  children,
}: {
  /** L'intitulé discret, en tête. */
  label: string
  /** La valeur, déjà formatée par l'appelant — lui seul connaît sa devise et son unité. */
  value: string
  change24h?: number | undefined
  change30d?: number | undefined
  /** Libellé de la seconde fenêtre — « 30 j », « 1 an »… Traduit par l'appelant. */
  change30dLabel?: string
  /** Précision sous les variations : nombre d'éléments, portée, source. */
  note?: string
  /** Courbe d'ambiance, posée en fond. */
  children?: ReactNode
}) {
  return (
    /* `relative` et `overflow-hidden` : la courbe de fond est posée en absolu et doit
       être coupée par les coins arrondis de la carte, sans quoi elle dépasse aux
       quatre angles. */
      /* ── LE FOND EST TRANSPARENT, ET C'EST MESURÉ ──────────────────────────

          ASXN, relevé le 2026-09-02 : `background-color: rgba(0, 0, 0, 0)`. Leurs
          cartes n'ont AUCUN fond — seulement une bordure à 10 % d'encre. La figure
          flotte sur le fond de page.

          ZENKUU peignait un `bg-surface`, soit #1b232d sur un fond #0d1217. Six cartes
          de cette teinte font six panneaux SURÉLEVÉS, et le regard les compte avant de
          lire ce qu'elles contiennent. La bordure seule fait l'inverse : elle délimite
          sans séparer, et ce qui ressort est le tracé.

          C'est la « transparence » qui manquait, et elle tient en un mot retiré. */
    <div className="relative overflow-hidden rounded-[14px] border border-border-subtle p-5">
      {children ? (
        /* La courbe passe SOUS le texte et n'intercepte rien. Elle est de l'ambiance,
           pas une figure : on ne la survole pas, on ne la lit pas — elle dit
           seulement « ça monte » ou « ça descend » du coin de l'œil. */
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-14 opacity-60">
          {children}
        </div>
      ) : null}

      <div className="relative">
        {/* ⚠️ NI CAPITALES NI GRAISSE — même correction que `SectionRule`, et pour la
            même raison. Mesuré chez eux : 12 px, poids 400, casse normale.

            Des capitales espacées font un intitulé qu'on LIT. Or celui-ci n'est là que
            pour confirmer, après coup, ce que le grand chiffre veut dire. Il doit se
            faire oublier au profit de la valeur — c'est tout le rapport de un à deux et
            demi entre les deux tailles. */}
        <p className="text-[length:var(--v2-text-2xs)] font-normal text-ink-muted">{label}</p>

        {/* `tabular` : les chiffres gardent la même chasse d'un rafraîchissement à
            l'autre. Sans lui, « $2,617B » et « $2,618B » n'ont pas la même largeur et
            la carte tremble toutes les trois minutes. */}
        <p className="tabular mt-1 text-2xl font-semibold leading-tight text-ink">{value}</p>

        {change24h !== undefined || change30d !== undefined ? (
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[length:var(--v2-text-2xs)]">
            {change24h !== undefined ? (
              <span className="flex items-center gap-1">
                <span className="text-ink-muted">24 h</span>
                <ChangeBadge value={change24h} size="sm" />
              </span>
            ) : null}

            {change30d !== undefined ? (
              <span className="flex items-center gap-1">
                <span className="text-ink-muted">{change30dLabel ?? '30 j'}</span>
                <ChangeBadge value={change30d} size="sm" />
              </span>
            ) : null}
          </div>
        ) : null}

        {note ? <p className="mt-2 text-[length:var(--v2-text-2xs)] text-ink-muted">{note}</p> : null}
      </div>
    </div>
  )
}

/**
 * Le titre de section discret — « All-Time », « Volume & Open Interest » chez eux.
 *
 * ── POURQUOI UN FILET ET NON UN TITRE ORDINAIRE ─────────────────────────────
 *
 * Il sépare des groupes de cartes sans peser comme un titre de page. Chez eux c'est un
 * texte minuscule et gris suivi d'un filet qui court jusqu'au bord — le regard le
 * franchit sans s'arrêter, mais il sait qu'il a changé de sujet.
 *
 * `<h2>` et non un `<div>` stylé : la synthèse vocale s'en sert pour naviguer entre
 * les sections d'une page longue, et un texte gris n'est pas une structure.
 */
export function SectionRule({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      {/* ⚠️ NI CAPITALES NI GRAISSE, et je l'avais écrit avec les deux.

          Mesuré chez eux : 12 px, poids 400, casse NORMALE, gris `rgb(136, 136, 136)`.
          Des capitales espacées en demi-gras font une étiquette de section — quelque
          chose qu'on lit. Or cette bande n'est pas là pour être lue : elle est là pour
          que le regard sache qu'il a changé de sujet en la franchissant. C'est
          exactement pour cela qu'elle est en casse normale et sans graisse. */}
      <h2 className="shrink-0 text-[length:var(--v2-text-2xs)] font-normal text-ink-muted">
        {children}
      </h2>
      <span aria-hidden="true" className="h-px flex-1 bg-border-subtle" />
    </div>
  )
}


/**
 * ══════════════════════════════════════════════════════════════════════════════
 * LA RANGÉE DE CHIFFRES — SANS CARTES, SÉPARÉE PAR DES FILETS
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * C'est la bande « All-Time » d'ASXN : quatre valeurs alignées, chacune avec son
 * intitulé au-dessus, séparées par un filet vertical. Aucun cadre, aucun fond.
 *
 * ── POURQUOI PAS DES CARTES, PUISQUE `StatCard` EXISTE ──────────────────────
 *
 * Parce que ces chiffres-là ne bougent pas. Une carte est une SURFACE : elle dit
 * « ceci est un objet à part, avec sa propre vie ». C'est juste pour une capitalisation
 * qui tique toutes les trois minutes ; c'est faux pour un cumul depuis l'origine, qui
 * est un fait posé.
 *
 * La différence se voit à l'usage : quatre cartes attirent l'œil autant que la figure
 * au-dessus, quatre chiffres nus se lisent au passage et laissent la figure gagner.
 *
 * Le filet est en `divide-x` sur le conteneur plutôt qu'en bordure sur chaque cellule :
 * il ne se pose alors qu'ENTRE les éléments, jamais avant le premier ni après le
 * dernier — ce qu'une bordure gauche par cellule obligerait à corriger au `first:`.
 */
export function StatRow({
  items,
}: {
  items: { label: string; value: string; note?: string }[]
}) {
  if (items.length === 0) return null

  return (
    <dl className="grid gap-y-6 divide-border-subtle sm:grid-cols-2 sm:divide-x lg:grid-cols-4">
      {items.map((item) => (
        /* `px-6 first:pl-0` : le rembourrage crée la respiration autour du filet, et
           le premier ne doit pas être décalé du bord gauche du bloc — il s'aligne sur
           le titre de section au-dessus. */
        <div key={item.label} className="px-6 first:pl-0">
          <dt className="text-[length:var(--v2-text-2xs)] font-normal text-ink-muted">
            {item.label}
          </dt>
          <dd className="tabular mt-1 text-2xl font-semibold leading-tight text-ink">
            {item.value}
          </dd>
          {item.note ? (
            <p className="mt-1 text-[length:var(--v2-text-2xs)] text-ink-muted">{item.note}</p>
          ) : null}
        </div>
      ))}
    </dl>
  )
}
