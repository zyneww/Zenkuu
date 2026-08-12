'use client'

import { Check, ChevronDown, Search } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { AssetClass, MarketAsset } from '@zenkuu/data'

import { AssetLogo } from '@/components/asset/AssetLogo'
import { useHoverDismiss } from '@/components/nav/useHoverDismiss'
import { usePresence } from '@/components/nav/usePresence'

/**
 * Sélecteur d'actif — panneau de recherche groupé par classe.
 *
 * ── CE QU'IL REMPLACE, ET POURQUOI ────────────────────────────────────────────
 *
 * Un `<select>` natif doublé d'un champ de filtrage. Trois défauts que la forme
 * native ne permet pas de corriger :
 *
 *   · le filtre et la liste étaient DEUX contrôles distincts — on tape dans l'un,
 *     on choisit dans l'autre, sans que rien ne relie les deux gestes ;
 *   · aucun regroupement possible : trois cents entrées à plat, où une action se
 *     retrouve entre deux cryptomonnaies ;
 *   · aucune icône : un `<option>` ne contient que du texte.
 *
 * ── POURQUOI PAS `<optgroup>` ─────────────────────────────────────────────────
 *
 * Il grouperait, mais ne résout ni les icônes ni le lien entre recherche et liste,
 * et son rendu échappe totalement à la feuille de style sur la plupart des systèmes.
 *
 * ── CE QUE LA FORME NATIVE APPORTAIT ET QU'IL FAUT RENDRE ─────────────────────
 *
 * Un `<select>` est utilisable au clavier sans qu'on ait rien à écrire. Le
 * remplacer OBLIGE à réimplémenter : flèches, Entrée, Échap, `aria-activedescendant`
 * et le défilement automatique vers l'option active. C'est le coût réel de ce
 * composant, et il est payé ci-dessous — un sélecteur inaccessible serait une
 * régression, pas une amélioration.
 */

/** Ordre d'affichage des sections. Le plus consulté en premier. */
const CLASS_ORDER: AssetClass[] = ['crypto', 'stock', 'etf', 'index', 'commodity', 'forex', 'nft']

const CLASS_LABELS: Record<AssetClass, string> = {
  crypto: 'Cryptomonnaies',
  stock: 'Actions',
  etf: 'ETF',
  index: 'Indices',
  commodity: 'Matières premières',
  forex: 'Devises',
  nft: 'NFT',
}

/**
 * Raccourcis proposés au-dessus de la liste.
 *
 * Par SYMBOLE et non par identifiant : les identifiants dépendent du fournisseur
 * (`bitcoin` chez CoinGecko, `BTC-USD` ailleurs) et changeraient avec lui, alors
 * qu'un symbole de cotation est stable. Un raccourci dont l'actif est absent de
 * l'univers ne s'affiche pas.
 */
const SHORTCUT_SYMBOLS = ['BTC', 'ETH', 'AAPL', 'GC=F', 'SPY']

interface Props {
  assets: MarketAsset[]
  selected: MarketAsset
  onSelect: (asset: MarketAsset) => void
  label: string
}

