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
 * L'illustration d'origine fait 2048 px pour 196 ko. Elle est servie en WebP à deux
 * densités — 320 et 640 px, soit 15 et 30 ko — parce qu'elle n'est jamais rendue au
 * delà de 320 px de côté. Le PNG détouré reste au dépôt comme ORIGINAL : c'est lui
 * qu'on retaille si un usage plus grand apparaît, jamais le WebP déjà compressé.
 */
export function Mascotte({
  size = 160,
  className = '',
}: {
  /** Côté du carré, en pixels. Au-delà de 320, servir `kuu@2x.webp` directement. */
  size?: number
  className?: string
}) {
  return (
    <Image
      /* `kuu.webp` fait 320 px et `Image` sert le `2x` sur les écrans denses via son
         `srcset` : rien à câbler ici, Next dérive les deux du même fichier source. */
      src="/mascotte/kuu.webp"
      alt=""
      width={size}
      height={size}
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
      className={`pointer-events-none select-none ${className}`}
      priority={false}
    />
  )
}
