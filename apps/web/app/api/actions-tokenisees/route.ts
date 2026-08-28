import { NextResponse } from 'next/server'

import { guard } from '@/lib/rate-limit'

import { getAssetTickers, getTokenizedStocks, type AssetTicker } from '@zenkuu/data'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * LES JETONS QUI RÉPLIQUENT UNE ACTION, ET LES PLACES QUI LES COTENT
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Deux tables d'une seule requête : « Tokens » liste les jetons, « Markets » liste les
 * paires sur lesquelles ils s'échangent. Elles viennent ensemble parce que la seconde
 * se DÉDUIT de la première — on ne sait quelles places interroger qu'une fois les
 * jetons connus.
 *
 * ── POURQUOI UNE ROUTE, ET NON LE RENDU DE LA FICHE ─────────────────────────
 *
 * Le catalogue des jetons coûte un appel partagé par tout le site ; les places en
 * coûtent un PAR JETON. Les mettre dans le rendu ferait payer quatre appels externes à
 * chaque affichage d'une fiche d'action, sur un quota mesuré à huit par minute, pour
 * une table que la plupart des visiteurs ne verront jamais. La fiche les demande
 * lorsqu'elle approche de l'écran.
 *
 * ── TROIS JETONS, ET LE CHIFFRE EST UN ARBITRAGE ────────────────────────────
 *
 * Une action en compte jusqu'à sept. Les interroger tous coûterait sept appels et
 * ferait tomber le quota pour le reste de la page. Les trois PLUS CAPITALISÉS portent
 * l'essentiel du volume — et le nombre de jetons écartés est renvoyé, pour que la table
 * puisse le dire au lieu de laisser croire qu'elle est complète (§5).
 */
const MARKET_TOKENS = 3

export async function GET(request: Request) {
  /*
    ── GARDE-FOU DE DÉBIT ────────────────────────────────────────────────────

    Cette route sert un cache PARTAGÉ alimenté par une source gratuite : une boucle
    qui fait varier ses paramètres ouvre autant d'entrées de cache que d'appels
    sortants, et dégrade le site pour tout le monde. Le plafond borne l'entrée plutôt
    que la sortie — voir `lib/rate-limit.ts`, qui dit aussi ce que cette approche ne
    couvre pas.
  */
  const limited = guard(request, 'actions-tokenisees', 30)
  if (limited) return limited

  const params = new URL(request.url).searchParams
  const symbol = params.get('symbole')?.trim()
  const name = params.get('nom')?.trim()

  if (!symbol || !name) {
    return NextResponse.json({ ok: false, reason: 'Symbole ou nom manquant.' }, { status: 400 })
  }

  const tokens = await getTokenizedStocks(symbol, name)
  if (!tokens.ok || tokens.data.length === 0) {
    return NextResponse.json(
      { ok: false },
      { headers: { 'Cache-Control': 'private, max-age=300' } },
    )
  }

  const queried = tokens.data.slice(0, MARKET_TOKENS)

  /*
   * `Promise.all` et non une boucle : le limiteur du fournisseur sérialise déjà les
   * départs, et les enchaîner à la main y ajouterait l'aller-retour complet de chaque
   * réponse. Une place en échec est ÉCARTÉE — la table se réduit, elle ne tombe pas.
   */
  const rows = await Promise.all(
    queried.map((token) =>
      getAssetTickers(token.id, 'crypto', 'usd', 100).then((result) =>
        result.ok ? result.data : [],
      ),
    ),
  )

  /*
   * Les paires de TOUS les jetons dans une seule table, triées par volume — c'est la
   * lecture de la référence : on cherche « où se négocie NVIDIA en jeton », pas « où se
   * négocie NVDAX ». Le symbole de base de chaque ligne dit de quel jeton il s'agit.
   */
  const markets: AssetTicker[] = rows
    .flat()
    .sort((a, b) => (b.volume24h ?? 0) - (a.volume24h ?? 0))

  return NextResponse.json(
    {
      ok: true,
      tokens: tokens.data,
      markets,
      /** Jetons dont les places n'ont pas été demandées — voir `MARKET_TOKENS`. */
      marketsOmitted: Math.max(0, tokens.data.length - queried.length),
      source: tokens.source,
    },
    { headers: { 'Cache-Control': 'private, max-age=600' } },
  )
}
