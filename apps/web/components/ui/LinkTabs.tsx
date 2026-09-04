'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { Link, type AppHref } from '@/i18n/navigation'

/**
 * Rangée d'onglets-LIENS, avec un trait qui glisse d'un onglet à l'autre.
 *
 * ── POURQUOI CE COMPOSANT NE POUVAIT PAS ÊTRE `AssetTabs` ────────────────────
 *
 * `AssetTabs` porte déjà un trait glissant, et sa mécanique de mesure est reprise ici
 * presque telle quelle. Mais ses onglets sont des BOUTONS qui changent un état local :
 * rien ne navigue, le composant n'est jamais démonté, et le trait glisse naturellement.
 *
 * Ceux-ci sont des LIENS. Chaque vue est une URL — indexable, partageable, ouvrable au
 * clic milieu — et cliquer déclenche une vraie navigation. Le trait ne peut alors
 * glisser qu'à une condition : que le nœud du DOM SURVIVE à la navigation. React le
 * garantit tant que le composant occupe la même position dans l'arbre entre les deux
 * rendus, ce qui est le cas ici puisque seule la page change sous une barre identique.
 *
 * C'est pourquoi l'état actif est lu sur les PROPS et non sur le chemin : l'appelant
 * sait déjà, côté serveur, quel onglet est actif, et le lui faire redécouvrir côté
 * client ferait clignoter le trait à chaque navigation — il partirait de zéro avant de
 * se replacer.
 *
 * ── LE TRAIT REMPLACE LA PASTILLE, ET CE N'EST PAS QU'UNE COULEUR ────────────
 *
 * L'état actif était rendu par un aplat arrondi. Un aplat DÉSIGNE l'élément ; un trait
 * sous la rangée désigne une POSITION dans une séquence — il dit « vous êtes ici, sur
 * cette bande », ce qu'un fond ne dit pas. Et surtout, un aplat ne peut pas se
 * déplacer : chaque onglet a le sien, ils s'allument et s'éteignent. Un trait unique
 * pour toute la rangée, lui, parcourt la distance, et c'est ce mouvement qui rend le
 * changement lisible.
 */

export interface LinkTab {
  /** Clé stable, distincte du libellé — deux onglets peuvent porter le même mot. */
  id: string
  href: AppHref
  label: string
}

