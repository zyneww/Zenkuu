'use client'

import { useEffect, useMemo, useState } from 'react'

import { BINANCE_DATA_HOST, toBinancePair } from '@/components/asset/binance-market'
import { usePhrase } from '@/components/locale/ContentProvider'

/**
 * Graphique de PROFONDEUR — combien il faudrait acheter ou vendre pour déplacer le cours.
 *
 * ── CE QU'IL MONTRE, ET POURQUOI C'EST UNE AUTRE QUESTION QUE LA COURBE ───────
 *
 * La courbe de cours répond à « où en est-on ? ». Celle-ci répond à « qu'est-ce qui
 * tient ce prix ? ». Les deux courbes montantes de part et d'autre du cours cumulent
 * les ordres en attente : à gauche ce que des acheteurs se sont engagés à prendre en
 * dessous du marché, à droite ce que des vendeurs proposent au-dessus.
 *
 * La forme se lit d'un coup d'œil. Deux murs raides et symétriques disent un marché
 * profond, où une grosse transaction passe sans déplacer le cours. Un côté plat dit
 * l'inverse : là, un ordre modeste balaie plusieurs paliers d'un coup. C'est
 * exactement l'information qu'aucune moyenne ni aucun volume sur 24 h ne contient.
 *
 * ── UN INSTANTANÉ, ET IL FAUT LE DIRE ─────────────────────────────────────────
 *
 * Un carnet n'a pas d'histoire : il décrit l'instant, et il est réécrit en continu.
 * Ce composant ne conserve donc rien et ne retrace rien — il redemande l'état courant
 * toutes les quelques secondes. C'est le même raisonnement que `AssetOrderBook`, dont
 * il partage la source et la restriction géographique.
 *
 * ── C'EST LE CARNET DE BINANCE, PAS « LE MARCHÉ » ─────────────────────────────
 *
 * Une seule place parmi les dizaines qui cotent l'actif (§5). L'attribution est donc
 * portée à l'écran, sous le tracé, et non reléguée dans ce commentaire.
 */

/** Cinq cents niveaux : assez pour que les murs lointains apparaissent, sans excès. */
const DEPTH_LIMIT = 500
const POLL_INTERVAL_MS = 5_000
const FETCH_TIMEOUT_MS = 5_000

/**
 * Étendue tracée autour du cours médian, en pourcentage.
 *
 * Le carnet complet couvre parfois ±80 % : tracé en entier, l'essentiel de la liquidité
 * se tasse en une bande de trois pixels au centre. Deux pour cent de part et d'autre
 * correspondent à l'amplitude d'une journée ordinaire — la zone où se joue réellement
 * une transaction.
 */
const SPAN_PERCENT = 2

interface Level {
  price: number
  /** Quantité CUMULÉE depuis le milieu du carnet — c'est elle qui monte en escalier. */
  total: number
}

export function AssetDepthChart({ symbol }: { symbol: string }) {
  const t = usePhrase()
  const [bids, setBids] = useState<Level[]>([])
  const [asks, setAsks] = useState<Level[]>([])
  const [unavailable, setUnavailable] = useState(false)

  useEffect(() => {
    if (unavailable) return

    const pair = toBinancePair(symbol)
    let cancelled = false

    async function poll(): Promise<void> {
      if (cancelled || document.visibilityState !== 'visible') return

      try {
        const response = await fetch(
          `${BINANCE_DATA_HOST}/api/v3/depth?symbol=${pair}&limit=${DEPTH_LIMIT}`,
          { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) },
        )
        if (!response.ok) {
          if (!cancelled) setUnavailable(true)
          return
        }

        const payload = (await response.json()) as { bids?: string[][]; asks?: string[][] }
        if (cancelled) return

        setBids(accumulate(payload.bids ?? []))
        setAsks(accumulate(payload.asks ?? []))
      } catch {
        // Paire absente, réseau coupé, ou juridiction bloquée par Binance : le bloc
        // se retire au lieu d'afficher une erreur pour une donnée d'appoint.
        if (!cancelled) setUnavailable(true)
      }
    }

    void poll()
    const timer = setInterval(() => void poll(), POLL_INTERVAL_MS)

    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [symbol, unavailable])

  const shape = useMemo(() => buildShape(bids, asks), [bids, asks])

  if (unavailable || !shape) {
    return (
      <div className="flex h-[320px] items-center justify-center rounded-card border border-border-subtle text-sm text-ink-muted">
        {unavailable
          ? t('Binance ne publie pas de carnet pour cet actif.')
          : t('Chargement du carnet…')}
      </div>
    )
  }

  return (
    <figure className="m-0">
      <svg
        viewBox="0 0 1000 320"
        preserveAspectRatio="none"
        className="h-[320px] w-full"
        role="img"
        aria-label={`Profondeur du carnet ${symbol} sur Binance : ${formatQuantity(
          shape.bidTotal,
        )} à l’achat et ${formatQuantity(shape.askTotal)} à la vente à ±${SPAN_PERCENT} % du cours.`}
      >
        {/* Les deux aires sont peintes AVANT les traits : un contour recouvert par son
            propre remplissage perdrait la moitié de son épaisseur. */}
        <path d={shape.bidArea} fill="var(--color-up)" opacity="0.14" />
        <path d={shape.askArea} fill="var(--color-down)" opacity="0.14" />
        <path d={shape.bidLine} fill="none" stroke="var(--color-up)" strokeWidth="2" />
        <path d={shape.askLine} fill="none" stroke="var(--color-down)" strokeWidth="2" />

        {/* Le cours médian, en pointillé : c'est l'axe de symétrie du dessin, et sans
            lui on ne sait pas où l'achat s'arrête et où la vente commence. */}
        <line
          x1="500"
          y1="0"
          x2="500"
          y2="320"
          stroke="var(--color-border-subtle)"
          strokeWidth="1"
          strokeDasharray="4 4"
        />
      </svg>

      <figcaption className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[0.6875rem] text-ink-muted">
        <span>
          <span className="font-medium text-up">{formatQuantity(shape.bidTotal)}</span> à l’achat ·{' '}
          <span className="font-medium text-down">{formatQuantity(shape.askTotal)}</span> à la vente,
          à ±{SPAN_PERCENT} % du cours
        </span>
        <span>{t('Carnet Binance · instantané, rafraîchi toutes les 5 s')}</span>
      </figcaption>
    </figure>
  )
}

