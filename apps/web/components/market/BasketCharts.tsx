'use client'

import { useMemo, useState } from 'react'

import type { MarketCapBasket } from '@zenkuu/data'
import { ChangeBadge, formatCompact, formatShare } from '@zenkuu/ui'

import { AreaPlot, type PlotSeries } from '@/components/charts/AreaPlot'
import { Chip, ChipGroup } from '@/components/charts/ChipGroup'
import { dataColor } from '@/components/charts/chart-theme'
import { Link } from '@/i18n/navigation'

/**
 * QUATRE COURBES LONGUES, TIRÉES D'UN SEUL RELEVÉ.
 *
 * ── CE QUE CE BLOC REMPLACE ───────────────────────────────────────────────────
 *
 * La page de référence ouvre sur quatre graphiques : capitalisation totale, dominance
 * de Bitcoin, capitalisation des stablecoins, capitalisation hors Bitcoin. Aucune de
 * ces séries n'est accessible gratuitement — l'endpoint des agrégats mondiaux répond
 * 401 hors abonnement, et nos propres relevés ne remontent qu'à vingt-quatre heures.
 *
 * Ce que la source publie, en revanche, c'est la capitalisation historique de chaque
 * actif pris un par un. Le panier (`getMarketCapBasket`) en additionne neuf, choisis
 * et FIGÉS, et les quatre vues d'ici en dérivent sans un appel de plus : elles lisent
 * toutes le même tableau de points.
 *
 * ── LE PANIER EST NOMMÉ PARTOUT, ET C'EST LA CONDITION DE TOUT LE BLOC ────────
 *
 * Neuf actifs ne sont pas dix-huit mille. Une courbe intitulée « capitalisation » que
 * le lecteur prendrait pour le marché entier serait un mensonge par omission — pas une
 * approximation, un mensonge, puisque rien à l'écran ne lui permettrait de le savoir.
 *
 * D'où trois précautions qui ne sont pas décoratives : le titre dit « panier suivi »,
 * la composition est listée sous les courbes avec le poids de chaque membre, et la
 * part de Bitcoin s'appelle « part dans le panier » et jamais « dominance ». La
 * dominance est un rapport au marché entier ; ce n'en est pas un.
 *
 * ── LES QUATRE VUES ───────────────────────────────────────────────────────────
 *
 *   Cumul        la somme, en aire. La forme générale du cycle.
 *   Répartition  la part de chaque groupe, en pourcentage. Quatre lignes qui somment
 *                à cent — c'est là qu'on voit un basculement vers les stablecoins.
 *   Stablecoins  chaque stablecoin en valeur absolue. La référence lui consacre un
 *                graphique entier, et pour une raison : leur capitalisation cumulée
 *                est l'un des rares indicateurs de flux ENTRANT dans le secteur.
 *   Hors Bitcoin la somme moins Bitcoin. L'équivalent de sa courbe « altcoins », à la
 *                composition près, qui est dite.
 */

const VIEWS = [
  { id: 'total', label: 'Cumul' },
  { id: 'split', label: 'Répartition' },
  { id: 'stables', label: 'Stablecoins' },
  { id: 'exbtc', label: 'Hors Bitcoin' },
] as const

type ViewId = (typeof VIEWS)[number]['id']

const RANGES = [
  { days: 30, label: '30 j' },
  { days: 90, label: '90 j' },
  { days: 365, label: '1 an' },
] as const

/** Noms lisibles des membres. Les identifiants de la source ne sont pas des noms. */
const MEMBER_LABELS: Record<string, string> = {
  bitcoin: 'Bitcoin',
  ethereum: 'Ethereum',
  tether: 'Tether',
  'usd-coin': 'USDC',
  dai: 'Dai',
  'ethena-usde': 'Ethena USDe',
  ripple: 'XRP',
  binancecoin: 'BNB',
  solana: 'Solana',
}

const BUCKET_LABELS = {
  bitcoin: 'Bitcoin',
  ethereum: 'Ethereum',
  stablecoin: 'Stablecoins',
  other: 'Autres',
} as const

const LEAD: Record<ViewId, string> = {
  total: 'La somme des neuf capitalisations suivies, jour par jour. Ce n’est pas la capitalisation mondiale — voir la composition sous la courbe.',
  split: 'La part de chaque groupe dans le panier. Les quatre lignes somment à cent : ce qu’une gagne, une autre le perd.',
  stables: 'La capitalisation de chaque stablecoin du panier. Elle monte quand des dollars entrent dans le secteur et descend quand ils en sortent — c’est l’un des rares indicateurs de flux que la source publie.',
  exbtc: 'Le panier moins Bitcoin. Il monte plus vite que le cumul quand le marché s’écarte de Bitcoin, et chute plus fort quand il y revient.',
}

