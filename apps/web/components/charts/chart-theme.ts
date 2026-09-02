/**
 * Vocabulaire commun des graphiques.
 *
 * Toutes les valeurs pointent vers des JETONS CSS plutôt que vers des couleurs
 * écrites en dur. C'est ce qui permet aux graphiques de suivre la bascule de thème
 * sans qu'aucun composant ne s'en préoccupe : le tracé reçoit la chaîne
 * `var(--color-data-1)`, que le navigateur résout à la peinture. Une couleur figée
 * exigerait au contraire de lire le thème en JavaScript, puis de re-rendre à chaque
 * bascule — et de gérer l'instant où le thème n'est pas encore connu.
 *
 * Ce fichier a MAIGRI avec le retrait de `recharts` : les styles d'infobulle, de
 * graduation et de marge n'étaient que des objets de configuration destinés à cette
 * bibliothèque. Le tracé maison (`AreaPlot`) les porte désormais dans ses classes
 * utilitaires et ses constantes internes, où ils sont lisibles à côté de ce qu'ils
 * habillent. Ne subsistent ici que les valeurs réellement PARTAGÉES entre plusieurs
 * composants.
 */

/** Six teintes de séries, ordonnées par distance perceptuelle (cf. globals.css). */
export const DATA_COLORS = [
  'var(--color-data-1)',
  'var(--color-data-2)',
  'var(--color-data-3)',
  'var(--color-data-4)',
  'var(--color-data-5)',
  'var(--color-data-6)',
] as const

export function dataColor(index: number): string {
  return DATA_COLORS[index % DATA_COLORS.length] as string
}

/**
 * Grille : l'encre à 8 %, relevé sur la référence.
 *
 * Un mélange plutôt qu'un jeton propre, et c'est délibéré : la grille doit être une
 * atténuation du FOND, pas une couleur en soi. À 8 % elle se devine sans se lire —
 * c'est exactement ce qu'on attend d'un repère de lecture, qui doit disparaître dès
 * qu'on regarde la courbe. `color-mix` la fait suivre les deux thèmes d'une seule
 * déclaration, là où deux valeurs figées demanderaient une règle par thème.
 */
export const GRID_STROKE = 'color-mix(in srgb, var(--color-ink) 8%, transparent)'

/**
 * Grille TIRETÉE, et non pleine.
 *
 * Relevé sur tokenomist.ai/overview : leurs repères horizontaux sont des tirets de
 * quatre pixels espacés de quatre. La différence avec un trait plein n'est pas de
 * goût, elle est de HIÉRARCHIE — un trait plein qui traverse le cadre lit comme une
 * ligne du graphique et entre en concurrence avec la courbe, alors qu'un pointillé se
 * lit comme un repère de lecture et s'efface dès qu'on regarde le tracé.
 *
 * C'est aussi ce qui permet à la grille de monter en opacité sans se faire remarquer :
 * à 8 % de l'encre, un trait plein est déjà au bord du visible et un tireté du même ton
 * reste discret. Le second est donc lisible sur un fond clair là où le premier
 * disparaissait.
 *
 * ⚠️ NE PAS L'APPLIQUER AUX LIGNES DE RÉFÉRENCE. Celles-ci — un zéro, un seuil, une
 * moyenne — sont déjà tiretées en « 3 3 » pour se distinguer de la grille. Deux motifs
 * de tirets voisins ne se distinguent qu'en les comparant, ce qui est exactement le
 * travail qu'un repère doit éviter au lecteur ; la ligne de référence garde donc son
 * propre motif, plus serré.
 */
export const GRID_DASH = '4 4'

