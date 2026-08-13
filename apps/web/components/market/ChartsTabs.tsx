import { Link } from '@/i18n/navigation'

/**
 * Onglets des graphiques globaux.
 *
 * ── SIX VUES, UNE SEULE ROUTE ────────────────────────────────────────────────
 *
 * La référence en fait six PAGES distinctes (`/charts`, `/charts/bitcoin-dominance`,
 * `/charts/crypto-heatmap`…). Ici, un paramètre `?vue=` sur une seule route.
 *
 * Le choix n'est pas paresseux : chacune de ces vues répond à la même question — « à
 * quoi ressemble le marché en ce moment, vu de loin » — et se lit en alternance avec
 * les autres. Six routes obligeraient à six fichiers, six jeux de métadonnées et six
 * chargements complets pour changer d'angle sur le même sujet.
 *
 * Le prix est connu et assumé : un paramètre de requête s'indexe moins bien qu'un
 * chemin. Il est acceptable parce que ces vues ne sont pas des destinations de
 * recherche — personne ne cherche « dominance bitcoin » pour arriver sur un site de
 * suivi, on cherche « bitcoin ». La page qui doit être indexable, c'est la fiche.
 */

export const CHART_VIEWS = [
  { id: 'global', label: 'Vue générale' },
  { id: 'dominance', label: 'Dominance' },
  { id: 'secteurs', label: 'Secteurs' },
  { id: 'categories', label: 'Catégories' },
  { id: 'tresoreries', label: 'Trésoreries' },
  { id: 'nft', label: 'NFT' },
] as const

export type ChartView = (typeof CHART_VIEWS)[number]['id']

/** Lecture défensive : le paramètre est saisissable à la main. */
export function readChartView(raw: string | string[] | undefined): ChartView {
  const value = Array.isArray(raw) ? raw[0] : raw
  return CHART_VIEWS.some((entry) => entry.id === value) ? (value as ChartView) : 'global'
}

export function ChartsTabs({ current }: { current: ChartView }) {
  return (
    <nav aria-label="Vues du marché" className="-mx-1 overflow-x-auto border-b border-border-subtle">
      <ul className="flex min-w-max items-center gap-1 px-1">
        {CHART_VIEWS.map((view) => {
          const active = view.id === current
          return (
            <li key={view.id}>
              <Link
                href={view.id === 'global' ? '/crypto/graphiques' : `/crypto/graphiques?vue=${view.id}`}
                aria-current={active ? 'page' : undefined}
                className={`inline-block whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors duration-150 ${
                  active
                    ? 'border-brand text-ink'
                    : 'border-transparent text-ink-muted hover:text-ink'
                }`}
              >
                {view.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
