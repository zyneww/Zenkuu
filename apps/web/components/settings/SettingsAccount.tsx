'use client'

import { Loader2, Mail, ShieldCheck, Trash2, UserRound } from 'lucide-react'
import { Field } from '@/components/ui/field'
import { Label } from '@/components/ui/label'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { useEffect, useState, useTransition } from 'react'

import { LoginOverlay } from '@/components/account/LoginOverlay'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  deleteCurrentAccount,
  signOut,
  signOutEverywhere,
  updateHandle,
} from '@/lib/auth-actions'
import { readIdentityCookie } from '@/lib/identity-cookie'
import { usePhrase } from '@/components/locale/ContentProvider'

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
  const t = usePhrase()
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
    return <Skeleton className="h-40 rounded-card bg-surface-muted" aria-hidden="true" />
  }

  if (!identity) {
    return (
      <section className="space-y-4">
        <Heading
          title={t('Compte')}
          description={t('Vous n’êtes pas connecté. Ce n’est pas un obstacle : la liste de suivi et les écrans enregistrés fonctionnent sans compte, rangés dans ce navigateur.')}
        />

        <div className="rounded-card border border-border-subtle bg-surface p-4">
          <p className="text-sm leading-relaxed text-ink-muted">
            Un compte apporte une seule chose, et il faut le dire clairement : la{' '}
            <strong className="font-medium text-ink">{t('portabilité')}</strong>. La même liste sur le
            téléphone et sur l’ordinateur, et la survie à un nettoyage du navigateur. Aucune
            fonction supplémentaire n’en dépend.
          </p>

          {/* Les sept boutons de cette page sont désormais le `Button` de shadcn/ui.
              Ils portaient sept chaînes de classes voisines mais jamais identiques —
              trois hauteurs, deux traitements du `disabled`, et un `hover` qui avait
              divergé sur deux d'entre eux. La variante nomme maintenant l'intention :
              `default` pour l'action de la carte, `outline` pour les gestes neutres,
              `destructive` pour ce qui efface. */}
          <Button className="mt-4" onClick={() => setLoginOpen(true)}>
            <UserRound />
            Se connecter
          </Button>
        </div>

        <LoginOverlay open={loginOpen} onClose={() => setLoginOpen(false)} />
      </section>
    )
  }

  return (
    <section className="space-y-4">
      <Heading
        title={t('Compte')}
        description={t('Ce que ZENKUU sait de vous tient en deux lignes : une adresse et un pseudonyme. Il n’y a ni mot de passe, ni profil, ni identité vérifiée.')}
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
  const t = usePhrase()
  const [draft, setDraft] = useState(handle)
  const [saved, setSaved] = useState(false)
  const [pending, startTransition] = useTransition()

  /* Le bouton reste inerte tant que rien n'a changé : réenregistrer un pseudonyme
     identique consomme un aller-retour serveur pour afficher « Enregistré » sur une
     valeur qui ne l'a jamais cessé. */
  const dirty = draft.trim() !== handle && draft.trim() !== ''

  return (
    <div className="space-y-4 rounded-card border border-border-subtle bg-surface p-4">
      <Field>
        <Label htmlFor="pseudonyme" className="text-xs font-medium text-ink">
          Pseudonyme
        </Label>
        <div className="flex gap-2">
          <Input
            id="pseudonyme"
            size="sm"
            type="text"
            value={draft}
            maxLength={32}
            onChange={(event) => {
              setDraft(event.target.value)
              setSaved(false)
            }}
            aria-label={t('Pseudonyme')}
            className="w-full max-w-xs"
          />
          {/* La roue s'AJOUTE au libellé au lieu de le remplacer, et `shrink-0` fige
              la largeur : un bouton qui perd son mot pendant l'attente ne dit plus ce
              qu'on vient de lui demander, et il rétrécirait en décalant le champ
              voisin. `disabled` empêche le second envoi, ce que l'ancien
              `disabled:opacity-60` écrit à la main ne faisait pas. */}
          <Button
            className="shrink-0"
            disabled={pending || !dirty}
            onClick={() =>
              startTransition(async () => {
                const result = await updateHandle(draft.trim())
                if (result.ok) setSaved(true)
              })
            }
          >
            {pending ? <Loader2 className="animate-spin" /> : null}
            Enregistrer
          </Button>
        </div>
        <span className="mt-1.5 block text-[0.6875rem] text-ink-muted">
          {saved
            ? 'Enregistré. L’initiale de l’en-tête suit.'
            : 'Sert à l’affichage et à l’initiale de l’avatar. Il n’est ni unique ni public.'}
        </span>
      </Field>

      <div>
        {/* Un `<span>` et NON un `Label` : l'adresse n'est pas un champ, c'est du
            texte en lecture seule. Une étiquette qui n'étiquette aucun contrôle est
            annoncée comme telle par une synthèse vocale, qui cherche alors le champ
            associé et n'en trouve pas — c'est pire que pas d'étiquette du tout. */}
        <span className="mb-1.5 block text-xs font-medium text-ink">{t('Adresse électronique')}</span>
        <p className="flex items-center gap-2 text-sm text-ink">
          <Mail className="h-3.5 w-3.5 shrink-0 text-ink-muted" aria-hidden="true" />
          {email}
        </p>
        <p className="mt-1.5 text-[0.6875rem] leading-relaxed text-ink-muted">{t('Elle identifie le compte et ne se modifie donc pas. Se connecter avec une autre adresse ouvre un autre compte, avec sa propre liste.')}</p>
      </div>
    </div>
  )
}

