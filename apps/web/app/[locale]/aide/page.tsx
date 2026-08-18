import type { Metadata } from 'next'
import { Link } from '@/i18n/navigation'

import { LifeBuoy } from 'lucide-react'

import { HelpSearch } from '@/components/help/HelpSearch'
import { HELP_ARTICLES, HELP_STARTING_POINTS } from '@/content/aide'
import { getContent, getSeo } from '@/lib/content'

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
  title: fr.pages.help,
  description: seo(
    '/aide',
    'Questions fréquentes sur les données de ZENKUU, leur fraîcheur, les graphiques et les limites de ce que le site affiche.',
  ),
  alternates: { canonical: '/aide' },
  }
}

/**
 * Centre d'aide.
 *
 * Refonte : la page enchaînait recherche puis liste plate de tous les articles. Elle
 * suit désormais l'organisation d'un centre de support — bandeau de recherche mis en
 * avant, grille de rubriques, points d'entrée conseillés, puis recours si rien ne
 * répond.
 *
 * Les rubriques et les articles sont rendus CÔTÉ SERVEUR dans le composant client :
 * ils sont donc présents dans le HTML initial, indexables et lisibles sans
 * JavaScript. La recherche n'est qu'une commodité greffée par-dessus, jamais la
 * condition d'accès au contenu (§9).
 */
export default function AidePage() {
  const starters = HELP_STARTING_POINTS.map((slug) =>
    HELP_ARTICLES.find((article) => article.slug === slug),
  ).filter((article): article is (typeof HELP_ARTICLES)[number] => Boolean(article))

  return (
    <div className="mx-auto max-w-4xl space-y-12 py-6">
      {/*
        ── HÉROS : LA RECHERCHE EST L'ÉLÉMENT CENTRAL ────────────────────────────

        Structure de support.kraken.com, et le déplacement compte. La recherche était
        posée SOUS l'en-tête, au même rang que les sections suivantes. Elle remonte au
        centre du héros parce que c'est ce qu'on vient faire ici : dans un centre
        d'aide, on ne parcourt pas, on CHERCHE — le parcours est le repli de ceux qui
        n'ont pas su formuler leur question.

        Le pictogramme est une bouée et non un point d'interrogation : le second dit
        « vous avez une question », ce que le lecteur sait déjà ; la première dit
        « on va vous sortir de là », ce qu'il vient vérifier.
      */}
      <header className="space-y-5 text-center">
        <span
          className="mx-auto flex h-14 w-14 items-center justify-center rounded-pill bg-brand-soft text-brand-strong"
          aria-hidden="true"
        >
          <LifeBuoy className="h-7 w-7" />
        </span>

        <div className="space-y-2">
          <h1 className="display-lg text-ink">Centre d’aide</h1>
          <p className="mx-auto max-w-xl text-base leading-relaxed text-ink-muted">
            Comment lire les chiffres affichés sur ZENKUU, d’où ils viennent, à quelle
            fréquence ils changent — et ce que le site ne fait délibérément pas.
          </p>
        </div>

        <div className="mx-auto max-w-xl text-left">
          <HelpSearch />
        </div>
      </header>

      {/*
        AUCUNE GRILLE DE RUBRIQUES ICI, ET C'EST DÉLIBÉRÉ.

        La première version de cette refonte en ajoutait une, sur le modèle du
        « Parcourir par produit » de la référence. Elle faisait DOUBLON : `HelpSearch`
        en rend déjà une, et la sienne est meilleure — elle disparaît dès qu'on tape,
        pour laisser la place aux résultats. Une seconde grille inerte sous la
        première aurait montré quatre fois les mêmes rubriques, dont la moitié
        continuerait de s'afficher pendant une recherche.

        Ce que la référence apporte vraiment est donc pris ailleurs : la RECHERCHE au
        centre du héros, et non reléguée sous l'en-tête au rang des sections.
      */}

      <section className="space-y-3" aria-labelledby="a-lire-en-premier">
        <h2 id="a-lire-en-premier" className="text-sm font-semibold text-ink">
          À lire en premier
        </h2>
        {/* Sélection ÉDITORIALE, et le titre le dit. « Les plus consultés »
            supposerait une mesure d'audience que ZENKUU ne fait pas (§5). */}
        <ul className="grid gap-2 sm:grid-cols-3">
          {starters.map((article) => (
            <li key={article.slug}>
              <Link
                href={`/aide/${article.slug}`}
                className="flex h-full flex-col rounded-card border border-border-subtle bg-surface p-3 transition-colors hover:border-brand"
              >
                <span className="text-sm font-medium leading-snug text-ink">{article.title}</span>
                <span className="mt-1 text-xs leading-relaxed text-ink-muted">
                  {article.summary}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-2 rounded-card border border-border-subtle bg-surface-muted p-5">
        <h2 className="text-sm font-semibold text-ink">Vous n’avez pas trouvé ?</h2>
        <p className="text-sm leading-relaxed text-ink-muted">
          Si votre question porte sur un chiffre affiché, commencez par suivre le lien
          de source sous le module concerné : il mène à l’endroit exact où la valeur a
          été publiée. Pour comprendre comment les données sont collectées et mises en
          cache, la{' '}
          <Link
            href="/methodologie"
            className="underline underline-offset-2 hover:text-brand-strong"
          >
            page Méthodologie
          </Link>{' '}
          détaille chaque source et ses limites connues.
        </p>
      </section>
    </div>
  )
}
