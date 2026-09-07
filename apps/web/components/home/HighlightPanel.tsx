import { Link, type AppHref } from '@/i18n/navigation'

import type { MarketAsset } from '@zenkuu/data'
import { EmptyState } from '@zenkuu/ui'

import { AssetRow } from '@/components/home/AssetRow'
import { getContent } from '@/lib/content'

interface HighlightPanelProps {
  title: string
  assets: MarketAsset[] | null
  /**
   * Précision de PÉRIMÈTRE — et rien d'autre.
   *
   * À réserver aux cas où l'omettre laisserait croire à une exhaustivité qui
   * n'existe pas (« parmi les 100 plus grandes capitalisations »). Un texte qui se
   * contente de reformuler le titre n'a pas sa place ici : un panneau qui explique
   * ce qu'il vient d'annoncer traite son lecteur en débutant permanent.
   */
  hint?: string
  href?: AppHref
  unavailableReason?: string
  /**
   * Nombre de lignes affichées.
   *
   * Il était FIGÉ À CINQ dans le corps du composant, et l'appelant l'ignorait :
   * `MarketSummaryHero` demandait déjà six indices à la source, dont le sixième était
   * chargé puis jeté à l'affichage. Le plafond appartient à l'appelant — c'est lui qui
   * connaît la hauteur dont il dispose.
   */
  limit?: number
}

/**
 * Panneau compact de mise en avant — tendances, hausses, baisses.
 *
 * Un seul composant pour les trois : ils ne diffèrent que par leur titre et leur
 * jeu de données. C'est la « grille de cartes homogène » du §3.2, appliquée
 * jusqu'au code — trois composants jumeaux auraient divergé au premier ajustement.
 *
 * SANS ICÔNE, délibérément. Les emoji qui ornaient ces en-têtes (🚀 pour les
 * hausses, 📉 pour les baisses) sont un registre de réseau social, pas de donnée
 * de marché : aucun terminal ni aucune page de cotation professionnelle n'en pose
 * sur un panneau de cotation. Le titre suffit à identifier le panneau.
 */
export async function HighlightPanel({
  title,
  assets,
  hint,
  href,
  unavailableReason,
  limit = 5,
}: HighlightPanelProps) {
  const fr = await getContent()
  return (
    /* `bg-panel` et `rounded-panel`, comme les cartes d'analyse du bas de page : le
       fond `surface` faisait de ces trois cartes le seul bloc plus clair que la page,
       maintenant que les tableaux de cotations n'en portent plus. Le liseré de survol
       est le même partout — une carte cliquable le dit, une carte inerte ne le dit
       pas, et c'est la seule chose que ce liseré doit signifier. */
    <section className="flex h-full flex-col rounded-panel border border-border-subtle bg-panel p-4 transition-colors duration-200 hover:border-ink-muted/35">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-ink">{title}</h2>
          {hint ? <p className="mt-0.5 text-micro text-ink-muted">{hint}</p> : null}
        </div>
        {href ? (
          <Link
            href={href}
            className="shrink-0 text-xs font-medium text-ink hover:underline"
          >
            {fr.home.seeAll}
          </Link>
        ) : null}
      </div>

      {assets && assets.length > 0 ? (
        <ol className="flex-1 divide-y divide-border-subtle">
          {assets.slice(0, limit).map((asset, index) => (
            <li key={asset.id}>
              <AssetRow asset={asset} rank={index + 1} />
            </li>
          ))}
        </ol>
      ) : (
        <EmptyState
          title={fr.states.unavailableTitle}
          description={unavailableReason ?? null}
          compact
        />
      )}
    </section>
  )
}
