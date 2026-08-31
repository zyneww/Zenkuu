import { fr } from '@/content/fr'

/**
 * Registre des traductions de l'interface.
 *
 * ── POURQUOI CETTE FORME PLUTÔT QUE DES FICHIERS DE MESSAGES ──────────────────
 *
 * next-intl attend des JSON plats consultés par clé : `t('nav.home')`. C'est la
 * convention, et elle sert bien les textes NOUVEAUX (cf. `messages/*.json`). Elle ne
 * convenait pas à la reprise de l'existant, et le calcul mérite d'être posé.
 *
 * Le dictionnaire français compte 206 entrées consultées depuis 43 fichiers, et
 * 13 d'entre elles sont des FONCTIONS — `convertedNotice(from, to, date)` et ses
 * pareilles, dont certaines portent une branche conditionnelle. Basculer sur des
 * clés aurait imposé deux chantiers : réécrire des centaines de sites d'appel
 * `fr.x.y` en `t('x.y')`, et convertir chaque fonction en message ICU — la dernière
 * avec un `select` pour son cas optionnel.
 *
 * En gardant la FORME de l'objet, les sites d'appel ne bougent pas d'un caractère,
 * les fonctions continuent de fonctionner nativement, et seule la ligne d'import
 * change. Le risque de régression sur 43 fichiers passe de « élevé » à « nul ».
 *
 * ── LE TYPAGE FAIT LE TRAVAIL DE RELECTURE ────────────────────────────────────
 *
 * Chaque traduction est un `DeepPartial<Content>` : TypeScript refuse une clé qui
 * n'existe pas dans le français — une faute de frappe ne peut donc pas se glisser en
 * silence — tout en tolérant une traduction PARTIELLE. C'est ce qui rend l'ajout
 * progressif praticable : un fichier peut couvrir la navigation avant les tableaux.
 *
 * ── LE FRANÇAIS EST LA RÉFÉRENCE, L'ANGLAIS LE PREMIER REPLI ──────────────────
 *
 * Une clé absente d'une traduction retombe sur l'anglais, puis sur le français. Ce
 * n'est pas un détail d'implémentation : sans ce repli, une traduction incomplète
 * afficherait des trous, ce qui est pire que du français. Et l'anglais avant le
 * français parce qu'un lecteur hispanophone lit plus probablement l'anglais.
 */

export type Content = typeof fr

/**
 * Élargit un type littéral vers son type primitif.
 *
 * INDISPENSABLE, et le piège vaut d'être nommé : `fr` est déclaré `as const`, si
 * bien que le type de `fr.nav.home` n'est pas `string` mais le littéral `'Accueil'`.
 * Sans élargissement, une traduction ne serait assignable que si elle répétait
 * exactement le texte français — c'est-à-dire jamais. Le compilateur aurait refusé
 * `'Home'` avec un message parfaitement obscur.
 */
type Widen<T> = T extends string
  ? string
  : T extends number
    ? number
    : T extends boolean
      ? boolean
      : T

/**
 * Rend chaque branche facultative, récursivement.
 *
 * Trois cas traités séparément, dans cet ordre :
 *   • les FONCTIONS restent atomiques — on les remplace en bloc ou pas du tout ;
 *   • les TABLEAUX aussi, avec leurs éléments élargis. Les rendre partiels index par
 *     index produirait un type qu'aucun littéral de tableau ne satisferait ;
 *   • les objets descendent récursivement.
 */
export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends (...args: never[]) => unknown
    ? T[K]
    : T[K] extends readonly (infer U)[]
      ? readonly Widen<U>[]
      : T[K] extends object
        ? DeepPartial<T[K]>
        : Widen<T[K]>
}

export type Translation = DeepPartial<Content>

/**
 * Chargeurs, déclarés STATIQUEMENT.
 *
 * Un `import()` construit à partir d'une variable (`./${locale}`) empêcherait le
 * bundler de savoir quels fichiers embarquer : il les inclurait tous dans chaque
 * page, ou aucun. La table explicite lui permet au contraire de découper par langue.
 */
const LOADERS: Record<string, () => Promise<{ default: Translation }>> = {
  en: () => import('./en'),
  es: () => import('./es'),
  de: () => import('./de'),
  it: () => import('./it'),
  nl: () => import('./nl'),
  pl: () => import('./pl'),
  'pt-BR': () => import('./pt-BR'),
  ru: () => import('./ru'),
  tr: () => import('./tr'),
  vi: () => import('./vi'),
  ja: () => import('./ja'),
  zh: () => import('./zh'),
}

