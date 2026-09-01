'use client'

import { Info, SlidersHorizontal, X } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { Search } from 'lucide-react'
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { usePhrase } from '@/components/locale/ContentProvider'

/**
 * COLONNES CHOISIES PAR LE LECTEUR — le mécanisme partagé par tous les tableaux.
 *
 * ── CE QUE CELA REMPLACE ─────────────────────────────────────────────────────
 *
 * Les tableaux du site décidaient seuls de ce qu'ils montrent, par point d'arrêt :
 * la capitalisation apparaissait au-dessus de `sm`, le volume au-dessus de `md`, le
 * graphique au-dessus de `lg`. C'est une bonne règle par défaut et une mauvaise
 * règle définitive — quelqu'un qui vient pour les volumes n'a aucun moyen de dire
 * qu'il se passe du graphique.
 *
 * Les points d'arrêt SUBSISTENT et gardent la main sur ce qui tient à l'écran : le
 * choix du lecteur retire des colonnes, il n'en force jamais une que la largeur
 * n'admet pas. Les deux mécanismes se composent au lieu de se contredire.
 *
 * ── POURQUOI `useSyncExternalStore` ET NON UN EFFET ──────────────────────────
 *
 * Ces préférences vivent dans `localStorage`, que le serveur ne peut pas lire. La
 * façon naïve — lire dans un `useEffect` puis `setState` — a deux défauts :
 * le tableau se peint d'abord avec les colonnes par défaut PUIS saute à celles du
 * lecteur, et React interdit désormais ce motif (`set-state-in-effect`).
 *
 * `useSyncExternalStore` sépare explicitement l'instantané SERVEUR de l'instantané
 * CLIENT. L'hydratation reste cohérente, la lecture n'est pas un effet, et les
 * onglets ouverts sur la même page se synchronisent gratuitement par l'événement
 * `storage`.
 */

const PREFIX = 'zenkuu-colonnes:'

/**
 * `storage` ne se déclenche QUE dans les autres onglets — jamais dans celui qui
 * écrit. Sans cet événement maison, cocher une colonne ne redessinerait pas le
 * tableau qu'on a sous les yeux, alors qu'il se mettrait à jour dans l'onglet d'à
 * côté. C'est le genre de défaut qu'on ne trouve qu'en ouvrant deux fenêtres.
 */
const LOCAL_EVENT = 'zenkuu:colonnes'

function subscribe(onChange: () => void): () => void {
  window.addEventListener('storage', onChange)
  window.addEventListener(LOCAL_EVENT, onChange)

  return () => {
    window.removeEventListener('storage', onChange)
    window.removeEventListener(LOCAL_EVENT, onChange)
  }
}

/**
 * L'instantané est la CHAÎNE BRUTE, pas un tableau.
 *
 * `useSyncExternalStore` compare les instantanés par identité et boucle à l'infini
 * si `getSnapshot` fabrique un objet neuf à chaque appel. Une chaîne se compare par
 * valeur : elle est le seul type sûr à rendre ici, et l'analyse en `Set` se fait plus
 * loin dans un `useMemo`.
 */
function readRaw(key: string): string {
  try {
    return localStorage.getItem(PREFIX + key) ?? ''
  } catch {
    /* Navigation privée stricte : le choix ne survit pas à la session, le tableau
       fonctionne quand même. */
    return ''
  }
}

function writeRaw(key: string, value: string): void {
  try {
    if (value) localStorage.setItem(PREFIX + key, value)
    else localStorage.removeItem(PREFIX + key)
  } catch {
    /* Voir `readRaw`. */
  }
  window.dispatchEvent(new Event(LOCAL_EVENT))
}

export interface ColumnDef {
  id: string
  label: string
  /**
   * Colonne que le lecteur ne peut pas retirer.
   *
   * Réservée à ce sans quoi la ligne cesse d'identifier quoi que ce soit — le nom de
   * l'actif, son cours. Un tableau dont on peut masquer la colonne « Actif » n'est
   * plus un tableau, c'est une liste de nombres anonymes.
   */
  locked?: boolean
}

export interface ColumnPreferences {
  /** La colonne est-elle affichée ? */
  isVisible: (id: string) => boolean
  toggle: (id: string) => void
  reset: () => void
  hiddenCount: number
  columns: ColumnDef[]
}

/**
 * @param storageKey Identifiant STABLE du tableau. Il entre dans la clé de stockage :
 *                   deux tableaux qui le partageraient partageraient leurs colonnes.
 */
