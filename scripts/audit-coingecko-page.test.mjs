import { describe, expect, it } from 'vitest'

import {
  capturesIdentiques,
  cheminsDeCapture,
  deltaDEtat,
  indexPremierVisible,
  lireArguments,
  mecanismeTheme,
  signalDeFond,
  themeDepuisSignaux,
} from './audit-coingecko-page.mjs'

describe('lireArguments', () => {
  it('lit url et slug', () => {
    const a = lireArguments(['--url=/fr', '--slug=accueil'])
    expect(a.url).toBe('/fr')
    expect(a.slug).toBe('accueil')
  })

  it('applique l’origine de CoinGecko par défaut', () => {
    expect(lireArguments(['--url=/fr', '--slug=accueil']).base).toBe('https://www.coingecko.com')
  })

  it('accepte une origine explicite, pour auditer ZENKUU en local', () => {
    const a = lireArguments(['--url=/fr', '--slug=z', '--base=http://localhost:3000'])
    expect(a.base).toBe('http://localhost:3000')
  })

  it('découpe la liste de sélecteurs sur les virgules', () => {
    const a = lireArguments(['--url=/fr', '--slug=a', '--selectors=table td,a.lien'])
    expect(a.selectors).toEqual(['table td', 'a.lien'])
  })

  it('rend une liste de sélecteurs vide quand l’argument est absent', () => {
    expect(lireArguments(['--url=/fr', '--slug=a']).selectors).toEqual([])
  })

  it('exige url et slug', () => {
    expect(() => lireArguments(['--url=/fr'])).toThrow(/slug/)
    expect(() => lireArguments(['--slug=a'])).toThrow(/url/)
  })

  it('refuse un slug qui sortirait du dossier de références', () => {
    /* Un slug est un nom de dossier, pas un chemin : sans ce garde-fou,
       `--slug=../../..` écrirait des captures n'importe où dans le dépôt. */
    expect(() => lireArguments(['--url=/fr', '--slug=../evasion'])).toThrow(/slug/)
  })
})

describe('cheminsDeCapture', () => {
  it('rend six chemins, trois largeurs par deux thèmes', () => {
    const chemins = cheminsDeCapture('accueil')
    expect(chemins).toHaveLength(6)
  })

  it('nomme les fichiers largeur-thème, sous le dossier du slug', () => {
    const noms = cheminsDeCapture('accueil').map((c) => c.fichier)
    expect(noms).toEqual([
      'docs/references/coingecko/accueil/360-clair.png',
      'docs/references/coingecko/accueil/360-sombre.png',
      'docs/references/coingecko/accueil/768-clair.png',
      'docs/references/coingecko/accueil/768-sombre.png',
      'docs/references/coingecko/accueil/1440-clair.png',
      'docs/references/coingecko/accueil/1440-sombre.png',
    ])
  })

  it('porte la largeur et le thème de chaque capture', () => {
    const [premier] = cheminsDeCapture('accueil')
    expect(premier.largeur).toBe(360)
    expect(premier.theme).toBe('clair')
  })
})

describe('mecanismeTheme', () => {
  it('choisit le cookie CoinGecko pour www.coingecko.com', () => {
    expect(mecanismeTheme('https://www.coingecko.com')).toBe('coingecko')
  })

  it('choisit le cookie CoinGecko pour un sous-domaine de coingecko.com', () => {
    expect(mecanismeTheme('https://fr.coingecko.com')).toBe('coingecko')
  })

  it('choisit le stockage local de ZENKUU pour toute autre origine', () => {
    expect(mecanismeTheme('http://localhost:3000')).toBe('zenkuu')
  })

  it('ne confond pas un domaine qui contient « coingecko » sans l’être', () => {
    /* `coingecko.com.evil.example` n'EST PAS coingecko.com : sans ce garde, une
       correspondance par sous-chaîne appliquerait le cookie CoinGecko à un site
       qui n'a rien à voir. */
    expect(mecanismeTheme('https://coingecko.com.evil.example')).toBe('zenkuu')
  })
})

describe('themeDepuisSignaux', () => {
  it('reconnaît « darktheme » seul', () => {
    expect(themeDepuisSignaux({ classesBody: 'darktheme', fondBody: 'rgb(255, 255, 255)' })).toBe('sombre')
  })

  it('reconnaît « tw-dark » seul, sans exiger « darktheme »', () => {
    /* Un gabarit qui ne pose que l'un des deux marqueurs ne doit pas faire lever le
       contrôle à tort : les deux valent preuve de bascule. */
    expect(themeDepuisSignaux({ classesBody: 'tw-dark tw-flex', fondBody: 'rgb(255, 255, 255)' })).toBe('sombre')
  })

  it('retombe sur la couleur de fond quand aucun marqueur de classe n’est présent', () => {
    expect(themeDepuisSignaux({ classesBody: 'tw-flex tw-container', fondBody: 'rgb(10, 10, 12)' })).toBe('sombre')
    expect(themeDepuisSignaux({ classesBody: 'tw-flex tw-container', fondBody: 'rgb(255, 255, 255)' })).toBe('clair')
  })

  it('rend null quand ni la classe ni le fond ne tranchent', () => {
    /* Constaté sur une fiche d'actif (`/fr/coins/bitcoin`) : `body` y reste teinté
       d'un bleu-nuit `rgb(33, 45, 59)`, identique octet pour octet quel que soit le
       cookie `is_dark`. Ni marqueur de classe ni fond décisif : deviner ferait
       lever le contrôle à tort sur un gabarit qui n'a simplement pas de signal
       détectable, pas sur un thème qui n'a pas basculé. */
    expect(themeDepuisSignaux({ classesBody: '', fondBody: 'rgb(33, 45, 59)' })).toBeNull()
  })
})

