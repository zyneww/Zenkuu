import { getNftCollections } from '@zenkuu/data'
import { EmptyState, SourceNote } from '@zenkuu/ui'

import { NftCollectionGrid } from '@/components/market/NftCollectionGrid'
import { NftOverview } from '@/components/market/NftOverview'
import { getPhrase } from '@/lib/content'

export async function NftSection() {
  const t = await getPhrase()
  const collections = await getNftCollections()

  if (!collections.ok) {
    return (
      <EmptyState
        title={t('Collections indisponibles')}
        description={collections.reason}
        source={collections.source?.label ?? null}
        tone="warning"
      />
    )
  }

  return (
    <div className="space-y-8">
      {/* La vue d'ensemble AVANT la grille : dix vignettes triées ne disent pas que la
          première pèse plus que les cinq suivantes réunies, et c'est la première chose
          à savoir sur ce marché. Aucun appel supplémentaire — même réponse. */}
      <NftOverview collections={collections.data} />

      <NftCollectionGrid collections={collections.data} />

      {/*
        L'AVERTISSEMENT N'EST PAS UNE FORMULE DE PRUDENCE.

        Une grille ordonnée par capitalisation ressemble exactement à un classement.
        Le lecteur qui la prendrait pour tel en conclurait que rien n'existe hors de
        ces dix collections — alors que la vraie raison de leur présence est qu'elles
        sont les seules que nous interrogeons nommément, l'endpoint de classement étant
        réservé à l'offre payante.
      */}
      <p className="max-w-3xl text-xs leading-relaxed text-ink-muted">
        <strong className="text-ink">{t('Sélection, et non classement.')}</strong>
        {t(
          'La source réserve son classement des collections à son offre payante ; seule la fiche d’une collection nommée est gratuite. Cette liste est donc arrêtée à la main sur des collections de référence, et l’ordre d’affichage n’est qu’un tri par capitalisation — d’autres collections plus grandes peuvent exister sans figurer ici.',
        )}
      </p>

      <SourceNote
        strings={{ source: t('Source :'), dated: t('données du {date}') }}
        label={t('{source} · montants en USD').replace('{source}', `${collections.source.label}`)}
        href={collections.source.attributionUrl}
      />
    </div>
  )
}
