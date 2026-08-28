import { NextResponse } from 'next/server'

import { guard } from '@/lib/rate-limit'

import { getTreasuries } from '@zenkuu/data'

/**
 * Registre des sociétés cotées détenant un actif — servi À LA DEMANDE.
 *
 * ── POURQUOI UNE ROUTE PLUTÔT QU'UN APPEL DANS LA FICHE ─────────────────────
 *
 * La fiche d'actif tient déjà en une poignée d'appels sortants, sur un quota CoinGecko
 * mesuré à huit par minute sans clé. Ajouter celui-ci au rendu le ferait payer à TOUS
 * les visiteurs, y compris à ceux qui ne descendent jamais jusqu'à l'onglet Analyse —
 * c'est-à-dire la grande majorité.
 *
 * Il part donc du navigateur, et seulement quand la section approche de l'écran (voir
 * `usePanelVisible`). La réponse vient du même cache applicatif d'une heure : deux
 * lecteurs de la même fiche ne coûtent qu'un appel.
 *
 * ── L'ABSENCE DE REGISTRE N'EST PAS UNE PANNE ───────────────────────────────
 *
 * La source ne publie de trésorerie que pour une partie des actifs. On répond alors
 * `ok: false` sans bruit, et l'appelant retire sa section — le comportement de tout
 * champ absent sur ce site (§5).
 */
export async function GET(request: Request) {
  /*
    ── GARDE-FOU DE DÉBIT ────────────────────────────────────────────────────

    Cette route sert un cache PARTAGÉ alimenté par une source gratuite : une boucle
    qui fait varier ses paramètres ouvre autant d'entrées de cache que d'appels
    sortants, et dégrade le site pour tout le monde. Le plafond borne l'entrée plutôt
    que la sortie — voir `lib/rate-limit.ts`, qui dit aussi ce que cette approche ne
    couvre pas.
  */
  const limited = guard(request, 'tresorerie', 30)
  if (limited) return limited

  const id = new URL(request.url).searchParams.get('id')?.trim()
  if (!id) {
    return NextResponse.json({ ok: false, reason: 'Identifiant manquant.' }, { status: 400 })
  }

  const report = await getTreasuries(id)
  if (!report.ok) {
    return NextResponse.json({ ok: false }, { headers: { 'Cache-Control': 'private, max-age=300' } })
  }

  return NextResponse.json(
    { ok: true, report: report.data, source: report.source },
    { headers: { 'Cache-Control': 'private, max-age=600' } },
  )
}
