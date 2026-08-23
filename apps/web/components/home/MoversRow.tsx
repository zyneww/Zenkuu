import { MOVERS_UNIVERSE_SIZE, getCryptoOverview, getTrendingCrypto } from '@zenkuu/data'

import { HighlightPanel } from '@/components/home/HighlightPanel'
import { TrendingPanel } from '@/components/home/TrendingPanel'
import { getContent } from '@/lib/content'

/**
 * Lignes par carte — cinq, comme la référence.
 *
 * `CryptoBoard` l'IMPORTE plutôt que d'écrire son propre nombre, et ce n'est pas un
 * détail : la clé de cache de `getCryptoOverview` contient la devise ET cette limite.
 * Deux valeurs différentes feraient deux appels réseau pour un univers identique —
 * cent actifs avec leurs courbes 7 jours, sur un quota gratuit qui n'en autorise
 * qu'une poignée.
 */
export const ROWS = 5

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * TROIS CARTES : TENDANCES, GAGNANTS, PERDANTS
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── DEUX APPELS, ET LE PLUS CHER EST PARTAGÉ AVEC LE TABLEAU ───────────────
 *
 * `getCryptoOverview` sert ICI les hausses et les baisses, et sert aussi le TABLEAU
 * de la section suivante par son champ `topByMarketCap` : même devise, même limite,
 * donc même clé de cache et un seul appel pour les deux blocs.
 *
 * ── « PARMI LES CENT PREMIÈRES », ET LES CARTES L'ÉCRIVENT ─────────────────
 *
 * CoinGecko ne sait pas trier par variation côté serveur : le classement est fait
 * chez nous, sur les `MOVERS_UNIVERSE_SIZE` plus grandes capitalisations. Ce n'est
 * donc pas « la plus forte hausse du marché », et le sous-titre des deux cartes le
 * dit — une hausse de +900 % sur un jeton illiquide n'a pas le même sens.
 *
 * ── LES TROIS CARTES EXISTAIENT DÉJÀ ───────────────────────────────────────
 *
 * `TrendingPanel` et `HighlightPanel` rendent exactement ce que demande la référence :
 * logo, nom, ticker, variation. Rien n'est réécrit ici — ce fichier ne fait que les
 * appeler avec la bonne grille, pour que l'accueil et les pages de classement ne
 * divergent pas au premier ajustement de ligne.
 */
export async function MoversRow() {
  const fr = await getContent()

  const [overview, trending] = await Promise.all([
    getCryptoOverview('eur', ROWS),
    getTrendingCrypto('eur'),
  ])

  return (
    <div className="grid gap-3 md:grid-cols-3">
      <TrendingPanel
        assets={trending.ok ? trending.data : null}
        unavailableReason={trending.ok ? undefined : trending.reason}
      />

      <HighlightPanel
        title={fr.home.gainersTitle}
        assets={overview.ok ? overview.data.gainers : null}
        hint={fr.home.moversHint(MOVERS_UNIVERSE_SIZE)}
        href="/crypto?vue=gagnants"
        unavailableReason={overview.ok ? undefined : overview.reason}
        limit={ROWS}
      />

      <HighlightPanel
        title={fr.home.losersTitle}
        assets={overview.ok ? overview.data.losers : null}
        hint={fr.home.moversHint(MOVERS_UNIVERSE_SIZE)}
        href="/crypto?vue=perdants"
        unavailableReason={overview.ok ? undefined : overview.reason}
        limit={ROWS}
      />
    </div>
  )
}
