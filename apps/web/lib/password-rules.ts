/**
 * ══════════════════════════════════════════════════════════════════════════════
 * LES DEUX BORNES DE LONGUEUR — LA SEULE PART DES RÈGLES QUI TRAVERSE LE RÉSEAU
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Elles vivaient dans `lib/password.ts`, avec la dérivation. Le formulaire des réglages
 * en importait `PASSWORD_MIN` pour écrire « Au moins 10 caractères » dans son champ —
 * et embarquait au passage TOUT le module dans le paquet du navigateur : la table des
 * mots de passe courants, la dérivation PBKDF2, la comparaison à temps constant et le
 * condensat leurre, dont la construction s'exécute au chargement du module.
 *
 * ⚠️ CE N'ÉTAIT PAS UNE FUITE DE SECRET — il n'y en a aucun là-dedans — mais c'était
 * du code serveur expédié au client pour un entier, et surtout la contradiction d'une
 * phrase que `password.ts` affirme de lui-même : « la seule porte par laquelle un mot
 * de passe entre ou sort ». Une porte n'a pas à voyager avec ses visiteurs.
 *
 * Ce fichier ne contient donc QUE ce que les deux côtés doivent partager. Les règles
 * elles-mêmes — `judgePassword` — restent au serveur, où elles décident.
 *
 * ── POURQUOI CES DEUX VALEURS ET PAS D'AUTRES ─────────────────────────────
 *
 * 10 caractères : la longueur est la seule mesure qui corrèle vraiment à la difficulté
 * de deviner. Le NIST déconseille depuis 2017 les règles de classes de caractères, qui
 * produisent des mots de passe PIRES — « Motdepasse1! » est une transformation
 * prévisible d'un mot du dictionnaire.
 *
 * 128 caractères : un plafond de SERVICE et non de sécurité. Sans lui, une chaîne d'un
 * mégaoctet fait dériver le serveur pendant plusieurs secondes, et quelques requêtes
 * simultanées suffisent à le saturer — la lenteur qui protège devient l'arme.
 */

export const PASSWORD_MIN = 10
export const PASSWORD_MAX = 128
