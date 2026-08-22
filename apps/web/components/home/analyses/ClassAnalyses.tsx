'use client'

import type { MarketAsset } from '@zenkuu/data'
import { EmptyState, formatCompact, formatShare } from '@zenkuu/ui'

import { AnalysisCard, RankTable, ShareBar } from '@/components/home/AnalysisCard'
import { BarFigure } from '@/components/charts/BarFigure'
import { dataColor } from '@/components/charts/chart-theme'
import { usePhrase } from '@/components/locale/ContentProvider'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * LES TROIS ANALYSES QUI SUIVENT LA CLASSE SÉLECTIONNÉE
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── ELLES NE COÛTENT AUCUNE REQUÊTE ─────────────────────────────────────────
 *
 * Toutes trois se DÉDUISENT des lignes déjà chargées pour le tableau de cotations.
 * L'offre, le volume et la rotation sont des champs de `MarketAsset` ; la comparaison
 * ne fait qu'en retenir deux. Aller les chercher séparément aurait payé une seconde
 * fois ce que la page transporte déjà.
 *
 * C'est aussi ce qui permet aux trois de se recalculer INSTANTANÉMENT au changement de
 * pastille : il n'y a rien à attendre, la donnée des sept classes est là.
 *
 * ── CE QU'ELLES FONT QUAND LA CLASSE NE PORTE PAS LA DONNÉE ─────────────────
 *
 * Une paire de devises n'a pas d'offre en circulation, un indice n'a pas de
 * capitalisation. Chaque carte VÉRIFIE la présence du champ et rend un état vide
 * nommé plutôt qu'une figure à zéro — c'est la règle §5, et c'est ce qui distingue
 * « cette classe n'a pas cette mesure » de « la mesure vaut zéro ».
 */

/** Lignes retenues par figure. Huit barres tiennent sans que les libellés se chevauchent. */
const BARS = 8

/** Lignes retenues par tableau. Cinq, comme les cartes de tendance. */
const ROWS = 5

/**
 * Part de l'offre déjà émise, en pourcentage.
 *
 * `undefined` — et non zéro — dès qu'un des deux termes manque ou que l'offre maximale
 * est nulle. Un actif à offre illimitée (Ethereum n'a pas de plafond publié) n'a pas
 * une part émise de 0 % : il n'en a pas du tout.
 */
function issuedShare(asset: MarketAsset): number | undefined {
  const { circulatingSupply, maxSupply } = asset
  if (circulatingSupply === undefined || maxSupply === undefined || maxSupply <= 0) return undefined
  return (circulatingSupply / maxSupply) * 100
}

/**
 * Taux de rotation : part de la capitalisation qui a changé de mains en 24 h.
 *
 * C'est une mesure de LIQUIDITÉ et non de popularité. Un actif dont 40 % de la
 * capitalisation s'échange en une journée sort de son régime ordinaire — c'est un
 * fait mesuré, pas une inférence.
 */
function turnover(asset: MarketAsset): number | undefined {
  const { volume24h, marketCap } = asset
  if (volume24h === undefined || marketCap === undefined || marketCap <= 0) return undefined
  return (volume24h / marketCap) * 100
}

/** État vide partagé : la classe existe, la mesure n'existe pas pour elle. */
function NoMeasure({ label }: { label: string }) {
  const t = usePhrase()
  return (
    <EmptyState
      title={t('Mesure non publiée pour cette classe')}
      description={t(
        'Les sources de {classe} ne publient pas cette donnée. Elle reste disponible sur les classes qui la portent.',
      ).replace('{classe}', label)}
      compact
    />
  )
}

/**
 * FAMILLE « ANALYSE DE L'OFFRE » — deux cartes.
 *
 * Remplace leur « Emission Analysis ». Ils mesurent ce qui sera émis par un calendrier
 * de déblocage publié par chaque projet ; nous n'avons pas ces calendriers et ne les
 * inventerons pas. Ce que nous avons est la photographie : combien est en circulation
 * aujourd'hui, rapporté à ce qui peut exister. La question est voisine — quelle part
 * du total reste à venir — et la réponse, elle, est sourcée.
 */
