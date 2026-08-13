import { ASSET_CLASSES, type AssetClass } from '@zenkuu/data'

import { LinkTabs, TabsBar, type LinkTab } from '@/components/ui/LinkTabs'
import { getContent } from '@/lib/content'
import { marketHref } from '@/lib/asset-routes'

/**
 * Onglets de la page « Parcourir » — CENTRÉS, et précédés de leur intitulé.
 *
 * ── LA FORME EST « MARCHÉS | X, Y, Z », ET L'INTITULÉ N'EST PAS UN ONGLET ────
 *
 * « Marchés » est un LIBELLÉ, pas une destination. Le rendre cliquable créerait un
 * huitième onglet qui mènerait à la page où l'on est déjà, et l'œil chercherait
 * lequel des huit est sélectionné. Le filet vertical qui le suit dit exactement cela :
 * ce qui est à gauche nomme, ce qui est à droite choisit.
 *
 * ── L'ÉTAT ACTIF EST UN TRAIT QUI GLISSE, PAS UNE PASTILLE ──────────────────
 *
 * Il était rendu par un aplat arrondi sous l'onglet choisi. Un aplat DÉSIGNE un
 * élément ; un trait sous la rangée désigne une POSITION dans une séquence. Et
 * surtout, chaque onglet avait le sien : ils s'allumaient et s'éteignaient, sans
 * qu'aucun mouvement ne relie « Dérivés » à « ETF ». Le trait unique de `LinkTabs`
 * parcourt la distance, et c'est ce parcours qui rend le changement lisible.
 *
 * ── POURQUOI CENTRÉ, ALORS QUE TOUT LE SITE ALIGNE À GAUCHE ─────────────────
 *
 * Parce que cette rangée ne se LIT pas, elle se VISE. Un texte aligné à gauche donne
 * à l'œil un bord d'appel dont il a besoin ligne après ligne ; une rangée de sept
 * cibles courtes n'a pas de lignes, et son bord gauche ne sert alors qu'à la coller
 * contre le contenu qui suit. Centrée, elle se lit comme un sélecteur posé au-dessus
 * de la page — ce qu'elle est.
 *
 * C'est le seul endroit du site où cet argument tient. Voir `/pourquoi-zenkuu`, où le
 * centrage s'arrête au héros pour la raison inverse.
 *
 * ── LES DÉRIVÉS SONT UN ONGLET SANS ÊTRE UNE CLASSE ─────────────────────────
 *
 * `AssetClass` compte sept valeurs, et « dérivés » n'en est pas une : un contrat
 * perpétuel n'est pas un actif qu'on détient, c'est un instrument adossé à un autre.
 * L'ajouter à l'énumération obligerait chaque fournisseur, chaque registre et chaque
 * page de classement à traiter une classe qu'aucun d'eux ne sait lister.
 *
 * Il vit donc en dehors, comme un onglet de plus, et la page décide seule de ce
 * qu'elle en fait. Le mot retenu est « Dérivés » et non « Futures » : la source
 * publie très majoritairement des contrats PERPÉTUELS, qui n'ont pas d'échéance —
 * appeler « futures » un contrat sans date serait faux au sens propre.
 */

/** Onglet supplémentaire, hors énumération des classes d'actifs. */
export const DERIVATIVES_TAB = 'derives'

/** `nft` est déclaré dans le domaine mais aucune source ne l'alimente encore. */
const HIDDEN: readonly AssetClass[] = ['nft']

export async function BrowseTabs({
  current,
  hrefFor,
}: {
  /** Classe active, ou `derives` pour l'onglet hors classes. */
  current: AssetClass | typeof DERIVATIVES_TAB
  hrefFor: (target: AssetClass | typeof DERIVATIVES_TAB) => string
}) {
  const fr = await getContent()

  /*
   * L'ordre suit la LIQUIDITÉ RÉELLE de nos sources, pas l'ordre de l'énumération.
   * La crypto d'abord parce que c'est notre couverture la plus profonde, les dérivés
   * juste après parce qu'ils la prolongent, puis les classes traditionnelles. Un
   * ordre alphabétique ferait ouvrir « Actions » en premier sur un site dont les
   * neuf dixièmes des données sont crypto.
   */
  const ORDER: (AssetClass | typeof DERIVATIVES_TAB)[] = [
    'crypto',
    DERIVATIVES_TAB,
    'etf',
    'stock',
    'index',
    'forex',
    'commodity',
  ]

  const tabs: LinkTab[] = ORDER.filter(
    (entry) => entry === DERIVATIVES_TAB || !HIDDEN.includes(entry as AssetClass),
  )
    .filter((entry) => entry === DERIVATIVES_TAB || ASSET_CLASSES.includes(entry as AssetClass))
    .map((entry) => ({
      id: entry,
      href: hrefFor(entry),
      label: entry === DERIVATIVES_TAB ? 'Dérivés' : fr.assetClass[entry as AssetClass],
    }))

  return (
    <TabsBar ariaLabel="Classes d’actifs" lead="Marchés" center>
      <LinkTabs tabs={tabs} active={current} />
    </TabsBar>
  )
}

/** Destination d'un onglet — une seule page, un paramètre. */
export function browseHref(target: AssetClass | typeof DERIVATIVES_TAB): string {
  if (target === DERIVATIVES_TAB) return '/marches?vue=derives'
  if (target === 'crypto') return '/marches'
  return `/marches?classe=${marketHref(target).slice(1)}`
}
