'use client'

import { History, LineChart, Scissors, Table2 } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { Link, type AppHref } from '@/i18n/navigation'
import { usePhrase } from '@/components/locale/ContentProvider'
import { assetHref } from '@/lib/asset-routes'
import { metricsHref } from '@/lib/asset-metrics'
import type { AssetClass } from '@zenkuu/data'

/**
 * RANGÉE D'ONGLETS DE LA FICHE D'ACTIF.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * TROIS SOUS-ROUTES EXISTAIENT SANS QU'AUCUN LIEN N'Y MÈNE
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * `/crypto/[id]/historique` et `/crypto/[id]/halving` sont écrites, servies, et
 * n'étaient joignables qu'en tapant leur adresse — ni lien, ni entrée de sitemap.
 * Cette rangée les rend atteignables, et donne à la fiche la silhouette de la
 * référence : une rangée d'onglets pleine largeur, sous l'en-tête, au-dessus des
 * deux colonnes.
 *
 * ⚠️ LA GÉOMÉTRIE A ÉTÉ RELEVÉE DEUX FOIS, SUR DEUX RÉFÉRENCES.
 *
 * Sur tokenomist.ai/bitcoin d'abord : rangée de 48 px, corps 16, graisse 400, une
 * icône de 16 px à gauche de l'intitulé.
 *
 * Sur `coingecko.com/en/coins/bitcoin` ensuite, le 2026-09-06, qui redevient la
 * référence sur demande — et sa rangée est nettement plus serrée :
 *
 *     <nav class="flex overflow-x-auto shadow-[inset_0_-1px_0_0_#EFF2F5]">   h=37
 *       <a class="selected relative z-[1]" p="8px 16px">
 *         <span class="font-semibold text-sm leading-5">Overview</span>
 *
 * Soit 14/20/600 et un rembourrage de 8/16, contre 16/24/400 et 48 px de haut. Un
 * intitulé qui gagne en graisse ce qu'il perd en taille.
 *
 * ⚠️ L'ENCRE ACTIVE EST L'ENCRE PLEINE, PAS LA MARQUE. Chez la référence, l'onglet
 * sélectionné sort en `#0f172a` — son encre la plus sombre — et c'est le SOULIGNEMENT
 * seul qui porte la couleur. Le trait, lui, garde l'azur : elle y met son vert, nous
 * notre marque, et c'est la seule chose qui ne se copie pas.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * LE TRAIT GLISSE, ET LE COMPOSANT EST PASSÉ CÔTÉ CLIENT POUR CELA
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Il était un `border-b-2` posé sur l'onglet actif : chaque onglet avait le sien, et
 * ils s'allumaient l'un après l'autre. Des traits dont un seul est visible ne peuvent
 * pas se DÉPLACER — au changement d'onglet, l'un s'éteignait et l'autre s'allumait,
 * sans rien entre les deux.
 *
 * Un trait UNIQUE pour toute la rangée parcourt la distance, et c'est ce mouvement qui
 * dit « d'ici vers là ». C'est la mécanique de `LinkTabs` et de `ClassTabs`, dont les
 * en-têtes portent le raisonnement complet ; elle est reprise telle quelle plutôt que
 * réinventée.
 *
 * Le prix est le passage en `'use client'` : mesurer un élément demande le DOM. La
 * traduction passe donc de `getPhrase()` à `usePhrase()`, qui lit la même table.
 *
 * ⚠️ `offsetLeft` ET NON `getBoundingClientRect` : le premier est compté depuis le
 * conteneur, qui est le référent de position du trait — les deux lisent les mêmes
 * coordonnées. Le second donnerait des coordonnées d'ÉCRAN, fausses dès que la rangée
 * a défilé horizontalement, ce qui est précisément son comportement sur téléphone.
 *
 * ── L'ONGLET « MÉTRIQUES » EXISTE MAINTENANT, ET IL A FALLU LUI BÂTIR SA PAGE ──
 *
 * Cette note disait : « PAS D'ONGLET MÉTRIQUES, alors que vingt et une pages de
 * métrique existent. Elles vivent sous `/{classe}/[id]/metriques/[metrique]` : il n'y
 * a donc pas UNE destination mais vingt et une, et aucune n'est canonique. »
 *
 * Le constat était juste, la conclusion était provisoire. Ce qui manquait n'était pas
 * l'onglet mais le CATALOGUE : `/{classe}/[id]/metriques` liste les mesures
 * renseignées pour l'actif, groupées comme le rail les groupe. L'onglet a désormais
 * une adresse canonique, et les vingt et une pages un chemin depuis la fiche —
 * jusqu'ici elles n'étaient joignables qu'en tapant leur URL.
 *
 * ⚠️ PAS D'ONGLETS « TOKENOMICS » NI « UNLOCK EVENTS », que la référence porte.
 * Aucune donnée derrière : ni allocation par catégorie, ni calendrier de
 * déverrouillage, ni courbe d'émission. `AssetSupply` le consigne déjà — les
 * afficher supposerait de les ESTIMER.
 *
 * ── LA RANGÉE PARAÎT DÉSORMAIS SUR LES SIX CLASSES ────────────────────────────
 *
 * Elle ne se rendait que pour la crypto, seule classe à porter des sous-routes :
 * « une rangée à un onglet n'est pas une navigation, c'est un titre déguisé en
 * commande ». Le catalogue existe pour les six, donc les six ont deux onglets, et le
 * garde-fou reste écrit — `tabs.length < 2` — plutôt que remplacé par une confiance.
 */

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * LA MÉMOIRE DU TRAIT — CE QUI LE FAIT GLISSER D'UNE ROUTE À L'AUTRE
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── LE PROBLÈME, ET IL EST STRUCTUREL ────────────────────────────────────────
 *
 * Les trois onglets sont trois ROUTES. Changer d'onglet démonte cette rangée et en
 * monte une neuve : le trait n'a donc aucune position d'où partir, et il APPARAÎT
 * sous le bon onglet au lieu d'y aller. La transition CSS est bien là, elle n'a
 * simplement rien à interpoler.
 *
 * ── CE QUI A ÉTÉ ESSAYÉ, ET POURQUOI ÇA NE MARCHAIT PAS ─────────────────────
 *
 * `@view-transition { navigation: auto }` dans la feuille de style. La règle est
 * réelle et le navigateur la comprend — mais elle ne vaut QUE pour les navigations
 * ENTRE DOCUMENTS. Celles de Next.js se font dans le MÊME document, et la règle ne
 * s'applique donc jamais. Vérifié au navigateur en instrumentant
 * `document.startViewTransition` : zéro appel sur une bascule d'onglet. Le bloc a
 * été retiré plutôt que laissé en place avec un commentaire qui aurait menti.
 *
 * ── CE QUI MARCHE : UNE MÉMOIRE DE MODULE ───────────────────────────────────
 *
 * Un module survit au démontage d'un composant. La rangée neuve y retrouve donc la
 * position que la précédente y a laissée, se rend D'ABORD à cet endroit, puis se
 * déplace vers le bon onglet à l'image suivante — ce qui donne à la transition CSS
 * les deux valeurs entre lesquelles interpoler.
 *
 * ⚠️ ELLE EST VOLONTAIREMENT NON RÉINITIALISÉE ENTRE DEUX ACTIFS. Passer de la
 * fiche du bitcoin à celle de l'ether garde le trait sous « Aperçu » dans les deux
 * cas : c'est le même onglet, à la même place, et le faire repartir de zéro serait
 * un mouvement qui ne raconte rien. La seule chose qu'elle retienne est une
 * géométrie, jamais un identifiant d'actif.
 */
