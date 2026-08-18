import type { SeoDescriptions } from '@/content/seo'

/**
 * Registre des descriptions de page, par langue.
 *
 * Même forme que `content/locales/index.ts` — table de chargeurs STATIQUE, pour la
 * même raison : un `import()` construit sur une variable empêche le bundler de
 * découper par langue, et échoue à l'exécution plutôt qu'à la compilation quand un
 * fichier manque.
 *
 * Ce module n'est importé que par `getSeo()`, côté serveur. Il ne doit jamais entrer
 * dans `ContentProvider` : voir l'en-tête de `content/seo.ts`.
 */
const LOADERS: Record<string, () => Promise<SeoDescriptions>> = {
  en: async () => (await import('./en')).enSeo,
  es: async () => (await import('./es')).esSeo,
  de: async () => (await import('./de')).deSeo,
  it: async () => (await import('./it')).itSeo,
  nl: async () => (await import('./nl')).nlSeo,
  pl: async () => (await import('./pl')).plSeo,
  'pt-BR': async () => (await import('./pt-BR')).ptBRSeo,
  ru: async () => (await import('./ru')).ruSeo,
  tr: async () => (await import('./tr')).trSeo,
  vi: async () => (await import('./vi')).viSeo,
  ja: async () => (await import('./ja')).jaSeo,
  zh: async () => (await import('./zh')).zhSeo,
}

const CACHE = new Map<string, SeoDescriptions | undefined>()

/**
 * Descriptions pour une langue, repli anglais appliqué.
 *
 * Rend `undefined` pour le français : le texte français est déjà passé à
 * `describePage()` par la page elle-même, et une table qui le répéterait serait une
 * seconde source de vérité à tenir à jour.
 *
 * Pour les autres langues, l'anglais sert de socle clé par clé — une route ajoutée
 * dans les pages avant d'être traduite partout sert l'anglais plutôt que le français,
 * même politique que le dictionnaire.
 */
export async function loadSeo(locale: string): Promise<SeoDescriptions | undefined> {
  if (locale === 'fr') return undefined
  if (CACHE.has(locale)) return CACHE.get(locale)

  const english = LOADERS.en ? await LOADERS.en() : {}
  const loader = LOADERS[locale]
  const resolved = loader && locale !== 'en' ? { ...english, ...(await loader()) } : english

  CACHE.set(locale, resolved)
  return resolved
}
