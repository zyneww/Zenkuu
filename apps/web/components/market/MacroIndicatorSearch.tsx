'use client'

import { Check, Search, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

import { MACRO_INDICATORS, MACRO_THEMES } from '@zenkuu/data'

import { useRouter } from '@/i18n/navigation'
import { usePhrase } from '@/components/locale/ContentProvider'

/**
 * RECHERCHE D'INDICATEUR MACROÉCONOMIQUE.
 *
 * ── POURQUOI UN CHAMP, ALORS QU'UNE RANGÉE DE BOUTONS SUFFISAIT ──────────────
 *
 * Elle suffisait à cinq. Le catalogue en compte quarante-cinq, et une rangée de
 * quarante-cinq boutons n'est plus un choix offert : c'est un mur qu'on parcourt à
 * l'horizontale en espérant reconnaître un mot. Le champ inverse le rapport — on
 * énonce ce qu'on cherche, la liste se réduit.
 *
 * La rangée ne disparaît pas pour autant (voir la page) : les cinq indicateurs
 * canoniques y restent en accès direct. Un champ de recherche est excellent quand on
 * sait ce qu'on veut, et mauvais quand on ne le sait pas encore — les deux gestes
 * cohabitent donc, chacun sur ce qu'il fait le mieux.
 *
 * ── LA LISTE S'OUVRE PLEINE, PAS VIDE ────────────────────────────────────────
 *
 * Au clic et avant toute frappe, le panneau montre les sept thèmes et leur contenu.
 * C'est délibéré : un champ qui n'affiche rien tant qu'on n'a pas tapé exige de
 * DEVINER le vocabulaire du catalogue. En ouvrant sur la liste complète groupée, il
 * répond d'abord à « qu'est-ce que vous avez ? ».
 *
 * ── LA COMPARAISON EST INSENSIBLE AUX ACCENTS ────────────────────────────────
 *
 * « chomage » doit trouver « Chômage », et « energie » trouver « Énergie ». Sur un
 * catalogue français consulté au clavier, l'accent est la première cause d'échec
 * d'une recherche — et personne ne se dit qu'il a mal orthographié : il se dit que
 * la donnée n'existe pas.
 */

/** Minuscules sans accents ni signes diacritiques — voir l'en-tête. */
function fold(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}

interface Entry {
  id: string
  label: string
  unit: string
  themeId: string
  themeLabel: string
  /** Champ de comparaison précalculé : libellé, unité, thème et synonymes réunis. */
  haystack: string
}

const THEME_LABEL = new Map<string, string>(
  MACRO_THEMES.map((theme) => [theme.id, theme.label]),
)

const ENTRIES: Entry[] = MACRO_INDICATORS.map((indicator) => {
  const themeLabel = THEME_LABEL.get(indicator.theme) ?? ''

  return {
    id: indicator.id,
    label: indicator.label,
    unit: indicator.unit,
    themeId: indicator.theme,
    themeLabel,
    haystack: fold(
      [indicator.label, indicator.unit, themeLabel, ...indicator.keywords].join(' '),
    ),
  }
})

export function MacroIndicatorSearch({ current }: { current: string }) {
  const t = usePhrase()
  const router = useRouter()

  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [cursor, setCursor] = useState(0)

  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const matches = useMemo(() => {
    const needle = fold(query.trim())
    if (!needle) return ENTRIES

    /*
     * TOUS LES MOTS DOIVENT ÊTRE PRÉSENTS, dans n'importe quel ordre. « pib
     * habitant » et « habitant pib » trouvent la même chose, ce qui compte
     * davantage qu'un classement fin sur un catalogue de cette taille : on ne
     * cherche pas ici parmi des milliers d'entrées, on ramène quarante-cinq à trois.
     */
    const words = needle.split(/\s+/)
    return ENTRIES.filter((entry) => words.every((word) => entry.haystack.includes(word)))
  }, [query])

  /* Regroupement par thème, dans l'ordre déclaré du catalogue — un tri alphabétique
     mêlerait « Prix » et « Population », qui n'ont rien à voir. */
  const groups = useMemo(() => {
    return MACRO_THEMES.map((theme) => ({
      id: theme.id,
      label: theme.label,
      entries: matches.filter((entry) => entry.themeId === theme.id),
    })).filter((group) => group.entries.length > 0)
  }, [matches])

  /* L'ordre visuel APLATI, seule liste sur laquelle les flèches peuvent se déplacer.
     Naviguer sur `matches` donnerait un curseur qui saute d'un groupe à l'autre sans
     suivre ce que l'œil lit. */
  const flat = useMemo(() => groups.flatMap((group) => group.entries), [groups])

  /*
   * LE CURSEUR REVIENT EN TÊTE À CHAQUE FRAPPE, par ajustement d'état PENDANT le
   * rendu et non depuis un effet.
   *
   * Un `useEffect` marcherait, au prix d'un rendu peint avec l'ancien curseur puis
   * immédiatement remplacé — la surbrillance sauterait d'une entrée à l'autre sous
   * l'œil. React relance ici le rendu AVANT de peindre, donc rien n'est visible entre
   * les deux. C'est le motif que la documentation appelle « ajuster l'état quand une
   * prop change ».
   */
  const [lastQuery, setLastQuery] = useState(query)
  if (lastQuery !== query) {
    setLastQuery(query)
    setCursor(0)
  }

  /* Fermeture au clic extérieur. `pointerdown` et non `click` : un clic dont le
     bouton s'enfonce dans le panneau et se relâche dehors ne doit pas fermer. */
  useEffect(() => {
    if (!open) return

    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }

    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  /* L'entrée sous le curseur reste visible quand on descend au clavier. */
  useEffect(() => {
    if (!open) return
    listRef.current
      ?.querySelector<HTMLElement>('[data-active="true"]')
      ?.scrollIntoView({ block: 'nearest' })
  }, [cursor, open])

  function choose(id: string) {
    setOpen(false)
    setQuery('')
    inputRef.current?.blur()
    router.push(`/macro?indicateur=${id}`)
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'Escape') {
      setOpen(false)
      setQuery('')
      return
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (!open) {
        setOpen(true)
        return
      }
      const step = event.key === 'ArrowDown' ? 1 : -1
      /* Le modulo enroule la liste : depuis la dernière entrée, « bas » revient à la
         première. Sur une liste courte c'est plus rapide que de remonter. */
      setCursor((index) => (index + step + flat.length) % Math.max(1, flat.length))
      return
    }

    if (event.key === 'Enter') {
      const target = flat[cursor]
      if (target) {
        event.preventDefault()
        choose(target.id)
      }
    }
  }

  const currentLabel = ENTRIES.find((entry) => entry.id === current)?.label ?? 'Indicateur'

  return (
    <div ref={rootRef} className="relative w-full sm:w-72">
      <div
        className={`flex items-center gap-2 rounded-control border bg-surface px-3 py-1.5 transition-colors duration-150 ${
          open ? 'border-brand' : 'border-border-subtle'
        }`}
      >
        <Search className="h-3.5 w-3.5 shrink-0 text-ink-muted" aria-hidden="true" />
        <input
          ref={inputRef}
          type="search"
          role="combobox"
          aria-expanded={open}
          aria-controls="macro-indicateurs"
          aria-autocomplete="list"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={`Rechercher parmi ${ENTRIES.length} indicateurs`}
          aria-label={t('Rechercher un indicateur macroéconomique')}
          /* `appearance-none` retire la croix native de `type="search"`, qui vide le
             champ sans prévenir le composant sur certains moteurs. */
          className="w-full appearance-none bg-transparent text-xs text-ink outline-none placeholder:text-ink-muted [&::-webkit-search-cancel-button]:hidden"
        />
        {query ? (
          <button
            type="button"
            onClick={() => {
              setQuery('')
              inputRef.current?.focus()
            }}
            aria-label={t('Effacer la recherche')}
            className="shrink-0 text-ink-muted transition-colors hover:text-ink"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        ) : null}
      </div>

      {open ? (
        <div
          ref={listRef}
          id="macro-indicateurs"
          role="listbox"
          aria-label={t('Indicateurs macroéconomiques')}
          /*
            `z-30` et non davantage : la carte et sa légende sont en dessous, mais
            l'en-tête collant du site est au-dessus — un panneau qui le recouvrirait
            masquerait la recherche globale et le compte.
          */
          className="absolute right-0 z-30 mt-1.5 max-h-[26rem] w-full min-w-[18rem] overflow-y-auto rounded-card border border-border-subtle bg-surface p-1 shadow-lg sm:w-80"
        >
          {groups.length === 0 ? (
            <p className="px-3 py-6 text-center text-xs text-ink-muted">
              Aucun indicateur ne correspond à « {query} ».
            </p>
          ) : (
            groups.map((group) => (
              <div key={group.id} className="pb-1">
                <p className="px-3 pb-1 pt-2 text-[0.625rem] font-semibold uppercase tracking-wide text-ink-muted">
                  {group.label}
                </p>

                {group.entries.map((entry) => {
                  const index = flat.indexOf(entry)
                  const active = index === cursor
                  const selected = entry.id === current

                  return (
                    <button
                      key={entry.id}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      data-active={active}
                      /* `onMouseMove` plutôt que `onMouseEnter` : après une navigation
                         au clavier, le pointeur immobile survole déjà une entrée et
                         `enter` ne se redéclenche pas — le curseur resterait alors
                         collé sous la souris. */
                      onMouseMove={() => setCursor(index)}
                      onClick={() => choose(entry.id)}
                      className={`flex w-full items-center justify-between gap-3 rounded-sm px-3 py-1.5 text-left transition-colors duration-100 ${
                        active ? 'bg-surface-muted' : ''
                      }`}
                    >
                      <span
                        className={`truncate text-xs ${selected ? 'font-semibold text-ink' : 'text-ink'}`}
                      >
                        {entry.label}
                      </span>

                      <span className="flex shrink-0 items-center gap-1.5">
                        {entry.unit ? (
                          <span className="tabular text-[0.625rem] text-ink-muted">
                            {entry.unit}
                          </span>
                        ) : null}
                        {selected ? (
                          <Check className="h-3 w-3 text-brand" aria-hidden="true" />
                        ) : null}
                      </span>
                    </button>
                  )
                })}
              </div>
            ))
          )}
        </div>
      ) : null}

      {/* Le libellé courant est annoncé aux lecteurs d'écran sans occuper de place :
          le champ affiche un appel à la recherche, pas la sélection. */}
      <span className="sr-only" aria-live="polite">
        Indicateur affiché : {currentLabel}
      </span>
    </div>
  )
}
