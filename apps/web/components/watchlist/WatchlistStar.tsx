'use client'

import { Star } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { useState, useTransition } from 'react'

import { FREE_WATCHLIST_LIMIT } from '@/lib/billing'
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
  const [capped, setCapped] = useState(false)
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
      //
      // UNE exception : le plafond de l'offre gratuite. Ce refus-là ne se réessaie pas
      // — recliquer donnera le même résultat indéfiniment —, et une étoile qui revient
      // en arrière sans un mot passe alors pour une panne. L'explication est portée par
      // l'infobulle et par une région vocale masquée : aucune des deux n'occupe de
      // place, donc aucune ne décale les lignes suivantes.
      if (!result.ok) {
        setFollowing(previous)
        setCapped(result.reason === 'limit-reached')
        return
      }

      setCapped(false)
      setFollowing(result.following)
    })
  }

  const action = following ? `Ne plus suivre ${label}` : `Suivre ${label}`
  const cappedLabel = `Liste de suivi limitée à ${FREE_WATCHLIST_LIMIT} actifs dans l’offre gratuite`

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        aria-pressed={following}
        title={capped ? cappedLabel : action}
        aria-label={capped ? cappedLabel : action}
        className={`inline-flex rounded-card p-1.5 transition-colors disabled:opacity-60 ${
          following
            ? 'text-brand hover:bg-brand-soft'
            : 'text-ink-muted/60 hover:bg-surface-muted hover:text-ink'
        }`}
      >
        <Star className={`h-4 w-4 ${following ? 'fill-current' : ''}`} aria-hidden="true" />
      </button>

      {capped ? (
        <span role="status" className="sr-only">
          {cappedLabel}. L’offre Zenkuu Pro la libère.
        </span>
      ) : null}
    </>
  )
}
