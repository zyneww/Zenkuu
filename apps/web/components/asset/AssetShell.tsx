import type { AssetClass } from '@zenkuu/data'
import { getAsset } from '@zenkuu/data'

import { AssetBreadcrumb } from '@/components/asset/AssetBreadcrumb'
import { AssetHeadline, AssetTopBar } from '@/components/asset/AssetPageHeader'
import { AssetTabs } from '@/components/asset/AssetTabs'
import { FollowAssetButton } from '@/components/watchlist/FollowAssetButton'
import { assetPath } from '@/lib/asset-routes'
import { getContent } from '@/lib/content'
import { getWatchlistState } from '@/lib/watchlist-actions'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * LE BANDEAU QUI NE SE DÉMONTE JAMAIS
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Fil d'Ariane, identité de l'actif, étiquettes, actions, rangée d'onglets. Rendu par
 * un `layout.tsx` partagé par les quatre sous-routes d'une fiche, il survit à leur
 * navigation.
 *
 * ── LE DÉFAUT QU'IL CORRIGE ─────────────────────────────────────────────────
 *
 * Chaque onglet était une PAGE qui redessinait son propre en-tête, et les trois
 * n'étaient pas d'accord : l'aperçu portait le logo, le nom, les étiquettes et
 * l'étoile de suivi ; l'historique et les métriques ouvraient sur un fil d'Ariane
 * différent suivi d'un titre, sans logo ni identité. Changer d'onglet remplaçait donc
 * la page ENTIÈRE — relevé au navigateur : l'identité disparaissait, le fil changeait
 * de forme, et la rangée d'onglets elle-même était remontée à neuf.
 *
 * ── POURQUOI UN LAYOUT NEXT.JS PLUTÔT QUE DES PANNEAUX CLIENTS ──────────────
 *
 * La demande nommait deux voies : « layout partagé Next.js OU composant parent qui ne
 * se démonte jamais », et suggérait `TabPanels` de Headless UI pour la seconde.
 *
 * ⚠️ LES PANNEAUX CLIENTS AURAIENT COÛTÉ LES TROIS PAGES. Un `TabGroup` tient ses
 * panneaux dans un seul document : les métriques, l'historique et le halving
 * cesseraient d'être des adresses. On perdrait le lien profond (« envoie-moi
 * l'historique du bitcoin »), l'indexation de trois pages par actif, et le catalogue
 * de métriques bâti la veille précisément pour donner UNE adresse canonique à ces
 * mesures. Le §9 fait du référencement le premier moteur d'acquisition du site.
 *
 * Le layout obtient le même résultat, et plus strictement : React ne re-rend pas un layout
 * quand on navigue entre ses enfants — le nœud du DOM est le même objet avant et après.
 * Un `TabGroup` client, lui, re-rendrait son `TabList` à chaque changement d'onglet.
 *
 * ── ET POURQUOI LA RANGÉE RESTE UNE NAVIGATION, PAS UN `role="tablist"` ─────
 *
 * Les onglets sont des LIENS vers des adresses distinctes. `role="tab"` engage
 * `aria-controls` vers un panneau du même document et un pilotage aux flèches ; sur des
 * liens, cela annoncerait un composant qui n'existe pas et retirerait à la synthèse
 * vocale le seul fait qui compte — que ces éléments NAVIGUENT. C'est la distinction que
 * pose la fiche « Tabs » de Component Gallery, et `aria-current="page"` est le marqueur
 * correct de l'onglet courant.
 *
 * ── LA LECTURE EST PARTAGÉE AVEC LA PAGE, PAS DOUBLÉE ───────────────────────
 *
 * Ce bandeau appelle `getAsset`, et la page qu'il enveloppe aussi. Les deux passent par
 * le cache de `queries.ts`, indexé par `${classe}:asset:${id}:${devise}` : le second
 * appel ne touche pas le réseau. C'est ce qui rend le layout gratuit.
 *
 * ⚠️ IL NE REND PAS D'ERREUR QUAND L'ACTIF MANQUE. Il s'efface et laisse passer la
 * page, qui porte déjà le 404 et l'encadré de panne — chacun avec le mot juste selon
 * l'onglet. Deux composants qui annoncent la même panne se contrediraient au premier
 * changement de formulation.
 */
