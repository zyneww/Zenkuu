import { getRanking, type AssetClass, type MarketAsset } from '@zenkuu/data'
import { EmptyState } from '@zenkuu/ui'

import { AssetRow } from '@/components/home/AssetRow'
import { Link } from '@/i18n/navigation'
import { marketHref } from '@/lib/asset-routes'
import { getContent, getPhrase } from '@/lib/content'

/**
 * Les trois classes retenues, DANS L'ORDRE DE LECTURE.
 *
 * Pas les sept. Les actions et les ETF comptent des milliers de lignes dont aucune
 * n'est « la » ligne à montrer — un top 4 y serait le top 4 de l'univers que Yahoo a
 * bien voulu renvoyer, pas un repère. Les NFT n'ont aucune source déclarée (§5).
 *
 * Ces trois-là, au contraire, ont un petit nombre de valeurs canoniques : quelques
 * indices de référence, quelques paires majeures, quelques matières premières. Un top 4
 * y est effectivement le haut du tableau, et non un échantillon.
 */
const CLASSES: readonly AssetClass[] = ['index', 'forex', 'commodity']

/** Lignes par colonne. Quatre : la hauteur d'un panneau de la grille au-dessus. */
const ROWS = 4

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * HORS CRYPTO — LA BANDE QUE LA RÉFÉRENCE N'A PAS
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── POURQUOI ELLE EXISTE ────────────────────────────────────────────────────
 *
 * Tout ce qui précède sur cette page est de la crypto, et c'est assumé : c'est la
 * classe qui ouvre le site et celle dont les sources sont les plus riches. Une page
 * d'accueil qui s'arrêterait là ferait de Zenkuu un clone de CoinGecko de plus, alors
 * que le multi-actifs est le seul argument que la référence ne peut pas reprendre.
 *
 * Elle REMPLACE la carte « Euro / dollar » du résumé de marché supprimé, qui portait
 * la même intention dans le tiers d'une rangée : une paire de devises, quatre matières
 * premières, et rien des indices. Trois colonnes de quatre lignes disent la même chose
 * plus complètement et pour le même encombrement.
 *
 * ── UNE COLONNE QUI ÉCHOUE DISPARAÎT, LES DEUX AUTRES RESTENT ──────────────
 *
 * Les trois classements viennent de deux fournisseurs distincts — Yahoo pour les
 * indices et les matières premières, la BCE pour les devises. Une panne de l'un ne
 * doit pas emporter l'autre, et une colonne d'états vides ne dit rien : elle se rabat
 * donc sur la phrase du fournisseur, à l'intérieur de son propre cadre.
 */
export async function CrossAssetPanel() {
  const fr = await getContent()
  const t = await getPhrase()

  /* Quatre lignes demandées et non quinze : ces classements ne servent qu'ici, et le
     paquet de la page transporte chaque ligne jusqu'au navigateur. `MarketAsset` porte
     une courbe et une dizaine de champs — en demander quinze pour en montrer quatre
     multiplierait par presque quatre le poids de ce bloc. */
  const results = await Promise.all(
    CLASSES.map((assetClass) =>
      getRanking({ assetClass, page: 1, perPage: ROWS, currency: 'eur' }),
    ),
  )

  return (
    <section className="flex flex-col gap-3" aria-label={t('Les autres marchés')}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-normal text-ink-muted">{t('Les autres marchés')}</h2>
        <Link
          href="/crypto"
          className="shrink-0 text-sm text-brand transition-colors hover:text-brand-strong"
        >
          {fr.home.seeAll} <span aria-hidden="true">→</span>
        </Link>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {CLASSES.map((assetClass, index) => {
          const result = results[index]
          const assets: MarketAsset[] = result?.ok ? result.data.slice(0, ROWS) : []

          return (
            <section
              key={assetClass}
              className="flex h-full flex-col rounded-card border border-border-subtle bg-surface p-4"
            >
              <div className="mb-2 flex items-start justify-between gap-3">
                <h3 className="text-sm font-semibold text-ink">{fr.assetClass[assetClass]}</h3>
                <Link
                  href={marketHref(assetClass)}
                  prefetch={false}
                  className="shrink-0 text-xs font-medium text-brand-strong hover:underline"
                >
                  {fr.home.seeAll}
                </Link>
              </div>

              {assets.length > 0 ? (
                <ul className="flex-1 divide-y divide-border-subtle">
                  {assets.map((asset) => (
                    <li key={asset.id}>
                      {/* Sans `rank` : ces colonnes ne sont pas des palmarès mais des
                          relevés — « voici où en sont les indices », pas « voici les
                          quatre premiers ». Une numérotation y ferait croire à un
                          classement par performance. */}
                      <AssetRow asset={asset} />
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState
                  title={fr.states.unavailableTitle}
                  description={result && !result.ok ? result.reason : null}
                  compact
                />
              )}
            </section>
          )
        })}
      </div>
    </section>
  )
}
