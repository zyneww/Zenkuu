import { getAllTokenizedStocks, type TokenizedStock } from '@zenkuu/data'
import { EmptyState, SourceNote, formatCurrency } from '@zenkuu/ui'

import { StatCard } from '@/components/charts/StatCard'
import { Link } from '@/i18n/navigation'
import { getPhrase } from '@/lib/content'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * ACTIFS DU MONDE RÉEL — LES ACTIONS TOKENISÉES
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── CE QUE CETTE PAGE COUVRE, ET CE QU'ELLE NE COUVRE PAS ──────────────────
 *
 * « Actifs du monde réel » désigne, chez la référence, tout ce qui représente sur
 * chaîne un actif hors chaîne : actions, bons du Trésor, immobilier, matières
 * premières, crédit privé. Nos sources n'en publient QU'UNE catégorie — les actions
 * tokenisées, via `category=tokenized-stock`.
 *
 * La page couvre donc celle-là, et le dit. Annoncer « actifs du monde réel » en
 * n'affichant que des actions serait un titre qui promet plus que la table ne tient ;
 * afficher des sections vides pour les autres familles serait pire (§5).
 *
 * ── L'ÉMETTEUR EST LU, PAS DEVINÉ ──────────────────────────────────────────
 *
 * CoinGecko écrit l'émetteur dans le nom du jeton — « NVIDIA (Ondo Tokenized
 * Stock) », « NVIDIA xStock ». La colonne l'en extrait. Un nom qui ne correspond à
 * aucun motif connu laisse la cellule vide plutôt que de proposer un émetteur
 * plausible.
 *
 * ⚠️ LA CHAÎNE D'ÉMISSION EST ABSENTE, et c'est un manque assumé : `/coins/markets`
 * ne publie pas `platforms`, et l'obtenir demanderait un appel par jeton.
 */
export async function RealWorldAssetsSection() {
  const t = await getPhrase()
  const tokens = await getAllTokenizedStocks()

  if (!tokens.ok || tokens.data.length === 0) {
    return (
      <EmptyState
        title={t('Catalogue indisponible')}
        description={tokens.ok ? null : tokens.reason}
        source={tokens.source?.label ?? null}
        tone={tokens.ok ? 'neutral' : 'warning'}
      />
    )
  }

  const listed = tokens.data
  const totalCap = listed.reduce((sum, token) => sum + (token.marketCapUsd ?? 0), 0)
  const totalVolume = listed.reduce((sum, token) => sum + (token.volume24hUsd ?? 0), 0)
  const issuers = new Set(listed.map((token) => token.issuer).filter(Boolean))

  return (
    <div className="space-y-8">
      {/* ── LA BANDE PASSE SUR `StatCard`, COMME LES AUTRES PAGES ──────────────

          Elle était une `<dl>` maison : trois cases séparées par un filet d'un pixel,
          avec sa propre taille de valeur et son propre intitulé. Correcte en soi, et
          différente de la bande de `/graphiques` à deux clics de là — deux grammaires
          pour un même objet, sur deux pages de la même barre latérale.

          `StatCard` porte le motif relevé chez ASXN (voir son en-tête) : intitulé
          discret, grande valeur, variations colorées. Les trois chiffres ne changent
          pas — ce sont les mêmes sommes, calculées au-dessus.

          Aucune variation ici : la source publie une capitalisation et un volume par
          jeton, jamais leur évolution. Une variation cumulée serait un calcul maison
          présenté comme une donnée (§5). `StatCard` prévoit leur absence. */}
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label={t('Jetons cotés')} value={String(listed.length)} />
        <StatCard
          label={t('Capitalisation cumulée')}
          value={formatCurrency(totalCap, 'USD', { compact: true }) ?? '—'}
        />
        <StatCard
          label={t('Volume 24 h cumulé')}
          value={formatCurrency(totalVolume, 'USD', { compact: true }) ?? '—'}
        />
      </div>

      <TokenTable tokens={listed} />

      <p className="max-w-3xl text-xs leading-relaxed text-ink-muted">
        <strong className="text-ink">{t('Une famille, pas toutes.')}</strong>{' '}
        {t(
          'Cette page couvre les actions tokenisées, seule catégorie d’actifs du monde réel que notre source publie en tant que telle. Les bons du Trésor, l’immobilier et le crédit privé tokenisés existent, mais aucun agrégat gratuit ne les recense — ils ne sont donc pas affichés plutôt que d’être estimés.',
        )}{' '}
        {t('Émetteurs identifiés :')} {issuers.size > 0 ? [...issuers].join(', ') : '—'}.
      </p>

      <SourceNote
        strings={{ source: t('Source :'), dated: t('données du {date}') }}
        label={`${tokens.source.label} · montants en USD`}
        href={tokens.source.attributionUrl}
      />
    </div>
  )
}

