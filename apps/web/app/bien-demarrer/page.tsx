import type { Metadata } from 'next'
import Link from 'next/link'

import { fr } from '@/content/fr'

export const metadata: Metadata = {
  title: fr.pages.getStarted,
  description:
    'Prendre en main ZENITH en quelques minutes : trouver un actif, lire sa fiche, changer de devise et comprendre les limites des données affichées.',
  alternates: { canonical: '/bien-demarrer' },
}

/**
 * Parcours d'entrée.
 *
 * Chaque étape renvoie vers une page RÉELLE du site, jamais vers une fonctionnalité
 * à venir. Un guide de démarrage qui promet des écrans inexistants est pire qu'une
 * absence de guide : il fait douter de tout le reste.
 */

const STEPS = [
  {
    title: 'Trouver un actif',
    body: 'La loupe de l’en-tête cherche simultanément dans toutes les classes d’actifs. Tapez un nom ou un symbole — « Bitcoin », « BTC », « CAC » — et le résultat mène directement à la fiche.',
    href: '/crypto',
    linkLabel: 'Parcourir le classement crypto',
  },
  {
    title: 'Lire une fiche',
    body: 'Une fiche réunit le cours, ses variations, un graphique et les statistiques de marché. Les onglets remplacent le contenu sur place : vous ne perdez jamais l’en-tête de prix de vue.',
    href: '/crypto/bitcoin',
    linkLabel: 'Voir une fiche d’exemple',
  },
  {
    title: 'Choisir une représentation graphique',
    body: 'Aire, ligne, chandeliers, barres ou écart, avec volume, moyenne mobile et extrêmes en option. Les vues indisponibles pour une source donnée sont retirées du sélecteur plutôt que laissées inertes.',
    href: '/apprendre/lire-des-chandeliers',
    linkLabel: 'Comprendre les chandeliers',
  },
  {
    title: 'Régler langue et devise',
    body: 'Le sélecteur en forme de globe, dans l’en-tête, fixe la devise d’affichage pour tout le site. Les montants convertis affichent la devise d’origine et la date du taux appliqué.',
    href: '/aide/devise-affichage',
    linkLabel: 'En savoir plus sur les conversions',
  },
  {
    title: 'Savoir ce que les chiffres ne disent pas',
    body: 'Les données ne sont pas en temps réel, certaines valeurs sont indisponibles chez certaines sources, et rien ici n’est un conseil. Ces limites sont documentées plutôt que dissimulées.',
    href: '/methodologie',
    linkLabel: 'Lire la méthodologie',
  },
]

export default function BienDemarrerPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 py-6">
      <header className="space-y-3">
        <h1 className="display-lg text-ink">Bien démarrer</h1>
        <p className="text-base leading-relaxed text-ink-muted">
          Cinq étapes pour prendre en main ZENITH. Aucune ne demande de compte : tout
          ce qui suit est accessible sans inscription.
        </p>
      </header>

      <ol className="space-y-4">
        {STEPS.map((step, index) => (
          <li
            key={step.title}
            className="flex gap-4 rounded-card border border-border-subtle bg-surface p-4"
          >
            <span
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-soft text-sm font-semibold text-brand-strong"
              aria-hidden="true"
            >
              {index + 1}
            </span>
            <div className="space-y-1.5">
              <h2 className="text-sm font-semibold text-ink">{step.title}</h2>
              <p className="text-sm leading-relaxed text-ink-muted">{step.body}</p>
              <Link href={step.href} className="inline-block text-xs text-brand-strong hover:underline">
                {step.linkLabel} →
              </Link>
            </div>
          </li>
        ))}
      </ol>

      <p className="rounded-card bg-surface-muted px-4 py-3 text-xs leading-relaxed text-ink-muted">
        ZENITH est une plateforme d’information en lecture seule. Aucune de ces étapes
        ne mène à un achat, une vente ou une connexion à un portefeuille — le site n’en
        propose pas.
      </p>
    </div>
  )
}
