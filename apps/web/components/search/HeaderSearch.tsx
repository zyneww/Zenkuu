'use client'

import { Search, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'

import { IconButton } from '@/components/ui/IconButton'
import { Command, CommandInput, CommandList } from '@/components/ui/command'
import { Kbd } from '@/components/ui/kbd'
import { SearchShortcuts } from '@/components/search/SearchShortcuts'
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover'
import { useContent } from '@/components/locale/ContentProvider'
import { SearchResults } from '@/components/search/SearchResults'
import { useAssetSearch } from '@/components/search/useAssetSearch'
import { cn } from '@/lib/utils'

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
 * ── LE TIROIR EST UN `Popover`, LA LISTE UN `Command` ────────────────────────
 *
 * Trois mécaniques écrites à la main ont quitté ce fichier, et chacune était un
 * défaut potentiel :
 *
 *   · LA FERMETURE AU CLIC EXTÉRIEUR. Un `mousedown` sur le document, borné à
 *     l'extérieur d'une racine — avec la note expliquant pourquoi ce n'était pas un
 *     `onBlur` (cliquer un résultat retire d'abord le focus au champ, ce qui
 *     démonterait le tiroir AVANT que le clic n'atteigne le lien). Radix connaît ce
 *     piège et l'évite de lui-même.
 *   · LE POSITIONNEMENT. `absolute right-0 top-full` suppose que la place existe en
 *     dessous et à droite. Radix mesure la fenêtre et retourne le panneau quand elle
 *     manque.
 *   · LA NAVIGATION AU CLAVIER. Trente lignes qui relisaient les `a[href]` du tiroir
 *     par `querySelectorAll` à chaque frappe. cmdk fait mieux — voir `SearchResults`.
 *
 * ⚠️ `onOpenAutoFocus` EST NEUTRALISÉ, et il le faut. Un `PopoverContent` prend le
 * focus à l'ouverture ; ici le tiroir s'ouvre PARCE QU'ON EST EN TRAIN DE TAPER dans
 * le champ, et le laisser faire arracherait le curseur au premier caractère. Le champ
 * garde le focus, cmdk pilote la sélection à distance.
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
  const inputRef = useRef<HTMLInputElement>(null)

  const search = useAssetSearch({ active: focused })

  const close = useCallback(() => {
    setFocused(false)
    search.reset()
  }, [search])

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

  return (
    <div className="relative shrink-0">
      {/* ── ÉCRAN ÉTROIT : une icône, qui ouvre la fenêtre ─────────────────── */}
      {/* `IconButton` : le bouton-icône bordé du système, bâti sur le `Button` de
          shadcn/ui. `tooltip={false}` ici — la cible est tactile, et une infobulle sur
          mobile n'a pas de survol pour s'ouvrir ; l'étiquette porte seule le libellé. */}
      <IconButton
        variant="outline"
        onClick={onOpenOverlay}
        label={t('open')}
        tooltip={false}
        icon={Search}
        className="md:hidden"
      />

      {/* ── ÉCRAN LARGE : le champ et son tiroir ───────────────────────────── */}
      {/*
        `Command` ENVELOPPE LE CHAMP ET LA LISTE, et il le faut : cmdk relie les deux
        par un contexte React, pas par le DOM. La liste vit dans un portail — Radix
        l'y met — donc à l'autre bout du document ; c'est ce contexte, et lui seul, qui
        fait que les flèches tapées dans le champ déplacent la sélection dans le
        panneau.

        `shouldFilter={false}` : la recherche est faite par le serveur. Voir la note
        de `SearchResults`, qui vaut pour les deux surfaces.
      */}
      <Command shouldFilter={false} className="hidden bg-transparent md:block">
        <Popover
          open={focused}
          onOpenChange={(next) => {
            if (!next) close()
          }}
        >
          <PopoverAnchor asChild>
            <div
              className={cn(
                'flex h-9 items-center gap-2 rounded-control border bg-surface-muted pl-2.5 pr-1.5 transition-colors duration-150',
                focused ? 'border-brand' : 'border-border-subtle hover:border-brand/60',
              )}
            >
              <Search className="h-3.5 w-3.5 shrink-0 text-ink-muted" aria-hidden="true" />

              <CommandInput
                ref={inputRef}
                value={search.query}
                onValueChange={search.setQuery}
                onFocus={() => setFocused(true)}
                onKeyDown={(event) => {
                  if (event.key !== 'Escape') return
                  close()
                  inputRef.current?.blur()
                }}
                placeholder={t('placeholder')}
                aria-label={fr.search.title}
                autoComplete="off"
                spellCheck={false}
                /* La coque dessine déjà sa bordure et sa loupe : le conteneur de
                   `CommandInput` ne doit poser ni l'une ni l'autre, sans quoi le champ
                   porte un filet en travers et deux loupes. Voir l'écart documenté en
                   tête de `components/ui/command.tsx`.

                   144px puis 176px au-delà de `lg`. Le champ ne sert pas à LIRE la
                   requête mais à la TAPER : les résultats s'affichent dans un tiroir
                   de 26rem juste en dessous, et l'essentiel des recherches tient en
                   trois à huit caractères — un symbole, un début de nom. La largeur
                   gagnée revient aux menus de navigation, qui sont incompressibles. */
                hideIcon
                wrapperClassName="h-auto flex-1 border-0 p-0"
                className="h-auto w-36 py-0 text-xs text-ink placeholder:text-ink-muted lg:w-44"
              />

              {search.query ? (
                <IconButton
                  size="icon-xs"
                  variant="ghost"
                  label={fr.search.close}
                  tooltip={false}
                  icon={X}
                  onClick={() => {
                    search.reset()
                    inputRef.current?.focus()
                  }}
                />
              ) : (
                /*
                  ⚠️ `bg-canvas` ET NON `bg-transparent` — LE RACCOURCI ÉTAIT
                  ILLISIBLE DANS LES DEUX THÈMES.

                  La coque du champ est en `bg-surface-muted`. Une touche
                  transparente prenait donc exactement ce fond, et son filet
                  `border-border-subtle` — réglé pour se voir SUR une carte —
                  disparaissait dessus : il ne restait qu'un texte gris à 11 px sans
                  contour, sur un aplat de la même famille. Relevé sur la capture, en
                  clair comme en sombre.

                  `bg-canvas` est le bon choix pour les DEUX thèmes à la fois, et
                  c'est ce qui rend la correction symétrique : le canvas est
                  l'extrémité de la rampe, donc plus CLAIR que `surface-muted` en
                  thème clair (blanc sur #f8fafc) et plus SOMBRE en thème sombre
                  (#0d1217 sur #35353a). La touche s'enfonce dans le champ dans un
                  cas, s'en détache dans l'autre — dans les deux, elle se voit.
                */
                <Kbd className="hidden shrink-0 bg-canvas text-micro lg:inline-flex" aria-hidden="true">
                  {t('shortcut')}
                </Kbd>
              )}
            </div>
          </PopoverAnchor>

          <PopoverContent
            align="end"
            sideOffset={8}
            /* Voir l'en-tête : le tiroir s'ouvre pendant qu'on tape, lui donner le
               focus arracherait le curseur au premier caractère. */
            onOpenAutoFocus={(event) => event.preventDefault()}
            className="w-[26rem] border-border-subtle bg-overlay p-1.5 shadow-overlay"
          >
            <CommandList className="max-h-[70vh] overscroll-contain">
              <SearchResults search={search} onNavigate={close} />
            </CommandList>

            {/* HORS de `CommandList`, et l'endroit compte : cmdk traite ses enfants
                comme des éléments sélectionnables au clavier, et une rangée de légendes
                y deviendrait une ligne qu'on peut « choisir ». */}
            <SearchShortcuts
              strings={{
                navigate: fr.search.keyNavigate,
                cancel: fr.search.keyCancel,
                open: fr.search.keyOpen,
              }}
            />
          </PopoverContent>
        </Popover>
      </Command>
    </div>
  )
}
