'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'

import { usePhrase } from '@/components/locale/ContentProvider'
import { pageWindow } from '@/components/ui/page-window'
import { Link } from '@/i18n/navigation'

/**
 * Barre de pagination — compteur, pages, taille de page. La seule du site.
 *
 * ── POURQUOI PAGINER PLUTÔT QUE DÉFILER ──────────────────────────────────────
 *
 * Une liste de trois cents lignes qu'on fait défiler sans fin a trois défauts qu'on
 * ne remarque qu'à l'usage : on ne sait jamais où l'on en est, on ne peut pas revenir
 * à « la troisième page » parce qu'il n'y a pas de pages, et le navigateur garde en
 * mémoire tout ce qu'on a traversé. Le compteur « 1 à 50 sur 300 » répond à la
 * première question avant même qu'on se la pose.
 *
 * ── ELLE A ABSORBÉ QUATRE PAGINATIONS QUI SE RESSEMBLAIENT SANS SE VALOIR ────
 *
 * Le site en portait cinq écrites séparément : deux jeux de boutons carrés bordés,
 * un « Afficher 50 secteurs de plus », un « Afficher 15 actifs de plus », et
 * celle-ci. Toutes disaient la même chose dans un dialecte différent, et deux d'entre
 * elles recopiaient le calcul de la fenêtre de pages.
 *
 * Le coût n'était pas le doublon mais l'INCOHÉRENCE : « afficher plus » accumule et
 * ne recule pas, une rangée de carrés bordés ne dit pas combien il reste, et le
 * lecteur devait réapprendre le vocabulaire à chaque tableau. Une seule barre, trois
 * réglages.
 *
 * ── LES TROIS RÉGLAGES ───────────────────────────────────────────────────────
 *
 * 1. NAVIGATION — `onPageChange` pour une liste triée en mémoire, `hrefFor` pour un
 *    classement dont la page vit dans l'adresse. Le second rend de vrais liens :
 *    ouvrables dans un onglet, indexables, fonctionnels sans JavaScript. Le premier
 *    ne le pourrait pas, sa liste n'ayant pas d'URL.
 *
 * 2. ÉTENDUE — `total` quand on sait combien il y a de lignes, `count` + `hasNext`
 *    quand la source ne le dit pas. Voir `Extent` plus bas : c'est le réglage qui a
 *    demandé le plus de soin, parce qu'inventer un total est le seul mensonge qu'une
 *    barre de pagination sait produire.
 *
 * 3. TAILLE DE PAGE — le sélecteur n'apparaît que si `onPerPageChange` est fourni.
 *
 * ── CE COMPOSANT NE DÉCIDE RIEN D'AUTRE ──────────────────────────────────────
 *
 * Il ne connaît ni les données, ni le tri, ni l'URL. Il reçoit où l'on en est et
 * appelle en retour. Le calcul de la fenêtre de pages vit dans `page-window.ts`, avec
 * ses tests : une logique pure enfermée dans un module JSX est une logique qu'on ne
 * peut PAS éprouver, l'exécuteur de tests refusant d'analyser un fichier qui contient
 * du JSX. C'est un argument de testabilité, pas de rangement.
 */

const ROW_CHOICES = [25, 50, 100] as const

/**
 * Ce que l'on sait de la longueur de la liste.
 *
 * ── UN TOTAL INCONNU N'EST PAS UN TOTAL À ESTIMER ────────────────────────────
 *
 * Les classements d'actifs sont paginés PAR LA SOURCE, qui ne renvoie jamais le
 * nombre d'éléments qu'elle détient. On ne peut donc ni écrire « sur 12 500 », ni
 * numéroter jusqu'à la dernière page : les deux seraient inventés.
 *
 * Ce qu'on sait, en revanche, est exact : combien de lignes cette page porte, et si
 * elle est PLEINE — auquel cas il en existe forcément une suivante. La barre se
 * limite alors à ce qu'elle peut prouver, c'est-à-dire la page précédente, la
 * courante et la suivante.
 *
 * Les deux formes sont exclusives par construction, `never` empêchant de mélanger un
 * total avec un décompte de page : la première branche du rendu peut alors se fier au
 * seul test de `total`.
 */
type Extent =
  | { total: number; count?: never; hasNext?: never }
  | { total?: never; count: number; hasNext: boolean }

/**
 * Comment on se rend à une autre page.
 *
 * ── TROIS BRANCHES, ET LA TROISIÈME EST UN AJOUT ────────────────────────────
 *
 * Les deux premières restent exclusives pour la raison d'origine : un rappel OU des
 * liens, jamais les deux, sans quoi le composant devrait arbitrer lequel gagne.
 *
 * La troisième — AUCUN DES DEUX — autorise un pied de tableau qui COMPTE sans
 * naviguer. C'est le cas des classes d'actifs dont l'univers entier tient dans une
 * page : douze matières premières n'ont pas de seconde page, mais elles ont un
 * décompte, et un tableau qui se referme sans dire combien de lignes il contient
 * laisse le lecteur se demander s'il en manque.
 *
 * Le rendu la gère déjà : `navigable` est faux quand il n'y a qu'une page, et les
 * boutons ne s'affichent pas. C'était donc le TYPE, et lui seul, qui interdisait un
 * usage que le composant savait servir.
 */
