'use client'

import { useMemo, useState } from 'react'

import { BarFigure } from '@/components/charts/BarFigure'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { usePhrase } from '@/components/locale/ContentProvider'
import { regrouper, type Grain, type SeriesPoint } from '@/components/asset/series-grouping'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * LES CARTES DE SÉRIES SOUS LE GRAPHIQUE — LA FORME DE blockworks.com
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Leur page prix pose sous la courbe une grille de cartes en barres : titre,
 * sous-titre, sélecteur de granularité, et le tracé.
 *
 * ── CE QUI EST REPRIS, ET CE QUI NE POUVAIT PAS L'ÊTRE ────────────────────
 *
 * ⚠️ LEURS SÉRIES NE SONT PAS LES NÔTRES, ET AUCUNE NE POUVAIT ÊTRE COPIÉE. Leurs
 * cartes montrent « Total Revenue », « HyperEVM Network REV », « Perpetual Futures
 * Volume » : des mesures on-chain que leur propre équipe de recherche produit. ZENKUU
 * n'y a pas accès, et les reprendre demanderait une source tierce dont la couverture
 * s'arrête à quelques dizaines de protocoles — donc une section vide sur l'immense
 * majorité des fiches, et sur toutes les actions, devises et matières premières.
 *
 * Les cartes tracent donc CE QUE LA RÉPONSE D'HISTORIQUE PORTE DÉJÀ : volume,
 * capitalisation, variation quotidienne. Aucun appel réseau supplémentaire — les
 * points sont ceux du graphique du dessus.
 *
 * ⚠️ IL N'Y A PAS DE CARTE « OFFRE EN CIRCULATION », alors qu'elle figurait dans le
 * plan. La source publie l'offre comme une valeur COURANTE, pas comme une série : le
 * rail de gauche la donne, l'historique ne la contient pas. La tracer demanderait de
 * l'inventer jour par jour (§5).
 *
 * ── NI RANGÉE D'ONGLETS, ET C'EST LA MÊME RAISON QUE LA PAGE D'AIDE ───────
 *
 * La référence pose douze onglets au-dessus de sa grille parce qu'elle a douze
 * familles de mesures. Il y en a TROIS ici. Un jeu d'onglets sur trois cartes cacherait
 * les deux tiers de ce qu'il classe, et demanderait d'apprendre une navigation pour
 * atteindre ce qui tient déjà à l'écran.
 *
 * ── LA GRANULARITÉ, EN REVANCHE, EST REPRISE ─────────────────────────────
 *
 * Elle sert vraiment : sur une fenêtre d'un an, sept cents barres quotidiennes ne
 * forment plus qu'un aplat. Le regroupement hebdomadaire ou mensuel rend la forme.
 */


export type { SeriesPoint } from '@/components/asset/series-grouping'

