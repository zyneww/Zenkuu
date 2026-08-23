'use client'

import {
  Bell,
  Check,
  Copy,
  LayoutGrid,
  Loader2,
  ListFilter,
  LogOut,
  Settings,
  Shield,
  Star,
  Trash2,
  User,
  UserRound,
} from 'lucide-react'
import { useEffect, useRef, useState, useTransition } from 'react'

import { Link } from '@/i18n/navigation'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { IconButton } from '@/components/ui/IconButton'
import { Input } from '@/components/ui/input'
import { initialOf, readIdentityCookie } from '@/lib/identity-cookie'
import type { AuthMode } from '@/components/account/AuthOverlay'
import { useHoverDismiss } from '@/components/nav/useHoverDismiss'
import { usePresence } from '@/components/nav/usePresence'
import { DisplaySettings } from '@/components/settings/DisplaySettings'
import type { PreferenceTab } from '@/components/settings/PreferenceOverlay'
import { usePhrase } from '@/components/locale/ContentProvider'
import {
  deleteCurrentAccount,
  signOut,
  signOutEverywhere,
  updateHandle,
} from '@/lib/auth-actions'

/**
 * Le widget de compte de l'en-tête — DERNIER bouton de la barre, et le seul réglage.
 *
 * ── CE QU'IL REMPLACE ─────────────────────────────────────────────────────────
 *
 * Trois composants distincts occupaient cette place : deux liens « Connexion » et
 * « Inscription », un avatar rendu par le fournisseur d'identité tiers, et un menu
 * qui appelait ses écrans. Le fournisseur a été retiré ; l'état de session se lit
 * désormais dans un COOKIE D'AFFICHAGE, après montage — voir `lib/identity-cookie.ts`
 * pour la raison, qui tient au cache de rendu du site et non à un choix de style.
 *
 * Une quatrième pièce vient de le rejoindre : la ROUE DENTÉE, qui portait langue,
 * devise, thème et verre dépoli dans son propre menu. Elle posait au visiteur la
 * même question que ce bouton-ci — « où sont mes réglages ? » — et il fallait ouvrir
 * les deux pour y répondre. Voir `components/settings/DisplaySettings.tsx`.
 *
 * ── LA CONNEXION SE FAIT DANS LE PANNEAU, PLUS DANS UNE MODALE ────────────────
 *
 * Cliquer « Se connecter » ouvrait une fenêtre plein écran, voilée, qu'il fallait
 * refermer. Pour un champ d'adresse et un bouton, c'était disproportionné : le geste
 * interrompait la page au lieu de s'y ajouter.
 *
 * Le formulaire descend donc SOUS le bouton, dans le même panneau que les réglages
 * d'affichage. Cela supprime au passage la contrainte qui obligeait `NavBar` à
 * héberger l'état d'ouverture : le `<header>` porte un `backdrop-filter`, ce qui
 * fait de lui le bloc conteneur de tout descendant `position: fixed` — une modale
 * rendue ici s'ancrait donc à la bande de l'en-tête au lieu de la fenêtre. Un panneau
 * `absolute` n'a jamais eu ce problème ; il s'ancre au bouton, ce qui est justement
 * ce qu'on veut.
 *
 * ── TROIS FORMES, SELON CE QUE LE SITE SAIT DU VISITEUR ───────────────────────
 *
 *   Connecté          un disque portant l'initiale du pseudonyme, puis le menu complet
 *   Déconnecté        une silhouette et le mot « Se connecter », puis le formulaire
 *   Sans connexion    une roue dentée, puis les seuls réglages d'affichage
 *
 * Le troisième cas n'est pas théorique : sans base de données ni service d'envoi, la
 * connexion est impossible. Le bouton ne peut alors plus s'appeler « Se connecter » —
 * mais il doit rester, sous une autre icône, faute de quoi ce déploiement-là perdrait
 * TOUT accès à la langue, à la devise et au thème avec le retrait de la roue dentée.
 *
 * Pas de photo dans le disque : le site n'en demande pas, et un avatar par défaut
 * générique n'apprendrait rien de plus qu'une lettre — tout en coûtant une requête.
 */

