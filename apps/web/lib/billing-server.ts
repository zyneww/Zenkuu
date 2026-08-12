import { AUTH_ENABLED } from '@/lib/auth'
import { BILLING_ENABLED, PRO_PLAN, type ZenkuuFeature } from '@/lib/billing'

/**
 * Lecture des droits côté SERVEUR — à n'importer QUE depuis un composant serveur.
 *
 * `auth()` lit un contexte attaché à la requête ; appelé depuis un composant client,
 * il n'a rien à lire. Le garde-fou habituel serait `import 'server-only'`, mais ce
 * paquet n'est pas installé et n'est pas fourni par Next.js — l'ajouter pour une
 * seule directive coûterait une dépendance de plus dans un projet qui en compte peu.
 * La règle tient donc dans ce commentaire : côté navigateur, c'est
 * `components/billing/ProGate.tsx` qu'on utilise, pas ce fichier.
 *
 * ── POURQUOI L'IMPORT DYNAMIQUE ───────────────────────────────────────────────
 *
 * Même raison que dans `watchlist-actions.ts` : sans clé Clerk, `proxy.ts` ne monte
 * pas `clerkMiddleware()`, et `auth()` lève dès qu'on l'appelle. Un import STATIQUE
 * chargerait le module avant que la condition soit lue — la garde ne servirait donc
 * à rien. Chargé à la demande, il n'est jamais atteint sur une instance non
 * configurée.
 *
 * ── POURQUOI UNE FONCTION PLUTÔT QUE `has` DIRECTEMENT ────────────────────────
 *
 * Trois états se confondent sans elle : « pas abonné », « pas connecté » et « la
 * facturation n'existe pas sur cette instance ». Les trois donnent `false` chez
 * Clerk mais appellent trois interfaces différentes — proposer l'abonnement, proposer
 * la connexion, ne rien proposer du tout. `getBillingState()` les distingue.
 */

export interface BillingState {
  /** La facturation est-elle configurée ici ? Faux ⇒ ne rien proposer. */
  available: boolean
  /** Une session est-elle ouverte ? */
  signedIn: boolean
  /** L'utilisateur est-il abonné à Zenkuu Pro ? */
  pro: boolean
}

const OFF: BillingState = { available: false, signedIn: false, pro: false }

export async function getBillingState(): Promise<BillingState> {
  if (!AUTH_ENABLED) return OFF

  const { auth } = await import('@clerk/nextjs/server')
  const { userId, has } = await auth()

  return {
    available: BILLING_ENABLED,
    signedIn: Boolean(userId),
    // `has` n'est pas interrogé sans facturation : il renverrait `false` de toute
    // façon, mais l'appeler laisserait croire que la réponse a du sens.
    pro: BILLING_ENABLED && Boolean(userId) && has({ plan: PRO_PLAN }),
  }
}

/**
 * Une fonction précise est-elle ouverte à l'utilisateur courant ?
 *
 * À préférer à `getBillingState().pro` partout où le besoin est une CAPACITÉ et non
 * un palier : le rattachement fonction → plan se règle alors dans le tableau de bord
 * Clerk, sans toucher au code.
 */
export async function hasFeature(feature: ZenkuuFeature): Promise<boolean> {
  if (!BILLING_ENABLED) return false

  const { auth } = await import('@clerk/nextjs/server')
  const { userId, has } = await auth()
  if (!userId) return false

  return has({ feature })
}
