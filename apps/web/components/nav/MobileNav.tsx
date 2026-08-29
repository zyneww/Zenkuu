'use client'

import { Menu, X } from 'lucide-react'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer'
import {
} from '@/components/ui/accordion'
import { useId, useState } from 'react'

import { Disclosure, DisclosureGroup } from '@heroui/react'

import { Badge } from '@/components/ui/badge'
import { IconButton } from '@/components/ui/IconButton'
import { Link, usePathname } from '@/i18n/navigation'
import { NAV_MENUS } from '@/content/navigation'
import { useContent, usePhrase } from '@/components/locale/ContentProvider'

/**
 * Navigation mobile — le tiroir qui remplace une barre de menus impossible.
 *
 * ── CE QU'IL COMBLE ──────────────────────────────────────────────────────────
 *
 * La barre de navigation était masquée sous `lg` par un `hidden lg:flex`, et RIEN ne
 * la remplaçait. Sur un téléphone, l'en-tête ne portait donc que le logo, la loupe et
 * l'engrenage : les cinq menus et leurs trente entrées étaient purement inatteignables.
 * Mesuré au navigateur, pas déduit — voir la capture d'audit.
 *
 * ── POURQUOI UN TIROIR ET NON UNE BARRE D'ONGLETS EN BAS ─────────────────────
 *
 * Une barre basse porte quatre ou cinq destinations. Nous en avons trente, réparties
 * en cinq familles qui ne se réduisent pas : « Classements », « Activité du marché »
 * et « Graphiques globaux » répondent à trois questions différentes, et en promouvoir
 * une reviendrait à cacher les deux autres derrière un « Plus » — c'est-à-dire à
 * recréer le tiroir, en moins lisible et en amputant l'écran de 56 pixels en
 * permanence.
 *
 * ── LES ACCORDÉONS S'OUVRENT SEULS, ET C'EST DÉLIBÉRÉ ────────────────────────
 *
 * Un seul panneau ouvert à la fois — le motif « accordéon » strict — obligerait à
 * refermer avant de comparer deux familles, et sur un écran qui défile de toute façon,
 * cette économie de place ne rachète pas le geste supplémentaire. Plusieurs sections
 * peuvent donc rester dépliées.
 *
 * La section correspondant à la page COURANTE s'ouvre d'emblée : on arrive dans le
 * menu en sachant où l'on est, ce qu'un tiroir entièrement replié ne dit pas.
 */
