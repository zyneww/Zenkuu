import {
  getCategories,
  getDerivativeExchanges,
  getMacroIndicator,
  getSentiment,
  getSentimentHistory,
  getTrendingPools,
  type GlobalMarketStats,
} from '@zenkuu/data'
import { ChangeBadge, EmptyState, formatCompact, formatShare } from '@zenkuu/ui'

import { AnalysisCard, RankTable } from '@/components/home/AnalysisCard'
import { BarFigure } from '@/components/charts/BarFigure'
import { LineFigure } from '@/components/charts/LineFigure'
import { dataColor } from '@/components/charts/chart-theme'
import { classify } from '@/components/home/SidePanels'
import { getContent, getPhrase } from '@/lib/content'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * LES CINQ ANALYSES QUI NE SUIVENT PAS LA PASTILLE DE CLASSE
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── POURQUOI ELLES SONT SÉPARÉES DES TROIS AUTRES ───────────────────────────
 *
 * Les trois analyses de `ClassAnalyses` se recalculent au changement de pastille,
 * parce qu'elles se déduisent des lignes du tableau. Ces cinq-ci ne le peuvent pas, et
 * pour deux raisons distinctes qu'il vaut mieux ne pas confondre :
 *
 *   · la DOMINANCE, le SENTIMENT, les SECTEURS et les FLUX n'existent que pour la
 *     crypto. Il n'y a pas de dominance des ETF, ni d'indice de peur des matières
 *     premières — les faire suivre la pastille afficherait quatre états vides sur
 *     sept classes ;
 *   · la MACRO ne relève d'aucune classe. L'inflation d'un pays explique en partie ce
 *     que font ses indices et sa devise, mais elle n'appartient ni aux uns ni à
 *     l'autre.
 *
 * Chacune ANNONCE sa portée dans son sous-titre plutôt que de la laisser deviner. Une
 * carte qui ignore le filtre au-dessus d'elle sans le dire est un piège.
 *
 * ── CINQ APPELS, EN PARALLÈLE, SOUS `<Suspense>` ────────────────────────────
 *
 * Ils touchent cinq sources distinctes — CoinGecko, Alternative.me, GeckoTerminal, la
 * Banque mondiale — et partent ensemble. Le temps de la grappe est celui du plus lent,
 * pas la somme. La dominance ne coûte rien : elle réutilise l'agrégat que la page
 * demande déjà pour sa carte de tête.
 */

/** Lignes retenues par tableau et par figure. */
const ROWS = 5
const BARS = 8

/**
 * Historique du sentiment, en jours.
 *
 * Trente et non trois cent soixante-cinq : la carte fait deux cents pixels de haut, et
 * une année de relevés quotidiens y devient un mur de bruit dont aucune tendance ne
 * ressort. La page /sentiment porte la fenêtre longue, avec la place pour la lire.
 */
const SENTIMENT_DAYS = 30

/**
 * Économies retenues pour la carte macro.
 *
 * Une liste ÉCRITE plutôt qu'un tri sur les valeurs, et c'est délibéré. Trier par
 * inflation décroissante remonterait les économies en crise hyperinflationniste —
 * exact, spectaculaire, et sans rapport avec ce qui meut les indices et les devises
 * que le site cote. Ces huit-là sont les zones dont nos classes d'actifs dépendent
 * réellement.
 *
 * L'ordre est celui de la lecture, pas celui des valeurs : la zone euro d'abord,
 * puisque le site cote en euros par défaut.
 */
const ECONOMIES = ['EUU', 'FRA', 'DEU', 'USA', 'GBR', 'JPN', 'CHN', 'CAN'] as const

/** Code Banque mondiale de l'inflation des prix à la consommation, en rythme annuel. */
const INFLATION = 'FP.CPI.TOTL.ZG'

