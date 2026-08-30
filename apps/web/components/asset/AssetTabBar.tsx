'use client'

import type { AssetTab } from '@/components/asset/AssetSections'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * LA BARRE D'ONGLETS DE LA FICHE — ELLE FAIT DÉFILER, ELLE NE REMPLACE PAS
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── POURQUOI ELLE REVIENT ──────────────────────────────────────────────────
 *
 * `AssetLayoutFrame` porte encore la note qui l'a retirée : « le sommaire n'existe
 * plus (la fiche est une page qu'on descend) », au motif que c'était « la forme de
 * la référence ».
 *
 * La moitié de cet argument est juste, l'autre est fausse, et les deux se vérifient
 * sur la même page. Relevé le 2026-08-30 sur `coingecko.com/en/coins/bitcoin` :
 *
 *   · La fiche EST une page unique qu'on descend. Cinq de leurs sept onglets portent
 *     `click->coin-show#scrollToAnchor` et AUCUN `href` : ils font défiler vers une
 *     section du même document. Seuls « Historical Data » et « BTC Halving » sont de
 *     vraies routes. Retirer le remplacement de contenu était donc correct.
 *
 *   · Mais la barre, elle, est bien là : 7 onglets visibles, 920 px de large,
 *     38 px de haut. La retirer a supprimé le seul moyen d'atteindre une section
 *     sans parcourir plusieurs milliers de pixels.
 *
 * ── LES VALEURS SONT MESURÉES ──────────────────────────────────────────────
 *
 *   rangée        `nav`, défilement horizontal, `position: relative` — PAS collante
 *   onglet        38 px de haut, rembourrage 8px 16px
 *   libellé       14 px, graisse 600
 *   sélectionné   encre du thème + filet bas de 1,25 px en vert de marque
 *   non retenu    encre atténuée
 *
 * ⚠️ LE LIBELLÉ SÉLECTIONNÉ EST EN ENCRE, PAS EN VERT. C'est le motif « souligné »,
 * distinct du motif « puce » où le texte lui-même verdit. Les deux coexistent sur
 * leur site et se confondent facilement — voir le commit qui les a démêlés.
 *
 * ⚠️ ELLE N'EST PAS COLLANTE. Leur `nav` est en `position: relative` : la barre part
 * avec le défilement. La coller ici ajouterait une bande permanente au-dessus d'une
 * page qui en porte déjà une (voir `AssetStickyBar`), pour un gain que la référence
 * ne juge pas nécessaire.
 *
 * ── L'ANCRE PLUTÔT QUE LE GESTIONNAIRE DE CLIC ─────────────────────────────
 *
 * `href="#section"` et non un `onClick` qui appellerait `scrollIntoView` : l'ancre
 * fonctionne sans JavaScript, se copie, s'ouvre dans un nouvel onglet, et le
 * navigateur y applique `scroll-margin-top` — que `AssetSections` pose déjà sur
 * chaque section. Un gestionnaire de clic aurait redemandé ce décalage à la main.
 */
export function AssetTabBar({ tabs, activeId }: { tabs: AssetTab[]; activeId: string | null }) {
  if (tabs.length === 0) return null

  return (
    <nav
      aria-label="Sections de la fiche"
      /* `scrollbar-none` : la rangée déborde sur mobile et doit pouvoir défiler, mais
         une barre de défilement sous sept onglets pèse plus lourd que ce qu'elle
         signale. La référence emploie `tw-overflow-x-auto` sans plus. */
      className="scrollbar-none -mb-px flex overflow-x-auto border-b border-border-subtle"
    >
      {tabs.map((tab) => {
        const selected = tab.id === activeId
        return (
          <a
            key={tab.id}
            href={`#${tab.id}`}
            aria-current={selected ? 'true' : undefined}
            /* `border-b-[1.25px]` reprend la valeur mesurée telle quelle. Le filet est
               posé sur CHAQUE onglet, transparent quand il n'est pas retenu : sans lui
               le libellé sauterait d'un pixel et quart à la sélection. */
            className={`shrink-0 whitespace-nowrap border-b-[1.25px] px-4 py-2 text-sm font-semibold transition-colors duration-150 ${
              selected
                ? 'border-brand text-ink'
                : 'border-transparent text-ink-muted hover:text-ink'
            }`}
          >
            {tab.label}
          </a>
        )
      })}
    </nav>
  )
}
