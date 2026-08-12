'use client'

import { BookmarkPlus, Trash2 } from 'lucide-react'
import { useEffect, useState, useTransition } from 'react'

import { Link } from '@/i18n/navigation'
import {
  listSavedScreens,
  removeScreen,
  storeScreen,
  type ScreenCriteria,
  type SavedScreenRow,
} from '@/lib/screen-actions'

/**
 * Barre des écrans de screener enregistrés.
 *
 * ── POURQUOI LA LISTE EST CHARGÉE APRÈS LE RENDU, ET NON PASSÉE EN PROPRIÉTÉ ──
 *
 * `/screener` est une page prérendue et mise en cache cinq minutes (elle apparaît
 * comme statique dans la sortie de build). Y injecter des données propres à
 * l'utilisateur la rendrait dynamique pour TOUT LE MONDE : chaque visiteur anonyme
 * paierait un rendu serveur pour une barre qu'il ne verra jamais, sur la page la plus
 * lourde du site en calcul client.
 *
 * La liste est donc demandée après l'hydratation, par une action serveur. Le coût est
 * un léger décalage d'apparition ; le gain est que la page reste servie depuis le
 * cache pour les 99 % de visiteurs qui n'ont pas d'écran enregistré.
 */
export function SavedScreens({
  criteria,
  onApply,
}: {
  /** Critères courants du screener — ce qui sera enregistré. */
  criteria: ScreenCriteria
  onApply: (criteria: ScreenCriteria) => void
}) {
  const [screens, setScreens] = useState<SavedScreenRow[]>([])
  const [naming, setNaming] = useState(false)
  const [draft, setDraft] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    // Sans session ni abonnement, l'action renvoie un tableau vide : la barre reste
    // alors réduite à son bouton d'enregistrement, qui explique au clic.
    void listSavedScreens().then(setScreens)
  }, [])

  function save() {
    const name = draft.trim()
    if (name === '') return

    startTransition(async () => {
      const result = await storeScreen(name, criteria)

      if (!result.ok) {
        setMessage(
          result.reason === 'not-pro'
            ? 'Les écrans enregistrés font partie de Zenkuu Pro.'
            : result.reason === 'signed-out'
              ? 'Connectez-vous pour enregistrer un écran.'
              : 'L’enregistrement a échoué.',
        )
        return
      }

      setMessage(null)
      setNaming(false)
      setDraft('')
      setScreens(await listSavedScreens())
    })
  }

  function drop(id: number) {
    startTransition(async () => {
      await removeScreen(id)
      setScreens(await listSavedScreens())
    })
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {screens.map((screen) => (
          <span
            key={screen.id}
            className="inline-flex items-center rounded-card border border-border-subtle bg-surface"
          >
            <button
              type="button"
              onClick={() => onApply(screen.criteria)}
              className="px-3 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:text-brand-strong"
            >
              {screen.name}
            </button>
            <button
              type="button"
              onClick={() => drop(screen.id)}
              disabled={pending}
              title={`Supprimer l’écran ${screen.name}`}
              aria-label={`Supprimer l’écran ${screen.name}`}
              className="border-l border-border-subtle px-1.5 py-1.5 text-ink-muted transition-colors hover:text-down disabled:opacity-50"
            >
              <Trash2 className="h-3 w-3" aria-hidden="true" />
            </button>
          </span>
        ))}

        {naming ? (
          <form
            onSubmit={(event) => {
              event.preventDefault()
              save()
            }}
            className="inline-flex items-center gap-1"
          >
            <input
              autoFocus
              value={draft}
              maxLength={40}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Nom de l’écran"
              aria-label="Nom de l’écran à enregistrer"
              className="w-40 rounded-card border border-border-subtle bg-surface px-2 py-1.5 text-xs text-ink placeholder:text-ink-muted focus:border-brand focus:outline-none"
            />
            <button
              type="submit"
              disabled={pending}
              className="bg-brand px-3 py-1.5 text-xs font-medium text-on-brand transition-colors hover:bg-brand-strong disabled:opacity-60"
            >
              Enregistrer
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setNaming(true)}
            className="inline-flex items-center gap-1.5 rounded-card border border-dashed border-border-subtle px-3 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:border-brand hover:text-ink"
          >
            <BookmarkPlus className="h-3.5 w-3.5" aria-hidden="true" />
            Enregistrer cet écran
          </button>
        )}
      </div>

      {message ? (
        <p role="status" className="text-xs text-ink-muted">
          {message}{' '}
          <Link href="/tarifs" className="text-brand hover:text-brand-strong">
            Voir l’offre
          </Link>
        </p>
      ) : null}
    </div>
  )
}
