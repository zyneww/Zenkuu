'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'

import { usePhrase } from '@/components/locale/ContentProvider'
import type { AppHref } from '@/i18n/navigation'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
} from '@/components/ui/pagination'
import { pageWindow } from '@/components/ui/page-window'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Link } from '@/i18n/navigation'
import { ROW_CHOICES } from '@/lib/limits'
import { cn } from '@/lib/utils'

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
 * ── CE QU'ELLE EMPRUNTE À SHADCN/UI, ET CE QU'ELLE GARDE ────────────────────
 *
 * La STRUCTURE vient de `Pagination` : un `<nav>` étiqueté, une `<ul>` de cases,
 * l'ellipse, et l'habillage des cibles par `buttonVariants` — ce qui met les numéros
 * de page sur la même échelle de tailles, le même anneau de focus et le même survol
 * que tous les autres boutons du site. La liste sémantique est un gain : un lecteur
 * d'écran annonce désormais « liste de 7 éléments » au lieu d'énumérer des liens sans
 * relation entre eux.
 *
 * ⚠️ CE QUI NE VIENT PAS DE LÀ, ET NE PEUT PAS EN VENIR :
 *
 *   · `PaginationPrevious` / `PaginationNext` ne sont pas utilisés. Ils écrivent
 *     « Previous » et « Next » en toutes lettres, dans une langue en dur ; le site en
 *     sert treize, et ses flèches sont muettes par manque de place dans le pied d'un
 *     tableau dense. Les deux cases sont donc rendues par `Step`, qui pose le libellé
 *     dans `aria-label` — lu à voix haute, absent à l'œil.
 *   · Le composant n'a AUCUNE notion de total, de fenêtre de pages, ni d'état
 *     désactivé. Ces trois-là sont la substance de ce fichier, et la raison pour
 *     laquelle il existe au-dessus plutôt qu'à la place.
 *
 * ── CE COMPOSANT NE DÉCIDE RIEN D'AUTRE ──────────────────────────────────────
 *
 * Il ne connaît ni les données, ni le tri, ni l'URL. Il reçoit où l'on en est et
 * appelle en retour. Le calcul de la fenêtre de pages vit dans `page-window.ts`, avec
 * ses tests : une logique pure enfermée dans un module JSX est une logique qu'on ne
 * peut PAS éprouver, l'exécuteur de tests refusant d'analyser un fichier qui contient
 * du JSX. C'est un argument de testabilité, pas de rangement.
 */

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
  | { onPageChange?: never; hrefFor: (page: number) => AppHref }
  | { onPageChange?: never; hrefFor?: never }

type TablePaginationProps = Extent &
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

