import type { Metadata } from 'next'
import Link from 'next/link'

import { listWatchlist } from '@zenith/db'
import { EmptyState } from '@zenith/ui'

import { AUTH_ENABLED } from '@/lib/auth'
import { assetHref } from '@/lib/asset-routes'
import type { AssetClass } from '@zenith/data'

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
              className="inline-block rounded-card bg-brand-strong px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-ink"
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
              className="inline-block rounded-card bg-brand-strong px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-ink"
            >
              Parcourir les cryptomonnaies
            </Link>
          }
        />
      </Shell>
    )
  }

  return (
    <Shell>
      <ul className="space-y-2">
        {result.data.map((item) => (
          <li key={item.id}>
            <Link
              href={assetHref(item.assetClass as AssetClass, item.assetId)}
              className="flex items-center justify-between rounded-card border border-border-subtle bg-surface px-4 py-3 transition-colors hover:border-brand"
            >
              <span className="text-sm font-medium text-ink">
                {item.label}
                {item.symbol ? (
                  <span className="ml-1.5 text-xs uppercase text-ink-muted">{item.symbol}</span>
                ) : null}
              </span>
              <span className="text-xs text-ink-muted">Voir la fiche →</span>
            </Link>
          </li>
        ))}
      </ul>
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
      className="inline-block rounded-card bg-brand-strong px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-ink"
    >
      Retour à l’accueil
    </Link>
  )
}
