'use client'

import Image from 'next/image'
import { useState } from 'react'

import { monogram } from '@/components/asset/monogram'

/**
 * Icône d'une place de cotation — la vignette posée devant « Binance », « Kraken »…
 *
 * ── POURQUOI UN COMPOSANT ET NON UN `<img>` DANS LE TABLEAU ───────────────────
 *
 * Pour `onError`, comme `AssetLogo` dont ce composant reprend la structure. Les URL
 * d'images de la source expirent ou changent de chemin sans prévenir ; sans ce
 * gestionnaire, une ligne afficherait l'icône d'image brisée du navigateur, ce qui
 * est pire qu'un monogramme dans un tableau qui en compte cent.
 *
 * Le repli est le MÊME que celui des actifs : les deux initiales sur un aplat de
 * marque. Une place sans logo se lit donc comme un actif sans logo, et non comme une
 * case vide qu'on prendrait pour un défaut de chargement.
 *
 * ── POURQUOI PAS LA FAVICON DU LIEN SORTANT ───────────────────────────────────
 *
 * Chaque ligne porte déjà un `tradeUrl`, dont on pourrait tirer le domaine et
 * demander la favicon à un service tiers. Deux raisons de ne pas le faire : cela
 * enverrait à ce tiers la liste des plateformes consultées par le lecteur, et les
 * favicons mesurées sur ces domaines sont des vignettes de 16 pixels — floues à la
 * taille d'affichage. Le constat est le même que celui consigné dans `AssetLogo`.
 */
export function ExchangeLogo({
  name,
  src,
  size = 18,
}: {
  name: string
  /** URL du logo, quand la jointure avec le palmarès des places a abouti. */
  src?: string | undefined
  size?: number
}) {
  const [failed, setFailed] = useState(false)

  if (src && !failed) {
    return (
      <Image
        src={src}
        alt=""
        width={size}
        height={size}
        className="shrink-0 rounded-pill"
        onError={() => setFailed(true)}
      />
    )
  }

  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-pill bg-brand-soft font-bold text-brand-strong"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.42) }}
      aria-hidden="true"
    >
      {monogram(name, name)}
    </span>
  )
}
