'use client'

import { useEffect, useRef, useState } from 'react'

import { formatCurrency } from '@zenkuu/ui'

import { useCurrency } from '@/components/locale/CurrencyProvider'
import { Money } from '@/components/locale/Money'
import { useLiveTicker } from '@/components/asset/useLiveTicker'

/**
 * Cours qui TIQUE — complément de `Money`, pas un remplacement.
 *
 * ── POURQUOI BINANCE, EN PLUS DE COINGECKO ────────────────────────────────────
 *
 * CoinGecko reste la SEULE source de vérité du site (classement, capitalisation,
 * offre, historique — Binance n'a rien de tout ça, ce n'est pas un agrégateur).
 * Mais son palier gratuit plafonne à ~5 requêtes/minute mesurées (§9) : rafraîchir
 * un seul cours plus vite que quelques minutes y consommerait tout le budget de la
 * page. Binance publie son PROPRE dernier cours négocié, sans clé, avec une marge
 * bien plus confortable (~1200 unités de poids/minute) — largement de quoi tiquer
 * toutes les quelques secondes, DEPUIS LE NAVIGATEUR du visiteur, donc sans jamais
 * toucher notre propre quota CoinGecko.
 *
 * ── CE QUE C'EST, ET CE QUE CE N'EST PAS ──────────────────────────────────────
 *
 * C'est le cours de Binance pour cette paire précise, pas un « prix de marché »
 * agrégé — deux nombres réels mais distincts, comme le note déjà `getAssetTickers`
 * pour les places de cotation. C'est un COMPLÉMENT visuel (l'impression de direct),
 * jamais la donnée qui alimente le rail de métriques, l'historique ou le classement.
 *
 * ── DEGRADATION, PAS INVENTION (§5) ───────────────────────────────────────────
 *
 * Toute paire n'est pas forcément listée sur Binance (petites capitalisations),
 * et le fournisseur peut être injoignable (CORS, réseau, blocage régional). Dans
 * tous ces cas, on retombe sur `Money` — le cours CoinGecko déjà rendu côté
 * serveur — sans jamais afficher un chiffre approché ou périmé comme s'il était en
 * direct. Une seule tentative ratée arrête le sondage pour ce montage : pas de
 * boucle de reprise contre une paire qui n'existe simplement pas.
 *
 * ── USDT ≈ USD, UNE APPROXIMATION ASSUMÉE ─────────────────────────────────────
 *
 * Binance cote la quasi-totalité de ses paires en USDT, pas dans les 62 devises du
 * site. On convertit donc via le taux USD déjà présent dans le moteur de change
 * (BCE + CoinGecko) plutôt que de limiter l'effet aux quelques paires EUR de
 * Binance, qui ne couvriraient qu'une poignée d'actifs. L'écart USDT/USD réel
 * (quelques points de base la plupart du temps) est le prix de cette couverture
 * large — documenté ici plutôt que tu.
 */
/**
 * ── LE SONDAGE A CÉDÉ LA PLACE AU FLUX ────────────────────────────────────────
 *
 * Ce fichier tenait son propre sondage REST toutes les quatre secondes. Il vit
 * désormais dans `useLiveTicker`, qui ouvre un WebSocket et ne retombe sur ce même
 * sondage que si le flux reste muet. Le déplacement n'est pas qu'un rangement : le
 * graphique a besoin EXACTEMENT du même cours, au même instant, et deux sondages
 * concurrents sur la même paire auraient affiché deux chiffres différents dans le
 * même écran — l'un dans le titre, l'autre au bout de la courbe.
 */

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * LE COURS S'ALLUME AU TIC — VERT S'IL MONTE, ROUGE S'IL BAISSE
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── CE QUE CELA RÉSOUT ────────────────────────────────────────────────────────
 *
 * Un cours en direct qui change de valeur SANS RIEN SIGNALER passe inaperçu : le
 * nombre se substitue à lui-même entre deux images, et rien ne dit qu'il vient de
 * bouger — ni dans quel sens. Le point vert à côté annonce « ceci est en direct »,
 * jamais « ceci vient de changer ». C'est une différence réelle : sur un actif calme,
 * les deux se ressemblent pendant des minutes.
 *
 * La teinte brève est la convention de tous les carnets d'ordres et de toutes les
 * plateformes — Binance, CoinGecko, TradingView. Elle porte l'information la plus
 * volatile de la page à l'endroit exact où l'œil est déjà posé.
 *
 * ── POURQUOI 600 ms, ET PAS PLUS ──────────────────────────────────────────────
 *
 * Le flux pousse jusqu'à un message par seconde. Une teinte qui dure plus longtemps
 * que l'intervalle entre deux tics resterait allumée en permanence, et cesserait donc
 * de signaler quoi que ce soit. Six cents millisecondes laissent toujours un temps
 * mort entre deux impulsions, même sur l'actif le plus agité.
 *
 * ── LE SENS EST COMPARÉ AU TIC PRÉCÉDENT, PAS À L'OUVERTURE ───────────────────
 *
 * C'est ce que le geste veut dire — « il vient de monter », pas « il est au-dessus de
 * son ouverture », qui est le travail de la pastille de variation juste à côté. Un tic
 * de valeur IDENTIQUE (le cas le plus fréquent sur un carnet peu animé) n'allume rien :
 * il n'y a pas de mouvement à signaler.
 */
