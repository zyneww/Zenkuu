import type { ReactNode } from 'react'

import { Link } from '@/i18n/navigation'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * CARTE D'ANALYSE — LE MOTIF RÉPÉTÉ DE LA GRILLE DE L'ACCUEIL
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── DEUX NIVEAUX DE TITRE, ET CE N'EST PAS UN DOUBLON ───────────────────────
 *
 * La FAMILLE est écrite en gris, HORS du cadre. Le TITRE est en pleine encre, dedans.
 * C'est la disposition relevée sur tokenomist.ai/overview, et elle rend la page
 * parcourable de deux façons : on balaie la colonne par ses intitulés extérieurs sans
 * entrer dans les cadres, puis on lit le titre intérieur une fois qu'on s'est arrêté.
 * Supprimer l'un des deux niveaux fait perdre l'une des deux lectures.
 *
 * Une famille peut porter PLUSIEURS cartes — c'est le cas de l'analyse de l'offre,
 * qui en compte deux. L'intitulé n'est alors rendu que sur la première : répété, il
 * annoncerait deux familles là où il n'y en a qu'une. D'où `family` facultatif.
 *
 * ── LE TITRE EST SOULIGNÉ, ET C'EST UNE INFORMATION ─────────────────────────
 *
 * Le soulignement pointillé dit « ceci mène ailleurs » sans emprunter la couleur de
 * marque, qui est déjà prise par le lien d'action à droite. Deux liens de même
 * apparence dans un même en-tête feraient hésiter sur ce qu'ils font.
 *
 * ── L'ÉTAT VIDE EST À LA CHARGE DE L'APPELANT ───────────────────────────────
 *
 * Cette coque ne sait pas si la donnée est arrivée. Chaque carte d'analyse rend son
 * propre `EmptyState` avec la phrase de son fournisseur — c'est elle qui distingue
 * « aucune source configurée » de « la source n'a pas répondu », et le lecteur n'a pas
 * à deviner laquelle des deux il lit (§5).
 */
export function AnalysisCard({
  family,
  title,
  hint,
  href,
  action,
  children,
}: {
  /** Intitulé de famille, gris, hors du cadre. Omis sur les cartes qui suivent. */
  family?: string
  title: string
  /** Ce que la carte mesure, quand le titre ne suffit pas à le dire. */
  hint?: string
  /** Destination du titre et du lien d'action. */
  href?: string
  /** Libellé du lien d'action. Sans `href`, aucun lien n'est rendu. */
  action?: string
  children: ReactNode
}) {
  return (
    /*
      ── LA CARTE OCCUPE TOUTE LA HAUTEUR DE SA RANGÉE ────────────────────────

      Elle se dimensionnait sur son contenu. Deux cartes voisines n'ayant jamais la
      même hauteur — une figure de 200 px à gauche, une figure PLUS un tableau de cinq
      lignes à droite — la rangée se refermait sur deux cadres décalés de cent-vingt
      pixels, et l'œil lisait ce décalage comme un bloc qui n'a pas fini de charger.

      `h-full` sur la section + `flex-1` sur le cadre laissent la grille égaliser les
      deux : c'est elle qui connaît la hauteur de la rangée, pas la carte. Le contenu,
      lui, reçoit `flex-1` à son tour, ce qui permet aux figures qui le demandent
      (`grow`) de prendre le surplus au lieu de laisser un vide sous elles.

      L'ANIMATION DE SURVOL est un liseré, pas une élévation : le design system ne
      compte qu'une surface, et soulever une carte introduirait un second plan que
      rien d'autre sur la page n'emploie.
    */
    <section className="flex h-full flex-col gap-2">
      {family ? <h2 className="text-sm font-normal text-ink-muted">{family}</h2> : null}

      <div className="flex flex-1 flex-col gap-3 rounded-panel border border-border-subtle bg-panel p-4 transition-colors duration-200 hover:border-ink-muted/35">
        <header className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-0.5">
            <h3 className="truncate text-base font-semibold text-ink">
              {href ? (
                <Link
                  href={href}
                  className="underline decoration-border-subtle decoration-dotted underline-offset-4 transition-colors hover:decoration-ink-muted"
                >
                  {title}
                </Link>
              ) : (
                title
              )}
            </h3>
            {hint ? <p className="text-micro text-ink-muted">{hint}</p> : null}
          </div>

          {href && action ? (
            <Link
              href={href}
              className="group shrink-0 whitespace-nowrap text-xs text-brand transition-colors hover:text-brand-strong"
            >
              {action}{' '}
              <span
                aria-hidden="true"
                className="inline-block transition-transform duration-200 group-hover:translate-x-0.5"
              >
                →
              </span>
            </Link>
          ) : null}
        </header>

        <div className="flex flex-1 flex-col gap-3">{children}</div>
      </div>
    </section>
  )
}

