import type { Metadata } from 'next'

import { CACHE_TTL_SECONDS, getDerivatives } from '@zenkuu/data'
import { EmptyState, SourceNote } from '@zenkuu/ui'

import { DerivativesPanel } from '@/components/market/DerivativesPanel'
import { InstrumentTabs } from '@/components/market/InstrumentTabs'
import { getPhrase, getSeo } from '@/lib/content'

export const revalidate = 180
const _ttlGuard: typeof revalidate = CACHE_TTL_SECONDS
void _ttlGuard

export async function generateMetadata(): Promise<Metadata> {
  const t = await getPhrase()
  const seo = await getSeo()
  return {
    title: t('Dérivés'),
    description: seo(
      '/derives',
      'Les contrats perpétuels et à échéance les plus actifs, leur intérêt ouvert et leur taux de financement.',
    ),
    alternates: { canonical: '/derives' },
  }
}

/**
 * DÉRIVÉS — contrats perpétuels et à échéance.
 *
 * ── POURQUOI UNE ROUTE ET NON UN ONGLET ─────────────────────────────────────
 *
 * Cette vue vivait dans `/marches?vue=derives`, un onglet de la page « Parcourir ».
 * Cette page a été supprimée : ses classes d'actifs sont devenues six routes dédiées
 * et l'entrée dans le menu « Parcourir » de l'en-tête. Les dérivés suivent le même
 * mouvement, avec une raison de plus — ils ne sont PAS une classe d'actif.
 *
 * `AssetClass` compte sept valeurs, et « dérivés » n'en est pas une : un contrat
 * perpétuel n'est pas un actif qu'on détient, c'est un instrument adossé à un autre.
 * Il ne passe donc pas par `MarketPageView` et ne le pouvait pas : cette vue ne liste
 * pas des ACTIFS mais des CONTRATS, qui n'ont ni capitalisation, ni offre, ni fiche à
 * ouvrir. Tri, pagination et colonnes du classement n'auraient rien à trier.
 *
 * ⚠️ NE PAS CONFONDRE AVEC `/perpetuels`, qui liste les PLACES où ces contrats se
 * traitent — des plateformes, pas des instruments.
 */
export default async function Page() {
  const t = await getPhrase()
  const derivatives = await getDerivatives(100)

  return (
    <div className="space-y-5">
      {/* Même barre que `/places` et `/perpetuels` — voir la note de ce composant. */}
      <InstrumentTabs current="derives" />

      <header className="max-w-3xl space-y-3">
        <h1 className="display-xl text-ink">{t('Dérivés')}</h1>
        <p className="text-lg leading-relaxed text-ink-muted">
          {t(
            'Les contrats les plus actifs, leur intérêt ouvert et leur taux de financement. Un contrat perpétuel n’a pas d’échéance : son taux de financement est ce qui le raccroche au cours au comptant.',
          )}
        </p>
      </header>

      {derivatives.ok && derivatives.data.length > 0 ? (
        <>
          <DerivativesPanel markets={derivatives.data} />
          <SourceNote
            strings={{ source: t('Source :'), dated: t('données du {date}') }}
            label={`${derivatives.source.label} · montants en USD`}
            href={derivatives.source.attributionUrl}
          />
        </>
      ) : (
        <EmptyState
          title={t('Dérivés momentanément indisponibles')}
          description={derivatives.ok ? null : derivatives.reason}
          source={derivatives.source?.label ?? null}
          tone={derivatives.ok ? 'neutral' : 'warning'}
        />
      )}

      <p className="max-w-2xl text-xs leading-relaxed text-ink-muted">
        ZENKUU ne référence aucun carnet d’ordres et ne permet aucune transaction. Un
        produit dérivé porte un effet de levier : ce tableau situe l’exposition du
        marché, il n’y donne pas accès.
      </p>
    </div>
  )
}
