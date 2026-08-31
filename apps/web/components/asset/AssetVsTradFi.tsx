import type { AssetDetail, ExchangeRates, MarketAsset } from '@zenkuu/data'
import { ChangeBadge, formatCurrency } from '@zenkuu/ui'

import { AssetLogo } from '@/components/asset/AssetLogo'
import { TRADFI_REFERENCES } from '@/content/tradfi-references'
import { Link } from '@/i18n/navigation'
import { assetHref } from '@/lib/asset-routes'
import { getPhrase } from '@/lib/content'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * FACE À LA FINANCE TRADITIONNELLE — UN RAPPORT DE TAILLES
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── LA QUESTION ─────────────────────────────────────────────────────────────
 *
 * « Dix-sept milliards de capitalisation », c'est un nombre sans échelle. La table le
 * met en face de choses dont tout le monde connaît la taille : l'or, le cuivre, Apple.
 * La colonne de droite dit alors combien de fois l'actif devrait grandir pour les
 * égaler — un « ×12 » se retient là où « 17 milliards contre 3 200 milliards » ne se
 * compare pas de tête.
 *
 * ── ⚠️ CE QUE « ×12 » DIT, ET SURTOUT CE QU'IL NE DIT PAS ───────────────────
 *
 * C'est un RAPPORT DE TAILLES ACTUEL, pas une prévision, pas un objectif, pas une
 * probabilité. « ×12 pour égaler l'or » signifie exactement « l'or vaut douze fois
 * plus aujourd'hui », et rien d'autre — ni que cela arrivera, ni que ce serait
 * raisonnable. Le pied de table le dit en toutes lettres, et il y reste (§5).
 *
 * ── D'OÙ VIENNENT LES TAILLES DE LA COLONNE DE DROITE ───────────────────────
 *
 * D'un cours VIVANT multiplié par une quantité DÉCLARÉE — nombre d'actions en
 * circulation, tonnes d'or extraites. Aucune de nos sources ne publie la
 * capitalisation d'une action ni celle d'un métal, et une valeur figée au dépôt serait
 * périmée dès le lendemain. Voir `content/tradfi-references.ts`, qui porte chaque
 * quantité avec son unité, son calcul, sa source et sa date.
 *
 * Un repère dont le cours du jour manque est ÉCARTÉ de la table plutôt que rendu à
 * zéro : une ligne « — » dans une colonne de tailles ne se compare à rien.
 */

/** Une ligne prête à rendre — le repère, sa taille, son rapport à l'actif. */
interface Row {
  name: string
  symbol: string
  href: string
  price: number
  currency: string
  change24h: number | undefined
  change7d: number | undefined
  size: number
  /** Combien de fois l'actif doit grandir pour égaler ce repère. `null` si inconnu. */
  multiple: number | null
}

