'use client'

import { Star } from 'lucide-react'
import { useEffect, useState } from 'react'

import { Link } from '@/i18n/navigation'
import { usePhrase } from '@/components/locale/ContentProvider'
import { WatchlistStar } from '@/components/watchlist/WatchlistStar'
import { getWatchlistIds } from '@/lib/watchlist-actions'

/** Un actif proposé au suivi. `href` sert le lien ET l'action de suivi. */
export interface FavoriteSuggestion {
  assetClass: string
  id: string
  name: string
  symbol: string
  href: string
  image?: string
}

/**
 * PANNEAU DES FAVORIS — et la raison pour laquelle il est CLIENT.
 *
 * ── LE PROBLÈME : SAVOIR CE QUI EST DÉJÀ SUIVI REND LE RENDU NON PARTAGEABLE ─
 *
 * L'état de suivi vit sous un cookie. Le lire depuis le composant serveur marquerait
 * tout l'arbre de l'accueil comme propre à UN visiteur : Next.js ne sait pas isoler
 * une lecture de cookie dans un sous-arbre. La carte des secteurs et les trois
 * classements — cent actifs et l'intégralité des catégories — seraient alors
 * reconstruits pour chaque personne, au lieu d'être servis à toutes depuis le même
 * rendu. On paierait les deux blocs les plus lourds de la page pour cinq étoiles.
 *
 * ── LE REMÈDE : L'ÉTAT ARRIVE APRÈS, PAR L'ACTION SERVEUR ───────────────────
 *
 * `getWatchlistIds` est déjà une action serveur (`'use server'`), donc appelable
 * depuis le navigateur sans qu'aucune route ne soit ajoutée. Le panneau se rend avec
 * des étoiles éteintes, puis les rallume à l'arrivée de la réponse. Le rendu de la
 * page reste identique pour tout le monde, et le seul bloc qui dépend du visiteur est
 * le seul à l'attendre.
 *
 * ── POURQUOI LES ÉTOILES SONT REMONTÉES PAR LEUR CLÉ ────────────────────────
 *
 * `WatchlistStar` prend son état initial en PROP et le garde ensuite en interne —
 * c'est ce qui lui permet de basculer immédiatement au clic, sans attendre le
 * serveur. Une prop qui change après le montage ne l'atteint donc pas. La clé porte
 * l'état suivi : quand la réponse arrive, React remonte l'étoile plutôt que d'essayer
 * de la mettre à jour, et elle repart avec la bonne valeur.
 */
export function FavoritesPanel({ suggestions }: { suggestions: FavoriteSuggestion[] }) {
  const t = usePhrase()
  const [state, setState] = useState<{ available: boolean; ids: Set<string> } | null>(null)

  useEffect(() => {
    let alive = true

    /* Une seule classe interrogée — celle des suggestions. Le panneau ne propose que
       de la crypto, faute d'un classement multi-classes assez fourni pour en tirer
       cinq propositions qui aient un sens ensemble. */
    getWatchlistIds('crypto')
      .then((result) => {
        if (alive) setState({ available: result.available, ids: new Set(result.ids) })
      })
      .catch(() => {
        /* Silence délibéré : l'échec de cette lecture ne retire rien au panneau, qui
           reste utilisable avec des étoiles éteintes. Un message d'erreur pour un
           enrichissement facultatif ferait plus de bruit que de service. */
      })

    return () => {
      alive = false
    }
  }, [])

  const followed = state?.ids.size ?? 0

  return (
    <section className="rounded-panel border border-border-subtle bg-panel">
      <div className="px-4 pb-3 pt-4 text-center">
        <Star className="mx-auto h-5 w-5 text-ink-muted" aria-hidden="true" />
        <h3 className="mt-2 text-sm font-medium text-ink">
          {followed > 0 ? t('Votre liste de suivi') : t('Commencez votre liste de suivi')}
        </h3>
        <p className="mt-1 text-xs text-ink-muted">
          {followed > 0
            ? t('{count} actifs suivis. Retrouvez-les à tout moment.').replace(
                '{count}',
                String(followed),
              )
            : t('Suivez un actif pour le retrouver ici, sur toutes vos pages.')}
        </p>
        <Link
          href="/suivi"
          className="mt-2 inline-block text-xs font-medium text-brand transition-colors hover:text-brand-strong"
        >
          {t('Ouvrir ma liste')} <span aria-hidden="true">→</span>
        </Link>
      </div>

      {suggestions.length > 0 ? (
        <div className="border-t border-border-subtle px-4 py-2.5">
          <h4 className="pb-1 text-xs text-ink-muted">{t('Actifs suggérés')}</h4>

          <ul className="flex flex-col">
            {suggestions.map((asset) => {
              const following = state?.ids.has(asset.id) ?? false

              return (
                <li key={asset.id} className="flex items-center gap-2 py-1">
                  {asset.image ? (
                    /* eslint-disable-next-line @next/next/no-img-element -- logo distant, déjà dimensionné */
                    <img
                      src={asset.image}
                      alt=""
                      aria-hidden="true"
                      loading="lazy"
                      className="h-4 w-4 shrink-0 rounded-pill"
                    />
                  ) : (
                    <span
                      className="h-4 w-4 shrink-0 rounded-pill bg-surface-muted"
                      aria-hidden="true"
                    />
                  )}

                  <Link
                    href={asset.href}
                    className="min-w-0 flex-1 truncate text-xs text-ink transition-colors hover:text-brand"
                  >
                    {asset.name}
                    <span className="ml-1.5 text-micro uppercase text-ink-muted">
                      {asset.symbol}
                    </span>
                  </Link>

                  <WatchlistStar
                    key={following ? 'on' : 'off'}
                    assetClass={asset.assetClass}
                    assetId={asset.id}
                    label={asset.name}
                    symbol={asset.symbol}
                    path={asset.href}
                    initialFollowing={following}
                    available={state?.available ?? true}
                  />
                </li>
              )
            })}
          </ul>
        </div>
      ) : null}
    </section>
  )
}
