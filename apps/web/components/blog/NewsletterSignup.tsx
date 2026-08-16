import { Rss } from 'lucide-react'
import { Link } from '@/i18n/navigation'

/**
 * Inscription à l'infolettre — VOLONTAIREMENT INACTIVE.
 *
 * Deux voies étaient possibles, et les deux ont été écartées : un formulaire qui
 * collecte réellement stockerait des adresses personnelles sans finalité, ce qui pose
 * un problème juridique autant que moral ; un formulaire qui fait semblant d'accepter
 * est un mensonge à l'utilisateur.
 *
 * Reste celle-ci : le champ est visible, `disabled`, et la raison est écrite en clair
 * juste dessous. Le lecteur voit ce qui est prévu, comprend pourquoi ce n'est pas
 * disponible, et repart avec une alternative qui FONCTIONNE — le flux RSS, mis en
 * avant à côté et non relégué en note de bas de page.
 *
 * ⚠️ LA RAISON AFFICHÉE A ÉTÉ CORRIGÉE, et l'ancienne mérite d'être citée : elle
 * disait « l'envoi d'e-mails n'est pas configuré sur cette instance ». C'était vrai
 * quand elle a été écrite, et ça ne l'est plus : le site envoie désormais des alertes
 * de prix et des codes de connexion par courriel. Le message affirmait donc quelque
 * chose de faux à côté de deux fonctions qui prouvaient le contraire.
 *
 * Ce qui manque n'a jamais été l'expéditeur : c'est une LISTE d'abonnés, un registre
 * de consentements et une procédure de désinscription. Le texte le dit maintenant.
 *
 * `disabled` sur l'input ET sur le bouton : désactiver le seul bouton laisserait
 * saisir une adresse pour rien, ce qui est la plus frustrante des deux moitiés.
 */
export function NewsletterSignup() {
  return (
    <section
      aria-labelledby="infolettre-titre"
      className="rounded-card border border-border-subtle bg-surface-muted p-6 sm:p-8"
    >
      <div className="grid gap-6 sm:grid-cols-2 sm:items-start">
        <div className="space-y-2">
          <h2 id="infolettre-titre" className="display-sm text-ink">
            Suivre les publications
          </h2>
          <p className="text-sm leading-relaxed text-ink-muted">
            Les nouveaux articles paraîtront ici. Deux façons de ne pas les manquer —
            l’une disponible tout de suite, l’autre à venir.
          </p>
        </div>

        <div className="space-y-5">
          <div className="space-y-2">
            <Link
              href="/blog/rss.xml"
              className="inline-flex items-center gap-2 rounded-control bg-brand px-4 py-2.5 text-sm font-medium text-on-brand transition-colors hover:bg-brand-strong"
            >
              <Rss className="h-4 w-4" aria-hidden="true" />
              Flux RSS
            </Link>
            <p className="text-xs leading-relaxed text-ink-muted">
              Fonctionne dès maintenant, dans n’importe quel lecteur de flux.
            </p>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="infolettre-email"
              className="block text-xs font-medium text-ink"
            >
              Par courriel
            </label>
            <div className="flex gap-2">
              <input
                id="infolettre-email"
                type="email"
                disabled
                placeholder="vous@exemple.fr"
                aria-describedby="infolettre-indisponible"
                className="min-w-0 flex-1 cursor-not-allowed rounded-card border border-border-subtle bg-surface px-3 py-2 text-sm text-ink-muted placeholder:text-ink-muted/60"
              />
              <button
                type="button"
                disabled
                aria-describedby="infolettre-indisponible"
                className="shrink-0 cursor-not-allowed rounded-card border border-border-subtle px-4 py-2 text-sm font-medium text-ink-muted"
              >
                S’inscrire
              </button>
            </div>
            <p id="infolettre-indisponible" className="text-xs leading-relaxed text-ink-muted">
              Pas encore ouverte : une infolettre suppose une liste d’abonnés, un
              registre de consentements et un lien de désinscription, qui n’existent pas
              ici. Aucune adresse n’est collectée en attendant.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