export function useColumnPreferences(
  storageKey: string,
  columns: ColumnDef[],
): ColumnPreferences {
  const raw = useSyncExternalStore(
    subscribe,
    () => readRaw(storageKey),
    /* Instantané SERVEUR : rien de masqué. C'est la seule réponse honnête — le serveur
       ignore ce que ce lecteur a choisi, et deviner ferait diverger le HTML rendu du
       HTML hydraté. */
    () => '',
  )

  const hidden = useMemo(() => new Set(raw ? raw.split(',') : []), [raw])

  return useMemo(() => {
    const lockedIds = new Set(columns.filter((column) => column.locked).map((c) => c.id))

    return {
      columns,
      hiddenCount: [...hidden].filter((id) => !lockedIds.has(id)).length,
      isVisible: (id: string) => lockedIds.has(id) || !hidden.has(id),
      toggle: (id: string) => {
        if (lockedIds.has(id)) return

        const next = new Set(hidden)
        if (next.has(id)) next.delete(id)
        else next.add(id)

        writeRaw(storageKey, [...next].join(','))
      },
      reset: () => writeRaw(storageKey, ''),
    }
  }, [columns, hidden, storageKey])
}

/* ── Menu d'en-tête ───────────────────────────────────────────────────────── */

export type SortDirection = 'asc' | 'desc'

/**
 * EN-TÊTE DE COLONNE — UN INTITULÉ, ET SON DOUBLE CHEVRON DE TRI.
 *
 * ── LE MENU DÉROULANT A ÉTÉ RETIRÉ ───────────────────────────────────────────
 *
 * L'en-tête ouvrait un panneau à trois entrées : « du plus grand au plus petit »,
 * « du plus petit au plus grand », « masquer cette colonne ». Deux clics pour un
 * geste qui en demande un, et un panneau qui s'ouvrait sur CHAQUE colonne d'un
 * tableau qui en porte onze — y compris sur celles qui n'offraient rien d'autre que
 * « masquer ».
 *
 * Le clic sur l'intitulé TRIE directement, et un second inverse le sens : c'est la
 * convention de tous les tableaux de cotation, et le double chevron l'annonce déjà.
 * Le masquage vit dans « Personnaliser », là où l'on peut aussi RÉAFFICHER — ce que
 * le menu d'en-tête ne savait pas faire, une colonne masquée emportant son menu avec
 * elle.
 */
