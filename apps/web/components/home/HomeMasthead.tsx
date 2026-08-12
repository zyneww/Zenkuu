import { Coins, Flame, Layers, Newspaper, Sparkles, TrendingUp, Wallet } from 'lucide-react'

import type { GlobalMarketStats } from '@zenkuu/data'
import { formatNumber } from '@zenkuu/ui'

import { Link } from '@/i18n/navigation'
import { Money } from '@/components/locale/Money'

/**
 * Bandeau de tête de l'accueil — la date, deux compteurs, et les raccourcis.
 *
 * ── POURQUOI UNE DATE EN HAUT D'UNE PAGE DE MARCHÉ ────────────────────────────
 *
 * Reprise structurelle de Tokenomist, et ce n'est pas décoratif. Une page de marché
 * régénérée toutes les trois minutes est en permanence à cheval entre « en direct » et
 * « figée » ; annoncer la journée de cotation en tête dit au lecteur de QUEL jour
 * parlent les chiffres qu'il va lire, ce qu'aucun « il y a 2 min » ne dit vraiment.
 *
 * Le fuseau est ÉCRIT. La page est mise en cache côté serveur : la date est donc celle
 * du serveur, pas celle du lecteur, et un lecteur à Tokyo qui lirait « 13 août » sans
 * mention de fuseau se croirait la veille. C'est aussi ce qui évite tout écart
 * d'hydratation — rien ici n'est calculé dans le navigateur.
 *
 * ── LES COMPTEURS ────────────────────────────────────────────────────────────
 *
 * Deux, pas quatre. Ils répondent à « qu'est-ce que ce site couvre, au juste ? »,
 * question qu'on se pose une fois en arrivant et jamais ensuite. Les repères qui
 * bougent — volume, dominance, sentiment — vivent dans `GlobalStatsBar` juste en
 * dessous ; les mélanger ferait une bande de huit nombres dont aucun ne ressort.
 */
export function HomeMasthead({
  stats,
  trackedAssets,
  locale,
}: {
  stats: GlobalMarketStats | null
  /** Nombre d'actifs réellement interrogeables, toutes classes confondues. */
  trackedAssets: number
  locale: string
}) {
  /*
   * Formatage EXPLICITEMENT en UTC.
   *
   * `toLocaleDateString` sans `timeZone` prend le fuseau du processus, qui vaut UTC
   * en production sur Vercel mais l'heure de Paris sur la machine de développement.
   * La date affichée changerait donc de sens entre les deux environnements, et le
   * libellé « UTC » juste à côté deviendrait faux en local — le genre d'écart qu'on
   * ne remarque qu'une fois par an, la nuit du changement d'heure.
   */
  const today = new Date().toLocaleDateString(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })

  return (
    <section aria-label="Repères de couverture" className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <h2 className="display-sm first-letter:uppercase">
          {today}
          <span className="ml-2 align-middle text-xs font-normal text-ink-muted">UTC+00:00</span>
        </h2>

        <dl className="flex flex-wrap items-baseline gap-x-6 gap-y-1 text-sm">
          <Counter Icon={Coins} label="Actifs suivis">
            <span className="tabular">{formatNumber(trackedAssets)}</span>
          </Counter>

          {stats ? (
            <Counter Icon={Wallet} label="Capitalisation suivie">
              <Money value={stats.totalMarketCap} from={stats.currency} compact />
            </Counter>
          ) : null}
        </dl>
      </div>

      <ShortcutChips />
    </section>
  )
}

function Counter({
  Icon,
  label,
  children,
}: {
  Icon: typeof Coins
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-baseline gap-2">
      <Icon className="h-3.5 w-3.5 shrink-0 translate-y-0.5 text-ink-muted" aria-hidden="true" />
      <dt className="text-xs text-ink-muted">{label}</dt>
      <dd className="font-medium text-ink">{children}</dd>
    </div>
  )
}

/**
 * Raccourcis vers les cinq lectures les plus demandées.
 *
 * PILULES, et c'est le seul endroit de l'accueil qui en porte : le §3.1 réserve
 * l'arrondi complet aux formes closes qu'on ne prend pas pour des conteneurs. Une
 * rangée de rectangles à 4px se lirait comme une barre d'onglets — donc comme un
 * filtre qui change la page en dessous — alors que ces cinq-là PARTENT ailleurs.
 *
 * Les destinations existent toutes. Une puce qui ne mène nulle part dans un bandeau
 * de tête est la première chose qu'un visiteur essaie.
 */
function ShortcutChips() {
  const chips = [
    { label: 'Points saillants', href: '/crypto/highlights', Icon: Sparkles },
    { label: 'Tendances', href: '/crypto/graphiques', Icon: TrendingUp },
    { label: 'Plus fortes hausses', href: '/crypto/mouvements', Icon: Flame },
    { label: 'Nouvelles cotations', href: '/crypto/nouvelles', Icon: Layers },
    { label: 'Actualités', href: '/actualites', Icon: Newspaper },
  ] as const

  return (
    <nav aria-label="Raccourcis" className="flex flex-wrap gap-2">
      {chips.map(({ label, href, Icon }) => (
        <Link
          key={href}
          href={href}
          className="inline-flex items-center gap-1.5 rounded-pill border border-border-subtle px-3 py-1.5 text-xs font-medium text-ink-muted transition-colors duration-150 hover:border-brand hover:text-ink"
        >
          <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {label}
        </Link>
      ))}
    </nav>
  )
}
