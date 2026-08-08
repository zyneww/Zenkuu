import type { Metadata } from 'next'

import { CACHE_TTL_SECONDS, getCryptoOverview } from '@zenith/data'
import { EmptyState, SourceNote } from '@zenith/ui'

import { AssetList } from '@/components/AssetList'
import { Card, CardHeader } from '@zenith/ui'
import { fr } from '@/content/fr'

export const revalidate = 300
const _ttlGuard: typeof revalidate = CACHE_TTL_SECONDS
void _ttlGuard

export const metadata: Metadata = {
  title: fr.pages.movers,
  description: 'Les plus fortes hausses et baisses du marché crypto sur 24 heures.',
}

export default async function MoversPage() {
  // Un seul appel alimente les deux colonnes : hausses et baisses sont deux
  // extrémités du même classement (cf. `getCryptoOverview`).
  const overview = await getCryptoOverview('eur', 15)

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-ink">{fr.pages.movers}</h1>
        <p className="text-sm text-ink-muted">
          {overview.ok
            ? `${fr.home.moversHint(overview.data.universeSize)} — un périmètre volontairement borné, pour que le classement reflète le marché plutôt qu’un jeton illiquide.`
            : 'Classement des plus fortes variations sur 24 heures.'}
        </p>
      </header>

      {overview.ok ? (
        <>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Card>
              <CardHeader title={fr.home.gainersTitle} />
              <AssetList assets={overview.data.gainers} />
            </Card>
            <Card>
              <CardHeader title={fr.home.losersTitle} />
              <AssetList assets={overview.data.losers} />
            </Card>
          </div>
          <SourceNote
            label={overview.source.label}
            href={overview.source.attributionUrl}
            updatedAt={overview.data.gainers[0]?.lastUpdated}
          />
        </>
      ) : (
        <EmptyState
          title={fr.states.unavailableTitle}
          description={overview.reason}
          source={overview.source?.label ?? null}
        />
      )}
    </div>
  )
}
