import type { AssetClass, MarketAsset } from '@zenkuu/data'
import { ChangeBadge } from '@zenkuu/ui'

import { AssetLogo } from '@/components/asset/AssetLogo'
import { Money } from '@/components/locale/Money'
import { Link } from '@/i18n/navigation'
import { assetHref } from '@/lib/asset-routes'
import { getPhrase } from '@/lib/content'

/** Nombre de lignes par carte. Cinq tiennent sans faire défiler, à toute largeur. */
const ROWS = 5

export interface TrendingClass {
  assetClass: AssetClass
  label: string
  href: string
  assets: MarketAsset[]
}

/**
 * Les lignes qui BOUGENT le plus, dans l'ordre décroissant d'amplitude.
 *
 * ── POURQUOI L'AMPLITUDE ET NON LA HAUSSE ───────────────────────────────────
 *
 * Un palmarès de hausses répond à « qu'est-ce qui monte », pas à « que se passe-t-il ».
 * Le jour où une classe entière baisse, un classement par hausse décroissante remonte
 * les moins mauvaises lignes et donne à lire une page verte sur un marché rouge. La
 * valeur ABSOLUE remonte l'événement, quel que soit son signe — et le badge, lui, dit
 * le sens sans ambiguïté.
 *
 * ── LES LIGNES SANS VARIATION SONT ÉCARTÉES, PAS CLASSÉES À ZÉRO ────────────
 *
 * `change24h` est optionnel : toutes les sources ne le publient pas. Traiter l'absence
 * comme un zéro ferait remonter une ligne muette au milieu du classement, et §5
 * l'interdit. On les retire.
 */
function topMovers(assets: MarketAsset[]): MarketAsset[] {
  return assets
    .filter((asset) => typeof asset.change24h === 'number')
    .sort((a, b) => Math.abs(b.change24h ?? 0) - Math.abs(a.change24h ?? 0))
    .slice(0, ROWS)
}

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * EN TENDANCE — UNE CARTE PAR CLASSE, SUR TOUTE LA LARGEUR
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── CE QUE « TENDANCE » VEUT DIRE ICI, ET CE QU'IL NE VEUT PAS DIRE ─────────
 *
 * Pas « le plus consulté » : nous n'avons pas de mesure d'audience, et six des sept
 * classes n'en auront jamais. C'est la plus forte VARIATION du jour, ce qui est un
 * fait mesuré et non une inférence — et c'est écrit sous l'intitulé, parce qu'un
 * lecteur qui prend « tendance » pour « populaire » lit un autre classement que celui
 * qu'on lui montre.
 *
 * Le libellé de période vient de l'actif lui-même (`changePeriodLabel`) : la BCE ne
 * publie qu'un taux par jour ouvré, et écrire « 24 h » sur une paire de devises serait
 * faux. `ChangeBadge` sait déjà reprendre ce libellé, il suffit de le lui passer.
 *
 * ── AUCUNE REQUÊTE SUPPLÉMENTAIRE ───────────────────────────────────────────
 *
 * Les listes viennent des MÊMES classements que le tableau du dessus — la page les
 * demande une fois et s'en sert deux fois. Un appel « tendances » par classe aurait
 * doublé le coût de la page pour dire la même chose autrement.
 */
export async function TrendingBoard({ classes }: { classes: TrendingClass[] }) {
  const t = await getPhrase()

  /* Une classe sans variation exploitable ne rend PAS une carte vide : elle disparaît.
     Un cadre « aucune donnée » posé à côté de six cartes remplies attire l'œil sur ce
     qui manque plutôt que sur ce qui est là — et l'absence est déjà dite au bon
     endroit, dans le tableau du dessus, où le lecteur l'a demandée. */
  const filled = classes
    .map((entry) => ({ ...entry, movers: topMovers(entry.assets) }))
    .filter((entry) => entry.movers.length > 0)

  if (filled.length === 0) return null

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="text-sm font-normal text-ink-muted">{t('En tendance')}</h2>
        <p className="text-xs text-ink-muted/80">
          {t('Les plus fortes variations du jour, par classe d’actif')}
        </p>
      </div>

      {/* `auto-fit` + `minmax` plutôt qu'un nombre de colonnes par point de rupture :
          le nombre de cartes dépend des classes qui ont des données ce jour-là, et une
          grille à quatre colonnes fixes laisserait un vide béant le jour où trois
          sources répondent. La piste minimale à 260px est la largeur sous laquelle un
          nom d'actif et son cours cessent de tenir sur une ligne. */}
      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(260px,1fr))]">
        {filled.map((entry) => (
          <article
            key={entry.assetClass}
            className="flex flex-col rounded-panel border border-border-subtle bg-panel p-3"
          >
            <div className="flex items-baseline justify-between gap-2 pb-1">
              <h3 className="truncate text-sm font-semibold text-ink">{entry.label}</h3>
              <Link
                href={entry.href}
                className="shrink-0 text-xs text-brand transition-colors hover:text-brand-strong"
              >
                {t('Voir')} <span aria-hidden="true">→</span>
              </Link>
            </div>

            <ul className="divide-y divide-border-subtle">
              {entry.movers.map((asset) => (
                <li key={asset.id}>
                  <Link
                    href={assetHref(asset.assetClass, asset.id)}
                    className="group flex items-center gap-2 py-2 transition-colors"
                  >
                    <AssetLogo asset={asset} size={20} />

                    {/* `min-w-0` : sans lui la largeur minimale d'un enfant flexible est
                        celle de son contenu, et un nom long pousse le cours hors de la
                        carte au lieu d'être tronqué. */}
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-sm font-medium text-ink group-hover:text-brand-strong">
                        {asset.symbol.toUpperCase()}
                      </span>
                      <span className="truncate text-micro text-ink-muted">{asset.name}</span>
                    </span>

                    <span className="flex shrink-0 flex-col items-end">
                      <span className="tabular text-sm text-ink">
                        <Money value={asset.price} from={asset.currency} />
                      </span>
                      <ChangeBadge
                        value={asset.change24h}
                        size="sm"
                        {...(asset.changePeriodLabel
                          ? { periodLabel: asset.changePeriodLabel }
                          : {})}
                      />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  )
}
