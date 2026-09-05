import type { MarketAsset } from '@zenkuu/data'

import { ChangeBadge } from '@/components/locale/ChangeBadge'
import { getPhrase } from '@/lib/content'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * PERFORMANCE DÉTAILLÉE — LE MÊME ACTIF LU CONTRE TROIS ÉTALONS
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * La forme vient de `dropstab.com/coins/…`, bloc « Detailed Performance » : une
 * matrice paires × fenêtres, une case par pourcentage.
 *
 * ── CE QU'ELLE AJOUTE AU RAIL, QUI PORTE DÉJÀ SIX VARIATIONS ─────────────────
 *
 * Le rail de gauche donne ces six fenêtres DANS LA DEVISE D'AFFICHAGE, et rien
 * d'autre. C'est la moitié de la question : un jeton qui gagne 3 % le jour où le
 * bitcoin en gagne 5 % monte en euro et DESCEND en bitcoin. La première lecture dit
 * combien on a gagné, la seconde dit si on a eu raison de détenir celui-ci plutôt
 * qu'un autre. Une seule ligne ne peut pas dire les deux.
 *
 * ── LES LIGNES D'ÉTALON SONT CALCULÉES, ET LE CALCUL EST EXACT ───────────────
 *
 * ⚠️ CE N'EST PAS UNE ESTIMATION, et la distinction vaut d'être écrite parce que le
 * §5 interdit précisément les nombres approchés présentés comme des mesures.
 *
 * Sur une même fenêtre et dans une même devise, si l'actif rend `rs` et l'étalon
 * `rb`, la paire actif/étalon rend exactement
 *
 *     (1 + rs) / (1 + rb) − 1
 *
 * C'est une IDENTITÉ, pas une approximation : le rapport de deux prix à la fin
 * divisé par le rapport des deux prix au début. Aucune interpolation, aucune
 * hypothèse sur ce qui s'est passé entre les deux bornes.
 *
 * Les trois conditions qui la rendent vraie sont réunies ici, et vérifiées avant de
 * rendre chaque case :
 *
 *   1. MÊME FENÊTRE — les deux pourcentages viennent du même champ (`change7d` contre
 *      `change7d`), donc du même intervalle chez la source.
 *   2. MÊME DEVISE — les comparables sont chargés dans la devise de la fiche.
 *   3. LES DEUX PUBLIÉS — une case dont l'un des deux manque n'est pas calculée. Elle
 *      affiche « — », et non un pourcentage tiré de la seule moitié connue.
 *
 * ── ET LA QUATRIÈME CONDITION, CELLE QUI FAIT SAUTER LE CALCUL ───────────────
 *
 * Un étalon qui aurait perdu exactement 100 % donnerait une division par zéro. Le cas
 * ne se produit pas sur le bitcoin, mais cette matrice servira d'autres étalons un
 * jour et une garde coûte une ligne — sans elle, la case sortirait « Infinity % ».
 *
 * ── POURQUOI 14 J ET 30 J PLUTÔT QUE LES 3 MOIS DE LA RÉFÉRENCE ─────────────
 *
 * Parce que ce sont les fenêtres que la source publie. `/coins/markets` renvoie 1 h,
 * 24 h, 7 j, 14 j, 30 j, 1 an — il n'y a pas de trimestre dedans. Le reconstituer
 * demanderait une année d'historique par étalon, à chaque rendu de fiche, sur un
 * quota mesuré à huit requêtes par minute.
 */

/** Les six fenêtres publiées par la source, dans l'ordre où elles se lisent. */
const FENETRES = [
  { cle: 'change1h', libelle: '1 h' },
  { cle: 'change24h', libelle: '24 h' },
  { cle: 'change7d', libelle: '7 j' },
  { cle: 'change14d', libelle: '14 j' },
  { cle: 'change30d', libelle: '30 j' },
  { cle: 'change1y', libelle: '1 an' },
] as const satisfies readonly { cle: keyof MarketAsset; libelle: string }[]

type CleFenetre = (typeof FENETRES)[number]['cle']

function lire(asset: MarketAsset, cle: CleFenetre): number | undefined {
  const valeur = asset[cle]
  return typeof valeur === 'number' && Number.isFinite(valeur) ? valeur : undefined
}

/**
 * Rendement de la paire `actif / étalon` sur une fenêtre — voir l'identité en tête.
 *
 * Rend `undefined` dès qu'une des deux mesures manque ou que l'étalon a perdu la
 * totalité de sa valeur : dans les deux cas il n'y a rien à afficher, et surtout rien
 * à deviner.
 */
