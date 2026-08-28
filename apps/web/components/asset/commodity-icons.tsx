/**
 * ══════════════════════════════════════════════════════════════════════════════
 * PICTOGRAMMES DE MATIÈRES PREMIÈRES, REPRIS DE DROPSTAB
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── CE QUE C'EST, ET D'OÙ ÇA VIENT ───────────────────────────────────────────
 *
 * Ce sont les vignettes que DropsTab affiche sur ses fiches de matières premières
 * (`dropstab.com/coins/gold-metal`, `…/silver-metal`, `…/platinum-metal`…), demandées
 * explicitement comme référence. Chacune est un carré plein d'une teinte propre à la
 * matière, portant un glyphe blanc — trois lingots empilés pour les métaux précieux,
 * trois barres pour le cuivre, une goutte pour le pétrole, une flamme pour le gaz.
 *
 * ── POURQUOI ELLES SONT RECOPIÉES ICI PLUTÔT QUE CHARGÉES ────────────────────
 *
 * Un `<img src="https://dropstab.com/…">` ferait dépendre chaque ligne de tableau
 * d'un domaine tiers : une requête par vignette, un point de panne de plus, et un
 * lien d'image chaud que rien ne garantit stable. Ces fichiers pèsent trois cents
 * octets ; les inscrire dans le paquet coûte moins qu'un aller-retour réseau.
 *
 * ── CE QUI EST COUVERT, ET CE QUI NE L'EST PAS ───────────────────────────────
 *
 * DropsTab ne publie de vignette que pour SIX des douze matières du catalogue : les
 * quatre métaux, le gaz naturel et le brut. Le blé, le maïs, le café, le sucre et le
 * cacao gardent donc le pictogramme dessiné maison (voir `COMMODITY_GLYPHS` dans
 * `glyphs.tsx`) — inventer une vignette « à la manière de » serait pire que de garder
 * deux familles, puisqu'elle ne ressemblerait ni à l'une ni à l'autre.
 *
 * ⚠️ LE WTI PORTE LA VIGNETTE DU BRENT. DropsTab ne cote que le Brent, et les deux
 * sont le même produit — du brut — à une qualité et un lieu de livraison près. La
 * goutte noire est donc juste pour les deux ; leur donner deux vignettes différentes
 * dirait un écart de NATURE qui n'existe pas.
 *
 * ── LES IDENTIFIANTS DE DÉGRADÉ SONT PRÉFIXÉS ────────────────────────────────
 *
 * Le fichier d'origine nomme son dégradé `paint0_linear`. Deux vignettes de brut dans
 * la même page — la ligne du tableau et la fiche — déclareraient deux fois le même
 * identifiant, et le second gagnerait silencieusement. Le préfixe `zk-` et le suffixe
 * du symbole rendent la collision impossible.
 */