export function ColumnHeader({
  label,
  sortKey,
  sort,
  onSort,
  align = 'right',
  className = '',
  hint,
  width = '',
}: {
  label: string
  /**
   * Identifiant de la colonne dans les préférences d'affichage.
   *
   * Accepté mais NON LU : il servait à savoir si la colonne pouvait être masquée
   * depuis ce menu, qui n'existe plus. Les appelants le passent encore parce qu'il
   * documente la colonne à la lecture, et le retirer d'une quinzaine d'en-têtes ne
   * changerait rien à l'écran.
   */
  columnId?: string
  /** Clé de tri. Absente, la colonne n'est pas triable et l'intitulé n'est pas cliquable. */
  sortKey?: string
  sort?: { key: string; direction: SortDirection } | null
  onSort?: (key: string, direction: SortDirection) => void
  /** Accepté pour compatibilité d'appel — le masquage ne passe plus par l'en-tête. */
  columnPrefs?: ColumnPreferences
  align?: 'left' | 'right'
  className?: string
  /** Précision affichée en infobulle — d'où vient le chiffre, ce qu'il couvre. */
  hint?: string
  /**
   * Largeur de la colonne, en classe utilitaire (`w-32`, `w-[110px]`…).
   *
   * ── ELLE N'EST PAS COSMÉTIQUE : ELLE EMPÊCHE LE TABLEAU DE SAUTER ──────────
   *
   * Le `<table>` est en `table-fixed`, et dans ce mode les largeurs de colonne se
   * lisent SUR LA PREMIÈRE RANGÉE — celle-ci — et jamais dans le corps. C'est
   * exactement ce qu'il faut ici : sans cela, chaque tri remesurait les onze colonnes
   * sur leur contenu, et la grille entière se décalait sous les yeux au moment du clic
   * — « +1 876,98 % » n'occupe pas la place de « 0,00 % ».
   *
   * Absente, la colonne prend sa part de ce qui reste.
   */
  width?: string
}) {
  const isActive = sortKey !== undefined && sort?.key === sortKey
  const sortable = sortKey !== undefined && onSort !== undefined

  const inner = (
    <>
      {label}
      {/* Une colonne qui porte une précision l'annonce dans son en-tête : sans ce
          signe, rien n'invite à s'arrêter dessus pour lire l'infobulle. */}
      {hint ? <Info className="h-3 w-3 shrink-0 opacity-45" aria-hidden="true" /> : null}
      {sortKey !== undefined ? <SortGlyph sort={isActive ? sort?.direction : null} /> : null}
    </>
  )

  const innerClass = `inline-flex items-center gap-1 ${align === 'right' ? 'flex-row-reverse' : ''}`

  return (
    <th
      scope="col"
      /*
        ── LE FILET VERTICAL, ET POURQUOI IL EST À GAUCHE ────────────────────
        `first:border-l-0` le retire de la première colonne : un filet posé au bord
        gauche de la bande doublerait celui du cadre du tableau, et l'épaisseur double
        se voit. Porté à GAUCHE plutôt qu'à droite, il ne dépend pas de savoir quelle
        colonne est la dernière — laquelle change avec la largeur de la fenêtre, les
        colonnes de comparaison cédant les premières.
      */
      /* 12 px et non 13 : les en-têtes de colonne de la référence sont en
         12px/600, contre 13px ici — `text-xs` vaut 13 dans l'échelle ZENKUU, et
         `--v2-text-2xs` est le seul cran à 12. La graisse, elle, coïncidait déjà. */
      /* `whitespace-nowrap` : « Variation (24 h) » se cassait en deux lignes, et une
         seule colonne pliée suffisait à doubler la hauteur de toute la rangée. Un
         intitulé de colonne se lit d'un bloc ou il ne se lit pas. */
      className={`whitespace-nowrap border-l border-border-subtle/60 px-3 py-2.5 text-[length:var(--v2-text-2xs)] font-semibold text-ink-muted first:border-l-0 ${align === 'right' ? 'text-right' : 'text-left'} ${width} ${className}`}
      aria-sort={
        isActive ? (sort?.direction === 'desc' ? 'descending' : 'ascending') : 'none'
      }
    >
      {sortable ? (
        /*
          LE PREMIER CLIC TRIE EN DÉCROISSANT, et ce n'est pas arbitraire : sur un
          tableau de cotations, « les plus grosses capitalisations » et « les plus
          fortes hausses » sont ce qu'on cherche neuf fois sur dix. Le sens s'inverse
          au clic suivant, tant que la colonne reste celle du tri actif ; revenir sur
          une autre colonne repart donc du décroissant, ce qui est aussi ce qu'on
          attend.
        */
        <button
          type="button"
          /* Pas d'infobulle « trier par… » à défaut de précision : elle traduirait en
             mots ce que le double chevron dit déjà, au prix d'une phrase de plus dans
             les treize tables de langue. `aria-sort` porte l'information là où elle
             manque vraiment — à l'oreille. */
          {...(hint ? { title: hint } : {})}
          onClick={() => onSort(sortKey, isActive && sort?.direction === 'desc' ? 'asc' : 'desc')}
          className={`${innerClass} rounded-sm outline-none transition-colors duration-150 hover:text-brand-strong focus-visible:ring-1 focus-visible:ring-ring ${
            isActive ? 'text-ink' : ''
          }`}
        >
          {inner}
        </button>
      ) : (
        <span {...(hint ? { title: hint } : {})} className={innerClass}>
          {inner}
        </span>
      )}
    </th>
  )
}

/**
 * LE DOUBLE CHEVRON DE TRI — deux états dans un seul signe.
 *
 * ── CE QU'IL REMPLACE ────────────────────────────────────────────────────────
 *
 * Une seule flèche, `▼` par défaut et `▲` quand le tri montait. Elle disait la
 * direction ACTIVE, mais rien de plus : une colonne non triée portait un `▼` estompé
 * qui se lisait « triée par ordre décroissant, faiblement ». Le doute était réel — sur
 * une rangée de dix colonnes, une seule est triée et neuf portaient le même signe.
 *
 * ── CE QUE LE DOUBLE CHEVRON DIT DE PLUS ────────────────────────────────────
 *
 * Il montre les DEUX directions, et n'en éclaire qu'une. Hors tri, les deux sont
 * estompés : le signe se lit « cette colonne peut être triée », ce qui est vrai et
 * n'était dit nulle part. Trié, la moitié active passe à l'encre pleine et l'autre
 * s'efface presque : la direction se lit sans la chercher.
 *
 * C'est la convention des tableaux de cotation — Tokenomist, CoinGecko et les autres
 * la posent tous ainsi. Le glyphe est dessiné plutôt qu'emprunté à `lucide` : les deux
 * moitiés doivent changer d'opacité INDÉPENDAMMENT, ce qu'une icône d'un seul tenant
 * ne permet pas.
 *
 * La place est réservée en permanence. L'apparition au survol serait invisible au
 * doigt, et l'apparition à l'activation ferait sauter la largeur de l'en-tête d'un
 * clic à l'autre — décalant toute la colonne.
 */
