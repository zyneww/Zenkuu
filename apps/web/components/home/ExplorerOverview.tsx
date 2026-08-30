import {
  CATEGORY_RANKING_FLOOR_USD,
  getCategories,
  getCryptoGlobalStats,
  getMarketCapSeriesState,
  getMoversUniverse,
  type MarketAsset,
} from '@zenkuu/data'
import { EmptyState, formatShare } from '@zenkuu/ui'

import type { ReactNode } from 'react'

import { Link } from '@/i18n/navigation'
import { Money } from '@/components/locale/Money'
import { CategoryRail, type RailEntry } from '@/components/home/CategoryRail'
import { buildSectors, drift } from '@/components/home/explorer-sectors'
import { LeaderboardCard, type LeaderRow } from '@/components/home/LeaderboardCard'
import { SectionLabel } from '@/components/home/SectionLabel'
import { SectorMap } from '@/components/home/SectorMap'
import { assetHref, marketHref } from '@/lib/asset-routes'
import { getPhrase } from '@/lib/content'

/** Nombre de secteurs dessinés. Au-delà, une tuile n'est plus qu'un liseré. */
const SECTOR_COUNT = 8

/** Longueur d'un palmarès. Celle de la référence, et celle de tous les autres du site. */
const RANK_SIZE = 5


/** Libellé de profondeur des relevés maison, en minutes ou en heures. */
function spanLabel(minutes: number, t: (text: string) => string): string {
  if (minutes >= 120) {
    return t('relevés ZENKUU sur {n} h').replace('{n}', String(Math.round(minutes / 60)))
  }
  return t('relevés ZENKUU sur {n} min').replace('{n}', String(minutes))
}

/**
 * Construit un bloc de palmarès à partir d'un tri d'actifs.
 *
 * `magnitude` sert DEUX choses qu'il vaut mieux ne pas séparer : l'ordre des lignes et
 * la largeur de leur barre. Les passer indépendamment laisserait écrire un classement
 * trié par variation dont les barres mesureraient la capitalisation — des barres
 * décroissantes sous un ordre qui ne l'est pas, c'est-à-dire une figure fausse.
 */
function rankBlock(
  assets: MarketAsset[],
  magnitude: (asset: MarketAsset) => number | undefined,
  value: (asset: MarketAsset) => ReactNode,
  change: (asset: MarketAsset) => number | undefined,
): LeaderRow[] {
  const sized = assets
    .map((asset) => ({ asset, size: magnitude(asset) }))
    .filter((entry): entry is { asset: MarketAsset; size: number } => (entry.size ?? 0) > 0)
    .sort((a, b) => b.size - a.size)
    .slice(0, RANK_SIZE)

  const biggest = sized[0]?.size ?? 1

  return sized.map((entry) => ({
    key: entry.asset.id,
    href: assetHref(entry.asset.assetClass, entry.asset.id),
    name: entry.asset.name,
    symbol: entry.asset.symbol,
    ...(entry.asset.image ? { image: entry.asset.image } : {}),
    value: value(entry.asset),
    ...((change(entry.asset) ?? undefined) !== undefined
      ? { change: change(entry.asset) as number }
      : {}),
    share: entry.size / biggest,
  }))
}

/**
 * LE CORPS DE L'EXPLORATEUR — carte des secteurs, puis trois classements.
 *
 * ── POURQUOI CE BLOC EST À PART, ET SOUS `<Suspense>` CHEZ SON APPELANT ─────
 *
 * Il porte les deux requêtes les plus lourdes du site : cent actifs et l'intégralité
 * des catégories. Elles servent déjà `/heatmap`, `/categories` et `/mouvements`, et
 * leurs clés de cache ne dépendent d'aucun paramètre — le premier visiteur de la
 * journée les paie, les autres lisent le cache. Le premier visiteur, lui, ne doit pas
 * attendre pour voir le champ de recherche, qui est l'objet même de cette page.
 *
 * `getCryptoGlobalStats` est rappelée ici alors que la page l'a déjà demandée : c'est
 * un accès au cache applicatif, sur la même clé, donc gratuit. La passer en prop
 * aurait obligé la page à l'attendre avant de rendre quoi que ce soit — exactement ce
 * que ce découpage évite.
 */
