'use client'

import { useEffect, useRef, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

import { signInWithPassword } from '@/lib/auth-actions'
import { usePhrase } from '@/components/locale/ContentProvider'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * CONNEXION PAR ADRESSE ET MOT DE PASSE
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Les deux champs de la capture, leur bouton, et les états d'erreur qu'elle montre.
 * Ce qui n'y figure pas et qui compte davantage : ce formulaire N'EST PAS le seul
 * chemin. Le code à usage unique reste ouvert, et il est le recours quand le mot de
 * passe manque ou s'oublie — d'où le lien qui y bascule, posé contre l'intitulé du
 * champ comme sur la capture.
 *
 * ── L'ERREUR VIT SOUS LE CHAMP CONCERNÉ, ET NON EN TÊTE DE FORMULAIRE ──────
 *
 * C'est la forme de la capture, et elle est meilleure pour une raison précise : un
 * message en tête oblige à relire tout le formulaire pour savoir lequel des deux
 * champs il vise. Sous le champ, il désigne.
 *
 * ⚠️ CE FORMULAIRE NE PEUT PAS TOUJOURS DÉSIGNER, et c'est délibéré. Le serveur rend
 * `bad-credentials` sans dire lequel des deux est faux — pour ne pas révéler quelles
 * adresses sont inscrites, voir `auth-actions.ts`. Ce message-là se pose donc sous le
 * MOT DE PASSE, qui est le champ qu'on peut corriger : dire « l'un des deux est faux »
 * serait exact et inutile.
 *
 * ── LE BOUTON SE DÉSACTIVE, MAIS PAS SUR L'ERREUR ─────────────────────────
 *
 * La capture montre un bouton éteint sous un champ en erreur. Repris à la lettre, cela
 * empêcherait de réessayer après une faute de frappe : l'erreur ne disparaît qu'à la
 * frappe suivante, et l'on se retrouve à devoir modifier un champ juste pour
 * réactiver le bouton.
 *
 * Il s'éteint donc sur ce qui l'empêche VRAIMENT de servir : un champ vide, ou un
 * envoi déjà en cours.
 */
export function PasswordForm({
  onForgot,
  visible = true,
}: {
  /** Bascule vers le parcours par code — « oublié », et « jamais posé ». */
  onForgot: () => void
  /** Sert au focus initial : voir `LoginForm`, même mécanique. */
  visible?: boolean
}) {
  const t = usePhrase()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [visiblePassword, setVisiblePassword] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<{ champ: 'email' | 'password'; texte: string } | null>(null)
  const emailRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!visible) return
    const image = requestAnimationFrame(() => emailRef.current?.focus())
    return () => cancelAnimationFrame(image)
  }, [visible])

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (pending) return
    setPending(true)
    setError(null)

    const result = await signInWithPassword(email, password)
    setPending(false)
    if (result.ok) {
      /* Rechargement complet et non `router.refresh()` : la session vit dans un cookie
         `httpOnly` posé par l'action, et l'en-tête, la liste de suivi et le tableau de
         bord sont tous rendus côté serveur. Un rafraîchissement partiel laisserait
         certains d'entre eux dans leur état déconnecté. */
      window.location.reload()
      return
    }

    if (result.reason === 'invalid-email') {
      setError({ champ: 'email', texte: t('Cette adresse ne semble pas valide.') })
      return
    }
    if (result.reason === 'locked') {
      setError({
        champ: 'password',
        texte: t('Trop d’essais. Réessayez dans quinze minutes, ou connectez-vous par courriel.'),
      })
      return
    }
    if (result.reason === 'unavailable') {
      setError({
        champ: 'password',
        texte: t('La connexion n’est pas configurée sur cette instance.'),
      })
      return
    }
    /* Voir la note de tête : le serveur ne dit pas lequel des deux est faux, et la
       phrase le reflète sans le maquiller. */
    setError({
      champ: 'password',
      texte: t('Adresse ou mot de passe incorrect. Vous pouvez aussi recevoir un code par courriel.'),
    })
  }

  const enErreur = (champ: 'email' | 'password') => error?.champ === champ

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div className="space-y-1.5">
        <label
          htmlFor="auth-email"
          className={`block text-xs font-medium ${enErreur('email') ? 'text-down' : 'text-ink'}`}
        >
          {t('Adresse e-mail')}
        </label>
        <input
          ref={emailRef}
          id="auth-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value)
            setError(null)
          }}
          /* `aria-invalid` et `aria-describedby` : sans eux, un lecteur d'écran annonce
             un champ ordinaire et laisse le message d'erreur orphelin plus bas dans le
             document. La bordure rouge ne porte jamais seule (§9). */
          aria-invalid={enErreur('email')}
          aria-describedby={enErreur('email') ? 'auth-email-erreur' : undefined}
          placeholder={t('vous@exemple.fr')}
          className={`h-10 w-full rounded-control border bg-surface-muted px-3 text-sm text-ink placeholder:text-ink-muted focus:outline-none ${
            enErreur('email') ? 'border-down' : 'border-border-subtle focus:border-brand'
          }`}
        />
        {enErreur('email') ? (
          <p id="auth-email-erreur" role="alert" className="text-xs text-down">
            {error?.texte}
          </p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        {/* L'intitulé et le recours SUR LA MÊME LIGNE, comme sur la capture : c'est là
            qu'on se demande « et si je ne l'ai pas ? », pas en bas du formulaire. */}
        <div className="flex items-baseline justify-between gap-3">
          <label
            htmlFor="auth-password"
            className={`text-xs font-medium ${enErreur('password') ? 'text-down' : 'text-ink'}`}
          >
            {t('Mot de passe')}
          </label>
          {/* ⚠️ « OUBLIÉ OU JAMAIS DÉFINI » ET NON « MOT DE PASSE OUBLIÉ ? ». Sur ce
              site, un compte peut n'en avoir jamais eu — c'est même l'état par défaut,
              la connexion par code suffisant à tout. Écrire « oublié » laisserait
              croire à ces comptes-là que ce lien ne les concerne pas. */}
          <button
            type="button"
            onClick={onForgot}
            className="text-xs text-ink-muted underline underline-offset-2 transition-colors duration-150 hover:text-brand"
          >
            {t('Oublié ou jamais défini ?')}
          </button>
        </div>

        <div className="relative">
          <input
            id="auth-password"
            type={visiblePassword ? 'text' : 'password'}
            autoComplete="current-password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value)
              setError(null)
            }}
            aria-invalid={enErreur('password')}
            aria-describedby={enErreur('password') ? 'auth-password-erreur' : undefined}
            /* `pr-10` : la place du bouton d'œil, sans quoi les derniers caractères
               passent dessous. */
            className={`h-10 w-full rounded-control border bg-surface-muted pl-3 pr-10 text-sm text-ink placeholder:text-ink-muted focus:outline-none ${
              enErreur('password') ? 'border-down' : 'border-border-subtle focus:border-brand'
            }`}
          />
          {/* ⚠️ `tabIndex={-1}` : l'œil ne doit PAS s'intercaler entre le champ et le
              bouton d'envoi. Au clavier, la tabulation va du mot de passe à « Se
              connecter » ; qui veut voir ce qu'il tape le fait à la souris, et un
              lecteur d'écran n'a rien à faire d'un bascule d'affichage. */}
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setVisiblePassword((precedent) => !precedent)}
            aria-label={visiblePassword ? t('Masquer le mot de passe') : t('Afficher le mot de passe')}
            className="absolute right-0 top-0 flex h-10 w-10 items-center justify-center text-ink-muted transition-colors duration-150 hover:text-ink"
          >
            {visiblePassword ? (
              <EyeOff className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Eye className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </div>

        {enErreur('password') ? (
          <p id="auth-password-erreur" role="alert" className="text-xs text-down">
            {error?.texte}
          </p>
        ) : null}
      </div>

      <button
        type="submit"
        disabled={pending || email.trim() === '' || password === ''}
        className="h-10 w-full rounded-control bg-brand text-sm font-semibold text-on-brand transition-opacity duration-150 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {pending ? t('Connexion…') : t('Se connecter')}
      </button>
    </form>
  )
}
