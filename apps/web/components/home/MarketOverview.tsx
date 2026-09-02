'use client'

/*
 * ⚠️ COMPOSANT CLIENT, ET LE SERVEUR A REFUSÉ L'AUTRE FAÇON.
 *
 * Il était d'abord écrit en composant SERVEUR, pour lire la locale et les phrases
 * comme le font les pages. Le rendu levait :
 *
 *   « Functions cannot be passed directly to Client Components »
 *
 * `AreaPlot` est client — Recharts a besoin du DOM — et cette figure lui passe QUATRE
 * fonctions de formatage. Une fonction ne traverse pas la frontière serveur/client :
 * elle n'est pas sérialisable, et rien dans les types ne le signale avant l'exécution.
 *
 * C'est le motif de tout le projet : `GlobalChartCard`, `AreaPlot` et leurs voisins
 * portent tous `'use client'`. Le chargement des séries reste côté serveur, dans
 * `page.tsx` ; seul le DESSIN passe ici.
 */

import type { MarketAsset, PriceHistory } from '@zenkuu/data'
import { ChangeBadge, formatPercent } from '@zenkuu/ui'

import { AreaPlot, type PlotSeries } from '@/components/charts/AreaPlot'
import { useLocale } from 'next-intl'

import { usePhrase } from '@/components/locale/ContentProvider'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * LE PANNEAU D'OUVERTURE — RELEVÉ SUR BACKPACK, PAS SUR COINGECKO
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Mesuré sur backpack.exchange/markets le 2026-09-02 : carte au rayon 16 px et au
 * rembourrage 20 px, titre de 30 px en graisse 600, légendes de 14 px en 500, rangée
 * de repères de 16 px au pied.
 *
 * ── CE QU'IL REMPLACE, ET POURQUOI C'EST UN GAIN ───────────────────────────
 *
 * La page ouvrait sur « Cours et prix des cryptomonnaies en temps réel », un
 * paragraphe, cinq tuiles de chiffres et un ticker défilant. Quatre blocs pour dire
 * l'état du marché, dont aucun ne le MONTRAIT : cinq nombres et un ruban ne disent pas
 * si la journée monte ou descend, il faut les lire un à un et s'en faire une idée.
 *
 * Une courbe le dit d'un regard. C'est tout ce que ce panneau change, et c'est
 * beaucoup : on sait en une seconde ce qu'on venait chercher.
 *
 * ── LA COMPARAISON EST EN POURCENTAGE, ET C'EST CE QUI LA REND POSSIBLE ────
 *
 * Bitcoin cote des dizaines de milliers, un ETF quelques centaines. Tracés en valeur
 * sur un même axe, le second serait une ligne plate au ras du zéro. Chaque série est
 * donc ramenée à son ÉCART depuis le premier point de la fenêtre : trois courbes qui
 * partent de zéro et qu'on peut enfin comparer.
 *
 * C'est aussi ce que fait la référence, et pour la même raison — leur axe porte
 * « +0,7 % / 0,0 % / −0,7 % », pas des dollars.
 *
 * ── AUCUNE DONNÉE N'EST INVENTÉE (§5) ──────────────────────────────────────
 *
 * Les séries viennent des mêmes sources que le reste du site. Une série absente
 * DISPARAÎT du panneau au lieu d'être tracée à plat : une courbe horizontale se lit
 * comme « ça n'a pas bougé », ce qui est un mensonge quand la vérité est « on ne sait
 * pas ». Si aucune ne répond, le panneau ne s'affiche pas du tout.
 */

/** Une série prête à tracer, avec son dernier écart. */
export type OverviewSeries = {
  readonly id: string
  readonly symbol: string
  readonly name: string
  readonly color: string
  readonly points: PriceHistory['points']
}

/**
 * Ramène une série à son écart en pourcentage depuis son premier point.
 *
 * ⚠️ LE PREMIER POINT NON NUL SERT DE BASE, PAS LE PREMIER POINT. Une source qui ouvre
 * sa fenêtre par un zéro — cela arrive sur les séries intrajournalières avant la
 * séance — donnerait une division par zéro, et donc des écarts infinis qui écrasent
 * l'axe pour toutes les autres courbes.
 */
function toRelative(points: PriceHistory['points']): { x: number; y: number }[] {
  const base = points.find((p) => p.price !== 0)?.price
  if (base === undefined) return []

  return points
    .filter((p) => Number.isFinite(p.price))
    .map((p) => ({ x: p.timestamp, y: ((p.price - base) / base) * 100 }))
}

