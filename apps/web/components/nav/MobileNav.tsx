'use client'

import { ChevronDown, Menu, X } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import { createPortal } from 'react-dom'

import { Link, usePathname } from '@/i18n/navigation'
import { NAV_MENUS } from '@/content/navigation'
import { useContent, usePhrase } from '@/components/locale/ContentProvider'
import { usePresence } from '@/components/nav/usePresence'

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
  const { state, mounted, onTransitionEnd } = usePresence(open)

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

  /*
   * ── LA PAGE DERRIÈRE NE DOIT PAS DÉFILER ─────────────────────────────────
   *
   * Sans ce verrou, faire glisser le tiroir fait défiler la page en dessous : on
   * referme et l'on se retrouve ailleurs qu'on ne l'avait laissée. C'est le défaut le
   * plus courant des tiroirs mobiles.
   *
   * `overflow: hidden` sur le document plutôt que `position: fixed` sur le corps :
   * la seconde méthode fonctionne aussi sur iOS mais REMET LA PAGE EN HAUT à la
   * fermeture, puisque le corps sort du flux. Il faudrait alors mémoriser puis
   * restaurer la position — trois lignes de plus pour un défaut qu'on introduit
   * soi-même.
   */
  useEffect(() => {
    if (!open) return
    const previous = document.documentElement.style.overflow
    document.documentElement.style.overflow = 'hidden'
    return () => {
      document.documentElement.style.overflow = previous
    }
  }, [open])

  /* Échap referme — l'échappatoire attendue de toute couche qui couvre l'écran. */
  useEffect(() => {
    if (!open) return
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  function toggleSection(label: string) {
    setExpanded((current) =>
      current.includes(label) ? current.filter((entry) => entry !== label) : [...current, label],
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? 'Fermer la navigation' : 'Ouvrir la navigation'}
        /* 40×40 : au-dessus du seuil de 32 px sous lequel une cible se rate au doigt,
           et `-ml-2` ramène le GLYPHE à l'alignement du logo — c'est le dessin qu'on
           aligne, pas la zone tactile qui l'entoure. */
        className="-ml-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-control text-ink transition-colors duration-150 hover:bg-surface-muted xl:hidden"
      >
        {open ? (
          <X className="h-5 w-5" aria-hidden="true" />
        ) : (
          <Menu className="h-5 w-5" aria-hidden="true" />
        )}
      </button>

      {/*
        ── LE PANNEAU EST PORTÉ PAR LE CORPS, ET C'EST UNE NÉCESSITÉ ─────────────

        Rendu à sa place dans l'arbre, il tombait à une hauteur de ZÉRO pixel — mesuré
        au navigateur, pas supposé. La cause n'a rien à voir avec lui : l'en-tête porte
        `backdrop-blur`, et une propriété de filtre d'arrière-plan crée un BLOC
        CONTENEUR pour tous ses descendants en position fixe. `top-16 bottom-0` se
        résolvait donc à l'intérieur des soixante-quatre pixels de la barre, et non dans
        l'écran : 64 − 64 − 0 = 0.

        Le même piège attend `transform`, `filter`, `perspective` et `contain`. Les
        autres couches du site (recherche, session, préférences) y échappent parce
        qu'elles sont rendues à côté de l'en-tête, pas dedans — celle-ci ne le peut pas,
        son bouton vit dans la barre.

        Le portail est SANS RISQUE pour le rendu serveur : `mounted` ne devient vrai
        qu'après un clic, donc après l'hydratation. `document` n'est jamais lu sur le
        serveur.
      */}
      {mounted
        ? createPortal(
        <>
          {/* Le voile commence SOUS l'en-tête (`top-16`) : le recouvrir masquerait le
              bouton de fermeture, seul moyen évident de revenir en arrière. */}
          <div
            data-state={state}
            onClick={() => setOpen(false)}
            aria-hidden="true"
            className="drawer-scrim fixed inset-x-0 bottom-0 top-16 z-40 bg-black/40 xl:hidden"
          />

          <div
            id={panelId}
            data-state={state}
            onTransitionEnd={onTransitionEnd}
            className="drawer-sheet fixed inset-x-0 bottom-0 top-16 z-40 flex flex-col overflow-y-auto overscroll-contain bg-canvas xl:hidden"
          >
            <nav aria-label="Navigation principale" className="safe-x flex-1 py-2">
              <ul className="divide-y divide-border-subtle">
                {NAV_MENUS.map((menu) => {
                  /* Un menu sans panneau est un LIEN, ici comme sur le bureau : lui
                     donner un chevron qui ne déplie rien serait une promesse vide. */
                  if (menu.href && menu.sections.length === 0) {
                    return (
                      <li key={menu.label}>
                        <Link
                          href={menu.href}
                          className="flex min-h-[3.25rem] items-center text-base font-semibold text-ink"
                        >
                          {t(menu.label)}
                        </Link>
                      </li>
                    )
                  }

                  const isExpanded = expanded.includes(menu.label)

                  return (
                    <li key={menu.label}>
                      <button
                        type="button"
                        onClick={() => toggleSection(menu.label)}
                        aria-expanded={isExpanded}
                        className="flex min-h-[3.25rem] w-full items-center justify-between gap-3 text-left text-base font-semibold text-ink"
                      >
                        {t(menu.label)}
                        <ChevronDown
                          className={`h-4 w-4 shrink-0 text-ink-muted transition-transform duration-150 ${
                            isExpanded ? 'rotate-180' : ''
                          }`}
                          aria-hidden="true"
                        />
                      </button>

                      {isExpanded ? (
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
                                          <span className="rounded bg-surface-muted px-1.5 py-0.5 text-micro font-medium uppercase tracking-wide text-ink-muted">
                                            {fr.nav.soonShort}
                                          </span>
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
                      ) : null}
                    </li>
                  )
                })}
              </ul>
            </nav>
          </div>
        </>,
            document.body,
          )
        : null}
    </>
  )
}
