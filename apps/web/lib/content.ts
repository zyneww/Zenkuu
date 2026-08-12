import { getLocale } from 'next-intl/server'

import { loadContent, type Content } from '@/content/locales'

/**
 * Dictionnaire d'interface du rendu serveur en cours.
 *
 * Remplace l'import direct `import { fr } from '@/content/fr'`, qui servait
 * forcément du français quelle que soit l'URL. La SIGNATURE d'usage ne change pas :
 * on récupère un objet de même forme, et tous les `fr.nav.home` du fichier
 * continuent de fonctionner tels quels. C'est délibéré — voir `content/locales`.
 *
 *     const fr = await getContent()
 *
 * Le nom de variable reste `fr` dans les composants, et ce n'est pas une négligence :
 * le renommer en `t` ou `content` aurait imposé de réécrire chaque site d'appel, soit
 * exactement le coût que cette conception cherche à éviter. Le nom est devenu celui
 * du dictionnaire par défaut, pas celui de la langue servie.
 */
export async function getContent(): Promise<Content> {
  return loadContent(await getLocale())
}
