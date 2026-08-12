'use client'

import { Bell } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { useEffect, useRef, useState, useTransition } from 'react'

import { createPriceAlert, type AlertActionResult } from '@/lib/alert-actions'

/**
 * Création d'une alerte de prix depuis la fiche d'un actif.
 *
 * ── POURQUOI LE SEUIL EST PRÉ-REMPLI, ET POURQUOI À ±5 % ──────────────────────
 *
 * Un champ vide oblige à connaître le cours de tête et à le retaper. Le pré-remplir
 * au cours EXACT ne vaut guère mieux : l'alerte se déclencherait au premier passage
 * de la tâche. Un écart de 5 % est assez large pour ne pas se déclencher tout de
 * suite, assez proche pour rester crédible sur un actif volatil — et surtout la
 * valeur reste modifiable, ce n'est qu'un point de départ.
 *
 * ── POURQUOI LA DEVISE VIENT DE LA FICHE ──────────────────────────────────────
 *
 * Le seuil est enregistré AVEC sa devise, et cette devise doit être celle du cours
 * affiché sous les yeux de l'utilisateur au moment où il saisit son chiffre. La
 * déduire d'un réglage global la ferait diverger de ce qu'il voit — l'alerte serait
 * juste dans le code et fausse pour lui.
 */
export function AlertButton({
  assetClass,
  assetId,
  label,
  symbol,
  currency,
  price,
  path,
  available,
}: {
  assetClass: string
  assetId: string
  label: string
  symbol?: string
  currency: string
  price: number
  path: string
  /** Faux sans session, sans base ou sans service d'envoi : le bouton devient un lien. */
  available: boolean
}) {
  const [open, setOpen] = useState(false)
  const [direction, setDirection] = useState<'above' | 'below'>('above')
  const [threshold, setThreshold] = useState(() => suggest(price, 'above'))
  const [feedback, setFeedback] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [pending, startTransition] = useTransition()
  const container = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    const onPointerDown = (event: MouseEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  if (!available) {
    return (
      <Link
        href="/alertes"
        className="inline-flex items-center gap-1.5 rounded-control border border-border-subtle px-3 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:border-brand hover:text-ink"
      >
        <Bell className="h-3.5 w-3.5" aria-hidden="true" />
        Créer une alerte
      </Link>
    )
  }

  function pick(next: 'above' | 'below') {
    setDirection(next)
    // Le seuil suggéré suit le sens choisi : passer de « au-dessus » à « en dessous »
    // en gardant un seuil supérieur au cours donnerait une alerte immédiatement vraie.
    setThreshold(suggest(price, next))
  }

  function submit(event: React.FormEvent) {
    event.preventDefault()
    setFeedback(null)

    const value = Number(threshold.replace(',', '.'))

    startTransition(async () => {
      const result: AlertActionResult = await createPriceAlert({
        assetClass,
        assetId,
        label,
        ...(symbol ? { symbol } : {}),
        direction,
        threshold: value,
        currency: currency.toLowerCase(),
        path,
      })

      if (!result.ok) {
        setFeedback(reasonLabel(result))
        return
      }

      setDone(true)
      setOpen(false)
      window.setTimeout(() => setDone(false), 2500)
    })
  }

  return (
    <div ref={container} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`inline-flex items-center gap-1.5 rounded-control border px-3 py-1.5 text-xs font-medium transition-colors ${
          done
            ? 'border-brand bg-brand-soft text-brand-strong'
            : 'border-border-subtle text-ink-muted hover:border-brand hover:text-ink'
        }`}
      >
        <Bell className="h-3.5 w-3.5" aria-hidden="true" />
        {done ? 'Alerte créée' : 'Créer une alerte'}
      </button>

      {open ? (
        <form
          onSubmit={submit}
          className="absolute right-0 z-30 mt-1 w-72 space-y-3 rounded-card border border-border-subtle bg-overlay p-4 text-left shadow-overlay"
        >
          <p className="text-sm font-medium text-ink">Me prévenir par courriel si</p>

          <div className="flex gap-1" role="group" aria-label="Sens du franchissement">
            {(['above', 'below'] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => pick(value)}
                aria-pressed={direction === value}
                className={`flex-1 rounded-control border px-2 py-1.5 text-xs font-medium transition-colors ${
                  direction === value
                    ? 'border-brand bg-brand text-on-brand'
                    : 'border-border-subtle text-ink-muted hover:border-brand hover:text-ink'
                }`}
              >
                {value === 'above' ? 'monte au-dessus de' : 'descend sous'}
              </button>
            ))}
          </div>

          <label className="block">
            <span className="mb-1 block text-xs text-ink-muted">
              Seuil, en {currency.toUpperCase()}
            </span>
            <input
              type="text"
              inputMode="decimal"
              value={threshold}
              onChange={(event) => setThreshold(event.target.value)}
              className="tabular w-full rounded-card border border-border-subtle bg-surface px-2.5 py-1.5 text-sm text-ink focus:border-brand focus:outline-none"
            />
          </label>

          <p className="text-xs text-ink-muted">
            Cours actuel : <span className="tabular text-ink">{price}</span>{' '}
            {currency.toUpperCase()}
          </p>

          <button
            type="submit"
            disabled={pending}
            className="w-full bg-brand px-3 py-2 text-sm font-medium text-on-brand transition-colors hover:bg-brand-strong disabled:opacity-60"
          >
            {pending ? 'Enregistrement…' : 'Créer l’alerte'}
          </button>

          {feedback ? (
            <p role="status" className="text-xs leading-snug text-ink-muted">
              {feedback}{' '}
              <Link href="/tarifs" className="text-brand hover:text-brand-strong">
                Voir Zenkuu Pro
              </Link>
            </p>
          ) : null}
        </form>
      ) : null}
    </div>
  )
}

/**
 * Seuil suggéré : le cours ±5 %.
 *
 * La précision suit l'ordre de grandeur — six décimales sous l'unité, deux au-dessus.
 * Un seuil affiché « 0.00 » sur un jeton coté 0,000042 serait inutilisable, et
 * « 43125.938291 » sur un indice serait du bruit.
 */
function suggest(price: number, direction: 'above' | 'below'): string {
  const target = direction === 'above' ? price * 1.05 : price * 0.95
  return target < 1 ? target.toFixed(6) : target.toFixed(2)
}

function reasonLabel(result: Extract<AlertActionResult, { ok: false }>): string {
  switch (result.reason) {
    case 'limit-reached':
      return `Vous avez déjà ${result.limit} alertes armées, le maximum de votre offre.`
    case 'mailer-disabled':
      return 'L’envoi de courriel n’est pas configuré sur cette instance : les alertes ne peuvent pas être notifiées.'
    case 'db-disabled':
      return 'La base de données n’est pas configurée : l’alerte ne serait pas conservée.'
    case 'signed-out':
      return 'Votre session a expiré — reconnectez-vous.'
    case 'auth-disabled':
      return 'Les comptes ne sont pas configurés sur cette instance.'
    case 'invalid':
      return 'Ce seuil n’est pas un montant valide.'
    default:
      return 'L’enregistrement a échoué. Réessayez.'
  }
}
