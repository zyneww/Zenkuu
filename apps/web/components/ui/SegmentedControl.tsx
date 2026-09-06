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
      /* ⚠️ RAYON 12px ET NON `rounded-control` (8) — MESURÉ LE 2026-09-05.

         Le creux de la référence porte 12px, ses cases 8. Deux rayons distincts, et
         c'est ce qui fait lire la case comme POSÉE DANS le creux plutôt que
         découpée dedans : un rayon intérieur égal à l'extérieur donne un contour
         parallèle, un rayon plus petit donne un objet. Nous avions 8 et 6, même
         rapport mais deux crans trop serrés.

         ⚠️ LE `!` EST OBLIGATOIRE, ET CE N'EST PAS UNE FACILITÉ. `ToggleGroup` pose
         `rounded-control` en dur, et `tailwind-merge` ne reconnaît pas ce nom comme
         appartenant au groupe `rounded` — c'est une clé de thème du projet, pas une
         valeur de l'échelle par défaut. Les deux classes survivent donc côte à côte
         et l'ordre de la feuille tranche, ce qui a rendu 8px à la première mesure de
         vérification. */
      className={cn(
        'relative flex w-fit max-w-full flex-nowrap items-center rounded-card! bg-surface-muted',
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
      {/* ⚠️ `shadow-sm` A ÉTÉ RETIRÉ — LE PLAN PORTE L'ÉTAT, PAS L'OMBRE.

          C'est la mécanique de la référence, et elle n'emploie aucune ombre : la piste
          est CREUSÉE (elle prend un plan sous la carte) et la pastille active REMONTE
          au plan de la carte. Relevé le 2026-09-06 sur 899 éléments — UNE seule ombre
          réelle sur toute la page, et pas à cet endroit.

          L'ombre était là quand `--color-surface-active` valait un gris franc deux
          crans SOUS la piste : elle rattrapait un état qui s'ASSOMBRISSAIT au lieu de
          s'élever. Le jeton a été retourné en Phase 1 ; l'ombre n'a plus rien à
          rattraper, et elle contredisait la règle du reste du site. */}
      {cadre ? (
        <span
          aria-hidden="true"
          className="absolute top-1/2 -translate-y-1/2 rounded-control bg-surface-active transition-[left,width] duration-200 ease-out motion-reduce:transition-none"
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
          /* ⚠️ GRAISSE NORMALE ET NON `font-medium` — MESURÉ SUR LA RÉFÉRENCE.

             Ses cases de période sont en 13px/400, y compris l'active : ce qui la
             distingue est l'aplat sous elle et son encre pleine, pas sa graisse.
             Un demi-gras ajoutait un troisième signal là où deux suffisent, et
             faisait respirer la case active d'un pixel à la sélection. */
          /* Le `!` du rayon, ici, écarte le `data-[spacing=0]:rounded-none` de
             `ToggleGroupItem` : ce défaut existe pour le motif « segments joints »,
             où seules les cases extrêmes sont arrondies. Nos cases sont séparées
             d'une gouttière, chacune est un objet, chacune porte son rayon. */
          className={cn(
            /* ⚠️ `font-semibold` ET NON `font-normal`. Relevé le 4 septembre 2026 sur la
               fiche Bitcoin de CoinGecko : ses pastilles de période — 24h, 7d, 1y —
               sortent TOUTES en 12/16/600, actives comme inactives, et ses en-têtes de
               tableau au même cran. Le `font-normal` posé ici les rendait à 400 : elles
               se lisaient comme du texte courant tombé dans un cadre, quand une pastille
               est un LIBELLÉ DE COMMANDE et doit peser comme tel.

               ⚠️ ET LE CRAN DE DOUZE EXISTE — j'avais écrit ici qu'il manquait. C'est
               `--v2-text-2xs` (12px, interligne 16), posé par le sous-projet A des jetons
               relevés chez la référence, et déjà consommé par les en-têtes de tableau et
               les cartes de statistiques. `--text-xs` vaut 13, `--text-micro` vaut 11 :
               c'est entre les deux qu'on ne trouvait rien en regardant l'ancienne
               échelle seule. La pastille tombe donc exactement sur la valeur relevée. */
            'relative shrink-0 whitespace-nowrap rounded-control! bg-transparent font-semibold transition-colors duration-150 data-[state=on]:bg-transparent',
            compact
              ? 'h-6 px-2 text-micro'
              : 'h-7 px-2.5 text-[length:var(--v2-text-2xs)] leading-4',
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
