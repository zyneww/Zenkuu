'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'

import type { MarketAsset } from '@zenith/data'
import { ChangeBadge, EmptyState } from '@zenith/ui'

import { AssetLogo } from '@/components/AssetTile'
import { Money } from '@/components/locale/Money'
import { assetHref } from '@/lib/asset-routes'

/**
 * Filtre multicritère sur l'univers déjà chargé.
 *
 * Tout se passe CÔTÉ CLIENT sur les 250 actifs reçus avec la page. C'est le choix qui
 * rend l'outil utilisable : un filtre servi par le serveur ferait un aller-retour par
 * mouvement de curseur, et la source ne tolère que quelques requêtes par minute. En
 * contrepartie, le périmètre est borné — et c'est écrit, parce qu'un « screener » qui
 * laisse croire qu'il balaie quinze mille jetons alors qu'il en voit deux cent
 * cinquante ment sur son résultat (§5).
 *
 * Les seuils sont exprimés en SEUILS MINIMUM plutôt qu'en fourchettes : sur des
 * grandeurs qui s'étalent sur six ordres de grandeur, une borne haute ne sert
 * pratiquement jamais, et deux curseurs par critère doublent la charge sans gain.
 */

type Preset = 'tout' | 'solides' | 'momentum' | 'repli' | 'liquides'

const PRESETS: { id: Preset; label: string; hint: string }[] = [
  { id: 'tout', label: 'Tout', hint: 'Aucun filtre' },
  { id: 'solides', label: 'Grandes capitalisations', hint: 'Au-dessus de 1 Md €' },
  { id: 'momentum', label: 'En hausse sur 7 jours', hint: 'Progression sur 24 h et 7 j' },
  { id: 'repli', label: 'En repli sur 7 jours', hint: 'Recul sur 24 h et 7 j' },
  { id: 'liquides', label: 'Fortement échangés', hint: 'Volume supérieur à 10 % de la capitalisation' },
]

const MARKET_CAP_STEPS = [0, 10_000_000, 100_000_000, 1_000_000_000, 10_000_000_000]
const VOLUME_STEPS = [0, 1_000_000, 10_000_000, 100_000_000, 1_000_000_000]

function compact(value: number): string {
  if (value === 0) return 'aucun'
  return new Intl.NumberFormat('fr-FR', { notation: 'compact', maximumFractionDigits: 0 }).format(
    value,
  )
}