function SortGlyph({ sort }: { sort?: SortDirection | null }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 8 12"
      className="h-3 w-2 shrink-0"
      fill="currentColor"
    >
      <path d="M4 0.5 7.2 4.4H0.8Z" className={sort === 'asc' ? 'opacity-100' : 'opacity-25'} />
      <path d="M4 11.5 0.8 7.6h6.4Z" className={sort === 'desc' ? 'opacity-100' : 'opacity-25'} />
    </svg>
  )
}

/*
 * `MenuRow` VIVAIT ICI, et est parti avec le menu d'en-tête.
 *
 * Il habillait les trois entrées du panneau — les deux sens de tri, et « masquer
 * cette colonne ». Le tri se fait désormais au clic sur l'intitulé, le masquage dans
 * « Personnaliser » : aucune de ces entrées n'a plus de panneau où vivre.
 */

/* ── Sélecteur global ─────────────────────────────────────────────────────── */

/**
 * BOUTON « PERSONNALISER » — la vue d'ensemble que le menu d'en-tête ne donne pas.
 *
 * Masquer se fait colonne par colonne depuis l'en-tête ; RÉAFFICHER ne le peut pas,
 * puisque l'en-tête de la colonne masquée n'est plus là pour porter son menu. Sans
 * ce bouton, tout masquage serait définitif — un piège classique des tableaux
 * configurables, et la raison pour laquelle il compte plus que le menu d'en-tête.
 *
 * ── POURQUOI UNE MODALE À DEUX VOLETS, ET NON PLUS UN MENU DE CASES ─────────
 *
 * Le menu déroulant listait les colonnes à cocher, sans jamais montrer LE RÉSULTAT :
 * on lisait ce qui existe, pas ce que le tableau va afficher ni dans quel ordre. Sur
 * onze colonnes, la seule façon de savoir ce qu'on a retenu était de refermer le menu
 * et de regarder le tableau.
 *
 * Les deux volets répondent chacun à une question distincte — « qu'est-ce qui
 * existe ? » à gauche, « qu'ai-je retenu ? » à droite — et c'est la composition de
 * Token Terminal, reprise pour cette raison. Elle apporte en prime la RECHERCHE, qui
 * devient nécessaire dès qu'un tableau dépasse la dizaine de colonnes.
 *
 * ── BROUILLON, PUIS APPLICATION ────────────────────────────────────────────
 *
 * Le menu écrivait dans `localStorage` à chaque case cochée : le tableau se
 * recomposait sous le curseur pendant qu'on réfléchissait. La modale travaille sur une
 * COPIE et ne la publie qu'à « Appliquer » ; « Annuler » la jette. C'est ce qui rend
 * l'essai réversible.
 */