describe('signalDeFond', () => {
  it('rend « sombre » pour un fond quasi noir', () => {
    expect(signalDeFond('rgb(13, 18, 23)')).toBe('sombre')
  })

  it('rend « clair » pour un fond quasi blanc', () => {
    expect(signalDeFond('rgb(255, 255, 255)')).toBe('clair')
  })

  it('rend « clair » pour un fond transparent, jamais confondu avec du noir', () => {
    /* `body` ne porte pas toujours sa propre couleur : sur CoinGecko en clair, elle
       reste `rgba(0, 0, 0, 0)`. Sans ce garde, cette absence de signal se lirait
       comme un fond noir — donc sombre. */
    expect(signalDeFond('rgba(0, 0, 0, 0)')).toBe('clair')
  })

  it('rend null pour une couleur opaque de luminance intermédiaire', () => {
    /* Le bleu-nuit de la fiche d'actif : ni assez sombre, ni assez clair pour
       trancher sans risquer un faux positif sur un bandeau de marque. */
    expect(signalDeFond('rgb(33, 45, 59)')).toBeNull()
  })

  it('rend null pour une valeur illisible plutôt que de lever', () => {
    expect(signalDeFond('transparent')).toBeNull()
  })
})

describe('capturesIdentiques', () => {
  it('rend vrai pour deux tampons d’octets identiques', () => {
    expect(capturesIdentiques(Buffer.from('même contenu'), Buffer.from('même contenu'))).toBe(true)
  })

  it('rend faux dès qu’un seul octet diffère', () => {
    expect(capturesIdentiques(Buffer.from('clair'), Buffer.from('sombre'))).toBe(false)
  })

  it('rend faux pour deux tampons de même longueur mais de contenu différent', () => {
    /* Deux images de même poids peuvent différer en contenu : la comparaison porte
       sur les octets, jamais sur la seule longueur. */
    expect(capturesIdentiques(Buffer.from([1, 2, 3]), Buffer.from([1, 2, 4]))).toBe(false)
  })
})

describe('lireArguments — interactions', () => {
  it('découpe la liste de sélecteurs interactifs sur les virgules', () => {
    const a = lireArguments(['--url=/fr', '--slug=a', '--interactions=tr,a.lien'])
    expect(a.interactions).toEqual(['tr', 'a.lien'])
  })

  it('rend une liste vide quand l’argument est absent', () => {
    expect(lireArguments(['--url=/fr', '--slug=a']).interactions).toEqual([])
  })
})

describe('deltaDEtat', () => {
  /* Un état interactif ne se décrit pas par un dump complet : trois états sur dix-huit
     sélecteurs et deux thèmes produiraient des milliers de lignes dont l'immense
     majorité serait identique au repos. Ce qui porte l'information, c'est ce qui
     CHANGE — et c'est cela seul que le système de dessin consomme. */
  it('ne garde que les propriétés qui ont changé', () => {
    const repos = { color: 'rgb(0, 0, 0)', backgroundColor: 'rgb(255, 255, 255)' }
    const actif = { color: 'rgb(0, 0, 255)', backgroundColor: 'rgb(255, 255, 255)' }
    expect(deltaDEtat(repos, actif)).toEqual({ color: 'rgb(0, 0, 255)' })
  })

  it('rend un objet vide quand rien ne bouge', () => {
    const etat = { color: 'rgb(0, 0, 0)' }
    expect(deltaDEtat(etat, { ...etat })).toEqual({})
  })

  it('signale une propriété apparue', () => {
    expect(deltaDEtat({}, { outlineColor: 'rgb(1, 2, 3)' })).toEqual({
      outlineColor: 'rgb(1, 2, 3)',
    })
  })

  it('signale une propriété disparue plutôt que de la taire', () => {
    /* Une bordure qui DISPARAÎT au survol est un fait de dessin. L'omettre
       laisserait croire qu'elle persiste. */
    expect(deltaDEtat({ borderTopWidth: '1px' }, {})).toEqual({ borderTopWidth: null })
  })

  it('tolère un état absent — un sélecteur sans correspondance', () => {
    expect(deltaDEtat(null, { color: 'rgb(1, 1, 1)' })).toEqual({})
    expect(deltaDEtat({ color: 'rgb(1, 1, 1)' }, null)).toEqual({})
  })
})

describe('indexPremierVisible', () => {
  /* CoinGecko déclare souvent une variante masquée AVANT la variante visible du
     même composant (onglets de filtre, bascules d'affichage) : retenir
     systématiquement la première correspondance viserait un doublon invisible. */
  it('retient le premier nœud visible quand les précédents sont masqués', () => {
    expect(indexPremierVisible([false, false, true, false])).toBe(2)
  })

  it('retient le premier nœud quand il est déjà visible', () => {
    expect(indexPremierVisible([true, false])).toBe(0)
  })

  it('rend null quand aucune correspondance n’est visible', () => {
    expect(indexPremierVisible([false, false])).toBeNull()
  })
})
