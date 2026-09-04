import type { Metadata } from 'next'
import { Suspense } from 'react'

import {
  CACHE_TTL_SECONDS,
  getBondFundScreen,
  getEtfScreen,
  getMoversUniverse,
  getPoolUniverse,
  getSpotExchanges,
  getStockScreen,
  type DataResult,
} from '@zenkuu/data'
import { EmptyState, SourceNote } from '@zenkuu/ui'

import { Link } from '@/i18n/navigation'
import { ScreenerView } from '@/components/tools/ScreenerView'
import {
  readMarket,
  rowsFromCrypto,
  rowsFromExchanges,
  rowsFromPools,
  rowsFromYahoo,
  SCREENER_MARKETS,
  type ScreenerMarket,
  type ScreenerRow,
} from '@/components/tools/screener-markets'
import { getPhrase } from '@/lib/content'
import { emphasise, weave } from '@/components/locale/emphasise'

export const revalidate = 180
const _ttlGuard: typeof revalidate = CACHE_TTL_SECONDS
void _ttlGuard

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}): Promise<Metadata> {
  const t = await getPhrase()
  const market = readMarket((await searchParams)['marche'])

  return {
    title: t(market.title),
    description: t(market.lead),
    /*
     * UN SEUL CANONIQUE POUR LES SIX ONGLETS.
     *
     * Ils partagent leur contenu de tête, leurs commandes et leur explication : ce
     * sont six vues d'un même outil, pas six pages. Les déclarer distinctes ferait
     * indexer six adresses au contenu très proche, ce qui dilue plutôt qu'il n'ajoute
     * (§9). Le paramètre reste dans l'URL, partageable — il n'est simplement pas
     * revendiqué comme une page à part.
     */
    alternates: { canonical: '/screener' },
  }
}

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * SCREENER — six marchés, un seul outil
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── UN SEUL MARCHÉ EST CHARGÉ PAR VISITE ─────────────────────────────────────
 *
 * Le choix passe par l'URL (`?marche=`) et non par un état React, ce qui permet de ne
 * demander aux sources QUE la population regardée. Charger les six d'avance coûterait
 * une quinzaine de requêtes sortantes pour cinq populations que la plupart des
 * visiteurs ne regarderont pas — et rendrait la page impartageable sur son onglet.
 *
 * ── CHAQUE PÉRIMÈTRE EST BORNÉ, ET CHAQUE BORNE EST ÉCRITE ───────────────────
 *
 * C'est la règle la plus importante de cette page. « Aucune ligne ne satisfait ces
 * critères » n'a pas le même sens selon l'ensemble examiné, et un screener qui laisse
 * croire qu'il balaie un marché entier alors qu'il en voit une tranche ment sur son
 * résultat (§5). Chaque onglet porte donc sa borne sous le tableau, avec sa raison.
 */
export default async function ScreenerPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const t = await getPhrase()
  const market = readMarket((await searchParams)['marche'])

  return (
    <div className="space-y-6">
      <header className="max-w-3xl space-y-3">
        <h1 className="display-xl text-ink">{t('Screener')}</h1>
        <p className="text-lg leading-relaxed text-ink-muted">{t(market.lead)}</p>
      </header>

      {/* ── Les six marchés ──────────────────────────────────────────────────

          De vrais LIENS et non des boutons : le choix vit dans l'URL, ce qui le rend
          partageable, navigable au bouton « retour », et surtout permet de ne charger
          qu'une population par visite. Une bascule React aurait demandé les six. */}
      <nav
        aria-label={t('Marché examiné')}
        className="flex flex-wrap items-center gap-1 border-b border-border-subtle"
      >
        {SCREENER_MARKETS.map((entry) => (
          <Link
            key={entry.id}
            href={{ pathname: '/screener', query: { marche: entry.id } }}
            aria-current={entry.id === market.id ? 'page' : undefined}
            className={`-mb-px border-b-2 px-3 pb-2 pt-1 text-sm font-medium transition-colors duration-150 ${
              entry.id === market.id
                ? 'border-brand text-ink'
                : 'border-transparent text-ink-muted hover:text-ink'
            }`}
          >
            {t(entry.label)}
          </Link>
        ))}
      </nav>

      {/*
        ── LES POPULATIONS LENTES SONT MISES EN FLUX ──────────────────────────

        Les trois marchés boursiers coûtent chacun deux à huit requêtes sur un endpoint
        non officiel, et les pools cinq requêtes sur une API publique sans clé. Sur un
        cache froid, la réponse se compte en secondes.

        Ce qui est réductible n'est pas cette durée mais l'ATTENTE AVANT LE PREMIER
        PIXEL : sans `Suspense`, le serveur retient la page entière jusqu'au dernier
        appel, et le lecteur regarde un écran blanc sans titre ni onglets. Avec,
        l'en-tête et la barre de marchés partent immédiatement.
      */}
      <Suspense key={market.id} fallback={<LoadingNote market={market} />}>
        <MarketSection market={market} />
      </Suspense>

      <Scope market={market} />
    </div>
  )
}

