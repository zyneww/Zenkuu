/**
 * Glyphes de réseaux sociaux.
 *
 * Lucide a retiré ses icônes de marque (Instagram, X, GitHub…) pour des raisons de
 * droit des marques : `lucide-react` n'en exporte plus aucune. Plutôt que d'ajouter
 * une seconde bibliothèque d'icônes pour un unique glyphe, on le trace ici.
 *
 * Le tracé reste volontairement schématique — carré arrondi, objectif, témoin —
 * et sert uniquement à identifier la destination d'un lien vers NOTRE propre
 * compte, ce qui relève de l'usage nominatif.
 */

interface IconProps {
  className?: string
}

export function InstagramGlyph({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  )
}
