/**
 * ══════════════════════════════════════════════════════════════════════════════
 * MOTS DE PASSE — DÉRIVATION, VÉRIFICATION, ET CE QUI EST REFUSÉ
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Ce module est la SEULE porte par laquelle un mot de passe entre ou sort du site.
 * Rien d'autre ne doit hacher, comparer ou juger un mot de passe : à deux endroits,
 * les deux divergent, et c'est toujours le plus faible qui décide.
 *
 * ── POURQUOI PBKDF2 ET NON ARGON2 OU SCRYPT ────────────────────────────────
 *
 * Argon2id est le meilleur choix dans l'absolu, scrypt le suit. Aucun des deux n'est
 * disponible ici sans ajouter une dépendance native, et la contrainte qui l'interdit
 * est écrite dans `packages/db/src/accounts.ts` : ce code doit tourner aussi bien sur
 * Node que dans un environnement d'exécution périphérique, ce qui limite à `crypto.subtle`.
 * De ses primitives, PBKDF2 est la seule dérivation de clé.
 *
 * PBKDF2-HMAC-SHA-256 à 600 000 itérations est la valeur que l'OWASP recommande pour
 * cet algorithme. Elle est tenable : la dérivation coûte quelques dizaines de
 * millisecondes au serveur, ce qui est acceptable pour un geste qu'on fait une fois
 * par session, et rend une attaque hors ligne coûteuse au même facteur.
 *
 * ⚠️ SA FAIBLESSE EST CONNUE ET DOIT L'ÊTRE : PBKDF2 n'est pas coûteux en MÉMOIRE, il
 * s'accélère donc bien mieux sur carte graphique qu'argon2id. C'est le prix de la
 * portabilité, et la raison pour laquelle le format stocké porte son numéro de
 * version : le jour où une primitive plus dure devient disponible partout, on
 * réhachera à la volée à la première connexion réussie.
 *
 * ── LE FORMAT STOCKÉ ───────────────────────────────────────────────────────
 *
 *     pbkdf2$sha256$600000$<sel base64url>$<clé base64url>
 *
 * Tout ce qu'il faut pour re-vérifier vit DANS la chaîne : algorithme, empreinte,
 * itérations, sel. Aucune constante du code n'est nécessaire à la lecture d'un
 * condensat ancien, ce qui est exactement ce qui permet d'augmenter les itérations
 * sans invalider les comptes existants.
 */

/** Itérations à l'écriture. Les condensats anciens gardent la leur, lue dans la chaîne. */
const ITERATIONS = 600_000

/** 16 octets : la taille recommandée pour un sel PBKDF2, et elle suffit largement. */
const SALT_BYTES = 16

/** 32 octets, la taille native de SHA-256 — en demander plus n'ajoute aucune entropie. */
const KEY_BYTES = 32

/**
 * ⚠️ LE PLAFOND N'EST PAS UNE COQUETTERIE. Sans lui, une chaîne d'un mégaoctet fait
 * dériver le serveur pendant plusieurs secondes, et quelques requêtes simultanées
 * suffisent à le saturer : la lenteur qui protège devient l'arme. 128 caractères
 * laissent la place à toute phrase de passe raisonnable.
 */
export const PASSWORD_MIN = 10
export const PASSWORD_MAX = 128

/**
 * Les mots de passe qu'on refuse d'emblée.
 *
 * ⚠️ CE N'EST PAS UNE LISTE DE FUITES, et il ne faut pas le croire. Les vraies listes
 * comptent des centaines de millions d'entrées et se consultent par service ; celle-ci
 * n'écarte que ce qui revient en tête de toutes les analyses de fuites. Elle rattrape
 * le cas où l'on tape le premier mot venu, pas une attaque par dictionnaire — contre
 * laquelle ce sont le plafond d'essais et la dérivation coûteuse qui travaillent.
 *
 * Les entrées sont écrites en minuscules ; la comparaison l'est aussi. « Azerty123 »
 * et « azerty123 » ont exactement la même valeur pour un attaquant.
 */
