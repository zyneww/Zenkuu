import {
  getCategories,
  getDerivativeExchanges,
  getMacroIndicator,
  getSentiment,
  getSentimentHistory,
  getTrendingPools,
  type MacroObservation,
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
 * LES QUATRE ANALYSES QUI NE SUIVENT PAS LA PASTILLE DE CLASSE
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── POURQUOI ELLES SONT SÉPARÉES DES TROIS AUTRES ───────────────────────────
 *
 * Les trois analyses de `ClassAnalyses` se recalculent au changement de pastille,
 * parce qu'elles se déduisent des lignes du tableau. Ces quatre-ci ne le peuvent pas :
 * le SENTIMENT, les SECTEURS et les FLUX n'existent que pour la crypto — il n'y a pas
 * d'indice de peur des matières premières, et les faire suivre la pastille afficherait
 * des états vides sur six classes sur sept.
 *
 * Chacune ANNONCE sa portée dans son sous-titre plutôt que de la laisser deviner. Une
 * carte qui ignore le filtre au-dessus d'elle sans le dire est un piège.
 *
 * ── ELLES SONT CINQ, ET LA CINQUIÈME EST REVENUE DE PLUS HAUT ──────────────
 *
 * La MACRO a fait l'aller-retour : elle vivait ici, elle est montée dans le résumé de
 * marché quand celui-ci tenait le premier écran, et elle redescend avec la suppression
 * de ce résumé. La DOMINANCE, elle, ne revient pas — le bandeau de synthèse la porte
 * en barre segmentée, avant le premier défilement, ce qui est mieux que ce que cette
 * grille pouvait en faire.
 *
 * La macro n'a d'ailleurs jamais relevé d'une classe : l'inflation d'un pays explique
 * en partie ce que font ses indices et sa devise, sans appartenir ni aux uns ni à
 * l'autre. Elle est donc à sa place parmi les analyses qui ne suivent aucune pastille.
 *
 * ── SEPT APPELS, EN PARALLÈLE, SOUS `<Suspense>` ───────────────────────────
 *
 * Ils touchent quatre sources distinctes — CoinGecko, Alternative.me, GeckoTerminal,
 * Banque mondiale — et partent ensemble. Le temps de la grappe est celui du plus lent,
 * pas la somme.
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

/* ── LES TROIS INDICATEURS MACRO, ET CE QU'ILS NE SONT PAS ──────────────────
   Reprisés tels quels de `MarketSummary`, supprimé. Ce ne sont PAS des taux : la
   Banque mondiale n'en publie aucun qui soit la politique monétaire, et ceux qu'elle
   publie s'arrêtent à 2021 pour les États-Unis. Afficher un chiffre périmé de cinq ans
   à hauteur d'un cours est exactement ce que le §5 proscrit. Croissance et chômage,
   eux, vont jusqu'à l'année en cours. */
const INFLATION = 'FP.CPI.TOTL.ZG'
const GROWTH = 'NY.GDP.MKTP.KD.ZG'
const UNEMPLOYMENT = 'SL.UEM.TOTL.ZS'

/* Économies DANS L'ORDRE DE PRÉFÉRENCE, et sans agrégat : notre adaptateur écarte les
   agrégats à la source (ils portent une région `NA`), donc demander « zone euro » ici
   rendrait une carte vide. La France d'abord — première économie de la zone pour un
   lectorat francophone — puis l'Allemagne, puis les États-Unis si une série manque. */
const ECONOMIES = ['FRA', 'DEU', 'USA'] as const

/** Années d'inflation tracées. Huit barres, comme les autres figures de cette grille. */
const INFLATION_YEARS = 8

export async function GlobalAnalyses() {
  const t = await getPhrase()
  const fr = await getContent()

  const [sentiment, history, categories, pools, derivatives, inflation, growth, unemployment] =
    await Promise.all([
      getSentiment(),
      getSentimentHistory(SENTIMENT_DAYS),
      getCategories(BARS),
      getTrendingPools(),
      getDerivativeExchanges(ROWS),
      getMacroIndicator(INFLATION, INFLATION_YEARS),
      getMacroIndicator(GROWTH, 1),
      getMacroIndicator(UNEMPLOYMENT, 1),
    ])

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

  const topPools = (pools.ok ? pools.data : [])
    .filter((pool) => (pool.volume24hUsd ?? 0) > 0)
    .sort((a, b) => (b.volume24hUsd ?? 0) - (a.volume24hUsd ?? 0))
    .slice(0, ROWS)

  const venues = derivatives.ok ? derivatives.data.slice(0, ROWS) : []

  /* Les barres suivent l'ordre du TEMPS et non celui des valeurs : une série annuelle
     triée par valeur ne se lit plus comme une série. */
  const inflationRows = pickSeries(inflation.ok ? inflation.data : [])
    .sort((a, b) => a.year - b.year)
    .slice(-INFLATION_YEARS)

  const growthRow = pickSeries(growth.ok ? growth.data : [])[0]
  const unemploymentRow = pickSeries(unemployment.ok ? unemployment.data : [])[0]

  return (
    <>
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
            /* La carte voisine — secteurs — porte une figure ET un tableau : la rangée
               fait donc près de cent-vingt pixels de plus que cette figure. `grow` les
               lui donne au lieu de les laisser en vide sous la courbe. */
            grow
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
              /* Le nom ENTIER part dans la donnée ; c'est `tickMaxChars` qui raccourcit
                 la graduation. Tronquer ici faisait afficher « Smart Contr… » jusque
                 DANS l'infobulle, c'est-à-dire à l'endroit même où l'on venait chercher
                 le nom complet. */
              data={sectors.map((entry) => ({
                label: entry.name,
                cap: entry.marketCap,
              }))}
              tickMaxChars={11}
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

      {/* ── MACRO ────────────────────────────────────────────────────────── */}
      <AnalysisCard
        family={t('Analyse macroéconomique')}
        title={t('Inflation annuelle')}
        hint={t('Hausse des prix à la consommation, et l’état de l’économie qui porte ces marchés')}
        href="/macro"
        action={t('Voir')}
      >
        {inflationRows.length > 0 ? (
          <BarFigure
            data={inflationRows.map((row) => ({
              label: String(row.year),
              rate: row.value,
            }))}
            series={[
              {
                key: 'rate',
                label: t('Inflation'),
                color: dataColor(1),
                format: 'percent',
              },
            ]}
            /* PAS de `signed`. Le drapeau peint la barre en VERT quand la valeur est
               positive, et une inflation à 8 % ainsi coloriée se lit comme une bonne
               nouvelle. La hausse et la baisse sont la sémantique des VARIATIONS d'un
               cours ; une inflation est un niveau, et prend donc la teinte de sa série.
               Une déflation reste distinguable : sa barre passe sous l'axe. */
            height={200}
            grow
            ariaLabel={t('Inflation annuelle des prix à la consommation')}
          />
        ) : (
          <Absent reason={inflation.ok ? null : inflation.reason} />
        )}

        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 border-t border-border-subtle pt-3">
          <MacroStat label={t('Croissance du PIB')} row={growthRow} />
          <MacroStat label={t('Chômage')} row={unemploymentRow} />
        </dl>
      </AnalysisCard>
    </>
  )
}

/**
 * Toutes les observations de la première économie de `ECONOMIES` qui en a.
 *
 * Rendues de la PLUS RÉCENTE à la plus ancienne, ce qui donne le dernier point en tête
 * pour un appelant qui n'en veut qu'un, et une série complète pour celui qui la trace.
 * Les observations sont ENTIÈRES et non réduites à leur valeur : l'appelant a besoin du
 * pays et de l'année pour les écrire à côté du chiffre — un taux nu se lirait comme un
 * taux du jour là où c'est celui d'une année déjà close.
 */
function pickSeries(rows: MacroObservation[]): MacroObservation[] {
  for (const iso3 of ECONOMIES) {
    const match = rows.filter((row) => row.iso3 === iso3).sort((a, b) => b.year - a.year)
    if (match.length > 0) return match
  }
  return []
}

/** Un chiffre macro et sa provenance — le pays et l'année sont ce qui le rend lisible. */
function MacroStat({ label, row }: { label: string; row: MacroObservation | undefined }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-micro text-ink-muted">{label}</dt>
      <dd className="tabular text-sm font-medium text-ink">
        {row ? `${formatCompact(row.value) ?? '—'} %` : '—'}
      </dd>
      <dd className="text-micro text-ink-muted">{row ? `${row.country} · ${row.year}` : '—'}</dd>
    </div>
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

