'use client'

import { LinkTabs, TabsBar, type LinkTab } from '@/components/ui/LinkTabs'
import { usePathname } from '@/i18n/navigation'

/**
 * Barre d'onglets de l'ACTIVITÉ DU MARCHÉ — deux vues d'un même instant.
 *
 * ── DEUX ET NON QUATRE, APRÈS COUP ───────────────────────────────────────────
 *
 * Elle en portait quatre : cours, classements, données de trading, points marquants.
 * C'était une lecture trop large. « Cours » relève désormais de « Parcourir », et
 * « Classements » garde son entrée propre dans le menu Données — les mettre en
 * onglets d'un même groupe laissait entendre qu'on ne les atteignait que par là,
 * alors que chacun est une destination à part entière.
 *
 * Ne restent que les deux qui répondent RÉELLEMENT à la même question — « que fait
 * le marché en ce moment ? » — par deux angles qu'on ne peut pas regarder ensemble :
 * les volumes et l'exposition d'un côté, les extrêmes du jour de l'autre. C'est
 * exactement le cas où une barre d'onglets vaut mieux que deux entrées de menu :
 * elles ne se complètent pas, elles s'alternent.
 *
 * ── DE VRAIS LIENS, ET L'ÉTAT VIENT DU CHEMIN ────────────────────────────────
 *
 * Pas d'onglets JavaScript : chaque vue est une URL indexable, partageable, ouvrable
 * au clic milieu. L'onglet actif est déduit de `usePathname()` plutôt que passé en
 * prop — une prop obligerait chaque page à se nommer elle-même, et la troisième à ne
 * pas oublier de le faire.
 *
 * Le drapeau `exact` subsiste alors qu'aucune des deux vues n'a de sous-chemin
 * aujourd'hui. Il coûte un booléen et évite le piège du jour où l'une en gagnera un :
 * une comparaison par préfixe allumerait alors l'onglet parent sur la page enfant.
 *
 * ── ET C'EST POURQUOI CETTE BARRE VIT DANS UNE DISPOSITION ────────────────
 *
 * Le trait de `LinkTabs` glisse d'un onglet à l'autre, ce qui suppose que son nœud
 * SURVIVE au changement de page. Deux pages sœurs ne partagent rien par elles-mêmes :
 * c'est le groupe de routes `(activite)` qui les réunit sous une disposition commune,
 * où ce composant est rendu UNE SEULE FOIS. Le déplacer dans les pages annulerait le
 * mouvement sans rien casser de visible — le piège est là.
 */

const TABS = [
  { href: '/crypto/mouvements', label: 'Données de trading', exact: false },
  { href: '/crypto/highlights', label: 'Points marquants', exact: false },
] as const

export function MarketDataTabs() {
  const pathname = usePathname()

  const active =
    TABS.find((tab) => (tab.exact ? pathname === tab.href : pathname.startsWith(tab.href)))?.href ??
    TABS[0].href

  /* L'identifiant EST le chemin : deux onglets ne peuvent pas mener au même endroit,
     la clé est donc déjà unique et n'a pas à être inventée. */
  const tabs: LinkTab[] = TABS.map((tab) => ({
    id: tab.href,
    href: tab.href,
    label: tab.label,
  }))

  return (
    <TabsBar ariaLabel="Vues du marché crypto">
      <LinkTabs tabs={tabs} active={active} />
    </TabsBar>
  )
}