export function TablePagination({
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
}: TablePaginationProps) {
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
    /*
      ── LES NUMÉROS SONT AU CENTRE DE LA BARRE, ET NON AU MILIEU DE TROIS BLOCS ──

      La barre était en `flex justify-between`. Avec trois enfants, cela répartit
      l'espace ENTRE eux : le groupe du milieu se retrouve donc là où les largeurs des
      deux autres le laissent, et non au centre. Le décalage est invisible quand le
      compteur et le sélecteur pèsent à peu près pareil, et flagrant sinon —
      « Affichage de 1 à 25 sur 250 actifs » à gauche contre « Lignes 25 » à droite
      poussait la pagination nettement vers la droite.
      Pire, sur une barre à DEUX enfants — un classement paginé par la source, donc
      sans sélecteur de lignes — `justify-between` collait simplement les numéros au
      bord droit.

      Une grille à trois pistes règle les deux cas d'un coup : les colonnes latérales
      partagent le reste à parts égales (`1fr` chacune), et la piste du milieu se
      dimensionne sur son contenu. Les numéros tombent donc au centre GÉOMÉTRIQUE de
      la barre, que le sélecteur de lignes existe ou non.

      Les pistes latérales sont rendues MÊME VIDES — d'où le `<span />` : une piste
      absente ferait glisser la grille d'une colonne, et le centre avec elle.

      Sous `sm`, retour à un empilement : trois pistes sur 393 px donneraient trois
      colonnes trop étroites pour un compteur d'une ligne.

      ── SANS SÉLECTEUR DE LIGNES, LES CRANS PASSENT À DROITE ─────────────────

      Les tableaux de cotations ont remonté ce sélecteur dans leur rangée d'outils
      (voir `RowsPerPage`). La barre n'a donc plus que deux blocs, et centrer les crans
      laisserait un vide à droite aussi large que le compteur à gauche. Deux pistes,
      compteur à gauche et crans à droite : c'est la barre de la référence.
    */
    /*
      ── LA BARRE EST À L'ÉCHELLE DU TABLEAU, PAS DE SA NOTE DE BAS DE PAGE ──

      Elle était écrite en `text-xs` sur des cases de 24 px : à cette taille, un pied
      de tableau se lit comme une mention légale, et les numéros de page — qui sont
      les seules CIBLES de la bande — étaient les plus petits éléments de l'écran.

      Les mesures viennent de la référence, relevées au navigateur : 14 px de texte,
      des cases de 36 px, un rayon de 12 px. Le compteur passe en `text-ink` et non
      plus en gris atténué — il répond à « où en suis-je ? », qui n'est pas une
      question secondaire.
    */
    <div
      className={`flex flex-col items-center gap-3 border-t border-border-subtle pt-4 text-sm sm:grid sm:gap-x-6 ${
        rowsUseful ? 'sm:grid-cols-[1fr_auto_1fr]' : 'sm:grid-cols-[1fr_auto]'
      }`}
    >
      <p className="tabular text-ink sm:justify-self-start">
        {counterText({ known, total, first, last, unit, singlePage: !navigable, t })}
      </p>

      {navigable ? (
        /* `w-auto` et `mx-0` : `Pagination` se centre lui-même sur toute la largeur
           disponible (`mx-auto w-full`), ce qui est le bon réglage pour une page de
           contenu et le mauvais dans une grille à pistes — la piste du milieu
           s'étirerait et emporterait les autres avec elle. */
        <Pagination
          className={`mx-0 w-auto ${
            rowsUseful ? 'sm:justify-self-center' : 'sm:justify-self-end'
          }`}
        >
          <PaginationContent className="gap-1.5">
            <PaginationItem>
              <Step
                label={t('Page précédente')}
                target={page - 1}
                disabled={atStart}
                onPageChange={onPageChange}
                hrefFor={hrefFor}
              >
                <ChevronLeft className="size-4" aria-hidden="true" />
              </Step>
            </PaginationItem>

            {entries.map((entry, index) =>
              entry === null ? (
                // La clé porte l'INDEX parce qu'il peut y avoir deux ellipses, l'une à
                // gauche et l'autre à droite : `key="…"` les ferait entrer en collision.
                <PaginationItem key={`gap-${index}`}>
                  <PaginationEllipsis className="size-9" />
                </PaginationItem>
              ) : entry === page ? (
                /* La page courante n'est PAS une cible : y mener rechargerait ce qui
                   est déjà à l'écran. Un `<span>` le dit à l'œil comme au lecteur
                   d'écran, là où un bouton inerte ne le dirait qu'au premier.

                   `PaginationLink asChild` habille ce `<span>` : on garde `isActive`,
                   donc `aria-current="page"` et `data-active`, sans hériter d'une
                   balise cliquable. */
                <PaginationItem key={entry}>
                  <PaginationLink
                    asChild
                    isActive
                    size="icon"
                    className="tabular min-w-9 rounded-xl border-0 bg-brand text-sm font-semibold text-on-brand shadow-none hover:bg-brand hover:text-on-brand"
                  >
                    <span>{entry}</span>
                  </PaginationLink>
                </PaginationItem>
              ) : (
                <PaginationItem key={entry}>
                  <Step
                    label={`${t('Page')} ${entry}`}
                    target={entry}
                    disabled={false}
                    onPageChange={onPageChange}
                    hrefFor={hrefFor}
                  >
                    {entry}
                  </Step>
                </PaginationItem>
              ),
            )}

            <PaginationItem>
              <Step
                label={t('Page suivante')}
                target={page + 1}
                disabled={atEnd}
                onPageChange={onPageChange}
                hrefFor={hrefFor}
              >
                <ChevronRight className="size-4" aria-hidden="true" />
              </Step>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      ) : (
        <span />
      )}

      {rowsUseful && onPerPageChange ? (
        <RowsPerPage
          perPage={perPage}
          onPerPageChange={onPerPageChange}
          perPageChoices={perPageChoices}
          className="sm:justify-self-end"
        />
      ) : (
        <span />
      )}
    </div>
  )
}