/**
 * Cumul des quantités depuis le meilleur prix.
 *
 * Binance rend ses niveaux DÉJÀ TRIÉS du meilleur au pire de chaque côté ; le cumul
 * suit donc simplement l'ordre reçu. Une ligne dont le prix ou la quantité ne se relit
 * pas est écartée plutôt que comptée pour zéro — un palier fantôme creuserait un
 * plateau là où il y a de la liquidité.
 */
function accumulate(rows: string[][]): Level[] {
  const levels: Level[] = []
  let running = 0

  for (const row of rows) {
    const price = Number(row[0])
    const quantity = Number(row[1])
    if (!Number.isFinite(price) || !Number.isFinite(quantity)) continue

    running += quantity
    levels.push({ price, total: running })
  }

  return levels
}

interface DepthShape {
  bidArea: string
  askArea: string
  bidLine: string
  askLine: string
  bidTotal: number
  askTotal: number
}

/**
 * Traduit deux demi-carnets en chemins SVG.
 *
 * ── UNE SEULE ÉCHELLE VERTICALE POUR LES DEUX CÔTÉS ───────────────────────────
 *
 * Les deux aires partagent le maximum le PLUS GRAND des deux, jamais le leur. Deux
 * échelles indépendantes donneraient à un carnet déséquilibré l'apparence de la
 * symétrie parfaite — et c'est précisément le déséquilibre qu'on vient lire ici.
 *
 * ── UN ESCALIER, PAS UNE COURBE ───────────────────────────────────────────────
 *
 * La quantité cumulée ne varie pas entre deux paliers : elle SAUTE au palier suivant.
 * Relier les points en diagonale suggérerait une liquidité continue qui n'existe pas.
 * D'où les segments en marches — `H` puis `V` — plutôt qu'une ligne brisée.
 */
function buildShape(bids: Level[], asks: Level[]): DepthShape | null {
  const bestBid = bids[0]?.price
  const bestAsk = asks[0]?.price
  if (bestBid === undefined || bestAsk === undefined) return null

  const mid = (bestBid + bestAsk) / 2
  const span = (mid * SPAN_PERCENT) / 100
  if (!(span > 0)) return null

  const visibleBids = bids.filter((level) => level.price >= mid - span)
  const visibleAsks = asks.filter((level) => level.price <= mid + span)

  const bidTotal = visibleBids[visibleBids.length - 1]?.total ?? 0
  const askTotal = visibleAsks[visibleAsks.length - 1]?.total ?? 0
  const peak = Math.max(bidTotal, askTotal)
  if (!(peak > 0)) return null

  // Le prix le plus bas est à gauche, le plus haut à droite — la disposition
  // universelle des carnets, que l'inverser rendrait illisible pour qui en a déjà vu.
  const x = (price: number) => 500 + ((price - mid) / span) * 500
  const y = (total: number) => 320 - (total / peak) * 300

  const bidSteps = toSteps(visibleBids, x, y)
  const askSteps = toSteps(visibleAsks, x, y)
  if (!bidSteps || !askSteps) return null

  return {
    bidLine: bidSteps.path,
    askLine: askSteps.path,
    // L'aire redescend jusqu'au socle puis rejoint le centre : sans cette fermeture
    // explicite, le remplissage relierait les deux extrémités en diagonale.
    bidArea: `${bidSteps.path} L ${bidSteps.endX} 320 L 500 320 Z`,
    askArea: `${askSteps.path} L ${askSteps.endX} 320 L 500 320 Z`,
    bidTotal,
    askTotal,
  }
}

function toSteps(
  levels: Level[],
  x: (price: number) => number,
  y: (total: number) => number,
): { path: string; endX: number } | null {
  const first = levels[0]
  if (!first) return null

  let path = `M 500 ${y(first.total)}`
  let endX = 500

  for (const level of levels) {
    endX = x(level.price)
    // `V` d'abord puis `H` : la quantité monte AU palier, elle ne monte pas en y
    // arrivant. L'ordre inverse décalerait chaque marche d'un cran.
    path += ` V ${y(level.total)} H ${endX}`
  }

  return { path, endX }
}

function formatQuantity(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)} M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)} k`
  return value.toFixed(1)
}
