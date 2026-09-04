import type { Metadata } from 'next'

import { CACHE_TTL_SECONDS, getRanking, type MarketAsset } from '@zenkuu/data'
import { ChangeBadge } from '@/components/locale/ChangeBadge'

import { AssetLogo } from '@/components/asset/AssetLogo'
import { BUYBACK_FATE_LABEL, BUYBACK_PROGRAMS } from '@/content/buybacks'
import { Link } from '@/i18n/navigation'
import { assetHref } from '@/lib/asset-routes'
import { getPhrase, getSeo } from '@/lib/content'
import { pageAlternates } from '@/lib/site'
import { getFormatters } from '@/lib/formatters'

export const revalidate = 180
const _ttlGuard: typeof revalidate = CACHE_TTL_SECONDS
void _ttlGuard

export async function generateMetadata(): Promise<Metadata> {

  const t = await getPhrase()
  const seo = await getSeo()
  return {
    title: t('Rachats de jetons'),
    description: seo(
      '/rachats',
      'Les protocoles qui consacrent une part de leurs revenus à racheter leur propre jeton : ce qui finance le rachat, ce que devient le jeton racheté, et où le vérifier.',
    ),
    alternates: await pageAlternates('/rachats'),
  }
}

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * RACHATS — CE QUE LA PAGE DIT, ET CE QU'ELLE REFUSE DE DIRE
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Un programme de rachat est la promesse la plus vérifiable qu'un protocole puisse
 * faire — et la plus facile à mal lire. La page tient donc deux lignes de séparation.
 *
 * ── PREMIÈRE : CE QUI EST ANNONCÉ N'EST PAS CE QUI EST MESURÉ ───────────────
 *
 * Le registre (`content/buybacks.ts`) recense des programmes ANNONCÉS, avec leur
 * source. Les MONTANTS déployés, eux, demandent une lecture on-chain qu'aucune source
 * gratuite ne publie et que Zenkuu ne fait pas encore. Ils ne sont donc pas approchés,
 * pas estimés, pas déduits d'un chiffre voisin : la colonne est absente, et la page
 * l'annonce au lieu de le laisser deviner.
 *
 * ── SECONDE : UN RACHAT N'EST PAS UNE PROMESSE DE COURS ─────────────────────
 *
 * « Le protocole rachète » ne veut pas dire « le cours monte ». Un rachat retire de
 * l'offre du marché, ce qui est un fait ; ce que le cours en fait dépend de la
 * demande, qui n'est pas dans ce tableau. Le rappel est au pied de la page, et il
 * n'est pas une formule de politesse (§5).
 *
 * ── LES COLONNES DE MARCHÉ VIENNENT DU CLASSEMENT, EN UNE SEULE REQUÊTE ─────
 *
 * Sept `getAsset` auraient produit sept requêtes pour sept lignes. Le classement des
 * 250 premières capitalisations est déjà en cache pour le reste du site : on le lit et
 * on y cherche les identifiants du registre. Un jeton hors des 250 premiers n'est pas
 * un cas d'erreur — sa ligne s'affiche, ses colonnes de marché à « — ».
 */
