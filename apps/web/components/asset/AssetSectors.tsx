import type { AssetDetail } from '@zenkuu/data'
import { getCategories, getExchangeRates } from '@zenkuu/data'
import { ChangeBadge, formatCompact, formatShare } from '@zenkuu/ui'

import { Link } from '@/i18n/navigation'
import { Panel } from '@/components/ui/Panel'
import { getPhrase } from '@/lib/content'

/**
 * SECTEURS AUXQUELS L'ACTIF APPARTIENT, ET SON POIDS DANS CHACUN.
 *
 * ── LA SECTION QUI MANQUAIT ENTRE L'ACTIF ET LE MARCHÉ ────────────────────────
 *
 * La fiche portait déjà les secteurs, en pastilles sous le ticker. Une pastille dit
 * « Layer 1 (L1) » et s'arrête là : elle nomme une appartenance sans rien en dire.
 * Or c'est précisément l'appartenance qui donne son échelle au reste de la page — une
 * capitalisation de soixante milliards ne veut pas la même chose selon qu'elle pèse
 * deux pour cent d'un secteur ou soixante.
 *
 * La référence pose cette information en haut de sa fiche, sous le nom du projet
 * (« Blockchains (L1) »), et lui consacre des pages entières de comparaison. Nous
 * n'avons pas ses métriques sectorielles, mais nous avons ce qui compte le plus : la
 * TAILLE du secteur, son MOUVEMENT du jour, et la part que l'actif y occupe.
 *
 * ── LE POIDS EST UN RAPPORT, ET LES DEUX TERMES DOIVENT ÊTRE DANS LA MÊME UNITÉ ─
 *
 * `capitalisation de l'actif ÷ capitalisation du secteur`. Un ratio de deux valeurs
 * publiées, pas une estimation — la distinction que défend `lib/series-stats.ts` : on
 * ne devine aucune valeur manquante, on met en rapport deux valeurs connues.
 *
 * MAIS LES DEUX N'ARRIVENT PAS DANS LA MÊME DEVISE, et c'est le piège de ce calcul.
 * L'endpoint des secteurs de CoinGecko ne cote QU'EN DOLLARS (voir son adaptateur, qui
 * ignore explicitement le paramètre de devise), alors que la fiche demande ses chiffres
 * en euros. Diviser l'un par l'autre produisait un pourcentage faux d'un facteur égal
 * au taux de change — soit environ quinze points d'écart, avec l'apparence parfaite
 * d'un chiffre juste. Une division n'est sans unité que si ses deux termes partagent
 * la même.
 *
 * La capitalisation de l'actif est donc ramenée en dollars par la table de change du
 * site avant division. C'est la même conversion que celle que `Money` applique partout
 * ailleurs, et elle est mise en cache comme le reste.
 *
 * Le poids est tu — et non affiché à zéro — quand l'un des deux termes manque, ou
 * quand la table de change n'a pas répondu.
 *
 * ── ET IL NE COÛTE AUCUN APPEL ────────────────────────────────────────────────
 *
 * `getCategories` sert déjà l'accueil, la page des secteurs et les graphiques globaux,
 * derrière une clé de cache qui ne dépend d'aucun actif : un seul téléchargement
 * alimente toutes les fiches du site pendant la durée du cache. C'est ce qui rend
 * cette section gratuite là où les pools, eux, coûtent un appel par jeton.
 *
 * ── LE RAPPROCHEMENT SE FAIT PAR LE NOM, ET C'EST UNE FAIBLESSE ASSUMÉE ───────
 *
 * `AssetDetail.categories` porte des NOMS (« Smart Contract Platform »), la liste des
 * secteurs porte des noms et des identifiants. La source étant la même des deux côtés,
 * les libellés concordent en pratique. Un secteur qui ne se retrouverait pas est
 * simplement omis plutôt que rendu sans chiffres : une ligne « Layer 1 — » n'apprend
 * rien et laisse croire à un secteur vide.
 */
