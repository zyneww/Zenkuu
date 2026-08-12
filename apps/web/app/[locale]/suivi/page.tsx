import type { Metadata } from 'next'
import { Link } from '@/i18n/navigation'

import { listWatchlist } from '@zenkuu/db'
import { EmptyState } from '@zenkuu/ui'

import {
  WatchlistBoard,
  type BoardItem,
  type BoardList,
} from '@/components/watchlist/WatchlistBoard'
import { AUTH_ENABLED } from '@/lib/auth'
import { assetHref } from '@/lib/asset-routes'
import { FEATURES, FREE_WATCHLIST_COUNT, FREE_WATCHLIST_LIMIT } from '@/lib/billing'
import { hasFeature } from '@/lib/billing-server'
import type { AssetClass } from '@zenkuu/data'

export const metadata: Metadata = {
  title: 'Ma liste de suivi',
  // Page strictement personnelle : rien à indexer, et son contenu diffère pour
  // chaque visiteur.
  robots: { index: false, follow: false },
}

/**
 * Liste de suivi persistée.
 *
 * Elle n'affiche AUCUN cours. Les libellés viennent de la base ; les chiffres, eux,
 * restent sur les fiches. Afficher trente cours ici coûterait trente appels externes
 * à chaque chargement, très au-delà du quota mesuré — et un prix mis en cache en
 * base serait périmé dès la minute suivante (§5).
 */
export default async function SuiviPage() {
  if (!AUTH_ENABLED) {
    return (
      <Shell>
        <EmptyState
          title="Comptes non configurés"
          description="L’authentification n’est pas activée sur cette instance : les listes de suivi ne peuvent pas être conservées."
          action={<HomeLink />}
        />
      </Shell>
    )
  }

  const { auth } = await import('@clerk/nextjs/server')
  const { userId } = await auth()

  if (!userId) {
    return (
      <Shell>
        <EmptyState
          title="Connectez-vous pour retrouver votre liste"
          description="Votre liste de suivi est rattachée à votre compte, ce qui permet de la retrouver depuis n’importe quel appareil."
          action={
            <Link
              href="/connexion"
              className="inline-block rounded-card bg-brand px-5 py-2.5 text-sm font-medium text-on-brand transition-colors hover:bg-brand-strong"
            >
              Se connecter
            </Link>
          }
        />
      </Shell>
    )
  }

  const result = await listWatchlist(userId)

  if (!result.ok) {
    return (
      <Shell>
        <EmptyState
          title="Liste de suivi indisponible"
          description={result.reason}
          action={<HomeLink />}
        />
      </Shell>
    )
  }

  if (result.data.length === 0) {
    return (
      <Shell>
        <EmptyState
          title="Aucun actif suivi"
          description="Ouvrez la fiche d’un actif et utilisez le bouton « Suivre » pour l’ajouter ici."
          action={
            <Link
              href="/crypto"
              className="inline-block rounded-card bg-brand px-5 py-2.5 text-sm font-medium text-on-brand transition-colors hover:bg-brand-strong"
            >
              Parcourir les cryptomonnaies
            </Link>
          }
        />
      </Shell>
    )
  }

  const unlimited = await hasFeature(FEATURES.unlimitedWatchlist)

  /*
   * Compteur de plafond, affiché SEULEMENT quand la liste s'en approche.
   *
   * Une jauge « 2 / 30 » permanente transformerait la page en rappel d'abonnement à
   * chaque visite, pour une contrainte que le lecteur ne rencontrera peut-être jamais.
   * Le seuil des cinq derniers créneaux est le moment où l'information devient utile
   * plutôt qu'insistante — assez tôt pour ne pas être une surprise, assez tard pour ne
   * pas être du bruit.
   */
  const nearCap = !unlimited && result.data.length >= FREE_WATCHLIST_LIMIT - 5

  const dateFormat = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short' })

  /*
   * Regroupement par liste, fait ICI plutôt qu'en base.
   *
   * Une requête par liste multiplierait les allers-retours pour un jeu de données
   * qu'une seule requête ramène déjà en entier — et dont la taille est bornée par le
   * plafond de l'offre. L'ordre des listes suit celui de leur activité, la plus
   * récemment enrichie en tête.
   */
  const grouped = new Map<string, BoardItem[]>()
  for (const item of result.data) {
    const bucket = grouped.get(item.listName)
    const row: BoardItem = {
      href: assetHref(item.assetClass as AssetClass, item.assetId),
      label: item.label,
      symbol: item.symbol,
      assetClass: item.assetClass,
      assetId: item.assetId,
      addedAt: dateFormat.format(item.createdAt),
    }
    if (bucket) bucket.push(row)
    else grouped.set(item.listName, [row])
  }

  const lists: BoardList[] = [...grouped].map(([name, items]) => ({ name, items }))

  return (
    <Shell>
      {nearCap ? (
        <p className="rounded-card border border-border-subtle bg-surface px-4 py-3 text-sm text-ink-muted">
          <span className="tabular text-ink">
            {result.data.length} / {FREE_WATCHLIST_LIMIT}
          </span>{' '}
          actifs suivis dans l’offre gratuite.{' '}
          <Link href="/tarifs" className="text-brand hover:text-brand-strong">
            Zenkuu Pro lève le plafond et permet plusieurs listes
          </Link>
          .
        </p>
      ) : null}

      <WatchlistBoard
        lists={lists}
        canCreateList={unlimited || lists.length < FREE_WATCHLIST_COUNT}
      />
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-2xl space-y-6 py-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-ink">Ma liste de suivi</h1>
        <p className="text-sm leading-relaxed text-ink-muted">
          Les actifs que vous suivez. Les cours ne sont pas repris ici : ils vivent sur
          les fiches, où ils sont toujours à jour.
        </p>
      </header>
      {children}
    </div>
  )
}

function HomeLink() {
  return (
    <Link
      href="/"
      className="inline-block rounded-card bg-brand px-5 py-2.5 text-sm font-medium text-on-brand transition-colors hover:bg-brand-strong"
    >
      Retour à l’accueil
    </Link>
  )
}
