import type { Metadata } from 'next'
import { Suspense } from 'react'
import { Link } from '@/i18n/navigation'

import { CACHE_TTL_SECONDS, getRanking, type AssetClass, type MarketAsset } from '@zenkuu/data'
import { EmptyState, SourceNote } from '@zenkuu/ui'

import { ComparatorView } from '@/components/tools/ComparatorView'
import { weave } from '@/components/locale/emphasise'
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
    title: t('Comparateur'),
    description: seo(
      '/comparateur',
      'Comparer deux à six actifs de toutes classes — cryptomonnaies, actions, ETF, indices, matières premières, devises : trajectoires ramenées à une base commune, puis les chiffres qui les séparent.',
    ),
    alternates: { canonical: '/comparateur' },
  }
}

/**
 * Classes chargées, et leur taille de page.
 *
 * ── LES NOMBRES NE SONT PAS ARBITRAIRES : CE SONT CEUX DES PAGES DE CLASSEMENT ─
 *
 * La clé de cache d'un classement s'écrit `classe:ranking:devise:tri:sens:page:taille`.
 * Reprendre EXACTEMENT les paramètres qu'emploient `/marches` et les six pages dédiées
 * — cinquante pour la crypto, vingt pour le reste, tri par capitalisation décroissante,
 * page 1, euro — fait tomber ces requêtes sur les mêmes entrées de cache. Le comparateur
 * ne coûte alors rien à quiconque a ouvert une page de marché dans les trois minutes.
 *
 * Un seul chiffre différent — vingt-cinq au lieu de vingt — et ce partage disparaît :
 * la page paierait ses propres appels EN PLUS de ceux des classements, sans que rien
 * ne le signale.
 *
 * ⚠️ COÛT SUR CACHE FROID. Les quatre classes Yahoo se construisent SYMBOLE PAR SYMBOLE
 * — leur endpoint multi-symboles est fermé depuis longtemps. Cinquante requêtes
 * sortantes derrière un limiteur à soixante par minute : quelques secondes. C'est ce
 * qui justifie le `Suspense` plus bas, et c'est aussi pourquoi allonger `YAHOO_UNIVERSE`
 * coûte du temps de page ici, pas seulement une ligne de plus dans un tableau.
 */
const CLASSES: { assetClass: AssetClass; perPage: number }[] = [
  { assetClass: 'crypto', perPage: 50 },
  { assetClass: 'stock', perPage: 20 },
  { assetClass: 'etf', perPage: 20 },
  { assetClass: 'index', perPage: 20 },
  { assetClass: 'commodity', perPage: 20 },
  { assetClass: 'forex', perPage: 20 },
]

/**
 * Comparateur — TOUTES CLASSES D'ACTIFS.
 *
 * ── CE QUI A CHANGÉ, ET POURQUOI CE N'EST PAS UN SIMPLE ÉLARGISSEMENT ────────
 *
 * La page se limitait à la crypto et le disait ainsi : « Rapprocher une action et une
 * cryptomonnaie supposerait de mettre en regard des champs que deux sources ne
 * définissent pas de la même façon. Nous préférons ne pas offrir la comparaison plutôt
 * que d'en offrir une fausse. »
 *
 * Le principe reste juste ; c'est sa portée qui était trop large. Il vaut pour les
 * grandeurs qui changent de DÉFINITION d'une source à l'autre — le volume avant tout,
 * compté en titres échangés d'un côté et en monnaie de l'autre. Il ne vaut pas pour
 * une variation en pourcentage, qui est un rapport sans unité et dit la même chose
 * partout. Or c'est précisément ce que le comparateur montre en premier.
 *
 * La règle est donc descendue d'un cran : elle s'applique LIGNE PAR LIGNE plutôt qu'à
 * la page entière. Voir `ComparatorView`, où chaque ligne déclare si elle survit au
 * mélange des classes.
 *
 * Restait un troisième obstacle, celui-là non identifié à l'époque : les séries de
 * cours ne couvrent pas la même durée selon la source — sept jours au pas horaire chez
 * l'une, un mois de clôtures quotidiennes chez l'autre. Les superposer par rang
 * traçait deux échelles de temps sur un seul axe. C'est réglé dans `compare-series.ts`,
 * et c'était un défaut latent AVANT cette page : deux cryptos n'y échappaient que
 * parce qu'elles venaient de la même source.
 */