type Nav =
  | { onPageChange: (page: number) => void; hrefFor?: never }
  | { onPageChange?: never; hrefFor: (page: number) => string }
  | { onPageChange?: never; hrefFor?: never }

type PaginationProps = Extent &
  Nav & {
    /** Page courante, à partir de 1. */
    page: number
    perPage: number
    /** Nom de ce qui est compté, AU SINGULIER — le pluriel est ajouté au besoin. */
    unit?: string
    perPageChoices?: readonly number[]
    /** Absent : pas de sélecteur de lignes. */
    onPerPageChange?: (perPage: number) => void
  }

export function Pagination({
  page,
  perPage,
  total,
  count,
  hasNext,
  unit = 'résultat',
  onPageChange,
  hrefFor,
  onPerPageChange,
  perPageChoices = ROW_CHOICES,
}: PaginationProps) {
  const t = usePhrase()
  const known = typeof total === 'number'

  /*
   * Bornes affichées dans le compteur.
   *
   * `first` vaut 0 sur une liste VIDE, et c'est voulu : « 1 à 0 sur 0 » se lit comme
   * un défaut, « 0 à 0 sur 0 » se lit comme un vide. Le composant n'est de toute façon
   * pas rendu dans ce cas par ses appelants, mais un composant qui ment quand on le
   * sort de son contexte est un piège qu'on paie plus tard.
   */
  const shown = known ? total : (count as number)
  const first = shown === 0 ? 0 : (page - 1) * perPage + 1
  const last = known ? Math.min(page * perPage, total) : first + shown - 1

  const pageCount = known ? Math.max(1, Math.ceil(total / perPage)) : 0
  const entries: (number | null)[] = known
    ? pageWindow(page, pageCount)
    : // Sans total, on ne numérote que les pages dont l'existence est DÉMONTRÉE : la
      // précédente puisqu'on en vient, la courante, et la suivante si celle-ci est
      // pleine. Une quatrième serait une conjecture.
      [page > 1 ? page - 1 : null, page, hasNext ? page + 1 : null].filter(
        (entry): entry is number => entry !== null,
      )

  const atStart = page <= 1
  const atEnd = known ? page >= pageCount : !hasNext
  const navigable = entries.length > 1 || !atEnd || !atStart

  /*
   * DEUX CONTRÔLES QUI S'EFFACENT QUAND ILS NE PEUVENT RIEN CHANGER.
   *
   * Le sélecteur de lignes ne sert à rien si même son plus petit cran tient tout sur
   * une page : les trois choix donneraient le même écran. Un contrôle sans effet ne
   * coûte pas qu'un peu de place — il fait douter de ceux qui en ont un.
   *
   * Le compteur, lui, se raccourcit plutôt que de disparaître : « Affichage de 1 à 10
   * sur 10 actifs » dit trois fois la même chose quand il n'y a qu'une page. « 10
   * actifs » la dit une fois, et reste utile — c'est la taille du résultat.
   */
  const rowsUseful =
    onPerPageChange !== undefined && (!known || total > Math.min(...perPageChoices))

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-border-subtle pt-3 text-xs">
      <p className="tabular text-ink-muted">
        {counterText({ known, total, first, last, unit, singlePage: !navigable, t })}
      </p>

      {navigable ? (
        <nav aria-label="Pagination" className="flex items-center gap-1">
          <Step
            label="Page précédente"
            target={page - 1}
            disabled={atStart}
            onPageChange={onPageChange}
            hrefFor={hrefFor}
          >
            <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
          </Step>

          {entries.map((entry, index) =>
            entry === null ? (
              // La clé porte l'INDEX parce qu'il peut y avoir deux ellipses, l'une à
              // gauche et l'autre à droite : `key="…"` les ferait entrer en collision.
              <span key={`gap-${index}`} className="px-1 text-ink-muted" aria-hidden="true">
                …
              </span>
            ) : entry === page ? (
              /* La page courante n'est PAS une cible : y mener rechargerait ce qui est
                 déjà à l'écran. Un `<span>` le dit à l'œil comme au lecteur d'écran,
                 là où un bouton inerte ne le dirait qu'au premier. */
              <span
                key={entry}
                aria-current="page"
                className="tabular min-w-7 rounded-control bg-brand px-2 py-1 text-center font-medium text-on-brand"
              >
                {entry}
              </span>
            ) : (
              <Step
                key={entry}
                label={`Page ${entry}`}
                target={entry}
                disabled={false}
                onPageChange={onPageChange}
                hrefFor={hrefFor}
              >
                {entry}
              </Step>
            ),
          )}

          <Step
            label="Page suivante"
            target={page + 1}
            disabled={atEnd}
            onPageChange={onPageChange}
            hrefFor={hrefFor}
          >
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Step>
        </nav>
      ) : null}

      {rowsUseful && onPerPageChange ? (
        <label className="flex items-center gap-2 text-ink-muted">
          Lignes
          <select
            value={perPage}
            onChange={(event) => onPerPageChange(Number(event.target.value))}
            className="tabular rounded-control border border-border-subtle bg-surface px-2 py-1 text-xs text-ink focus:border-brand focus:outline-none"
          >
            {perPageChoices.map((choice) => (
              <option key={choice} value={choice}>
                {choice}
              </option>
            ))}
          </select>
        </label>
      ) : null}
    </div>
  )
}

