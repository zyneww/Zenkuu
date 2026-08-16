'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'

import { AssetLayoutFrame } from '@/components/asset/AssetLayoutFrame'
import { PanelVisibilityProvider } from '@/components/asset/panel-visibility'

/**
 * Onglets de la fiche actif — Aperçu · Marchés · Historique.
 *
 * ── LES TROIS PANNEAUX SONT TOUJOURS DANS LE HTML ─────────────────────────────
 *
 * Le composant ne monte pas l'onglet actif en démontant les autres : les trois
 * panneaux sont rendus CÔTÉ SERVEUR et les inactifs sont simplement masqués par
 * l'attribut `hidden`. Ce détail décide de deux choses à la fois.
 *
 * D'abord le référencement, premier moteur d'acquisition du site (§9) : un robot
 * d'indexation n'actionne aucun onglet. Un rendu conditionnel classique lui
 * cacherait les tableaux de places de cotation et l'historique des cours,
 * c'est-à-dire précisément le contenu long et unique qui distingue une fiche des
 * milliers d'autres. `hidden` laisse tout dans le document.
 *
 * Ensuite l'interaction : le changement d'onglet est instantané, sans rendu ni appel
 * réseau, puisqu'il n'y a rien à charger.
 *
 * Le prix est un HTML plus lourd. Il est mesurable et accepté — c'est du texte et des
 * nombres, très compressibles, sans image ni script supplémentaire.
 *
 * ── L'ÉTAT NE VIT PAS DANS L'URL ──────────────────────────────────────────────
 *
 * Volontairement : trois URL pour une même fiche disperseraient le classement de la
 * page entre elles, et exigeraient des balises canoniques pour s'en défendre.
 * L'onglet est un confort de lecture, pas une ressource distincte.
 *
 * ── L'ONGLET ACTIF PREND LA COULEUR DE MARQUE ─────────────────────────────────
 *
 * Il était en encre pleine sur un soulignement de marque. Celui-ci suffisait à
 * dire « ici » tant que la page n'avait qu'une seule bande d'onglets ; la fiche en
 * porte désormais deux imbriquées — celle-ci, et celle du plan de travail
 * (Graphique / Performances / FAQ) à l'intérieur du panneau. Deux niveaux dessinés
 * à l'identique se confondent. Le libellé coloré marque le niveau SUPÉRIEUR, celui
 * qui change le contenu de la page entière.
 *
 * ── LE SOULIGNEMENT EST UN SEUL TRAIT QUI SE DÉPLACE ──────────────────────────
 *
 * Chaque onglet portait auparavant sa propre bordure basse, allumée quand il était
 * actif. Deux défauts en découlaient.
 *
 * Le premier ne se lit pas dans le code et se voyait pourtant à l'écran : la bordure
 * était tirée d'un pixel SOUS le bouton (`-mb-px`) pour couvrir le filet de la
 * rangée, à l'intérieur d'une bande qui défile horizontalement. Or un `overflow-x`
 * autre que `visible` force l'AUTRE axe à passer de `visible` à `auto` — c'est la
 * règle de la spécification, pas une lubie d'un navigateur. La bande devenait donc
 * défilante VERTICALEMENT d'un pixel : Windows y affichait un ascenseur à flèches,
 * et le soulignement, hors de la zone visible, n'apparaissait qu'après avoir fait
 * défiler ce pixel. Mesuré sur la fiche XRP : `scrollHeight` 41 pour un
 * `clientHeight` de 40, et 16 pixels pris par l'ascenseur.
 *
 * Le second défaut est d'usage : deux bordures distinctes ne savent que s'éteindre
 * et s'allumer. Un seul trait, positionné en absolu et animé par `transform`,
 * GLISSE de l'onglet quitté vers l'onglet choisi et montre ainsi le lien entre les
 * deux. Il est enfant de la bande défilante, donc il suit le défilement horizontal
 * sans qu'on ait à le recalculer.
 *
 * Il est MESURÉ après le montage plutôt que rendu par le serveur : la largeur d'un
 * libellé dépend de la police réellement chargée, que seul le navigateur connaît.
 * Il n'apparaît donc qu'à l'hydratation, et sans transition — un élément qui vient
 * d'être inséré n'anime pas son état initial. C'est exactement le comportement
 * recherché : en place immédiatement, puis en mouvement à chaque changement.
 */

