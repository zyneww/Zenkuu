import type { PriceHistory } from '@zenkuu/data'
import { ChangeBadge } from '@zenkuu/ui'

import { HistoryExport, type HistoryRow } from '@/components/asset/HistoryExport'
import { Money } from '@/components/locale/Money'
import { getPhrase } from '@/lib/content'

/**
 * Historique de cours jour par jour.
 *
 * Reprise structurelle d'une fiche de cotation : sous le graphique, un tableau daté
 * qui donne les valeurs exactes. Le graphique montre une forme, le tableau donne des
 * nombres — deux besoins distincts que l'un ne remplace pas.
 *
 * La série reçue est bien plus fine que quotidienne (pas horaire sur 30 jours). On
 * n'affiche donc pas tous les points : on retient LE DERNIER de chaque journée, ce
 * qui correspond à la clôture connue. Prendre le premier point de la journée, ou
 * faire une moyenne, produirait un nombre qui ne figure nulle part chez la source.
 */

/** Nombre de journées affichées. Au-delà, le tableau devient plus long que la page. */
const MAX_ROWS = 14

export async function PriceHistoryTable({
  history,
  currency,
  isRate = false,
  assetName,
}: {
  history: PriceHistory
  currency: string
  isRate?: boolean
  /** Sert à nommer le fichier exporté et l'onglet du classeur. */
  assetName: string
}) {
  const t = await getPhrase()
  const days = toDailyCloses(history)
  if (days.length < 2) return null

  const rows = days.slice(-MAX_ROWS).reverse()

  /*
   * Lignes destinées à l'export, calculées UNE FOIS et non dans le rendu du tableau.
   *
   * Elles portent des NOMBRES bruts là où le tableau affiche du texte mis en forme :
   * c'est ce qui permet à Excel de trier et sommer la colonne, et à JSON de rester
   * exploitable par un script. Exporter la chaîne « 43 125,94 € » reviendrait à
   * exporter une image du chiffre.
   */
  const exportRows: HistoryRow[] = rows.map((row, index) => {
    const previous = rows[index + 1]
    return {
      day: row.day,
      price: row.price,
      change:
        previous && previous.price !== 0
          ? ((row.price - previous.price) / previous.price) * 100
          : null,
    }
  })

  return (
    <section className="space-y-2" aria-labelledby="historique-des-cours">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="historique-des-cours" className="text-sm font-semibold text-ink">
          {t('Historique des cours')}
        </h2>

        {/*
          L'export porte sur le tableau affiché, pas sur une série plus large qu'il
          faudrait aller rechercher. La donnée reste identique à ce qui est lu — c'est
          la règle commune à tous les exports du site.
        */}
        <HistoryExport rows={exportRows} assetName={assetName} currency={currency} />
      </div>

      <div className="overflow-x-auto rounded-card">
        <table className="w-full min-w-[380px] border-collapse text-sm">
          <caption className="sr-only">
            Dernière valeur connue par journée, sur les {rows.length} derniers jours
          </caption>
          <thead>
            <tr className="border-b border-border-subtle text-left text-[length:var(--v2-text-2xs)] font-semibold text-ink-muted">
              <th scope="col" className="px-3 py-2.5 font-medium">Date</th>
              <th scope="col" className="px-3 py-2.5 text-right font-medium">{t('Clôture')}</th>
              <th scope="col" className="px-3 py-2.5 text-right font-medium">Variation</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {rows.map((row, index) => {
              // La ligne suivante dans `rows` est la journée PRÉCÉDENTE : le tableau
              // est trié du plus récent au plus ancien.
              const previous = rows[index + 1]
              const change =
                previous && previous.price !== 0
                  ? ((row.price - previous.price) / previous.price) * 100
                  : undefined

              return (
                <tr key={row.day} className="transition-colors hover:bg-surface-muted/60">
                  <th scope="row" className="px-3 py-2 text-left font-normal text-ink-muted">
                    <time dateTime={row.day}>{formatDay(row.day)}</time>
                  </th>
                  <td className="tabular px-3 py-2 text-right font-medium text-ink">
                    <Money value={row.price} from={currency} asRate={isRate} />
                  </td>
                  <td className="px-3 py-2 text-right">
                    {change === undefined ? (
                      <span className="text-xs text-ink-muted">—</span>
                    ) : (
                      <ChangeBadge value={change} size="sm" />
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p className="text-[0.6875rem] text-ink-muted">
        {t('Dernière valeur reçue pour chaque journée. La variation est calculée d’une journée à la précédente au sein de cette série.')}
      </p>
    </section>
  )
}

/** Réduit une série fine à une valeur par jour : la dernière connue. */
function toDailyCloses(history: PriceHistory): { day: string; price: number }[] {
  const byDay = new Map<string, { timestamp: number; price: number }>()

  for (const point of history.points) {
    const day = new Date(point.timestamp).toISOString().slice(0, 10)
    const current = byDay.get(day)
    if (!current || point.timestamp > current.timestamp) {
      byDay.set(day, { timestamp: point.timestamp, price: point.price })
    }
  }

  return [...byDay.entries()]
    .sort((a, b) => a[1].timestamp - b[1].timestamp)
    .map(([day, entry]) => ({ day, price: entry.price }))
}

function formatDay(iso: string): string {
  const date = new Date(`${iso}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}
