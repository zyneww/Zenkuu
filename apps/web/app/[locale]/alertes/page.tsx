import type { Metadata } from 'next'
import { Link } from '@/i18n/navigation'

import { DB_ENABLED, listAlerts } from '@zenkuu/db'
import { EmptyState } from '@zenkuu/ui'

import { AlertList, type AlertRow } from '@/components/alerts/AlertList'
import { assetHref } from '@/lib/asset-routes'
import { ALERT_LIMIT } from '@/lib/limits'
import { MAILER_ENABLED } from '@/lib/mailer'
import { currentAccount, ownerId } from '@/lib/session'
import type { AssetClass } from '@zenkuu/data'

export const metadata: Metadata = {
  title: 'Mes alertes',
  // Page strictement personnelle : son contenu diffère pour chaque visiteur.
  robots: { index: false, follow: false },
}

/**
 * Alertes de prix.
 *
 * ── CE QUE LE RETRAIT DES COMPTES OBLIGATOIRES A CHANGÉ ICI ───────────────────
 *
 * Cette page commençait par trois refus en cascade : pas d'authentification
 * configurée, pas de session ouverte, pas de service d'envoi. Le deuxième a disparu —
 * une alerte s'arme sans compte, rangée sous le cookie anonyme du navigateur — et
 * avec lui l'écran « connectez-vous » qui barrait l'accès à quiconque n'avait pas
 * d'adresse à donner.
 *
 * Il en reste deux, et ils décrivent tous deux une CONFIGURATION MANQUANTE côté
 * exploitant, jamais un manque du côté du visiteur. Ils restent distincts : dire
 * « indisponible » sans dire laquelle oblige à fouiller deux configurations pour en
 * corriger une.
 *
 * ⚠️ Le service d'envoi est vérifié ICI, à l'affichage, et non seulement à la
 * création. Une page qui proposerait de créer des alertes sur une instance sans
 * expéditeur promettrait une surveillance inexistante — c'est le §5 appliqué à une
 * fonction plutôt qu'à un chiffre.
 */
export default async function AlertesPage() {
  if (!DB_ENABLED) {
    return (
      <Shell>
        <EmptyState
          title="Base de données non configurée"
          description="Les alertes sont conservées en base. Tant qu’aucune n’est configurée sur cette instance, elles ne peuvent pas être enregistrées."
          action={<HomeLink />}
        />
      </Shell>
    )
  }

  if (!MAILER_ENABLED) {
    return (
      <Shell>
        <EmptyState
          title="Envoi de courriel non configuré"
          description="Les alertes de prix préviennent par courriel. Tant que le service d’envoi n’est pas configuré sur cette instance, elles ne sont pas proposées — plutôt que d’être enregistrées sans jamais partir."
          action={<HomeLink />}
        />
      </Shell>
    )
  }

  const [owner, account] = await Promise.all([ownerId(), currentAccount()])

  /* Aucun identifiant : ce visiteur n'a jamais rien enregistré depuis ce navigateur.
     C'est l'état d'une première visite, et il se traite comme une liste vide — pas
     comme un refus. */
  const result = owner ? await listAlerts(owner) : null

  if (result && !result.ok) {
    return (
      <Shell>
        <EmptyState
          title="Alertes indisponibles"
          description={result.reason}
          action={<HomeLink />}
        />
      </Shell>
    )
  }

  const alerts = result?.ok ? result.data : []
  const armed = alerts.filter((alert) => alert.active).length

  if (alerts.length === 0) {
    return (
      <Shell quota={{ armed, limit: ALERT_LIMIT }} signedIn={account !== null}>
        <EmptyState
          title="Aucune alerte"
          description="Ouvrez la fiche d’un actif et utilisez « Créer une alerte » pour être prévenu par courriel au franchissement d’un seuil. Aucun compte n’est nécessaire."
          action={
            <Link
              href="/crypto"
              className="inline-block bg-brand px-5 py-2.5 text-sm font-medium text-on-brand transition-colors hover:bg-brand-strong"
            >
              Parcourir les cryptomonnaies
            </Link>
          }
        />
      </Shell>
    )
  }

  const dateFormat = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
  const dayFormat = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short' })

  const rows: AlertRow[] = alerts.map((alert) => ({
    id: alert.id,
    href: assetHref(alert.assetClass as AssetClass, alert.assetId),
    label: alert.label,
    symbol: alert.symbol,
    title: alert.title,
    note: alert.note,
    direction: alert.direction,
    threshold: money(alert.threshold, alert.currency),
    active: alert.active,
    recurring: alert.recurring,
    expiresAt: alert.expiresAt ? dayFormat.format(alert.expiresAt) : null,
    triggeredAt: alert.triggeredAt ? dateFormat.format(alert.triggeredAt) : null,
    triggeredPrice:
      alert.triggeredPrice === null ? null : money(alert.triggeredPrice, alert.currency),
  }))

  return (
    <Shell quota={{ armed, limit: ALERT_LIMIT }} signedIn={account !== null}>
      <AlertList alerts={rows} />
    </Shell>
  )
}

