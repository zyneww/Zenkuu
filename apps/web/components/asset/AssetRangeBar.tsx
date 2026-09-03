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
        LA PISTE PASSE AU-DESSUS, ET LES TROIS LIBELLÉS DESSOUS
        ══════════════════════════════════════════════════════════════════════════

        Forme relevée sur `blockworks.com/price/hyperliquid` : une piste pleine
        largeur, un curseur triangulaire posé dessus, et sous elle trois libellés
        — la borne basse à gauche, le nom de la fenêtre au centre, la borne haute
        à droite.

        Ce qui change par rapport à la rangée précédente (« Bas 76 250 ▬▬▬ Haut
        77 669 ») n'est pas décoratif. La piste y était COINCÉE entre deux textes
        de longueur variable : sur un actif à quatre chiffres elle faisait deux
        cents pixels, sur un actif à sept elle en faisait cent vingt, et la même
        position de curseur ne se lisait donc pas pareil d'une fiche à l'autre.
        Sortie des textes, elle prend toujours la même largeur.

        L'intitulé central reprend en outre la place que les mots « Bas » et
        « Haut » occupaient — et il dit quelque chose qu'eux ne disaient pas :
        SUR QUELLE FENÊTRE porte l'amplitude. Le haut et le bas restent lisibles
        sans eux, puisque la gauche d'une piste est son minimum.

        ⚠️ LE CURSEUR EST EN `border`, PAS EN CARACTÈRE. Un « ▼ » textuel dépend de
        la police installée et se décale d'un demi-pixel selon la ligne de base ;
        quatre bordures transparentes et une pleine dessinent le même triangle à
        la même place partout.
      */}
      <div className="relative h-1 w-full rounded-pill bg-surface-active">
        <div
          className="h-full rounded-pill bg-brand"
          style={{ width: `${position}%` }}
          role="img"
          aria-label={`Le cours se situe à ${Math.round(position)} % de l’amplitude des 24 heures`}
        />
        <span
          aria-hidden="true"
          className="absolute top-full h-0 w-0 -translate-x-1/2 border-x-[3px] border-t-[4px] border-x-transparent border-t-brand"
          style={{ left: `${position}%` }}
        />
      </div>

      {/* `justify-between` et non une grille : les deux montants tiennent leurs
          bords, l'intitulé flotte entre eux. Une grille à trois pistes égales
          décalerait le centre dès que les deux nombres n'ont pas la même longueur. */}
      <div className="flex items-baseline justify-between gap-2 text-micro">
        <span className="tabular font-medium text-ink">
          <Money value={low24h} from={asset.currency} asRate={isRate} />
        </span>

        <span className="text-ink-muted">{t('Amplitude 24 h')}</span>

        <span className="tabular font-medium text-ink">
          <Money value={high24h} from={asset.currency} asRate={isRate} />
        </span>
      </div>

    </section>
  )
}
