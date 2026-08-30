import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * LA COUCHE `--v2-*` EST INERTE, ET CE TEST L'Y OBLIGE
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Le sous-projet A pose des jetons et ne les consomme pas : son critère
 * d'achèvement est que le site soit INCHANGÉ à l'écran. Une classe `v2-` écrite par
 * inadvertance dans un composant romprait cette garantie sans que rien ne le
 * signale — la page rendrait simplement un peu différemment.
 *
 * Ce test tient aussi les deux documents alignés : un jeton posé dans la feuille de
 * style sans figurer dans DESIGN_SYSTEM.md est un jeton sans provenance, et un jeton
 * documenté mais absent de la feuille est une promesse non tenue.
 */

const CSS = readFileSync(
  fileURLToPath(new URL('./globals.css', import.meta.url)),
  'utf8',
)
const SYSTEME = readFileSync(
  fileURLToPath(new URL('../../../DESIGN_SYSTEM.md', import.meta.url)),
  'utf8',
)

const declares = [...CSS.matchAll(/^\s+(--v2-[a-z0-9-]+):/gm)].map((m) => m[1] as string)

describe('la couche de jetons --v2-*', () => {
  it('déclare au moins un jeton', () => {
    expect(declares.length).toBeGreaterThan(0)
  })

  it('ne déclare aucun jeton de couleur : la palette reste celle de ZENKUU', () => {
    expect(declares.filter((nom) => nom.startsWith('--v2-color-'))).toEqual([])
  })

  it('documente chaque jeton déclaré dans DESIGN_SYSTEM.md', () => {
    expect(declares.filter((nom) => !SYSTEME.includes(nom))).toEqual([])
  })

  it('déclare chaque jeton que DESIGN_SYSTEM.md promet', () => {
    const promis = [...new Set([...SYSTEME.matchAll(/`(--v2-[a-z0-9-]+)`/g)].map((m) => m[1] as string))]
    expect(promis.filter((nom) => !declares.includes(nom))).toEqual([])
  })
})

const DESIGN = readFileSync(
  fileURLToPath(new URL('../../../DESIGN.md', import.meta.url)),
  'utf8',
)

describe('l’échelle typographique de DESIGN.md', () => {
  /**
   * `impeccable` valide chaque taille du dépôt contre cette échelle. Le temps de la
   * migration, elle doit porter l'UNION des deux systèmes — sinon chaque taille
   * nouvelle est signalée comme un défaut et la file d'exceptions regonfle.
   */
  it('couvre toutes les tailles déclarées par la couche --v2-*', () => {
    const tailles = new Set(
      [...DESIGN.matchAll(/^\s{4}[a-z0-9-]+:\s*(\d+)px\s*$/gm)].map((m) => Number(m[1])),
    )
    const manquantes = [...CSS.matchAll(/^\s+--v2-text-[a-z0-9-]*:\s*([\d.]+)rem;/gm)]
      .map((m) => Math.round(Number(m[1]) * 16))
      .filter((px) => !tailles.has(px))
    expect([...new Set(manquantes)]).toEqual([])
  })
})
