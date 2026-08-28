'use client'

import { ArrowLeft, Loader2, ShieldCheck } from 'lucide-react'
import { Mail } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useEffect, useRef, useState, useTransition } from 'react'

import { REGEXP_ONLY_DIGITS } from 'input-otp'

import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'

import { requestLoginCode, verifyLoginCode, type AuthResult } from '@/lib/auth-actions'
import { usePhrase } from '@/components/locale/ContentProvider'

/**
 * Le formulaire de connexion, SANS sa coque.
 *
 * ── POURQUOI IL A ÉTÉ EXTRAIT ─────────────────────────────────────────────────
 *
 * Il vivait dans `LoginOverlay`, soudé à une modale plein écran. Deux appelants le
 * réclament désormais sous deux formes différentes : le menu de compte de l'en-tête,
 * où il tient dans un panneau déroulant de 288 pixels, et la page de paramètres, qui
 * garde la modale. Le dupliquer aurait fait vivre deux fois la mécanique du code à
 * six chiffres — et ses sept messages d'erreur.
 *
 * Ce composant ne sait donc rien de sa présentation : ni fond, ni bordure, ni
 * fermeture. Il rend un `<form>` et prévient quand la session s'ouvre.
 *
 * ── POURQUOI IL N'Y A NI MOT DE PASSE NI INSCRIPTION ──────────────────────────
 *
 * Un mot de passe suppose de le choisir, de le retenir, de le réinitialiser, et
 * surtout de le STOCKER — c'est-à-dire de détenir le secret de quelqu'un pour lui
 * donner accès à une liste de cours. La disproportion est nette sur un site qui
 * n'exécute aucun ordre et ne détient aucun fonds.
 *
 * Il n'y a pas non plus d'étape « créer un compte ». La même adresse suit le même
 * chemin qu'elle soit connue ou non ; le code reçu par courriel vaut vérification
 * dans les deux cas. Un visiteur n'a donc jamais à se demander de quel côté du
 * formulaire il se trouve.
 *
 * ── DEUX ÉCRANS, UN SEUL COMPOSANT ────────────────────────────────────────────
 *
 * L'étape est un état local et non deux vues : passer de l'une à l'autre ne doit ni
 * refermer le panneau, ni perdre l'adresse déjà saisie — c'est elle qu'il faudra
 * renvoyer si le code n'arrive pas.
 */

type Step = 'email' | 'code'

