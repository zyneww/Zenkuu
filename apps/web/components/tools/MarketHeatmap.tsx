'use client'

import { useMemo, useState } from 'react'

import type { MarketAsset, MarketCategory } from '@zenkuu/data'

import { formatCurrency } from '@zenkuu/ui'

import { Chip, ChipGroup } from '@/components/charts/ChipGroup'
import { usePhrase } from '@/components/locale/ContentProvider'
import { HeatmapFrame } from '@/components/tools/HeatmapFrame'
import { TreemapFigure, TreemapLegend, type TreemapTile } from '@/components/tools/TreemapFigure'
import { HEATMAP_CLAMP } from '@/components/tools/treemap'
import { STABLECOIN_IDS } from '@/lib/altcoin-season'
import { fullyDilutedValuation } from '@/lib/heatmap-metrics'

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

/**
 * ── CE QUE LA COULEUR MESURE ────────────────────────────────────────────────
 *
 * Cinq fenêtres de variation, plus une dispersion. Les cinq premières viennent
 * telles quelles de la source ; la sixième est calculée (voir `lib/heatmap-metrics`).
 *
 * ⚠️ LA « VARIATION DE VOLUME » DE LA RÉFÉRENCE EST ABSENTE, et c'est délibéré : elle
 * demande le volume de la veille, qu'aucune de nos sources ne publie dans le
 * classement. L'approcher par une règle de trois serait une donnée inventée (§5).
 */
const COLOR_MODES = [
  { id: 'change1h', label: '1 h' },
  { id: 'change24h', label: '24 h' },
  { id: 'change7d', label: '7 j' },
  { id: 'change30d', label: '30 j' },
  { id: 'change1y', label: '1 an' },
  { id: 'volatilite', label: 'Volatilité' },
] as const

type PeriodId = (typeof COLOR_MODES)[number]['id']

const PERIOD_WORDS: Record<PeriodId, string> = {
  change1h: 'la dernière heure',
  change24h: '24 heures',
  change7d: '7 jours',
  change30d: '30 jours',
  change1y: '1 an',
  volatilite: 'la volatilité sur 7 jours',
}

/** Nombres de tuiles proposés. Au-delà de 100, une tuile n'est plus qu'un pixel. */
const COUNTS = [25, 50, 100] as const

/**
 * ── CE QUE LA SURFACE MESURE ───────────────────────────────────────
 *
 * La capitalisation dit ce que le marché VAUT, le volume ce qu'il A FAIT aujourd'hui,
 * la capitalisation diluée ce qu'il vaudrait si tous les jetons prévus existaient.
 * Les trois cartes ne se ressemblent pas : Bitcoin écrase la première et partage la
 * deuxième avec des jetons cent fois plus petits mais bien plus échangés.
 *
 * ── ET « TUILES ÉGALES », QUI N'EST PAS UNE GRANDEUR ───────────────
 *
 * C'est le mode « mono size » de la référence, et il répond à une objection réelle
 * contre les cartes thermiques : la surface DOMINE le regard, si bien qu'un petit
 * jeton en forte hausse est invisible à côté d'un géant qui n'a pas bougé. À
 * surfaces égales, la carte ne montre plus que la couleur — c'est-à-dire la seule
 * chose qu'on cherche quand on demande « qui monte aujourd'hui ».
 *
 * ⚠️ LA TVL DE LA RÉFÉRENCE EST ABSENTE. Elle n'existe ni dans le classement
 * (`MarketAsset`) ni dans aucune réponse que le site charge : la remplir demanderait
 * une source supplémentaire, pas un calcul.
 */
const SIZE_MODES = [
  { id: 'marketCap', label: 'Capitalisation' },
  { id: 'fdv', label: 'Cap. diluée' },
  { id: 'volume24h', label: 'Volume 24 h' },
  { id: 'equal', label: 'Tuiles égales' },
] as const

type SizeId = (typeof SIZE_MODES)[number]['id']