/** Vignettes disponibles, par symbole Yahoo — voir `yahoo-universe.ts`. */
export const DROPSTAB_COMMODITY_ICONS: Record<string, React.ReactNode> = {
  /** Or — trois lingots empilés, doré. */
  'GC=F': (
    <>
      <path d="M0 0h18v18H0V0z" fill="#D69A00" />
      <path
        d="M4.156 9a.26.26 0 00-.217.107L2.215 11.68c-.096.143.024.32.217.32h6.135c.193 0 .313-.177.217-.32L7.06 9.107A.26.26 0 006.843 9H4.156zm7 0a.26.26 0 00-.217.107L9.215 11.68c-.096.143.024.32.217.32h6.136c.192 0 .312-.177.216-.32L14.06 9.107A.26.26 0 0013.843 9h-2.687zm-3.5-4a.26.26 0 00-.217.107L5.715 7.68c-.096.143.024.32.217.32h6.136c.192 0 .312-.177.216-.32L10.56 5.107A.26.26 0 0010.343 5H7.656z"
        fill="#fff"
      />
    </>
  ),
  /** Argent — mêmes lingots, gris froid. */
  'SI=F': (
    <>
      <path d="M0 0h18v18H0V0z" fill="#ADABB8" />
      <path
        d="M4.156 9a.26.26 0 00-.216.107L2.215 11.68c-.095.143.025.321.217.321h6.136c.192 0 .313-.178.217-.321L7.06 9.107A.26.26 0 006.844 9H4.156zm7 0a.26.26 0 00-.216.107L9.215 11.68c-.096.143.025.321.217.321h6.136c.192 0 .313-.178.217-.321L14.06 9.107A.26.26 0 0013.844 9h-2.688zm-3.5-4a.26.26 0 00-.216.107L5.715 7.68c-.095.143.025.321.217.321h6.136c.192 0 .313-.178.217-.321L10.56 5.107A.26.26 0 0010.345 5H7.656z"
        fill="#fff"
      />
    </>
  ),
  /** Platine — mêmes lingots, teinte sable. */
  'PL=F': (
    <>
      <path d="M0 0h18v18H0V0z" fill="#C2B8AB" />
      <path
        d="M4.156 9a.26.26 0 00-.216.107L2.215 11.68c-.095.143.025.321.217.321h6.136c.192 0 .313-.178.217-.321L7.06 9.107A.26.26 0 006.844 9H4.156zm7 0a.26.26 0 00-.216.107L9.215 11.68c-.096.143.025.321.217.321h6.136c.192 0 .313-.178.217-.321L14.06 9.107A.26.26 0 0013.844 9h-2.688zm-3.5-4a.26.26 0 00-.216.107L5.715 7.68c-.095.143.025.321.217.321h6.136c.192 0 .313-.178.217-.321L10.56 5.107A.26.26 0 0010.345 5H7.656z"
        fill="#fff"
      />
    </>
  ),
  /** Cuivre — trois barres, teinte cuivrée. */
  'HG=F': (
    <>
      <path d="M0 18h18V0H0v18z" fill="#C26A44" />
      <path
        d="M4.445 12.543h3.058V9.486H4.445v3.059-.002zm6.051 0h3.058V9.486h-3.058v3.059-.002zM7.503 7.52h2.993V4.528H7.503V7.52z"
        fill="#fff"
        stroke="#fff"
        strokeLinejoin="round"
      />
    </>
  ),
  /** Gaz naturel — flamme blanche sur bleu. */
  'NG=F': (
    <>
      <path d="M0 0h18v18H0V0z" fill="#42A5F5" />
      <path
        d="M11.934 6.043c0 .083-.267 1.756-1.07 2.443C11.939 4.976 9.004 3 9.004 3S8.55 5.608 7.667 6.593c-.05-1.123-.67-1.81-.67-1.81C6.553 6.813 5 8.569 5 9.884 4.996 12.167 6.78 14 9 14c2.216 0 4-1.833 4-4.116 0-1.645-.45-2.85-1.066-3.84z"
        fill="#fff"
      />
    </>
  ),
  /** Brent — goutte blanche sur noir dégradé. */
  'BZ=F': (
    <>
      <path fill="url(#zk-oil-bz)" d="M0 0h18v18H0z" />
      <path d="M12.5 10c0 2.2-1.575 4-3.5 4s-3.5-1.8-3.5-4S9 3 9 3s3.5 4.8 3.5 7z" fill="#fff" />
      <defs>
        <linearGradient
          id="zk-oil-bz"
          x1="3.349"
          y1="3.122"
          x2="21.904"
          y2="24.434"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#1A1E21" />
          <stop offset="1" stopColor="#06060A" />
        </linearGradient>
      </defs>
    </>
  ),
  /** WTI — même goutte que le Brent, voir la note d'en-tête. */
  'CL=F': (
    <>
      <path fill="url(#zk-oil-cl)" d="M0 0h18v18H0z" />
      <path d="M12.5 10c0 2.2-1.575 4-3.5 4s-3.5-1.8-3.5-4S9 3 9 3s3.5 4.8 3.5 7z" fill="#fff" />
      <defs>
        <linearGradient
          id="zk-oil-cl"
          x1="3.349"
          y1="3.122"
          x2="21.904"
          y2="24.434"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#1A1E21" />
          <stop offset="1" stopColor="#06060A" />
        </linearGradient>
      </defs>
    </>
  ),
}

/**
 * La vignette d'une matière, découpée en pastille ronde.
 *
 * Le carré d'origine est RONDÉ ici, comme tous les logos du site — voir la note de
 * `AssetLogo` : les quatre références dessinent le logo d'un actif en disque, et une
 * seule vignette carrée dans une colonne de ronds se voit immédiatement.
 */
export function DropstabCommodityIcon({
  symbol,
  size = 24,
}: {
  symbol: string
  size?: number
}) {
  const icon = DROPSTAB_COMMODITY_ICONS[symbol.toUpperCase()]
  if (!icon) return null

  return (
    <svg
      viewBox="0 0 18 18"
      width={size}
      height={size}
      className="shrink-0 rounded-pill"
      aria-hidden="true"
      focusable="false"
    >
      {icon}
    </svg>
  )
}
