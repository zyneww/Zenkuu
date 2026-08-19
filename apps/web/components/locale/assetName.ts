/**
 * Le nom d'un actif, traduit quand il nous appartient.
 *
 * ── LA DISTINCTION QUI COMPTE ────────────────────────────────────────────────
 *
 * « Bitcoin », « Apple Inc. », « iShares Core MSCI World » sont des NOMS : ils
 * viennent des sources et ne se traduisent pas — les traduire donnerait un actif
 * introuvable, et un titre de page qui ne correspond à rien de cherchable.
 *
 * Les paires de devises font exception, parce que ce nom-là est le NÔTRE :
 * `frankfurter.ts` compose « Euro / Dollar américain » à partir d'un libellé
 * français que la table de phrases porte déjà, devise par devise. On recompose
 * donc au rendu à partir des deux moitiés traduites, plutôt que d'ajouter trente
 * clés pour trente paires — et le séparateur reste le même dans les treize
 * langues, ce qui rend la recomposition sûre.
 */
export function assetName(
  name: string,
  assetClass: string,
  t: (text: string) => string,
): string {
  if (assetClass !== 'forex' || !name.includes(' / ')) return name
  return name
    .split(' / ')
    .map((part) => t(part))
    .join(' / ')
}
