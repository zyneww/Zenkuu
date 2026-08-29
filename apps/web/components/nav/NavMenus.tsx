'use client'

import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@/components/ui/navigation-menu'
import { useLayoutEffect, useRef, useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { useContent, usePhrase } from '@/components/locale/ContentProvider'
import { Link, usePathname } from '@/i18n/navigation'
import type { NavMenu } from '@/content/navigation'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * LA BARRE DE MENUS — UN SEUL PANNEAU, QUI SE DÉPLACE
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── CE QUI A ÉTÉ REFAIT, ET POURQUOI CE N'ÉTAIT PAS UN RÉGLAGE ──────────────
 *
 * Chaque menu portait SON panneau, monté et démonté par `usePresence`. Le montage
 * conditionnel était la cause d'un défaut qu'aucun ajustement de durée ne corrigeait :
 * passer d'un menu au suivant DÉTRUISAIT le premier panneau et en CONSTRUISAIT un
 * second. Le lecteur voyait donc une disparition suivie d'une apparition — deux gestes
 * là où l'œil en attend un — avec, entre les deux, une image où plus rien n'est ouvert.
 *
 * Relevé sur OKX (référence demandée) : il n'y a qu'UN panneau. Il ne se ferme pas
 * quand on glisse d'un menu à l'autre, il se DÉPLACE et se redimensionne, contenu
 * remplacé sur place. C'est ce qui donne l'impression de fluidité, et c'est structurel :
 * aucun réglage d'animation ne peut produire ce geste à partir de N panneaux
 * indépendants.
 *
 * D'où ce composant, qui tient la barre ENTIÈRE plutôt qu'un menu :
 *
 *   · un état `open` unique — le libellé du menu ouvert, ou `null` ;
 *   · une géométrie mesurée (`left`, `width`) issue du bouton survolé ;
 *   · un panneau unique, toujours dans l'arbre, dont l'ouverture et le déplacement
 *     sont deux transitions DISTINCTES.
 *
 * ── LES DEUX TRANSITIONS NE SE MÉLANGENT PAS ───────────────────────────────
 *
 * `left` et `width` ne s'animent QUE si un panneau était déjà ouvert (`shifting`).
 * Sans ce partage, l'ouverture ferait glisser le panneau depuis la position du
 * précédent — un panneau qui traverse la barre alors qu'on vient d'entrer dedans.
 * L'opacité et le déplacement vertical, eux, ne jouent qu'à l'ouverture et à la
 * fermeture. Relevés sur la référence : 0,3 s en `cubic-bezier(.645,.045,.355,1)`.
 *
 * ── LE PANNEAU RESTE MONTÉ, MASQUÉ PAR `visibility` ────────────────────────
 *
 * `opacity: 0` seul laisserait ses liens cliquables et tabulables au-dessus de la
 * page. `visibility: hidden` les retire des deux, et — contrairement à `display:
 * none` — se laisse animer : la transition de sortie se joue en entier, puis la
 * visibilité bascule au bout du délai. C'est ce que fait la référence.
 */

/*
 * ── LES DEUX TEMPORISATIONS SONT PASSÉES AU COMPOSANT ────────────────────────
 *
 * Elles vivaient ici en constantes : ouverture immédiate au survol, fermeture
 * différée de 140 ms. La seconde n'était pas décorative — entre un bouton et le
 * panneau qu'il ouvre il y a quelques pixels de vide, et sans délai le curseur qui
 * les traverse referme le menu sous le doigt. C'est le défaut le plus courant des
 * menus au survol, et le plus irritant.
 *
 * `NavigationMenu` les prend en `delayDuration` et `skipDelayDuration`, avec les
 * mêmes valeurs. Voir le rendu plus bas.
 */

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * LE PANNEAU EST UNE COLONNE UNIQUE, ET SA LARGEUR NE DÉPEND PLUS DU MENU
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── CE QUE CELA REMPLACE ────────────────────────────────────────────────────
 *
 * Les sections étaient posées CÔTE À CÔTE, une colonne chacune, et la largeur du
 * panneau se calculait sur leur nombre : 276 px pour « Actualités » qui n'en a
 * qu'une, 832 px pour « Données » qui en a trois. Le panneau changeait donc de
 * taille en même temps que de place, d'un menu à l'autre.
 *
 * ── POURQUOI UNE SEULE COLONNE (demande explicite, réf. CoinGecko) ──────────
 *
 * C'est la forme de la référence, et elle a une propriété que la grille n'avait
 * pas : l'œil descend UNE liste. Sur trois colonnes, il faut choisir une colonne
 * avant de lire, c'est-à-dire décider où chercher avant de savoir ce qu'il y a —
 * et les titres de section, qui devraient guider ce choix, sont justement ce
 * qu'on lit en dernier.
 *
 * Empilée, la même quinzaine d'entrées se parcourt d'un seul mouvement, et les
 * titres redeviennent ce qu'ils sont : des repères DANS la descente, pas des
 * en-têtes de colonnes à arbitrer.
 *
 * ⚠️ LA LARGEUR EST DÉSORMAIS CONSTANTE, et c'est ce qui rend le déplacement du
 * panneau lisible : il glisse d'un bouton à l'autre sans changer de taille. La
 * valeur loge le plus long libellé du site — « Nouvelles cryptomonnaies »,
 * environ 200 px à cette graisse — plus l'icône et les marges.
 */
const PANEL_WIDTH = 268
const PANEL_PADDING = 8

/* ⚠️ UNE CONSTANTE, ET PLUS UNE FONCTION DE `menu`. `panelWidthFor(menu)` calculait
   la largeur sur le nombre de sections ; celui-ci ne compte plus, puisqu'elles sont
   empilées. Garder la fonction pour ignorer son argument aurait laissé croire que la
   largeur dépend encore du menu. */
const PANEL_TOTAL_WIDTH = PANEL_WIDTH + PANEL_PADDING * 2

export function NavMenus({ menus }: { menus: NavMenu[] }) {
  const t = usePhrase()

  /*
   * ── LE PANNEAU NE SURVIT PAS À LA NAVIGATION QU'IL A PROVOQUÉE ────────────
   *
   * Radix referme au clic sur un `NavigationMenuLink`, mais pas sur une navigation
   * déclenchée autrement — un raccourci, un retour arrière. L'ajustement se fait
   * PENDANT le rendu et non dans un effet : un effet peindrait d'abord le panneau
   * ouvert par-dessus la page d'arrivée, puis le corrigerait à l'image suivante.
   * React interrompt au contraire ce rendu-ci et le relance sans rien peindre entre
   * les deux.
   */
  const pathname = usePathname()
  const [value, setValue] = useState('')
  const [lastPath, setLastPath] = useState(pathname)
  if (lastPath !== pathname) {
    setLastPath(pathname)
    if (value !== '') setValue('')
  }

  /*
   * ── LE PANNEAU SE CENTRE SOUS SON PROPRE BOUTON ─────────────────────────────
   *
   * Il était centré sur la BARRE entière (`left-1/2` dans `NavigationMenuViewport`).
   * Conséquence relevée à l'écran : « Actualités », quatrième bouton de la rangée,
   * ouvrait son panneau sous « Parcourir » — à deux cents pixels de ce qu'on venait
   * de survoler. Le lien entre le bouton et ce qu'il ouvre disparaissait.
   *
   * On publie donc le centre du bouton OUVERT, en pixels et relatif à la barre, dans
   * `--nav-viewport-center` ; le viewport s'y accroche (`left: var(...)`, avec 50 %
   * pour seul repli). Le bouton est retrouvé par son `data-state="open"` plutôt que
   * par une collection de `ref` : Radix le pose déjà, et c'est la seule source qui
   * dise lequel est ouvert au moment où l'on mesure.
   *
   * ⚠️ LA VALEUR EST BORNÉE À LA FENÊTRE. Un panneau de trois colonnes fait 832 px :
   * centré sous un bouton proche d'un bord, il sortirait de l'écran. Les bornes
   * laissent une gouttière de 16 px de chaque côté — le panneau glisse alors le long
   * du bord au lieu de déborder.
   */
  const rootRef = useRef<HTMLDivElement>(null)
  const [center, setCenter] = useState<number | null>(null)

  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root || value === '') return

    const trigger = root.querySelector<HTMLElement>(
      '[data-slot="navigation-menu-trigger"][data-state="open"]',
    )
    const menu = menus.find((entry) => entry.label === value)
    if (!trigger || !menu) return

    const rootLeft = root.getBoundingClientRect().left
    const triggerRect = trigger.getBoundingClientRect()
    const half = PANEL_TOTAL_WIDTH / 2
    const GUTTER = 16

    const desired = triggerRect.left + triggerRect.width / 2 - rootLeft
    const min = GUTTER + half - rootLeft
    const max = window.innerWidth - GUTTER - half - rootLeft

    setCenter(max < min ? (min + max) / 2 : Math.min(Math.max(desired, min), max))
  }, [value, menus])

  return (
    /*
      ══════════════════════════════════════════════════════════════════════════
      LA BARRE EST UN `NavigationMenu`, ET SON PANNEAU EST UN « VIEWPORT »
      ══════════════════════════════════════════════════════════════════════════

      ── CE QUE CE FICHIER FAISAIT À LA MAIN ────────────────────────────────────

      Cent cinquante lignes de mesure : la position et la largeur du panneau relevées
      sur le bouton survolé, bornées à la fenêtre, réécrites au redimensionnement par
      un `useLayoutEffect`, plus deux temporisations d'ouverture et de fermeture, un
      écouteur de clic extérieur et un écouteur d'Échap.

      Toutes servaient UNE intention, relevée sur la référence et qui reste la bonne :
      il n'y a qu'UN panneau, et il se DÉPLACE d'un menu à l'autre au lieu de
      disparaître puis de réapparaître. Radix appelle cela un VIEWPORT, et c'est
      exactement le même geste — il publie la position et la taille du menu courant
      dans `--radix-navigation-menu-viewport-width` / `-height`, et le conteneur les
      anime.

      ── CE QU'IL APPORTE QUE LA VERSION MESURÉE N'AVAIT PAS ────────────────────

        · LE CLAVIER COMPLET. Les flèches gauche/droite passent d'un menu à l'autre,
          bas entre dans le panneau, Échap sort. La version maison ouvrait au focus et
          laissait la tabulation traverser le panneau dans l'ordre du DOM.
        · `aria-controls` ET `aria-expanded` RELIÉS, avec un panneau annoncé comme
          la région du menu qui l'ouvre.
        · LA FERMETURE AU CLIC SUR UN LIEN, sans que chaque entrée ait à la câbler.

      ── CE QUI EST CONSERVÉ DE L'ANCIEN RÉGLAGE ────────────────────────────────

      `delayDuration={0}` : l'ouverture au survol est immédiate, comme la référence.
      `skipDelayDuration` couvre les quelques pixels de vide entre un bouton et son
      panneau — c'est ce que faisait `CLOSE_DELAY_MS`, et c'est le défaut le plus
      irritant des menus au survol quand il manque.

      La LARGEUR reste dictée par le nombre de sections (voir `panelWidthFor`) : elle
      est posée sur le contenu, et le viewport s'y ajuste au lieu d'être mesuré.
    */
    <NavigationMenu
      value={value}
      onValueChange={setValue}
      delayDuration={0}
      skipDelayDuration={140}
      /*
        ⚠️ LA LARGEUR EST IMPOSÉE AU VIEWPORT, ET NON MESURÉE SUR LE CONTENU.

        Radix publie `--radix-navigation-menu-viewport-width` en mesurant le panneau
        actif, et le viewport de shadcn/ui s'y accroche. La mesure est prise sur un
        contenu rendu HORS ÉCRAN, avant que le style en ligne posé plus bas n'ait le
        moindre effet observable : relevé au navigateur, les quatre menus héritaient
        tous de 832 px — la largeur du premier mesuré — et « Actualités », qui ne
        porte qu'une section, s'ouvrait sur deux colonnes de vide.

        On écrase donc la variable depuis la racine, à partir du menu OUVERT. La
        largeur redevient une fonction du nombre de sections (voir `panelWidthFor`),
        et le viewport l'anime comme n'importe quel changement de taille — ce qui
        rend au panneau son redimensionnement en même temps que son déplacement.
      */
      ref={rootRef}
      style={
        {
          '--radix-navigation-menu-viewport-width': `${PANEL_TOTAL_WIDTH}px`,
          /* Voir la note sur `center` plus haut : le centre du bouton ouvert, en
             pixels relatifs à la barre. `50%` tant qu'aucun menu n'a été ouvert. */
          '--nav-viewport-center': center === null ? '50%' : `${center}px`,
        } as React.CSSProperties
      }
      className="hidden shrink-0 xl:flex"
    >
      <NavigationMenuList className="gap-0.5">
        {menus.map((menu) =>
          /*
           * ── UN MENU SANS PANNEAU EST UN LIEN ─────────────────────────────
           *
           * Un `<Link>` et non un déclencheur : le clic milieu, l'ouverture dans un
           * onglet, l'aperçu de la destination au survol et le pré-chargement de Next
           * viennent alors gratuitement. Et aucun `aria-haspopup` — l'annoncer sur un
           * élément qui n'ouvre rien ferait attendre à un lecteur d'écran un panneau
           * qui ne viendra jamais.
           */
          menu.href && menu.sections.length === 0 ? (
            <NavigationMenuItem key={menu.label}>
              <NavigationMenuLink asChild className="px-3 py-2 text-sm font-medium text-ink-muted hover:text-ink">
                <Link href={menu.href}>{t(menu.label)}</Link>
              </NavigationMenuLink>
            </NavigationMenuItem>
          ) : (
            <NavigationMenuItem key={menu.label} value={menu.label}>
              <NavigationMenuTrigger className="bg-transparent px-3 py-2 text-sm font-medium text-ink-muted hover:bg-transparent hover:text-ink focus:bg-transparent data-[state=open]:bg-transparent data-[state=open]:text-ink">
                {t(menu.label)}
              </NavigationMenuTrigger>

              {/* La largeur du PANNEAU vient du viewport (voir la note à la racine) ;
                  celle du contenu suit, pour que les colonnes remplissent le cadre. */}
              {/*
                ⚠️ LA LARGEUR EST EN PIXELS, ET NE DOIT JAMAIS ÊTRE RELATIVE.

                Une version de ce fichier écrivait `w-full` ici, en pensant que le
                contenu remplirait le viewport. Elle produisait une BOUCLE observable
                à l'œil : le viewport se dimensionne sur le contenu, le contenu se
                dimensionnait sur le viewport, et le panneau rétrécissait à chaque
                image jusqu'à disparaître sous le curseur.

                La largeur vient donc de `panelWidthFor`, en pixels, indépendante du
                conteneur. La variable posée sur la racine (voir plus haut) donne la
                MÊME valeur au viewport : les deux s'accordent sans se mesurer l'un
                l'autre.
              */}
              <NavigationMenuContent
                style={{ width: PANEL_TOTAL_WIDTH }}
                className="p-2"
              >
                <MenuColumns menu={menu} />
              </NavigationMenuContent>
            </NavigationMenuItem>
          ),
        )}
      </NavigationMenuList>
    </NavigationMenu>
  )
}