export async function AssetShell({
  assetClass,
  id,
  children,
}: {
  assetClass: AssetClass
  id: string
  children: React.ReactNode
}) {
  const asset = await getAsset(id, assetClass, 'eur')
  if (!asset.ok) return <>{children}</>

  const data = asset.data
  const [fr, watchlist] = await Promise.all([
    getContent(),
    getWatchlistState(assetClass, data.id),
  ])

  return (
    <>
      {/*
        ── LE FIL D'ARIANE RESPIRE PLUS EN HAUT QU'EN BAS, ET C'EST VOULU ─────────

        Il était collé au filet de l'en-tête du site : douze pixels sous lui, aucun
        au-dessus. Un fil d'Ariane n'appartient ni à la barre de navigation ni au titre
        qui le suit — c'est une ligne de situation, et elle a besoin d'un blanc de
        chaque côté pour se lire comme telle.

        `pt-5` contre `pb-3` : le blanc du haut est plus large parce qu'il sépare deux
        CHOSES DIFFÉRENTES — la barre du site et la page — quand celui du bas sépare
        deux parties d'un même en-tête. Un interligne symétrique rattacherait
        visuellement le fil à la barre.

        Mesuré : le texte tombe à 109 px du haut de la fenêtre, soit 44 px sous le
        filet de l'en-tête.
      */}
      <div className="pb-3 pt-5">
        <AssetBreadcrumb assetClass={assetClass} id={data.id} name={data.name} />
      </div>

      {/* ⚠️ LE FILET SOUS L'IDENTITÉ TRAVERSE DE NOUVEAU LA PAGE, et il ne le faisait
          plus. La bande était passée DANS le cadre à deux colonnes pour aligner la
          colonne d'actualités sur le nom de l'actif ; son filet s'arrêtait donc au bord
          de la colonne principale.

          Le cadre étant maintenant sous le bandeau et non autour de lui, le filet
          reprend toute la largeur — c'est la forme de la référence, où le trait sépare
          l'identité de l'espace de travail sur toute la page. La colonne d'actualités
          commence désormais au niveau de la barre d'outils du graphique plutôt qu'au
          niveau du nom : elle s'aligne sur ce qu'elle accompagne. */}
      <div className="mb-5 border-b border-border-subtle pb-5">
        <AssetHeadline
          asset={data}
          assetClass={assetClass}
          rankLabel={fr.asset.stats.rank}
          /* ── LE BOUTON SEUL A CÉDÉ LA PLACE À LA BANDE DE REPÈRES ─────────

             Cette prop ne portait que `FollowAssetButton`. Elle porte désormais
             `AssetTopBar`, la bande demandée d'après `tokenomist.ai/bitcoin` — et le
             bouton la ferme, à droite, comme le « Watchlist » de la référence. Le
             suivi n'est donc pas perdu, il est encadré. */
          watchAction={
            <AssetTopBar
              /* La source vit sur l'ENVELOPPE de la réponse et non sur `data` — c'est
                 ce composant qui tient les deux, donc c'est lui qui fait le lien. Voir
                 `ReportDataLink`. */
              {...(asset.source ? { sourceUrl: asset.source.attributionUrl } : {})}
              watchAction={
                <FollowAssetButton
                  assetClass={assetClass}
                  assetId={data.id}
                  label={data.name}
                  {...(data.symbol ? { symbol: data.symbol } : {})}
                  path={assetPath(assetClass, data.id)}
                  initialFollowing={watchlist.following}
                  available={watchlist.available}
                />
              }
            />
          }
        />
      </div>

      {/* La rangée d'onglets ferme le bandeau, comme chez la référence : fil, identité,
          onglets, puis le contenu. Elle lit l'onglet actif dans le segment de route —
          ce layout ne sait pas quelle sous-route il enveloppe. Voir `asset-tabs.ts`. */}
      <AssetTabs assetClass={assetClass} id={data.id} />

      {children}
    </>
  )
}
