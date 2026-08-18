'use client'

import { Bell, Loader2, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, useTransition } from 'react'

import { Link } from '@/i18n/navigation'
import { useCurrency } from '@/components/locale/CurrencyProvider'
import { createPriceAlert, type AlertActionResult } from '@/lib/alert-actions'
import { readIdentityCookie } from '@/lib/identity-cookie'
import { usePhrase } from '@/components/locale/ContentProvider'

/**
 * Création d'une alerte de prix — fenêtre complète, sur le modèle de TradingView.
 *
 * ── POURQUOI UNE FENÊTRE, LÀ OÙ IL Y AVAIT UN TIROIR ──────────────────────────
 *
 * L'ancienne version était un panneau de 288 pixels accroché sous le bouton, avec
 * trois champs : sens, seuil, valider. Il tenait tant que l'alerte n'avait que trois
 * réglages.
 *
 * Elle en a désormais six — sens, seuil, récurrence, échéance, nom, message — plus
 * l'adresse de notification, que le retrait des comptes obligés à demander. Sept
 * champs dans un tiroir de 288 pixels, c'est une colonne de deux cents pixels de haut
 * posée par-dessus le graphique qu'on est en train de lire, et dont la moitié basse
 * sort de l'écran sur un portable.
 *
 * ── CE QUI EST REPRIS DE LA RÉFÉRENCE, ET CE QUI NE L'EST PAS ─────────────────
 *
 * REPRIS : la STRUCTURE en quatre blocs — condition, déclenchement, identité de
 * l'alerte, notification. C'est une grammaire éprouvée, et elle range les réglages
 * dans l'ordre où on se les pose : « à quel moment », puis « combien de fois », puis
 * « comment je la reconnaîtrai », puis « où me prévenir ».
 *
 * PAS REPRIS : son vocabulaire d'analyse technique. « Crossing », « Once Per Bar
 * Close », « Entering Channel » supposent un graphique en bougies et une notion de
 * période de compilation. Ce site publie des cours, pas une plateforme de trading :
 * la condition tient en deux sens de franchissement, et la récurrence en deux
 * valeurs.
 *
 * PAS REPRIS NON PLUS : ses six canaux de notification (application, fenêtre
 * surgissante, son, courriel-vers-SMS, webhook…). Nous n'en avons qu'un, le courriel,
 * et afficher cinq cases grisées ferait passer une fonction complète pour une
 * démonstration.
 *
 * ── L'ADRESSE EST MÉMORISÉE CÔTÉ NAVIGATEUR ───────────────────────────────────
 *
 * Un visiteur connecté la voit pré-remplie depuis son compte. Un visiteur anonyme la
 * saisit une fois ; elle est conservée en local pour les alertes suivantes. Sans ce
 * rappel, armer trois alertes reviendrait à taper trois fois la même adresse.
 *
 * ── LE SEUIL SE SAISIT DANS LA DEVISE AFFICHÉE, ET SE RANGE DANS CELLE DE LA SOURCE
 *
 * C'est le point le plus délicat de ce composant, et il corrige un défaut réel : la
 * fenêtre demandait un seuil dans la devise de la SOURCE — l'euro pour la crypto —
 * pendant que la page affichait des dollars. Quelqu'un qui lisait « 63 067 $ » et
 * tapait « 65 000 » armait en réalité une alerte à 65 000 €, soit près de 20 % plus
 * haut que ce qu'il croyait. L'écart ne se voyait nulle part.
 *
 * Le champ travaille donc dans la devise CHOISIE PAR LE LECTEUR, et la valeur est
 * reconvertie vers celle de la source juste avant l'enregistrement. C'est cette
 * dernière qui est stockée, et il le faut : la tâche planifiée interroge les
 * fournisseurs avec le code de devise de la ligne, et tous n'acceptent pas le bitcoin
 * ou l'once d'or comme devise de cotation.
 *
 * Un TAUX DE CHANGE ne se convertit pas : « EUR/USD = 1,15 » est un rapport, pas un
 * montant. Sur une paire de devises, le champ reste donc dans l'unité de la source.
 */

