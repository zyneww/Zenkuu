/**
 * Pavage squarifié — l'algorithme, sans le dessin.
 *
 * ── POURQUOI IL EST SORTI DE `SectorHeatmap` ──────────────────────────────────
 *
 * Il y vivait, et il n'y avait qu'un appelant. Il en a désormais deux : la carte des
 * secteurs et celle des pièces, qui partagent la géométrie et rien d'autre — pas les
 * mêmes tuiles, pas les mêmes liens, pas la même légende. Une fonction pure de
 * `{ id, valeur }[]` vers `{ x, y, largeur, hauteur }[]` est exactement la frontière
 * entre les deux, et c'est aussi ce qui la rend testable sans monter un rendu.
 *
 * ── CE QUE « SQUARIFIÉ » VEUT DIRE ────────────────────────────────────────────
 *
 * L'algorithme de Bruls, Huizing et van Wijk empile les éléments dans une bande tant
 * que cela AMÉLIORE le pire rapport d'aspect de la bande, puis ferme la bande et
 * repart sur l'espace restant. C'est ce qui évite les rectangles filiformes d'un
 * découpage naïf — et un rectangle filiforme est un rectangle dont on ne peut pas lire
 * l'étiquette, donc une case perdue.
 *
 * Les coordonnées sont en POURCENTAGES du conteneur. C'est ce qui rend la figure
 * réactive sans une ligne de JavaScript : le navigateur redimensionne des `div`
 * positionnées en pourcentage, personne n'a rien à recalculer.
 */

export interface TreemapInput {
  id: string
  value: number
}

export interface TreemapBox {
  id: string
  x: number
  y: number
  width: number
  height: number
}

export function squarify(items: TreemapInput[]): TreemapBox[] {
  const total = items.reduce((sum, item) => sum + item.value, 0)
  if (total <= 0) return []

  const boxes: TreemapBox[] = []
  // Espace restant, en pourcentages.
  let x = 0
  let y = 0
  let width = 100
  let height = 100

  let remaining = [...items]
  let remainingValue = total

  /** Pire rapport d'aspect d'une bande, la mesure que l'algorithme minimise. */
  function worst(row: number[], side: number, scale: number): number {
    if (row.length === 0 || side === 0) return Infinity
    const sum = row.reduce((acc, value) => acc + value, 0)
    const area = sum * scale
    if (area === 0) return Infinity
    const max = Math.max(...row)
    const min = Math.min(...row)
    return Math.max(
      (side * side * max * scale) / (area * area),
      (area * area) / (side * side * min * scale),
    )
  }

  while (remaining.length > 0) {
    const horizontal = width >= height
    const side = horizontal ? height : width
    // Surface d'une unité de valeur dans l'espace restant.
    const scale = (width * height) / remainingValue

    const row: TreemapInput[] = []
    let rowValues: number[] = []

    while (remaining.length > 0) {
      const candidate = remaining[0] as TreemapInput
      const next = [...rowValues, candidate.value]
      if (row.length > 0 && worst(next, side, scale) > worst(rowValues, side, scale)) break
      row.push(candidate)
      rowValues = next
      remaining = remaining.slice(1)
    }

    const rowValue = rowValues.reduce((sum, value) => sum + value, 0)
    // Épaisseur de la bande : sa surface divisée par sa longueur.
    const thickness = (rowValue * scale) / side

    let offset = 0
    for (const item of row) {
      const share = rowValue > 0 ? item.value / rowValue : 0
      const length = share * side

      boxes.push({
        id: item.id,
        x: horizontal ? x : x + offset,
        y: horizontal ? y + offset : y,
        width: horizontal ? thickness : length,
        height: horizontal ? length : thickness,
      })

      offset += length
    }

    if (horizontal) {
      x += thickness
      width -= thickness
    } else {
      y += thickness
      height -= thickness
    }

    remainingValue -= rowValue
    // Garde-fou : sans elle, une valeur résiduelle nulle ferait diverger `scale`.
    if (remainingValue <= 0 || width <= 0.01 || height <= 0.01) break
  }

  return boxes
}

/*
 * ══════════════════════════════════════════════════════════════════════════════
 * `squarifyGrouped` A ÉTÉ RETIRÉ — IL N'Y A PLUS QU'UN PAVAGE
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Un second pavage existait ici : les groupes d'abord, leurs tuiles ensuite, chaque
 * secteur recevant son cadre et sa bande de titre. Il servait la carte du marché,
 * pendant que les collections NFT et les trésoreries utilisaient le pavage plat
 * ci-dessus — trois cartes thermiques sur le site, deux dessins.
 *
 * Le pavage groupé coûtait deux choses qu'aucune information ne compensait : les
 * bandes de titre et les marges de cadre reprenaient un bon quart d'une figure de
 * cinq cents pixels, et le rattachement des actifs à leur secteur était trop partiel
 * pour porter un groupement — la longue traîne finissait dans un « Autres » qui
 * devenait le plus gros groupe de la carte.
 *
 * La carte du marché est donc passée au pavage plat. Voir l'en-tête de
 * `MarketHeatmap` pour le détail de l'arbitrage.
 */