/**
 * ── LA SOURCE DE DONNÉES, C'EST-À-DIRE L'UNIVERS RETENU ────────────
 *
 * Bitcoin pèse à lui seul la moitié de la carte : le retirer redonne aux autres une
 * surface lisible, et c'est le premier filtre de la référence. Les stablecoins, eux,
 * sont un bruit d'une autre nature — leur variation mesure l'écart à leur ancrage,
 * pas une performance, et une tuile verte à +0,3 % se lit comme une hausse.
 *
 * ⚠️ LE FILTRE « DeFi » DE LA RÉFÉRENCE EST ABSENT. Il demande de savoir à quels
 * secteurs appartient chaque actif ; le classement ne le dit pas, et le catalogue de
 * secteurs ne publie que trois actifs représentatifs par narratif. Un filtre bâti sur
 * ces trois-là prétendrait montrer « la DeFi » en en montrant trois jetons.
 */
const UNIVERSES = [
  { id: 'all', label: 'Toutes' },
  { id: 'no-btc', label: 'Sans BTC' },
  { id: 'no-stables', label: 'Sans stablecoins' },
  { id: 'no-btc-stables', label: 'Ni BTC ni stables' },
] as const

type UniverseId = (typeof UNIVERSES)[number]['id']

/**
 * Seuils de capitalisation minimale.
 *
 * Ils portent TOUJOURS sur la capitalisation, y compris quand la surface mesure autre
 * chose : c'est la grandeur qui dit « cet actif est-il assez gros pour m'intéresser »,
 * et un seuil qui changerait de sens avec le sélecteur de taille demanderait de le
 * relire à chaque bascule.
 *
 * `0` n'est pas « pas de seuil » par convention implicite : l'entrée est nommée, et
 * elle est le défaut.
 */
const THRESHOLDS = [
  { id: 0, label: 'Aucun' },
  { id: 100_000_000, label: '≥ 100 M' },
  { id: 1_000_000_000, label: '≥ 1 Md' },
  { id: 10_000_000_000, label: '≥ 10 Md' },
] as const

