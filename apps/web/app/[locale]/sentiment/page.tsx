import type { Metadata } from 'next'
import { Link } from '@/i18n/navigation'

import { getSentiment, getSentimentHistory, type SentimentPoint } from '@zenkuu/data'
import { EmptyState, SourceNote } from '@zenkuu/ui'

import { classify, SentimentPanel } from '@/components/home/SidePanels'
import { SentimentHistoryView } from '@/components/sentiment/SentimentHistoryView'
import { getContent } from '@/lib/content'
import { getPhrase } from '@/lib/content'

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
 * Indice Fear & Greed.
 *
 * L'HISTORIQUE est la nouveauté, et il ne coûte aucune source supplémentaire : le
 * même endpoint accepte un paramètre `limit` et remonte l'indice jour par jour
 * (vérifié à 400 points). La page passe donc d'un cadran isolé — une valeur sans
 * passé, donc sans repère — à une lecture dans la durée.
 *
 * Disposition VOLONTAIREMENT DIFFÉRENTE de la référence, qui empile un grand cadran
 * centré, puis le graphique, puis des cartes « hier / semaine dernière / mois
 * dernier ». Ici le cadran et les repères de comparaison partagent la bande de tête
 * sur deux colonnes — la valeur du jour ne se lit que par rapport aux précédentes,
 * les séparer oblige à faire l'aller-retour de mémoire. Le graphique suit en pleine
 * largeur, l'échelle et la méthode ferment la page.
 */
export default async function SentimentPage() {
  const t = await getPhrase()
  const fr = await getContent()
  // 366 et non 365 : le repère « il y a un an » lit l'index `longueur − 1 − 365`,
  // qui n'existe pas dans une série de 365 points. Un jour de plus le rend atteignable.
  const [sentiment, history] = await Promise.all([getSentiment(), getSentimentHistory(366)])

  const points = history.ok ? history.data : []

  return (
    <div className="mx-auto max-w-4xl space-y-12 py-6">
      <header className="max-w-2xl space-y-3">
        <h1 className="display-xl text-ink">{fr.sentiment.title}</h1>
        <p className="text-lg leading-relaxed text-ink-muted">{fr.sentiment.subtitle}</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] lg:items-start">
        <SentimentPanel result={sentiment} />

        {points.length > 1 ? (
          <Comparisons points={points} />
        ) : (
          <p className="text-sm text-ink-muted">
            L’historique n’est pas disponible pour l’instant : les repères de comparaison
            reviendront avec lui.
          </p>
        )}
      </div>

      {points.length > 1 ? (
        <SentimentHistoryView points={points} />
      ) : history.ok ? null : (
        <EmptyState
          title="Historique momentanément indisponible"
          description={history.reason}
          compact
        />
      )}

      <ScaleSection />

      <MethodSection />

      {history.ok ? (
        <SourceNote label={history.source.label} href={history.source.attributionUrl} strings={{ source: t('Source :'), dated: t('données du {date}') }} />
      ) : null}
    </div>
  )
}

/**
 * Repères de comparaison — hier, la semaine dernière, le mois dernier, l'an dernier.
 *
 * Chaque repère est LU dans la série, jamais interpolé : si le relevé du jour −30
 * manque, la ligne disparaît au lieu d'afficher le point le plus proche. L'indice
 * étant publié une fois par jour, un décalage d'un ou deux jours passerait inaperçu
 * et fausserait pourtant la comparaison.
 */
async function Comparisons({ points }: { points: SentimentPoint[] }) {
  const fr = await getContent()
  const last = points[points.length - 1] as SentimentPoint

  const at = (daysAgo: number): SentimentPoint | undefined =>
    points[points.length - 1 - daysAgo]

  const rows = [
    { label: 'Hier', point: at(1) },
    { label: 'Il y a une semaine', point: at(7) },
    { label: 'Il y a un mois', point: at(30) },
    { label: 'Il y a un an', point: at(365) },
  ].filter((row): row is { label: string; point: SentimentPoint } => Boolean(row.point))

  if (rows.length === 0) return null

  return (
    <section aria-labelledby="comparaisons-titre" className="space-y-3">
      <h2 id="comparaisons-titre" className="text-sm font-semibold text-ink">
        Où en était l’indice
      </h2>

      <dl className="divide-y divide-border-subtle rounded-card border border-border-subtle bg-surface">
        {rows.map((row) => {
          const delta = last.value - row.point.value

          return (
            <div key={row.label} className="flex items-baseline justify-between gap-3 px-4 py-3">
              <dt className="text-sm text-ink-muted">{row.label}</dt>
              <dd className="flex shrink-0 items-baseline gap-3">
                <span className="text-xs text-ink-muted">{classify(row.point.value, fr.sentiment.scale)}</span>
                <span className="tabular text-base font-semibold text-ink">{row.point.value}</span>
                {/* L'écart porte un SIGNE explicite : « 62 » puis « 48 » n'indique
                    pas d'emblée dans quel sens le marché a bougé. */}
                <span
                  className={`tabular w-12 text-right text-xs font-medium ${
                    delta > 0 ? 'text-up' : delta < 0 ? 'text-down' : 'text-ink-muted'
                  }`}
                >
                  {delta > 0 ? '+' : ''}
                  {delta}
                </span>
              </dd>
            </div>
          )
        })}
      </dl>
    </section>
  )
}

