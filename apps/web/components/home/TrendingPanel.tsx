import { Link } from '@/i18n/navigation'

import type { TrendingAsset } from '@zenkuu/data'
import { ChangeBadge, EmptyState } from '@zenkuu/ui'

import { getContent } from '@/lib/content'
import { assetHref } from '@/lib/asset-routes'

interface TrendingPanelProps {
  assets: TrendingAsset[] | null
  unavailableReason?: string
}

/**
 * Panneau des tendances.
 *
 * Volontairement SANS colonne de prix, à la différence des autres panneaux : la
 * source ne cote les actifs en tendance qu'en dollars, et obtenir leur prix en euros
 * demanderait un appel réseau supplémentaire que le quota gratuit ne permet pas de
 * dépenser à chaque rendu. Afficher un prix converti à la main serait de la donnée
 * inventée (§5) ; afficher un prix en dollars au milieu d'une page en euros serait
 * trompeur. On montre donc le rang et la variation — qui sont, eux, réellement
 * publiés dans la devise affichée.
 */
export async function TrendingPanel({ assets, unavailableReason }: TrendingPanelProps) {
  const fr = await getContent()
  return (
    <section className="flex h-full flex-col rounded-panel border border-border-subtle bg-panel p-4 transition-colors duration-200 hover:border-ink-muted/35">
      {/* Ni emoji ni sous-titre : « Tendances » se suffit, et le sous-titre qui
          l'accompagnait — « Les actifs les plus consultés ces dernières 24 heures » —
          ne faisait que paraphraser le mot au-dessus. */}
      {/* La rangée porte « Tout voir » sur ses deux autres cartes ; l'absence ici se
          lisait comme un panneau qui ne mène nulle part, alors que `/crypto?vue=tendance`
          en est le développement exact. */}
      <div className="mb-2 flex items-start justify-between gap-3">
        <h2 className="text-sm font-semibold text-ink">{fr.home.trendingTitle}</h2>
        <Link
          href="/crypto?vue=tendance"
          className="shrink-0 text-xs font-medium text-brand-strong hover:underline"
        >
          {fr.home.seeAll}
        </Link>
      </div>

      {assets && assets.length > 0 ? (
        <ol className="flex-1 divide-y divide-border-subtle">
          {assets.slice(0, 5).map((asset, index) => (
            <li key={asset.id}>
              <Link
                href={assetHref(asset.assetClass, asset.id)}
                /* Même plaque de survol que `AssetRow`, dont ce panneau est le voisin
                   immédiat : deux traitements de survol dans une même rangée de cartes
                   se lisent comme deux composants étrangers l'un à l'autre. */
                className="group -mx-2 flex items-center gap-2 rounded-control px-2 py-2 transition-colors duration-150 hover:bg-surface-muted/60"
              >
                <span className="tabular w-3 shrink-0 text-[0.6875rem] text-ink-muted">
                  {index + 1}
                </span>

                {asset.image ? (
                  // eslint-disable-next-line @next/next/no-img-element -- vignettes 32px servies par CoinGecko, hors domaines optimisés
                  <img
                    src={asset.image}
                    alt=""
                    width={20}
                    height={20}
                    className="shrink-0 rounded-pill"
                    loading="lazy"
                  />
                ) : (
                  <span className="h-5 w-5 shrink-0 rounded-pill bg-surface-muted" aria-hidden="true" />
                )}

                <span className="min-w-0 flex-1 truncate text-xs font-medium text-ink group-hover:text-brand-strong">
                  {asset.name}
                  <span className="ml-1 uppercase text-ink-muted">{asset.symbol}</span>
                </span>

                {asset.rank !== undefined ? (
                  <span className="tabular shrink-0 text-[0.6875rem] text-ink-muted">
                    #{asset.rank}
                  </span>
                ) : null}

                <span className="w-16 shrink-0 text-right">
                  <ChangeBadge value={asset.change24h} size="sm" />
                </span>
              </Link>
            </li>
          ))}
        </ol>
      ) : (
        <EmptyState
          title={fr.states.unavailableTitle}
          description={unavailableReason ?? null}
          compact
        />
      )}
    </section>
  )
}
