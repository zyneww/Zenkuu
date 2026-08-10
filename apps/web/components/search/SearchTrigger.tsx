'use client'

import { Search } from 'lucide-react'

import { fr } from '@/content/fr'

/**
 * Champ de recherche de l'en-tête — d'apparence, pas de fonction.
 *
 * C'est un BOUTON déguisé en champ de saisie. Le clic ouvre la fenêtre de recherche,
 * qui porte déjà l'anti-rebond, l'annulation des requêtes obsolètes, les tendances et
 * la garde de quota. Un vrai `<input>` ici obligerait à dupliquer les quatre — et un
 * champ de recherche à moitié implémenté dans un en-tête est le genre de détail qui
 * fait taper trois lettres avant de comprendre qu'il ne se passe rien.
 *
 * `<button>` et non `<div role="button">` : la touche Entrée, la touche Espace et le
 * focus au clavier viennent alors gratuitement et correctement.
 *
 * La pastille « / » annonce le raccourci. Elle est masquée sur les écrans étroits, où
 * aucun clavier ne permet de s'en servir.
 */
export function SearchTrigger({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={fr.search.open}
      className="group flex h-9 w-full max-w-[15rem] items-center gap-2 border border-border-subtle bg-surface-muted px-3 text-sm text-ink-muted transition-colors duration-150 hover:border-brand hover:text-ink sm:max-w-[18rem]"
    >
      <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="flex-1 truncate text-left">{fr.search.placeholder}</span>
      <kbd
        className="hidden shrink-0 border border-border-subtle px-1.5 py-0.5 text-[0.6875rem] font-sans text-ink-muted sm:block"
        aria-hidden="true"
      >
        /
      </kbd>
    </button>
  )
}
