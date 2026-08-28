import { BarChart3, Gauge, LayoutGrid } from 'lucide-react'

import { Link } from '@/i18n/navigation'
import {
  CHART_GROUPS,
  type ChartGroupIcon,
  type ChartView,
} from '@/components/market/charts-nav'
import { getPhrase } from '@/lib/content'

const GROUP_ICONS: Record<ChartGroupIcon, typeof BarChart3> = {
  markets: BarChart3,
  indicators: Gauge,
  sectors: LayoutGrid,
}

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * LA COLONNE DE GAUCHE DES GRAPHIQUES GLOBAUX
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Reprise de `coinmarketcap.com/charts` : un rail étroit, collant, où chaque famille
 * porte un pictogramme et son nom en gris, puis ses vues en retrait. La vue courante
 * est marquée par un APLAT et non par un trait — c'est ce qui la distingue dans une
 * colonne de dix lignes, là où un simple gras se perd.
 *
 * ── ELLE DISPARAÎT SOUS `lg`, ET LES ONGLETS PRENNENT LE RELAIS ─────────────
 *
 * Un rail de 200 pixels sur un écran de 390 en consomme la moitié. Sous `lg`, la
 * page retombe donc sur la rangée d'onglets — qui, elle, ne montre que la famille
 * COURANTE, soit trois ou quatre entrées : c'est tenable sur une seule ligne, ce que
 * les dix ne seraient pas.
 *
 * ⚠️ LES DEUX NAVIGATIONS COEXISTENT AU-DESSUS DE `lg`, comme dans le modèle, et ce
 * n'est pas un doublon : le rail donne accès à TOUT, les onglets situent la vue
 * courante DANS SA FAMILLE. Un lecteur arrivé sur « Places de dérivés » voit du
 * premier coup d'œil qu'il existe des « Places de cotation » à côté.
 *
 * ── POURQUOI CE COMPOSANT EST SERVEUR ───────────────────────────────────────
 *
 * Il ne porte aucun état : la vue courante lui est passée, et chaque entrée est un
 * VRAI lien. C'est ce qui la rend ouvrable dans un nouvel onglet, partageable, et
 * atteignable sans JavaScript.
 */
export async function ChartsSidebar({ current }: { current: ChartView }) {
  const t = await getPhrase()

  return (
    <nav
      aria-label={t('Vues du marché')}
      /* `sticky` calé sous l'en-tête : la colonne suit la lecture d'un tableau de
         trois cents lignes au lieu de disparaître au premier défilement.
         `--header-height` et non une valeur en dur — voir globals.css. */
      className="sticky top-[calc(var(--header-height)+1rem)] hidden w-52 shrink-0 self-start lg:block"
    >
      <div className="space-y-5">
        {CHART_GROUPS.map((group) => {
          const Icon = GROUP_ICONS[group.icon]
          return (
            <div key={group.id}>
              <p className="flex items-center gap-2 px-2 text-xs font-medium text-ink-muted">
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                {t(group.label)}
              </p>

              <ul className="mt-1.5 space-y-0.5">
                {group.entries.map((entry) => {
                  /* `entry.view` est absent pour les entrées qui mènent à une PAGE
                     entière (`/places`, `/sentiment`…) : celles-là ne sont jamais
                     « courantes » ici, puisqu'on ne les atteint qu'en quittant cette
                     route. Voir la note sur les entrées externes dans `charts-nav`. */
                  const active = entry.view !== undefined && entry.view === current
                  return (
                    <li key={entry.href}>
                      <Link
                        href={entry.href}
                        aria-current={active ? 'page' : undefined}
                        /* Le retrait à gauche aligne les libellés sous le NOM du
                           groupe et non sous son pictogramme : c'est ce qui fait lire
                           la colonne comme un sommaire plutôt que comme une liste
                           d'icônes. */
                        className={`block rounded-sm py-1.5 pl-7 pr-2 text-sm transition-colors duration-150 ${
                          active
                            ? 'bg-brand-soft font-medium text-brand-strong'
                            : 'text-ink-muted hover:bg-surface-muted hover:text-ink'
                        }`}
                      >
                        {t(entry.label)}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        })}
      </div>
    </nav>
  )
}
