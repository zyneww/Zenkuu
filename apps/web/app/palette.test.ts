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
 *
 * ── LES ÉCARTS ASSUMÉS ──────────────────────────────────────────────────────
 *
 * Quatre couples du thème CLAIR passent sous 4,5:1 et y restent, sur décision de
 * l'exploitant prise le 2026-08-30 : ce sont les teintes de CoinGecko elles-mêmes,
 * relevées sur leur site en direct, et le mandat du projet est la fidélité.
 *
 *   --color-brand / --color-canvas    1,61:1   azur de survol sur le canevas
 *   --color-brand / --color-surface   1,54:1   le même, sur la surface
 *   --color-up    / --color-canvas    3,15:1   rgb(0, 168, 62)  — 310 occurrences
 *   --color-down  / --color-canvas    3,56:1   rgb(255, 58, 51) —  90 occurrences
 *
 * ── LE COUPLE QUI EST SORTI D'ICI ───────────────────────────────────────────
 *
 * `--color-on-brand / --color-brand` figurait dans cette liste à 2,11:1 : du BLANC
 * sur le vert de CoinGecko, leur propre défaut d'accessibilité, repris par fidélité.
 * L'exploitant a demandé le 2026-09-01 de remplacer ce vert par l'azur #91d7e3.
 * Cet azur est PLUS CLAIR que le vert : le même blanc y serait tombé à 1,6:1, sur
 * les appels à l'action les plus visibles du site. La fidélité n'est plus en jeu —
 * la teinte n'est plus celle de CoinGecko —, donc rien ne justifiait de traîner
 * l'écart. `--color-on-brand` est passé à l'encre sombre #0a2429 : 10,05:1, et le
 * couple est retourné dans `PAIRS`, où le test l'exige désormais au-dessus de 4,5:1.
 *
 * Les deux premiers couples, eux, restent des écarts : la marque sert encore de
 * texte de SURVOL sur le canevas, et l'azur y est plus faible que le vert ne l'était.
 * Leur plancher a été réajusté sur la mesure du jour, pas relevé.
 *
 * CE N'EST PAS UNE DÉROGATION SILENCIEUSE, et le seuil AA n'est pas abaissé d'un
 * dixième. Ces couples QUITTENT `PAIRS` pour `ECARTS`, où leur ratio mesuré est
 * ÉPINGLÉ : toute dégradation ultérieure échoue encore. Et si une teinte finit par
 * repasser AA, le test échoue AUSSI — pour forcer le retrait de l'écart devenu
 * inutile, plutôt que le laisser pourrir en dérogation permanente.
 *
 * Atténuation réelle : le signe (+/−) et la flèche portent déjà le sens de la
 * variation, donc WCAG 1.4.1 (information par la couleur seule) reste satisfait ;
 * seul 1.4.3 (contraste) échoue. Le thème sombre, lui, passe intégralement.
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
  ['--color-ink', '--color-surface-hover', 4.5],
  ['--color-ink-muted', '--color-surface-hover', 4.5],
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

/* Les couples que l'exploitant a choisi de garder sous le seuil AA, avec le ratio
   mesuré le jour de la décision. Le plancher n'est PAS un seuil affaibli : c'est un
   repère de non-régression. Voir « LES ÉCARTS ASSUMÉS » en tête de fichier. */
const ECARTS: Record<string, readonly [foreground: string, background: string, plancher: number][]> = {
  'thème clair': [
    ['--color-brand', '--color-canvas', 1.61],
    ['--color-brand', '--color-surface', 1.54],
    ['--color-up', '--color-canvas', 3.15],
    ['--color-down', '--color-canvas', 3.56],
  ],
  'thème sombre': [],
}

const AA_TEXTE = 4.5

describe.each([
  ['thème clair', LIGHT],
  ['thème sombre', DARK],
])('%s', (theme, tokens) => {
  const ecarts = ECARTS[theme as string] ?? []
  const clef = (fg: string, bg: string) => `${fg}|${bg}`
  const exclus = new Set(ecarts.map(([fg, bg]) => clef(fg, bg)))
  const paires = PAIRS.filter(([fg, bg]) => !exclus.has(clef(fg, bg)))

  it('déclare les jetons que les paires de contraste mettent en jeu', () => {
    const needed = new Set([...PAIRS, ...ecarts].flatMap(([fg, bg]) => [fg, bg]))
    expect([...needed].filter((name) => !tokens[name])).toEqual([])
  })

  it.each(paires)('%s sur %s atteint %f:1', (fg, bg, minimum) => {
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

  /* `it.each` sur un tableau vide lèverait : le thème sombre n'a aucun écart. */
  if (ecarts.length > 0) {
    it.each(ecarts)('%s sur %s tient son écart assumé de %f:1', (fg, bg, plancher) => {
      const ratio = contrast(tokens[fg] as string, tokens[bg] as string)
      const arrondi = Math.round(ratio * 100) / 100

      expect(
        arrondi,
        `${fg} (${tokens[fg]}) sur ${bg} (${tokens[bg]}) s'est DÉGRADÉ sous l'écart ` +
          `assumé le 2026-08-30. Un écart connu ne doit jamais empirer.`,
      ).toBeGreaterThanOrEqual(plancher)

      expect(
        arrondi,
        `${fg} sur ${bg} atteint désormais ${arrondi}:1 et passe AA. L'écart n'a plus ` +
          `lieu d'être : retire ce couple d'ECARTS et remets-le dans PAIRS.`,
      ).toBeLessThan(AA_TEXTE)
    })
  }
})
