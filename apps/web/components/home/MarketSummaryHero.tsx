import { YAHOO_UNIVERSE, getRanking, toSlug, type MarketCapSeriesState } from '@zenkuu/data'

import { HeroChart, type HeroOption } from '@/components/home/HeroChart'
import { HighlightPanel } from '@/components/home/HighlightPanel'
import { getContent } from '@/lib/content'

/**
 * Classes réellement présentes dans l'univers Yahoo.
 *
 * `YAHOO_UNIVERSE` n'est pas indexé par `AssetClass` mais par un SOUS-ENSEMBLE de
 * quatre classes — la crypto et les devises viennent d'ailleurs. Reprendre ce
 * sous-ensemble ici plutôt que d'élargir l'index fait refuser à la compilation une
 * puce sur une classe que l'univers ne sert pas, au lieu de la laisser échouer au
 * rendu.
 */
type UniverseClass = keyof typeof YAHOO_UNIVERSE

/**
 * Symboles proposés par les puces du graphique de tête.
 *
 * DÉCLARÉS PAR RÉFÉRENCE À L'UNIVERS, pas recopiés. Chaque entrée est résolue dans
 * `YAHOO_UNIVERSE` juste en dessous, et une entrée introuvable DISPARAÎT de la rangée
 * au lieu de produire une puce qui ouvrirait une requête sur un symbole inexistant.
 *
 * Le libellé vient de l'univers lui aussi : écrire « CAC 40 » ici en ferait un second
 * endroit où l'indice est nommé, et les deux divergeraient au premier renommage.
 *
 * L'ORDRE est celui de l'intérêt décroissant pour un lecteur francophone — sa place
 * boursière, la référence mondiale, la valeur refuge. Bitcoin ferme la marche parce
 * qu'il est déjà partout ailleurs sur cette page.
 */
const HERO_SYMBOLS: ReadonlyArray<{ assetClass: UniverseClass; symbol: string }> = [
  { assetClass: 'index', symbol: '^FCHI' },
  { assetClass: 'index', symbol: '^GSPC' },
  { assetClass: 'commodity', symbol: 'GC=F' },
]

/** Nombre d'indices listés à droite du graphique. Six tient sans étirer la colonne. */
const INDEX_COUNT = 6

/**
 * RÉSUMÉ DES MARCHÉS — le haut de page, calqué sur TradingView.
 *
 * ── CE QUE CE BLOC AJOUTE ────────────────────────────────────────────────────
 *
 * L'accueil ouvrait sur trois cartes d'agrégat de taille égale. Elles disaient l'état
 * du marché mais ne le MONTRAIENT pas : trois courbes de cent pixels ne dessinent
 * aucune tendance. TradingView ouvre au contraire sur un tracé large, et c'est ce
 * tracé qui fait qu'on comprend l'état du marché avant d'avoir lu un seul chiffre.
 *
 * La colonne d'indices à droite complète le tracé plutôt qu'elle ne le double : le
 * graphique dit comment va UN marché dans le temps, la liste dit comment vont LES
 * marchés à l'instant présent. Les deux questions sont distinctes et se posent
 * ensemble.
 *
 * ── UNE SEULE REQUÊTE ────────────────────────────────────────────────────────
 *
 * La série par défaut est déjà en mémoire — le site enregistre ses propres relevés de
 * capitalisation, aucune source gratuite ne les publiant. Les séries commutées sont
 * chargées À LA DEMANDE par les puces, donc jamais pour un lecteur qui n'y touche
 * pas. Il ne reste que le classement des indices, soit un appel pour tout le bloc.
 */
export async function MarketSummaryHero({
  series,
  currency = 'eur',
}: {
  series: MarketCapSeriesState
  currency?: string
}) {
  const fr = await getContent()

  const indices = await getRanking({ assetClass: 'index', currency, perPage: INDEX_COUNT })

  const options: HeroOption[] = HERO_SYMBOLS.flatMap(({ assetClass, symbol }) => {
    const entry = YAHOO_UNIVERSE[assetClass]?.find((candidate) => candidate.symbol === symbol)
    if (!entry) return []

    /*
     * `toSlug` ET NON LE SYMBOLE BRUT — le défaut coûtait toutes les puces.
     *
     * Mesuré avant correction : `/api/historique?id=%5EFCHI` répondait « Cet
     * identifiant n'existe pas chez Yahoo Finance », et de même pour `GC=F`. Aucune
     * puce ne chargeait quoi que ce soit.
     *
     * La route résout son `id` par `findUniverseEntry`, qui compare des SLUGS
     * (`fchi`, `gc-f`) et non des symboles (`^FCHI`, `GC=F`). Les deux clés sont
     * volontairement distinctes — l'univers le documente — précisément pour qu'une
     * confusion échoue franchement au lieu de passer sur une faute de frappe. Ce
     * qu'elle a fait, et c'est bien ce garde-fou qui a rendu le défaut visible.
     */
    return [{ key: `${assetClass}:${symbol}`, label: entry.name, id: toSlug(symbol), assetClass }]
  })

  return (
    <section
      aria-label={fr.home.summaryTitle}
      className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]"
    >
      <HeroChart
        options={options}
        baseLabel={fr.home.heroMarketCap}
        baseSeries={series.points.map((point) => ({ x: point.timestamp, y: point.value }))}
        /* La série de relevés est tenue en euros, quelle que soit la devise choisie
           pour l'affichage : c'est la devise dans laquelle les points ont été
           ENREGISTRÉS, et la reformater sans convertir mentirait sur l'unité. */
        baseCurrency="EUR"
        currency={currency}
        loadingLabel={fr.home.heroLoading}
        unavailableLabel={fr.home.heroUnavailable}
      />

      <HighlightPanel
        title={fr.home.topIndicesTitle}
        assets={indices.ok ? indices.data : null}
        href="/indices"
        unavailableReason={indices.ok ? undefined : indices.reason}
      />
    </section>
  )
}
