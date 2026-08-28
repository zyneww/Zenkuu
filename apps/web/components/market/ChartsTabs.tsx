import { LinkTabs, TabsBar, type LinkTab } from '@/components/ui/LinkTabs'
import { groupOfView, type ChartView } from '@/components/market/charts-nav'
import { getPhrase } from '@/lib/content'

/*
 * Le vocabulaire des vues — la liste, le type, la lecture du paramètre — a déménagé
 * dans `charts-nav.ts` : la BARRE LATÉRALE et cette rangée d'onglets le partagent
 * désormais, et deux copies auraient fini par diverger. La ré-exportation garde les
 * anciens chemins d'import valides.
 */
export {
  CHART_GROUPS,
  CHART_VIEWS,
  groupOfView,
  readChartView,
  type ChartView,
} from '@/components/market/charts-nav'

/**
 * Les onglets en tête des graphiques globaux.
 *
 * ── ILS NE MONTRENT PLUS TOUTES LES VUES, MAIS UNE FAMILLE ──────────────────
 *
 * Ils en portaient six, c'est-à-dire l'intégralité. La page en compte dix depuis
 * qu'elle a repris la barre latérale du modèle (voir `ChartsSidebar`), et dix onglets
 * sur une ligne débordent ou se replient derrière un « … » — auquel cas on ne voit
 * plus ce que la page contient, ce qui est exactement ce qu'une rangée d'onglets
 * existe pour montrer.
 *
 * La rangée porte donc la FAMILLE COURANTE : trois ou quatre entrées, celles entre
 * lesquelles on bascule réellement en alternance. C'est la disposition du modèle, où
 * les onglets du haut reprennent le groupe « Markets » pendant que le rail donne
 * accès au reste.
 *
 * Le trait actif était une bordure basse posée sur CHAQUE lien, allumée sur l'actif.
 * Des traits dont un seul est visible ne peuvent pas se déplacer : ils clignotent.
 * `LinkTabs` n'en porte qu'un pour toute la rangée, qui parcourt la distance — et le
 * mouvement dit « d'ici vers là » là où deux allumages ne disaient que « plus ici,
 * maintenant là ».
 */
export async function ChartsTabs({ current }: { current: ChartView }) {
  const t = await getPhrase()
  const group = groupOfView(current)

  /* ⚠️ L'IDENTIFIANT D'ONGLET EST L'ADRESSE, PAS LA VUE. Trois entrées du rail mènent
     à des PAGES entières (`/places`, `/perpetuels`, `/sentiment`) et n'ont donc pas
     de vue ; leur donner un identifiant vide les rendrait toutes égales entre elles,
     et le trait actif se poserait sur la première venue. L'adresse est unique par
     construction. */
  const tabs: LinkTab[] = group.entries.map((entry) => ({
    id: entry.href,
    href: entry.href,
    label: t(entry.label),
  }))

  const active = group.entries.find((entry) => entry.view === current)?.href ?? ''

  return (
    <TabsBar ariaLabel={t(group.label)}>
      <LinkTabs tabs={tabs} active={active} />
    </TabsBar>
  )
}
