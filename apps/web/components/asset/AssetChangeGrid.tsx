import type { MarketAsset } from '@zenkuu/data'
import { ChangeBadge } from '@zenkuu/ui'

/**
 * Variations sur toutes les fenêtres publiées.
 *
 * Les six valeurs arrivent dans la MÊME réponse que le cours : cette rangée ne
 * coûte aucun appel réseau, elle exploite des champs qui étaient jusqu'ici jetés.
 *
 * Les fenêtres absentes sont OMISES et non affichées à zéro — un jeton créé il y a
 * trois mois n'a pas de variation sur un an, et écrire « 0,00 % » laisserait croire
 * à une stabilité parfaite plutôt qu'à une absence (§5).
 */
const WINDOWS: { key: keyof MarketAsset; label: string; longLabel: string }[] = [
  { key: 'change1h', label: '1 h', longLabel: 'sur 1 heure' },
  { key: 'change24h', label: '24 h', longLabel: 'sur 24 heures' },
  { key: 'change7d', label: '7 j', longLabel: 'sur 7 jours' },
  { key: 'change14d', label: '14 j', longLabel: 'sur 14 jours' },
  { key: 'change30d', label: '30 j', longLabel: 'sur 30 jours' },
  { key: 'change1y', label: '1 an', longLabel: 'sur 1 an' },
]

export function AssetChangeGrid({ asset }: { asset: MarketAsset }) {
  const available = WINDOWS.filter((entry) => typeof asset[entry.key] === 'number')
  if (available.length === 0) return null

  return (
    <section aria-labelledby="variations-titre" className="space-y-2">
      <h2 id="variations-titre" className="sr-only">
        Variations par période
      </h2>

      <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-card border border-border-subtle bg-border-subtle sm:grid-cols-6">
        {available.map((entry) => (
          <div key={entry.key} className="bg-surface px-3 py-2.5 text-center">
            <dt className="text-[0.6875rem] text-ink-muted">{entry.label}</dt>
            <dd className="mt-1 flex justify-center">
              <ChangeBadge
                value={asset[entry.key] as number}
                periodLabel={entry.longLabel}
                size="sm"
              />
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
