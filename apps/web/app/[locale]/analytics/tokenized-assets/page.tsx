import type { Metadata } from 'next'

import { getDefiProtocols } from '@zenkuu/data'
import { EmptyState } from '@zenkuu/ui'

import { AnalyticsShell } from '@/components/analytics/AnalyticsShell'
import { ProtocolsTable } from '@/components/analytics/ProtocolsTable'
import { Link } from '@/i18n/navigation'
import { getPhrase } from '@/lib/content'
import { pageAlternates } from '@/lib/site'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * ACTIFS TOKENISÉS — LES PROTOCOLES QUE LA SOURCE RANGE EN « RWA »
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Bons du Trésor, fonds monétaires, crédit privé, immobilier : des actifs du monde
 * réel dont la propriété est représentée par un jeton. Cent cinquante-huit protocoles
 * au relevé du 2026-09-05, dominés par des fonds d'émetteurs institutionnels.
 *
 * ── L'ÉTIQUETTE EST CELLE DE LA SOURCE, ET C'EST IMPORTANT ─────────────────
 *
 * `RWA` est une catégorie que DefiLlama attribue. Nous ne la recalculons pas et nous
 * n'en ajoutons ni n'en retirons aucun protocole : décider nous-mêmes ce qui est un
 * « actif du monde réel » demanderait une définition que personne ne nous a donnée, et
 * la frontière est discutable — un stablecoin adossé à des bons du Trésor en est-il
 * un ? La source tranche, nous citons son verdict.
 *
 * ── CE QUE CETTE PAGE NE DOUBLE PAS ────────────────────────────────────────
 *
 * ⚠️ `/graphiques/actifs-reels` existe déjà, et ce n'est PAS la même chose : cette
 * page-là trace la capitalisation agrégée du secteur telle que CoinGecko la publie,
 * en une courbe. Celle-ci liste les protocoles un par un avec ce qu'ils immobilisent.
 * Une courbe et un annuaire, sur deux sources différentes. Le renvoi entre les deux
 * est explicite en pied de page, parce qu'un lecteur qui arrive sur l'un cherche
 * souvent l'autre.
 */
export const revalidate = 3_600

const TITLE = 'Tokenized assets'
const LEAD =
  'Les protocoles qui portent des actifs du monde réel — bons du Trésor, fonds monétaires, crédit privé — classés par valeur immobilisée.'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getPhrase()
  return {
    title: t(TITLE),
    description: t(LEAD),
    alternates: await pageAlternates('/analytics/tokenized-assets'),
  }
}

export default async function Page() {
  const t = await getPhrase()

  /* `'RWA'` est écrit tel quel : c'est la valeur littérale du champ `category` chez la
     source, et la traduire ou la normaliser reviendrait à ne plus rien trouver. */
  const protocols = await getDefiProtocols(150, 'RWA')

  return (
    <AnalyticsShell current="/analytics/tokenized-assets" title={TITLE} lead={LEAD}>
      {protocols.ok ? (
        <>
          {/* `showCategory` est faux : tous ces protocoles portent la même étiquette, et
              la colonne écrirait « RWA » sur chaque ligne. */}
          <ProtocolsTable protocols={protocols.data} />

          <p className="max-w-3xl text-micro leading-snug text-ink-muted">
            {t(
              'La catégorie « RWA » est attribuée par la source ; ZENKUU ne l’élargit ni ne la restreint. Pour la capitalisation agrégée du secteur en courbe, voir',
            )}{' '}
            <Link href="/graphiques/actifs-reels" className="text-ink hover:underline">
              {t('les actifs du monde réel')}
            </Link>
            {'. '}
            {t('Source : {source}').replace('{source}', 'DefiLlama')}
          </p>
        </>
      ) : (
        <EmptyState
          title={t('Liste des actifs tokenisés indisponible')}
          description={protocols.reason}
          source={protocols.source?.label ?? null}
          tone="warning"
        />
      )}
    </AnalyticsShell>
  )
}