export function MobileNav() {
  const fr = useContent()
  const t = usePhrase()
  const pathname = usePathname()
  const panelId = useId()

  const [open, setOpen] = useState(false)

  /*
   * SECTIONS DÉPLIÉES, amorcées sur la page courante.
   *
   * L'amorce est calculée dans l'initialiseur de `useState` et non dans un effet :
   * un effet ouvrirait la section APRÈS un premier rendu tout replié, et le tiroir
   * paraîtrait se déplier tout seul sous les yeux du lecteur.
   */
  const [expanded, setExpanded] = useState<string[]>(() => {
    const active = NAV_MENUS.find((menu) =>
      menu.sections.some((section) =>
        section.items.some((item) => item.href && pathname.startsWith(item.href)),
      ),
    )
    return active ? [active.label] : []
  })

  /*
   * LE TIROIR NE SURVIT PAS À LA NAVIGATION QU'IL A PROVOQUÉE.
   *
   * Même raisonnement que pour les menus de bureau, et même motif : l'ajustement se
   * fait PENDANT le rendu plutôt que dans un effet, faute de quoi React peindrait
   * d'abord le tiroir ouvert par-dessus la page d'arrivée.
   *
   * Poser la fermeture ici plutôt que sur le `onClick` de chaque lien la rend
   * insensible à l'ajout d'une entrée d'un genre nouveau — un lien externe, une
   * destination pas encore construite.
   */
  const [previousPath, setPreviousPath] = useState(pathname)
  if (previousPath !== pathname) {
    setPreviousPath(pathname)
    setOpen(false)
  }

  return (
    /*
      ══════════════════════════════════════════════════════════════════════════
      LE TIROIR EST UN `Drawer`, ET IL S'OUVRE PAR LE BAS
      ══════════════════════════════════════════════════════════════════════════

      ── CE QUE CE FICHIER FAISAIT LUI-MÊME, ET QUI PART ────────────────────────

      Un `createPortal` vers `document.body`, un état de présence pour animer
      l'entrée et la sortie, un verrou de défilement sur `<html>`, un écouteur d'Échap,
      un voile cliquable. Cinq mécaniques, toutes correctes, toutes fournies par
      `vaul` — sur quoi `Drawer` est bâti.

      ⚠️ LA RAISON DU PORTAIL RESTE VRAIE, et il faut la connaître avant de retirer
      quoi que ce soit : rendu à sa place dans l'arbre, ce panneau tombait à une
      hauteur de ZÉRO pixel — mesuré au navigateur, pas supposé. L'en-tête porte
      `backdrop-blur`, et une propriété de filtre d'arrière-plan crée un BLOC
      CONTENEUR pour tous ses descendants en position fixe : `top-16 bottom-0` se
      résolvait à l'intérieur des soixante-quatre pixels de la barre. Le même piège
      attend `transform`, `filter`, `perspective` et `contain`. `DrawerPortal` porte
      le panneau vers `body` exactement pour cette raison — la contrainte n'a pas
      disparu, elle a changé de propriétaire.

      ── CE QUE `vaul` APPORTE EN PLUS ─────────────────────────────────────────

      LE GLISSER POUR FERMER. C'est le geste que tout tiroir mobile propose, et le
      seul que celui-ci n'avait pas : on ne pouvait le refermer qu'en visant la croix
      ou le voile, deux cibles précises sur un écran qu'on tient d'une main. Le
      panneau suit maintenant le doigt et se referme s'il descend assez bas.

      Le VOILE COUVRE TOUT, en-tête compris. Il ne le pouvait pas tant que la croix
      était la seule sortie évidente ; elle ne l'est plus, entre le glisser, le voile
      lui-même et Échap.

      ── IL ENTRE PAR LA GAUCHE, ET C'EST UNE CORRECTION ───────────────────────

      Il entrait par le BAS, au motif qu'un pouce atteint plus facilement la moitié
      basse d'un téléphone. L'argument vaut sur un téléphone, et ce panneau n'y est pas
      seul : il apparaît sous `xl`, c'est-à-dire aussi sur une fenêtre de bureau qu'on a
      simplement rétrécie — un écran large et court.

      Là, un tiroir venant du bas est franchement mauvais. Il occupe toute la largeur
      pour une liste de cinq entrées, il pousse le contenu hors de vue sur une hauteur
      déjà réduite, et sa poignée de glissement promet un geste tactile à quelqu'un qui
      tient une souris. Le panneau montait à mi-écran, vide aux trois quarts.

      Un tiroir LATÉRAL n'a aucun de ces défauts : il prend une largeur fixe, garde sa
      hauteur quelle que soit celle de la fenêtre, et part du côté où se trouve le
      bouton qui l'ouvre — en haut à gauche. C'est le tiroir de navigation classique,
      et c'est ce que le geste attend des deux côtés, doigt comme souris. Le glisser
      pour fermer reste : `vaul` le fait horizontalement aussi bien que verticalement.
    */
    <Drawer open={open} onOpenChange={setOpen} direction="left">
      <DrawerTrigger asChild>
        {/* `IconButton` en `ghost` — pas de bordure, juste le carré de survol.
            `tooltip={false}` : la cible est tactile, et une bulle au survol n'existe
            pas au doigt ; l'étiquette porte donc seule le libellé, qui change avec
            l'état. */}
        <IconButton
          variant="ghost"
          label={open ? 'Fermer la navigation' : 'Ouvrir la navigation'}
          tooltip={false}
          icon={open ? X : Menu}
          /* `p-2.5` : le composant dessine un carré de 32 px, sous le seuil des 40 que
             cette cible-ci visait — c'est le premier contrôle de la barre sur
             téléphone, et le manquer ouvre une page au hasard. `-ml-2` ramène le
             GLYPHE à l'alignement du logo : c'est le dessin qu'on aligne, pas la zone
             tactile. */
          className="-ml-2 shrink-0 p-2.5 text-ink xl:hidden"
        />
      </DrawerTrigger>

      {/* `w-[20rem] max-w-[85vw]` : une largeur FIXE, parce qu'une liste de navigation
          a une largeur de lecture — et un plafond en pourcentage pour qu'il reste un
          bout de page visible derrière sur les écrans les plus étroits, ce qui est ce
          qui rend le voile compréhensible. */}
      <DrawerContent
        id={panelId}
        className="h-full w-[20rem] max-w-[85vw] bg-canvas xl:hidden"
      >
        {/* Radix exige un titre : sans lui, la fenêtre reste anonyme à l'oreille et
            l'avertissement tombe en console. Il est masqué à l'œil — le contenu
            s'annonce déjà de lui-même, et un titre « Navigation » au-dessus d'une
            navigation est du bruit. */}
        <DrawerHeader className="sr-only">
          <DrawerTitle>Navigation principale</DrawerTitle>
        </DrawerHeader>

        <div className="flex min-h-0 flex-col overflow-y-auto overscroll-contain">
            <nav aria-label="Navigation principale" className="safe-x flex-1 py-2">
              {/*
                ── LES SECTIONS REPLIABLES PASSENT SUR `Accordion` ─────────────

                C'étaient des `<button aria-expanded>` suivis d'une liste rendue ou
                non. Correct, et incomplet sur trois points que Radix apporte :

                  · L'OUVERTURE EST ANIMÉE. Une section apparaissait d'un coup, ce qui
                    fait sauter la position de tout ce qui la suit — sur un tiroir
                    qu'on parcourt au pouce, le lien qu'on visait a bougé avant qu'on
                    l'atteigne. `AccordionContent` mesure sa hauteur et la déroule.
                  · LE PANNEAU EST RELIÉ À SON DÉCLENCHEUR par `aria-controls` et un
                    `region` nommé : une synthèse vocale annonce « développé, groupe
                    Données » au lieu d'un bouton et d'une liste sans rapport.
                  · LES FLÈCHES HAUT/BAS naviguent d'un en-tête de section à l'autre.

                `type="multiple"` : plusieurs sections ouvertes à la fois, ce que le
                tableau `expanded` permettait déjà. La forme contrôlée est conservée
                pour garder l'amorce sur la page courante (voir `useState` plus haut).
              */}
              {/*
                ⚠️ `DisclosureGroup` DE HEROUI, ET LE VOCABULAIRE A CHANGÉ.

                Radix parlait de `type="multiple"` et d'un TABLEAU de valeurs ouvertes ;
                HeroUI parle de `allowsMultipleExpanded` et d'un `Set` de clés. La
                conversion se fait ici plutôt que dans l'état du composant : celui-ci
                reste un tableau, forme plus simple à lire et à comparer, et c'est la
                frontière du composant qui traduit.
              */}
              <DisclosureGroup
                allowsMultipleExpanded
                expandedKeys={new Set(expanded)}
                onExpandedChange={(keys) => setExpanded([...keys].map(String))}
                className="divide-y divide-border-subtle"
              >
                {NAV_MENUS.map((menu) => {
                  /* Un menu sans panneau est un LIEN, ici comme sur le bureau : lui
                     donner un chevron qui ne déplie rien serait une promesse vide. */
                  if (menu.href && menu.sections.length === 0) {
                    return (
                      <div key={menu.label}>
                        <Link
                          href={menu.href}
                          className="flex min-h-[3.25rem] items-center text-base font-semibold text-ink"
                        >
                          {t(menu.label)}
                        </Link>
                      </div>
                    )
                  }

                  return (
                    <Disclosure key={menu.label} id={menu.label} className="border-b-0">
                      {/* `Disclosure.Heading` porte le niveau de titre, `Trigger` le
                          bouton, `Indicator` le chevron qui pivote. Les trois étaient
                          fondus dans `AccordionTrigger` chez Radix. */}
                      <Disclosure.Heading>
                        <Disclosure.Trigger className="flex min-h-[3.25rem] w-full items-center justify-between py-0 text-base font-semibold text-ink hover:no-underline">
                          {t(menu.label)}
                          <Disclosure.Indicator />
                        </Disclosure.Trigger>
                      </Disclosure.Heading>

                      <Disclosure.Content className="pb-0">
                        <ul className="pb-2">
                          {menu.sections.flatMap((section, sectionIndex) => [
                            section.label ? (
                              <li
                                key={`${menu.label}-titre-${sectionIndex}`}
                                className="px-1 pb-1 pt-2 text-[0.6875rem] font-semibold uppercase tracking-wide text-ink-muted/70"
                              >
                                {t(section.label)}
                              </li>
                            ) : null,
                            ...section.items.map((item) => {
                              const Icon = item.icon

                              return (
                                <li key={`${menu.label}-${section.label ?? ''}-${item.label}`}>
                                  {item.ready && item.href ? (
                                    <Link
                                      href={item.href}
                                      /* 48 px de haut : la hauteur confortable d'une
                                         cible au pouce, et la même pour toutes les
                                         entrées — une liste dont les lignes varient se
                                         vise moins bien qu'une liste régulière. */
                                      className="flex min-h-12 items-center gap-3 rounded-card px-1 text-ink-muted transition-colors duration-150 active:bg-surface-muted"
                                    >
                                      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                                      <span className="min-w-0">
                                        <span className="block text-sm font-medium text-ink">
                                          {t(item.label)}
                                        </span>
                                        <span className="block truncate text-xs text-ink-muted">
                                          {t(item.description)}
                                        </span>
                                      </span>
                                    </Link>
                                  ) : (
                                    /* Entrée non construite : un <span> et non un lien
                                       désactivé, pour qu'aucun clic ni aucune
                                       tabulation ne mène nulle part. */
                                    <span className="flex min-h-12 items-center gap-3 px-1 opacity-55">
                                      <Icon className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden="true" />
                                      <span className="min-w-0">
                                        <span className="flex items-center gap-2">
                                          <span className="text-sm font-medium text-ink">
                                            {t(item.label)}
                                          </span>
                                          <Badge variant="secondary" className="rounded-full px-2 py-0 text-micro font-medium">
                                            {fr.nav.soonShort}
                                          </Badge>
                                        </span>
                                        <span className="block truncate text-xs text-ink-muted">
                                          {t(item.description)}
                                        </span>
                                      </span>
                                    </span>
                                  )}
                                </li>
                              )
                            }),
                          ])}
                        </ul>
                      </Disclosure.Content>
                    </Disclosure>
                  )
                })}
              </DisclosureGroup>
            </nav>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