export function MarketHeatmap({
  assets,
  categories,
  volatility,
}: {
  assets: MarketAsset[]
  categories: MarketCategory[]
  /**
   * Volatilité sur sept jours, par identifiant — CALCULÉE CÔTÉ SERVEUR.
   *
   * ⚠️ ELLE N'EST PAS CALCULÉE ICI, ET C'EST UNE QUESTION DE POIDS. La mesure vient
   * de `sparkline7d` : cent soixante-huit points de cours par actif, cent actifs,
   * soit environ cent trente kilo-octets de nombres qu'il faudrait sérialiser dans
   * la charge utile de la page pour en tirer cent écarts-types.
   *
   * La page calcule donc, et n'envoie que les cent nombres — en retirant les séries
   * de ce qu'elle transmet. Voir `app/[locale]/heatmap/page.tsx`.
   *
   * Un actif absent de cette table n'a pas de série publiée : sa tuile reste grise en
   * mode volatilité, comme pour toute fenêtre non publiée.
   */
  volatility?: Record<string, number>
}) {
  /* Les pièces d'abord : c'est la lecture qu'un lecteur cherche en arrivant sur
     « où le marché bouge-t-il ». */
  const t = usePhrase()
  const [mode, setMode] = useState<ModeId>(assets.length > 0 ? 'coins' : 'sectors')
  const [period, setPeriod] = useState<PeriodId>('change24h')
  const [count, setCount] = useState<number>(50)
  const [sizeBy, setSizeBy] = useState<SizeId>('marketCap')
  const [universe, setUniverse] = useState<UniverseId>('all')
  const [threshold, setThreshold] = useState<number>(0)

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

    /*
     * ── TROIS FILTRES, DANS CET ORDRE ────────────────────────────────────────
     *
     * L'univers d'abord (qui a le droit d'être là), le seuil ensuite (est-il assez
     * gros), la grandeur de surface en dernier (a-t-il une valeur à dessiner). Cet
     * ordre est le seul qui donne des comptes lisibles : un seuil appliqué après le
     * `slice` retirerait des tuiles d'une carte censée en montrer cinquante.
     */
    const universeFiltered = assets.filter((asset) => {
      if (universe === 'no-btc' || universe === 'no-btc-stables') {
        if (asset.id === 'bitcoin') return false
      }
      if (universe === 'no-stables' || universe === 'no-btc-stables') {
        if (STABLECOIN_IDS.has(asset.id)) return false
      }
      return true
    })

    /* Le seuil porte sur la capitalisation, quelle que soit la surface — voir
       `THRESHOLDS`. Un actif sans capitalisation publiée passe le seuil zéro et
       aucun autre : on ne peut pas affirmer qu'il le franchit. */
    const thresholded =
      threshold === 0
        ? universeFiltered
        : universeFiltered.filter((asset) => (asset.marketCap ?? 0) >= threshold)

    /** La grandeur de surface, `undefined` quand elle n'est pas connue. */
    const sizeOf = (asset: MarketAsset): number | undefined => {
      /* `equal` : toutes les tuiles à 1. La surface cesse de porter une information
         et la carte ne montre plus que la couleur — c'est tout l'objet du mode. */
      if (sizeBy === 'equal') return 1
      if (sizeBy === 'fdv') return fullyDilutedValuation(asset)
      return asset[sizeBy]
    }

    /** La grandeur de couleur, `undefined` quand elle n'est pas publiée. */
    const colorOf = (asset: MarketAsset): number | undefined => {
      if (period === 'volatilite') return volatility?.[asset.id]
      return asset[period]
    }

    return thresholded
      .map((asset) => ({ asset, size: sizeOf(asset) }))
      .filter((entry): entry is { asset: MarketAsset; size: number } => (entry.size ?? 0) > 0)
      /* En mode `equal`, toutes les surfaces valent 1 : le tri sur la surface ne
         classerait plus rien et l'ordre deviendrait celui du tableau reçu. On trie
         alors sur la capitalisation, qui reste l'ordre de lecture attendu. */
      .sort((a, b) =>
        sizeBy === 'equal'
          ? (b.asset.marketCap ?? 0) - (a.asset.marketCap ?? 0)
          : b.size - a.size,
      )
      .slice(0, count)
      .map(({ asset, size }) => {
        const change = colorOf(asset)

        return {
          id: asset.id,
          // Le SYMBOLE et non le nom : sur une tuile de quarante pixels, « BTC » se lit
          // et « Bitcoin » se tronque. Le nom complet part dans l'infobulle.
          label: asset.symbol.toUpperCase(),
          title: asset.name,
          /* Le TICKER et le COURS, que la figure ne dessine pas : la surface porte une
             grandeur, la teinte une variation, et le prix n'apparaît nulle part. C'est
             pourtant la première chose qu'on cherche en survolant une tuile. Écrit ici,
             où la devise est connue — la figure, elle, ne compte rien. */
          detail: `${asset.symbol.toUpperCase()} à ${formatCurrency(asset.price, asset.currency) ?? '—'}`,
          value: size,
          /*
           * ── LES STABLECOINS RESTENT GRIS ───────────────────────────────────
           *
           * Leur variation mesure l'écart à leur ancrage, pas une performance : un
           * Tether à +0,3 % n'a pas « monté », il a dérivé de trois millièmes. Peint
           * en vert au milieu d'un marché en hausse, il se lit comme une hausse.
           *
           * Le gris est déjà la teinte des tuiles sans donnée (voir `heatTone`), et
           * les deux cas disent bien la même chose au lecteur : « cette couleur ne
           * signifierait rien ici ». La valeur reste dans l'infobulle.
           *
           * ⚠️ SAUF EN MODE VOLATILITÉ, où la mesure a un sens précisément pour eux :
           * c'est même la seule figure où un stablecoin qui décroche se voit.
           */
          ...(change !== undefined &&
          (period === 'volatilite' || !STABLECOIN_IDS.has(asset.id))
            ? { change }
            : {}),
          ...(asset.image ? { image: asset.image } : {}),
          href: `/crypto/${asset.id}`,
        }
      })
  }, [mode, assets, categories, count, period, sizeBy, universe, threshold, volatility])

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
          <ChipGroup label={t('Découpage')} value={mode} onChange={setMode}>
            {MODES.map((entry) => (
              <Chip key={entry.id} id={entry.id} label={t(entry.label)} />
            ))}
          </ChipGroup>

          {/* Absentes en mode secteur : la source ne publie qu'une fenêtre de variation
              par catégorie. Un contrôle inopérant est pire qu'un contrôle absent — il
              fait douter de la donnée plutôt que de l'interface. */}
          {mode === 'coins' ? (
            <ChipGroup label={t('Couleur')} value={period} onChange={setPeriod}>
              {COLOR_MODES.map((entry) => (
                <Chip key={entry.id} id={entry.id} label={t(entry.label)} />
              ))}
            </ChipGroup>
          ) : null}

          {/* Absent en mode secteur : la source ne publie pas le volume d'un secteur,
             et un sélecteur dont la seconde option ne rendrait rien vaut moins que son
             absence — même raisonnement que pour les périodes ci-dessus. */}
          {mode === 'coins' ? (
            <ChipGroup label={t('Taille')} value={sizeBy} onChange={setSizeBy}>
              {SIZE_MODES.map((entry) => (
                <Chip key={entry.id} id={entry.id} label={t(entry.label)} />
              ))}
            </ChipGroup>
          ) : null}

          {/* L'UNIVERS et le SEUIL n'existent que par pièce : un secteur n'est ni
              Bitcoin ni un stablecoin, et sa capitalisation ne se compare pas à celle
              d'un actif — les seuils y découperaient une liste de dix narratifs. */}
          {mode === 'coins' ? (
            <ChipGroup label={t('Univers')} value={universe} onChange={setUniverse}>
              {UNIVERSES.map((entry) => (
                <Chip key={entry.id} id={entry.id} label={t(entry.label)} />
              ))}
            </ChipGroup>
          ) : null}

          {mode === 'coins' ? (
            <ChipGroup label={t('Cap. min.')} value={threshold} onChange={setThreshold}>
              {THRESHOLDS.map((entry) => (
                <Chip key={entry.id} id={entry.id} label={t(entry.label)} />
              ))}
            </ChipGroup>
          ) : null}

          <ChipGroup label={t('Tuiles')} value={count} onChange={setCount}>
            {COUNTS.map((size) => (
              <Chip key={size} id={size} label={String(size)} />
            ))}
          </ChipGroup>
        </div>

        {/* La légende accompagne désormais TOUJOURS la figure : il n'existe plus qu'une
            coloration, celle de la variation, et elle mesure bien une grandeur. */}
        <TreemapLegend tone={period === 'volatilite' ? 'volatility' : 'change'} />
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
          /* La rampe d'intensité remplace l'échelle signée en mode volatilité : une
             dispersion n'a pas de sens de variation, et le vert la ferait lire comme
             une hausse. Voir `volatilityTone`. */
          tone={period === 'volatilite' ? 'volatility' : 'change'}
        />
      </HeatmapFrame>

      <p className="max-w-4xl text-xs leading-relaxed text-ink-muted">
        {/* La phrase SUIT le sélecteur de taille. Elle disait « capitalisation » en dur,
            ce qui devenait faux dès qu'on basculait sur les volumes — une légende qui
            décrit une autre figure que celle affichée est pire qu'une légende absente. */}
        {/* LA PHRASE SUIT LES DEUX SÉLECTEURS. Elle disait « capitalisation » et
            « variation » en dur, ce qui devenait faux dès qu'on basculait la taille ou
            la couleur — une légende qui décrit une autre figure que celle affichée est
            pire qu'une légende absente. */}
        {(period === 'volatilite'
          ? t(
              'Surface : {size}. Couleur : volatilité sur 7 jours — l’écart-type des variations de la courbe publiée par la source. Elle n’a pas de sens de hausse ou de baisse : la rampe va du calme à l’agité, et son sommet est le plus agité des actifs AFFICHÉS. Les couleurs de cette vue classent donc le lot du jour ; elles ne se comparent pas d’un jour à l’autre.',
            )
          : t(
              'Surface : {size}. Couleur : variation sur {period}, par paliers et saturée au-delà de ±{clamp} % pour qu’une tuile minuscule et très volatile n’écrase pas l’échelle.',
            )
        )
          .replace(
            '{size}',
            mode === 'sectors'
              ? t('capitalisation')
              : sizeBy === 'marketCap'
                ? t('capitalisation')
                : sizeBy === 'fdv'
                  ? t('capitalisation totalement diluée (prix × offre maximale)')
                  : sizeBy === 'volume24h'
                    ? t('volume sur 24 heures')
                    : t('aucune — toutes les tuiles ont la même taille'),
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
