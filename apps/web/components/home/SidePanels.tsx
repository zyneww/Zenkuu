import { Link } from '@/i18n/navigation'

import type { DataResult, MarketCategory, NewsItem, SentimentIndex } from '@zenkuu/data'
import { Card, CardHeader, ChangeBadge, EmptyState, SourceNote, formatCurrency } from '@zenkuu/ui'

import type { Content } from '@/content/locales'
import { getContent } from '@/lib/content'

/**
 * Narratifs du jour — équivalent du panneau « Narratives Today » de CoinGecko.
 *
 * Alimenté par les catégories CoinGecko, filtrées et triées par ampleur du mouvement
 * (cf. `getTopNarratives`). Le filtre à un milliard de capitalisation n'est pas
 * cosmétique : sans lui, le panneau afficherait en permanence des paniers minuscules
 * à +300 %, ce qui ne renseigne en rien sur l'état du marché.
 */
export async function NarrativesPanel({ result }: { result: DataResult<MarketCategory[]> }) {
  const fr = await getContent()
  return (
    <Card>
      <CardHeader title={fr.home.narrativesTitle} />

      {result.ok && result.data.length > 0 ? (
        <>
          <ul className="divide-y divide-border-subtle">
            {result.data.map((category) => (
              <li key={category.id} className="flex items-center justify-between gap-3 py-2">
                <Link href={`/categories/${category.id}`} className="min-w-0 group">
                  <span className="block truncate text-sm text-ink group-hover:text-brand-strong">
                    {category.name}
                  </span>
                  <span className="tabular block text-[0.6875rem] text-ink-muted">
                    {formatCurrency(category.marketCap, 'USD', { compact: true }) ?? '—'}
                  </span>
                </Link>
                <ChangeBadge value={category.marketCapChange24h} size="sm" filled />
              </li>
            ))}
          </ul>
          {/* La capitalisation des catégories n'est publiée qu'en dollars par la
              source : on l'affiche donc en dollars plutôt que de convertir. */}
          <SourceNote
            label={`${result.source.label} · en USD`}
            href={result.source.attributionUrl}
          />
        </>
      ) : (
        <EmptyState
          title={fr.states.unavailableTitle}
          description={result.ok ? null : result.reason}
          compact
        />
      )}
    </Card>
  )
}

/**
 * Fil d'actualités.
 *
 * On n'affiche que titre, source et heure, et le lien sort vers l'éditeur. Les flux
 * RSS sont publiés pour annoncer les articles, pas pour permettre de les republier :
 * reprendre le texte intégral dépasserait ce que la syndication autorise.
 */
export async function NewsPanel({
  result,
  limit = 6,
}: {
  result: DataResult<NewsItem[]>
  /** Nombre d'articles montrés. Réglable parce que ce panneau sert dans deux
      emplacements de hauteurs très différentes. */
  limit?: number
}) {
  const fr = await getContent()
  return (
    <Card>
      <CardHeader title={fr.home.newsTitle} />

      {result.ok && result.data.length > 0 ? (
        <>
          <ul className="divide-y divide-border-subtle">
            {result.data.slice(0, limit).map((item) => (
              <li key={item.id} className="py-2">
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="group block"
                >
                  <span className="block text-xs leading-snug text-ink group-hover:text-brand-strong">
                    {item.title}
                  </span>
                  <span className="mt-0.5 block text-[0.6875rem] text-ink-muted">
                    {item.source} · {relativeTime(item.publishedAt)}
                  </span>
                </a>
              </li>
            ))}
          </ul>
          {/*
            ATTRIBUTION REPLIÉE, ET NON RACCOURCIE.

            `result.source.label` énumère la vingtaine de flux agrégés — CoinDesk,
            Cointelegraph, The Block, Decrypt, Bitcoin Magazine, CryptoSlate… Rendu à
            plat, ce paragraphe faisait à lui seul près de la moitié de la hauteur de
            la carte, et imposait cette hauteur aux deux cartes d'agrégat voisines,
            dont les courbes se retrouvaient au fond d'un vide de quatre cents pixels.

            Le §5 exige que la source soit nommée, pas qu'elle occupe le tiers du
            bloc. `<details>` satisfait les deux : la liste reste dans le document —
            donc lisible, sélectionnable, indexable — sans peser sur la mise en page.
          */}
          <details className="mt-3 text-[0.6875rem] text-ink-muted">
            <summary className="cursor-pointer list-none transition-colors hover:text-ink">
              Sources · les articles s’ouvrent chez leur éditeur
            </summary>
            <p className="mt-1.5 leading-relaxed">{result.source.label}</p>
          </details>
        </>
      ) : (
        <EmptyState
          title={fr.news.unavailable}
          description={result.ok ? null : result.reason}
          compact
        />
      )}
    </Card>
  )
}

