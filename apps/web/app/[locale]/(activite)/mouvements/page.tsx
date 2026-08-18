import type { Metadata } from 'next'

import {
  CACHE_TTL_SECONDS,
  MOVERS_PERIODS,
  MOVERS_UNIVERSES,
  getCryptoGlobalStats,
  getDerivatives,
  getMoversUniverse,
  getSpotExchanges,
  rankMovers,
  type MoversPeriod,
  type MoversUniverse,
} from '@zenkuu/data'
import { Card, CardHeader, EmptyState, SourceNote } from '@zenkuu/ui'

import { AssetList } from '@/components/AssetList'
import { DerivativesPanel } from '@/components/market/DerivativesPanel'
import { MacroBand } from '@/components/market/MacroBand'
import { RankingDetailLink } from '@/components/market/RankingDetailLink'
import { MoversFilters } from '@/components/market/MoversFilters'
import { SpotExchangesPanel } from '@/components/market/SpotExchangesPanel'
import { getContent, getPhrase, getSeo } from '@/lib/content'
import { PERIOD_LABELS, UNIVERSE_LABELS } from '@/content/movers'

export const revalidate = 180
const _ttlGuard: typeof revalidate = CACHE_TTL_SECONDS
void _ttlGuard

/**
 * Métadonnées DÉRIVÉES DE LA LANGUE, d'où la fonction plutôt que la constante.
 *
 * Un `export const metadata` est évalué une fois au chargement du module : il ne
 * peut pas connaître la locale de la requête, et servait donc un titre français sur
 * les pages traduites. `generateMetadata` est appelée par requête.
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getPhrase()
  const seo = await getSeo()

  return {
    title: t('Données de trading'),
    description: seo(
      '/mouvements',
      'Vue macro, places au comptant, produits dérivés et classements de variation du marché crypto : capitalisation, dominance, volumes par plateforme, intérêt ouvert, taux de financement, plus fortes hausses et baisses.',
    ),
    alternates: { canonical: '/mouvements' },
  }
}

/**
 * Données de trading.
 *
 * La page ne se limite plus aux classements de variation : elle ouvre sur une vue
 * MACRO (capitalisation, volume, dominance), montre OÙ le marché s'échange
 * (répartition du volume au comptant entre les places), enchaîne sur les produits
 * DÉRIVÉS (intérêt ouvert, taux de financement) puis conserve les palmarès filtrables.
 *
 * L'ordre suit une seule question, de plus en plus précise : combien s'échange-t-il,
 * où, sur quels contrats, et sur quels actifs.
 *
 * Trois modules de la référence sont absents et le resteront tant qu'aucune source
 * gratuite ne les publie : flux d'ETF Bitcoin, calendrier économique et ratio
 * long/short. Aucun n'est remplacé par une approximation (§5) — l'espace revient aux
 * dérivés, qui sont, eux, réellement sourcés.
 *
 * Disposition différente de la référence, qui empile un grand graphique macro, une
 * colonne « calendrier » à droite, puis des blocs de graphiques. Ici : bandes
 * horizontales pleine largeur, du plus général au plus précis — macro, dérivés,
 * palmarès. Aucun rail latéral, puisque le calendrier qui l'occupait n'existe pas.
 */

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
  const t = await getPhrase()
  const fr = await getContent()
  const params = await searchParams
  const period = readPeriod(params['periode'])
  const universe = readUniverse(params['univers'])

  // Les trois requêtes partent ENSEMBLE : séquentielles, leurs latences
  // s'additionneraient. Chacune peut échouer seule — sa bande disparaît alors sans
  // emporter le reste de la page.
  const [result, globalStats, derivatives, exchanges] = await Promise.all([
    // Un seul appel alimente les deux colonnes de palmarès : hausses et baisses sont
    // les deux extrémités d'un même classement. Le changement de PÉRIODE ne recharge
    // rien — la source publie toutes les fenêtres dans la même réponse.
    getMoversUniverse(universe, 'eur'),
    getCryptoGlobalStats('eur'),
    getDerivatives(60),
    // TTL d'une heure côté données : cette quatrième requête ne repart donc pas à
    // chaque régénération de la page, contrairement aux trois autres.
    getSpotExchanges(25),
  ])

  const ranked = result.ok ? rankMovers(result.data, period, 15) : null
  const usable = ranked ? ranked.gainers.length : 0

  return (
    <div className="space-y-12 sm:space-y-16">
      <header className="max-w-3xl space-y-3">
        <h1 className="display-xl text-ink">{t("Données de trading")}</h1>
        <p className="text-lg leading-relaxed text-ink-muted">{t("L’activité du marché crypto en quatre plans : les agrégats mondiaux, la répartition du volume entre les places, l’exposition sur les produits dérivés, puis les mouvements de la période.")}</p>
      </header>

      {globalStats.ok ? <MacroBand stats={globalStats.data} /> : null}

      {exchanges.ok && exchanges.data.length > 0 ? (
        <>
          <SpotExchangesPanel exchanges={exchanges.data} />
          <SourceNote label={exchanges.source.label} href={exchanges.source.attributionUrl} />
        </>
      ) : null}

      {derivatives.ok ? <DerivativesPanel markets={derivatives.data} /> : null}

      <section className="space-y-5" aria-labelledby="mouvements-titre">
        <div className="space-y-3">
          <div className="space-y-1">
            <h2 id="mouvements-titre" className="display-md text-ink">
              {fr.pages.movers}
            </h2>
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
        </div>

      {result.ok && ranked && usable > 0 ? (
        <>
          {/*
            ── « VOIR EN DÉTAIL » DANS L'EN-TÊTE DE CHAQUE PALMARÈS ───────────────

            Quinze lignes suffisent à voir CE QUI BOUGE ; elles ne suffisent pas à
            chercher un actif précis ni à voir où s'arrête la hausse. Le lien mène au
            classement complet, paginé, et emporte la période choisie — arriver sur
            « 24 h » après avoir consulté « 7 j » ferait perdre le réglage au moment
            précis où l'on veut aller plus loin.

            `CardHeader` accepte une `action` : c'est exactement l'emplacement prévu
            pour un contrôle secondaire, et il évite d'inventer une rangée de plus.
          */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Card>
              <CardHeader
                title={fr.home.gainersTitle}
                action={<RankingDetailLink type="hausses" period={period} />}
              />
              <AssetList assets={ranked.gainers} changeField={ranked.field} changeLabel={`sur ${PERIOD_LABELS[period]}`} />
            </Card>
            <Card>
              <CardHeader
                title={fr.home.losersTitle}
                action={<RankingDetailLink type="baisses" period={period} />}
              />
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
      </section>

      {derivatives.ok ? (
        <SourceNote
          label={`${derivatives.source.label} · dérivés en USD`}
          href={derivatives.source.attributionUrl}
        />
      ) : null}
    </div>
  )
}
