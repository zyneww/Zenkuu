import { getLocale } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { getMarketCapSeriesState, MIN_POINTS_FOR_CHART } from '@zenkuu/data'
import type { GlobalMarketStats, MarketCapPoint, SentimentIndex } from '@zenkuu/data'
import { ChangeBadge, Sparkline } from '@zenkuu/ui'

import { classify } from '@/components/home/SidePanels'
import { StatsBarCollapse } from '@/components/home/StatsBarCollapse'
import { Money } from '@/components/locale/Money'
import { getContent, getPhrase } from '@/lib/content'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * LA RANGÉE DE CINQ MÉTRIQUES
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Cinq chiffres alignés sous le titre, dans l'ordre de la référence CoinAcademy :
 * capitalisation, volume, dominance BTC, dominance ETH, profondeur du catalogue.
 *
 * ── UNE SEULE VARIATION EST AFFICHÉE, ET CE N'EST PAS UN OUBLI ──────────────
 *
 * La référence colore les cinq. `GlobalMarketStats` n'en porte QU'UNE :
 * `marketCapChange24h`. Les quatre autres n'existent chez aucun fournisseur gratuit —
 * CoinAcademy les affiche parce qu'ils conservent leur propre historique horodaté.
 *
 * Les dériver de `market-cap-series` produirait un pourcentage vrai en apparence et
 * faux en pratique : ces relevés ne couvrent que la capitalisation, sont locaux, et
 * commencent au premier démarrage du processus. Un chiffre absent se lit comme une
 * limite ; un chiffre inventé se lit comme une donnée (§5).
 *
 * ── UNE SIXIÈME TUILE, SUR UNE SEULE DES DEUX PAGES ────────────────────────
 *
 * `/crypto` affiche le sentiment de marché ici, l'accueil non — sa maquette de
 * référence n'en porte pas, et l'indice a sa propre page. `sentiment` est donc
 * FACULTATIF, et la rangée est un `flex-wrap` plutôt qu'une grille à cinq colonnes :
 * une grille fixe reléguerait la sixième tuile seule sur une deuxième ligne, ce qui se
 * lit comme un défaut de mise en page plutôt que comme une tuile de plus.
 */