export default async function Page() {
  const nombres = await getFormatters()

  const t = await getPhrase()

  const ranking = await getRanking({ assetClass: 'crypto', perPage: 250, currency: 'usd' })
  const bySlug = new Map<string, MarketAsset>(
    ranking.ok ? ranking.data.map((asset) => [asset.id, asset]) : [],
  )

  const rows = BUYBACK_PROGRAMS.map((program) => ({
    program,
    asset: bySlug.get(program.coingeckoId) ?? null,
  })).sort((a, b) => (b.asset?.marketCap ?? 0) - (a.asset?.marketCap ?? 0))

  const measured = rows.filter((row) => row.asset).length

  return (
    <div className="space-y-6">
      <header className="max-w-3xl space-y-3">
        <h1 className="display-xl text-ink">{t('Rachats de jetons')}</h1>
        <p className="text-lg leading-relaxed text-ink-muted">
          {t(
            'Les protocoles qui consacrent une part de leurs revenus à racheter leur propre jeton sur le marché. Ce tableau dit ce qui finance le rachat et ce que devient le jeton racheté — pas combien a été dépensé.',
          )}
        </p>
      </header>

      {/* ── L'AVERTISSEMENT EST EN TÊTE, PAS EN PIED ───────────────────────────
          Une page dont la colonne principale manque doit le dire AVANT le tableau.
          Placé après, le lecteur aurait déjà cherché le montant et conclu à un bug. */}
      <p className="rounded-card border border-border-subtle bg-surface px-4 py-3 text-sm leading-relaxed text-ink-muted">
        {t(
          'Zenkuu ne mesure pas encore les flux de rachat. Les montants déployés, leur cadence et la part de l’offre retirée demandent une lecture on-chain qui n’est pas branchée : ces colonnes sont absentes plutôt qu’estimées. Chaque ligne renvoie à la documentation du programme, qui fait foi.',
        )}
      </p>

      <div className="overflow-x-auto rounded-card border border-border-subtle bg-surface">
        <table className="w-full min-w-[860px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border-subtle bg-surface-muted/40 text-left text-xs text-ink-muted">
              <th scope="col" className="px-4 py-2.5 font-semibold">{t('Protocole')}</th>
              <th scope="col" className="px-4 py-2.5 text-right font-semibold">{t('Cours')}</th>
              <th scope="col" className="px-4 py-2.5 text-right font-semibold">{t('24 h')}</th>
              <th scope="col" className="px-4 py-2.5 text-right font-semibold">{t('Capitalisation')}</th>
              <th scope="col" className="px-4 py-2.5 font-semibold">{t('Financé par')}</th>
              <th scope="col" className="px-4 py-2.5 font-semibold">{t('Jeton racheté')}</th>
              <th scope="col" className="px-4 py-2.5 text-right font-semibold">{t('Depuis')}</th>
              <th scope="col" className="px-4 py-2.5 text-right font-semibold">{t('Source')}</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-border-subtle">
            {rows.map(({ program, asset }) => (
              <tr key={program.coingeckoId} className="transition-colors hover:bg-surface-muted/40">
                <th scope="row" className="px-4 py-3 text-left font-normal">
                  <span className="flex items-center gap-2.5">
                    {asset ? <AssetLogo asset={asset} size={22} /> : null}
                    <span className="min-w-0">
                      {asset ? (
                        <Link
                          href={assetHref('crypto', asset.id)}
                          className="block truncate font-semibold text-ink hover:text-brand"
                        >
                          {program.name}
                        </Link>
                      ) : (
                        <span className="block truncate font-semibold text-ink">{program.name}</span>
                      )}
                      <span className="block text-xs uppercase text-ink-muted">{program.symbol}</span>
                    </span>
                  </span>
                </th>

                <td className="tabular px-4 py-3 text-right text-ink">
                  {asset ? nombres.currency(asset.price, 'USD') : <Absent />}
                </td>
                <td className="px-4 py-3 text-right">
                  {asset?.change24h === undefined ? <Absent /> : <ChangeBadge value={asset.change24h} size="sm" />}
                </td>
                <td className="tabular px-4 py-3 text-right text-ink-muted">
                  {asset?.marketCap === undefined ? (
                    <Absent />
                  ) : (
                    nombres.currency(asset.marketCap, 'USD', { compact: true })
                  )}
                </td>

                <td className="px-4 py-3 text-ink-muted">{t(program.funding)}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-pill px-2 py-0.5 text-xs font-medium ${
                      program.fate === 'burn'
                        ? 'bg-down-soft text-down'
                        : 'bg-surface-muted text-ink-muted'
                    }`}
                  >
                    {t(BUYBACK_FATE_LABEL[program.fate])}
                  </span>
                </td>
                <td className="tabular px-4 py-3 text-right text-ink-muted">{program.since}</td>
                <td className="px-4 py-3 text-right">
                  <a
                    href={program.source}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-ink hover:underline"
                  >
                    {t('Vérifier')}
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs leading-relaxed text-ink-muted">
        {measured} / {rows.length}{' '}
        {t(
          'programmes situés dans les 250 premières capitalisations, d’où viennent les colonnes de marché. Un jeton au-delà garde sa ligne, sans cours ni capitalisation.',
        )}
      </p>

      <p className="max-w-2xl text-xs leading-relaxed text-ink-muted">
        {t(
          'Un rachat retire de l’offre du marché : c’est un fait. Ce que le cours en fait dépend de la demande, qui n’est pas dans ce tableau. Cette page ne constitue ni un conseil, ni une recommandation d’achat ou de vente.',
        )}
      </p>
    </div>
  )
}

/** Valeur absente — un tiret cadratin, jamais un zéro (§5). */
function Absent() {
  return <span className="text-ink-muted/60">—</span>
}
