'use client'

import { useMemo, useState } from 'react'

import type { MarketAsset, MarketCategory } from '@zenkuu/data'

import { formatCurrency } from '@zenkuu/ui'

import { Chip, ChipGroup } from '@/components/charts/ChipGroup'
import { usePhrase } from '@/components/locale/ContentProvider'
import { HeatmapFrame } from '@/components/tools/HeatmapFrame'
import { TreemapFigure, TreemapLegend, type TreemapTile } from '@/components/tools/TreemapFigure'
import { HEATMAP_CLAMP } from '@/components/tools/treemap'

/**
 * CARTE THERMIQUE À DEUX LECTURES — par pièce, ou par secteur.
 *
 * ── POURQUOI LES DEUX, ET PAS L'UNE OU L'AUTRE ────────────────────────────────
 *
 * Par pièce, on voit QUI bouge — un actif isolé peut prendre dix pour cent sans que
 * son secteur frémisse. Par secteur, on voit OÙ ça bouge — dix actifs d'un même
 * narratif qui montent de deux pour cent chacun ne se remarquent nulle part
 * individuellement, et sautent aux yeux additionnés.
 *
 * Une bascule plutôt que deux blocs empilés : les deux occupent exactement la même
 * place à l'écran, et la comparaison devient possible — la figure change sous l'œil,
 * au même endroit.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * LE PAVAGE GROUPÉ A ÉTÉ RETIRÉ — LA FIGURE EST CELLE DES COLLECTIONS NFT
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Cette carte passait par `GroupedTreemap` : chaque secteur recevait son cadre, son
 * titre et sa teinte identifiante, et les actifs étaient pavés à l'intérieur. La
 * figure était juste et elle ne ressemblait à aucune autre du site — trois cartes
 * thermiques, deux dessins.
 *
 * Trois différences se cumulaient, et chacune coûtait de la lisibilité :
 *
 *   · LES CADRES MANGENT LA SURFACE. Vingt titres de groupe à douze pixels, vingt
 *     bordures et vingt marges intérieures : sur une figure de cinq cents pixels de
 *     haut, un bon quart de la place servait à nommer des familles plutôt qu'à
 *     montrer des actifs. Les tuiles du bas descendaient sous le seuil où elles
 *     peuvent porter leur montant.
 *
 *   · LA COLORATION CATÉGORIELLE ÉTAIT LE DÉFAUT, et elle répond à une autre
 *     question que celle qu'on pose à une carte thermique. « De quoi ce marché
 *     est-il fait » se lit dans un tableau de secteurs ; « qu'est-ce qui monte » ne
 *     se lit QUE sur une carte colorée par la variation. Le mode par défaut cachait
 *     donc précisément ce que la figure sait faire de mieux.
 *
 *   · LE RATTACHEMENT ÉTAIT PARTIEL. Les secteurs se déduisaient des trois actifs
 *     principaux de chaque catégorie ; toute la longue traîne atterrissait dans un
 *     groupe « Autres » qui finissait par être le plus gros de la carte. Un
 *     groupement dont le premier groupe est le fourre-tout ne groupe plus rien.
 *
 * La figure est donc désormais `TreemapFigure`, exactement celle des collections NFT
 * et des trésoreries : pavage plat, tuiles jointives, couleur = variation, montant et
 * part sur une ligne. Une seule anatomie de tuile sur tout le site, et la bascule
 * « Pièces / Secteurs » suffit à répondre à la question du découpage — sans qu'un
 * découpage ait à en dessiner un second par-dessus.
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

/**
 * ── CE QUE LA SURFACE MESURE ───────────────────────────────────────
 *
 * La capitalisation dit ce que le marché VAUT, le volume ce qu'il A FAIT aujourd'hui.
 * Les deux cartes ne se ressemblent pas : Bitcoin écrase la première et partage la
 * seconde avec des jetons cent fois plus petits mais bien plus échangés.
 *
 * C'est le second sélecteur de TradingView, et il répond à la question qu'une carte de
 * capitalisation ne peut pas poser : « où l'activité s'est-elle concentrée ».
 */
const SIZE_MODES = [
  { id: 'marketCap', label: 'Capitalisation' },
  { id: 'volume24h', label: 'Volume 24 h' },
] as const

