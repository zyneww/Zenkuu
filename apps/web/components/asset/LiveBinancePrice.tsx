'use client'

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
      <span className="whitespace-nowrap">{formatted}</span>
      <span
        className="h-1.5 w-1.5 shrink-0 rounded-pill bg-up"
        aria-hidden="true"
      />
      <span className="sr-only">Cours en direct (Binance)</span>
    </span>
  )
}
