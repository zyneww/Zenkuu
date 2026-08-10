'use client'

import { SignIn, SignUp } from '@clerk/nextjs'
import { Check, X } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useRef } from 'react'

import { AUTH_ROUTES } from '@/lib/auth'
import { CLERK_OVERLAY_ELEMENTS } from '@/lib/clerk-appearance'
import { fr } from '@/content/fr'

export type AuthMode = 'signIn' | 'signUp'

/**
 * Fenêtre de compte — connexion et inscription, sans quitter la page.
 *
 * ── CE QUI EST À NOUS, CE QUI EST À CLERK ──────────────────────────────────────
 *
 * La coque est à nous : fond, cadre, titre, mascotte, bascule connexion/inscription,
 * bloc de bas. Le FORMULAIRE est celui de Clerk, restylé aux jetons ZENITH.
 *
 * Ce partage n'est pas de la paresse, c'est le seul choix défendable. Derrière trois
 * boutons se cachent une redirection OAuth, une saisie de code à usage unique, un mot
 * de passe oublié, une double authentification, une vérification anti-robot et une
 * bonne dizaine d'états d'erreur. Les réécrire à la main pour gagner le contrôle du
 * pixel, c'est multiplier les endroits où l'on peut enfermer quelqu'un hors de son
 * propre compte — la panne la plus coûteuse qu'un site puisse produire.
 *
 * `routing="hash"` et non `"path"` : les étapes internes de Clerk — code envoyé par
 * e-mail, second facteur, mot de passe oublié — s'inscrivent dans le FRAGMENT de
 * l'URL plutôt que dans son chemin. Le chemin ferait naviguer le routeur de Next.js,
 * donc démonterait la page sous la fenêtre modale, donc la fermerait à la première
 * étape. Le fragment, lui, ne déclenche aucune navigation.
 *
 * (Cette version du fournisseur n'accepte que `path` ou `hash` — le mode « virtuel »,
 * qui garderait les étapes en mémoire sans toucher à l'URL, n'y existe pas encore.
 * Contrepartie assumée : le bouton « retour » du navigateur recule d'une étape dans
 * le formulaire avant de quitter la page.)
 */
