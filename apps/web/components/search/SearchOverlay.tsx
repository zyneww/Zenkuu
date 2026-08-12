'use client'

import { useEffect, useRef } from 'react'
import { Search, X } from 'lucide-react'

import { useContent } from '@/components/locale/ContentProvider'
import { SearchResults } from '@/components/search/SearchResults'
import { useAssetSearch } from '@/components/search/useAssetSearch'

interface SearchOverlayProps {
  open: boolean
  onClose: () => void
}

/**
 * Recherche en FENÊTRE — la forme réservée aux écrans étroits.
 *
 * Elle portait auparavant toute la machinerie : anti-rebond, annulation des réponses
 * obsolètes, tendances, mise en forme des résultats. Le champ de l'en-tête l'aurait
 * dupliquée ; les deux vivent désormais dans `useAssetSearch` et `SearchResults`, et
 * ce fichier ne garde que ce qui lui est PROPRE — la modalité : fond assombri,
 * blocage du défilement, fermeture à Échap, focus pris à l'ouverture.
 *
 * Elle reste atteignable sur grand écran par la version repliée du champ, mais son
 * public est le téléphone : elle occupe toute la hauteur, ce qui laisse le clavier
 * virtuel monter sans recouvrir les résultats.
 */
export function SearchOverlay({ open, onClose }: SearchOverlayProps) {
  const fr = useContent()
  const inputRef = useRef<HTMLInputElement>(null)
  const search = useAssetSearch({ active: open })
  const { reset } = search

  // Focus à l'ouverture, remise à zéro à la FERMETURE : rouvrir la recherche doit
  // repartir d'un champ vide, pas de la requête précédente.
  useEffect(() => {
    if (open) {
      inputRef.current?.focus()
    } else {
      // `open` est une prop contrôlée par le parent (plusieurs déclencheurs de
      // fermeture — Échap, clic sur le fond, bouton) : remettre l'état à zéro ICI, en
      // réaction à son changement, évite de dupliquer la même réinitialisation dans
      // chacun d'eux.
      reset()
    }
  }, [open, reset])

  // Le défilement de la page derrière la fenêtre est bloqué : sans cela, la molette
  // fait glisser le contenu dessous, ce qui est désorientant.
  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center px-4 pt-[10vh]"
      role="dialog"
      aria-modal="true"
      aria-label={fr.search.title}
    >
      {/* Fond assombri et flouté, cliquable pour fermer. */}
      <button
        type="button"
        className="absolute inset-0 cursor-default bg-canvas/70 backdrop-blur-sm"
        aria-label={fr.search.close}
        onClick={onClose}
      />

      <div className="relative w-full max-w-2xl overflow-hidden rounded-card border border-border-subtle bg-overlay shadow-overlay">
        <div className="flex items-center gap-3 border-b border-border-subtle px-4 py-3">
          <Search className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden="true" />
          <input
            ref={inputRef}
            type="search"
            value={search.query}
            onChange={(event) => search.setQuery(event.target.value)}
            placeholder={fr.search.placeholder}
            className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-muted"
            autoComplete="off"
            spellCheck={false}
          />
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-control p-1 text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
            aria-label={fr.search.close}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          <SearchResults search={search} onNavigate={onClose} />
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-border-subtle px-4 py-2 text-[0.6875rem] text-ink-muted">
          <span>{fr.search.hint}</span>
          <kbd className="rounded-xs border border-border-subtle bg-surface-muted px-1.5 py-0.5 font-sans">
            Échap
          </kbd>
        </div>
      </div>
    </div>
  )
}
