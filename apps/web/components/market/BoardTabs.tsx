'use client'

import { Search, SlidersHorizontal, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { usePhrase } from '@/components/locale/ContentProvider'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * LA BARRE DU TABLEAU DE COTATIONS — ONGLETS, RECHERCHE, DEVISE
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Trois contrôles réunis dans un module parce qu'ils occupent la même bande et
 * qu'aucun n'a de sens seul : les onglets décident des colonnes, la recherche décide
 * des lignes, la devise décide de l'unité. Les éparpiller dans trois fichiers
 * obligerait `MarketBrowser` à en importer trois pour rendre une seule rangée.
 *
 * ── CE QUI EST REPRIS DE LA RÉFÉRENCE, ET CE QUI NE L'EST PAS ──────────────
 *
 * La GÉOMÉTRIE est relevée sur Cryptorank, au navigateur : onglets de 14 px avec un
 * trait de 2 px sous l'onglet actif, champ de filtre à gauche de la rangée d'outils,
 * sélecteur de devise à son bord droit. C'est la disposition que la capture demande.
 *
 * Les COULEURS restent celles du site. La référence code son bleu en dur (#1087F4) ;
 * le reprendre donnerait un accent bleu au milieu d'une interface dont l'accent est
 * `--color-brand`, et surtout casserait le thème sombre, où la marque s'éclaircit
 * pour rester lisible. On copie la forme, pas la palette.
 */

/**
 * Jeu de colonnes que l'onglet actif demande au tableau.
 *
 * ── `cotations` REMPLACE `apercu` SUR L'ACCUEIL, ET C'EST UN CHOIX DE LECTURE ──
 *
 * L'aperçu alignait onze colonnes : rang, actif, cours, quatre fenêtres de variation,
 * courbe, volume, capitalisation. C'est la grille d'un CLASSEMENT — on y cherche où
 * un actif se situe par rapport aux autres.
 *
 * ⚠️ `cotations` ÉTAIT LA GRILLE D'UNE PLACE DE MARCHÉ, RELEVÉE SUR MEXC. Elle portait
 * cours, variation, plus haut et plus bas du jour, volume — « on n'y cherche pas un
 * rang mais une SÉANCE ». Le raisonnement se tenait, mais il décrivait un autre site.
 *
 * Relevé le 2026-08-30 sur l'accueil de CoinGecko : rang, monnaie, cours, 1 h, 24 h,
 * 7 j, 30 j, volume, capitalisation, FDV, ratio, courbe 7 jours. Ni haut ni bas de
 * séance. Le rang et la capitalisation, que cette note disait redondants avec l'ordre
 * des lignes, y sont bien présents.
 *
 * Les deux bornes de séance sont donc parties, et les cinq colonnes retirées sont
 * revenues. Ce qui suit décrit l'état ANTÉRIEUR, conservé parce qu'il explique
 * pourquoi `/crypto` a longtemps porté d'autres colonnes que l'accueil :
 * dont c'est le sujet.
 *
 * ── `catalogue` EST LA GRILLE DES SIX PAGES DE CLASSE ────────────────────────
 *
 * Relevée sur Cryptorank : rang, actif, cours, variation 24 h, CAPITALISATION PUIS
 * VOLUME — dans cet ordre, l'inverse de celui de l'aperçu — offre en circulation,
 * courbe 7 jours en fin de ligne.
 *
 * L'ordre capitalisation/volume n'est pas un détail de goût. La capitalisation est le
 * critère de TRI de la page : la poser juste après la variation met la colonne qui
 * ordonne les lignes à côté de celle qui les fait bouger, et le volume — qui commente
 * les deux — vient après. L'aperçu garde l'ordre inverse, hérité de CoinGecko, et
 * c'est pourquoi les deux jeux coexistent au lieu que l'un remplace l'autre.
 */
export type BoardColumnSet = 'apercu' | 'cotations' | 'catalogue' | 'performance' | 'ath'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * LA RANGÉE DU HAUT — L'UNIVERS, ET NON LA VUE
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * MEXC empile DEUX rangées d'onglets au-dessus de son tableau, et la distinction
 * entre les deux est ce qui les rend lisibles :
 *
 *     RANGÉE 1 (20 px)   Favorites · Crypto · Stocks · Fiat      ← QUOI on regarde
 *     RANGÉE 2 (14 px)   Spot · Futures                          ← COMMENT on le regarde
 *
 * La première choisit l'UNIVERS, la seconde la VUE de cet univers. Les fondre en une
 * seule rangée — ce que faisait ce tableau — oblige le lecteur à trouver « Favoris »
 * au milieu de « Performance » et « Sommet historique », qui ne répondent pas à la
 * même question.
 *
 * ── DEUX BOUTONS, DEUX LIENS, ET LA DIFFÉRENCE EST RÉELLE ─────────────────
 *
 * Relevé sur la référence : `Favorites`, `Stocks` et `Fiat` y sont des ANCRES
 * (`/markets/favorite`, `/markets/stocks`, `/markets/fiat`) — elles naviguent. Seuls
 * `Spot` et `Futures` sont des `<span>`, donc de l'état de page.
 *
 * Ici la répartition suit ce que ce site sait faire sans second appel réseau :
 *
 *   · « Crypto » et « Favoris » filtrent les lignes DÉJÀ REÇUES — deux boutons ;
 *   · « Actions » et « Devises » vivent sur d'autres classes d'actifs, servies par
 *     d'autres sources : ce sont des LIENS vers `/actions` et `/devises`. Les rendre
 *     en boutons obligerait l'accueil à charger trois univers Yahoo pour que le
 *     lecteur en voie un — voir l'en-tête de `MarketRibbon` sur le coût réseau.
 *
 * Un bouton qui navigue est un lien déguisé : il perd le clic milieu, le survol qui
 * annonce la destination, et l'indexation.
 */
/**
 * Univers que la rangée du haut sait afficher SANS QUITTER LA PAGE.
 *
 * ⚠️ « Actions » et « Devises » y sont entrés. C'étaient des LIENS : cliquer quittait
 * l'accueil pour `/actions` ou `/devises`, ce qui répondait à la question mais
 * abandonnait le contexte — la bande de chiffres, les cartes, le fil d'actualité. Une
 * rangée d'onglets dont la moitié navigue n'est pas une rangée d'onglets.
 *
 * Les deux jeux sont désormais chargés avec la page et le tableau bascule dessus. Ils
 * restent facultatifs côté composant : les pages qui n'en passent pas gardent les deux
 * seuls onglets crypto, et l'onglet manquant ne s'affiche pas plutôt que de mener à un
 * tableau vide.
 */
export type BoardUniverse = 'crypto' | 'favoris' | 'actions' | 'devises'

export function ClassTabs({
  active,
  onSelect,
  favorisAvailable,
  available,
}: {
  active: BoardUniverse
  onSelect: (next: BoardUniverse) => void
  favorisAvailable: boolean
  /** Univers réellement disponibles. Un absent n'est pas rendu. */
  available: BoardUniverse[]
}) {
  const t = usePhrase()
  const listRef = useRef<HTMLDivElement>(null)
  const tabRefs = useRef(new Map<string, HTMLButtonElement>())
  const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null)

  const LABELS: Record<BoardUniverse, { label: string; hint: string }> = {
    favoris: { label: 'Favoris', hint: 'Seuls les actifs de votre liste de suivi' },
    crypto: { label: 'Crypto', hint: 'L’ensemble des cryptomonnaies du classement' },
    actions: { label: 'Actions', hint: 'Les actions cotées suivies par le site' },
    devises: { label: 'Devises', hint: 'Les principales paires de change' },
  }

  const tabs = available.filter((id) => id !== 'favoris' || favorisAvailable)

  /*
   * ── LE TRAIT GLISSE, IL NE CLIGNOTE PAS ───────────────────────────────────
   *
   * Il était un `after:` posé sur le bouton actif : chaque onglet avait le sien, et
   * ils s'allumaient l'un après l'autre. Des traits dont un seul est visible ne
   * peuvent pas se déplacer. Un trait UNIQUE pour toute la rangée parcourt la
   * distance, et c'est ce mouvement qui dit « d'ici vers là » — même mécanique que
   * `LinkTabs`, dont l'en-tête porte le raisonnement complet.
   *
   * `offsetLeft` est compté depuis le conteneur, référent de position du trait : les
   * deux lisent les mêmes coordonnées. `getBoundingClientRect` donnerait des
   * coordonnées d'ÉCRAN, fausses dès que la rangée a défilé horizontalement.
   *
   * La comparaison avant `setIndicator` n'est pas une optimisation mais une
   * NÉCESSITÉ : l'objet est neuf à chaque mesure, et le poser tel quel relancerait
   * l'effet en boucle par l'observateur qui vient de le déclencher.
   */
  useEffect(() => {
    const list = listRef.current
    if (!list) return

    function measure() {
      const node = tabRefs.current.get(active)
      if (!node) return
      const left = node.offsetLeft
      const width = node.offsetWidth
      setIndicator((previous) =>
        previous && previous.left === left && previous.width === width ? previous : { left, width },
      )
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(list)
    for (const node of tabRefs.current.values()) observer.observe(node)
    return () => observer.disconnect()
  }, [active, tabs.length])

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={t('Univers du tableau')}
      /*
        ── LA GÉOMÉTRIE EST RELEVÉE, PAS DEVINÉE ────────────────────────────

        Mesuré au navigateur sur la référence : intitulés de 20 px en graisse 500,
        actif en encre pleine, inactif en encre atténuée, trait de 2 px.

        LES COULEURS RESTENT CELLES DU SITE : la référence code son gris en dur
        (#87909F) et son actif en quasi-noir (#0D0E0F). Repris tels quels, les deux
        deviendraient illisibles en thème sombre. `text-ink` et `text-ink-muted`
        portent la même hiérarchie dans les deux.
      */
      className="scrollbar-none relative flex items-center gap-6 overflow-x-auto"
    >
      {tabs.map((id) => {
        const selected = id === active
        return (
          <button
            key={id}
            ref={(node) => {
              if (node) tabRefs.current.set(id, node)
              else tabRefs.current.delete(id)
            }}
            type="button"
            role="tab"
            aria-selected={selected}
            title={t(LABELS[id].hint)}
            onClick={() => onSelect(id)}
            className={`whitespace-nowrap px-1 pb-2 pt-1 text-xl font-medium transition-colors duration-150 ${
              selected ? 'text-ink' : 'text-ink-muted hover:text-ink'
            }`}
          >
            {t(LABELS[id].label)}
          </button>
        )
      })}

      {/* ⚠️ EN `bg-ink` ET NON `bg-brand`, contrairement à la rangée du dessous. Ce
          n'est pas une incohérence : deux rangées d'onglets empilées doivent se
          distinguer, sans quoi le lecteur ne voit qu'une grille de boutons. La
          référence fait le même partage — trait sombre en haut, simple graisse en bas.

          Décoratif : `aria-selected` dit déjà l'onglet actif au lecteur d'écran. */}
      {indicator !== null ? (
        <span
          aria-hidden="true"
          className="tab-indicator bg-ink!"
          style={{ width: indicator.width, transform: `translateX(${indicator.left}px)` }}
        />
      ) : null}
    </div>
  )
}

/**
 * Champ de filtre du tableau.
 *
 * ── SA PORTÉE EST ÉCRITE DANS SON INTITULÉ, ET C'EST OBLIGATOIRE ───────────
 *
 * Il ne cherche QUE dans les lignes chargées, quand la loupe de l'en-tête interroge
 * tout le catalogue. Deux champs d'apparence identique et de portée opposée sur le
 * même écran est exactement ce qui avait fait retirer le précédent. La différence
 * tient donc au libellé — « Filtrer » et non « Rechercher » — et à la ligne de
 * décompte que `MarketBrowser` affiche dès qu'un filtre est actif.
 *
 * `type="search"` pour le clavier virtuel et la croix native ; la croix explicite
 * reste, parce que Firefox n'en rend aucune et que le geste doit exister partout.
 */
export function BoardSearch({
  value,
  onChange,
  /**
   * Ce que le champ filtre, au singulier de la classe affichée.
   *
   * ⚠️ Il annonçait « cryptomonnaies » en dur. C'était vrai tant que la rangée du haut
   * ne portait que des cryptos ; depuis que « Actions » et « Devises » y sont de vrais
   * onglets, le champ décrivait une autre liste que celle sous ses yeux.
   */
  subject = 'cryptomonnaies',
}: {
  value: string
  onChange: (next: string) => void
  subject?: string
}) {
  const t = usePhrase()

  return (
    <div className="relative w-full sm:w-64">
      <Search
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted"
        aria-hidden="true"
      />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={`${t('Filtrer les')} ${t(subject)}…`}
        aria-label={`${t('Filtrer les')} ${t(subject)} ${t('affichées')}`}
        className="h-9 w-full rounded-control border border-border-subtle bg-surface pl-9 pr-9 text-sm text-ink outline-none transition-colors placeholder:text-ink-muted focus-visible:border-brand focus-visible:ring-[3px] focus-visible:ring-ring/50 [&::-webkit-search-cancel-button]:hidden"
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label={t('Effacer le filtre')}
          className="absolute right-2 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-control text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
        >
          <X className="size-3.5" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  )
}

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * LES FOURCHETTES — LE BOUTON « FILTRES » DE LA RÉFÉRENCE
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── TROIS FOURCHETTES, ET PAS LES DEUX AUTRES FILTRES DE CRYPTORANK ────────
 *
 * Sa fenêtre de filtres en propose cinq : catégorie, écosystème, capitalisation,
 * volume, variation. Les trois dernières sont ici ; les deux premières manquent, et
 * c'est une ABSENCE DE DONNÉE, pas un raccourci :
 *
 * `MarketAsset` ne porte ni catégorie ni écosystème. Notre fournisseur les publie sur
 * un point de terminaison SÉPARÉ, un appel par catégorie, sans jointure vers les
 * lignes du classement. Un filtre « DeFi » construit là-dessus demanderait une requête
 * par case cochée, sur un quota qui en autorise cinq par minute — et rendrait une
 * liste dont on ne pourrait pas dire si elle est complète. Les deux dimensions restent
 * donc là où elles sont réellement servies : /categories et /categories/ecosystemes.
 *
 * ── LES MONTANTS SE SAISISSENT EN MILLIONS ─────────────────────────────────
 *
 * Une capitalisation s'écrit à dix ou onze chiffres. Demander « 1000000000 » pour un
 * milliard fait compter les zéros à l'écran, et la première faute de frappe vide le
 * tableau sans que rien ne dise pourquoi. Le champ prend donc des MILLIONS — « 1000 »
 * pour un milliard — et l'unité est écrite dans l'intitulé, pas devinée.
 *
 * ⚠️ LA PORTÉE EST CELLE DES LIGNES CHARGÉES, comme le champ de filtre. C'est la même
 * limite, et `MarketBrowser` l'annonce avec la même ligne de décompte.
 */
export interface BoardRanges {
  capMin?: number
  capMax?: number
  volMin?: number
  volMax?: number
  chgMin?: number
  chgMax?: number
}

/** Une fourchette vide ne filtre rien — c'est ce que teste le bandeau de décompte. */
export function rangesActive(ranges: BoardRanges): boolean {
  return Object.values(ranges).some((value) => value !== undefined)
}

/**
 * Un actif passe-t-il les trois fourchettes ?
 *
 * ⚠️ UNE VALEUR ABSENTE ÉCHOUE AU FILTRE, elle ne le traverse pas. Un actif dont la
 * source ne publie pas le volume n'est pas « de volume nul » : le ranger dans une
 * fourchette « moins de 10 M » affirmerait quelque chose qu'on ne sait pas. Il sort
 * donc de la liste dès qu'une borne de volume est posée, et y reste tant qu'aucune
 * ne l'est.
 */
export function withinRanges(
  asset: { marketCap?: number; volume24h?: number; change24h?: number },
  ranges: BoardRanges,
): boolean {
  const check = (value: number | undefined, min?: number, max?: number, scale = 1) => {
    if (min === undefined && max === undefined) return true
    if (value === undefined) return false
    if (min !== undefined && value < min * scale) return false
    if (max !== undefined && value > max * scale) return false
    return true
  }

  const MILLION = 1_000_000

  return (
    check(asset.marketCap, ranges.capMin, ranges.capMax, MILLION) &&
    check(asset.volume24h, ranges.volMin, ranges.volMax, MILLION) &&
    check(asset.change24h, ranges.chgMin, ranges.chgMax)
  )
}

export function BoardFilters({
  ranges,
  onChange,
}: {
  ranges: BoardRanges
  onChange: (next: BoardRanges) => void
}) {
  const t = usePhrase()
  const active = Object.values(ranges).filter((value) => value !== undefined).length

  /* Un champ vidé doit EFFACER la borne, pas la mettre à zéro : « minimum 0 » et
     « pas de minimum » filtrent différemment dès qu'une variation est négative. */
  const set = (key: keyof BoardRanges) => (raw: string) => {
    const trimmed = raw.trim()
    const next = { ...ranges }
    if (trimmed === '') delete next[key]
    else {
      const value = Number(trimmed.replace(',', '.'))
      if (!Number.isFinite(value)) return
      next[key] = value
    }
    onChange(next)
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`flex h-9 items-center gap-2 rounded-control border px-3 text-sm transition-colors ${
            active > 0
              ? 'border-brand text-brand-strong'
              : 'border-border-subtle text-ink hover:border-ink-muted'
          }`}
        >
          <SlidersHorizontal className="size-4" aria-hidden="true" />
          {t('Filtres')}
          {active > 0 ? <span className="tabular text-xs">{active}</span> : null}
        </button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-80 border-border-subtle bg-overlay p-4">
        <div className="space-y-3">
          <RangeRow
            label={t('Capitalisation (millions)')}
            min={ranges.capMin}
            max={ranges.capMax}
            onMin={set('capMin')}
            onMax={set('capMax')}
          />
          <RangeRow
            label={t('Volume 24 h (millions)')}
            min={ranges.volMin}
            max={ranges.volMax}
            onMin={set('volMin')}
            onMax={set('volMax')}
          />
          <RangeRow
            label={t('Variation 24 h (%)')}
            min={ranges.chgMin}
            max={ranges.chgMax}
            onMin={set('chgMin')}
            onMax={set('chgMax')}
          />

          <button
            type="button"
            onClick={() => onChange({})}
            disabled={active === 0}
            className="w-full rounded-control border border-border-subtle py-1.5 text-xs text-ink-muted transition-colors hover:text-ink disabled:opacity-40"
          >
            {t('Tout effacer')}
          </button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

/**
 * Une fourchette : un intitulé, deux champs.
 *
 * `type="number"` et non `type="text"` : il ouvre le clavier numérique sur mobile et
 * fait rejeter les lettres par le navigateur, ce qui évite d'écrire ici la validation
 * que la plateforme fait déjà. La conversion reste défensive côté appelant — un champ
 * numérique accepte « 1e999 ».
 */
function RangeRow({
  label,
  min,
  max,
  onMin,
  onMax,
}: {
  label: string
  min: number | undefined
  max: number | undefined
  onMin: (value: string) => void
  onMax: (value: string) => void
}) {
  const t = usePhrase()

  return (
    <div className="space-y-1.5">
      <p className="text-xs text-ink-muted">{label}</p>
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={min ?? ''}
          onChange={(event) => onMin(event.target.value)}
          placeholder={t('Min')}
          aria-label={`${label} — ${t('Min')}`}
          className="tabular h-8 w-full rounded-control border border-border-subtle bg-surface px-2 text-sm text-ink outline-none transition-colors placeholder:text-ink-muted focus-visible:border-brand"
        />
        <span className="text-xs text-ink-muted" aria-hidden="true">
          –
        </span>
        <input
          type="number"
          value={max ?? ''}
          onChange={(event) => onMax(event.target.value)}
          placeholder={t('Max')}
          aria-label={`${label} — ${t('Max')}`}
          className="tabular h-8 w-full rounded-control border border-border-subtle bg-surface px-2 text-sm text-ink outline-none transition-colors placeholder:text-ink-muted focus-visible:border-brand"
        />
      </div>
    </div>
  )
}

/*
 * `BoardCurrency` VIVAIT ICI — il est parti dans `BoardCurrency.tsx`.
 *
 * `/categories` a fini par vouloir le même sélecteur, et l'importer depuis ce module
 * aurait fait entrer six cents lignes de tableau de bord dans le paquet d'une page
 * qui n'en affiche rien. Le déplacer était moins coûteux que de le dupliquer.
 */
