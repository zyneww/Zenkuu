'use client'

import { Link } from '@/i18n/navigation'
import { useMemo, useState } from 'react'

import type { MarketAsset } from '@zenkuu/data'
import { ChangeBadge, EmptyState } from '@zenkuu/ui'

import { AssetLogo } from '@/components/asset/AssetLogo'
import { ExportMenu } from '@/components/tools/ExportMenu'
import { Money } from '@/components/locale/Money'
import { SavedScreens } from '@/components/tools/SavedScreens'
import { Pagination } from '@/components/ui/Pagination'
import { assetHref } from '@/lib/asset-routes'
import type { ScreenCriteria } from '@/lib/screen-actions'

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

/** Rotation quotidienne : volume 24 h ÷ capitalisation, en fraction. */
const TURNOVER_STEPS = [0, 0.01, 0.05, 0.1, 0.25, 0.5]

/** Ramène un indice de curseur dans les bornes de son barème. */
function clamp(value: number, max: number): number {
  return Math.min(Math.max(Math.round(value), 0), max)
}

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

  /*
   * Critères avancés — offre Pro.
   *
   * Leur état vit ICI et non dans le bloc gardé, volontairement. Un lecteur qui
   * s'abonne, règle ses seuils, puis navigue et revient retrouverait sinon un
   * formulaire remonté à zéro à chaque démontage du bloc. Leurs valeurs par défaut
   * sont neutres : sans abonnement, le bloc n'est pas rendu, les seuils restent à
   * leur valeur d'origine et ne filtrent donc rien.
   */
  const [minChange7d, setMinChange7d] = useState(-100)
  const [minTurnoverIndex, setMinTurnoverIndex] = useState(0)

  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(50)

  const minCap = MARKET_CAP_STEPS[minCapIndex] ?? 0
  const minVolume = VOLUME_STEPS[minVolumeIndex] ?? 0
  const minTurnover = TURNOVER_STEPS[minTurnoverIndex] ?? 0

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
      if (minChange7d > -100 && (asset.change7d ?? -Infinity) < minChange7d) return false

      // Rotation = volume 24 h rapporté à la capitalisation. C'est la mesure qui
      // distingue un gros actif somnolent d'un petit actif très échangé — invisible
      // sur les deux colonnes prises séparément, d'où sa place parmi les critères
      // avancés plutôt qu'un troisième curseur de montant.
      if (minTurnover > 0) {
        const cap = asset.marketCap ?? 0
        if (cap <= 0) return false
        if ((asset.volume24h ?? 0) / cap < minTurnover) return false
      }

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
  }, [assets, preset, minCap, minVolume, minChange24h, minChange7d, minTurnover, query])

  /*
   * RETOUR EN PAGE 1 QUAND LES CRITÈRES CHANGENT.
   *
   * Sept curseurs composent ce filtre, et chacun peut réduire le résultat à trois
   * lignes. Rester en page 4 afficherait alors un tableau vide — le lecteur croirait
   * que son critère ne retient rien, alors qu'il regarde au-delà du dernier résultat.
   *
   * L'ajustement se fait PENDANT LE RENDU plutôt que dans un effet : un effet
   * peindrait d'abord le tableau vide avant de le corriger.
   */
  const signature = `${preset}|${minCap}|${minVolume}|${minChange24h}|${minChange7d}|${minTurnover}|${query.trim()}`
  const [lastSignature, setLastSignature] = useState(signature)
  if (signature !== lastSignature) {
    setLastSignature(signature)
    setPage(1)
  }

  const pageCount = Math.max(1, Math.ceil(rows.length / perPage))
  const currentPage = Math.min(page, pageCount)
  const start = (currentPage - 1) * perPage
  const visible = rows.slice(start, start + perPage)

  function reset() {
    setPreset('tout')
    setMinCapIndex(0)
    setMinVolumeIndex(0)
    setMinChange24h(-100)
    setMinChange7d(-100)
    setMinTurnoverIndex(0)
    setQuery('')
  }

  /*
   * État courant sous forme sérialisable, pour les écrans enregistrés.
   *
   * Il réplique les sept variables d'état plutôt que de les remplacer par un objet
   * unique. Un objet unique obligerait chaque curseur à recréer tout l'état à chaque
   * mouvement, ce qui ferait re-rendre le tableau de deux cent cinquante lignes à
   * chaque pixel de déplacement. Le coût de la réplication est un objet reconstruit
   * par rendu ; celui de l'inverse serait une interface qui accroche.
   */
  const criteria: ScreenCriteria = {
    preset,
    minCapIndex,
    minVolumeIndex,
    minChange24h,
    minChange7d,
    minTurnoverIndex,
    query,
  }

  function apply(saved: ScreenCriteria) {
    // Le préréglage est revalidé contre la liste connue : un écran enregistré avant
    // qu'un préréglage soit retiré porterait sinon une valeur qui ne filtre rien et
    // n'allume aucune pastille — un état que le lecteur ne pourrait pas comprendre.
    const known = PRESETS.some((entry) => entry.id === saved.preset)
    setPreset(known ? (saved.preset as Preset) : 'tout')
    setMinCapIndex(clamp(saved.minCapIndex, MARKET_CAP_STEPS.length - 1))
    setMinVolumeIndex(clamp(saved.minVolumeIndex, VOLUME_STEPS.length - 1))
    setMinChange24h(saved.minChange24h)
    setMinChange7d(saved.minChange7d)
    setMinTurnoverIndex(clamp(saved.minTurnoverIndex, TURNOVER_STEPS.length - 1))
    setQuery(saved.query)
  }

  const filtering =
    preset !== 'tout' ||
    minCapIndex > 0 ||
    minVolumeIndex > 0 ||
    minChange24h > -100 ||
    minChange7d > -100 ||
    minTurnoverIndex > 0 ||
    query !== ''

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
            className={`rounded-control border px-3 py-1.5 text-xs font-medium transition-colors duration-150 ${
              preset === entry.id
                ? 'border-brand bg-brand text-on-brand'
                : 'border-border-subtle bg-surface text-ink-muted hover:border-brand hover:text-ink'
            }`}
          >
            {entry.label}
          </button>
        ))}
      </div>

      {/*
        Barre des écrans enregistrés, placée SOUS les préréglages et AU-DESSUS des
        curseurs. C'est l'ordre de lecture : « un départ rapide », puis « un départ que
        j'ai moi-même défini », puis le réglage fin. La placer en bas la ferait
        découvrir après avoir refait à la main ce qu'elle rappelle en un clic.
      */}
      <SavedScreens criteria={criteria} onApply={apply} />

      <div className="grid gap-4 rounded-card border border-border-subtle bg-surface p-4 sm:grid-cols-2 lg:grid-cols-4">
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
            className="w-full rounded-card border border-border-subtle bg-surface px-2.5 py-1.5 text-sm text-ink placeholder:text-ink-muted focus:border-brand focus:outline-none"
          />
        </label>
      </div>

      {/*
        CRITÈRES DE SECOND RANG — ouverts à tous, désormais.

        Ils étaient réservés à l'abonnement, et l'argument tenait à leur PUBLIC plutôt
        qu'à leur difficulté : la variation à 7 jours et la rotation ne servent qu'à
        qui suit le marché dans la durée, quand le lecteur occasionnel filtre par
        taille et par variation du jour.

        L'abonnement a été retiré du site, et avec lui l'encart qui invitait à y
        souscrire. La distinction de public, elle, reste vraie : c'est pourquoi ces
        deux curseurs gardent leur bloc séparé, sous les quatre premiers, au lieu de
        rejoindre la grille principale.
      */}
      <div className="grid gap-4 rounded-card border border-border-subtle bg-surface p-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 flex items-baseline justify-between gap-2 text-xs text-ink-muted">
            Variation 7 j minimale
            <span className="tabular text-ink">
              {minChange7d <= -100 ? 'aucune' : `${minChange7d} %`}
            </span>
          </span>
          <input
            type="range"
            min={-100}
            max={50}
            step={5}
            value={minChange7d}
            onChange={(event) => setMinChange7d(Number(event.target.value))}
            className="w-full accent-[var(--color-brand)]"
          />
        </label>

        <Slider
          label="Rotation quotidienne minimale"
          value={minTurnoverIndex}
          max={TURNOVER_STEPS.length - 1}
          onChange={setMinTurnoverIndex}
          display={
            minTurnover === 0
              ? 'aucune'
              : `${new Intl.NumberFormat('fr-FR', { style: 'percent' }).format(minTurnover)} de la capitalisation`
          }
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="tabular text-sm text-ink-muted" aria-live="polite">
          <strong className="text-ink">{rows.length}</strong> actif{rows.length > 1 ? 's' : ''} sur{' '}
          {assets.length} retenus
        </p>

        <div className="flex flex-wrap items-center gap-2">
          {/*
            L'export porte sur `rows` ENTIER, pas sur la page affichée plus bas. C'est
            tout l'intérêt de la fonction : le tableau se lit page par page, le fichier
            n'a pas cette contrainte.
          */}
          <ExportMenu
              filename="zenkuu-screener"
              sheetName="Screener"
              rows={rows}
              columns={[
                { header: 'Rang', value: (asset) => asset.rank ?? '' },
                { header: 'Nom', value: (asset) => asset.name },
                { header: 'Symbole', value: (asset) => asset.symbol.toUpperCase() },
                { header: 'Devise', value: (asset) => asset.currency },
                { header: 'Prix', value: (asset) => asset.price ?? '' },
                { header: 'Variation 24 h (%)', value: (asset) => asset.change24h ?? '' },
                { header: 'Variation 7 j (%)', value: (asset) => asset.change7d ?? '' },
                { header: 'Volume 24 h', value: (asset) => asset.volume24h ?? '' },
                { header: 'Capitalisation', value: (asset) => asset.marketCap ?? '' },
            ]}
          />

          {filtering ? (
            <button
              type="button"
              onClick={reset}
              className="rounded-control border border-border-subtle bg-surface px-3 py-1.5 text-xs font-medium text-ink-muted transition-colors duration-150 hover:border-brand hover:text-ink"
            >
              Réinitialiser les filtres
            </button>
          ) : null}
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="Aucun actif ne satisfait ces critères"
          description="Assouplissez un seuil, ou réinitialisez les filtres."
          compact
        />
      ) : (
        <div className="overflow-x-auto rounded-card border border-border-subtle">
          {/* Colonnes prioritaires sous `sm` — voir la note de `MarketTable`. Ne restent
              que l'actif, son prix et sa variation : le rang et la capitalisation sont
              les critères du FILTRE, pas de la lecture, et le filtre est juste au-dessus. */}
          <table className="w-full border-collapse text-sm sm:min-w-[46rem]">
            <caption className="sr-only">Résultats du filtre</caption>
            <thead>
              <tr className="border-b border-border-subtle text-left text-xs text-ink-muted">
                <th scope="col" className="hidden px-3 py-2.5 font-medium sm:table-cell">#</th>
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
                <th scope="col" className="hidden px-3 py-2.5 text-right font-medium sm:table-cell">
                  Capitalisation
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border-subtle">
              {visible.map((asset) => (
                <tr key={asset.id} className="group transition-colors duration-150 hover:bg-surface-muted/60">
                  <td className="tabular hidden px-3 py-2.5 text-xs text-ink-muted sm:table-cell">
                    {asset.rank ?? '—'}
                  </td>

                  <th scope="row" className="px-3 py-2.5 text-left font-normal">
                    <Link
                      href={assetHref(asset.assetClass, asset.id)}
                      className="flex min-w-0 items-center gap-2"
                    >
                      <AssetLogo asset={asset} size={22} />
                      <span className="truncate font-medium text-ink group-hover:text-brand-strong">
                        {asset.name}
                      </span>
                      <span className="shrink-0 text-xs uppercase text-ink-muted">
                        {asset.symbol}
                      </span>
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
                  <td className="tabular hidden px-3 py-2.5 text-right text-ink sm:table-cell">
                    <Money value={asset.marketCap} from={asset.currency} compact />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/*
        LE PLAFOND DE CENT LIGNES A DISPARU, ET C'ÉTAIT UN DÉFAUT, PAS UNE PRÉCAUTION.

        Le tableau s'arrêtait à cent lignes en invitant à « resserrer un critère pour
        voir la suite ». Autrement dit : pour lire le résultat de son filtre, il fallait
        en changer. Un filtre qui cache une partie de ce qu'il retient répond à côté de
        la question qu'on lui pose.

        La pagination tient la même promesse — borner ce que le navigateur dessine d'un
        coup — sans rendre les lignes suivantes inatteignables.
      */}
      {rows.length > 0 ? (
        <Pagination
          page={currentPage}
          perPage={perPage}
          total={rows.length}
          unit="actif"
          onPageChange={setPage}
          onPerPageChange={(size) => {
            setPerPage(size)
            setPage(1)
          }}
        />
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
