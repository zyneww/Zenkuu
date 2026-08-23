'use client'

import { Loader2, Star } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { useState, useTransition } from 'react'

import { Button } from '@/components/ui/button'
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
      /* `disabled` plutôt qu'un `<span>` grisé à la main : le bouton reste un
         bouton pour la synthèse vocale, qui l'annonce alors comme indisponible au
         lieu de le lire comme du texte ordinaire.

         ⚠️ LA RAISON N'EST PAS DANS UN `title` NI DANS UNE INFOBULLE. Un bouton
         DÉSACTIVÉ ne reçoit ni survol ni focus : sa bulle ne s'ouvrirait jamais.
         C'était déjà le cas avant, sur le `<span>` — le texte existait dans le DOM et
         personne ne pouvait le lire. Il est donc affiché, sous le bouton, comme l'est
         déjà le message d'échec quelques lignes plus bas. */
      <div className="flex flex-col items-end gap-1">
        <Button size="sm" variant="outline" disabled>
          <Star />
          Suivi indisponible
        </Button>
        <p className="max-w-[16rem] text-right text-[0.6875rem] leading-snug text-ink-muted">
          Aucune base de données n’est configurée sur cette instance.
        </p>
      </div>
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
      {/* `Button` de shadcn/ui. La bascule change de VARIANTE et non de classes
          recopiées : `default` quand l'actif est suivi — l'état est alors un fait
          acquis, qui a le droit d'être plein —, `outline` sinon.

          LA ROUE S'AJOUTE, ELLE NE REMPLACE PAS. Le libellé reste à l'écran pendant
          l'aller-retour : le faire disparaître rétrécirait le bouton à la largeur de
          son tourniquet, ce qui décale la rangée d'en-tête de la fiche — et surtout
          on ne saurait plus ce qu'on vient de demander. `disabled` empêche le second
          clic, ce que l'ancien `disabled:opacity-60` écrit à la main ne faisait pas.

          L'ÉTOILE SE REMPLIT quand l'actif est suivi. `fill-current` plutôt qu'une
          seconde icône : c'est le même glyphe dans les deux états, seule sa surface
          change, et l'œil lit le remplissage comme un basculement plutôt que comme un
          changement de pictogramme. */}
      <Button
        size="sm"
        variant={following ? 'default' : 'outline'}
        onClick={onClick}
        disabled={pending}
        aria-pressed={following}
      >
        {pending ? <Loader2 className="animate-spin" /> : null}
        <Star className={following ? 'fill-current' : undefined} aria-hidden="true" />
        {following ? 'Suivi' : 'Suivre'}
      </Button>

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
