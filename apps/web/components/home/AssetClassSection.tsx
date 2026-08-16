import { ArrowRight } from 'lucide-react'

import { Link } from '@/i18n/navigation'

/**
 * Une SECTION DE MARCHÉ — un intitulé de classe d'actif, puis ses palmarès.
 *
 * ── CE QUI REMPLACE `AnalysisSection`, ET POURQUOI ───────────────────────────
 *
 * L'accueil rangeait ses cartes par TYPE D'ANALYSE : « Analyse des marchés »,
 * « Analyse sectorielle », « Analyse du sentiment », « Analyse des flux ». La
 * grammaire venait de Tokenomist et elle résolvait un vrai problème — une page de
 * dix cartes sans titre de groupe se parcourt en diagonale.
 *
 * Elle en laissait un autre entier. Un lecteur arrive en cherchant un MARCHÉ, pas
 * une méthode : « je viens voir les actions » est une intention courante, « je viens
 * faire de l'analyse sectorielle » ne l'est pas. Les quatre familles obligeaient donc
 * à traverser la page entière pour rassembler ce qui concerne une seule classe — les
 * actions apparaissaient dans le tableau d'exploration, pas dans les hausses, jamais
 * dans le sentiment. Chercher « comment vont les actions » n'avait aucune réponse
 * groupée.
 *
 * TradingView range par classe d'actif, et c'est ce que cette section met en œuvre.
 * Le repère de navigation se trouve désormais là où se trouve la question.
 *
 * ── L'INTITULÉ EST GROS, ET C'EST L'INVERSE DE `AnalysisSection` ─────────────
 *
 * L'ancien intitulé était petit, en capitales et en sourdine : il regroupait des
 * cartes qui portaient elles-mêmes des titres forts, et devait donc s'effacer devant
 * elles. Celui-ci fait le contraire. Une section de classe est une DESTINATION —
 * c'est vers elle qu'on fait défiler la page — et une destination qu'on doit chercher
 * des yeux a manqué son office. D'où un titre au niveau du titre de page, seul repère
 * assez fort pour se voir en défilant vite.
 */
export function AssetClassSection({
  title,
  href,
  moreLabel = 'Tout voir',
  /**
   * Ancre de défilement, pour que la navigation puisse pointer une section.
   *
   * Posée sur la `<section>` plutôt que sur le titre : ancrer le titre placerait le
   * haut de la fenêtre SUR le titre, qui se retrouverait collé au bord supérieur,
   * sous la barre de navigation fixe. Ancrer la section laisse respirer.
   */
  id,
  children,
}: {
  title: string
  /** Destination du « Tout voir ». Omise, l'intitulé reste un simple libellé. */
  href?: string
  moreLabel?: string
  id?: string
  children: React.ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-24 space-y-4">
      <div className="flex items-baseline justify-between gap-4 border-b border-border-subtle pb-3">
        <h2 className="text-lg font-semibold tracking-tight text-ink sm:text-xl">{title}</h2>

        {href ? (
          <Link
            href={href}
            className="group inline-flex shrink-0 items-center gap-1 text-xs font-medium text-brand transition-colors hover:text-brand-strong"
          >
            {moreLabel}
            {/* Le décalage au survol, et pas une flèche fixe : il rend le lien vivant
                sans ajouter de couleur ni de soulignement à une page déjà chargée. */}
            <ArrowRight
              className="h-3 w-3 transition-transform duration-150 group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </Link>
        ) : null}
      </div>

      {children}
    </section>
  )
}
