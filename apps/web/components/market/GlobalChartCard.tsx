'use client'

import { useMemo, useState } from 'react'
import { useLocale } from 'next-intl'

import { ChangeBadge, formatCompact, formatCurrency } from '@zenkuu/ui'

import { AreaPlot } from '@/components/charts/AreaPlot'
import { dataColor } from '@/components/charts/chart-theme'
import { usePhrase } from '@/components/locale/ContentProvider'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * UNE COURBE GLOBALE, DANS UN CADRE QUI PORTE SES PROPRES COMMANDES
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── CE QUE CE COMPOSANT REMPLACE ─────────────────────────────────────────────
 *
 * La page des graphiques globaux empilait des blocs de nature différente : une bande
 * de chiffres, une carte d'aperçu, un explorateur à trois sélecteurs partagés, un
 * panier à quatre vues, une courbe de sentiment. Chacun avait sa forme, ses commandes
 * et sa place dans le flux ; on ne pouvait comparer deux séries qu'en faisant défiler.
 *
 * CoinGecko — la référence demandée — pose au contraire des CADRES ÉGAUX : un titre,
 * la valeur courante, ses propres paliers de période à droite, la courbe, et
 * éventuellement une ligne de totaux dessous. Le grand cadre ouvre la page, les autres
 * se rangent en grille à deux colonnes.
 *
 * ── LES PALIERS NE COÛTENT AUCUN APPEL ───────────────────────────────────────
 *
 * Chaque cadre reçoit sa série ENTIÈRE et découpe dedans. C'est ce qui permet à
 * chaque carte d'avoir ses propres paliers sans multiplier les requêtes : changer de
 * période est un `filter` sur un tableau déjà en mémoire, pas un aller-retour.
 *
 * ⚠️ LES FORMATS SONT DÉSIGNÉS PAR UN MOT, PAS PAR UNE FONCTION. Ce composant est
 * rendu depuis un composant SERVEUR : une fonction de formatage passée en prop ne
 * traverse pas la frontière. D'où `format` et `currency`, deux chaînes, et le
 * formatage fait ici.
 */

export interface GlobalChartPoint {
  /** Millisecondes depuis l'époque. */
  t: number
  y: number
}

/** Paliers proposés, du plus court au plus long. `null` = toute la série. */
const RANGES: { id: string; label: string; days: number | null }[] = [
  { id: '7d', label: '7J', days: 7 },
  { id: '1m', label: '1M', days: 30 },
  { id: '3m', label: '3M', days: 90 },
  { id: '1y', label: '1A', days: 365 },
  { id: 'max', label: 'MAX', days: null },
]

