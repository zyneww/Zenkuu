import { Link } from '@/i18n/navigation'

import type { MarketAsset } from '@zenkuu/data'
import { ChangeBadge } from '@zenkuu/ui'

import { AssetLogo } from '@/components/asset/AssetLogo'
import { Money } from '@/components/locale/Money'
import { assetHref } from '@/lib/asset-routes'

/**
 * Une ligne de cotation dans un panneau compact.
 *
 * ── POURQUOI CE FICHIER EXISTE ────────────────────────────────────────────────
 *
 * Ce balisage vivait à l'intérieur de `HighlightPanel`, seul endroit qui en avait
 * besoin. `CrossAssetPanel` en a besoin du même, et le recopier aurait créé deux
 * lignes de cotation jumelles qui auraient divergé au premier ajustement de gouttière
 * — exactement ce que l'en-tête de `HighlightPanel` reproche déjà à l'idée de trois
 * composants séparés pour tendances, hausses et baisses.
 *
 * Les largeurs sont FIXES (`w-3`, `w-16`) et non proportionnelles : c'est ce qui
 * aligne verticalement les rangs et les variations d'un panneau à l'autre quand deux
 * panneaux se côtoient. Une largeur en pourcentage les décalerait dès que les noms
 * d'actifs diffèrent en longueur, ce qui est toujours le cas.
 */
export function AssetRow({
  asset,
  rank,
}: {
  asset: MarketAsset
  /** Absent, aucune colonne de rang n'est réservée — voir `CrossAssetPanel`. */
  rank?: number
}) {
  return (
    <Link
      href={assetHref(asset.assetClass, asset.id)}
      /*
        `prefetch={false}` — ce composant sert des PANNEAUX, donc par paquets.
        L'accueil en affiche une trentaine (marchés, hausses, baisses), chacun menant à
        une fiche dont le rendu serveur interroge la source, sur le limiteur de débit de
        la page en cours. Les précharger tous coûte trente rendus pour un clic au plus.
        Voir OPTIMISATION.md, section « Réseau ».
      */
      prefetch={false}
      className="flex items-center gap-2 py-1.5 transition-opacity hover:opacity-75"
    >
      {rank !== undefined ? (
        <span className="tabular w-3 shrink-0 text-[0.6875rem] text-ink-muted">{rank}</span>
      ) : null}
      <AssetLogo asset={asset} size={20} />
      <span className="min-w-0 flex-1 truncate text-xs font-medium text-ink">{asset.name}</span>
      <span className="tabular shrink-0 text-xs text-ink">
        <Money
          value={asset.price}
          from={asset.currency}
          asRate={asset.assetClass === 'forex'}
        />
      </span>
      <span className="w-16 shrink-0 text-right">
        <ChangeBadge value={asset.change24h} size="sm" />
      </span>
    </Link>
  )
}