/**
 * `news` est passé en NŒUD DÉJÀ RENDU plutôt que fabriqué ici, et ce n'est pas un
 * détail d'organisation. Le panneau d'actualités est LÉGER — un appel que la page
 * fait de toute façon — quand ce composant-ci en attend deux lourds. Le construire
 * ici l'enfermerait dans la même frontière `<Suspense>`, et une liste prête depuis
 * trois cents millisecondes resterait masquée le temps que cent actifs arrivent.
 *
 * Il est donc rendu au-dessus, hors de l'attente, et seulement PLACÉ ici — la
 * grille d'analyse a besoin de le poser dans sa colonne de gauche, pas de savoir
 * comment il se remplit.
 */
export async function ExplorerOverview({
  news,
  newsHref,
}: {
  news: ReactNode
  newsHref: string
}) {
  const t = await getPhrase()

  const [categories, universe, stats] = await Promise.all([
    getCategories(),
    getMoversUniverse(100, 'eur'),
    getCryptoGlobalStats('eur'),
  ])

  // Lue APRÈS `getCryptoGlobalStats` : c'est cet appel qui vient d'ajouter le point du
  // jour à la série. L'ordre compte, sinon les courbes afficheraient un relevé de retard.
  const series = getMarketCapSeriesState('EUR')

  const assets = universe.ok ? universe.data : []

  if (assets.length === 0 && !categories.ok) {
    return (
      <EmptyState
        title={t('Aperçu du marché indisponible')}
        description={universe.ok ? null : universe.reason}
        compact
      />
    )
  }

  /* ── LES SECTEURS ────────────────────────────────────────────────────────
     Trois règles s'y croisent — un actif ne paraît qu'une fois, un secteur sans actif
     propre est sauté, la surface d'un groupe est la somme de ses tuiles — et elles
     vivent dans un module à part pour être éprouvées. Voir `explorer-sectors.ts`. */
  const sectors = buildSectors(categories.ok ? categories.data : [], assets, {
    limit: SECTOR_COUNT,
    floor: CATEGORY_RANKING_FLOOR_USD,
  })

  /* ── LES TROIS AGRÉGATS ──────────────────────────────────────────────────
     Capitalisation, volume, dominance : les trois seules grandeurs mondiales que la
     source publie, et les trois que notre propre série enregistre. La correspondance
     n'est pas fortuite — la série a été écrite pour ces courbes-là. */
  const capPoints = series.points.map((point) => point.value)
  const volumePoints = series.points.flatMap((point) =>
    point.volume === undefined ? [] : [point.volume],
  )
  const dominancePoints = series.points.flatMap((point) =>
    point.btcDominance === undefined ? [] : [point.btcDominance],
  )

  const span = spanLabel(series.spanMinutes, t)

  const money = (value: number | undefined) => <Money value={value} from="EUR" compact />

  /* Le classement des variations sur 7 jours et sur 24 h se fait sur la VALEUR ABSOLUE :
     un palmarès de mouvements doit montrer les plus gros mouvements, pas seulement les
     hausses. Trier par valeur signée reléguerait une chute de 40 % derrière une hausse
     de 2 %, ce qui est exactement l'inverse de ce que le bloc annonce. */
  const swing = (value: number | undefined) => (value === undefined ? undefined : Math.abs(value))

  /*
   * ── LE RAIL DE SECTEURS ────────────────────────────────────────────────────
   *
   * Il est bâti sur `sectors` et non sur `categories`, alors que la seconde liste
   * est plus longue. La raison est qu'il doit dire la MÊME chose que la carte posée
   * juste en dessous : `buildSectors` a écarté les secteurs sans actif propre et
   * fusionné ceux qui se recouvrent, et un rail construit sur la liste brute
   * proposerait des entrées introuvables sur la carte. Deux inventaires qui se
   * contredisent à quinze pixels d'écart sont pires qu'un seul.
   *
   * « Tous » ouvre la liste complète et se rend en pastille pleine : la page montre
   * bien l'ensemble des secteurs, la marquer courante n'est donc pas décoratif.
   */
  const rail: RailEntry[] = [
    { href: '/categories', label: t('Tous'), current: true },
    ...sectors.map((sector) => ({ href: sector.href, label: sector.name })),
  ]

  return (
    <div className="flex flex-col gap-6">
      <CategoryRail entries={rail} label={t('Secteurs')} />

      {/* ── LA GRILLE D'ANALYSE ────────────────────────────────────────────────
          Deux familles côte à côte, puis une troisième en pleine largeur.

          ── POURQUOI LES CLASSEMENTS NE SONT PAS DANS UNE COLONNE ──────────────

          Ils y ont été, et la page penchait. Une FAMILLE de cartes vit dans une seule
          colonne — c'est la grammaire de la référence, où « Buyback Analysis » et
          « Burn Analysis » ne sont jamais coupées en deux. Or nos trois familles ont
          des hauteurs de 1 à 3 : la carte des secteurs fait 400 pixels, le panneau
          d'actualités 220, et les trois classements empilés 1 290. Toute répartition
          en deux colonnes qui garde les familles entières laisse donc au moins 600
          pixels de vide au pied de la plus courte.

          Les classements passent donc SOUS la grille, en trois cartes de front. Ils
          n'y perdent rien — c'est leur disposition d'origine, et ils sont la seule
          famille du site à compter assez de cartes pour tenir une rangée.

          ── LES DEUX PISTES NE SONT PAS ÉGALES ─────────────────────────────────

          8 contre 5. La carte des secteurs est un treemap : sa lisibilité dépend
          directement de sa largeur, une tuile de 8 % devenant illisible en dessous
          d'environ 600 pixels. Le panneau d'actualités, lui, est une liste de titres
          qui se lit aussi bien à 400. Partager à parts égales prendrait au premier ce
          dont il a besoin pour donner au second ce dont il n'a que faire.

          `minmax(0,…)` et non `…fr` seul : une piste `fr` a pour taille minimale son
          contenu, et la carte des secteurs, qui se dimensionne en pourcentages, ne
          déclare aucune largeur minimale utile. Sans le `minmax`, elle déborde.

          `items-start` : les deux colonnes ont des hauteurs indépendantes. Sans lui,
          la plus courte est étirée à la hauteur de l'autre et sa carte se termine par
          plusieurs centaines de pixels d'aplat vide. */}
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,8fr)_minmax(0,5fr)]">
        <section className="flex min-w-0 flex-col gap-2">
          <SectionLabel>{t('Analyse des secteurs')}</SectionLabel>

          {sectors.length > 0 ? (
            <SectorMap
              sectors={sectors}
              moreHref="/heatmap"
              note={t(
                'Les secteurs de la source se recouvrent : chaque actif est rattaché ici au plus grand qui le revendique, et la surface d’un groupe est la somme de ses actifs.',
              )}
            />
          ) : (
            <EmptyState
              title={t('Secteurs indisponibles')}
              description={categories.ok ? null : categories.reason}
              compact
            />
          )}
        </section>

        <section className="flex min-w-0 flex-col gap-2">
          <SectionLabel
            action={
              <Link
                href={newsHref}
                className="shrink-0 text-sm text-ink transition-colors hover:text-brand"
              >
                {t('Voir plus')}
              </Link>
            }
          >
            {t('Découvrir')}
          </SectionLabel>

          {news}
        </section>
      </div>

      <section className="flex flex-col gap-2">
        <SectionLabel
          action={
            <Link
              href={marketHref('crypto')}
              className="shrink-0 text-sm text-ink transition-colors hover:text-brand"
            >
              {t('Tout voir')}
            </Link>
          }
        >
          {t('Classements')}
        </SectionLabel>

        {assets.length > 0 && stats.ok ? (
          <div className="grid items-start gap-4 xl:grid-cols-3">
            <LeaderboardCard
              title={t('Capitalisation totale')}
              value={money(stats.data.totalMarketCap)}
              change={stats.data.marketCapChange24h}
              hint={t('Toutes cryptomonnaies · variation sur 24 h')}
              spark={capPoints}
              blocks={[
                {
                  title: t('Meneurs du marché'),
                  hint: t('capitalisation'),
                  rows: rankBlock(
                    assets,
                    (asset) => asset.marketCap,
                    (asset) => money(asset.marketCap),
                    (asset) => asset.change24h,
                  ),
                },
                {
                  title: t('Mouvements de la semaine'),
                  hint: t('7 jours'),
                  rows: rankBlock(
                    assets,
                    (asset) => swing(asset.change7d),
                    (asset) => money(asset.marketCap),
                    (asset) => asset.change7d,
                  ),
                },
              ]}
            />

            <LeaderboardCard
              title={t('Volume négocié 24 h')}
              value={money(stats.data.totalVolume24h)}
              {...(drift(volumePoints) !== undefined
                ? { change: drift(volumePoints) as number }
                : {})}
              hint={`${t('Toutes places confondues')} · ${span}`}
              spark={volumePoints}
              blocks={[
                {
                  title: t('Plus forts volumes'),
                  hint: t('24 heures'),
                  rows: rankBlock(
                    assets,
                    (asset) => asset.volume24h,
                    (asset) => money(asset.volume24h),
                    (asset) => asset.change24h,
                  ),
                },
                {
                  title: t('Mouvements du jour'),
                  hint: t('24 heures'),
                  rows: rankBlock(
                    assets,
                    (asset) => swing(asset.change24h),
                    (asset) => money(asset.volume24h),
                    (asset) => asset.change24h,
                  ),
                },
              ]}
            />

            <LeaderboardCard
              title={t('Dominance de Bitcoin')}
              value={formatShare(stats.data.dominance.btc) ?? '—'}
              {...(drift(dominancePoints) !== undefined
                ? { change: drift(dominancePoints) as number }
                : {})}
              hint={`${t('Part de Bitcoin dans la capitalisation')} · ${span}`}
              spark={dominancePoints}
              blocks={[
                {
                  title: t('Parts de marché'),
                  hint: t('capitalisation'),
                  rows: dominanceRows(stats.data.dominance, assets),
                },
                {
                  title: t('Secteurs les plus actifs'),
                  hint: t('24 heures'),
                  rows: (categories.ok ? categories.data : [])
                    /* PLANCHER DE CAPITALISATION, le même que `/categories`.
                       Sans lui, le bloc affichait des secteurs à 46 000 € en baisse
                       de 91 % : mathématiquement exacts, et sans rapport avec ce que
                       la carte au-dessus vient de montrer. Une variation n'informe
                       qu'au-dessus d'une taille, en deçà elle ne mesure que le bruit
                       de deux ou trois jetons. */
                    .filter(
                      (category) =>
                        category.marketCapChange24h !== undefined &&
                        (category.marketCap ?? 0) >= CATEGORY_RANKING_FLOOR_USD,
                    )
                    .sort(
                      (a, b) =>
                        Math.abs(b.marketCapChange24h as number) -
                        Math.abs(a.marketCapChange24h as number),
                    )
                    .slice(0, RANK_SIZE)
                    .map((category, _index, list) => {
                      /* Le premier de la liste EST le plus fort mouvement, puisqu'on
                         vient de trier par valeur absolue : c'est donc lui, et non le
                         total, qui donne l'échelle des barres. Nul — tous les secteurs
                         figés au même instant —, la barre tombe à son minimum plutôt
                         que de diviser par zéro. */
                      const scale = Math.abs(list[0]?.marketCapChange24h ?? 0)

                      return {
                        key: category.id,
                        href: `/categories/${category.id}`,
                        name: category.name,
                        value: money(category.marketCap),
                        change: category.marketCapChange24h as number,
                        share:
                          scale > 0 ? Math.abs(category.marketCapChange24h as number) / scale : 0,
                      }
                    }),
                },
              ]}
            />
          </div>
        ) : (
          <EmptyState
            title={t('Classements indisponibles')}
            description={universe.ok ? null : universe.reason}
            compact
          />
        )}
      </section>
    </div>
  )
}

