import { describe, expect, it } from 'vitest'

import {
  DECOY_HASH,
  PASSWORD_MAX,
  PASSWORD_MIN,
  hashPassword,
  judgePassword,
  needsRehash,
  verifyPassword,
} from './password'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * CE QUE CE FICHIER PROTÈGE
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Une régression dans ce module ne se voit PAS. Un mot de passe mal haché s'écrit et
 * se relit sans erreur ; une vérification trop laxiste laisse entrer sans rien
 * journaliser. Il n'y a pas d'écran rouge, pas de test manuel qui échoue — c'est
 * exactement la catégorie de code qui doit être tenue par des assertions.
 *
 * Les cas sont donc écrits d'abord pour ce qui doit ÉCHOUER.
 *
 * ⚠️ LA DÉRIVATION EST LENTE À DESSEIN : 600 000 itérations coûtent quelques dizaines
 * de millisecondes chacune, et ce fichier en fait une poignée. C'est le prix d'un test
 * qui exerce le vrai chemin plutôt qu'une version affaiblie — un test qui baisserait
 * les itérations ne prouverait rien du code servi.
 */

describe('judgePassword', () => {
  it('refuse ce qui est trop court', () => {
    expect(judgePassword('court')).toEqual({ ok: false, reason: 'trop-court' })
    expect(judgePassword('a'.repeat(PASSWORD_MIN - 1))).toEqual({ ok: false, reason: 'trop-court' })
    expect(judgePassword('a'.repeat(PASSWORD_MIN)).ok).toBe(true)
  })

  it('refuse ce qui est trop long', () => {
    /* Le plafond protège le SERVICE et non le compte : sans lui, une chaîne d'un
       mégaoctet fait dériver le serveur pendant plusieurs secondes. */
    expect(judgePassword('a'.repeat(PASSWORD_MAX + 1))).toEqual({ ok: false, reason: 'trop-long' })
    expect(judgePassword('a'.repeat(PASSWORD_MAX)).ok).toBe(true)
  })

  it('refuse les mots de passe les plus courants, quelle que soit la casse', () => {
    expect(judgePassword('motdepasse123')).toEqual({ ok: false, reason: 'trop-courant' })
    expect(judgePassword('MotDePasse123')).toEqual({ ok: false, reason: 'trop-courant' })
    expect(judgePassword('PASSWORD123')).toEqual({ ok: false, reason: 'trop-courant' })
  })

  it('refuse le mot de passe qui contient l’adresse ou sa partie locale', () => {
    /* C'est le premier mot qu'un attaquant essaie : il connaît déjà l'adresse. */
    expect(judgePassword('marie.durand@exemple.fr', 'marie.durand@exemple.fr')).toEqual({
      ok: false,
      reason: 'contient-adresse',
    })
    expect(judgePassword('marie.durand2026', 'marie.durand@exemple.fr')).toEqual({
      ok: false,
      reason: 'contient-adresse',
    })
  })

  it('n’écarte pas une partie locale trop courte pour signifier quelque chose', () => {
    /* « al » dans « journalisme » n'est pas une réutilisation d'adresse. Sans ce
       plancher, une adresse comme `al@x.fr` interdirait la moitié du dictionnaire. */
    expect(judgePassword('journalisme-2026', 'al@exemple.fr').ok).toBe(true)
  })

  it('accepte une phrase de passe longue et ordinaire', () => {
    /* Aucune règle de classes de caractères : voir la note du module. Une phrase sans
       majuscule ni chiffre est plus solide qu'un « Motdepasse1! ». */
    expect(judgePassword('les chevaux dorment debout', 'marie@exemple.fr').ok).toBe(true)
  })
})

