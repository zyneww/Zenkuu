import type { Metadata } from 'next'

import {
  CACHE_TTL_SECONDS,
  MOVERS_PERIODS,
  MOVERS_UNIVERSES,
  getMoversUniverse,
  rankMovers,
  type MoversPeriod,
  type MoversUniverse,
} from '@zenith/data'
import { Card, CardHeader, EmptyState, SourceNote } from '@zenith/ui'

import { AssetList } from '@/components/AssetList'
import { MoversFilters } from '@/components/market/MoversFilters'
import { fr } from '@/content/fr'
import { PERIOD_LABELS, UNIVERSE_LABELS } from '@/content/movers'

export const revalidate = 300
const _ttlGuard: typeof revalidate = CACHE_TTL_SECONDS
void _ttlGuard

export const metadata: Metadata = {
  title: fr.pages.movers,
  description:
    'Les plus fortes hausses et baisses du marché crypto, sur la période et l’univers de capitalisation de votre choix.',
  alternates: { canonical: '/crypto/mouvements' },
}

/** Lecture défensive : ces paramètres sont saisissables à la main dans l'URL. */
function readPeriod(raw: string | string[] | undefined): MoversPeriod {
  const value = Array.isArray(raw) ? raw[0] : raw
  return MOVERS_PERIODS.includes(value as MoversPeriod) ? (value as MoversPeriod) : '24h'
}

function readUniverse(raw: string | string[] | undefined): MoversUniverse {
  const value = Number(Array.isArray(raw) ? raw[0] : raw)
  return MOVERS_UNIVERSES.includes(value as MoversUniverse) ? (value as MoversUniverse) : 100
}

export default async function MoversPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const period = readPeriod(params['periode'])
  const universe = readUniverse(params['univers'])

  // Un seul appel alimente les deux colonnes : hausses et baisses sont les deux
  // extrémités d'un même classement. Le changement de PÉRIODE ne recharge rien —
  // la source publie toutes les fenêtres dans la même réponse.
  const result = await getMoversUniverse(universe, 'eur')

  const ranked = result.ok ? rankMovers(result.data, period, 15) : null
  const usable = ranked ? ranked.gainers.length : 0

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-ink">{fr.pages.movers}</h1>
          <p className="max-w-3xl text-sm leading-relaxed text-ink-muted">
            Classement sur <strong className="text-ink">{PERIOD_LABELS[period]}</strong>, parmi les{' '}
            <strong className="text-ink">{UNIVERSE_LABELS[universe].toLowerCase()}</strong>{' '}
            capitalisations — un périmètre volontairement borné, pour que le classement
            reflète le marché plutôt qu’un jeton illiquide.
          </p>
        </div>

        <MoversFilters
          period={period}
          universe={universe}
          periods={MOVERS_PERIODS}
          universes={MOVERS_UNIVERSES}
        />
      </header>

      {result.ok && ranked && usable > 0 ? (
        <>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Card>
              <CardHeader title={fr.home.gainersTitle} />
              <AssetList assets={ranked.gainers} changeField={ranked.field} changeLabel={`sur ${PERIOD_LABELS[period]}`} />
            </Card>
            <Card>
              <CardHeader title={fr.home.losersTitle} />
              <AssetList assets={ranked.losers} changeField={ranked.field} changeLabel={`sur ${PERIOD_LABELS[period]}`} />
            </Card>
          </div>

          <SourceNote
            label={result.source.label}
            href={result.source.attributionUrl}
            updatedAt={ranked.gainers[0]?.lastUpdated}
          />
        </>
      ) : (
        <EmptyState
          title={fr.states.unavailableTitle}
          // Distinguer les deux causes : une source en panne et une période que la
          // source ne publie pas n'appellent pas la même réaction du lecteur (§5).
          description={
            result.ok
              ? `La source ne publie pas de variation sur ${PERIOD_LABELS[period]} pour cet univers.`
              : result.reason
          }
          source={result.source?.label ?? null}
          tone={result.ok ? 'neutral' : 'warning'}
        />
      )}
    </div>
  )
}
