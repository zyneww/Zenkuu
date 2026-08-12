import type { MarketAsset } from '@zenkuu/data'

import { Money } from '@/components/locale/Money'

/**
 * Position du cours dans son amplitude 24 h.
 *
 * Une barre située JUSTE SOUS le prix, là où la référence la place aussi : c'est
 * l'un des rares éléments dont l'emplacement est dicté par la lecture et non par
 * le style — le curseur n'a de sens qu'accolé au chiffre qu'il situe.
 *
 * La position est répétée EN TEXTE sous la barre. Une position graphique ne se lit
 * pas à la synthèse vocale, et la couleur seule ne porte jamais l'information (§9).
 *
 * Le module disparaît si l'un des deux extrêmes manque, ou si l'amplitude est nulle
 * — un curseur sur une barre de largeur zéro n'indiquerait rien, et la division qui
 * calcule sa position produirait `NaN`.
 */
export function AssetRangeBar({ asset, isRate }: { asset: MarketAsset; isRate: boolean }) {
  const { low24h, high24h, price } = asset
  if (low24h === undefined || high24h === undefined) return null
  if (!(high24h > low24h)) return null

  // Bornage : la source horodate le prix et les extrêmes séparément, si bien qu'un
  // cours peut sortir de l'amplitude de quelques centimes entre deux mises à jour.
  // Sans cette borne, le curseur se placerait hors de sa barre.
  const raw = ((price - low24h) / (high24h - low24h)) * 100
  const position = Math.min(Math.max(raw, 0), 100)

  return (
    <section aria-labelledby="amplitude-titre" className="space-y-1.5">
      <h2 id="amplitude-titre" className="sr-only">
        Position du cours dans l’amplitude des 24 heures
      </h2>

      <div className="h-1.5 overflow-hidden rounded-pill bg-surface-muted">
        <div
          className="h-full rounded-pill bg-brand"
          style={{ width: `${position}%` }}
          role="img"
          aria-label={`Le cours se situe à ${Math.round(position)} % de l’amplitude des 24 heures`}
        />
      </div>

      <div className="flex items-baseline justify-between gap-3 text-xs text-ink-muted">
        <span className="tabular">
          <Money value={low24h} from={asset.currency} asRate={isRate} />
        </span>
        <span>Amplitude 24 h</span>
        <span className="tabular">
          <Money value={high24h} from={asset.currency} asRate={isRate} />
        </span>
      </div>
    </section>
  )
}
