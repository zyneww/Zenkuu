'use client'

import { Globe, Map as MapIcon, X } from 'lucide-react'
import dynamic from 'next/dynamic'
import { useMemo, useState } from 'react'

import type { MacroObservation } from '@zenkuu/data'

import { MacroChoropleth } from '@/components/market/MacroChoropleth'
import { macroColor, percentile, type MacroTone } from '@/components/market/geo'

/**
 * LE GLOBE EST CHARGÉ À LA DEMANDE, ET C'EST LA DÉCISION LA PLUS COÛTEUSE DU FICHIER.
 *
 * `three` pèse environ six cents kilo-octets minifiés. L'importer normalement le
 * mettrait dans le paquet de `/macro`, donc dans le chemin critique de tout visiteur —
 * y compris celui qui reste sur la carte, qui est la vue par défaut.
 *
 * `ssr: false` en plus du chargement différé : la scène construit un contexte WebGL et
 * lit `window.devicePixelRatio`, deux choses qui n'existent pas au rendu serveur. Sans
 * ce drapeau, la page tomberait en erreur avant même d'atteindre le navigateur.
 */
const MacroGlobe = dynamic(
  () => import('@/components/market/MacroGlobe').then((module) => module.MacroGlobe),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center rounded-card border border-border-subtle bg-surface text-xs text-ink-muted">
        Chargement du globe…
      </div>
    ),
  },
)

type ViewId = 'map' | 'globe'

/**
 * CARTE MACROÉCONOMIQUE — deux représentations, une seule donnée.
 *
 * ── POURQUOI LES DEUX, ET POURQUOI LA CARTE D'ABORD ─────────────────────────
 *
 * Le planisphère montre TOUT à la fois : cent soixante-dix-sept pays d'un seul regard,
 * ce qu'aucun globe ne peut faire — une sphère en cache toujours la moitié. C'est donc
 * la vue de lecture, et elle ouvre.
 *
 * Le globe montre ce que la projection déforme. Sur une carte plate, la Russie et le
 * Canada occupent un quart de l'image et le Sahel disparaît ; sur une sphère, les
 * surfaces sont justes. Il apporte aussi ce qu'aucune carte plate n'a — la
 * manipulation directe, qui fait explorer plutôt que consulter.
 *
 * ── LE CURSEUR TEMPOREL PORTE SUR DES DONNÉES DÉJÀ CHARGÉES ─────────────────
 *
 * Les quinze dernières années arrivent en une seule requête serveur (voir
 * `MACRO_HISTORY_YEARS`). Déplacer le curseur ne déclenche donc aucun appel : on
 * refiltre une liste en mémoire, ce qui rend le geste instantané — condition pour
 * qu'un curseur serve à COMPARER plutôt qu'à choisir.
 *
 * ── L'ÉCHELLE DE COULEUR EST FIGÉE SUR TOUTE LA PÉRIODE ─────────────────────
 *
 * Point de conception le plus important de ce fichier. Recalculer les bornes à chaque
 * année rendrait la comparaison IMPOSSIBLE : une inflation de 8 % en 2022 et de 2 % en
 * 2024 se peindraient du même rouge, chacune étant l'extrême de son année. Les bornes
 * sont donc calculées une fois sur l'ensemble des observations, et le curseur ne
 * change que le sous-ensemble affiché.
 */
