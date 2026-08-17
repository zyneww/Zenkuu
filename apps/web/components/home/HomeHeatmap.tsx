import { getCategories, getMoversUniverse } from '@zenkuu/data'
import { EmptyState } from '@zenkuu/ui'

import { MarketHeatmap } from '@/components/tools/MarketHeatmap'

/**
 * CARTE THERMIQUE COMPACTE DE L'ACCUEIL.
 *
 * ── POURQUOI L'ACCUEIL EN A BESOIN, ALORS QU'UNE PAGE ENTIÈRE EXISTE ────────
 *
 * Les trois panneaux de la section crypto — tendances, hausses, baisses — répondent
 * tous à « quels actifs bougent », et par des LISTES. Une liste de cinq lignes ne dit
 * rien de la proportion : « Bitcoin +2 % » y occupe exactement la place de « jeton
 * inconnu +40 % », alors que l'un pèse mille fois l'autre.
 *
 * La carte thermique est la seule figure qui montre les DEUX à la fois — le poids par
 * la surface, le mouvement par la couleur. C'est ce que TradingView met sur sa page
 * d'accueil, et ce que trois listes ne remplacent pas.
 *
 * ── AUCUN APPEL SUPPLÉMENTAIRE POUR LE SITE, UN DE PLUS POUR CETTE PAGE ─────
 *
 * `getCategories` et `getMoversUniverse` servent déjà `/heatmap`, `/categories` et
 * `/mouvements`, et leurs clés de cache ne dépendent d'aucun paramètre : le premier
 * visiteur de la journée les paie, tous les autres lisent le cache.
 *
 * Ce composant reste néanmoins sous `<Suspense>` chez son appelant. Ces deux requêtes
 * comptent parmi les plus lourdes du site — cent actifs et l'intégralité des
 * catégories — et les attendre retiendrait le reste de la page d'accueil pour une
 * figure qui vit sous la ligne de flottaison.
 */
export async function HomeHeatmap() {
  const [categories, assets] = await Promise.all([getCategories(), getMoversUniverse(100, 'eur')])

  const hasAssets = assets.ok && assets.data.length > 0
  const hasSectors = categories.ok && categories.data.length > 0

  if (!hasAssets && !hasSectors) {
    return (
      <EmptyState
        title="Carte thermique indisponible"
        description={assets.ok ? null : assets.reason}
        compact
      />
    )
  }

  return (
    <MarketHeatmap
      assets={assets.ok ? assets.data : []}
      categories={categories.ok ? categories.data : []}
    />
  )
}
