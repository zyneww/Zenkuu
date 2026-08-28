import {
  ChartNoAxesCombined,
  ChevronDown,
  Flame,
  Gauge,
  Globe,
  Image as ImageIcon,
  Landmark,
  LineChart,
  Network,
  PieChart,
  Sprout,
} from 'lucide-react'

import { Link } from '@/i18n/navigation'
import {
  CHART_GROUPS,
  CHART_INDICATORS,
  CHART_LINKS,
  type ChartNavEntry,
  type ChartNavIcon,
} from '@/components/market/charts-nav'
import { getPhrase } from '@/lib/content'

const ICONS: Record<ChartNavIcon, typeof LineChart> = {
  coins: ChartNoAxesCombined,
  dominance: PieChart,
  heatmap: Flame,
  rwa: Globe,
  categories: Network,
  treasuries: Landmark,
  nft: ImageIcon,
  sentiment: Gauge,
  altseason: Sprout,
}

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * LA COLONNE DE GAUCHE DES GRAPHIQUES GLOBAUX
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Reprise de `coingecko.com/en/charts` : un rail étroit, collant, encadré, où un
 * groupe déplié — « Cryptomonnaies » — précède quatre entrées de premier niveau
 * portant chacune son pictogramme. L'entrée courante est marquée par un APLAT et non
 * par un trait : dans une colonne de dix lignes, un simple gras se perd.
 *
 * ── ELLE DISPARAÎT SOUS `lg` ────────────────────────────────────────────────
 *
 * Un rail de 208 pixels sur un écran de 390 en consomme la moitié. Sous `lg`, la
 * page retombe sur la rangée d'onglets, qui ne montre que le groupe COURANT.
 *
 * ── POURQUOI CE COMPOSANT EST SERVEUR ───────────────────────────────────────
 *
 * Il ne porte aucun état : le chemin courant lui est passé, et chaque entrée est un
 * VRAI lien. C'est ce qui la rend ouvrable dans un nouvel onglet, partageable, et
 * atteignable sans JavaScript.
 */
export async function ChartsSidebar({ current }: { current: string }) {
  const t = await getPhrase()

  return (
    <nav
      aria-label={t('Vues du marché')}
      /* `sticky` calé sous l'en-tête : la colonne suit la lecture d'un tableau de
         trois cents lignes au lieu de disparaître au premier défilement.
         `--header-height` et non une valeur en dur — voir globals.css. */
      className="sticky top-[calc(var(--header-height)+1rem)] hidden w-52 shrink-0 self-start lg:block"
    >
      <div className="space-y-1 rounded-card border border-border-subtle bg-surface p-2">
        {CHART_GROUPS.map((group) => {
          const Icon = ICONS[group.icon]
          return (
            <div key={group.id}>
              {/* Le chevron de la référence, en `details` NATIF plutôt qu'en état
                  React : ce rail est un composant serveur, et le rendre client pour
                  un repli coûterait son rendu sans JavaScript. `open` par défaut —
                  le groupe courant est celui qu'on consulte. */}
              <details open className="group/coins">
                <summary className="flex cursor-pointer list-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm font-medium text-ink hover:bg-surface-muted [&::-webkit-details-marker]:hidden">
                  <Icon className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden="true" />
                  <span className="flex-1">{t(group.label)}</span>
                  <ChevronDown
                    aria-hidden="true"
                    className="size-3.5 shrink-0 text-ink-muted transition-transform duration-200 group-open/coins:rotate-180"
                  />
                </summary>

                <ul className="space-y-0.5">
                  {group.entries.map((entry) => (
                    <li key={entry.href}>
                      <SidebarLink entry={entry} current={current} indented label={t(entry.label)} />
                    </li>
                  ))}
                </ul>
              </details>
            </div>
          )
        })}

        <ul className="space-y-0.5 pt-1">
          {CHART_LINKS.map((entry) => (
            <li key={entry.href}>
              <SidebarLink entry={entry} current={current} label={t(entry.label)} />
            </li>
          ))}
        </ul>

        {/* Un filet sépare les indicateurs des vues de marché : ils ne répondent pas
            à la même question — « à quoi ressemble le marché » d'un côté, « dans quel
            état d'esprit est-il » de l'autre. */}
        <ul className="space-y-0.5 border-t border-border-subtle pt-2">
          {CHART_INDICATORS.map((entry) => (
            <li key={entry.href}>
              <SidebarLink entry={entry} current={current} label={t(entry.label)} />
            </li>
          ))}
        </ul>
      </div>
    </nav>
  )
}

function SidebarLink({
  entry,
  current,
  label,
  indented = false,
}: {
  entry: ChartNavEntry
  current: string
  label: string
  /** Les vues d'un groupe s'alignent sous le NOM du groupe, pas sous son pictogramme. */
  indented?: boolean
}) {
  const active = entry.href === current
  const Icon = entry.icon ? ICONS[entry.icon] : null

  return (
    <Link
      href={entry.href}
      aria-current={active ? 'page' : undefined}
      className={`flex items-center gap-2 rounded-sm py-1.5 pr-2 text-sm transition-colors duration-150 ${
        indented ? 'pl-8' : 'pl-2'
      } ${
        active
          ? 'bg-brand-soft font-medium text-brand-strong'
          : 'text-ink-muted hover:bg-surface-muted hover:text-ink'
      }`}
    >
      {Icon ? <Icon className="h-4 w-4 shrink-0" aria-hidden="true" /> : null}
      {label}
    </Link>
  )
}