export function MacroExplorer({
  observations,
  unit,
  tone,
  indicatorLabel,
}: {
  observations: MacroObservation[]
  unit: string
  tone: MacroTone
  indicatorLabel: string
}) {
  const [view, setView] = useState<ViewId>('map')
  const [selected, setSelected] = useState<string | null>(null)

  /** Années réellement publiées, décroissantes — l'échelle du curseur. */
  const years = useMemo(() => {
    const set = new Set(observations.map((row) => row.year))
    return [...set].sort((a, b) => a - b)
  }, [observations])

  const [year, setYear] = useState<number | null>(null)
  const activeYear = year ?? years[years.length - 1] ?? null

  /*
   * BORNES SUR TOUTE LA PÉRIODE, pas sur l'année affichée — voir l'en-tête.
   *
   * Les 5ᵉ et 95ᵉ centiles plutôt que les extrêmes : un seul pays en hyperinflation à
   * 200 % ramènerait tous les autres dans le premier vingtième de la rampe.
   */
  const [low, high] = useMemo(() => {
    const values = observations.map((row) => row.value).sort((a, b) => a - b)
    return [percentile(values, 0.05), percentile(values, 0.95)]
  }, [observations])

  /*
   * UNE SEULE OBSERVATION PAR PAYS pour l'année courante.
   *
   * La source publie parfois plusieurs révisions d'une même année ; garder la dernière
   * rencontrée suffit, et l'écart entre révisions est sous le pixel de couleur.
   */
  const rows = useMemo(() => {
    const byIso = new Map<string, MacroObservation>()
    for (const row of observations) {
      if (row.year === activeYear) byIso.set(row.iso3, row)
    }
    return [...byIso.values()]
  }, [observations, activeYear])

  const data = useMemo(
    () =>
      rows.map((row) => ({
        iso: row.iso3,
        country: row.country,
        value: row.value,
        year: row.year,
      })),
    [rows],
  )

  const ranked = useMemo(() => [...rows].sort((a, b) => b.value - a.value), [rows])
  const selectedRow = selected ? rows.find((row) => row.iso3 === selected) : undefined

  /** Historique complet du pays sélectionné — ce que la barre latérale trace. */
  const history = useMemo(() => {
    if (!selected) return []
    return observations
      .filter((row) => row.iso3 === selected)
      .sort((a, b) => a.year - b.year)
  }, [observations, selected])

  return (
    <div className="space-y-4">
      {/* ── Bascule de représentation ─────────────────────────────────────────
          Deux boutons plutôt qu'un interrupteur : un interrupteur suppose un état
          par défaut et son contraire, alors que carte et globe sont deux vues de
          même rang. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          className="flex items-center gap-0.5 rounded-card border border-border-subtle p-0.5"
          role="group"
          aria-label="Représentation"
        >
          <ViewButton
            active={view === 'map'}
            onClick={() => setView('map')}
            icon={<MapIcon className="h-3.5 w-3.5" aria-hidden="true" />}
            label="Carte"
          />
          <ViewButton
            active={view === 'globe'}
            onClick={() => setView('globe')}
            icon={<Globe className="h-3.5 w-3.5" aria-hidden="true" />}
            label="Globe"
          />
        </div>

        <Scale low={low} high={high} tone={tone} unit={unit} />
      </div>

      {/* ── La figure et sa barre latérale ────────────────────────────────────

          La barre n'apparaît QUE si un pays est choisi, et la grille passe alors à deux
          colonnes. Réserver sa place en permanence amputerait la carte d'un tiers pour
          un panneau vide — sur une figure dont la lisibilité dépend directement de sa
          largeur. */}
      <div
        className={`grid gap-4 ${selectedRow ? 'lg:grid-cols-[minmax(0,1fr)_20rem]' : 'grid-cols-1'}`}
      >
        <div className="h-[clamp(320px,58vh,620px)]">
          {view === 'globe' ? (
            <MacroGlobe
              data={data}
              low={low}
              high={high}
              tone={tone}
              selected={selected}
              onSelect={setSelected}
            />
          ) : (
            <MacroChoropleth
              data={data}
              low={low}
              high={high}
              tone={tone}
              unit={unit}
              selected={selected}
              onSelect={setSelected}
            />
          )}
        </div>

        {selectedRow ? (
          <CountryPanel
            row={selectedRow}
            history={history}
            unit={unit}
            indicatorLabel={indicatorLabel}
            rank={ranked.findIndex((row) => row.iso3 === selectedRow.iso3) + 1}
            total={ranked.length}
            onClose={() => setSelected(null)}
          />
        ) : null}
      </div>

      {/* ── Curseur temporel ──────────────────────────────────────────────────
          Absent quand la source ne publie qu'une année : un curseur à une position
          n'est pas un contrôle, c'est un ornement qui laisse croire à une profondeur
          qui n'existe pas. */}
      {years.length > 1 && activeYear !== null ? (
        <div className="space-y-1.5 rounded-card border border-border-subtle bg-surface px-4 py-3">
          <div className="flex items-baseline justify-between gap-3">
            <label htmlFor="macro-annee" className="text-xs font-medium text-ink">
              Année observée
            </label>
            <span className="tabular text-sm font-semibold text-ink">{activeYear}</span>
          </div>

          <input
            id="macro-annee"
            type="range"
            min={years[0]}
            max={years[years.length - 1]}
            step={1}
            value={activeYear}
            onChange={(event) => setYear(Number(event.target.value))}
            className="w-full accent-[var(--color-brand)]"
          />

          <div className="tabular flex justify-between text-[0.6875rem] text-ink-muted">
            <span>{years[0]}</span>
            {/*
              LE DÉCOMPTE DES PAYS EST AFFICHÉ, et il varie beaucoup d'une année à
              l'autre. La Banque mondiale publie avec un à deux ans de retard, et
              inégalement selon les pays : l'année la plus récente ne couvre parfois
              qu'un tiers du monde. Sans ce chiffre, une carte à moitié grise
              passerait pour une panne.
            */}
            <span>{data.length} pays publiés</span>
            <span>{years[years.length - 1]}</span>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function ViewButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-xs font-medium transition-colors duration-150 ${
        active ? 'bg-brand text-on-brand' : 'text-ink-muted hover:bg-surface-muted hover:text-ink'
      }`}
    >
      {icon}
      {label}
    </button>
  )
}

/** Rampe de couleur légendée, bornes comprises. */
function Scale({
  low,
  high,
  tone,
  unit,
}: {
  low: number
  high: number
  tone: MacroTone
  unit: string
}) {
  const steps = [0, 0.2, 0.4, 0.6, 0.8, 1]

  return (
    <div className="flex items-center gap-2 text-[0.6875rem] text-ink-muted">
      {/* Le « ≤ » et le « ≥ » ne sont pas décoratifs : ils disent que les valeurs
          au-delà des bornes SATURENT au lieu d'être écrêtées ou exclues. */}
      <span className="tabular">≤ {low.toFixed(1).replace('.', ',')}</span>
      <span
        className="flex h-2.5 w-32 overflow-hidden rounded-pill border border-border-subtle"
        aria-hidden="true"
      >
        {steps.map((step) => (
          <span
            key={step}
            className="flex-1"
            style={{ backgroundColor: macroColor(low + (high - low) * step, low, high, tone) }}
          />
        ))}
      </span>
      <span className="tabular">
        ≥ {high.toFixed(1).replace('.', ',')} {unit}
      </span>
    </div>
  )
}

/**
 * BARRE LATÉRALE DU PAYS CHOISI.
 *
 * Elle porte la valeur courante, le rang, et l'historique complet en petite courbe.
 * L'historique est ce qui justifie d'avoir chargé quinze ans : sans lui, ces données
 * ne serviraient qu'au curseur, et une valeur isolée ne dit pas si un pays s'améliore
 * ou se dégrade — ce qui est la question qu'on se pose en cliquant.
 */
function CountryPanel({
  row,
  history,
  unit,
  indicatorLabel,
  rank,
  total,
  onClose,
}: {
  row: MacroObservation
  history: MacroObservation[]
  unit: string
  indicatorLabel: string
  rank: number
  total: number
  onClose: () => void
}) {
  const values = history.map((entry) => entry.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1

  return (
    <aside className="space-y-4 rounded-card border border-border-subtle bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold text-ink">{row.country}</h2>
          <p className="text-[0.6875rem] text-ink-muted">{row.region}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-sm text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>

      <div>
        <p className="text-[0.6875rem] text-ink-muted">{indicatorLabel}</p>
        <p className="tabular text-2xl font-bold text-ink">
          {row.value.toFixed(1).replace('.', ',')}{' '}
          <span className="text-sm font-medium text-ink-muted">{unit}</span>
        </p>
        <p className="text-[0.6875rem] text-ink-muted">
          Observation {row.year} · rang {rank} sur {total}
        </p>
      </div>

      {history.length > 1 ? (
        <div className="space-y-1">
          <p className="text-[0.6875rem] font-medium text-ink">Historique</p>

          {/* Courbe en SVG brut plutôt qu'avec `AreaPlot` : celui-ci mesure sa largeur
              au montage pour placer ses axes, alors qu'on n'a besoin ici que d'une
              silhouette. Un `viewBox` étirable suffit et s'affiche sans hydratation. */}
          <svg viewBox="0 0 100 32" className="h-12 w-full" role="img" aria-label="Historique">
            <polyline
              fill="none"
              stroke="var(--color-brand)"
              strokeWidth="1.5"
              vectorEffect="non-scaling-stroke"
              points={history
                .map((entry, index) => {
                  const x = (index / (history.length - 1)) * 100
                  const y = 30 - ((entry.value - min) / span) * 28
                  return `${x.toFixed(1)},${y.toFixed(1)}`
                })
                .join(' ')}
            />
          </svg>

          <div className="tabular flex justify-between text-[0.625rem] text-ink-muted">
            <span>{history[0]?.year}</span>
            <span>{history[history.length - 1]?.year}</span>
          </div>
        </div>
      ) : null}

      <p className="text-[0.625rem] leading-relaxed text-ink-muted">
        Série annuelle publiée avec plusieurs mois de retard, et à des dates différentes
        selon les pays. Deux pays voisins sur la carte peuvent décrire deux moments
        distincts.
      </p>
    </aside>
  )
}