async function LoadingNote({ market }: { market: ScreenerMarket }) {
  const t = await getPhrase()
  return (
    <p className="rounded-card border border-border-subtle bg-surface px-4 py-6 text-sm text-ink-muted">
      {t('Lecture de la population « {market} »…').replace('{market}', t(market.label))}
      <span className="block pt-1 text-xs">{t('Ces sources se demandent par tranches et limitent les appels gratuits : le premier chargement peut prendre quelques secondes. Les suivants sont servis depuis le cache.')}</span>
    </p>
  )
}

/**
 * Charge la population du marché demandé, et rien d'autre.
 *
 * L'aiguillage porte les APPELS et pas seulement l'affichage : un composant non rendu
 * n'est jamais invoqué, et c'est ce qui garantit qu'ouvrir l'onglet crypto ne réveille
 * pas les six sources.
 */
async function MarketSection({ market }: { market: ScreenerMarket }) {
  const t = await getPhrase()
  const loaded = await load(market)

  if (!loaded.result.ok) {
    return (
      <EmptyState
        title={`« ${t(market.label)} » indisponible pour le moment`}
        description={loaded.result.reason}
        source={loaded.result.source?.label ?? null}
        tone="warning"
      />
    )
  }

  if (loaded.rows.length === 0) {
    return (
      <EmptyState
        title={t('Population vide')}
        description={t('La source n’a renvoyé aucune ligne pour ce marché.')}
        compact
      />
    )
  }

  return (
    <div className="space-y-4">
      <ScreenerView rows={loaded.rows} market={market} total={loaded.rows.length} />
      <SourceNote
            strings={{ source: t('Source :'), dated: t('données du {date}') }}
        label={loaded.result.source?.label ?? 'Source'}
        href={loaded.result.source?.attributionUrl ?? '#'}
      />
    </div>
  )
}

/**
 * Aiguillage marché → source → lignes normalisées.
 *
 * Il rend le `DataResult` d'origine EN PLUS des lignes : l'appelant a besoin du motif
 * d'échec et de l'attribution de source, et les reconstruire depuis les lignes seules
 * serait impossible. C'est aussi le seul endroit du site qui connaisse la
 * correspondance entre un onglet et un fournisseur.
 */
async function load(
  market: ScreenerMarket,
): Promise<{ rows: ScreenerRow[]; result: DataResult<unknown> }> {
  switch (market.id) {
    case 'actions': {
      const result = await getStockScreen()
      return { rows: result.ok ? rowsFromYahoo(result.data) : [], result }
    }
    case 'etf': {
      const result = await getEtfScreen()
      return { rows: result.ok ? rowsFromYahoo(result.data) : [], result }
    }
    case 'obligations': {
      const result = await getBondFundScreen()
      return { rows: result.ok ? rowsFromYahoo(result.data) : [], result }
    }
    case 'cex': {
      /* Cent places : c'est le plafond de la source sur cet endpoint, et bien au-delà
         du nombre de plateformes qui cotent un volume significatif. */
      const result = await getSpotExchanges(100)
      return { rows: result.ok ? rowsFromExchanges(result.data) : [], result }
    }
    case 'dex': {
      const result = await getPoolUniverse()
      return { rows: result.ok ? rowsFromPools(result.data) : [], result }
    }
    default: {
      const result = await getMoversUniverse(250, 'eur')
      return { rows: result.ok ? rowsFromCrypto(result.data) : [], result }
    }
  }
}

/**
 * LE PÉRIMÈTRE DE L'ONGLET, ÉCRIT SOUS LE TABLEAU.
 *
 * Ce bloc n'est pas une note de bas de page : c'est la condition pour que le résultat
 * du filtre soit interprétable. Chaque marché a une borne, elle a une raison, et les
 * deux sont dites.
 */
