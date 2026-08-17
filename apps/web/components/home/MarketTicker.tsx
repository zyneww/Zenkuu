'use client'

import type { MarketAsset } from '@zenkuu/data'

import { AssetLogo } from '@/components/asset/AssetLogo'
import { Money } from '@/components/locale/Money'
import { Link } from '@/i18n/navigation'
import { assetHref } from '@/lib/asset-routes'

/**
 * BANDEAU DE COTATIONS DÉFILANT — le ruban de TradingView.
 *
 * ── CE QU'IL APPORTE, ET CE QU'IL N'APPORTE PAS ──────────────────────────────
 *
 * Il ne remplace aucun tableau et n'est pas fait pour être lu ligne à ligne. Sa
 * fonction est d'ÉTABLIR EN UN COUP D'ŒIL de quoi le site parle : quelqu'un qui
 * arrive sur la page d'accueil voit passer du bitcoin, du CAC 40 et de l'euro-dollar
 * avant d'avoir lu un titre. C'est ce qui distingue un site de marché d'un blog
 * financier, et c'est la première chose que fait TradingView.
 *
 * ── POURQUOI DU CSS ET NON DU JAVASCRIPT ─────────────────────────────────────
 *
 * Une animation par `requestAnimationFrame` réveillerait le fil principal soixante
 * fois par seconde, en permanence, pour déplacer un ruban. `animation` CSS sur
 * `transform` est composée par le GPU : le fil principal n'est pas sollicité du tout,
 * et le navigateur suspend l'animation quand l'onglet passe en arrière-plan — deux
 * choses qu'il faudrait réimplémenter à la main.
 *
 * ── LA LISTE EST DOUBLÉE, ET C'EST TOUT LE PROCÉDÉ ───────────────────────────
 *
 * Deux copies identiques défilent côte à côte, et l'animation translate d'exactement
 * la moitié de la largeur totale avant de se réinitialiser. À l'instant du saut, la
 * seconde copie occupe exactement la position qu'occupait la première : le retour à
 * zéro est donc invisible, et la boucle paraît infinie sans qu'aucune mesure ne soit
 * faite.
 *
 * ── L'ANIMATION S'ARRÊTE AU SURVOL, ET DOIT S'ARRÊTER TOUT COURT ─────────────
 *
 * Au survol, parce qu'un élément qui fuit sous le curseur est incliquable. Et
 * entièrement sous `prefers-reduced-motion` : un mouvement horizontal permanent est
 * précisément ce que ce réglage existe pour supprimer — il déclenche des malaises
 * chez les personnes sensibles au mouvement, et le bandeau reste parfaitement
 * utilisable arrêté.
 */
export function MarketTicker({ assets }: { assets: MarketAsset[] }) {
  if (assets.length === 0) return null

  const row = (
    <ul className="flex shrink-0 items-center" aria-hidden={undefined}>
      {assets.map((asset) => (
        <li key={`${asset.assetClass}-${asset.id}`}>
          <Link
            href={assetHref(asset.assetClass, asset.id)}
            className="flex items-center gap-2 px-4 py-2 transition-colors duration-150 hover:bg-surface-muted"
          >
            <AssetLogo asset={asset} size={18} />
            <span className="text-xs font-medium uppercase text-ink">{asset.symbol}</span>
            <span className="tabular text-xs text-ink-muted">
              <Money
                value={asset.price}
                from={asset.currency}
                asRate={asset.assetClass === 'forex'}
              />
            </span>
            {asset.change24h !== undefined ? (
              <span
                className={`tabular text-xs font-medium ${
                  asset.change24h >= 0 ? 'text-up' : 'text-down'
                }`}
              >
                {asset.change24h >= 0 ? '+' : ''}
                {asset.change24h.toFixed(2).replace('.', ',')} %
              </span>
            ) : null}
          </Link>
        </li>
      ))}
    </ul>
  )

  return (
    <div
      className="group relative overflow-hidden border-y border-border-subtle bg-surface"
      /* `region` et non `marquee` : ce dernier rôle n'existe pas, et `marquee` en tant
         que `aria-live` annoncerait chaque cotation qui passe — un lecteur d'écran
         réciterait le bandeau en boucle. C'est une zone qu'on consulte, pas une zone
         qui se met à jour. */
      role="region"
      aria-label="Cotations en direct"
    >
      {/* `zenkuu-ticker` est déjà déclarée dans `globals.css` pour `TickerWidget` —
          même translation de -50 %, même procédé de liste doublée. En déclarer une
          seconde ferait vivre deux définitions du même mouvement, dont l'une finirait
          par dériver. Soixante secondes plutôt que la valeur du widget : ce ruban est
          deux fois plus long, et la même durée le ferait défiler deux fois plus vite. */}
      <div className="flex w-max animate-[zenkuu-ticker_60s_linear_infinite] group-hover:[animation-play-state:paused] motion-reduce:animate-none">
        {row}
        {/*
          LA SECONDE COPIE EST MASQUÉE AUX LECTEURS D'ÉCRAN.

          Elle n'existe que pour la continuité visuelle de la boucle. Sans
          `aria-hidden`, une technologie d'assistance annoncerait deux fois chacune des
          quinze cotations, et l'utilisateur conclurait que le site les a dupliquées.
        */}
        <div aria-hidden="true">{row}</div>
      </div>

      {/*
        DÉGRADÉS DE BORD — le ruban doit sembler passer DERRIÈRE la page.

        Sans eux, les cotations apparaissent et disparaissent net au bord de l'écran,
        ce qui donne un mouvement saccadé alors que la translation est continue. Le
        dégradé fait fondre l'entrée et la sortie.

        `pointer-events-none` : ils recouvrent des liens, et sans cela les deux
        premières cotations du ruban seraient incliquables.
      */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-surface to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-surface to-transparent" />
    </div>
  )
}
