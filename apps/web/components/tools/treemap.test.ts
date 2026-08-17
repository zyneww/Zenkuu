import { describe, expect, it } from 'vitest'

import { HEATMAP_CLAMP, TILE_INK, heatTone, squarify } from './treemap'

/**
 * Le pavage est désormais partagé par deux cartes thermiques, et il est purement
 * géométrique : c'est exactement le genre de code qu'on ne relit jamais et dont une
 * régression ne se voit qu'à l'œil, sur une figure, longtemps après.
 *
 * Les propriétés vérifiées ici sont celles dont dépend la LISIBILITÉ de la figure,
 * pas l'implémentation : la surface proportionnelle à la valeur, l'absence de
 * débordement, et le fait qu'une valeur plus grande occupe une surface plus grande.
 */
describe('squarify', () => {
  const sample = [
    { id: 'a', value: 100 },
    { id: 'b', value: 50 },
    { id: 'c', value: 25 },
    { id: 'd', value: 25 },
  ]

  it('rend une boîte par élément, dans l’ordre reçu', () => {
    const boxes = squarify(sample)
    expect(boxes.map((box) => box.id)).toEqual(['a', 'b', 'c', 'd'])
  })

  it('garde toutes les boîtes dans le conteneur', () => {
    for (const box of squarify(sample)) {
      expect(box.x).toBeGreaterThanOrEqual(0)
      expect(box.y).toBeGreaterThanOrEqual(0)
      expect(box.x + box.width).toBeLessThanOrEqual(100.01)
      expect(box.y + box.height).toBeLessThanOrEqual(100.01)
    }
  })

  it('donne à chaque boîte une surface proportionnelle à sa valeur', () => {
    const boxes = squarify(sample)
    const total = sample.reduce((sum, item) => sum + item.value, 0)

    for (const item of sample) {
      const box = boxes.find((candidate) => candidate.id === item.id)
      expect(box).toBeDefined()
      const area = (box as (typeof boxes)[number]).width * (box as (typeof boxes)[number]).height
      // 10 000 = 100 % × 100 %, la surface du conteneur.
      expect(area).toBeCloseTo((item.value / total) * 10_000, 1)
    }
  })

  it('rend une liste vide quand la somme est nulle', () => {
    expect(squarify([{ id: 'a', value: 0 }])).toEqual([])
    expect(squarify([])).toEqual([])
  })

  it('supporte un élément unique, qui occupe tout', () => {
    const [box] = squarify([{ id: 'seul', value: 42 }])
    expect(box?.width).toBeCloseTo(100, 1)
    expect(box?.height).toBeCloseTo(100, 1)
  })
})

/**
 * TEINTE D'UNE TUILE.
 *
 * ⚠️ LES ASSERTIONS PORTENT SUR `--color-heat-*` ET NON SUR `--color-up` / `--color-down`.
 *
 * Elles nommaient ces derniers, et le changement de jeton a fait tomber deux tests —
 * ce qui est exactement leur rôle. Le motif du changement compte plus que le nom :
 * `--color-up` est une couleur de TEXTE, réglée pour se lire sur le fond de la page.
 * Employée en aplat sous du texte blanc, elle donnait 1,92:1 en thème sombre, contre
 * 4,5:1 requis pour des étiquettes de sept pixels. Voir `globals.css` pour les mesures.
 *
 * Un test qui nomme `color-up` ici serait donc un test qui verrouille un défaut.
 */
describe('heatTone', () => {
  it('distingue une absence de variation d’une variation nulle', () => {
    // Une donnée absente prend la teinte neutre ; zéro reste sur l'échelle verte,
    // puisque `0 >= 0`. Confondre les deux ferait passer une lacune pour une stabilité.
    expect(heatTone(undefined)).toContain('surface-muted')
    expect(heatTone(0)).toContain('color-heat-up')
  })

  it('sature au-delà du plafond, dans les deux sens', () => {
    expect(heatTone(HEATMAP_CLAMP)).toBe(heatTone(HEATMAP_CLAMP * 30))
    expect(heatTone(-HEATMAP_CLAMP)).toBe(heatTone(-HEATMAP_CLAMP * 30))
  })

  it('sépare hausse et baisse', () => {
    expect(heatTone(5)).toContain('color-heat-up')
    expect(heatTone(-5)).toContain('color-heat-down')
  })

  /**
   * LE test que le défaut d'accessibilité a rendu nécessaire.
   *
   * Le mélange se faisait contre `--color-surface`, donc contre le fond de la page : en
   * thème clair, le palier le plus pâle devenait un vert d'eau illisible sous du texte
   * blanc. Les deux termes doivent être des ancres FIXES de la même teinte.
   */
  it('ne mélange jamais la teinte au fond de la page', () => {
    for (const change of [0, 0.4, 2, 5, 20, -0.4, -5, -20]) {
      const teinte = heatTone(change)
      expect(teinte, `variation ${change}`).not.toContain('color-surface')
      expect(teinte, `variation ${change}`).toContain('-dim')
    }
  })
})

/**
 * L'ENCRE DE TUILE — le second défaut de contraste, et il est d'une autre nature.
 *
 * Le premier tenait au FOND ; celui-ci tenait à l'opacité posée sur l'encre. Une
 * valeur à 80 % de blanc sur `--color-heat-up` pur donnait 3,82:1, là où le seuil est
 * de 4,5:1 — les étiquettes descendant à sept pixels, la tolérance « grand texte » ne
 * s'applique jamais ici.
 *
 * ── CE QUE CES TESTS NE VÉRIFIENT PLUS ───────────────────────────────────────
 *
 * Ils couvraient aussi l'appariement encre/fond entre deux palettes : du blanc sur les
 * aplats saturés de `heatTone`, de l'encre sombre sur ceux de `categoryTone`. La
 * palette catégorielle a été retirée avec le pavage groupé, et il ne reste qu'un fond.
 * Le risque qu'ils couvraient — une encre claire posée sur un aplat pâle — n'est plus
 * exprimable : `TILE_INK` est une constante, et `heatTone` est le seul fond.
 */
describe('TILE_INK', () => {
  it('pose du blanc sur les aplats saturés', () => {
    expect(TILE_INK.label).toBe('text-white')
    expect(TILE_INK.value).toContain('text-white')
  })

  /*
   * LE test que la seconde mesure a rendu nécessaire. `--color-heat-up` pur ne tient que
   * 5,02:1 avec du blanc PLEIN : il ne reste aucune marge pour une transparence. 80 %
   * donnait 3,82:1, et même 90 % échouait à 4,41:1. Une opacité ici est donc toujours un
   * défaut, quelle que soit sa valeur — d'où une assertion sur l'ABSENCE de suffixe et
   * non sur un seuil.
   */
  it('n’applique aucune opacité', () => {
    expect(TILE_INK.label).not.toContain('/')
    expect(TILE_INK.value).not.toContain('/')
  })

  /*
   * `ink-muted` est refusé explicitement : `globals.css` le documente comme ne portant
   * « jamais une valeur ». Le garde-fou survit à la suppression de la palette
   * catégorielle parce que la tentation, elle, survit : la valeur est la seconde voix
   * de la tuile, et `ink-muted` est le jeton qu'on attrape pour ça.
   */
  it('n’emploie pas ink-muted pour la valeur', () => {
    expect(TILE_INK.value).not.toContain('muted')
  })
})
