import type { Metadata } from 'next'
import Link from 'next/link'

import {
  CACHE_TTL_SECONDS,
  SUPPORTED_CURRENCIES,
  getExchangeRates,
  getForexRates,
  getMoversUniverse,
  getRanking,
  type MarketAsset,
} from '@zenith/data'
import { EmptyState, SourceNote } from '@zenith/ui'

import { ConverterView } from '@/components/tools/ConverterView'

export const revalidate = 300
const _ttlGuard: typeof revalidate = CACHE_TTL_SECONDS
void _ttlGuard

export const metadata: Metadata = {
  title: 'Convertisseur',
  description:
    'Convertir un montant entre une cryptomonnaie, une action, un ETF, un indice ou une matière première et cinq devises, au dernier cours reçu.',
  alternates: { canonical: '/convertisseur' },
}

/**
 * Convertisseur.
 *
 * L'entrée existait au menu depuis le début, marquée « bientôt ». Elle ne coûtait en
 * réalité AUCUN appel supplémentaire : les cours des 250 premières cryptomonnaies et
 * les taux BCE sont déjà chargés et mis en cache pour d'autres pages. Le convertisseur
 * n'est qu'une lecture de plus de la même donnée.
 *
 * Les classes traditionnelles sont ajoutées à l'univers pour la même raison — leur
 * classement est déjà en cache. Une entrée de menu inerte pendant des semaines coûtait
 * donc plus cher, en confiance, que la page elle-même.
 */
export default async function ConverterPage() {
  /*
   * ⚠️ `perPage: 20` N'EST PAS UN NOMBRE ARBITRAIRE — c'est celui des pages de
   * classement (`/actions`, `/etf`, `/indices`, `/matieres-premieres`).
   *
   * La clé de cache d'un classement inclut sa taille de page. Demander 30 lignes
   * plutôt que 20 ouvrirait donc une SECONDE entrée de cache pour la même donnée, et
   * chez Yahoo un classement se construit symbole par symbole : une requête sortante
   * par ligne. La première version de cette page en déclenchait jusqu'à quatre-vingt-dix
   * sur un cache froid, derrière un limiteur de débit — la page mettait plus d'une
   * minute à répondre. Alignées, ces quatre requêtes sont déjà en cache dès qu'un
   * visiteur a ouvert l'une des pages de classement, et ne coûtent rien de plus.
   */
  const [crypto, forex, stocks, etf, indices, commodities, rates] = await Promise.all([
    getMoversUniverse(250, 'eur'),
    getForexRates(),
    getRanking({ assetClass: 'stock', currency: 'eur', perPage: 20 }),
    getRanking({ assetClass: 'etf', currency: 'eur', perPage: 20 }),
    getRanking({ assetClass: 'index', currency: 'eur', perPage: 20 }),
    getRanking({ assetClass: 'commodity', currency: 'eur', perPage: 20 }),
    getExchangeRates(),
  ])

  // Les paires de devises sont ÉCARTÉES de l'univers : « 1 EUR/USD en dollars » n'a
  // pas de sens, un taux n'est pas un actif qu'on convertit. Elles restent lisibles
  // sur leur propre page.
  void forex

  const assets: MarketAsset[] = [crypto, stocks, etf, indices, commodities]
    .filter((result) => result.ok)
    .flatMap((result) => (result.ok ? result.data : []))
    .filter((asset) => asset.price > 0)

  return (
    <div className="space-y-8">
      <header className="max-w-3xl space-y-3">
        <h1 className="display-xl text-ink">Convertisseur</h1>
        <p className="text-lg leading-relaxed text-ink-muted">
          Convertir un montant entre {assets.length} actifs suivis et cinq devises, au
          dernier cours reçu de chaque source.
        </p>
      </header>

      {assets.length > 0 ? (
        <>
          <ConverterView
            assets={assets}
            rates={rates.ok ? rates.data : null}
            currencies={SUPPORTED_CURRENCIES}
          />

          <SourceNote
            label={crypto.ok ? crypto.source.label : ''}
            href={crypto.ok ? crypto.source.attributionUrl : '#'}
            updatedAt={assets[0]?.lastUpdated}
          />
        </>
      ) : (
        <EmptyState
          title="Cours indisponibles"
          description={crypto.ok ? null : crypto.reason}
          tone="warning"
        />
      )}

      <section className="max-w-2xl space-y-2 border-t border-border-subtle pt-6">
        <h2 className="text-sm font-semibold text-ink">Ce que cet outil ne fait pas</h2>
        <p className="text-sm leading-relaxed text-ink-muted">
          ZENITH n’exécute aucune transaction et ne détient aucun fonds. Le résultat est
          un calcul à partir d’un cours publié — pas un prix qui vous serait proposé, ni
          un taux auquel un intermédiaire s’engagerait. Les frais, écarts et délais
          d’exécution d’une transaction réelle n’y figurent pas.
        </p>
        <p className="text-sm text-ink-muted">
          Voir aussi les{' '}
          <Link href="/devises" className="text-brand hover:underline">
            taux de référence BCE
          </Link>{' '}
          et la{' '}
          <Link href="/methodologie" className="text-brand hover:underline">
            méthodologie
          </Link>
          .
        </p>
      </section>
    </div>
  )
}