export function AssetPicker({ assets, selected, onSelect, label }: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)

  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  const { state, mounted, onTransitionEnd } = usePresence(open)

  const close = useCallback(() => {
    setOpen(false)
    setQuery('')
  }, [])

  /* Le curseur qui s'éloigne referme la liste. Ce panneau porte un champ de
     recherche, ce qui l'excluait autrefois de cette règle : le garde-fou de focus du
     crochet renonce désormais à fermer tant qu'on y tape. Voir son en-tête. */
  const hoverDismiss = useHoverDismiss(close, open)

  /* Résultats à plat pour la navigation au clavier, groupés pour l'affichage. Une
     seule source, deux vues : les faire diverger désynchroniserait la flèche du bas
     de ce que le lecteur voit. */
  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const pool = needle
      ? assets.filter((asset) =>
          `${asset.name} ${asset.symbol}`.toLowerCase().includes(needle),
        )
      : assets

    return [...pool].sort((a, b) => {
      const classDiff = CLASS_ORDER.indexOf(a.assetClass) - CLASS_ORDER.indexOf(b.assetClass)
      if (classDiff !== 0) return classDiff
      return (b.marketCap ?? 0) - (a.marketCap ?? 0)
    })
  }, [assets, query])

  const groups = useMemo(() => {
    const map = new Map<AssetClass, MarketAsset[]>()
    for (const asset of matches) {
      const bucket = map.get(asset.assetClass)
      if (bucket) bucket.push(asset)
      else map.set(asset.assetClass, [asset])
    }
    return [...map.entries()]
  }, [matches])

  const shortcuts = useMemo(
    () =>
      SHORTCUT_SYMBOLS.map((symbol) =>
        assets.find((asset) => asset.symbol.toUpperCase() === symbol),
      ).filter((asset): asset is MarketAsset => asset !== undefined),
    [assets],
  )

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  /* Défilement suivant l'entrée active — sans lui, la flèche du bas sort de la zone
     visible et le lecteur navigue à l'aveugle après cinq ou six pressions. */
  useEffect(() => {
    if (!open) return
    listRef.current
      ?.querySelector(`[data-index="${activeIndex}"]`)
      ?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex, open])

  useEffect(() => {
    if (!open) return

    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) close()
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [open, close])

  function choose(asset: MarketAsset) {
    onSelect(asset)
    close()
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault()
      close()
      return
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((index) => Math.min(index + 1, matches.length - 1))
      return
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((index) => Math.max(index - 1, 0))
      return
    }
    if (event.key === 'Enter') {
      event.preventDefault()
      const asset = matches[activeIndex]
      if (asset) choose(asset)
    }
  }

  /* Position absolue de chaque ligne dans la liste à plat : le rendu est groupé,
     mais le clavier parcourt une seule séquence. Ce compteur fait le lien. */
  let flatIndex = -1

  return (
    <div ref={containerRef} className="relative" {...hoverDismiss}>
      <span className="mb-1 block text-xs text-ink-muted">{label}</span>

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex w-full items-center gap-2 border border-border-subtle bg-surface px-3 py-2.5 text-left transition-colors hover:border-brand focus:border-brand focus:outline-none"
      >
        <AssetLogo asset={selected} size={22} />
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">
          {selected.name}
        </span>
        <span className="shrink-0 text-xs uppercase text-ink-muted">{selected.symbol}</span>
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 text-ink-muted transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {mounted ? (
        <div
          data-state={state}
          onTransitionEnd={onTransitionEnd}
          className="menu-panel absolute left-0 right-0 top-full z-50 mt-1 border border-border-subtle bg-overlay shadow-overlay"
        >
          <div className="flex items-center gap-2 border-b border-border-subtle px-3 py-2">
            <Search className="h-3.5 w-3.5 shrink-0 text-ink-muted" aria-hidden="true" />
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                /* Retour au premier résultat À LA FRAPPE, et non dans un effet qui
                   observerait `query` : l'effet enchaînerait deux rendus, dont un
                   premier où l'entrée active désigne une ligne de l'ANCIENNE liste.
                   Le compilateur React refuse d'ailleurs ce motif. */
                setActiveIndex(0)
              }}
              onKeyDown={onKeyDown}
              placeholder="Rechercher un actif…"
              aria-label="Rechercher un actif"
              aria-controls="liste-actifs"
              aria-activedescendant={`actif-${activeIndex}`}
              className="w-full bg-transparent py-1 text-sm text-ink placeholder:text-ink-muted focus:outline-none"
            />
          </div>

          {/* Raccourcis masqués dès qu'une recherche est en cours : ils désignent des
              actifs qui ne correspondent probablement plus au terme tapé, et
              cliquer dessus contredirait la recherche affichée juste au-dessus. */}
          {shortcuts.length > 0 && !query ? (
            <div className="flex flex-wrap gap-1.5 border-b border-border-subtle px-3 py-2">
              {shortcuts.map((asset) => (
                <button
                  key={asset.id}
                  type="button"
                  onClick={() => choose(asset)}
                  className="flex items-center gap-1.5 border border-border-subtle px-2 py-1 text-xs text-ink-muted transition-colors hover:border-brand hover:text-ink"
                >
                  <AssetLogo asset={asset} size={14} />
                  {asset.symbol.toUpperCase()}
                </button>
              ))}
            </div>
          ) : null}

          <ul
            ref={listRef}
            id="liste-actifs"
            role="listbox"
            aria-label="Actifs disponibles"
            className="max-h-72 overflow-y-auto py-1"
          >
            {groups.length === 0 ? (
              <li className="px-3 py-6 text-center text-sm text-ink-muted">
                Aucun actif ne correspond à « {query} ».
              </li>
            ) : (
              groups.map(([assetClass, entries]) => (
                <li key={assetClass}>
                  {/* En-tête COLLÉ : sur une liste de trois cents entrées, la section
                      courante disparaît en haut du panneau dès le premier défilement,
                      et le lecteur ne sait plus ce qu'il parcourt. */}
                  <p className="sticky top-0 z-10 bg-overlay px-3 py-1.5 text-[0.625rem] font-semibold uppercase tracking-wide text-ink-muted">
                    {CLASS_LABELS[assetClass]}
                  </p>

                  <ul>
                    {entries.map((asset) => {
                      flatIndex += 1
                      const index = flatIndex
                      const isActive = index === activeIndex
                      const isSelected = asset.id === selected.id

                      return (
                        <li key={asset.id}>
                          <button
                            type="button"
                            id={`actif-${index}`}
                            data-index={index}
                            role="option"
                            aria-selected={isSelected}
                            onClick={() => choose(asset)}
                            onMouseEnter={() => setActiveIndex(index)}
                            className={`flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors ${
                              isActive ? 'bg-surface-muted' : ''
                            }`}
                          >
                            <AssetLogo asset={asset} size={20} />
                            <span className="min-w-0 flex-1 truncate text-sm text-ink">
                              {asset.name}
                            </span>
                            <span className="shrink-0 text-xs uppercase text-ink-muted">
                              {asset.symbol}
                            </span>
                            {isSelected ? (
                              <Check className="h-3.5 w-3.5 shrink-0 text-brand" aria-hidden="true" />
                            ) : null}
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
