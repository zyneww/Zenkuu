'use client'

import type { AssetClass, AssetDetail } from '@zenkuu/data'
import { ChangeBadge } from '@zenkuu/ui'

import { AssetLogo } from '@/components/asset/AssetLogo'
import { LiveBinancePrice } from '@/components/asset/LiveBinancePrice'
import { Money } from '@/components/locale/Money'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * IDENTITÉ COMPACTE — ELLE N'EST PLUS UNE BARRE, ELLE EN OCCUPE UNE
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── CE QUI A CHANGÉ, ET POURQUOI ─────────────────────────────────────────────
 *
 * Ce composant était une bande `fixed` complète : elle se posait sous l'en-tête du
 * site, mesurait sa hauteur, portait sa propre sentinelle et son observateur. La barre
 * de sommaire, elle, collait 48 pixels PLUS BAS. La fiche empilait donc trois bandes
 * collantes — en-tête du site, identité, sommaire — soit 156 pixels de chrome
 * permanent, sur une page dont le contenu est un graphique.
 *
 * Les deux dernières ont fusionné. La bande de sommaire porte désormais l'identité à
 * sa gauche, et ce composant n'est plus que ce contenu-là : logo, nom, code, cours,
 * variation. Aucune position, aucune mesure, aucun observateur — tout cela vit
 * maintenant dans `AssetLayoutFrame`, qui possède la bande.
 *
 * La fiche gagne 44 pixels de hauteur utile en permanence, et surtout : le milieu de
 * la bande d'identité, qui était un vide de plusieurs centaines de pixels, porte enfin
 * quelque chose.
 *
 * ── CE QUE LA BANDE MONTRE, ET CE QU'ELLE NE MONTRE PAS ──────────────────────
 *
 * Cinq éléments, pas un de plus : logo, nom, code, cours, variation. Pas de bandeau de
 * statistiques, pas de boutons d'action. Elle répond à « où suis-je, et combien ça
 * vaut » pendant qu'on lit un tableau de places de cotation trois écrans plus bas —
 * sur un site qui sert six classes d'actifs et des milliers d'émetteurs, se tromper de
 * page en lisant une colonne de chiffres est très facile.
 */
export function AssetStickyBar({
  asset,
  assetClass,
  isRate,
}: {
  asset: AssetDetail
  assetClass: AssetClass
  isRate: boolean
}) {
  return (
    <>
      <AssetLogo asset={asset} size={20} />

      {/*
        LE NOM SE RETIRE SOUS `md`, LE CODE RESTE.

        La bande partage désormais sa ligne avec quatre onglets qui défilent
        horizontalement. Sur 375 pixels, « Hyperliquid » plus « HYPE » plus le cours
        plus la variation ne laisseraient rien au sommaire, qui est la raison d'être de
        cette rangée. Le code est ce qui identifie l'actif dans le moins de place —
        c'est d'ailleurs lui qu'on lit sur un carnet d'ordres.
      */}
      <span className="hidden min-w-0 truncate text-sm font-semibold text-ink md:block">
        {asset.name}
      </span>
      <span className="shrink-0 text-micro font-semibold uppercase tracking-wider text-ink-muted">
        {asset.symbol}
      </span>

      <span className="tabular shrink-0 text-sm font-semibold text-ink">
        {assetClass === 'crypto' ? (
          <LiveBinancePrice
            symbol={asset.symbol}
            fallbackValue={asset.price}
            fallbackCurrency={asset.currency}
          />
        ) : (
          <Money value={asset.price} from={asset.currency} asRate={isRate} />
        )}
      </span>

      {/* La variation se retire sous `sm` : c'est le seul des cinq éléments dont
          l'information soit ailleurs sur la page à un défilement de distance, et le
          seul dont la largeur varie avec la valeur. */}
      <span className="hidden shrink-0 sm:block">
        <ChangeBadge value={asset.change24h} size="sm" />
      </span>
    </>
  )
}
