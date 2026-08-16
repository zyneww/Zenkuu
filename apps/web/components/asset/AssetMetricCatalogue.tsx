import { getTranslations } from 'next-intl/server'

import type { AssetClass, AssetDetail } from '@zenkuu/data'
import { ChangeBadge } from '@zenkuu/ui'

import { AssetMetricGrid, type MetricCard } from '@/components/asset/AssetMetricGrid'
import { MetricValue } from '@/components/asset/MetricValue'
import { ASSET_CLASS_SEGMENT } from '@/lib/asset-routes'
import { METRICS, extremeMessage, metricHref } from '@/lib/asset-metrics'

/**
 * Passerelle serveur → client du catalogue de métriques.
 *
 * ── POURQUOI DEUX FICHIERS POUR UN SEUL BLOC ──────────────────────────────────
 *
 * La grille est INTERACTIVE : filtre par catégorie, recherche, courbes chargées à
 * l'ouverture de l'onglet. Elle doit donc vivre côté client. Mais ce qu'elle affiche
 * est produit côté serveur : les libellés viennent des fichiers de messages, les
 * montants passent par `Money`, et le registre `lib/asset-metrics.ts` est la source
 * unique de la liste.
 *
 * Ce fichier est la couture. Il lit le registre, traduit, rend chaque valeur avec
 * `MetricValue` — exactement comme le rail — et passe le résultat en nœuds React à la
 * grille. C'est le même procédé que la fiche emploie déjà pour ses onglets : un
 * composant client ne peut pas CONSTRUIRE une arborescence serveur, mais il peut
 * parfaitement la PLACER.
 *
 * L'alternative aurait été de formater les valeurs en chaînes ici. Elle est rejetée
 * pour la raison que défend `MetricValue` : deux formateurs pour les mêmes chiffres
 * finissent toujours par traiter un cas différemment.
 */
export async function AssetMetricCatalogue({
  asset,
  assetClass,
}: {
  asset: AssetDetail
  assetClass: AssetClass
}) {
  const t = await getTranslations('metric')
  const isForex = assetClass === 'forex'
  const segment = ASSET_CLASS_SEGMENT[assetClass]

  const cards: MetricCard[] = []

  for (const metric of METRICS) {
    const value = metric.read(asset)
    // Absente chez la source : la carte n'existe pas. Une carte vide ferait passer une
    // absence de donnée pour une donnée nulle — c'est la règle qui régit tout le rail.
    if (value === undefined) continue

    /* Les extrêmes ont deux clés de message selon la classe d'actif : Yahoo ne publie
       pas de record absolu pour les valeurs boursières. Même arbitrage que dans le
       rail, et il vaut mieux le répéter que d'exporter une fonction de deux lignes. */
    const message =
      metric.message === 'ath' || metric.message === 'atl'
        ? extremeMessage(metric.message, assetClass)
        : metric.message

    const change = metric.readChange?.(asset)

    cards.push({
      slug: metric.slug,
      label: t(`${message}.label`),
      help: t(`${message}.help`),
      group: metric.group,
      href: metricHref(segment, asset.id, metric.slug),
      /*
        Une variation N'A PAS de valeur distincte de son badge : le nombre EST la
        variation. Lui coller un `MetricValue` par-dessus afficherait « −2,6 % » deux
        fois sur la même ligne, une fois en gris et une fois en couleur.
      */
      value:
        metric.kind === 'change' ? (
          <ChangeBadge value={Number(value)} size="md" />
        ) : (
          <MetricValue metric={metric} value={value} asset={asset} isForex={isForex} />
        ),
      ...(metric.kind !== 'change' && change !== undefined ? { change } : {}),
      ...(metric.changeKind ? { changeKind: metric.changeKind } : {}),
      ...(metric.series ? { series: metric.series } : {}),
    })
  }

  if (cards.length === 0) return null

  return <AssetMetricGrid cards={cards} assetClass={assetClass} assetId={asset.id} />
}