type SizeId = (typeof SIZE_MODES)[number]['id']

export function MarketHeatmap({
  assets,
  categories,
}: {
  assets: MarketAsset[]
  categories: MarketCategory[]
}) {
  /* Les pièces d'abord : c'est la lecture qu'un lecteur cherche en arrivant sur
     « où le marché bouge-t-il ». */
  const t = usePhrase()
  const [mode, setMode] = useState<ModeId>(assets.length > 0 ? 'coins' : 'sectors')
  const [period, setPeriod] = useState<PeriodId>('change24h')
  const [count, setCount] = useState<number>(50)
  const [sizeBy, setSizeBy] = useState<SizeId>('marketCap')

  const tiles = useMemo<TreemapTile[]>(() => {
    if (mode === 'sectors') {
      /* Les secteurs n'ont qu'une grandeur — la source ne publie pas leur volume — et
         le sélecteur de taille disparaît donc dans ce mode (voir plus bas). Rien à
         arbitrer ici. */
      return categories
        .filter((category) => (category.marketCap ?? 0) > 0)
        .sort((a, b) => (b.marketCap ?? 0) - (a.marketCap ?? 0))
        .slice(0, count)
        .map((category) => ({
          id: category.id,
          label: category.name,
          value: category.marketCap as number,
          ...(category.marketCapChange24h !== undefined
            ? { change: category.marketCapChange24h }
            : {}),
          href: `/categories/${category.id}`,
        }))
    }

    return assets
      .filter((asset) => (asset[sizeBy] ?? 0) > 0)
      .sort((a, b) => (b[sizeBy] ?? 0) - (a[sizeBy] ?? 0))
      .slice(0, count)
      .map((asset) => ({
        id: asset.id,
        // Le SYMBOLE et non le nom : sur une tuile de quarante pixels, « BTC » se lit
        // et « Bitcoin » se tronque. Le nom complet part dans l'infobulle.
        label: asset.symbol.toUpperCase(),
        title: asset.name,
        /* Le TICKER et le COURS, que la figure ne dessine pas : la surface porte la
           capitalisation, la teinte porte la variation, et le prix n'apparaît nulle
           part. C'est pourtant la première chose qu'on cherche en survolant une tuile.
           Écrit ici, où la devise est connue — la figure, elle, ne compte rien. */
        detail: `${asset.symbol.toUpperCase()} à ${formatCurrency(asset.price, asset.currency) ?? '—'}`,
        value: asset[sizeBy] as number,
        // Une fenêtre non publiée pour cet actif laisse la tuile GRISE plutôt que la
        // colorer avec la variation d'une autre période — voir `heatTone`.
        ...(asset[period] !== undefined ? { change: asset[period] as number } : {}),
        ...(asset.image ? { image: asset.image } : {}),
        href: `/crypto/${asset.id}`,
      }))
  }, [mode, assets, categories, count, period, sizeBy])

  /**
   * Symbole écrit après les montants de la figure.
   *
   * ⚠️ IL ÉTAIT « $ » DANS LES DEUX MODES, ET UN SEUL DES DEUX EST EN DOLLARS.
   *
   * Les SECTEURS le sont : `coins/categories` ne cote qu'en dollars, et le provider
   * l'écrit noir sur blanc plutôt que de convertir lui-même. Les PIÈCES, elles, sont
   * demandées en euros par tous les appelants — c'est la devise de cotation du site.
   * La figure annonçait donc « 1 331 Md $ » pour Bitcoin là où le tableau de la même
   * page écrit « 1 327 Md € » sur la même ligne : le nombre était juste, l'unité
   * fausse, et un lecteur qui compare les deux blocs y lit deux marchés différents.
   *
   * Le symbole suit donc le MODE. Pour les pièces il vient de la devise que la source
   * a réellement servie, et non d'une constante : c'est l'appelant qui choisit sa
   * devise, et rien n'oblige le prochain à demander des euros.
   */
  const valueUnit =
    mode === 'sectors' ? ' $' : (assets[0]?.currency ?? 'eur').toLowerCase() === 'usd' ? ' $' : ' €'

  if (tiles.length === 0) return null

  const periodWord = mode === 'sectors' ? '24 heures' : PERIOD_WORDS[period]

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <ChipGroup label="Découpage" value={mode} onChange={setMode}>
            {MODES.map((entry) => (
              <Chip key={entry.id} id={entry.id} label={t(entry.label)} />
            ))}
          </ChipGroup>

          {/* Absentes en mode secteur : la source ne publie qu'une fenêtre de variation
              par catégorie. Un contrôle inopérant est pire qu'un contrôle absent — il
              fait douter de la donnée plutôt que de l'interface. */}
          {mode === 'coins' ? (
            <ChipGroup label="Variation" value={period} onChange={setPeriod}>
              {PERIODS.map((entry) => (
                <Chip key={entry.id} id={entry.id} label={t(entry.label)} />
              ))}
            </ChipGroup>
          ) : null}

          {/* Absent en mode secteur : la source ne publie pas le volume d'un secteur,
             et un sélecteur dont la seconde option ne rendrait rien vaut moins que son
             absence — même raisonnement que pour les périodes ci-dessus. */}
          {mode === 'coins' ? (
            <ChipGroup label="Taille" value={sizeBy} onChange={setSizeBy}>
              {SIZE_MODES.map((entry) => (
                <Chip key={entry.id} id={entry.id} label={t(entry.label)} />
              ))}
            </ChipGroup>
          ) : null}

          <ChipGroup label="Tuiles" value={count} onChange={setCount}>
            {COUNTS.map((size) => (
              <Chip key={size} id={size} label={String(size)} />
            ))}
          </ChipGroup>
        </div>

        {/* La légende accompagne désormais TOUJOURS la figure : il n'existe plus qu'une
            coloration, celle de la variation, et elle mesure bien une grandeur. */}
        <TreemapLegend />
      </div>

      <HeatmapFrame>
        <TreemapFigure
          tiles={tiles}
          periodLabel={periodWord}
          /* La MÊME hauteur que la carte des collections et celle des trésoreries : ces
             trois figures sont désormais le même objet, et une hauteur qui varierait de
             l'une à l'autre se verrait en passant de page en page. */
          height="min(62vh, 520px)"
          valueUnit={valueUnit}
        />
      </HeatmapFrame>

      <p className="max-w-4xl text-xs leading-relaxed text-ink-muted">
        {/* La phrase SUIT le sélecteur de taille. Elle disait « capitalisation » en dur,
            ce qui devenait faux dès qu'on basculait sur les volumes — une légende qui
            décrit une autre figure que celle affichée est pire qu'une légende absente. */}
        {t('Surface : {size}. Couleur : variation sur {period}, par paliers et saturée au-delà de ±{clamp} % pour qu’une tuile minuscule et très volatile n’écrase pas l’échelle.')
          .replace(
            '{size}',
            mode === 'sectors' || sizeBy === 'marketCap'
              ? t('capitalisation')
              : t('volume sur 24 heures'),
          )
          .replace('{period}', periodWord)
          .replace('{clamp}', String(HEATMAP_CLAMP))}{' '}
        {mode === 'coins'
          ? t(
              'Les surfaces se partagent un tout : ce sont les {n} premières capitalisations, chacune comptée une seule fois.',
            ).replace('{n}', String(count))
          : t(
              'Les surfaces NE se partagent PAS un tout : un actif appartient à plusieurs narratifs, si bien que la somme des rectangles dépasse la capitalisation mondiale. Cette carte compare les secteurs entre eux, elle ne les additionne pas.',
            )}{' '}
        {/* La mention de devise SUIT le mode, comme le symbole des tuiles : elle
            annonçait « en dollars » dans les deux, ce qui était faux pour les pièces —
            cotées en euros — et vrai pour les seuls secteurs. Une légende qui nomme une
            autre devise que la figure est pire qu'une légende absente. */}
        {mode === 'coins'
          ? t(
              'Une tuile grise signale une fenêtre que la source ne publie pas pour cet actif. Montants dans la devise de cotation du site.',
            )
          : t(
              'Une tuile grise signale une fenêtre que la source ne publie pas pour ce secteur. Montants en dollars : la source ne publie les capitalisations sectorielles que dans cette devise.',
            )}
      </p>
    </div>
  )
}
