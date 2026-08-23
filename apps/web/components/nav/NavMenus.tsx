'use client'

import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@/components/ui/navigation-menu'
import { useState } from 'react'

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
 * Largeur d'une colonne de section, en pixels.
 *
 * Le panneau se dimensionne sur le NOMBRE DE SECTIONS du menu, pas sur une largeur
 * fixe : « Actualités » n'en porte qu'une, « Données » trois. Une largeur unique
 * laisserait le premier à moitié vide ou serrerait le second sur trois lignes par
 * entrée. C'est aussi ce qui donne au déplacement son geste — le panneau change de
 * taille en même temps que de place.
 */
const COLUMN_WIDTH = 264
const PANEL_PADDING = 20

function panelWidthFor(menu: NavMenu): number {
  const columns = Math.max(1, Math.min(menu.sections.length, 3))
  return columns * COLUMN_WIDTH + PANEL_PADDING * 2
}

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
      style={
        {
          '--radix-navigation-menu-viewport-width': `${panelWidthFor(
            menus.find((menu) => menu.label === value) ?? menus[0]!,
          )}px`,
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
                style={{ width: panelWidthFor(menu) }}
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
 * Les sections du menu, EN COLONNES et non empilées.
 *
 * L'ancien panneau les empilait, séparées par des filets : « Données » et ses trois
 * sections faisaient alors une colonne de dix entrées, plus haute que la moitié de
 * l'écran. En colonnes, le même menu tient sur quatre lignes — et chaque section
 * devient une cible visuelle plutôt qu'un intertitre qu'on traverse.
 */
function MenuColumns({ menu }: { menu: NavMenu }) {
  const fr = useContent()
  const t = usePhrase()

  return (
    <div
      className="grid gap-1"
      style={{ gridTemplateColumns: `repeat(${Math.max(1, Math.min(menu.sections.length, 3))}, minmax(0, 1fr))` }}
    >
      {menu.sections.map((section, index) => (
        <div key={section.label ?? index} className="min-w-0">
          {section.label ? (
            <p className="px-3 pb-1 pt-1.5 text-micro font-semibold uppercase tracking-wide text-ink-muted/70">
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
                      className="group flex items-start gap-2.5 rounded-lg px-3 py-2 transition-colors duration-150 hover:bg-surface-muted"
                    >
                      <Icon
                        className="mt-0.5 h-4 w-4 shrink-0 text-ink-muted transition-colors duration-150 group-hover:text-brand-strong"
                        aria-hidden="true"
                      />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-ink">{t(item.label)}</span>
                        <span className="block text-xs leading-snug text-ink-muted">
                          {t(item.description)}
                        </span>
                      </span>
                    </Link>
                  ) : (
                    /* Entrée non construite : un <span> et non un lien désactivé, pour
                       qu'aucun clic ni aucune tabulation ne mène nulle part. */
                    <span className="flex cursor-default items-start gap-2.5 rounded-lg px-3 py-2 opacity-55">
                      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-ink-muted" aria-hidden="true" />
                      <span className="min-w-0">
                        <span className="flex items-center gap-2">
                          <span className="text-sm font-medium text-ink">{t(item.label)}</span>
                          <Badge variant="secondary" className="rounded-full px-2 py-0 text-[0.625rem] font-medium">
                            {fr.nav.soonShort}
                          </Badge>
                        </span>
                        <span className="block text-xs leading-snug text-ink-muted">
                          {t(item.description)}
                        </span>
                      </span>
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
