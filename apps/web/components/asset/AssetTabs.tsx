'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'

import { AssetLayoutFrame } from '@/components/asset/AssetLayoutFrame'
import { PanelVisibilityProvider } from '@/components/asset/panel-visibility'
import { useReducedMotion } from '@/components/charts/useReducedMotion'

/**
 * Sommaire de la fiche — Aperçu · Places · Analyse · Actualités · Écosystème.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * LA BARRE NE CHANGE PLUS DE CONTENU : ELLE DÉPLACE LE REGARD.
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Les cinq panneaux étaient exclusifs — un seul affiché, les quatre autres marqués
 * `hidden`. Cliquer « Places » faisait donc DISPARAÎTRE le graphique, qui est la
 * raison d'être de la page. On revenait à « Aperçu » pour le retrouver, puis on
 * repartait ; la courbe et le tableau des places ne se lisaient jamais ensemble.
 *
 * Les cinq sections s'empilent désormais sur une seule page, et la barre fait
 * DÉFILER jusqu'à celle qu'on demande. C'est le comportement de la référence, et il
 * change trois choses :
 *
 *   · le graphique reste atteignable en remontant, jamais démonté ;
 *   · le défilement libre traverse les sections, ce qu'aucun onglet ne permettait ;
 *   · la barre indique où l'on EST, pas seulement où l'on a cliqué.
 *
 * Ce que ce changement ne coûte pas : le HTML. Les cinq panneaux étaient DÉJÀ rendus
 * côté serveur et présents dans le document — c'était le choix de référencement
 * d'origine, un robot d'indexation n'actionnant aucun onglet. Passer en page unique
 * retire un attribut `hidden`, il n'ajoute pas un octet.
 *
 * ── LA VISIBILITÉ CHANGE DE NATURE, ET IL FALLAIT Y PENSER ────────────────────
 *
 * Quatre composants demandent « suis-je affiché ? » avant de lancer leurs appels
 * réseau : l'analyse charge une année d'historique et de bougies, le carnet
 * interroge Binance toutes les cinq secondes, la grille de métriques et les pools de
 * liquidité ont leurs propres requêtes. Tant que la réponse venait de l'onglet actif,
 * un seul d'entre eux travaillait à la fois.
 *
 * Répondre « oui » partout, sous prétexte que tout est désormais affiché, aurait fait
 * démarrer les quatre au chargement de la fiche — dont un sondage permanent derrière
 * un contenu situé à quatre écrans de défilement. La question reste donc la même pour
 * eux (`usePanelVisible` n'a pas bougé d'une ligne), mais la RÉPONSE vient maintenant
 * de la géométrie : une section est « visible » quand elle approche du champ.
 *
 * La marge est généreuse — 600 pixels — pour que le contenu soit prêt à l'arrivée
 * plutôt qu'après. Et une section vue une fois le reste : rendre un `false` après un
 * `true` annulerait des requêtes en vol, ce qui est précisément la panne dont
 * `AssetAnalysis` porte le récit.
 *
 * ── L'ÉTAT NE VIT PAS DANS L'URL ──────────────────────────────────────────────
 *
 * Volontairement : cinq URL pour une même fiche disperseraient le classement de la
 * page entre elles, et exigeraient des balises canoniques pour s'en défendre. La
 * section est un repère de lecture, pas une ressource distincte.
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
 * GLISSE de la section quittée vers la section atteinte et montre ainsi le lien
 * entre les deux — ce qui compte double maintenant qu'il suit le DÉFILEMENT et plus
 * seulement les clics.
 *
 * Il est MESURÉ après le montage plutôt que rendu par le serveur : la largeur d'un
 * libellé dépend de la police réellement chargée, que seul le navigateur connaît.
 */

