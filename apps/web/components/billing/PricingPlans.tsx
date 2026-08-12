'use client'

import { PricingTable } from '@clerk/nextjs'

import { BILLING_ENABLED } from '@/lib/billing'

/**
 * Tiroir de paiement de Clerk, monté CONDITIONNELLEMENT.
 *
 * `<PricingTable />` lève `cannot_render_billing_disabled` en développement quand la
 * facturation n'est pas activée côté tableau de bord, et se rend VIDE en production —
 * soit un grand blanc au milieu de la page de tarifs, sans le moindre indice de la
 * cause. On préfère dire ce qui manque.
 *
 * Le composant ne reçoit aucun `appearance` : les variables ZENKUU (couleur de marque,
 * rayon nul, police) sont déjà posées sur `<ClerkProvider>` et en héritent. En
 * ajouter ici ferait un second endroit à tenir à jour pour le même résultat.
 *
 * Pas de `for="organization"` : ZENKUU s'adresse à des lecteurs individuels. Le jour
 * où une offre équipe apparaîtrait, c'est une seconde table qu'il faudrait, pas un
 * paramètre sur celle-ci — les plans d'organisation vivent dans un autre onglet du
 * tableau de bord.
 */
export function PricingPlans() {
  if (!BILLING_ENABLED) {
    return (
      <div className="rounded-card border border-border-subtle bg-surface p-5">
        <p className="text-sm leading-relaxed text-ink-muted">
          La facturation n’est pas configurée sur cette instance : l’abonnement ne peut
          pas être souscrit ici. Les offres décrites ci-dessus restent la référence.
        </p>
      </div>
    )
  }

  return <PricingTable />
}