export function GlobalChartCard({
  title,
  hint,
  points,
  format,
  currency = 'EUR',
  colorIndex = 5,
  footer,
  note,
  defaultRange = 'max',
  large = false,
}: {
  title: string
  /** Une phrase courte sous le titre — ce que la courbe mesure vraiment. */
  hint?: string
  points: GlobalChartPoint[]
  /** Comment lire l'ordonnée : montant, pourcentage, ou nombre nu. */
  format: 'money' | 'percent' | 'plain'
  currency?: string
  /** Rang dans la palette de données — voir `chart-theme`. */
  colorIndex?: number
  /** Ligne de totaux sous la courbe, à la manière de la référence. */
  footer?: React.ReactNode
  /** Mention de provenance ou de méthode, en petit sous le cadre. */
  note?: React.ReactNode
  defaultRange?: string
  /** Le cadre d'ouverture est plus haut que ceux de la grille. */
  large?: boolean
}) {
  const t = usePhrase()
  /* Les mois de l'axe suivent la LANGUE lue, pas celle du code : « 24 nov. » sous une
     page anglaise se remarque autant qu'un titre non traduit. */
  const locale = useLocale()
  const [rangeId, setRangeId] = useState(defaultRange)

  const shown = useMemo(() => {
    const preset = RANGES.find((entry) => entry.id === rangeId)
    if (!preset?.days) return points
    /*
     * ⚠️ LA FENÊTRE PART DU DERNIER POINT, PAS DE L'HEURE COURANTE.
     *
     * `Date.now()` pendant le rendu est une fonction IMPURE : deux rendus successifs
     * du même composant donneraient deux découpages différents, et le linter de React
     * le refuse — à raison, c'est la définition d'un rendu non idempotent.
     *
     * Le dernier point est de toute façon le bon repère. Une série quotidienne se
     * termine à la clôture de la veille : compter « sept jours avant maintenant »
     * amputait la fenêtre d'un point sur les séries qui ne vont pas jusqu'à l'instant
     * présent — et de plusieurs sur une série de marché fermé le week-end.
     *
     * `cutoff` et non `floor` : ce dernier nomme le PLANCHER DE L'AXE plus bas, et
     * deux sens pour un même mot dans un fichier de deux cents lignes est exactement
     * ce qui produit une lecture fausse.
     */
    const latest = points[points.length - 1]?.t
    if (latest === undefined) return points
    const cutoff = latest - preset.days * 86_400_000
    const kept = points.filter((point) => point.t >= cutoff)
    /* Moins de deux points ne se trace pas : une série quotidienne n'a rien à montrer
       sur sept jours si la source ne publie qu'un point par semaine. On rend alors la
       série entière plutôt qu'un cadre vide — c'est la seule dégradation possible qui
       ne mente pas sur ce qu'on regarde, et le palier reste allumé pour le dire. */
    return kept.length > 1 ? kept : points
  }, [points, rangeId])

  const first = shown[0]?.y
  const last = shown[shown.length - 1]?.y
  const change =
    typeof first === 'number' && typeof last === 'number' && first !== 0
      ? ((last - first) / first) * 100
      : undefined

  const value =
    typeof last !== 'number'
      ? '—'
      : format === 'percent'
        ? `${last.toFixed(2)} %`
        : format === 'money'
          ? (formatCurrency(last, currency, { compact: true }) ?? '—')
          : (formatCompact(last) ?? '—')

  const color = dataColor(colorIndex)

  /* Bornes imposées quand la série est entièrement positive — voir la note sur
     `yDomain` plus bas. Le plafond garde une marge de 6 %, pour que le sommet de la
     courbe ne touche pas le bord du cadre. */
  const values = shown.map((point) => point.y)
  const lowest = values.length > 0 ? Math.min(...values) : 0
  const highest = values.length > 0 ? Math.max(...values) : 0
  /* ⚠️ SAUF EN POURCENTAGE. Une part qui vit entre 64 et 68 % sur un axe partant de
     zéro devient une droite : c'est le seul cas où l'échelle doit se resserrer sur les
     données. Les montants, eux, partent de zéro — c'est ce que fait la référence sur
     sa capitalisation totale, et cela évite de lire une baisse de 3 % comme un
     effondrement. */
  const floor = format !== 'percent' && lowest >= 0 ? 0 : undefined
  const ceiling = highest > 0 ? highest * 1.06 : 1

  return (
    <section className="rounded-card border border-border-subtle bg-surface p-4">
      {/* ── EN-TÊTE : LE TITRE À GAUCHE, LES PALIERS À DROITE ────────────────
          C'est la disposition de la référence, et elle tient parce que les paliers
          n'appartiennent qu'à CE cadre : les poser ailleurs ferait croire qu'ils
          commandent la page entière, ce que faisait l'ancien explorateur. */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-ink">{t(title)}</h2>
          {hint ? <p className="mt-0.5 text-xs text-ink-muted">{t(hint)}</p> : null}
        </div>

        <div className="flex shrink-0 items-center gap-0.5 rounded-control bg-surface-muted p-0.5">
          {RANGES.map((preset) => (
            <button
              key={preset.id}
              type="button"
              aria-pressed={preset.id === rangeId}
              onClick={() => setRangeId(preset.id)}
              className={`rounded-control px-2 py-1 text-[0.6875rem] font-semibold transition-colors duration-150 ${
                preset.id === rangeId
                  ? 'bg-surface text-ink shadow-sm'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* La VALEUR COURANTE et la variation SUR LA FENÊTRE choisie. La seconde suit le
          palier — c'est ce qui rend les boutons utiles au-delà du tracé : « +12 % sur
          trois mois » se lit sans mesurer la pente à l'œil. */}
      <div className="mt-2 flex items-baseline gap-2">
        <p className="figure text-2xl font-bold text-ink">{value}</p>
        {change !== undefined ? <ChangeBadge value={change} /> : null}
      </div>

      <div className="mt-3">
        <AreaPlot
          height={large ? 320 : 200}
          fill
          axes
          grid
          /* ⚠️ PAS DE GRADUATION NÉGATIVE SOUS UNE SÉRIE QUI NE PEUT PAS L'ÊTRE.
             `AreaPlot` déduit ses bornes des données avec une marge, et sur un volume
             très irrégulier cette marge passait sous zéro : l'axe écrivait
             « −9,66 Md € » sous une courbe de volumes. Le plancher est donc posé à
             zéro dès que la série est entièrement positive — jamais autrement, une
             série qui contient de vraies valeurs négatives doit les montrer. */
          {...(floor === undefined ? {} : { yDomain: [floor, ceiling] as [number, number] })}
          ariaLabel={t(title)}
          series={[{ id: 'serie', label: t(title), color, points: shown.map((p) => ({ x: p.t, y: p.y })) }]}
          formatX={(x) =>
            new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(new Date(x))
          }
          formatY={(y) =>
            format === 'percent'
              ? `${Math.round(y)} %`
              : format === 'money'
                ? (formatCurrency(y, currency, { compact: true }) ?? '')
                : (formatCompact(y) ?? '')
          }
          formatTooltipX={(x) =>
            new Intl.DateTimeFormat(locale, {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            }).format(new Date(x))
          }
          formatTooltipY={(y) =>
            format === 'percent'
              ? `${y.toFixed(2)} %`
              : format === 'money'
                ? (formatCurrency(y, currency, { compact: true }) ?? '')
                : (formatCompact(y) ?? '')
          }
        />
      </div>

      {/* ── LA LIGNE DE TOTAUX ───────────────────────────────────────────────
          La référence ferme son grand cadre par « 17 569 pièces · 1 494 places ·
          754 catégories ». Ce n'est pas de la décoration : ces trois nombres disent
          l'ASSIETTE de la courbe au-dessus, c'est-à-dire ce qu'elle compte. */}
      {footer ? (
        <div className="mt-3 border-t border-border-subtle pt-3 text-center text-xs text-ink-muted">
          {footer}
        </div>
      ) : null}

      {note ? <div className="mt-3 text-xs leading-relaxed text-ink-muted">{note}</div> : null}
    </section>
  )
}
