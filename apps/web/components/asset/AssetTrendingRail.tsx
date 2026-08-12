import { Link } from '@/i18n/navigation'

import type { MarketAsset } from '@zenkuu/data'
import { ChangeBadge, formatCurrency } from '@zenkuu/ui'

import { AssetLogo } from '@/components/asset/AssetLogo'
import { assetHref } from '@/lib/asset-routes'

/**
 * Bandeau « en tendance », en pied de fiche.
 *
 * ── POURQUOI EN BAS, ET PAS DANS LA COLONNE ───────────────────────────────────
 *
 * C'est le seul bloc de la page qui ne parle PAS de l'actif consulté. Le placer dans
 * la colonne de gauche, au milieu des cartes de chiffres, obligerait le lecteur à
 * vérifier à chaque carte si elle concerne encore l'actif qu'il regarde. En pied de
 * page, après la description et la fiche technique, il occupe la place qui lui
 * revient : celle du « et ensuite ? ».
 *
 * ── DÉFILEMENT HORIZONTAL, ET UNE SEULE RANGÉE ────────────────────────────────
 *
 * Une grille qui se replie sur plusieurs lignes ferait de la tendance un pavé plus
 * haut que la description de l'actif. Une rangée qui déborde dit visuellement « il y
 * en a d'autres à droite » sans réclamer de hauteur, et le débordement reste
 * accessible au clavier puisque chaque carte est un lien focalisable.
 */
export function AssetTrendingRail({
  assets,
  currentId,
}: {
  assets: MarketAsset[]
  /** L'actif consulté, retiré de la liste : s'y proposer soi-même est absurde. */
  currentId: string
}) {
  const items = assets.filter((asset) => asset.id !== currentId).slice(0, 8)
  if (items.length < 2) return null

  return (
    <section aria-labelledby="tendance-titre" className="space-y-3">
      <h2 id="tendance-titre" className="text-sm font-semibold text-ink">
        En tendance
      </h2>

      <ul className="flex gap-2 overflow-x-auto pb-1">
        {items.map((asset) => (
          <li key={asset.id} className="shrink-0">
            <Link
              href={assetHref(asset.assetClass, asset.id)}
              className="flex w-40 flex-col gap-2 rounded-card border border-border-subtle bg-panel p-3 transition-colors duration-150 hover:border-brand"
            >
              <div className="flex items-center gap-2">
                <AssetLogo asset={asset} size={20} />
                <span className="min-w-0 flex-1 truncate text-xs font-medium text-ink">
                  {asset.name}
                </span>
              </div>

              <div>
                <p className="tabular text-sm font-semibold text-ink">
                  {formatCurrency(asset.price, asset.currency)}
                </p>
                <ChangeBadge value={asset.change24h} size="sm" />
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