export function SupplyAnalysis({ assets, label }: { assets: MarketAsset[]; label: string }) {
  const t = usePhrase()

  const withSupply = assets
    .map((asset) => ({ asset, share: issuedShare(asset) }))
    .filter((entry): entry is { asset: MarketAsset; share: number } => entry.share !== undefined)

  const figure = withSupply.slice(0, BARS).map((entry) => ({
    label: entry.asset.symbol.toUpperCase(),
    share: entry.share,
  }))

  /* Trié par part CROISSANTE : ce qui intéresse est ce qui reste à émettre, donc les
     actifs les MOINS avancés. Un tri décroissant remonterait les jetons intégralement
     émis, dont la réponse est « rien ne vient ». */
  const table = [...withSupply].sort((a, b) => a.share - b.share).slice(0, ROWS)

  return (
    <>
      <AnalysisCard
        family={t('Analyse de l’offre')}
        title={t('Part de l’offre déjà émise')}
        hint={t('Offre en circulation rapportée à l’offre maximale — {classe}').replace(
          '{classe}',
          label,
        )}
      >
        {figure.length > 0 ? (
          <BarFigure
            data={figure}
            series={[
              { key: 'share', label: t('Part émise'), color: dataColor(0), format: 'share' },
            ]}
            ariaLabel={t('Part de l’offre déjà émise, par actif')}
          />
        ) : (
          <NoMeasure label={label} />
        )}
      </AnalysisCard>

      <AnalysisCard
        title={t('Ce qu’il reste à émettre')}
        hint={t('Les actifs dont la plus grande part du total est encore à venir')}
      >
        {table.length > 0 ? (
          <RankTable
            columns={[t('Actif'), t('En circulation'), t('Offre maximale'), t('Part émise')]}
            rows={table.map(({ asset, share }) => ({
              key: asset.id,
              cells: [
                <span key="n" className="flex items-center gap-1.5">
                  <span className="font-medium">{asset.symbol.toUpperCase()}</span>
                  <span className="truncate text-micro text-ink-muted">{asset.name}</span>
                </span>,
                formatCompact(asset.circulatingSupply) ?? '—',
                formatCompact(asset.maxSupply) ?? '—',
                <span key="s" className="inline-flex items-center justify-end gap-2">
                  <ShareBar value={share} />
                  {formatShare(share) ?? '—'}
                </span>,
              ],
            }))}
          />
        ) : (
          <NoMeasure label={label} />
        )}
      </AnalysisCard>
    </>
  )
}

/**
 * FAMILLE « ANALYSE DES VOLUMES ET DE LA LIQUIDITÉ ».
 *
 * Remplace leur « Buyback Analysis ». Un rachat de jetons est un fait de trésorerie
 * que seule une source de tokenomics publie ; le VOLUME, lui, est publié par toutes
 * nos sources et pour les sept classes. C'est la même famille de question — où l'argent
 * passe-t-il — posée avec la donnée que nous avons.
 *
 * ── POURQUOI DEUX AXES ICI, ET NULLE PART AILLEURS ──────────────────────────
 *
 * Le volume se compte en milliards, la rotation plafonne à quelques dizaines de pour
 * cent. Sur un axe unique, la seconde série serait une ligne plate au ras de
 * l'abscisse. C'est le cas d'emploi exact que `BarFigure` réserve à son axe droit :
 * une valeur absolue opposée à une part, jamais deux grandeurs de même nature.
 */
