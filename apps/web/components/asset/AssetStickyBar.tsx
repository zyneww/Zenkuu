'use client'

import { useEffect, useRef, useState } from 'react'

import type { AssetClass, AssetDetail } from '@zenkuu/data'
import { ChangeBadge } from '@zenkuu/ui'

import { AssetLogo } from '@/components/asset/AssetLogo'
import { LiveBinancePrice } from '@/components/asset/LiveBinancePrice'
import { Money } from '@/components/locale/Money'

/**
 * Barre d'identité collante, révélée quand l'en-tête sort de l'écran.
 *
 * ── LE PROBLÈME QU'ELLE RÉSOUT ────────────────────────────────────────────────
 *
 * La fiche est devenue longue : quatre onglets, une colonne de six cartes, un
 * graphique, deux anneaux, une grille de rendements. Passé le premier écran, plus
 * rien ne rappelle QUEL actif on regarde ni à COMBIEN il cote — et sur un site qui
 * sert six classes d'actifs et des milliers d'émetteurs, se tromper de page en
 * lisant un tableau de places de cotation est très facile.
 *
 * ── ELLE NE DUPLIQUE PAS L'EN-TÊTE, ELLE LE RÉSUME ────────────────────────────
 *
 * Quatre éléments, pas un de plus : identité, cours, variation, retour en haut. Pas
 * de bandeau de statistiques, pas de boutons d'action. Une barre collante qui
 * reprend tout l'en-tête vole trente pixels de hauteur utile en permanence pour
 * répéter ce qui est à un défilement de distance ; celle-ci ne garde que ce qui
 * répond à « où suis-je, et combien ça vaut ».
 *
 * ── LE DÉCALAGE VERTICAL EST MESURÉ, PAS SUPPOSÉ ──────────────────────────────
 *
 * La navigation du site est elle-même collante. Coder sa hauteur en dur (64 px)
 * marcherait aujourd'hui et casserait au premier changement de son rembourrage — la
 * barre se glisserait dessous sans que rien ne le signale. Elle est donc mesurée au
 * montage et à chaque redimensionnement, via `data-site-header`.
 */
export function AssetStickyBar({
  asset,
  assetClass,
  isRate,
}: {
  asset: AssetDetail
  assetClass: AssetClass
  isRate: boolean
}) {
  const sentinelRef = useRef<HTMLDivElement>(null)
  const [shown, setShown] = useState(false)
  const [offset, setOffset] = useState(64)

  useEffect(() => {
    const measure = () => {
      const header = document.querySelector<HTMLElement>('[data-site-header]')
      setOffset(header?.getBoundingClientRect().height ?? 64)
    }

    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || typeof IntersectionObserver === 'undefined') return

    /*
     * Une SENTINELLE plutôt qu'un écouteur de défilement.
     *
     * L'écouteur se déclencherait à chaque image pendant tout le défilement de la
     * page, pour ne changer d'avis que deux fois. L'observateur, lui, ne réveille le
     * fil principal qu'au franchissement. La sentinelle est un élément de flux
     * ordinaire, toujours affiché : c'est le cas d'usage pour lequel
     * `IntersectionObserver` est fait, et il n'a rien à voir avec la détection de
     * panneaux masqués dont `panel-visibility.tsx` raconte les déboires.
     */
    const observer = new IntersectionObserver(
      ([entry]) => setShown(!entry?.isIntersecting),
      // La marge négative en haut correspond à la navigation collante : sans elle,
      // la sentinelle serait déclarée « visible » alors qu'elle est cachée derrière.
      { rootMargin: `-${offset}px 0px 0px 0px`, threshold: 0 },
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [offset])

  return (
    <>
      <div ref={sentinelRef} aria-hidden="true" className="h-px" />

      <div
        // `aria-hidden` quand elle est masquée : la barre répète des informations
        // déjà présentes dans l'en-tête, et un lecteur d'écran les rencontrerait
        // deux fois sans y gagner quoi que ce soit.
        aria-hidden={!shown}
        style={{ top: `${offset}px` }}
        className={`fixed inset-x-0 z-40 border-b border-border-subtle bg-canvas/95 backdrop-blur transition-opacity duration-150 ${
          shown ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      >
        <div className="shell flex h-12 items-center gap-3">
          <AssetLogo asset={asset} size={22} />

          <span className="min-w-0 truncate text-sm font-semibold text-ink">{asset.name}</span>
          <span className="shrink-0 text-[0.625rem] font-semibold uppercase tracking-wider text-ink-muted">
            {asset.symbol}
          </span>

          <span className="tabular ml-auto shrink-0 text-sm font-semibold text-ink">
            {assetClass === 'crypto' ? (
              <LiveBinancePrice
                symbol={asset.symbol}
                fallbackValue={asset.price}
                fallbackCurrency={asset.currency}
              />
            ) : (
              <Money value={asset.price} from={asset.currency} asRate={isRate} />
            )}
          </span>

          <span className="shrink-0">
            <ChangeBadge value={asset.change24h} size="sm" />
          </span>

          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            // `tabIndex={-1}` quand la barre est invisible : un contrôle transparent
            // mais focalisable piège la tabulation dans une zone que personne ne voit.
            tabIndex={shown ? 0 : -1}
            className="shrink-0 rounded-control border border-border-subtle px-2 py-1 text-[0.6875rem] font-medium text-ink-muted transition-colors duration-150 hover:border-brand hover:text-ink"
          >
            Haut de page
          </button>
        </div>
      </div>
    </>
  )
}
