import { getLocale } from 'next-intl/server'

import { loadContent, type Content } from '@/content/locales'
import { translate } from '@/content/phrases'

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

/**
 * Traducteur de PHRASES pour le rendu serveur en cours.
 *
 * Rend une fonction plutôt qu'une table, et l'usage explique pourquoi :
 *
 *     const t = await getPhrase()
 *     <h1>{t('Carte thermique du marché')}</h1>
 *
 * Le texte français reste À SA PLACE, dans le composant : un relecteur voit ce que la
 * page affiche sans ouvrir un second fichier, et une phrase non traduite se rend en
 * français plutôt que de laisser un trou. Voir `content/phrases.ts` pour le partage
 * avec le dictionnaire structuré.
 */
export async function getPhrase(): Promise<(text: string) => string> {
  const content = await getContent()
  return (text) => translate(content.phrases, text)
}