async function Scope({ market }: { market: ScreenerMarket }) {
  const t = await getPhrase()
  return (
    <section className="max-w-2xl space-y-2 border-t border-border-subtle pt-6">
      <h2 className="text-sm font-semibold text-ink">{t('Ce que cet onglet examine')}</h2>
      {scopeFor(market.id, t)}
      <p className="text-sm text-ink-muted">
        {weave(
          t(
            'Le filtrage est instantané parce qu’il porte sur des données déjà reçues avec la page — aucun aller-retour serveur n’est déclenché à chaque réglage. Les sources sont nommées dans le [pied de page](/a-propos).',
          ),
          (href, label, key) => (
            <Link key={key} href={href} className="text-ink hover:underline">
              {label}
            </Link>
          ),
        )}
      </p>
    </section>
  )
}

/**
 * Ce que chaque onglet examine, et ce qu'il n'examine pas.
 *
 * FONCTION et non constante de module : le texte doit être traduit, et une constante
 * évaluée au chargement ne connaît pas la langue de la requête.
 *
 * Les paragraphes portent leur emphase en `**` plutôt qu'en `<strong>` imbriqué —
 * voir `components/locale/emphasise` pour la raison, qui tient à l'ordre des mots.
 */
function scopeFor(
  id: ScreenerMarket['id'],
  t: (text: string) => string,
): React.ReactNode {
  const paragraph = (text: string) => (
    <p className="text-sm leading-relaxed text-ink-muted">{emphasise(t(text))}</p>
  )

  switch (id) {
    case 'actions':
      return (
        <>
          {paragraph(
            'Environ mille valeurs, obtenues en combinant six écrans prédéfinis de la source — les plus échangées, les plus fortes hausses, les plus fortes baisses, les valeurs de croissance décotées, les petites capitalisations offensives et les plus vendues à découvert. Chacun de ces écrans est **biaisé par construction** ; c’est leur union qui approche un balayage, et elle ne le remplace pas.',
          )}
          {paragraph(
            'Les lignes ne sont pas cliquables : nos fiches d’actif reposent sur une liste de symboles arrêtée à la main, bien plus courte que cette population. Lier chaque ligne mènerait à des centaines de pages inexistantes.',
          )}
        </>
      )

    case 'etf':
      return paragraph(
        'Les cinq cents premiers ETF américains par encours, seul écran d’ETF que la source publie. Un ETF **européen n’y figure pas** — la sélection est américaine, et laisser croire l’inverse serait pire que la limite elle-même. Les frais affichés sont les frais courants annuels, prélevés sur l’actif du fonds.',
      )

    case 'obligations':
      return (
        <>
          {paragraph(
            '**Ce ne sont pas des obligations.** Une obligation est un titre de créance avec son émetteur, son coupon, son échéance et sa notation ; aucune source gratuite ne publie ces cotations, et tous les écrans obligataires de la source répondent qu’ils n’existent pas.',
          )}
          {paragraph(
            'Ce que cet onglet recense, ce sont des **fonds investis en obligations** à haut rendement — une exposition au marché obligataire, pas le marché lui-même. Ses colonnes sont donc celles d’un fonds : valeur liquidative, frais, distribution, performance annualisée. Cinquante-sept lignes, ce que la source publie.',
          )}
        </>
      )

    case 'crypto':
      return (
        <>
          {paragraph(
            'Les 250 plus grandes capitalisations. Deux raisons à cette borne : la source plafonne une page de classement à 250 lignes, et balayer les quinze mille jetons référencés demanderait une soixantaine d’appels par affichage — infaisable sur un accès gratuit.',
          )}
          {paragraph(
            'Surtout, en dessous de quelques millions de capitalisation, un seul échange déplace un cours de dizaines de points : un filtre non borné remonterait d’abord ce bruit, et le présenterait comme un résultat.',
          )}
        </>
      )

    case 'cex':
      return paragraph(
        'Les cent premières places d’échange dépositaires, classées par la source. La **note de confiance** est publiée par elle et n’est pas notre évaluation : elle mêle liquidité, écart de cours, trafic déclaré et qualité des interfaces de programmation. Les volumes sont libellés en bitcoin, unité dans laquelle la source les publie — les convertir supposerait de choisir un cours et un instant, ce qui ferait d’une mesure une estimation.',
      )

    case 'dex':
      return paragraph(
        'Une centaine de pools en vue, toutes chaînes confondues, sur cinq pages du classement de la source. Au-delà, un pool porte quelques dizaines de milliers de dollars de réserve : à cette profondeur, une seule transaction déplace le cours de plusieurs points. Tous les montants sont **en dollars** — cette source ne cote pas en euro.',
      )
  }
}