export function MarketOverview({
  series,
  footer,
}: {
  series: readonly OverviewSeries[]
  /** La rangée de repères du pied — or, pétrole, ETH… Vide si aucune n'est publiée. */
  footer: readonly MarketAsset[]
}) {
  /* Les deux crochets CLIENT, et non leurs équivalents serveur : voir la note du
     haut de fichier. `usePhrase` lit la table posée par `ContentProvider`, qui la
     traverse depuis la coque. */
  const t = usePhrase()
  const locale = useLocale()

  const traces: PlotSeries[] = series
    .map((s) => ({ id: s.id, label: s.symbol, color: s.color, points: toRelative(s.points) }))
    // Une série vide n'est pas tracée à plat : elle n'apparaît pas (§5).
    .filter((s) => s.points.length > 1)

  // Rien à montrer : le panneau ne s'affiche pas plutôt que de rendre un cadre vide.
  if (traces.length === 0) return null

  /* La date de la dernière observation, et non `new Date()` : le panneau doit dater ce
     qu'il MONTRE, pas le moment où on le regarde. L'écart se voit un lundi matin, quand
     les places sont fermées depuis vendredi. */
  const dernier = Math.max(...traces.flatMap((s) => s.points.map((p) => p.x)))

  return (
    /* Rayon 16 px et rembourrage 20 px, mesurés. Le fond suit le thème plutôt que de
       reprendre leur `#14151b` : ce panneau vit sur la page d'accueil, qui existe en
       clair, et une carte sombre y serait un trou. */
    <section className="rounded-[16px] border border-border-subtle bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          {/* 30 px en graisse 600, mesuré. C'est le `<h1>` de la page : il l'était
              déjà avant ce panneau, et le rester importe — la page a besoin d'un titre
              unique de premier niveau, pour la synthèse vocale comme pour les
              moteurs. */}
          <h1 className="text-3xl font-semibold leading-tight text-ink">
            {t('Vue du marché')}
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            <time dateTime={new Date(dernier).toISOString()}>
              {new Intl.DateTimeFormat(locale, {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              }).format(dernier)}
            </time>
          </p>
        </div>

        {/* ── LES LÉGENDES SONT AUSSI LES VALEURS ──────────────────────────────
            Chez eux : « ● SPY  S&P 500  +0.42% ». Une pastille de couleur, le
            symbole, le nom complet en gris, puis la variation colorée.

            Trois rôles sur une ligne, et c'est ce qui rend la légende utile : elle ne
            se contente pas de dire quelle courbe est laquelle, elle donne le chiffre
            que la courbe met du temps à faire lire. */}
        <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          {series.map((s) => {
            const relative = toRelative(s.points)
            const last = relative[relative.length - 1]
            if (last === undefined) return null

            return (
              <li key={s.id} className="flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className="size-2 shrink-0 rounded-pill"
                  style={{ backgroundColor: s.color }}
                />
                <span className="font-medium text-ink">{s.symbol}</span>
                <span className="text-ink-muted">{s.name}</span>
                <ChangeBadge value={last.y} size="sm" />
              </li>
            )
          })}
        </ul>
      </div>

      <div className="mt-4">
        <AreaPlot
          series={traces}
          height={240}
          axes
          grid
          /* La ligne du ZÉRO, tracée en repère : c'est elle qui donne son sens à toute
             la figure — au-dessus on gagne, en dessous on perd. Sans elle, trois
             courbes flottent sans origine. Elle est aussi sur la référence. */
          referenceLines={[0]}
          formatY={(y) => formatPercent(y, locale) ?? '—'}
          formatX={(x) =>
            new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(x)
          }
          formatTooltipX={(x) =>
            new Intl.DateTimeFormat(locale, {
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            }).format(x)
          }
          formatTooltipY={(y) => formatPercent(y, locale) ?? '—'}
          ariaLabel={t('Comparaison des variations depuis l’ouverture')}
        />
      </div>

      {/* ── LA RANGÉE DE REPÈRES DU PIED ────────────────────────────────────
          Chez eux : « ACWI $160.04 +0.40% │ Gold $400.38 +0.91% │ Oil … ». Ce sont
          des actifs qu'on ne trace pas mais qu'on veut savoir, et le filet vertical
          les sépare sans les cadrer.

          Elle ne s'affiche que si des repères sont publiés : une rangée de tirets
          serait pire que pas de rangée. */}
      {footer.length > 0 ? (
        <ul className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border-subtle pt-4 text-sm">
          {footer.map((asset) => (
            <li key={asset.id} className="flex items-center gap-2">
              <span className="font-medium text-ink">{asset.symbol.toUpperCase()}</span>
              {asset.change24h !== undefined ? (
                <ChangeBadge value={asset.change24h} size="sm" />
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}
