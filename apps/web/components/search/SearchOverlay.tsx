'use client'

import { usePhrase } from '@/components/locale/ContentProvider'
import { useEffect } from 'react'

import {
  CommandDialog,
  CommandInput,
  CommandList,
} from '@/components/ui/command'
import { Kbd } from '@/components/ui/kbd'
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
 * dupliquée ; les deux vivent désormais dans `useAssetSearch` et `SearchResults`.
 *
 * ── CE QU'IL RESTE À CE FICHIER DEPUIS `CommandDialog` ───────────────────────
 *
 * Presque rien, et c'est le but. Il gardait « ce qui lui est propre — la modalité » :
 * fond assombri, blocage du défilement, fermeture à Échap, focus pris à l'ouverture,
 * plus un `<button>` plein écran en guise de zone de clic extérieure. `CommandDialog`
 * fait les cinq, et ajoute ce qui manquait — le piège à focus, l'`aria-hidden` sur le
 * reste du document, et le titre annoncé à l'ouverture.
 *
 * La navigation clavier dans les résultats vient de cmdk : flèches, `Entrée`, et une
 * sélection qui se replace quand la liste change sous elle. Voir `SearchResults`.
 *
 * ⚠️ `shouldFilter={false}` : la recherche est faite par le serveur, ce que la liste
 * reçoit est déjà le résultat. Le filtre intégré de cmdk le retaillerait une seconde
 * fois, sur une comparaison de chaînes qui ne connaît ni « BTC » ni « Bitcoin ».
 *
 * Elle reste atteignable sur grand écran par la version repliée du champ, mais son
 * public est le téléphone : elle occupe toute la hauteur, ce qui laisse le clavier
 * virtuel monter sans recouvrir les résultats.
 */
export function SearchOverlay({ open, onClose }: SearchOverlayProps) {
  const t = usePhrase()
  const fr = useContent()
  const search = useAssetSearch({ active: open })
  const { reset } = search

  /*
   * Remise à zéro à la FERMETURE : rouvrir la recherche doit repartir d'un champ
   * vide, pas de la requête précédente.
   *
   * Le focus, lui, n'est plus posé ici — `CommandInput` le prend de lui-même à
   * l'ouverture du dialogue, et le rendait auparavant par un `ref` et un effet.
   *
   * `open` est une prop contrôlée par le parent (plusieurs déclencheurs de fermeture :
   * Échap, clic extérieur, bouton) : remettre l'état à zéro ICI, en réaction à son
   * changement, évite de dupliquer la même réinitialisation dans chacun d'eux.
   */
  useEffect(() => {
    if (!open) reset()
  }, [open, reset])

  return (
    <CommandDialog
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title={fr.search.title}
      description={fr.search.placeholder}
      shouldFilter={false}
      className="max-w-2xl border-border-subtle bg-overlay shadow-overlay sm:max-w-2xl"
    >
      <CommandInput
        value={search.query}
        onValueChange={search.setQuery}
        placeholder={fr.search.placeholder}
        className="text-sm"
      />

      <CommandList className="max-h-[60vh] p-2">
        <SearchResults search={search} onNavigate={onClose} />
      </CommandList>

      <div className="flex items-center justify-between gap-4 border-t border-border-subtle px-4 py-2 text-[0.6875rem] text-ink-muted">
        <span>{fr.search.hint}</span>
        <Kbd>{t('Échap')}</Kbd>
      </div>
    </CommandDialog>
  )
}