async function TokenTable({ tokens }: { tokens: TokenizedStock[] }) {
  const t = await getPhrase()

  return (
    /* Sans cadre ni filets, comme le tableau des catégories : sur une grille de
       nombres cadrés à droite, la structure se lit dans les chiffres. */
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm sm:min-w-[640px]">
        <caption className="sr-only">{t('Actions tokenisées')}</caption>
        <thead>
          <tr className="border-b border-border-subtle text-left text-[length:var(--v2-text-2xs)] font-semibold text-ink-muted">
            <th scope="col" className="hidden px-3 py-2.5 font-medium sm:table-cell">
              #
            </th>
            <th scope="col" className="px-3 py-2.5 font-medium">
              {t('Jeton')}
            </th>
            <th scope="col" className="hidden px-3 py-2.5 font-medium md:table-cell">
              {t('Émetteur')}
            </th>
            <th scope="col" className="px-3 py-2.5 text-right font-medium">
              {t('Prix')}
            </th>
            <th scope="col" className="hidden px-3 py-2.5 text-right font-medium lg:table-cell">
              {t('Volume 24 h')}
            </th>
            <th scope="col" className="px-3 py-2.5 text-right font-medium">
              {t('Capitalisation')}
            </th>
          </tr>
        </thead>
        <tbody>
          {tokens.map((token, index) => (
            <tr key={token.id} className="transition-colors hover:bg-surface-muted/60">
              <td className="tabular hidden px-3 py-2.5 text-xs text-ink-muted sm:table-cell">
                {index + 1}
              </td>
              <th scope="row" className="px-3 py-2.5 text-left font-medium">
                <span className="flex items-center gap-2">
                  {token.image ? (
                    // eslint-disable-next-line @next/next/no-img-element -- logos distants
                    <img
                      src={token.image}
                      alt=""
                      aria-hidden="true"
                      loading="lazy"
                      width={20}
                      height={20}
                      className="h-5 w-5 rounded-pill border border-surface bg-surface-muted object-contain"
                    />
                  ) : null}
                  <Link
                    href={`/crypto/${token.id}`}
                    className="inline-flex items-center text-ink transition-colors hover:text-brand hover:underline"
                  >
                    {token.name}
                  </Link>
                  <span className="text-xs uppercase text-ink-muted">{token.symbol}</span>
                </span>
              </th>
              <td className="hidden px-3 py-2.5 text-ink-muted md:table-cell">
                {token.issuer ?? '—'}
              </td>
              <td className="tabular px-3 py-2.5 text-right text-ink">
                {formatCurrency(token.priceUsd, 'USD') ?? '—'}
              </td>
              <td className="tabular hidden px-3 py-2.5 text-right text-ink-muted lg:table-cell">
                {formatCurrency(token.volume24hUsd, 'USD', { compact: true }) ?? '—'}
              </td>
              <td className="tabular px-3 py-2.5 text-right text-ink">
                {formatCurrency(token.marketCapUsd, 'USD', { compact: true }) ?? '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