const FLASH_MS = 600

export function LiveBinancePrice({
  symbol,
  fallbackValue,
  fallbackCurrency,
}: {
  /** Symbole de l'actif (ex. « BTC ») — la paire tentée est `${symbol}USDT`. */
  symbol: string
  fallbackValue: number | undefined
  fallbackCurrency: string
}) {
  const { currency, convert } = useCurrency()
  const tick = useLiveTicker(symbol)
  const direction = usePriceFlash(tick?.price ?? null)

  if (tick === null) {
    return <Money value={fallbackValue} from={fallbackCurrency} />
  }

  const converted = convert(tick.price, 'USD')
  const formatted = formatCurrency(converted, currency)

  if (formatted === null) {
    return <Money value={fallbackValue} from={fallbackCurrency} />
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      {/*
        ── LA TEINTE PORTE SUR LE TEXTE *ET* SUR UN FOND ────────────────────────

        Le fond seul serait un rectangle coloré qui apparaît et disparaît — du bruit.
        Le texte seul serait invisible sur un cours de quarante pixels dont la moitié
        des lecteurs regardent la courbe. Les deux ensemble donnent l'impulsion sans
        déplacer un pixel : `-mx-1 px-1` reprend exactement ce que le rembourrage
        ajoute, la mise en page ne bouge donc pas quand la teinte s'allume.

        Le retour au repos est ADOUCI (`transition-colors`), l'allumage non : une
        impulsion qui monte progressivement se lit comme un fondu, pas comme un tic.
      */}
      <span
        className={`-mx-1 whitespace-nowrap rounded-control px-1 transition-colors duration-500 ${
          direction === 'up'
            ? 'bg-up/15 text-up'
            : direction === 'down'
              ? 'bg-down/15 text-down'
              : ''
        }`}
      >
        {formatted}
      </span>
      <span
        className="h-1.5 w-1.5 shrink-0 rounded-pill bg-up"
        aria-hidden="true"
      />
      <span className="sr-only">Cours en direct (Binance)</span>
    </span>
  )
}

/**
 * Sens du dernier mouvement, éteint de lui-même au bout de `FLASH_MS`.
 *
 * ── POURQUOI UNE RÉFÉRENCE ET NON UN ÉTAT POUR LA VALEUR PRÉCÉDENTE ───────────
 *
 * Elle ne doit RIEN redessiner : seule la direction est affichée. La ranger dans un
 * état provoquerait un second rendu à chaque message du flux — un par seconde, pour
 * une valeur que personne ne lit.
 *
 * Le minuteur est REPOSÉ à chaque tic plutôt que laissé courir : deux hausses
 * rapprochées doivent donner deux impulsions distinctes, pas une seule allongée.
 */
function usePriceFlash(price: number | null): 'up' | 'down' | null {
  const [direction, setDirection] = useState<'up' | 'down' | null>(null)
  const previous = useRef<number | null>(null)

  useEffect(() => {
    if (price === null) {
      previous.current = null
      return
    }

    const before = previous.current
    previous.current = price

    /* Premier relevé : il n'y a pas de « précédent » avec quoi le comparer, et un tic
       de valeur identique n'est pas un mouvement. */
    if (before === null || before === price) return

    setDirection(before < price ? 'up' : 'down')
    const timer = setTimeout(() => setDirection(null), FLASH_MS)
    return () => clearTimeout(timer)
  }, [price])

  return direction
}
