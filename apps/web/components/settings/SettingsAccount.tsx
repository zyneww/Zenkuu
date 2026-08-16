'use client'

import { Loader2, LogOut, Mail, ShieldCheck, Trash2, UserRound } from 'lucide-react'
import { useEffect, useState, useTransition } from 'react'

import { LoginOverlay } from '@/components/account/LoginOverlay'
import {
  deleteCurrentAccount,
  signOut,
  signOutEverywhere,
  updateHandle,
} from '@/lib/auth-actions'
import { readIdentityCookie } from '@/lib/identity-cookie'

/**
 * Rubrique « Compte » des paramètres.
 *
 * ── CE QU'ELLE MONTRE, ET CE QU'ELLE NE MONTRE PLUS ───────────────────────────
 *
 * Elle affichait un résumé du profil tenu par un fournisseur d'identité tiers, et
 * renvoyait à SES écrans pour tout le reste — mot de passe, connexions sociales,
 * appareils. Ces écrans n'existent plus, et la plupart n'ont plus d'objet : la
 * connexion se fait par code à usage unique, il n'y a donc ni mot de passe à changer
 * ni fournisseur tiers à révoquer.
 *
 * Il reste quatre gestes, et ils sont tous ici : renommer, se déconnecter, fermer
 * toutes les sessions, supprimer le compte.
 *
 * ── POURQUOI ELLE DOUBLE LE MENU DE L'EN-TÊTE ─────────────────────────────────
 *
 * Le menu de compte porte les mêmes actions, et c'est assumé. Un menu déroulant est
 * fait pour le geste RAPIDE — on l'ouvre en connaissant déjà ce qu'on y cherche. Une
 * page de paramètres est faite pour la LECTURE : elle nomme chaque option, explique
 * ce qu'elle fait, et se trouve par la navigation plutôt que par mémoire. Les deux
 * appellent les mêmes actions serveur, il n'y a donc qu'une seule vérité.
 */
export function SettingsAccount() {
  const [identity, setIdentity] = useState<{ handle: string; email: string } | null | undefined>(
    undefined,
  )
  const [loginOpen, setLoginOpen] = useState(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIdentity(readIdentityCookie())
  }, [])

  if (identity === undefined) {
    /* Place réservée le temps de lire le cookie — voir `AccountControl`, qui applique
       la même règle pour la même raison : le HTML initial est mis en cache et partagé
       par tous les visiteurs, il ne peut donc pas connaître la session. */
    return <div className="h-40 animate-pulse rounded-card bg-surface-muted" aria-hidden="true" />
  }

  if (!identity) {
    return (
      <section className="space-y-4">
        <Heading
          title="Compte"
          description="Vous n’êtes pas connecté. Ce n’est pas un obstacle : la liste de suivi, les alertes et les écrans enregistrés fonctionnent sans compte, rangés dans ce navigateur."
        />

        <div className="rounded-card border border-border-subtle bg-surface p-4">
          <p className="text-sm leading-relaxed text-ink-muted">
            Un compte apporte une seule chose, et il faut le dire clairement : la{' '}
            <strong className="font-medium text-ink">portabilité</strong>. La même liste sur le
            téléphone et sur l’ordinateur, et la survie à un nettoyage du navigateur. Aucune
            fonction supplémentaire n’en dépend.
          </p>

          <button
            type="button"
            onClick={() => setLoginOpen(true)}
            className="mt-4 inline-flex h-9 items-center gap-2 rounded-control bg-brand px-4 text-sm font-medium text-on-brand transition-colors hover:bg-brand-strong"
          >
            <UserRound className="h-4 w-4" aria-hidden="true" />
            Se connecter
          </button>
        </div>

        <LoginOverlay open={loginOpen} onClose={() => setLoginOpen(false)} />
      </section>
    )
  }

  return (
    <section className="space-y-4">
      <Heading
        title="Compte"
        description="Ce que ZENKUU sait de vous tient en deux lignes : une adresse et un pseudonyme. Il n’y a ni mot de passe, ni profil, ni identité vérifiée."
      />

      <HandleCard handle={identity.handle} email={identity.email} />
      <SessionsCard />
      <DangerCard />
    </section>
  )
}

function Heading({ title, description }: { title: string; description: string }) {
  return (
    <header className="space-y-1.5">
      <h2 className="display-sm text-ink">{title}</h2>
      <p className="max-w-2xl text-sm leading-relaxed text-ink-muted">{description}</p>
    </header>
  )
}

/**
 * Pseudonyme et adresse.
 *
 * L'ADRESSE N'EST PAS MODIFIABLE, et l'encadré le dit plutôt que de griser un champ :
 * elle EST l'identifiant du compte, la changer reviendrait à en changer. Pour passer
 * à une autre adresse, on se connecte avec — ce qui crée un second compte, et c'est
 * la description honnête de ce qui se passe.
 */
