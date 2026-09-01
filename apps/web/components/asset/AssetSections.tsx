'use client'

import { AssetTabBar } from '@/components/asset/AssetTabBar'
import { useCallback, useEffect, useRef, useState } from 'react'

import { AssetLayoutFrame } from '@/components/asset/AssetLayoutFrame'
import { PanelVisibilityProvider } from '@/components/asset/panel-visibility'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * LES SECTIONS DE LA FICHE — EMPILÉES, SANS BARRE DE SOMMAIRE
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── CE QUE CE FICHIER REMPLACE : `AssetTabs` ────────────────────────────────
 *
 * Il portait la même chose PLUS une barre de sommaire collante — « Aperçu · Places ·
 * Analyse · Écosystème » — avec son trait de sélection animé, son observateur de
 * section courante, son défilement doux et sa bande à ombres portées. Cette barre a
 * été retirée du produit : la fiche est une page unique qu'on descend, et la
 * référence de la refonte (dropstab.com) n'en a pas.
 *
 * Tout ce qui n'existait QUE pour elle est parti avec : `active`, l'indicateur
 * mesuré, les références de boutons, l'observateur « quelle section lit-on », le
 * défilement animé et les rôles `tablist` / `tab` / `tabpanel`.
 *
 * ── CE QUI SURVIT, ET POURQUOI IL LE FAUT ───────────────────────────────────
 *
 * Le SECOND observateur, celui qui répond à « que faut-il préparer ». Quatre
 * composants demandent « suis-je affiché ? » avant de lancer leurs appels réseau :
 * l'analyse charge une année d'historique et de bougies, le carnet interroge Binance
 * toutes les cinq secondes, la grille de métriques et les pools de liquidité ont
 * leurs propres requêtes.
 *
 * Répondre « oui » partout, sous prétexte que tout est affiché, ferait démarrer les
 * quatre au chargement de la fiche — dont un sondage permanent derrière un contenu
 * situé à quatre écrans de défilement. La question reste donc la même pour eux
 * (`usePanelVisible` n'a pas bougé), et la réponse vient de la géométrie : une
 * section est « visible » quand elle approche du champ.
 *
 * ⚠️ UNE SECTION ATTEINTE N'EST JAMAIS RETIRÉE DU REGISTRE. C'est délibéré : `false`
 * après `true` annulerait les requêtes en vol de `AssetAnalysis`, dont le fichier
 * raconte au long ce que cela a coûté.
 *
 * ── LE HTML EST INCHANGÉ POUR LES ROBOTS ────────────────────────────────────
 *
 * Les sections étaient déjà TOUTES rendues côté serveur et présentes dans le
 * document — c'était le choix de référencement d'origine. Retirer la barre ne retire
 * pas un octet de contenu ; elle ne servait qu'à sauter d'une section à l'autre, ce
 * que le défilement fait sans elle.
 */

export interface AssetTab {
  id: string
  label: string
  /**
   * Icône de la section.
   *
   * ⚠️ ELLE N'EST PLUS RENDUE ICI depuis le retrait de la barre de sommaire, qui
   * était son seul point d'affichage. Le champ reste déclaré parce que les sections
   * la fournissent encore et que certaines la reprennent dans leur propre titre :
   * la retirer du type obligerait à toucher les cinq déclarations pour un gain nul.
   */
  icon?: React.ReactNode
  panel: React.ReactNode
}

/**
 * Hauteur réservée au-dessus d'une section quand on défile jusqu'à elle.
 *
 * ⚠️ ELLE VALAIT 112 QUAND LA RANGÉE DE SOMMAIRE EXISTAIT (64 px d'en-tête de site
 * + 48 px de rangée). Celle-ci est partie ; il ne reste que l'en-tête du site, plus
 * une marge de confort qui empêche un titre d'affleurer exactement son filet.
 *
 * Elle sert aux LIENS D'ANCRAGE — `#analyse`, `#places` — que le contenu emploie
 * pour renvoyer d'une section à l'autre. Sans réserve, le titre visé atterrit
 * derrière la bande collante du site.
 */
const SCROLL_OFFSET = 80

export function AssetSections({
  tabs,
  rail,
  identity,
  aside,
  headline,
}: {
  tabs: AssetTab[]
  /**
   * Identité compacte de l'actif, révélée par la rangée collante au défilement.
   *
   * Elle transite par ici pour la même raison que le rail : c'est ce composant qui
   * monte le cadre, et le cadre est le seul à connaître la géométrie de sa rangée.
   */
  identity?: React.ReactNode
  /**
   * Colonne de chiffres, passée au cadre.
   *
   * Reçue en NŒUD DÉJÀ RENDU : c'est une arborescence de composants serveur, qu'un
   * composant client ne peut pas construire — mais qu'il peut parfaitement placer.
   */
  rail: React.ReactNode
  /** Colonne d'actualités, transmise telle quelle au cadre. */
  aside?: React.ReactNode
  /**
   * Bande d'identité, transmise telle quelle au cadre.
   *
   * Elle traverse ce composant sans être lue, comme le rail : c'est le cadre qui place
   * les colonnes, et c'est lui qui sait que cette bande ouvre la colonne principale
   * pour que la colonne d'actualités commence à sa hauteur.
   */
  headline?: React.ReactNode
}) {
  const sectionRefs = useRef(new Map<string, HTMLElement>())

  /* Sections dont le contenu a le droit de charger — voir l'en-tête sur la visibilité.
     Un `Set` dans un état plutôt qu'une référence : l'ajout doit provoquer un rendu,
     sans quoi les composants concernés n'apprendraient jamais la nouvelle. */
  const [reached, setReached] = useState<Set<string>>(() => new Set(tabs[0] ? [tabs[0].id] : []))

  /* Section actuellement en tête de fenêtre — c'est elle que la barre d'onglets
     désigne. Distincte de `reached`, qui dit ce qui a le DROIT de charger et ne
     retire jamais rien : ici la valeur doit aussi bien reculer qu'avancer. */
  const [activeId, setActiveId] = useState<string | null>(() => tabs[0]?.id ?? null)

  const registerSection = useCallback((id: string, node: HTMLElement | null) => {
    if (node) sectionRefs.current.set(id, node)
    else sectionRefs.current.delete(id)
  }, [])

  /*
   * ── QUELLE SECTION A LE DROIT DE CHARGER ? ─────────────────────────────────
   *
   * 600 pixels d'avance : le contenu doit être prêt à l'arrivée plutôt qu'après. Un
   * observateur et non un écouteur de défilement — celui-ci réveillerait le fil
   * principal à chaque image pendant toute la descente de la page.
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
          // Un `Set` neuf à chaque passage relancerait les rendus des cinq sections
          // pour rien.
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

  /*
   * ── QUELLE SECTION LA BARRE DÉSIGNE-T-ELLE ? ───────────────────────────────
   *
   * Un SECOND observateur, et non une extension du premier : les deux répondent à
   * des questions opposées. Celui du dessus prend 600 px d'avance pour laisser
   * charger ce qui arrive ; celui-ci doit désigner ce qu'on REGARDE, donc une bande
   * étroite en haut de la fenêtre.
   *
   * `rootMargin` réduit la zone d'intérêt à une bande étroite. Sans ce
   * rétrécissement, trois sections se chevaucheraient dans le viewport et la
   * dernière annoncée gagnerait — la barre désignerait une section déjà dépassée.
   *
   * ⚠️ LA BANDE COMMENCE À `SCROLL_OFFSET`, PAS EN HAUT DE LA FENÊTRE, et c'est ce
   * qui la rend juste après un clic. L'ancre pose la section à 80 px du bord haut
   * (`scrollMarginTop`). Une bande partant de 0 englobait donc encore la FIN de la
   * section précédente, qui l'emportait puisqu'on retient la plus haute : cliquer
   * « Analyse » faisait défiler au bon endroit mais laissait « Places » désigné.
   * Constaté au navigateur sur la fiche Uniswap.
   *
   * On retient la PLUS HAUTE des sections qui coupent cette bande, et non la
   * dernière notifiée : l'ordre des entrées d'un `IntersectionObserver` n'est pas
   * celui du document.
   */
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return

    const visibles = new Set<string>()
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = entry.target.getAttribute('data-section')
          if (id === null) continue
          if (entry.isIntersecting) visibles.add(id)
          else visibles.delete(id)
        }
        const premier = tabs.find((tab) => visibles.has(tab.id))
        if (premier) setActiveId(premier.id)
      },
      { rootMargin: `-${SCROLL_OFFSET}px 0px -75% 0px`, threshold: 0 },
    )

    for (const tab of tabs) {
      const node = sectionRefs.current.get(tab.id)
      if (node) observer.observe(node)
    }
    return () => observer.disconnect()
  }, [tabs])

  /*
   * ── UN ONGLET QUI NE MÈNE À RIEN NE S'AFFICHE PAS ─────────────────────────
   *
   * `AssetPageView` le dit déjà pour son onglet « Places » : « un onglet cliquable
   * qui ne mène à rien est pire qu'un onglet absent ». Le cas se produit vraiment —
   * sur Bitcoin, la section « Places » rend une hauteur NULLE : la place de cotation
   * se retire pour la crypto, la table des contrats se retire sous deux chaînes, et
   * la branche restante rend `null` dès qu'il existe des places de cotation.
   *
   * Ce garde-fou ne remplace pas la condition écrite là-bas, il la RATTRAPE : un
   * parent ne peut pas savoir ce qu'un enfant a rendu, et recopier chaque test dans
   * la barre ferait diverger deux jeux de conditions le jour où l'un change. On
   * mesure donc le résultat plutôt que de le prédire.
   *
   * La mesure est faite APRÈS peinture et à chaque changement de `reached` : une
   * section qui charge son contenu à l'approche part à zéro et grandit ensuite. Sans
   * cette dépendance, un onglet légitime disparaîtrait pour de bon.
   */
  const [vides, setVides] = useState<ReadonlySet<string>>(() => new Set())

  useEffect(() => {
    const image = requestAnimationFrame(() => {
      const trouves = new Set<string>()
      for (const tab of tabs) {
        const node = sectionRefs.current.get(tab.id)
        if (node && node.getBoundingClientRect().height === 0) trouves.add(tab.id)
      }
      setVides((precedent) => {
        if (precedent.size === trouves.size && [...trouves].every((id) => precedent.has(id))) {
          return precedent
        }
        return trouves
      })
    })
    return () => cancelAnimationFrame(image)
  }, [tabs, reached])

  if (tabs.length === 0) return null

  /*
   * Les sections sont enveloppées dans un CONTENEUR, et non passées en tableau nu.
   *
   * Un tableau passé tel quel en `children` traverse le cadre jusqu'à un `{children}`
   * niché dans sa grille, où React le voit comme une liste dont il ne connaît pas
   * l'origine : il réclame alors des clés sur des éléments qui en ont déjà, en
   * désignant le cadre comme fautif. L'avertissement était constaté en console.
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
      /*
       * L'identifiant est celui de la section, sans préfixe de rendu : c'est ce qui
       * rend `#analyse` visable depuis le contenu, qui s'en sert pour renvoyer d'une
       * section à l'autre. La réserve haute vit en CSS pour valoir AUSSI pour ces
       * liens d'ancrage et pour la navigation au clavier.
       */
      id={tab.id}
      aria-label={tab.label}
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
    <AssetLayoutFrame identity={identity} rail={rail} aside={aside} headline={headline}>
      {/* `space-y-12` : les sections ne sont plus séparées par un changement d'écran,
          c'est donc le blanc qui doit dire où l'une finit et où l'autre commence.

          `asset-sections` retire la BOÎTE de cette enveloppe à partir de `lg`, sans la
          retirer de l'arbre : sans quoi elle formerait à elle seule un bloc rétréci le
          long du rail flottant sur toute sa hauteur. Ses marges d'espacement survivent
          — elles visent ses enfants. Voir `globals.css`. */}
      <div className="asset-sections space-y-12">
        <AssetTabBar tabs={tabs.filter((tab) => !vides.has(tab.id))} activeId={activeId} />
        {sections}
      </div>
    </AssetLayoutFrame>
  )
}