export interface AssetTab {
  id: string
  label: string
  /**
   * Icône de l'onglet, rendue à gauche du libellé.
   *
   * Elle ne remplace JAMAIS le libellé et n'est jamais seule : une barre de trois
   * pictogrammes muets oblige à tous les survoler pour savoir où l'on va. Ce qu'elle
   * apporte est un repère de RETOUR — on retrouve un onglet déjà visité à sa forme,
   * plus vite qu'à la lecture de son nom.
   */
  icon?: React.ReactNode
  panel: React.ReactNode
}

export function AssetTabs({
  tabs,
  rail,
  news,
}: {
  tabs: AssetTab[]
  /**
   * Colonne de chiffres et colonne d'actualités, passées au cadre.
   *
   * ── POURQUOI CE COMPOSANT RASSEMBLE LES DEUX ──────────────────────────────
   *
   * La barre d'onglets doit traverser toute la page, comme celle de la référence, et
   * les panneaux qu'elle commande doivent rester dans la colonne de droite, à côté du
   * rail. Or les deux partagent un même état — l'onglet actif — qui vit ici.
   *
   * Deux façons de tenir les deux : lever l'état dans le cadre, ou faire descendre le
   * cadre sous les onglets. La seconde est retenue parce qu'elle garde l'état là où il
   * est utilisé, et parce que le cadre n'a aucune raison de connaître la notion
   * d'onglet — il place des colonnes, c'est tout. Il reçoit une barre déjà rendue et
   * la pose au-dessus de sa grille.
   *
   * Les deux colonnes sont reçues en NŒUDS DÉJÀ RENDUS : ce sont des arborescences de
   * composants serveur, qu'un composant client ne peut pas construire — mais qu'il
   * peut parfaitement placer.
   */
  rail: React.ReactNode
  news?: React.ReactNode
}) {
  const [active, setActive] = useState(tabs[0]?.id ?? '')
  const base = useId()

  const listRef = useRef<HTMLDivElement>(null)
  const buttonRefs = useRef(new Map<string, HTMLButtonElement>())
  const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null)

  const registerButton = useCallback((id: string, node: HTMLButtonElement | null) => {
    if (node) buttonRefs.current.set(id, node)
    else buttonRefs.current.delete(id)
  }, [])

  /*
   * Position du trait, relevée sur le bouton actif.
   *
   * `offsetLeft` est compté depuis le conteneur, qui est le référent de position de
   * la bande ET celui du trait : les deux lisent donc les mêmes coordonnées, sans
   * conversion ni lecture de `getBoundingClientRect` — celle-ci donnerait des
   * coordonnées d'écran, fausses dès que la bande a défilé.
   *
   * L'observateur de taille couvre les deux façons dont la mesure se périme sans
   * que l'onglet actif change : le redimensionnement de la fenêtre, et l'arrivée de
   * la police définitive qui redessine les libellés à une autre largeur.
   *
   * La comparaison avant `setIndicator` n'est pas une optimisation mais une
   * NÉCESSITÉ : l'objet est neuf à chaque mesure, et le poser tel quel relancerait
   * l'effet en boucle par l'observateur qu'il vient de déclencher.
   */
  useEffect(() => {
    const list = listRef.current
    if (!list) return

    function measure() {
      const button = buttonRefs.current.get(active)
      if (!button) return

      const left = button.offsetLeft
      const width = button.offsetWidth
      setIndicator((previous) =>
        previous && previous.left === left && previous.width === width
          ? previous
          : { left, width },
      )
    }

    measure()

    const observer = new ResizeObserver(measure)
    observer.observe(list)
    for (const button of buttonRefs.current.values()) observer.observe(button)
    return () => observer.disconnect()
  }, [active])

  if (tabs.length === 0) return null

  /*
   * La bande d'onglets seule, sans son filet.
   *
   * Le filet appartient désormais à la rangée du cadre, qu'elle partage avec les
   * commandes de disposition : deux traits parallèles à vingt pixels l'un de l'autre
   * lisaient comme un défaut d'alignement plutôt que comme deux sections.
   *
   * `-mb-px` reste ici : il descend la bande d'un pixel pour que le trait de sélection,
   * posé sur son bord bas, recouvre le filet de la rangée. Une marge est extérieure à
   * la boîte et ne crée donc aucun débordement à faire défiler — voir l'en-tête du
   * fichier sur l'ascenseur d'un pixel que l'ancienne bordure provoquait.
   *
   * `overflow-y-hidden` est explicite plutôt que laissé au calcul : la valeur déduite
   * de `overflow-x` est `auto`, c'est-à-dire un ascenseur au moindre pixel de trop.
   */
  const bar = (
    <div
      ref={listRef}
      role="tablist"
      aria-label="Sections de la fiche"
      className="relative -mx-1 -mb-px flex items-center gap-1 overflow-x-auto overflow-y-hidden px-1"
    >
      {tabs.map((tab) => {
        const selected = tab.id === active
        return (
          <button
            key={tab.id}
            ref={(node) => {
              registerButton(tab.id, node)
            }}
            type="button"
            role="tab"
            id={`${base}-tab-${tab.id}`}
            aria-selected={selected}
            aria-controls={`${base}-panel-${tab.id}`}
            onClick={() => setActive(tab.id)}
            /* `pb-3` remplace `py-2.5` + les deux pixels de bordure : même hauteur
               totale qu'avant, à la place de laquelle le trait est désormais posé. */
            className={`flex items-center gap-1.5 whitespace-nowrap px-3 pb-3 pt-2.5 text-sm font-medium transition-colors duration-150 ${
              selected ? 'text-brand-strong' : 'text-ink-muted hover:text-ink'
            }`}
          >
            {/*
              L'icône suit la couleur du libellé par héritage (`currentColor` chez
              lucide) mais reste légèrement en retrait : à pleine opacité, un
              pictogramme de 14px pèse visuellement autant qu'un mot de huit lettres
              et déséquilibre la paire.
            */}
            {tab.icon !== undefined ? (
              <span aria-hidden="true" className="opacity-70">
                {tab.icon}
              </span>
            ) : null}
            {tab.label}
          </button>
        )
      })}

      {/* Décoratif : le lecteur d'écran connaît déjà l'onglet actif par
          `aria-selected`, et un second signal n'ajouterait qu'un bruit. */}
      {indicator !== null ? (
        <span
          aria-hidden="true"
          className="tab-indicator"
          style={{ width: indicator.width, transform: `translateX(${indicator.left}px)` }}
        />
      ) : null}
    </div>
  )

  /*
   * Les panneaux sont enveloppés dans un CONTENEUR, et non passés en tableau nu.
   *
   * Un tableau passé tel quel en `children` traverse le cadre jusqu'à un `{children}`
   * niché dans sa grille, où React le voit comme une liste dont il ne connaît pas
   * l'origine : il réclame alors des clés sur des éléments qui en ont déjà, en
   * désignant le cadre comme fautif. L'avertissement était constaté en console.
   *
   * Le conteneur porte aussi le retrait haut sous la barre d'onglets, qui vivait sur
   * chaque panneau. Une seule déclaration au lieu de cinq, et l'espacement ne peut
   * plus diverger d'un onglet à l'autre.
   */
  const panels = tabs.map((tab) => (
    <div
      key={tab.id}
      role="tabpanel"
      id={`${base}-panel-${tab.id}`}
      aria-labelledby={`${base}-tab-${tab.id}`}
      hidden={tab.id !== active}
    >
      {/*
        Les panneaux sont TOUS dans le document — c'est le choix de référencement
        expliqué en tête de fichier. Un panneau qui doit charger quelque chose a donc
        besoin de savoir s'il est réellement regardé, sans quoi il paierait son appel
        réseau pour chaque visiteur. C'est cette information-là que le contexte
        transporte : elle est ici certaine, là où tout mécanisme de détection côté
        enfant ne peut que la deviner.
      */}
      <PanelVisibilityProvider visible={tab.id === active}>{tab.panel}</PanelVisibilityProvider>
    </div>
  ))

  return (
    <AssetLayoutFrame tabsBar={bar} rail={rail} {...(news !== undefined ? { news } : {})}>
      <div className="pt-1">{panels}</div>
    </AssetLayoutFrame>
  )
}
