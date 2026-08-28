import type { MarketAsset } from '@zenkuu/data'

import { Money } from '@/components/locale/Money'
import { getPhrase } from '@/lib/content'

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
export async function AssetRangeBar({ asset, isRate }: { asset: MarketAsset; isRate: boolean }) {
  const t = await getPhrase()
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
        {t('Position du cours dans l’amplitude des 24 heures')}
      </h2>

      {/*
        ══════════════════════════════════════════════════════════════════════════
        LES BORNES SONT NOMMÉES, ET L'INTITULÉ CENTRAL A DISPARU
        ══════════════════════════════════════════════════════════════════════════

        La légende s'écrivait « 77,20 · Amplitude 24 h · 83,40 » : deux nombres
        encadrant un titre. Trois éléments pour dire une chose, et le plus long des
        trois — l'intitulé — était celui qui n'apportait rien : une barre bornée par
        deux montants EST une amplitude, personne n'a besoin qu'on le lui écrive.

        Ce qui manquait, en revanche, c'est LEQUEL EST LEQUEL. Sur un actif dont les
        deux bornes se ressemblent (77,20 et 83,40, ou pire 2,24 et 2,88), rien ne
        disait quel côté était le plus bas — il fallait comparer les chiffres. Les
        mots « Bas » et « Haut » collés à chaque montant répondent avant la lecture.

        C'est ce que fait la référence, et la place gagnée par l'intitulé retiré est
        exactement celle que prennent les deux mots.
      */}
      <div className="flex items-center gap-2 text-xs">
        <span className="shrink-0 text-ink-muted">
          {t('Bas')}{' '}
          <span className="tabular font-medium text-ink">
            <Money value={low24h} from={asset.currency} asRate={isRate} />
          </span>
        </span>

        <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-pill bg-surface-muted">
          <div
            className="h-full rounded-pill bg-brand"
            style={{ width: `${position}%` }}
            role="img"
            aria-label={`Le cours se situe à ${Math.round(position)} % de l’amplitude des 24 heures`}
          />
        </div>

        <span className="shrink-0 text-ink-muted">
          {t('Haut')}{' '}
          <span className="tabular font-medium text-ink">
            <Money value={high24h} from={asset.currency} asRate={isRate} />
          </span>
        </span>
      </div>
    </section>
  )
}
