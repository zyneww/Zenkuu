import { absoluteUrl } from '@/lib/site'

/**
 * Données structurées schema.org (§9).
 *
 * Choix du type : un cours de marché n'est PAS un `Product` avec une `Offer`, même
 * si la tentation est grande — cette paire déclencherait les extraits enrichis
 * « prix / disponibilité / acheter », qui présenteraient ZENKUU comme un point de
 * vente. Le site n'exécute aucun ordre (§7) ; annoncer une offre commerciale à un
 * moteur de recherche serait une déclaration fausse en plus d'une faute de
 * positionnement.
 *
 * On utilise donc `Dataset` pour les fiches d'actif — ce que ZENKUU publie
 * réellement est un jeu de données de marché, avec sa source et sa date — et
 * `FAQPage` / `Article` là où le contenu s'y prête vraiment.
 */

function JsonLdScript({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // Le JSON est sérialisé puis échappé : `<` fermerait prématurément la balise
      // <script> si un champ contenait la chaîne « </script> », ce qui ouvre une
      // injection. `JSON.stringify` seul ne protège pas de ce cas.
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, '\\u003c'),
      }}
    />
  )
}

/** Identité du site, posée une fois pour toutes dans le layout racine. */
export function OrganizationJsonLd() {
  return (
    <JsonLdScript
      data={{
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'ZENKUU',
        url: absoluteUrl('/'),
        inLanguage: 'fr-FR',
        description:
          'Plateforme d’information de marché multi-actifs en lecture seule : cryptomonnaies, devises, actions, ETF, matières premières et indices.',
        publisher: {
          '@type': 'Organization',
          name: 'ZENKUU',
          url: absoluteUrl('/'),
        },
      }}
    />
  )
}

interface AssetJsonLdProps {
  name: string
  symbol: string
  path: string
  description?: string
  /** Nom lisible de la source, affiché aussi à l'écran sous le module. */
  sourceName: string
  sourceUrl: string
  updatedAt?: string
}

/**
 * Fiche d'actif décrite comme un jeu de données.
 *
 * `Dataset` porte nativement ce qui compte ici : la provenance, la licence d'usage
 * et la date de dernière modification. C'est exactement ce qu'un lecteur — humain ou
 * robot — doit savoir d'un cours affiché.
 */
export function AssetJsonLd({
  name,
  symbol,
  path,
  description,
  sourceName,
  sourceUrl,
  updatedAt,
}: AssetJsonLdProps) {
  return (
    <JsonLdScript
      data={{
        '@context': 'https://schema.org',
        '@type': 'Dataset',
        name: `${name} (${symbol}) — données de marché`,
        description:
          description ??
          `Cours, variations et statistiques de marché pour ${name} (${symbol}), relayés depuis ${sourceName}.`,
        url: absoluteUrl(path),
        inLanguage: 'fr-FR',
        isAccessibleForFree: true,
        ...(updatedAt ? { dateModified: updatedAt } : {}),
        creator: { '@type': 'Organization', name: sourceName, url: sourceUrl },
        publisher: { '@type': 'Organization', name: 'ZENKUU', url: absoluteUrl('/') },
      }}
    />
  )
}

/** Questions/réponses d'une fiche d'actif ou d'un article d'aide. */
export function FaqJsonLd({ items }: { items: { question: string; answer: string }[] }) {
  if (items.length === 0) return null

  return (
    <JsonLdScript
      data={{
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: items.map((item) => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: { '@type': 'Answer', text: item.answer },
        })),
      }}
    />
  )
}

/** Article éditorial — aide et fiches Apprendre. */
export function ArticleJsonLd({
  title,
  description,
  path,
  publishedAt,
  updatedAt,
  author,
}: {
  title: string
  description: string
  path: string
  /** Date de parution, ISO 8601. Omise pour les contenus sans date de publication. */
  publishedAt?: string
  updatedAt?: string
  author?: string
}) {
  return (
    <JsonLdScript
      data={{
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: title,
        description,
        url: absoluteUrl(path),
        inLanguage: 'fr-FR',
        isAccessibleForFree: true,
        // Les dates ne sont émises QUE si elles existent réellement : un
        // `datePublished` inventé pour satisfaire le validateur de données
        // structurées ferait afficher une fausse date dans les résultats de
        // recherche, ce qui est du même ordre qu'un chiffre inventé (§5).
        ...(publishedAt ? { datePublished: publishedAt } : {}),
        ...(updatedAt ?? publishedAt ? { dateModified: updatedAt ?? publishedAt } : {}),
        // `Organization` et non `Person`, même quand un nom est fourni : la
        // signature par défaut est « Équipe ZENKUU », qui est un collectif. Déclarer
        // une personne qui n'existe pas serait une affirmation fausse de plus.
        author: { '@type': 'Organization', name: author ?? 'ZENKUU' },
        publisher: { '@type': 'Organization', name: 'ZENKUU', url: absoluteUrl('/') },
      }}
    />
  )
}

/** Fil d'Ariane — améliore l'affichage du chemin dans les résultats de recherche. */
export function BreadcrumbJsonLd({ items }: { items: { name: string; path: string }[] }) {
  return (
    <JsonLdScript
      data={{
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: items.map((item, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: item.name,
          item: absoluteUrl(item.path),
        })),
      }}
    />
  )
}
