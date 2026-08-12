/**
 * Modèle de contenu du blog.
 *
 * `ARTICLES` est VOLONTAIREMENT VIDE. Le §5 interdit les données de remplissage, et
 * la règle vaut pour l'éditorial : de faux billets signés de faux auteurs à de
 * fausses dates sont exactement ce qu'elle proscrit. Tout le système est en place —
 * catégories, recherche, mise en avant, pages d'article, sommaire, flux RSS,
 * données structurées — et se peuplera de lui-même dès la première entrée ajoutée
 * à ce tableau. Aucun composant n'aura à être retouché.
 *
 * Pour publier : ajouter un objet `Article` ci-dessous. Le temps de lecture, le fil
 * RSS, le plan du site, les articles liés et le sommaire en découlent
 * automatiquement.
 */

export type BlogCategory = 'methode' | 'produit' | 'marche' | 'coulisses'

export const BLOG_CATEGORIES: { id: BlogCategory; label: string; description: string }[] = [
  {
    id: 'methode',
    label: 'Méthode',
    description: 'Comment les chiffres sont collectés, vérifiés et affichés.',
  },
  {
    id: 'produit',
    label: 'Produit',
    description: 'Ce qui change sur le site, et les arbitrages derrière.',
  },
  {
    id: 'marche',
    label: 'Marché',
    description: 'Lectures de fond sur le fonctionnement des marchés suivis.',
  },
  {
    id: 'coulisses',
    label: 'Coulisses',
    description: 'Décisions techniques et limites assumées.',
  },
]

/** Une section d'article. Le `title` alimente le sommaire ; l'omettre le masque. */
export interface ArticleSection {
  /** Titre de section. Absent = paragraphes rattachés à la section précédente. */
  title?: string
  /** Identifiant d'ancre, dérivé du titre s'il est absent. */
  id?: string
  paragraphs: string[]
}

export interface Article {
  slug: string
  title: string
  /** Chapô : sert de résumé de liste, de méta-description et d'extrait RSS. */
  summary: string
  category: BlogCategory
  /** Signature. « Équipe ZENKUU » tant qu'aucun auteur nommé n'existe réellement. */
  author: string
  /** Date de publication, ISO 8601 (`2026-08-10`). */
  publishedAt: string
  /** Date de dernière révision, si l'article a été repris depuis sa parution. */
  updatedAt?: string
  /** Mise en avant en tête de page. Un seul article devrait la porter. */
  featured?: boolean
  sections: ArticleSection[]
}

export const ARTICLES: Article[] = []

/* ── Dérivations ───────────────────────────────────────────────────────────── */

/**
 * Temps de lecture, CALCULÉ et jamais saisi à la main.
 *
 * 200 mots par minute, la cadence moyenne d'un lecteur adulte en français sur un
 * texte courant. Le point important est ailleurs : un temps écrit en dur dans les
 * métadonnées diverge dès la première relecture qui allonge ou raccourcit le texte,
 * et personne ne pense à le corriger. Le dériver du contenu le rend toujours juste.
 *
 * Arrondi au minimum à 1 : « 0 min de lecture » n'a pas de sens.
 */
export function readingMinutes(article: Article): number {
  const words = article.sections
    .flatMap((section) => section.paragraphs)
    .join(' ')
    .split(/\s+/)
    .filter(Boolean).length

  return Math.max(1, Math.round(words / 200))
}

/** Identifiant d'ancre d'une section, pour le sommaire et les liens profonds. */
export function sectionId(section: ArticleSection, index: number): string {
  if (section.id) return section.id
  if (!section.title) return `section-${index + 1}`

  return section.title
    .toLowerCase()
    .normalize('NFD')
    // Retire les diacritiques : une ancre `#méthodologie` s'encode en `%C3%A9` dans
    // l'URL, ce qui la rend illisible une fois copiée-collée. La plage U+0300–U+036F
    // est celle des marques combinatoires que `NFD` vient de détacher.
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function categoryLabel(id: BlogCategory): string {
  return BLOG_CATEGORIES.find((entry) => entry.id === id)?.label ?? id
}

export function findArticle(slug: string): Article | undefined {
  return ARTICLES.find((article) => article.slug === slug)
}

/** Articles triés du plus récent au plus ancien. */
export function sortedArticles(): Article[] {
  return [...ARTICLES].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
}

/**
 * Article mis en avant : celui marqué `featured`, à défaut le plus récent.
 *
 * Le repli évite qu'un oubli de marquage vide la tête de page — la mise en avant est
 * une préférence éditoriale, pas une condition d'affichage.
 */
export function featuredArticle(): Article | undefined {
  return ARTICLES.find((article) => article.featured) ?? sortedArticles()[0]
}

/**
 * Articles liés : même catégorie d'abord, complétés par les plus récents.
 *
 * Sans le complément, un article seul dans sa catégorie n'aurait aucun voisin, et le
 * bas de sa page se terminerait sur un bloc vide.
 */
export function relatedArticles(article: Article, limit = 3): Article[] {
  const others = sortedArticles().filter((entry) => entry.slug !== article.slug)
  const sameCategory = others.filter((entry) => entry.category === article.category)
  const rest = others.filter((entry) => entry.category !== article.category)

  return [...sameCategory, ...rest].slice(0, limit)
}

/** Date lisible en français : « 10 août 2026 ». */
export function formatArticleDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso

  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    // Fuseau figé : sans lui, un article daté du 1er du mois bascule au 31 du mois
    // précédent pour un lecteur situé à l'ouest de Greenwich.
    timeZone: 'UTC',
  }).format(date)
}
