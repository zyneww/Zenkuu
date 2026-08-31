'use client'

import { usePhrase } from '@/components/locale/ContentProvider'
import { Maximize2, Minimize2 } from 'lucide-react'
import { useState } from 'react'
import { Cell, Pie, PieChart } from 'recharts'

import { formatShare } from '@zenkuu/ui'

import { Money } from '@/components/locale/Money'
import { ChartContainer } from '@/components/ui/chart'

/**
 * Anneau de répartition, sa légende chiffrée et son infobulle au survol.
 *
 * Reprise FONCTIONNELLE des « Market share by … » de la référence du secteur : la
 * question « qui pèse quoi » revient sur chaque fiche, et un anneau y répond plus
 * vite qu'une colonne de pourcentages. Ce qui est repris est le couple anneau +
 * tableau, le survol qui relie les deux, et l'agrandissement. Le dessin, lui, suit
 * notre grammaire — pas d'ombres, pas de dégradés, palette catégorielle du système.
 *
 * ── « use client » NE COÛTE PAS LE RÉFÉRENCEMENT ──────────────────────────────
 *
 * Ce composant était serveur pour garder ses chiffres dans le HTML initial. La
 * directive ne change rien sur ce point : Next rend les composants client côté
 * serveur pour le premier HTML, et les robots voient donc toujours la légende
 * complète. Ce qu'elle coûte réellement, c'est du JavaScript envoyé au navigateur —
 * quelques centaines d'octets ici, en échange du survol qui relie segment et ligne
 * de légende. C'est l'interaction qui rend l'anneau lisible au-delà de trois parts.
 *
 * ── PAS DE BOUTON « RÉGLAGES » ────────────────────────────────────────────────
 *
 * La référence en pose un à côté de l'agrandissement. Il n'y en a pas ici tant qu'il
 * n'ouvre rien : un engrenage qui ne fait rien est une promesse fausse, et le
 * lecteur qui l'a cliqué une fois cesse de faire confiance aux autres commandes.
 * L'agrandissement, lui, agrandit vraiment.
 *
 * ── LA PART « AUTRES » N'EST PAS UN ARRONDI ───────────────────────────────────
 *
 * Au-delà de six segments, l'anneau devient illisible et la légende plus longue que
 * l'information qu'elle porte. Le reste est donc REGROUPÉ et nommé, jamais tronqué
 * en silence : « Autres · 12 places » dit à la fois ce qui a été agrégé et combien
 * de lignes cela représente. Une part manquante sans explication ferait douter du
 * total (§5).
 */

/** Six teintes catégorielles du système, déjà déclinées en thème clair et sombre. */
const PALETTE = [
  'var(--color-data-1)',
  'var(--color-data-2)',
  'var(--color-data-3)',
  'var(--color-data-4)',
  'var(--color-data-5)',
  'var(--color-data-6)',
] as const

/** Teinte neutre de la part agrégée — elle ne doit pas se lire comme une catégorie. */
const REST_COLOR = 'var(--color-border-subtle)'

const MAX_SEGMENTS = 6

export interface SharePart {
  label: string
  value: number
}

interface Segment {
  label: string
  value: number
  percent: number
  color: string
}

