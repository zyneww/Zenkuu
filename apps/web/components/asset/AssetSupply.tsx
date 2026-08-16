import type { AssetDetail } from '@zenkuu/data'
import { formatCompact, formatShare } from '@zenkuu/ui'

import { Money } from '@/components/locale/Money'
import { RailSection } from '@/components/ui/RailSection'

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
export function AssetSupply({ asset }: { asset: AssetDetail }) {
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
    <RailSection title="Progression de l’offre">
      {releasedShare !== undefined && circulatingSupply !== undefined && ceiling !== undefined ? (
        <Gauge
          label={maxSupply !== undefined ? 'Offre émise' : 'Part du total en circulation'}
          share={releasedShare}
          detail={`${formatCompact(circulatingSupply)} / ${formatCompact(ceiling)} ${symbol}`}
          tone="brand"
        />
      ) : null}

      {valuedShare !== undefined && marketCap !== undefined && fdv !== undefined ? (
        <div className={releasedShare !== undefined ? 'mt-4' : ''}>
          <Gauge
            label="Valorisation réalisée"
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
            {maxSupply !== undefined ? 'Reste à émettre' : 'Émis mais hors circulation'}
          </span>
          <span className="tabular text-xs font-medium text-ink">
            {formatCompact(pending)} {symbol}
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
function Gauge({
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
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs text-ink-muted">{label}</span>
        <span className="tabular text-xs font-semibold text-ink">{formatShare(share)}</span>
      </div>

      <div className="mt-1.5 h-1.5 overflow-hidden rounded-pill bg-surface-muted">
        <div
          className={`h-full rounded-pill ${tone === 'brand' ? 'bg-brand' : 'bg-accent'}`}
          style={{ width: `${share}%` }}
          role="img"
          aria-label={`${label} : ${Math.round(share)} %`}
        />
      </div>

      <p className="tabular mt-1.5 text-[0.6875rem] text-ink-muted">{detail}</p>
    </div>
  )
}
