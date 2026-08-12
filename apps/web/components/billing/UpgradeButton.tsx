'use client'

import { Crown } from 'lucide-react'
import { useAuth } from '@clerk/nextjs'
import { Link } from '@/i18n/navigation'

import { BILLING_ENABLED, PRO_PLAN } from '@/lib/billing'

/**
 * Bouton « Zenkuu Pro » de l'en-tête — affiché aux seuls NON-abonnés.
 *
 * ── IL DISPARAÎT PLUTÔT QU'IL NE SE GRISE ─────────────────────────────────────
 *
 * Un abonné ne voit rien ici. C'est la seule règle qui compte pour ce composant :
 * proposer de souscrire à quelqu'un qui a déjà payé est le défaut le plus agaçant
 * qu'une barre d'en-tête puisse avoir, et il se remarque à chaque page.
 *
 * ── ET IL DISPARAÎT AUSSI SANS BOUTIQUE ───────────────────────────────────────
 *
 * Sans facturation configurée, `<ProGate>` OUVRE les fonctions plutôt que de les
 * masquer (voir son en-tête). La cohérence l'exige ici : un site dont la boutique
 * n'existe pas ne peut pas afficher un bouton d'achat qui ne mènerait qu'à une page
 * de tarifs sans tarifs.
 *
 * ── LE PLAN, PAS LA FONCTION ──────────────────────────────────────────────────
 *
 * `has({ plan })` et non `has({ feature })`, contrairement au reste du code. La
 * distinction est la même que pour la pastille du menu de compte : il ne s'agit pas
 * d'ouvrir un droit mais de savoir si l'offre est déjà souscrite. Un bouton qui
 * s'effacerait parce qu'une fonction isolée est ouverte cacherait l'offre à qui ne
 * l'a pas.
 */
export function UpgradeButton() {
  // Lue AVANT tout appel de hook : `useAuth()` lève sans `<ClerkProvider>`, et le
  // fournisseur n'est monté que si Clerk est configuré. Même découpage que `ProGate`.
  if (!BILLING_ENABLED) return null
  return <ConnectedUpgradeButton />
}

function ConnectedUpgradeButton() {
  const { isLoaded, has } = useAuth()

  // Avant résolution, on ne rend RIEN plutôt que le bouton : un abonné le verrait
  // apparaître puis disparaître à chaque chargement de page, et l'en-tête sauterait
  // avec lui. L'inverse — attendre pour l'afficher — ne coûte qu'un délai imperceptible.
  if (!isLoaded) return null
  if (has?.({ plan: PRO_PLAN })) return null

  return (
    <Link
      href="/tarifs"
      className="hidden shrink-0 items-center gap-1.5 whitespace-nowrap rounded-control bg-accent-soft px-3 py-1.5 text-xs font-semibold text-accent-strong transition-colors duration-150 hover:bg-accent hover:text-canvas sm:inline-flex"
    >
      <Crown className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      Zenkuu Pro
    </Link>
  )
}