/** Langues pour lesquelles un fichier de traduction existe RÉELLEMENT. */
export const AVAILABLE_TRANSLATIONS: readonly string[] = ['fr', ...Object.keys(LOADERS)]

export function hasTranslation(locale: string): boolean {
  return AVAILABLE_TRANSLATIONS.includes(locale)
}

/**
 * Fusion profonde d'une traduction sur une base.
 *
 * `undefined` ne remplace jamais : c'est ce qui distingue « non traduit » de
 * « volontairement vide ». Une chaîne vide, elle, remplace — un traducteur peut
 * légitimement vouloir supprimer une mention qui n'a pas de sens dans sa langue.
 */
export function merge<T>(base: T, override: DeepPartial<T> | undefined): T {
  if (!override) return base

  const out = { ...base } as Record<string, unknown>

  for (const [key, value] of Object.entries(override as Record<string, unknown>)) {
    if (value === undefined) continue

    const current = out[key]
    // Les fonctions et les tableaux sont remplacés en BLOC. Fusionner un tableau
    // élément par élément produirait des listes hybrides — la moitié traduite, la
    // moitié non — dont l'ordre n'aurait plus de sens.
    if (
      typeof value === 'object' &&
      value !== null &&
      !Array.isArray(value) &&
      typeof current === 'object' &&
      current !== null &&
      !Array.isArray(current)
    ) {
      out[key] = merge(current, value as DeepPartial<typeof current>)
    } else {
      out[key] = value
    }
  }

  return out as T
}

/**
 * Retire les fonctions, récursivement.
 *
 * INDISPENSABLE avant de faire traverser le dictionnaire vers un composant client :
 * React refuse net de sérialiser une fonction et lève « Functions cannot be passed
 * directly to Client Components ». Sans ce nettoyage, monter le fournisseur ferait
 * tomber toutes les pages — les 23 entrées interpolées suffisent.
 *
 * Les clés retirées ne sont pas perdues pour autant : `useContent` refusionne ce
 * qu'il reçoit PAR-DESSUS le dictionnaire français, ce qui les rétablit dans leur
 * version française. Une fonction ne sera donc jamais traduite côté client — limite
 * réelle, acceptée parce qu'aucun composant client n'en consomme, et signalée ici
 * pour que le premier qui le fera sache pourquoi son texte reste en français.
 */
export function stripFunctions<T>(value: T): DeepPartial<T> {
  if (typeof value === 'function') return undefined as unknown as DeepPartial<T>

  if (Array.isArray(value)) {
    return value.map((entry) => stripFunctions(entry)) as unknown as DeepPartial<T>
  }

  if (typeof value === 'object' && value !== null) {
    const out: Record<string, unknown> = {}
    for (const [key, entry] of Object.entries(value)) {
      const cleaned = stripFunctions(entry)
      if (cleaned !== undefined) out[key] = cleaned
    }
    return out as DeepPartial<T>
  }

  return value as DeepPartial<T>
}

/** Traductions déjà résolues — le calcul de fusion ne se refait pas à chaque requête. */
const CACHE = new Map<string, Content>()

/**
 * Dictionnaire complet pour une langue, replis appliqués.
 *
 * Accepte n'importe quelle étiquette : une langue sans traduction rend l'anglais
 * s'il existe, sinon le français. Aucun appel ne peut donc échouer, ce qui compte —
 * ce dictionnaire est consulté au rendu de CHAQUE page.
 */
export async function loadContent(locale: string): Promise<Content> {
  const cached = CACHE.get(locale)
  if (cached) return cached

  let resolved: Content = fr

  if (locale !== 'fr') {
    // L'anglais d'abord : il sert de socle à toutes les autres langues, si bien
    // qu'une traduction partielle retombe sur lui plutôt que sur le français.
    const english = LOADERS.en ? (await LOADERS.en()).default : undefined
    resolved = merge(resolved, english as DeepPartial<Content>)

    const loader = LOADERS[locale]
    if (loader && locale !== 'en') {
      resolved = merge(resolved, (await loader()).default as DeepPartial<Content>)
    }
  }

  CACHE.set(locale, resolved)
  return resolved
}
