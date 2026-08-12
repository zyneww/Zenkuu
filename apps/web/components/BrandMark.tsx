/**
 * Marque ZENKUU — mot-symbole et monogramme.
 *
 * ── POURQUOI DU SVG EN LIGNE, ET PLUS DEUX PNG ────────────────────────────────
 *
 * L'en-tête et le pied de page portaient chacun DEUX images : une pour le thème
 * clair, une pour le thème sombre, l'une masquée par l'autre. Ce montage existait
 * pour une raison précise — l'ancien logo mêlait une fleur en dégradé rose-violet à
 * un mot quasi noir, et l'inverser aurait viré la fleur au vert.
 *
 * Le logo actuel est MONOCHROME. La contrainte tombe, et avec elle tout le montage :
 * un tracé qui prend `currentColor` suit l'encre du thème sans qu'on ait à décider
 * quoi que ce soit. Un seul dessin, aucune variante à tenir en phase, aucune image
 * chargée pour rien dans le thème qui ne l'affiche pas.
 *
 * ── POURQUOI EN LIGNE PLUTÔT QU'UN FICHIER DANS `public/` ─────────────────────
 *
 * Un `<img src="…svg">` ne peut pas hériter de la couleur du texte : le document SVG
 * y est un document étranger, `currentColor` s'y résout sur son propre contexte. Il
 * faudrait alors repasser par un masque CSS — ce que faisait l'ancien pied de page —
 * ou par deux fichiers, c'est-à-dire revenir au problème qu'on vient de retirer.
 *
 * Le logo est aussi le PREMIER élément peint de chaque page. En ligne, il arrive avec
 * le HTML ; en fichier, il coûte un aller-retour réseau pendant lequel l'en-tête est
 * amputé de sa marque. 2,6 Ko de tracé pèsent moins que la requête qu'ils évitent.
 *
 * ── D'OÙ VIENNENT CES TRACÉS ──────────────────────────────────────────────────
 *
 * Ils sont VECTORISÉS depuis les fichiers fournis, qui n'étaient vectoriels que de
 * nom : `zkheader.svg` et `zklogo.svg` encapsulaient chacun un PNG de 4000 px en
 * base64, pour 1,4 Mo et 4,6 Mo. Le contour a été retrouvé sur le canal du masque,
 * puis simplifié. Poids obtenus : 2,6 Ko et 0,4 Ko, soit 99,8 % et 99,99 % de moins,
 * et un bord net à toute taille au lieu d'un rééchantillonnage flou.
 *
 * Le rapport hauteur/largeur est FIXÉ par le `viewBox` : les composants n'exposent
 * qu'une hauteur, la largeur suit. C'est ce qui empêche le logo de se déformer et,
 * accessoirement, ce qui évite le sursaut de mise en page au premier rendu.
 */

interface MarkProps {
  /** Classes utilitaires — au minimum une hauteur (`h-11`) et une couleur d'encre. */
  className?: string
}

/** Rapport largeur/hauteur des deux dessins, relevé sur leur `viewBox`. */
export const WORDMARK_RATIO = 549.86 / 100
export const MARK_RATIO = 159.83 / 100

