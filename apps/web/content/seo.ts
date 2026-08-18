/**
 * ══════════════════════════════════════════════════════════════════════════════
 * DESCRIPTIONS DE RÉFÉRENCEMENT — une table à part, et SERVEUR UNIQUEMENT
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── POURQUOI PAS DANS LA TABLE DE PHRASES ────────────────────────────────────
 *
 * La table de phrases traverse la frontière serveur → client : `ContentProvider` la
 * transmet en entier pour que les composants `use client` puissent traduire. C'est un
 * choix assumé et documenté — une trentaine de kilo-octets, moins de dix compressés.
 *
 * Les descriptions de page pèsent une vingtaine d'entrées de cent cinquante à deux
 * cent cinquante caractères. Les verser dans la table de phrases alourdirait la
 * charge utile de CHAQUE page d'environ quatre kilo-octets, pour un texte que le
 * navigateur ne rend jamais : une balise `<meta name="description">` est écrite par
 * le serveur, lue par les moteurs, et n'existe pour personne d'autre.
 *
 * Cette table n'est donc importée que par `getSeo()`, côté serveur.
 *
 * ── POURQUOI LA ROUTE POUR CLÉ, ET NON LE TEXTE FRANÇAIS ─────────────────────
 *
 * La table de phrases prend le français pour identifiant, faute de clé naturelle. Ici
 * il y en a une : chaque description appartient à exactement UNE page, et cette page
 * a déjà un chemin canonique — écrit deux lignes plus bas, dans `alternates`.
 *
 *     description: seo('/heatmap', 'Le marché crypto en une figure…'),
 *     alternates: { canonical: '/heatmap' },
 *
 * Le français reste sur place, en second argument : il sert de repli ET se lit dans
 * le fichier de la page, comme pour les phrases. Mais retoucher la formulation
 * française n'orpheline plus les douze traductions, puisque la clé ne bouge pas.
 */

export type SeoDescriptions = Record<string, string>

/**
 * Description localisée d'une page, ou son texte français.
 *
 * Le repli est le SECOND ARGUMENT et non une chaîne vide : une page sans traduction
 * garde une description française, ce qu'un moteur indexe correctement, plutôt que de
 * n'en publier aucune — auquel cas il en fabrique une à partir du corps de la page.
 */
export function describePage(
  table: SeoDescriptions | undefined,
  route: string,
  french: string,
): string {
  return table?.[route] ?? french
}