const TROP_COURANTS = new Set([
  'password', 'motdepasse', 'azertyuiop', 'qwertyuiop', '1234567890', 'azerty123',
  'qwerty123', 'password1', 'password123', 'motdepasse1', 'motdepasse123',
  'iloveyou', 'jetaime', 'administrator', 'letmein', 'welcome123', 'admin123',
  'bonjour123', 'soleil123', 'football1', '123456789', '0123456789', 'abcd1234',
  'passw0rd', 'p@ssword', 'p@ssw0rd', 'chocolat1', 'coucou123', 'zenkuu123',
])

export type PasswordVerdict =
  | { ok: true }
  | { ok: false; reason: 'trop-court' | 'trop-long' | 'trop-courant' | 'contient-adresse' }

/**
 * Les règles de robustesse, et leur brièveté est intentionnelle.
 *
 * ── POURQUOI PAS DE « UNE MAJUSCULE, UN CHIFFRE, UN SYMBOLE » ──────────────
 *
 * Parce que ces règles produisent des mots de passe PIRES. C'est la conclusion du NIST
 * depuis sa révision de 2017 (SP 800-63B), et elle est documentée : imposer des
 * classes de caractères pousse à « Motdepasse1! » — une transformation prévisible d'un
 * mot du dictionnaire, que les outils d'attaque appliquent en premier — là où la
 * LONGUEUR seule apporte de l'entropie réelle.
 *
 * On garde donc trois règles, et chacune écarte un risque distinct :
 *
 *   · une LONGUEUR minimale, la seule mesure qui corrèle vraiment à la difficulté ;
 *   · un plafond, pour la raison de service écrite plus haut ;
 *   · un refus de ce qui est trop connu ou trop lié au compte lui-même.
 */
export function judgePassword(password: string, email?: string): PasswordVerdict {
  if (password.length < PASSWORD_MIN) return { ok: false, reason: 'trop-court' }
  if (password.length > PASSWORD_MAX) return { ok: false, reason: 'trop-long' }

  const bas = password.toLowerCase()
  if (TROP_COURANTS.has(bas)) return { ok: false, reason: 'trop-courant' }

  /* L'adresse est le premier mot qu'un attaquant essaie, puisqu'il la connaît déjà :
     c'est la seule chose qu'il sache du compte avant de commencer. On écarte donc
     l'adresse entière ET sa partie locale, qui est ce que les gens réutilisent. */
  if (email) {
    const adresse = email.trim().toLowerCase()
    const local = adresse.split('@')[0] ?? ''
    if (bas === adresse) return { ok: false, reason: 'contient-adresse' }
    if (local.length >= 4 && bas.includes(local)) return { ok: false, reason: 'contient-adresse' }
  }

  return { ok: true }
}

function toBase64Url(bytes: Uint8Array): string {
  let binaire = ''
  for (const octet of bytes) binaire += String.fromCharCode(octet)
  return btoa(binaire).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(value: string): Uint8Array {
  const bourre = value.replace(/-/g, '+').replace(/_/g, '/')
  const binaire = atob(bourre.padEnd(Math.ceil(bourre.length / 4) * 4, '='))
  return Uint8Array.from(binaire, (caractere) => caractere.charCodeAt(0))
}

async function derive(
  password: string,
  salt: Uint8Array,
  iterations: number,
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations },
    key,
    KEY_BYTES * 8,
  )
  return new Uint8Array(bits)
}

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * LE CONDENSAT LEURRE — POUR QUE L'ÉCHEC COÛTE LE MÊME TEMPS QUE LE SUCCÈS
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Il n'est le mot de passe de personne, et il ne protège rien par lui-même. Son unique
 * rôle est de donner à `verifyPassword` de quoi travailler quand le compte visé
 * n'existe pas, ou n'a pas de mot de passe.
 *
 * ⚠️ SANS LUI, LA DURÉE DE LA RÉPONSE DIT SI L'ADRESSE EST INSCRITE. Une adresse
 * inconnue répondrait en une milliseconde là où une adresse connue paie une dérivation
 * PBKDF2 de plusieurs dizaines de millisecondes. L'écart se mesure au chronomètre
 * depuis n'importe où, et rétablit exactement l'oracle que `bad-credentials` existe
 * pour éviter.
 *
 * ⚠️ IL DOIT RESTER PARSABLE ET AU MÊME NOMBRE D'ITÉRATIONS QUE LES VRAIS. Un leurre
 * mal formé serait rejeté par la lecture du format — donc en microsecondes — et le
 * défaut reviendrait sans que rien ne le signale. Un test l'atteste.
 *
 * Sel de 16 octets, clé de 32, tous deux à zéro : ils n'ont aucun secret à porter,
 * seulement la bonne LONGUEUR.
 */
