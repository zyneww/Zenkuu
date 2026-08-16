'use client'

import { Bell, BellOff, CalendarClock, Repeat, RotateCcw, Trash2 } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { useState, useTransition } from 'react'

import { Money } from '@/components/locale/Money'
import { rearmPriceAlert, removePriceAlert } from '@/lib/alert-actions'

export interface AlertRow {
  id: number
  href: string
  label: string
  symbol: string | null
  /** Nom donné à l'alerte. Absent ⇒ la ligne s'annonce par l'actif. */
  title: string | null
  /** Note laissée à la création, reprise dans le courriel. */
  note: string | null
  direction: string
  /**
   * Seuil BRUT, dans la devise où il a été enregistré.
   *
   * Il était pré-formaté côté serveur, ce qui l'immobilisait dans cette devise : un
   * lecteur qui affiche le site en dollars voyait ses alertes en euros, alors même
   * que la fenêtre de création lui avait demandé des dollars. Les deux écrans se
   * contredisaient sur le même nombre.
   *
   * La valeur traverse donc nue, et `Money` la convertit — comme partout ailleurs sur
   * le site. Ce qui est STOCKÉ ne bouge pas : c'est la devise de la source, la seule
   * que la tâche planifiée sache interroger.
   */
  threshold: number
  /** Devise d'enregistrement (ISO 4217), passée à `Money`. */
  currency: string
  active: boolean
  /** L'alerte se réarme-t-elle d'elle-même après un envoi ? */
  recurring: boolean
  /** Échéance formatée, ou `null` pour une surveillance sans fin. */
  expiresAt: string | null
  triggeredAt: string | null
  triggeredPrice: number | null
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
 *
 * ── CE QUE LA FENÊTRE DE CRÉATION A AJOUTÉ ICI ────────────────────────────────
 *
 * Nom, message, récurrence et échéance sont nouveaux, et ils changent la nature de
 * cette liste : dix alertes sur le bitcoin y étaient dix lignes identiques à l'œil,
 * qu'il fallait lire jusqu'au seuil pour distinguer. Le NOM prend donc la première
 * ligne quand il existe, et l'actif descend en second rang.
 *
 * Les deux pastilles — « à chaque fois », « jusqu'au … » — ne s'affichent que
 * lorsqu'elles disent quelque chose : une alerte ordinaire sans échéance n'en porte
 * aucune, ce qui est le cas majoritaire et doit rester le cas le plus silencieux.
 */
export function AlertList({ alerts }: { alerts: AlertRow[] }) {
  const [message, setMessage] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function act(action: 'rearm' | 'remove', id: number) {
    setMessage(null)

    startTransition(async () => {
      const result = action === 'rearm' ? await rearmPriceAlert(id) : await removePriceAlert(id)

      if (!result.ok) {
        setMessage(
          result.reason === 'limit-reached'
            ? `Vous avez déjà ${result.limit} alertes armées, le maximum du site : supprimez-en une pour en réarmer une autre.`
            : 'L’opération a échoué. Réessayez.',
        )
      }
    })
  }

  return (
    <div className="space-y-3">
      {message ? (
        <p
          role="status"
          className="rounded-card border border-border-subtle bg-surface px-4 py-3 text-sm text-ink-muted"
        >
          {message}
        </p>
      ) : null}

      <ul className="divide-y divide-border-subtle rounded-card border border-border-subtle">
        {alerts.map((alert) => (
          <li key={alert.id} className="flex flex-wrap items-start gap-3 px-4 py-3">
            {alert.active ? (
              <Bell className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
            ) : (
              <BellOff className="mt-0.5 h-4 w-4 shrink-0 text-ink-muted" aria-hidden="true" />
            )}

            <div className="min-w-0 flex-1">
              {/* Le NOM en tête quand il existe, sinon l'actif — voir l'en-tête. */}
              {alert.title ? (
                <p className="truncate text-sm font-medium text-ink">{alert.title}</p>
              ) : null}

              <Link
                href={alert.href}
                className={`hover:text-brand-strong ${
                  alert.title ? 'text-xs text-ink-muted' : 'text-sm font-medium text-ink'
                }`}
              >
                {alert.label}
                {alert.symbol ? (
                  <span className="ml-1.5 text-xs uppercase text-ink-muted">{alert.symbol}</span>
                ) : null}
              </Link>

              <p className="text-xs text-ink-muted">
                {alert.direction === 'above' ? 'Au-dessus de' : 'En dessous de'}{' '}
                <span className="tabular text-ink">
                  <Money value={alert.threshold} from={alert.currency} />
                </span>
                {alert.triggeredAt ? (
                  <>
                    {' · '}déclenchée le {alert.triggeredAt}
                    {alert.triggeredPrice !== null ? (
                      <>
                        {' à '}
                        <span className="tabular">
                          <Money value={alert.triggeredPrice} from={alert.currency} />
                        </span>
                      </>
                    ) : null}
                  </>
                ) : null}
              </p>

              {alert.recurring || alert.expiresAt ? (
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  {alert.recurring ? (
                    <Tag icon={<Repeat className="h-2.5 w-2.5" aria-hidden="true" />}>
                      À chaque fois
                    </Tag>
                  ) : null}
                  {alert.expiresAt ? (
                    <Tag icon={<CalendarClock className="h-2.5 w-2.5" aria-hidden="true" />}>
                      Jusqu’au {alert.expiresAt}
                    </Tag>
                  ) : null}
                </div>
              ) : null}

              {alert.note ? (
                <p className="mt-1 border-l-2 border-border-subtle pl-2 text-xs italic leading-relaxed text-ink-muted">
                  {alert.note}
                </p>
              ) : null}
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

/** Pastille de réglage — n'apparaît que lorsqu'elle dit quelque chose. */
function Tag({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-pill border border-border-subtle px-1.5 py-0.5 text-[0.625rem] font-medium text-ink-muted">
      {icon}
      {children}
    </span>
  )
}
