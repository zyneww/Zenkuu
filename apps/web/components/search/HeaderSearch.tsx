'use client'

import { Search, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'

import { useContent } from '@/components/locale/ContentProvider'
import { usePresence } from '@/components/nav/usePresence'
import { SearchResults } from '@/components/search/SearchResults'
import { useAssetSearch } from '@/components/search/useAssetSearch'

/**
 * Recherche de l'en-tête — un VRAI champ, et un tiroir de résultats sous lui.
 *
 * ── CE QUI REMPLACE QUOI ──────────────────────────────────────────────────────
 *
 * Il remplace `SearchTrigger`, un bouton déguisé en champ : on cliquait, une fenêtre
 * s'ouvrait au centre de l'écran, et c'est là qu'on tapait. Le compromis se défendait
 * tant que la logique de recherche vivait dans cette fenêtre et nulle part ailleurs.
 * Extraite dans `useAssetSearch`, elle s'installe ici sans être recopiée — et la
 * raison de garder un faux champ disparaît avec elle.
 *
 * ── LE CHAMP N'EXISTE PAS PARTOUT, ET C'EST VOULU ─────────────────────────────
 *
 * Sous `md`, la barre n'a pas 224 pixels à donner : le champ céderait la place au
 * logo ou aux menus. Une icône seule y ouvre la FENÊTRE modale, qui est le bon
 * réceptacle sur un écran étroit — elle occupe toute la hauteur et laisse le clavier
 * virtuel monter sans rien recouvrir. Les deux surfaces partagent le même crochet et
 * le même corps de résultats : il n'y a qu'une recherche, sous deux formes.
 *
 * ── LES RACCOURCIS ONT DÉMÉNAGÉ ICI ───────────────────────────────────────────
 *
 * `Ctrl/⌘ + K` et `/` étaient câblés dans `NavBar`, qui ne pouvait qu'ouvrir la
 * fenêtre. Ils vivent désormais dans le composant qui porte le champ, parce que la
 * bonne réaction dépend de ce qui est à l'écran : donner le focus au champ s'il est
 * visible, ouvrir la fenêtre sinon. La barre n'a pas à connaître cette règle.
 */
export function HeaderSearch({ onOpenOverlay }: { onOpenOverlay: () => void }) {
  const t = useTranslations('search')
  const fr = useContent()

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

  /*
   * FERMETURE AU CLIC EXTÉRIEUR — et non au `blur` du champ.
   *
   * Le réflexe serait d'écouter `onBlur` sur l'`<input>`. Il est faux ici : cliquer
   * un résultat du tiroir retire d'abord le focus au champ, ce qui démonterait le
   * tiroir AVANT que le clic n'atteigne le lien. On ne navigue nulle part, et le
   * défaut ne se manifeste qu'à la souris — au clavier, `Entrée` suit le lien sans
   * jamais passer par là.
   *
   * `mousedown` sur le document, borné à l'extérieur de la racine, ferme quand il
   * faut et seulement quand il faut.
   */
  useEffect(() => {
    if (!focused) return

    function onPointerDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) close()
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [focused, close])

  /*
   * RACCOURCIS GLOBAUX.
   *
   * `offsetParent === null` est le test de visibilité qui tranche : il vaut `null`
   * pour un élément que `display: none` a retiré du flux, ce qui est exactement l'état
   * du champ sous `md`. Interroger `matchMedia` reviendrait à réécrire ici le point de
   * rupture déclaré dans la classe — deux sources de vérité pour une seule règle, et
   * l'assurance qu'elles divergeront le jour où l'une bougera.
   */
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const isShortcut = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k'

      /*
       * « / » seul — le second raccourci, annoncé nulle part mais attendu partout.
       *
       * Il n'ouvre RIEN si le curseur est déjà dans une zone de saisie : sans ce
       * garde-fou, taper une barre oblique dans le filtre d'un tableau ferait sauter
       * le focus dans l'en-tête au milieu d'un mot. `isContentEditable` couvre les
       * zones riches, que le test sur le nom de balise ne voit pas.
       */
      let isSlash = false
      if (event.key === '/' && !event.ctrlKey && !event.metaKey && !event.altKey) {
        const target = event.target as HTMLElement | null
        const tag = target?.tagName
        isSlash = tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT' && !target?.isContentEditable
      }

      if (!isShortcut && !isSlash) return

      // `preventDefault` évite que Firefox n'ouvre sa propre barre de recherche rapide
      // par-dessus la nôtre, et qu'une barre oblique ne s'écrive dans le champ.
      event.preventDefault()

      if (inputRef.current && inputRef.current.offsetParent !== null) {
        inputRef.current.focus()
        inputRef.current.select()
      } else {
        onOpenOverlay()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onOpenOverlay])

  /**
   * Navigation au clavier DANS le tiroir.
   *
   * Les résultats sont des liens ordinaires ; les parcourir revient donc à déplacer le
   * focus de l'un à l'autre, et `Entrée` suit alors le lien sans qu'aucun code ne s'en
   * mêle. On lit les liens dans le DOM au moment de la frappe plutôt que de tenir un
   * index en état : la liste change à chaque réponse réseau, et un index conservé
   * pointerait régulièrement sur une ligne qui n'existe plus.
   */
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
    const current = document.activeElement
    const index = [...links].indexOf(current as HTMLAnchorElement)

    // Depuis le champ (index -1), Bas va au premier et Haut au dernier — le
    // bouclage attendu de toute liste de suggestions.
    const next =
      event.key === 'ArrowDown'
        ? (index + 1) % links.length
        : (index <= 0 ? links.length : index) - 1

    links[next]?.focus()
  }

  return (
    <div ref={rootRef} className="relative shrink-0">
      {/* ── ÉCRAN ÉTROIT : une icône, qui ouvre la fenêtre ─────────────────── */}
      <button
        type="button"
        onClick={onOpenOverlay}
        aria-label={t('open')}
        className="flex h-9 w-9 items-center justify-center rounded-control border border-border-subtle text-ink-muted transition-colors duration-150 hover:border-brand hover:text-ink md:hidden"
      >
        <Search className="h-4 w-4" aria-hidden="true" />
      </button>

      {/* ── ÉCRAN LARGE : le champ ─────────────────────────────────────────── */}
      <div
        className={`hidden h-9 items-center gap-2 rounded-control border bg-surface-muted pl-2.5 pr-1.5 transition-colors duration-150 md:flex ${
          focused ? 'border-brand' : 'border-border-subtle hover:border-brand/60'
        }`}
      >
        <Search className="h-3.5 w-3.5 shrink-0 text-ink-muted" aria-hidden="true" />

        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={focused}
          aria-controls="header-search-panel"
          aria-autocomplete="list"
          aria-label={fr.search.title}
          value={search.query}
          onChange={(event) => search.setQuery(event.target.value)}
          onFocus={() => setFocused(true)}
          onKeyDown={onFieldKeyDown}
          placeholder={t('placeholder')}
          /* `type="text"` et non `type="search"` : le second ajoute une croix de
             remise à zéro dessinée par le navigateur, différente sur chacun, et qui
             double celle que l'on pose nous-mêmes ci-dessous. */
          className="w-40 bg-transparent text-xs text-ink outline-none placeholder:text-ink-muted lg:w-52"
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
            aria-label={fr.search.close}
            className="shrink-0 rounded-control p-0.5 text-ink-muted transition-colors hover:bg-surface hover:text-ink"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        ) : (
          <kbd
            className="hidden shrink-0 rounded-xs border border-border-subtle px-1.5 py-0.5 font-sans text-micro text-ink-muted lg:block"
            aria-hidden="true"
          >
            {t('shortcut')}
          </kbd>
        )}
      </div>

      {/* ── TIROIR DE RÉSULTATS ────────────────────────────────────────────── */}
      {mounted ? (
        <div
          id="header-search-panel"
          ref={panelRef}
          data-state={state}
          onTransitionEnd={onTransitionEnd}
          onKeyDown={onFieldKeyDown}
          /* `left-auto right-0` : ancré au bord DROIT du champ. La recherche est le
             premier élément d'un groupe collé à droite de la barre ; centré, le tiroir
             déborderait de la fenêtre sur les largeurs intermédiaires. */
          className="menu-panel absolute right-0 top-full z-50 hidden w-[26rem] pt-2 md:block"
        >
          <div className="max-h-[70vh] overflow-y-auto overscroll-contain rounded-card border border-border-subtle bg-overlay p-1.5 shadow-overlay">
            <SearchResults search={search} onNavigate={close} />
          </div>
        </div>
      ) : null}
    </div>
  )
}
