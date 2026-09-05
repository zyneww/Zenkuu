import type { AssetClass, MarketAsset } from '@zenkuu/data'
import { ChangeBadge } from '@/components/locale/ChangeBadge'

import { AssetLogo } from '@/components/asset/AssetLogo'
import { Money } from '@/components/locale/Money'
import { Link } from '@/i18n/navigation'
import { assetHref } from '@/lib/asset-routes'
import { getPhrase } from '@/lib/content'

/**
 * Bandeau de trois cartes au-dessus d'un classement.
 *
 * ── CE QUI EST REPRIS DE LA RÉFÉRENCE, ET CE QUI NE PEUT PAS L'ÊTRE ───────────
 *
 * CoinGecko coiffe ses tableaux de trois cartes — capitalisation totale, tendances,
 * plus fortes hausses — et c'est une bonne idée : un classement de cinquante lignes
 * ne dit pas ce qui s'est passé aujourd'hui, il faut le lire pour le découvrir.
 *
 * Ce qui ne peut pas être repris tel quel, c'est leur CONTENU. Nos sources ne
 * fournissent pas les mêmes champs selon la classe : Yahoo ne publie ni
 * capitalisation ni volume fiable pour une action, et une matière première n'a pas
 * de capitalisation du tout. Un gabarit unique afficherait donc des cartes vides sur
 * quatre pages sur six — ce que le §5 proscrit au même titre qu'un chiffre inventé.
 *
 * Chaque classe compose donc son bandeau avec ce qu'elle a réellement. Une carte
 * sans données ne s'affiche pas, et un bandeau entièrement vide disparaît.
 *
 * ── AUCUN APPEL RÉSEAU ────────────────────────────────────────────────────────
 *
 * Tout est calculé sur les actifs DÉJÀ CHARGÉS pour le tableau, comme
 * `MarketStatsStrip`. Interroger un agrégat coûterait une requête de plus par page
 * sur un quota mesuré à cinq par minute. La contrepartie — la portée est celle de la
 * page, pas du marché — est annoncée par la bande de statistiques qui suit.
 */

interface HighlightsProps {
  assets: MarketAsset[]
  assetClass: AssetClass
}

export async function MarketHighlights({ assets, assetClass }: HighlightsProps) {
  const t = await getPhrase()
  const cards = buildCards(assets, assetClass)
  if (cards.length === 0) return null

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
      {/* La traduction a lieu ICI et non dans `buildCards` : cette fonction est une
          table de correspondance pure, et lui passer un traducteur l'obligerait à
          porter un argument qui ne décrit rien de ce qu'elle compose. La CLÉ reste le
          titre français — c'est un identifiant de liste, pas un affichage. */}
      {cards.map((card) => (
        <Card
          key={card.title}
          title={t(card.title)}
          {...(card.note ? { note: t(card.note) } : {})}
        >
          {card.rows.map((row) => (
            <Row key={row.asset.id} asset={row.asset} trailing={row.trailing} />
          ))}
        </Card>
      ))}
    </div>
  )
}

interface CardSpec {
  title: string
  /** Précision de portée, quand le titre pourrait laisser croire à autre chose. */
  note?: string
  rows: { asset: MarketAsset; trailing: 'change' | 'price' }[]
}

/**
 * Composition du bandeau, classe par classe.
 *
 * Écrit comme une table de correspondance plutôt qu'en cascade de `if` : la question
 * « que montre la page ETF ? » se lit alors en un seul endroit, au lieu de se
 * reconstituer en suivant des branches.
 */