/** Au-delà de ce seuil, l'intensité de couleur sature. */
export const HEATMAP_CLAMP = 10

/**
 * SEUILS DE LA PALETTE, en pourcentage de variation.
 *
 * ── POURQUOI DES PALIERS, ET NON UN DÉGRADÉ CONTINU ──────────────────────────
 *
 * La teinte était calculée en continu : `intensity` variait de 0 à 1 et la couleur
 * avec elle. C'est fidèle à la donnée et mauvais à lire. Sur une figure de cent
 * tuiles, l'œil ne distingue pas un vert à 47 % d'un vert à 52 % — il voit « du
 * vert », c'est-à-dire l'information qu'un dégradé continu prétendait affiner.
 *
 * Cinq paliers par côté, comme TradingView : la question qu'on se pose devant une
 * carte thermique n'est pas « combien exactement » — le chiffre est dans la tuile —
 * mais « à quel point », et cinq degrés suffisent à y répondre d'un regard. Ils ont
 * surtout une propriété qu'aucun dégradé n'a : deux tuiles de même teinte sont
 * COMPARABLES, parce qu'elles appartiennent à la même tranche.
 *
 * Les bornes sont resserrées vers le bas (0,5 % puis 1,5 %) parce que c'est là que
 * vivent la plupart des journées : une échelle linéaire de 0 à 10 mettrait quatre
 * cinquièmes des tuiles dans le premier palier.
 */
const HEAT_STEPS = [0.5, 1.5, 3, 6] as const

/**
 * Teinte d'une tuile selon sa variation.
 *
 * `color-mix` plutôt qu'une échelle de teintes codée en dur : les deux couleurs
 * sémantiques suivent alors la bascule de thème sans une ligne de JavaScript.
 *
 * L'intensité est plafonnée à ±10 % : sans plafond, une tuile minuscule à +300 %
 * écraserait l'échelle et rendrait tout le reste uniformément pâle.
 */
export function heatTone(change: number | undefined): string {
  if (change === undefined) return 'var(--color-surface-muted)'

  const magnitude = Math.min(Math.abs(change), HEATMAP_CLAMP)

  /* Le palier est l'INDEX du premier seuil non franchi — 0 pour un mouvement à peine
     perceptible, 4 pour un mouvement extrême. Une variation nulle tombe donc dans le
     palier le plus pâle plutôt que dans le gris des valeurs absentes : elle EST une
     mesure, et la confondre avec une lacune serait faux. */
  const step = HEAT_STEPS.findIndex((threshold) => magnitude < threshold)
  const level = step === -1 ? HEAT_STEPS.length : step

  /*
   * ⚠️ LES JETONS DE REMPLISSAGE, ET NON CEUX DE TEXTE.
   *
   * `--color-up` et `--color-down` sont des couleurs de TEXTE, réglées pour se lire sur
   * le fond de la page. Les employer en aplat sous du texte blanc donnait un contraste
   * de 1,92:1 en thème sombre — illisible, le seuil étant de 4,5:1 pour des étiquettes
   * qui descendent à sept pixels. Le vert du thème sombre est en effet un vert CLAIR.
   *
   * `--color-heat-*` sont faits pour cet usage : voir leur note dans `globals.css`, qui
   * porte les mesures des quatre jetons et des deux retenus.
   */
  const base = change >= 0 ? 'var(--color-heat-up)' : 'var(--color-heat-down)'
  const dim = change >= 0 ? 'var(--color-heat-up-dim)' : 'var(--color-heat-down-dim)'

  /*
   * ══════════════════════════════════════════════════════════════════════════
   * LA PALETTE EST CELLE DE COINGECKO : SATURÉE, NON DÉLAVÉE
   * ══════════════════════════════════════════════════════════════════════════
   *
   * Les poids allaient de 14 % à 78 % : la couleur sémantique était mélangée au fond de
   * la figure, si bien que même le palier extrême restait un vert grisé. C'était
   * délibéré — s'accorder au reste du site — et c'est ce qui éloignait le plus nos
   * cartes de la référence, dont les tuiles sont d'un vert et d'un rouge FRANCS, à
   * pleine saturation.
   *
   * La différence n'est pas qu'esthétique. Sur une carte de cent tuiles, un aplat
   * saturé se distingue de son voisin à un palier d'écart ; un aplat délavé à 30 % ne
   * s'en distingue plus, et les cinq paliers cessent d'être lisibles — ce qui annule
   * l'intérêt d'avoir des paliers.
   *
   * De 45 % à 100 % en cinq crans. Le palier extrême est donc la couleur PLEINE,
   * exactement comme le « BTC +0,21 % » de la capture.
   *
   * ── LE SECOND TERME DU MÉLANGE EST UNE ANCRE, PLUS LE FOND ─────────────────
   *
   * Il valait `var(--color-surface)`, et c'était un défaut d'accessibilité mesuré : en
   * thème clair, la surface est presque blanche, si bien que le palier le plus pâle
   * donnait un vert d'eau sous du texte blanc — 1,92:1, contre 4,5:1 requis pour des
   * étiquettes de sept pixels.
   *
   * Les paliers se composent donc entre le ton PLEIN et le ton SOURD de la même
   * teinte, deux ancres fixes qui ne dépendent d'aucun thème. Le contraste tient sur
   * les cinq paliers et dans les deux thèmes — les mesures sont dans `globals.css`.
   *
   * Le plancher reste élevé (45 %) et non nul : une tuile à variation nulle doit se
   * lire comme « à peine verte » et non se confondre avec le gris des valeurs absentes,
   * qui signifie tout autre chose.
   */
  const weight = 45 + level * 13.75
  return `color-mix(in srgb, ${base} ${weight}%, ${dim})`
}

