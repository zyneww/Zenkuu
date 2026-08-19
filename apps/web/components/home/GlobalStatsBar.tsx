import { Link } from '@/i18n/navigation'

import type { GlobalMarketStats, SentimentIndex } from '@zenkuu/data'
import { ChangeBadge } from '@zenkuu/ui'

import { classify } from '@/components/home/SidePanels'
import { Money } from '@/components/locale/Money'
import { getContent, getPhrase } from '@/lib/content'

/**
 * Barre de statistiques globales, en tête de l'accueil.
 *
 * Reprise structurelle : une ligne compacte de repères avant tout contenu, pour que
 * le lecteur situe le marché avant de lire une seule ligne du tableau. C'est l'un des
 * rares éléments dont la place est dictée par la lecture — placé plus bas, il
 * n'oriente plus rien.
 *
 * Chaque cellule DISPARAÎT si sa source échoue, plutôt que d'afficher un tiret : une
 * barre à trois repères reste utile, une barre de tirets ne dit rien.
 *
 * Le sentiment y figure alors qu'il vient d'une autre source : c'est le seul repère
 * qui parle de l'état d'esprit du marché plutôt que de sa taille, et il complète les
 * autres au lieu de les répéter.
 */
export async function GlobalStatsBar({
  stats,
  sentiment,
}: {
  stats: GlobalMarketStats | null
  sentiment: SentimentIndex | null
}) {
  const fr = await getContent()
  const t = await getPhrase()
  if (!stats && !sentiment) return null

  const btc = stats?.dominance?.['btc']
  const eth = stats?.dominance?.['eth']

  return (
    <section
      aria-label="Repères du marché"
      className="flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-border-subtle pb-4 text-sm"
    >
      {stats ? (
        <>
          <Stat label="Capitalisation">
            <Money value={stats.totalMarketCap} from={stats.currency} compact />
            <ChangeBadge value={stats.marketCapChange24h} size="sm" />
          </Stat>

          <Stat label="Volume 24 h">
            <Money value={stats.totalVolume24h} from={stats.currency} compact />
          </Stat>

          {typeof btc === 'number' ? (
            <Stat label={t('Dominance BTC')}>
              <span className="tabular">{btc.toFixed(1)} %</span>
            </Stat>
          ) : null}

          {typeof eth === 'number' ? (
            <Stat label={t('Dominance ETH')}>
              <span className="tabular">{eth.toFixed(1)} %</span>
            </Stat>
          ) : null}
        </>
      ) : null}

      {sentiment ? (
        <Stat label="Sentiment">
          <Link href="/sentiment" className="flex items-baseline gap-1.5 hover:text-brand">
            <span className="tabular font-semibold">{sentiment.value}</span>
            <span className="text-xs text-ink-muted">{classify(sentiment.value, fr.sentiment.scale)}</span>
          </Link>
        </Stat>
      ) : null}
    </section>
  )
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-xs text-ink-muted">{label}</span>
      <span className="flex items-baseline gap-1.5 font-medium text-ink">{children}</span>
    </div>
  )
}
