'use client'

import { Badge } from '@/components/ui/badge'
import { AppleLogo, GoogleLogo, XLogo } from '@/components/account/social-logos'
import { Button } from '@/components/ui/button'
import type { AuthMode } from '@/components/account/auth-mode'
import { usePhrase } from '@/components/locale/ContentProvider'

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
 *

 * Le logotype est porté par la table plutôt que choisi par un `switch` : ajouter un
 * fournisseur revient alors à ajouter une ligne, et il devient impossible d'en
 * déclarer un sans lui donner d'icône. Voir `social-logos.tsx` pour la raison pour
 * laquelle ces trois tracés vivent dans le dépôt.
 */
const PROVIDERS = [
  { id: 'google', label: 'Google', Logo: GoogleLogo },
  { id: 'x', label: 'X', Logo: XLogo },
  { id: 'apple', label: 'Apple', Logo: AppleLogo },
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
 * barre d'état. `Button asChild` prête ses classes à un `<a>` ordinaire : le dessin
 * vient de shadcn/ui, la balise reste celle que la navigation exige.
 *
 * ⚠️ UN `<a>` SANS `href` N'EST PAS DÉSACTIVÉ. C'est le piège du fournisseur non
 * configuré : il sort de l'ordre de tabulation sans l'annoncer, et reste annoncé
 * comme un lien par la synthèse vocale. Le bouton indisponible rend donc un vrai
 * `<button disabled>` — non cliquable, ANNONCÉ indisponible, et toujours lisible.
 *

 * ── UN SEUL DESSIN DE BOUTON, TROIS LOGOTYPES ───────────────────────────────
 *
 * `variant="outline"` pour les trois : un fond uniforme, et le logotype comme seule
 * différence. C'est le seul traitement qui respecte les trois chartes à la fois —
 * peindre chaque bouton aux couleurs de sa marque donnerait un bouton Apple et un
 * bouton X noirs à côté d'un bouton Google blanc, sur une page dont le fond change
 * déjà avec le thème du site. Google garde en revanche ses quatre couleurs dans son
 * logotype, ce que sa charte impose sur un bouton d'authentification.
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
  const t = usePhrase()

  return (
    <div className="space-y-2">
      {PROVIDERS.map(({ id, label, Logo }) => {
        const ready = configured.includes(id)

        /* Le contenu est identique dans les deux branches : seule la BALISE change,
           et l'écrire deux fois ferait diverger les deux états au premier ajustement. */
        /* ⚠️ CES DEUX TEXTES NE PASSAIENT PAS PAR LE TRADUCTEUR : « Continuer avec
           Google » et « Bientôt » s'affichaient en français dans les treize langues.
           Le nom du fournisseur, lui, ne se traduit pas — Google s'appelle Google
           partout — d'où la césure entre la phrase et l'étiquette. */
        const inner = (
          <>
            <Logo className="size-5" />
            {t('Continuer avec')} {label}
            {ready ? null : (
              <Badge variant="secondary" className="rounded-full px-2 py-0 text-[0.625rem] font-medium">
                {t('Bientôt')}
              </Badge>
            )}
          </>
        )

        if (!ready) {
          return (
            <Button key={id} variant="outline" size="lg" disabled className="w-full justify-start">
              {inner}
            </Button>
          )
        }

        return (
          <Button key={id} asChild variant="outline" size="lg" className="w-full justify-start">
            <a href={`/api/auth/${id}?intention=${mode}`}>{inner}</a>
          </Button>
        )
      })}
    </div>
  )
}
