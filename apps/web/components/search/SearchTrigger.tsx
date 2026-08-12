'use client'

import { Search } from 'lucide-react'
import { useTranslations } from 'next-intl'

/**
 * Déclencheur de recherche de l'en-tête — une pastille compacte, pas un champ.
 *
 * C'est un BOUTON déguisé. Le clic ouvre la fenêtre de recherche, qui porte déjà
 * l'anti-rebond, l'annulation des requêtes obsolètes, les tendances et la garde de
 * quota. Un vrai `<input>` ici obligerait à dupliquer les quatre — et un champ de
 * recherche à moitié implémenté dans un en-tête est le genre de détail qui fait taper
 * trois lettres avant de comprendre qu'il ne se passe rien.
 *
 * `<button>` et non `<div role="button">` : la touche Entrée, la touche Espace et le
 * focus au clavier viennent alors gratuitement et correctement.
 *
 * ── POURQUOI IL A RÉTRÉCI ─────────────────────────────────────────────────────
 *
 * Il imitait auparavant un champ de saisie sur 288 pixels, avec le texte complet
 * « Rechercher un actif, un symbole… ». Cette largeur était une promesse fausse deux
 * fois : le champ ne se remplit pas sur place, et l'espace qu'il prenait dans
 * l'en-tête revenait de droit à la navigation. Réduit à une pastille, il annonce ce
 * qu'il est — un raccourci vers une fenêtre — et rend la barre au menu.
 *
 * ── LE RACCOURCI AFFICHÉ ──────────────────────────────────────────────────────
 *
 * Deux raccourcis ouvrent la recherche (`NavBar` lie `Ctrl/⌘ + K` ET `/`). La
 * pastille n'en montre qu'un, le plus conventionnel : afficher les deux doublerait
 * la largeur pour une information que personne ne lit deux fois. Elle disparaît sur
 * écran étroit, où aucun clavier ne permet de s'en servir.
 */
export function SearchTrigger({ onOpen }: { onOpen: () => void }) {
  const t = useTranslations('search')

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={t('open')}
      className="group flex h-8 items-center gap-2 rounded-card border border-border-subtle bg-surface-muted pl-2.5 pr-1.5 text-xs text-ink-muted transition-colors duration-150 hover:border-brand hover:text-ink"
    >
      <Search className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span className="text-left">{t('placeholder')}</span>
      <kbd
        className="hidden shrink-0 rounded-sm border border-border-subtle px-1.5 py-0.5 font-sans text-[0.625rem] text-ink-muted sm:block"
        aria-hidden="true"
      >
        {t('shortcut')}
      </kbd>
    </button>
  )
}
