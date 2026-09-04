import type { AssetDetail } from '@zenkuu/data'

import { Money } from '@/components/locale/Money'
import type { MetricDef } from '@/lib/asset-metrics'
import { getFormatters } from '@/lib/formatters'

/**
 * Rendu d'une valeur de métrique.
 *
 * ── POURQUOI CE COMPOSANT EXISTE ──────────────────────────────────────────────
 *
 * Le formatage vivait dans le rail, en fonction locale. Il fallait le répéter dès
 * qu'un second endroit a eu besoin d'afficher les mêmes chiffres — le bandeau de
 * l'en-tête. C'est exactement la divergence que `lib/asset-metrics.ts` a été écrit
 * pour rendre impossible, et l'y laisser sous forme dupliquée aurait vidé le
 * registre de son intérêt : deux copies du même `switch` finissent toujours par
 * traiter un cas différemment.
 *
 * Le formatage suit le TYPE de la métrique (`kind`), jamais son groupe ni l'endroit
 * où elle s'affiche. Une quantité est une quantité, qu'elle soit dans une carte ou
 * dans un en-tête.
 */
export async function MetricValue({
  metric,
  value,
  asset,
  isForex,
  compact,
}: {
  metric: MetricDef
  value: number | string
  asset: AssetDetail
  isForex: boolean
  /**
   * Notation abrégée des montants — « 12,3 Md $ » plutôt que « 12 284 913 004 $ ».
   *
   * Par défaut, elle suit le groupe : les grandeurs de marché s'abrègent, les cours
   * ne s'abrègent pas. La raison n'est pas la place disponible mais l'usage : une
   * capitalisation se lit, un cours se compte — on compare le second au centime
   * près, jamais le premier.
   */
  compact?: boolean
}) {
  const nombres = await getFormatters()

  switch (metric.kind) {
    case 'money':
      return (compact ?? metric.group === 'market') ? (
        <Money value={Number(value)} from={asset.currency} compact />
      ) : (
        <Money value={Number(value)} from={asset.currency} asRate={isForex} />
      )
    case 'quantity':
      // Une quantité n'est PAS un montant : elle ne se convertit pas et ne porte
      // pas de symbole monétaire, mais celui de l'actif.
      return `${nombres.compact(Number(value))} ${asset.symbol.toUpperCase()}`
    case 'percent':
      return nombres.share(Number(value))
    case 'rank':
      return `#${value}`
    case 'change':
      // La variation se rend avec `ChangeBadge` — signe, chevron et couleur —, ce
      // qui n'est pas du formatage mais un composant à part entière. L'appelant s'en
      // charge : le lui renvoyer ici obligerait ce fichier à connaître les tailles
      // de badge de chaque contexte.
      return null
    default:
      return String(value)
  }
}