export interface AssetTab {
  id: string
  label: string
  /**
   * Icône de la section, rendue à gauche du libellé.
   *
   * Elle ne remplace JAMAIS le libellé et n'est jamais seule : une barre de cinq
   * pictogrammes muets oblige à tous les survoler pour savoir où l'on va. Ce qu'elle
   * apporte est un repère de RETOUR — on retrouve une section déjà visitée à sa
   * forme, plus vite qu'à la lecture de son nom.
   */
  icon?: React.ReactNode
  panel: React.ReactNode
}

/**
 * Hauteur réservée au-dessus d'une section quand on défile jusqu'à elle.
 *
 * Elle additionne les DEUX bandes collantes qui restent : l'en-tête du site (64 px) et
 * la rangée de sommaire (48 px). Sans cette réserve, le titre de la section atterrit
 * DERRIÈRE elles — le défaut le plus courant des ancres sur une page à en-tête
 * collant.
 *
 * ⚠️ ELLE VALAIT 156, ET C'EST LA FUSION QUI L'A RAMENÉE À 112. La fiche portait une
 * troisième bande — l'identité `fixed` de l'actif — qui a rejoint la rangée de sommaire
 * (voir `AssetLayoutFrame`). Laisser 156 réserverait 44 pixels au-dessus de chaque
 * section pour une bande qui n'existe plus : chaque clic du sommaire s'arrêterait un
 * demi-titre trop haut.
 *
 * La valeur est utilisée à deux endroits qui doivent s'accorder : le `scroll-margin`
 * des sections, et la marge haute de l'observateur qui décide quelle section est
 * « celle qu'on lit ». La déclarer une fois interdit qu'elles divergent.
 */
const SCROLL_OFFSET = 112

/** Durée du défilement du sommaire. Voir `scrollToSection`. */
const SCROLL_DURATION_MS = 520

/**
 * Gestes par lesquels le lecteur REPREND LA MAIN pendant l'animation.
 *
 * Pas `'scroll'` : nos propres appels à `scrollTo` en émettent un à chaque image, et
 * l'animation s'annulerait donc elle-même dès la première. Ce sont les gestes
 * d'ENTRÉE qu'il faut écouter — molette, doigt, clavier — parce qu'eux seuls
 * expriment une intention.
 */
const SCROLL_INTERRUPTS = ['wheel', 'touchstart', 'keydown'] as const

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * DÉFILEMENT DOUX JUSQU'À UNE SECTION — ÉCRIT À LA MAIN, ET IL LE FAUT
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── CE QUI A ÉTÉ ESSAYÉ AVANT, ET POURQUOI ÇA NE TENAIT PAS ──────────────────
 *
 * `scrollIntoView({ behavior: 'smooth' })` est la réponse évidente. Relevé au
 * navigateur sur la fiche du bitcoin, position lue toutes les 150 ms après un clic sur
 * « Analyse » (cible à 2 910 pixels) :
 *
 *   0 · 0 · 0 · 0 · 0 · 0 · 0 · 0 · 0 · 0 · 471 · 2045 · 2841 · 2908 · 2910
 *
 * Une seconde et demie d'immobilité, puis un rattrapage en trois images. La cause
 * n'est pas un bogue : le clic marque des sections comme atteintes, celles-ci lancent
 * leurs requêtes, s'hydratent et se redimensionnent — et l'animation NATIVE vit sur le
 * fil principal. Pire, un changement de mise en page sous elle l'ANNULE purement et
 * simplement.
 *
 * Le saut sec (`behavior: 'instant'`) a donc régné un temps. Il était honnête et il
 * était laid : quatre sections d'écart se franchissaient sans qu'on voie qu'on avait
 * bougé, et l'on perdait le fil de la page.
 *
 * ── CE QUE FAIT CELLE-CI, ET POURQUOI ELLE SURVIT LÀ OÙ L'AUTRE ÉCHOUE ───────
 *
 * Trois différences, et ce sont exactement les trois causes de la panne :
 *
 *   1. LA CIBLE EST RECALCULÉE À CHAQUE IMAGE. Une section qui s'étoffe au-dessus de
 *      nous déplace la cible ; l'animation native, elle, fige sa destination au départ
 *      et arrive à côté. Ici, grandir sous l'animation la corrige au lieu de la casser.
 *
 *   2. ELLE EST PILOTÉE PAR LE TEMPS, PAS PAR LES IMAGES. Une image perdue dans un
 *      remous de mise en page ne « saute » pas le mouvement : la suivante lit l'horloge
 *      et se place où elle devrait être. L'animation native, elle, s'annule.
 *
 *   3. ELLE N'EST INTERROMPUE QUE PAR UN GESTE. Rien n'est plus désagréable qu'une page
 *      qui vous ramène où vous n'êtes plus — molette, doigt ou touche rendent donc la
 *      main immédiatement. Voir `SCROLL_INTERRUPTS` pour ce qui n'est PAS écouté.
 *
 * ── DEUX PIÈGES, NOMMÉS PARCE QU'ILS COÛTENT UNE DEMI-HEURE À CHAQUE FOIS ────
 *
 *   · `behavior: 'auto'` ne veut PAS dire « immédiatement ». Il veut dire « suis le
 *     CSS » — et la feuille de style du site déclare `scroll-behavior: smooth`. Chaque
 *     image de cette animation DOIT donc être posée en `'instant'`, sans quoi on
 *     empilerait 30 défilements doux natifs par seconde.
 *
 *   · un `setTimeout` de recalage n'est plus nécessaire : la boucle recalcule déjà. Le
 *     seul recalage qui subsiste vise ce qui arrive APRÈS l'animation — les réponses
 *     réseau des sections traversées, qui les font grandir une fois qu'on est arrêté.
 */
