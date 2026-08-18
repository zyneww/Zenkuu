'use client'

import { ArrowDown, ArrowUp, Columns3, EyeOff, RotateCcw } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
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
 * EN-TÊTE DE COLONNE À MENU.
 *
 * ── UN MENU PLUTÔT QU'UN CLIC QUI TRIE ───────────────────────────────────────
 *
 * Le clic direct restait plus rapide pour trier, et il ne laissait de place à rien
 * d'autre : masquer une colonne n'avait aucun geste, et l'inversion de sens exigeait
 * de deviner qu'un second clic la produisait.
 *
 * Le menu rend ces trois actions VISIBLES et nomme le sens du tri au lieu de le
 * sous-entendre — « du plus grand au plus petit » se lit, « ▼ » se devine. Le coût
 * est un clic de plus pour trier ; il est repris par la flèche de l'en-tête, qui
 * reste cliquable pour inverser directement le tri en place.
 */
export function ColumnHeader({
  label,
  columnId,
  sortKey,
  sort,
  onSort,
  columnPrefs,
  align = 'right',
  className = '',
  hint,
}: {
  label: string
  /** Identifiant de la colonne dans les préférences d'affichage. */
  columnId: string
  /** Clé de tri. Absente, la colonne n'est pas triable et le menu ne l'offre pas. */
  sortKey?: string
  sort?: { key: string; direction: SortDirection } | null
  onSort?: (key: string, direction: SortDirection) => void
  columnPrefs?: ColumnPreferences
  align?: 'left' | 'right'
  className?: string
  /** Précision affichée en bas du menu — d'où vient le chiffre, ce qu'il couvre. */
  hint?: string
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const isActive = sortKey !== undefined && sort?.key === sortKey
  const canHide = columnPrefs !== undefined && !columnPrefs.columns.find((c) => c.id === columnId)?.locked

  return (
    <th
      scope="col"
      className={`px-3 py-2.5 text-xs font-medium text-ink-muted ${align === 'right' ? 'text-right' : 'text-left'} ${className}`}
      aria-sort={
        isActive ? (sort?.direction === 'desc' ? 'descending' : 'ascending') : 'none'
      }
    >
      <div
        ref={rootRef}
        className={`relative inline-flex ${align === 'right' ? 'justify-end' : 'justify-start'}`}
      >
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-haspopup="menu"
          title={`Options de la colonne ${label.toLowerCase()}`}
          className={`inline-flex items-center gap-1 rounded-sm transition-colors duration-150 hover:text-brand-strong ${
            isActive ? 'text-ink' : ''
          } ${align === 'right' ? 'flex-row-reverse' : ''}`}
        >
          {label}
          {/*
            La flèche est TOUJOURS présente, seulement estompée hors tri actif.

            L'apparition au survol serait invisible au doigt, et l'apparition à
            l'activation ferait sauter la largeur de l'en-tête d'un clic à l'autre —
            décalant toute la colonne. Réservée en permanence, elle ne coûte que son
            opacité.
          */}
          {sortKey !== undefined ? (
            <span
              aria-hidden="true"
              className={`text-[0.65em] leading-none transition-opacity duration-150 ${
                isActive ? 'opacity-100' : 'opacity-30'
              }`}
            >
              {isActive && sort?.direction === 'asc' ? '▲' : '▼'}
            </span>
          ) : null}
        </button>

        {open ? (
          <div
            role="menu"
            /* `whitespace-normal` : le `<th>` du tableau impose souvent `nowrap`, et un
               menu qui en hérite s'étire sur toute la largeur de la page. */
            className={`absolute top-full z-30 mt-1 w-56 whitespace-normal rounded-card border border-border-subtle bg-surface py-1 text-left shadow-lg ${
              align === 'right' ? 'right-0' : 'left-0'
            }`}
          >
            {sortKey !== undefined && onSort ? (
              <>
                <MenuRow
                  icon={<ArrowDown className="h-3.5 w-3.5" />}
                  active={isActive && sort?.direction === 'desc'}
                  onClick={() => {
                    onSort(sortKey, 'desc')
                    setOpen(false)
                  }}
                >
                  Du plus grand au plus petit
                </MenuRow>
                <MenuRow
                  icon={<ArrowUp className="h-3.5 w-3.5" />}
                  active={isActive && sort?.direction === 'asc'}
                  onClick={() => {
                    onSort(sortKey, 'asc')
                    setOpen(false)
                  }}
                >
                  Du plus petit au plus grand
                </MenuRow>
              </>
            ) : null}

            {canHide ? (
              <MenuRow
                icon={<EyeOff className="h-3.5 w-3.5" />}
                onClick={() => {
                  columnPrefs?.toggle(columnId)
                  setOpen(false)
                }}
                separated={sortKey !== undefined}
              >
                Masquer cette colonne
              </MenuRow>
            ) : null}

            {hint ? (
              <p className="border-t border-border-subtle px-3 pb-1 pt-1.5 text-[0.625rem] leading-snug text-ink-muted">
                {hint}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </th>
  )
}

function MenuRow({
  icon,
  onClick,
  active,
  separated,
  children,
}: {
  icon: React.ReactNode
  onClick: () => void
  active?: boolean
  separated?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-xs font-normal transition-colors duration-100 hover:bg-surface-muted ${
        active ? 'text-brand' : 'text-ink'
      } ${separated ? 'mt-1 border-t border-border-subtle pt-2' : ''}`}
    >
      <span className="shrink-0 text-ink-muted" aria-hidden="true">
        {icon}
      </span>
      {children}
    </button>
  )
}

/* ── Sélecteur global ─────────────────────────────────────────────────────── */

/**
 * BOUTON « COLONNES » — la vue d'ensemble que le menu d'en-tête ne donne pas.
 *
 * Masquer se fait colonne par colonne depuis l'en-tête ; RÉAFFICHER ne le peut pas,
 * puisque l'en-tête de la colonne masquée n'est plus là pour porter son menu. Sans
 * ce bouton, tout masquage serait définitif — un piège classique des tableaux
 * configurables, et la raison pour laquelle il compte plus que le menu d'en-tête.
 */
export function ColumnPicker({
  prefs,
  label,
}: {
  prefs: ColumnPreferences
  /**
   * Libellé du bouton.
   *
   * Sans valeur par défaut ECRITE dans la signature : le defaut est desormais
   * « Colonnes » TRADUIT, ce qui suppose le traducteur — et un parametre par defaut
   * ne peut pas appeler un crochet. Il est donc resolu dans le corps.
   */
  label?: string
}) {
  const t = usePhrase()
  const shown = label ?? t('Colonnes')
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        className={`inline-flex items-center gap-1.5 rounded-control border px-2.5 py-1 text-xs font-medium transition-colors duration-150 ${
          prefs.hiddenCount > 0
            ? 'border-brand text-ink'
            : 'border-border-subtle text-ink-muted hover:border-brand hover:text-ink'
        }`}
      >
        <Columns3 className="h-3.5 w-3.5" aria-hidden="true" />
        {shown}
        {/* Le décompte des colonnes masquées est AFFICHÉ : sans lui, un tableau
            amputé la semaine dernière se lit aujourd'hui comme un tableau incomplet,
            et l'on cherche la donnée manquante du côté de la source. */}
        {prefs.hiddenCount > 0 ? (
          <span className="tabular rounded-pill bg-brand px-1.5 text-[0.625rem] text-on-brand">
            −{prefs.hiddenCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-1 w-56 rounded-card border border-border-subtle bg-surface py-1 shadow-lg"
        >
          <p className="px-3 pb-1 pt-1.5 text-[0.625rem] font-semibold uppercase tracking-wide text-ink-muted">
            Colonnes affichées
          </p>

          {prefs.columns.map((column) => {
            const checked = prefs.isVisible(column.id)

            return (
              <label
                key={column.id}
                className={`flex items-center gap-2.5 px-3 py-1.5 text-xs transition-colors duration-100 ${
                  column.locked
                    ? 'cursor-not-allowed text-ink-muted'
                    : 'cursor-pointer text-ink hover:bg-surface-muted'
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={column.locked}
                  onChange={() => prefs.toggle(column.id)}
                  className="h-3.5 w-3.5 shrink-0 accent-[var(--color-brand)]"
                />
                <span className="truncate">{column.label}</span>
                {column.locked ? (
                  <span className="ml-auto shrink-0 text-[0.625rem]">toujours</span>
                ) : null}
              </label>
            )
          })}

          {prefs.hiddenCount > 0 ? (
            <button
              type="button"
              onClick={() => prefs.reset()}
              className="mt-1 flex w-full items-center gap-2.5 border-t border-border-subtle px-3 pb-1 pt-2 text-left text-xs text-ink transition-colors duration-100 hover:bg-surface-muted"
            >
              <RotateCcw className="h-3.5 w-3.5 shrink-0 text-ink-muted" aria-hidden="true" />
              Tout réafficher
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