export async function AssetSectors({ asset }: { asset: AssetDetail }) {
  const t = await getPhrase()
  const names = asset.categories ?? []
  if (names.length === 0) return null

  /* Les deux appels sont déjà en cache pour tout le site et ne dépendent d'aucun
     actif : cette section ne coûte donc rien de plus, quelle que soit la fiche. */
  const [categories, rates] = await Promise.all([getCategories(), getExchangeRates()])
  if (!categories.ok) return null

  /**
   * Capitalisation de l'actif RAMENÉE EN DOLLARS — voir l'en-tête.
   *
   * `rates.rates` donne la valeur d'un euro dans chaque devise. La fiche cote en euros,
   * il suffit donc de multiplier. Un actif coté dans une autre devise passe d'abord par
   * l'euro ; si sa devise manque de la table, le poids n'est pas calculé du tout plutôt
   * que calculé sur une unité inconnue.
   */
  const usdPerEur = rates.ok ? rates.data.rates['USD'] : undefined
  const eurPerAssetCurrency = rates.ok
    ? asset.currency.toUpperCase() === 'EUR'
      ? 1
      : (() => {
          const perEur = rates.data.rates[asset.currency.toUpperCase()]
          return perEur !== undefined && perEur > 0 ? 1 / perEur : undefined
        })()
    : undefined

  const marketCapUsd =
    asset.marketCap !== undefined && usdPerEur !== undefined && eurPerAssetCurrency !== undefined
      ? asset.marketCap * eurPerAssetCurrency * usdPerEur
      : undefined

  const index = new Map(categories.data.map((entry) => [entry.name.toLowerCase(), entry]))

  const rows = names
    .map((name) => index.get(name.toLowerCase()))
    .filter((entry): entry is NonNullable<typeof entry> => entry !== undefined)
    /* Par capitalisation décroissante : le secteur le plus large situe l'actif dans le
       marché, les suivants le précisent. La source, elle, ne garantit aucun ordre. */
    .sort((a, b) => (b.marketCap ?? 0) - (a.marketCap ?? 0))

  if (rows.length === 0) return null

  /*
   * NEUF AU PLUS, soit trois rangées pleines.
   *
   * La source est généreuse en étiquettes : un jeton d'infrastructure répandu en porte
   * une vingtaine, dont « Made in USA » ou « Portefeuille d'untel ». Les afficher toutes
   * ferait de cette section la plus longue de la fiche pour la matière la moins dense,
   * et noierait les trois ou quatre secteurs qui situent réellement l'actif.
   *
   * Neuf et pas six : la coupe doit laisser passer les secteurs de niche, qui sont
   * justement ceux où l'actif pèse lourd et où sa part apprend quelque chose. Le tri par
   * capitalisation les place en fin de liste, pas en tête.
   */
  const LIMIT = 9
  const shown = rows.slice(0, LIMIT)
  const hidden = rows.length - shown.length

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        {/* Passé par `t()` : ce titre s'affichait en français dans les douze autres
            langues. Il avait échappé au relevé des littéraux nus parce que « Secteurs »
            ne porte aucun accent — l'heuristique cherchait une marque française. */}
        <h2 className="display-sm text-ink">{t('Secteurs')}</h2>
        <Link
          href="/categories"
          className="shrink-0 text-xs font-medium text-ink hover:underline"
        >{t('Tous les secteurs')}</Link>
      </div>

      <p className="max-w-3xl text-xs leading-relaxed text-ink-muted">
        Les narratifs auxquels la source rattache {asset.name}, avec la taille de chacun et
        la part que l’actif y occupe. Un secteur peut en recouper un autre : les parts ne
        s’additionnent pas. Les montants sont{' '}
        <strong className="font-medium text-ink">en dollars</strong> — la source ne publie
        les agrégats sectoriels que dans cette devise, et les convertir mêlerait deux
        horodatages.
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {shown.map((category) => {
          /* Rapport de deux nombres publiés, LES DEUX EN DOLLARS — voir l'en-tête. Tu
             quand l'un manque, et plafonné à 100 : un actif classé dans un secteur dont
             la source n'a pas encore recalculé la capitalisation produirait sinon
             « 340 % du secteur ». */
          const weight =
            marketCapUsd !== undefined && (category.marketCap ?? 0) > 0
              ? Math.min((marketCapUsd / (category.marketCap as number)) * 100, 100)
              : undefined

          return (
            <Panel key={category.id} headingLevel="h3" rule={false} title={
              /* `block min-h-8 leading-8` : le lien était EN LIGNE, donc haut de ses
                 seules lettres — 17 px relevés par `audit-responsive`, contre un
                 plancher de 32. Un `<a>` en ligne ne s'agrandit ni par la hauteur de
                 ligne ni par un `padding` vertical ; il doit devenir un bloc. Même
                 correctif que sur les cartes de l'accueil (`AnalysisCard`), et
                 `truncate` reste ici parce que c'est désormais CE lien qui déborde. */
              <Link
                href={`/categories/${category.id}`}
                className="block min-h-8 truncate leading-8 underline decoration-border-subtle decoration-dotted underline-offset-4 transition-colors duration-150 hover:text-brand hover:decoration-solid"
              >
                {category.name}
              </Link>
            }>
              <dl className="space-y-1.5">
                <div className="flex items-baseline justify-between gap-2">
                  <dt className="text-xs text-ink-muted">{t('Capitalisation $')}</dt>
                  <dd className="tabular flex items-baseline gap-2 text-xs font-medium text-ink">
                    {category.marketCap !== undefined ? formatCompact(category.marketCap) : '—'}
                    {category.marketCapChange24h !== undefined ? (
                      <ChangeBadge value={category.marketCapChange24h} size="sm" />
                    ) : null}
                  </dd>
                </div>

                <div className="flex items-baseline justify-between gap-2">
                  <dt className="text-xs text-ink-muted">{t('Volume 24 h $')}</dt>
                  <dd className="tabular text-xs font-medium text-ink">
                    {category.volume24h !== undefined ? formatCompact(category.volume24h) : '—'}
                  </dd>
                </div>

                {weight !== undefined ? (
                  <div className="pt-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <dt className="text-xs text-ink-muted">{t('Part de {s}').replace('{s}', asset.symbol.toUpperCase())}</dt>
                      <dd className="tabular text-xs font-medium text-ink">{formatShare(weight)}</dd>
                    </div>
                    {/*
                      La barre double le pourcentage plutôt que de le remplacer. Deux
                      secteurs à 3 % et 47 % se distinguent d'un regard sur une longueur,
                      là où deux nombres demandent d'être lus puis comparés — et c'est
                      exactement la comparaison que cette section existe pour permettre.
                    */}
                    <div
                      className="mt-1.5 h-1 overflow-hidden rounded-full bg-surface"
                      role="presentation"
                    >
                      <div
                        className="h-full rounded-full bg-brand"
                        style={{ width: `${Math.max(weight, 1)}%` }}
                      />
                    </div>
                  </div>
                ) : null}
              </dl>
            </Panel>
          )
        })}
      </div>

      {/* Le nombre restant est DIT, jamais tu. Une grille coupée en silence se lit comme
          une liste complète : le lecteur en conclurait que l'actif n'appartient qu'à neuf
          secteurs, alors qu'il en compte le double. */}
      {hidden > 0 ? (
        <p className="text-xs text-ink-muted">
          {hidden} autre{hidden > 1 ? 's' : ''} secteur{hidden > 1 ? 's' : ''} rattache
          {hidden > 1 ? 'nt' : ''} {asset.name} chez la source, de capitalisation plus faible.{' '}
          <Link href="/categories" className="font-medium text-ink hover:underline">{t('Voir la liste complète')}</Link>
          .
        </p>
      ) : null}
    </section>
  )
}
