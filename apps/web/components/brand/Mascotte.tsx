import Image from 'next/image'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * KUU — LA MASCOTTE DU SITE
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── QUI ELLE EST, ET POURQUOI ELLE RESSEMBLE À ÇA ───────────────────────────
 *
 * Un petit esprit du ciel : un nuage vivant aux grands yeux menthe, écharpe au vent,
 * croissant de lune au-dessus de la tête. Le nom du site le dicte — 空, *kuu*, c'est
 * le ciel et le vide — et la mascotte le rend littéral plutôt que de l'expliquer.
 *
 * Ce n'est PAS un animal, et le choix est délibéré : un renard ou un hibou aurait
 * demandé de justifier le rapport avec la finance, et n'aurait rien dit du nom. Un
 * nuage n'a pas ce problème — il EST le sujet.
 *
 * Les couleurs sortent de la palette : la menthe des yeux et de l'écharpe est
 * `--color-brand`, le corps reprend la clarté de `--color-ink` sur fond sombre. La
 * mascotte ne s'ajoute donc pas à l'identité, elle la porte.
 *
 * ── OÙ ELLE APPARAÎT, ET OÙ ELLE N'APPARAÎT PAS ─────────────────────────────
 *
 * Aux moments VIDES, et seulement là : une page introuvable, un écran sans résultat,
 * une liste de suivi qu'on n'a pas encore remplie. Ce sont des instants où la page n'a
 * rien à dire, et où une présence vaut mieux qu'un cadre gris.
 *
 * ⚠️ JAMAIS À CÔTÉ D'UN CHIFFRE. Pas dans l'en-tête, pas dans un tableau, pas près
 * d'un cours. Une page qui affiche des cotations doit se lire comme un instrument ; un
 * personnage posé contre un prix change le registre de tout ce qui l'entoure, et c'est
 * exactement ce qu'un site de données ne peut pas se permettre.
 *
 * ── LE POIDS EST BORNÉ, ET IL FALLAIT LE BORNER ─────────────────────────────
 *
 * L'illustration d'origine fait 638 × 640 pour 249 ko. Elle est servie en WebP à deux
 * densités — 319 × 320 (15 ko) et 638 × 640 (30 ko) — parce qu'elle n'est jamais rendue
 * au-delà de 320 px de large. Le PNG détouré reste au dépôt comme ORIGINAL : c'est lui
 * qu'on retaille si un usage plus grand apparaît, jamais le WebP déjà compressé.
 *
 * ⚠️ CETTE NOTE ANNONÇAIT « 2048 px » ET UN CARRÉ : LES DEUX ÉTAIENT FAUX, et le second
 * se voyait à l'écran. Dimensions relevées sur disque.
 */

/**
 * Les dimensions RÉELLES du fichier.
 *
 * ⚠️ L'ILLUSTRATION N'EST PAS CARRÉE, ET LE COMPOSANT LA DÉCLARAIT CARRÉE. Il posait
 * `width={size} height={size}` — une affirmation que le fichier ne soutient pas. Relevé
 * au navigateur sur la page 404 : attributs « 180 × 180 », rendu « 180 × 180,703 », et
 * un `naturalWidth/naturalHeight` de 256 × 257 sur la variante servie. Next le signalait
 * — « width or height modified, but not the other » — et l'écart d'un pixel produisait
 * un léger décalage de mise en page au chargement.
 *
 * La hauteur se déduit donc du rapport plutôt que d'être recopiée de la largeur. Deux
 * pixels de différence ne se voient pas ; une boîte déclarée qui ment, si.
 */
const SOURCE_LARGEUR = 638
const SOURCE_HAUTEUR = 640

export function Mascotte({
  size = 160,
  className = '',
}: {
  /**
   * LARGEUR en pixels — et non « côté du carré », comme cette ligne l'affirmait. La
   * hauteur en découle. Au-delà de 320, servir `kuu@2x.webp` directement.
   */
  size?: number
  className?: string
}) {
  return (
    <Image
      /* `kuu.webp` fait 319 × 320 et `Image` sert le `2x` sur les écrans denses via son
         `srcset` : rien à câbler ici, Next dérive les deux du même fichier source. */
      src="/mascotte/kuu.webp"
      alt=""
      width={size}
      height={Math.round((size * SOURCE_HAUTEUR) / SOURCE_LARGEUR)}
      /*
        `alt=""` ET `aria-hidden` : la mascotte est DÉCORATIVE. Elle accompagne un texte
        qui dit déjà tout — « cette page n'existe pas », « aucun résultat » — et le
        décrire une seconde fois (« illustration d'un nuage souriant ») ferait perdre du
        temps à qui écoute la page sans rien lui apprendre.
      */
      aria-hidden="true"
      /* `select-none` et `pointer-events-none` : ce n'est ni un contenu qu'on copie ni
         une cible qu'on vise. Sans eux, un glissement de souris la sélectionne comme
         une image et fait apparaître un rectangle bleu au milieu d'un écran vide. */
      /* `h-auto` : la hauteur suit le rapport de forme du fichier, dont la largeur reste
         seule maîtresse. Avec la hauteur déclarée ci-dessus, les deux disent maintenant
         la même chose — c'est ce que Next vérifie. */
      className={`pointer-events-none h-auto select-none ${className}`}
      /* ⚠️ `priority` ET NON `false`, ET C'EST UN RELEVÉ DE PERFORMANCE, PAS UN GOÛT.

         Next signalait : « detected as the Largest Contentful Paint — please add the
         `loading="eager"` property if this image is above the fold ». Mesuré : elle
         tombe à 145 px du haut dans une fenêtre de 1133, et c'est la SEULE image des
         pages où elle paraît. Elle était donc chargée en `lazy`, c'est-à-dire que le
         plus grand élément peint de la page attendait le reste.

         Le préchargement ne coûte rien ailleurs : la mascotte n'apparaît QUE sur les
         écrans vides — page introuvable, aucun résultat — où elle est toujours haute et
         toujours seule. Voir la note d'en-tête sur les endroits où elle ne paraît pas. */
      priority
    />
  )
}