describe('hashPassword et verifyPassword', () => {
  it('accepte le bon mot de passe et refuse les autres', async () => {
    const stored = await hashPassword('les chevaux dorment debout')
    expect(await verifyPassword('les chevaux dorment debout', stored)).toBe(true)
    expect(await verifyPassword('les chevaux dorment Debout', stored)).toBe(false)
    expect(await verifyPassword('', stored)).toBe(false)
  })

  it('produit un condensat différent à chaque fois, le sel étant tiré au hasard', async () => {
    /* Deux comptes au même mot de passe ne doivent pas se reconnaître dans la table :
       sans sel, un attaquant qui lit la base voit immédiatement qui partage quoi, et
       une seule attaque casse tous les comptes concernés d'un coup. */
    const a = await hashPassword('les chevaux dorment debout')
    const b = await hashPassword('les chevaux dorment debout')
    expect(a).not.toBe(b)
    expect(await verifyPassword('les chevaux dorment debout', b)).toBe(true)
  })

  it('écrit le format annoncé, avec ses paramètres lisibles', async () => {
    /* Tout ce qu'il faut pour re-vérifier vit DANS la chaîne : c'est ce qui permet
       d'augmenter les itérations sans invalider les comptes existants. */
    const stored = await hashPassword('les chevaux dorment debout')
    const parts = stored.split('$')
    expect(parts).toHaveLength(5)
    expect(parts[0]).toBe('pbkdf2')
    expect(parts[1]).toBe('sha256')
    expect(Number(parts[2])).toBeGreaterThanOrEqual(600_000)
  })

  it('refuse un condensat illisible plutôt que de lever', async () => {
    /* Une chaîne corrompue en base doit refuser l'accès, pas faire tomber la connexion
       en erreur serveur : le compte reste récupérable par le code envoyé par courriel. */
    for (const corrompu of ['', 'n’importe quoi', 'pbkdf2$sha256$abc$sel$cle', 'a$b$c$d$e']) {
      expect(await verifyPassword('les chevaux dorment debout', corrompu)).toBe(false)
    }
  })

  it('refuse au-delà du plafond SANS dériver', async () => {
    /* La porte fermée à l'écriture doit l'être aussi à la lecture : sinon elle reste
       ouverte là où elle coûte exactement le même temps de dérivation. */
    const stored = await hashPassword('les chevaux dorment debout')
    const debut = Date.now()
    expect(await verifyPassword('a'.repeat(PASSWORD_MAX + 1), stored)).toBe(false)
    /* Une dérivation à 600 000 itérations ne tient pas en 20 ms : si le refus est
       rapide, c'est qu'il a bien eu lieu AVANT le calcul. */
    expect(Date.now() - debut).toBeLessThan(20)
  })
})

describe('needsRehash', () => {
  it('laisse tranquille un condensat au réglage du jour', async () => {
    expect(needsRehash(await hashPassword('les chevaux dorment debout'))).toBe(false)
  })

  it('réclame un rehachage pour un réglage plus faible ou un format inconnu', () => {
    expect(needsRehash('pbkdf2$sha256$1000$c2Vs$Y2xl')).toBe(true)
    expect(needsRehash('bcrypt$12$sel$cle$x')).toBe(true)
    expect(needsRehash('')).toBe(true)
  })
})

describe('DECOY_HASH', () => {
  it('se lit comme un vrai condensat et coûte une vraie dérivation', async () => {
    /*
     * ══════════════════════════════════════════════════════════════════════════
     * CE TEST GARDE UNE PROPRIÉTÉ DE SÉCURITÉ, PAS UNE VALEUR
     * ══════════════════════════════════════════════════════════════════════════
     *
     * Le leurre sert à ce qu'un échec de connexion coûte le MÊME TEMPS qu'un succès.
     * S'il devenait illisible — un caractère de trop dans le sel, un format modifié —
     * `verifyPassword` le rejetterait à la lecture, donc en microsecondes, et la durée
     * de la réponse recommencerait à dire si l'adresse est inscrite.
     *
     * ⚠️ CE DÉFAUT SERAIT INVISIBLE : la connexion continuerait de refuser correctement,
     * tous les autres tests passeraient, et seule une mesure au chronomètre le
     * révélerait. D'où ce test.
     */
    const debut = Date.now()
    expect(await verifyPassword('un mot de passe quelconque', DECOY_HASH)).toBe(false)
    const duree = Date.now() - debut

    /* 15 ms est un plancher volontairement bas : il ne mesure pas la performance de la
       machine, seulement le fait qu'une dérivation a EU LIEU. Un rejet au format
       reviendrait en moins d'une milliseconde. */
    expect(duree).toBeGreaterThan(15)
  })

  it('porte le même nombre d’itérations que les condensats neufs', () => {
    /* Un leurre à mille itérations reviendrait six cents fois plus vite qu'un vrai
       condensat : il donnerait l'écart de temps qu'il existe pour supprimer. */
    const leurre = DECOY_HASH.split('$')[2]
    const vrai = 'pbkdf2$sha256$600000$x$y'.split('$')[2]
    expect(leurre).toBe(vrai)
    expect(needsRehash(DECOY_HASH)).toBe(false)
  })
})
