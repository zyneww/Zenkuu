import { NextResponse } from 'next/server'

import { claimAnonymousData, createSession, hashToken, upsertAccount } from '@zenkuu/db'

import {
  OAUTH_STATE_COOKIE,
  PROVIDER_IDS,
  callbackUrl,
  isProviderConfigured,
  normalizeProfile,
  providerConfig,
  type ProviderId,
} from '@/lib/oauth'
import { IDENTITY_COOKIE, encodeIdentity } from '@/lib/identity-cookie'
import { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from '@/lib/session'
import { readVisitorId } from '@/lib/visitor'

/**
 * RETOUR de l'échange OAuth — le fournisseur nous renvoie le visiteur.
 *
 * ── L'ORDRE DES VÉRIFICATIONS N'EST PAS ARBITRAIRE ──────────────────────────
 *
 * Chaque garde ci-dessous précède celles qui coûtent plus cher, et surtout celles qui
 * ont un effet. On ne contacte le fournisseur qu'une fois l'anti-rejeu validé : sans
 * cet ordre, un retour forgé ferait consommer notre quota d'API avant d'être refusé.
 *
 * ── UN ÉCHEC RAMÈNE SUR LE SITE, JAMAIS SUR UNE PAGE D'ERREUR ───────────────
 *
 * Le visiteur vient de cliquer « Continuer avec Google » et se retrouve au bout du
 * chemin. Lui répondre par un statut 400 le laisserait devant un texte brut, sans
 * moyen de revenir ni de comprendre. Toutes les branches d'échec reviennent donc à
 * l'accueil avec un motif dans l'adresse, que la page traduit en message.
 *
 * ── CE QUI SE PASSE QUAND TOUT RÉUSSIT ──────────────────────────────────────
 *
 * Exactement ce que fait la connexion par code : `upsertAccount` retrouve ou crée le
 * compte, `claimAnonymousData` y verse ce que le visiteur avait rassemblé sans être
 * connecté, puis une session s'ouvre et les deux cookies sont posés. C'est le
 * MÊME chemin, et c'est la raison pour laquelle ce fichier n'a pas eu besoin
 * d'introduire un second modèle de sessions.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ fournisseur: string }> },
) {
  const { fournisseur } = await params
  const home = new URL('/', request.url)

  if (!PROVIDER_IDS.includes(fournisseur as ProviderId)) {
    return NextResponse.json({ erreur: 'Fournisseur inconnu' }, { status: 404 })
  }

  const id = fournisseur as ProviderId
  if (!isProviderConfigured(id)) return redirectWith(home, 'non-configuree')

  const url = new URL(request.url)

  /* Le refus du visiteur chez le fournisseur n'est PAS une erreur : il a cliqué
     « Annuler ». On le ramène sans message alarmant. */
  const denied = url.searchParams.get('error')
  if (denied) return redirectWith(home, denied === 'access_denied' ? 'annulee' : 'refusee')

  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  if (!code || !state) return redirectWith(home, 'incomplete')

  const raw = request.headers
    .get('cookie')
    ?.split('; ')
    .find((entry) => entry.startsWith(`${OAUTH_STATE_COOKIE}=`))
    ?.slice(OAUTH_STATE_COOKIE.length + 1)

  if (!raw) return redirectWith(home, 'expiree')

  let stored: { state?: string; verifier?: string; intention?: string; provider?: string }
  try {
    stored = JSON.parse(decodeURIComponent(raw))
  } catch {
    return redirectWith(home, 'expiree')
  }

  /*
   * LA COMPARAISON QUI PORTE TOUTE LA SÉCURITÉ DE CE FICHIER.
   *
   * `state` prouve que l'échange a bien commencé dans CE navigateur. Sans elle, un
   * attaquant peut faire aboutir son propre échange chez la victime, qui se retrouve
   * connectée au compte de l'attaquant et y range ensuite ses données.
   *
   * Le fournisseur est vérifié LUI AUSSI : un cookie ouvert pour Google ne doit pas
   * pouvoir servir un retour X, sans quoi les portées demandées à l'un
   * autoriseraient une session obtenue de l'autre.
   */
  if (stored.state !== state || stored.provider !== id || !stored.verifier) {
    return redirectWith(home, 'invalide')
  }

  const config = providerConfig(id)

  try {
    const tokenResponse = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        /* X exige l'authentification cliente en en-tête `Basic`, là où Google accepte
           les mêmes valeurs dans le corps. On l'envoie aux deux : Google ignore
           l'en-tête quand le corps le renseigne déjà. */
        authorization: `Basic ${btoa(`${config.clientId}:${config.clientSecret}`)}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: callbackUrl(id),
        client_id: config.clientId!,
        client_secret: config.clientSecret!,
        code_verifier: stored.verifier,
      }),
    })

    if (!tokenResponse.ok) return redirectWith(home, 'refusee')

    const { access_token: accessToken } = (await tokenResponse.json()) as {
      access_token?: string
    }
    if (!accessToken) return redirectWith(home, 'refusee')

    const profileResponse = await fetch(config.profileUrl, {
      headers: { authorization: `Bearer ${accessToken}` },
    })
    if (!profileResponse.ok) return redirectWith(home, 'profil')

    const profile = normalizeProfile(id, await profileResponse.json())
    if (!profile) return redirectWith(home, 'profil')

    /*
     * SEULE L'ADRESSE EST TRANSMISE, et le nom du fournisseur est écarté.
     *
     * `upsertAccount` dérive le pseudonyme de l'adresse et ne prend pas de nom en
     * second paramètre — sa signature attend une DATE. Le respecter n'est pas
     * seulement une contrainte de typage : le pseudonyme reste ainsi construit d'une
     * seule façon, que le compte naisse d'un code par courriel ou d'un fournisseur.
     * Deux règles de nommage produiraient deux styles de pseudonymes selon la porte
     * d'entrée, pour des comptes par ailleurs identiques.
     *
     * Le visiteur peut le changer depuis le menu de compte, ce qui rend le point sans
     * conséquence — et lui laisse le dernier mot plutôt qu'un nom civil importé de
     * Google sans qu'il l'ait demandé.
     */
    const account = await upsertAccount(profile.email)
    if (!account.ok || !account.data) return redirectWith(home, 'indisponible')

    /* L'échec de la reprise n'annule PAS la connexion : la liste anonyme reste
       accessible en se déconnectant, ce qui est récupérable, là où refuser la session
       ne le serait pas. Même arbitrage que dans `verifyLoginCode`. */
    const visitor = await readVisitorId()
    if (visitor) await claimAnonymousData(visitor, account.data.id)

    const token = crypto.randomUUID() + crypto.randomUUID()
    const opened = await createSession({
      tokenHash: await hashToken(token),
      accountId: account.data.id,
      expiresAt: new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000),
    })
    if (!opened.ok) return redirectWith(home, 'indisponible')

    const response = NextResponse.redirect(
      new URL(stored.intention === 'signup' ? '/?connexion=bienvenue' : '/?connexion=ok', request.url),
    )

    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: SESSION_MAX_AGE_SECONDS,
      path: '/',
    })

    /* Le cookie d'AFFICHAGE, lisible par la page. Il ne porte aucun pouvoir : toute
       lecture de données passe par le jeton `httpOnly` ci-dessus. */
    response.cookies.set(
      IDENTITY_COOKIE,
      encodeIdentity(account.data.handle, account.data.email),
      {
        httpOnly: false,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: SESSION_MAX_AGE_SECONDS,
        path: '/',
      },
    )

    // Le cookie d'échange a fait son office : le laisser vivre dix minutes de plus
    // n'apporterait rien et garderait un vérificateur PKCE dans le navigateur.
    response.cookies.delete(OAUTH_STATE_COOKIE)

    return response
  } catch {
    return redirectWith(home, 'erreur')
  }
}

function redirectWith(home: URL, reason: string) {
  const target = new URL(home)
  target.searchParams.set('connexion', reason)
  return NextResponse.redirect(target)
}