function scrollToSection(node: HTMLElement, reduced: boolean): void {
  const targetOf = () =>
    Math.max(0, node.getBoundingClientRect().top + window.scrollY - SCROLL_OFFSET)

  const settle = () => {
    /* Recalage tardif : les sections traversées répondent au réseau et grandissent
       après l'arrêt. Abandonné si le lecteur a bougé entre-temps — on ne recale que
       depuis la position qu'on a soi-même posée. */
    const placed = window.scrollY
    window.setTimeout(() => {
      if (Math.abs(window.scrollY - placed) > 4) return
      const target = targetOf()
      if (Math.abs(window.scrollY - target) <= 2) return
      window.scrollTo({ top: target, behavior: 'instant' })
    }, 700)
  }

  /* Mouvement réduit demandé : on pose la position, sans animation. La règle CSS
     `prefers-reduced-motion` du site ne peut rien contre un défilement piloté en
     JavaScript — c'est la même raison qui fait exister `useReducedMotion`. */
  if (reduced) {
    window.scrollTo({ top: targetOf(), behavior: 'instant' })
    settle()
    return
  }

  const from = window.scrollY
  const startedAt = performance.now()
  let frame = 0

  const stop = () => {
    cancelAnimationFrame(frame)
    for (const name of SCROLL_INTERRUPTS) window.removeEventListener(name, stop)
  }

  for (const name of SCROLL_INTERRUPTS) {
    window.addEventListener(name, stop, { passive: true })
  }

  const step = (now: number) => {
    const progress = Math.min(1, (now - startedAt) / SCROLL_DURATION_MS)
    /* Décélération cubique : rapide au départ, posée à l'arrivée. C'est la courbe des
       défilements natifs, et celle qui donne le sentiment d'avoir été emmené quelque
       part plutôt que téléporté. */
    const eased = 1 - (1 - progress) ** 3

    window.scrollTo({ top: from + (targetOf() - from) * eased, behavior: 'instant' })

    if (progress < 1) frame = requestAnimationFrame(step)
    else {
      stop()
      settle()
    }
  }

  frame = requestAnimationFrame(step)
}