export function LinkTabs({
  variant = 'underline',
  tabs,
  active,
}: {
  tabs: LinkTab[]
  /** `id` de l'onglet actif, décidé par l'appelant. */
  active: string
  /** `pill` : les onglets de Blockworks. `underline` : le style historique. */
  variant?: 'underline' | 'pill'
}) {
  const listRef = useRef<HTMLDivElement>(null)
  const linkRefs = useRef(new Map<string, HTMLAnchorElement>())
  const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null)

  const registerLink = useCallback((id: string, node: HTMLAnchorElement | null) => {
    if (node) linkRefs.current.set(id, node)
    else linkRefs.current.delete(id)
  }, [])

  /*
   * Position du trait, relevée sur le lien actif.
   *
   * `offsetLeft` est compté depuis le conteneur, qui est le référent de position de la
   * bande ET du trait : les deux lisent donc les mêmes coordonnées, sans conversion ni
   * `getBoundingClientRect` — celui-ci donnerait des coordonnées d'ÉCRAN, fausses dès
   * que la bande a défilé horizontalement.
   *
   * L'observateur de taille couvre les deux façons dont la mesure se périme sans que
   * l'onglet actif change : le redimensionnement de la fenêtre, et l'arrivée de la
   * police définitive qui redessine les libellés à une autre largeur.
   *
   * La comparaison avant `setIndicator` n'est pas une optimisation mais une NÉCESSITÉ :
   * l'objet est neuf à chaque mesure, et le poser tel quel relancerait l'effet en
   * boucle par l'observateur qu'il vient de déclencher.
   */
  useEffect(() => {
    const list = listRef.current
    if (!list) return

    function measure() {
      const link = linkRefs.current.get(active)
      if (!link) return

      const left = link.offsetLeft
      const width = link.offsetWidth
      setIndicator((previous) =>
        previous && previous.left === left && previous.width === width ? previous : { left, width },
      )
    }

    measure()

    const observer = new ResizeObserver(measure)
    observer.observe(list)
    for (const link of linkRefs.current.values()) observer.observe(link)
    return () => observer.disconnect()
  }, [active, tabs])

  if (tabs.length === 0) return null

  return (
    <div
      ref={listRef}
      /*
       * PAS de débordement ici : le défilement horizontal appartient à `TabsBar`, qui
       * enveloppe la rangée ET son intitulé. Le mettre sur cette boîte-ci en ferait le
       * référent de position du trait tout en le déplaçant sous les yeux du lecteur —
       * `offsetLeft` reste juste, mais le trait suivrait le contenu au lieu de rester
       * où il est.
       *
       * ⚠️ AUCUNE MARGE NÉGATIVE ICI NON PLUS. Une première version descendait la bande
       * d'un pixel (`-mb-px`) pour que le trait RECOUVRE le filet de la rangée plutôt
       * que de s'empiler dessus. Le résultat, mesuré dans le navigateur : une barre de
       * défilement VERTICALE sur toute la rangée. `overflow-x: auto` force l'autre axe
       * à `auto` lui aussi — c'est la règle de la spécification, pas un bogue — et il
       * suffisait de ce pixel qui dépasse pour qu'elle apparaisse.
       *
       * Le trait se pose donc SUR le filet, sans le masquer. Deux pixels de marque
       * au-dessus d'un pixel discret : l'œil ne fait pas la différence, et la rangée ne
       * porte plus d'ascenseur.
       */
      className="relative flex shrink-0 items-center gap-1"
    >
      {tabs.map((tab) => {
        const selected = tab.id === active
        return (
          <Link
            key={tab.id}
            ref={(node) => {
              registerLink(tab.id, node)
            }}
            href={tab.href}
            aria-current={selected ? 'page' : undefined}
            className={
              variant === 'pill'
                ? /* ── LA PILULE DE BLOCKWORKS ──────────────────────────────
                     Mesuré le 2026-09-02 : 12 px graisse 700, rembourrage
                     horizontal de 10 px, rayon 6 px, fond #202020 — c'est-à-dire
                     notre L2. L'actif se distingue par son ENCRE et sa bordure, pas
                     par un souligné : ces onglets n'ont pas de filet sous eux. */
                  `whitespace-nowrap rounded-[6px] border px-2.5 py-1.5 text-xs font-bold transition-colors duration-150 ${
                    selected
                      ? 'border-border-subtle bg-surface-muted text-ink'
                      : 'border-transparent text-ink-muted hover:text-ink'
                  }`
                : `whitespace-nowrap px-3 pb-3 pt-2.5 text-sm font-medium transition-colors duration-150 ${
                    selected ? 'text-ink' : 'text-ink-muted hover:text-ink'
                  }`
            }
          >
            {tab.label}
          </Link>
        )
      })}

      {/* Décoratif : le lecteur d'écran connaît déjà l'onglet actif par `aria-current`,
          et un second signal n'ajouterait qu'un bruit. */}
      {/* ⚠️ PAS D'INDICATEUR COULISSANT EN VARIANTE PILULE. Le trait glisse SOUS les
          onglets ; des pilules n'ont pas de filet sous elles, il flotterait donc dans
          le vide. Leur état actif tient dans leur propre fond. */}
      {indicator !== null && variant !== 'pill' ? (
        <span
          aria-hidden="true"
          className="tab-indicator"
          style={{ width: indicator.width, transform: `translateX(${indicator.left}px)` }}
        />
      ) : null}
    </div>
  )
}

/**
 * Enveloppe qui porte le filet inférieur et, éventuellement, un libellé de tête.
 *
 * Séparée de `LinkTabs` parce que le filet appartient à la RANGÉE et non aux onglets :
 * la barre de « Parcourir » y accole un intitulé (« Marchés | … ») que les autres
 * n'ont pas, et le poser dans `LinkTabs` obligerait chaque appelant à passer un
 * paramètre qu'il n'utilise pas.
 */
export function TabsBar({
  children,
  lead,
  ariaLabel,
  center = false,
  variant = 'underline',
}: {
  children: React.ReactNode
  lead?: React.ReactNode
  ariaLabel: string
  /** Centre l'ensemble « intitulé + onglets » dès que la place le permet. */
  center?: boolean
  /** `pill` retire le filet inférieur : les pilules se suffisent à elles-mêmes. */
  variant?: 'underline' | 'pill'
}) {
  return (
    <nav
      aria-label={ariaLabel}
      className={variant === 'pill' ? '' : 'border-b border-border-subtle'}
    >
      {/*
        Le centrage n'est demandé qu'à partir de `sm`. Sous cette largeur la rangée
        déborde et doit défiler : `justify-center` centrerait alors un contenu plus
        large que sa boîte, et le début de la rangée deviendrait INATTEIGNABLE — un
        conteneur de défilement ne remonte pas avant son origine.
      */}
      <div
        className={`flex items-end gap-3 overflow-x-auto ${
          center ? 'justify-start sm:justify-center' : ''
        }`}
      >
        {lead ? (
          <span className="flex shrink-0 items-center gap-3 pb-3 pt-2.5">
            <span className="text-sm font-semibold text-ink">{lead}</span>
            {/* Filet vertical et non une barre oblique : le trait est un séparateur de
                structure, le caractère serait du texte qu'un lecteur d'écran
                énoncerait au milieu d'une liste de liens. */}
            <span className="h-4 w-px bg-border-subtle" aria-hidden="true" />
          </span>
        ) : null}
        {children}
      </div>
    </nav>
  )
}
