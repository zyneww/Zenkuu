'use client'

import { useAuth } from '@clerk/nextjs'
import { Sparkles } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import type { ReactNode } from 'react'

import { BILLING_ENABLED, type ZenkuuFeature } from '@/lib/billing'

/**
 * Garde d'abonnement CÔTÉ CLIENT.
 *
 * ── CE QUE CE COMPOSANT N'EST PAS ─────────────────────────────────────────────
 *
 * Ce n'est PAS un contrôle de sécurité. Tout ce qu'il masque est déjà dans le paquet
 * JavaScript envoyé au navigateur, et quiconque ouvre les outils de développement
 * peut le rendre visible. C'est un contrôle d'INTERFACE : il évite de proposer un
 * bouton qui n'aboutirait pas, et il transforme une absence en argument commercial.
 *
 * Toute fonction dont l'ouverture a un coût réel — une donnée qu'on ne veut pas
 * livrer, un appel à une source payante — doit être gardée AUSSI côté serveur, avec
 * `hasFeature()` de `lib/billing-server.ts`. Ici, ce qui est protégé est un traitement
 * local (filtrer, mettre en forme, exporter) : la donnée est déjà chez le lecteur, et
 * la seule chose qui se vend est de ne pas avoir à la retraiter soi-même.
 *
 * ── POURQUOI L'ENVELOPPE ET LE COMPOSANT INTERNE ──────────────────────────────
 *
 * `useAuth()` exige un `<ClerkProvider>` au-dessus de lui et lève sans lui. Or le
 * fournisseur n'est monté que si la clé existe (cf. `AuthProvider`). Un hook appelé
 * inconditionnellement ferait donc tomber la page entière sur une instance non
 * configurée. La condition est lue AVANT tout appel de hook, et le hook vit dans un
 * second composant — même découpage que `AuthButtons`.
 */
export function ProGate({
  feature,
  children,
  fallback,
}: {
  feature: ZenkuuFeature
  children: ReactNode
  /** Rendu à la place du contenu quand le droit manque. Omis ⇒ encart d'abonnement. */
  fallback?: ReactNode
}) {
  // Sans facturation configurée, il n'y a rien à vendre : la fonction est OUVERTE
  // plutôt que masquée. C'est le choix inverse de la prudence habituelle, et il est
  // délibéré — une instance de développement doit pouvoir exercer les écrans Pro, et
  // un site dont la boutique n'existe pas ne peut pas reprocher à un lecteur de ne
  // pas avoir acheté.
  if (!BILLING_ENABLED) return <>{children}</>

  return (
    <ConnectedGate feature={feature} fallback={fallback}>
      {children}
    </ConnectedGate>
  )
}

/**
 * Le droit est-il ouvert ? Variante en HOOK, pour les cas où l'abonnement change une
 * VALEUR et non la présence d'un bloc — un plafond, une profondeur, un nombre de
 * colonnes. `<ProGate>` ne sait qu'afficher ou masquer ; ici on a besoin du booléen.
 *
 * ⚠️ Ce hook appelle `useAuth()` INCONDITIONNELLEMENT — la règle des hooks l'exige.
 * Il ne peut donc être utilisé que sous un `<ClerkProvider>`, c'est-à-dire seulement
 * quand `AUTH_ENABLED` est vrai. Comme `BILLING_ENABLED` implique `AUTH_ENABLED` (cf.
 * `lib/billing.ts`), le court-circuit ci-dessous suffit à le garantir : sans
 * facturation, `useAuth()` n'est jamais atteint.
 *
 * Il renvoie `true` sans facturation configurée, pour la même raison que `<ProGate>` :
 * un site dont la boutique n'existe pas ne rationne personne.
 */
export function useFeature(feature: ZenkuuFeature): boolean {
  if (!BILLING_ENABLED) return true
  // `BILLING_ENABLED` est une constante figée à la compilation : la branche prise
  // ne change jamais d'un rendu à l'autre, l'ordre des hooks est donc stable.
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useConnectedFeature(feature)
}

function useConnectedFeature(feature: ZenkuuFeature): boolean {
  const { has, isLoaded } = useAuth()
  // Avant résolution, on répond `false` : afficher un plafond d'abonné puis le voir
  // retomber serait pire que l'inverse, qui se contente de s'élargir.
  if (!isLoaded) return false
  return has?.({ feature }) ?? false
}

function ConnectedGate({
  feature,
  children,
  fallback,
}: {
  feature: ZenkuuFeature
  children: ReactNode
  fallback?: ReactNode
}) {
  const { has, isLoaded } = useAuth()

  // Tant que la session n'est pas résolue, on ne rend NI le contenu NI l'encart. Les
  // deux seraient faux la moitié du temps, et le second est particulièrement pénible :
  // un abonné verrait une invitation à s'abonner clignoter à chaque chargement.
  if (!isLoaded) return null

  if (has?.({ feature })) return <>{children}</>

  return <>{fallback ?? <UpgradeCallout />}</>
}

/**
 * Encart d'abonnement.
 *
 * Le ton est celui du reste du site : on décrit ce que la fonction fait, pas ce que
 * le lecteur rate. Un encart qui culpabilise se lit comme une régie publicitaire — et
 * ZENKUU vend précisément l'absence de celle-ci.
 */
export function UpgradeCallout({
  title = 'Réservé à Zenkuu Pro',
  description = 'Cette fonction fait partie de l’offre Pro. Le reste du site, lui, ne bouge pas.',
  compact = false,
}: {
  title?: string
  description?: string
  compact?: boolean
}) {
  return (
    <div
      className={`flex flex-wrap items-center gap-3 rounded-card border border-border-subtle bg-surface ${
        compact ? 'px-3 py-2.5' : 'p-5'
      }`}
    >
      <Sparkles
        className={`shrink-0 text-accent-strong ${compact ? 'h-4 w-4' : 'h-5 w-5'}`}
        aria-hidden="true"
      />

      <div className="min-w-0 flex-1">
        <p className={`font-medium text-ink ${compact ? 'text-xs' : 'text-sm'}`}>{title}</p>
        {compact ? null : (
          <p className="mt-1 text-sm leading-relaxed text-ink-muted">{description}</p>
        )}
      </div>

      <Link
        href="/tarifs"
        className={`inline-flex shrink-0 items-center bg-brand font-medium text-on-brand transition-colors duration-150 hover:bg-brand-strong ${
          compact ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm'
        }`}
      >
        Voir l’offre
      </Link>
    </div>
  )
}
