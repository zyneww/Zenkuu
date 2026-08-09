'use client'

import { Star } from 'lucide-react'
import Link from 'next/link'
import { useState, useTransition } from 'react'

import { toggleWatchlist, type WatchlistActionResult } from '@/lib/watchlist-actions'

/**
 * Bouton « Suivre » d'une fiche d'actif.
 *
 * L'état est mis à jour de façon OPTIMISTE : l'étoile bascule au clic, sans attendre
 * l'aller-retour serveur. Un ajout à une liste de suivi est réversible d'un second
 * clic et sans conséquence — c'est exactement le cas où l'optimisme est justifié.
 * En cas d'échec, l'état est rétabli et la raison affichée.
 */
export function WatchlistButton({
  assetClass,
  assetId,
  label,
  symbol,
  path,
  initialFollowing,
  signedIn,
}: {
  assetClass: string
  assetId: string
  label: string
  symbol?: string
  path: string
  initialFollowing: boolean
  signedIn: boolean
}) {
  const [following, setFollowing] = useState(initialFollowing)
  const [message, setMessage] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  // Sans session, le bouton devient une invitation à se connecter plutôt qu'un
  // contrôle qui échouerait au clic.
  if (!signedIn) {
    return (
      <Link
        href="/connexion"
        className="inline-flex items-center gap-1.5 rounded-card border border-border-subtle px-3 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:border-brand hover:text-ink"
      >
        <Star className="h-3.5 w-3.5" aria-hidden="true" />
        Se connecter pour suivre
      </Link>
    )
  }

  function onClick() {
    const previous = following
    setFollowing(!previous)
    setMessage(null)

    startTransition(async () => {
      const result: WatchlistActionResult = await toggleWatchlist({
        assetClass,
        assetId,
        label,
        ...(symbol ? { symbol } : {}),
        path,
      })

      if (!result.ok) {
        setFollowing(previous)
        setMessage(reasonLabel(result.reason))
        return
      }
      setFollowing(result.following)
    })
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        aria-pressed={following}
        className={`inline-flex items-center gap-1.5 rounded-card border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-60 ${
          following
            ? 'border-brand bg-brand-soft text-brand-strong'
            : 'border-border-subtle text-ink-muted hover:border-brand hover:text-ink'
        }`}
      >
        <Star
          className={`h-3.5 w-3.5 ${following ? 'fill-current' : ''}`}
          aria-hidden="true"
        />
        {following ? 'Suivi' : 'Suivre'}
      </button>

      {message ? (
        <p role="status" className="text-[0.6875rem] text-ink-muted">
          {message}
        </p>
      ) : null}
    </div>
  )
}

function reasonLabel(reason: Exclude<WatchlistActionResult, { ok: true }>['reason']): string {
  switch (reason) {
    case 'auth-disabled':
      return 'Les comptes ne sont pas configurés sur cette instance.'
    case 'signed-out':
      return 'Votre session a expiré — reconnectez-vous.'
    case 'db-disabled':
      return 'La base de données n’est pas configurée : le suivi n’est pas conservé.'
    default:
      return 'L’enregistrement a échoué. Réessayez.'
  }
}