export function BasketCharts({ basket }: { basket: MarketCapBasket }) {
  const [view, setView] = useState<ViewId>('total')
  const [days, setDays] = useState<number>(365)

  const currency = basket.currency.toUpperCase()

  /*
   * Fenêtre relative au DERNIER POINT CONNU, jamais à l'horloge du visiteur. La page
   * peut être servie par le cache quelques heures après la relève : compter depuis
   * maintenant amputerait la courbe de ce décalage, et le nombre de points affichés
   * varierait d'un visiteur à l'autre sans que la donnée ait changé.
   */
  const windowed = useMemo(() => {
    const latest = basket.points.reduce((max, point) => Math.max(max, point.timestamp), 0)
    const cutoff = latest - days * 86_400_000
    return basket.points.filter((point) => point.timestamp >= cutoff)
  }, [basket.points, days])

  const stables = basket.members.filter((member) => member.bucket === 'stablecoin')

  const series = useMemo<PlotSeries[]>(() => {
    if (windowed.length < 2) return []

    if (view === 'total') {
      return [
        {
          id: 'total',
          label: 'Panier suivi',
          color: dataColor(0),
          points: windowed.map((point) => ({ x: point.timestamp, y: point.total })),
        },
      ]
    }

    if (view === 'exbtc') {
      return [
        {
          id: 'exbtc',
          label: 'Panier hors Bitcoin',
          color: dataColor(2),
          points: windowed.map((point) => ({
            x: point.timestamp,
            y: point.total - (point.byId['bitcoin'] ?? 0),
          })),
        },
      ]
    }

    if (view === 'stables') {
      return stables.map((member, index) => ({
        id: member.id,
        label: MEMBER_LABELS[member.id] ?? member.id,
        color: dataColor(index),
        points: windowed.map((point) => ({
          x: point.timestamp,
          y: point.byId[member.id] ?? 0,
        })),
      }))
    }

    // Répartition : une ligne par groupe, en pourcentage du cumul du jour.
    const buckets = ['bitcoin', 'ethereum', 'stablecoin', 'other'] as const
    const split: PlotSeries[] = []

    buckets.forEach((bucket, index) => {
      const ids = basket.members
        .filter((member) => member.bucket === bucket)
        .map((member) => member.id)
      // Un groupe sans membre retenu est OMIS, pas tracé à zéro : une ligne plate au
      // ras de l'axe se lirait comme « ce groupe ne pèse rien », alors qu'il n'a
      // simplement aucun représentant dans le panier.
      if (ids.length === 0) return

      split.push({
        id: bucket,
        label: BUCKET_LABELS[bucket],
        color: dataColor(index),
        points: windowed.map((point) => {
          const sum = ids.reduce((total, id) => total + (point.byId[id] ?? 0), 0)
          return { x: point.timestamp, y: point.total > 0 ? (sum / point.total) * 100 : 0 }
        }),
      })
    })

    return split
  }, [view, windowed, basket.members, stables])

  /* Variation de la vue sur la fenêtre affichée — calculée sur la série PRINCIPALE et
     seulement pour les vues à tracé unique. Sur quatre lignes, un chiffre unique en
     haut à droite ne désignerait rien. */
  const headline = useMemo(() => {
    const single = view === 'total' || view === 'exbtc'
    const points = series[0]?.points
    if (!single || !points || points.length < 2) return null

    const first = points[0]?.y ?? 0
    const last = points[points.length - 1]?.y ?? 0
    return {
      value: last,
      change: first > 0 ? ((last - first) / first) * 100 : undefined,
    }
  }, [series, view])

  const isPercent = view === 'split'

  return (
    <section className="space-y-4" aria-labelledby="panier-titre">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h2 id="panier-titre" className="display-md text-ink">
            Panier de capitalisations
          </h2>
          <p className="max-w-2xl text-sm leading-relaxed text-ink-muted">{LEAD[view]}</p>
        </div>

        <ChipGroup label="Période">
          {RANGES.map((range) => (
            <Chip
              key={range.days}
              active={days === range.days}
              onClick={() => setDays(range.days)}
              label={range.label}
            />
          ))}
        </ChipGroup>
      </div>

      <div className="rounded-card border border-border-subtle bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle p-3">
          <ChipGroup label="Vue">
            {VIEWS.map((entry) => (
              <Chip
                key={entry.id}
                active={view === entry.id}
                onClick={() => setView(entry.id)}
                label={entry.label}
              />
            ))}
          </ChipGroup>

          {headline ? (
            <p className="tabular flex items-baseline gap-2 text-sm font-semibold text-ink">
              {formatCompact(headline.value)} {currency}
              {headline.change !== undefined ? (
                <ChangeBadge value={headline.change} size="sm" />
              ) : null}
            </p>
          ) : null}
        </div>

        <div className="p-3">
          {series.length > 0 ? (
            <>
              <AreaPlot
                series={series}
                height={320}
                /* Le dégradé n'est posé QUE sur un tracé unique. Superposés, quatre
                   aplats translucides se mélangent en une bouillie dont aucune teinte
                   ne correspond plus à sa légende. */
                fill={series.length === 1}
                axes
                grid
                {...(isPercent ? { yDomain: [0, 100] as [number, number] } : {})}
                formatX={(value) =>
                  new Date(value).toLocaleDateString('fr-FR', {
                    ...(days > 120
                      ? { month: 'short', year: '2-digit' }
                      : { day: 'numeric', month: 'short' }),
                  })
                }
                formatY={(value) =>
                  isPercent
                    ? `${Math.round(value)} %`
                    : new Intl.NumberFormat('fr-FR', {
                        notation: 'compact',
                        maximumFractionDigits: 1,
                      }).format(value)
                }
                formatTooltipX={(value) =>
                  new Date(value).toLocaleDateString('fr-FR', { dateStyle: 'medium' })
                }
                formatTooltipY={(value) =>
                  isPercent
                    ? (formatShare(value) ?? '—')
                    : `${formatCompact(value)} ${currency}`
                }
                ariaLabel={`${VIEWS.find((entry) => entry.id === view)?.label ?? ''} du panier suivi`}
              />

              {series.length > 1 ? (
                <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-border-subtle pt-3">
                  {series.map((entry) => (
                    <li key={entry.id} className="flex items-center gap-1.5 text-xs text-ink-muted">
                      <span
                        aria-hidden="true"
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: entry.color }}
                      />
                      {entry.label}
                    </li>
                  ))}
                </ul>
              ) : null}
            </>
          ) : (
            <p className="py-16 text-center text-sm text-ink-muted">
              Pas assez de points sur la période choisie.
            </p>
          )}
        </div>
      </div>

      <Composition basket={basket} />
    </section>
  )
}

