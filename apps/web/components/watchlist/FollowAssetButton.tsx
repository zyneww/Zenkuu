'use client'

import { Loader2, Star } from 'lucide-react'
import { useState, useTransition } from 'react'

import { usePhrase } from '@/components/locale/ContentProvider'
import { Button } from '@/components/ui/button'
import { WATCHLIST_ASSET_LIMIT } from '@/lib/limits'
import { notifierErreur, notifierSucces } from '@/lib/notify'
import { toggleWatchlist } from '@/lib/watchlist-actions'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * « FOLLOW ASSET » — LE SUIVI, EN TOUTES LETTRES, EN TÊTE DE FICHE
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── CE QU'IL REMPLACE, ET POURQUOI ───────────────────────────────────────────
 *
 * Une `WatchlistStar` isolée à gauche du logo. Elle convient dans un TABLEAU, où
 * cinquante lignes portent la même commande et où l'icône seule se comprend par
 * répétition. En tête de fiche, elle est seule de son espèce : rien n'apprend au
 * lecteur ce que cette étoile fait avant qu'il ne la survole.
 *
 * Un bouton nommé le dit. C'est la forme que le brief demande, et c'est celle que
 * prennent les références — un libellé, pas un glyphe orphelin.
 *
 * ── LE SUIVI NE DEMANDE PAS DE COMPTE, ET C'EST MESURÉ ───────────────────────
 *
 * ⚠️ LE BRIEF SUPPOSE UNE CONNEXION : « ajout/retrait réel des favoris de
 * l'utilisateur connecté », « si l'utilisateur est non connecté : ouvrir l'overlay
 * de connexion ». Vérifié dans `lib/watchlist-actions.ts` : `toggleWatchlist`
 * appelle `ensureOwnerId()`, dont le commentaire dit — « première écriture du
 * visiteur ⇒ le cookie est créé ici. C'est la seule chose qui tienne lieu
 * d'inscription sur ce site, et elle ne demande rien à personne ».
 *
 * Il n'y a donc AUCUN état « non connecté » à intercepter : suivre un actif crée
 * l'identité au premier clic. Ouvrir un panneau de connexion ici barrerait la route
 * à un geste qui marche déjà, pour une exigence que le code ne porte pas.
 *
 * Le seul empêchement réel est l'absence de base — `available: false` —, et il n'a
 * pas de recours : le bouton se désactive alors en le disant.
 *
 * ── LA BASCULE EST OPTIMISTE, LE RETOUR EST HONNÊTE ──────────────────────────
 *
 * L'état change au clic, avant la réponse : un ajout en liste de suivi est
 * réversible d'un second clic et sans conséquence, ce qui est exactement le cas où
 * l'optimisme se justifie. En cas d'échec, l'état revient ET un toast dit lequel des
 * trois motifs s'applique — le brief l'exige, et la `WatchlistStar` ne le pouvait pas
 * (dans une ligne de tableau, un message déplacerait les lignes suivantes).
 */
export function FollowAssetButton({
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
  /** Le suivi est-il utilisable ? Faux sans base configurée. */
  available: boolean
}) {
  const t = usePhrase()
  const [following, setFollowing] = useState(initialFollowing)
  const [pending, startTransition] = useTransition()

  if (!available) {
    return (
      <Button size="sm" variant="outline" disabled>
        <Star className="size-4" aria-hidden="true" />
        {t('Suivi indisponible')}
      </Button>
    )
  }

  function onClick() {
    const precedent = following
    setFollowing(!precedent)

    startTransition(async () => {
      const resultat = await toggleWatchlist({
        assetClass,
        assetId,
        label,
        ...(symbol ? { symbol } : {}),
        path,
      })

      if (!resultat.ok) {
        setFollowing(precedent)

        /*
         * Les trois motifs que l'action peut rendre disent trois choses différentes,
         * et un message unique les confondrait : l'un est définitif, l'un se corrige
         * en retirant un actif, l'un se réessaie.
         */
        if (resultat.reason === 'limit-reached') {
          notifierErreur(
            t('Liste de suivi limitée à {n} actifs.').replace(
              '{n}',
              String(WATCHLIST_ASSET_LIMIT),
            ),
            { description: t('Retirez un actif pour en suivre un autre.') },
          )
          return
        }

        if (resultat.reason === 'db-disabled') {
          notifierErreur(t('Le suivi n’est pas disponible sur cette instance.'))
          return
        }

        notifierErreur(t('Le suivi n’a pas pu être enregistré.'), {
          description: t('Réessayez dans un instant.'),
        })
        return
      }

      setFollowing(resultat.following)
      notifierSucces(
        resultat.following
          ? t('{nom} ajouté à votre liste de suivi.').replace('{nom}', label)
          : t('{nom} retiré de votre liste de suivi.').replace('{nom}', label),
      )
    })
  }

  return (
    <Button
      size="sm"
      /* `default` une fois suivi, `outline` sinon : l'état se lit au remplissage du
         bouton avant de se lire à son texte. L'étoile pleine le redit — la couleur
         ne porte jamais seule. */
      variant={following ? 'default' : 'outline'}
      onClick={onClick}
      disabled={pending}
      aria-pressed={following}
      className="shrink-0"
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
      ) : (
        <Star className={`size-4 ${following ? 'fill-current' : ''}`} aria-hidden="true" />
      )}
      {/* ⚠️ « Actif suivi » ET NON « Suivi ». La seconde EXISTAIT DÉJÀ dans la table,
          traduite « Tracked » pour un tout autre usage, et le bouton affichait donc ce
          mot-là — mesuré au navigateur avant correction. C'est le risque propre à une
          table dont le français EST la clé : un mot court finit toujours par servir
          deux fois. La forme longue est sans ambiguïté, et se lit mieux en face de
          « Suivre l'actif » : les deux états partagent le même substantif. */}
      {following ? t('Actif suivi') : t('Suivre l’actif')}
    </Button>
  )
}
