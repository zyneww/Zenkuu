'use client'

import {
  Camera,
  Check,
  Copy,
  Download,
  Link2,
  Maximize2,
  Minimize2,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

import { formatMacroValue, type MacroObservation } from '@zenkuu/data'

import { MacroChoropleth } from '@/components/market/MacroChoropleth'
import {
  copyBlobToClipboard,
  downloadBlob,
  svgToPngBlob,
} from '@/components/market/map-export'
import { macroColor, percentile, type MacroTone } from '@/components/market/geo'

/**
 * CARTE MACROÉCONOMIQUE — une seule représentation, désormais.
 *
 * ── LE GLOBE A ÉTÉ RETIRÉ, ET CE N'EST PAS UNE PERTE ────────────────────────
 *
 * Il coexistait avec le planisphère derrière une bascule à deux boutons. Le motif
 * invoqué — « une sphère ne déforme pas les surfaces » — est exact et n'a jamais
 * suffi : une sphère en cache toujours la moitié, si bien que la vue juste était
 * aussi la vue incomplète. On y arrivait, on tournait, on revenait à la carte.
 *
 * Son retrait libère surtout six cents kilo-octets de `three` du dossier de la page,
 * et rend à la carte la place que la bascule lui prenait. Ce que le globe apportait
 * vraiment — la manipulation directe — est repris par le zoom et le panoramique, qui
 * ne coûtent rien et ne cachent aucun continent.
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
  scale,
  indicatorId,
  indicatorLabel,
  initialYear,
}: {
  observations: MacroObservation[]
  unit: string
  tone: MacroTone
  scale: 'percent' | 'compact' | 'plain'
  indicatorId: string
  indicatorLabel: string
  /** Année portée par l'URL, pour qu'un lien partagé rouvre la même vue. */
  initialYear: number | null
}) {
  const [selected, setSelected] = useState<string | null>(null)

  const figureRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  /** Années réellement publiées, croissantes — l'échelle du curseur. */
  const years = useMemo(() => {
    const set = new Set(observations.map((row) => row.year))
    return [...set].sort((a, b) => a - b)
  }, [observations])

  /**
   * ── L'ANNÉE D'OUVERTURE EST LA PLUS COMPLÈTE, PAS LA PLUS RÉCENTE ─────────
   *
   * Tant que la page ne portait que cinq séries à publication rapide, les deux
   * règles coïncidaient. Le catalogue en compte désormais quarante-cinq, et beaucoup
   * paraissent avec deux à quatre ans de retard : les dépenses d'éducation couvrent
   * 215 pays en 2020 et DEUX en 2025. Ouvrir sur la dernière année donnerait donc une
   * carte vide sur une série parfaitement renseignée — et le lecteur conclurait à une
   * panne plutôt qu'à un décalage de publication.
   *
   * On retient l'année la mieux couverte, en départageant les quasi-ex æquo par la
   * plus récente : une année à 96 % de la meilleure couverture mais deux ans plus
   * fraîche est un meilleur point d'entrée. Le curseur reste libre d'aller partout.
   */
  const bestYear = useMemo(() => {
    const counts = new Map<number, number>()
    for (const row of observations) counts.set(row.year, (counts.get(row.year) ?? 0) + 1)

    let best: number | null = null
    let bestCount = 0

    for (const [candidate, count] of counts) {
      if (count > bestCount) {
        best = candidate
        bestCount = count
      }
    }

    if (best === null) return null

    /* Le seuil de 95 % est la marge dans laquelle deux années se valent : en dessous,
       on perd de vrais pays ; au-dessus, on s'accroche à une année plus vieille pour
       une poignée d'observations. */
    for (const [candidate, count] of counts) {
      if (candidate > best && count >= bestCount * 0.95) best = candidate
    }

    return best
  }, [observations])

  const [year, setYear] = useState<number | null>(
    initialYear !== null && years.includes(initialYear) ? initialYear : null,
  )
  const activeYear = year ?? bestYear ?? years[years.length - 1] ?? null

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
      {/* ── La figure, sa barre d'outils et sa barre latérale ─────────────────

          La barre latérale n'apparaît QUE si un pays est choisi, et la grille passe
          alors à deux colonnes. Réserver sa place en permanence amputerait la carte
          d'un tiers pour un panneau vide — sur une figure dont la lisibilité dépend
          directement de sa largeur. */}
      <div
        className={`grid gap-4 ${selectedRow ? 'lg:grid-cols-[minmax(0,1fr)_20rem]' : 'grid-cols-1'}`}
      >
        <MapFrame
          ref={figureRef}
          svgRef={svgRef}
          indicatorId={indicatorId}
          indicatorLabel={indicatorLabel}
          year={activeYear}
          legend={<Scale low={low} high={high} tone={tone} unit={unit} scale={scale} />}
        >
          <MacroChoropleth
            data={data}
            low={low}
            high={high}
            tone={tone}
            unit={unit}
            scale={scale}
            selected={selected}
            onSelect={setSelected}
            svgRef={svgRef}
          />
        </MapFrame>

        {selectedRow ? (
          <CountryPanel
            row={selectedRow}
            history={history}
            /* `data` est déjà la liste filtrée sur l'année active — celle qui dessine la
               carte. Le panneau y lit la médiane mondiale sans refiltrer. */
            worldValues={data.map((entry) => entry.value)}
            unit={unit}
            scale={scale}
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
        <div className="space-y-1.5 rounded-card bg-surface px-4 py-3">
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

/**
 * CADRE DE LA CARTE — plein écran, export, légende.
 *
 * ── POURQUOI LA LÉGENDE VIT ICI ET NON AU-DESSUS ────────────────────────────
 *
 * Elle était accrochée à la barre de bascule, en dehors de la figure. En plein écran,
 * elle serait restée dans la page, derrière — c'est-à-dire qu'on aurait basculé en
 * plein écran pour perdre la clé de lecture des couleurs. En la posant DANS le cadre,
 * elle suit la figure partout où celle-ci va.
 */
function MapFrame({
  ref,
  svgRef,
  indicatorId,
  indicatorLabel,
  year,
  legend,
  children,
}: {
  ref: React.RefObject<HTMLDivElement | null>
  svgRef: React.RefObject<SVGSVGElement | null>
  indicatorId: string
  indicatorLabel: string
  year: number | null
  legend: React.ReactNode
  children: React.ReactNode
}) {
  const [fullscreen, setFullscreen] = useState(false)

  /*
   * L'ÉTAT SUIT LE DOCUMENT, il ne le commande pas.
   *
   * On peut sortir du plein écran par Échap, par le bouton du navigateur ou en
   * changeant d'onglet — trois chemins que notre bouton ne voit pas. Un booléen posé
   * au clic finirait donc désynchronisé, et l'icône afficherait « réduire » sur une
   * page qui ne l'est plus.
   */
  useEffect(() => {
    function sync() {
      setFullscreen(document.fullscreenElement === ref.current)
    }

    document.addEventListener('fullscreenchange', sync)
    return () => document.removeEventListener('fullscreenchange', sync)
  }, [ref])

  return (
    <div
      ref={ref}
      /* `bg-canvas` explicite : en plein écran, l'élément est extrait de son contexte
         et le navigateur peint un fond noir par défaut — ce qui donne une carte claire
         sur un cadre noir. */
      className="relative flex h-[clamp(320px,58vh,620px)] flex-col rounded-card border border-border-subtle bg-canvas p-1 data-[fullscreen=true]:h-screen data-[fullscreen=true]:rounded-none"
      data-fullscreen={fullscreen}
    >
      <div className="relative min-h-0 flex-1">{children}</div>

      {/* ── Barre d'outils, en surimpression sur le coin haut droit ───────── */}
      <div className="absolute right-3 top-3 z-10 flex items-center gap-1">
        <ExportMenu
          svgRef={svgRef}
          indicatorId={indicatorId}
          indicatorLabel={indicatorLabel}
          year={year}
        />

        <button
          type="button"
          onClick={() => {
            if (document.fullscreenElement) void document.exitFullscreen()
            else void ref.current?.requestFullscreen()
          }}
          aria-label={fullscreen ? 'Quitter le plein écran' : 'Afficher en plein écran'}
          title={fullscreen ? 'Quitter le plein écran' : 'Plein écran'}
          className="flex h-7 w-7 items-center justify-center rounded-sm border border-border-subtle bg-surface text-ink-muted transition-colors duration-150 hover:bg-surface-muted hover:text-ink"
        >
          {fullscreen ? (
            <Minimize2 className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
          )}
        </button>
      </div>

      {/* La légende en bas à gauche, symétrique des commandes de zoom. */}
      <div className="pointer-events-none absolute bottom-4 left-4 z-10 rounded-control bg-surface/90 px-2 py-1 backdrop-blur-sm">
        {legend}
      </div>
    </div>
  )
}

/** Les trois gestes de partage de la figure : enregistrer, copier, lier. */
function ExportMenu({
  svgRef,
  indicatorId,
  indicatorLabel,
  year,
}: {
  svgRef: React.RefObject<SVGSVGElement | null>
  indicatorId: string
  indicatorLabel: string
  year: number | null
}) {
  const [open, setOpen] = useState(false)
  const [done, setDone] = useState<string | null>(null)
  const [failed, setFailed] = useState<string | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }

    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  /* La confirmation s'efface d'elle-même : un « copié » qui reste indéfiniment ne
     confirme plus rien au geste suivant. */
  useEffect(() => {
    if (!done && !failed) return
    const timer = setTimeout(() => {
      setDone(null)
      setFailed(null)
    }, 2400)
    return () => clearTimeout(timer)
  }, [done, failed])

  /**
   * Rend la figure en PNG.
   *
   * Le fond est LU SUR LE DOCUMENT au moment de l'export plutôt que codé en dur :
   * le site a deux thèmes, et une carte sombre exportée sur fond blanc est illisible.
   */
  async function render(): Promise<Blob | null> {
    const node = svgRef.current
    if (!node) return null

    const background = getComputedStyle(document.documentElement)
      .getPropertyValue('--color-surface')
      .trim()

    try {
      return await svgToPngBlob(node, { background: background || '#ffffff' })
    } catch {
      setFailed('L’image n’a pas pu être produite.')
      return null
    }
  }

  const slug = `zenkuu-${indicatorId}${year ? `-${year}` : ''}.png`

  async function onDownload() {
    const blob = await render()
    if (!blob) return
    downloadBlob(blob, slug)
    setOpen(false)
  }

  async function onCopyImage() {
    const blob = await render()
    if (!blob) return

    const copied = await copyBlobToClipboard(blob)
    if (copied) setDone('Image copiée')
    else {
      /* REPLI ET NON ERREUR : Firefox ne sait pas copier une image dans le
         presse-papiers. Télécharger fait la même chose en un geste de plus, plutôt
         que de refuser. */
      downloadBlob(blob, slug)
      setDone('Image téléchargée')
    }
    setOpen(false)
  }

  async function onCopyLink() {
    /*
     * L'ANNÉE EST AJOUTÉE À L'URL, alors qu'elle vit dans l'état React.
     *
     * Un lien qui ne porterait que l'indicateur rouvrirait la carte sur l'année la
     * plus récente — donc pas sur ce que l'auteur du lien regardait. On la remet ici
     * plutôt qu'à chaque mouvement du curseur, qui déclencherait une navigation par
     * cran.
     */
    const url = new URL(window.location.href)
    url.searchParams.set('indicateur', indicatorId)
    if (year !== null) url.searchParams.set('annee', String(year))

    try {
      await navigator.clipboard.writeText(url.toString())
      setDone('Lien copié')
    } catch {
      setFailed('Le lien n’a pas pu être copié.')
    }
    setOpen(false)
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Aperçu de la carte"
        title="Aperçu de la carte"
        className="flex h-7 w-7 items-center justify-center rounded-sm border border-border-subtle bg-surface text-ink-muted transition-colors duration-150 hover:bg-surface-muted hover:text-ink"
      >
        <Camera className="h-3.5 w-3.5" aria-hidden="true" />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-1 w-52 overflow-hidden rounded-card border border-border-subtle bg-surface py-1 shadow-lg"
        >
          <p className="px-3 pb-1 pt-1.5 text-[0.625rem] font-semibold uppercase tracking-wide text-ink-muted">
            Aperçu de la carte
          </p>

          <MenuItem icon={<Download className="h-3.5 w-3.5" />} onClick={onDownload}>
            Télécharger l’image
          </MenuItem>
          <MenuItem icon={<Copy className="h-3.5 w-3.5" />} onClick={onCopyImage}>
            Copier l’image
          </MenuItem>
          <MenuItem icon={<Link2 className="h-3.5 w-3.5" />} onClick={onCopyLink}>
            Copier le lien
          </MenuItem>

          <p className="border-t border-border-subtle px-3 pb-1 pt-1.5 text-[0.625rem] leading-snug text-ink-muted">
            {indicatorLabel}
            {year ? ` · ${year}` : ''}
          </p>
        </div>
      ) : null}

      {/* La confirmation est un `status` : elle est annoncée sans voler le focus. */}
      {done || failed ? (
        <p
          role="status"
          className={`absolute right-0 top-9 z-20 flex items-center gap-1 whitespace-nowrap rounded-control px-2 py-1 text-[0.6875rem] ${
            failed ? 'bg-down/15 text-down' : 'bg-surface text-ink'
          }`}
        >
          {failed ? null : <Check className="h-3 w-3 text-up" aria-hidden="true" />}
          {failed ?? done}
        </p>
      ) : null}
    </div>
  )
}