export function LoginForm({
  /**
   * Le formulaire est-il visible ?
   *
   * Il sert à deux choses et à rien d'autre : donner le focus au bon champ quand il
   * apparaît, et remettre l'étape à zéro quand il disparaît. Les appelants qui le
   * montent et le démontent peuvent laisser ce champ à sa valeur par défaut.
   */
  visible = true,
  /**
   * Densité de la mise en forme.
   *
   * `panel` retire l'encadré explicatif de bas de formulaire et resserre les
   * espacements : dans un menu déroulant de 288 pixels, un paragraphe de cinq lignes
   * repousse le bouton d'envoi sous la ligne de flottaison. Le même texte reste lisible
   * dans la modale de la page de paramètres, où la place existe.
   */
  density = 'overlay',
  /**
   * Masque le titre et la phrase d'accroche de l'étape « adresse ».
   *
   * À utiliser quand l'appelant ANNONCE DÉJÀ ce qu'on est en train de faire — c'est
   * le cas de `AuthOverlay`, dont l'en-tête affiche « Connexion » ou « Inscription »
   * en gros. Sans cette échappée, la fenêtre porterait deux titres empilés, dont le
   * second contredirait parfois le premier : « Inscription » suivi de « Se
   * connecter ».
   *
   * Seul l'écran d'adresse est concerné. L'étape du code garde son titre — il change
   * de sujet, et l'en-tête de la fenêtre, lui, ne bouge pas.
   */
  hideHeading = false,
}: {
  visible?: boolean
  density?: 'overlay' | 'panel'
  hideHeading?: boolean
}) {
  const t = usePhrase()
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  /* Défaut DU CHAMP, distinct de `error` qui porte l'échec du service. Voir la note
     posée sur le `Field` plus bas. */
  const [emailError, setEmailError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const emailRef = useRef<HTMLInputElement>(null)
  const codeRef = useRef<HTMLInputElement>(null)

  /* Remise à zéro à la FERMETURE et non à l'ouverture : réinitialiser à l'ouverture
     ferait clignoter l'écran de code vers l'écran d'adresse chez celui qui rouvre le
     panneau par mégarde, avant que l'effet ne s'exécute. */
  useEffect(() => {
    if (visible) return
    /* Trois `setState` dans un effet, et le linter a raison de le signaler en général :
       une mise à jour synchrone y déclenche un second rendu. Ici c'est exactement
       l'intention — le formulaire vient de disparaître, ces états n'ont plus
       d'affichage à piloter. */
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStep('email')
    setCode('')
    setError(null)
  }, [visible])

  /* Le focus suit l'étape. Sans lui, l'utilisateur qui vient de recevoir son code
     doit cliquer dans le champ avant de le taper — un geste de plus au moment précis
     où il a six chiffres en mémoire de travail. */
  useEffect(() => {
    if (!visible) return
    const target = step === 'email' ? emailRef.current : codeRef.current
    target?.focus()
  }, [visible, step])

  function send(event: React.FormEvent) {
    event.preventDefault()
    setError(null)

    /* Une adresse est valide ici si elle porte un arobase entouré de texte et un point
       dans son domaine. C'est volontairement PLUS LARGE que la norme — les adresses
       licites sont bien plus étranges que ce qu'on imagine, et un filtre strict rejette
       de vraies adresses. Le serveur tranche ; ceci n'attrape que la faute de frappe. */
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setEmailError('Cette adresse semble incomplète — il manque un « @ » ou un domaine.')
      emailRef.current?.focus()
      return
    }
    startTransition(async () => {
      const result = await requestLoginCode(email)
      if (!result.ok) {
        setError(message(result))
        return
      }
      setStep('code')
    })
  }

  function verify(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await verifyLoginCode(email, code)
      if (!result.ok) {
        setError(message(result))
        return
      }
      /*
       * Rechargement complet plutôt qu'un `router.refresh()`.
       *
       * La session vient de s'ouvrir, et ce qu'elle change dépasse le rendu React :
       * la liste de suivi et le tableau de bord sont rendus côté serveur
       * sous une AUTRE clé qu'il y a une seconde, et plusieurs d'entre eux sont mis
       * en cache par route. Un rafraîchissement partiel laisserait des fragments de
       * l'état anonyme à l'écran — le cas le plus visible étant l'étoile d'un actif
       * qu'on vient de récupérer dans son compte.
       */
      window.location.reload()
    })
  }

  const compact = density === 'panel'

  if (step === 'email') {
    return (
      <form onSubmit={send} className={compact ? 'space-y-3' : 'space-y-4'}>
        {hideHeading ? null : (
          <div className="space-y-1.5">
            <h2 className={compact ? 'text-sm font-semibold text-ink' : 'display-sm text-ink'}>
              Se connecter
            </h2>
            <p className="text-[0.6875rem] leading-relaxed text-ink-muted">{t('Pas de mot de passe : nous envoyons un code à six chiffres. Si l’adresse ne correspond à aucun compte, il en crée un.')}</p>
          </div>
        )}

        {/*
          ── LE CHAMP EST VALIDÉ AVANT L'ALLER-RETOUR ──────────────────────────

          `Field` porte l'étiquette et, désormais, l'ERREUR DU CHAMP. La distinction
          compte : le message d'échec du serveur reste global — « service d'envoi
          indisponible » ne désigne aucune saisie —, tandis qu'une adresse mal formée
          est un défaut DE CE CHAMP et s'affiche sous lui, relié par
          `aria-describedby`.

          Le format est éprouvé ici plutôt qu'au serveur : « vous@exemple » partait,
          revenait en erreur une seconde plus tard, et le lecteur devait relire son
          adresse pour comprendre laquelle des deux moitiés manquait. `type="email"` ne
          suffit pas — le navigateur ne l'annonce qu'au moment de l'envoi, dans une
          bulle native que la synthèse vocale ne lit pas toujours.

          Le serveur revalide, évidemment : cette vérification est un confort, jamais
          une garantie. Voir `requestLoginCode`.
        */}
        <Field data-invalid={emailError !== null}>
          <FieldLabel htmlFor="courriel-connexion" className="text-xs font-medium text-ink">{t('Adresse électronique')}</FieldLabel>
          <InputGroup size="sm">
            <InputGroupInput
              id="courriel-connexion"
              ref={emailRef}
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value)
                // L'erreur s'efface à la frappe : la maintenir pendant qu'on corrige
                // reprocherait au lecteur une saisie qu'il est en train de réparer.
                if (emailError) setEmailError(null)
              }}
              placeholder="vous@exemple.fr"
              aria-label={t('Adresse électronique')}
              aria-invalid={emailError !== null}
              aria-describedby={emailError ? 'courriel-connexion-erreur' : undefined}
            />
            <InputGroupAddon>
              <Mail />
            </InputGroupAddon>
          </InputGroup>
          {emailError ? (
            <FieldError id="courriel-connexion-erreur">{emailError}</FieldError>
          ) : null}
        </Field>

        {error ? <Feedback>{error}</Feedback> : null}

        {/* La roue s'ajoute À GAUCHE du libellé au lieu de le remplacer, et `w-full`
            fige la largeur. Les deux précautions répondent au même défaut observé :
            l'étiquette passe de « Recevoir un code » à « Envoi… », et sans elles le
            bouton rétrécissait sous le doigt au moment précis où l'on vient
            d'appuyer dessus. `disabled` empêche le second envoi. */}
        <Button type="submit" size="sm" disabled={pending} className="w-full">
          {pending ? <Loader2 className="animate-spin" /> : null}
          {pending ? 'Envoi…' : 'Recevoir un code'}
        </Button>

        {/*
          CE QUE LA CONNEXION APPORTE — et il faut le dire ici.

          RIEN de plus qu'un visiteur anonyme ne puisse déjà faire : la liste de suivi
          et les écrans fonctionnent sans compte. Ce qu'elle apporte est la
          PORTABILITÉ. Sans cette phrase, le visiteur suppose qu'on lui demande de
          s'inscrire pour utiliser le site.

          Le paragraphe est réduit à une ligne dans le panneau déroulant : la phrase
          qui compte est la première, les trois autres détaillent un point que le
          menu n'a pas la place de développer.
        */}
        {compact ? (
          <p className="text-[0.6875rem] leading-relaxed text-ink-muted">
            Un compte n’est <strong className="font-medium text-ink">pas nécessaire</strong> pour
            suivre un actif ou enregistrer un écran. Il sert à retrouver la même liste sur un autre
            appareil.
          </p>
        ) : (
          <p className="rounded-card border border-border-subtle bg-surface-muted px-3 py-2.5 text-[0.6875rem] leading-relaxed text-ink-muted">
            Un compte n’est <strong className="font-medium text-ink">pas nécessaire</strong> pour
            suivre un actif ou enregistrer un écran : ces fonctions marchent déjà sans lui, rangées
            dans votre navigateur. Il sert à retrouver la même liste sur un autre appareil, et à
            ce qu’un nettoyage du navigateur ne l’efface pas.
          </p>
        )}
      </form>
    )
  }

  return (
    <form onSubmit={verify} className={compact ? 'space-y-3' : 'space-y-4'}>
      <div className="space-y-1.5">
        <button
          type="button"
          onClick={() => {
            setStep('email')
            setError(null)
          }}
          className="-ml-1 flex items-center gap-1 rounded-control px-1 py-0.5 text-xs text-ink-muted transition-colors hover:text-ink"
        >
          <ArrowLeft className="h-3 w-3" aria-hidden="true" />{t('Changer d’adresse')}</button>
        <h2 className={compact ? 'text-sm font-semibold text-ink' : 'display-sm text-ink'}>
          Votre code
        </h2>
        <p className="text-[0.6875rem] leading-relaxed text-ink-muted">
          Envoyé à <span className="font-medium text-ink">{email}</span>. Il expire dans quinze
          minutes.
        </p>
      </div>

      <Field>
        <FieldLabel htmlFor="code-connexion">{t('Code à six chiffres')}</FieldLabel>
        {/*
          ── SIX CASES, ET NON UN CHAMP UNIQUE ──────────────────────────────────

          Le champ unique a longtemps été le bon choix ici, pour deux raisons que six
          `<input maxlength="1">` écrits à la main perdent : le COLLAGE d'un code en
          une fois depuis la boîte de réception, et le remplissage automatique par
          `one-time-code` d'iOS — qui vise un champ, pas une série.

          `InputOTP` ne les perd pas. Il rend UN SEUL `<input>`, invisible, superposé
          aux six cases : le collage, l'autocomplétion du système et la saisie clavier
          continuent donc de travailler sur un champ, pendant que l'œil lit six cases.
          C'est ce qui rend la substitution gagnante plutôt que neutre — s'y ajoutent
          la touche Retour arrière qui recule d'une case et la longueur garantie par
          `maxLength`, que le champ unique laissait à un `maxLength={7}` approximatif.

          ⚠️ `onChange` REÇOIT LA VALEUR, pas l'événement : c'est la convention de
          `input-otp`, et elle diffère de tous les autres champs du site.
        */}
        <InputOTP
          id="code-connexion"
          ref={codeRef}
          maxLength={6}
          value={code}
          onChange={setCode}
          pattern={REGEXP_ONLY_DIGITS}
          autoComplete="one-time-code"
          containerClassName="justify-center"
          aria-label={t('Code à six chiffres')}
        >
          <InputOTPGroup>
            {[0, 1, 2, 3, 4, 5].map((index) => (
              <InputOTPSlot key={index} index={index} className="tabular size-11 text-base" />
            ))}
          </InputOTPGroup>
        </InputOTP>
      </Field>

      {error ? <Feedback>{error}</Feedback> : null}

      <Button type="submit" size="sm" disabled={pending} className="w-full">
        {pending ? <Loader2 className="animate-spin" /> : null}
        {pending ? t('Vérification…') : t('Se connecter')}
      </Button>

      <p className="flex items-start gap-1.5 text-[0.6875rem] leading-relaxed text-ink-muted">
        <ShieldCheck className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />{t('Ce que vous avez déjà suivi ou surveillé depuis ce navigateur rejoindra votre compte.')}</p>
    </form>
  )
}

