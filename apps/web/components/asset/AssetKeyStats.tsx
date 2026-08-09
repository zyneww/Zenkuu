import type { AssetClass, AssetDetail } from '@zenith/data'
import { formatCompact } from '@zenith/ui'

import { Money } from '@/components/locale/Money'

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
export function AssetKeyStats({
  asset,
  assetClass,
}: {
  asset: AssetDetail
  assetClass: AssetClass
}) {
  const isForex = assetClass === 'forex'

  // Yahoo ne publie pas de plus haut historique pour les valeurs boursières : ce
  // champ y porte les extrêmes 52 semaines. Le libellé doit donc changer, sous peine
  // d'annoncer un record de tous les temps qui n'en est pas un.
  const extremeLabel = assetClass === 'crypto' ? 'historique' : 'sur 52 semaines'

  const cells: { label: string; node: React.ReactNode }[] = []

  if (asset.marketCap !== undefined) {
    cells.push({
      label: 'Capitalisation',
      node: <Money value={asset.marketCap} from={asset.currency} compact />,
    })
  }
  if (asset.volume24h !== undefined) {
    cells.push({
      label: 'Volume 24 h',
      node: <Money value={asset.volume24h} from={asset.currency} compact />,
    })
  }
  if (asset.high24h !== undefined) {
    cells.push({
      label: 'Plus haut 24 h',
      node: <Money value={asset.high24h} from={asset.currency} asRate={isForex} />,
    })
  }
  if (asset.low24h !== undefined) {
    cells.push({
      label: 'Plus bas 24 h',
      node: <Money value={asset.low24h} from={asset.currency} asRate={isForex} />,
    })
  }
  if (asset.ath !== undefined) {
    cells.push({
      label: `Plus haut ${extremeLabel}`,
      node: <Money value={asset.ath} from={asset.currency} asRate={isForex} />,
    })
  }
  if (asset.atl !== undefined) {
    cells.push({
      label: `Plus bas ${extremeLabel}`,
      node: <Money value={asset.atl} from={asset.currency} asRate={isForex} />,
    })
  }
  if (asset.circulatingSupply !== undefined) {
    cells.push({
      label: 'Offre en circulation',
      node: `${formatCompact(asset.circulatingSupply)} ${asset.symbol.toUpperCase()}`,
    })
  }
  if (asset.maxSupply !== undefined) {
    cells.push({
      label: 'Offre maximale',
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
