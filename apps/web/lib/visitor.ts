import { cookies } from 'next/headers'

/**
 * IDENTITÉ DU VISITEUR — un cookie, et rien d'autre.
 *
 * ── CE QUI A ÉTÉ SUPPRIMÉ, ET POURQUOI ÇA CHANGE CE FICHIER ───────────────────
 *
 * Les listes de suivi et les écrans de screener étaient rattachés à un
 * COMPTE, tenu par un fournisseur d'authentification tiers. Ce fournisseur a été
 * retiré du site : plus d'inscription, plus de connexion, plus d'abonnement, plus de
 * page de compte.
 *
 * Or les trois fonctionnalités ci-dessus n'avaient pas besoin d'un compte — elles
 * avaient besoin d'une CLÉ pour ranger des lignes en base. Un compte en est une, très
 * coûteuse : un formulaire, un mot de passe, un courriel de vérification, un
 * fournisseur tiers, une facture. Un identifiant anonyme tiré au sort et déposé dans
 * un cookie en est une autre, et elle suffit à tout ce que ce site fait.
 *
 * ── CE QU'ON PERD, ET IL FAUT LE DIRE ─────────────────────────────────────────
 *
 * La liste ne suit pas d'un appareil à l'autre, et elle disparaît avec le cookie —
 * nettoyage du navigateur, navigation privée, nouvel ordinateur. C'est un vrai recul
 * pour qui consulte le site depuis deux machines, et c'est le prix assumé de ne
 * demander ni adresse ni mot de passe pour suivre un cours.
 *
 * L'interface doit donc le DIRE plutôt que de laisser croire à une perte de données :
 * voir la page `/suivi`.
 *
 * ── POURQUOI DEUX FONCTIONS, ET NON UNE ───────────────────────────────────────
 *
 * Next.js n'autorise l'ÉCRITURE d'un cookie que depuis une action serveur ou un
 * gestionnaire de route ; un composant serveur qui rend une page ne peut que lire.
 * Une fonction unique qui créerait le cookie au besoin lèverait donc à chaque rendu
 * de `/suivi`.
 *
 * Le partage est net : `readVisitorId()` pour les LECTURES — elle renvoie `null` tant
 * qu'aucun cookie n'existe, ce qui décrit exactement un visiteur qui n'a encore rien
 * enregistré —, `ensureVisitorId()` pour les ÉCRITURES, où l'identifiant est créé au
 * premier geste.
 */

/**
 * Nom court et sans marque : il voyage dans chaque requête, et il n'a aucune raison
 * d'annoncer ce qu'il désigne à qui lit les en-têtes.
 */
const COOKIE_NAME = 'zk_vid'

/** Deux ans — au-delà, les navigateurs plafonnent d'eux-mêmes. */
const MAX_AGE_SECONDS = 60 * 60 * 24 * 730

/**
 * Forme attendue : un UUID v4 canonique.
 *
 * Le contrôle n'est pas cosmétique. La valeur arrive du navigateur, elle est
 * concaténée dans des requêtes qui ciblent des lignes par `user_id`, et rien
 * n'empêche quelqu'un de la remplacer à la main. La borner à 36 caractères
 * hexadécimaux ferme la porte aux valeurs fantaisistes avant qu'elles n'atteignent
 * la base.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

function valid(value: string | undefined): value is string {
  return typeof value === 'string' && UUID.test(value)
}

/**
 * Identifiant du visiteur, ou `null` s'il n'en a pas encore.
 *
 * À appeler depuis les LECTURES — composants serveur, chargement de page. Ne crée
 * jamais le cookie : `null` signifie « ce visiteur n'a rien enregistré », qui est
 * l'état de l'immense majorité des visites.
 */
export async function readVisitorId(): Promise<string | null> {
  const jar = await cookies()
  const value = jar.get(COOKIE_NAME)?.value
  return valid(value) ? value : null
}

/**
 * Identifiant du visiteur, créé s'il manque.
 *
 * À n'appeler que depuis une ACTION SERVEUR ou un gestionnaire de route : ailleurs,
 * `cookies().set()` lève. C'est voulu par Next.js — une réponse déjà en cours de
 * diffusion ne peut plus recevoir d'en-tête.
 */
export async function ensureVisitorId(): Promise<string> {
  const jar = await cookies()
  const existing = jar.get(COOKIE_NAME)?.value
  if (valid(existing)) return existing

  const id = crypto.randomUUID()

  jar.set(COOKIE_NAME, id, {
    /* `httpOnly` : aucun script de la page n'a besoin de le lire, et le retirer du
       champ de vision de JavaScript retire d'autant de surface à une injection. */
    httpOnly: true,
    /* `lax` et non `strict` : le cookie doit survivre à une arrivée depuis un moteur
       de recherche, qui est le premier chemin d'accès au site. */
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: MAX_AGE_SECONDS,
    path: '/',
  })

  return id
}
