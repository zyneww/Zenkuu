/**
 * Lignes par palmarès — cinq, comme la référence.
 *
 * ⚠️ CE N'EST PAS UN RÉGLAGE D'AFFICHAGE, C'EST UNE MOITIÉ DE CLÉ DE CACHE.
 *
 * La clé de `getCryptoOverview` contient la devise ET cette limite. Trois appelants
 * la lisent — le tableau de l'accueil, la rangée de repères, les blocs du bas — et
 * deux valeurs différentes feraient DEUX appels réseau pour un univers identique :
 * cent actifs avec leurs courbes 7 jours, sur un quota gratuit qui n'en autorise
 * qu'une poignée par minute.
 *
 * Elle vivait dans `HomeWidgets`, qui n'existe plus. Un module à elle seule plutôt
 * qu'un domicile chez l'un des trois appelants : le prochain qui la déplacerait avec
 * son composant recréerait exactement le défaut que cette note décrit.
 */
export const ROWS = 5
