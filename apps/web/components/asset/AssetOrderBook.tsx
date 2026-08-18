'use client'

import { ChevronDown, Minus, Plus } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { formatCompact } from '@zenkuu/ui'

import { usePanelVisible } from '@/components/asset/panel-visibility'
import { Panel } from '@/components/ui/Panel'
import { usePhrase } from '@/components/locale/ContentProvider'

/**
 * Carnet d'ordres et ruban de transactions — Binance, depuis le navigateur.
 *
 * ── POURQUOI C'EST LE SEUL BLOC DE LA FICHE À BATTRE EN TEMPS RÉEL ────────────
 *
 * Tout le reste de la page décrit un ÉTAT publié : un cours horodaté, une
 * capitalisation, un volume sur vingt-quatre heures. Le carnet, lui, décrit une
 * INTENTION — ce que des gens proposent d'acheter ou de vendre à l'instant. C'est la
 * seule information de la fiche qui perd tout son sens si elle a cinq minutes.
 *
 * Il suit donc le même chemin que `LiveBinancePrice`, et pour la même raison :
 * l'appel part du navigateur du visiteur vers l'API publique de Binance, sans clé et
 * sans jamais toucher notre quota CoinGecko. Un carnet rafraîchi côté serveur aurait
 * épuisé le budget de la page en quelques secondes.
 *
 * ── CE QUE CE CARNET N'EST PAS ────────────────────────────────────────────────
 *
 * C'est LE carnet de Binance pour cette paire, pas « le carnet du marché ». Les
 * autres places ont le leur, et il diffère. Le libellé le dit, comme la table des
 * places de cotation le dit déjà pour les prix.
 *
 * ── DÉGRADATION, PAS INVENTION (§5) ───────────────────────────────────────────
 *
 * Toute paire n'est pas cotée sur Binance, et la source peut être injoignable
 * (réseau, CORS, blocage régional). Le composant disparaît alors entièrement plutôt
 * que d'afficher un carnet vide, qui se lirait comme « aucune offre » — c'est-à-dire
 * comme un marché mort, ce qui serait faux. Un seul échec suffit à arrêter le
 * sondage : inutile de harceler une paire qui n'existe pas.
 */

/**
 * Point d'entrée des DONNÉES DE MARCHÉ publiques de Binance.
 *
 * Le même que celui de l'adaptateur serveur (`packages/data/src/providers/binance.ts`),
 * et pour la raison qu'il documente : `api.binance.com` répondrait pareil mais mêle
 * données publiques et endpoints de compte, qu'on n'a aucune raison de viser.
 *
 * ⚠ RESTRICTION GÉOGRAPHIQUE, la même que côté serveur : Binance refuse les IP de
 * certaines juridictions. La différence ici est que la requête part du NAVIGATEUR du
 * visiteur, pas de nos serveurs — c'est donc sa localisation à lui qui décide, et
 * elle nous échappe. D'où un composant qui se retire proprement plutôt qu'un
 * message d'erreur : pour ce visiteur-là, ce bloc n'existe simplement pas.
 */
const BINANCE_DATA_HOST = 'https://data-api.binance.vision'

const POLL_INTERVAL_MS = 3_000
const FETCH_TIMEOUT_MS = 4_000

/**
 * Niveaux DEMANDÉS à Binance, et niveaux AFFICHÉS. Les deux ont divergé.
 *
 * Douze suffisaient tant que le carnet montrait les niveaux bruts. Le regroupement
 * décimal change la donne : il fusionne les niveaux voisins, et douze lignes
 * regroupées par pas de 0,1 sur un actif coté 49 $ se réduisent à deux ou trois
 * seaux — un carnet qui se vide dès qu'on l'élargit.
 *
 * On en demande donc cent (`limit` accepte 5, 10, 20, 50, 100, 500… ; cent pèse 5
 * points de quota chez Binance, sur une limite de 6 000 par minute et par IP — celle
 * du VISITEUR, qui plus est) et l'on n'en affiche que douze après agrégation.
 */
