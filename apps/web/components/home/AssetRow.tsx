import { Link } from '@/i18n/navigation'

import type { MarketAsset } from '@zenkuu/data'
import { ChangeBadge } from '@/components/locale/ChangeBadge'

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
      /*
        ── LE SURVOL TEINTE LA LIGNE, IL NE LA FAIT PLUS PÂLIR ──────────────

        `hover:opacity-75` atténuait la ligne survolée : le seul retour du site où
        désigner quelque chose le rendait MOINS lisible, et sur un fond sombre une
        variation colorée à 75 % perd le peu de contraste qu'elle avait.

        La plaque teintée fait l'inverse — elle détache la ligne sans toucher à son
        contenu — et c'est le geste des deux références. Les marges négatives la font
        déborder du padding de la carte, sans quoi la plaque s'arrêterait à quelques
        pixels du bord et se lirait comme un défaut d'alignement.
      */
      className="group -mx-2 flex items-center gap-2 rounded-control px-2 py-2 transition-colors duration-150 hover:bg-surface-muted/60"
    >
      {rank !== undefined ? (
        <span className="tabular w-3 shrink-0 text-micro text-ink-muted">{rank}</span>
      ) : null}
      <AssetLogo asset={asset} size={20} />
      {/* Le TICKER suit le nom, en gris et en capitales — la forme exacte de
          `TrendingPanel`, qui se lit juste à côté dans la même rangée de cartes. Deux
          panneaux voisins qui nomment un actif de deux façons différentes se lisent
          comme deux composants étrangers l'un à l'autre. */}
      <span className="min-w-0 flex-1 truncate text-xs font-medium text-ink transition-colors group-hover:text-brand">
        {asset.name}
        <span className="ml-1 uppercase text-ink-muted">{asset.symbol}</span>
      </span>
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
