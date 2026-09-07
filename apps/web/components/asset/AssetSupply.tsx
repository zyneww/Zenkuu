import type { AssetDetail } from '@zenkuu/data'
import { Progress } from '@/components/ui/progress'

import { Money } from '@/components/locale/Money'
import { RailSection } from '@/components/ui/RailSection'
import { getPhrase } from '@/lib/content'
import { getFormatters } from '@/lib/formatters'

/**
 * Progression de l'offre — la part dérivable de la tokenomique.
 *
 * ── CE QUE CE PANNEAU EST, ET SURTOUT CE QU'IL N'EST PAS ──────────────────────
 *
 * La référence de cette refonte affiche des calendriers de déverrouillage, des
 * falaises de vesting, des allocations par catégorie et des courbes d'émission. Rien
 * de tout cela n'est publié par une source gratuite : ce sont des travaux de
 * recherche, reconstitués contrat par contrat. Les afficher supposerait de les
 * ESTIMER, ce que le §5 interdit — et une estimation présentée à côté de chiffres
 * sourcés est indiscernable d'un chiffre sourcé.
 *
 * Ce panneau montre donc uniquement ce qui se DÉDUIT de nombres publiés, par
 * division. Trois rapports, pas un de plus :
 *
 *   · combien de jetons circulent sur le total prévu ;
 *   · quelle part de la valorisation diluée est déjà réalisée ;
 *   · combien reste à émettre.
 *
 * C'est moins que la référence. C'est exact, ce qu'elle ne peut pas garantir pour
 * les projets dont elle reconstitue le calendrier — sa propre page le dit d'ailleurs
 * en toutes lettres (« estimated », « exact schedules are undisclosed »).
 *
 * ── DEUX BARRES QUI SEMBLENT DIRE LA MÊME CHOSE, ET NE LA DISENT PAS ──────────
 *
 * La part émise et la part de valorisation réalisée sont souvent proches, parfois
 * égales — d'où la tentation de n'en garder qu'une. Elles divergent pourtant dès que
 * la source applique ses propres règles à la valorisation diluée (jetons brûlés,
 * verrouillés définitivement, réserves exclues). L'écart entre les deux barres est
 * alors une information en soi : il dit que le total « théorique » et le total
 * « valorisé » ne coïncident pas.
 */
export async function AssetSupply({ asset }: { asset: AssetDetail }) {
  const nombres = await getFormatters()

  const t = await getPhrase()
  const { circulatingSupply, totalSupply, maxSupply, marketCap, fdv } = asset
  const symbol = asset.symbol.toUpperCase()

  /*
   * Référence de l'offre : le maximum s'il existe, sinon le total.
   *
   * L'ordre compte. Beaucoup d'actifs n'ont pas de plafond (`maxSupply` absent) mais
   * ont un total émis ; rapporter la circulation au total répond alors à une question
   * légèrement différente — « combien du déjà-émis circule » plutôt que « combien du
   * prévu est émis » — et l'étiquette change avec elle, plus bas.
   */
  const ceiling = maxSupply ?? totalSupply
  const releasedShare =
    circulatingSupply !== undefined && ceiling !== undefined && ceiling > 0
      ? Math.min((circulatingSupply / ceiling) * 100, 100)
      : undefined

  const valuedShare =
    marketCap !== undefined && fdv !== undefined && fdv > 0
      ? Math.min((marketCap / fdv) * 100, 100)
      : undefined

  // Reste à émettre : jamais négatif. La source horodate séparément l'offre en
  // circulation et le plafond, si bien que la première peut brièvement dépasser le
  // second — auquel cas le reste est nul, pas négatif.
  const pending =
    circulatingSupply !== undefined && ceiling !== undefined
      ? Math.max(ceiling - circulatingSupply, 0)
      : undefined

  if (releasedShare === undefined && valuedShare === undefined) return null

  return (
    <RailSection title={t('Progression de l’offre')}>
      {releasedShare !== undefined && circulatingSupply !== undefined && ceiling !== undefined ? (
        <Gauge
          label={t(maxSupply !== undefined ? 'Offre émise' : 'Part du total en circulation')}
          share={releasedShare}
          detail={`${nombres.compact(circulatingSupply)} / ${nombres.compact(ceiling)} ${symbol}`}
          tone="brand"
        />
      ) : null}

      {valuedShare !== undefined && marketCap !== undefined && fdv !== undefined ? (
        <div className={releasedShare !== undefined ? 'mt-4' : ''}>
          <Gauge
            label={t('Valorisation réalisée')}
            share={valuedShare}
            detail={
              <>
                <Money value={marketCap} from={asset.currency} compact /> {' / '}
                <Money value={fdv} from={asset.currency} compact />
              </>
            }
            tone="accent"
          />
        </div>
      ) : null}

      {pending !== undefined && pending > 0 ? (
        <div className="mt-4 flex items-baseline justify-between gap-2 border-t border-border-subtle pt-3">
          <span className="text-xs text-ink-muted">
            {maxSupply !== undefined ? t('Reste à émettre') : t('Émis mais hors circulation')}
          </span>
          <span className="tabular text-xs font-medium text-ink">
            {nombres.compact(pending)} {symbol}
          </span>
        </div>
      ) : null}
    </RailSection>
  )
}

/**
 * Jauge libellée.
 *
 * La piste est à `surface-muted` et non à `border-subtle` : sur un panneau élevé, un
 * filet servant de fond de piste se confond avec les séparateurs de lignes voisins,
 * et la barre paraît alors flotter sans support.
 */
async function Gauge({
  label,
  share,
  detail,
  tone,
}: {
  label: string
  share: number
  detail: React.ReactNode
  tone: 'brand' | 'accent'
}) {
  const nombres = await getFormatters()

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs text-ink-muted">{label}</span>
        <span className="tabular text-xs font-semibold text-ink">{nombres.share(share)}</span>
      </div>

      {/* ── DEUX JAUGES, DEUX NIVEAUX DE LA MÊME RAMPE ───────────────────
          La seconde était dorée. L'or ne signifie rien ici — ce n'est ni un
          avertissement, ni un métal précieux, ni une note publiée par la source : il
          ne distinguait les deux jauges que par sa présence, ce qui en faisait une
          décoration. La doctrine de l'accent réserve la couleur à ce que le site
          mesure, et une progression d'émission n'est pas une variation de marché.

          Les deux se distinguent donc par leur PLACE DANS LA RAMPE — la menthe pour
          celle qu'on lit d'abord, l'encre en retrait pour l'autre. La hiérarchie est
          la même, elle ne coûte plus une couleur.

          ── CE QUE `Progress` APPORTE À UN `<div>` DONT ON POUSSE LA LARGEUR ──

          Le remplissage était un `<div role="img" aria-label="… : 62 %">`. Il se
          voyait, mais il ne se MESURAIT pas : « img » annonce une image, pas une
          valeur sur une échelle. Radix rend un `role="progressbar"` avec
          `aria-valuenow`, `aria-valuemin` et `aria-valuemax` — une synthèse vocale
          peut alors dire « 62 %, barre de progression » et un lecteur braille
          l'afficher comme une jauge. L'`aria-label` reste, il nomme CE qui progresse.
      */}
      <Progress
        value={share}
        aria-label={`${label} : ${Math.round(share)} %`}
        className="mt-1.5 h-1.5 rounded-pill bg-surface-muted"
        indicatorClassName={tone === 'brand' ? 'bg-brand' : 'bg-ink-muted'}
      />

      <p className="tabular mt-1.5 text-micro text-ink-muted">{detail}</p>
    </div>
  )
}