/**
 * Parts de marché — la table de dominance de la source, rendue cliquable.
 *
 * Elle arrive indexée par SYMBOLE (`{ btc: 54.2, eth: 12.8 }`), là où tout le reste du
 * site indexe par identifiant. On la rapproche donc de l'univers par le symbole, et un
 * symbole introuvable est ÉCARTÉ plutôt que rendu en ligne morte : la source y range
 * aussi des actifs hors des cent premiers, dont on n'a ni le nom complet ni le logo,
 * et une ligne « BNB » sans destination ni image se lirait comme une panne d'affichage.
 */
function dominanceRows(dominance: Record<string, number>, assets: MarketAsset[]): LeaderRow[] {
  const bySymbol = new Map(assets.map((asset) => [asset.symbol.toLowerCase(), asset]))

  const entries = Object.entries(dominance)
    .filter(([symbol, share]) => share > 0 && bySymbol.has(symbol.toLowerCase()))
    .sort((a, b) => b[1] - a[1])
    .slice(0, RANK_SIZE)

  const biggest = entries[0]?.[1] ?? 1

  return entries.flatMap(([symbol, share]) => {
    const asset = bySymbol.get(symbol.toLowerCase())
    if (!asset) return []

    return [
      {
        key: asset.id,
        href: assetHref(asset.assetClass, asset.id),
        name: asset.name,
        symbol: asset.symbol,
        ...(asset.image ? { image: asset.image } : {}),
        value: formatShare(share) ?? '—',
        ...(asset.change24h !== undefined ? { change: asset.change24h } : {}),
        share: share / biggest,
      },
    ]
  })
}