function buildCards(assets: MarketAsset[], assetClass: AssetClass): CardSpec[] {
  if (assets.length === 0) return []

  const gainers = [...assets]
    .filter((asset) => (asset.change24h ?? 0) > 0)
    .sort((a, b) => (b.change24h ?? 0) - (a.change24h ?? 0))
    .slice(0, 3)

  /* Carte commune à toutes les classes : la seule que TOUTES les sources
     permettent, puisqu'une variation se calcule dès qu'il y a deux prix. */
  const gainersCard: CardSpec | null =
    gainers.length > 0
      ? { title: 'Plus fortes hausses', rows: gainers.map(withChange) }
      : null

  switch (assetClass) {
    case 'crypto': {
      const byCap = [...assets]
        .filter((asset) => asset.marketCap !== undefined)
        .sort((a, b) => (b.marketCap ?? 0) - (a.marketCap ?? 0))
        .slice(0, 3)
      const byVolume = topBy(assets, (asset) => asset.volume24h)

      return compact([
        byCap.length > 0
          ? { title: 'Plus grandes capitalisations', rows: byCap.map(withChange) }
          : null,
        byVolume.length > 0
          ? { title: 'Plus forts volumes 24 h', rows: byVolume.map(withChange) }
          : null,
        gainersCard,
      ])
    }

    case 'commodity': {
      /* Les deux familles que tout lecteur cherche en premier sur une page de
         matières premières. Sélection par symbole et non par famille : « métaux
         précieux » compte quatre entrées dont le platine et le palladium, qui
         intéressent moins que l'or et l'argent. */
      const precious = pick(assets, ['GC=F', 'SI=F'])
      const energy = pick(assets, ['CL=F', 'BZ=F'])

      return compact([
        precious.length > 0
          ? { title: 'Métaux précieux', rows: precious.map(withPrice) }
          : null,
        energy.length > 0 ? { title: 'Énergie', rows: energy.map(withPrice) } : null,
        gainersCard,
      ])
    }

    case 'forex': {
      /* Les paires que consulte un lecteur francophone, dans cet ordre. */
      const majors = pick(assets, ['EUR/USD', 'EUR/GBP', 'EUR/CHF'])
      const movers = [...assets]
        .filter((asset) => asset.change24h !== undefined)
        .sort((a, b) => Math.abs(b.change24h ?? 0) - Math.abs(a.change24h ?? 0))
        .slice(0, 3)

      return compact([
        majors.length > 0 ? { title: 'Paires de référence', rows: majors.map(withPrice) } : null,
        movers.length > 0
          ? {
              title: 'Plus fortes variations',
              note: 'À la hausse comme à la baisse',
              rows: movers.map(withChange),
            }
          : null,
        gainersCard,
      ])
    }

    /* Actions, ETF, indices, NFT — Yahoo ne publie pour eux ni capitalisation ni
       volume comparable d'une valeur à l'autre. On s'en tient donc aux mouvements,
       qui sont exacts, plutôt qu'à des agrégats qui ne le seraient pas. */
    default: {
      const losers = [...assets]
        .filter((asset) => (asset.change24h ?? 0) < 0)
        .sort((a, b) => (a.change24h ?? 0) - (b.change24h ?? 0))
        .slice(0, 3)
      const byVolume = topBy(assets, (asset) => asset.volume24h)

      return compact([
        gainersCard,
        losers.length > 0 ? { title: 'Plus fortes baisses', rows: losers.map(withChange) } : null,
        byVolume.length > 0
          ? { title: 'Plus forts volumes 24 h', rows: byVolume.map(withChange) }
          : null,
      ])
    }
  }
}

/* ── Aides ────────────────────────────────────────────────────────────────── */

const withChange = (asset: MarketAsset) => ({ asset, trailing: 'change' as const })
const withPrice = (asset: MarketAsset) => ({ asset, trailing: 'price' as const })

function compact(cards: (CardSpec | null)[]): CardSpec[] {
  return cards.filter((card): card is CardSpec => card !== null)
}

/** Trois premiers par une mesure, en écartant ceux qui ne la portent pas. */
function topBy(assets: MarketAsset[], of: (asset: MarketAsset) => number | undefined) {
  return [...assets]
    .filter((asset) => of(asset) !== undefined)
    .sort((a, b) => (of(b) ?? 0) - (of(a) ?? 0))
    .slice(0, 3)
}

/**
 * Sélectionne des symboles précis, DANS L'ORDRE DEMANDÉ.
 *
 * L'ordre compte : « Or puis Argent » se lit mieux que l'ordre où le classement les
 * a rangés, qui dépend de leur cours du jour. Un `filter` renverrait l'ordre de la
 * liste source.
 */
function pick(assets: MarketAsset[], symbols: string[]): MarketAsset[] {
  return symbols
    .map((symbol) => assets.find((asset) => asset.symbol === symbol))
    .filter((asset): asset is MarketAsset => asset !== undefined)
}

/* ── Rendu ────────────────────────────────────────────────────────────────── */

function Card({
  title,
  note,
  children,
}: {
  title: string
  note?: string
  children: React.ReactNode
}) {
  return (
    <section className="border border-border-subtle bg-surface px-4 py-3">
      <h2 className="text-xs font-semibold text-ink-muted">{title}</h2>
      {note ? <p className="mt-0.5 text-[0.6875rem] text-ink-muted">{note}</p> : null}
      <ul className="mt-2.5 space-y-2">{children}</ul>
    </section>
  )
}

function Row({ asset, trailing }: { asset: MarketAsset; trailing: 'change' | 'price' }) {
  return (
    <li>
      <Link
        href={assetHref(asset.assetClass, asset.id)}
        className="group flex items-center gap-2"
      >
        <AssetLogo asset={asset} size={20} />
        <span className="min-w-0 flex-1 truncate text-sm text-ink group-hover:text-brand">
          {asset.name}
        </span>

        {trailing === 'price' ? (
          <span className="tabular shrink-0 text-sm font-medium text-ink">
            <Money value={asset.price} from={asset.currency} />
          </span>
        ) : (
          <ChangeBadge value={asset.change24h} periodLabel={asset.changePeriodLabel} size="sm" />
        )}
      </Link>
    </li>
  )
}