/**
 * Les sections du menu, EMPILÉES en une colonne unique.
 *
 * ── C'EST LA FORME DE COINGECKO, ET ELLE REMPLACE LA GRILLE ─────────────────
 *
 * Les sections étaient posées côte à côte, une colonne chacune. L'argument
 * d'alors — « en colonnes, le menu tient sur quatre lignes au lieu de dix » —
 * était vrai et visait la mauvaise grandeur : ce qui coûte dans un menu n'est pas
 * sa hauteur, c'est le nombre de décisions avant de lire. Sur trois colonnes il
 * faut choisir une colonne d'abord ; empilé, on descend.
 *
 * ── LE TITRE DE SECTION CHANGE DE RÔLE AVEC LA COLONNE ──────────────────────
 *
 * Il portait un filet SOUS lui, qui donnait aux trois colonnes un bord commun.
 * Cette raison tombe avec les colonnes. Le filet passe donc AU-DESSUS du titre,
 * où il fait ce que fait la référence : séparer deux groupes dans une même
 * descente. La première section n'en porte pas — un trait en haut du panneau ne
 * sépare rien de ce qui le précède.
 */
function MenuColumns({ menu }: { menu: NavMenu }) {
  const fr = useContent()
  const t = usePhrase()

  return (
    <div className="flex flex-col">
      {menu.sections.map((section, index) => (
        <div key={section.label ?? index} className="min-w-0">
          {section.label ? (
            <p
              className={`px-3 pb-1.5 text-micro font-semibold uppercase tracking-wide text-ink-muted/70 ${
                /* Filet et respiration au-dessus, SAUF pour la première : voir
                   l'en-tête. `mt-1.5` sans filet garde le premier titre à la même
                   distance du bord du panneau que les suivants de leur trait. */
                index === 0 ? 'pt-1.5' : 'mt-1.5 border-t border-border-subtle pt-3'
              }`}
            >
              {t(section.label)}
            </p>
          ) : null}

          <ul>
            {section.items.map((item) => {
              const Icon = item.icon

              return (
                <li key={`${section.label ?? ''}-${item.label}`}>
                  {item.ready && item.href ? (
                    <Link
                      href={item.href}
                      /*
                       * LA DESCRIPTION PASSE EN INFOBULLE NATIVE.
                       *
                       * Elle occupait une seconde ligne sous chaque libellé. Deux
                       * conséquences, visibles sur le menu « Données » : les entrées
                       * d'une colonne ne tombaient plus en face de celles d'à côté —
                       * la hauteur d'une entrée dépendait de la longueur de sa
                       * phrase — et le panneau faisait deux fois la hauteur de la
                       * référence pour le même nombre de destinations.
                       *
                       * `title` la rend sans rien coûter à la mise en page : elle
                       * reste disponible pour qui hésite, et n'encombre plus celui
                       * qui sait déjà où il va.
                       */
                      title={t(item.description)}
                      className="group flex items-center gap-2.5 rounded-lg px-3 py-2 transition-colors duration-150 hover:bg-surface-muted"
                    >
                      <Icon
                        className="h-4 w-4 shrink-0 text-ink-muted transition-colors duration-150 group-hover:text-brand-strong"
                        aria-hidden="true"
                      />
                      <span className="truncate text-sm font-medium text-ink">{t(item.label)}</span>
                    </Link>
                  ) : (
                    /* Entrée non construite : un <span> et non un lien désactivé, pour
                       qu'aucun clic ni aucune tabulation ne mène nulle part. */
                    <span
                      title={t(item.description)}
                      className="flex cursor-default items-center gap-2.5 rounded-lg px-3 py-2 opacity-55"
                    >
                      <Icon className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden="true" />
                      <span className="truncate text-sm font-medium text-ink">{t(item.label)}</span>
                      <Badge
                        variant="secondary"
                        className="ml-auto shrink-0 rounded-full px-2 py-0 text-micro font-medium"
                      >
                        {fr.nav.soonShort}
                      </Badge>
                    </span>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </div>
  )
}