export function VolumeAnalysis({ assets, label }: { assets: MarketAsset[]; label: string }) {
  const t = usePhrase()

  const rows = assets
    .filter((asset) => asset.volume24h !== undefined)
    .sort((a, b) => (b.volume24h ?? 0) - (a.volume24h ?? 0))

  const figure = rows.slice(0, BARS).map((asset) => ({
    label: asset.symbol.toUpperCase(),
    volume: asset.volume24h,
    turnover: turnover(asset),
  }))

  /* Trié par ROTATION et non par volume : le tableau répond à une autre question que
     la figure au-dessus. Celle-ci dit « où le volume est le plus gros », celui-là
     « où il est le plus gros RAPPORTÉ À LA TAILLE » — et c'est le second qui signale
     un actif hors de son régime ordinaire. */
  const table = rows
    .map((asset) => ({ asset, rate: turnover(asset) }))
    .filter((entry): entry is { asset: MarketAsset; rate: number } => entry.rate !== undefined)
    .sort((a, b) => b.rate - a.rate)
    .slice(0, ROWS)

  return (
    <>
      <AnalysisCard
        family={t('Analyse des volumes et de la liquidité')}
        title={t('Volume échangé et rotation')}
        hint={t('Volume sur 24 h en barres pleines, rotation en second axe — {classe}').replace(
          '{classe}',
          label,
        )}
      >
        {figure.length > 0 ? (
          <BarFigure
            data={figure}
            series={[
              { key: 'volume', label: t('Volume 24 h'), color: dataColor(3), format: 'compact' },
              {
                key: 'turnover',
                label: t('Rotation'),
                color: dataColor(1),
                axis: 'right',
                format: 'share',
              },
            ]}
            ariaLabel={t('Volume sur 24 heures et taux de rotation, par actif')}
          />
        ) : (
          <NoMeasure label={label} />
        )}
      </AnalysisCard>

      <AnalysisCard
        title={t('Les plus fortes rotations')}
        hint={t('Part de la capitalisation échangée en 24 heures')}
      >
        {table.length > 0 ? (
          <RankTable
            columns={[t('Actif'), t('Volume 24 h'), t('Capitalisation'), t('Rotation')]}
            rows={table.map(({ asset, rate }) => ({
              key: asset.id,
              cells: [
                <span key="n" className="flex items-center gap-1.5">
                  <span className="font-medium">{asset.symbol.toUpperCase()}</span>
                  <span className="truncate text-micro text-ink-muted">{asset.name}</span>
                </span>,
                formatCompact(asset.volume24h) ?? '—',
                formatCompact(asset.marketCap) ?? '—',
                <span key="s" className="inline-flex items-center justify-end gap-2">
                  <ShareBar value={rate} />
                  {formatShare(rate) ?? '—'}
                </span>,
              ],
            }))}
          />
        ) : (
          <NoMeasure label={label} />
        )}
      </AnalysisCard>
    </>
  )
}

/**
 * FAMILLE « ANALYSE COMPARATIVE ».
 *
 * Remplace leur « Token Allocation Comparison », qui oppose la répartition de deux
 * jetons entre fondateurs, investisseurs et communauté. Cette répartition-là relève
 * encore de la tokenomics, que nous n'avons pas.
 *
 * ── LES QUATRE MESURES SONT TOUTES DES POURCENTAGES, ET C'EST OBLIGATOIRE ───
 *
 * Un axe unique ne peut porter que des grandeurs comparables. Opposer un cours en
 * euros à une variation en pour cent sur la même hauteur de barre ferait lire un
 * rapport là où il n'y en a aucun. Les quatre retenues sont donc homogènes — deux
 * variations, une rotation, une part d'offre — et chacune se lit sur la même échelle.
 *
 * Les DEUX PREMIERS actifs de la classe, et non un choix : l'accueil montre l'usage,
 * la page /comparateur permet de choisir. Un sélecteur ici demanderait au lecteur de
 * composer sa comparaison avant d'avoir vu à quoi elle sert.
 */
export function CompareAnalysis({ assets, label }: { assets: MarketAsset[]; label: string }) {
  const t = usePhrase()
  const [first, second] = assets

  const measures =
    first && second
      ? [
          { label: t('Variation 24 h'), a: first.change24h, b: second.change24h },
          { label: t('Variation 7 j'), a: first.change7d, b: second.change7d },
          { label: t('Rotation'), a: turnover(first), b: turnover(second) },
          { label: t('Part émise'), a: issuedShare(first), b: issuedShare(second) },
        ].filter((row) => row.a !== undefined || row.b !== undefined)
      : []

  return (
    <AnalysisCard
      family={t('Analyse comparative')}
      title={
        first && second
          ? `${first.symbol.toUpperCase()} ${t('contre')} ${second.symbol.toUpperCase()}`
          : t('Deux actifs face à face')
      }
      hint={t('Quatre mesures homogènes, toutes en pourcentage — {classe}').replace(
        '{classe}',
        label,
      )}
      href="/comparateur"
      action={t('Comparer')}
    >
      {measures.length > 0 && first && second ? (
        <BarFigure
          data={measures.map((row) => ({ label: row.label, a: row.a, b: row.b }))}
          series={[
            { key: 'a', label: first.symbol.toUpperCase(), color: dataColor(0), format: 'percent' },
            { key: 'b', label: second.symbol.toUpperCase(), color: dataColor(2), format: 'percent' },
          ]}
          ariaLabel={t('Comparaison de deux actifs sur quatre mesures')}
        />
      ) : (
        <NoMeasure label={label} />
      )}
    </AnalysisCard>
  )
}
