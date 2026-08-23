import type { AssetDetail } from '@zenkuu/data'
import { ChangeBadge } from '@zenkuu/ui'

/**
 * COURS EXPRIMÉ DANS UN ACTIF DE RÉFÉRENCE — « 0,00014951 BTC ».
 *
 * ── CE QUE CE CHIFFRE APPORTE QUE LE COURS EN EURO N'APPORTE PAS ──────────────
 *
 * La référence de marché l'affiche sous son cours principal, et ce n'est pas une
 * curiosité de trader : un actif crypto qui gagne 3 % le jour où le marché entier en
 * gagne 5 % a BAISSÉ par rapport à son marché. Le cours en euro ne le dit pas — il
 * mélange le mouvement de l'actif et celui de la classe entière. Le cours en bitcoin
 * isole le premier.
 *
 * ── C'EST UNE COTATION PUBLIÉE, PAS UNE DIVISION MAISON ───────────────────────
 *
 * `pricesByCurrency` porte le cours dans une soixantaine d'unités, crypto-devises
 * comprises, et il arrive dans la MÊME réponse que le cours en euro : ce badge ne
 * coûte aucun appel réseau.
 *
 * Il aurait été tentant de le calculer — `prix en euro ÷ prix du bitcoin en euro` —
 * et le résultat serait proche. Il serait aussi faux par construction : les deux
 * cours n'ont pas le même horodatage ni le même arrondi, et le quotient de deux
 * valeurs arrondies porte l'erreur des deux. La source publie le rapport, on le lit.
 *
 * ── LA RÉFÉRENCE CHANGE POUR LE BITCOIN LUI-MÊME ──────────────────────────────
 *
 * « 1,0000 BTC » sur la fiche du bitcoin n'apprend rien. Sa fiche prend donc l'ether
 * comme référence, ce qui rend le badge utile partout au lieu de le faire disparaître
 * sur la fiche la plus consultée du site.
 *
 * ── ET IL N'EXISTE QUE POUR LA CRYPTO ─────────────────────────────────────────
 *
 * Aucune autre classe n'a de référence interne évidente : rapporter une action au
 * bitcoin ne dirait rien d'elle, et Yahoo ne publie de toute façon pas de cours
 * croisés. Le badge disparaît, comme tout ce que la source ne renseigne pas.
 */

/** Unités de référence, par ordre de préférence. */
const BENCHMARKS = [
  { code: 'btc', label: 'BTC', selfId: 'bitcoin' },
  { code: 'eth', label: 'ETH', selfId: 'ethereum' },
] as const

export function AssetBenchmarkRatio({ asset }: { asset: AssetDetail }) {
  const prices = asset.pricesByCurrency
  if (!prices) return null

  // La première référence qui n'est pas l'actif lui-même : le bitcoin partout, l'ether
  // sur la fiche du bitcoin.
  const benchmark = BENCHMARKS.find(
    (entry) => entry.selfId !== asset.id && typeof prices[entry.code] === 'number',
  )
  if (!benchmark) return null

  const value = prices[benchmark.code] as number
  if (!Number.isFinite(value) || value <= 0) return null

  /*
   * ── LA VARIATION DANS CETTE MÊME UNITÉ, ET C'EST TOUT L'INTÉRÊT ────────────
   *
   * Le rapport seul dit « ce jeton vaut 0,0000041 BTC », un nombre qu'on ne sait pas
   * lire sans point de comparaison. La variation en bitcoin, elle, répond à la question
   * que le rapport pose : l'actif a-t-il fait mieux ou moins bien que son marché ?
   *
   * Elle n'est PAS déduite de la variation en euro — voir `changesByCurrency`. Absente,
   * la ligne se rend sans elle plutôt que d'afficher un chiffre calculé.
   */
  const change = asset.changesByCurrency?.[benchmark.code]

  return (
    <p className="tabular flex items-baseline gap-2 text-xs text-ink-muted">
      <span>
        <span className="font-medium text-ink">{formatRatio(value)}</span> {benchmark.label}
      </span>
      {typeof change === 'number' && Number.isFinite(change) ? (
        <ChangeBadge value={change} size="sm" periodLabel={`sur 24 heures en ${benchmark.label}`} />
      ) : null}
    </p>
  )
}

/**
 * Formatage à SIGNIFICATION constante, pas à décimales constantes.
 *
 * Les rapports couvrent une amplitude énorme : un jeton vaut 0,000000041 BTC, l'ether
 * en vaut 0,0296, et le bitcoin vaut 38 ETH. Un format à quatre décimales afficherait
 * « 0,0000 » pour le premier — un zéro qui ressemble à une donnée manquante.
 *
 * On fixe donc le nombre de chiffres SIGNIFICATIFS, ce que `maximumSignificantDigits`
 * fait exactement, et l'on garde une borne haute de décimales pour éviter la notation
 * scientifique sur les très petits rapports.
 */
function formatRatio(value: number): string {
  return new Intl.NumberFormat('fr-FR', {
    maximumSignificantDigits: 4,
    maximumFractionDigits: 10,
  }).format(value)
}