export async function GlobalAnalyses({ globals }: { globals: GlobalMarketStats | null }) {
  const t = await getPhrase()
  const fr = await getContent()

  const [sentiment, history, categories, macro, pools, derivatives] = await Promise.all([
    getSentiment(),
    getSentimentHistory(SENTIMENT_DAYS),
    getCategories(BARS),
    getMacroIndicator(INFLATION, 1),
    getTrendingPools(),
    getDerivativeExchanges(ROWS),
  ])

  /* ── DOMINANCE ────────────────────────────────────────────────────────────
     `dominance` est une table symbole → part. Elle ne totalise PAS cent : la source
     ne publie que les premières places. On ajoute donc explicitement le reste plutôt
     que de laisser croire que la figure couvre tout le marché — une figure de parts
     dont la somme est muette se lit comme si elle était complète. */
  const shares = Object.entries(globals?.dominance ?? {})
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6)
  const listed = shares.reduce((total, [, value]) => total + value, 0)
  const dominance = [
    ...shares.map(([symbol, value]) => ({ label: symbol.toUpperCase(), share: value })),
    ...(listed < 99 ? [{ label: t('Autres'), share: Math.max(0, 100 - listed) }] : []),
  ]

  const sentimentSeries = (history.ok ? history.data : [])
    .slice()
    .sort((a, b) => a.timestamp - b.timestamp)
    .map((point) => ({
      label: new Date(point.timestamp).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
      }),
      value: point.value,
    }))

  const sectors = (categories.ok ? categories.data : [])
    .filter((entry) => (entry.marketCap ?? 0) > 0)
    .slice(0, BARS)

  /* La Banque mondiale publie la dernière année DISPONIBLE par pays, et elle diffère
     d'un pays à l'autre. On garde donc l'observation la plus récente de chacun plutôt
     que de filtrer sur une année commune, qui exclurait les pays en retard de
     publication. L'année réelle est écrite à côté de la valeur. */
  const inflation = ECONOMIES.map((iso3) => {
    const observations = (macro.ok ? macro.data : []).filter((row) => row.iso3 === iso3)
    return observations.sort((a, b) => b.year - a.year)[0]
  }).filter((row): row is NonNullable<typeof row> => row !== undefined)

  const topPools = (pools.ok ? pools.data : [])
    .filter((pool) => (pool.volume24hUsd ?? 0) > 0)
    .sort((a, b) => (b.volume24hUsd ?? 0) - (a.volume24hUsd ?? 0))
    .slice(0, ROWS)

  const venues = derivatives.ok ? derivatives.data.slice(0, ROWS) : []

  return (
    <>
      {/* ── DOMINANCE ────────────────────────────────────────────────────── */}
      <AnalysisCard
        family={t('Analyse de la dominance')}
        title={t('Répartition de la capitalisation')}
        hint={t('Part de chaque actif dans la capitalisation crypto totale')}
        href="/graphiques"
        action={t('Voir')}
      >
        {dominance.length > 0 ? (
          <BarFigure
            data={dominance}
            series={[{ key: 'share', label: t('Part'), color: dataColor(2), format: 'share' }]}
            ariaLabel={t('Répartition de la capitalisation crypto par actif')}
          />
        ) : (
          <Absent reason={t('Agrégat de marché indisponible')} />
        )}
      </AnalysisCard>

      {/* ── SENTIMENT ────────────────────────────────────────────────────── */}
      <AnalysisCard
        family={t('Analyse du sentiment')}
        title={t('Peur et avidité sur 30 jours')}
        hint={t('Indice crypto de 0 — peur extrême — à 100 — avidité extrême')}
        href="/sentiment"
        action={t('Voir')}
      >
        {/* `classify` et NON `sentiment.data.classification` : la source publie son
            libellé en anglais (« Greed », « Extreme Fear »). Le rendre tel quel
            laisserait un mot anglais au milieu d'une page française. La fonction vit
            dans `SidePanels` et sert déjà quatre endroits — les seuils y sont écrits
            une fois, ce qui évite que deux pages annoncent deux libellés différents
            pour la même valeur. */}
        {sentiment.ok ? (
          <p className="flex items-baseline gap-2">
            <span className="tabular text-3xl font-semibold text-ink">{sentiment.data.value}</span>
            <span className="text-sm text-ink-muted">
              {classify(sentiment.data.value, fr.sentiment.scale)}
            </span>
          </p>
        ) : null}

        {sentimentSeries.length > 1 ? (
          <LineFigure
            data={sentimentSeries}
            series={[{ key: 'value', label: t('Indice'), color: dataColor(4) }]}
            format="compact"
            height={200}
            ariaLabel={t('Indice de peur et d’avidité sur trente jours')}
          />
        ) : (
          <Absent reason={history.ok ? null : history.reason} />
        )}
      </AnalysisCard>

      {/* ── SECTEURS ─────────────────────────────────────────────────────── */}
      <AnalysisCard
        family={t('Analyse sectorielle')}
        title={t('Capitalisation par secteur')}
        hint={t('Les secteurs crypto les plus capitalisés, et leur variation du jour')}
        href="/categories"
        action={t('Voir')}
      >
        {sectors.length > 0 ? (
          <>
            <BarFigure
              data={sectors.map((entry) => ({
                label: entry.name.length > 12 ? `${entry.name.slice(0, 11)}…` : entry.name,
                cap: entry.marketCap,
              }))}
              series={[
                {
                  key: 'cap',
                  label: t('Capitalisation'),
                  color: dataColor(5),
                  format: 'compact',
                },
              ]}
              ariaLabel={t('Capitalisation par secteur crypto')}
            />

            <RankTable
              columns={[t('Secteur'), t('Capitalisation'), t('24 h')]}
              rows={sectors.slice(0, ROWS).map((entry) => ({
                key: entry.id,
                cells: [
                  <span key="n" className="truncate">
                    {entry.name}
                  </span>,
                  formatCompact(entry.marketCap) ?? '—',
                  <ChangeBadge key="c" value={entry.marketCapChange24h} size="sm" />,
                ],
              }))}
            />
          </>
        ) : (
          <Absent reason={categories.ok ? null : categories.reason} />
        )}
      </AnalysisCard>

      {/* ── MACRO ────────────────────────────────────────────────────────── */}
      <AnalysisCard
        family={t('Analyse macroéconomique')}
        title={t('Inflation des prix à la consommation')}
        hint={t('Dernière année publiée par économie — ce qui meut les indices et les devises')}
        href="/macro"
        action={t('Voir')}
      >
        {inflation.length > 0 ? (
          <>
            <BarFigure
              data={inflation.map((row) => ({
                label: row.iso3,
                rate: row.value,
              }))}
              series={[
                { key: 'rate', label: t('Inflation'), color: dataColor(1), format: 'percent' },
              ]}
              signed
              ariaLabel={t('Inflation annuelle par économie')}
            />

            <RankTable
              columns={[t('Économie'), t('Année'), t('Inflation')]}
              rows={inflation.slice(0, ROWS).map((row) => ({
                key: row.iso3,
                cells: [
                  <span key="n" className="truncate">
                    {row.country}
                  </span>,
                  String(row.year),
                  formatShare(row.value) ?? '—',
                ],
              }))}
            />
          </>
        ) : (
          <Absent reason={macro.ok ? null : macro.reason} />
        )}
      </AnalysisCard>

      {/* ── FLUX DE TRADING ──────────────────────────────────────────────── */}
      <AnalysisCard
        family={t('Analyse des flux de trading')}
        title={t('Pools de liquidité les plus actifs')}
        hint={t('Volume échangé sur 24 heures, rapporté à la profondeur du pool')}
        href="/marches"
        action={t('Voir')}
      >
        {topPools.length > 0 ? (
          <RankTable
            columns={[t('Paire'), t('Liquidité'), t('Volume 24 h'), t('Rotation')]}
            rows={topPools.map((pool) => {
              const depth = pool.liquidityUsd ?? 0
              const rate = depth > 0 ? ((pool.volume24hUsd ?? 0) / depth) * 100 : undefined
              return {
                key: pool.id,
                cells: [
                  <span key="n" className="flex flex-col">
                    <span className="truncate font-medium">{pool.name}</span>
                    <span className="truncate text-micro text-ink-muted">{pool.network}</span>
                  </span>,
                  formatCompact(pool.liquidityUsd) ?? '—',
                  formatCompact(pool.volume24hUsd) ?? '—',
                  /* PAS de `ShareBar` ici, contrairement aux autres tableaux de
                     rotation. Sur un pool, le volume d'une journée dépasse
                     couramment la profondeur — les cinq lignes affichent des taux de
                     1 000 à 11 000 %, et une jauge bornée à cent les rendrait toutes
                     pleines. Cinq jauges identiques ne classent plus rien : le nombre
                     seul est ici le seul porteur d'information. */
                  rate === undefined ? '—' : (formatShare(rate) ?? '—'),
                ],
              }
            })}
          />
        ) : (
          <Absent reason={pools.ok ? null : pools.reason} />
        )}
      </AnalysisCard>

      <AnalysisCard
        title={t('Places de dérivés')}
        hint={t('Positions ouvertes et volume déclarés par chaque place')}
        href="/perpetuels"
        action={t('Voir')}
      >
        {venues.length > 0 ? (
          <RankTable
            columns={[t('Place'), t('Positions ouvertes'), t('Volume 24 h')]}
            rows={venues.map((venue) => ({
              key: venue.id,
              cells: [
                <span key="n" className="truncate">
                  {venue.name}
                </span>,
                formatCompact(venue.openInterestBtc) ?? '—',
                formatCompact(venue.volume24hBtc) ?? '—',
              ],
            }))}
          />
        ) : (
          <Absent reason={derivatives.ok ? null : derivatives.reason} />
        )}
      </AnalysisCard>
    </>
  )
}

/**
 * Absence NOMMÉE, avec la phrase du fournisseur quand il en donne une.
 *
 * `reason` à `null` couvre le cas où l'appel a RÉUSSI mais n'a rien rendu — une source
 * qui répond une liste vide n'est pas une source en panne, et écrire « la source n'a
 * pas répondu » serait faux. Le titre reste le même, seule la précision disparaît.
 */
async function Absent({ reason }: { reason?: string | null }) {
  const t = await getPhrase()
  return <EmptyState title={t('Donnée indisponible')} description={reason ?? null} compact />
}

