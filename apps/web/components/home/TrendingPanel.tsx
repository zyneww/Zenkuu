import Link from 'next/link'

import type { TrendingAsset } from '@zenith/data'
import { ChangeBadge, EmptyState } from '@zenith/ui'

import { fr } from '@/content/fr'
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
export function TrendingPanel({ assets, unavailableReason }: TrendingPanelProps) {
  return (
    <section className="flex h-full flex-col rounded-card border border-border-subtle bg-surface p-4">
      {/* Ni emoji ni sous-titre : « Tendances » se suffit, et le sous-titre qui
          l'accompagnait — « Les actifs les plus consultés ces dernières 24 heures » —
          ne faisait que paraphraser le mot au-dessus. */}
      <h2 className="mb-2 text-sm font-semibold text-ink">{fr.home.trendingTitle}</h2>

      {assets && assets.length > 0 ? (
        <ol className="flex-1 divide-y divide-border-subtle">
          {assets.slice(0, 5).map((asset, index) => (
            <li key={asset.id}>
              <Link
                href={assetHref(asset.assetClass, asset.id)}
                className="group flex items-center gap-2 py-1.5 transition-opacity hover:opacity-75"
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
                    className="shrink-0 rounded-full"
                    loading="lazy"
                  />
                ) : (
                  <span className="h-5 w-5 shrink-0 rounded-full bg-surface-muted" aria-hidden="true" />
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
