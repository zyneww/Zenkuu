'use client'

import { ArrowUp } from 'lucide-react'
import { useEffect, useState } from 'react'

import { IconButton } from '@/components/ui/IconButton'
import { usePhrase } from '@/components/locale/ContentProvider'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * LE RETOUR EN HAUT DE PAGE
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Posé une fois dans la mise en page, donc présent sur toutes les pages du site. Il
 * répond à un défaut que les pages de ce site ont toutes : les classements comptent
 * cent lignes, le centre d'aide douze articles, une fiche d'actif plusieurs milliers
 * de pixels — et l'en-tête, lui, est collant. Remonter à la main est le seul geste
 * long qui restait.
 *
 * ── LE DÉFILEMENT DOUX NE VIENT PAS D'ICI, ET IL NE DOIT PAS ────────────────
 *
 * ⚠️ `scrollTo({ top: 0 })` SANS `behavior`. La tentation est d'écrire
 * `behavior: 'smooth'` — c'est ce que fait la flèche de la barre d'identité des
 * fiches, et c'est une erreur qui est corrigée dans le même geste que ce fichier.
 *
 * Une valeur explicite ÉCRASE la propriété CSS `scroll-behavior`. Or `globals.css`
 * pose `scroll-behavior: smooth` sur `html` et la ramène à `auto` sous
 * `prefers-reduced-motion` : écrire `'smooth'` en JavaScript court-circuite cette
 * seconde règle, et le site se met à faire glisser la page chez quelqu'un qui a
 * demandé à son système de ne plus rien animer.
 *
 * `behavior` omis vaut `'auto'`, et `'auto'` signifie « suis la feuille de style » —
 * pas « saute ». Le réglage d'accessibilité est donc respecté sans qu'une ligne ne
 * s'en occupe ici, et il le restera si la règle CSS change.
 *
 * ── POURQUOI IL DISPARAÎT EN HAUT DE PAGE ───────────────────────────────────
 *
 * Un bouton qui ne commande rien reste un bouton : il occupe un coin de l'écran, se
 * met dans l'ordre de tabulation et se fait annoncer à la synthèse vocale, pour ne
 * rien faire. Le seuil est UNE HAUTEUR D'ÉCRAN et non une constante en pixels — sur
 * un téléphone, quatre cents pixels sont la moitié de la page ; sur un moniteur, une
 * portion négligeable. « J'ai dépassé un écran » veut dire la même chose partout.
 *
 * ── CACHÉ N'EST PAS DÉMONTÉ, ET IL FAUT LES TROIS ATTRIBUTS ─────────────────
 *
 * Le démonter supprimerait la transition de sortie. Il reste donc dans l'arbre, et
 * trois choses le neutralisent :
 *
 *   · `invisible` — le pointeur. Une opacité nulle laisse l'élément CLIQUABLE ; c'est
 *     le défaut déjà constaté sur la barre d'identité des fiches, où l'on cliquait un
 *     bouton qu'on ne voyait plus.
 *   · `inert` — le clavier et la synthèse vocale. Il sort de l'ordre de tabulation et
 *     cesse d'être annoncé.
 *   · `aria-hidden` — la redondance assumée, pour les agents qui ne connaissent pas
 *     encore `inert`.
 */

export function BackToTop() {
  const t = usePhrase()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    /*
     * Un écouteur de défilement PASSIF, et rien de plus savant.
     *
     * `IntersectionObserver` sur une sentinelle serait le réflexe « zéro écouteur »,
     * et coûterait un élément vide à poser dans la mise en page. Ce qui s'exécute ici
     * est une comparaison de deux nombres ; `passive: true` dit au navigateur qu'on
     * n'appellera jamais `preventDefault`, ce qui lui permet de continuer à faire
     * défiler sans attendre le retour de cette fonction — c'est ce qui coûte cher
     * dans un écouteur de défilement, pas le calcul.
     *
     * `setVisible` avec la même valeur ne redéclenche AUCUN rendu : React compare
     * avant de programmer quoi que ce soit. L'appel à chaque image est donc sans
     * effet tant que le seuil n'est pas franchi.
     */
    function onScroll() {
      setVisible(window.scrollY > window.innerHeight)
    }

    /* Lecture immédiate : on peut arriver sur la page DÉJÀ défilée — un lien avec
       ancre, un retour en arrière qui restaure la position, un rechargement. Sans cet
       appel, le bouton resterait absent jusqu'au premier mouvement. */
    onScroll()

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div
      className={`fixed bottom-6 right-6 z-40 transition-all duration-300 ${
        visible ? 'visible translate-y-0 opacity-100' : 'invisible translate-y-2 opacity-0'
      }`}
      inert={!visible}
      aria-hidden={!visible}
    >
      <IconButton
        size="icon-lg"
        /* `outline` et non `default` : en aplat de marque, il tire l'œil en
           permanence dans un coin où il n'y a rien à regarder. */
        variant="outline"
        icon={ArrowUp}
        label={t('Remonter en haut de la page')}
        side="left"
        /*
          ⚠️ LES `!` NE SONT PAS DE LA PARESSE, ILS CORRIGENT DEUX ÉCRASEMENTS RÉELS,
          l'un et l'autre relevés au navigateur sur ce bouton précis.

          1. LE FOND ÉTAIT TRANSPARENT À 30 %. La variante `outline` de shadcn/ui
             porte `dark:bg-input/30`. Un `bg-surface` nu ne le remplace pas :
             `tailwind-merge` ne fusionne que des classes de MÊME variante, et
             `dark:` en est une — les deux survivent, et la plus spécifique l'emporte
             en thème sombre. Le tableau défilait donc VISIBLEMENT derrière le bouton,
             ce qui est exactement la salissure qu'un fond opaque doit empêcher. Le
             survol a le même défaut (`dark:hover:bg-input/50`), d'où la troisième.

          2. L'OMBRE N'ÉTAIT PAS POSÉE DU TOUT. `shadow-overlay` existe bien comme
             utilitaire — `--shadow-overlay` est déclarée dans `@theme` — mais
             `tailwind-merge` ne connaît pas ce nom et le classe en couleur d'ombre
             plutôt qu'en taille : il garde donc aussi le `shadow-xs` de la variante,
             qui gagne. Écrite en valeur arbitraire, la déclaration est reconnue pour
             ce qu'elle est et remplace la précédente. Le jeton reste lu, pas recopié :
             il change avec le thème.
        */
        className="rounded-pill bg-surface! hover:bg-surface-muted! shadow-[var(--shadow-overlay)]"
        onClick={() => {
          window.scrollTo({ top: 0 })

          /*
           * ⚠️ LE FOCUS DOIT SUIVRE, SINON IL EST PERDU.
           *
           * Le bouton se cache dès que le seuil est repassé — c'est-à-dire une
           * fraction de seconde après le clic. Un utilisateur au clavier avait donc
           * le focus sur un élément devenu `inert`, et le navigateur le renvoie alors
           * au `body` : la tabulation suivante repart du tout début du document, ce
           * qui est exactement ce que ce bouton prétendait éviter.
           *
           * `preventScroll` est OBLIGATOIRE. Donner le focus fait défiler l'élément
           * dans le champ de vision par défaut — instantanément, et donc en annulant
           * le défilement doux qu'on vient de lancer une ligne plus haut.
           *
           * `#contenu` est la cible du lien d'évitement, qui porte `tabIndex={-1}`
           * dans la mise en page pour cette raison même.
           */
          document.getElementById('contenu')?.focus({ preventScroll: true })
        }}
      />
    </div>
  )
}
