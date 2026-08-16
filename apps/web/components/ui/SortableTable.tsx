'use client'

import { useCallback, useMemo, useState } from 'react'

/**
 * TRI DE TABLEAU CÔTÉ CLIENT — un seul mécanisme pour tous les tableaux non paginés
 * côté serveur.
 *
 * ── POURQUOI PAS DANS L'URL ──────────────────────────────────────────────────
 *
 * `MarketTable` trie par paramètre d'URL, et c'est justifié chez lui : sa pagination
 * est servie par le serveur, qui doit donc connaître le critère pour rendre la bonne
 * tranche. Les tableaux servis ici sont différents — leurs lignes sont TOUTES déjà
 * chargées, et les réordonner ne demande rien à personne.
 *
 * Lire un paramètre de requête dans ces pages aurait un coût précis : `/places`,
 * `/crypto/nouvelles` et les vues de `/crypto/graphiques` sont en rendu statique
 * régénéré. Y lire `searchParams` les bascule en rendu dynamique, c'est-à-dire un
 * rendu serveur complet à chaque visite, pour un état — l'ordre d'un tableau — qui ne
 * mérite pas ce prix.
 *
 * Ce qu'on y perd est réel et assumé : un tri n'est pas partageable par lien.
 *
 * ── LE TRI EST STABLE, ET IL FAUT QU'IL LE SOIT ──────────────────────────────
 *
 * Deux lignes de même valeur gardent leur ordre d'origine — celui du classement rendu
 * par la source. `Array.prototype.sort` le garantit depuis ES2019. Sans cette
 * garantie, trier par pays ferait danser les places à égalité d'un clic à l'autre,
 * et le lecteur croirait à un rafraîchissement des données.
 *
 * ── LES VALEURS ABSENTES FINISSENT TOUJOURS EN BAS ───────────────────────────
 *
 * Dans les deux sens, et c'est délibéré. Traiter une absence comme un zéro placerait
 * en tête d'un tri croissant les lignes dont on ne sait RIEN, présentées comme les
 * plus petites — le même piège que les indices sans volume publié. Une absence n'est
 * pas une petite valeur : elle n'est pas une valeur.
 */

export type SortDirection = 'asc' | 'desc'

export interface SortState<K extends string> {
  key: K
  direction: SortDirection
}

/** Ce qu'une colonne sait extraire d'une ligne pour être comparée. */
export type SortAccessor<T> = (row: T) => string | number | undefined | null

export function useTableSort<T, K extends string>({
  rows,
  accessors,
  initial,
  onSortChange,
}: {
  rows: readonly T[]
  /** Une fonction d'extraction par colonne triable. */
  accessors: Record<K, SortAccessor<T>>
  /**
   * Tri appliqué au départ.
   *
   * Souvent `null` : la source rend déjà ses lignes dans un ordre qui a du sens —
   * note de confiance pour les places, date pour les actualités — et le premier rendu
   * doit le respecter. Un tri initial imposé masquerait ce classement d'origine sans
   * que personne ne l'ait demandé.
   */
  initial?: SortState<K> | null
  /**
   * Prévenu à chaque changement de tri.
   *
   * Sert aux tableaux paginés à repartir en page 1 : rester en page 3 après un
   * changement de critère dépose le lecteur au milieu d'un classement différent.
   */
  onSortChange?: () => void
}) {
  const [sort, setSort] = useState<SortState<K> | null>(initial ?? null)

  const toggle = useCallback(
    (key: K) => {
      setSort((current) => {
        // Changer de colonne repart en DÉCROISSANT : sur des volumes, des parts ou des
        // notes, « le plus grand d'abord » est ce qu'on vient chercher. Le sens
        // croissant reste accessible d'un second clic.
        if (!current || current.key !== key) return { key, direction: 'desc' }
        return { key, direction: current.direction === 'desc' ? 'asc' : 'desc' }
      })
      onSortChange?.()
    },
    [onSortChange],
  )

  const sorted = useMemo(() => {
    if (!sort) return rows

    const accessor = accessors[sort.key]
    const factor = sort.direction === 'desc' ? -1 : 1

    return [...rows].sort((a, b) => {
      const left = accessor(a)
      const right = accessor(b)

      const leftMissing = left === undefined || left === null || left === ''
      const rightMissing = right === undefined || right === null || right === ''

      // Les absences sortent du tri : `1` et `-1` bruts, sans le facteur de sens, ce
      // qui les maintient en bas dans les deux directions.
      if (leftMissing && rightMissing) return 0
      if (leftMissing) return 1
      if (rightMissing) return -1

      if (typeof left === 'number' && typeof right === 'number') {
        return (left - right) * factor
      }

      /* `localeCompare` et non `<` : l'ordre alphabétique brut place « Zurich » avant
         « Édimbourg », les caractères accentués vivant au-delà de « z » dans la table
         Unicode. Sur une colonne de pays, le défaut se voit immédiatement. */
      return String(left).localeCompare(String(right), 'fr', { sensitivity: 'base' }) * factor
    })
  }, [rows, sort, accessors])

  return { rows: sorted, sort, toggle }
}

/**
 * En-tête de colonne cliquable.
 *
 * ── UN VRAI BOUTON DANS LA CELLULE, ET NON UNE CELLULE CLIQUABLE ─────────────
 *
 * Poser `onClick` sur le `<th>` fonctionnerait à la souris et nulle part ailleurs :
 * une cellule de tableau n'est pas focalisable, ne s'active pas à la barre d'espace,
 * et n'est pas annoncée comme actionnable. Le bouton intérieur donne les trois
 * gratuitement.
 *
 * `aria-sort` reste sur le `<th>`, où la norme le place : c'est la COLONNE qui est
 * triée, pas le bouton qui la commande.
 */
export function SortableHeader<K extends string>({
  label,
  sortKey,
  sort,
  onToggle,
  align = 'right',
  className = '',
  title,
}: {
  label: string
  sortKey: K
  sort: SortState<K> | null
  onToggle: (key: K) => void
  align?: 'left' | 'right'
  className?: string
  title?: string
}) {
  const isActive = sort?.key === sortKey

  return (
    <th
      scope="col"
      className={`px-3 py-2.5 text-xs font-medium text-ink-muted ${align === 'right' ? 'text-right' : 'text-left'} ${className}`}
      aria-sort={isActive ? (sort.direction === 'desc' ? 'descending' : 'ascending') : 'none'}
    >
      <button
        type="button"
        onClick={() => onToggle(sortKey)}
        title={title ?? `Trier par ${label.toLowerCase()}`}
        className={`inline-flex items-center gap-1 rounded-sm transition-colors duration-150 hover:text-brand-strong ${
          isActive ? 'text-ink' : ''
        } ${align === 'right' ? 'flex-row-reverse' : ''}`}
      >
        {label}
        {/*
          La flèche est TOUJOURS présente, seulement estompée hors tri actif.

          L'apparition au survol serait invisible au doigt, et l'apparition à
          l'activation ferait sauter la largeur de l'en-tête d'un clic à l'autre —
          décalant toute la colonne. Réservée en permanence, elle ne coûte que son
          opacité.
        */}
        <span
          aria-hidden="true"
          className={`text-[0.65em] leading-none transition-opacity duration-150 ${
            isActive ? 'opacity-100' : 'opacity-30'
          }`}
        >
          {isActive && sort.direction === 'asc' ? '▲' : '▼'}
        </span>
      </button>
    </th>
  )
}
