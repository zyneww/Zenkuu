/**
 * Glyphes de réseaux sociaux.
 *
 * Lucide a retiré ses icônes de marque (Instagram, X, GitHub…) pour des raisons de
 * droit des marques : `lucide-react` n'en exporte plus aucune. Plutôt que d'ajouter
 * une seconde bibliothèque d'icônes pour un unique glyphe, on le trace ici.
 *
 * Le tracé reste volontairement schématique — carré arrondi, objectif, témoin —
 * et sert uniquement à identifier la destination d'un lien vers NOTRE propre
 * compte, ce qui relève de l'usage nominatif.
 */

interface IconProps {
  className?: string
}

export function InstagramGlyph({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  )
}

/**
 * Le X de X (anciennement Twitter).
 *
 * Il est tracé ici pour la même raison que le glyphe d'Instagram — `lucide` n'a plus
 * d'icône de marque — et il en diffère par son usage : celui-ci désigne le compte
 * D'UN TIERS, le projet dont on affiche la fiche, à partir du lien que la source de
 * données publie (`communityUrls`). C'est un renvoi vers la page officielle du
 * projet, ce que le droit des marques appelle un usage nominatif.
 *
 * Deux traits croisés plutôt que le logotype exact : la forme suffit à reconnaître
 * la destination, et le rendu reste cohérent avec les icônes `lucide` qui
 * l'entourent — même grille de 24, même épaisseur, même `currentColor`.
 */
export function XGlyph({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M4 3 L20 21" />
      <path d="M20 3 L4 21" />
    </svg>
  )
}

/*
 * ══════════════════════════════════════════════════════════════════════════════
 * TROIS MARQUES QUE LUCIDE N'A PLUS — TELEGRAM, REDDIT, DISCORD
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Elles étaient servies par des REMPLAÇANTS génériques : l'avion en papier de
 * `Send` pour Telegram, la bulle de `MessageCircle` pour Reddit. La note de
 * `AssetPageHeader` l'assumait — « le pictogramme qui décrit leur NATURE » — mais
 * une bulle ne dit pas Reddit : elle dit « discussion », et la rangée de liens d'une
 * fiche en porte plusieurs.
 *
 * ── D'OÙ VIENNENT LES TRACÉS ───────────────────────────────────────────────
 *
 * De `nexticons.in`, sous licence MIT, relevés dans leur page à la grille 24 —
 * la même que lucide, donc aucune conversion d'échelle. Ce sont les formes
 * officielles, ce que les deux glyphes plus haut ne sont pas : le X et l'Instagram
 * d'ici sont schématiques, faute d'une source libre au moment où ils ont été
 * tracés.
 *
 * ⚠️ ILS SONT PLEINS LÀ OÙ LE RESTE DU SITE EST FILAIRE, ET C'EST INÉVITABLE. Une
 * marque se reconnaît à sa silhouette : la fusée de Telegram, le visage de Reddit,
 * la manette de Discord ne survivent pas à une réduction en contours de 1,5 px —
 * essayée, illisible à 14 px. Le poids visuel est rattrapé autrement : `fill` en
 * `currentColor`, donc la même encre atténuée que les icônes filaires voisines, et
 * jamais la couleur de marque, qui ferait trois taches dans une rangée grise.
 *
 * L'usage est nominatif : chaque glyphe désigne le compte OFFICIEL du projet dont
 * on affiche la fiche, à partir du lien que la source de données publie.
 */

export function TelegramGlyph({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  )
}

export function RedditGlyph({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
    </svg>
  )
}

export function DiscordGlyph({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057.1 18.08.114 18.102.132 18.116a19.9 19.9 0 0 0 5.993 3.03.077.077 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  )
}