/**
 * Jauge de sentiment Fear & Greed.
 *
 * Rendue en SVG plutôt qu'avec une barre de progression : l'arc rend lisible d'un
 * coup d'œil la position sur l'échelle 0–100, ce qu'une barre linéaire fait moins
 * bien pour une valeur sans unité.
 */
export async function SentimentPanel({ result }: { result: DataResult<SentimentIndex> }) {
  const fr = await getContent()
  if (!result.ok) {
    return (
      <Card>
        <CardHeader title={fr.home.sentimentTitle} />
        <EmptyState title={fr.states.unavailableTitle} description={result.reason} compact />
      </Card>
    )
  }

  const { value, previousValue, updatedAt } = result.data
  const label = classify(value, fr.sentiment.scale)
  const tone = value < 45 ? 'text-down' : value > 55 ? 'text-up' : 'text-ink-muted'

  // Demi-cercle de 180°, orienté de la peur (gauche) à l'avidité (droite).
  const radius = 52
  const angle = Math.PI * (1 - value / 100)
  const pointerX = 60 + radius * Math.cos(angle)
  const pointerY = 62 - radius * Math.sin(angle)

  return (
    <Card>
      <CardHeader title={fr.home.sentimentTitle} />

      <div className="flex flex-col items-center">
        <svg viewBox="0 0 120 72" width="160" height="96" role="img" aria-label={`${value} sur 100, ${label}`}>
          <defs>
            <linearGradient id="zenkuu-fng" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="var(--color-down)" />
              <stop offset="50%" stopColor="var(--color-brand)" />
              <stop offset="100%" stopColor="var(--color-up)" />
            </linearGradient>
          </defs>
          <path
            d="M8 62 A52 52 0 0 1 112 62"
            fill="none"
            stroke="url(#zenkuu-fng)"
            strokeWidth="8"
            strokeLinecap="round"
            opacity="0.35"
          />
          <line
            x1="60"
            y1="62"
            x2={pointerX.toFixed(1)}
            y2={pointerY.toFixed(1)}
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            className="text-ink"
          />
          <circle cx="60" cy="62" r="4" fill="currentColor" className="text-ink" />
        </svg>

        <p className="tabular -mt-2 text-2xl font-bold text-ink">{value}</p>
        <p className={`text-sm font-medium ${tone}`}>{label}</p>

        {previousValue !== undefined ? (
          <p className="mt-1 text-[0.6875rem] text-ink-muted">
            Veille : {previousValue} ({value > previousValue ? '+' : ''}
            {value - previousValue})
          </p>
        ) : null}
      </div>

      <p className="mt-3 text-[0.6875rem] leading-relaxed text-ink-muted">
        {fr.sentiment.disclaimer}
      </p>
      <SourceNote
        label={result.source.label}
        href={result.source.attributionUrl}
        updatedAt={updatedAt}
      />
    </Card>
  )
}

/** Traduction de l'échelle publiée en anglais par la source. */
/**
 * Libellé français d'une valeur de l'indice.
 *
 * Exporté parce que la carte de synthèse de `/crypto` affiche le même indice sous
 * une forme condensée : dupliquer les seuils garantirait qu'ils divergent au premier
 * ajustement, et deux pages annonceraient alors « Avidité » et « Neutre » pour la
 * même valeur.
 */
/**
 * L'ÉCHELLE est passée en argument, et non lue depuis le dictionnaire.
 *
 * Cette fonction est appelée depuis quatre endroits, dont trois en plein JSX
 * (`{classify(value)}`). La rendre asynchrone pour qu'elle aille chercher elle-même
 * la traduction aurait imposé de sortir l'appel de son JSX aux trois endroits — pour
 * un gain nul. L'appelant, lui, dispose déjà du dictionnaire.
 */
export function classify(value: number, scale: Content['sentiment']['scale']): string {
  const fr = { sentiment: { scale } }
  if (value <= 24) return fr.sentiment.scale.extremeFear
  if (value <= 44) return fr.sentiment.scale.fear
  if (value <= 55) return fr.sentiment.scale.neutral
  if (value <= 74) return fr.sentiment.scale.greed
  return fr.sentiment.scale.extremeGreed
}

/**
 * Ancienneté relative d'un article.
 *
 * Calculée au rendu serveur : la page étant régénérée toutes les 3 minutes pour les
 * actualités, l'écart affiché ne peut pas dériver de plus que cet intervalle.
 */
function relativeTime(iso: string): string {
  const minutes = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60_000))
  if (minutes < 60) return `il y a ${minutes} min`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `il y a ${hours} h`
  const days = Math.round(hours / 24)
  return `il y a ${days} j`
}
