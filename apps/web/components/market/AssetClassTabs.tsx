import { Link } from '@/i18n/navigation'

import { ASSET_CLASSES, type AssetClass } from '@zenkuu/data'

import { getContent } from '@/lib/content'
import { marketHref } from '@/lib/asset-routes'

/**
 * Navigation entre classes d'actifs, en tête des pages de classement.
 *
 * Reprise structurelle : une plateforme de cotation place ses familles d'actifs en
 * onglets au-dessus du tableau, pour qu'on passe de l'une à l'autre sans revenir au
 * menu. C'est le principal manque des listings actuels — la seule voie entre
 * `/crypto` et `/actions` passait par le menu de l'en-tête.
 *
 * Ce sont de vrais liens `<Link>` et non des onglets JavaScript : chaque classe est
 * une URL indexable à part entière (§9), et le passage de l'une à l'autre doit
 * fonctionner sans JavaScript, au clic milieu comme en navigation clavier.
 */

/** `nft` est déclaré dans le domaine mais aucune source ne l'alimente encore. */
const HIDDEN: readonly AssetClass[] = ['nft']

export async function AssetClassTabs({ current }: { current: AssetClass }) {
  const fr = await getContent()
  const classes = ASSET_CLASSES.filter((assetClass) => !HIDDEN.includes(assetClass))

  return (
    <nav aria-label="Classes d’actifs" className="-mx-1 overflow-x-auto pb-1">
      <ul className="flex items-center gap-1 px-1">
        {classes.map((assetClass) => {
          const active = assetClass === current
          return (
            <li key={assetClass}>
              <Link
                href={marketHref(assetClass)}
                aria-current={active ? 'page' : undefined}
                className={`inline-block whitespace-nowrap rounded-control px-3 py-1.5 text-xs font-medium transition-colors ${
                  active
                    ? 'bg-brand-soft text-brand-strong'
                    : 'text-ink-muted hover:bg-surface-muted hover:text-ink'
                }`}
              >
                {fr.assetClass[assetClass]}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
