'use client'

import { createContext, useCallback, useContext, type ReactNode } from 'react'

import { fr } from '@/content/fr'
import { merge, type Content, type DeepPartial } from '@/content/locales'
import { translate } from '@/content/phrases'

/**
 * Dictionnaire d'interface pour les composants CLIENT.
 *
 * Six composants du site sont marqués « use client » et consultent le dictionnaire :
 * ils ne peuvent pas appeler `getContent()`, qui est asynchrone et réservé au
 * serveur. Le layout, lui, l'a déjà résolu pour la requête en cours — il le passe
 * donc par contexte plutôt que de le faire recharger côté navigateur.
 *
 * ── CE QUE CELA COÛTE, ET POURQUOI C'EST ACCEPTABLE ───────────────────────────
 *
 * Le dictionnaire complet traverse la frontière serveur → client et se retrouve dans
 * la charge utile de chaque page. C'est mesurable : une trentaine de kilo-octets
 * avant compression, moins de dix après. L'alternative — un chargement dynamique par
 * langue côté client — ferait apparaître les libellés APRÈS l'hydratation, ce qui
 * revient à afficher une interface muette pendant un instant sur chaque page.
 *
 * ── LES FONCTIONS NE TRAVERSENT PAS ───────────────────────────────────────────
 *
 * Attention : 23 entrées du dictionnaire sont des fonctions, et une fonction ne peut
 * pas franchir la frontière serveur → client. Elles arrivent donc `undefined` côté
 * client. C'est sans conséquence AUJOURD'HUI — aucun des six composants client ne
 * les utilise — mais ce serait un `TypeError` silencieux le jour où l'un d'eux s'y
 * mettrait. Le repli sur `fr` ci-dessous les rétablit dans leur version française,
 * ce qui vaut mieux qu'un plantage.
 */

/**
 * Le contexte porte un dictionnaire PARTIEL, et le type le dit.
 *
 * Ce qui arrive ici a traversé la frontière serveur → client, donc a perdu ses
 * fonctions (voir `stripFunctions`). Le typer `Content` mentirait au premier lecteur
 * qui tenterait d'appeler `content.search.noResult(q)` : le champ existe dans le
 * type, pas dans l'objet.
 */
const ContentContext = createContext<DeepPartial<Content> | null>(null)

export function ContentProvider({
  content,
  children,
}: {
  content: DeepPartial<Content>
  children: ReactNode
}) {
  return <ContentContext.Provider value={content}>{children}</ContentContext.Provider>
}

/**
 * Accès au dictionnaire depuis un composant client.
 *
 * Repli sur le français hors fournisseur plutôt qu'une exception : cela permet
 * d'utiliser les composants concernés dans un test ou un rendu isolé sans monter
 * tout l'arbre — même choix que `useCurrency`.
 *
 * Le repli couvre AUSSI les fonctions perdues à la sérialisation : on fusionne le
 * dictionnaire reçu par-dessus le français, plutôt que de le substituer.
 */
export function useContent(): Content {
  const value = useContext(ContentContext)
  if (!value) return fr

  // Fusion PROFONDE et non de surface : `{ ...fr, ...value }` remplacerait chaque
  // branche en bloc par sa version dépouillée, et les fonctions resteraient perdues.
  // La fusion profonde ne remplace que les feuilles réellement transmises.
  return merge(fr, value)
}

/**
 * Traducteur de PHRASES pour un composant client.
 *
 * Pendant du `getPhrase()` serveur, même usage :
 *
 *     const t = usePhrase()
 *     <button>{t('Comparer')}</button>
 *
 * Il lit le contexte DIRECTEMENT plutôt que de passer par `useContent()` : la table
 * de phrases est un `Record` de chaînes, elle ne perd rien à la sérialisation, et la
 * refusionner avec le français — qui est vide par définition — coûterait une fusion
 * profonde par rendu pour un résultat identique.
 */
export function usePhrase(): (text: string) => string {
  const value = useContext(ContentContext)
  const phrases = value?.phrases
  return useCallback((text: string) => translate(phrases, text), [phrases])
}
