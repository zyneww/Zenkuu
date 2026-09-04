'use client'

import type { MarketAsset } from '@zenkuu/data'
import { ChangeBadge } from '@zenkuu/ui'

import { AssetLogo } from '@/components/asset/AssetLogo'
import { AreaSpark } from '@/components/charts/AreaSpark'
import { Link } from '@/i18n/navigation'
import { assetHref } from '@/lib/asset-routes'
import { useFormatters } from '@/components/locale/useFormatters'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * LA RANGÉE DE TÊTE — CINQ ACTIFS, CINQ COURBES MINIATURES
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * C'est la première chose que pose la référence sous son titre : cinq cartes de même
 * gabarit, une par grande capitalisation, portant le nom, le cours, une courbe
 * miniature et la variation.
 *
 * ── POURQUOI ELLE PRÉCÈDE LES AGRÉGATS ──────────────────────────────────────
 *
 * Une page « vue d'ensemble » ouvrait jusqu'ici sur une phrase chiffrée : la
 * capitalisation totale, sa variation, le volume, la dominance. C'est juste et c'est
 * abstrait — aucun de ces nombres ne se rattache à quelque chose qu'on connaît.
 *
 * Les cinq cartes répondent d'abord à la question qu'on se pose en arrivant : « le
 * marché monte ou baisse en ce moment ? ». Cinq courbes qui pointent dans la même
 * direction le disent en une image, là où « +2,4 % de capitalisation » demande de
 * savoir ce que 2,4 % représente.
 *
 * ── LA MINIATURE N'EST PAS DÉCORATIVE ───────────────────────────────────────
 *
 * ⚠️ MAIS SA DURÉE VARIE D'UNE SOURCE À L'AUTRE, et c'est écrit dans la donnée : le
 * champ s'appelle `sparkline7d` pour des raisons historiques, et `sparklineDays` dit
 * ce qu'il couvre RÉELLEMENT — sept jours chez l'un, un mois chez l'autre. Les cartes
 * de cette rangée portent toutes des cryptomonnaies, donc toutes la même durée ; le
 * jour où une autre classe y entrerait, il faudrait l'écrire sur la carte plutôt que
 * de laisser croire à cinq courbes comparables.
 *
 * Une carte sans courbe garde sa place et son cours : c'est la bande de tracé qui
 * disparaît, pas la ligne. Remplacer une série absente par une ligne plate ferait
 * passer un trou de source pour un actif immobile (§5).
 */
export function MarketPulseCards({ assets }: { assets: MarketAsset[] }) {
  const nombres = useFormatters()

  if (assets.length === 0) return null

  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {assets.map((asset) => {
        const change = asset.change24h
        /* La teinte de la courbe suit la VARIATION affichée, pas la pente du tracé :
           les deux divergent dès que la miniature couvre plus que la fenêtre de la
           variation — une semaine en hausse peut finir sur une journée en baisse, et
           une courbe verte au-dessus d'un badge rouge se lit comme une erreur. */
        const tint =
          change === undefined
            ? 'var(--color-ink-muted)'
            : change >= 0
              ? 'var(--color-up)'
              : 'var(--color-down)'

        const spark = asset.sparkline7d ?? []

        return (
          <li key={`${asset.assetClass}:${asset.id}`}>
            <Link
              /* ⚠️ C'ÉTAIT `/${asset.assetClass}/${asset.id}`, ET CELA MENAIT AU VIDE.

                 La CLASSE n'est pas le SEGMENT : la classe `stock` s'écrit `actions`
                 dans l'URL, `forex` s'écrit `devises`, `commodity` s'écrit
                 `matieres-premieres`. Quatre des sept classes rendaient donc un lien
                 vers une route inexistante — `/stock/aapl`, `/index/gspc` — et seule
                 la crypto, dont la classe et le segment se confondent, fonctionnait.

                 Le défaut est resté invisible parce que ces cartes servent surtout la
                 crypto. `assetHref` connaît la correspondance depuis toujours ; il
                 fallait l'appeler plutôt que de la refaire. */
              href={assetHref(asset.assetClass, asset.id)}
              className="flex h-full flex-col rounded-card border border-border-subtle bg-surface p-3 transition-colors duration-150 hover:border-brand"
            >
              <span className="flex items-center gap-2">
                <AssetLogo asset={asset} size={16} />
                <span className="min-w-0 truncate text-sm font-medium text-ink">{asset.name}</span>
              </span>

              {/* `items-end` : le cours et la courbe partagent la ligne, et c'est le
                  BAS de la courbe qui doit s'aligner sur la ligne de base du nombre —
                  aligner leurs sommets ferait flotter le cours. */}
              <span className="mt-2 flex items-end justify-between gap-3">
                <span className="min-w-0">
                  <span className="tabular block truncate text-base font-semibold text-ink">
                    {nombres.currency(asset.price, asset.currency)}
                  </span>
                  <span className="mt-1 block">
                    <ChangeBadge value={change} />
                  </span>
                </span>

                {spark.length > 1 ? (
                  <span className="w-24 shrink-0">
                    <AreaSpark
                      data={spark.map((value, index) => ({ x: index, y: value }))}
                      color={tint}
                      height={36}
                    />
                  </span>
                ) : null}
              </span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
