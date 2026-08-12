'use client'

import { useAuth } from '@clerk/nextjs'
import { Link } from '@/i18n/navigation'

import { PricingPlans } from '@/components/billing/PricingPlans'
import { AUTH_ENABLED } from '@/lib/auth'
import {
  BILLING_ENABLED,
  FREE_ALERT_LIMIT,
  FREE_COMPARE_LIMIT,
  FREE_WATCHLIST_LIMIT,
  PRO_ALERT_LIMIT,
  PRO_COMPARE_LIMIT,
  PRO_PLAN,
} from '@/lib/billing'

/**
 * Rubrique « Abonnement ».
 *
 * ── POURQUOI UNE RUBRIQUE À PART, PUISQUE CLERK EN A DÉJÀ UNE ─────────────────
 *
 * `<UserProfile />` expose sa propre page de facturation dès que Billing est activé.
 * Elle reste accessible, et on ne la masque pas : c'est elle qui porte les factures et
 * les moyens de paiement, qu'on ne réécrira pas. Ce qu'elle ne sait pas faire, c'est
 * dire ce que l'abonnement CHANGE sur ce site précis — le plafond de la liste de
 * suivi, les filtres du screener, l'export. Cette rubrique-là parle de ZENKUU ; celle
 * de Clerk parle d'argent.
 *
 * Elle suit la même règle que les autres rubriques de `/parametres` : elle existe
 * réellement ou elle n'apparaît pas. Sans facturation configurée, elle dit ce qui
 * manque plutôt que d'annoncer « bientôt ».
 */
export function SettingsSubscription() {
  if (!AUTH_ENABLED || !BILLING_ENABLED) {
    return (
      <Shell>
        <p className="text-sm leading-relaxed text-ink-muted">
          L’abonnement n’est pas configuré sur cette instance. Toutes les fonctions du
          site sont donc ouvertes, sans limite ni contrepartie.
        </p>
      </Shell>
    )
  }

  return <ConnectedSubscription />
}

function ConnectedSubscription() {
  const { isLoaded, isSignedIn, has } = useAuth()

  if (!isLoaded) {
    return (
      <Shell>
        <p className="text-sm text-ink-muted">Chargement…</p>
      </Shell>
    )
  }

  if (!isSignedIn) {
    return (
      <Shell>
        <p className="text-sm leading-relaxed text-ink-muted">
          Connectez-vous pour voir votre offre et la modifier.
        </p>
        <Link
          href="/connexion"
          className="mt-4 inline-block bg-brand px-5 py-2.5 text-sm font-medium text-on-brand transition-colors duration-150 hover:bg-brand-strong"
        >
          Se connecter
        </Link>
      </Shell>
    )
  }

  const pro = has?.({ plan: PRO_PLAN }) ?? false

  return (
    <section className="space-y-5" aria-labelledby="abonnement-titre">
      <div className="space-y-1">
        <h2 id="abonnement-titre" className="display-sm text-ink">
          Abonnement
        </h2>
        <p className="text-sm text-ink-muted">
          Votre offre, et ce qu’elle change sur le site.
        </p>
      </div>

      <div className="rounded-card border border-border-subtle p-5">
        <p className="text-sm text-ink">
          Offre actuelle :{' '}
          <strong className="font-medium">{pro ? 'Zenkuu Pro' : 'Gratuite'}</strong>
        </p>

        <ul className="mt-3 space-y-1.5 text-sm text-ink-muted">
          <li>
            Listes de suivi :{' '}
            {pro
              ? 'multiples et sans limite d’actifs'
              : `une seule, jusqu’à ${FREE_WATCHLIST_LIMIT} actifs`}
          </li>
          <li>
            Alertes de prix :{' '}
            <span className="tabular">{pro ? PRO_ALERT_LIMIT : FREE_ALERT_LIMIT}</span> armées
            simultanément
          </li>
          <li>
            Comparateur :{' '}
            <span className="tabular">{pro ? PRO_COMPARE_LIMIT : FREE_COMPARE_LIMIT}</span> actifs
            côte à côte
          </li>
          <li>Filtres avancés du screener : {pro ? 'ouverts' : 'réservés à Pro'}</li>
          <li>Écrans de screener enregistrés : {pro ? 'ouverts' : 'réservés à Pro'}</li>
          <li>
            Export des tableaux (CSV, Excel, JSON, Markdown) :{' '}
            {pro ? 'ouvert' : 'réservé à Pro'}
          </li>
        </ul>

        {pro ? (
          <p className="mt-4 text-xs leading-relaxed text-ink-muted">
            Factures, moyen de paiement et résiliation se trouvent dans la rubrique{' '}
            <Link href="/parametres?rubrique=compte" className="text-brand hover:text-brand-strong">
              Compte
            </Link>
            , page « Facturation ».
          </p>
        ) : null}
      </div>

      {/*
        La table est rendue dans les DEUX cas. Pour un abonné, Clerk y affiche son plan
        courant et y propose la résiliation : la masquer obligerait à sortir des
        paramètres pour un geste qui a sa place ici.
      */}
      <PricingPlans />
    </section>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <section className="space-y-4" aria-labelledby="abonnement-titre">
      <div className="space-y-1">
        <h2 id="abonnement-titre" className="display-sm text-ink">
          Abonnement
        </h2>
      </div>
      <div className="rounded-card border border-border-subtle p-6">{children}</div>
    </section>
  )
}
