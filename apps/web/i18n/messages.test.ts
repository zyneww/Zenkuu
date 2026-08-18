import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { TRANSLATED_LOCALES } from '../components/settings/languages'

/**
 * Trois listes décrivent les mêmes langues et vivent dans trois fichiers :
 * `TRANSLATED_LOCALES` (routage), la table `MESSAGES` de `request.ts` (chargement)
 * et le contenu du dossier `messages/`. Elles se sont déjà désynchronisées : neuf
 * langues étaient routables sans fichier de messages, et servaient donc l'anglais
 * derrière une URL `/ja/…`.
 *
 * Le repli de `request.ts` empêche l'erreur 500 mais ne DIT rien : la page s'affiche,
 * dans la mauvaise langue. Ces tests transforment ce silence en échec de build.
 */
const MESSAGES_DIR = join(import.meta.dirname, '..', 'messages')

/** Aplatit `{a:{b:'x'}}` en `{'a.b':'x'}` — comparer des arbres compare mal. */
function flatten(value: unknown, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (child !== null && typeof child === 'object') Object.assign(out, flatten(child, path))
    else out[path] = String(child)
  }
  return out
}

function read(locale: string): Record<string, string> {
  return flatten(JSON.parse(readFileSync(join(MESSAGES_DIR, `${locale}.json`), 'utf8')))
}

const reference = read('fr')
const referenceKeys = Object.keys(reference).sort()

describe('messages', () => {
  it('couvre chaque langue routable', () => {
    const onDisk = readdirSync(MESSAGES_DIR)
      .filter((name) => name.endsWith('.json'))
      .map((name) => name.slice(0, -'.json'.length))
      .sort()

    expect(onDisk).toEqual([...TRANSLATED_LOCALES].sort())
  })

  it.each(TRANSLATED_LOCALES.filter((locale) => locale !== 'fr'))(
    '%s a exactement les clés du français',
    (locale) => {
      expect(Object.keys(read(locale)).sort()).toEqual(referenceKeys)
    },
  )

  /**
   * Une PHRASE identique au français est un oubli de traduction ; un MOT identique
   * ne l'est pas. « Total » s'écrit pareil en portugais, « Volume 24 h » aussi, et
   * « Ctrl + K » dans les treize langues.
   *
   * Le seuil porte donc sur la longueur, et non sur une liste d'exceptions qu'il
   * faudrait rallonger à chaque libellé heureux. Mesuré sur `fr.json` : le plus long
   * libellé fait 25 caractères, le plus court texte d'aide en fait 38, et la plus
   * longue chaîne qui n'est ni l'un ni l'autre en fait 34. Trente-cinq passe donc
   * entre les deux populations sans couper au milieu de l'une.
   */
  const SENTENCE = 35

  it.each(TRANSLATED_LOCALES.filter((locale) => locale !== 'fr'))(
    '%s ne recopie aucune phrase française',
    (locale) => {
      const copied = Object.entries(read(locale))
        .filter(([key, text]) => text.length >= SENTENCE && text === reference[key])
        .map(([key]) => key)

      expect(copied).toEqual([])
    },
  )

  /** `{name}` non repris dans la traduction produit une phrase amputée à l'écran. */
  it.each(TRANSLATED_LOCALES.filter((locale) => locale !== 'fr'))(
    '%s conserve les jetons de substitution',
    (locale) => {
      const translated = read(locale)
      const broken = Object.entries(reference)
        .filter(([key, text]) => {
          const tokens = text.match(/\{[a-zA-Z]+\}/g) ?? []
          return tokens.some((token) => !translated[key]?.includes(token))
        })
        .map(([key]) => key)

      expect(broken).toEqual([])
    },
  )
})
