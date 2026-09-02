import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { CATEGORY_ORDER, FILTER_CATEGORY, categoryOf } from './screener-categories'

/**
 * Ce test garde une chose que rien d'autre ne peut voir : la CORRESPONDANCE entre les
 * filtres déclarés par les marchés et la table qui les range en catégories.
 *
 * Les deux vivent dans des fichiers séparés, et rien dans les types ne les relie —
 * `FILTER_CATEGORY` est un dictionnaire de chaînes. Ajouter un filtre à un marché sans
 * lui donner de catégorie ne lève donc rien : il tombe silencieusement dans le repli,
 * et se retrouve rangé sous « Classement » alors qu'il mesure un volume.
 *
 * Le défaut ne se voit qu'à l'écran, sur le bon marché, dans la bonne catégorie
 * dépliée. Autant dire jamais.
 */
describe('catégories du screener', () => {
  /*
   * ⚠️ LES CLÉS SONT LUES DANS LE FICHIER SOURCE, PAS IMPORTÉES.
   *
   * `screener-markets.ts` importe `@/lib/asset-routes`, et le projet n'a pas de
   * configuration Vitest qui résolve l'alias `@/` : l'import lève « Cannot find
   * package ». Ajouter cette configuration pour un seul test toucherait la façon dont
   * les quarante-trois autres s'exécutent.
   *
   * `palette.test.ts` a déjà rencontré ce mur et l'a franchi de la même façon : il lit
   * `globals.css` et en extrait les jetons. On lit donc la source et on y cherche les
   * déclarations de clé.
   *
   * La lecture textuelle a un défaut connu — elle ne voit pas une clé construite
   * dynamiquement. Il n'y en a aucune dans ce fichier, et il n'y a pas de raison qu'il
   * y en ait : ces clés servent d'identité à des filtres, pas de valeurs calculées.
   */
  const source = readFileSync(
    fileURLToPath(new URL('./screener-markets.ts', import.meta.url)),
    'utf8',
  )
  const clefsDeclarees = [
    ...new Set([...source.matchAll(/\bkey:\s*'([A-Za-z0-9_]+)'/g)].map((m) => m[1] as string)),
  ].sort()

  it('trouve bien des clés à vérifier', () => {
    // Sans cette assertion, une expression régulière qui cesserait de correspondre
    // ferait passer tous les autres cas sur une liste VIDE — un test vert qui ne
    // teste rien, ce qui est pire qu'un test rouge.
    expect(clefsDeclarees.length).toBeGreaterThan(20)
  })

  it('range chaque filtre déclaré par un marché', () => {
    const orphelines = clefsDeclarees.filter((key) => FILTER_CATEGORY[key] === undefined)
    expect(
      orphelines,
      `Ces filtres tomberaient dans le repli « classification » : ${orphelines.join(', ')}`,
    ).toEqual([])
  })

  it('ne range aucune clé qui n’existe plus', () => {
    // Le sens inverse : une clé retirée d'un marché laisse une ligne morte dans la
    // table, et la prochaine personne croit que le filtre existe encore.
    const declarees = new Set(clefsDeclarees)
    const fantomes = Object.keys(FILTER_CATEGORY).filter((key) => !declarees.has(key))
    expect(
      fantomes,
      `Ces clés sont rangées mais plus déclarées nulle part : ${fantomes.join(', ')}`,
    ).toEqual([])
  })

  it('n’emploie que des catégories connues', () => {
    const connues = new Set(CATEGORY_ORDER)
    const inconnues = Object.entries(FILTER_CATEGORY)
      .filter(([, categorie]) => !connues.has(categorie))
      .map(([key]) => key)
    expect(inconnues).toEqual([])
  })

  it('replie sur « classification » une clé inconnue', () => {
    // Le repli est délibéré, et cette assertion le fige : « classification » ouvre le
    // panneau, donc un filtre oublié se VOIT au lieu de disparaître au fond d'un
    // groupe replié. Changer ce repli pour « events » — vide, donc masqué — ferait
    // disparaître le filtre sans que personne ne s'en aperçoive.
    expect(categoryOf('grandeur-qui-nexiste-pas')).toBe('classification')
  })
})