/** Bornes de la précision d'axe. Voir `axisDigits`. */
const AXIS_DIGITS_MIN = 1
const AXIS_DIGITS_MAX = 4

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * PRÉCISION DE LA GRADUATION — DÉDUITE DE L'AMPLITUDE, ET NON FIXÉE
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── LE DÉFAUT QUE CETTE FONCTION CORRIGE ────────────────────────────────────
 *
 * `TrendChart` mettait sa graduation en forme en notation compacte à UNE décimale.
 * Sur une série large — un cours passant de 20 000 à 70 000 — c'est le bon réglage.
 * Sur une série ÉTROITE, elle rend cinq fois la même chaîne : la capitalisation
 * mondiale variant de 2,29 à 2,31 billions, les cinq graduations de la carte de tête
 * de l'accueil affichaient toutes « 2,3 Bn ». Un axe dont toutes les graduations
 * portent la même étiquette ne gradue plus rien — il reste une décoration au-dessus
 * d'une courbe dont on ne peut plus lire l'amplitude.
 *
 * ── CE QUE LE CALCUL DIT ────────────────────────────────────────────────────
 *
 * Deux graduations voisines se distinguent dès que la précision descend d'un cran
 * sous le rapport entre l'AMPLITUDE de la série et son ORDRE DE GRANDEUR. C'est ce
 * rapport que le logarithme mesure, et le `+ 1` qui prend le cran.
 *
 *     amplitude 4,4 % de l'ordre de grandeur  →  3 décimales  →  2,290 Bn / 2,315 Bn
 *     amplitude 50 %                          →  2 décimales  →  25,00 k / 70,00 k
 *
 * Sur une série large le calcul rend 1 ou 2 : le comportement d'origine est conservé
 * là où il était juste, et ce n'est corrigé que là où il ne l'était pas.
 *
 * ── LES DEUX BORNES, ET POURQUOI ELLES NE SONT PAS SYMÉTRIQUES ──────────────
 *
 * Jamais moins d'une décimale : un axe en nombres entiers sur une série de fractions
 * serait le même défaut à l'autre bout — cinq fois « 0 ».
 *
 * Jamais plus de quatre : au-delà, la graduation devient plus large que les 46 pixels
 * que `AreaPlot` réserve à sa marge gauche, et déborde sur le tracé. La borne est
 * donc une contrainte de MISE EN PAGE, pas de lisibilité — la déplacer suppose de
 * déplacer `PAD_WITH_AXES` avec elle.
 *
 * Série plate ou vide : une décimale. Il n'y a alors pas d'amplitude à distinguer, et
 * le rapport vaudrait zéro — dont le logarithme est infini.
 */
export function axisDigits(values: number[]): number {
  if (values.length === 0) return AXIS_DIGITS_MIN

  const spread = Math.max(...values) - Math.min(...values)
  const magnitude = Math.max(...values.map(Math.abs))
  if (spread <= 0 || magnitude <= 0) return AXIS_DIGITS_MIN

  return Math.min(
    AXIS_DIGITS_MAX,
    Math.max(AXIS_DIGITS_MIN, Math.ceil(-Math.log10(spread / magnitude)) + 1),
  )
}

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * LA TEINTE DES FIGURES D'AGRÉGAT — UNE SEULE, ET C'EST LE POINT
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Relevé sur hyperscreener.asxn.xyz le 2026-09-02 : TOUTES leurs figures d'agrégat
 * sont du même teal — `#51a691` pour les barres, la même famille pour les aires. Une
 * seule exception, la courbe cumulée superposée, en orange (voir `--chart-overlay`).
 *
 * ── POURQUOI CETTE UNIFORMITÉ EST UN CHOIX, ET NON UNE PARESSE ─────────────
 *
 * `dataColor(n)` distribue six teintes éloignées, et c'est juste pour ce qu'elle sert :
 * comparer plusieurs actifs sur UNE figure, où deux séries voisines ne doivent pas se
 * confondre.
 *
 * Mais les pages de graphiques n'ont qu'UNE série par figure. Leur donner six couleurs
 * différentes ne distingue donc rien — chaque carte est déjà séparée par son cadre et
 * son titre. Cela produit seulement une page bariolée, où le violet de la capitalisation
 * et l'orange du volume se lisent comme deux CATÉGORIES alors qu'ils ne le sont pas.
 *
 * Une teinte unique fait l'inverse : la couleur cesse de porter du sens, et redevient
 * ce qu'elle doit être sur une figure à série unique — de l'encre.
 *
 * ── ELLE SUIT LA MARQUE, ET NON UNE VALEUR FIGÉE ──────────────────────────
 *
 * `--color-brand-strong` est l'azur du site, assombri jusqu'à passer AA. Reprendre
 * `#51a691` tel quel poserait un teal étranger à la palette au milieu de pages qui
 * emploient l'azur partout ailleurs — on aurait copié la couleur en perdant la raison
 * qui la rend juste chez eux : c'est LEUR couleur d'accent.
 */
export const AGGREGATE_TONE = 'var(--color-brand-strong)'
