import type { AssetClass, AssetDetail } from '@zenkuu/data'
import { formatCompact, formatPercent } from '@zenkuu/ui'

import { Money } from '@/components/locale/Money'
import { getPhrase } from '@/lib/content'

/**
 * Bandeau de statistiques clés, visible SANS changer d'onglet.
 *
 * Reprise structurelle d'une fiche de cotation : les repères de marché suivent
 * immédiatement le graphique, avant le contenu éditorial. Ils étaient jusqu'ici
 * enfermés dans l'onglet « Statistiques », donc invisibles à qui ne cliquait pas —
 * or capitalisation, volume et amplitude sont précisément ce qu'on vient chercher
 * après avoir regardé la courbe.
 *
 * Chaque cellule n'est rendue que si la donnée existe. Sur une paire de devises, il
 * n'y a ni capitalisation ni volume : le bandeau se réduit alors aux extrêmes, plutôt
 * que d'aligner des tirets (§5).
 */
export async function AssetKeyStats({
  asset,
  assetClass,
}: {
  asset: AssetDetail
  assetClass: AssetClass
}) {
  const t = await getPhrase()
  const isForex = assetClass === 'forex'

  // Yahoo ne publie pas de plus haut historique pour les valeurs boursières : ce
  // champ y porte les extrêmes 52 semaines. Le libellé doit donc changer, sous peine
  // d'annoncer un record de tous les temps qui n'en est pas un.
  const extremeLabel = assetClass === 'crypto' ? 'historique' : 'sur 52 semaines'

  const cells: { label: string; node: React.ReactNode }[] = []

  if (asset.marketCap !== undefined) {
    cells.push({
      label: t('Capitalisation'),
      node: <Money value={asset.marketCap} from={asset.currency} compact />,
    })
  }
  if (asset.volume24h !== undefined) {
    cells.push({
      label: t('Volume 24 h'),
      node: <Money value={asset.volume24h} from={asset.currency} compact />,
    })
  }
  if (asset.high24h !== undefined) {
    cells.push({
      label: t('Plus haut 24 h'),
      node: <Money value={asset.high24h} from={asset.currency} asRate={isForex} />,
    })
  }
  if (asset.low24h !== undefined) {
    cells.push({
      label: t('Plus bas 24 h'),
      node: <Money value={asset.low24h} from={asset.currency} asRate={isForex} />,
    })
  }
  // Valorisation totalement diluée : reprise telle quelle de la source, jamais
  // recalculée en `prix × offre totale` (§5). Omise quand elle égale la
  // capitalisation — c'est le cas des actifs dont toute l'offre circule déjà, et la
  // répéter à l'identique deux cellules plus loin n'apprend rien.
  if (asset.fdv !== undefined && asset.fdv !== asset.marketCap) {
    cells.push({
      label: t('Valorisation diluée'),
      node: <Money value={asset.fdv} from={asset.currency} compact />,
    })
  }
  // N'existe que pour les protocoles de finance décentralisée.
  if (asset.tvl !== undefined) {
    cells.push({
      label: t('Valeur verrouillée'),
      node: <Money value={asset.tvl} from={asset.currency} compact />,
    })
  }
  if (asset.ath !== undefined) {
    cells.push({
      label: `Plus haut ${extremeLabel}`,
      node: (
        <>
          <Money value={asset.ath} from={asset.currency} asRate={isForex} />
          {/* L'écart au record en dit plus que le record seul : « 661 € » ne situe
              rien sans savoir qu'on en est à −86 %. Affiché en second, plus discret,
              pour rester une précision et non un second chiffre concurrent. */}
          {asset.athChangePercent !== undefined ? (
            <span className="ml-1.5 text-xs font-normal text-ink-muted">
              {formatPercent(asset.athChangePercent)}
            </span>
          ) : null}
        </>
      ),
    })
  }
  if (asset.atl !== undefined) {
    cells.push({
      label: `Plus bas ${extremeLabel}`,
      node: (
        <>
          <Money value={asset.atl} from={asset.currency} asRate={isForex} />
          {asset.atlChangePercent !== undefined ? (
            <span className="ml-1.5 text-xs font-normal text-ink-muted">
              {formatPercent(asset.atlChangePercent)}
            </span>
          ) : null}
        </>
      ),
    })
  }
  if (asset.circulatingSupply !== undefined) {
    cells.push({
      label: t('Offre en circulation'),
      node: `${formatCompact(asset.circulatingSupply)} ${asset.symbol.toUpperCase()}`,
    })
  }
  if (asset.maxSupply !== undefined) {
    cells.push({
      label: t('Offre maximale'),
      node: `${formatCompact(asset.maxSupply)} ${asset.symbol.toUpperCase()}`,
    })
  }

  if (cells.length === 0) return null

  return (
    <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-card border border-border-subtle bg-border-subtle sm:grid-cols-4">
      {cells.map((cell) => (
        <div key={cell.label} className="bg-surface px-3 py-2.5">
          <dt className="text-[0.6875rem] text-ink-muted">{cell.label}</dt>
          <dd className="tabular mt-0.5 text-sm font-semibold text-ink">{cell.node}</dd>
        </div>
      ))}
    </dl>
  )
}
