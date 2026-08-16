'use client'

import { useMemo, useState } from 'react'

import type { MarketAsset, MarketCategory } from '@zenkuu/data'
import { formatCompact, formatPercent } from '@zenkuu/ui'

import { Chip, ChipGroup } from '@/components/charts/ChipGroup'
import { HEATMAP_CLAMP, heatTone, squarify } from '@/components/tools/treemap'
import { Link } from '@/i18n/navigation'

/**
 * CARTE THERMIQUE À DEUX LECTURES — par pièce, ou par secteur.
 *
 * ── POURQUOI LES DEUX, ET PAS L'UNE OU L'AUTRE ────────────────────────────────
 *
 * Nous avions la carte par SECTEUR ; la référence a les deux, sur deux pages
 * distinctes. Ce n'est pas une redite : les deux figures répondent à des questions qui
 * ne se déduisent pas l'une de l'autre.
 *
 * Par pièce, on voit QUI bouge — un actif isolé peut prendre dix pour cent sans que
 * son secteur frémisse. Par secteur, on voit OÙ ça bouge — dix actifs d'un même
 * narratif qui montent de deux pour cent chacun ne se remarquent nulle part
 * individuellement, et sautent aux yeux groupés.
 *
 * Une bascule plutôt que deux blocs empilés : les deux occupent exactement la même
 * place à l'écran, et les mettre l'un sous l'autre doublerait la hauteur d'une page
 * qui en a déjà beaucoup. La bascule est aussi ce qui rend la comparaison possible —
 * la figure change sous l'œil, au même endroit.
 *
 * ── LA PÉRIODE NE S'APPLIQUE QU'AUX PIÈCES, ET LA BARRE LE DIT ────────────────
 *
 * `MarketAsset` porte cinq fenêtres de variation, publiées dans la même réponse :
 * changer de période ne coûte donc aucun appel. `MarketCategory` n'en porte QU'UNE,
 * les vingt-quatre heures — la source ne publie pas d'historique sectoriel sur son
 * palier gratuit.
 *
 * Les pastilles de période DISPARAISSENT donc en mode secteur, au lieu d'être
 * grisées ou de rester actives sans effet. Un contrôle inopérant est pire qu'un
 * contrôle absent : il fait douter de la donnée plutôt que de l'interface.
 *
 * ── AUCUN APPEL SUPPLÉMENTAIRE, DANS LES DEUX MODES ───────────────────────────
 *
 * Les secteurs viennent de `getCategories`, déjà en cache pour `/categories` et les
 * graphiques. Les pièces viennent de `getMoversUniverse`, déjà en cache pour la page
 * des mouvements. Cette figure est une TROISIÈME lecture de données que le site
 * charge de toute façon.
 */

const MODES = [
  { id: 'coins', label: 'Pièces' },
  { id: 'sectors', label: 'Secteurs' },
] as const

type ModeId = (typeof MODES)[number]['id']

const PERIODS = [
  { id: 'change1h', label: '1 h' },
  { id: 'change24h', label: '24 h' },
  { id: 'change7d', label: '7 j' },
  { id: 'change30d', label: '30 j' },
] as const

type PeriodId = (typeof PERIODS)[number]['id']

const PERIOD_WORDS: Record<PeriodId, string> = {
  change1h: 'la dernière heure',
  change24h: '24 heures',
  change7d: '7 jours',
  change30d: '30 jours',
}

/** Nombres de tuiles proposés. Au-delà de 100, une tuile n'est plus qu'un pixel. */
const COUNTS = [25, 50, 100] as const

interface Tile {
  id: string
  name: string
  value: number
  change?: number
  href: string
}

