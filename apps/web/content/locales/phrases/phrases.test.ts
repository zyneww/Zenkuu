import { describe, expect, it } from 'vitest'

import { dePhrases } from './de'
import { enPhrases } from './en'
import { esPhrases } from './es'
import { itPhrases } from './it'
import { jaPhrases } from './ja'
import { nlPhrases } from './nl'
import { plPhrases } from './pl'
import { ptBRPhrases } from './pt-BR'
import { ruPhrases } from './ru'
import { trPhrases } from './tr'
import { viPhrases } from './vi'
import { zhPhrases } from './zh'

/**
 * Garde-fous de la table de phrases.
 *
 * Le texte français EST la clé, ce qui rend deux fautes indétectables à la lecture :
 *
 *   · UNE TRADUCTION IDENTIQUE À SA CLÉ ne fait rien du tout. `translate()` rendrait
 *     exactement le même texte sans l'entrée, si bien que la ligne donne l'illusion
 *     d'une couverture qu'elle n'apporte pas ;
 *
 *   · UNE PHRASE À TROU dont la traduction perd son `{n}` s'affiche amputée, sans
 *     qu'aucun typage ne s'en émeuve — `Phrases` est un `Record` ouvert.
 *
 * Les douze langues doivent par ailleurs couvrir le MÊME ensemble : une phrase
 * traduite en dix langues sur douze laisse deux pages à moitié françaises.
 */
const TABLES = {
  en: enPhrases,
  es: esPhrases,
  de: dePhrases,
  it: itPhrases,
  nl: nlPhrases,
  pl: plPhrases,
  'pt-BR': ptBRPhrases,
  ru: ruPhrases,
  tr: trPhrases,
  vi: viPhrases,
  ja: jaPhrases,
  zh: zhPhrases,
} as const

const locales = Object.keys(TABLES) as (keyof typeof TABLES)[]
const reference = Object.keys(enPhrases).sort()

describe('table de phrases', () => {
  it.each(locales)('%s couvre les mêmes phrases que l’anglais', (locale) => {
    expect(Object.keys(TABLES[locale]).sort()).toEqual(reference)
  })

  /**
   * Certaines entrées coïncident LÉGITIMEMENT avec le français : les sigles
   * (« ETF », « API ») et les paliers de période, où « 1 M » vaut aussi bien pour
   * *un mois* que pour *1 mês*, *1 mese* ou *1 Monat*.
   *
   * Le test écarte donc les entrées courtes plutôt que d'entretenir une liste
   * d'exceptions. Mesuré sur la table : le plus long palier fait 4 caractères
   * (« 24 h »), et la plus courte phrase réelle en fait 8 (« À propos »). Le seuil
   * passe entre les deux, et exiger en plus une espace écarte les mots isolés.
   */
  const PROSE = 8

  /**
   * Un emplacement nommé n'est pas du texte : `{count} articles` ne compte qu'un
   * mot, et « articles » s'écrit pareil en anglais. Les retirer avant de mesurer
   * évite de prendre l'espace qui les sépare du mot pour celle d'une phrase.
   */
  const words = (text: string) => text.replace(/\{\w+\}/g, '').trim()

  it.each(locales)('%s ne recopie aucune phrase française', (locale) => {
    const copied = Object.entries(TABLES[locale])
      .filter(([key, text]) => {
        if (key !== text) return false
        const prose = words(key)
        return prose.includes(' ') && prose.length >= PROSE
      })
      .map(([key]) => key)

    expect(copied).toEqual([])
  })

  it.each(locales)('%s conserve les jetons de substitution', (locale) => {
    const broken = Object.entries(TABLES[locale])
      .filter(([key, text]) =>
        (key.match(/\{[^}]+\}/g) ?? []).some((token) => !text.includes(token)),
      )
      .map(([key]) => key)

    expect(broken).toEqual([])
  })
})