export interface AccountSummary {
  handle: string
  email: string
}

export function AccountControl({
  available,
  onOpenPreference,
  onOpenAuth,
}: {
  /**
   * La connexion est-elle possible sur cette instance ?
   *
   * Faux sans base ou sans service d'envoi. Le formulaire disparaît alors du panneau —
   * proposer un champ dont on sait qu'il échouera est pire que ne rien proposer — mais
   * le panneau, lui, reste : il porte les réglages d'affichage. Un visiteur déjà
   * connecté garde son menu entier ; sa session, elle, existe.
   */
  available: boolean
  onOpenPreference: (tab: PreferenceTab) => void
  /** Ouvre la fenêtre d'authentification sur l'intention demandée. */
  onOpenAuth: (mode: AuthMode) => void
}) {
  const t = usePhrase()
  const [menuOpen, setMenuOpen] = useState(false)

  /*
   * `undefined` = pas encore lu, `null` = déconnecté.
   *
   * Les trois états sont distincts et il en faut trois : pendant le premier rendu on
   * ne sait RIEN, et afficher « Se connecter » à ce moment-là le ferait clignoter
   * vers un avatar chez tous ceux qui ont une session. On réserve la place, muette,
   * jusqu'à la lecture du cookie — laquelle est synchrone et se fait dans l'effet qui
   * suit immédiatement le montage.
   */
  const [account, setAccount] = useState<AccountSummary | null | undefined>(undefined)
  const rootRef = useRef<HTMLDivElement>(null)
  const { state, mounted, onTransitionEnd } = usePresence(menuOpen)

  /*
   * Le curseur qui s'éloigne referme le panneau — MÊME s'il contient un formulaire.
   *
   * Le crochet vérifie à l'échéance de son sursis si le clavier travaille encore à
   * l'intérieur : quelqu'un qui tape son adresse ne se voit donc pas fermer le
   * panneau sous les doigts parce que sa souris a dérivé. Voir `useHoverDismiss`.
   */
  const hoverDismiss = useHoverDismiss(() => setMenuOpen(false), menuOpen)

  useEffect(() => {
    const identity = readIdentityCookie()
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAccount(identity ? { handle: identity.handle, email: identity.email } : null)
  }, [])

  useEffect(() => {
    if (!menuOpen) return

    function onPointerDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setMenuOpen(false)
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setMenuOpen(false)
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [menuOpen])

  // Place réservée tant que le cookie n'a pas été lu — voir l'état ci-dessus.
  if (account === undefined) return <span className="h-9 w-9 shrink-0" aria-hidden="true" />

  const close = () => setMenuOpen(false)
  const toggle = () => setMenuOpen((value) => !value)

  /*
   * Le BOUTON, dans ses trois formes. Il commande toujours le même panneau, ce qui
   * est la raison d'être de cette refonte : une seule entrée de réglages dans la barre.
   */
  /*
   * ── LES TROIS DÉCLENCHEURS PASSENT SUR LE SYSTÈME ───────────────────────────
   *
   * Ils portaient trois chaînes de classes voisines, chacune avec sa propre bascule
   * ouvert/fermé. La variante de shadcn/ui porte cette bascule à leur place :
   * `default` quand le panneau est ouvert — l'état actif a le droit d'être plein —,
   * `outline` sinon. Une valeur au lieu de six lignes de ternaire, et un anneau de
   * focus qu'aucune des trois n'avait.
   *
   * L'AVATAR reste une pastille RONDE : c'est ce qui le distingue au premier coup
   * d'œil des deux autres formes, et `rounded-full` est le seul écart de dessin que
   * la variante ne couvre pas.
   */
  const triggerVariant = menuOpen ? 'default' : 'outline'

  const trigger = account ? (
    <Button
      size="sm"
      variant={triggerVariant}
      onClick={toggle}
      aria-expanded={menuOpen}
      aria-haspopup="menu"
      aria-label={`Compte de ${account.handle}`}
      className="size-9 shrink-0 rounded-full p-0 text-xs uppercase"
    >
      {initialOf(account.handle)}
    </Button>
  ) : available ? (
    <Button
      size="sm"
      variant={triggerVariant}
      onClick={toggle}
      aria-expanded={menuOpen}
      aria-haspopup="menu"
      className="h-9 shrink-0"
    >
      <User />
      {/* Le mot disparaît sous `sm`, l'icône reste : sur 375 pixels, la barre porte
          déjà le logo et la recherche. */}
      <span className="hidden sm:inline">{t('Se connecter')}</span>
    </Button>
  ) : (
    /* `Button` et non `IconButton` malgré l'absence de libellé : les deux autres
       formes de ce déclencheur basculent en `default` à l'ouverture du panneau, et
       il faut que les trois le fassent ensemble. `IconButton` fige sa variante à
       `ghost` par défaut et ne porte pas cet état « ouvert ».

       ⚠️ `size="icon-sm"` et non `size="sm"` : shadcn/ui sépare les deux échelles,
       et un bouton sans libellé posé en `sm` prendrait la largeur d'un bouton à
       texte — un rectangle de 9 pixels de haut sur trente de large. */
    <Button
      size="icon-sm"
      variant={triggerVariant}
      onClick={toggle}
      aria-label={t('Réglages d’affichage')}
      aria-expanded={menuOpen}
      aria-haspopup="menu"
      className="size-9 shrink-0"
    >
      <Settings />
    </Button>
  )

  return (
    <div ref={rootRef} className="relative" {...hoverDismiss}>
      {trigger}

      {mounted ? (
        <div
          role="menu"
          aria-label={account ? 'Compte' : 'Connexion et réglages'}
          data-state={state}
          onTransitionEnd={onTransitionEnd}
          /*
            288 pixels dans les deux cas — la largeur du panneau de compte d'origine,
            et celle qu'il faut au formulaire pour qu'une adresse électronique tienne
            sans se tronquer dans son champ.

            `max-h` + défilement : connecté, le panneau porte l'en-tête de compte,
            quatre liens, les réglages d'affichage et trois actions. Sur un portable
            de treize pouces en paysage, cela dépasse la hauteur utile — et un panneau
            dont le bas est hors de l'écran cache sa propre déconnexion.
          */
          className="menu-panel scrollbar-none absolute right-0 top-full z-50 mt-2 max-h-[calc(100vh-5rem)] w-72 overflow-y-auto rounded-card border border-border-subtle bg-overlay shadow-overlay"
        >
          {account ? (
            <>
              <AccountHeader account={account} />

              <div className="border-t border-border-subtle p-1.5">
                <MenuLink href="/tableau-de-bord" icon={<LayoutGrid className="h-4 w-4" />} onNavigate={close}>{t('Vue d’ensemble')}</MenuLink>
                <MenuLink href="/suivi" icon={<Star className="h-4 w-4" />} onNavigate={close}>{t('Liste de suivi')}</MenuLink>
                <MenuLink href="/alertes" icon={<Bell className="h-4 w-4" />} onNavigate={close}>{t('Alertes de prix')}</MenuLink>
                <MenuLink href="/screener" icon={<ListFilter className="h-4 w-4" />} onNavigate={close}>{t('Écrans enregistrés')}</MenuLink>
              </div>
            </>
          ) : available ? (
            /*
              DEUX BOUTONS, ET NON UN CHAMP D'ADRESSE.

              Le panneau ouvrait directement le formulaire. Le raccourci se défendait —
              il n'existe qu'un seul chemin d'authentification — mais il posait au
              visiteur une question qu'il n'avait pas envisagée : personne n'arrive en
              pensant « je veux saisir une adresse », on arrive en pensant « je veux mon
              compte » ou « je veux en créer un ». Les deux boutons nomment ces deux
              intentions, et la fenêtre qu'ils ouvrent porte le formulaire.

              Le panneau se referme À L'OUVERTURE de la fenêtre : le laisser derrière
              une modale afficherait deux surfaces flottantes superposées, et il se
              refermerait de toute façon dès que la souris s'en éloignerait pour aller
              vers le formulaire.
            */
            <div className="space-y-2 p-3">
              <Button
                size="sm"
                onClick={() => {
                  close()
                  onOpenAuth('signin')
                }}
                className="w-full"
              >
                Connexion
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  close()
                  onOpenAuth('signup')
                }}
                className="w-full"
              >
                Inscription
              </Button>

              {/* Ce que la connexion apporte — et il faut le dire ICI, à l'endroit où
                  la question se pose. Sans cette phrase, le visiteur suppose qu'on lui
                  demande de s'inscrire pour utiliser le site, alors que la liste de
                  suivi et les alertes fonctionnent déjà sans compte. */}
              <p className="pt-0.5 text-[0.6875rem] leading-snug text-ink-muted">
                Un compte n’est <strong className="font-medium text-ink">pas nécessaire</strong> pour
                suivre un actif ou armer une alerte. Il sert à retrouver la même liste sur un autre
                appareil.
              </p>
            </div>
          ) : null}

          {/* Les réglages d'affichage ferment TOUJOURS la rangée, dans les trois
              formes du panneau. C'est ce qui fait de ce bouton la seule entrée de
              réglages de la barre. */}
          <div className={account || available ? 'border-t border-border-subtle' : ''}>
            <DisplaySettings onOpenPreference={onOpenPreference} onNavigate={close} />
          </div>

          {account ? (
            <div className="border-t border-border-subtle p-1.5">
              <SecurityRow onDone={close} />
              <SignOutRow />
              <DangerRow />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

/**
 * En-tête du menu : pseudonyme modifiable, adresse copiable.
 *
 * ── POURQUOI LE PSEUDONYME SE MODIFIE ICI, ET PAS SUR UNE PAGE ────────────────
 *
 * C'est le seul champ de profil que le site possède. Lui consacrer une page
 * « Profil » reviendrait à ouvrir un écran pour une ligne de texte, et à créer une
 * route de plus à traduire, à indexer et à tenir. L'édition se fait donc sur place.
 *
 * L'ADRESSE, elle, n'est pas modifiable — elle EST l'identifiant du compte, et la
 * changer reviendrait à en changer. Elle est en revanche copiable : c'est celle qu'il
 * faut retaper pour se reconnecter, et sur un compte créé il y a six mois on ne se
 * souvient pas toujours de laquelle on a utilisée.
 */
function AccountHeader({ account }: { account: AccountSummary }) {
  const t = usePhrase()
  const [editing, setEditing] = useState(false)
  const [handle, setHandle] = useState(account.handle)
  const [copied, setCopied] = useState(false)
  const [pending, startTransition] = useTransition()

  function save(event: React.FormEvent) {
    event.preventDefault()
    const next = handle.trim()
    if (next === '' || next === account.handle) {
      setEditing(false)
      setHandle(account.handle)
      return
    }
    startTransition(async () => {
      await updateHandle(next)
      setEditing(false)
    })
  }

  return (
    <div className="flex items-start gap-3 p-3">
      {/* `Avatar` de shadcn/ui, RÉDUIT À SON REPLI — le site ne demande pas de photo
          et n'en affichera donc jamais, d'où l'absence d'`AvatarImage`. Le composant
          garde tout de même son intérêt ici : c'est LUI qui définit le disque et son
          recadrage, que trois autres endroits reprenaient à la main avec des
          diamètres différents.

          ⚠️ La taille se pose en classe et non en prop : shadcn/ui n'a pas d'échelle
          de tailles pour l'avatar, il a `size-8` par défaut et se laisse écraser. */}
      <Avatar className="size-10 shrink-0">
        <AvatarFallback className="bg-brand-soft text-xs font-semibold uppercase text-brand-strong">
          {initialOf(account.handle)}
        </AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        {editing ? (
          <form onSubmit={save} className="flex items-center gap-1">
            {/* `Input` de shadcn/ui — même champ que partout ailleurs. Ce n'est qu'un
                `<input>` habillé : `autoFocus` et les autres attributs natifs le
                traversent sans que le composant ait à les connaître. */}
            <Input
              size="sm"
              autoFocus
              value={handle}
              maxLength={32}
              onChange={(event) => setHandle(event.target.value)}
              onBlur={save}
              aria-label={t('Pseudonyme')}
              className="w-full min-w-0"
            />
            {/* `IconButton` : le bouton-icône de shadcn/ui. Il porte l'infobulle,
                le plancher tactile et l'état désactivé, là où ce carré de 22 pixels
                n'avait qu'un `aria-label` et un survol. */}
            <IconButton
              type="submit"
              size="icon-xs"
              variant="ghost"
              disabled={pending}
              label={t('Enregistrer le pseudonyme')}
              icon={Check}
              className="shrink-0"
            />
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            title={t('Modifier le pseudonyme')}
            className="block max-w-full truncate text-left text-sm font-semibold text-ink hover:text-brand-strong"
          >
            {account.handle}
          </button>
        )}

        <div className="mt-0.5 flex items-center gap-1">
          <span className="min-w-0 flex-1 truncate text-[0.6875rem] text-ink-muted">
            {account.email}
          </span>
          <IconButton
            size="icon-xs"
            variant="ghost"
            label={t('Copier l’adresse')}
            icon={copied ? Check : Copy}
            onClick={() => {
              void navigator.clipboard?.writeText(account.email)
              setCopied(true)
              window.setTimeout(() => setCopied(false), 1500)
            }}
            className="shrink-0"
          />
        </div>

        {/*
          L'étiquette de la référence annonce un PALIER de compte — « utilisateur
          standard », par opposition à un statut supérieur qu'on peut acheter. Ici il
          n'y a qu'un seul type de compte, et il n'est pas près d'y en avoir deux :
          l'abonnement a été retiré du site. L'étiquette dit donc autre chose — la
          seule chose qu'un compte change réellement.
        */}
        <p className="mt-1.5 inline-flex items-center gap-1 rounded-pill border border-border-subtle px-1.5 py-0.5 text-[0.625rem] font-medium text-ink-muted">
          <UserRound className="h-2.5 w-2.5" aria-hidden="true" />{t('Liste synchronisée')}</p>
      </div>
    </div>
  )
}

/**
 * « Se déconnecter partout », replié derrière une confirmation en place.
 *
 * Le geste est rare — un poste public, un appareil perdu — et il déconnecte AUSSI
 * l'appareil courant. Un clic direct ferait donc disparaître le menu, la session et
 * la page sous les doigts de quelqu'un qui explorait.
 */
function SecurityRow({ onDone }: { onDone: () => void }) {
  const t = usePhrase()
  const [armed, setArmed] = useState(false)
  const [pending, startTransition] = useTransition()

  if (!armed) {
    return (
      <MenuButton icon={<Shield className="h-4 w-4" />} onClick={() => setArmed(true)}>{t('Sécurité des sessions')}</MenuButton>
    )
  }

  return (
    <div className="rounded-card bg-surface-muted p-2">
      <p className="text-[0.6875rem] leading-relaxed text-ink-muted">{t('Fermer toutes les sessions, y compris celle-ci ?')}</p>
      {/* Les deux paires « confirmer / annuler » de ce panneau — celle-ci et celle de
          la suppression — sont désormais le `Button` de shadcn/ui en taille `xs`, la
          plus petite de son échelle. Elles portaient chacune deux chaînes de classes
          distinctes pour un même dessin, et l'une des quatre avait déjà divergé sur
          l'état désactivé. */}
      <div className="mt-2 flex gap-1">
        <Button
          size="xs"
          disabled={pending}
          className="flex-1"
          onClick={() =>
            startTransition(async () => {
              await signOutEverywhere()
              onDone()
              window.location.reload()
            })
          }
        >
          {/* Le libellé RESTE pendant l'attente, et la roue s'ajoute à sa gauche.
              L'ancien composant savait masquer le texte ; ne pas le faire est un
              gain — un bouton qui perd son mot pendant deux secondes ne dit plus ce
              qu'on vient de lui demander, et l'on doute d'avoir cliqué au bon
              endroit. `disabled` suffit à empêcher le second clic. */}
          {pending ? <Loader2 className="animate-spin" /> : null}
          Tout fermer
        </Button>
        <Button size="xs" variant="outline" className="flex-1" onClick={() => setArmed(false)}>
          Annuler
        </Button>
      </div>
    </div>
  )
}

function SignOutRow() {
  const [pending, startTransition] = useTransition()

  return (
    <MenuButton
      icon={<LogOut className="h-4 w-4" />}
      onClick={() =>
        startTransition(async () => {
          await signOut()
          window.location.reload()
        })
      }
    >
      {pending ? 'Déconnexion…' : 'Déconnexion'}
    </MenuButton>
  )
}

/**
 * Suppression du compte — deux clics, et le second est explicite.
 *
 * L'action efface la liste de suivi, les alertes et les écrans enregistrés. Une
 * confirmation par fenêtre native (`confirm()`) serait le réflexe : elle est écartée
 * parce qu'un dialogue de navigateur bloque tout le fil d'exécution et ne dit pas ce
 * qui va disparaître. Le second bouton, lui, le nomme.
 */
function DangerRow() {
  const t = usePhrase()
  const [armed, setArmed] = useState(false)
  const [pending, startTransition] = useTransition()

  if (!armed) {
    return (
      <MenuButton icon={<Trash2 className="h-4 w-4" />} tone="danger" onClick={() => setArmed(true)}>{t('Supprimer le compte')}</MenuButton>
    )
  }

  return (
    <div className="rounded-card border border-down/40 bg-down-soft p-2">
      <p className="text-[0.6875rem] leading-relaxed text-ink">{t('Supprime définitivement le compte, la liste de suivi, les alertes et les écrans enregistrés.')}</p>
      <div className="mt-2 flex gap-1">
        <Button
          size="xs"
          variant="destructive"
          disabled={pending}
          className="flex-1"
          onClick={() =>
            startTransition(async () => {
              await deleteCurrentAccount()
              /* Navigation DURE et non `router.push` : le compte vient d'être effacé,
                 ses deux cookies avec lui, et plusieurs arbres rendus côté serveur
                 portent encore son état. Un rechargement complet est la seule façon
                 de garantir qu'il n'en subsiste rien à l'écran. */
              // eslint-disable-next-line @next/next/no-location-assign-relative-destination
              window.location.href = '/'
            })
          }
        >
          {pending ? <Loader2 className="animate-spin" /> : null}
          Supprimer
        </Button>
        <Button size="xs" variant="outline" className="flex-1" onClick={() => setArmed(false)}>
          Annuler
        </Button>
      </div>
    </div>
  )
}

function MenuLink({
  href,
  icon,
  onNavigate,
  children,
}: {
  href: string
  icon: React.ReactNode
  onNavigate: () => void
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      onClick={onNavigate}
      className="flex items-center gap-2.5 rounded-card px-2 py-2 text-sm text-ink transition-colors duration-150 hover:bg-surface-muted"
    >
      <span className="shrink-0 text-ink-muted" aria-hidden="true">
        {icon}
      </span>
      {children}
    </Link>
  )
}

function MenuButton({
  icon,
  onClick,
  tone = 'default',
  children,
}: {
  icon: React.ReactNode
  onClick: () => void
  tone?: 'default' | 'danger'
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 rounded-card px-2 py-2 text-left text-sm transition-colors duration-150 ${
        tone === 'danger'
          ? 'text-down hover:bg-down-soft'
          : 'text-ink hover:bg-surface-muted'
      }`}
    >
      <span className="shrink-0 opacity-70" aria-hidden="true">
        {icon}
      </span>
      {children}
    </button>
  )
}