export function ShareDonut({
  title,
  subtitle,
  parts,
  /** Libellé de la part agrégée — « places », « paires »… */
  restNoun,
  /**
   * Devise dans laquelle les valeurs sont exprimées. Absente : aucune colonne de
   * valeurs, seuls les pourcentages.
   *
   * ── POURQUOI PAS UNE FONCTION DE RENDU ──────────────────────────────────────
   *
   * L'API naturelle serait `renderValue: (v) => ReactNode`, laissant l'appelant
   * décider du formatage. Elle est IMPOSSIBLE ici : une fonction ne traverse pas la
   * frontière serveur → client, et React lève « Functions cannot be passed directly
   * to Client Components ». Le composant étant client, il formate lui-même et suit
   * la devise choisie par le lecteur, ce qu'une fonction figée côté serveur
   * n'aurait de toute façon pas su faire.
   */
  valueCurrency,
  /** Intitulé de la colonne de valeurs — « Dernier », « Volume 24 h »… */
  valueHeader,
}: {
  title: string
  subtitle?: string
  parts: SharePart[]
  restNoun: string
  valueCurrency?: string
  valueHeader?: string
}) {
  const t = usePhrase()
  const [active, setActive] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)

  // Une part négative ou nulle n'a pas de sens dans une répartition : elle
  // fausserait le total et donnerait des arcs qui se chevauchent.
  const usable = parts.filter((part) => Number.isFinite(part.value) && part.value > 0)
  const total = usable.reduce((sum, part) => sum + part.value, 0)

  // Moins de deux parts : il n'y a rien à répartir. Un anneau plein à 100 % occupe
  // de la place sans rien apprendre.
  if (usable.length < 2 || total <= 0) return null

  const sorted = [...usable].sort((a, b) => b.value - a.value)
  const head = sorted.slice(0, MAX_SEGMENTS)
  const tail = sorted.slice(MAX_SEGMENTS)

  const segments: Segment[] = head.map((part, index) => ({
    label: part.label,
    value: part.value,
    percent: (part.value / total) * 100,
    color: PALETTE[index % PALETTE.length] as string,
  }))

  if (tail.length > 0) {
    const value = tail.reduce((sum, part) => sum + part.value, 0)
    segments.push({
      label: `Autres · ${tail.length} ${restNoun}`,
      value,
      percent: (value / total) * 100,
      color: REST_COLOR,
    })
  }

  // Géométrie de l'anneau. `stroke` est devenu l'ÉPAISSEUR de la couronne, c'est-à-dire
  // l'écart entre les deux rayons — mêmes valeurs qu'avant, où c'était la largeur du
  // trait d'un cercle.
  const size = expanded ? 240 : 168
  const stroke = expanded ? 34 : 26

  const hovered = segments.find((segment) => segment.label === active)

  return (
    <section className="rounded-card border border-border-subtle bg-panel p-4">
      <header className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-ink">{title}</h3>
          {subtitle ? <p className="text-xs text-ink-muted">{subtitle}</p> : null}
        </div>

        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-label={expanded ? 'Réduire le graphique' : 'Agrandir le graphique'}
          aria-pressed={expanded}
          className="shrink-0 rounded-sm p-1 text-ink-muted transition-colors duration-150 hover:bg-surface-muted hover:text-ink"
        >
          {expanded ? (
            <Minimize2 className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
          )}
        </button>
      </header>

      {/*
        ── L'ANNEAU EST AU-DESSUS, TOUJOURS, ET C'EST UNE CORRECTION ─────────────

        Cette zone était un `flex flex-wrap items-center` : anneau à gauche, tableau à
        droite, avec repli sur deux lignes quand les deux ne tenaient plus. La
        disposition dépendait donc de la LONGUEUR DES LIBELLÉS, ce qui produisait deux
        cartes voisines réglées différemment sans qu'aucune règle ne l'ait décidé —
        « Coinbase International Exchange » élargissait le tableau des places, la ligne
        débordait et l'anneau passait au-dessus ; « USDT » tenait, celui des devises
        restait sur le côté. Vu côte à côte dans la grille, l'un semblait deux fois
        plus grand que l'autre.

        Pire : dans le cas non replié, `items-center` centrait un anneau de 168 pixels
        face à un tableau bien plus haut, et creusait donc un vide au-dessus ET en
        dessous — un vide que la carte voisine, elle, n'avait pas.

        L'empilement est désormais inconditionnel. Les deux cartes se ressemblent quoi
        que contiennent leurs libellés, l'anneau reçoit la largeur entière (il grandit
        donc), et le tableau n'est plus comprimé dans une demi-colonne.
      */}
      <div className="flex flex-col items-center gap-4">
        <div className="relative shrink-0">
          {/*
            ══════════════════════════════════════════════════════════════════
            L'ANNEAU EST UN `Pie` DE shadcn/ui, PLUS UN CERCLE À TIRETS
            ══════════════════════════════════════════════════════════════════

            Il était dessiné par un `<circle>` par segment, chacun avec son
            `strokeDasharray` et son `strokeDashoffset` cumulé — la technique du
            « donut en pointillés ». Elle marche, et elle a deux défauts que ce
            remplacement supprime :

            1. LES DÉCALAGES CUMULÉS ÉTAIENT CALCULÉS À LA MAIN, dans un `reduce` qui
               existait uniquement pour ne PAS muter un accumulateur pendant le rendu
               — une précaution nécessaire (le compilateur React ne garantit pas que
               chaque itération d'un `.map()` de rendu s'exécute une fois et dans
               l'ordre) mais qui n'aurait jamais dû avoir à être prise.

            2. LA GÉOMÉTRIE ÉTAIT ACCROCHÉE À UNE ROTATION CSS. `-rotate-90` amenait
               le départ à midi ; toute reprise du composant devait comprendre que le
               `viewBox` et le rendu ne partageaient pas la même orientation.

            `startAngle={90} endAngle={-270}` dit la même chose en deux nombres, dans
            le vocabulaire du graphique et non dans celui de la feuille de style.

            ⚠️ PAS DE `<ChartTooltip>` ICI, ET C'EST DÉLIBÉRÉ. L'infobulle de ce
            composant est le CENTRE de l'anneau (voir juste en dessous) : elle est
            posée là où l'œil est déjà, au lieu d'un calque flottant qui masque
            justement les segments qu'on compare. Le survol pilote donc `active`, pas
            une infobulle.
          */}
          <ChartContainer
            config={{}}
            /* L'anneau est une REDITE de la légende, qui porte les mêmes chiffres en
               texte. L'annoncer aux lecteurs d'écran les obligerait à écouter deux
               fois la même information. */
            aria-hidden="true"
            className="aspect-square"
            style={{ width: size, height: size }}
          >
            <PieChart>
              <Pie
                data={segments}
                dataKey="value"
                nameKey="label"
                cx="50%"
                cy="50%"
                outerRadius={size / 2}
                innerRadius={size / 2 - stroke}
                /* Départ à midi, sens horaire — l'orientation qu'on lit sur une
                   horloge, et celle que la rotation CSS produisait avant. */
                startAngle={90}
                endAngle={-270}
                /* Aucun écart entre les parts : un anneau de répartition doit se lire
                   comme un tout continu, et une gouttière blanche entre segments
                   suggère qu'il manque quelque chose entre eux. */
                paddingAngle={0}
                stroke="none"
                isAnimationActive={false}
                onMouseEnter={(_, index) => setActive(segments[index]?.label ?? null)}
                onMouseLeave={() => setActive(null)}
              >
                {segments.map((segment) => {
                  const dimmed = active !== null && active !== segment.label
                  return (
                    <Cell
                      key={segment.label}
                      fill={segment.color}
                      // Atténuer les AUTRES plutôt que souligner le survolé : sur des
                      // parts très inégales — 98 % contre 1,5 % — épaissir le segment
                      // actif ne se voit pas, alors qu'éteindre le reste le fait
                      // ressortir aussitôt.
                      opacity={dimmed ? 0.25 : 1}
                      className="cursor-pointer transition-opacity duration-150"
                    />
                  )
                })}
              </Pie>
            </PieChart>
          </ChartContainer>

          {/* Le centre porte le décompte au repos, et les chiffres du segment
              survolé sinon — c'est l'infobulle de la référence, placée là où l'œil
              est déjà plutôt que sur un calque flottant qui masque l'anneau. */}
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
            {hovered ? (
              <>
                <span className="line-clamp-2 text-micro leading-tight text-ink-muted">
                  {hovered.label}
                </span>
                <span className="tabular text-base font-semibold text-ink">
                  {formatShare(hovered.percent)}
                </span>
                {valueCurrency ? (
                  <span className="tabular text-micro text-ink-muted">
                    {<Money value={hovered.value} from={valueCurrency} compact />}
                  </span>
                ) : null}
              </>
            ) : (
              <>
                <span className="tabular text-lg font-semibold text-ink">{usable.length}</span>
                <span className="text-micro text-ink-muted">{restNoun}</span>
              </>
            )}
          </div>
        </div>

        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border-subtle text-micro uppercase tracking-wide text-ink-muted">
              <th scope="col" className="pb-1 text-left font-medium">
                {restNoun}
              </th>
              {valueCurrency ? (
                <th scope="col" className="pb-1 text-right font-medium">
                  {valueHeader ?? 'Valeur'}
                </th>
              ) : null}
              <th scope="col" className="pb-1 text-right font-medium">
                {t('% Part')}
              </th>
            </tr>
          </thead>
          <tbody>
            {segments.map((segment) => (
              <tr
                key={segment.label}
                onMouseEnter={() => setActive(segment.label)}
                onMouseLeave={() => setActive(null)}
                className={`border-b border-border-subtle transition-colors duration-150 last:border-0 ${
                  active === segment.label ? 'bg-surface-muted' : ''
                }`}
              >
                <td className="py-1.5 pr-2">
                  <span className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 shrink-0 rounded-xs"
                      style={{ backgroundColor: segment.color }}
                      aria-hidden="true"
                    />
                    <span className="truncate text-ink">{segment.label}</span>
                  </span>
                </td>
                {valueCurrency ? (
                  <td className="tabular py-1.5 pr-2 text-right text-ink-muted">
                    {<Money value={segment.value} from={valueCurrency} compact />}
                  </td>
                ) : null}
                <td className="tabular py-1.5 text-right font-medium text-ink">
                  {formatShare(segment.percent)}
                </td>
              </tr>
            ))}
          </tbody>
          {/* Total explicite, comme la référence. Il vaut toujours 100 % par
              construction, mais son intérêt est ailleurs : il montre que les parts
              affichées COUVRENT bien l'ensemble, y compris la ligne « Autres ». */}
          <tfoot>
            <tr className="border-t border-border-subtle">
              <td className="pt-1.5 text-ink-muted">{t('Total')}</td>
              {valueCurrency ? (
                <td className="tabular pt-1.5 text-right text-ink">{<Money value={total} from={valueCurrency} compact />}</td>
              ) : null}
              <td className="tabular pt-1.5 text-right text-ink">{formatShare(100)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  )
}
