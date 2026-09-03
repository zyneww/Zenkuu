'use client'

import * as React from 'react'

import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { cn } from '@/lib/utils'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * LE SÉLECTEUR SEGMENTÉ — UN SEUL, ET SON INDICATEUR GLISSE
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Le motif — un creux, des libellés, un aplat sur l'option retenue — était recopié en
 * classes dans quatre fichiers au moins : les deux segments de `ChartToolbar`,
 * `CryptoViewControls`, `GlobalChartCard`. Chaque copie avait ses propres valeurs de
 * rembourrage et de rayon, et corriger le contraste de l'état actif demandait de les
 * retrouver toutes — ce qui vient d'arriver.
 *
 * ── CE QUI EST REPRIS D'OPENSOURCE UI, ET CE QUI NE L'EST PAS ──────────────
 *
 * Leur `segmented-toggle-button` apporte une IDÉE juste : l'aplat de l'option active
 * ne saute pas d'une case à l'autre, il GLISSE. Le mouvement dit d'où l'on vient, ce
 * qu'un saut ne dit pas.
 *
 * ⚠️ LEUR IMPLÉMENTATION, ELLE, NE POUVAIT PAS SERVIR. Tailwind ne fabrique pas de
 * classe à l'exécution : ils écrivent donc À LA MAIN une table de décalages, une
 * entrée par (nombre d'options, index actif) —
 *
 *     2: { 1: 'translate-x-[calc(100%+0.25rem)]' },
 *     3: { 1: …, 2: 'translate-x-[calc(200%+0.5rem)]' },  …
 *
 * — table qui s'arrête à CINQ options et suppose des cases de largeur égale. Les
 * paliers de période en comptent SEPT, et « MAX » n'a pas la largeur de « 24H ».
 *
 * Ici l'indicateur se MESURE : on lit `offsetLeft` et `offsetWidth` du bouton actif et
 * on les pose en pixels. Aucune limite de nombre, aucune hypothèse sur les largeurs,
 * et rien à écrire quand une option s'ajoute.
 *
 * ── POURQUOI RADIX EN DESSOUS ──────────────────────────────────────────────
 *
 * `ToggleGroup` donne ce qu'une rangée de `<button aria-pressed>` ne donne pas : un
 * `role="radiogroup"` dont les options s'annoncent « une parmi N », les flèches
 * directionnelles, Origine/Fin, et la tabulation qui traverse le groupe d'un seul
 * arrêt. Il est déjà dans le dépôt.
 *
 * ⚠️ RADIX APPELLE `onValueChange` AVEC LA CHAÎNE VIDE quand on reclique l'option
 * active — il n'a pas de `disallowEmptySelection`. Un segment sans option retenue n'a
 * pas d'état de repli ici : le garde ci-dessous ignore ce cas.
 */

/*
 * ⚠️ `useLayoutEffect` ET NON `useEffect` : la mesure doit être posée AVANT la peinture.
 * Avec `useEffect`, l'indicateur existe une image durant à gauche 0 largeur 0, puis
 * saute à sa place — un clignotement à chaque montage, et un glissement parasite depuis
 * le bord gauche à la première apparition.
 *
 * `useLayoutEffect` n'existe pas au rendu serveur, où React avertit qu'on l'appelle. Le
 * composant est client, mais Next le rend quand même une fois sur le serveur : d'où la
 * bascule.
 *
 * ⚠️ ELLE VIT AU NIVEAU DU MODULE, ET LE NOM COMMENCE PAR `use`. Écrite DANS le
 * composant, la constante n'est pour l'analyseur qu'une variable ordinaire : il ne
 * reconnaît plus l'appel comme un point d'accroche, prend son rappel pour du code de
 * rendu, et refuse la lecture de la référence — « Cannot access refs during render ».
 * Relevé par le linter, pas déduit.
 */
const useMesureAvantPeinture =
  typeof window === 'undefined' ? React.useEffect : React.useLayoutEffect

export interface SegmentedOption<T extends string> {
  key: T
  label: React.ReactNode
  /** Grisé quand la source ne publie rien pour cette option. */
  disabled?: boolean
  /** Infobulle native — sert à dire POURQUOI une option est grisée. */
  title?: string
  /** Nom accessible quand `label` est un pictogramme seul. */
  ariaLabel?: string
}

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  label,
  size = 'md',
  className,
}: {
  value: T
  onChange: (value: T) => void
  options: readonly SegmentedOption<T>[]
  /** Intitulé du groupe, pour la synthèse vocale. Jamais rendu. */
  label: string
  size?: 'sm' | 'md'
  className?: string
}) {
  const rail = React.useRef<HTMLDivElement>(null)
  const [cadre, setCadre] = React.useState<{ left: number; width: number } | null>(null)

  useMesureAvantPeinture(() => {
    const conteneur = rail.current
    if (!conteneur) return

    const mesurer = () => {
      const actif = conteneur.querySelector<HTMLElement>('[data-state="on"]')
      if (!actif) return
      setCadre({ left: actif.offsetLeft, width: actif.offsetWidth })
    }

    mesurer()

    /* La largeur d'un libellé change avec la LANGUE et avec la police une fois
       chargée : « MAX » et « TOUT » n'ont pas la même boîte. Un observateur de
       redimensionnement rattrape ces deux moments sans les prédire. */
    const observateur = new ResizeObserver(mesurer)
    observateur.observe(conteneur)
    for (const enfant of conteneur.children) observateur.observe(enfant)
    return () => observateur.disconnect()
  }, [value, options])

  const compact = size === 'sm'

  return (
    <ToggleGroup
      ref={rail}
      type="single"
      value={value}
      onValueChange={(suivant) => {
        /* Voir la note de tête : Radix envoie '' sur un reclic. */
        if (suivant) onChange(suivant as T)
      }}
      aria-label={label}
      /* Le creux porte le groupe ; c'est lui qui fait lire l'aplat actif comme
         POSÉ DEDANS plutôt que comme un bouton isolé — voir DESIGN_BACKPACK.md,
         qui range les deux sur L2 et L4. */
      className={cn(
        'relative flex w-fit max-w-full flex-nowrap items-center rounded-control bg-surface-muted',
        compact ? 'gap-0.5 p-0.5' : 'gap-0.5 p-1',
        className,
      )}
    >
      {/*
        L'INDICATEUR EST UN FRÈRE DES BOUTONS, PAS LEUR FOND.

        Posé en `absolute` derrière eux, il peut se déplacer d'une case à l'autre sans
        que rien ne soit remonté ni redessiné : seuls `left` et `width` changent, deux
        propriétés que le compositeur sait animer sans repasser par la mise en page.

        ⚠️ IL N'APPARAÎT QU'UNE FOIS MESURÉ. Rendu avant, il aurait une largeur nulle au
        coin gauche du rail, ce qui se verrait le temps d'une image.

        `motion-reduce:transition-none` : un lecteur qui a demandé moins de mouvement
        obtient un saut, pas un glissement.
      */}
      {cadre ? (
        <span
          aria-hidden="true"
          className="absolute top-1/2 -translate-y-1/2 rounded-[6px] bg-surface-active shadow-sm transition-[left,width] duration-200 ease-out motion-reduce:transition-none"
          style={{ left: cadre.left, width: cadre.width, height: compact ? '1.5rem' : '1.75rem' }}
        />
      ) : null}

      {options.map((option) => (
        <ToggleGroupItem
          key={option.key}
          value={option.key}
          disabled={option.disabled}
          {...(option.title ? { title: option.title } : {})}
          {...(option.ariaLabel ? { 'aria-label': option.ariaLabel } : {})}
          /* `relative` sans quoi le libellé passe SOUS l'indicateur — les deux sont
             dans le même contexte d'empilement et l'absolu gagne à égalité.

             `bg-transparent` en toutes lettres : `toggleVariants` peint l'état actif,
             ce qui doublerait l'indicateur d'un second aplat immobile. */
          className={cn(
            'relative shrink-0 whitespace-nowrap rounded-[6px] bg-transparent font-medium transition-colors duration-150 data-[state=on]:bg-transparent',
            compact ? 'h-6 px-2 text-micro' : 'h-7 px-2.5 text-xs',
            'text-ink-muted hover:text-ink data-[state=on]:text-ink',
            'disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:text-ink-muted',
          )}
        >
          {option.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
