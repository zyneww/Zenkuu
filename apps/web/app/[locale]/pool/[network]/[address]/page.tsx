import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { getPool, getPoolsOnNetwork } from '@zenkuu/data'
import { ChangeBadge, EmptyState, SourceNote, formatCompact } from '@zenkuu/ui'

import { Link } from '@/i18n/navigation'
import { DexPoolTable } from '@/components/market/DexPoolTable'
import { Panel } from '@/components/ui/Panel'
import { getPhrase } from '@/lib/content'

/**
 * Une minute, alignée sur le TTL de la source on-chain.
 *
 * Toutes les autres pages du site régénèrent à 180 s. Celle-ci descend à 60 pour la
 * raison qui fait descendre le cache de données au même chiffre : un pool bouge à
 * chaque bloc, et la page affiche des variations à cinq minutes. Une page régénérée
 * plus lentement que sa donnée sert un chiffre périmé sous une étiquette « 5 min »,
 * ce qui est faux et pas seulement tiède.
 */
export const revalidate = 60

interface RouteParams {
  params: Promise<{ network: string; address: string }>
}

export async function generateMetadata({ params }: RouteParams): Promise<Metadata> {
  const { network, address } = await params
  const pool = await getPool(network, address)

  if (!pool.ok) return { title: 'Pool introuvable' }

  return {
    title: `${pool.data.name} · pool ${network}`,
    description:
      `Réserve, volume et transactions du pool ${pool.data.name} sur ${network}. ` +
      'Lecture seule, sans exécution d’ordres.',
    alternates: { canonical: `/pool/${network}/${address}` },
  }
}

/**
 * FICHE D'UN POOL DE LIQUIDITÉ.
 *
 * ── CE QU'ELLE REPREND À LA RÉFÉRENCE, ET CE QU'ELLE ÉCARTE ──────────────────
 *
 * Structure de GeckoTerminal : l'identité de la paire en tête avec son prix, une
 * grille de mesures, les variations par fenêtre, le compte des transactions, puis les
 * autres endroits où le même jeton s'échange.
 *
 * Ce qui est écarté est aussi délibéré que ce qui est repris : leur page porte un
 * module d'échange, un connecteur de portefeuille et un bouton « Trade ». Le §1 pose
 * que ce site observe et n'exécute rien. La fiche s'arrête donc à la mesure — et le
 * dit, plutôt que de laisser croire à un oubli.
 *
 * ── LA GRILLE DE VARIATIONS EST LE CŒUR DE LA PAGE ───────────────────────────
 *
 * Six fenêtres de cinq minutes à vingt-quatre heures, alignées. C'est ce qu'on vient
 * chercher sur un pool : non pas « combien vaut ce jeton » — le prix est partout —
 * mais « à quelle vitesse cela bouge, et depuis quand ». Un site de cotation
 * classique s'arrête à 24 h ; sur la chaîne, cinq minutes est une éternité.
 */