/**
 * Tableau compact d'une carte d'analyse.
 *
 * `RankTable` plutôt qu'un `<table>` écrit dans chaque carte : cinq des huit familles
 * montrent le même objet — quelques lignes, un libellé à gauche, deux ou trois mesures
 * alignées à droite. Cinq copies auraient garanti cinq alignements divergents.
 *
 * ⚠️ `align` est indexé sur les COLONNES et non sur les cellules : c'est ce qui garantit
 * qu'une colonne de nombres reste alignée à droite sur toutes ses lignes, y compris
 * celles où la valeur manque et où un tiret la remplace.
 */
export function RankTable({
  columns,
  rows,
}: {
  columns: string[]
  rows: { key: string; cells: ReactNode[] }[]
}) {
  return (
    /* `flex-1` + `h-full` : deux cartes voisines dont l'une porte cinq lignes et
       l'autre cinq lignes PLUS une figure ne se refermaient pas au même endroit. La
       grille égalise les cadres ; ici, ce sont les lignes qui prennent le surplus,
       ce qui les aère au lieu de laisser un vide sous la dernière. */
    <div className="-mx-1 flex-1 overflow-x-auto px-1">
      <table className="h-full w-full min-w-[22rem] border-collapse">
        <thead>
          <tr>
            {columns.map((column, index) => (
              <th
                key={column}
                scope="col"
                className={`whitespace-nowrap pb-2 text-micro font-normal text-ink-muted ${
                  index === 0 ? 'text-left' : 'text-right'
                }`}
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            /* Le survol souligne la LIGNE ENTIÈRE, comme dans les tableaux de
               cotations : sur quatre colonnes alignées à droite, suivre une ligne des
               yeux jusqu'à sa dernière valeur est exactement ce qui échoue sans
               repère, et c'est ce que font les deux références. Le fond est translucide
               pour ne pas masquer le filet du dessus. */
            <tr
              key={row.key}
              className="border-t border-border-subtle transition-colors duration-150 hover:bg-surface-muted/50"
            >
              {row.cells.map((cell, index) => (
                <td
                  key={index}
                  className={`py-2 text-sm ${
                    index === 0 ? 'text-left text-ink' : 'text-right tabular text-ink'
                  }`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/**
 * Barre de progression d'une cellule de tableau.
 *
 * Reprise de la référence, où chaque ligne d'analyse porte sa part sous forme de
 * jauge à côté du nombre. Le nombre seul demande une comparaison mentale d'une ligne
 * à l'autre ; la jauge la rend immédiate, et les deux ensemble donnent la valeur
 * exacte ET le rang d'un coup d'œil.
 *
 * `value` est BORNÉE à [0, 100] pour la seule largeur : une part supérieure à cent —
 * cela arrive, une offre en circulation peut dépasser une offre maximale mal publiée —
 * déborderait du cadre. Le NOMBRE affiché à côté, lui, n'est pas borné : c'est
 * l'appelant qui le rend, et il doit dire la vérité même quand elle est étrange.
 */
export function ShareBar({ value }: { value: number }) {
  const width = Math.min(100, Math.max(0, value))

  return (
    <span
      aria-hidden="true"
      className="inline-flex h-1 w-14 shrink-0 overflow-hidden rounded-pill bg-surface-muted align-middle"
    >
      <span className="h-full rounded-pill bg-brand" style={{ width: `${width}%` }} />
    </span>
  )
}
