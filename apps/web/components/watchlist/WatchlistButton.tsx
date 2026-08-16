'use client'

import { Star } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { useState, useTransition } from 'react'

import { WATCHLIST_ASSET_LIMIT } from '@/lib/limits'
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

  /*
   * `signedIn` NE DÉSIGNE PLUS UNE SESSION, mais une base configurée.
   *
   * Le bouton renvoyait vers une page de connexion tant qu'aucun compte n'était
   * ouvert. Suivre un actif ne demande plus de compte — la liste se range sous le
   * cookie anonyme du navigateur — et la seule chose qui puisse encore manquer est la
   * base elle-même. Ce n'est plus un geste à faire, c'est une panne à annoncer : le
   * bouton devient donc inerte et le dit, au lieu d'envoyer vers un formulaire qui ne
   * réparerait rien.
   */
  if (!signedIn) {
    return (
      <span
        title="Le suivi n’est pas disponible : aucune base de données n’est configurée sur cette instance."
        className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-control border border-border-subtle px-3 py-1.5 text-xs font-medium text-ink-muted/60"
      >
        <Star className="h-3.5 w-3.5" aria-hidden="true" />
        Suivi indisponible
      </span>
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
        className={`inline-flex items-center gap-1.5 rounded-control border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-60 ${
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
            autres décrivent une panne d'exploitation, sur laquelle il ne peut rien.

            Le lien vers l'abonnement a disparu avec l'abonnement lui-même : il n'y a
            plus qu'un jeu de plafonds, et il est déjà très large. Le message renvoie
            donc vers la liste, où l'on fait de la place.
          */}
          {failure === 'limit-reached' || failure === 'list-limit' ? (
            <Link href="/suivi" className="text-brand hover:text-brand-strong">
              Gérer mes listes
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
      return `Votre liste atteint ${WATCHLIST_ASSET_LIMIT} actifs, le plafond du site.`
    case 'list-limit':
      return 'Vous avez atteint le nombre maximal de listes.'
    case 'db-disabled':
      return 'La base de données n’est pas configurée : le suivi n’est pas conservé.'
    default:
      return 'L’enregistrement a échoué. Réessayez.'
  }
}
