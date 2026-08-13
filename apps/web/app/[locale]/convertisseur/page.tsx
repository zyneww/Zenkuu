import type { Metadata } from 'next'
import { Link } from '@/i18n/navigation'

import {
  CACHE_TTL_SECONDS,
  SUPPORTED_CURRENCIES,
  getExchangeRates,
  getMoversUniverse,
  type MarketAsset,
} from '@zenkuu/data'
import { EmptyState, SourceNote } from '@zenkuu/ui'

import { AssetLogo } from '@/components/asset/AssetLogo'
import { ConverterView } from '@/components/tools/ConverterView'
import { assetHref } from '@/lib/asset-routes'

export const revalidate = 180
const _ttlGuard: typeof revalidate = CACHE_TTL_SECONDS
void _ttlGuard

export const metadata: Metadata = {
  title: 'Convertisseur',
  description:
    'Convertir un montant entre une cryptomonnaie, une action, un ETF, un indice ou une matière première et cinq devises, au dernier cours reçu.',
  alternates: { canonical: '/convertisseur' },
}

/**
 * Convertisseur — CRYPTOMONNAIES SEULEMENT.
 *
 * ── POURQUOI LES QUATRE AUTRES CLASSES SONT PARTIES ───────────────────────────
 *
 * La page couvrait aussi actions, ETF, indices et matières premières. Ce n'était pas
 * une erreur de conception, c'était une extension gratuite : leurs classements étaient
 * déjà en cache. Elle est retirée pour deux raisons qui se renforcent.
 *
 * D'ABORD LE SENS. « Convertir 3 actions Total en dollars » n'est pas une conversion,
 * c'est une valorisation — et le mot « convertisseur » promet la première. Un indice
 * est encore plus douteux : le CAC 40 n'est pas une quantité qu'on détient, multiplier
 * sa valeur par un montant ne produit rien de nommable.
 *
 * ENSUITE LE COÛT. Ces quatre classes coûtaient quatre appels `getRanking` par rendu.
 * Ils étaient certes partagés avec les pages de classement — mais uniquement si
 * quelqu'un les avait ouvertes récemment. Sur un cache froid, chez Yahoo, un classement
 * se construit SYMBOLE PAR SYMBOLE : quatre-vingts requêtes sortantes derrière un
 * limiteur de débit, pour alimenter un menu déroulant dont trois entrées sur quatre
 * n'avaient pas de sens.
 *
 * Reste ce que la page fait bien, et ce que demande la référence (okx.com/fr-fr/convert,
 * qui s'intitule d'ailleurs « convertisseur et calculateur de CRYPTOS ») : un montant,
 * une cryptomonnaie, une devise.
 */
export default async function ConverterPage() {
  const [crypto, rates] = await Promise.all([getMoversUniverse(250, 'eur'), getExchangeRates()])

  const assets: MarketAsset[] = crypto.ok ? crypto.data.filter((asset) => asset.price > 0) : []

  return (
    <div className="space-y-8">
      <header className="max-w-3xl space-y-3">
        <h1 className="display-xl text-ink">Convertisseur et calculateur de cryptos</h1>
        <p className="text-lg leading-relaxed text-ink-muted">
          Convertir un montant entre {assets.length} cryptomonnaies et {SUPPORTED_CURRENCIES.length}{' '}
          devises, au dernier cours reçu. Aucun compte n’est nécessaire, et rien ne
          s’exécute : c’est un calcul, pas une offre.
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

          {/*
            ── TAUX RAPIDES ──────────────────────────────────────────────

            Repris de la référence, et ce n'est pas de la garniture. Le convertisseur
            est un OUTIL : il exige qu'on choisisse, qu'on tape, qu'on lise. Or la
            requête qui amène le plus de monde sur ce genre de page — « combien vaut
            un bitcoin en euros » — a une réponse unique, qui ne mérite aucun
            formulaire. Ces vingt pastilles la donnent d'un coup d'œil.

            Elles ont un second effet, celui-là pour les moteurs de recherche : elles
            mettent vingt réponses chiffrées dans le HTML SERVI, là où le convertisseur
            lui-même est un îlot client qui n'existe qu'après hydratation. Une page
            d'outil sans contenu servi n'est indexable sur aucune de ses réponses.

            Chaque pastille mène à la FICHE de l'actif et non à une pré-sélection du
            convertisseur : quelqu'un qui clique sur « BTC en EUR » a déjà sa réponse,
            ce qu'il cherche ensuite est le contexte.
          */}
          <section className="space-y-3 border-t border-border-subtle pt-6">
            <h2 className="text-sm font-semibold text-ink">
              Les vingt premières cryptomonnaies en euros
            </h2>

            <ul className="flex flex-wrap gap-2">
              {assets.slice(0, 20).map((asset) => (
                <li key={asset.id}>
                  <Link
                    href={assetHref(asset.assetClass, asset.id)}
                    className="flex items-center gap-2 rounded-pill border border-border-subtle px-3 py-1.5 text-xs transition-colors duration-150 hover:border-brand"
                  >
                    <AssetLogo asset={asset} size={18} />
                    <span className="font-medium text-ink">
                      {asset.symbol.toUpperCase()} en EUR
                    </span>
                    <span className="tabular text-ink-muted">
                      {new Intl.NumberFormat('fr-FR', {
                        style: 'currency',
                        currency: 'EUR',
                        maximumFractionDigits: asset.price >= 1 ? 2 : 6,
                      }).format(asset.price)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
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
          ZENKUU n’exécute aucune transaction et ne détient aucun fonds. Le résultat est
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