export function AssetSeriesCards({ points }: { points: readonly SeriesPoint[] }) {
  const t = usePhrase()
  const [grain, setGrain] = useState<Grain>('jour')

  const groupes = useMemo(() => regrouper(points, grain), [points, grain])

  const format = useMemo(
    () =>
      new Intl.DateTimeFormat('fr-FR', {
        day: grain === 'mois' ? undefined : 'numeric',
        month: 'short',
        ...(grain === 'mois' ? { year: '2-digit' } : {}),
      }),
    [grain],
  )

  /* Une carte se retire d'elle-même quand sa série manque : les devises n'ont pas de
     capitalisation, certaines sources ne publient aucun volume. Une carte vide dirait
     « zéro » là où il faut dire « rien ». */
  const aVolume = groupes.some((g) => typeof g.volume === 'number')
  const aCapitalisation = groupes.some((g) => typeof g.marketCap === 'number')
  const aVariation = groupes.some((g) => typeof g.change === 'number')

  if (!aVolume && !aCapitalisation && !aVariation) return null

  const abscisse = (timestamp: number) => format.format(new Date(timestamp))

  return (
    <section aria-labelledby="series-titre" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="series-titre" className="text-base font-semibold text-ink">
          {t('Séries du marché')}
        </h2>

        {/* Un SEUL sélecteur pour les trois cartes, et non un par carte comme chez la
            référence : elles tracent la même fenêtre de la même série d'origine, et
            trois granularités différentes côte à côte inviteraient à comparer des
            barres qui ne couvrent pas la même durée. */}
        <SegmentedControl
          size="sm"
          label={t('Granularité')}
          value={grain}
          onChange={setGrain}
          options={[
            { key: 'jour' as const, label: t('Jour') },
            { key: 'semaine' as const, label: t('Semaine') },
            { key: 'mois' as const, label: t('Mois') },
          ]}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {aVolume ? (
          <Carte
            titre={t('Volume échangé')}
            sousTitre={t('Somme des volumes de la période, toutes places confondues.')}
          >
            <BarFigure
              grow
              height={200}
              ariaLabel={t('Volume échangé par période')}
              data={groupes
                .filter((g) => typeof g.volume === 'number')
                .map((g) => ({ label: abscisse(g.timestamp), volume: g.volume as number }))}
              series={[
                { key: 'volume', label: t('Volume'), color: 'var(--color-brand-strong)' },
              ]}
            />
          </Carte>
        ) : null}

        {aCapitalisation ? (
          <Carte
            titre={t('Capitalisation')}
            sousTitre={t('Valeur en fin de période, telle que la source la publie.')}
          >
            <BarFigure
              grow
              height={200}
              ariaLabel={t('Capitalisation par période')}
              data={groupes
                .filter((g) => typeof g.marketCap === 'number')
                .map((g) => ({ label: abscisse(g.timestamp), cap: g.marketCap as number }))}
              series={[{ key: 'cap', label: t('Capitalisation'), color: 'var(--color-brand)' }]}
            />
          </Carte>
        ) : null}

        {aVariation ? (
          <Carte
            titre={t('Variation par période')}
            sousTitre={t('Du premier au dernier relevé de chaque période.')}
          >
            {/* `signed` : la couleur suit le SIGNE et non la série. C'est la seule des
                trois figures où elle porte un sens que le lecteur attend déjà. */}
            <BarFigure
              grow
              signed
              height={200}
              ariaLabel={t('Variation par période')}
              data={groupes
                .filter((g) => typeof g.change === 'number')
                .map((g) => ({ label: abscisse(g.timestamp), variation: g.change as number }))}
              series={[
                {
                  key: 'variation',
                  label: t('Variation'),
                  color: 'var(--color-brand-strong)',
                  format: 'percent',
                },
              ]}
            />
          </Carte>
        ) : null}
      </div>
    </section>
  )
}

function Carte({
  titre,
  sousTitre,
  children,
}: {
  titre: string
  sousTitre: string
  children: React.ReactNode
}) {
  return (
    /* `flex-col` avec la figure en `flex-1` : la grille égalise la hauteur des rangées,
       et sans cela la carte au sous-titre le plus court laisserait sa figure flotter
       au-dessus du vide. Voir la prop `grow` de `BarFigure`. */
    <div className="flex flex-col rounded-card border border-border-subtle bg-surface p-4">
      <h3 className="text-sm font-semibold text-ink">{titre}</h3>
      <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">{sousTitre}</p>
      {/* ⚠️ `flex flex-col` ET NON UN SIMPLE `flex-1`. `BarFigure` en mode `grow` se
          pose en `flex-1 min-h-0` : il attend donc un parent FLEXIBLE. Dans un bloc
          ordinaire, ces classes ne valent rien, la figure obtient une hauteur nulle et
          Recharts refuse de rendre le moindre SVG — constaté au navigateur, trois
          cartes vides sans la moindre erreur en console. */}
      <div className="mt-3 flex flex-1 flex-col">{children}</div>
    </div>
  )
}