/**
 * Le compteur, en une phrase.
 *
 * Extrait de la barre parce qu'il porte TROIS cas qui ne se ressemblent pas, et que
 * les empiler en ternaires imbriqués rendait le corps du composant illisible. Une
 * fonction nommée dit ce que trois points d'interrogation ne disaient pas.
 */
/**
 * Les trois phrases du compteur, une par unité comptée.
 *
 * ── POURQUOI L'UNITÉ EST DANS LA PHRASE, ET NON À CÔTÉ ───────────────────
 *
 * On aurait pu traduire le cadre d'un côté (« Affichage de … sur … {unit} ») et le nom
 * de l'autre (« places »). Le français et l'anglais s'en accommodent ; le russe non.
 * « sur 100 places » s'y dit « из 100 площадок », un génitif pluriel qu'aucun
 * assemblage de deux morceaux nominatifs ne produit. Chaque unité porte donc sa
 * phrase entière : cela coûte trois clés par unité, et les rend justes dans les
 * treize langues.
 */
const UNITS = ['actif', 'article', 'cotation', 'ligne', 'paire', 'place', 'résultat', 'secteur'] as const

function counterText({
  known,
  total,
  first,
  last,
  unit,
  singlePage,
  t,
}: {
  known: boolean
  total: number | undefined
  first: number
  last: number
  unit: string
  singlePage: boolean
  t: (text: string) => string
}): string {
  /*
   * Une unité hors table — « BTC », un symbole — n'a pas de phrase à elle. Elle
   * retombe sur « résultat » plutôt que de composer une clé introuvable, ce qui
   * afficherait la clé elle-même.
   */
  const counted = (UNITS as readonly string[]).includes(unit) ? unit : 'résultat'
  const fill = (text: string) =>
    text
      .replace('{first}', String(first))
      .replace('{last}', String(last))
      .replace('{count}', String(total))

  /*
   * TOTAL INCONNU. Pas de « sur N » : la source ne le publie pas, et l'inventer serait
   * le seul mensonge qu'une barre de pagination sache produire.
   */
  if (!known) return fill(t(`${capitalise(counted)}s {first} à {last}`))

  const count = total as number

  /* UNE SEULE PAGE. « Affichage de 1 à 10 sur 10 » dit trois fois la même chose. */
  if (singlePage) {
    return fill(t(count > 1 ? `{count} ${counted}s` : `{count} ${counted}`))
  }

  return fill(t(`Affichage de {first} à {last} sur {count} ${counted}s`))
}

function capitalise(word: string): string {
  return `${word.charAt(0).toUpperCase()}${word.slice(1)}`
}

/**
 * Une cible de la barre : flèche ou numéro, bouton ou lien.
 *
 * ── LES TROIS RENDUS SE PARTAGENT UNE SEULE APPARENCE ────────────────────────
 *
 * Un lien, un bouton et un état désactivé sont trois éléments HTML différents pour
 * une même case visuelle. Les écrire séparément — ce que faisaient les paginations
 * absorbées — garantit qu'ils divergent au premier ajustement de padding.
 *
 * Le cas désactivé rend un `<span>` et non un lien inerte : un `<a>` sans `href` sort
 * de l'ordre de tabulation sans l'annoncer, alors qu'un bouton `disabled` le dit.
 * Mais en mode lien il n'y a pas de bouton — d'où le `<span aria-hidden>`, qui
 * disparaît proprement de l'arbre d'accessibilité au lieu d'y figurer comme une cible
 * morte.
 */
function Step({
  label,
  target,
  disabled,
  onPageChange,
  hrefFor,
  children,
}: {
  label: string
  target: number
  disabled: boolean
  onPageChange?: ((page: number) => void) | undefined
  hrefFor?: ((page: number) => string) | undefined
  children: React.ReactNode
}) {
  /* `min-w-7` et non une largeur fixe : « 12 » et « 120 » doivent tenir dans la même
     rangée sans que l'un déborde ni que l'autre flotte. */
  const base =
    'tabular flex min-w-7 items-center justify-center rounded-control px-2 py-1 font-medium transition-colors duration-150'

  if (disabled) {
    return (
      <span aria-hidden="true" className={`${base} text-ink-muted opacity-30`}>
        {children}
      </span>
    )
  }

  if (hrefFor) {
    return (
      <Link
        href={hrefFor(target)}
        aria-label={label}
        className={`${base} text-ink-muted hover:bg-surface-muted hover:text-ink`}
      >
        {children}
      </Link>
    )
  }

  return (
    <button
      type="button"
      onClick={() => onPageChange?.(target)}
      aria-label={label}
      className={`${base} text-ink-muted hover:bg-surface-muted hover:text-ink`}
    >
      {children}
    </button>
  )
}
