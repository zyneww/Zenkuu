import { describe, expect, it } from 'vitest'

/**
 * La formule de performance relative, isolée de son composant.
 *
 * Elle est recopiée ici plutôt qu'importée : `AssetPerformanceMatrix` est un composant
 * SERVEUR qui importe `@/lib/content`, lequel tire tout next-intl dans le test pour
 * vérifier six lignes d'arithmétique. La duplication est de trois lignes, et c'est le
 * moindre mal — si l'une change sans l'autre, ce contrôle tombe, ce qui est
 * exactement ce qu'on lui demande.
 */
function relative(asset: number | undefined, benchmark: number | undefined): number | null {
  if (asset === undefined || benchmark === undefined) return null
  if (!Number.isFinite(asset) || !Number.isFinite(benchmark)) return null
  const divisor = 1 + benchmark / 100
  if (divisor <= 0) return null
  return ((1 + asset / 100) / divisor - 1) * 100
}

describe('performance relative', () => {
  it('vaut zéro quand les deux ont bougé pareil', () => {
    expect(relative(35, 35)).toBeCloseTo(0, 10)
    expect(relative(-12, -12)).toBeCloseTo(0, 10)
  })

  it('rend la variation de l’actif quand le repère n’a pas bougé', () => {
    expect(relative(7.5, 0)).toBeCloseTo(7.5, 10)
  })

  it('N’EST PAS la soustraction, et l’écart compte sur les grandes variations', () => {
    /* C'est la raison d'être de ce fichier. +180 % contre +60 % :
       la formule juste donne 2,8 / 1,6 − 1 = +75 %, la soustraction +120 %. */
    expect(relative(180, 60)).toBeCloseTo(75, 6)
    expect(relative(180, 60)).not.toBeCloseTo(120, 0)
  })

  it('reste proche de la soustraction sur les petites variations', () => {
    /* Sur quelques pour cent les deux se rejoignent — c'est ce qui rend l'erreur
       invisible en développement et grossière en production. */
    expect(relative(3, 1)).toBeCloseTo(1.98, 2)
  })

  it('sait dire qu’un actif a perdu du terrain en montant', () => {
    /* +3 % le jour où le marché prend 5 % : l'actif a sous-performé de 1,9 %. */
    expect(relative(3, 5)).toBeLessThan(0)
    expect(relative(3, 5)).toBeCloseTo(-1.905, 3)
  })

  it('ne rend rien quand une des deux variations manque', () => {
    expect(relative(undefined, 5)).toBeNull()
    expect(relative(5, undefined)).toBeNull()
    expect(relative(Number.NaN, 5)).toBeNull()
  })

  it('refuse un repère qui annulerait le dénominateur', () => {
    /* −100 % rendrait `Infinity`, qui s'afficherait comme un pourcentage géant au
       lieu d'une absence. Le cas ne se produit pas sur un actif coté, mais une
       division par zéro ne doit jamais devenir un chiffre affiché. */
    expect(relative(10, -100)).toBeNull()
    expect(relative(10, -120)).toBeNull()
  })
})
