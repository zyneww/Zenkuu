import type { Metadata } from 'next'

import { getYieldPools } from '@zenkuu/data'
import { EmptyState } from '@zenkuu/ui'

import { AnalyticsShell } from '@/components/analytics/AnalyticsShell'
import { PoolsTable } from '@/components/analytics/PoolsTable'
import { getPhrase } from '@/lib/content'
import { pageAlternates } from '@/lib/site'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * RENDEMENTS — CE QUE LES POOLS ONT PAYÉ, PAS CE QU'ILS PAIERONT
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * C'est la page la plus exposée du site au §5, et le cadre est donc explicite en tête
 * de page plutôt qu'en note de bas.
 *
 * ── TROIS PRÉCAUTIONS, ET AUCUNE N'EST DÉCORATIVE ──────────────────────────
 *
 * 1. LE PLANCHER DE TAILLE. Dix millions de dollars. La source publie dix-sept mille
 *    pools, dont l'immense majorité pèse quelques milliers : sur cette taille, une
 *    distribution ponctuelle de récompenses produit un taux annualisé à quatre
 *    chiffres qui n'aura plus cours la semaine suivante. Les inclure remplirait le
 *    haut de n'importe quel tri par taux de nombres spectaculaires et faux.
 *
 * 2. LE TRI PAR DÉFAUT EST LA TAILLE. Ouvrir sur le taux décroissant ferait de cette
 *    page un palmarès du rendement, donc une recommandation implicite. La taille dit
 *    où l'argent est réellement placé — un constat.
 *
 * 3. LA MOYENNE À TRENTE JOURS EST AFFICHÉE À CÔTÉ DU TAUX DU JOUR. C'est elle qui dit
 *    si le second est représentatif, et c'est la seule colonne qui empêche de lire un
 *    pic ponctuel comme un rendement.
 *
 * ZENKUU ne classe pas, ne recommande pas et n'annonce aucun gain.
 */
export const revalidate = 3_600

const TITLE = 'APY'
const LEAD =
  'Les rendements constatés sur les pools de finance décentralisée. Un taux annualisé depuis le rendement récent d’un pool n’engage personne et peut tomber le lendemain.'

/** Voir la précaution n° 1 de l'en-tête. La page annonce ce seuil au lecteur. */
const PLANCHER_USD = 10_000_000

export async function generateMetadata(): Promise<Metadata> {
  const t = await getPhrase()
  return {
    title: t(TITLE),
    description: t(LEAD),
    alternates: await pageAlternates('/analytics/apy'),
  }
}

export default async function Page() {
  const t = await getPhrase()
  const pools = await getYieldPools(200, PLANCHER_USD)

  return (
    <AnalyticsShell current="/analytics/apy" title={TITLE} lead={LEAD}>
      {/* L'avertissement est EN TÊTE et non en pied : une page dont les nombres se
          lisent de travers sans leur cadre doit poser le cadre avant les nombres.
          C'est le même parti que la page des rachats de jetons. */}
      <p className="rounded-card border border-border-subtle bg-surface px-4 py-3 text-sm leading-relaxed text-ink-muted">
        {t(
          'Ces taux sont des CONSTATS, pas des promesses : la source annualise le rendement récent de chaque pool. La colonne « Moyenne 30 j » est là pour dire si le taux du jour est représentatif — un écart important entre les deux signale une distribution ponctuelle, pas un rendement. ZENKUU ne classe ni ne recommande aucun placement.',
        )}
      </p>

      {pools.ok ? (
        <>
          <PoolsTable pools={pools.data} />
          <p className="text-micro text-ink-muted">
            {t(
              'Deux cents pools au plus, tous au-dessus de {seuil} de valeur immobilisée : en dessous, quelques centaines de dollars de récompenses suffisent à produire un taux annualisé à quatre chiffres qui ne veut rien dire.',
            ).replace('{seuil}', '10 M$')}{' '}
            {t('Source : {source}').replace('{source}', 'DefiLlama')}
          </p>
        </>
      ) : (
        <EmptyState
          title={t('Liste des rendements indisponible')}
          description={pools.reason}
          source={pools.source?.label ?? null}
          tone="warning"
        />
      )}
    </AnalyticsShell>
  )
}
