import { ASSET_CLASSES, type AssetClass } from '@zenkuu/data'

import { LinkTabs, TabsBar, type LinkTab } from '@/components/ui/LinkTabs'
import { getContent } from '@/lib/content'
import { ASSET_CLASS_SEGMENT } from '@/lib/asset-routes'

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

/**
 * Onglets supplémentaires, hors énumération des classes d'actifs.
 *
 * ── TROIS ONGLETS QUI NE SONT PAS DES CLASSES, ET LEURS TROIS RAISONS ─────
 *
 * `derives` liste des CONTRATS, sur place dans `/marches`. Les deux autres mènent
 * ailleurs, et c'est ce qui les distingue : ils ne décrivent pas un actif qu'on
 * achète mais une INFRASTRUCTURE où il s'échange — des plateformes, pas des cotations.
 * Un tableau de places n'a ni prix, ni capitalisation, ni fiche à ouvrir : il ne
 * partage aucune colonne avec `MarketPageView`, et l'y faire entrer aurait demandé de
 * rendre optionnel presque tout ce que ce composant sait faire.
 *
 * Ils vivent donc dans la même barre — parce que la question « où ça s'échange » se
 * pose en parcourant les marchés — mais sur leurs propres pages.
 */
export const DERIVATIVES_TAB = 'derives'
export const EXCHANGES_TAB = 'places'
export const PERPETUALS_TAB = 'perpetuels'

/** Les onglets qui quittent `/marches` — voir la note ci-dessus. */
export type ExtraTab =
  | typeof DERIVATIVES_TAB
  | typeof EXCHANGES_TAB
  | typeof PERPETUALS_TAB

/** `nft` est déclaré dans le domaine mais aucune source ne l'alimente encore. */
const HIDDEN: readonly AssetClass[] = ['nft']

export async function BrowseTabs({
  current,
  hrefFor,
}: {
  /** Classe active, ou l'un des trois onglets hors classes. */
  current: AssetClass | ExtraTab
  hrefFor: (target: AssetClass | ExtraTab) => string
}) {
  const fr = await getContent()

  /*
   * L'ordre suit la LIQUIDITÉ RÉELLE de nos sources, pas l'ordre de l'énumération.
   * La crypto d'abord parce que c'est notre couverture la plus profonde, les dérivés
   * juste après parce qu'ils la prolongent, puis les classes traditionnelles. Un
   * ordre alphabétique ferait ouvrir « Actions » en premier sur un site dont les
   * neuf dixièmes des données sont crypto.
   */
  const ORDER: (AssetClass | ExtraTab)[] = [
    'crypto',
    /* Les deux places suivent immédiatement la crypto, et avant les dérivés : la
       question « où ça s'échange » vient juste après « qu'est-ce qui s'échange », et
       bien avant le détail contrat par contrat. */
    EXCHANGES_TAB,
    PERPETUALS_TAB,
    DERIVATIVES_TAB,
    'etf',
    'stock',
    'index',
    'forex',
    'commodity',
  ]

  const EXTRA_LABELS: Record<ExtraTab, string> = {
    [DERIVATIVES_TAB]: 'Dérivés',
    /* « Places » et non « Exchanges » : le site est francophone, et « place » est le
       mot que la finance française emploie depuis toujours pour désigner un lieu de
       cotation. « Perpétuels » n'a pas d'équivalent — c'est le nom du produit. */
    [EXCHANGES_TAB]: 'Places',
    [PERPETUALS_TAB]: 'Perpétuels',
  }

  const isExtra = (entry: AssetClass | ExtraTab): entry is ExtraTab => entry in EXTRA_LABELS

  const tabs: LinkTab[] = ORDER.filter(
    (entry) => isExtra(entry) || !HIDDEN.includes(entry as AssetClass),
  )
    .filter((entry) => isExtra(entry) || ASSET_CLASSES.includes(entry as AssetClass))
    .map((entry) => ({
      id: entry,
      href: hrefFor(entry),
      label: isExtra(entry) ? EXTRA_LABELS[entry] : fr.assetClass[entry as AssetClass],
    }))

  return (
    <TabsBar ariaLabel="Classes d’actifs" lead="Marchés" center>
      <LinkTabs tabs={tabs} active={current} />
    </TabsBar>
  )
}

/**
 * Destination d'un onglet — une seule page, un paramètre.
 *
 * Le segment est lu directement dans `ASSET_CLASS_SEGMENT` et non déduit de
 * `marketHref` : depuis que celle-ci rend elle-même `/marches?classe=…`, en retirer le
 * premier caractère donnerait `marches?classe=etf` — une URL relative qui
 * fonctionnerait depuis la racine et casserait partout ailleurs.
 */
export function browseHref(target: AssetClass | ExtraTab): string {
  if (target === DERIVATIVES_TAB) return '/marches?vue=derives'
  /* Ces deux-là sortent de `/marches` : ce sont de vraies pages, indexables et
     partageables, et non des vues paramétrées. */
  if (target === EXCHANGES_TAB) return '/places'
  if (target === PERPETUALS_TAB) return '/perpetuels'
  if (target === 'crypto') return '/marches'
  return `/marches?classe=${ASSET_CLASS_SEGMENT[target]}`
}
