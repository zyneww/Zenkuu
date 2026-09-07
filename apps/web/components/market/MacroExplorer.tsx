'use client'

import { Radio, RadioGroup } from '@headlessui/react'
import { useLocale } from 'next-intl'
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

import {
  formatMacroValue,
  unpackMacroSeries,
  type MacroObservation,
  type PackedMacroSeries,
} from '@zenkuu/data'

import { IconButton } from '@/components/ui/IconButton'
import { Slider } from '@/components/ui/slider'
import { MacroChoropleth } from '@/components/market/MacroChoropleth'
import { MacroGlobe } from '@/components/market/MacroGlobe'
import {
  copyBlobToClipboard,
  downloadBlob,
  svgToPngBlob,
} from '@/components/market/map-export'
import { macroColor, percentile, type MacroTone } from '@/components/market/geo'
import { usePresence } from '@/components/nav/usePresence'
import { usePhrase } from '@/components/locale/ContentProvider'

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
  series,
  unit,
  tone,
  scale,
  indicatorId,
  indicatorLabel,
  initialYear,
}: {
  /**
   * Série COMPACTÉE, telle qu'elle traverse la frontière serveur → client.
   *
   * Voir `packMacroSeries` : soixante-six ans d'historique en objets nommés
   * réécriraient le nom de chaque pays soixante-six fois dans la charge utile de la
   * page. Le dépaquetage a lieu une fois, en mémoire, et le reste du composant
   * continue de raisonner en observations.
   */
  series: PackedMacroSeries
  unit: string
  tone: MacroTone
  scale: 'percent' | 'compact' | 'plain'
  indicatorId: string
  indicatorLabel: string
  /** Année portée par l'URL, pour qu'un lien partagé rouvre la même vue. */
  initialYear: number | null
}) {

  const t = usePhrase()
  const [selected, setSelected] = useState<string | null>(null)

  /*
   * ── DEUX VUES, UN SEUL ÉTAT DE DONNÉES ────────────────────────────────────
   *
   * L'onglet ne change QUE la projection. L'indicateur, l'année du curseur, les
   * bornes de couleur, le pays sélectionné et son panneau restent les mêmes objets :
   * c'est ce qui fait de « Carte » et « Globe » deux vues d'une même page, et non
   * deux pages. Passer de l'une à l'autre ne recharge rien et ne perd pas la lecture
   * en cours.
   *
   * L'état ne vit PAS dans l'URL, contrairement à l'indicateur : une projection est
   * un confort de lecture, pas une ressource distincte, et deux adresses pour la même
   * donnée dispersent le référencement de la page entre elles.
   */
  const [view, setView] = useState<'carte' | 'globe'>('carte')

  const figureRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  const observations = useMemo(() => unpackMacroSeries(series), [series])

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

  /**
   * Rang du pays choisi DANS SA RÉGION, et taille de cette région.
   *
   * Le rang mondial situe parmi deux cents pays ; celui-ci situe parmi les voisins,
   * qui est souvent la comparaison qu'on cherchait — « 8ᵉ sur 200 » et « 8ᵉ sur 9 »
   * ne racontent pas la même histoire, et un pays peut être les deux.
   */
  const regional = useMemo(() => {
    if (!selectedRow) return null
    const peers = ranked.filter((row) => row.region === selectedRow.region)
    const position = peers.findIndex((row) => row.iso3 === selectedRow.iso3) + 1
    return position > 0 ? { rank: position, total: peers.length } : null
  }, [ranked, selectedRow])

  return (
    <div className="space-y-4">
      {/* ── LA BASCULE DE PROJECTION ──────────────────────────────────────────

          Deux boutons et non deux liens : la vue ne vit pas dans l'URL (voir l'état
          `view`), et un lien qui ne change pas d'adresse est un lien menteur.

          ⚠️ `role="tablist"` A ÉTÉ RETIRÉ, ET LA NOTE QUI LE JUSTIFIAIT AVAIT À MOITIÉ
          RAISON. Elle disait : « ce sont deux vues EXCLUSIVES d'un même contenu, ce que
          le motif d'onglets décrit exactement ». L'exclusivité était juste ; le motif ne
          l'était pas, pour deux raisons.

          D'abord le clavier : `role="tab"` n'en câble aucun. Le motif ARIA impose au
          composant de gérer les flèches et l'index roulant, et rien ici ne le faisait —
          la synthèse vocale annonçait « onglet 1 sur 2 » et les flèches ne bougeaient
          rien. Un rôle qui promet ce que le code ne tient pas est pire qu'un bouton nu.

          Ensuite le sens : un onglet révèle un PANNEAU parmi plusieurs. Ici les deux
          entrées ne changent pas de contenu, elles changent la PROJECTION du même — mêmes
          données, même cadre, même légende. C'est un choix exclusif, donc des boutons
          radio, et c'est aussi ce que la forme dit déjà : une piste creusée et une
          pastille pleine, jamais un souligné d'onglet.

          `RadioGroup` de Headless UI apporte les quatre flèches et l'index roulant.
          `data-checked` remplace la comparaison manuelle sur `view`. */}
      <RadioGroup
        value={view}
        onChange={setView}
        aria-label={t('Projection de la carte')}
        className="inline-flex rounded-control border border-border-subtle p-0.5"
      >
        {([
          ['carte', t('Carte')],
          ['globe', t('Globe')],
        ] as const).map(([id, label]) => (
          <Radio
            key={id}
            value={id}
            className="cursor-pointer rounded-control px-3 py-1.5 text-xs font-medium text-ink-muted transition-colors duration-150 hover:text-ink data-checked:bg-brand data-checked:text-on-brand data-focus:outline-2 data-focus:outline-offset-2 data-focus:outline-brand"
          >
            {label}
          </Radio>
        ))}
      </RadioGroup>

      {/*
        ══════════════════════════════════════════════════════════════════════
        LE PANNEAU EST EN SURIMPRESSION, PLUS EN COLONNE DE GRILLE
        ══════════════════════════════════════════════════════════════════════

        C'était une seconde colonne, apparue au clic : la grille passait de une à deux
        colonnes et la carte se réduisait d'un tiers. Le pays qu'on venait de cliquer
        changeait donc de taille et de position SOUS LE CURSEUR, au moment précis où
        l'on voulait le regarder — et le refermer le faisait sauter une seconde fois.

        Le conteneur est désormais `relative`, la carte occupe toute la largeur en
        permanence, et le panneau se pose par-dessus son bord droit. La figure ne bouge
        plus du tout : c'est cela que « fluide » demandait, bien plus que l'animation.

        ── SUR PETIT ÉCRAN, IL PREND TOUTE LA LARGEUR ────────────────────────

        `inset-x-2` sous `sm`, `w-80` au-delà. Un panneau de trois cent vingt pixels
        sur un téléphone de trois cent soixante couvrirait la carte à quatre-vingt-dix
        pour cent en laissant une bande inutile : autant l'assumer et couvrir
        franchement, ce qui rend le contenu lisible plutôt qu'à l'étroit.
      */}
      <div className="relative">
        <MapFrame
          ref={figureRef}
          svgRef={svgRef}
          indicatorId={indicatorId}
          indicatorLabel={indicatorLabel}
          year={activeYear}
          legend={<Scale low={low} high={high} tone={tone} unit={unit} scale={scale} />}
        >
          {view === 'carte' ? (
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
          ) : (
            <MacroGlobe
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
          )}
        </MapFrame>

        <CountryPanel
          row={selectedRow ?? null}
          history={history}
          /* `data` est déjà la liste filtrée sur l'année active — celle qui dessine la
             carte. Le panneau y lit la médiane mondiale sans refiltrer. */
          worldValues={data.map((entry) => entry.value)}
          unit={unit}
          scale={scale}
          indicatorLabel={indicatorLabel}
          activeYear={activeYear}
          rank={
            selectedRow ? ranked.findIndex((row) => row.iso3 === selectedRow.iso3) + 1 : 0
          }
          total={ranked.length}
          regional={regional}
          onClose={() => setSelected(null)}
        />
      </div>

      {/* ── Curseur temporel ──────────────────────────────────────────────────
          Absent quand la source ne publie qu'une année : un curseur à une position
          n'est pas un contrôle, c'est un ornement qui laisse croire à une profondeur
          qui n'existe pas. */}
      {years.length > 1 && activeYear !== null ? (
        <div className="space-y-1.5 rounded-card bg-surface px-4 py-3">
          <div className="flex items-baseline justify-between gap-3">
            <label htmlFor="macro-annee" className="text-xs font-medium text-ink">{t('Année observée')}</label>
            <span className="tabular text-sm font-semibold text-ink">{activeYear}</span>
          </div>

          {/* `Slider` de shadcn/ui à la place du `type="range"` natif. Le natif ne
             s'habille qu'à coups de pseudo-éléments propres à chaque moteur, et c'est
             pourquoi il ne portait ici qu'un `accent-color` — sa piste et sa poignée
             restaient celles du système, seul contrôle du site dans ce cas. Celui-ci
             s'appuie sur Radix : même clavier, même sémantique, et le dessin passe par
             nos jetons.

             ⚠️ `value` EST UN TABLEAU, et `onValueChange` en reçoit un. Radix modélise
             tout curseur comme une plage à N poignées ; un curseur simple est le cas à
             une poignée, pas un cas différent. Passer un nombre nu ne lève pas — le
             composant bascule silencieusement en mode non contrôlé, et le curseur
             cesse de suivre l'année choisie ailleurs dans la page.

             AUCUNE SORTIE CHIFFRÉE : l'année est déjà écrite au-dessus, en gras, à
             droite de l'intitulé, et la répéter donnerait deux nombres pour une valeur.
             Le composant n'en affiche pas de lui-même — ce qui supprime au passage le
             `formatOptions` qu'il fallait donner à react-aria pour l'empêcher
             d'annoncer « 202 400 % » au lecteur d'écran. */}
          <Slider
            aria-label={t('Année observée')}
            min={years[0]}
            max={years[years.length - 1]}
            step={1}
            value={[activeYear]}
            onValueChange={([next]) => setYear(Number(next))}
          />

          <div className="tabular flex justify-between text-micro text-ink-muted">
            <span>{years[0]}</span>
            {/*
              LE DÉCOMPTE DES PAYS EST AFFICHÉ, et il varie beaucoup d'une année à
              l'autre. La Banque mondiale publie avec un à deux ans de retard, et
              inégalement selon les pays : l'année la plus récente ne couvre parfois
              qu'un tiers du monde. Sans ce chiffre, une carte à moitié grise
              passerait pour une panne.
            */}
            <span>{t('{n} pays publiés').replace('{n}', String(data.length))}</span>
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
  const t = usePhrase()
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
          aria-label={fullscreen ? t('Quitter le plein écran') : t('Afficher en plein écran')}
          title={fullscreen ? t('Quitter le plein écran') : t('Plein écran')}
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
  const t = usePhrase()
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
        aria-label={t('Aperçu de la carte')}
        title={t('Aperçu de la carte')}
        className="flex h-7 w-7 items-center justify-center rounded-sm border border-border-subtle bg-surface text-ink-muted transition-colors duration-150 hover:bg-surface-muted hover:text-ink"
      >
        <Camera className="h-3.5 w-3.5" aria-hidden="true" />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-1 w-52 overflow-hidden rounded-card border border-border-subtle bg-surface py-1 shadow-lg"
        >
          <p className="px-3 pb-1 pt-1.5 text-micro font-semibold text-ink-muted">{t('Aperçu de la carte')}</p>

          <MenuItem icon={<Download className="h-3.5 w-3.5" />} onClick={onDownload}>{t('Télécharger l’image')}</MenuItem>
          <MenuItem icon={<Copy className="h-3.5 w-3.5" />} onClick={onCopyImage}>{t('Copier l’image')}</MenuItem>
          <MenuItem icon={<Link2 className="h-3.5 w-3.5" />} onClick={onCopyLink}>{t('Copier le lien')}</MenuItem>

          <p className="border-t border-border-subtle px-3 pb-1 pt-1.5 text-micro leading-snug text-ink-muted">
            {indicatorLabel}
            {year ? ` · ${year}` : ''}
          </p>
        </div>
      ) : null}

      {/* La confirmation est un `status` : elle est annoncée sans voler le focus. */}
      {done || failed ? (
        <p
          role="status"
          className={`absolute right-0 top-9 z-20 flex items-center gap-1 whitespace-nowrap rounded-control px-2 py-1 text-micro ${
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
  const locale = useLocale()

  const steps = [0, 0.2, 0.4, 0.6, 0.8, 1]

  return (
    <div className="flex items-center gap-2 text-micro text-ink-muted">
      {/* Le « ≤ » et le « ≥ » ne sont pas décoratifs : ils disent que les valeurs
          au-delà des bornes SATURENT au lieu d'être écrêtées ou exclues. */}
      <span className="tabular">≤ {formatMacroValue(low, scale, locale)}</span>
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
        ≥ {formatMacroValue(high, scale, locale)} {unit}
      </span>
    </div>
  )
}

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * PANNEAU DU PAYS CHOISI — en surimpression, et monté en permanence
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── POURQUOI IL ACCEPTE `row = null` ─────────────────────────────────────────
 *
 * L'appelant le montait conditionnellement : `{selectedRow ? <CountryPanel …/> : null}`.
 * Un composant qui n'existe pas ne peut pas s'animer en SORTIE — au clic sur la croix,
 * il disparaissait d'un coup pendant que l'entrée, elle, était animée. L'asymétrie se
 * voit immédiatement.
 *
 * Il est donc toujours rendu et décide lui-même de son montage, par `usePresence` :
 * ouvert tant qu'un pays est choisi, « closing » le temps de la transition, démonté
 * ensuite. C'est le mécanisme des menus de l'en-tête, et le réécrire ici les aurait
 * fait diverger à la première retouche.
 *
 * ── CE QUE LE PANNEAU PORTE, ET POURQUOI CHAQUE LIGNE Y EST ──────────────────
 *
 * Toutes ces mesures sont DÉRIVÉES de la série déjà chargée — aucun appel réseau
 * supplémentaire, et aucun chiffre inventé : chacune est un calcul sur des
 * observations publiées.
 *
 *   · la VALEUR de l'année affichée, avec son année — qui n'est pas toujours celle du
 *     curseur, la source publiant à des dates différentes selon les pays ;
 *   · le RANG MONDIAL et le RANG RÉGIONAL. Le second manquait, et il répond souvent
 *     mieux : « 8ᵉ sur 200 » et « 8ᵉ sur 9 » ne racontent pas la même histoire ;
 *   · l'ÉCART À LA MÉDIANE mondiale, en unités. Le rang situe en ordinal, la médiane
 *     en grandeur — ce qui parle davantage sur un PIB par habitant ;
 *   · les EXTRÊMES avec leur année, qui situent la valeur courante dans son passé ;
 *   · l'ÉCART depuis la première année publiée, qui répond à « ce pays s'améliore-t-il ? » ;
 *   · l'HISTORIQUE complet, désormais tracé sur toute la profondeur disponible — c'est
 *     ce qui justifie d'avoir chargé soixante-six ans plutôt que quinze.
 *
 * La médiane et non la moyenne : sur des grandeurs économiques, une poignée de pays
 * extrêmes déplace la moyenne au point qu'elle ne décrit plus personne.
 */
function CountryPanel({
  row,
  history,
  worldValues,
  unit,
  scale,
  indicatorLabel,
  activeYear,
  rank,
  total,
  regional,
  onClose,
}: {
  /** `null` quand aucun pays n'est choisi — le panneau se ferme alors en animation. */
  row: MacroObservation | null
  history: MacroObservation[]
  /**
   * Valeurs de TOUS les pays pour l'année affichée — pour situer celle du pays choisi.
   *
   * Passées en prop plutôt que recalculées ici : l'appelant a déjà filtré les
   * observations sur l'année active pour dessiner la carte, et refaire ce filtre
   * reviendrait à parcourir dix mille lignes une seconde fois à chaque clic.
   */
  worldValues: number[]
  unit: string
  scale: 'percent' | 'compact' | 'plain'
  indicatorLabel: string
  /** Année demandée au curseur — à distinguer de celle de l'observation. */
  activeYear: number | null
  rank: number
  total: number
  regional: { rank: number; total: number } | null
  onClose: () => void
}) {
  const locale = useLocale()

  const t = usePhrase()
  const { state, mounted, onTransitionEnd } = usePresence(row !== null)

  /**
   * DERNIÈRES DONNÉES CONNUES, retenues le temps de la fermeture.
   *
   * Pendant les cent vingt millisecondes de sortie, `row` vaut déjà `null` : sans
   * mémoire, le panneau se viderait AVANT de disparaître, et l'on verrait un cadre
   * blanc glisser vers la droite. On garde donc la dernière valeur non nulle, et le
   * contenu reste intact jusqu'au démontage.
   *
   * ⚠️ UN ÉTAT ET NON UNE RÉFÉRENCE. Un `useRef` écrit pendant le rendu est
   * exactement ce que `react-hooks/refs` refuse, et à raison : une référence n'est pas
   * une valeur de rendu, et React ne redessinerait pas quand elle change.
   *
   * Le motif retenu est celui que `usePresence` emploie déjà et que react.dev
   * documente sous « ajuster l'état quand une prop change » : on compare la prop à sa
   * valeur mémorisée PENDANT le rendu, et React relance immédiatement le rendu avec le
   * nouvel état sans rien peindre entre les deux.
   */
  const [lastRow, setLastRow] = useState<MacroObservation | null>(row)
  if (row !== null && row !== lastRow) setLastRow(row)
  const shown = row ?? lastRow

  const values = history.map((entry) => entry.value)
  const min = values.length > 0 ? Math.min(...values) : 0
  const max = values.length > 0 ? Math.max(...values) : 1
  const span = max - min || 1

  /**
   * Mesures dérivées de la série et du monde — voir l'en-tête.
   *
   * `null` quand l'historique se réduit à un point : « depuis 1960 » n'a alors aucun
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
      lastYear: last.year,
      change: history.length > 1 ? last.value - first.value : null,
      min: lowest.value,
      minYear: lowest.year,
      max: highest.value,
      maxYear: highest.year,
      median,
      /** Nombre d'années réellement publiées pour ce pays, sur la période entière. */
      published: history.length,
    }
  }, [history, worldValues])

  if (!mounted || !shown) return null

  const gap = stats?.median != null ? shown.value - stats.median : null

  return (
    <aside
      data-state={state}
      onTransitionEnd={onTransitionEnd}
      aria-label={`${shown.country} — ${indicatorLabel}`}
      /*
        `absolute` DANS le conteneur de la figure, et non `fixed` : le panneau
        appartient à la carte, pas à la fenêtre. En `fixed`, il resterait collé à
        l'écran pendant que la carte défile, ce qui le détacherait de ce qu'il décrit.

        `max-h-full` et `overflow-y-auto` : sur un indicateur à soixante-six ans, la
        liste de mesures dépasse la hauteur de la carte en écran court. Le panneau
        défile alors DANS ses bornes plutôt que de dépasser sous la figure.
      */
      className="side-panel absolute inset-x-2 bottom-2 top-2 z-20 space-y-4 overflow-y-auto rounded-card border border-border-subtle bg-surface p-4 shadow-overlay sm:inset-x-auto sm:right-2 sm:w-80"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold text-ink">{shown.country}</h2>
          <p className="text-micro text-ink-muted">{shown.region}</p>
        </div>
        <IconButton
          size="icon-xs"
          variant="ghost"
          icon={X}
          label={t('Fermer')}
          tooltip={false}
          onClick={onClose}
          className="shrink-0"
          />
      </div>

      <div>
        <p className="text-micro text-ink-muted">{indicatorLabel}</p>
        <p className="figure text-2xl font-bold text-ink">
          {formatMacroValue(shown.value, scale, locale)}{' '}
          <span className="text-sm font-medium text-ink-muted">{unit}</span>
        </p>
        {/*
          L'ANNÉE DE L'OBSERVATION, ET CELLE DU CURSEUR, QUAND ELLES DIFFÈRENT.

          Elles diffèrent souvent : la source publie à des dates différentes selon les
          pays, et la carte affiche la dernière observation disponible pour l'année
          demandée. Sans cette mention, un lecteur qui a posé le curseur sur 2024
          croirait lire 2024 pour tout le monde — ce que la note de la page annonce,
          mais que le panneau doit rappeler là où le chiffre se lit.
        */}
        <p className="text-micro text-ink-muted">
          Observation {shown.year}
          {activeYear !== null && activeYear !== shown.year
            ? ` (curseur sur ${activeYear})`
            : ''}
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-x-3 gap-y-2 border-t border-border-subtle pt-3">
        <Measure label={t('Rang mondial')} value={`${rank} / ${total}`} />
        {regional ? (
          <Measure label={t('Dans sa région')} value={`${regional.rank} / ${regional.total}`} />
        ) : null}

        {stats?.median != null ? (
          <Measure label={t('Médiane mondiale')} value={formatMacroValue(stats.median, scale, locale)} />
        ) : null}

        {/* L'ÉCART À LA MÉDIANE est signé et coloré, parce que c'est une position et
            non une quantité : « +2,4 » au-dessus de la médiane et « −2,4 » en dessous
            décrivent deux situations opposées qu'un nombre nu confondrait. */}
        {gap !== null ? (
          <Measure
            label={t('Écart à la médiane')}
            value={`${gap >= 0 ? '+' : '−'}${formatMacroValue(Math.abs(gap), scale, locale)}`}
            tone={gap >= 0 ? 'up' : 'down'}
          />
        ) : null}

        {stats && stats.change !== null ? (
          <Measure
            label={`Depuis ${stats.firstYear}`}
            value={`${stats.change >= 0 ? '+' : '−'}${formatMacroValue(Math.abs(stats.change), scale, locale)}`}
            tone={stats.change >= 0 ? 'up' : 'down'}
          />
        ) : null}

        {stats ? (
          <>
            <Measure
              label={`Plus bas · ${stats.minYear}`}
              value={formatMacroValue(stats.min, scale, locale)}
            />
            <Measure
              label={`Plus haut · ${stats.maxYear}`}
              value={formatMacroValue(stats.max, scale, locale)}
            />
          </>
        ) : null}
      </dl>

      {history.length > 1 && stats ? (
        <div className="space-y-1">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-micro font-medium text-ink">{t('Historique')}</p>
            {/* LE DÉCOMPTE D'ANNÉES PUBLIÉES, et il varie énormément d'un pays à
                l'autre : la Banque mondiale renseigne la France depuis 1960 et le
                Soudan du Sud depuis 2011. Sans lui, une courbe courte se lirait comme
                une histoire courte plutôt que comme une publication tardive. */}
            <p className="tabular text-micro text-ink-muted">
              {stats.published} années publiées
            </p>
          </div>

          {/* Courbe en SVG brut plutôt qu'avec `AreaPlot` : celui-ci mesure sa largeur
              au montage pour placer ses axes, alors qu'on n'a besoin ici que d'une
              silhouette. Un `viewBox` étirable suffit et s'affiche sans hydratation. */}
          <svg viewBox="0 0 100 40" className="h-16 w-full" role="img" aria-label={t('Historique')}>
            <polyline
              fill="none"
              stroke="var(--color-brand)"
              strokeWidth="1.5"
              vectorEffect="non-scaling-stroke"
              points={history
                .map((entry, index) => {
                  const x = (index / (history.length - 1)) * 100
                  const y = 37 - ((entry.value - min) / span) * 34
                  return `${x.toFixed(1)},${y.toFixed(1)}`
                })
                .join(' ')}
            />

            {/*
              LE POINT DE L'ANNÉE AFFICHÉE, marqué sur la courbe.

              C'est ce qui relie les deux figures : sans lui, on lit une trajectoire
              sans savoir où l'on se tient dessus, et déplacer le curseur ne change
              rien de visible dans le panneau. Le repère bouge avec le curseur, et
              c'est précisément ce qui donne au geste son sens.
            */}
            {(() => {
              const index = history.findIndex((entry) => entry.year === shown.year)
              if (index < 0) return null
              const x = (index / (history.length - 1)) * 100
              const y = 37 - ((history[index]!.value - min) / span) * 34
              return (
                <circle
                  cx={x}
                  cy={y}
                  r="2"
                  fill="var(--color-brand)"
                  stroke="var(--color-surface)"
                  strokeWidth="1"
                  vectorEffect="non-scaling-stroke"
                />
              )
            })()}
          </svg>

          <div className="tabular flex justify-between text-micro text-ink-muted">
            <span>{stats.firstYear}</span>
            <span>{stats.lastYear}</span>
          </div>
        </div>
      ) : null}

      <p className="text-micro leading-relaxed text-ink-muted">{t('Série annuelle publiée avec plusieurs mois de retard, et à des dates différentes selon les pays. Deux pays voisins sur la carte peuvent décrire deux moments distincts.')}</p>
    </aside>
  )
}

/** Une mesure du panneau : son intitulé, son chiffre, et le sens de ce chiffre. */
function Measure({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  /** Absent = grandeur neutre. Présent = position, dont le signe porte le sens. */
  tone?: 'up' | 'down'
}) {
  return (
    <div>
      <dt className="text-micro text-ink-muted">{label}</dt>
      <dd
        className={`tabular text-sm font-semibold ${
          tone === 'up' ? 'text-up' : tone === 'down' ? 'text-down' : 'text-ink'
        }`}
      >
        {value}
      </dd>
    </div>
  )
}
