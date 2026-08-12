/**
 * Monogramme d'un actif — le repli quand aucune image n'est disponible.
 *
 * ── LE DÉFAUT QU'IL CORRIGE ───────────────────────────────────────────────────
 *
 * Le code précédent faisait `symbol.slice(0, 3)`, ce qui donnait « AAP » pour Apple
 * et « MSF » pour Microsoft : des fragments de ticker que personne ne reconnaît. Un
 * ticker est un identifiant de cotation, pas un nom — le tronquer ne produit pas une
 * abréviation, seulement un début de mot arbitraire.
 *
 * Le monogramme se prend donc sur le NOM : « Ap », « MP » pour Meta Platforms. Deux
 * caractères et non trois, parce qu'au-delà la pastille devient illisible aux tailles
 * où elle est utilisée (24 et 32 pixels).
 *
 * Fonction pure et fichier séparé : c'est la seule logique de tout le rendu d'icône,
 * et elle a des cas limites (paires de devises, ponctuation, nom absent) qui se
 * vérifient bien plus facilement ici qu'à travers un composant.
 */

/** Repli ultime : ni nom ni symbole exploitables. Jamais rendu en pratique. */
const PLACEHOLDER = '—'

export function monogram(name: string, symbol: string): string {
  /*
   * Les paires de devises d'abord, car elles échappent à toute la logique qui suit.
   * C'est la CONTREPARTIE qui distingue les lignes d'un tableau de change : sans
   * cette règle, EUR/USD et EUR/GBP afficheraient le même « Eu », et la colonne
   * entière deviendrait indistincte.
   */
  if (symbol.includes('/')) {
    const counterpart = symbol.split('/')[1]
    if (counterpart) return counterpart.toUpperCase()
  }

  const words = letterGroups(name)

  /* Deux mots ou plus : leurs initiales. « Meta Platforms » → « MP ». */
  if (words.length >= 2) {
    return (words[0]![0]! + words[1]![0]!).toUpperCase()
  }

  /* Un seul mot : capitale puis minuscule — « Ap » et non « AP », qui se lirait
     comme un sigle alors que c'est une abréviation de nom. */
  const single = words[0]
  if (single) {
    return single.length >= 2
      ? single[0]!.toUpperCase() + single[1]!.toLowerCase()
      : single[0]!.toUpperCase()
  }

  /*
   * Nom absent : le symbole prend le relais, MAIS en capitales — « BT » et non
   * « Bt ». Un symbole EST un sigle, contrairement à un nom : le rendre en casse
   * de nom le ferait lire comme un mot.
   */
  const fromSymbol = letterGroups(symbol).join('')
  if (fromSymbol) return fromSymbol.slice(0, 2).toUpperCase()

  return PLACEHOLDER
}

/**
 * Extrait les suites de lettres consécutives, en ignorant tout le reste.
 *
 * Découper sur une liste de séparateurs ne suffit pas : il faudrait la tenir à jour
 * pour chaque signe rencontré, et les noms réels en apportent régulièrement de
 * nouveaux — « L’Oréal » (apostrophe typographique), « S&P 500 » (esperluette et
 * chiffres), « Berkshire Hathaway Inc. » (point). Prendre les groupes de lettres
 * traite tous ces cas d'un coup, y compris ceux qu'on n'a pas prévus.
 *
 * `\p{L}` et non `[A-Za-z]` : « Élan » et « Ørsted » commencent par une lettre, et
 * une classe ASCII les rejetterait — leur monogramme retomberait alors sur le
 * symbole. Exige le drapeau `u`.
 */
function letterGroups(value: string): string[] {
  return value.match(/\p{L}+/gu) ?? []
}