let dernierTrait: { left: number; width: number } | null = null

type TabKey = 'apercu' | 'metriques' | 'historique' | 'halving'

export function AssetTabs({
  assetClass,
  id,
  active,
}: {
  assetClass: AssetClass
  id: string
  /** L'onglet de la page qui rend cette rangée. */
  active: TabKey
}) {
  const t = usePhrase()

  const listRef = useRef<HTMLElement>(null)
  const linkRefs = useRef(new Map<string, HTMLAnchorElement>())
  /* La position HÉRITÉE de la rangée précédente — voir `dernierTrait`. Au tout
     premier rendu du site elle vaut `null`, et le trait se contente alors
     d'apparaître : il n'y a rien avant lui. */
  const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(
    dernierTrait,
  )

  const registerLink = useCallback((key: string, node: HTMLAnchorElement | null) => {
    if (node) linkRefs.current.set(key, node)
    else linkRefs.current.delete(key)
  }, [])

  /*
   * L'observateur de taille couvre les deux façons dont la mesure se périme sans que
   * l'onglet actif change : le redimensionnement de la fenêtre, et l'arrivée de la
   * police définitive qui redessine les libellés à une autre largeur.
   *
   * La comparaison avant `setIndicator` n'est pas une optimisation mais une
   * NÉCESSITÉ : l'objet est neuf à chaque mesure, et le poser tel quel relancerait
   * l'effet en boucle par l'observateur qu'il vient de déclencher.
   */
  useEffect(() => {
    const list = listRef.current
    if (!list) return

    function measure() {
      const link = linkRefs.current.get(active)
      if (!link) return
      const left = link.offsetLeft
      const width = link.offsetWidth
      /* La mémoire est écrite à CHAQUE mesure, pas seulement au changement d'onglet :
         un redimensionnement de fenêtre déplace le trait, et la rangée suivante doit
         partir de là où il est réellement. */
      dernierTrait = { left, width }
      setIndicator((previous) =>
        previous && previous.left === left && previous.width === width ? previous : { left, width },
      )
    }

    measure()

    /*
     * ⚠️ UNE SECONDE MESURE À L'IMAGE SUIVANTE, ET ELLE N'EST PAS DE LA PRUDENCE.
     *
     * Défaut observé au navigateur : après une bascule d'onglet, le trait restait à
     * la position héritée — 102 px de large sous « Aperçu » — alors que le lien actif
     * était bien « Valeurs historiques » (`aria-current="page"`, `offsetLeft` 102,
     * `offsetWidth` 181). Forcer l'observateur à la main corrigeait aussitôt la
     * position, ce qui désignait la mesure de montage comme trop précoce plutôt que
     * la mécanique comme fausse.
     *
     * La rangée est montée pendant que le reste de la page l'est encore ; la mesure
     * synchrone lit alors une géométrie qui n'est pas la définitive. `requestAnimationFrame`
     * repasse une fois la mise en page arrêtée.
     *
     * Les deux mesures sont conservées, pas seulement la seconde : la première donne
     * la bonne position dès le premier rendu dans le cas ordinaire, et la seconde ne
     * la corrige que lorsqu'elle était fausse — `setIndicator` compare avant d'écrire,
     * donc une mesure identique ne provoque aucun rendu.
     */
    const frame = requestAnimationFrame(measure)

    const observer = new ResizeObserver(measure)
    observer.observe(list)
    for (const link of linkRefs.current.values()) observer.observe(link)
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [active])

  /* ⚠️ L'HISTORIQUE ET LE HALVING RESTENT DÉCLARÉS POUR LA CRYPTO SEULE dans
     `i18n/pathnames.ts` : leurs littéraux de route n'existent pas pour les autres
     classes, et le typage de `Link` refuserait la compilation avant même l'exécution.
     C'est pourquoi ces deux-là s'ajoutent sous condition, quand les deux premiers
     onglets se composent, eux, par les tables de routes. */
  const crypto = assetClass === 'crypto'

  const tabs: { key: TabKey; label: string; icon: typeof LineChart; href: AppHref }[] = [
    {
      key: 'apercu' as const,
      /* « Aperçu » et « Valeurs historiques » SONT DÉJÀ DANS LA TABLE DE PHRASES, et
         c'est la raison de ce choix d'intitulés. La table est indexée par le texte
         français et `phrases.test.ts` exige que les douze locales portent exactement
         les mêmes clés : un mot inventé ici, ce sont douze traductions à écrire, ou
         un onglet qui sort en français sur les onze autres langues.

         « Halving » n'y est pas, et reste tel quel : c'est le terme employé sans
         traduction dans la plupart des langues, et c'est déjà celui qu'affiche le fil
         d'Ariane de la page elle-même. */
      label: t('Aperçu'),
      icon: LineChart,
      /* `assetHref` plutôt qu'un littéral : la fiche a six routes selon la classe, et
         la table qui les tient est déjà écrite. */
      href: assetHref(assetClass, id),
    },
    {
      key: 'metriques' as const,
      /* « Métriques » rejoint la table de phrases, comme « Aperçu » : un intitulé
         d'onglet se lit dans les treize langues, et `phrases.test.ts` exige les douze
         traductions avant de laisser passer la clé. */
      label: t('Métriques'),
      icon: Table2,
      href: metricsHref(assetClass, id),
    },
    ...(crypto
      ? [
          {
            key: 'historique' as const,
            label: t('Valeurs historiques'),
            icon: History,
            href: { pathname: '/crypto/[id]/historique' as const, params: { id } },
          },
        ]
      : []),
    /* Le halving est une règle du protocole du bitcoin, et la route le vérifie :
       `if (id !== 'bitcoin') notFound()`. L'onglet suit la même condition, sinon il
       promettrait une page qui répond 404. */
    ...(crypto && id === 'bitcoin'
      ? [
          {
            key: 'halving' as const,
            label: t('Halving'),
            icon: Scissors,
            href: { pathname: '/crypto/[id]/halving' as const, params: { id } },
          },
        ]
      : []),
  ]

  if (tabs.length < 2) return null

  return (
    /* ⚠️ LA RANGÉE DÉFILE PLUTÔT QUE DE SE REPLIER, ET C'EST UN DÉFAUT MESURÉ.
       À 375 px, « Valeurs historiques » passait sur deux lignes et « Halving »
       sortait du cadre : la rangée faisait deux hauteurs, et son filet du bas ne
       soulignait plus que la seconde.

       `overflow-x-auto` + `whitespace-nowrap` : la rangée garde UNE hauteur et se
       fait glisser au doigt. `scrollbar-none` retire la barre — le débordement se voit
       au troisième onglet tronqué, qui est l'indice habituel.

       ⚠️ AUCUNE MARGE NÉGATIVE ICI. Descendre la bande d'un pixel pour que le trait
       recouvre le filet ferait apparaître une barre de défilement VERTICALE sur toute
       la rangée : `overflow-x: auto` force l'autre axe à `auto` lui aussi. Le trait se
       pose donc SUR le filet ; à deux pixels contre un, l'œil ne fait pas la
       différence. Même relevé que dans `LinkTabs`.

       `relative` : c'est cette boîte qui sert de référent de position au trait, et
       c'est depuis elle que `offsetLeft` est compté. */
    <nav
      ref={listRef}
      aria-label={t('Aperçu')}
      className="scrollbar-none relative mb-4 flex items-center overflow-x-auto whitespace-nowrap border-b border-border-subtle"
    >
      {tabs.map(({ key, label, icon: Icon, href }) => {
        const selected = key === active
        return (
          <Link
            key={key}
            ref={(node) => {
              registerLink(key, node)
            }}
            href={href}
            aria-current={selected ? 'page' : undefined}
            /* `py-2 px-4` plutôt qu'une hauteur écrite : c'est le rembourrage de la
               référence (8/16), et il produit les 37 px de sa rangée sans que personne
               ait à tenir ce nombre à jour si le corps change.

               ⚠️ PLUS DE `border-b-2` ICI : le trait est unique et vit à la fin de la
               rangée. En laisser un par onglet le ferait clignoter d'un bout à l'autre
               au lieu de parcourir la distance. */
            className={`flex shrink-0 items-center gap-1.5 px-4 py-2 text-sm font-semibold leading-5 transition-colors duration-150 ${
              selected ? 'text-ink' : 'text-ink-muted hover:text-ink'
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            {label}
          </Link>
        )
      })}

      {/* Décoratif : `aria-current` dit déjà l'onglet actif au lecteur d'écran, et un
          second signal n'ajouterait qu'un bruit.

          ⚠️ `bg-brand-strong` ET NON `bg-brand`. L'azur de marque tient 1,52:1 sur le
          canvas clair — un écart assumé, consigné dans `palette.test.ts` — et il vaut
          pour les APLATS larges. Sur un trait de deux pixels, il faut la version qui
          passe AA, laquelle vaut exactement `brand` en thème sombre : une seule
          classe, correcte dans les deux thèmes. */}
      {indicator !== null ? (
        <span
          aria-hidden="true"
          className="tab-indicator bg-brand-strong!"
          style={{ width: indicator.width, transform: `translateX(${indicator.left}px)` }}
        />
      ) : null}
    </nav>
  )
}
