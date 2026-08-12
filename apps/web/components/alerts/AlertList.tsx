'use client'

import { Bell, BellOff, RotateCcw, Trash2 } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { useState, useTransition } from 'react'

import { rearmPriceAlert, removePriceAlert } from '@/lib/alert-actions'

export interface AlertRow {
  id: number
  href: string
  label: string
  symbol: string | null
  direction: string
  threshold: string
  active: boolean
  triggeredAt: string | null
  triggeredPrice: string | null
}

/**
 * Liste des alertes, armées et consommées mêlées.
 *
 * ── POURQUOI UNE SEULE LISTE ET NON DEUX ONGLETS ──────────────────────────────
 *
 * Une alerte consommée n'est pas de l'archive : c'est une alerte qu'il faut décider
 * de réarmer ou de jeter, et c'est précisément la décision qu'on vient prendre sur
 * cette page. La reléguer dans un second onglet la rendrait invisible — or c'est la
 * seule qui appelle une action.
 *
 * La distinction visuelle passe donc par l'ÉTAT de la ligne (icône, ton, actions
 * offertes), pas par sa localisation.
 */
export function AlertList({ alerts }: { alerts: AlertRow[] }) {
  const [message, setMessage] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function act(action: 'rearm' | 'remove', id: number) {
    setMessage(null)

    startTransition(async () => {
      const result =
        action === 'rearm' ? await rearmPriceAlert(id) : await removePriceAlert(id)

      if (!result.ok) {
        setMessage(
          result.reason === 'limit-reached'
            ? `Vous avez déjà ${result.limit} alertes armées : supprimez-en une, ou passez à Zenkuu Pro.`
            : 'L’opération a échoué. Réessayez.',
        )
      }
    })
  }

  return (
    <div className="space-y-3">
      {message ? (
        <p role="status" className="rounded-card border border-border-subtle bg-surface px-4 py-3 text-sm text-ink-muted">
          {message}{' '}
          <Link href="/tarifs" className="text-brand hover:text-brand-strong">
            Voir l’offre
          </Link>
        </p>
      ) : null}

      <ul className="divide-y divide-border-subtle rounded-card border border-border-subtle">
        {alerts.map((alert) => (
          <li key={alert.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
            {alert.active ? (
              <Bell className="h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
            ) : (
              <BellOff className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden="true" />
            )}

            <div className="min-w-0 flex-1">
              <Link href={alert.href} className="text-sm font-medium text-ink hover:text-brand-strong">
                {alert.label}
                {alert.symbol ? (
                  <span className="ml-1.5 text-xs uppercase text-ink-muted">{alert.symbol}</span>
                ) : null}
              </Link>

              <p className="text-xs text-ink-muted">
                {alert.direction === 'above' ? 'Au-dessus de' : 'En dessous de'}{' '}
                <span className="tabular text-ink">{alert.threshold}</span>
                {alert.triggeredAt ? (
                  <>
                    {' · '}déclenchée le {alert.triggeredAt}
                    {alert.triggeredPrice ? ` à ${alert.triggeredPrice}` : ''}
                  </>
                ) : null}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-1">
              {/* Le réarmement n'est proposé QUE sur une alerte consommée : sur une
                  alerte armée, le bouton n'aurait aucun effet observable. */}
              {alert.active ? null : (
                <button
                  type="button"
                  onClick={() => act('rearm', alert.id)}
                  disabled={pending}
                  title="Réarmer cette alerte"
                  aria-label={`Réarmer l’alerte sur ${alert.label}`}
                  className="rounded-sm p-1.5 text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink disabled:opacity-50"
                >
                  <RotateCcw className="h-4 w-4" aria-hidden="true" />
                </button>
              )}

              <button
                type="button"
                onClick={() => act('remove', alert.id)}
                disabled={pending}
                title="Supprimer cette alerte"
                aria-label={`Supprimer l’alerte sur ${alert.label}`}
                className="rounded-sm p-1.5 text-ink-muted transition-colors hover:bg-surface-muted hover:text-down disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
