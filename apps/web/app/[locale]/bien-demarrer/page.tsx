import type { Metadata } from 'next'
import { Link, type AppHref } from '@/i18n/navigation'

import { getContent, getSeo } from '@/lib/content'
import { getPhrase } from '@/lib/content'
import { pageAlternates } from '@/lib/site'

/**
 * Métadonnées DÉRIVÉES DE LA LANGUE, d'où la fonction plutôt que la constante.
 *
 * Un `export const metadata` est évalué une fois au chargement du module : il ne
 * peut pas connaître la locale de la requête, et servait donc un titre français sur
 * les pages anglaises.
 */
export async function generateMetadata(): Promise<Metadata> {
  const fr = await getContent()
  const seo = await getSeo()
  return {
  title: fr.pages.getStarted,
  description: seo(
    '/bien-demarrer',
    'Prendre en main ZENKUU en quelques minutes : trouver un actif, lire sa fiche, changer de devise et comprendre les limites des données affichées.',
  ),
  alternates: await pageAlternates('/bien-demarrer'),
  }
}

/**
 * Parcours d'entrée.
 *
 * Chaque étape renvoie vers une page RÉELLE du site, jamais vers une fonctionnalité
 * à venir. Un guide de démarrage qui promet des écrans inexistants est pire qu'une
 * absence de guide : il fait douter de tout le reste.
 */

const STEPS: readonly {
  title: string
  body: string
  href: AppHref
  linkLabel: string
}[] = [
  {
    title: 'Trouver un actif',
    body: 'La loupe de l’en-tête cherche simultanément dans toutes les classes d’actifs. Tapez un nom ou un symbole — « Bitcoin », « BTC », « CAC » — et le résultat mène directement à la fiche.',
    href: '/crypto',
    linkLabel: 'Parcourir le classement crypto',
  },
  {
    title: 'Lire une fiche',
    body: 'Une fiche réunit le cours, ses variations, un graphique et les statistiques de marché. Les onglets remplacent le contenu sur place : vous ne perdez jamais l’en-tête de prix de vue.',
    href: { pathname: '/crypto/[id]', params: { id: 'bitcoin' } },
    linkLabel: 'Voir une fiche d’exemple',
  },
  {
    title: 'Régler langue et devise',
    body: 'Le sélecteur en forme de globe, dans l’en-tête, fixe la devise d’affichage pour tout le site. Les montants convertis affichent la devise d’origine et la date du taux appliqué.',
    href: { pathname: '/aide/[slug]', params: { slug: 'devise-affichage' } },
    linkLabel: 'En savoir plus sur les conversions',
  },
  {
    title: 'Savoir ce que les chiffres ne disent pas',
    body: 'Les données ne sont pas en temps réel, certaines valeurs sont indisponibles chez certaines sources, et rien ici n’est un conseil. Ces limites sont documentées plutôt que dissimulées.',
    href: '/a-propos',
    linkLabel: 'Nos limites, écrites',
  },
]

export default async function BienDemarrerPage() {
  const t = await getPhrase()
  return (
    <div className="mx-auto max-w-5xl space-y-6 py-6">
      {/* Fil d'Ariane, comme sur la référence : cette page est une FEUILLE du centre
          d'aide, pas une page racine. Le dire en tête évite qu'on la quitte par le
          logo faute de savoir d'où elle dépend. */}
      {/* La rangée passe en `flex` et le lien en élément de boîte : le plancher tactile
          de globals.css repose sur `min-height`, sans effet sur une boîte en ligne. Un
          fil d'Ariane est le premier recours de qui s'est perdu — il ne peut pas être la
          cible la plus difficile de la page. */}
      <nav
        aria-label={t('Fil d’Ariane')}
        className="flex items-center text-xs text-ink-muted"
      >
        <Link href="/aide" className="inline-flex items-center transition-colors hover:text-ink">{t('Centre d’aide')}</Link>
        <span className="mx-1.5" aria-hidden="true">
          /
        </span>
        <span className="text-ink">{t('Bien démarrer')}</span>
      </nav>

      <header className="space-y-3">
        <h1 className="display-xl text-ink">{t('Bien démarrer')}</h1>
        <p className="max-w-2xl text-base leading-relaxed text-ink-muted">{t('Cinq étapes pour prendre en main ZENKUU. Aucune ne demande de compte : tout ce qui suit est accessible sans inscription.')}</p>
      </header>

      {/*
        ── DEUX COLONNES : SOMMAIRE À GAUCHE, ÉTAPES À DROITE ────────────────────

        Structure d'okx.com/help/section/faq-getting-started. Le sommaire n'est pas
        décoratif sur une page à cinq sections : il transforme une liste qu'on
        DESCEND en un plan qu'on ATTAQUE par le milieu — et c'est exactement ce que
        fait quelqu'un qui revient pour une seule des cinq étapes.

        Il est COLLANT sur grand écran, et posé sous l'en-tête de site (`top-20`,
        soit la hauteur de la barre). Un sommaire qui défile avec le contenu cesse
        d'être un sommaire au moment précis où l'on en a besoin.

        Les ancres sont dérivées de l'index et non du titre : un slug calculé depuis
        un intitulé français casse dès qu'on corrige une faute dans ce titre, et le
        lien partagé la veille tombe dans le vide.
      */}
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,14rem)_minmax(0,1fr)]">
        <nav
          aria-label={t('Sommaire')}
          className="rounded-card border border-border-subtle bg-surface p-3 lg:sticky lg:top-20"
        >
          <p className="mb-2 px-1 text-micro font-semibold text-ink-muted">{t('Les cinq étapes')}</p>
          <ol className="space-y-0.5">
            {STEPS.map((step, index) => (
              <li key={t(step.title)}>
                <a
                  href={`#etape-${index + 1}`}
                  className="flex items-baseline gap-2 rounded-control px-2 py-1.5 text-xs text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
                >
                  <span className="tabular shrink-0 text-micro">{index + 1}</span>
                  <span>{t(step.title)}</span>
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="min-w-0 space-y-4">
          <ol className="space-y-4">
            {STEPS.map((step, index) => (
              <li
                key={t(step.title)}
                id={`etape-${index + 1}`}
                /* `scroll-mt-24` : sans lui, une ancre place le haut de l'étape
                   exactement sous l'en-tête collant, qui en recouvre le titre. */
                className="flex scroll-mt-24 gap-4 rounded-card border border-border-subtle bg-surface p-5"
              >
                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-pill bg-brand-soft text-sm font-semibold text-brand-strong"
                  aria-hidden="true"
                >
                  {index + 1}
                </span>
                <div className="space-y-1.5">
                  <h2 className="text-base font-semibold text-ink">{t(step.title)}</h2>
                  <p className="text-sm leading-relaxed text-ink-muted">{t(step.body)}</p>
                  <Link
                    href={step.href}
                    className="inline-block text-xs text-ink hover:underline"
                  >
                    {t(step.linkLabel)} →
                  </Link>
                </div>
              </li>
            ))}
          </ol>

          <p className="rounded-card bg-surface-muted px-4 py-3 text-xs leading-relaxed text-ink-muted">{t('ZENKUU est une plateforme d’information en lecture seule. Aucune de ces étapes ne mène à un achat, une vente ou une connexion à un portefeuille — le site n’en propose pas.')}</p>
        </div>
      </div>
    </div>
  )
}
