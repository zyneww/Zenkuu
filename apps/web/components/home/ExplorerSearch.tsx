'use client'

import { Search, TrendingUp, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { Link } from '@/i18n/navigation'
import { usePhrase } from '@/components/locale/ContentProvider'
import { usePresence } from '@/components/nav/usePresence'
import { SearchResults } from '@/components/search/SearchResults'
import { useAssetSearch } from '@/components/search/useAssetSearch'

/**
 * Une suggestion du bandeau « recherches populaires ».
 *
 * Elle porte une DESTINATION et non une requête : cliquer « Bitcoin · capitalisation »
 * doit ouvrir la fiche, pas pré-remplir le champ avec un texte que l'utilisateur
 * devrait ensuite valider. La référence fait de même — ses pastilles sont des liens.
 */
export interface PopularSearch {
  href: string
  label: string
  image?: string
}

/**
 * LA RECHERCHE EN PREMIER, ET SEULE, EN HAUT DE L'ACCUEIL.
 *
 * ── CE QUI CHANGE PAR RAPPORT À L'ANCIENNE PAGE ──────────────────────────────
 *
 * Le haut de l'accueil portait un ruban défilant, un chapeau et une bande de chiffres
 * globaux — trois blocs qui répondent à « de quoi ce site parle-t-il ». La question
 * est légitime la première fois et jamais ensuite : un visiteur qui revient arrive
 * avec un NOM en tête, et devait traverser six cents pixels de décor avant de trouver
 * où le taper.
 *
 * L'explorateur inverse la priorité. Le champ occupe toute la largeur, au-dessus de
 * tout, et c'est le premier élément que le regard rencontre. Les chiffres globaux ne
 * disparaissent pas : ils descendent dans les cartes de classement, où ils sont lus
 * en même temps que ce qui les compose.
 *
 * ── POURQUOI CE N'EST PAS `HeaderSearch` AVEC UNE AUTRE CLASSE ───────────────
 *
 * Les deux partagent tout ce qui compte — `useAssetSearch` pour l'état, `SearchResults`
 * pour le corps —, donc rien n'est recopié. Ce qui diffère est structurel et ne se
 * règle pas par une largeur : le champ de l'en-tête est un élément de barre, il se
 * réduit à une icône sous `md` et ancre son tiroir au bord droit ; celui-ci est un
 * bloc de page, il existe à toutes les largeurs et son tiroir occupe sa propre
 * largeur. Un composant qui ferait les deux porterait quatre conditionnelles pour
 * n'être jamais lu qu'à moitié.
 */
export function ExplorerSearch({ popular }: { popular: PopularSearch[] }) {
  const t = usePhrase()

  const [focused, setFocused] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const search = useAssetSearch({ active: focused })
  const { state, mounted, onTransitionEnd } = usePresence(focused)

  const close = useCallback(() => {
    setFocused(false)
    search.reset()
  }, [search])

  /* Fermeture au clic EXTÉRIEUR et non au `blur` du champ : cliquer un résultat retire
     d'abord le focus, ce qui démonterait le tiroir avant que le clic n'atteigne le
     lien. Même raisonnement que dans `HeaderSearch`, même remède. */
  useEffect(() => {
    if (!focused) return

    function onPointerDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) close()
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [focused, close])

  /*
   * `Ctrl/⌘ + K` DONNE LE FOCUS ICI QUAND CE CHAMP EST À L'ÉCRAN.
   *
   * Le raccourci est déjà câblé dans `HeaderSearch`, qui vit dans la barre et est donc
   * monté sur toutes les pages, celle-ci comprise. Deux écouteurs pour un raccourci ne
   * se disputent pas le résultat — chacun agit sur SON champ —, mais le lecteur, lui,
   * verrait le focus partir vers la barre alors qu'un champ dix fois plus large est
   * sous ses yeux.
   *
   * La capture (`true` en troisième argument) tranche : cet écouteur voit l'événement
   * AVANT celui du document posé par la barre, et `stopPropagation` l'empêche de
   * l'atteindre. La barre garde le raccourci partout ailleurs.
   */
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const isShortcut = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k'
      if (!isShortcut) return
      if (!inputRef.current || inputRef.current.offsetParent === null) return

      event.preventDefault()
      event.stopPropagation()
      inputRef.current.focus()
      inputRef.current.select()
    }

    document.addEventListener('keydown', onKeyDown, true)
    return () => document.removeEventListener('keydown', onKeyDown, true)
  }, [])

  /** Navigation au clavier dans le tiroir — les résultats sont des liens ordinaires. */
  function onFieldKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'Escape') {
      close()
      inputRef.current?.blur()
      return
    }

    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return

    const links = panelRef.current?.querySelectorAll<HTMLAnchorElement>('a[href]')
    if (!links || links.length === 0) return

    event.preventDefault()
    const index = [...links].indexOf(document.activeElement as HTMLAnchorElement)
    const next =
      event.key === 'ArrowDown'
        ? (index + 1) % links.length
        : (index <= 0 ? links.length : index) - 1

    links[next]?.focus()
  }

  return (
    <div ref={rootRef} className="relative">
      {/* ── LE CHAMP ────────────────────────────────────────────────────────
          `h-14` : la hauteur de deux lignes de texte. Un champ de 36 pixels au milieu
          d'une page vide se lit comme un contrôle de formulaire ; celui-ci doit se
          lire comme LA porte d'entrée, et sa hauteur est ce qui le dit. */}
      <div
        className={`flex h-14 items-center gap-3 rounded-panel border bg-panel px-4 transition-colors duration-150 ${
          focused ? 'border-brand' : 'border-border-subtle hover:border-brand/50'
        }`}
      >
        <Search className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden="true" />

        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={focused}
          aria-controls="explorer-search-panel"
          aria-autocomplete="list"
          aria-label={t('Rechercher un actif, un secteur, une mesure')}
          value={search.query}
          onChange={(event) => search.setQuery(event.target.value)}
          onFocus={() => setFocused(true)}
          onKeyDown={onFieldKeyDown}
          placeholder={t('Rechercher un actif, un secteur, une mesure…')}
          className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-muted"
          autoComplete="off"
          spellCheck={false}
        />

        {search.query ? (
          <button
            type="button"
            onClick={() => {
              search.reset()
              inputRef.current?.focus()
            }}
            aria-label={t('Effacer la recherche')}
            className="shrink-0 rounded-control p-1 text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        ) : (
          <kbd
            className="hidden shrink-0 rounded-xs border border-border-subtle px-1.5 py-0.5 font-sans text-micro text-ink-muted sm:block"
            aria-hidden="true"
          >
            Ctrl + K
          </kbd>
        )}
      </div>

      {/* ── TIROIR DE RÉSULTATS ─────────────────────────────────────────────
          Sur toute la largeur du champ, contrairement à celui de la barre : ici le
          champ EST la largeur de la page, et un tiroir de 26rem sous un champ de 900
          pixels se lirait comme un menu détaché. */}
      {mounted ? (
        <div
          id="explorer-search-panel"
          ref={panelRef}
          data-state={state}
          onTransitionEnd={onTransitionEnd}
          onKeyDown={onFieldKeyDown}
          className="menu-panel absolute inset-x-0 top-full z-50 pt-2"
        >
          <div className="max-h-[70vh] overflow-y-auto overscroll-contain rounded-card border border-border-subtle bg-overlay p-1.5 shadow-overlay">
            <SearchResults search={search} onNavigate={close} />
          </div>
        </div>
      ) : null}

      {/* ── RECHERCHES POPULAIRES ───────────────────────────────────────────
          Des LIENS et non des requêtes préremplies : voir `PopularSearch`. Le
          défilement horizontal sous `md` évite que six pastilles n'empilent trois
          rangs sur un téléphone. */}
      {popular.length > 0 ? (
        <div className="-mx-4 mt-3 flex items-center gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:overflow-x-visible md:px-0">
          <span className="flex shrink-0 items-center gap-1.5 pr-1 text-xs text-ink-muted">
            <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
            {t('Recherches populaires')}
          </span>

          <span className="h-4 w-px shrink-0 bg-border-subtle" aria-hidden="true" />

          {popular.map((entry) => (
            <Link
              key={entry.href}
              href={entry.href}
              className="flex shrink-0 items-center gap-2 rounded-pill border border-border-subtle bg-panel px-3 py-1.5 text-xs text-ink transition-colors duration-150 hover:border-brand/60 hover:bg-surface-muted"
            >
              {entry.image ? (
                /* eslint-disable-next-line @next/next/no-img-element -- logo distant, déjà dimensionné */
                <img
                  src={entry.image}
                  alt=""
                  aria-hidden="true"
                  loading="lazy"
                  className="h-4 w-4 rounded-pill"
                />
              ) : null}
              {entry.label}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  )
}
