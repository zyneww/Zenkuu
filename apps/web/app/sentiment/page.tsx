import type { Metadata } from 'next'

import { getSentiment } from '@zenith/data'

import { SentimentPanel } from '@/components/home/SidePanels'
import { fr } from '@/content/fr'

export const revalidate = 1800

export const metadata: Metadata = {
  title: fr.pages.sentiment,
  description: fr.sentiment.subtitle,
}

export default async function SentimentPage() {
  const sentiment = await getSentiment()

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-ink">{fr.sentiment.title}</h1>
        <p className="text-sm text-ink-muted">{fr.sentiment.subtitle}</p>
      </header>

      <SentimentPanel result={sentiment} />

      <section className="rounded-card border border-border-subtle bg-surface p-4">
        <h2 className="mb-2 text-sm font-semibold text-ink">Comment lire cet indice</h2>
        <dl className="space-y-1.5 text-xs text-ink-muted">
          <div className="flex justify-between gap-4">
            <dt>0 – 24</dt>
            <dd className="font-medium text-down">{fr.sentiment.scale.extremeFear}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt>25 – 44</dt>
            <dd className="text-down">{fr.sentiment.scale.fear}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt>45 – 55</dt>
            <dd>{fr.sentiment.scale.neutral}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt>56 – 74</dt>
            <dd className="text-up">{fr.sentiment.scale.greed}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt>75 – 100</dt>
            <dd className="font-medium text-up">{fr.sentiment.scale.extremeGreed}</dd>
          </div>
        </dl>
        <p className="mt-3 text-[0.6875rem] leading-relaxed text-ink-muted">
          L’indice combine volatilité, volume, activité sur les réseaux sociaux,
          dominance et tendances de recherche. Il décrit un état d’esprit de marché
          observé — il ne prédit rien et ne constitue pas une recommandation.
        </p>
      </section>
    </div>
  )
}
