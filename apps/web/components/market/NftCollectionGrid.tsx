import { getPhrase } from '@/lib/content'
import type { NftCollection } from '@zenkuu/data'
import { ChangeBadge, formatCompact } from '@zenkuu/ui'

/**
 * Collections NFT suivies — une SÉLECTION, jamais un classement.
 *
 * ── LE TITRE DE LA SECTION DIT « SÉLECTION », ET C'EST OBLIGATOIRE ───────────
 *
 * L'endpoint qui classe les collections par volume est réservé à l'offre payante ;
 * seule la fiche d'une collection nommée est gratuite. Cette grille est donc une
 * liste arrêtée à la main, pas un palmarès. Le dire n'est pas une précaution de
 * style : une grille ordonnée par capitalisation ressemble EXACTEMENT à un
 * classement, et un lecteur qui la prendrait pour tel en conclurait que rien
 * n'existe en dehors de ces dix collections.
 *
 * ── DEUX MONNAIES, PARCE QUE LE MARCHÉ EN UTILISE DEUX ───────────────────────
 *
 * Un prix plancher NFT se cite en ETH — c'est l'unité dans laquelle il se négocie et
 * dont les acheteurs parlent — mais se compare en dollars. On affiche les deux, la
 * native en tête, parce que convertir seul ferait perdre le chiffre que tout le
 * monde retient.
 */
export async function NftCollectionGrid({ collections }: { collections: NftCollection[] }) {
  const t = await getPhrase()
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {collections.map((collection) => (
        <article
          key={collection.id}
          className="flex flex-col gap-3 rounded-card border border-border-subtle bg-surface p-4"
        >
          <div className="flex items-center gap-3">
            {collection.image ? (
              // eslint-disable-next-line @next/next/no-img-element -- vignettes 32px hors domaines optimisés
              <img
                src={collection.image}
                alt=""
                width={32}
                height={32}
                className="shrink-0 rounded-control"
                loading="lazy"
              />
            ) : (
              <span
                className="h-8 w-8 shrink-0 rounded-control bg-surface-muted"
                aria-hidden="true"
              />
            )}

            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-ink">
                {collection.name}
              </span>
              <span className="block truncate text-[0.6875rem] text-ink-muted">
                {collection.symbol ?? '—'}
                {collection.totalSupply
                  ? ` · ${formatCompact(collection.totalSupply)} pièces`
                  : ''}
              </span>
            </span>
          </div>

          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
            <div>
              <dt className="text-ink-muted">{t('Prix plancher')}</dt>
              <dd className="tabular mt-0.5 font-medium text-ink">
                {collection.floorPriceNative !== undefined
                  ? `${collection.floorPriceNative.toFixed(2).replace('.', ',')} ${collection.nativeSymbol ?? ''}`
                  : '—'}
              </dd>
              {collection.floorPriceUsd !== undefined ? (
                <dd className="tabular text-[0.6875rem] text-ink-muted">
                  {formatCompact(collection.floorPriceUsd)} $
                </dd>
              ) : null}
            </div>

            <div>
              <dt className="text-ink-muted">{t('Plancher 24 h')}</dt>
              <dd className="mt-0.5">
                <ChangeBadge value={collection.floorChange24h} size="sm" />
              </dd>
            </div>

            <div>
              <dt className="text-ink-muted">{t('Capitalisation')}</dt>
              <dd className="tabular mt-0.5 text-ink">
                {collection.marketCapUsd !== undefined
                  ? `${formatCompact(collection.marketCapUsd)} $`
                  : '—'}
              </dd>
            </div>

            <div>
              <dt className="text-ink-muted">{t('Volume 24 h')}</dt>
              {/* Un volume à ZÉRO est affiché comme tel, et non remplacé par un tiret :
                  une collection sans vente sur vingt-quatre heures est une information,
                  pas une donnée manquante. */}
              <dd className="tabular mt-0.5 text-ink">
                {collection.volume24hUsd !== undefined
                  ? `${formatCompact(collection.volume24hUsd)} $`
                  : '—'}
              </dd>
            </div>
          </dl>
        </article>
      ))}
    </div>
  )
}
