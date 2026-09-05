import type { MarketAsset } from '@zenkuu/data'

import { AssetLogo } from '@/components/asset/AssetLogo'
import { ChangeBadge } from '@/components/locale/ChangeBadge'
import { Money } from '@/components/locale/Money'
import { Link } from '@/i18n/navigation'
import { assetHref } from '@/lib/asset-routes'
import { getPhrase } from '@/lib/content'
import { getFormatters } from '@/lib/formatters'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * « CET ACTIF FACE À SES VOISINS » — LE BLOC « SOL vs. Blockchain » DE dropstab.com
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Une table courte : l'actif consulté en tête, puis les capitalisations voisines, avec
 * pour chacune le rapport de taille à celui de la fiche.
 *
 * ── LE RAPPORT DE TAILLE EST LA COLONNE QUI JUSTIFIE LA TABLE ───────────────
 *
 * Sans lui, ce ne serait qu'un extrait de classement — et le site en a déjà un. La
 * colonne « ×taille » répond à la question qu'on se pose vraiment en arrivant sur une
 * fiche : celui-ci est-il gros ou petit, et par rapport à quoi.
 *
 * `voisin.marketCap ÷ actif.marketCap`, deux valeurs publiées par la même source dans
 * la même devise au même instant. Aucun modèle, aucune projection.
 *
 * ⚠️ CE N'EST PAS UN « POTENTIEL ». La référence titre sa colonne « Gain Potential »,
 * ce qui laisse entendre qu'un jeton pourrait atteindre la taille de son voisin. Le §5
 * interdit ce genre de sous-entendu : le nombre dit un RAPPORT DE TAILLES ACTUEL, et
 * l'intitulé le dit aussi.
 *
 * ── PAS DE SÉLECTEUR DE CATÉGORIE, ET LA RAISON EST EN AMONT ────────────────
 *
 * La référence laisse choisir la catégorie de comparaison. Ici les comparables sont
 * dérivés de l'aperçu déjà mis en cache par l'accueil (voir `getPeers`) : il n'existe
 * qu'une liste, et un sélecteur à un seul choix est un bouton sans action. Changer
 * cela demanderait un appel `/coins/markets?category=` par catégorie ouverte, sur un
 * quota mesuré à huit requêtes par minute.
 */

/* Cinq lignes comme la référence, l'actif consulté compris : au-delà, la table cesse
   d'être un repère et redevient le classement dont elle est extraite. */
const LIGNES = 5

export async function AssetVsPeers({
  asset,
  peers,
}: {
  asset: MarketAsset
  peers: MarketAsset[]
}) {
  const t = await getPhrase()
  const nombres = await getFormatters()

  /* Les voisins sans capitalisation ne peuvent pas porter la colonne qui fait exister
     cette table. Ils sont écartés plutôt que rendus avec un tiret : la ligne coûterait
     sa hauteur pour ne rien apprendre. */
  const voisins = peers
    .filter((peer) => peer.id !== asset.id && peer.marketCap !== undefined)
    .slice(0, LIGNES - 1)

  if (voisins.length === 0 || asset.marketCap === undefined) return null

  const rangs = [asset, ...voisins]

  return (
    <section aria-labelledby="voisins-titre" className="space-y-3">
      <h2 id="voisins-titre" className="display-sm text-ink">
        {t('{nom} face à ses voisins').replace('{nom}', asset.name)}
      </h2>

      <div className="overflow-x-auto rounded-card border border-border-subtle bg-surface">
        <table className="w-full min-w-[38rem] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border-subtle">
              <th scope="col" className="px-4 py-2.5 text-left font-medium text-ink-muted">
                {t('Actif')}
              </th>
              <th scope="col" className="px-4 py-2.5 text-right font-medium text-ink-muted">
                {t('Cours')}
              </th>
              <th scope="col" className="px-4 py-2.5 text-right font-medium text-ink-muted">
                {t('24 h')}
              </th>
              <th scope="col" className="px-4 py-2.5 text-right font-medium text-ink-muted">
                {t('7 j')}
              </th>
              <th scope="col" className="px-4 py-2.5 text-right font-medium text-ink-muted">
                {t('Capitalisation')}
              </th>
              <th scope="col" className="px-4 py-2.5 text-right font-medium text-ink-muted">
                {t('Taille relative')}
              </th>
            </tr>
          </thead>

          <tbody>
            {rangs.map((rang) => {
              const courant = rang.id === asset.id
              const rapport =
                courant || rang.marketCap === undefined
                  ? undefined
                  : rang.marketCap / (asset.marketCap as number)

              return (
                <tr
                  key={rang.id}
                  /* La ligne de l'actif consulté est teintée : dans une table de cinq
                     lignes qui se ressemblent, c'est le seul repère qui dise « vous
                     êtes ici » sans ajouter de colonne. */
                  className={`border-b border-border-subtle last:border-b-0 ${
                    courant ? 'bg-surface-muted' : ''
                  }`}
                >
                  <td className="px-4 py-2.5">
                    <span className="flex items-center gap-2">
                      <AssetLogo asset={rang} size={20} />
                      {courant ? (
                        <span className="truncate font-semibold text-ink">{rang.name}</span>
                      ) : (
                        <Link
                          href={assetHref(rang.assetClass, rang.id)}
                          className="truncate text-ink hover:underline"
                        >
                          {rang.name}
                        </Link>
                      )}
                      <span className="shrink-0 text-micro font-semibold uppercase text-ink-muted">
                        {rang.symbol}
                      </span>
                    </span>
                  </td>

                  {/* ⚠️ `Money` ET NON `nombres.currency` — mesuré au navigateur avant
                      correction : la table sortait « 88,84 € » sur une page dont
                      l'en-tête et le rail affichaient « 103,28 $US ». Les sources
                      cotent en euro ; la devise d'affichage est une préférence locale
                      que seul un composant CLIENT peut lire (voir `Money`). Un
                      formateur appelé côté serveur écrit donc toujours la devise de la
                      source, quelle que soit celle qu'on a choisie. */}
                  <td className="tabular whitespace-nowrap px-4 py-2.5 text-right text-ink">
                    <Money value={rang.price} from={rang.currency} />
                  </td>

                  <td className="px-4 py-2.5 text-right">
                    <ChangeBadge value={rang.change24h} size="sm" />
                  </td>

                  <td className="px-4 py-2.5 text-right">
                    <ChangeBadge value={rang.change7d} size="sm" />
                  </td>

                  <td className="tabular whitespace-nowrap px-4 py-2.5 text-right text-ink">
                    <Money value={rang.marketCap} from={rang.currency} compact />
                  </td>

                  <td className="tabular px-4 py-2.5 text-right text-ink-muted">
                    {/* La ligne de l'actif consulté vaut ×1 par construction : le dire
                        serait une case remplie pour rien. */}
                    {rapport === undefined ? '—' : `×${nombres.fixed(rapport, 2) ?? '—'}`}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p className="text-micro text-ink-muted">
        {t(
          'La dernière colonne rapporte la capitalisation de chaque voisin à celle de cet actif. C’est un rapport de tailles constaté aujourd’hui, jamais une projection.',
        )}
      </p>
    </section>
  )
}
