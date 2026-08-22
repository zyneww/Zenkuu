import type { DataResult, GlobalMarketStats, MarketCapPoint, MarketCapSeriesState } from '@zenkuu/data'
import { ChangeBadge, EmptyState, formatCompact, formatNumber } from '@zenkuu/ui'

import { BarFigure } from '@/components/charts/BarFigure'
import { dataColor } from '@/components/charts/chart-theme'
import { Money } from '@/components/locale/Money'
import { getContent, getPhrase } from '@/lib/content'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * CAPITALISATION DU MARCHÉ — CHIFFRE HÉROS ET HISTOGRAMME
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── CE QU'ELLE CHANGE À `MarketOverviewCard`, ET CE QU'ELLE GARDE ───────────
 *
 * Même donnée, même source, même honnêteté — seule la FORME change. La référence
 * pose en tête de sa page une carte à trois étages : un libellé de série, un chiffre
 * héros, puis un histogramme. Cette carte reprend cette composition ; l'ancienne
 * gardait une courbe d'aire et une bande de quatre agrégats.
 *
 * `MarketOverviewCard` n'est PAS supprimée : elle sert toujours `/graphiques`, où la
 * courbe d'aire est la bonne forme parce que la page a la place de la lire.
 *
 * ── LA SOURCE DE LA SÉRIE, ET POURQUOI ELLE EST COURTE ──────────────────────
 *
 * CoinGecko ne publie l'historique de la capitalisation mondiale que sur ses offres
 * payantes. Plutôt qu'un tracé approximatif — celui de Bitcoin présenté comme celui
 * du marché entier — la série est construite à partir de NOS PROPRES relevés, un
 * point à chaque lecture des statistiques globales.
 *
 * Conséquence assumée et ÉCRITE sous la figure : la profondeur se compte en minutes
 * au démarrage, pas en semaines. La référence affiche deux mois d'histogramme ; nous
 * affichons ce que nous avons vraiment relevé, et nous disons combien. Inventer huit
 * semaines de barres serait exactement ce que le §5 interdit.
 */

/**
 * Nombre de barres.
 *
 * Huit, comme les figures d'analyse — au-delà, les libellés d'heure se chevauchent
 * dans la largeur d'une carte de rang de tête, qui est la plus étroite de la page.
 */
const BUCKETS = 8

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * LES BARRES PORTENT LA VARIATION, ET NON LE NIVEAU
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── LE DÉFAUT QUE CE CHOIX CORRIGE, ET QUI A ÉTÉ CONSTATÉ À L'ÉCRAN ─────────
 *
 * Une première version portait la capitalisation elle-même. Résultat mesuré : sept
 * barres RIGOUREUSEMENT IDENTIQUES. Ce n'était pas un défaut de rendu, c'est
 * arithmétique — la capitalisation mondiale bouge de moins d'un pour cent en deux
 * heures, et un histogramme part de zéro. Sur un axe qui monte à 2 200 milliards, une
 * variation de 20 milliards fait un pixel.
 *
 * Les deux issues étaient : tronquer l'axe, ou changer de mesure. Tronquer l'axe d'un
 * histogramme est un mensonge graphique connu — la hauteur d'une barre EST sa valeur,
 * et la couper fait lire un rapport de 1 à 3 là où il est de 1,00 à 1,01. C'est le
 * seul endroit du site où ce serait tentant, et c'est refusé.
 *
 * ── D'OÙ LE CHANGEMENT DE MESURE ────────────────────────────────────────────
 *
 * Une capitalisation est un STOCK : un état à un instant. Un histogramme est fait pour
 * un FLUX : une quantité par intervalle. La référence l'emploie d'ailleurs pour un
 * flux — de la valeur débloquée par semaine — et c'est pourquoi ses barres varient.
 *
 * On trace donc l'ÉCART entre deux relevés consécutifs, qui est un flux : « le marché
 * a gagné 8 milliards sur cette tranche ». L'axe part de zéro sans rien écraser,
 * puisque zéro est ici la valeur qui a un sens — le marché n'a pas bougé. Le NIVEAU,
 * lui, reste affiché en chiffre héros juste au-dessus.
 *
 * ── LA DÉCOUPE EST EN DURÉE, PAS EN NOMBRE DE POINTS ────────────────────────
 *
 * Les relevés ne sont pas régulièrement espacés : ils suivent les lectures réelles des
 * statistiques globales, qui dépendent du trafic et des expirations de cache. Un
 * découpage en parts égales de POINTS donnerait des barres couvrant des durées
 * différentes, et l'axe mentirait sur le temps.
 *
 * Chaque tranche retient son DERNIER relevé plutôt qu'une moyenne : la moyenne de deux
 * états n'est l'état de rien.
 */