/** Clé de mémorisation de l'adresse — locale au navigateur, jamais envoyée seule. */
const EMAIL_KEY = 'zenkuu:alert-email'

type Direction = 'above' | 'below'
type Trigger = 'once' | 'recurring'

/** Écarts proposés en un clic, en pourcentage du cours courant. */
const QUICK_OFFSETS = [-10, -5, 5, 10] as const

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
  /** Devise dans laquelle la SOURCE cote cet actif — celle qui sera stockée. */
  currency: string
  price: number
  path: string
  /**
   * Faux sans base ou sans service d'envoi.
   *
   * Ce n'est plus une question de SESSION : une alerte s'arme sans compte, rangée
   * sous le cookie anonyme du visiteur. Seules deux briques d'exploitation peuvent
   * manquer, et le bouton devient alors un lien vers la page qui l'explique.
   */
  available: boolean
}) {
  const t = usePhrase()
  const [open, setOpen] = useState(false)
  const [done, setDone] = useState(false)

  if (!available) {
    return (
      <Link
        href="/alertes"
        className="inline-flex items-center gap-1.5 rounded-control border border-border-subtle px-3 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:border-brand hover:text-ink"
      >
        <Bell className="h-3.5 w-3.5" aria-hidden="true" />{t('Créer une alerte')}</Link>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
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
        <AlertDialog
          assetClass={assetClass}
          assetId={assetId}
          label={label}
          {...(symbol ? { symbol } : {})}
          currency={currency}
          price={price}
          path={path}
          isRate={assetClass === 'forex'}
          onClose={() => setOpen(false)}
          onCreated={() => {
            setOpen(false)
            setDone(true)
            window.setTimeout(() => setDone(false), 3000)
          }}
        />
      ) : null}
    </>
  )
}