/**
 * Mise en forme monétaire, tolérante à une devise inconnue.
 *
 * `Intl.NumberFormat` lève sur un code ISO invalide. Comme la devise est stockée en
 * base et pourrait provenir d'une donnée ancienne, la page entière tomberait sur une
 * seule ligne fautive — un prix mal formaté est préférable à une page blanche.
 */
function money(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency.toUpperCase(),
      maximumFractionDigits: value < 1 ? 6 : 2,
    }).format(value)
  } catch {
    return `${value} ${currency.toUpperCase()}`
  }
}

function Shell({
  children,
  quota,
  signedIn = false,
}: {
  children: React.ReactNode
  quota?: { armed: number; limit: number }
  /**
   * Décide du rappel de portabilité affiché sous le quota.
   *
   * Il n'est montré qu'aux visiteurs ANONYMES, et c'est l'essentiel : leurs alertes
   * vivent dans un cookie, et un nettoyage du navigateur les efface. Le dire est une
   * obligation d'honnêteté, pas une invitation commerciale — d'où le ton, et d'où le
   * fait qu'il disparaisse dès qu'un compte existe.
   */
  signedIn?: boolean
}) {
  return (
    <div className="mx-auto max-w-2xl space-y-6 py-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-ink">Mes alertes</h1>
        <p className="text-sm leading-relaxed text-ink-muted">
          Les cours sont relevés toutes les quinze minutes. Au franchissement du seuil, un
          courriel part sur l’adresse indiquée à la création. Une alerte ordinaire se désarme
          alors ; une alerte « à chaque fois » reste armée, avec au plus un envoi par jour.
        </p>
      </header>

      {quota ? (
        <div className="space-y-2">
          <p className="rounded-card border border-border-subtle bg-surface px-4 py-3 text-sm text-ink-muted">
            <span className="tabular text-ink">
              {quota.armed} / {quota.limit}
            </span>{' '}
            alertes armées.
          </p>

          {!signedIn ? (
            <p className="rounded-card border border-border-subtle bg-surface-muted px-4 py-3 text-xs leading-relaxed text-ink-muted">
              Ces alertes sont rattachées à <strong className="font-medium text-ink">ce
              navigateur</strong>, pas à un compte. Elles ne suivront pas sur un autre appareil et
              disparaîtront si vous effacez vos données de navigation. Se connecter les rattache à
              une adresse, et les récupère telles quelles.
            </p>
          ) : null}
        </div>
      ) : null}

      {children}
    </div>
  )
}

function HomeLink() {
  return (
    <Link
      href="/"
      className="inline-block bg-brand px-5 py-2.5 text-sm font-medium text-on-brand transition-colors hover:bg-brand-strong"
    >
      Retour à l’accueil
    </Link>
  )
}