export function ScreenerView({ assets }: { assets: MarketAsset[] }) {
  const [preset, setPreset] = useState<Preset>('tout')
  const [minCapIndex, setMinCapIndex] = useState(0)
  const [minVolumeIndex, setMinVolumeIndex] = useState(0)
  const [minChange24h, setMinChange24h] = useState(-100)
  const [query, setQuery] = useState('')

  const minCap = MARKET_CAP_STEPS[minCapIndex] ?? 0
  const minVolume = VOLUME_STEPS[minVolumeIndex] ?? 0

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase()

    return assets.filter((asset) => {
      if (needle && !`${asset.name} ${asset.symbol}`.toLowerCase().includes(needle)) return false

      // Un critère porté sur une donnée ABSENTE exclut la ligne au lieu de la laisser
      // passer : « capitalisation ≥ 1 Md » ne peut pas être satisfait par un actif
      // dont la capitalisation n'est pas publiée.
      if (minCap > 0 && (asset.marketCap ?? -1) < minCap) return false
      if (minVolume > 0 && (asset.volume24h ?? -1) < minVolume) return false
      if (minChange24h > -100 && (asset.change24h ?? -Infinity) < minChange24h) return false

      switch (preset) {
        case 'solides':
          return (asset.marketCap ?? 0) >= 1_000_000_000
        case 'momentum':
          return (asset.change24h ?? 0) > 0 && (asset.change7d ?? 0) > 0
        case 'repli':
          return (asset.change24h ?? 0) < 0 && (asset.change7d ?? 0) < 0
        case 'liquides':
          return (
            (asset.marketCap ?? 0) > 0 &&
            (asset.volume24h ?? 0) / (asset.marketCap as number) > 0.1
          )
        default:
          return true
      }
    })
  }, [assets, preset, minCap, minVolume, minChange24h, query])

  function reset() {
    setPreset('tout')
    setMinCapIndex(0)
    setMinVolumeIndex(0)
    setMinChange24h(-100)
    setQuery('')
  }

  const filtering =
    preset !== 'tout' || minCapIndex > 0 || minVolumeIndex > 0 || minChange24h > -100 || query !== ''

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filtres rapides">
        {PRESETS.map((entry) => (
          <button
            key={entry.id}
            type="button"
            onClick={() => setPreset(entry.id)}
            aria-pressed={preset === entry.id}
            title={entry.hint}
            className={`border px-3 py-1.5 text-xs font-medium transition-colors duration-150 ${
              preset === entry.id
                ? 'border-brand bg-brand text-on-brand'
                : 'border-border-subtle bg-surface text-ink-muted hover:border-brand hover:text-ink'
            }`}
          >
            {entry.label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 border border-border-subtle bg-surface p-4 sm:grid-cols-2 lg:grid-cols-4">
        <Slider
          label="Capitalisation minimale"
          value={minCapIndex}
          max={MARKET_CAP_STEPS.length - 1}
          onChange={setMinCapIndex}
          display={minCap === 0 ? 'aucune' : `${compact(minCap)} €`}
        />

        <Slider
          label="Volume 24 h minimal"
          value={minVolumeIndex}
          max={VOLUME_STEPS.length - 1}
          onChange={setMinVolumeIndex}
          display={minVolume === 0 ? 'aucun' : `${compact(minVolume)} €`}
        />

        <label className="block">
          <span className="mb-1 flex items-baseline justify-between gap-2 text-xs text-ink-muted">
            Variation 24 h minimale
            <span className="tabular text-ink">
              {minChange24h <= -100 ? 'aucune' : `${minChange24h} %`}
            </span>
          </span>
          <input
            type="range"
            min={-100}
            max={50}
            step={5}
            value={minChange24h}
            onChange={(event) => setMinChange24h(Number(event.target.value))}
            className="w-full accent-[var(--color-brand)]"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs text-ink-muted">Nom ou symbole</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filtrer…"
            className="w-full border border-border-subtle bg-surface px-2.5 py-1.5 text-sm text-ink placeholder:text-ink-muted focus:border-brand focus:outline-none"
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="tabular text-sm text-ink-muted" aria-live="polite">
          <strong className="text-ink">{rows.length}</strong> actif{rows.length > 1 ? 's' : ''} sur{' '}
          {assets.length} retenus
        </p>

        {filtering ? (
          <button
            type="button"
            onClick={reset}
            className="border border-border-subtle bg-surface px-3 py-1.5 text-xs font-medium text-ink-muted transition-colors duration-150 hover:border-brand hover:text-ink"
          >
            Réinitialiser les filtres
          </button>
        ) : null}
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="Aucun actif ne satisfait ces critères"
          description="Assouplissez un seuil, ou réinitialisez les filtres."
          compact
        />
      ) : (
        <div className="overflow-x-auto border border-border-subtle">
          <table className="w-full min-w-[46rem] border-collapse text-sm">
            <caption className="sr-only">Résultats du filtre</caption>
            <thead>
              <tr className="border-b border-border-subtle text-left text-xs text-ink-muted">
                <th scope="col" className="px-3 py-2.5 font-medium">#</th>
                <th scope="col" className="px-3 py-2.5 font-medium">Actif</th>
                <th scope="col" className="px-3 py-2.5 text-right font-medium">Prix</th>
                <th scope="col" className="px-3 py-2.5 text-right font-medium">24 h</th>
                <th scope="col" className="hidden px-3 py-2.5 text-right font-medium sm:table-cell">7 j</th>
                <th scope="col" className="hidden px-3 py-2.5 text-right font-medium md:table-cell">
                  Volume 24 h
                </th>
                {/*
                  PAS DE COLONNE DE COURBE ICI, contrairement aux autres tableaux.
                  L'univers de 250 lignes est chargé sans les séries 7 jours : les
                  inclure ferait transiter plus de deux mégaoctets jusqu'au navigateur,
                  pour une vignette que la colonne « 7 j » chiffre déjà. Une colonne
                  vide serait pire qu'absente — elle passerait pour une panne.
                */}
                <th scope="col" className="px-3 py-2.5 text-right font-medium">Capitalisation</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border-subtle">
              {rows.slice(0, 100).map((asset) => (
                <tr key={asset.id} className="group transition-colors duration-150 hover:bg-surface-muted/60">
                  <td className="tabular px-3 py-2.5 text-xs text-ink-muted">{asset.rank ?? '—'}</td>

                  <th scope="row" className="px-3 py-2.5 text-left font-normal">
                    <Link
                      href={assetHref(asset.assetClass, asset.id)}
                      className="flex items-center gap-2"
                    >
                      <AssetLogo asset={asset} size={22} />
                      <span className="font-medium text-ink group-hover:text-brand-strong">
                        {asset.name}
                      </span>
                      <span className="text-xs uppercase text-ink-muted">{asset.symbol}</span>
                    </Link>
                  </th>

                  <td className="tabular px-3 py-2.5 text-right text-ink">
                    <Money value={asset.price} from={asset.currency} />
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <ChangeBadge value={asset.change24h} size="sm" />
                  </td>
                  <td className="hidden px-3 py-2.5 text-right sm:table-cell">
                    <ChangeBadge value={asset.change7d} size="sm" />
                  </td>
                  <td className="tabular hidden px-3 py-2.5 text-right text-ink-muted md:table-cell">
                    <Money value={asset.volume24h} from={asset.currency} compact />
                  </td>
                  <td className="tabular px-3 py-2.5 text-right text-ink">
                    <Money value={asset.marketCap} from={asset.currency} compact />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {rows.length > 100 ? (
        <p className="text-xs text-ink-muted">
          Cent premières lignes affichées sur {rows.length} retenues — resserrez un critère
          pour voir la suite.
        </p>
      ) : null}
    </div>
  )
}

function Slider({
  label,
  value,
  max,
  onChange,
  display,
}: {
  label: string
  value: number
  max: number
  onChange: (value: number) => void
  display: string
}) {
  return (
    <label className="block">
      <span className="mb-1 flex items-baseline justify-between gap-2 text-xs text-ink-muted">
        {label}
        <span className="tabular text-ink">{display}</span>
      </span>
      {/*
        Curseur à PALIERS et non linéaire : les capitalisations s'étalent de quelques
        milliers à mille milliards. Un curseur linéaire passerait 99 % de sa course
        au-dessus du milliard, et le premier pixel de déplacement écarterait la moitié
        du marché.
      */}
      <input
        type="range"
        min={0}
        max={max}
        step={1}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-[var(--color-brand)]"
      />
    </label>
  )
}
