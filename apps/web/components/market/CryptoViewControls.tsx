import Link from 'next/link'

import {
  CHANGE_PERIODS,
  CRYPTO_VIEWS,
  cryptoHref,
  type ChangePeriod,
  type CryptoView,
} from '@/components/market/crypto-views'

/**
 * Onglets de vue et sélecteur de période.
 *
 * Ce sont des LIENS, pas des boutons, et c'est la conséquence directe d'avoir mis
 * l'état dans l'URL : chaque vue est une adresse réelle, donc ouvrable dans un
 * nouvel onglet, partageable et indexable. Un groupe de boutons aurait imposé du
 * JavaScript pour naviguer vers ce qui est déjà une page.
 *
 * `aria-current="page"` plutôt que `aria-pressed` : un lien vers la vue courante se
 * décrit comme la page en cours, pas comme un interrupteur enfoncé.
 */
export function CryptoViewControls({
  basePath,
  view,
  period,
}: {
  basePath: string
  view: CryptoView
  period: ChangePeriod
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <nav aria-label="Vue du classement" className="flex flex-wrap items-center gap-1">
        {CRYPTO_VIEWS.map((entry) => {
          const active = entry.key === view

          return (
            <Link
              key={entry.key}
              // Changer de vue remet en page 1 : rester en page 4 afficherait un
              // extrait arbitraire d'un classement qui n'a plus rien à voir.
              href={cryptoHref(basePath, { view: entry.key, period })}
              aria-current={active ? 'page' : undefined}
              className={`rounded-card px-3.5 py-2 text-sm font-medium transition-colors ${
                active
                  ? 'bg-surface-muted text-ink'
                  : 'text-ink-muted hover:bg-surface-muted hover:text-ink'
              }`}
            >
              {entry.label}
            </Link>
          )
        })}
      </nav>

      <div
        className="flex flex-wrap items-center gap-1 rounded-card border border-border-subtle bg-surface p-1"
        role="group"
        aria-label="Période de variation"
      >
        {CHANGE_PERIODS.map((entry) => {
          const active = entry.key === period

          return (
            <Link
              key={entry.key}
              href={cryptoHref(basePath, { view, period: entry.key })}
              aria-current={active ? 'page' : undefined}
              title={`Variation ${entry.longLabel}`}
              className={`tabular rounded-[0.5rem] px-2.5 py-1 text-xs font-medium transition-colors ${
                active
                  ? 'bg-brand text-on-brand'
                  : 'text-ink-muted hover:bg-surface-muted hover:text-ink'
              }`}
            >
              {entry.label}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
