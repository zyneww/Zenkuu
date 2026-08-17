'use client'

import { ArrowUp } from 'lucide-react'
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
      {/*
        `col-span-full` : sans effet dans un conteneur en bloc — donc dans le rail
        ordinaire — et INDISPENSABLE dans la disposition « pleine largeur », où le rail
        devient une grille de quatre colonnes. Cette sentinelle d'un pixel y occupait
        sinon la première cellule, et le bandeau s'ouvrait sur un vide de 390 pixels
        avant son premier groupe. Constaté à l'écran.

        Elle ne peut pas simplement disparaître de la grille : sa POSITION DANS LE FLUX
        est ce qui définit le seuil de déclenchement de la barre collante.
      */}
      <div ref={sentinelRef} aria-hidden="true" className="col-span-full h-px" />

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
          <span className="shrink-0 text-micro font-semibold uppercase tracking-wider text-ink-muted">
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

          {/*
            IL ÉTAIT MASQUÉ SOUS `sm`, ET IL NE L'EST PLUS.

            La barre aligne six éléments : logo, nom, code, cours, variation, et ce
            bouton. À 375 pixels, l'audit relevait 31 pixels de trop, et c'est ce
            bouton — le plus large — qui les provoquait. Le masquer était la bonne
            réponse tant qu'il portait « Haut de page » en toutes lettres.

            Réduit à une icône de vingt-huit pixels, il ne coûte plus la largeur qui
            justifiait son retrait. Il revient donc partout, et c'est sur téléphone —
            là où la fiche fait le plus d'écrans — qu'il sert le plus.
          */}
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            // `tabIndex={-1}` quand la barre est invisible : un contrôle transparent
            // mais focalisable piège la tabulation dans une zone que personne ne voit.
            tabIndex={shown ? 0 : -1}
            title="Remonter en haut de la page"
            aria-label="Remonter en haut de la page"
            /*
              ── LE LIBELLÉ EST DEVENU UNE ICÔNE ────────────────────────────

              « Haut de page » occupait quatre-vingts pixels dans une barre de 48 de haut
              qui porte déjà le nom de l'actif, son code, son cours et sa variation —
              c'est-à-dire tout ce pourquoi la barre existe. Le seul contrôle de la bande
              en était aussi le plus large.

              Une flèche vers le haut dans un carré dit la même chose en vingt-huit
              pixels : c'est la convention de CoinGecko, de TradingView et de la moitié
              des sites qui ont une barre collante. Le libellé subsiste en `title` et en
              `aria-label`, donc rien n'est perdu pour un lecteur d'écran ni pour
              quelqu'un qui hésite.

              Il redevient visible SOUS `sm`, où il était masqué faute de place : à
              vingt-huit pixels, il tient désormais partout — et c'est sur téléphone,
              où la page fait le plus d'écrans, qu'on en a le plus besoin.
            */
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-control border border-border-subtle text-ink-muted transition-colors duration-150 hover:border-brand hover:text-ink"
          >
            <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </>
  )
}