function Feedback({ children }: { children: React.ReactNode }) {
  return (
    <p
      role="status"
      className="rounded-control border border-down/40 bg-down-soft px-3 py-2 text-xs leading-relaxed text-ink"
    >
      {children}
    </p>
  )
}

/**
 * Traduction des refus.
 *
 * Aucun message ne révèle si l'adresse est connue — voir `lib/auth-actions.ts`. Les
 * cas listés décrivent tous soit une saisie à corriger, soit une panne de notre côté.
 */
function message(result: Extract<AuthResult, { ok: false }>): string {
  switch (result.reason) {
    case 'unavailable':
      return 'La connexion n’est pas configurée sur cette instance.'
    case 'invalid-email':
      return 'Cette adresse ne semble pas valide.'
    case 'too-many':
      return 'Trop de codes demandés pour cette adresse. Réessayez dans une heure.'
    case 'send-failed':
      return 'Le courriel n’a pas pu partir. Réessayez dans un instant.'
    case 'code-missing':
      return 'Aucun code en attente pour cette adresse. Demandez-en un nouveau.'
    case 'code-expired':
      return 'Ce code a expiré. Demandez-en un nouveau.'
    case 'code-exhausted':
      return 'Trop d’essais : ce code est annulé. Demandez-en un nouveau.'
    case 'code-wrong':
      return result.left !== undefined && result.left > 0
        ? `Code incorrect — ${result.left} essai${result.left > 1 ? 's' : ''} restant${result.left > 1 ? 's' : ''}.`
        : 'Code incorrect.'
    default:
      return 'La connexion a échoué. Réessayez.'
  }
}
