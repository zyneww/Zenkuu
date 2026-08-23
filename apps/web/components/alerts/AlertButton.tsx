'use client'

import { Bell, Loader2 } from 'lucide-react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Switch } from '@/components/ui/switch'
import { useEffect, useMemo, useRef, useState, useTransition } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from '@/components/ui/input-group'
import { Textarea } from '@/components/ui/textarea'
import { ButtonLink } from '@/components/ui/ButtonLink'
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
      /* `ButtonLink` et non `Button href` : l'adresse doit garder son préfixe de
         locale, que seul le `Link` de next-intl pose. Voir l'en-tête de `ButtonLink`. */
      <ButtonLink href="/alertes" variant="outline" size="sm">
        <Bell className="mr-1.5 inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" />
        {t('Créer une alerte')}
      </ButtonLink>
    )
  }

  return (
    <>
      <Button
        size="sm"
        variant={done ? 'default' : 'outline'}
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
      >
        <Bell />
        {done ? 'Alerte créée' : 'Créer une alerte'}
      </Button>

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
    /*
      ── LA COQUE EST UN `Dialog` DE SHADCN/UI ─────────────────────────────────

      Le voile, le cadre, la croix, l'écoute d'Échap et le `<button>` plein écran qui
      servait de zone de clic extérieure vivaient tous ici. Radix les fournit, et il
      apporte en plus le piège à focus, l'`aria-hidden` sur le reste du document et le
      blocage du défilement du fond — trois manques que ce formulaire à sept champs
      payait cher : la tabulation en sortait par le bas et se perdait dans la page.

      `p-0` et `gap-0` : le contenu porte ses propres marges par bloc (l'en-tête à
      `px-4 py-3`, le formulaire à `p-4`), et le filet de séparation doit courir d'un
      bord à l'autre — une marge sur le conteneur l'aurait rentré de six pixels.
    */
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent
        ref={panelRef}
        className="max-w-md gap-0 border-border-subtle bg-overlay p-0 shadow-overlay sm:max-w-md"
      >
        <DialogHeader className="min-w-0 space-y-0 border-b border-border-subtle px-4 py-3 pr-10 text-left">
          <DialogTitle className="truncate text-sm font-semibold text-ink">
            {t('Créer une alerte')}
          </DialogTitle>
          <DialogDescription className="truncate text-xs text-ink-muted">
            {label}
            {symbol ? <span className="uppercase"> · {symbol}</span> : null}
          </DialogDescription>
        </DialogHeader>

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

            {/* `InputGroup` de shadcn/ui : le montant et sa devise forment UNE saisie,
                et c'est exactement ce que le groupe modélise — un champ, un complément
                accolé, un seul anneau de focus autour des deux. Ce montage était ici
                écrit à la main avec un `focus-within` sur la boîte.

                `align="inline-end"` place la devise APRÈS le nombre, comme on l'écrit.
                Le complément est un `InputGroupText` et non un `<span>` : il hérite du
                `cursor-text` du groupe, ce qui fait que cliquer sur « EUR » donne le
                focus au champ plutôt que de ne rien faire. */}
            <InputGroup size="sm">
              <InputGroupInput
                inputMode="decimal"
                value={threshold}
                onChange={(event) => setThreshold(event.target.value)}
                aria-label={`Seuil en ${entryCurrency.toUpperCase()}`}
                className="tabular"
              />
              <InputGroupAddon align="inline-end">
                <InputGroupText className="uppercase">{entryCurrency}</InputGroupText>
              </InputGroupAddon>
            </InputGroup>

            {/* Raccourcis d'écart. Ils remplacent le calcul mental « combien font
                cinq pour cent de 118 342 ? », qui est le vrai obstacle à poser un
                seuil sensé sur un actif à cinq chiffres. */}
            <div className="flex flex-wrap gap-1">
              {QUICK_OFFSETS.map((offset) => (
                <Button
                  key={offset}
                  size="xs"
                  variant="outline"
                  className="tabular"
                  onClick={() => {
                    setThreshold(suggest(shownPrice, offset))
                    setDirection(offset > 0 ? 'above' : 'below')
                  }}
                >
                  {offset > 0 ? '+' : ''}
                  {offset} %
                </Button>
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
              <p className="rounded-control border border-gold/40 bg-gold-soft px-2.5 py-1.5 text-[0.6875rem] leading-relaxed text-ink">{t('Ce seuil est déjà franchi : l’alerte partira au prochain relevé, dans quelques minutes.')}</p>
            ) : null}
          </Section>

          {/* ── 2. DÉCLENCHEMENT ────────────────────────────────────────────── */}
          <Section title={t('Déclenchement')}>
            {/*
              ── LA FRÉQUENCE DEVIENT UN `RadioGroup`, ET L'INDICE DEVIENT VISIBLE ──

              C'étaient deux `<button aria-pressed>`. Le motif est faux : `aria-pressed`
              décrit un interrupteur INDÉPENDANT — deux boutons pressés à la fois sont
              légitimes pour un lecteur d'écran — alors que ces deux options s'excluent.
              Un `RadioGroup` annonce « option 1 sur 2 », ce qui dit à la fois le choix
              et son étendue, et les flèches y naviguent.

              ⚠️ L'INDICE SORT DU `title`. « L'alerte se désarme après l'envoi » y était
              invisible au clavier comme au doigt — c'est-à-dire pour tout le monde sauf
              une souris patiente. Il devient une ligne de description sous chaque
              option, reliée par `aria-describedby` : lue à voix haute avec l'option, et
              lisible par tous. C'est la place qu'aurait dû avoir cette phrase.
            */}
            <RadioGroup
              value={trigger}
              onValueChange={(next) => setTrigger(next as Trigger)}
              aria-label={t('Fréquence')}
              className="gap-1"
            >
              {(
                [
                  { value: 'once', label: 'Une seule fois', hint: 'L’alerte se désarme après l’envoi' },
                  { value: 'recurring', label: 'À chaque fois', hint: 'Au plus un envoi par jour' },
                ] as const
              ).map((option) => (
                <div
                  key={option.value}
                  className={`flex items-start gap-2.5 rounded-control border px-2.5 py-2 transition-colors ${
                    trigger === option.value
                      ? 'border-brand bg-brand-soft'
                      : 'border-border-subtle hover:border-brand'
                  }`}
                >
                  <RadioGroupItem
                    value={option.value}
                    id={`frequence-${option.value}`}
                    aria-describedby={`frequence-${option.value}-indice`}
                    className="mt-0.5 size-3.5 shrink-0"
                  />
                  <div className="min-w-0">
                    <Label
                      htmlFor={`frequence-${option.value}`}
                      className={`cursor-pointer text-xs font-medium ${
                        trigger === option.value ? 'text-brand-strong' : 'text-ink'
                      }`}
                    >
                      {option.label}
                    </Label>
                    <p
                      id={`frequence-${option.value}-indice`}
                      className="text-[0.625rem] leading-snug text-ink-muted"
                    >
                      {option.hint}
                    </p>
                  </div>
                </div>
              ))}
            </RadioGroup>

            {/*
              ── L'ÉCHÉANCE DEVIENT UN INTERRUPTEUR, ET C'EST UNE CORRECTION ─────

              Le champ de date était toujours visible, sous l'étiquette « Échéance —
              vide pour une surveillance sans fin ». Autrement dit : la valeur par
              défaut — surveiller indéfiniment — s'obtenait en NE REMPLISSANT PAS un
              champ affiché comme s'il attendait quelque chose. C'est le genre de
              formulation qu'on relit deux fois avant de comprendre qu'on n'a rien à
              faire.

              `Switch` nomme le choix (« Fixer une échéance ») et `Collapsible` ne
              montre le champ qu'une fois qu'on l'a demandé. L'état par défaut ne
              demande plus rien, et il se lit.

              ⚠️ ÉTEINDRE L'INTERRUPTEUR VIDE LA DATE. Sans cela, une date saisie puis
              masquée continuerait d'être envoyée à l'enregistrement : l'alerte
              expirerait à une échéance que le formulaire n'affiche plus.
            */}
            <Collapsible
              open={expires !== ''}
              onOpenChange={(next) => setExpires(next ? isoDay(30) : '')}
              className="space-y-2"
            >
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="alerte-echeance" className="text-[0.6875rem] text-ink-muted">{t('Fixer une échéance')}</Label>
                <CollapsibleTrigger asChild>
                  <Switch id="alerte-echeance" checked={expires !== ''} />
                </CollapsibleTrigger>
              </div>

              <CollapsibleContent>
                {/* `type="date"` NATIF conservé : c'est le seul contrôle qui ouvre le
                    sélecteur du système en mobilité, et la grille de `DateRangeCalendar`
                    sert des PLAGES, pas une date isolée. Seul l'habillage vient d'ici. */}
                <Input
                  type="date"
                  value={expires}
                  min={isoDay(1)}
                  max={isoDay(365)}
                  onChange={(event) => setExpires(event.target.value)}
                  aria-label={t('Date d’échéance de l’alerte')}
                />
              </CollapsibleContent>
            </Collapsible>
          </Section>

          {/* ── 3. IDENTITÉ DE L'ALERTE ─────────────────────────────────────── */}
          <Section title="Nom et message">
            <Input
              size="sm"
              type="text"
              value={title}
              maxLength={80}
              onChange={(event) => setTitle(event.target.value)}
              aria-label={t('Nom de l’alerte')}
              placeholder={t('Nom de l’alerte')}
            />
            {/* `Textarea` de shadcn/ui — le SEUL `<textarea>` du site. Il portait
                autrefois sa propre bordure, son propre focus et son propre
                `placeholder`, à côté d'un `Input` du système posé six lignes plus
                haut : les deux champs du même bloc ne se ressemblaient pas au pixel.
                Ils partagent maintenant les mêmes jetons et le même anneau de focus.

                `resize-none` : la fenêtre est déjà dimensionnée, et une poignée de
                redimensionnement en bas à droite déborderait du cadre dès le premier
                tirage. Deux lignes suffisent — le message est repris tel quel dans un
                courriel, il n'a pas vocation à en faire dix. */}
            <Textarea
              value={note}
              maxLength={280}
              rows={2}
              onChange={(event) => setNote(event.target.value)}
              aria-label="Message"
              placeholder={t('Message repris dans le courriel — « sortir la moitié », « vérifier le volume »…')}
              className="resize-none text-sm"
            />
          </Section>

          {/* ── 4. NOTIFICATION ─────────────────────────────────────────────── */}
          <Section title="Notification">
            <Input
              size="sm"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              aria-label={t('Adresse de notification')}
              placeholder="vous@exemple.fr"
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
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Annuler
            </Button>
            {/* `type="submit"` traverse : le `Button` de shadcn/ui n'est qu'un `<button>`
                habillé, il transmet donc l'attribut natif — et c'est lui qui déclenche
                le `onSubmit` du formulaire, sans quoi la touche Entrée dans un champ
                n'enverrait plus rien. */}
            <Button
              type="submit"
              className="flex-1"
              disabled={pending}
            >
              {pending ? <Loader2 className="animate-spin" /> : null}
              {pending ? 'Enregistrement…' : 'Créer l’alerte'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
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
