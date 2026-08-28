import type { Metadata } from 'next'
import { Link } from '@/i18n/navigation'

import {
  getAssetHistory,
  getCryptoGlobalStats,
  getSentiment,
  getSentimentHistory,
} from '@zenkuu/data'
import { Card, CardHeader, ChangeBadge, EmptyState, SourceNote } from '@zenkuu/ui'

import { classify } from '@/components/home/SidePanels'
import { Money } from '@/components/locale/Money'
import { SENTIMENT_BANDS, sentimentBand } from '@/components/sentiment/bands'
import { SentimentDial } from '@/components/sentiment/SentimentDial'
import { SentimentFaq } from '@/components/sentiment/SentimentFaq'
import { SentimentHistoricalValues } from '@/components/sentiment/SentimentHistoricalValues'
import { SentimentHistoryView } from '@/components/sentiment/SentimentHistoryView'
import { getContent, getPhrase } from '@/lib/content'

export const revalidate = 1800

/**
 * Métadonnées DÉRIVÉES DE LA LANGUE, d'où la fonction plutôt que la constante.
 *
 * Un `export const metadata` est évalué une fois au chargement du module : il ne
 * peut pas connaître la locale de la requête, et servait donc un titre français sur
 * les pages anglaises. `generateMetadata` est appelée par requête.
 */
export async function generateMetadata(): Promise<Metadata> {
  const fr = await getContent()
  return {
    title: fr.pages.sentiment,
    description: fr.sentiment.subtitle,
    alternates: { canonical: '/sentiment' },
  }
}

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * INDICE DE PEUR ET D'AVIDITÉ — LA DISPOSITION DE LA RÉFÉRENCE
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Trois cartes en bande de tête — le cadran, les valeurs historiques, le contexte de
 * marché — puis le graphique en pleine largeur, puis l'échelle et la FAQ.
 *
 * ── CE QUE CETTE PAGE PORTAIT AVANT ────────────────────────────────────────
 *
 * Un cadran étroit hérité de la colonne latérale de l'accueil, une liste de quatre
 * écarts chiffrés, le graphique, puis deux sections de texte suivi. L'ensemble
 * répondait aux mêmes questions, mais la figure de tête était une vignette de 176 px
 * sur une page qui ne parle que d'elle, et les explications formaient deux pavés à
 * lire en entier pour y trouver une réponse précise.
 *
 * Le cadran devient donc la figure principale, avec ses cinq zones nommées et ses
 * graduations ; les écarts deviennent trois anneaux qui montrent la POSITION sur
 * l'échelle et plus seulement l'écart ; et le texte se replie en questions, où l'on
 * ouvre celle qu'on se pose.
 *
 * ── LA TROISIÈME CARTE N'AFFICHE QUE CE QUE LA SOURCE DONNE ────────────────
 *
 * ⚠️ La référence y met trois variations sur 24 h — capitalisation, volume,
 * dominance. Nos statistiques globales n'en publient QU'UNE, celle de la
 * capitalisation (`marketCapChange24h`). Les deux autres lignes portent donc leur
 * valeur sans écart, plutôt qu'un écart calculé sur un point de comparaison qu'on
 * n'a pas (§5).
 */
