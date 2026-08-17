'use client'

import { useCallback, useMemo, useState } from 'react'

import { ColumnHeader, type ColumnPreferences } from '@/components/ui/table-columns'

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
 * `/nouvelles-cotations` et les vues de `/graphiques` sont en rendu statique
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
    /**
     * @param direction Sens EXPLICITE, quand l'appelant le connaît.
     *
     * Les en-têtes offrent désormais « du plus grand au plus petit » et son inverse
     * en deux entrées de menu distinctes : le sens y est CHOISI, pas basculé. Sans ce
     * paramètre, choisir « croissant » sur une colonne déjà croissante la ferait
     * passer en décroissant — un contrôle qui fait le contraire de ce qu'il annonce.
     *
     * Il reste optionnel : le clic direct sur une colonne bascule toujours.
     */
    (key: K, direction?: SortDirection) => {
      setSort((current) => {
        if (direction) return { key, direction }

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
 * EN-TÊTE DE COLONNE — désormais un adaptateur vers `ColumnHeader`.
 *
 * ── POURQUOI L'ANCIEN CORPS A DISPARU ────────────────────────────────────────
 *
 * Il rendait un `<th>` portant un bouton qui basculait le tri, et rien d'autre. Le
 * site en compte une douzaine d'appelants — places de cotation, trésoreries, pools,
 * catégories, screener, tickers d'actif. Leur ajouter un à un le menu à trois entrées
 * (trier ↑, trier ↓, masquer) aurait voulu dire douze modifications parallèles, dont
 * onze auraient dérivé au premier changement.
 *
 * Le composant DÉLÈGUE donc à `ColumnHeader`, et tous les tableaux du site héritent
 * du menu sans qu'aucun ne change. Ceux qui veulent en plus le masquage de colonnes
 * passent `columnPrefs` ; les autres continuent de marcher exactement comme avant.
 *
 * L'accessibilité est inchangée et vaut d'être redite : `aria-sort` vit sur le `<th>`,
 * où la norme le place — c'est la COLONNE qui est triée, pas le bouton qui la
 * commande.
 */
export function SortableHeader<K extends string>({
  label,
  sortKey,
  sort,
  onToggle,
  align = 'right',
  className = '',
  title,
  columnId,
  columnPrefs,
}: {
  label: string
  sortKey: K
  sort: SortState<K> | null
  onToggle: (key: K, direction?: SortDirection) => void
  align?: 'left' | 'right'
  className?: string
  title?: string
  /** Identifiant dans les préférences d'affichage. Par défaut, la clé de tri. */
  columnId?: string
  /** Fournies, la colonne devient masquable depuis son menu. */
  columnPrefs?: ColumnPreferences
}) {
  return (
    <ColumnHeader
      label={label}
      columnId={columnId ?? sortKey}
      sortKey={sortKey}
      sort={sort}
      onSort={(key, direction) => onToggle(key as K, direction)}
      columnPrefs={columnPrefs}
      align={align}
      className={className}
      hint={title}
    />
  )
}