export function AuthOverlay({
  mode,
  onClose,
  onSwitch,
}: {
  /** `null` ferme la fenêtre — l'état vit chez l'appelant, pas ici. */
  mode: AuthMode | null
  onClose: () => void
  onSwitch: (mode: AuthMode) => void
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  const open = mode !== null

  // Défilement de la page bloqué pendant l'ouverture : sans cela, la molette fait
  // glisser le contenu derrière la fenêtre, ce qui est désorientant.
  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  /*
   * Le focus entre dans la fenêtre à l'ouverture.
   *
   * Sur le PANNEAU et non sur le premier bouton : le formulaire de Clerk se monte de
   * façon asynchrone, et viser un élément qui n'existe pas encore laisse le focus sur
   * le bouton « Connexion » de l'en-tête — donc derrière un fond opaque, invisible.
   * Le panneau porte `tabIndex={-1}` pour pouvoir le recevoir sans entrer dans
   * l'ordre de tabulation.
   */
  useEffect(() => {
    if (open) panelRef.current?.focus()
  }, [open, mode])

  if (!mode) return null

  const isSignUp = mode === 'signUp'

  return (
    <div
      className="fixed inset-0 z-[110] flex items-start justify-center overflow-y-auto px-4 py-[6vh]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-overlay-titre"
    >
      <button
        type="button"
        className="fixed inset-0 cursor-default bg-canvas/80 backdrop-blur-sm"
        aria-label={fr.auth.close}
        onClick={onClose}
      />

      <div
        ref={panelRef}
        tabIndex={-1}
        className="relative w-full max-w-md border border-border-subtle bg-overlay shadow-overlay outline-none"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={fr.auth.close}
          className="absolute right-3 top-3 z-20 flex h-8 w-8 items-center justify-center text-ink-muted transition-colors duration-150 hover:bg-surface-muted hover:text-ink"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>

        <div className="px-6 pb-6 pt-8">
          <header className="space-y-1 pr-8">
            <h2 id="auth-overlay-titre" className="display-sm text-ink">
              {isSignUp ? fr.auth.overlaySignUpTitle : fr.auth.overlaySignInTitle}
            </h2>
            <p className="text-sm text-ink-muted">
              {isSignUp ? fr.auth.overlaySignUpSubtitle : fr.auth.overlaySignInSubtitle}
            </p>
          </header>

          {/*
            ── LA MASCOTTE, PERCHÉE SUR LE PREMIER BOUTON ────────────────────────

            Elle est posée dans le flux juste au-dessus du formulaire, puis ramenée
            vers le bas par une marge négative pour que ses pieds mordent le haut du
            premier bouton — comme si elle s'y tenait.

            Trois précautions, chacune pour un défaut réel :

            · `pointer-events-none` — elle chevauche une zone cliquable. Sans cela,
              le coin du bouton qu'elle recouvre cesserait de répondre au clic, et le
              défaut serait attribué au bouton, pas à l'image.

            · `aria-hidden` — c'est un ornement. Annoncée, elle ferait précéder le
              premier bouton d'un bruit sans contenu à chaque lecture d'écran.

            · `text-brand` — la silhouette est un masque appliqué à `currentColor`
              (voir `.brand-mark` dans globals.css). Elle suit donc la bascule de
              thème sans qu'aucune image ne soit rechargée.
          */}
          {/*
            CALÉE À GAUCHE, et non centrée. Les boutons de fournisseur forment une
            rangée de trois : centrée, la mascotte se posait pile sur celui du milieu
            et en masquait le logo — elle cachait l'information au lieu de l'orner.
            À gauche, elle surplombe le PREMIER bouton, comme demandé.

            Le chevauchement est réduit à huit pixels : assez pour qu'elle paraisse
            tenir sur le bord, pas assez pour manger l'icône en dessous.
          */}
          <div className="relative z-10 -mb-2 mt-6 flex justify-start pl-3" aria-hidden="true">
            <span className="brand-mark brand-mark-mascotte h-10 w-12 text-brand" />
          </div>

          <div className="relative">
            {isSignUp ? (
              <SignUp
                routing="hash"
                appearance={{ elements: CLERK_OVERLAY_ELEMENTS }}
                signInUrl={AUTH_ROUTES.signIn}
              />
            ) : (
              <SignIn
                routing="hash"
                appearance={{ elements: CLERK_OVERLAY_ELEMENTS }}
                signUpUrl={AUTH_ROUTES.signUp}
              />
            )}
          </div>

          {/* Bascule maison plutôt que celle de Clerk : la sienne NAVIGUE vers
              l'autre page, ce qui refermerait la fenêtre. Ici on change d'onglet
              sans quitter la page ni toucher à l'URL. */}
          <p className="mt-4 text-center text-xs text-ink-muted">
            {isSignUp ? fr.auth.switchToSignIn : fr.auth.switchToSignUp}{' '}
            <button
              type="button"
              onClick={() => onSwitch(isSignUp ? 'signIn' : 'signUp')}
              className="font-medium text-brand underline-offset-2 hover:underline"
            >
              {isSignUp ? fr.auth.signIn : fr.auth.signUp}
            </button>
          </p>
        </div>

        {/* ── Ce que le compte apporte ─────────────────────────────────────────
            Trois lignes concrètes, et la phrase qui nous distingue. À la place où
            une plateforme d'échange mettrait la promotion de son application. */}
        <div className="border-t border-border-subtle bg-surface-muted px-6 py-5">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
            {fr.auth.benefitsTitle}
          </h3>

          <ul className="mt-3 space-y-2">
            {fr.auth.benefits.map((benefit) => (
              <li key={benefit} className="flex items-start gap-2 text-sm text-ink">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-up" aria-hidden="true" />
                {benefit}
              </li>
            ))}
          </ul>

          <p className="mt-4 text-xs leading-relaxed text-ink-muted">{fr.auth.benefitsNote}</p>

          <p className="mt-3 text-xs text-ink-muted">
            {fr.auth.legalPrefix}{' '}
            <Link href="/a-propos" className="text-brand underline-offset-2 hover:underline">
              {fr.auth.legalLink}
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  )
}
