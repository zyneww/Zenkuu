import type { Metadata } from 'next'
import { Link } from '@/i18n/navigation'

import { listAlerts } from '@zenkuu/db'
import { EmptyState } from '@zenkuu/ui'

import { AlertList, type AlertRow } from '@/components/alerts/AlertList'
import { assetHref } from '@/lib/asset-routes'
import { AUTH_ENABLED } from '@/lib/auth'
import { FEATURES, FREE_ALERT_LIMIT, PRO_ALERT_LIMIT } from '@/lib/billing'
import { hasFeature } from '@/lib/billing-server'
import { MAILER_ENABLED } from '@/lib/mailer'
import type { AssetClass } from '@zenkuu/data'

export const metadata: Metadata = {
  title: 'Mes alertes',
  // Page strictement personnelle : son contenu diffère pour chaque visiteur.
  robots: { index: false, follow: false },
}

/**
 * Alertes de prix.
 *
 * Trois briques doivent être présentes pour que la page ait un sens — comptes, base,
 * service d'envoi — et chacune manque indépendamment. Elles sont donc testées
 * séparément, avec un message distinct : dire « indisponible » sans dire laquelle
 * oblige l'exploitant à fouiller trois configurations pour en corriger une.
 *
 * ⚠️ Le service d'envoi est vérifié ICI, à l'affichage, et non seulement à la
 * création. Une page qui proposerait de créer des alertes sur une instance sans
 * expéditeur promettrait une surveillance inexistante — c'est le §5 appliqué à une
 * fonction plutôt qu'à un chiffre.
 */
export default async function AlertesPage() {
  if (!AUTH_ENABLED) {
    return (
      <Shell>
        <EmptyState
          title="Comptes non configurés"
          description="L’authentification n’est pas activée sur cette instance : les alertes ne peuvent pas être rattachées à un compte."
          action={<HomeLink />}
        />
      </Shell>
    )
  }

  const { auth } = await import('@clerk/nextjs/server')
  const { userId } = await auth()

  if (!userId) {
    return (
      <Shell>
        <EmptyState
          title="Connectez-vous pour gérer vos alertes"
          description="Vos alertes sont rattachées à votre compte, et la notification part sur l’adresse qui y est enregistrée."
          action={
            <Link
              href="/connexion"
              className="inline-block bg-brand px-5 py-2.5 text-sm font-medium text-on-brand transition-colors hover:bg-brand-strong"
            >
              Se connecter
            </Link>
          }
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

  const result = await listAlerts(userId)

  if (!result.ok) {
    return (
      <Shell>
        <EmptyState title="Alertes indisponibles" description={result.reason} action={<HomeLink />} />
      </Shell>
    )
  }

  const pro = await hasFeature(FEATURES.priceAlerts)
  const limit = pro ? PRO_ALERT_LIMIT : FREE_ALERT_LIMIT
  const armed = result.data.filter((alert) => alert.active).length

  if (result.data.length === 0) {
    return (
      <Shell quota={{ armed, limit, pro }}>
        <EmptyState
          title="Aucune alerte"
          description="Ouvrez la fiche d’un actif et utilisez « Créer une alerte » pour être prévenu par courriel au franchissement d’un seuil."
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

  const rows: AlertRow[] = result.data.map((alert) => ({
    id: alert.id,
    href: assetHref(alert.assetClass as AssetClass, alert.assetId),
    label: alert.label,
    symbol: alert.symbol,
    direction: alert.direction,
    threshold: money(alert.threshold, alert.currency),
    active: alert.active,
    triggeredAt: alert.triggeredAt ? dateFormat.format(alert.triggeredAt) : null,
    triggeredPrice:
      alert.triggeredPrice === null ? null : money(alert.triggeredPrice, alert.currency),
  }))

  return (
    <Shell quota={{ armed, limit, pro }}>
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
}: {
  children: React.ReactNode
  quota?: { armed: number; limit: number; pro: boolean }
}) {
  return (
    <div className="mx-auto max-w-2xl space-y-6 py-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-ink">Mes alertes</h1>
        <p className="text-sm leading-relaxed text-ink-muted">
          Les cours sont relevés toutes les quinze minutes. Au franchissement du seuil,
          un courriel part sur l’adresse de votre compte, et l’alerte se désarme — elle
          ne se répétera pas tant que vous ne l’aurez pas réarmée.
        </p>
      </header>

      {quota ? (
        <p className="rounded-card border border-border-subtle bg-surface px-4 py-3 text-sm text-ink-muted">
          <span className="tabular text-ink">
            {quota.armed} / {quota.limit}
          </span>{' '}
          alertes armées{quota.pro ? ' (offre Zenkuu Pro)' : ''}.
          {quota.pro ? null : (
            <>
              {' '}
              <Link href="/tarifs" className="text-brand hover:text-brand-strong">
                Zenkuu Pro en autorise {PRO_ALERT_LIMIT}
              </Link>
              .
            </>
          )}
        </p>
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
