import type { Metadata } from 'next'

import { CACHE_TTL_SECONDS, getCategories, getCryptoGlobalStats } from '@zenkuu/data'
import { EmptyState, SourceNote } from '@zenkuu/ui'

import { CategoryExplorer } from '@/components/categories/CategoryExplorer'
import { getContent, getPhrase } from '@/lib/content'

export const revalidate = 180
const _ttlGuard: typeof revalidate = CACHE_TTL_SECONDS
void _ttlGuard

/**
 * Mot sur lequel la page s'ouvre.
 *
 * ⚠️ EN ANGLAIS, ET C'EST VOULU. Les noms de catégories viennent de CoinGecko et ne
 * sont pas traduits : « Solana Ecosystem », « Ethereum Ecosystem », « Cosmos
 * Ecosystem ». Chercher « écosystème » ne trouverait rien. Le filtre porte sur la
 * donnée telle qu'elle est publiée, pas sur la langue de l'interface — et le lecteur
 * voit le mot dans le champ, où il peut l'effacer.
 */
const ECOSYSTEM_TERM = 'Ecosystem'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getPhrase()
  return {
    title: t('Écosystèmes'),
    description: t(
      'Les écosystèmes de la blockchain, classés par capitalisation : Ethereum, Solana, BNB Chain, Cosmos et les autres.',
    ),
    alternates: { canonical: '/categories/ecosystemes' },
  }
}

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * ÉCOSYSTÈMES — LA MÊME LISTE QUE LES SECTEURS, OUVERTE SUR UN MOT
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── POURQUOI CETTE PAGE EXISTE ─────────────────────────────────────────────
 *
 * La rangée d'onglets du tableau d'accueil reprend celle de la référence, qui aligne
 * « All Categories » et « Ecosystems » côte à côte. Les deux menaient chez nous à
 * `/categories` : deux onglets vers la même page est un défaut, pas une reprise.
 *
 * ── POURQUOI CE N'EST PAS UN AUTRE COMPOSANT ───────────────────────────────
 *
 * Un écosystème EST une catégorie chez notre source : « Solana Ecosystem » arrive dans
 * la même réponse que « Layer 1 » et porte les mêmes champs. Écrire une seconde page
 * dupliquerait le tableau, son tri et sa colonne de dominance pour changer un filtre.
 * `CategoryExplorer` reçoit donc un filtre initial, que le lecteur peut effacer —
 * auquel cas il retrouve la liste entière sans changer d'adresse.
 *
 * ── CE QU'ELLE NE PRÉTEND PAS ÊTRE ─────────────────────────────────────────
 *
 * ⚠️ Ce n'est PAS une taxonomie d'écosystèmes vérifiée par nous : c'est la sélection
 * des catégories dont le nom publié contient « Ecosystem ». Un écosystème que la
 * source nommerait autrement n'y figurera pas, et le chapeau le dit. L'alternative —
 * tenir notre propre liste de chaînes — produirait une classification que rien ne
 * pourrait vérifier et qui périmerait à la première nouveauté (§5).
 */
export default async function EcosystemsPage() {
  const t = await getPhrase()
  const fr = await getContent()

  /* En DOLLARS, comme `/categories` : la source ne publie ses agrégats sectoriels
     qu'en dollars, et un rapport entre une capitalisation en dollars et un total en
     euros ne voudrait rien dire. */
  const [categories, globalStats] = await Promise.all([getCategories(), getCryptoGlobalStats('usd')])

  const listed = categories.ok
    ? categories.data.filter((category) => (category.marketCap ?? 0) > 0)
    : []

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <h1 className="display-xl text-ink">{t('Écosystèmes')}</h1>
        <p className="max-w-3xl text-sm leading-relaxed text-ink-muted">
          {t(
            'Les grandes familles de jetons regroupées par la chaîne sur laquelle ils vivent. Un même actif peut relever de plusieurs écosystèmes, si bien que les capitalisations de ce tableau ne s’additionnent pas.',
          )}
        </p>
        <p className="text-xs text-ink-muted">
          {t(
            'La liste retient les catégories dont le nom publié par la source mentionne « Ecosystem ». Effacez le filtre pour retrouver l’ensemble des secteurs.',
          )}
        </p>
      </header>

      {/* Le test porte sur `categories.ok` ET sur la longueur, alors que la seconde
          implique la première : c'est ce qui permet à TypeScript de savoir, dans cette
          branche, que `categories.source` existe. Un test sur la seule longueur laisse
          l'union non résolue, et `source` reste éventuellement nul. */}
      {!categories.ok || listed.length === 0 ? (
        <EmptyState
          title={fr.states.unavailableTitle}
          description={categories.ok ? null : categories.reason}
          source={categories.source?.label ?? null}
        />
      ) : (
        <>
          <CategoryExplorer
            categories={listed}
            totalMarketCap={globalStats.ok ? globalStats.data.totalMarketCap : null}
            defaultQuery={ECOSYSTEM_TERM}
          />

          <SourceNote
            strings={{ source: t('Source :'), dated: t('données du {date}') }}
            label={`${categories.source.label} · montants en USD`}
            href={categories.source.attributionUrl}
          />
        </>
      )}
    </div>
  )
}
