/**
 * ══════════════════════════════════════════════════════════════════════════════
 * LA GÉOMÉTRIE D'UNE LIGNE DU PANNEAU DE RECHERCHE, EN UN SEUL ENDROIT
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── POURQUOI UNE CONSTANTE POUR UNE CHAÎNE DE CLASSES ───────────────────────
 *
 * Elle était recopiée QUATRE fois — deux dans `SearchResults`, une dans
 * `SearchRecent`, une dans `SearchWatchlist`. Le panneau empile jusqu'à quatre
 * sections dont les lignes s'aboutent et se parcourent d'un seul mouvement : elles
 * doivent avoir la même hauteur, le même rembourrage et la même surbrillance, faute
 * de quoi la liste paraît cassée à la jointure des sections.
 *
 * Quatre copies rendent cette égalité invérifiable et sa rupture invisible. C'est
 * exactement ce qui est arrivé à la vignette de ligne : `AssetThumb` avait été extrait
 * pour la même raison, une TROISIÈME copie a été écrite sans le voir, et le défaut
 * qu'elle portait n'a été trouvé qu'à l'œil, sur un téléphone.
 *
 * ── LE SURVOL EST DÉJÀ TRANSITIONNÉ, ET IL NE FAUT PAS LE REDÉCLARER ICI ────
 *
 * Relevé le 2026-09-08 sur `app.uniswap.org`, panneau ouvert : leurs lignes portent
 * `transition: background-color, transform` en **0,125 s ease-in**.
 *
 * Ces lignes-ci portent `role="option"`, que cmdk pose. Elles tombent donc sous la
 * règle globale de `globals.css` qui donne à tout ce qui reçoit un geste une
 * transition de couleur en `--duration-state` (150 ms) et `--ease-standard`. Mesuré au
 * navigateur : `transition-duration` vaut bien `0.15s` sur ces lignes.
 *
 * ⚠️ 25 MS D'ÉCART AVEC LA RÉFÉRENCE, ET ON S'EN TIENT LÀ. J'ai d'abord ajouté ici
 * `duration-[125ms] ease-in`. Mesuré ensuite : SANS AUCUN EFFET. La règle globale
 * n'est pas dans une couche de cascade, et du CSS hors couche l'emporte sur toutes
 * les utilitaires Tailwind quel que soit l'ordre du fichier — la note de cette règle
 * affirmait le contraire, elle est corrigée là-bas.
 *
 * Les faire gagner demanderait de ranger la règle globale dans `@layer base`, ce qui
 * rendrait la main à TOUTES les classes `transition-*` du site d'un coup. C'est
 * peut-être juste, ce n'est pas une décision à prendre pour 25 ms sur une seule liste.
 *
 * ⚠️ ET LE `transform` DE LEUR TRANSITION N'EST PAS REPRIS. Chez eux la ligne fait
 * 80 px de haut pour un rayon de 20 px ; ici elle en fait 40 pour un rayon de contrôle.
 * Une ligne qui se déforme sous le curseur dans une liste dense déplace le texte qu'on
 * vise — c'est le défaut que décrit déjà la note du viewport de navigation.
 */
export const SEARCH_ROW_CLASS =
  'gap-3 rounded-control px-3 py-2 data-[selected=true]:bg-surface-muted'