/** Les neuf teintes de l'échelle, du plus baissier au plus haussier — pour la légende. */
export function heatScaleSwatches(): string[] {
  const negatives = [...HEAT_STEPS].reverse().map((threshold) => heatTone(-threshold))
  const positives = HEAT_STEPS.map((threshold) => heatTone(threshold))
  return [heatTone(-HEATMAP_CLAMP), ...negatives, heatTone(0), ...positives]
}

/*
 * ══════════════════════════════════════════════════════════════════════════════
 * LA PALETTE CATÉGORIELLE A ÉTÉ RETIRÉE AVEC LE PAVAGE GROUPÉ
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * `categoryTone` et `categoryEdge` peignaient une teinte par groupe, la surface
 * portant seule la valeur. Elles n'avaient qu'un appelant — `GroupedTreemap` — et
 * disparaissent avec lui.
 *
 * Ce n'est pas une simple suppression de code mort : c'était le mode PAR DÉFAUT de la
 * carte du marché, et il cachait ce qu'une carte thermique sait faire de mieux. « De
 * quoi ce marché est-il fait » se lit dans un tableau de secteurs ; « qu'est-ce qui
 * monte » ne se lit que sur une carte colorée par la variation. Il ne reste donc
 * qu'une coloration sur tout le site, celle de `heatTone`.
 */

/**
 * ENCRE DES TUILES — blanche, parce qu'il n'y a plus qu'un fond.
 *
 * ── POURQUOI CE N'EST PLUS UNE FONCTION ──────────────────────────────────────
 *
 * `tileInk(colorMode)` rendait deux jeux d'encre pour deux palettes. La palette
 * catégorielle étant partie, la branche `'categorical'` — `text-ink` sur un aplat à
 * 10 % — n'a plus de fond correspondant : l'appliquer sur un aplat saturé donnerait
 * du texte sombre sur du vert soutenu.
 *
 * ── POURQUOI LA VALEUR N'EST PAS À DEMI-OPACITÉ ──────────────────────────────
 *
 * Elle l'a été, à 80 %, et c'était un défaut. Le palier le plus soutenu de la hausse
 * est `--color-heat-up` pur, qui ne tient que 5,02:1 avec du blanc PLEIN : il ne reste
 * aucune marge à dépenser en transparence. Mesuré sur les cinq paliers des deux sens :
 *
 * | opacité | pire contraste |
 * |---------|----------------|
 * | 80 %    | 3,82:1 ✗       |
 * | 85 %    | 4,09:1 ✗       |
 * | 90 %    | 4,41:1 ✗       |
 * | 100 %   | 5,02:1 ✓       |
 *
 * Le seuil qui compte est 4,5:1 : les étiquettes de tuile descendent à sept pixels,
 * donc la tolérance « grand texte » ne s'applique jamais ici. Aucune opacité ne
 * convient, et abaisser la palette reviendrait à défaire la saturation. La hiérarchie
 * passe donc par la TAILLE (la valeur fait la moitié de l'étiquette) et la GRAISSE
 * (`font-semibold` contre normal) — deux écarts qui ne coûtent rien en contraste.
 *
 * ⚠️ Trois valeurs visibles sur une page donnaient « 90 % suffit » (5,07:1). C'est un
 * échantillon, pas une borne : le pire palier n'était simplement pas à l'écran.
 */
export const TILE_INK = { label: 'text-white', value: 'text-white' } as const
