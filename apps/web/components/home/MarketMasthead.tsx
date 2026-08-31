import { Coins, Flame, Layers, Newspaper, Sparkles, TrendingUp, Wallet } from 'lucide-react'
import type { ReactNode } from 'react'

import type { GlobalMarketStats } from '@zenkuu/data'
import { formatNumber } from '@zenkuu/ui'

import { Money } from '@/components/locale/Money'
import { Link } from '@/i18n/navigation'
import { getPhrase } from '@/lib/content'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * EN-TÊTE DATÉ — CE QUE LA PAGE COUVRE, AVANT CE QU'ELLE MONTRE
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── D'OÙ VIENT CE BLOC ──────────────────────────────────────────────────────
 *
 * De `HomeMasthead`, qui vivait ici jusqu'à la refonte « explorateur » et que le
 * passage à la recherche-d'abord avait retiré. Il est REPRIS plutôt que réécrit :
 * la forme demandée — date à gauche, compteurs de couverture à droite, rail de
 * raccourcis dessous — est exactement celle qu'il rendait déjà. Ce qui change tient
 * aux mesures, alignées sur celles relevées chez tokenomist.ai/overview :
 *
 *     date         `.display-sm` (22px)  →  `text-xl`, soit 20/24 en graisse 600
 *     fuseau       `text-xs` (12px), aligné sur la ligne de base de la date
 *     compteurs    libellé 13px atténué + valeur 13px pleine, jamais l'inverse
 *     pastilles    26px de haut, 12px de flanc, 13px en graisse 500
 *
 * ── POURQUOI LA DATE EST UN TITRE ET NON UNE MENTION ────────────────────────
 *
 * Un tableau de bord de marché est un instantané, et rien d'autre sur la page ne
 * le dit. Les chiffres qu'il porte n'ont de sens qu'à une date : posée en petit
 * dans un coin, elle se lit comme une décoration ; posée en tête, elle DATE tout
 * ce qui suit. C'est aussi ce qui permet aux compteurs de couverture d'être à côté
 * plutôt que dans une carte — ils répondent à la même question qu'elle.
 *
 * ── LE FUSEAU EST ÉCRIT, ET IL FAUT QU'IL LE RESTE ──────────────────────────
 *
 * `timeZone: 'UTC'` fige le rendu, sans quoi la date changerait selon le serveur
 * qui l'a mis en cache — et `revalidate` étant de trois minutes, deux visiteurs
 * pourraient lire deux jours différents à une minute d'intervalle. La mention
 * « UTC+00:00 » n'est donc pas un ornement : elle dit lequel des deux jours c'est.
 */
export async function MarketMasthead({
  stats,
  trackedAssets,
  locale,
}: {
  stats: GlobalMarketStats | null
  trackedAssets: number
  locale: string
}) {
  const t = await getPhrase()

  const today = new Date().toLocaleDateString(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })

  return (
    <section aria-label={t('Repères de couverture')} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        {/* `first-letter:uppercase` : `toLocaleDateString` rend « vendredi 22 août »
            en minuscule dans les langues qui ne capitalisent pas les jours. Le forcer
            dans le CSS plutôt que dans le JavaScript laisse chaque langue décider —
            une majuscule imposée en JavaScript serait fausse en turc, dont le « i »
            majuscule n'est pas « I ». */}
        <h2 className="text-xl font-semibold text-ink first-letter:uppercase">
          {today}
          <span className="ml-2 align-baseline text-xs font-normal tracking-normal text-ink-muted">
            UTC+00:00
          </span>
        </h2>

        <dl className="flex flex-wrap items-baseline gap-x-6 gap-y-1 text-sm">
          <Counter icon={<Coins aria-hidden="true" className="size-3.5" />} label={t('Actifs suivis')}>
            <span className="tabular">{formatNumber(trackedAssets)}</span>
          </Counter>

          {stats ? (
            <Counter
              icon={<Wallet aria-hidden="true" className="size-3.5" />}
              label={t('Capitalisation suivie')}
            >
              <Money value={stats.totalMarketCap} from={stats.currency} compact />
            </Counter>
          ) : null}
        </dl>
      </div>

      <HighlightRail label={t('À la une')} />
    </section>
  )
}

function Counter({
  icon,
  label,
  children,
}: {
  icon: ReactNode
  label: string
  children: ReactNode
}) {
  return (
    <div className="flex items-baseline gap-2">
      {/* `translate-y-0.5` : une icône est alignée sur sa BOÎTE, un texte sur sa ligne
          de base. Côte à côte sans correction, l'icône flotte d'environ deux pixels
          au-dessus du libellé — visible dès qu'on empile trois compteurs. */}
      <span className="shrink-0 translate-y-0.5 text-ink-muted">{icon}</span>
      <dt className="text-ink-muted">{label}</dt>
      <dd className="font-semibold text-ink">{children}</dd>
    </div>
  )
}

/**
 * Rail de raccourcis.
 *
 * Chez la référence, ces pastilles portent chacune un dégradé teinté qui les
 * distingue du rail de filtres posé plus bas. Cette identification-là passe ici par
 * l'APLAT et non par la teinte — `surface-muted` contre le filet nu des filtres —
 * parce que la palette du site réserve la couleur aux données (voir globals.css).
 * Deux rails de pastilles restent distinguables sans être colorés ; deux rails
 * colorés le seraient au prix du seul principe que ce design system défend.
 */
async function HighlightRail({ label }: { label: string }) {
  const t = await getPhrase()
  const chips = [
    /* « Points marquants » et « Plus fortes hausses » ont été retirés avec leurs
       pages (demande explicite). « Plus fortes hausses » revient par `/classements`,
       qui porte exactement ce palmarès — l'entrée n'est donc pas perdue, elle change
       de destination. */
    { href: '/classements', label: 'Plus fortes hausses', Icon: Flame },
    { href: '/graphiques', label: 'Tendances', Icon: TrendingUp },
    { href: '/heatmap', label: 'Heatmap', Icon: Sparkles },
    { href: '/nouvelles-cotations', label: 'Nouvelles cotations', Icon: Layers },
    { href: '/actualites', label: 'Actualités', Icon: Newspaper },
  ] as const

  return (
    <nav aria-label={label} className="flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center gap-1.5 pr-1 text-sm text-ink-muted">
        <Sparkles aria-hidden="true" className="size-3.5 shrink-0" />
        {label}
      </span>

      {chips.map(({ href, label: text, Icon }) => (
        <Link
          key={href}
          href={href}
          className="inline-flex h-[26px] items-center gap-1 rounded-pill border border-transparent bg-surface-muted px-3 text-sm text-ink transition-colors duration-150 hover:border-border-subtle hover:bg-panel"
        >
          <Icon aria-hidden="true" className="size-3.5 shrink-0 text-ink-muted" />
          {t(text)}
        </Link>
      ))}
    </nav>
  )
}
