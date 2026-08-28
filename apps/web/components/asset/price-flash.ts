/**
 * ══════════════════════════════════════════════════════════════════════════════
 * LA TEINTE DU COURS SUIT LE TEXTE AFFICHÉ, PAS LE COURS BRUT
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * `LiveBinancePrice` allume brièvement le cours en vert ou en rouge à chaque tic — la
 * convention de tous les carnets d'ordres. La décision « allumer, et dans quel sens »
 * vit ICI, hors de React, pour une raison unique : c'est le seul endroit du geste où il
 * y a quelque chose à vérifier, et un fichier `.tsx` n'est pas importable par nos tests.
 *
 * ── LE DÉFAUT QUE CETTE FONCTION FERME ───────────────────────────────────────
 *
 * La comparaison portait sur le cours BRUT. Binance cote au dix-millième (2,7420 →
 * 2,7430) et l'affichage arrondit au centime : sur un actif à moins de dix dollars, la
 * quasi-totalité des tics tombent SOUS la précision affichée. Le nombre restait donc
 * « 2,71 » à l'écran pendant que la teinte clignotait en vert et en rouge derrière lui —
 * constaté sur la fiche Morpho.
 *
 * C'est le défaut le plus trompeur possible pour ce geste : il PROMET un mouvement et
 * n'en montre aucun, ce qui apprend au lecteur à ne plus le croire. La teinte n'a de sens
 * que si le chiffre qu'elle éclaire vient réellement de changer À L'ÉCRAN.
 *
 * ── DEUX VALEURS, DEUX RÔLES ─────────────────────────────────────────────────
 *
 * Le LIBELLÉ décide du déclenchement — il est ce que le lecteur voit. Le COURS décide du
 * SENS — lui seul est ordonné, « 2,75 $US » et « 2,74 $US » ne se comparent pas.
 *
 * Effet de bord voulu : un changement de devise reformate le libellé sans qu'aucun tic
 * n'arrive, et n'allume rien, puisque le cours brut n'a pas bougé.
 */

export interface PriceReading {
  /** Cours brut de la source, avant arrondi d'affichage. */
  price: number
  /** Le texte réellement rendu — devise et arrondi compris. */
  label: string
}

/**
 * Sens à signaler, ou `null` pour « n'allume rien ».
 *
 * `null` couvre trois cas : le premier relevé (pas de précédent), un libellé inchangé
 * (le mouvement est sous la précision affichée), et un cours identique (rien à signaler).
 */
export function flashDirection(
  before: PriceReading | null,
  next: PriceReading,
): 'up' | 'down' | null {
  if (before === null || before.label === next.label || before.price === next.price) return null
  return before.price < next.price ? 'up' : 'down'
}
