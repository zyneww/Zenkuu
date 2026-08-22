'use client'

import Image from 'next/image'
import { useState } from 'react'

import type { AssetClass, MarketAsset } from '@zenkuu/data'
import { findUniverseEntryBySymbol, type CommodityFamily } from '@zenkuu/data'

import {
  COMMODITY_DRAWN,
  CommodityGlyph,
  CurrencyFlag,
  INDEX_FLAGGED,
  IndexGlyph,
  PairGlyph,
} from '@/components/asset/glyphs'
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
 *   2. paire de drapeaux                  (devises)
 *   3. pictogramme dessiné                (matières premières)
 *   4. drapeau + monogramme               (indices)
 *   5. logo par domaine                   (actions, ETF — exige une clé)
 *   6. monogramme                         (tout le reste, et tous les échecs)
 *
 * Les branches 2, 3 et 4 sont NOUVELLES et remplacent trois chemins qui tombaient
 * tous sur le monogramme. Voir `glyphs.tsx` pour ce qu'elles dessinent et pourquoi
 * elles sont écrites en SVG plutôt que servies en images.
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
        /* ROND. Les quatre références de ce site — OKX, CoinGecko, Token Terminal,
           Tokenomist — dessinent toutes le logo d'un actif en pastille circulaire,
           et c'est d'ailleurs le rayon le plus fréquent de la page d'OKX (50 %, 32
           occurrences relevées). Le carré hérité de l'époque « angles vifs partout »
           passait inaperçu sur les PNG CoinGecko, déjà ronds sur fond transparent,
           mais rendait carrés le monogramme de repli et la tuile des matières
           premières — deux formes closes que rien ne justifiait d'anguler. */
        className="shrink-0 rounded-pill"
        /* LES DEUX DIMENSIONS VERROUILLÉES, comme dans les branches 3, 4 et 6.
           `width`/`height` ne sont que les dimensions INTRINSÈQUES déclarées à Next ;
           le rendu, lui, reste soumis au conteneur. Dans une rangée flex — la moitié
           des appelants — `align-items: stretch` étirait la hauteur sans toucher la
           largeur, et Next avertissait sur chaque ligne des tableaux de /marches et
           /classements : « has either width or height modified, but not the other ».
           `shrink-0` ne couvre que l'axe principal et ne pouvait pas l'empêcher. */
        style={{ width: size, height: size }}
        onError={() => setFailed(true)}
      />
    )
  }

  const entry = findUniverseEntryBySymbol(asset.symbol)

  // ── 2. Devise : les drapeaux de la paire ──────────────────────────────────
  if (asset.assetClass === 'forex') {
    /*
     * Le symbole arrive sous plusieurs formes selon le chemin — « EUR/USD » depuis le
     * classement, « EURUSD » depuis certaines recherches. On retire tout ce qui n'est
     * pas une lettre puis on coupe en deux : les codes ISO 4217 font TOUS trois
     * lettres, ce découpage est donc exact et non une heuristique.
     */
    const letters = asset.symbol.replace(/[^A-Za-z]/g, '').toUpperCase()
    if (letters.length === 6) {
      return <PairGlyph base={letters.slice(0, 3)} quote={letters.slice(3)} size={size} />
    }
    if (letters.length === 3) {
      return <CurrencyFlag code={letters} size={size} />
    }
  }

  // ── 3. Matière première : pictogramme dessiné, ou l'émoji en repli ────────
  if (entry?.emoji || asset.assetClass === 'commodity') {
    const glyph = <CommodityGlyph symbol={asset.symbol} size={size} />
    if (COMMODITY_DRAWN.has(asset.symbol)) return glyph

    /* L'émoji SUBSISTE pour toute matière qu'aucun pictogramme ne couvre : ajouter une
       ligne au catalogue ne doit pas exiger d'ouvrir un éditeur vectoriel le même
       jour. La pastille teintée par famille reste, elle porte l'information de
       catégorie que le pictogramme ne donne pas. */
    if (entry?.emoji) {
      return (
        <span
          className={`flex shrink-0 items-center justify-center rounded-pill ${
            entry.family ? FAMILY_TINT[entry.family] : 'bg-surface-muted'
          }`}
          style={{ width: size, height: size, fontSize: Math.round(size * 0.58) }}
          aria-hidden="true"
        >
          {entry.emoji}
        </span>
      )
    }
  }

  // ── 4. Indice : drapeau de sa place, écusson du monogramme ────────────────
  if (asset.assetClass === 'index' && entry?.country) {
    const glyph = <IndexGlyph country={entry.country} label={label} size={size} />
    /* `IndexGlyph` rend `null` pour un pays absent de sa table. On ne peut pas le
       savoir avant de l'appeler, mais la table des drapeaux, elle, est consultable :
       le test porte donc sur elle plutôt que sur le résultat du rendu. */
    if (INDEX_FLAGGED.has(entry.country)) return glyph
  }

  // ── 5. Action ou ETF : logo de l'émetteur, par son domaine ────────────────
  const isCompany = asset.assetClass === 'stock' || asset.assetClass === 'etf'
  if (isCompany && entry?.domain && LOGO_TOKEN && !failed) {
    return (
      /*
       * PLAQUE CLAIRE SOUS LE LOGO, ET CE N'EST PAS UN ORNEMENT.
       *
       * Une marque déposée est dessinée pour UN fond, et c'est presque toujours le
       * blanc : celle d'Apple est noire sur transparent, celle de Sony aussi, et une
       * bonne moitié des dix-huit valeurs suivies sont dans ce cas. Posées directement
       * sur le fond sombre du site, elles disparaîtraient — repéré sur la fiche Apple
       * du comparateur, où le logo était bien chargé mais invisible.
       *
       * On ne peut pas le corriger par actif : le service ne dit pas si le fichier
       * qu'il sert est clair ou sombre, et l'inverser au filtre CSS dénaturerait les
       * marques en couleur. La plaque, elle, rend à chaque logo le fond pour lequel il
       * a été dessiné, sans rien supposer de son contenu.
       *
       * Elle reste BLANCHE dans les deux thèmes, pour la même raison : c'est une
       * propriété de l'image, pas de l'interface. Un cerne discret l'empêche de flotter
       * en thème clair, où elle se confondrait avec la page.
       */
      <span
        /* CARRÉ ADOUCI et non rond, à la différence des cryptoactifs ci-dessus : un
           logo d'entreprise servi par logo.dev est une marque cadrée au carré, dont
           un masque circulaire rognerait les angles — et souvent une lettre. */
        className="flex shrink-0 items-center justify-center rounded-control bg-white ring-1 ring-inset ring-black/5"
        style={{ width: size, height: size }}
      >
        <Image
          src={logoUrl(entry.domain, size)}
          alt=""
          width={size}
          height={size}
          /* Légèrement plus petit que la plaque : un logo qui touche les bords de son
             cadre paraît à l'étroit, et certains fichiers n'ont aucune marge propre. */
          className="h-[86%] w-[86%] object-contain"
          // Le service sert déjà la taille demandée : le repasser par l'optimiseur de
          // Next ajouterait un aller-retour serveur sans rien gagner.
          unoptimized
          onError={() => setFailed(true)}
        />
      </span>
    )
  }

  // ── 4. Monogramme — le repli de toutes les branches ───────────────────────
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-pill bg-brand-soft font-bold text-brand-strong"
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
