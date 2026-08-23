import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * LA PALETTE EST MESURÉE, ET CE FICHIER REFAIT LA MESURE
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * `globals.css` documente le contraste de chacun de ses jetons en commentaire. Un
 * commentaire ne casse pas quand la valeur qu'il décrit change : les ratios notés à
 * côté de l'ancienne palette bleue sont restés écrits pendant tout le temps où ils
 * étaient faux. Ce test lit les valeurs RÉELLES et les remesure — c'est la seule
 * forme de documentation de contraste qui ne puisse pas mentir.
 *
 * ── CE QU'IL VÉRIFIE, ET SELON QUEL SEUIL ───────────────────────────────────
 *
 * WCAG 2.1 AA, dans les deux thèmes :
 *   · texte normal      4,5:1   encre, encre atténuée, marque, accent, hausse, baisse
 *   · élément graphique 3:1     les six séries de la palette de données
 *
 * La marque est vérifiée DEUX FOIS, et c'est ce qui la contraint le plus : elle sert
 * de texte de lien SUR le canevas, et de fond plein SOUS `--color-on-brand`. Une
 * teinte qui passe l'un et rate l'autre rend les boutons pleins illisibles sans que
 * rien ne le signale à l'écran.
 *
 * ── CE QU'IL NE VÉRIFIE PAS ─────────────────────────────────────────────────
 *
 * Les jetons de chaleur (`--color-heat-*`) et le plateau des tuiles
 * (`--color-tile-ground`) ne basculent pas avec le thème et portent du texte blanc
 * imposé, pas l'encre du thème : ils ne forment donc aucune des paires ci-dessous.
 * Leurs contrastes sont notés dans `globals.css`, à côté du calcul qui les produit.
 */

const CSS = readFileSync(
  fileURLToPath(new URL('./globals.css', import.meta.url)),
  'utf8',
)

/**
 * Les deux jeux de jetons, lus de part et d'autre de la règle du thème sombre.
 *
 * Le bloc `@theme` porte le thème CLAIR (c'est la convention de Tailwind 4 : les
 * valeurs par défaut y vivent), et la règle `.dark` réassigne les mêmes noms. Couper
 * le fichier à cette règle suffit donc à séparer les deux — et une déclaration ajoutée
 * d'un côté sans son pendant de l'autre fait échouer ce test, ce qui est exactement le
 * rappel qu'on veut.
 *
 * La coupe est cherchée sur `\n.dark` et non sur `\n.dark {` : ce sélecteur est PARTAGÉ
 * avec `.nuit`, l'îlot sombre du pied de page, et s'écrit donc sur deux lignes. Le test
 * cherchait l'accolade, ne trouvait plus rien, coupait à l'index -1 et déclarait le
 * thème sombre vide — vingt assertions rouges pour une virgule.
 */
function tokensOf(source: string): Record<string, string> {
  const table: Record<string, string> = {}
  for (const match of source.matchAll(/^\s+(--color-[a-z0-9-]+):\s*(#[0-9a-fA-F]{6});/gm)) {
    table[match[1] as string] = (match[2] as string).toLowerCase()
  }
  return table
}

const split = CSS.indexOf('\n.dark')
const LIGHT = tokensOf(CSS.slice(0, split))
const DARK = tokensOf(CSS.slice(split))

/** Luminance relative, définition WCAG 2.1 §relative-luminance. */
function luminance(hex: string): number {
  const value = Number.parseInt(hex.slice(1), 16)
  const channels = [(value >> 16) & 255, (value >> 8) & 255, value & 255].map((byte) => {
    const c = byte / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }) as [number, number, number]
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]
}

function contrast(a: string, b: string): number {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number]
  return (high + 0.05) / (low + 0.05)
}

/** Paires « du texte de X posé sur Y », avec le seuil qui s'y applique. */
const PAIRS: readonly [foreground: string, background: string, minimum: number][] = [
  ['--color-ink', '--color-canvas', 4.5],
  ['--color-ink', '--color-surface', 4.5],
  ['--color-ink', '--color-panel', 4.5],
  ['--color-ink-muted', '--color-canvas', 4.5],
  ['--color-ink-muted', '--color-surface', 4.5],
  ['--color-ink-muted', '--color-surface-muted', 4.5],
  ['--color-brand', '--color-canvas', 4.5],
  ['--color-brand', '--color-surface', 4.5],
  ['--color-on-brand', '--color-brand', 4.5],
  ['--color-gold', '--color-canvas', 4.5],
  ['--color-up', '--color-canvas', 4.5],
  ['--color-down', '--color-canvas', 4.5],
  ['--color-status', '--color-canvas', 4.5],
  ['--color-data-1', '--color-canvas', 3],
  ['--color-data-2', '--color-canvas', 3],
  ['--color-data-3', '--color-canvas', 3],
  ['--color-data-4', '--color-canvas', 3],
  ['--color-data-5', '--color-canvas', 3],
  ['--color-data-6', '--color-canvas', 3],
]

describe.each([
  ['thème clair', LIGHT],
  ['thème sombre', DARK],
])('%s', (_theme, tokens) => {
  it('déclare les jetons que les paires de contraste mettent en jeu', () => {
    const needed = new Set(PAIRS.flatMap(([fg, bg]) => [fg, bg]))
    expect([...needed].filter((name) => !tokens[name])).toEqual([])
  })

  it.each(PAIRS)('%s sur %s atteint %f:1', (fg, bg, minimum) => {
    const foreground = tokens[fg]
    const background = tokens[bg]
    expect(foreground, `${fg} non déclaré`).toBeDefined()
    expect(background, `${bg} non déclaré`).toBeDefined()

    const ratio = contrast(foreground as string, background as string)
    /* Le ratio est reporté dans le message : un échec dit de combien on manque, ce
       qui suffit à corriger la teinte sans rouvrir un outil de mesure. */
    expect(
      Math.round(ratio * 100) / 100,
      `${fg} (${foreground}) sur ${bg} (${background})`,
    ).toBeGreaterThanOrEqual(minimum)
  })
})