export function MarketHeatmap({
  assets,
  categories,
}: {
  assets: MarketAsset[]
  categories: MarketCategory[]
}) {
  /* Les pièces d'abord : c'est la lecture que la référence met en avant, et celle
     qu'un lecteur cherche quand il arrive sur « où le marché bouge-t-il ». */
  const [mode, setMode] = useState<ModeId>(assets.length > 0 ? 'coins' : 'sectors')
  const [period, setPeriod] = useState<PeriodId>('change24h')
  const [count, setCount] = useState<number>(50)

  const tiles = useMemo<Tile[]>(() => {
    if (mode === 'sectors') {
      return categories
        .filter((category) => (category.marketCap ?? 0) > 0)
        .sort((a, b) => (b.marketCap ?? 0) - (a.marketCap ?? 0))
        .slice(0, count)
        .map((category) => ({
          id: category.id,
          name: category.name,
          value: category.marketCap as number,
          ...(category.marketCapChange24h !== undefined
            ? { change: category.marketCapChange24h }
            : {}),
          href: `/categories/${category.id}`,
        }))
    }

    return assets
      .filter((asset) => (asset.marketCap ?? 0) > 0)
      .sort((a, b) => (b.marketCap ?? 0) - (a.marketCap ?? 0))
      .slice(0, count)
      .map((asset) => ({
        id: asset.id,
        // Le SYMBOLE et non le nom : sur une tuile de quarante pixels, « BTC » se lit
        // et « Bitcoin » se tronque. Le nom complet reste dans l'infobulle du lien.
        name: asset.symbol.toUpperCase(),
        value: asset.marketCap as number,
        // Une fenêtre non publiée pour cet actif laisse la tuile GRISE plutôt que la
        // colorer avec la variation d'une autre période — voir `heatTone`.
        ...(asset[period] !== undefined ? { change: asset[period] as number } : {}),
        href: `/crypto/${asset.id}`,
      }))
  }, [mode, assets, categories, count, period])

  const boxes = useMemo(
    () => squarify(tiles.map((tile) => ({ id: tile.id, value: tile.value }))),
    [tiles],
  )

  const byId = useMemo(() => new Map(tiles.map((tile) => [tile.id, tile])), [tiles])

  if (tiles.length === 0) return null

  const periodWord = mode === 'sectors' ? '24 heures' : PERIOD_WORDS[period]

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <ChipGroup label="Découpage">
            {MODES.map((entry) => (
              <Chip
                key={entry.id}
                active={mode === entry.id}
                onClick={() => setMode(entry.id)}
                label={entry.label}
              />
            ))}
          </ChipGroup>

          {/* Absentes en mode secteur — voir l'en-tête du fichier. */}
          {mode === 'coins' ? (
            <ChipGroup label="Variation">
              {PERIODS.map((entry) => (
                <Chip
                  key={entry.id}
                  active={period === entry.id}
                  onClick={() => setPeriod(entry.id)}
                  label={entry.label}
                />
              ))}
            </ChipGroup>
          ) : null}

          <ChipGroup label="Tuiles">
            {COUNTS.map((size) => (
              <Chip
                key={size}
                active={count === size}
                onClick={() => setCount(size)}
                label={String(size)}
              />
            ))}
          </ChipGroup>
        </div>

        <Legend />
      </div>

      {/* Hauteur fixe en pixels, positions en pourcentages : la carte s'adapte en
          largeur sans que rien ne soit recalculé, et reste lisible en hauteur. */}
      <div
        className="relative w-full overflow-hidden rounded-card border border-border-subtle bg-surface"
        style={{ height: 'min(70vh, 560px)' }}
      >
        {boxes.map((box) => {
          const tile = byId.get(box.id)
          if (!tile) return null

          return (
            <Link
              key={box.id}
              href={tile.href}
              title={`${tile.name} — ${formatCompact(tile.value)}${
                tile.change !== undefined
                  ? `, ${formatPercent(tile.change)} sur ${periodWord}`
                  : ''
              }`}
              className="absolute block overflow-hidden border border-canvas p-1.5 transition-opacity duration-150 hover:opacity-80"
              style={{
                left: `${box.x}%`,
                top: `${box.y}%`,
                width: `${box.width}%`,
                height: `${box.height}%`,
                backgroundColor: heatTone(tile.change),
              }}
            >
              {/* Étiquettes toujours présentes dans le DOM — donc lisibles par un
                  lecteur d'écran et par un moteur — mais masquées visuellement quand la
                  tuile est trop petite, pour ne pas déborder sur ses voisines. */}
              <span className="block truncate text-[0.6875rem] font-medium leading-tight text-ink">
                {tile.name}
              </span>
              {box.height > 6 ? (
                <span className="tabular block truncate text-micro leading-tight text-ink-muted">
                  {tile.change !== undefined ? formatPercent(tile.change) : '—'}
                </span>
              ) : null}
              {box.height > 12 && box.width > 12 ? (
                <span className="tabular block truncate text-micro leading-tight text-ink-muted">
                  {formatCompact(tile.value)}
                </span>
              ) : null}
            </Link>
          )
        })}
      </div>

      <p className="max-w-4xl text-xs leading-relaxed text-ink-muted">
        Surface : capitalisation. Couleur : variation sur {periodWord}, saturée au-delà de
        ±{HEATMAP_CLAMP} % pour qu’une tuile minuscule et très volatile n’écrase pas
        l’échelle.{' '}
        {mode === 'sectors' ? (
          <>
            Les surfaces <strong className="text-ink">ne partagent pas un tout</strong> — un
            actif appartient à plusieurs secteurs, leur somme dépasse donc la capitalisation
            mondiale. La source ne publiant pas d’historique sectoriel sur son palier
            gratuit, la couleur ne connaît qu’une fenêtre.
          </>
        ) : (
          <>
            Les surfaces se partagent un tout, cette fois : ce sont les{' '}
            {Math.min(count, tiles.length)} premières capitalisations, chacune comptée une
            seule fois. Une tuile grise signale une fenêtre que la source ne publie pas
            pour cet actif.
          </>
        )}{' '}
        Montants en dollars, tels que publiés.
      </p>
    </div>
  )
}

function Legend() {
  return (
    <div className="flex items-center gap-2 text-[0.6875rem] text-ink-muted">
      <span>−{HEATMAP_CLAMP} %</span>
      <span
        className="flex h-2.5 w-32 overflow-hidden rounded-pill border border-border-subtle"
        aria-hidden="true"
      >
        {[-10, -6, -3, 0, 3, 6, 10].map((step) => (
          <span key={step} className="flex-1" style={{ backgroundColor: heatTone(step) }} />
        ))}
      </span>
      <span>+{HEATMAP_CLAMP} %</span>
    </div>
  )
}