export async function AssetVsTradFi({
  asset,
  references,
  rates,
}: {
  asset: AssetDetail
  /**
   * Les cours du jour des repères, fournis par l'appelant.
   *
   * Chargés par la page et non ici : ce sont deux classements — matières premières et
   * actions — que le site garde déjà en cache, et les redemander doublerait deux
   * appels pour la même donnée.
   */
  references: MarketAsset[]
  /**
   * Table de change, pour ramener tout le monde dans la devise de l'actif.
   *
   * Voir l'avertissement ci-dessous : sans elle, la table compare des dollars à des
   * euros et le multiple est faux d'environ quinze pour cent.
   */
  rates: ExchangeRates | null
}) {
  const t = await getPhrase()

  /*
   * ══════════════════════════════════════════════════════════════════════════════
   * ⚠️ TOUT EST RAMENÉ DANS LA DEVISE DE L'ACTIF, ET C'EST UNE CORRECTION
   * ══════════════════════════════════════════════════════════════════════════════
   *
   * Les repères viennent de Yahoo, qui cote en DOLLARS et ignore la devise demandée au
   * classement. L'actif consulté, lui, porte une capitalisation en euros. La première
   * version divisait donc une taille en dollars par une capitalisation en euros :
   * le multiple sortait faux d'environ quinze pour cent, et rien à l'écran ne le
   * signalait — les deux nombres restaient plausibles.
   *
   * C'est le défaut le plus dangereux de ce composant : une comparaison de tailles n'a
   * de sens que dans une unité commune, et l'erreur d'unité ne se voit jamais sur le
   * résultat. La conversion se fait donc ICI, une fois, avant tout calcul.
   *
   * `rates.rates` donne la valeur d'UN EURO dans chaque devise. Passer de X à Y demande
   * donc de diviser par le taux de X puis de multiplier par celui de Y — l'euro sert de
   * pivot, y compris quand ni l'origine ni la cible ne sont l'euro.
   *
   * Sans table de change, ou avec une devise absente d'elle, le repère est ÉCARTÉ. Le
   * comparer à un taux supposé de 1 serait exactement l'erreur qu'on corrige.
   */
  const target = asset.currency.toUpperCase()

  function convert(amount: number, from: string): number | null {
    const source = from.toUpperCase()
    if (source === target) return amount
    if (!rates) return null

    const fromRate = source === 'EUR' ? 1 : rates.rates[source]
    const toRate = target === 'EUR' ? 1 : rates.rates[target]
    if (!fromRate || !toRate) return null

    return (amount / fromRate) * toRate
  }

  const byId = new Map(references.map((entry) => [entry.id.toLowerCase(), entry]))

  const rows: Row[] = TRADFI_REFERENCES.map((reference) => {
    const quote = byId.get(reference.id.toLowerCase())
    if (!quote || !Number.isFinite(quote.price) || quote.price <= 0) return null

    /* La taille se calcule dans la devise de COTATION — le cours et la quantité y sont
       tous deux exprimés — puis se convertit. Convertir le cours d'abord donnerait le
       même résultat mais ferait passer l'arrondi de change dans un nombre affiché. */
    const size = convert(quote.price * reference.units, quote.currency)
    const price = convert(quote.price, quote.currency)
    if (size === null || price === null) return null

    return {
      name: reference.name,
      symbol: reference.symbol,
      href: assetHref(reference.assetClass, quote.id),
      price,
      currency: target,
      change24h: quote.change24h,
      change7d: quote.change7d,
      size,
      /* La capitalisation de l'actif consulté peut manquer — c'est le cas de toutes
         les classes servies par Yahoo. Le rapport devient alors inconnu, et il
         s'affiche comme tel plutôt que d'être remplacé par la valorisation diluée,
         qui décrit autre chose. */
      multiple:
        asset.marketCap !== undefined && asset.marketCap > 0 ? size / asset.marketCap : null,
    }
  }).filter((row): row is Row => row !== null)

  if (rows.length === 0) return null

  /* Du plus gros au plus petit : la table se lit comme une échelle, et une échelle
     désordonnée ne donne pas la mesure qu'on vient y chercher. */
  rows.sort((a, b) => b.size - a.size)

  /*
   * L'actif consulté est INSÉRÉ dans la suite triée, sous la forme d'un marqueur.
   *
   * Un marqueur et non une `Row` complète : sa ligne se rend autrement — surlignée,
   * avec son logo, sans multiple — et lui donner la forme des autres obligerait à
   * porter dans `Row` trois champs qui ne serviraient qu'à lui.
   *
   * Sans capitalisation connue, il n'entre pas : on ne sait pas où le placer, et le
   * mettre au hasard dans une échelle serait pire que de l'omettre.
   */
  const ordered: (Row | 'self')[] = [...rows]
  if (asset.marketCap !== undefined && asset.marketCap > 0) {
    const at = rows.findIndex((row) => row.size < (asset.marketCap as number))
    ordered.splice(at === -1 ? rows.length : at, 0, 'self')
  }

  return (
    <section aria-labelledby="tradfi-titre" className="space-y-3">
      <div className="space-y-1">
        <h2 id="tradfi-titre" className="display-sm text-ink">
          {asset.symbol.toUpperCase()} {t('face à la finance traditionnelle')}
        </h2>
        <p className="max-w-3xl text-sm leading-relaxed text-ink-muted">
          {t(
            'La taille de cet actif, mise en face de valeurs dont l’ordre de grandeur est connu. La dernière colonne dit combien de fois il devrait grandir pour les égaler — au cours d’aujourd’hui.',
          )}
        </p>
      </div>

      <div className="overflow-x-auto rounded-card border border-border-subtle bg-surface">
        <table className="w-full min-w-[680px] border-collapse text-sm">
          <caption className="sr-only">
            {asset.name} {t('face à la finance traditionnelle')}
          </caption>
          <thead>
            <tr className="border-b border-border-subtle bg-surface-muted/35 text-left text-xs text-ink-muted">
              <th scope="col" className="w-10 px-4 py-2.5 text-right font-semibold">#</th>
              <th scope="col" className="px-4 py-2.5 font-semibold">{t('Actif')}</th>
              <th scope="col" className="border-l border-border-subtle/60 px-4 py-2.5 text-right font-semibold">
                {t('Cours')}
              </th>
              <th scope="col" className="border-l border-border-subtle/60 px-4 py-2.5 text-right font-semibold">
                {t('24 h')}
              </th>
              <th scope="col" className="border-l border-border-subtle/60 px-4 py-2.5 text-right font-semibold">
                {t('7 j')}
              </th>
              <th scope="col" className="border-l border-border-subtle/60 px-4 py-2.5 text-right font-semibold">
                {t('Taille / écart')}
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-border-subtle">
            {/*
              ── L'ACTIF CONSULTÉ EST DANS LA TABLE, À SA PLACE DANS L'ÉCHELLE ────

              Sans lui, la table est une liste de choses grosses et le lecteur doit
              retenir sa capitalisation pour la comparer mentalement à chaque ligne.
              Avec lui, la comparaison est visuelle : on voit d'un coup ce qui est
              au-dessus et au-dessous.

              ⚠️ IL EST TRIÉ AVEC LES AUTRES, PAS POSÉ EN TÊTE. Une première version le
              rendait avant la boucle : sa ligne portait le rang « 5 » tout en haut du
              tableau, ce qui contredisait l'ordre affiché juste en dessous. Une échelle
              dont un élément est hors de son rang n'est plus une échelle.

              Il ne porte pas de multiple — un actif ne se compare pas à lui-même —
              d'où le tiret dans la dernière colonne, comme sur la référence.
            */}
            {ordered.map((row, index) => {
              if (row === 'self') {
                return <SelfRow key="self" asset={asset} rank={index + 1} />
              }

              return (
                <tr key={row.symbol} className="transition-colors hover:bg-surface-muted/30">
                  <td className="tabular px-4 py-3 text-right text-xs text-ink-muted/70">
                    {index + 1}
                  </td>

                  <th scope="row" className="px-4 py-3 text-left font-normal">
                    <Link href={row.href} className="flex items-center gap-2.5 hover:text-brand">
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-ink">{row.name}</span>
                        <span className="block text-xs uppercase text-ink-muted">{row.symbol}</span>
                      </span>
                    </Link>
                  </th>

                  <td className="tabular border-l border-border-subtle/60 px-4 py-3 text-right text-ink">
                    {formatCurrency(row.price, row.currency) ?? '—'}
                  </td>
                  <td className="border-l border-border-subtle/60 px-4 py-3 text-right">
                    <ChangeBadge value={row.change24h} size="sm" />
                  </td>
                  <td className="border-l border-border-subtle/60 px-4 py-3 text-right">
                    <ChangeBadge value={row.change7d} size="sm" periodLabel="sur 7 jours" />
                  </td>

                  <td className="border-l border-border-subtle/60 px-4 py-3">
                    <span className="flex items-center justify-end gap-2">
                      <span className="tabular rounded-control bg-surface-muted px-2 py-1 text-xs font-medium text-ink">
                        {formatCurrency(row.size, row.currency, { compact: true }) ?? '—'}
                      </span>
                      {row.multiple === null ? (
                        <span className="w-12 text-right text-ink-muted/60">—</span>
                      ) : (
                        <span className="tabular w-12 text-right text-xs font-semibold text-up">
                          ×{formatMultiple(row.multiple)}
                        </span>
                      )}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p className="max-w-3xl text-xs leading-relaxed text-ink-muted">
        {t(
          'Les tailles de droite sont le cours du jour multiplié par une quantité déclarée — actions en circulation, stock extrait — dont la source et la date figurent dans le registre du site. Le multiple est un rapport de tailles ACTUEL : il ne prédit rien, ne fixe aucun objectif et ne constitue ni un conseil ni une recommandation.',
        )}
      </p>
    </section>
  )
}

/** La ligne de l'actif consulté — surlignée, sans multiple. Voir la note ci-dessus. */
function SelfRow({ asset, rank }: { asset: AssetDetail; rank: number }) {
  return (
    <tr className="bg-brand-soft/40">
      <td className="tabular px-4 py-3 text-right text-xs text-ink-muted/70">{rank}</td>

      <th scope="row" className="px-4 py-3 text-left font-normal">
        <span className="flex items-center gap-2.5">
          <AssetLogo asset={asset} size={22} />
          <span className="min-w-0">
            <span className="block truncate font-semibold text-ink">{asset.name}</span>
            <span className="block text-xs uppercase text-ink-muted">{asset.symbol}</span>
          </span>
        </span>
      </th>

      <td className="tabular border-l border-border-subtle/60 px-4 py-3 text-right text-ink">
        {formatCurrency(asset.price, asset.currency) ?? '—'}
      </td>
      <td className="border-l border-border-subtle/60 px-4 py-3 text-right">
        <ChangeBadge value={asset.change24h} size="sm" />
      </td>
      <td className="border-l border-border-subtle/60 px-4 py-3 text-right">
        <ChangeBadge value={asset.change7d} size="sm" periodLabel="sur 7 jours" />
      </td>

      <td className="border-l border-border-subtle/60 px-4 py-3">
        <span className="flex items-center justify-end gap-2">
          <span className="tabular rounded-control bg-overlay px-2 py-1 text-xs font-medium text-ink">
            {formatCurrency(asset.marketCap, asset.currency, { compact: true }) ?? '—'}
          </span>
          <span className="w-12 text-right text-ink-muted/60">—</span>
        </span>
      </td>
    </tr>
  )
}

/**
 * Le multiple, à SIGNIFICATION constante plutôt qu'à décimales constantes.
 *
 * Les rapports couvrent quatre ordres de grandeur : un jeton peut être à ×1,4 d'une
 * action et à ×1 800 de l'or. « 1 800,00 » gaspille deux décimales quand « 1,4 » en a
 * besoin. Sous dix, une décimale ; au-delà, aucune.
 */
function formatMultiple(value: number): string {
  if (!Number.isFinite(value)) return '—'
  if (value >= 100) return Math.round(value).toLocaleString('fr-FR')
  if (value >= 10) return value.toFixed(0)
  return value.toFixed(1)
}
