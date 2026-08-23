import { Link } from '@/i18n/navigation'
import { Item, ItemContent, ItemMedia, ItemTitle } from '@/components/ui/item'

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

      {/*
        ── CHAQUE VIGNETTE EST UN `Item`, ET C'EST UNE SÉMANTIQUE GAGNÉE ────────

        C'étaient des `<li>` portant un `<Link>` habillé, avec deux `<div>` anonymes
        pour l'en-tête et le corps. `Item` nomme ces parties — `ItemMedia` pour le
        logo, `ItemContent` pour ce qui se lit, `ItemTitle` et `ItemDescription` — et
        les relie : un lecteur d'écran annonce alors « Bitcoin, 77 443 $, +0,57 % »
        comme UNE entrée, au lieu d'égrener trois textes sans rapport déclaré.

        `asChild` sur le lien : la vignette entière reste cliquable, et reste un vrai
        `<a href>` localisé — clic milieu, menu contextuel, indexation.

        `Item` remplace aussi l'habillage : bordure, rayon, fond, marge interne et
        transition de survol viennent de sa variante `outline`. Les seules classes qui
        restent sont celles que la RANGÉE impose — la largeur fixe des vignettes.
      */}
      <ul className="flex gap-2 overflow-x-auto pb-1">
        {items.map((asset) => (
          <li key={asset.id} className="shrink-0">
            <Item asChild variant="outline" size="sm" className="w-40 items-start gap-2 rounded-card border-border-subtle bg-panel p-3 hover:border-brand">
              <Link href={assetHref(asset.assetClass, asset.id)}>
                <ItemMedia>
                  <AssetLogo asset={asset} size={20} />
                </ItemMedia>

                <ItemContent className="gap-2">
                  <ItemTitle className="min-w-0 truncate text-xs font-medium text-ink">
                    {asset.name}
                  </ItemTitle>

                  <div>
                    <p className="tabular text-sm font-semibold text-ink">
                      {formatCurrency(asset.price, asset.currency)}
                    </p>
                    <ChangeBadge value={asset.change24h} size="sm" />
                  </div>
                </ItemContent>
              </Link>
            </Item>
          </li>
        ))}
      </ul>
    </section>
  )
}
