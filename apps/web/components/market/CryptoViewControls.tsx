import { Link } from '@/i18n/navigation'

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
            className={`rounded-control px-3.5 py-2 text-sm font-medium transition-colors ${
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
  )
}

/**
 * LE SÉLECTEUR DE PÉRIODE, SÉPARÉ DES ONGLETS DE VUE.
 *
 * Les deux vivaient sur la même rangée, aux deux bords. Ils ne commandent pourtant pas
 * la même chose : l'onglet change LE CLASSEMENT SERVI, la période change ce qu'une
 * COLONNE affiche. La période rejoint donc « Personnaliser », au-dessus du tableau, où
 * se règle tout ce qui touche à l'affichage — c'est le même regroupement que sur les
 * pages à état local (voir `MarketBrowser`).
 *
 * Ce sont toujours des LIENS : la période vit dans l'adresse sur cette page, et un
 * groupe de boutons aurait imposé du JavaScript pour atteindre ce qui est déjà une URL.
 * L'apparence est en revanche alignée sur le groupe local — fond plein, pas de filet —
 * pour que le même réglage se reconnaisse d'une page à l'autre.
 */
export function CryptoPeriodLinks({
  basePath,
  view,
  period,
}: {
  basePath: string
  view: CryptoView
  period: ChangePeriod
}) {
  return (
    <div
      className="flex items-center gap-0.5 rounded-control bg-surface-muted p-0.5"
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
            className={`tabular rounded-sm px-2 py-1 text-xs font-medium transition-colors duration-150 ${
              active ? 'bg-brand text-on-brand' : 'text-ink-muted hover:text-ink'
            }`}
          >
            {entry.label}
          </Link>
        )
      })}
    </div>
  )
}