const WORDMARK_PATH =
  'M18.46 0L110.19 0.28L90.91 25.9L51.52 75.21L51.52 75.76L53.72 76.03L82.64 76.03L100.83 96.42L103.03 100L0 99.72L3.58 94.21L58.4 25.07L58.13 23.97L9.64 23.97L14.33 8.54L16.8 2.2ZM382.92 5.23L392.29 5.23L393.11 6.34L393.11 55.37L395.59 53.44L417.08 29.75L429.2 30.03L407.44 53.17L407.44 53.99L430.58 84.57L431.4 87.05L419.56 87.05L400.28 60.61L393.11 67.77L392.84 86.78L385.4 87.33L382.64 86.78ZM127.27 15.43L159.78 15.7L156.75 20.11L123.42 57.85L123.69 58.95L128.93 65.01L157.02 95.87L160.06 99.45L159.78 100L125.07 99.72L88.98 58.68L91.18 55.1L104.41 40.5L120.11 21.49L125.62 15.7ZM278.24 28.65L284.57 28.65L289.53 29.48L297.25 33.06L301.93 37.47L304.13 40.77L307.44 49.04L308.26 54.82L308.26 60.61L307.71 61.43L264.19 61.71L265.29 67.77L268.04 73L271.63 76.58L277.13 79.06L284.57 79.61L290.08 78.24L293.39 76.31L297.8 70.8L306.61 73.83L304.41 78.24L300.83 82.09L296.97 84.85L289.81 87.6L285.67 88.15L276.58 87.88L271.9 86.78L266.67 84.3L262.81 81.54L258.68 76.86L256.47 73L254.27 65.84L253.72 62.26L253.99 53.17L255.37 47.11L258.4 40.77L260.88 37.47L265.56 33.33L271.9 30.03ZM344.63 28.65L352.62 28.93L359.5 31.68L363.91 35.81L366.39 40.22L368.32 49.31L368.32 86.5L367.77 87.05L358.13 86.78L357.85 49.04L357.02 45.18L355.37 41.87L352.62 39.39L348.76 37.74L343.53 37.47L341.05 37.74L336.09 39.94L332.78 42.98L330.3 47.38L329.2 58.68L329.2 86.78L319.56 87.05L319.28 30.3L319.83 29.75L328.65 29.75L329.2 30.3L329.2 37.19L330.03 37.47L331.13 35.54L334.99 31.96L340.22 29.48ZM201.65 29.75L244.9 30.03L245.18 38.29L244.63 39.39L215.98 74.38L213.5 78.51L245.73 78.51L246.28 79.34L246.28 86.5L245.73 87.05L203.86 87.33L200.83 86.78L200.83 78.79L232.51 39.39L232.51 38.84L201.65 38.84L201.1 38.29L201.1 30.3ZM439.67 29.75L448.48 29.75L449.31 30.58L449.59 70.25L452.34 75.76L456.75 78.51L460.33 79.34L463.91 79.34L468.87 77.96L473 75.21L475.48 71.9L477.13 67.77L477.69 63.91L477.69 30.03L487.05 29.75L487.88 30.3L487.88 86.5L487.33 87.05L477.96 87.05L477.41 79.34L474.38 82.92L471.07 85.4L467.49 87.05L462.53 88.15L456.47 88.15L451.79 87.05L446.83 84.57L442.98 80.72L440.5 76.31L438.84 68.6L438.84 32.23ZM501.65 29.75L510.47 29.75L511.29 30.3L511.85 70.25L513.5 74.1L516.25 77.13L520.11 79.06L524.79 79.61L529.48 78.79L533.06 77.13L536.64 73.55L538.84 68.6L539.39 66.12L539.67 30.3L540.22 29.75L549.59 30.03L549.59 87.05L540.22 87.05L539.67 79.34L533.88 85.12L525.34 88.15L519.01 88.15L514.6 87.33L510.19 85.4L505.51 81.54L502.48 76.03L501.1 70.25L501.1 30.3ZM280.44 36.91L273.28 38.84L268.87 42.15L265.84 47.38L264.46 53.17L297.8 52.89L296.69 46.83L292.29 40.5L287.33 37.74Z'

const MARK_PATH =
  'M19.83 0L109.83 0.17L94.17 21.17L51.17 75.17L51.33 75.83L52.67 76L82.33 76.17L101.83 98L102.67 99.83L0 99.67L58.67 24.33L9.67 23.67L17.17 1.5L18 0.33ZM128.67 15.5L159.5 15.83L123 58L159.5 99L159.83 99.67L159.17 100L125.33 99.67L89.17 58.67L89.5 57.17L123.83 17.33L125.5 15.83Z'

/**
 * Monogramme ZK suivi du mot « zenkuu ». C'est la marque complète, celle de
 * l'en-tête et du pied de page.
 *
 * `aria-hidden` et pas de titre : le lien qui l'enveloppe porte déjà son propre
 * libellé. Un nom accessible ici le ferait annoncer deux fois.
 */
export function ZenkuuWordmark({ className }: MarkProps) {
  return (
    <svg
      viewBox="0 0 549.86 100"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <path d={WORDMARK_PATH} />
    </svg>
  )
}

/**
 * Monogramme seul. Pour les emplacements trop étroits pour le mot — la barre
 * d'identité collante d'une fiche, un en-tête replié sur téléphone.
 */
export function ZenkuuMark({ className }: MarkProps) {
  return (
    <svg
      viewBox="0 0 159.83 100"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <path d={MARK_PATH} />
    </svg>
  )
}