export async function GlobalStatsBar({
  stats,
  sentiment,
}: {
  stats: GlobalMarketStats | null
  sentiment?: SentimentIndex | null
}) {
  const locale = await getLocale()
  const fr = await getContent()
  const t = await getPhrase()

  if (!stats) return null

  const btc = stats.dominance['btc']
  const eth = stats.dominance['eth']

  /*
   * MINI-GRAPHIQUE DE CAPITALISATION — LECTURE SYNCHRONE, SANS APPEL RÉSEAU.
   *
   * `getMarketCapSeriesState` ne fait rien d'autre que lire le tampon en mémoire du
   * processus (voir `market-cap-series.ts`) : aucun coût de quota à l'appeler ici, à
   * chaque rendu. La série peut être vide ou trop courte, notamment juste après un
   * redémarrage — c'est l'état NORMAL documenté par ce module, pas une panne, et
   * `series.ready` le distingue explicitement plutôt que de laisser un tracé plat.
   *
   * Volume et dominance voyagent dans les MÊMES points, mais certains — antérieurs à
   * l'ajout de ces champs — ne les portent pas : on filtre donc séparément plutôt que
   * de réutiliser `series.ready`, qui ne compte que la présence de `value`.
   */
  const series = getMarketCapSeriesState(stats.currency)
  const volumePoints = series.points.filter(
    (point): point is MarketCapPoint & { volume: number } => typeof point.volume === 'number',
  )
  const dominancePoints = series.points.filter(
    (point): point is MarketCapPoint & { btcDominance: number } =>
      typeof point.btcDominance === 'number',
  )

  return (
    <StatsBarCollapse label={t('Repères du marché')}>
    <section
      aria-label={t('Repères du marché')}
      /* `basis-36` : chaque tuile réclame 9 rem et prend le reste à parts égales. Sur
         360 px il en tient deux par ligne, sur un écran large les cinq — ou six —
         s'alignent d'elles-mêmes, sans point de rupture écrit à la main pour chaque
         nombre de tuiles possible.

         ── `graduated-b` : LA DÉLIMITATION SOUS LES CHIFFRES ────────────────

         C'est la bande de graduation du design system, et cette rangée est l'endroit
         pour lequel elle a été écrite — `globals.css` le dit en toutes lettres : « la
         barre de repères de l'accueil est la seule à ce jour ». Elle avait disparu en
         même temps que l'ancienne version de ce composant.

         Elle joue ici le rôle du filet que la référence pose sous sa barre de repères,
         et le joue mieux : le trait sépare, la graduation SIGNIFIE — un instrument de
         lecture, ce que ce site est et ce qu'une place de marché n'est pas.

         PAS de `border-b` avec elle. La note de `globals.css` est explicite : deux
         traits superposés feraient une soudure, pas une graduation. Le `pb-4` lui
         laisse la place de se poser sous les chiffres. */
      className="graduated graduated-b flex flex-wrap gap-x-8 gap-y-5 border-border-subtle pb-4"
    >
      <Stat label={t('Capitalisation totale')}>
        <Money value={stats.totalMarketCap} from={stats.currency} compact />
        <ChangeBadge value={stats.marketCapChange24h} size="sm" />
        <MiniTrend
          points={series.points}
          field="value"
          ready={series.ready}
          label={t('Évolution de la capitalisation, relevés ZENKUU')}
          emptyLabel={t('Courbe en construction')}
        />
      </Stat>

      <Stat label={t('Volume 24 h')}>
        <Money value={stats.totalVolume24h} from={stats.currency} compact />
        <MiniTrend
          points={volumePoints}
          field="volume"
          ready={volumePoints.length >= MIN_POINTS_FOR_CHART}
          label={t('Évolution du volume, relevés ZENKUU')}
          emptyLabel={t('Courbe en construction')}
        />
      </Stat>

      {typeof btc === 'number' ? (
        <Stat label={t('Dominance BTC')}>
          <span className="tabular">{btc.toFixed(1)} %</span>
          <MiniTrend
            points={dominancePoints}
            field="btcDominance"
            ready={dominancePoints.length >= MIN_POINTS_FOR_CHART}
            label={t('Évolution de la dominance BTC, relevés ZENKUU')}
            emptyLabel={t('Courbe en construction')}
          />
        </Stat>
      ) : null}

      {typeof eth === 'number' ? (
        <Stat label={t('Dominance ETH')}>
          <span className="tabular">{eth.toFixed(1)} %</span>
        </Stat>
      ) : null}

      <Stat label={t('Cryptomonnaies')}>
        <span className="tabular">{stats.activeAssets.toLocaleString(locale)}</span>
      </Stat>

      {sentiment ? (
        <Stat label={t('Sentiment')}>
          <Link href="/sentiment" className="flex items-baseline gap-1.5 hover:text-brand">
            <span className="tabular">{sentiment.value}</span>
            <span className="text-xs font-normal text-ink-muted">
              {classify(sentiment.value, fr.sentiment.scale)}
            </span>
          </Link>
        </Stat>
      ) : null}
    </section>
    </StatsBarCollapse>
  )
}

/**
 * Mini-graphique d'une métrique, ou l'aveu explicite qu'elle est trop courte.
 *
 * `ready` distingue « pas assez de points relevés » d'un tracé plat qui mentirait sur
 * la tendance. Dans ce cas, un court libellé remplace le graphique plutôt qu'un tiret
 * muet — c'est ce que le commentaire d'en-tête de `market-cap-series.ts` demande
 * explicitement : l'interface doit DIRE que la courbe est trop courte, pas le laisser
 * deviner.
 */
function MiniTrend({
  points,
  field,
  ready,
  label,
  emptyLabel,
}: {
  points: MarketCapPoint[]
  field: 'value' | 'volume' | 'btcDominance'
  ready: boolean
  label: string
  emptyLabel: string
}) {
  if (!ready) {
    return (
      <span className="text-[0.6875rem] font-normal text-ink-muted" title={emptyLabel}>
        {emptyLabel}
      </span>
    )
  }

  const values = points
    .map((point) => point[field])
    .filter((value): value is number => typeof value === 'number')

  return <Sparkline values={values} width={64} height={22} label={label} />
}

/**
 * Une métrique : libellé au-dessus, valeur en dessous.
 *
 * L'inverse de l'ancienne disposition en ligne. Empilé, le libellé peut être écrit en
 * toutes lettres — « Capitalisation totale » et non « Cap. » — sans coûter de largeur
 * à la valeur, qui est ce que l'œil vient chercher.
 */
function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-1 basis-36 flex-col gap-1">
      <span className="text-[0.6875rem] uppercase tracking-wide text-ink-muted">{label}</span>
      <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-lg font-semibold text-ink">
        {children}
      </span>
    </div>
  )
}
