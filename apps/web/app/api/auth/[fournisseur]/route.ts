import { NextResponse } from 'next/server'

import {
  OAUTH_STATE_COOKIE,
  OAUTH_STATE_MAX_AGE,
  PROVIDER_IDS,
  callbackUrl,
  isProviderConfigured,
  pkceChallenge,
  providerConfig,
  randomToken,
  type ProviderId,
} from '@/lib/oauth'

/**
 * DÉPART de l'échange OAuth — on quitte le site pour le fournisseur.
 *
 * ── CE QUE CETTE ROUTE FABRIQUE AVANT DE REDIRIGER ──────────────────────────
 *
 * Trois valeurs, déposées dans un cookie éphémère et retrouvées au retour :
 *
 *   · `state`      — anti-rejeu. Un retour qui ne le présente pas est refusé.
 *   · `verifier`   — le secret PKCE, dont seul le condensé voyage vers le fournisseur.
 *   · `intention`  — « connexion » ou « inscription », pour le message d'accueil.
 *
 * Les trois vivent dans UN SEUL cookie plutôt que trois : ils naissent et meurent
 * ensemble, et trois cookies séparés ouvriraient la possibilité qu'un seul survive à
 * l'échange — un `state` orphelin autorisant alors un retour qu'il devait bloquer.
 *
 * ── POURQUOI `httpOnly` SUR UN COOKIE QUI NE PORTE PAS DE SESSION ───────────
 *
 * Parce qu'il porte le vérificateur PKCE, qui EST un secret le temps de l'échange.
 * Lisible en JavaScript, il serait exfiltrable par n'importe quel script tiers, ce
 * qui annulerait la protection qu'il apporte.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ fournisseur: string }> },
) {
  const { fournisseur } = await params

  if (!PROVIDER_IDS.includes(fournisseur as ProviderId)) {
    return NextResponse.json({ erreur: 'Fournisseur inconnu' }, { status: 404 })
  }

  const id = fournisseur as ProviderId

  /*
   * Une redirection VERS LE SITE plutôt qu'une erreur JSON.
   *
   * Sans identifiants configurés, on ne peut pas commencer l'échange. Mais l'appelant
   * est un lien cliqué par un visiteur, pas un client d'API : lui répondre en JSON le
   * laisserait devant un objet brut au milieu de son navigateur. Il revient donc sur
   * le site, avec un motif que la page saura afficher.
   */
  if (!isProviderConfigured(id)) {
    return NextResponse.redirect(new URL('/?connexion=non-configuree', request.url))
  }

  const config = providerConfig(id)
  const state = randomToken()
  const verifier = randomToken()

  const rawIntention = new URL(request.url).searchParams.get('intention')
  const intention = rawIntention === 'signup' ? 'signup' : 'signin'

  const authorize = new URL(config.authorizeUrl)
  authorize.searchParams.set('client_id', config.clientId!)
  authorize.searchParams.set('redirect_uri', callbackUrl(id))
  authorize.searchParams.set('response_type', 'code')
  authorize.searchParams.set('scope', config.scope)
  authorize.searchParams.set('state', state)
  authorize.searchParams.set('code_challenge', await pkceChallenge(verifier))
  authorize.searchParams.set('code_challenge_method', 'S256')

  const response = NextResponse.redirect(authorize)

  response.cookies.set(
    OAUTH_STATE_COOKIE,
    JSON.stringify({ state, verifier, intention, provider: id }),
    {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: OAUTH_STATE_MAX_AGE,
      path: '/',
    },
  )

  return response
}