const FETCH_LEVELS = 100
const DEPTH_LEVELS = 12
const TRADE_ROWS = 14

interface Level {
  price: number
  quantity: number
  /** Quantité CUMULÉE depuis le meilleur prix — c'est elle que dessine la barre. */
  total: number
}

/**
 * Échelle des pas de regroupement, DÉDUITE du prix et non écrite en dur.
 *
 * Une liste fixe — 0,001 / 0,01 / 0,1 / 1 — est celle qu'affiche OKX sur une paire
 * cotée autour de 50. Elle n'a aucun sens sur Bitcoin à 63 000, où le pas utile
 * commence à l'unité, ni sur un jeton à 0,000024, où elle ne propose que des pas
 * plus grossiers que le prix lui-même.
 *
 * Le premier échelon vaut donc cinq chiffres significatifs, et les trois suivants
 * remontent de décade en décade. Sur HYPE à 49 $, cela redonne exactement
 * 0,001 / 0,01 / 0,1 / 1 ; sur Bitcoin, 1 / 10 / 100 / 1000.
 */
function tickLadder(price: number): number[] {
  if (!Number.isFinite(price) || price <= 0) return [0.01, 0.1, 1, 10]
  const exponent = Math.floor(Math.log10(price)) - 4
  return [0, 1, 2, 3].map((step) => roundTick(10 ** (exponent + step)))
}

/**
 * Arrondit une puissance de dix à sa valeur exacte.
 *
 * `10 ** -3` vaut 0.001 mais `10 ** -7` vaut 1.0000000000000001e-7 en virgule
 * flottante. Le pas servant de DIVISEUR pour former les seaux, cette poussière se
 * propagerait dans chaque prix regroupé et ferait apparaître des libellés du genre
 * « 0,0000001000000000001 ».
 */
function roundTick(value: number): number {
  return Number(value.toPrecision(1))
}

/** Décimales imposées par le pas : un pas de 0,01 ne peut pas afficher trois chiffres. */
function decimalsFor(tick: number): number {
  return Math.max(0, Math.min(8, -Math.floor(Math.log10(tick))))
}

/**
 * Regroupe des niveaux bruts par pas de prix.
 *
 * ── LE SENS DE L'ARRONDI DÉPEND DU CÔTÉ, ET CE N'EST PAS UN DÉTAIL ────────────
 *
 * Un ordre d'ACHAT à 49,3268 regroupé au pas de 0,01 devient 49,32 — vers le BAS.
 * Un ordre de VENTE au même prix devient 49,33 — vers le HAUT. Arrondir les deux de
 * la même façon annoncerait un achat à 49,33 alors que personne ne propose ce
 * prix-là, ou une vente à 49,32 qu'aucun vendeur n'accepterait. Ce n'est pas une
 * imprécision d'affichage : c'est un prix qui n'existe pas.
 *
 * Le principe général : le regroupement doit toujours être DÉFAVORABLE à celui qui
 * lirait la ligne comme une offre ferme.
 */
function groupLevels(rows: { price: number; quantity: number }[], tick: number, side: 'bids' | 'asks'): Level[] {
  const buckets = new Map<number, number>()

  for (const row of rows) {
    const raw = row.price / tick
    const bucket = (side === 'bids' ? Math.floor(raw) : Math.ceil(raw)) * tick
    // La clé est ARRONDIE aux décimales du pas : `Math.floor(49.32 / 0.01) * 0.01`
    // rend 49.32000000000001, et deux niveaux voisins produiraient alors deux clés
    // distinctes pour un même seau.
    const key = Number(bucket.toFixed(decimalsFor(tick)))
    buckets.set(key, (buckets.get(key) ?? 0) + row.quantity)
  }

  const ordered = [...buckets.entries()].sort((a, b) =>
    side === 'bids' ? b[0] - a[0] : a[0] - b[0],
  )

  let running = 0
  return ordered.slice(0, DEPTH_LEVELS).map(([price, quantity]) => {
    running += quantity
    return { price, quantity, total: running }
  })
}