export function ecartRelatif(
  rendementActif: number | undefined,
  rendementEtalon: number | undefined,
): number | undefined {
  if (rendementActif === undefined || rendementEtalon === undefined) return undefined
  const base = 1 + rendementEtalon / 100
  if (base === 0) return undefined
  return ((1 + rendementActif / 100) / base - 1) * 100
}

export async function AssetPerformanceMatrix({
  asset,
  benchmarks,
}: {
  asset: MarketAsset
  /** Étalons de comparaison, déjà chargés pour le panneau « Comparer » du graphique. */
  benchmarks: MarketAsset[]
}) {
  const t = await getPhrase()

  /* Les étalons ne servent qu'à des RAPPORTS : un étalon qui ne publie aucune des six
     fenêtres ne produirait qu'une ligne de tirets. Il est écarté ici plutôt que rendu
     vide — c'est la même règle que partout ailleurs sur la fiche. */
  const utilisables = benchmarks.filter(
    (etalon) => etalon.id !== asset.id && FENETRES.some(({ cle }) => lire(etalon, cle) !== undefined),
  )

  const lignes = [
    {
      cle: asset.id,
      paire: `${asset.symbol.toUpperCase()}/${asset.currency.toUpperCase()}`,
      valeurs: FENETRES.map(({ cle }) => lire(asset, cle)),
    },
    ...utilisables.map((etalon) => ({
      cle: etalon.id,
      paire: `${asset.symbol.toUpperCase()}/${etalon.symbol.toUpperCase()}`,
      valeurs: FENETRES.map(({ cle }) => ecartRelatif(lire(asset, cle), lire(etalon, cle))),
    })),
  ]

  /* La première ligne est l'actif lui-même : si elle est vide, la source ne publie
     aucune variation et il n'y a pas de matrice à montrer. */
  if (lignes[0]?.valeurs.every((valeur) => valeur === undefined)) return null

  /*
   * ⚠️ SANS ÉTALON, CETTE SECTION EST UN DOUBLON DU RAIL, ET ELLE PART.
   *
   * Mesuré au navigateur sur `/actions/aapl` : aucun des comparables d'une action
   * n'est un étalon (`BENCHMARK_OPTIONS` ne nomme que le bitcoin et l'ether). Il
   * restait une table d'UNE ligne — les six variations de l'actif dans sa devise —
   * surmontée d'un paragraphe qui annonçait « les suivantes », lesquelles n'existaient
   * pas. Or ces six valeurs sont exactement le bloc « Variations » du rail de gauche,
   * à deux écrans de là.
   *
   * La lecture relative est la SEULE chose que cette section apporte. Sans elle, il
   * n'y a rien à montrer que la page ne montre déjà mieux ailleurs.
   */
  if (utilisables.length === 0) return null

  return (
    <section aria-labelledby="perf-titre" className="space-y-3">
      <h2 id="perf-titre" className="display-sm text-ink">
        {t('Performance détaillée')}
      </h2>

      <p className="max-w-2xl text-xs leading-[1.425] text-ink-muted">
        {t(
          'La première ligne est la variation du cours dans la devise affichée. Les suivantes disent la même période lue CONTRE un étalon : positive, l’actif a fait mieux que lui ; négative, moins bien.',
        )}
      </p>

      {/* Le tableau déborde en dessous de six colonnes plus l'intitulé : il défile
          dans son propre cadre, jamais en poussant la page de côté. */}
      <div className="overflow-x-auto rounded-card border border-border-subtle bg-surface">
        <table className="w-full min-w-[34rem] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border-subtle">
              <th scope="col" className="px-4 py-2.5 text-left font-medium text-ink-muted">
                {t('Paire')}
              </th>
              {FENETRES.map(({ libelle }) => (
                <th
                  key={libelle}
                  scope="col"
                  className="px-4 py-2.5 text-right font-medium text-ink-muted"
                >
                  {t(libelle)}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {lignes.map((ligne) => (
              <tr key={ligne.cle} className="border-b border-border-subtle last:border-b-0">
                <th
                  scope="row"
                  className="tabular whitespace-nowrap px-4 py-2.5 text-left font-medium text-ink"
                >
                  {ligne.paire}
                </th>
                {ligne.valeurs.map((valeur, index) => (
                  <td
                    /* La colonne EST son rang : les six fenêtres sont fixes, ordonnées
                       et ne se réordonnent jamais. */
                    key={index}
                    className="px-4 py-2.5 text-right"
                  >
                    {valeur === undefined ? (
                      <span className="text-ink-muted">—</span>
                    ) : (
                      <ChangeBadge value={valeur} size="sm" />
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