/**
 * LE SÉLECTEUR DE LIGNES, EXTRAIT DE LA BARRE.
 *
 * Il en occupait le bord droit. Les tableaux de cotations le remontent désormais dans
 * leur RANGÉE D'OUTILS, au-dessus des colonnes — là où vivent les autres réglages
 * d'affichage — ce qui laisse la barre du bas aux deux seules choses qui parlent de la
 * position dans la liste : le compteur et les crans de page.
 *
 * `TablePagination` continue de le rendre lui-même quand on lui passe
 * `onPerPageChange` : les tableaux qui n'ont pas de rangée d'outils — places de
 * cotation, palmarès, carnets — gardent leur pied inchangé.
 */
export function RowsPerPage({
  perPage,
  onPerPageChange,
  perPageChoices = ROW_CHOICES,
  className = '',
}: {
  perPage: number
  onPerPageChange: (perPage: number) => void
  perPageChoices?: readonly number[]
  className?: string
}) {
  const t = usePhrase()

  return (
    <div className={`flex items-center gap-2 text-xs text-ink-muted ${className}`}>
      {/* `Select` de shadcn/ui : c'est le même contrôle que les filtres du fil
          d'actualités et que le reste des sélecteurs du site, alors qu'il portait
          ici son propre habillage — fond plein, anneau `brand-soft` — qui ne se
          retrouvait nulle part ailleurs.

          `aria-label` sur le déclencheur plutôt qu'un `<label>` enveloppant :
          Radix rend un `<button>` et une liste en portail, une étiquette posée
          autour n'aurait plus rien à désigner. Le mot « Lignes » reste À CÔTÉ
          parce qu'il est lu à l'œil comme l'unité du nombre, pas comme un intitulé
          de champ. */}
      <span aria-hidden="true">{t('Lignes')}</span>
      <Select value={String(perPage)} onValueChange={(next) => onPerPageChange(Number(next))}>
        <SelectTrigger size="sm" aria-label={t('Lignes par page')} className="tabular w-max">
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="end">
          {perPageChoices.map((choice) => (
            <SelectItem key={choice} value={String(choice)} className="tabular">
              {choice}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

/**
 * Le compteur, en une phrase.
 *
 * Extrait de la barre parce qu'il porte TROIS cas qui ne se ressemblent pas, et que
 * les empiler en ternaires imbriqués rendait le corps du composant illisible. Une
 * fonction nommée dit ce que trois points d'interrogation ne disaient pas.
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
const UNITS = [
  'actif',
  'article',
  'cotation',
  'ligne',
  'paire',
  'place',
  'résultat',
  'secteur',
  'société',
] as const

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
 * absorbées — garantit qu'ils divergent au premier ajustement de padding. C'est
 * `PaginationLink` qui porte désormais cette apparence commune, et `asChild` qui
 * laisse la balise varier en dessous.
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
  hrefFor?: ((page: number) => AppHref) | undefined
  children: React.ReactNode
}) {
  /*
     `min-w-9` et non une largeur fixe : « 12 » et « 120 » doivent tenir dans la même
     rangée sans que l'un déborde ni que l'autre flotte.

     ── L'APLAT DISCRET N'EST PAS DÉCORATIF ────────────────────────────────

     Les numéros étaient du texte gris posé sur le fond de la page : rien ne disait
     qu'ils étaient CLIQUABLES avant qu'on ne les survole, et sur un pied de tableau
     on ne survole pas ce qu'on ne prend pas pour un bouton. La référence pose sous
     chacun un aplat à peine visible — relevé à 3 % d'opacité — qui suffit à les
     lire comme une rangée de cases. C'est ce que fait `bg-surface-muted`.

     Le texte passe en `text-ink` : un numéro de page atteignable ne doit pas être
     plus pâle que le compteur qui le commente.
  */
  const shared =
    'tabular min-w-9 rounded-xl border-0 bg-surface-muted/70 text-sm font-medium text-ink shadow-none hover:bg-surface-muted hover:text-brand'

  if (disabled) {
    return (
      <PaginationLink
        asChild
        size="icon"
        className={cn(shared, 'pointer-events-none bg-transparent opacity-30')}
      >
        <span aria-hidden="true">{children}</span>
      </PaginationLink>
    )
  }

  if (hrefFor) {
    return (
      <PaginationLink asChild size="icon" className={shared}>
        <Link href={hrefFor(target)} aria-label={label}>
          {children}
        </Link>
      </PaginationLink>
    )
  }

  return (
    <PaginationLink asChild size="icon" className={shared}>
      <button type="button" onClick={() => onPageChange?.(target)} aria-label={label}>
        {children}
      </button>
    </PaginationLink>
  )
}