function AlertDialog({
  assetClass,
  assetId,
  label,
  symbol,
  currency,
  price,
  path,
  isRate,
  onClose,
  onCreated,
}: {
  assetClass: string
  assetId: string
  label: string
  symbol?: string
  currency: string
  price: number
  path: string
  /** Paire de devises : le cours est un rapport, il ne se convertit pas. */
  isRate: boolean
  onClose: () => void
  onCreated: () => void
}) {
  const t = usePhrase()
  const { currency: display, convert } = useCurrency()

  /*
   * Devise de saisie, et facteur qui ramène le champ vers celle de la source.
   *
   * `convert(1, currency)` donne ce que vaut UNE unité de la source dans la devise du
   * lecteur. Diviser par ce facteur fait le chemin inverse. Quand un taux manque, le
   * fournisseur renvoie le montant inchangé — le facteur vaut alors 1, la saisie reste
   * dans la devise de la source, et l'étiquette du champ le dit puisqu'elle affiche
   * `entryCurrency`. Aucun chiffre approché n'est produit (§5).
   */
  const entryCurrency = isRate ? currency : display
  const factor = isRate ? 1 : convert(1, currency)
  const shownPrice = isRate ? price : convert(price, currency)

  const [direction, setDirection] = useState<Direction>('above')
  const [threshold, setThreshold] = useState(() => suggest(shownPrice, 5))
  const [trigger, setTrigger] = useState<Trigger>('once')
  const [expires, setExpires] = useState('')
  const [title, setTitle] = useState(`${label} — alerte de prix`)
  const [note, setNote] = useState('')
  const [email, setEmail] = useState('')
  const [feedback, setFeedback] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const panelRef = useRef<HTMLDivElement>(null)

  /* Adresse pré-remplie : celle du compte s'il y en a un, sinon la dernière saisie
     retenue dans ce navigateur. Les deux sources sont lues au montage, dans cet
     ordre de priorité. */
  useEffect(() => {
    const identity = readIdentityCookie()
    if (identity) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEmail(identity.email)
      return
    }
    try {
      const stored = window.localStorage.getItem(EMAIL_KEY)
      if (stored) setEmail(stored)
    } catch {
      // Stockage refusé — navigation privée. Le champ reste simplement vide.
    }
  }, [])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  /*
   * Distance du seuil au cours, en pourcentage.
   *
   * Affichée sous le champ, et ce n'est pas un ornement : « 132 480 » ne dit rien sur
   * un actif coté 118 000, alors que « +12,3 % » dit immédiatement si l'alerte se
   * déclenchera demain ou dans six mois. C'est la seule vérification que l'auteur
   * puisse faire de tête avant de valider.
   */
  const gap = useMemo(() => {
    const value = Number(threshold.replace(',', '.'))
    if (!Number.isFinite(value) || shownPrice <= 0) return null
    return ((value - shownPrice) / shownPrice) * 100
  }, [threshold, shownPrice])

  /*
   * Cohérence entre le sens et le seuil.
   *
   * Un seuil « au-dessus » posé sous le cours courant est déjà franchi : l'alerte
   * partirait au premier passage de la tâche planifiée, quelques minutes plus tard.
   * Ce n'est pas une erreur de saisie à refuser — c'est peut-être exactement ce qu'on
   * veut — mais c'est une surprise à annoncer.
   */
  const immediate =
    gap !== null && ((direction === 'above' && gap <= 0) || (direction === 'below' && gap >= 0))

  function submit(event: React.FormEvent) {
    event.preventDefault()
    setFeedback(null)

    /* La saisie repart vers la devise de la source — voir l'en-tête du fichier. */
    const entered = Number(threshold.replace(',', '.'))
    const value = factor > 0 ? entered / factor : entered
    const expiresAt = expires ? new Date(expires).getTime() : undefined

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
        email: email.trim(),
        ...(title.trim() ? { title: title.trim() } : {}),
        ...(note.trim() ? { note: note.trim() } : {}),
        recurring: trigger === 'recurring',
        ...(expiresAt !== undefined && Number.isFinite(expiresAt) ? { expiresAt } : {}),
      })

      if (!result.ok) {
        setFeedback(reasonLabel(result))
        return
      }

      try {
        window.localStorage.setItem(EMAIL_KEY, email.trim())
      } catch {
        // Voir plus haut : l'alerte est créée, seul le rappel de l'adresse est perdu.
      }

      onCreated()
    })
  }

  return (
    <div
      className="fixed inset-0 z-[120] flex items-start justify-center overflow-y-auto px-4 py-[6vh]"
      role="dialog"
      aria-modal="true"
      aria-label={`Créer une alerte sur ${label}`}
    >
      <button
        type="button"
        className="fixed inset-0 cursor-default bg-canvas/80 backdrop-blur-sm"
        aria-label="Fermer"
        onClick={onClose}
      />

      <div
        ref={panelRef}
        className="relative w-full max-w-md rounded-card border border-border-subtle bg-overlay shadow-overlay"
      >
        <div className="flex items-start justify-between gap-3 border-b border-border-subtle px-4 py-3">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-ink">{t('Créer une alerte')}</h2>
            <p className="truncate text-xs text-ink-muted">
              {label}
              {symbol ? <span className="uppercase"> · {symbol}</span> : null}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="-mr-1 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-sm text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-5 p-4">
          {/* ── 1. CONDITION ────────────────────────────────────────────────── */}
          <Section title="Condition">
            <div className="flex gap-1" role="group" aria-label={t('Sens du franchissement')}>
              {(['above', 'below'] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setDirection(value)
                    /* Le seuil suggéré suit le sens : passer de « au-dessus » à
                       « en dessous » en gardant un seuil supérieur au cours donnerait
                       une alerte immédiatement vraie. */
                    setThreshold(suggest(shownPrice, value === 'above' ? 5 : -5))
                  }}
                  aria-pressed={direction === value}
                  className={`flex-1 rounded-control border px-2 py-1.5 text-xs font-medium transition-colors ${
                    direction === value
                      ? 'border-brand bg-brand text-on-brand'
                      : 'border-border-subtle text-ink-muted hover:border-brand hover:text-ink'
                  }`}
                >
                  {value === 'above' ? 'Monte au-dessus de' : 'Descend sous'}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 rounded-control border border-border-subtle bg-surface px-2.5 focus-within:border-brand">
              <input
                type="text"
                inputMode="decimal"
                value={threshold}
                onChange={(event) => setThreshold(event.target.value)}
                aria-label={`Seuil en ${entryCurrency.toUpperCase()}`}
                className="tabular h-9 w-full bg-transparent text-sm text-ink outline-none"
              />
              <span className="shrink-0 text-xs font-medium uppercase text-ink-muted">
                {entryCurrency}
              </span>
            </div>

            {/* Raccourcis d'écart. Ils remplacent le calcul mental « combien font
                cinq pour cent de 118 342 ? », qui est le vrai obstacle à poser un
                seuil sensé sur un actif à cinq chiffres. */}
            <div className="flex flex-wrap gap-1">
              {QUICK_OFFSETS.map((offset) => (
                <button
                  key={offset}
                  type="button"
                  onClick={() => {
                    setThreshold(suggest(shownPrice, offset))
                    setDirection(offset > 0 ? 'above' : 'below')
                  }}
                  className="tabular rounded-control border border-border-subtle px-2 py-1 text-[0.6875rem] font-medium text-ink-muted transition-colors hover:border-brand hover:text-ink"
                >
                  {offset > 0 ? '+' : ''}
                  {offset} %
                </button>
              ))}
            </div>

            <p className="flex flex-wrap items-baseline gap-x-2 text-[0.6875rem] text-ink-muted">
              <span>
                Cours actuel : <span className="tabular text-ink">{format(shownPrice)}</span>{' '}
                {entryCurrency.toUpperCase()}
              </span>
              {gap !== null ? (
                <span className="tabular">
                  · seuil à {gap >= 0 ? '+' : ''}
                  {gap.toFixed(1)} %
                </span>
              ) : null}
            </p>

            {immediate ? (
              <p className="rounded-control border border-accent/40 bg-accent-soft px-2.5 py-1.5 text-[0.6875rem] leading-relaxed text-ink">{t('Ce seuil est déjà franchi : l’alerte partira au prochain relevé, dans quelques minutes.')}</p>
            ) : null}
          </Section>

          {/* ── 2. DÉCLENCHEMENT ────────────────────────────────────────────── */}
          <Section title={t('Déclenchement')}>
            <div className="flex gap-1" role="group" aria-label={t('Fréquence')}>
              {(
                [
                  { value: 'once', label: 'Une seule fois', hint: 'L’alerte se désarme après l’envoi' },
                  { value: 'recurring', label: 'À chaque fois', hint: 'Au plus un envoi par jour' },
                ] as const
              ).map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setTrigger(option.value)}
                  aria-pressed={trigger === option.value}
                  title={option.hint}
                  className={`flex-1 rounded-control border px-2 py-1.5 text-xs font-medium transition-colors ${
                    trigger === option.value
                      ? 'border-brand bg-brand-soft text-brand-strong'
                      : 'border-border-subtle text-ink-muted hover:border-brand hover:text-ink'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <label className="block">
              <span className="mb-1 block text-[0.6875rem] text-ink-muted">{t('Échéance — vide pour une surveillance sans fin')}</span>
              <input
                type="date"
                value={expires}
                min={isoDay(1)}
                max={isoDay(365)}
                onChange={(event) => setExpires(event.target.value)}
                className="h-9 w-full rounded-control border border-border-subtle bg-surface px-2.5 text-sm text-ink outline-none focus:border-brand"
              />
            </label>
          </Section>

          {/* ── 3. IDENTITÉ DE L'ALERTE ─────────────────────────────────────── */}
          <Section title="Nom et message">
            <input
              type="text"
              value={title}
              maxLength={80}
              onChange={(event) => setTitle(event.target.value)}
              aria-label={t('Nom de l’alerte')}
              placeholder={t('Nom de l’alerte')}
              className="h-9 w-full rounded-control border border-border-subtle bg-surface px-2.5 text-sm text-ink outline-none focus:border-brand placeholder:text-ink-muted"
            />
            <textarea
              value={note}
              maxLength={280}
              rows={2}
              onChange={(event) => setNote(event.target.value)}
              aria-label="Message"
              placeholder={t('Message repris dans le courriel — « sortir la moitié », « vérifier le volume »…')}
              className="w-full resize-none rounded-control border border-border-subtle bg-surface px-2.5 py-2 text-sm text-ink outline-none focus:border-brand placeholder:text-ink-muted"
            />
          </Section>

          {/* ── 4. NOTIFICATION ─────────────────────────────────────────────── */}
          <Section title="Notification">
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              aria-label={t('Adresse de notification')}
              placeholder="vous@exemple.fr"
              className="h-9 w-full rounded-control border border-border-subtle bg-surface px-2.5 text-sm text-ink outline-none focus:border-brand placeholder:text-ink-muted"
            />
            <p className="text-[0.6875rem] leading-relaxed text-ink-muted">{t('Le courriel est notre seul canal. Aucun compte n’est nécessaire : l’alerte est rattachée à ce navigateur, et à votre compte si vous en ouvrez un.')}</p>
          </Section>

          {feedback ? (
            <p
              role="status"
              className="rounded-control border border-down/40 bg-down-soft px-3 py-2 text-xs leading-relaxed text-ink"
            >
              {feedback}
            </p>
          ) : null}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-9 flex-1 rounded-control border border-border-subtle text-sm font-medium text-ink-muted transition-colors hover:text-ink"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={pending}
              className="flex h-9 flex-1 items-center justify-center gap-2 rounded-control bg-brand text-sm font-medium text-on-brand transition-colors hover:bg-brand-strong disabled:opacity-60"
            >
              {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : null}
              {pending ? 'Enregistrement…' : 'Créer l’alerte'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/** Bloc titré de la fenêtre — la structure en quatre sections de la référence. */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-[0.6875rem] font-medium uppercase tracking-wide text-ink-muted">
        {title}
      </h3>
      {children}
    </section>
  )
}

/**
 * Seuil suggéré : le cours augmenté d'un pourcentage.
 *
 * La précision suit l'ordre de grandeur — six décimales sous l'unité, deux au-dessus.
 * Un seuil affiché « 0.00 » sur un jeton coté 0,000042 serait inutilisable, et
 * « 43125.938291 » sur un indice serait du bruit.
 */
function suggest(price: number, percent: number): string {
  const target = price * (1 + percent / 100)
  return target < 1 ? target.toFixed(6) : target.toFixed(2)
}

/** Même règle de précision, pour l'affichage du cours de référence. */
function format(price: number): string {
  return price < 1 ? price.toFixed(6) : price.toFixed(2)
}

/**
 * Date ISO à N jours d'ici — bornes du sélecteur d'échéance.
 *
 * Le minimum est DEMAIN et non aujourd'hui : une échéance posée au jour même expire à
 * minuit, c'est-à-dire dans les heures qui suivent, ce que personne n'entend en
 * choisissant la date du jour.
 */
function isoDay(offset: number): string {
  const date = new Date(Date.now() + offset * 24 * 60 * 60 * 1000)
  return date.toISOString().slice(0, 10)
}

function reasonLabel(result: Extract<AlertActionResult, { ok: false }>): string {
  switch (result.reason) {
    case 'limit-reached':
      return `Vous avez déjà ${result.limit} alertes armées, le maximum du site. Supprimez-en une depuis la page Alertes.`
    case 'mailer-disabled':
      return 'L’envoi de courriel n’est pas configuré sur cette instance : les alertes ne peuvent pas être notifiées.'
    case 'db-disabled':
      return 'La base de données n’est pas configurée : l’alerte ne serait pas conservée.'
    case 'invalid':
      return 'Vérifiez le seuil, l’échéance et l’adresse : l’un des trois n’est pas valide.'
    default:
      return 'L’enregistrement a échoué. Réessayez.'
  }
}