export default async function ComparatorPage() {
  const t = await getPhrase()
  return (
    <div className="space-y-8">
      <header className="max-w-3xl space-y-3">
        <h1 className="display-xl text-ink">{t("Comparateur")}</h1>
        <p className="text-lg leading-relaxed text-ink-muted">{t("Deux à six actifs côte à côte, toutes classes confondues : trajectoires ramenées à une base commune, puis les chiffres qui les séparent.")}</p>
      </header>

      {/*
        ── POURQUOI LE CORPS EST MIS EN FLUX ────────────────────────────────────

        Il attend six classements, dont quatre se construisent symbole par symbole chez
        Yahoo. Sur un cache froid, la réponse se compte en secondes — irréductible, cet
        endpoint ne se demande qu'un symbole à la fois.

        Ce qui est réductible, c'est l'ATTENTE AVANT LE PREMIER PIXEL. Sans `Suspense`,
        le serveur retiendrait la page entière jusqu'au dernier appel : écran blanc,
        sans titre, sans savoir si le site répond. Avec, l'en-tête part immédiatement.
      */}
      <Suspense
        fallback={
          <p className="rounded-card border border-border-subtle bg-surface px-4 py-16 text-center text-sm text-ink-muted">
            {t('Chargement des six marchés…')}
          </p>
        }
      >
        <ComparatorBody />
      </Suspense>

      <section className="max-w-2xl space-y-2 border-t border-border-subtle pt-6">
        <h2 className="text-sm font-semibold text-ink">
          {t('Ce que le comparateur ne compare pas')}
        </h2>
        <p className="text-sm leading-relaxed text-ink-muted">
          {t(
            'Une grandeur qui change de définition d’une source à l’autre ne se met pas en regard. Le « volume » d’une place boursière se compte en titres échangés, celui d’un agrégateur crypto en monnaie ; un rang est interne à sa classe. Ces lignes-là disparaissent dès que la comparaison mêle plusieurs classes, plutôt que d’aligner des nombres qui ne se répondent pas.',
          )}
        </p>
        <p className="text-sm leading-relaxed text-ink-muted">
          {t(
            'Les variations en pourcentage, elles, se comparent sans réserve : ce sont des rapports sans unité. C’est ce qui rend le graphique honnête d’une classe à l’autre — à condition de le tracer sur une fenêtre de temps commune, ce que fait la page.',
          )}
        </p>
        <p className="text-sm text-ink-muted">
          {weave(
            t(
              'Pour une lecture complète d’un actif, voir sa fiche depuis [Parcourir](/crypto), ou filtrer le marché avec le [screener](/screener).',
            ),
            (href, label, key) => (
              <Link key={key} href={href} className="text-ink hover:underline">
                {label}
              </Link>
            ),
          )}
        </p>
      </section>
    </div>
  )
}

/**
 * Univers de comparaison — les six classes réunies.
 *
 * `Promise.all` et non une suite d'`await` : six classements séquencés additionneraient
 * leurs latences, et le plus lent des six les tient déjà toutes.
 *
 * Une classe en échec ne fait PAS tomber la page : `getRanking` ne rejette jamais, il
 * renvoie un résultat marqué. On garde donc ce qui est arrivé et on l'écrit — un
 * comparateur amputé de ses matières premières reste utile, un comparateur vide non.
 */
async function ComparatorBody() {
  const t = await getPhrase()
  const results = await Promise.all(
    CLASSES.map(({ assetClass, perPage }) =>
      getRanking({ assetClass, perPage, currency: 'eur' }).then((result) => ({
        assetClass,
        result,
      })),
    ),
  )

  const assets: MarketAsset[] = results.flatMap(({ result }) =>
    // Un cours nul rendrait la mise en base 100 infinie et la ligne « Cours » muette :
    // l'actif est écarté de l'univers plutôt que proposé puis inutilisable.
    result.ok ? result.data.filter((asset) => asset.price > 0) : [],
  )

  const missing = results.filter(({ result }) => !result.ok).map(({ assetClass }) => assetClass)

  if (assets.length < 2) {
    return (
      <EmptyState
        title="Univers indisponible"
        description="Aucun marché n’a répondu : la comparaison a besoin d’au moins deux actifs."
        tone="warning"
      />
    )
  }

  /* Attribution portée par la source du plus gros contingent — la crypto — mais les
     autres classes sont citées : trois fournisseurs alimentent cette page, et n'en
     nommer qu'un serait inexact. */
  const crypto = results.find((entry) => entry.assetClass === 'crypto')?.result

  return (
    <div className="space-y-4">
      <ComparatorView assets={assets} />

      {missing.length > 0 ? (
        <p className="text-xs text-ink-muted">
          {missing.length === 1 ? 'Une classe d’actifs est' : `${missing.length} classes d’actifs sont`}{' '}
          momentanément indisponible{missing.length > 1 ? 's' : ''} : les autres restent
          comparables.
        </p>
      ) : null}

      <SourceNote
            strings={{ source: t('Source :'), dated: t('données du {date}') }}
        label={
          crypto?.ok
            ? `${crypto.source.label}, Yahoo Finance et Banque centrale européenne`
            : 'Yahoo Finance et Banque centrale européenne'
        }
        href={crypto?.ok ? crypto.source.attributionUrl : 'https://finance.yahoo.com'}
        {...(assets[0]?.lastUpdated ? { updatedAt: assets[0].lastUpdated } : {})}
      />
    </div>
  )
}