export function AssetTabs({
  tabs,
  rail,
  identity,
  aside,
}: {
  tabs: AssetTab[]
  /**
   * Identité compacte de l'actif, révélée dans la rangée de sommaire au défilement.
   *
   * Elle transite par ici pour la même raison que le rail et la colonne d'actualités :
   * c'est ce composant qui monte le cadre, et le cadre est le seul à connaître la
   * géométrie de sa rangée collante. Ce composant ne fait que la passer — elle ne
   * partage aucun état avec le sommaire.
   */
  identity?: React.ReactNode
  /**
   * Colonne de chiffres, passée au cadre.
   *
   * ── POURQUOI CE COMPOSANT LA TRANSMET ─────────────────────────────────────
   *
   * La barre de sommaire doit traverser toute la page, comme celle de la référence, et
   * les sections qu'elle désigne doivent rester dans la colonne de droite, à côté du
   * rail. Or les deux partagent un même état — la section courante — qui vit ici.
   *
   * Deux façons de tenir les deux : lever l'état dans le cadre, ou faire descendre le
   * cadre sous la barre. La seconde est retenue parce qu'elle garde l'état là où il
   * est utilisé, et parce que le cadre n'a aucune raison de connaître la notion de
   * section — il place des colonnes, c'est tout.
   *
   * Le rail est reçu en NŒUD DÉJÀ RENDU : c'est une arborescence de composants
   * serveur, qu'un composant client ne peut pas construire — mais qu'il peut
   * parfaitement placer.
   */
  rail: React.ReactNode
  /**
   * Colonne d'actualités, transmise telle quelle au cadre.
   *
   * Elle transite par ici pour la même raison que le rail : c'est ce composant qui
   * monte le cadre, et le cadre est le seul à connaître la géométrie des colonnes.
   * Ce composant, lui, ne fait que la passer — elle ne partage aucun état avec la
   * barre de sommaire.
   */
  aside?: React.ReactNode
}) {
  const [active, setActive] = useState(tabs[0]?.id ?? '')
  const base = useId()
  const reduced = useReducedMotion()

  const listRef = useRef<HTMLDivElement>(null)
  const buttonRefs = useRef(new Map<string, HTMLButtonElement>())
  const sectionRefs = useRef(new Map<string, HTMLElement>())
  const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null)

  /* Sections dont le contenu a le droit de charger — voir l'en-tête sur la visibilité.
     Un `Set` dans un état plutôt qu'une référence : l'ajout doit provoquer un rendu,
     sans quoi les composants concernés n'apprendraient jamais la nouvelle. */
  const [reached, setReached] = useState<Set<string>>(() => new Set(tabs[0] ? [tabs[0].id] : []))

  const registerButton = useCallback((id: string, node: HTMLButtonElement | null) => {
    if (node) buttonRefs.current.set(id, node)
    else buttonRefs.current.delete(id)
  }, [])

  const registerSection = useCallback((id: string, node: HTMLElement | null) => {
    if (node) sectionRefs.current.set(id, node)
    else sectionRefs.current.delete(id)
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
   * que la section active change : le redimensionnement de la fenêtre, et l'arrivée
   * de la police définitive qui redessine les libellés à une autre largeur.
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

  /*
   * ── QUELLE SECTION EST-ON EN TRAIN DE LIRE ? ───────────────────────────────
   *
   * Un observateur, pas un écouteur de défilement : celui-ci réveillerait le fil
   * principal à chaque image pendant toute la descente de la page, pour ne changer
   * d'avis que quatre fois.
   *
   * La fenêtre d'observation est RÉTRÉCIE aux deux bouts. En haut, de la hauteur des
   * bandes collantes : une section cachée derrière elles ne se lit pas, la déclarer
   * active ferait s'allumer un onglet dont on ne voit rien. En bas, de plus de la
   * moitié de l'écran : sans cela, la section suivante s'annoncerait dès que son
   * premier pixel apparaît, alors qu'on lit encore la précédente.
   *
   * Plusieurs sections peuvent traverser la bande restante à la fois — c'est le cas
   * normal, pas l'exception. On retient LA PREMIÈRE DANS L'ORDRE DU DOCUMENT, ce qui
   * rend le résultat indépendant de l'ordre dans lequel l'observateur livre ses
   * entrées, lequel n'est pas garanti.
   */
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return

    const nodes = tabs
      .map((tab) => sectionRefs.current.get(tab.id))
      .filter((node): node is HTMLElement => node !== undefined)
    if (nodes.length === 0) return

    const onScreen = new Set<string>()

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = entry.target.getAttribute('data-section')
          if (!id) continue
          if (entry.isIntersecting) onScreen.add(id)
          else onScreen.delete(id)
        }

        const first = tabs.find((tab) => onScreen.has(tab.id))
        if (first) setActive(first.id)
      },
      { rootMargin: `-${SCROLL_OFFSET}px 0px -55% 0px`, threshold: 0 },
    )

    for (const node of nodes) observer.observe(node)
    return () => observer.disconnect()
  }, [tabs])

  /*
   * ── QUELLE SECTION A LE DROIT DE CHARGER ? ─────────────────────────────────
   *
   * Second observateur, et il en faut bien un second : celui du dessus répond à « que
   * lit-on », avec une fenêtre étroite ; celui-ci répond à « que faut-il préparer »,
   * avec 600 pixels d'avance. Les fusionner obligerait à choisir une seule marge, donc
   * soit à allumer les onglets trop tôt, soit à charger trop tard.
   *
   * Une section atteinte n'est jamais retirée du registre. C'est délibéré : `false`
   * après `true` annulerait les requêtes en vol de `AssetAnalysis`, dont le fichier
   * raconte au long ce que cela a coûté. Le carnet d'ordres continue donc d'interroger
   * Binance après qu'on l'a dépassé — c'est le prix, et il est modeste au regard d'un
   * tableau vide au retour.
   */
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return

    const observer = new IntersectionObserver(
      (entries) => {
        const arrived = entries
          .filter((entry) => entry.isIntersecting)
          .map((entry) => entry.target.getAttribute('data-section'))
          .filter((id): id is string => id !== null)

        if (arrived.length === 0) return

        setReached((previous) => {
          const next = new Set(previous)
          for (const id of arrived) next.add(id)
          // Même motif que l'indicateur : un `Set` neuf à chaque passage relancerait
          // les rendus des cinq sections pour rien.
          return next.size === previous.size ? previous : next
        })
      },
      { rootMargin: '600px 0px 600px 0px', threshold: 0 },
    )

    for (const tab of tabs) {
      const node = sectionRefs.current.get(tab.id)
      if (node) observer.observe(node)
    }
    return () => observer.disconnect()
  }, [tabs])

  const goTo = useCallback((id: string) => {
    const node = sectionRefs.current.get(id)
    if (!node) return

    /* `reduced` est lu ICI plutôt que passé à `scrollToSection` en dépendance : le
       crochet ne peut être appelé que dans le corps du composant, et cette valeur est
       stable pour la durée d'une visite. */

    /* On allume l'onglet TOUT DE SUITE, sans attendre que l'observateur le confirme :
       le défilement doux met plusieurs centaines de millisecondes, pendant lesquelles
       un bouton cliqué qui ne réagit pas se lit comme un bouton mort. L'observateur
       reprendra la main à l'arrivée et confirmera, ou corrigera si la section est
       trop courte pour occuper la bande de lecture. */
    setActive(id)
    setReached((previous) => {
      if (previous.has(id)) return previous
      const next = new Set(previous)
      next.add(id)
      return next
    })

    scrollToSection(node, reduced)
  }, [reduced])

  if (tabs.length === 0) return null

  /*
   * La bande de sommaire, sans son filet.
   *
   * Le filet appartient à la rangée du cadre — voir `AssetLayoutFrame`.
   *
   * `-mb-px` reste ici : il descend la bande d'un pixel pour que le trait de
   * sélection, posé sur son bord bas, recouvre le filet de la rangée. Une marge est
   * extérieure à la boîte et ne crée donc aucun débordement à faire défiler — voir
   * l'en-tête du fichier sur l'ascenseur d'un pixel que l'ancienne bordure provoquait.
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
            onClick={() => goTo(tab.id)}
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

      {/* Décoratif : le lecteur d'écran connaît déjà la section active par
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
   * Les sections sont enveloppées dans un CONTENEUR, et non passées en tableau nu.
   *
   * Un tableau passé tel quel en `children` traverse le cadre jusqu'à un `{children}`
   * niché dans sa grille, où React le voit comme une liste dont il ne connaît pas
   * l'origine : il réclame alors des clés sur des éléments qui en ont déjà, en
   * désignant le cadre comme fautif. L'avertissement était constaté en console.
   *
   * `role="tabpanel"` est CONSERVÉ malgré la page unique, et l'attribut `hidden` a
   * disparu. Le couple garde son sens : la barre reste un `tablist` dont chaque
   * bouton commande une région nommée. Ce qui change est qu'aucune région n'est plus
   * cachée — un lecteur d'écran les parcourt donc toutes en lecture linéaire, ce qui
   * est exactement ce qu'on veut d'une page unique.
   */
  const sections = tabs.map((tab) => (
    <section
      key={tab.id}
      ref={(node) => {
        registerSection(tab.id, node)
      }}
      data-section={tab.id}
      /* `asset-section` ouvre un contexte de formatage à partir de `lg` : la section
         se rétrécit tant qu'elle longe le rail flottant, et reprend toute la largeur
         dès qu'elle commence sous lui. Voir `globals.css`. */
      className="asset-section"
      role="tabpanel"
      id={`${base}-panel-${tab.id}`}
      aria-labelledby={`${base}-tab-${tab.id}`}
      /* La réserve haute vit en CSS pour valoir AUSSI pour un lien d'ancrage et pour
         la navigation au clavier, pas seulement pour le bouton de la barre. */
      style={{ scrollMarginTop: `${SCROLL_OFFSET}px` }}
    >
      {/*
        Les sections sont TOUTES dans le document — c'est le choix de référencement
        expliqué en tête de fichier. Celle qui doit charger quelque chose a donc besoin
        de savoir si le lecteur en approche, sans quoi elle paierait son appel réseau
        au chargement de la page pour un contenu situé quatre écrans plus bas.
      */}
      <PanelVisibilityProvider visible={reached.has(tab.id)}>{tab.panel}</PanelVisibilityProvider>
    </section>
  ))

  return (
    <AssetLayoutFrame tabsBar={bar} identity={identity} rail={rail} aside={aside}>
      {/* `space-y-12` : les sections ne sont plus séparées par un changement d'écran,
          c'est donc le blanc qui doit dire où l'une finit et où l'autre commence. En
          dessous, les titres de premier niveau de deux sections voisines se lisent
          comme deux titres de la même.

          `asset-sections` retire la BOÎTE de cette enveloppe à partir de `lg`, sans la
          retirer de l'arbre : sans quoi elle formerait à elle seule un bloc rétréci le
          long du rail flottant sur toute sa hauteur, et les sections n'y gagneraient
          rien. Ses marges d'espacement survivent — elles visent ses enfants. Voir
          `globals.css`. */}
      {/* PAS de `pt-1` ici : `asset-sections` retire la boîte de cette enveloppe à
          partir de `lg`, et un rembourrage sans boîte ne rembourre rien. Il donnait
          donc quatre pixels sur téléphone et zéro sur ordinateur — un écart que rien
          n'expliquait. La réserve haute appartient au cadre, qui en a une (`pt-4`). */}
      <div className="asset-sections space-y-12">{sections}</div>
    </AssetLayoutFrame>
  )
}
