import { getAllTokenizedStocks } from '@zenkuu/data'
import { EmptyState, SourceNote, formatCurrency } from '@zenkuu/ui'

import { StatCard } from '@/components/charts/StatCard'
import { TokenizedStocksTable } from '@/components/market/TokenizedStocksTable'
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

      <TokenizedStocksTable tokens={listed} />

      <p className="max-w-3xl text-xs leading-relaxed text-ink-muted">
        <strong className="text-ink">{t('Une famille, pas toutes.')}</strong>{' '}
        {t(
          'Cette page couvre les actions tokenisées, seule catégorie d’actifs du monde réel que notre source publie en tant que telle. Les bons du Trésor, l’immobilier et le crédit privé tokenisés existent, mais aucun agrégat gratuit ne les recense — ils ne sont donc pas affichés plutôt que d’être estimés.',
        )}{' '}
        {t('Émetteurs identifiés :')} {issuers.size > 0 ? [...issuers].join(', ') : '—'}.
      </p>

      <SourceNote
        strings={{ source: t('Source :'), dated: t('données du {date}') }}
        label={t('{source} · montants en USD').replace('{source}', `${tokens.source.label}`)}
        href={tokens.source.attributionUrl}
      />
    </div>
  )
}