function HandleCard({ handle, email }: { handle: string; email: string }) {
  const [draft, setDraft] = useState(handle)
  const [saved, setSaved] = useState(false)
  const [pending, startTransition] = useTransition()

  const dirty = draft.trim() !== handle && draft.trim() !== ''

  return (
    <div className="space-y-4 rounded-card border border-border-subtle bg-surface p-4">
      <label className="block">
        <span className="mb-1.5 block text-xs font-medium text-ink">Pseudonyme</span>
        <div className="flex gap-2">
          <input
            type="text"
            value={draft}
            maxLength={32}
            onChange={(event) => {
              setDraft(event.target.value)
              setSaved(false)
            }}
            className="h-9 w-full max-w-xs rounded-control border border-border-subtle bg-canvas px-2.5 text-sm text-ink outline-none focus:border-brand"
          />
          <button
            type="button"
            disabled={!dirty || pending}
            onClick={() =>
              startTransition(async () => {
                const result = await updateHandle(draft.trim())
                if (result.ok) setSaved(true)
              })
            }
            className="flex h-9 shrink-0 items-center gap-2 rounded-control bg-brand px-3 text-sm font-medium text-on-brand transition-colors hover:bg-brand-strong disabled:opacity-50"
          >
            {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : null}
            Enregistrer
          </button>
        </div>
        <span className="mt-1.5 block text-[0.6875rem] text-ink-muted">
          {saved
            ? 'Enregistré. L’initiale de l’en-tête suit.'
            : 'Sert à l’affichage et à l’initiale de l’avatar. Il n’est ni unique ni public.'}
        </span>
      </label>

      <div>
        <span className="mb-1.5 block text-xs font-medium text-ink">Adresse électronique</span>
        <p className="flex items-center gap-2 text-sm text-ink">
          <Mail className="h-3.5 w-3.5 shrink-0 text-ink-muted" aria-hidden="true" />
          {email}
        </p>
        <p className="mt-1.5 text-[0.6875rem] leading-relaxed text-ink-muted">
          Elle identifie le compte et ne se modifie donc pas. Se connecter avec une autre adresse
          ouvre un autre compte, avec sa propre liste.
        </p>
      </div>
    </div>
  )
}

function SessionsCard() {
  const [pendingOne, startOne] = useTransition()
  const [pendingAll, startAll] = useTransition()

  return (
    <div className="space-y-3 rounded-card border border-border-subtle bg-surface p-4">
      <div className="space-y-1">
        <h3 className="flex items-center gap-2 text-sm font-medium text-ink">
          <ShieldCheck className="h-4 w-4 text-ink-muted" aria-hidden="true" />
          Sessions
        </h3>
        <p className="text-xs leading-relaxed text-ink-muted">
          Une session dure soixante jours. « Tout fermer » révoque celles de tous vos appareils, y
          compris celui-ci — le geste à faire après avoir utilisé un poste partagé.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pendingOne}
          onClick={() =>
            startOne(async () => {
              await signOut()
              window.location.reload()
            })
          }
          className="inline-flex h-9 items-center gap-2 rounded-control border border-border-subtle px-3 text-sm font-medium text-ink transition-colors hover:border-brand disabled:opacity-50"
        >
          <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
          Se déconnecter
        </button>

        <button
          type="button"
          disabled={pendingAll}
          onClick={() =>
            startAll(async () => {
              await signOutEverywhere()
              window.location.reload()
            })
          }
          className="inline-flex h-9 items-center gap-2 rounded-control border border-border-subtle px-3 text-sm font-medium text-ink-muted transition-colors hover:border-brand hover:text-ink disabled:opacity-50"
        >
          Tout fermer
        </button>
      </div>
    </div>
  )
}

/**
 * Suppression — deux clics, et le second nomme ce qui disparaît.
 *
 * Pas de `confirm()` natif : il bloque le fil d'exécution, ne se met pas au thème du
 * site, et surtout n'énumère pas ce qui va être effacé. Le second bouton, lui, arrive
 * après une phrase qui le fait.
 */
function DangerCard() {
  const [armed, setArmed] = useState(false)
  const [pending, startTransition] = useTransition()

  return (
    <div className="space-y-3 rounded-card border border-down/40 bg-surface p-4">
      <div className="space-y-1">
        <h3 className="flex items-center gap-2 text-sm font-medium text-ink">
          <Trash2 className="h-4 w-4 text-down" aria-hidden="true" />
          Supprimer le compte
        </h3>
        <p className="text-xs leading-relaxed text-ink-muted">
          Efface le compte, la liste de suivi, les alertes et les écrans enregistrés. Immédiat et
          sans période de grâce : conserver trente jours des données que personne ne réclame serait
          moins protecteur, pas plus.
        </p>
      </div>

      {armed ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await deleteCurrentAccount()
                /* Navigation DURE et non `router.push` : le compte vient d'être
                   effacé, ses deux cookies avec lui, et plusieurs arbres rendus
                   côté serveur portent encore son état. Un rechargement complet
                   est la seule façon de garantir qu'il n'en subsiste rien à
                   l'écran. */
                // eslint-disable-next-line @next/next/no-location-assign-relative-destination
                window.location.href = '/'
              })
            }
            className="inline-flex h-9 items-center gap-2 rounded-control bg-down px-3 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : null}
            Confirmer la suppression
          </button>
          <button
            type="button"
            onClick={() => setArmed(false)}
            className="inline-flex h-9 items-center rounded-control border border-border-subtle px-3 text-sm font-medium text-ink-muted transition-colors hover:text-ink"
          >
            Annuler
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setArmed(true)}
          className="inline-flex h-9 items-center gap-2 rounded-control border border-down/40 px-3 text-sm font-medium text-down transition-colors hover:bg-down-soft"
        >
          Supprimer mon compte
        </button>
      )}
    </div>
  )
}
