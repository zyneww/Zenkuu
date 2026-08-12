import type { AssetClassAvailability } from '@zenkuu/data'

import { getContent } from '@/lib/content'

/**
 * Couverture par classe d'actif.
 *
 * Ce widget remplace, pour l'instant, l'« aperçu par classe d'actif » du §6 : tant
 * qu'une seule classe est branchée, afficher six blocs de chiffres inventés serait
 * exactement ce que le §5 interdit. On montre donc l'état réel de la couverture —
 * ce qui répond en outre à la question que se pose tout visiteur d'un site
 * multi-actifs : « qu'est-ce qui est réellement dedans ? »
 */
export async function CoverageList({ availability }: { availability: AssetClassAvailability[] }) {
  const fr = await getContent()
  return (
    <ul className="space-y-1.5">
      {availability.map((entry) => (
        <li key={entry.assetClass} className="flex items-center justify-between gap-3 text-sm">
          <span className="text-ink">{fr.assetClass[entry.assetClass]}</span>

          <span className="flex shrink-0 items-center gap-2">
            {entry.providerLabel ? (
              <span className="text-[0.6875rem] text-ink-muted">{entry.providerLabel}</span>
            ) : null}

            <span
              className={`rounded-md px-1.5 py-0.5 text-[0.6875rem] font-medium ${
                entry.available ? 'bg-up-soft text-up' : 'bg-surface-muted text-ink-muted'
              }`}
              title={entry.reason ?? undefined}
            >
              {entry.available ? fr.states.connected : fr.states.pending}
            </span>
          </span>
        </li>
      ))}
    </ul>
  )
}
