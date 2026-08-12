import { Link } from '@/i18n/navigation'

import type { MarketAsset } from '@zenkuu/data'
import { ChangeBadge, EmptyState } from '@zenkuu/ui'

import { AssetLogo } from '@/components/asset/AssetLogo'
import { Money } from '@/components/locale/Money'
import { getContent } from '@/lib/content'
import { assetHref } from '@/lib/asset-routes'

interface HighlightPanelProps {
  title: string
  assets: MarketAsset[] | null
  /**
   * Précision de PÉRIMÈTRE — et rien d'autre.
   *
   * À réserver aux cas où l'omettre laisserait croire à une exhaustivité qui
   * n'existe pas (« parmi les 100 plus grandes capitalisations »). Un texte qui se
   * contente de reformuler le titre n'a pas sa place ici : un panneau qui explique
   * ce qu'il vient d'annoncer traite son lecteur en débutant permanent.
   */
  hint?: string
  href?: string
  unavailableReason?: string
}

/**
 * Panneau compact de mise en avant — tendances, hausses, baisses.
 *
 * Un seul composant pour les trois : ils ne diffèrent que par leur titre et leur
 * jeu de données. C'est la « grille de cartes homogène » du §3.2, appliquée
 * jusqu'au code — trois composants jumeaux auraient divergé au premier ajustement.
 *
 * SANS ICÔNE, délibérément. Les emoji qui ornaient ces en-têtes (🚀 pour les
 * hausses, 📉 pour les baisses) sont un registre de réseau social, pas de donnée
 * de marché : aucun terminal ni aucune page de cotation professionnelle n'en pose
 * sur un panneau de cotation. Le titre suffit à identifier le panneau.
 */
export async function HighlightPanel({
  title,
  assets,
  hint,
  href,
  unavailableReason,
}: HighlightPanelProps) {
  const fr = await getContent()
  return (
    <section className="flex h-full flex-col rounded-card border border-border-subtle bg-surface p-4">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-ink">{title}</h2>
          {hint ? <p className="mt-0.5 text-[0.6875rem] text-ink-muted">{hint}</p> : null}
        </div>
        {href ? (
          <Link
            href={href}
            className="shrink-0 text-xs font-medium text-brand-strong hover:underline"
          >
            {fr.home.seeAll}
          </Link>
        ) : null}
      </div>

      {assets && assets.length > 0 ? (
        <ol className="flex-1 divide-y divide-border-subtle">
          {assets.slice(0, 5).map((asset, index) => (
            <li key={asset.id}>
              <Link
                href={assetHref(asset.assetClass, asset.id)}
                className="flex items-center gap-2 py-1.5 transition-opacity hover:opacity-75"
              >
                <span className="tabular w-3 shrink-0 text-[0.6875rem] text-ink-muted">
                  {index + 1}
                </span>
                <AssetLogo asset={asset} size={20} />
                <span className="min-w-0 flex-1 truncate text-xs font-medium text-ink">
                  {asset.name}
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