function bucketize(points: MarketCapPoint[]): { label: string; delta: number }[] {
  if (points.length === 0) return []

  const first = points[0]?.timestamp ?? 0
  const last = points[points.length - 1]?.timestamp ?? 0
  const span = last - first
  if (span <= 0) return []

  const width = span / BUCKETS
  const buckets: (MarketCapPoint | undefined)[] = Array.from({ length: BUCKETS })

  for (const point of points) {
    /* `min` borne le dernier point, dont le rapport vaut exactement 1 et qui
       tomberait sinon dans une tranche inexistante. */
    const index = Math.min(BUCKETS - 1, Math.floor((point.timestamp - first) / width))
    buckets[index] = point
  }

  const kept = buckets.filter((point): point is MarketCapPoint => point !== undefined)

  /* La PREMIÈRE tranche n'a pas de tranche précédente, donc pas d'écart : elle sert de
     référence et n'est pas rendue. Lui attribuer un écart nul afficherait une barre
     plate qui se lirait comme « le marché n'a pas bougé », ce qui est une affirmation
     que la donnée ne permet pas. */
  return kept.slice(1).map((point, index) => ({
    label: new Date(point.timestamp).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    }),
    delta: point.value - (kept[index]?.value ?? point.value),
  }))
}

export async function MarketCapCard({
  result,
  series,
}: {
  result: DataResult<GlobalMarketStats>
  series: MarketCapSeriesState
}) {
  const fr = await getContent()
  const t = await getPhrase()

  if (!result.ok) {
    return (
      <EmptyState
        title={fr.globalStats.unavailable}
        description={result.reason}
        source={result.source?.label ?? null}
        compact
      />
    )
  }

  const stats = result.data
  const bars = series.ready ? bucketize(series.points) : []

  return (
    <div className="flex flex-col gap-3 rounded-panel border border-border-subtle bg-panel p-4">
      {/* LIBELLÉ DE SÉRIE, avec sa pastille de couleur — c'est ce qui dit à quoi
          l'histogramme du dessous se rapporte. Chez la référence, cette ligne porte
          la même pastille que les barres ; ici la pastille reprend la teinte de
          série effectivement passée à la figure. */}
      <p className="text-micro text-ink-muted">{t('Capitalisation crypto totale')}</p>

      <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="display-sm tabular text-ink">
          <Money value={stats.totalMarketCap} from={stats.currency} compact />
        </span>
        <ChangeBadge value={stats.marketCapChange24h} size="sm" />
      </p>

      {bars.length > 1 ? (
        <>
          <BarFigure
            data={bars}
            series={[
              {
                key: 'delta',
                label: t('Variation'),
                color: dataColor(0),
                format: 'compact',
              },
            ]}
            /* `signed` : la barre prend le vert de hausse ou le rouge de baisse selon
               son signe. Sur une figure de VARIATION, la couleur porte déjà ce sens
               partout ailleurs sur le site — une barre peinte dans une teinte de série
               dirait « ceci est la série 1 » là où le lecteur attend « ceci a monté ». */
            signed
            height={150}
            ariaLabel={t('Variation de la capitalisation crypto, par tranche de relevés')}
          />
          <p className="text-micro text-ink-muted">
            {fr.home.marketCapSeriesHint(series.spanMinutes)}
          </p>
        </>
      ) : (
        /* Ni figure ni cadre vide : une phrase qui dit POURQUOI il n'y a pas encore de
           barres. Un histogramme absent sans explication se lit comme une panne. */
        <p className="text-micro text-ink-muted">
          {fr.home.marketCapSeriesBuilding(series.points.length)}
        </p>
      )}

      {/* Quatre agrégats sous la figure, repris de `MarketOverviewCard` : ils
          répondent à « sur quoi porte ce chiffre », qui est la question suivante. */}
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 border-t border-border-subtle pt-3">
        <Stat label={t('Volume 24 h')}>
          <Money value={stats.totalVolume24h} from={stats.currency} compact />
        </Stat>
        <Stat label={t('Actifs suivis')}>{formatNumber(stats.activeAssets) ?? '—'}</Stat>
        <Stat label={t('Dominance BTC')}>
          {formatCompact(stats.dominance['btc']) ? `${formatCompact(stats.dominance['btc'])} %` : '—'}
        </Stat>
        <Stat label={t('Dominance ETH')}>
          {formatCompact(stats.dominance['eth']) ? `${formatCompact(stats.dominance['eth'])} %` : '—'}
        </Stat>
      </dl>
    </div>
  )
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-micro text-ink-muted">{label}</dt>
      <dd className="tabular text-sm font-medium text-ink">{children}</dd>
    </div>
  )
}
