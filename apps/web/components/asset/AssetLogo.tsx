'use client'

import Image from 'next/image'
import { useState } from 'react'

import type { AssetClass, MarketAsset } from '@zenkuu/data'
import { findUniverseEntryBySymbol, type CommodityFamily } from '@zenkuu/data'

import { monogram } from '@/components/asset/monogram'

/**
 * Icône d'un actif — un composant, une branche par classe.
 *
 * ── POURQUOI UN SEUL COMPOSANT POUR SIX CLASSES ───────────────────────────────
 *
 * Chaque classe a sa propre source d'identité visuelle : la crypto porte son image
 * dans la réponse de l'API, une action a le logo de son émetteur, une matière
 * première n'a rien du tout — l'or n'a pas de marque — et un indice pas davantage.
 * Écrire un composant par classe multiplierait par six le repli, c'est-à-dire le
 * seul chemin que TOUTES empruntent en cas d'échec.
 *
 * L'ordre de résolution va du plus spécifique au plus général, et chaque branche
 * tombe sur la suivante :
 *
 *   1. image fournie par la source        (crypto)
 *   2. emoji de famille                   (matières premières)
 *   3. logo par domaine                   (actions, ETF — exige une clé)
 *   4. monogramme                         (tout le reste, et tous les échecs)
 *
 * ── POURQUOI UN COMPOSANT CLIENT ──────────────────────────────────────────────
 *
 * Pour `onError`. Un service de logos répond 404 pour un domaine qu'il ne connaît
 * pas, et rien côté serveur ne peut le prévoir : il faudrait interroger le service
 * au rendu de chaque ligne. Sans ce gestionnaire, une ligne afficherait l'icône
 * d'image brisée du navigateur — pire qu'un monogramme.
 *
 * Un composant client se rend sans difficulté depuis un composant serveur, ce que
 * font la moitié des douze consommateurs de ce composant.
 */

/**
 * Teinte de fond par famille de matière première.
 *
 * La couleur porte une information — la nature de la matière — que l'emoji seul ne
 * donnerait qu'au prix d'un examen attentif. Jetons de la palette de DONNÉES et non
 * d'interface : ces fonds identifient des catégories, ils ne signalent ni action ni
 * état, et la palette d'interface doit rester réservée à ce qui se clique.
 */
const FAMILY_TINT: Record<CommodityFamily, string> = {
  precious: 'bg-accent-soft',
  industrial: 'bg-surface-muted',
  energy: 'bg-brand-soft',
  agricultural: 'bg-up-soft',
}

/**
 * Clé du service de logos — FACULTATIVE, et publique par conception.
 *
 * Sans elle, actions et ETF affichent leur monogramme : c'est un chemin normal, pas
 * un mode dégradé, et rien d'autre ne change dans la page. Voir `logoUrl` pour les
 * services sans clé qui ont été essayés, mesurés et écartés.
 *
 * Le préfixe `NEXT_PUBLIC_` est correct et non une négligence : la clé apparaît dans
 * l'URL de chaque image, donc dans le HTML servi. La cacher serait impossible, et le
 * service la délivre en connaissance de cause.
 *
 * Lue au niveau du module et non dans le composant : les variables `NEXT_PUBLIC_`
 * sont remplacées littéralement à la compilation, l'expression doit donc être écrite
 * en toutes lettres pour que le remplacement ait lieu.
 */
const LOGO_TOKEN = process.env.NEXT_PUBLIC_LOGO_API_KEY

export interface AssetLogoProps {
  /**
   * Typé par les champs RÉELLEMENT LUS, et non par `MarketAsset` entier.
   *
   * C'est ce qui permet d'afficher aussi le logo d'un `TrendingAsset`, plus pauvre
   * par conception puisque sa source ne publie ni prix ni devise. Exiger un type
   * complet pour en lire quatre propriétés obligerait à fabriquer un actif factice.
   */
  asset: Pick<MarketAsset, 'symbol'> &
    Partial<Pick<MarketAsset, 'image' | 'name' | 'assetClass'>>
  size?: number
}

export function AssetLogo({ asset, size = 24 }: AssetLogoProps) {
  const [failed, setFailed] = useState(false)

  const label = monogram(asset.name ?? '', asset.symbol)

  // ── 1. Image fournie par la source ────────────────────────────────────────
  if (asset.image && !failed) {
    return (
      <Image
        src={asset.image}
        alt=""
        width={size}
        height={size}
        className="shrink-0 rounded-none"
        onError={() => setFailed(true)}
      />
    )
  }

  const entry = findUniverseEntryBySymbol(asset.symbol)

  // ── 2. Matière première : emoji dans une pastille teintée ─────────────────
  if (entry?.emoji) {
    return (
      <span
        className={`flex shrink-0 items-center justify-center ${
          entry.family ? FAMILY_TINT[entry.family] : 'bg-surface-muted'
        }`}
        style={{ width: size, height: size, fontSize: Math.round(size * 0.58) }}
        aria-hidden="true"
      >
        {entry.emoji}
      </span>
    )
  }

  // ── 3. Action ou ETF : logo de l'émetteur, par son domaine ────────────────
  const isCompany = asset.assetClass === 'stock' || asset.assetClass === 'etf'
  if (isCompany && entry?.domain && LOGO_TOKEN && !failed) {
    return (
      <Image
        src={logoUrl(entry.domain, size)}
        alt=""
        width={size}
        height={size}
        className="shrink-0 rounded-none"
        // Le service sert déjà la taille demandée : le repasser par l'optimiseur de
        // Next ajouterait un aller-retour serveur sans rien gagner.
        unoptimized
        onError={() => setFailed(true)}
      />
    )
  }

  // ── 4. Monogramme — le repli de toutes les branches ───────────────────────
  return (
    <span
      className="flex shrink-0 items-center justify-center bg-brand-soft font-bold text-brand-strong"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.42) }}
      aria-hidden="true"
    >
      {label}
    </span>
  )
}

/**
 * URL du logo d'un domaine.
 *
 * ── POURQUOI PAS DE SERVICE SANS CLÉ ──────────────────────────────────────────
 *
 * Deux ont été essayés et mesurés, aucun ne convient :
 *
 *   · Clearbit Logo API — le service ne répond plus du tout (échec de connexion).
 *   · Favicons DuckDuckGo — répondent bien pour les 22 domaines suivis, mais 13
 *     d'entre eux ne fournissent qu'un 16×16, un JPEG de 417 octets ou un GIF de
 *     162 : affichées à 24 pixels, ces vignettes sont floues. Elles ont en outre
 *     produit un défaut plus grave, observé dans le navigateur — dix-huit requêtes
 *     tierces simultanées laissaient la plupart des lignes SANS RIEN, ni image ni
 *     monogramme, parce qu'une requête en attente ne déclenche pas `onError`.
 *
 * Un monogramme net vaut mieux qu'une vignette floue, et beaucoup mieux qu'une case
 * vide. Le logo distant n'est donc emprunté que si une clé est configurée, auquel
 * cas la qualité est garantie par le service.
 *
 * `size` est demandé au DOUBLE de la taille d'affichage : sur un écran à densité
 * élevée, une image servie à sa taille logique paraît floue.
 */
function logoUrl(domain: string, size: number): string {
  const params = new URLSearchParams({
    token: LOGO_TOKEN ?? '',
    size: String(size * 2),
    format: 'png',
  })
  return `https://img.logo.dev/${domain}?${params.toString()}`
}

/** Réexporté pour les appelants qui n'ont besoin que de l'initiale. */
export type { AssetClass }
