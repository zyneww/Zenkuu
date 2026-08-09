import Link from 'next/link'

import { EmptyState } from '@zenith/ui'

import { fr } from '@/content/fr'

interface PlaceholderPageProps {
  title: string
  intro: string
  /** Ce que la page contiendra — annoncé plutôt que promis en vague. */
  planned: string[]
}

/**
 * Page annoncée mais pas encore écrite.
 *
 * Elle existe pour une raison précise : le menu « Plus » annonce ces destinations,
 * et un lien de menu qui renvoie un 404 est pire qu'une entrée grisée. Plutôt qu'un
 * « bientôt » creux, la page énonce ce qu'elle contiendra — c'est une information
 * réelle, et cela évite au lecteur de revenir vérifier.
 *
 * Elle est explicitement DÉSINDEXÉE : laisser des dizaines de pages vides entrer
 * dans l'index desservirait le référencement du site, qui est son premier levier
 * d'acquisition (§9).
 */
export function PlaceholderPage({ title, intro, planned }: PlaceholderPageProps) {
  return (
    <div className="mx-auto max-w-2xl space-y-6 py-6">
      <header className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-brand-strong">
          {fr.nav.soonShort}
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-ink">{title}</h1>
        <p className="text-sm leading-relaxed text-ink-muted">{intro}</p>
      </header>

      <section className="rounded-card border border-border-subtle bg-surface p-5">
        <h2 className="mb-3 text-sm font-semibold text-ink">{fr.placeholder.plannedTitle}</h2>
        <ul className="space-y-2">
          {planned.map((entry) => (
            <li key={entry} className="flex gap-2 text-sm text-ink-muted">
              <span aria-hidden="true" className="text-brand">
                •
              </span>
              {entry}
            </li>
          ))}
        </ul>
      </section>

      <EmptyState
        title={fr.placeholder.meanwhileTitle}
        description={fr.placeholder.meanwhileBody}
        action={
          <Link
            href="/methodologie"
            className="inline-block rounded-card bg-brand-strong px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-ink"
          >
            {fr.placeholder.meanwhileCta}
          </Link>
        }
        compact
      />
    </div>
  )
}

/** Métadonnées communes : titre gabarité, et surtout pas d'indexation. */
export function placeholderMetadata(title: string, description: string) {
  return {
    title,
    description,
    robots: { index: false, follow: true },
  }
}
