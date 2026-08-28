import { cache } from 'react'
import { cookies } from 'next/headers'

import { DB_ENABLED, findSessionAccount, hashToken, type Account } from '@zenkuu/db'

import { MAILER_ENABLED } from '@/lib/mailer'
import { ensureVisitorId, readVisitorId } from '@/lib/visitor'

/**
 * SESSION — lecture du compte connecté, et clé de rangement des données.
 *
 * ── LES DEUX IDENTITÉS DU SITE, ET POURQUOI IL Y EN A DEUX ────────────────────
 *
 * Un visiteur de ZENKUU peut suivre un actif et enregistrer un écran SANS compte : c'est
 * un site d'information, et exiger une inscription pour mettre une étoile à côté du
 * bitcoin serait disproportionné. Cette identité-là tient dans un cookie anonyme
 * (`lib/visitor.ts`).
 *
 * Un compte n'ajoute donc pas de fonctionnalité. Il ajoute la PORTABILITÉ : la même
 * liste sur le téléphone et sur l'ordinateur, et la survie au nettoyage du
 * navigateur. C'est la seule promesse qu'il porte, et l'interface ne doit pas en
 * faire d'autres.
 *
 * Les deux se rangent sous la même colonne `user_id`. `ownerId()` dit laquelle
 * s'applique : le compte s'il y en a un, le cookie anonyme sinon. Aucun appelant n'a
 * à connaître la distinction.
 *
 * ── CE QUE LA CONNEXION FAIT DES DONNÉES ANONYMES ─────────────────────────────
 *
 * Elle se les approprie — voir `claimAnonymousData` côté base. Sans cela, se
 * connecter ferait disparaître la liste qu'on venait de constituer, ce qui est le
 * défaut classique des sites qui ajoutent un compte après coup.
 */

/** Nom court et sans marque, comme le cookie de visiteur. */
export const SESSION_COOKIE = 'zk_sid'

/* Le cookie d'AFFICHAGE et ses deux fonctions vivent dans `lib/identity-cookie.ts`,
   et non ici : ce module importe `next/headers` et la couche base, qu'un composant
   client ne peut pas embarquer. Ils sont réexportés pour que le code serveur n'ait
   qu'un point d'entrée. */
export { IDENTITY_COOKIE, decodeIdentity, encodeIdentity, initialOf } from '@/lib/identity-cookie'

/**
 * Soixante jours.
 *
 * Assez long pour qu'un lecteur occasionnel ne se retrouve pas déconnecté entre deux
 * visites — c'est précisément le cas d'usage d'un site de cours consulté par à-coups
 * — et assez court pour qu'une session oubliée sur un poste partagé finisse par se
 * fermer d'elle-même.
 */
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 60

/**
 * La connexion est-elle proposée sur cette instance ?
 *
 * Elle exige DEUX briques : la base, pour stocker comptes et sessions, et le service
 * d'envoi, pour acheminer le code. Sans l'une des deux, l'en-tête n'affiche pas de
 * bouton « Se connecter » — un bouton qui ouvre une fenêtre dont on sait qu'elle
 * échouera est pire que son absence (§5).
 */
export const ACCOUNTS_ENABLED = DB_ENABLED && MAILER_ENABLED

/**
 * Compte connecté, ou `null`.
 *
 * `cache()` de React et non un cache applicatif : la portée est LA REQUÊTE en cours,
 * ce qui est exactement ce qu'il faut. L'en-tête, la page et parfois une action
 * appellent cette fonction pendant le même rendu ; sans mémorisation, c'est trois
 * allers-retours en base pour une réponse qui ne peut pas avoir changé entre-temps.
 */
export const currentAccount = cache(async (): Promise<Account | null> => {
  if (!DB_ENABLED) return null

  const jar = await cookies()
  const token = jar.get(SESSION_COOKIE)?.value
  if (!token) return null

  const found = await findSessionAccount(await hashToken(token))
  return found.ok ? found.data : null
})

/**
 * Clé de rangement des données en LECTURE, ou `null`.
 *
 * `null` signifie « ce visiteur n'a rien qui lui appartienne » : ni compte, ni cookie
 * anonyme. C'est l'état de l'immense majorité des visites, et il ne vaut pas la peine
 * d'ouvrir une identité pour l'afficher.
 */
export async function ownerId(): Promise<string | null> {
  const account = await currentAccount()
  if (account) return account.id
  return readVisitorId()
}

/**
 * Clé de rangement des données en ÉCRITURE.
 *
 * À n'appeler que depuis une action serveur ou un gestionnaire de route : sans compte,
 * elle CRÉE le cookie anonyme, et poser un cookie n'est possible que de là.
 */
export async function ensureOwnerId(): Promise<string> {
  const account = await currentAccount()
  if (account) return account.id
  return ensureVisitorId()
}
