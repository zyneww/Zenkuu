'use client'

import { Star } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { useState, useTransition } from 'react'

import { FREE_WATCHLIST_LIMIT } from '@/lib/billing'
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
  const [failure, setFailure] = useState<FailureReason | null>(null)
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
    setFailure(null)

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
        setFailure(result.reason)
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

      {failure ? (
        <p role="status" className="max-w-[16rem] text-right text-[0.6875rem] leading-snug text-ink-muted">
          {reasonLabel(failure)}{' '}
          {/*
            Le plafond est le SEUL refus qui se résout par un geste du lecteur : les
            trois autres décrivent une panne d'exploitation, sur laquelle il ne peut
            rien. C'est aussi le seul moment où proposer l'abonnement est utile plutôt
            qu'intrusif — la limite vient d'être rencontrée, pas annoncée à l'avance.
          */}
          {failure === 'limit-reached' || failure === 'list-limit' ? (
            <Link href="/tarifs" className="text-brand hover:text-brand-strong">
              Voir Zenkuu Pro
            </Link>
          ) : null}
        </p>
      ) : null}
    </div>
  )
}

type FailureReason = Exclude<WatchlistActionResult, { ok: true }>['reason']

function reasonLabel(reason: FailureReason): string {
  switch (reason) {
    case 'limit-reached':
      return `Votre liste atteint ${FREE_WATCHLIST_LIMIT} actifs, le plafond de l’offre gratuite.`
    case 'list-limit':
      return 'L’offre gratuite ne comporte qu’une seule liste de suivi.'
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
