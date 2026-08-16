'use client'

import type { AuthMode } from '@/components/account/AuthOverlay'

/**
 * Fournisseurs proposés, DANS L'ORDRE D'USAGE RÉEL.
 *
 * Google d'abord — c'est, de loin, le compte que le plus grand nombre possède déjà.
 * X ensuite, dont la population recoupe fortement celle d'un site de marchés. Apple
 * ferme la marche et reste INACTIF : son programme développeur coûte 99 dollars par
 * an, et rien ne justifie cette dépense avant que le site ait des utilisateurs.
 *
 * Le bouton est tout de même AFFICHÉ. Le masquer donnerait à croire que la connexion
 * Apple n'est pas prévue, et il faudrait alors réapprendre au visiteur qu'elle existe
 * le jour de son activation. Grisé avec sa mention, il annonce un chemin qui arrive —
 * ce qui est l'état exact des choses (§5).
 */
const PROVIDERS = [
  { id: 'google', label: 'Google' },
  { id: 'x', label: 'X' },
  { id: 'apple', label: 'Apple' },
] as const

/**
 * Boutons de connexion par fournisseur.
 *
 * ── POURQUOI DE VRAIS LIENS ET NON DES BOUTONS ───────────────────────────────
 *
 * Un échange OAuth commence par une NAVIGATION vers le fournisseur : le navigateur
 * doit quitter le site, présenter l'écran d'autorisation, puis revenir. C'est
 * exactement ce que fait un lien, et le faire faire à un bouton demanderait de
 * réimplémenter en JavaScript ce que le navigateur sait déjà faire — en perdant au
 * passage le clic milieu, le menu contextuel et l'affichage de la destination dans la
 * barre d'état.
 *
 * ── L'INTENTION VOYAGE DANS L'URL ────────────────────────────────────────────
 *
 * `mode` suit jusqu'au retour, et il ne sert PAS à décider s'il faut créer un compte :
 * cette décision revient à l'adresse renvoyée par le fournisseur, connue ou non. Il
 * sert au message affiché AU RETOUR — « bienvenue » n'est pas « content de vous
 * revoir », et c'est le genre de détail qui distingue un produit fini.
 */
export function SocialButtons({
  mode,
  /**
   * Fournisseurs dont les identifiants sont RÉELLEMENT renseignés côté serveur.
   *
   * La liste vient du serveur et n'est pas devinée ici : un composant client ne peut
   * pas lire `GOOGLE_CLIENT_ID`, et il ne le doit pas — c'est ce qui garantit qu'un
   * secret d'environnement ne se retrouve jamais dans le paquet envoyé au navigateur.
   *
   * Sans elle, un bouton cliquable menait à une redirection immédiate vers
   * `?connexion=non-configuree` : le visiteur quittait la page pour y revenir avec un
   * message d'erreur, ce qui est la pire façon d'apprendre qu'un chemin n'existe pas.
   * Grisé d'avance, le bouton dit la même chose sans faire perdre le formulaire en
   * cours de saisie.
   */
  configured,
}: {
  mode: AuthMode
  configured: readonly string[]
}) {
  return (
    <div className="space-y-2">
      {PROVIDERS.map((provider) =>
        configured.includes(provider.id) ? (
          <a
            key={provider.id}
            href={`/api/auth/${provider.id}?intention=${mode}`}
            className="flex h-10 w-full items-center justify-center gap-2.5 rounded-control border border-border-subtle bg-surface text-sm font-medium text-ink transition-colors duration-150 hover:border-brand hover:bg-surface-muted"
          >
            <ProviderMark id={provider.id} />
            Continuer avec {provider.label}
          </a>
        ) : (
          <span
            key={provider.id}
            aria-disabled="true"
            className="flex h-10 w-full cursor-default items-center justify-center gap-2.5 rounded-control border border-dashed border-border-subtle text-sm font-medium text-ink-muted/60"
          >
            <ProviderMark id={provider.id} />
            Continuer avec {provider.label}
            <span className="rounded bg-surface-muted px-1.5 py-px text-[0.5625rem] font-semibold uppercase tracking-wide text-ink-muted">
              Bientôt
            </span>
          </span>
        ),
      )}
    </div>
  )
}

/**
 * Logotypes tracés EN LIGNE plutôt que chargés comme images.
 *
 * Trois requêtes réseau pour trois glyphes de vingt pixels seraient trois occasions
 * de voir un bouton s'afficher sans sa marque. Le tracé vectoriel est en outre net à
 * toute densité d'écran, ce qu'un fichier bitmap n'est pas.
 *
 * Google garde ses QUATRE COULEURS officielles : sa charte de marque interdit de le
 * rendre monochrome sur un bouton d'authentification. X et Apple, dont les chartes
 * l'autorisent, suivent `currentColor` et donc le thème du site.
 */
function ProviderMark({ id }: { id: string }) {
  if (id === 'google') {
    return (
      <svg viewBox="0 0 18 18" className="h-4 w-4 shrink-0" aria-hidden="true">
        <path
          fill="#4285F4"
          d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
        />
        <path
          fill="#34A853"
          d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"
        />
        <path
          fill="#FBBC05"
          d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z"
        />
        <path
          fill="#EA4335"
          d="M9 3.58c1.32 0 2.5.46 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
        />
      </svg>
    )
  }

  if (id === 'apple') {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="currentColor" aria-hidden="true">
        <path d="M17.05 12.54c-.03-2.6 2.12-3.85 2.22-3.91-1.21-1.77-3.1-2.01-3.77-2.04-1.6-.16-3.13.94-3.94.94-.81 0-2.07-.92-3.4-.9-1.75.03-3.36 1.02-4.26 2.58-1.81 3.15-.46 7.8 1.3 10.35.86 1.25 1.89 2.65 3.24 2.6 1.3-.05 1.79-.84 3.36-.84 1.57 0 2.01.84 3.38.81 1.4-.02 2.28-1.27 3.13-2.53.99-1.45 1.4-2.86 1.42-2.93-.03-.01-2.72-1.04-2.75-4.13M14.5 4.6c.71-.87 1.2-2.07 1.06-3.27-1.03.04-2.28.69-3.02 1.55-.66.77-1.24 2-1.08 3.18 1.15.09 2.32-.58 3.04-1.46" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="currentColor" aria-hidden="true">
      <path d="M18.9 1.15h3.68l-8.04 9.19 9.46 12.5h-7.41l-5.8-7.58-6.64 7.58H.46l8.6-9.83L0 1.15h7.59l5.24 6.93 6.07-6.93Zm-1.29 19.5h2.04L6.48 3.24H4.29l13.32 17.41Z" />
    </svg>
  )
}
