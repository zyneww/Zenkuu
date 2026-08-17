import { LinkTabs, TabsBar, type LinkTab } from '@/components/ui/LinkTabs'

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

/**
 * La barre elle-même.
 *
 * Le trait actif était une bordure basse posée sur CHAQUE lien, allumée sur l'actif.
 * Six traits dont un seul est visible ne peuvent pas se déplacer : ils clignotent.
 * `LinkTabs` n'en porte qu'un pour toute la rangée, qui parcourt la distance — et le
 * mouvement dit « d'ici vers là » là où deux allumages ne disaient que « plus ici,
 * maintenant là ».
 */
export function ChartsTabs({ current }: { current: ChartView }) {
  const tabs: LinkTab[] = CHART_VIEWS.map((view) => ({
    id: view.id,
    href: view.id === 'global' ? '/graphiques' : `/graphiques?vue=${view.id}`,
    label: view.label,
  }))

  return (
    <TabsBar ariaLabel="Vues du marché">
      <LinkTabs tabs={tabs} active={current} />
    </TabsBar>
  )
}
