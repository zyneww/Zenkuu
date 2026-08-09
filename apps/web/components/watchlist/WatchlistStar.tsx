'use client'

import { Star } from 'lucide-react'
import Link from 'next/link'
import { useState, useTransition } from 'react'

import { toggleWatchlist } from '@/lib/watchlist-actions'

/**
 * Étoile de suivi d'une LIGNE de tableau.
 *
 * Variante compacte de `WatchlistButton`, qui porte un libellé et un message
 * d'erreur : dans un tableau de cinquante lignes, l'un déborderait la colonne et
 * l'autre décalerait toutes les lignes suivantes au moindre échec. Ici le libellé
 * vit dans `aria-label` et le titre de survol, et un échec se contente de rétablir
 * l'étoile — la fiche de l'actif reste l'endroit où l'on obtient une explication.
 *
 * La bascule est OPTIMISTE : l'étoile change au clic sans attendre le serveur. Un
 * ajout en liste de suivi est réversible d'un second clic et sans conséquence, ce
 * qui est exactement le cas où l'optimisme se justifie.
 *
 * Sans session, ce n'est pas un bouton désactivé mais un lien vers la connexion :
 * un contrôle qui échoue au clic n'apprend rien, un lien dit quoi faire.
 */
export function WatchlistStar({
  assetClass,
  assetId,
  label,
  symbol,
  path,
  initialFollowing,
  available,
}: {
  assetClass: string
  assetId: string
  label: string
  symbol?: string
  path: string
  initialFollowing: boolean
  /** Le suivi est-il utilisable ? Faux sans compte ou sans base configurée. */
  available: boolean
}) {
  const [following, setFollowing] = useState(initialFollowing)
  const [pending, startTransition] = useTransition()

  if (!available) {
    return (
      <Link
        href="/connexion"
        title={`Se connecter pour suivre ${label}`}
        aria-label={`Se connecter pour suivre ${label}`}
        className="inline-flex rounded-card p-1.5 text-ink-muted/60 transition-colors hover:bg-surface-muted hover:text-ink"
      >
        <Star className="h-4 w-4" aria-hidden="true" />
      </Link>
    )
  }

  function onClick() {
    const previous = following
    setFollowing(!previous)

    startTransition(async () => {
      const result = await toggleWatchlist({
        assetClass,
        assetId,
        label,
        ...(symbol ? { symbol } : {}),
        path,
      })

      // Échec silencieux à dessein : l'étoile revient à son état réel, sans pousser
      // de message qui déplacerait la ligne. L'action est sans enjeu et réessayable.
      if (!result.ok) setFollowing(previous)
      else setFollowing(result.following)
    })
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-pressed={following}
      title={following ? `Ne plus suivre ${label}` : `Suivre ${label}`}
      aria-label={following ? `Ne plus suivre ${label}` : `Suivre ${label}`}
      className={`inline-flex rounded-card p-1.5 transition-colors disabled:opacity-60 ${
        following
          ? 'text-brand hover:bg-brand-soft'
          : 'text-ink-muted/60 hover:bg-surface-muted hover:text-ink'
      }`}
    >
      <Star className={`h-4 w-4 ${following ? 'fill-current' : ''}`} aria-hidden="true" />
    </button>
  )
}