function MenuItem({
  icon,
  onClick,
  children,
}: {
  icon: React.ReactNode
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-xs text-ink transition-colors duration-100 hover:bg-surface-muted"
    >
      <span className="shrink-0 text-ink-muted" aria-hidden="true">
        {icon}
      </span>
      {children}
    </button>
  )
}

/** Rampe de couleur légendée, bornes comprises. */
function Scale({
  low,
  high,
  tone,
  unit,
  scale,
}: {
  low: number
  high: number
  tone: MacroTone
  unit: string
  scale: 'percent' | 'compact' | 'plain'
}) {
  const steps = [0, 0.2, 0.4, 0.6, 0.8, 1]

  return (
    <div className="flex items-center gap-2 text-[0.6875rem] text-ink-muted">
      {/* Le « ≤ » et le « ≥ » ne sont pas décoratifs : ils disent que les valeurs
          au-delà des bornes SATURENT au lieu d'être écrêtées ou exclues. */}
      <span className="tabular">≤ {formatMacroValue(low, scale)}</span>
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
        ≥ {formatMacroValue(high, scale)} {unit}
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
  worldValues,
  unit,
  scale,
  indicatorLabel,
  rank,
  total,
  onClose,
}: {
  row: MacroObservation
  history: MacroObservation[]
  /**
   * Valeurs de TOUS les pays pour l'année affichée — pour situer celle du pays choisi.
   *
   * Passées en prop plutôt que recalculées ici : l'appelant a déjà filtré les
   * observations sur l'année active pour dessiner la carte, et refaire ce filtre
   * reviendrait à parcourir quatre mille lignes une seconde fois à chaque clic.
   */
  worldValues: number[]
  unit: string
  scale: 'percent' | 'compact' | 'plain'
  indicatorLabel: string
  rank: number
  total: number
  onClose: () => void
}) {
  const values = history.map((entry) => entry.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1

  /**
   * Mesures dérivées de la série et du monde — voir le bloc qui les affiche.
   *
   * `null` quand l'historique se réduit à un point : « depuis 2011 » n'a alors aucun
   * sens, et afficher un écart de zéro laisserait croire à une stabilité qu'on n'a pas
   * observée (§5). Les extrêmes, eux, restent justes sur un point unique.
   */
  const stats = useMemo(() => {
    if (history.length === 0) return null

    const first = history[0]
    const last = history[history.length - 1]
    if (!first || !last) return null

    /* Le minimum et le maximum sont cherchés AVEC leur année : « plus bas 2,1 % » ne
       situe rien, « plus bas 2,1 % en 2015 » situe une trajectoire. */
    let lowest = first
    let highest = first
    for (const entry of history) {
      if (entry.value < lowest.value) lowest = entry
      if (entry.value > highest.value) highest = entry
    }

    /* Médiane et non moyenne : sur un PIB par habitant, une poignée de pays extrêmes
       déplace la moyenne au point qu'elle ne décrit plus aucun pays réel. */
    let median: number | null = null
    if (worldValues.length > 0) {
      const sorted = [...worldValues].sort((a, b) => a - b)
      const middle = Math.floor(sorted.length / 2)
      median =
        sorted.length % 2 === 0
          ? ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2
          : (sorted[middle] ?? null)
    }

    return {
      firstYear: first.year,
      change: history.length > 1 ? last.value - first.value : null,
      min: lowest.value,
      minYear: lowest.year,
      max: highest.value,
      maxYear: highest.year,
      median,
    }
  }, [history, worldValues])

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
          {formatMacroValue(row.value, scale)}{' '}
          <span className="text-sm font-medium text-ink-muted">{unit}</span>
        </p>
        <p className="text-[0.6875rem] text-ink-muted">
          Observation {row.year} · rang {rank} sur {total}
        </p>
      </div>

      {/*
        ══════════════════════════════════════════════════════════════════════
        CE QUE LA SÉRIE DIT, ET QU'UNE VALEUR ISOLÉE NE DISAIT PAS
        ══════════════════════════════════════════════════════════════════════

        Le panneau portait la valeur, le rang et une silhouette. C'était peu pour un
        clic : la silhouette montre une FORME sans jamais donner de chiffre, si bien
        qu'on voyait « ça monte » sans savoir de combien ni depuis quoi.

        Quatre mesures s'ajoutent, toutes DÉRIVÉES de la série déjà chargée — aucun
        appel réseau supplémentaire, et aucune donnée inventée : chacune est un calcul
        sur des observations publiées.

          · l'écart entre la première et la dernière année, qui répond à « ce pays
            s'améliore-t-il ? » — la vraie question du clic ;
          · le minimum et le maximum, avec leur année, qui situent la valeur courante
            dans son propre passé ;
          · la médiane MONDIALE de l'année affichée, qui la situe parmi les autres. Le
            rang le fait déjà en ordinal ; la médiane le fait en unités, ce qui parle
            davantage sur une grandeur comme un PIB par habitant.

        La médiane et non la moyenne : sur des grandeurs économiques, une poignée de
        pays extrêmes déplace la moyenne au point qu'elle ne décrit plus personne.
      */}
      {stats ? (
        <dl className="grid grid-cols-2 gap-x-3 gap-y-2 border-t border-border-subtle pt-3">
          {stats.change !== null ? (
            <div>
              <dt className="text-[0.625rem] uppercase tracking-wide text-ink-muted">
                Depuis {stats.firstYear}
              </dt>
              <dd
                className={`tabular text-sm font-semibold ${
                  stats.change >= 0 ? 'text-up' : 'text-down'
                }`}
              >
                {stats.change >= 0 ? '+' : '−'}
                {formatMacroValue(Math.abs(stats.change), scale)}
              </dd>
            </div>
          ) : null}

          {stats.median !== null ? (
            <div>
              <dt className="text-[0.625rem] uppercase tracking-wide text-ink-muted">
                Médiane mondiale
              </dt>
              <dd className="tabular text-sm font-semibold text-ink">
                {formatMacroValue(stats.median, scale)}
              </dd>
            </div>
          ) : null}

          <div>
            <dt className="text-[0.625rem] uppercase tracking-wide text-ink-muted">
              Plus bas · {stats.minYear}
            </dt>
            <dd className="tabular text-sm font-semibold text-ink">
              {formatMacroValue(stats.min, scale)}
            </dd>
          </div>

          <div>
            <dt className="text-[0.625rem] uppercase tracking-wide text-ink-muted">
              Plus haut · {stats.maxYear}
            </dt>
            <dd className="tabular text-sm font-semibold text-ink">
              {formatMacroValue(stats.max, scale)}
            </dd>
          </div>
        </dl>
      ) : null}

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