interface Trade {
  id: number
  price: number
  quantity: number
  time: number
  /** Vrai quand l'acheteur était le teneur : la transaction a donc été initiée à la VENTE. */
  buyerIsMaker: boolean
}

export function AssetOrderBook({ symbol }: { symbol: string }) {
  const t = usePhrase()
  const visible = usePanelVisible()
  /* Les niveaux BRUTS sont conservés en l'état, le regroupement se fait au rendu.
     Stocker les niveaux déjà agrégés obligerait à refaire un appel réseau à chaque
     changement de pas — alors que la donnée nécessaire est déjà là, et que le pas ne
     change rien à ce qu'il faut demander. */
  const [rawBids, setRawBids] = useState<{ price: number; quantity: number }[]>([])
  const [rawAsks, setRawAsks] = useState<{ price: number; quantity: number }[]>([])
  const [trades, setTrades] = useState<Trade[]>([])
  const [unavailable, setUnavailable] = useState(false)

  /**
   * Pas de regroupement choisi, ou `null` tant que le premier carnet n'est pas arrivé.
   *
   * `null` et non une valeur par défaut : l'échelle des pas se DÉDUIT du prix, qu'on
   * ne connaît pas avant la première réponse. Poser 0,01 d'avance afficherait un
   * carnet vide pour un jeton à 0,000024 le temps du premier aller-retour, puis le
   * ferait sauter — un scintillement qu'aucune valeur d'attente ne peut éviter.
   */
  const [tick, setTick] = useState<number | null>(null)

  useEffect(() => {
    if (!visible || unavailable) return

    const pair = `${symbol.toUpperCase()}USDT`
    let cancelled = false

    async function poll(): Promise<void> {
      if (cancelled) return

      try {
        const [depthResponse, tradesResponse] = await Promise.all([
          fetch(`${BINANCE_DATA_HOST}/api/v3/depth?symbol=${pair}&limit=${FETCH_LEVELS}`, {
            signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
          }),
          fetch(`${BINANCE_DATA_HOST}/api/v3/trades?symbol=${pair}&limit=${TRADE_ROWS}`, {
            signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
          }),
        ])

        if (!depthResponse.ok || !tradesResponse.ok) {
          if (!cancelled) setUnavailable(true)
          return
        }

        const depth = (await depthResponse.json()) as { bids: string[][]; asks: string[][] }
        const tape = (await tradesResponse.json()) as {
          id: number
          price: string
          qty: string
          time: number
          isBuyerMaker: boolean
        }[]

        if (cancelled) return

        setRawBids(toRows(depth.bids))
        setRawAsks(toRows(depth.asks))
        setTrades(
          tape
            .map((row) => ({
              id: row.id,
              price: Number(row.price),
              quantity: Number(row.qty),
              time: row.time,
              buyerIsMaker: row.isBuyerMaker,
            }))
            .filter((row) => Number.isFinite(row.price) && Number.isFinite(row.quantity))
            // Binance rend les transactions de la plus ANCIENNE à la plus récente ;
            // un ruban se lit du plus récent vers le bas.
            .reverse(),
        )
      } catch {
        if (!cancelled) setUnavailable(true)
      }
    }

    void poll()
    const intervalId = window.setInterval(() => void poll(), POLL_INTERVAL_MS)

    return () => {
      cancelled = true
      window.clearInterval(intervalId)
    }
  }, [symbol, visible, unavailable])

  /*
    ── TOUT CE QUI SUIT EST CALCULÉ AVANT LE MOINDRE RETOUR ANTICIPÉ ─────────────

    `useMemo` est un crochet : il doit être appelé au même rang à chaque rendu. Le
    `return null` du carnet indisponible se trouve donc APRÈS, et non plus avant —
    le placer plus haut ferait disparaître trois crochets du rendu où la source tombe
    en panne, et React lèverait « Rendered fewer hooks than expected ».
  */
  const ladder = useMemo(
    () => tickLadder(rawAsks[0]?.price ?? rawBids[0]?.price ?? 0),
    [rawAsks, rawBids],
  )

  /* Pas EFFECTIF : celui qu'on a choisi s'il appartient encore à l'échelle, le plus
     fin sinon. La seconde branche couvre le premier rendu (rien n'est encore choisi)
     et le changement d'actif, où l'échelle se déplace de plusieurs décades — garder
     un pas de 0,001 en passant de HYPE à Bitcoin donnerait un carnet de cent lignes
     toutes distinctes. */
  const activeTick = tick !== null && ladder.includes(tick) ? tick : (ladder[0] as number)

  const bids = useMemo(() => groupLevels(rawBids, activeTick, 'bids'), [rawBids, activeTick])
  const asks = useMemo(() => groupLevels(rawAsks, activeTick, 'asks'), [rawAsks, activeTick])

  if (unavailable || (bids.length === 0 && asks.length === 0)) return null

  // Échelle COMMUNE aux deux côtés : des barres normalisées séparément feraient
  // paraître un côté aussi fourni que l'autre alors qu'il pèse dix fois moins.
  const deepest = Math.max(bids.at(-1)?.total ?? 0, asks.at(-1)?.total ?? 0, 1)

  const bestBid = bids[0]?.price
  const bestAsk = asks[0]?.price
  const spread =
    bestBid !== undefined && bestAsk !== undefined && bestBid > 0
      ? ((bestAsk - bestBid) / bestBid) * 100
      : undefined

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <Panel
        title={t('Carnet d’ordres')}
        subtitle={`Offres et demandes sur Binance pour la paire ${symbol.toUpperCase()}/USDT`}
      >
        <TickSelector ladder={ladder} value={activeTick} onChange={setTick} />

        {/* En-tête de colonnes : sans elle, les deux nombres d'une ligne sont
            ambigus — quantité du niveau ou quantité cumulée ? La question se pose
            d'autant plus que la BARRE, elle, mesure le cumul. */}
        <div className="mb-1 flex items-baseline justify-between border-b border-border-subtle pb-1 text-micro uppercase tracking-wide text-ink-muted">
          <span>Prix (USDT)</span>
          <span>{t('Quantité')}</span>
        </div>

        {/* Les VENTES en haut, prix décroissant vers le milieu, puis l'écart, puis
            les ACHATS : c'est la disposition universelle des carnets, et l'inverser
            désorienterait quiconque en a déjà vu un. */}
        <BookSide
          levels={[...asks].reverse()}
          deepest={deepest}
          tone="down"
          align="asks"
          tick={activeTick}
        />

        <div className="my-1.5 flex items-baseline justify-between border-y border-border-subtle py-1.5 text-[0.6875rem]">
          <span className="text-ink-muted">Écart</span>
          <span className="tabular font-medium text-ink">
            {spread === undefined ? '—' : `${spread.toFixed(3)} %`}
          </span>
        </div>

        <BookSide levels={bids} deepest={deepest} tone="up" align="bids" tick={activeTick} />
      </Panel>

      <Panel
        title={t('Dernières transactions')}
        subtitle={t('Flux réel de Binance, rafraîchi toutes les trois secondes')}
      >
        <table className="w-full border-collapse text-xs">
          <caption className="sr-only">
            Dernières transactions exécutées sur la paire {symbol.toUpperCase()}/USDT
          </caption>
          <thead>
            <tr className="text-micro uppercase tracking-wide text-ink-muted">
              <th scope="col" className="py-1 text-left font-medium">
                Heure
              </th>
              <th scope="col" className="py-1 text-right font-medium">
                Prix
              </th>
              <th scope="col" className="py-1 text-right font-medium">{t('Quantité')}</th>
            </tr>
          </thead>
          <tbody>
            {trades.map((trade) => (
              <tr key={trade.id} className="border-b border-border-subtle/60 last:border-0">
                <td className="tabular py-1 text-left text-ink-muted">{clock(trade.time)}</td>
                {/*
                  `isBuyerMaker` vrai signifie que l'ACHETEUR attendait dans le
                  carnet : c'est donc un vendeur qui est venu le chercher, et la
                  transaction est à l'initiative de la vente. La couleur suit
                  l'initiative, comme sur toutes les plateformes.
                */}
                <td
                  className={`tabular py-1 text-right font-medium ${
                    trade.buyerIsMaker ? 'text-down' : 'text-up'
                  }`}
                >
                  {formatLevel(trade.price, ladder[0] as number)}
                </td>
                <td className="tabular py-1 text-right text-ink-muted">
                  {formatCompact(trade.quantity)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  )
}

/**
 * Un côté du carnet.
 *
 * ── LES BARRES BOUGENT, ELLES NE SAUTENT PLUS ─────────────────────────────────
 *
 * Chaque sondage remplaçait sèchement la largeur de chaque barre. Toutes les trois
 * secondes, douze rectangles changeaient donc de taille d'un seul coup : le carnet
 * clignotait sans qu'on puisse voir CE QUI avait changé, ce qui est pourtant toute
 * l'information d'un carnet vivant — quel niveau s'épaissit, lequel se vide.
 *
 * Une transition de largeur suffit à la rendre lisible : l'œil suit un mouvement, il
 * ne suit pas une substitution. Six cents millisecondes, soit un cinquième de
 * l'intervalle — assez lent pour être perçu, assez rapide pour que la barre soit
 * stabilisée bien avant le sondage suivant.
 *
 * ── LE SURVOL CUMULE, IL NE SURLIGNE PAS ──────────────────────────────────────
 *
 * Survoler une ligne éclaire TOUTES celles qui la séparent du meilleur prix, et
 * l'infobulle donne ce que représente ce bloc : combien de niveaux, quelle quantité,
 * quelle valeur, et à quel prix moyen. C'est la vraie question qu'on pose à un
 * carnet — « si je balayais jusqu'ici, ça me coûterait combien ? » — et elle n'a
 * aucune réponse dans une ligne isolée.
 */
function BookSide({
  levels,
  deepest,
  tone,
  align,
  tick,
}: {
  levels: Level[]
  deepest: number
  tone: 'up' | 'down'
  align: 'bids' | 'asks'
  tick: number
}) {
  /**
   * Rang survolé, compté DEPUIS LE MEILLEUR PRIX.
   *
   * Et non depuis le haut de la liste : le côté vente est rendu à l'envers — le
   * meilleur prix y est en BAS, contre l'écart. Raisonner en indices d'affichage
   * ferait cumuler à partir du pire prix sur ce côté, et l'infobulle annoncerait le
   * coût d'un balayage que personne ne ferait jamais.
   */
  const [depthHovered, setDepthHovered] = useState<number | null>(null)

  const isAsks = align === 'asks'
  const count = levels.length

  return (
    <ul
      aria-label={isAsks ? 'Ordres de vente' : 'Ordres d’achat'}
      onMouseLeave={() => setDepthHovered(null)}
    >
      {levels.map((level, index) => {
        // Sur le côté vente, la liste reçue est déjà inversée : le rang réel d'une
        // ligne depuis le meilleur prix est donc son complément.
        const rank = isAsks ? count - 1 - index : index
        const lit = depthHovered !== null && rank <= depthHovered

        return (
          <li
            key={level.price}
            onMouseEnter={() => setDepthHovered(rank)}
            className="relative flex items-baseline justify-between py-[3px]"
          >
            {/* Barre de profondeur en ARRIÈRE-PLAN, ancrée à droite : elle mesure la
                quantité cumulée jusqu'à ce niveau, pas la quantité du niveau seul —
                c'est ce cumul qui dit à quel prix un ordre de taille donnée se
                remplirait. Coins vifs, comme chez toutes les plateformes : un
                rectangle arrondi se lit comme une pastille, pas comme une mesure. */}
            <span
              aria-hidden="true"
              className={`absolute inset-y-0 right-0 transition-[width,background-color] duration-[600ms] ease-out ${
                tone === 'up'
                  ? lit
                    ? 'bg-up/30'
                    : 'bg-up/12'
                  : lit
                    ? 'bg-down/30'
                    : 'bg-down/12'
              }`}
              style={{ width: `${Math.min((level.total / deepest) * 100, 100)}%` }}
            />

            <span
              className={`tabular relative text-xs font-medium ${
                tone === 'up' ? 'text-up' : 'text-down'
              }`}
            >
              {formatLevel(level.price, tick)}
            </span>
            <span
              className={`tabular relative text-xs ${lit ? 'text-ink' : 'text-ink-muted'}`}
            >
              {formatCompact(level.quantity)}
            </span>

            {/* L'infobulle n'est rendue que sur la ligne EFFECTIVEMENT survolée, pas
                sur chacune des lignes éclairées — douze bulles empilées se
                recouvriraient. */}
            {depthHovered === rank ? <DepthTooltip level={level} rank={rank} /> : null}
          </li>
        )
      })}
    </ul>
  )
}

/**
 * Ce que représente le bloc survolé.
 *
 * « Prix limite » et non « prix moyen », et la nuance est volontaire. Le prix moyen
 * d'un balayage se calcule en pondérant CHAQUE niveau traversé par sa quantité ; on
 * ne dispose ici que du cumul et du dernier prix atteint. Multiplier l'un par l'autre
 * donnerait un chiffre qui ressemble à une valeur d'exécution sans en être une — il
 * surestime le coût d'un achat et le sous-estime pour une vente.
 *
 * Le prix limite, lui, est exact et c'est de toute façon le chiffre décisif : c'est
 * le pire prix qu'on accepterait, donc celui qu'on inscrirait dans un ordre. La
 * ligne « Valeur » est étiquetée en conséquence — elle borne, elle ne prédit pas.
 */
function DepthTooltip({ level, rank }: { level: Level; rank: number }) {
  const t = usePhrase()
  return (
    <span
      role="tooltip"
      className="pointer-events-none absolute right-0 top-full z-30 mt-0.5 flex min-w-[11rem] flex-col gap-0.5 rounded-dense border border-border-subtle bg-overlay px-2.5 py-2 text-[0.6875rem] shadow-overlay"
    >
      {/* `formatCompact` rend `null` sur une valeur non finie. Le tiret cadratin est
          donc explicite plutôt que laissé à l'interpolation, qui écrirait « null »
          en toutes lettres dans l'infobulle. */}
      <TooltipRow label={t('Niveaux balayés')} value={String(rank + 1)} />
      <TooltipRow label={t('Quantité cumulée')} value={formatCompact(level.total) ?? '—'} />
      <TooltipRow
        label={t('Valeur au plus')}
        value={
          formatCompact(level.total * level.price) === null
            ? '—'
            : `${formatCompact(level.total * level.price)} USDT`
        }
      />
      <TooltipRow label="Prix limite" value={formatCompact(level.price) ?? '—'} />
    </span>
  )
}

function TooltipRow({ label, value }: { label: string; value: string }) {
  return (
    <span className="flex items-baseline justify-between gap-3">
      <span className="text-ink-muted">{label}</span>
      <span className="tabular font-medium text-ink">{value}</span>
    </span>
  )
}

/**
 * Sélecteur du pas de regroupement — « − 0,001 + », comme sur les plateformes.
 *
 * Les deux flèches parcourent l'échelle d'un cran, le libellé central l'ouvre en
 * entier. Ce double accès n'est pas redondant : on ajuste presque toujours d'un cran
 * (« c'est trop fin »), et l'on saute rarement de 0,001 à 1 — mais quand on le fait,
 * on veut le faire d'un geste plutôt qu'en cliquant trois fois.
 */
function TickSelector({
  ladder,
  value,
  onChange,
}: {
  ladder: number[]
  value: number
  onChange: (tick: number) => void
}) {
  const [open, setOpen] = useState(false)
  const index = ladder.indexOf(value)

  function step(delta: number) {
    const next = ladder[Math.min(ladder.length - 1, Math.max(0, index + delta))]
    if (next !== undefined) onChange(next)
  }

  return (
    <div className="mb-2 flex items-center justify-end gap-0.5">
      <span className="mr-auto text-micro uppercase tracking-wide text-ink-muted">
        Regroupement
      </span>

      <button
        type="button"
        onClick={() => step(-1)}
        disabled={index <= 0}
        aria-label="Regroupement plus fin"
        className="flex h-6 w-6 items-center justify-center text-ink-muted transition-colors duration-150 hover:bg-surface-muted hover:text-ink disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
      >
        <Minus className="h-3 w-3" aria-hidden="true" />
      </button>

      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          aria-expanded={open}
          aria-haspopup="menu"
          className="tabular flex h-6 min-w-[3.5rem] items-center justify-center gap-1 border border-border-subtle px-1.5 text-[0.6875rem] font-medium text-ink transition-colors duration-150 hover:bg-surface-muted"
        >
          {formatTick(value)}
          <ChevronDown className="h-3 w-3 shrink-0 text-ink-muted" aria-hidden="true" />
        </button>

        {open ? (
          <div
            role="menu"
            className="absolute right-0 top-full z-30 mt-0.5 min-w-full rounded-dense border border-border-subtle bg-overlay py-0.5 shadow-overlay"
          >
            {ladder.map((entry) => (
              <button
                key={entry}
                type="button"
                role="menuitem"
                onClick={() => {
                  onChange(entry)
                  setOpen(false)
                }}
                className={`tabular block w-full px-2.5 py-1 text-right text-[0.6875rem] transition-colors duration-150 ${
                  entry === value ? 'bg-surface-muted text-ink' : 'text-ink-muted hover:text-ink'
                }`}
              >
                {formatTick(entry)}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <button
        type="button"
        onClick={() => step(1)}
        disabled={index >= ladder.length - 1}
        aria-label="Regroupement plus large"
        className="flex h-6 w-6 items-center justify-center text-ink-muted transition-colors duration-150 hover:bg-surface-muted hover:text-ink disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
      >
        <Plus className="h-3 w-3" aria-hidden="true" />
      </button>
    </div>
  )
}

function formatTick(tick: number): string {
  return tick.toLocaleString('fr-FR', {
    minimumFractionDigits: decimalsFor(tick),
    maximumFractionDigits: decimalsFor(tick),
  })
}

/**
 * Paires `[prix, quantité]` de Binance → nombres exploitables.
 *
 * Le cumul n'est plus calculé ici : il dépend du REGROUPEMENT, qui se décide au
 * rendu. Le calculer sur les niveaux bruts puis regrouper produirait des totaux qui
 * ne correspondraient plus aux lignes affichées.
 */
function toRows(rows: string[][]): { price: number; quantity: number }[] {
  return rows
    .map((row) => ({ price: Number(row[0]), quantity: Number(row[1]) }))
    .filter((row) => Number.isFinite(row.price) && Number.isFinite(row.quantity))
}

/**
 * Prix d'un niveau de carnet.
 *
 * Les décimales suivent le PAS DE REGROUPEMENT, plus l'ordre de grandeur du prix.
 * La règle précédente — quatre décimales en dessous de 100 — affichait « 49,3300 »
 * pour un niveau regroupé au pas de 0,01 : deux zéros qui promettent une précision
 * que le regroupement vient précisément de retirer, et qui laissent croire que les
 * douze lignes du carnet sont les douze meilleurs prix réels.
 *
 * Le ruban de transactions, lui, continue d'appeler cette fonction avec le pas le
 * plus fin de l'échelle : ses prix sont bruts, ils n'ont subi aucun regroupement.
 */
function formatLevel(value: number, tick: number): string {
  const digits = decimalsFor(tick)
  return value.toLocaleString('fr-FR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

function clock(time: number): string {
  return new Date(time).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}