export const DECOY_HASH = `pbkdf2$sha256$${ITERATIONS}$${toBase64Url(
  new Uint8Array(SALT_BYTES),
)}$${toBase64Url(new Uint8Array(KEY_BYTES))}`

/** Dérive un condensat neuf, avec un sel tiré d'une source cryptographique. */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES))
  const key = await derive(password, salt, ITERATIONS)
  return `pbkdf2$sha256$${ITERATIONS}$${toBase64Url(salt)}$${toBase64Url(key)}`
}

/**
 * ⚠️ LA COMPARAISON EST À TEMPS CONSTANT, ET CE N'EST PAS DU ZÈLE.
 *
 * Un `===` sur deux chaînes s'arrête au premier caractère qui diffère. La durée de la
 * comparaison révèle donc combien de caractères de tête sont justes, et cette fuite
 * suffit à reconstruire un condensat octet par octet — c'est l'attaque temporelle
 * classique, et elle est parfaitement praticable sur un réseau local.
 *
 * On parcourt donc TOUS les octets et l'on accumule les différences dans un ou
 * exclusif : la durée ne dépend plus que de la longueur, laquelle est publique.
 */
function equalsConstantTime(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  let difference = 0
  for (let index = 0; index < a.length; index += 1) {
    difference |= (a[index] ?? 0) ^ (b[index] ?? 0)
  }
  return difference === 0
}

/**
 * Vérifie un mot de passe contre un condensat stocké.
 *
 * Rend `false` sur tout condensat illisible plutôt que de lever : une chaîne corrompue
 * en base ne doit pas faire tomber la connexion en erreur serveur, elle doit refuser
 * l'accès. Le compte reste récupérable par le code envoyé par courriel.
 */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  /* Le plafond s'applique AUSSI à la vérification, et pas seulement à la création :
     sans cela, la porte fermée à l'écriture resterait ouverte à la lecture, où elle
     coûte exactement le même temps de dérivation. */
  if (password.length > PASSWORD_MAX) return false

  const parts = stored.split('$')
  if (parts.length !== 5) return false
  const [algo, hash, rawIterations, rawSalt, rawKey] = parts
  if (algo !== 'pbkdf2' || hash !== 'sha256') return false

  const iterations = Number(rawIterations)
  if (!Number.isInteger(iterations) || iterations < 1 || iterations > 5_000_000) return false

  try {
    const attendu = fromBase64Url(rawKey ?? '')
    const obtenu = await derive(password, fromBase64Url(rawSalt ?? ''), iterations)
    return equalsConstantTime(attendu, obtenu)
  } catch {
    return false
  }
}

/**
 * Ce condensat mérite-t-il d'être refait ?
 *
 * Appelé APRÈS une vérification réussie : c'est le seul instant où le site détient le
 * mot de passe en clair et peut donc le re-dériver au coût du jour. Sans ce rattrapage,
 * augmenter `ITERATIONS` ne protégerait que les comptes créés ensuite, et les plus
 * anciens — donc les plus exposés — resteraient au réglage le plus faible.
 */
export function needsRehash(stored: string): boolean {
  const parts = stored.split('$')
  if (parts.length !== 5) return true
  if (parts[0] !== 'pbkdf2' || parts[1] !== 'sha256') return true
  return Number(parts[2]) < ITERATIONS
}
