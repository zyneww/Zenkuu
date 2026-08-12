import { ArrowRight } from 'lucide-react'

import { Link } from '@/i18n/navigation'

/**
 * Une FAMILLE d'analyse — un intitulé, puis les cartes qui en relèvent.
 *
 * ── CE QUE CETTE STRUCTURE RÉSOUT ────────────────────────────────────────────
 *
 * L'accueil empilait ses cartes sans les nommer : deux courbes, un palmarès, un
 * tableau, quatre widgets en colonne. Chaque bloc se défendait seul, mais rien ne
 * disait POURQUOI ils se suivaient — et une page de dix cartes sans titres de groupe
 * se parcourt en diagonale, parce qu'aucun repère n'autorise à sauter ce qui
 * n'intéresse pas.
 *
 * L'intitulé de famille est exactement ce repère. Il coûte une ligne et rend la page
 * SÉLECTIVE : on peut décider de ne pas lire « Analyse du sentiment » sans avoir à la
 * traverser. C'est la structure de Tokenomist, dont c'est le vrai apport — pas les
 * cartes elles-mêmes, mais le fait qu'elles soient rangées par question posée.
 *
 * ── L'INTITULÉ N'EST PAS UN TITRE DE CARTE ───────────────────────────────────
 *
 * Il est posé DEHORS, au-dessus du filet, en petit et en sourdine. Mis en gras dans
 * une carte, il entrerait en concurrence avec les titres des cartes qu'il regroupe, et
 * la hiérarchie s'inverserait : le groupe crierait plus fort que son contenu.
 */
export function AnalysisSection({
  title,
  href,
  moreLabel = 'Tout voir',
  children,
}: {
  title: string
  /** Destination du « Tout voir ». Omise, l'intitulé reste un simple libellé. */
  href?: string
  moreLabel?: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{title}</h2>

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

      <div className="space-y-4">{children}</div>
    </section>
  )
}