export default async function Page({ params }: RouteParams) {
  const t = await getPhrase()
  const { network, address } = await params
  const pool = await getPool(network, address)

  // Un pool inexistant est un 404 franc, pas un encadré d'erreur : l'adresse vient de
  // l'URL, elle est saisissable à la main, et rien ne justifie de garder l'URL dans
  // l'index d'un moteur de recherche.
  if (!pool.ok && pool.kind === 'notFound') notFound()

  if (!pool.ok) {
    return (
      <EmptyState
        title="Pool indisponible"
        description={pool.reason}
        source={pool.source?.label ?? null}
        tone="warning"
      />
    )
  }

  const data = pool.data

  /*
   * Les autres pools du MÊME jeton de base — le « où se négocie » de la chaîne.
   *
   * Chargé seulement si la source a nommé le jeton de base : sans son adresse, la
   * requête partirait sur `undefined` et ramènerait un 404 qu'on afficherait comme
   * une panne.
   */
  const siblings = data.baseTokenAddress
    ? await getPoolsOnNetwork(network, data.baseTokenAddress)
    : null

  const others = siblings?.ok ? siblings.data.filter((entry) => entry.address !== data.address) : []

  return (
    <div className="space-y-5">
      <nav aria-label={t('Fil d’Ariane')} className="text-xs text-ink-muted">
        <Link href="/graphiques" className="transition-colors hover:text-ink">{t('Graphiques globaux')}</Link>
        <span className="mx-1.5">/</span>
        <span className="uppercase">{network}</span>
        <span className="mx-1.5">/</span>
        <span className="text-ink">{data.name}</span>
      </nav>

      <header className="space-y-2">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-ink">{data.name}</h1>
          {data.dex ? (
            <span className="rounded-control bg-surface-muted px-2 py-0.5 text-xs text-ink-muted">
              {data.dex}
            </span>
          ) : null}
          {data.feePercent !== undefined ? (
            <span className="rounded-control bg-surface-muted px-2 py-0.5 text-xs text-ink-muted">
              {data.feePercent.toString().replace('.', ',')} % de frais
            </span>
          ) : null}
        </div>

        <div className="flex flex-wrap items-baseline gap-3">
          <span className="figure text-3xl font-semibold text-ink">
            {data.priceUsd !== undefined
              ? new Intl.NumberFormat('fr-FR', {
                  style: 'currency',
                  currency: 'USD',
                  maximumFractionDigits: data.priceUsd >= 1 ? 2 : 8,
                }).format(data.priceUsd)
              : '—'}
          </span>
          <ChangeBadge value={data.priceChange?.['h24']} />
        </div>

        {/* Annoncé, et non sous-entendu. Un lecteur venu de la page de référence
            cherchera le module d'échange : mieux vaut lui dire qu'il n'existe pas que
            de le laisser le chercher. */}
        <p className="text-xs text-ink-muted">
          Adresse du pool <code className="text-[0.6875rem]">{data.address}</code> · lecture seule,
          aucun ordre ne part d’ici.
        </p>
      </header>

      {/* ── MESURES ─────────────────────────────────────────────────────────── */}
      <Panel title={t('Mesures du pool')}>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
          <Measure label={t('Réserve')} value={data.liquidityUsd} />
          <Measure label="Volume 24 h" value={data.volume24hUsd} />
          <Measure label="Capitalisation" value={data.marketCapUsd} />
          <Measure label={t('Valorisation diluée')} value={data.fdvUsd} />
        </dl>
      </Panel>

      {/* ── VARIATIONS ──────────────────────────────────────────────────────── */}
      {data.priceChange ? (
        <Panel
          title={t('Variation par fenêtre')}
          subtitle={t('Un site de cotation s’arrête à 24 h ; sur la chaîne, cinq minutes comptent.')}
        >
          <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-card border border-border-subtle bg-border-subtle sm:grid-cols-6">
            {(['m5', 'm15', 'm30', 'h1', 'h6', 'h24'] as const).map((window) => (
              <div key={window} className="bg-surface px-3 py-2 text-center">
                <dt className="text-[0.6875rem] uppercase text-ink-muted">{WINDOW_LABEL[window]}</dt>
                <dd className="mt-0.5">
                  <ChangeBadge value={data.priceChange?.[window]} size="sm" />
                </dd>
              </div>
            ))}
          </dl>
        </Panel>
      ) : null}

      {/* ── TRANSACTIONS ────────────────────────────────────────────────────── */}
      {data.trades24h ? (
        <Panel
          title={t('Transactions sur 24 h')}
          subtitle={t('Le nombre d’adresses distinctes est plus difficile à gonfler que celui des transactions : combien de mains, et non combien de gestes.')}
        >
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
            <Count label="Achats" value={data.trades24h.buys} tone="up" />
            <Count label="Ventes" value={data.trades24h.sells} tone="down" />
            <Count label="Acheteurs distincts" value={data.trades24h.buyers} tone="up" />
            <Count label="Vendeurs distincts" value={data.trades24h.sellers} tone="down" />
          </dl>
        </Panel>
      ) : null}

      {/* ── OÙ CE JETON SE NÉGOCIE AUSSI ────────────────────────────────────── */}
      {others.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-ink">
            Où ce jeton se négocie aussi, sur {network}
          </h2>
          <p className="text-xs text-ink-muted">{t('Les autres pools du même jeton de base, du plus profond au moins profond.')}</p>
          <DexPoolTable pools={others.slice(0, 12)} />
        </section>
      ) : null}

      <SourceNote label={pool.source.label} href={pool.source.attributionUrl} strings={{ source: t('Source :'), dated: t('données du {date}') }} />
    </div>
  )
}

const WINDOW_LABEL: Record<string, string> = {
  m5: '5 min',
  m15: '15 min',
  m30: '30 min',
  h1: '1 h',
  h6: '6 h',
  h24: '24 h',
}

async function Measure({ label, value }: { label: string; value?: number }) {
  return (
    <div>
      <dt className="text-xs text-ink-muted">{label}</dt>
      <dd className="tabular mt-0.5 text-base font-medium text-ink">
        {value !== undefined ? `${formatCompact(value)} $` : '—'}
      </dd>
    </div>
  )
}

async function Count({ label, value, tone }: { label: string; value: number; tone: 'up' | 'down' }) {
  return (
    <div>
      <dt className="text-xs text-ink-muted">{label}</dt>
      <dd
        className={`tabular mt-0.5 text-base font-medium ${tone === 'up' ? 'text-up' : 'text-down'}`}
      >
        {new Intl.NumberFormat('fr-FR').format(value)}
      </dd>
    </div>
  )
}
