interface SparklineProps {
  values: number[] | undefined
  width?: number
  height?: number
  /** Description pour les lecteurs d'écran. */
  label: string
}

/**
 * Mini-graphique en SVG pur — UNE AIRE DÉGRADÉE SOUS UN TRAIT PLEIN.
 *
 * Aucune dépendance et aucun JavaScript côté client : le tracé est calculé au
 * rendu serveur. Sur un tableau de 250 lignes, une bibliothèque de graphiques
 * coûterait bien plus que le gain visuel (§9, Core Web Vitals).
 *
 * ── CE QUI A CHANGÉ, ET POURQUOI CE N'EST PAS DÉCORATIF ────────────────────
 *
 * C'était une POLYLIGNE NUE de 1,5 px. Relevé sur la référence (Cryptorank, colonne
 * « Price Graph (7D) ») : un trait de 2 px, et surtout une AIRE remplie sous lui,
 * dégradée de la couleur du trait vers le transparent en descendant.
 *
 * L'aire n'est pas un ornement — c'est ce qui rend la vignette lisible à 32 px de
 * haut. Un trait seul dans une case de tableau se lit comme une éraflure : l'œil doit
 * d'abord établir où est le bas du graphique avant de juger de la pente. L'aile
 * remplie donne cette base gratuitement, et c'est la raison pour laquelle toutes les
 * places de marché la dessinent.
 *
 * ── LES COULEURS VIENNENT DES JETONS DU SITE, PAS DE LA RÉFÉRENCE ──────────
 *
 * La référence code son vert en dur (#16C784). Le reprendre casserait le thème
 * sombre, où `--color-up` vaut un vert nettement plus clair pour rester lisible sur
 * fond noir. La FORME est copiée, la teinte reste celle du site — c'est le seul
 * arbitrage possible pour un site qui sert deux thèmes.
 *
 * ── L'IDENTIFIANT DU DÉGRADÉ EST DÉRIVÉ DU LIBELLÉ ────────────────────────
 *
 * Un `<linearGradient>` doit porter un `id`, et deux cents vignettes sur une même page
 * ne peuvent pas partager le même : le navigateur résout `url(#…)` sur le PREMIER
 * élément trouvé, et démonter cette première ligne — ce que fait la pagination à
 * chaque changement de page — laisserait les autres pointer vers un nœud disparu.
 *
 * `useId()` réglerait la question mais interdirait le rendu serveur : ce composant est
 * appelé depuis des composants SERVEUR (palmarès, grille de pairs), où les crochets
 * n'existent pas. Un condensé du libellé est déterministe des deux côtés de
 * l'hydratation, donc sans désaccord React, et le libellé est déjà unique par ligne
 * (« Évolution de Bitcoin »).
 */
export function Sparkline({ values, width = 120, height = 32, label }: SparklineProps) {
  if (!values || values.length < 2) {
    return <span className="text-xs text-ink-muted">—</span>
  }

  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min

  const first = values[0] as number
  const last = values[values.length - 1] as number
  const rising = last >= first

  /* MARGE D'UN PIXEL EN HAUT ET EN BAS. Sans elle, le sommet et le creux de la série
     tombent exactement sur le bord de la boîte, et le trait de 2 px y est coupé en
     deux — un aplatissement visible sur les séries les plus nerveuses. */
  const inset = 1
  const usable = height - inset * 2

  const y = (value: number) =>
    span === 0 ? height / 2 : inset + usable - ((value - min) / span) * usable

  const line = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)},${y(value).toFixed(2)}`
    })
    .join(' ')

  /* L'aire est le MÊME tracé, refermé sur la base de la boîte. Le rejouer point par
     point donnerait deux chemins qui peuvent diverger d'un arrondi ; le prolonger
     garantit que le remplissage épouse exactement le trait. */
  const area = `${line} L${width},${height} L0,${height} Z`

  const tone = rising ? 'var(--color-up)' : 'var(--color-down)'
  const gradientId = `zk-spark-${rising ? 'u' : 'd'}-${seed(label)}`

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={label}
      className="overflow-visible"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          {/* 0,45 et non 1 : la référence remplit avec une teinte PLUS CLAIRE que son
              trait, pas avec la même à pleine opacité. L'opacité produit le même effet
              en une seule couleur, et suit le thème sans seconde variable. */}
          <stop offset="0" stopColor={tone} stopOpacity="0.45" />
          <stop offset="1" stopColor={tone} stopOpacity="0" />
        </linearGradient>
      </defs>

      <path d={area} fill={`url(#${gradientId})`} stroke="none" />

      <path
        d={line}
        fill="none"
        stroke={tone}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}

/**
 * Condensé stable d'une chaîne — djb2, en base 36.
 *
 * Il ne sert qu'à distinguer les identifiants de dégradé : une collision entre deux
 * lignes rendrait deux vignettes IDENTIQUES en couleur, ce qui est sans conséquence.
 * On n'a donc besoin d'aucune propriété cryptographique, seulement d'un résultat
 * identique côté serveur et côté navigateur.
 */
function seed(label: string): string {
  let hash = 5381
  for (let index = 0; index < label.length; index += 1) {
    hash = ((hash << 5) + hash + label.charCodeAt(index)) | 0
  }
  return (hash >>> 0).toString(36)
}