export default async function SentimentPage() {
  const t = await getPhrase()
  const fr = await getContent()

  // 366 et non 365 : le repère « il y a un an » lit l'index `longueur − 1 − 365`,
  // qui n'existe pas dans une série de 365 points. Un jour de plus le rend atteignable.
  /* Le cours du bitcoin accompagne l'historique : c'est le contre-champ de l'indice —
     voir `SentimentBars`. Il est demandé sur la MÊME profondeur pour que la fenêtre
     la plus longue du sélecteur ait de quoi se tracer. */
  const [sentiment, history, stats, btcHistory] = await Promise.all([
    getSentiment(),
    getSentimentHistory(366),
    getCryptoGlobalStats('usd'),
    getAssetHistory('bitcoin', 'crypto', 366, 'usd'),
  ])

  const points = history.ok ? history.data : []

  /* Un échec sur le cours ne prive pas la page de ses barres : la figure retire son
     axe de droite et se rend sans lui. */
  const prices = btcHistory.ok
    ? btcHistory.data.points.map((point) => ({ timestamp: point.timestamp, value: point.price }))
    : []

  return (
    <div className="mx-auto max-w-6xl space-y-10 py-6">
      <header className="max-w-2xl space-y-3">
        <h1 className="display-xl text-ink">{fr.sentiment.title}</h1>
        <p className="text-lg leading-relaxed text-ink-muted">
          Comprendre les émotions qui animent le marché.
        </p>
      </header>

      {/* `items-start` : les trois cartes ont des hauteurs naturelles différentes et
          n'ont aucune raison de s'étirer sur la plus haute. */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
        <Card>
          <CardHeader title={fr.home.sentimentTitle} />
          {sentiment.ok ? (
            <DialCard value={sentiment.data.value} label={classify(sentiment.data.value, fr.sentiment.scale)} />
          ) : (
            <EmptyState
              title={fr.states.unavailableTitle}
              description={sentiment.reason}
              compact
            />
          )}
        </Card>

        <Card>
          <CardHeader title="Valeurs historiques" />
          {points.length > 1 ? (
            <SentimentHistoricalValues
              points={points}
              label={(value) => classify(value, fr.sentiment.scale)}
            />
          ) : (
            <p className="text-sm text-ink-muted">
              L’historique n’est pas disponible pour l’instant : les repères de
              comparaison reviendront avec lui.
            </p>
          )}
        </Card>

        <Card>
          <CardHeader title="Contexte de marché" />
          <MarketContext stats={stats} />
        </Card>
      </div>

      {points.length > 1 ? (
        <SentimentHistoryView points={points} prices={prices} />
      ) : history.ok ? null : (
        <EmptyState
          title="Historique momentanément indisponible"
          description={history.reason}
          compact
        />
      )}

      <ScaleSection scale={fr.sentiment.scale} />

      <SentimentFaq />

      {/* Fond sourd et rien d'autre. Le liseré gauche que ce bloc portait — repris
          tel quel de l'ancienne page — ne le détachait pas mieux que son fond, et
          c'est un ornement dont l'interface se passe. */}
      <p className="max-w-3xl rounded-card bg-surface-muted px-4 py-3 text-sm leading-relaxed text-ink-muted">
        {fr.sentiment.disclaimer}
      </p>

      <p className="text-sm text-ink-muted">
        Pour situer ces mouvements dans le marché :{' '}
        <Link href="/classements" className="text-brand hover:underline">
          classements du marché
        </Link>{' '}
        ·{' '}
        <Link href="/apprendre" className="text-brand hover:underline">
          apprendre à lire les chiffres
        </Link>
      </p>

      {history.ok ? (
        <SourceNote
          label={history.source.label}
          href={history.source.attributionUrl}
          strings={{ source: t('Source :'), dated: t('données du {date}') }}
        />
      ) : null}
    </div>
  )
}

/** Le cadran et sa valeur nommée. */
function DialCard({ value, label }: { value: number; label: string }) {
  const band = sentimentBand(value)

  return (
    <div className="flex flex-col items-center gap-1">
      <SentimentDial value={value} label={label} />
      {/* Le nom de la zone est répété SOUS le cadran, en couleur : sur l'arc il est
          couché et minuscule — lisible pour situer les zones entre elles, pas pour
          lire celle où l'on est. */}
      <p className="text-base font-semibold" style={{ color: band.color }}>
        {label}
      </p>
    </div>
  )
}

/**
 * Capitalisation, volume et dominance — le contexte dans lequel l'indice se lit.
 *
 * Voir l'en-tête de la page : une seule des trois lignes dispose d'une variation
 * publiée, et les deux autres s'affichent sans en inventer une.
 */
function MarketContext({
  stats,
}: {
  stats: Awaited<ReturnType<typeof getCryptoGlobalStats>>
}) {
  if (!stats.ok) {
    return <EmptyState title="Contexte indisponible" description={stats.reason} compact />
  }

  const { totalMarketCap, totalVolume24h, marketCapChange24h, dominance } = stats.data
  const btc = dominance.btc

  /* Chaque statistique dans sa propre carte, comme sur la référence : posées à nu
     les unes sous les autres, trois libellés gris et trois nombres gras formaient une
     liste, alors que ce sont trois mesures indépendantes. */
  return (
    <dl className="space-y-2">
      <StatBox label="Capitalisation totale" change={marketCapChange24h}>
        <Money value={totalMarketCap} from="USD" compact />
      </StatBox>

      <StatBox label="Volume 24 h">
        <Money value={totalVolume24h} from="USD" compact />
      </StatBox>

      {btc !== undefined ? (
        <StatBox label="Dominance BTC">{btc.toFixed(2)} %</StatBox>
      ) : null}
    </dl>
  )
}

function StatBox({
  label,
  change,
  children,
}: {
  label: string
  /** Absent quand la source ne publie pas d'écart pour cette mesure — voir la page. */
  change?: number
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1 rounded-card border border-border-subtle bg-surface-muted px-3 py-2.5">
      <dt className="text-xs text-ink-muted">{label}</dt>
      <dd className="flex items-baseline justify-between gap-2">
        <span className="tabular text-base font-semibold text-ink">{children}</span>
        {change !== undefined ? <ChangeBadge value={change} size="sm" /> : null}
      </dd>
    </div>
  )
}

/**
 * L'échelle, lue depuis `SENTIMENT_BANDS`.
 *
 * Les bornes et les teintes ne sont plus réécrites ici : elles viennent du même
 * module que le cadran et les anneaux, ce qui garantit que les trois figures
 * découpent l'échelle au même endroit.
 */
function ScaleSection({ scale }: { scale: Awaited<ReturnType<typeof getContent>>['sentiment']['scale'] }) {
  const names: Record<string, string> = {
    'extreme-fear': scale.extremeFear,
    fear: scale.fear,
    neutral: scale.neutral,
    greed: scale.greed,
    'extreme-greed': scale.extremeGreed,
  }

  return (
    <section className="space-y-3" aria-labelledby="echelle-titre">
      <h2 id="echelle-titre" className="display-sm text-ink">
        Comment lire cet indice
      </h2>

      <dl className="grid gap-px overflow-hidden rounded-card border border-border-subtle bg-border-subtle sm:grid-cols-5">
        {SENTIMENT_BANDS.map((band) => (
          <div key={band.id} className="space-y-1.5 bg-surface px-3 py-3 text-center">
            <dt className="tabular text-xs text-ink-muted">
              {band.from} – {band.to}
            </dt>
            <dd className="text-sm text-ink">{names[band.id]}</dd>
            {/* Un filet de la teinte de la zone : il relie ce tableau au cadran, où
                ce sont ces mêmes couleurs qui découpent l'arc. */}
            <div
              aria-hidden="true"
              className="mx-auto h-1 w-8 rounded-pill"
              style={{ backgroundColor: band.color }}
            />
          </div>
        ))}
      </dl>
    </section>
  )
}