function SessionsCard() {
  const t = usePhrase()
  const [pendingOne, startOne] = useTransition()
  const [pendingAll, startAll] = useTransition()

  return (
    <div className="space-y-3 rounded-card border border-border-subtle bg-surface p-4">
      <div className="space-y-1">
        <h3 className="flex items-center gap-2 text-sm font-medium text-ink">
          <ShieldCheck className="h-4 w-4 text-ink-muted" aria-hidden="true" />
          Sessions
        </h3>
        <p className="text-xs leading-relaxed text-ink-muted">{t('Une session dure soixante jours. « Tout fermer » révoque celles de tous vos appareils, y compris celui-ci — le geste à faire après avoir utilisé un poste partagé.')}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          disabled={pendingOne}
          onClick={() =>
            startOne(async () => {
              await signOut()
              window.location.reload()
            })
          }
        >
          {t('Se déconnecter')}
        </Button>

        <Button
          variant="outline"
          disabled={pendingAll}
          onClick={() =>
            startAll(async () => {
              await signOutEverywhere()
              window.location.reload()
            })
          }
        >
          {t('Tout fermer')}
        </Button>
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
  const t = usePhrase()
  const [pending, startTransition] = useTransition()

  return (
    <div className="space-y-3 rounded-card border border-down/40 bg-surface p-4">
      <div className="space-y-1">
        <h3 className="flex items-center gap-2 text-sm font-medium text-ink">
          <Trash2 className="h-4 w-4 text-down" aria-hidden="true" />{t('Supprimer le compte')}</h3>
        <p className="text-xs leading-relaxed text-ink-muted">{t('Efface le compte, la liste de suivi et les écrans enregistrés. Immédiat et sans période de grâce : conserver trente jours des données que personne ne réclame serait moins protecteur, pas plus.')}</p>
      </div>

      {/*
        ── LE SECOND CLIC PASSE DANS UN `AlertDialog` ─────────────────────────

        Le geste restait un « deux clics », et il le reste. Ce qui change est CE QUI
        SÉPARE les deux : la paire de boutons apparaissait EN PLACE, sous la carte,
        et pouvait donc être ratée — on cliquait « Supprimer mon compte », la page ne
        bougeait pas visiblement, et un second clic au même endroit tombait sur
        « Confirmer ».

        `AlertDialog` est le composant fait pour ce cas précis, et il diffère de
        `Dialog` sur trois points qui comptent tous ici :

          · IL NE SE FERME PAS AU CLIC EXTÉRIEUR ni à un `Échap` distrait. Une
            destruction irréversible ne doit pas se refermer par accident — mais elle
            ne doit pas non plus s'exécuter par accident, et c'est le sens de ce
            verrouillage : on sort par « Annuler », explicitement.
          · IL PREND LE FOCUS SUR L'ANNULATION, pas sur l'action. Le geste réflexe —
            Entrée sur une fenêtre qui vient de s'ouvrir — annule au lieu de détruire.
          · IL S'ANNONCE `role="alertdialog"`, ce qui fait lire titre ET description
            d'un bloc par une synthèse vocale, là où un `dialog` ordinaire ne garantit
            que le titre.

        L'état `armed` disparaît avec lui : c'est Radix qui tient l'ouverture.
      */}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          {/* Bordé et rouge, pas plein. L'aplat est réservé au bouton qui EXÉCUTE,
              dans la fenêtre : c'est la seule différence visuelle entre « j'ouvre la
              confirmation » et « je supprime », et elle doit se voir. */}
          <Button variant="outline" data-destructive>
            {t('Supprimer mon compte')}
          </Button>
        </AlertDialogTrigger>

        <AlertDialogContent className="border-border-subtle bg-overlay">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('Supprimer définitivement ce compte ?')}</AlertDialogTitle>
            <AlertDialogDescription className="leading-relaxed">{t('Le compte, la liste de suivi et les écrans enregistrés seront effacés immédiatement. Cette action est irréversible.')}</AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>{t('Annuler')}</AlertDialogCancel>
            {/*
              `asChild` sur l'action : `AlertDialogAction` ferme la fenêtre de
              lui-même au clic, et son bouton par défaut n'a ni la variante
              destructrice ni l'état d'attente. On lui prête donc le nôtre.

              ⚠️ `onClick` et non `onSelect` : Radix ferme APRÈS avoir laissé passer
              l'événement, et la navigation dure ci-dessous emporte de toute façon la
              page — l'ordre des deux n'a pas d'incidence observable.
            */}
            <AlertDialogAction asChild>
              <Button
                variant="destructive"
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
              >
                {pending ? <Loader2 className="animate-spin" /> : null}
                Confirmer la suppression
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