async function ScaleSection() {
  const fr = await getContent()
  const bands = [
    { range: '0 – 24', label: fr.sentiment.scale.extremeFear, tone: 'text-down font-medium' },
    { range: '25 – 44', label: fr.sentiment.scale.fear, tone: 'text-down' },
    { range: '45 – 55', label: fr.sentiment.scale.neutral, tone: 'text-ink' },
    { range: '56 – 74', label: fr.sentiment.scale.greed, tone: 'text-up' },
    { range: '75 – 100', label: fr.sentiment.scale.extremeGreed, tone: 'text-up font-medium' },
  ]

  return (
    <section className="space-y-3" aria-labelledby="echelle-titre">
      <h2 id="echelle-titre" className="display-sm text-ink">
        Comment lire cet indice
      </h2>

      <dl className="grid gap-px overflow-hidden rounded-card border border-border-subtle bg-border-subtle sm:grid-cols-5">
        {bands.map((band) => (
          <div key={band.range} className="bg-surface px-3 py-3 text-center">
            <dt className="tabular text-xs text-ink-muted">{band.range}</dt>
            <dd className={`mt-1 text-sm ${band.tone}`}>{band.label}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

/**
 * Ce que l'indice mesure — et ce qu'il ne mesure pas.
 *
 * La référence détaille la pondération de ses composantes. On ne la reprend pas : ce
 * sont les composantes d'Alternative.me, pas les nôtres, et leurs poids ne sont pas
 * publiés de manière stable. Énoncer les facteurs sans inventer de pourcentages est
 * la seule version vérifiable (§5).
 */
async function MethodSection() {
  const fr = await getContent()
  return (
    <section className="max-w-2xl space-y-3" aria-labelledby="methode-titre">
      <h2 id="methode-titre" className="display-sm text-ink">
        Ce que l’indice mesure
      </h2>

      <p className="text-base leading-relaxed text-ink-muted">
        L’indice est une composition publiée par Alternative.me. ZENKUU le relaie tel
        quel, sans le recalculer. Cinq familles de mesures l’alimentent :
      </p>

      {/*
        LES FACTEURS EN LISTE, ET TOUJOURS SANS POURCENTAGES.

        Ils étaient énoncés dans une phrase. La liste ne dit rien de plus — c'est
        exactement le même contenu — mais elle se PARCOURT, là où la phrase se lisait :
        un lecteur qui veut savoir de quoi ce 72 est fait y trouve cinq entrées
        distinctes au lieu d'une énumération à décomposer lui-même. C'est la forme que
        réclame la question « qu'y a-t-il dans ce nombre ? ».

        ⚠️ AUCUN POIDS N'EST AFFICHÉ, ET C'EST DÉLIBÉRÉ — voir l'en-tête de ce
        composant. La référence détaille une pondération, mais elle n'est pas publiée
        de façon stable, et la source ne diffuse PAS la contribution quotidienne de
        chaque facteur : seule la valeur composite sort de son API. Mettre des
        pourcentages ici reviendrait à les recopier d'une documentation sans pouvoir
        vérifier qu'ils valent pour le chiffre du jour — de la donnée inventée (§5).

        La dernière ligne dit cette limite plutôt que de la laisser deviner : sans
        elle, une liste de facteurs laisse croire qu'on pourrait les voir bouger un
        par un.
      */}
      <ul className="space-y-1.5 text-base leading-relaxed text-ink-muted">
        {[
          'la volatilité récente du marché',
          'le volume et l’élan des échanges',
          'l’activité sur les réseaux sociaux',
          'la dominance du bitcoin',
          'les tendances de recherche',
        ].map((factor) => (
          <li key={factor} className="flex gap-2">
            <span aria-hidden="true" className="select-none text-ink-muted">
              ·
            </span>
            <span>{factor}</span>
          </li>
        ))}
      </ul>

      <p className="text-base leading-relaxed text-ink-muted">
        La source ne publie que le nombre final : la part exacte de chaque facteur dans
        la valeur du jour n’est pas diffusée, et n’est donc affichée nulle part ici.
      </p>

      <p className="text-base leading-relaxed text-ink-muted">
        Il décrit un état d’esprit observé, pas une prévision. Une valeur basse signale
        que le marché a eu peur, pas qu’il va monter — et l’inverse est tout aussi vrai.
      </p>

      <p className="rounded-card border-l-2 border-border-subtle bg-surface-muted py-3 pl-4 pr-3 text-sm leading-relaxed text-ink-muted">
        {fr.sentiment.disclaimer}
      </p>

      <p className="text-sm text-ink-muted">
        Pour situer ces mouvements dans le marché :{' '}
        {/* `/mouvements` a été supprimée (demande explicite) ; `/classements` porte
            les mêmes palmarès, filtrables, et existe depuis plus longtemps. */}
        <Link href="/classements" className="text-brand hover:underline">
          classements du marché
        </Link>{' '}
        ·{' '}
        <Link href="/apprendre" className="text-brand hover:underline">
          apprendre à lire les chiffres
        </Link>
      </p>
    </section>
  )
}
