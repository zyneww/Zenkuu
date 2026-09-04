import { ASSET_CLASSES, type AssetClass } from '@zenkuu/data'

import type { AppHref } from '@/i18n/navigation'
import { LinkTabs, TabsBar, type LinkTab } from '@/components/ui/LinkTabs'
import { getContent } from '@/lib/content'
import { marketHref } from '@/lib/asset-routes'

/**
 * Navigation entre classes d'actifs, en tête des pages de classement.
 *
 * Reprise structurelle : une plateforme de cotation place ses familles d'actifs en
 * onglets au-dessus du tableau, pour qu'on passe de l'une à l'autre sans revenir au
 * menu. C'est le principal manque des listings actuels — la seule voie entre
 * `/crypto` et `/actions` passait par le menu de l'en-tête.
 *
 * Ce sont de vrais liens `<Link>` et non des onglets JavaScript : chaque classe est
 * une URL indexable à part entière (§9), et le passage de l'une à l'autre doit
 * fonctionner sans JavaScript, au clic milieu comme en navigation clavier.
 *
 * ── LE TRAIT NE GLISSE PAS ICI, ET C'EST ASSUMÉ ─────────────────────────
 *
 * `LinkTabs` déplace son trait quand son nœud survit à la navigation. Ces six classes
 * sont six ROUTES distinctes (`/crypto`, `/actions`…) : le composant est détruit puis
 * reconstruit, et le trait reparaît directement à sa place.
 *
 * Les réunir sous une disposition commune le rétablirait, mais coûterait de déplacer
 * six routes de premier niveau dont l'une porte toute une arborescence. La page
 * « Parcourir » existe précisément pour parcourir les classes sur place, avec le
 * mouvement ; cette barre-ci sert à SORTIR vers une autre page dédiée, où le lecteur
 * s'attend de toute façon à un changement de contexte.
 */

/** `nft` est déclaré dans le domaine mais aucune source ne l'alimente encore. */
const HIDDEN: readonly AssetClass[] = ['nft']

export async function AssetClassTabs({
  current,
  hrefFor,
}: {
  current: AssetClass
  /**
   * Destination d'un onglet, quand elle n'est pas la page de classement de la classe.
   *
   * Sert à `/marches`, qui présente les six classes SUR PLACE : sans cette prise, ses
   * onglets renverraient vers `/crypto` et `/actions`, et le lecteur quitterait la
   * page avancée au premier clic sans comprendre pourquoi.
   *
   * Une PROP et non une détection du chemin courant : ce composant est rendu côté
   * serveur à des endroits qu'il ne connaît pas, et deviner sa propre URL est
   * exactement le genre de couplage qui casse au premier déplacement de route.
   */
  hrefFor?: (assetClass: AssetClass) => AppHref
}) {
  const fr = await getContent()

  const tabs: LinkTab[] = ASSET_CLASSES.filter(
    (assetClass) => !HIDDEN.includes(assetClass),
  ).map((assetClass) => ({
    id: assetClass,
    href: hrefFor ? hrefFor(assetClass) : marketHref(assetClass),
    label: fr.assetClass[assetClass],
  }))

  return (
    <TabsBar ariaLabel="Classes d’actifs">
      <LinkTabs tabs={tabs} active={current} />
    </TabsBar>
  )
}