/**
 * LA COMPOSITION EST AFFICHÉE, PAS SEULEMENT MENTIONNÉE.
 *
 * Écrire « panier de neuf actifs » sous une courbe ne suffit pas : le lecteur ne peut
 * pas juger de ce qu'elle vaut sans savoir LESQUELS, ni dans quelle proportion. Un
 * panier dont Bitcoin ferait quatre-vingts pour cent est une courbe de Bitcoin avec du
 * bruit autour, et il faut pouvoir le constater.
 *
 * Les poids sont ceux du DERNIER point, pas des moyennes : c'est la composition
 * d'aujourd'hui qui explique la forme d'aujourd'hui.
 */
function Composition({ basket }: { basket: MarketCapBasket }) {
  const total = basket.members.reduce((sum, member) => sum + member.latest, 0)

  return (
    <div className="rounded-card border border-border-subtle bg-surface p-4">
      <h3 className="text-sm font-semibold text-ink">Composition du panier</h3>
      <p className="mt-1 max-w-3xl text-xs leading-relaxed text-ink-muted">
        Liste FIGÉE, et non « les neuf premières capitalisations du jour ». Un panier
        recalculé chaque jour ferait sauter la courbe le jour où un actif entre dans le
        classement — un mouvement de composition qui se lirait comme un mouvement de
        marché. Le prix de ce choix est qu’il vieillit : c’est un défaut visible et
        corrigible, là où le saut serait invisible.
      </p>

      <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-3 lg:grid-cols-5">
        {basket.members.map((member) => (
          <li key={member.id} className="flex items-baseline justify-between gap-2">
            <Link
              href={`/crypto/${member.id}`}
              className="truncate text-xs text-ink-muted transition-colors duration-150 hover:text-brand-strong"
            >
              {MEMBER_LABELS[member.id] ?? member.id}
            </Link>
            <span className="tabular shrink-0 text-xs font-medium text-ink">
              {total > 0 ? formatShare((member.latest / total) * 100) : '—'}
            </span>
          </li>
        ))}
      </ul>

      {/* Un membre écarté fait BAISSER la somme d'un cran. Le taire laisserait lire une
          sortie de capitaux là où il n'y a qu'une lacune de données. */}
      {basket.dropped.length > 0 ? (
        <p className="mt-3 border-t border-border-subtle pt-3 text-xs leading-relaxed text-ink-muted">
          Écarté{basket.dropped.length > 1 ? 's' : ''} de ce relevé :{' '}
          {basket.dropped
            .map((entry) => `${MEMBER_LABELS[entry.id] ?? entry.id} (${entry.reason})`)
            .join(', ')}
          . La somme est donc inférieure à ce qu’elle serait avec le panier complet.
        </p>
      ) : null}
    </div>
  )
}
