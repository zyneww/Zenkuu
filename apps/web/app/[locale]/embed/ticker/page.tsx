import type { Metadata } from 'next'

import { CACHE_TTL_SECONDS, getCryptoRanking } from '@zenkuu/data'

import { TickerWidget } from '@/components/widgets/TickerWidget'
import { getPhrase } from '@/lib/content'

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

  return {
    title: t('Cotations ZENKUU'),
    // Une page d'intégration n'a rien à faire dans un index : son contenu duplique
    // celui des classements, et l'indexer diluerait ces derniers (§9).
    robots: { index: false, follow: false },
  }
}

/**
 * Version intégrable du bandeau de cotations.
 *
 * Route destinée à être chargée dans une iframe tierce. Elle rend le widget SEUL —
 * l'en-tête, la navigation et le pied de page du site n'ont aucun sens dans un
 * cadre de 56 pixels de haut.
 *
 * L'attribution CoinGecko est reproduite ici, et ce n'est pas facultatif : la page
 * hôte n'affichera pas notre pied de page, or les conditions d'utilisation de l'API
 * imposent que la mention accompagne la donnée là où elle est affichée.
 */
export default async function EmbedTickerPage() {
  const t = await getPhrase()
  // Même taille de page que le classement crypto, pour partager sa clé de cache : une
  // taille propre à cette route provoquerait un appel sortant dédié à chaque
  // expiration, pour une donnée déjà en mémoire (voir `/widgets`).
  const ranking = await getCryptoRanking({ perPage: 50 })
  const assets = ranking.ok ? ranking.data.slice(0, 12) : []

  if (!ranking.ok || assets.length === 0) {
    return (
      <p className="p-2 text-xs text-ink-muted">
        {t('Cotations momentanément indisponibles.')}
      </p>
    )
  }

  return (
    <div className="space-y-1 p-1">
      <TickerWidget assets={assets} />
      <p className="text-center text-micro text-ink-muted">
        <a
          href="https://www.coingecko.com/en/api"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2"
        >
          {/* PAS DE `t()` ICI, ET C'EST VOULU. C'est la mention d'attribution que
              les conditions de l'API imposent de porter telle quelle : la traduire
              la ferait cesser d'être ce qu'elle doit être. `phrases.test.ts` refuse
              d'ailleurs une entrée dont la traduction recopie la clé — c'est cette
              règle qui a mis le doigt dessus. */}
          Powered by CoinGecko
        </a>
        {' · '}
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2"
        >
          {t('ZENKUU')}
        </a>
      </p>
    </div>
  )
}
