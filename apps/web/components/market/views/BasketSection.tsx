import { getMarketCapBasket, type GlobalMarketStats } from '@zenkuu/data'
import { SourceNote } from '@zenkuu/ui'

import { GlobalChartCard } from '@/components/market/GlobalChartCard'
import { getPhrase } from '@/lib/content'
import { getFormatters } from '@/lib/formatters'

/**
 * LE GRAND CADRE — le panier, sa part de Bitcoin, et la ligne de totaux.
 *
 * ⚠️ CE N'EST PAS LA CAPITALISATION MONDIALE, et le cadre le dit dans son titre comme
 * dans sa note. Aucune source gratuite ne publie cette série : l'endpoint
 * correspondant de CoinGecko répond 401 hors abonnement, et la reconstituer depuis la
 * capitalisation de Bitcoin divisée par sa dominance ACTUELLE reviendrait à supposer
 * que la dominance n'a pas bougé — c'est-à-dire à supposer la réponse (§5).
 *
 * Ce que le cadre trace est donc la somme de neuf grandes capitalisations, additionnées
 * jour par jour. C'est une mesure exacte d'autre chose, et non une approximation
 * silencieuse de ce qu'on voudrait.
 *
 * Il est mis en flux par ses appelants : le panier coûte neuf séries d'un an sur une
 * source plafonnée à quelques appels par minute. Il ne rend rien si le panier n'a pas
 * abouti — la phrase d'ouverture de la page dit déjà l'état de la source, et un second
 * encadré d'échec n'apprendrait rien.
 */
export async function BasketSection({
  stats,
  /**
   * Ligne de totaux, DÉCIDÉE PAR L'APPELANT.
   *
   * ⚠️ Elle était construite ici à partir de `stats`, et la page en posait une SECONDE
   * juste en dessous — deux bandes de chiffres à trois lignes d'écart, disant presque
   * la même chose. La référence n'en a qu'une, et elle est DANS la carte. C'est donc
   * la page qui la compose, et ce composant qui l'affiche là où elle va.
   */
  footer,
}: {
  stats: GlobalMarketStats | null
  footer?: React.ReactNode
}) {
  const nombres = await getFormatters()

  const t = await getPhrase()
  const basket = await getMarketCapBasket('eur', 365)
  if (!basket.ok) return null

  /* Repli quand l'appelant n'en fournit pas — la vue « dominance » réutilise ce cadre
     sans avoir de totaux à annoncer. */
  const composition = (
    <>
      <span className="font-semibold text-ink">{basket.data.members.length}</span>{' '}
      {t('actifs dans le panier')}
      {stats ? (
        <>
          {' · '}
          <span className="font-semibold text-ink">{nombres.compact(stats.activeAssets)}</span>{' '}
          {t('cryptomonnaies suivies')}
        </>
      ) : null}
    </>
  )

  const points = basket.data.points.map((point) => ({ t: point.timestamp, y: point.total }))

  /* La part de Bitcoin DANS LE PANIER, et le mot compte : ce n'est pas la dominance,
     qui se rapporte au marché entier. Le titre du cadre le dit, sa phrase aussi. */
  const share = basket.data.points
    .map((point) => {
      const bitcoin = point.byId.bitcoin
      if (typeof bitcoin !== 'number' || point.total <= 0) return null
      return { t: point.timestamp, y: (bitcoin / point.total) * 100 }
    })
    .filter((point): point is { t: number; y: number } => point !== null)

  return (
    <div className="space-y-4">
      <GlobalChartCard
        large
        title={t('Capitalisation du panier suivi')}
        hint="La somme de neuf grandes capitalisations, additionnées jour par jour — pas le marché entier."
        info="La capitalisation du marché entier n’est pas publiée gratuitement en série. Cette courbe additionne neuf grandes capitalisations, listées sous le graphique."
        embedId="panier"
        format="money"
        currency={basket.data.currency}
        colorIndex={5}
        points={points}
        footer={footer ?? composition}
        note={
          <>
            {t(
              'Le panier est figé : il ne suit pas les entrées et sorties du classement. Sa courbe décrit ces neuf actifs, et rien d’autre.',
            )}{' '}
            <SourceNote
              label={basket.source.label}
              href={basket.source.attributionUrl}
              strings={{ source: t('Source :'), dated: t('données du {date}') }}
            />
          </>
        }
      />

      {share.length > 1 ? (
        <GlobalChartCard
          title={t('Part de Bitcoin dans le panier')}
          hint="À ne pas confondre avec la dominance, qui se rapporte au marché entier."
          format="percent"
          colorIndex={3}
          points={share}
        />
      ) : null}
    </div>
  )
}
