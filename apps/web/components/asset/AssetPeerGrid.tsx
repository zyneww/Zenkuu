import { Link } from '@/i18n/navigation'

import type { MarketAsset } from '@zenkuu/data'
import { ChangeBadge, Sparkline, formatCompact, formatCurrency, formatRate } from '@zenkuu/ui'

import { AssetLogo } from '@/components/asset/AssetLogo'
import { assetHref } from '@/lib/asset-routes'

/**
 * Comparables, en cartes plutôt qu'en liste.
 *
 * ── CE QUE LA LISTE NE PERMETTAIT PAS ─────────────────────────────────────────
 *
 * La version précédente alignait « logo · nom · prix · variation » sur une ligne.
 * Elle répondait à « quels sont les actifs voisins » et s'arrêtait là. Or on ne
 * consulte pas des comparables pour les nommer : on les consulte pour SE SITUER —
 * cet actif est-il plus gros, monte-t-il quand les autres montent, sort-il du lot ?
 *
 * Trois informations manquaient à cette lecture, et chacune tient dans une carte
 * sans allonger la page, puisqu'elles se rangent en grille plutôt qu'en pile :
 * la taille (capitalisation), la FORME des sept derniers jours (courbe), et la
 * variation. Une courbe minuscule vaut ici mieux qu'un pourcentage seul — deux
 * actifs à +3 % sur la semaine peuvent y être arrivés par des chemins opposés, et
 * c'est précisément ce que compare l'œil quand il balaie une grille.
 *
 * ── LA COURBE DISPARAÎT PLUTÔT QUE DE MENTIR ──────────────────────────────────
 *
 * `sparkline7d` n'est pas toujours servi : il dépend de l'aperçu mis en cache dont
 * les comparables sont dérivés. Absent, la carte se contente de ses chiffres. Jamais
 * de ligne plate de remplacement, qui ferait lire une semaine sans mouvement.
 */
export function AssetPeerGrid({ peers }: { peers: MarketAsset[] }) {
  if (peers.length === 0) return null

  return (
    <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
      {peers.map((peer) => (
        <li key={peer.id}>
          <Link
            href={assetHref(peer.assetClass, peer.id)}
            className="flex h-full flex-col gap-3 rounded-card border border-border-subtle bg-panel p-3 transition-colors duration-150 hover:border-brand"
          >
            <div className="flex items-center gap-2">
              <AssetLogo asset={peer} size={22} />
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">
                {peer.name}
              </span>
              <span className="shrink-0 text-[0.625rem] font-semibold uppercase tracking-wider text-ink-muted">
                {peer.symbol}
              </span>
            </div>

            <div className="flex items-end justify-between gap-3">
              <div className="min-w-0">
                <p className="tabular text-sm font-semibold text-ink">
                  {peer.assetClass === 'forex'
                    ? formatRate(peer.price)
                    : formatCurrency(peer.price, peer.currency)}
                </p>
                <ChangeBadge value={peer.change24h} size="sm" />
              </div>

              {/* La courbe est en dernier dans le document mais à droite à l'écran :
                  c'est une illustration, et un lecteur d'écran doit rencontrer les
                  chiffres avant elle. */}
              {peer.sparkline7d && peer.sparkline7d.length > 1 ? (
                <span className="shrink-0 opacity-80">
                  <Sparkline
                    values={peer.sparkline7d}
                    width={72}
                    height={24}
                    label={`Évolution sur sept jours de ${peer.name}`}
                  />
                </span>
              ) : null}
            </div>

            {peer.marketCap !== undefined ? (
              <p className="tabular border-t border-border-subtle pt-2 text-[0.6875rem] text-ink-muted">
                Capitalisation {formatCompact(peer.marketCap)} {peer.currency}
              </p>
            ) : null}
          </Link>
        </li>
      ))}
    </ul>
  )
}
