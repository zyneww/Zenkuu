import type { MarketAsset } from '@zenkuu/data'
import { ChangeBadge } from '@zenkuu/ui'

import { AssetLogo } from '@/components/asset/AssetLogo'
import { Money } from '@/components/locale/Money'
import { RailSection } from '@/components/ui/RailSection'
import { Link } from '@/i18n/navigation'
import { assetHref } from '@/lib/asset-routes'
import { getPhrase } from '@/lib/content'

/**
 * Projets similaires, EN LISTE ÉTROITE DANS LE RAIL.
 *
 * ── POURQUOI ILS REMONTENT DE L'ONGLET AU RAIL ───────────────────────────────
 *
 * La référence les pose au pied de sa colonne de gauche, sous les métriques, et c'est
 * le bon endroit pour une raison qui n'a rien à voir avec le style : « à quoi d'autre
 * ça ressemble » est une question qu'on se pose EN LISANT les chiffres, pas après.
 * Un rang, une capitalisation, une variation ne veulent rien dire seuls — ils veulent
 * dire quelque chose comparés. Ranger les comparables derrière un onglet obligeait à
 * quitter les chiffres pour aller chercher de quoi les juger, puis à revenir.
 *
 * Ils restent AUSSI dans l'onglet « Écosystème », en grille et avec leurs courbes :
 * ce n'est pas un doublon mais deux profondeurs. Ici quatre noms pour situer, là-bas
 * la grille complète pour comparer. C'est le même rapport qu'entre l'extrait de
 * `/mouvements` et le registre de `/places`.
 *
 * ── QUATRE, ET LES QUATRE PREMIERS ───────────────────────────────────────────
 *
 * La liste arrive triée par capitalisation depuis le classement de la classe. Quatre
 * lignes tiennent sans allonger un rail déjà long, et ce sont les quatre qui parlent :
 * un lecteur qui cherche un comparable pense d'abord aux plus gros de la catégorie.
 * Le reste est à un clic, dans l'onglet.
 */
export async function AssetSimilarRail({ peers }: { peers: MarketAsset[] }) {
  const t = await getPhrase()
  const shown = peers.slice(0, 4)
  if (shown.length === 0) return null

  return (
    <RailSection title={t('Projets similaires')}>
      <ul>
        {shown.map((peer) => (
          <li key={peer.id} className="border-b border-border-subtle last:border-0">
            <Link
              href={assetHref(peer.assetClass, peer.id)}
              /* La ligne entière est la cible, comme dans le registre de métriques
                 juste au-dessus : sur 250 pixels de large, viser un nom de six
                 lettres est une exigence que rien ne justifie. */
              className="group flex items-center gap-2 py-1.5 transition-colors duration-150"
            >
              <AssetLogo asset={peer} size={18} />

              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-medium text-ink group-hover:text-brand">
                  {peer.name}
                </span>
                <span className="tabular block truncate text-micro text-ink-muted">
                  <Money value={peer.price} from={peer.currency} />
                </span>
              </span>

              <span className="shrink-0">
                <ChangeBadge value={peer.change24h} size="sm" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </RailSection>
  )
}
