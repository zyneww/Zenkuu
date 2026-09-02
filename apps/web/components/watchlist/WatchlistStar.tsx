'use client'

import { Star } from 'lucide-react'
import { useState, useTransition } from 'react'

import { IconButton } from '@/components/ui/IconButton'
import { WATCHLIST_ASSET_LIMIT } from '@/lib/limits'
import { toggleWatchlist } from '@/lib/watchlist-actions'
import { usePhrase } from '@/components/locale/ContentProvider'

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
  /** Le suivi est-il utilisable ? Faux sans base configurée — le compte, lui, est facultatif. */
  available: boolean
}) {
  const t = usePhrase()
  const [following, setFollowing] = useState(initialFollowing)
  const [capped, setCapped] = useState(false)
  const [pending, startTransition] = useTransition()

  /* Voir `WatchlistButton` : `available` décrit une base configurée, plus une
     session. L'étoile devient donc muette au lieu de renvoyer vers une connexion qui
     ne changerait rien. */
  if (!available) {
    return (
      <IconButton
        size="icon-sm"
        variant="ghost"
        disabled
        label={t('Le suivi n’est pas disponible sur cette instance')}
        icon={Star}
      />
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
  const cappedLabel = `Liste de suivi limitée à ${WATCHLIST_ASSET_LIMIT} actifs`

  return (
    <>
      {/* `IconButton` — le bouton-icône de shadcn/ui, en `tertiary` : pas de
          bordure, juste un carré de survol. Ce qu'il apporte par rapport au `<button>`
          d'avant tient en un mot : l'INFOBULLE. Le `title=""` n'apparaissait qu'après
          la temporisation du navigateur, restait invisible au clavier et au doigt, et
          ne pouvait pas être mis en forme — trois défauts qui comptent double ici,
          puisque c'est cette bulle qui explique le refus du plafond.

          La teinte de l'étoile suivie ne peut pas venir de `color` : leurs deux
          variantes sont neutres. Elle est donc posée en `className`, qui remplace la
          couleur d'encre par cascade et laisse tout le reste (focus, plancher tactile,
          état désactivé) au composant. */}
      <IconButton
        size="icon-sm"
        variant="ghost"
        onClick={onClick}
        disabled={pending}
        aria-pressed={following}
        label={capped ? cappedLabel : action}
        icon={
          /* ⚠️ `size-5` ET NON `size-4`. L'étoile était rendue au même corps que les
             chevrons de tri de la même rangée, alors qu'elle n'a pas le même rôle :
             c'est la seule COMMANDE d'une ligne de tableau, et elle doit se
             distinguer du décor qui l'entoure. Quatre pixels de plus suffisent à
             cela sans changer la hauteur de ligne — le bouton qui la porte garde son
             plancher tactile. */
          <Star
            data-icon
            className={`size-5 ${following ? 'fill-current' : ''}`}
            aria-hidden="true"
          />
        }
        className={following ? 'text-brand-strong hover:text-brand-strong' : ''}
      />

      {capped ? (
        <span role="status" className="sr-only">
          {cappedLabel}
        </span>
      ) : null}
    </>
  )
}
