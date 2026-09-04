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
    <form onSubmit={submit} className="space-y-3" noValidate>
      {/*
        ══════════════════════════════════════════════════════════════════════
        LES DEUX CHAMPS SONT SOUDÉS EN UN SEUL BLOC — LA FORME DE LA CAPTURE
        ══════════════════════════════════════════════════════════════════════

        Ils étaient deux boîtes distinctes, chacune avec son intitulé au-dessus. La
        capture les montre empilés dans UN cadre : rayon sur les coins extérieurs
        seulement, un filet d'un pixel entre les deux, aucun espace.

        Ce n'est pas qu'une affaire de goût. Deux champs qui se touchent se lisent
        comme UNE saisie en deux temps — ce qu'une connexion est — là où deux boîtes
        séparées par une gouttière se lisent comme deux questions indépendantes. La
        différence se voit surtout à l'erreur : un cadre rouge sur le bloc entier dit
        « cette connexion a échoué », deux cadres rouges disent « ces deux champs sont
        faux », ce qui n'est pas la même chose et n'est pas vrai.

        ⚠️ `-mt-px` SUR LE SECOND CHAMP, et sans lui les deux bordures s'additionnent :
        un filet de deux pixels au milieu d'un bloc dont tous les autres traits en font
        un. Le défaut est invisible tant qu'on ne compare pas.
      */}
      <div className="space-y-1.5">
        <div className="relative">
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
            /*
              ⚠️ `placeholder=" "` — UNE ESPACE, ET C'EST LE PIVOT DE TOUT LE MÉCANISME.
              `:placeholder-shown` ne s'applique qu'à un champ QUI A un attribut
              `placeholder` ; sans lui, le sélecteur ne mord jamais et l'intitulé reste
              collé au milieu du champ par-dessus la saisie. L'espace est invisible et
              n'est jamais lue — l'intitulé, lui, est un vrai `<label>`.
            */
            placeholder=" "
            className={`peer h-14 w-full rounded-t-control border bg-surface-muted px-3 pb-1.5 pt-6 text-sm text-ink focus:outline-none ${
              enErreur('email') ? 'z-10 border-down' : 'border-border-subtle focus:z-10 focus:border-brand'
            }`}
          />
          <FloatingLabel htmlFor="auth-email" invalid={enErreur('email')}>
            {t('Adresse e-mail')}
          </FloatingLabel>
        </div>

        <div className="relative -mt-px">
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
            placeholder=" "
            /* `pr-12` : la place du bouton d'œil, sans quoi les derniers caractères
               passent dessous. */
            className={`peer h-14 w-full rounded-b-control border bg-surface-muted pb-1.5 pl-3 pr-12 pt-6 text-sm text-ink focus:outline-none ${
              enErreur('password')
                ? 'z-10 border-down'
                : 'border-border-subtle focus:z-10 focus:border-brand'
            }`}
          />
          <FloatingLabel htmlFor="auth-password" invalid={enErreur('password')}>
            {t('Mot de passe')}
          </FloatingLabel>

          {/* ⚠️ `tabIndex={-1}` : l'œil ne doit PAS s'intercaler entre le champ et le
              bouton d'envoi. Au clavier, la tabulation va du mot de passe à
              « Continuer » ; qui veut voir ce qu'il tape le fait à la souris, et un
              lecteur d'écran n'a rien à faire d'un bascule d'affichage. */}
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setVisiblePassword((precedent) => !precedent)}
            aria-label={visiblePassword ? t('Masquer le mot de passe') : t('Afficher le mot de passe')}
            className="absolute right-0 top-0 z-20 flex h-14 w-12 items-center justify-center text-ink-muted transition-colors duration-150 hover:text-ink"
          >
            {visiblePassword ? (
              <EyeOff className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Eye className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </div>

        {/* Les deux messages vivent SOUS le bloc et non sous chaque champ : le bloc est
            soudé, glisser un paragraphe entre les deux champs le romprait. Ils restent
            rattachés à leur champ par `aria-describedby`, qui ne dépend pas de la
            position dans le document. */}
        {enErreur('email') ? (
          <p id="auth-email-erreur" role="alert" className="pt-1 text-xs text-down">
            {error?.texte}
          </p>
        ) : null}
        {enErreur('password') ? (
          <p id="auth-password-erreur" role="alert" className="pt-1 text-xs text-down">
            {error?.texte}
          </p>
        ) : null}
      </div>

      {/* ⚠️ « OUBLIÉ OU JAMAIS DÉFINI » ET NON « MOT DE PASSE OUBLIÉ ? ». Sur ce site,
          un compte peut n'en avoir jamais eu — c'est même l'état par défaut, la
          connexion par code suffisant à tout. Écrire « oublié » laisserait croire à ces
          comptes-là que ce lien ne les concerne pas.

          Il passe SOUS le bloc, cadré à gauche comme sur la capture : il ne peut plus
          vivre contre l'intitulé du mot de passe, puisque cet intitulé est maintenant
          dans le champ. */}
      <button
        type="button"
        onClick={onForgot}
        className="block text-left text-xs text-ink-muted transition-colors duration-150 hover:text-brand"
      >
        {t('Oublié ou jamais défini ?')}
      </button>

      {/* Le grand bouton d'accent de la capture : pleine largeur, 48 px, et le libellé
          « Continuer » plutôt que « Se connecter ». Ce n'est pas un synonyme — ce
          formulaire peut aussi basculer vers le code par courriel, et « Continuer »
          couvre les deux issues sans en promettre une. */}
      <button
        type="submit"
        disabled={pending || email.trim() === '' || password === ''}
        className="h-12 w-full rounded-control bg-brand text-sm font-semibold text-on-brand transition-opacity duration-150 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {pending ? t('Connexion…') : t('Continuer')}
      </button>
    </form>
  )
}

/**
 * L'intitulé qui monte quand le champ se remplit.
 *
 * ── POURQUOI PAS UN SIMPLE `placeholder` ────────────────────────────────────
 *
 * Parce qu'il disparaît à la première frappe. Un formulaire rempli n'a alors plus
 * aucun intitulé : on ne peut plus vérifier ce qu'on a mis où, et c'est précisément ce
 * qu'on veut faire avant d'envoyer un mot de passe. Le défaut est connu, documenté, et
 * la capture ne le commet pas — son intitulé monte, il ne s'efface pas.
 *
 * ── COMMENT IL SAIT QUE LE CHAMP EST VIDE ───────────────────────────────────
 *
 * Par `:placeholder-shown`, lu sur le champ voisin grâce à `peer`. Aucun état React
 * n'est nécessaire : le navigateur connaît déjà la réponse, et la relayer par un
 * `useState` ferait repeindre le formulaire à chaque caractère pour une information
 * que le CSS a en permanence.
 *
 * `pointer-events-none` : sans lui, l'intitulé posé PAR-DESSUS le champ intercepte le
 * clic qui visait le champ. Le curseur ne s'y place pas, et rien n'explique pourquoi.
 */
function FloatingLabel({
  htmlFor,
  invalid,
  children,
}: {
  htmlFor: string
  invalid: boolean
  children: React.ReactNode
}) {
  return (
    <label
      htmlFor={htmlFor}
      className={`pointer-events-none absolute left-3 top-2 z-10 text-[0.6875rem] transition-all duration-150 peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-sm peer-focus:top-2 peer-focus:translate-y-0 peer-focus:text-[0.6875rem] ${
        invalid ? 'text-down' : 'text-ink-muted peer-focus:text-brand'
      }`}
    >
      {children}
    </label>
  )
}
