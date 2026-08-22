import { describe, expect, it } from 'vitest'

import { isSuitableVideo, parseIsoDuration } from './youtube'

/**
 * Le filtre est la seule logique non triviale de cet adaptateur, et c'est aussi la
 * seule qui échouerait EN SILENCE : une durée mal lue n'affiche pas d'erreur, elle
 * vide la section « En vidéo » — ou pire, elle y laisse passer ce que le §7 interdit.
 */
describe('parseIsoDuration', () => {
  it('lit les trois unités et leurs combinaisons', () => {
    expect(parseIsoDuration('PT45S')).toBe(45)
    expect(parseIsoDuration('PT12M4S')).toBe(724)
    expect(parseIsoDuration('PT1H2M11S')).toBe(3731)
    expect(parseIsoDuration('PT2H')).toBe(7200)
    expect(parseIsoDuration('P1DT1H')).toBe(90_000)
  })

  it('rend null plutôt que zéro sur une entrée illisible', () => {
    // Zéro passerait le plancher de durée à l'envers : la vidéo serait écartée pour
    // la mauvaise raison, et un changement de format chez YouTube viderait la
    // section sans que rien ne le signale.
    expect(parseIsoDuration(undefined)).toBeNull()
    expect(parseIsoDuration('')).toBeNull()
    expect(parseIsoDuration('PT')).toBeNull()
    expect(parseIsoDuration('12:04')).toBeNull()
  })
})

describe('isSuitableVideo', () => {
  const base = {
    title: 'Comprendre la capitalisation boursière',
    durationSeconds: 600,
    embeddable: true,
    live: false,
  }

  it('accepte une vidéo pédagogique de durée raisonnable', () => {
    expect(isSuitableVideo(base)).toBe(true)
  })

  it('écarte ce qui ne pourrait pas être joué', () => {
    expect(isSuitableVideo({ ...base, embeddable: false })).toBe(false)
    expect(isSuitableVideo({ ...base, live: true })).toBe(false)
    expect(isSuitableVideo({ ...base, durationSeconds: null })).toBe(false)
  })

  it('écarte les Shorts et les formats trop longs', () => {
    expect(isSuitableVideo({ ...base, durationSeconds: 48 })).toBe(false)
    expect(isSuitableVideo({ ...base, durationSeconds: 3 * 3600 })).toBe(false)
  })

  it('écarte les promesses de gain (§7), pas les sujets sensibles', () => {
    expect(isSuitableVideo({ ...base, title: 'Les 3 cryptos qui vont exploser en 2026' })).toBe(false)
    expect(isSuitableVideo({ ...base, title: 'Comment devenir riche avec la bourse' })).toBe(false)
    expect(isSuitableVideo({ ...base, title: 'Mes signaux de trading du jour' })).toBe(false)
    expect(isSuitableVideo({ ...base, title: 'Un portefeuille x100 en 6 mois' })).toBe(false)

    // Ceux-là sont des sujets d'explication légitimes et doivent passer.
    expect(isSuitableVideo({ ...base, title: 'Qu’est-ce qu’une bulle spéculative ?' })).toBe(true)
    expect(isSuitableVideo({ ...base, title: 'Reconnaître une arnaque au trading' })).toBe(true)
    expect(isSuitableVideo({ ...base, title: 'Le krach de 1929 expliqué' })).toBe(true)
  })
})
