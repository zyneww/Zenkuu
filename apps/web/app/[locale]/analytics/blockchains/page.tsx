import type { Metadata } from 'next'

import { getDefiChains } from '@zenkuu/data'
import { EmptyState } from '@zenkuu/ui'

import { AnalyticsShell } from '@/components/analytics/AnalyticsShell'
import { ChainsTable } from '@/components/analytics/ChainsTable'
import { getPhrase } from '@/lib/content'
import { pageAlternates } from '@/lib/site'

/**
 * LES CHAÎNES, CLASSÉES PAR CE QU'ELLES IMMOBILISENT.
 *
 * ⚠️ CE CLASSEMENT N'EST PAS CELUI DES CAPITALISATIONS, et la page le dit en toutes
 * lettres sous son titre. Une chaîne peut porter un jeton de faible capitalisation et
 * immobiliser des milliards, ou l'inverse : les deux mesures répondent à des questions
 * différentes — ce que le marché valorise, et ce que les gens y déposent. Le site a
 * déjà la première ; celle-ci apporte la seconde.
 *
 * Le rapprochement entre les deux est laissé au lecteur, par le lien vers la fiche du
 * jeton natif quand la source publie son identifiant.
 */
export const revalidate = 3_600

const TITLE = 'Blockchains'
const LEAD =
  'Les chaînes classées par valeur immobilisée dans leurs protocoles — ce que les gens y déposent, et non ce que leur jeton vaut.'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getPhrase()
  return {
    title: t(TITLE),
    description: t(LEAD),
    alternates: await pageAlternates('/analytics/blockchains'),
  }
}

export default async function Page() {
  const t = await getPhrase()
  const chains = await getDefiChains(100)

  return (
    <AnalyticsShell current="/analytics/blockchains" title={TITLE} lead={LEAD}>
      {chains.ok ? (
        <>
          <ChainsTable chains={chains.data} />
          <p className="text-micro text-ink-muted">
            {t(
              'Les cent premières chaînes par valeur immobilisée. La part est calculée sur ce total, pas sur l’ensemble des chaînes suivies par la source.',
            )}{' '}
            {t('Source : {source}').replace('{source}', 'DefiLlama')}
          </p>
        </>
      ) : (
        <EmptyState
          title={t('Classement des chaînes indisponible')}
          description={chains.reason}
          source={chains.source?.label ?? null}
          tone="warning"
        />
      )}
    </AnalyticsShell>
  )
}
