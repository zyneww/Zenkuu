'use client'

import { useMemo } from 'react'
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
} from 'recharts'

import type { MarketAsset } from '@zenkuu/data'

import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { usePhrase } from '@/components/locale/ContentProvider'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * PROFIL DE VARIATION — LA TOILE D'ARAIGNÉE DE shadcn/ui
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── CE QU'ELLE MONTRE, QUE NI LA COURBE NI LE TABLEAU NE MONTRENT ──────────
 *
 * La courbe base 100 dit COMMENT les actifs ont bougé pendant la fenêtre. Le tableau
 * dit COMBIEN, ligne par ligne. Aucun des deux ne montre la FORME de la performance :
 * un actif qui a tout pris en une heure et un actif qui a monté régulièrement sur trente
 * jours affichent le même « +20 % sur 30 j », et le tableau les met sur la même ligne
 * sans les distinguer.
 *
 * La toile les distingue d'un regard : un polygone étiré vers « 1 h » est un
 * emballement, un polygone régulier est une tendance. C'est exactement ce que la figure
 * radar sait faire et que rien d'autre ne fait — comparer PLUSIEURS séries sur PLUSIEURS
 * axes qui partagent une unité.
 *
 * ── LES CINQ AXES PARTAGENT LEUR UNITÉ, ET C'EST LA CONDITION ──────────────
 *
 * Ce sont cinq pourcentages de variation. Une toile dont les axes portent des grandeurs
 * différentes — une capitalisation ici, un volume là — n'a AUCUN sens : il faut alors
 * normaliser chaque axe séparément, et le polygone ne dit plus que « qui est premier sur
 * chaque critère », c'est-à-dire un classement déguisé en géométrie.
 *
 * ── POURQUOI « 1 AN » N'Y EST PAS ──────────────────────────────────────────
 *
 * Il l'écraserait. Une variation annuelle se compte en dizaines ou centaines de pour
 * cent, une variation horaire en fractions : sur un rayon commun, le premier repousse
 * la borne si loin que les quatre autres se rejoignent au centre. Les cinq horizons
 * retenus sont de magnitude comparable, ce qui est la seule façon de garder l'échelle
 * commune ET la lisibilité.
 *
 * ── LE CENTRE N'EST PAS ZÉRO, C'EST LE PIRE ────────────────────────────────
 *
 * Les variations peuvent être négatives, et un rayon négatif ne se dessine pas. Le
 * domaine est donc SYMÉTRIQUE autour de zéro — `[-borne, +borne]` —, ce qui place le
 * zéro exactement à mi-rayon. L'anneau de référence tracé à cette hauteur est la ligne
 * de flottaison : dedans, l'actif a baissé ; dehors, il a monté.
 */

/** Les cinq horizons, du plus court au plus long. Ordre horaire sur la toile. */
const HORIZONS: { key: keyof MarketAsset; label: string }[] = [
  { key: 'change1h', label: '1 h' },
  { key: 'change24h', label: '24 h' },
  { key: 'change7d', label: '7 j' },
  { key: 'change14d', label: '14 j' },
  { key: 'change30d', label: '30 j' },
]

export function ComparatorRadar({
  assets,
  colorOf,
}: {
  assets: MarketAsset[]
  /** Même teinte que la courbe du même actif — c'est ce qui relie les deux figures. */
  colorOf: (id: string) => string
}) {
  const t = usePhrase()

  const rows = useMemo(
    () =>
      HORIZONS.map((horizon) => {
        const row: Record<string, string | number> = { horizon: horizon.label }
        for (const asset of assets) {
          const value = asset[horizon.key]
          if (typeof value === 'number' && Number.isFinite(value)) row[asset.id] = value
        }
        return row
      }),
    [assets],
  )

  /*
   * La borne, arrondie vers le haut au point de pourcentage.
   *
   * Le plancher de 1 % évite l'écrasement d'un marché parfaitement calme : sans lui, une
   * journée à ±0,04 % étirerait ces quatre centièmes sur tout le rayon, et une toile
   * spectaculaire annoncerait qu'il ne s'est rien passé.
   */
  const bound = useMemo(() => {
    const values = rows.flatMap((row) =>
      assets.map((asset) => row[asset.id]).filter((value): value is number => typeof value === 'number'),
    )
    if (values.length === 0) return 1
    return Math.max(1, Math.ceil(Math.max(...values.map(Math.abs))))
  }, [rows, assets])

  /* Une toile à une seule série ne compare rien : elle décrit un actif que la fiche
     décrit déjà mieux. Le comparateur en accepte deux au minimum. */
  if (assets.length < 2) return null

  const config = Object.fromEntries(
    assets.map((asset) => [asset.id, { label: asset.symbol.toUpperCase(), color: colorOf(asset.id) }]),
  )

  return (
    <div className="rounded-card border border-border-subtle bg-surface p-3">
      <h3 className="mb-1 text-sm font-medium text-ink">{t('Profil de variation')}</h3>

      <ChartContainer config={config} className="mx-auto aspect-square max-h-[300px] w-full">
        <RadarChart data={rows} outerRadius="72%">
          <ChartTooltip
            content={
              <ChartTooltipContent
                className="border-border-subtle bg-overlay shadow-overlay"
                formatter={(value, name) => {
                  const asset = assets.find((candidate) => candidate.id === name)
                  const numeric = Number(value)
                  return (
                    <>
                      <span
                        aria-hidden="true"
                        className="size-2 shrink-0 rounded-pill"
                        style={{ background: colorOf(String(name)) }}
                      />
                      <span className="flex-1 text-ink-muted">
                        {asset?.symbol.toUpperCase() ?? name}
                      </span>
                      <span
                        className={`tabular font-medium ${numeric >= 0 ? 'text-up' : 'text-down'}`}
                      >
                        {numeric >= 0 ? '+' : '−'}
                        {Math.abs(numeric).toFixed(2).replace('.', ',')} %
                      </span>
                    </>
                  )
                }}
              />
            }
          />

          <PolarGrid stroke="var(--color-border-subtle)" />
          <PolarAngleAxis dataKey="horizon" tick={{ fill: 'var(--color-ink-muted)' }} className="text-micro" />

          {/* Domaine symétrique — voir la note en tête. L'axe lui-même reste muet : ses
              graduations tomberaient au milieu des polygones, et la lecture chiffrée se
              fait dans l'infobulle et dans le tableau. */}
          <PolarRadiusAxis domain={[-bound, bound]} tick={false} axisLine={false} tickLine={false} />

          {assets.map((asset) => (
            <Radar
              key={asset.id}
              dataKey={asset.id}
              name={asset.id}
              stroke={colorOf(asset.id)}
              fill={colorOf(asset.id)}
              /* Remplissage très bas : à quatre polygones superposés, tout ce qui dépasse
                 15 % rend les trois du dessous illisibles. */
              fillOpacity={0.12}
              strokeWidth={2}
              dot={{ r: 2, strokeWidth: 0, fill: colorOf(asset.id) }}
              isAnimationActive={false}
            />
          ))}
        </RadarChart>
      </ChartContainer>

      <p className="mt-1 text-xs leading-relaxed text-ink-muted">
        {t(
          'Cinq horizons de variation sur un rayon commun. Le milieu du rayon vaut 0 % : un sommet vers l’intérieur est une baisse, vers l’extérieur une hausse. « 1 an » est écarté — il se compte en centaines de pour cent et écraserait les quatre autres.',
        )}
      </p>
    </div>
  )
}