export function ColumnPicker({
  prefs,
  label,
  /** Sous-titre de la modale — le nom du tableau qu'on personnalise. */
  scopeLabel,
}: {
  prefs: ColumnPreferences
  /**
   * Libellé du bouton.
   *
   * Sans valeur par défaut ECRITE dans la signature : le defaut est desormais
   * « Personnaliser » TRADUIT, ce qui suppose le traducteur — et un parametre par
   * defaut ne peut pas appeler un crochet. Il est donc resolu dans le corps.
   */
  label?: string
  scopeLabel?: string
}) {
  const t = usePhrase()
  const shown = label ?? t('Personnaliser')
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        /* Fond plein et non contour, comme les deux groupes de la même rangée — voir
           `MarketBrowser`. L'état « des colonnes sont masquées » se disait par une
           bordure de marque ; il se dit maintenant par le TEXTE en teinte de marque,
           qui reste lisible sans réintroduire le seul trait de la barre. */
        className={`inline-flex items-center gap-1.5 rounded-control bg-surface-muted px-2.5 py-1 text-xs font-medium transition-colors duration-150 ${
          prefs.hiddenCount > 0 ? 'text-brand-strong' : 'text-ink-muted hover:text-ink'
        }`}
      >
        <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
        {shown}
        {/* Le décompte des colonnes masquées est AFFICHÉ : sans lui, un tableau
            amputé la semaine dernière se lit aujourd'hui comme un tableau incomplet,
            et l'on cherche la donnée manquante du côté de la source. */}
        {prefs.hiddenCount > 0 ? (
          <span className="tabular rounded-pill bg-brand px-1.5 text-micro text-on-brand">
            −{prefs.hiddenCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <ColumnDialog
          prefs={prefs}
          {...(scopeLabel ? { scopeLabel } : {})}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  )
}

/**
 * La modale elle-même, montée UNIQUEMENT quand elle est ouverte.
 *
 * Le brouillon vit dans son état : le démontage à la fermeture le jette, ce qui évite
 * d'avoir à le réinitialiser à la main à chaque ouverture — la faute classique de ce
 * genre de panneau, où l'on retrouve la sélection abandonnée la fois d'avant.
 */
function ColumnDialog({
  prefs,
  scopeLabel,
  onClose,
}: {
  prefs: ColumnPreferences
  scopeLabel?: string
  onClose: () => void
}) {
  const t = usePhrase()
  const [query, setQuery] = useState('')
  const [draft, setDraft] = useState<Set<string>>(
    () => new Set(prefs.columns.filter((column) => prefs.isVisible(column.id)).map((c) => c.id)),
  )

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    /* Le corps ne défile plus derrière la modale : sans cela, la molette traverse le
       voile et fait glisser la page qu'on est censé avoir mise de côté. */
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previous
    }
  }, [onClose])

  const needle = query.trim().toLowerCase()
  const listed = needle
    ? prefs.columns.filter((column) => column.label.toLowerCase().includes(needle))
    : prefs.columns

  /* L'ordre du volet droit est celui du TABLEAU, et non celui des clics : une liste
     qui se réordonne à chaque ajout ne dit plus où la colonne apparaîtra. */
  const selected = prefs.columns.filter((column) => draft.has(column.id))

  function toggle(id: string) {
    const column = prefs.columns.find((entry) => entry.id === id)
    if (column?.locked) return

    setDraft((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function apply() {
    for (const column of prefs.columns) {
      const wanted = draft.has(column.id)
      if (wanted !== prefs.isVisible(column.id)) prefs.toggle(column.id)
    }
    onClose()
  }


  return (
    /*
      ── LA COQUE EST UN `Dialog`, ET LE VOILE CESSE D'ÊTRE UN BOUTON ──────────

      Le voile était un `<button aria-label="Fermer">` couvrant tout l'écran : annoncé
      comme une cible par la synthèse vocale, et atteignable à la tabulation avant le
      contenu de la fenêtre. Radix écoute le pointeur sans créer d'élément interactif,
      et ajoute ce que ce montage n'avait pas — le piège à focus, l'`aria-hidden` sur
      le reste du document, le blocage du défilement du fond, et la croix de fermeture
      dans le coin.

      `p-0` et `gap-0` : les trois bandes de la fenêtre (en-tête, corps, pied) portent
      leurs propres marges et leurs filets doivent courir d'un bord à l'autre.
    */
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="flex max-h-[80vh] max-w-3xl flex-col gap-0 overflow-hidden border-border-subtle bg-surface p-0 sm:max-w-3xl">
        <DialogHeader className="space-y-0 border-b border-border-subtle px-5 py-4 pr-12 text-left">
          <DialogTitle className="text-base font-semibold text-ink">
            {t('Personnaliser les colonnes')}
          </DialogTitle>
          {scopeLabel ? (
            <DialogDescription className="text-xs text-ink-muted">{scopeLabel}</DialogDescription>
          ) : null}
        </DialogHeader>

        <div className="grid min-h-0 flex-1 gap-5 p-5 sm:grid-cols-2">
          {/* ── VOLET GAUCHE : tout ce qui existe ─────────────────────────── */}
          <section className="flex min-h-0 flex-col gap-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
              {t('Toutes les colonnes')}
            </h3>

            <InputGroup size="sm">
              <InputGroupInput
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t('Rechercher une colonne')}
                aria-label={t('Rechercher une colonne')}
              />
              <InputGroupAddon>
                <Search />
              </InputGroupAddon>
            </InputGroup>

            <ScrollArea className="min-h-0 flex-1 rounded-control border border-border-subtle">
              <ul>
              {listed.length === 0 ? (
                <li className="px-3 py-3 text-xs text-ink-muted">{t('Aucune colonne')}</li>
              ) : (
                listed.map((column) => {
                  const added = draft.has(column.id)

                  return (
                    /*
                      ── LA LIGNE DEVIENT UNE CASE À COCHER, ET C'EN ÉTAIT UNE ────

                      C'était un `<button>` qui basculait un état et affichait
                      « Ajoutée ✓ » quand il était actif. Fonctionnellement : une case
                      à cocher. Sémantiquement : un bouton, c'est-à-dire quelque chose
                      qu'une synthèse vocale annonce SANS son état — « Ajoutée » se
                      lisait comme faisant partie du libellé, et rien ne disait qu'un
                      second appui la retirerait.

                      `Checkbox` porte `role="checkbox"` et `aria-checked`, donc
                      « coché » / « non coché » à l'oreille, et la barre d'espace pour
                      basculer. Une colonne verrouillée devient `disabled` avec sa
                      mention à côté : elle reste lisible, elle n'est plus cliquable.

                      ⚠️ `htmlFor`/`id` plutôt qu'un `<label>` enveloppant : Radix rend
                      un `<button>` doublé d'un `<input>` masqué, et une étiquette
                      posée autour des deux capterait le clic deux fois — la case
                      basculerait puis se rebasculerait, donc ne changerait jamais.
                    */
                    <li
                      key={column.id}
                      className="flex items-center gap-2.5 border-b border-border-subtle px-3 py-2 text-xs last:border-b-0 has-[button:not(:disabled)]:hover:bg-surface-muted"
                    >
                      <Checkbox
                        id={`col-${column.id}`}
                        checked={added}
                        disabled={column.locked}
                        onCheckedChange={() => toggle(column.id)}
                        className="size-3.5 shrink-0"
                      />
                      <label
                        htmlFor={`col-${column.id}`}
                        className={`min-w-0 flex-1 truncate ${
                          column.locked ? 'text-ink-muted' : 'cursor-pointer text-ink'
                        }`}
                      >
                        {column.label}
                      </label>
                      {column.locked ? (
                        <span className="shrink-0 text-micro text-ink-muted">
                          {t('toujours')}
                        </span>
                      ) : null}
                    </li>
                  )
                })
              )}
              </ul>
            </ScrollArea>
          </section>

          {/* ── VOLET DROIT : ce que le tableau affichera ─────────────────── */}
          <section className="flex min-h-0 flex-col gap-3">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                {t('Colonnes affichées')} ({selected.length})
              </h3>
              <button
                type="button"
                onClick={() =>
                  setDraft(
                    new Set(prefs.columns.filter((column) => column.locked).map((c) => c.id)),
                  )
                }
                className="text-xs text-ink-muted transition-colors hover:text-brand"
              >
                {t('Tout retirer')}
              </button>
            </div>

            <ScrollArea className="min-h-0 flex-1 rounded-control border border-border-subtle">
              <ul>
              {selected.map((column) => (
                <li
                  key={column.id}
                  className="flex items-center justify-between gap-3 border-b border-border-subtle px-3 py-2 text-xs text-ink last:border-b-0"
                >
                  <span className="truncate">{column.label}</span>
                  {column.locked ? (
                    <span className="shrink-0 text-micro text-ink-muted">{t('toujours')}</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => toggle(column.id)}
                      aria-label={`${t('Retirer')} ${column.label}`}
                      className="shrink-0 rounded-control p-0.5 text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
                    >
                      <X className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  )}
                </li>
              ))}
              </ul>
            </ScrollArea>
          </section>
        </div>


        {/* `DialogFooter` aligne la paire à droite sur écran large et l'empile sur
            téléphone, ce que le `flex justify-end` d'avant ne faisait pas — à 360
            pixels, « Annuler » et « Appliquer » se serraient sur une ligne trop
            étroite. La hiérarchie reste celle d'un dialogue : `ghost` pour
            l'annulation, qui ne doit pas peser autant que l'action, `default` pour la
            validation. */}
        <DialogFooter className="flex-row items-center justify-end gap-2 border-t border-border-subtle px-5 py-3">
          <Button variant="ghost" size="sm" onClick={onClose}>
            {t('Annuler')}
          </Button>
          <Button variant="default" size="sm" onClick={apply}>
            {t('Appliquer')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
