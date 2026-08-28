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
import { getPhrase, getSeo } from '@/lib/content'

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
    title: t('Convertisseur'),
    description: seo(
      '/convertisseur',
      'Convertir un montant entre une cryptomonnaie, une action, un ETF, un indice ou une matière première et cinq devises, au dernier cours reçu.',
    ),
    alternates: { canonical: '/convertisseur' },
  }
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
  const t = await getPhrase()
  const [crypto, rates] = await Promise.all([getMoversUniverse(250, 'eur'), getExchangeRates()])

  const assets: MarketAsset[] = crypto.ok ? crypto.data.filter((asset) => asset.price > 0) : []

  return (
    <div className="space-y-8">
      {/* ── L'EN-TÊTE SE RESSERRE ────────────────────────────────────────────

          Il portait un titre en `display-xl` au-dessus d'un paragraphe en `text-lg` :
          près de cent soixante pixels avant le premier champ, sur une page dont tout
          l'objet tient dans une carte de trois cases.

          La référence (CoinGecko) tient sur deux lignes — un titre de la taille d'un
          titre de section, une phrase de la taille du texte courant — et le
          convertisseur commence immédiatement. C'est ce que « reproduire la
          simplicité » veut dire ici : ce n'est pas la carte qui était compliquée,
          c'est ce qu'on empilait autour. */}
      <header className="max-w-3xl space-y-2">
        <h1 className="display-sm text-ink">Convertisseur et calculateur de cryptos</h1>
        <p className="text-sm leading-relaxed text-ink-muted">
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
            strings={{ source: t('Source :'), dated: t('données du {date}') }}
            label={crypto.ok ? crypto.source.label : ''}
            href={crypto.ok ? crypto.source.attributionUrl : '#'}
            updatedAt={assets[0]?.lastUpdated}
          />

          {/*
            ── COURS DE RÉFÉRENCE, EN TABLEAU ────────────────────────────────────

            Ce bloc remplace une grille de pastilles « BTC en EUR · 55 139 € » reprise
            telle quelle de la référence. Sa raison d'être ne change pas et reste
            bonne : le convertisseur est un ÎLOT CLIENT, absent du HTML servi, et une
            page d'outil sans contenu servi n'est indexable sur aucune de ses réponses.
            Ces dix lignes portent donc le référencement, et répondent d'un coup d'œil
            à « combien vaut un bitcoin en euros » — la requête qui amène le plus de
            monde ici, et qui ne mérite aucun formulaire.

            Ce qui change est la FORME. Une rangée de pastilles arrondies est leur
            grammaire ; la nôtre est le tableau dense, aligné, à chiffres tabulaires —
            celui de toutes les pages de cotation du site. Une même information dans
            deux grammaires différentes sur le même site coûte plus qu'elle ne rapporte.

            Chaque ligne mène à la FICHE et non à une pré-sélection du convertisseur :
            qui clique a déjà sa réponse, ce qu'il cherche ensuite est le contexte.
          */}
          <section className="max-w-xl space-y-2 border-t border-border-subtle pt-6">
            <h2 className="text-sm font-semibold text-ink">Cours de référence en euros</h2>

            <div className="overflow-hidden rounded-card border border-border-subtle">
              <ul className="divide-y divide-border-subtle">
                {assets.slice(0, 10).map((asset) => (
                  <li key={asset.id}>
                    <Link
                      href={assetHref(asset.assetClass, asset.id)}
                      className="group flex items-center gap-3 px-3 py-2 transition-colors duration-150 hover:bg-surface-muted"
                    >
                      <AssetLogo asset={asset} size={20} />
                      <span className="min-w-0 flex-1 truncate text-sm text-ink group-hover:text-brand-strong">
                        {asset.name}
                        <span className="ml-1.5 text-xs uppercase text-ink-muted">
                          {asset.symbol}
                        </span>
                      </span>
                      <span className="tabular shrink-0 text-sm text-ink">
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
            </div>
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
          </Link>
          .
        </p>
      </section>
    </div>
  )
}
