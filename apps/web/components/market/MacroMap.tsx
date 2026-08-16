'use client'

import { useMemo, useState } from 'react'

import type { MacroObservation } from '@zenkuu/data'

/**
 * CARTE MACROÉCONOMIQUE — l'écart entre pays, indicateur par indicateur.
 *
 * ── CE QUI EST REPRIS DE TRADINGVIEW, ET CE QUI NE L'EST PAS ──────────────────
 *
 * REPRIS : la STRUCTURE. Une rangée d'indicateurs, une surface colorée où chaque pays
 * porte sa teinte, une échelle de couleur légendée, un classement à droite. C'est une
 * grammaire juste — on cherche d'abord « qui est le plus haut », puis « où se situe
 * mon pays », et les deux se lisent d'un même écran.
 *
 * PAS REPRIS : le PLANISPHÈRE. Un fond de carte du monde, c'est deux à trois cents
 * kilo-octets de tracés vectoriels à charger, plus une projection, pour un gain de
 * lecture réel mais borné — sur une grandeur comme l'inflation, la géographie
 * n'explique presque rien, et les pays qui comptent le plus sont souvent les plus
 * petits à l'écran. Le Luxembourg et l'Irlande sont invisibles sur une carte du monde.
 *
 * ── CE QUI REMPLACE LA CARTE, ET POURQUOI C'EST DÉFENDABLE ────────────────────
 *
 * Une GRILLE GROUPÉE PAR RÉGION. Elle conserve le seul apport réel du planisphère —
 * voir qu'une zone entière est dans le même état — sans donner à la surface d'un pays
 * un poids que sa taille ne mérite pas. Chaque pays occupe la même tuile, quelle que
 * soit sa superficie : c'est plus juste pour comparer des taux, qui ne sont pas des
 * grandeurs de surface.
 *
 * ── L'ÉCHELLE EST BORNÉE PAR LES CENTILES, PAS PAR LES EXTRÊMES ───────────────
 *
 * Une échelle tendue du minimum au maximum serait écrasée par un seul pays : sur
 * l'inflation, un pays en hyperinflation à 200 % ramènerait tous les autres dans le
 * premier vingtième de la rampe, et la carte deviendrait monochrome. Les bornes sont
 * donc les 5ᵉ et 95ᵉ centiles, et les valeurs au-delà saturent — ce que la légende dit.
 */

/** Le sens de lecture d'un indicateur : une valeur haute est-elle bonne ou mauvaise ? */
export type MacroTone = 'high-good' | 'high-bad' | 'neutral'

export interface MacroGroup {
  id: string
  label: string
  /** Codes ISO-3 retenus, ou `null` pour « tous les pays publiés ». */
  iso3: string[] | null
}

/**
 * Groupes proposés.
 *
 * Le G20 en tête, comme chez la référence : c'est l'ensemble sur lequel la question
 * « qui va le mieux » se pose réellement, et 190 pays d'un coup ne se lisent pas.
 */
export const MACRO_GROUPS: MacroGroup[] = [
  {
    id: 'g20',
    label: 'G20',
    iso3: [
      'ARG', 'AUS', 'BRA', 'CAN', 'CHN', 'DEU', 'FRA', 'GBR', 'IDN', 'IND',
      'ITA', 'JPN', 'KOR', 'MEX', 'RUS', 'SAU', 'TUR', 'USA', 'ZAF',
    ],
  },
  {
    id: 'euro',
    label: 'Zone euro',
    iso3: [
      'AUT', 'BEL', 'HRV', 'CYP', 'EST', 'FIN', 'FRA', 'DEU', 'GRC', 'IRL',
      'ITA', 'LVA', 'LTU', 'LUX', 'MLT', 'NLD', 'PRT', 'SVK', 'SVN', 'ESP',
    ],
  },
  { id: 'monde', label: 'Tous les pays', iso3: null },
]

/**
 * Centile d'une série triée.
 *
 * Interpolation linéaire entre les deux rangs encadrants : sur une série de vingt
 * pays, le 95ᵉ centile tombe entre deux valeurs, et prendre celle du dessous ferait
 * saturer deux pays au lieu d'un.
 */
function percentile(sorted: number[], ratio: number): number {
  if (sorted.length === 0) return 0
  if (sorted.length === 1) return sorted[0] as number

  const position = (sorted.length - 1) * ratio
  const lower = Math.floor(position)
  const upper = Math.ceil(position)
  const weight = position - lower

  return (sorted[lower] as number) * (1 - weight) + (sorted[upper] as number) * weight
}

export function MacroMap({
  observations,
  unit,
  tone,
}: {
  observations: MacroObservation[]
  unit: string
  tone: MacroTone
}) {
  const [groupId, setGroupId] = useState(MACRO_GROUPS[0]!.id)
  const group = MACRO_GROUPS.find((entry) => entry.id === groupId) ?? MACRO_GROUPS[0]!

  const rows = useMemo(() => {
    const kept = group.iso3
      ? observations.filter((entry) => group.iso3?.includes(entry.iso3))
      : observations

    /*
     * ── UNE SEULE OBSERVATION PAR PAYS, LA PLUS RÉCENTE ────────────────────────
     *
     * La page demande désormais QUINZE ANNÉES à la source, pour alimenter le curseur
     * temporel de l'explorateur. Cette grille-ci, elle, est un instantané : elle
     * recevait donc quinze lignes par pays, toutes indexées sur `entry.iso3`, d'où une
     * volée d'avertissements « Encountered two children with the same key » relevée
     * par l'audit responsive — et une grille qui affichait quinze tuiles « France ».
     *
     * Le défaut est apparu SANS QUE CE FICHIER CHANGE : c'est son appelant qui s'est
     * mis à lui passer autre chose. On déduplique donc ici plutôt que de rendre la
     * page responsable du format attendu par chacun de ses enfants.
     */
    const latest = new Map<string, (typeof kept)[number]>()
    for (const entry of kept) {
      const known = latest.get(entry.iso3)
      if (!known || entry.year > known.year) latest.set(entry.iso3, entry)
    }

    return [...latest.values()].sort((a, b) => b.value - a.value)
  }, [observations, group])

  const scale = useMemo(() => {
    const values = rows.map((entry) => entry.value).sort((a, b) => a - b)
    const low = percentile(values, 0.05)
    const high = percentile(values, 0.95)
    // Une série constante donnerait une division par zéro : on ouvre alors la rampe
    // d'un point de part et d'autre, ce qui rend tout le monde au milieu.
    return high > low ? { low, high } : { low: low - 1, high: low + 1 }
  }, [rows])

  /** Position d'une valeur sur la rampe, bornée à [0, 1]. */
  function ratioOf(value: number): number {
    return Math.min(1, Math.max(0, (value - scale.low) / (scale.high - scale.low)))
  }

  /**
   * Teinte d'une tuile.
   *
   * `neutral` emploie une rampe FROIDE→CHAUDE sans jugement, les deux autres la rampe
   * de marché du site — vert et rouge — orientée selon le sens de l'indicateur. Une
   * inflation haute est rouge, une croissance haute est verte : la couleur porte donc
   * la même convention que partout ailleurs sur le site, et un lecteur n'a pas à
   * réapprendre une grammaire par page.
   */
  function colorOf(value: number): string {
    const ratio = ratioOf(value)
    if (tone === 'neutral') {
      return `color-mix(in srgb, var(--color-brand) ${Math.round(ratio * 85 + 10)}%, var(--color-surface-muted))`
    }
    const bad = tone === 'high-bad' ? ratio : 1 - ratio
    const token = bad > 0.5 ? 'var(--color-down)' : 'var(--color-up)'
    const strength = Math.round(Math.abs(bad - 0.5) * 2 * 80 + 12)
    return `color-mix(in srgb, ${token} ${strength}%, var(--color-surface-muted))`
  }

  const byRegion = useMemo(() => {
    const map = new Map<string, MacroObservation[]>()
    for (const entry of rows) {
      const bucket = map.get(entry.region)
      if (bucket) bucket.push(entry)
      else map.set(entry.region, [entry])
    }
    return [...map].sort((a, b) => b[1].length - a[1].length)
  }, [rows])

  const format = (value: number) =>
    `${value.toFixed(1).replace('.', ',')} ${unit === '%' ? '%' : unit}`

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Ensemble de pays">
        {MACRO_GROUPS.map((entry) => (
          <button
            key={entry.id}
            type="button"
            onClick={() => setGroupId(entry.id)}
            aria-pressed={entry.id === group.id}
            className={`rounded-control border px-2.5 py-1 text-xs font-medium transition-colors duration-150 ${
              entry.id === group.id
                ? 'border-brand bg-brand text-on-brand'
                : 'border-border-subtle text-ink-muted hover:border-brand hover:text-ink'
            }`}
          >
            {entry.label}
          </button>
        ))}

        <p className="tabular ml-auto text-xs text-ink-muted">
          <strong className="text-ink">{rows.length}</strong> pays publiés
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)]">
        {/* ── La grille, groupée par région ─────────────────────────────── */}
        <div className="space-y-4">
          {byRegion.map(([region, entries]) => (
            <section key={region}>
              <h3 className="mb-1.5 text-micro font-semibold uppercase tracking-wide text-ink-muted">
                {region}
                <span className="ml-1.5 font-normal normal-case tracking-normal">
                  {entries.length}
                </span>
              </h3>

              <ul className="grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {entries.map((entry) => (
                  <li key={entry.iso3}>
                    {/* Le titre porte l'ANNÉE, qui diffère d'un pays à l'autre : sans
                        elle, deux tuiles voisines peuvent décrire deux moments sans
                        que rien ne le signale. Elle est aussi dans le classement. */}
                    <div
                      title={`${entry.country} — ${format(entry.value)} (${entry.year})`}
                      className="rounded-sm border border-border-subtle/60 px-2 py-1.5"
                      style={{ backgroundColor: colorOf(entry.value) }}
                    >
                      <p className="truncate text-[0.6875rem] font-medium text-ink">
                        {entry.country}
                      </p>
                      <p className="tabular text-xs font-semibold text-ink">
                        {format(entry.value)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        {/* ── Le classement ─────────────────────────────────────────────── */}
        <aside className="space-y-2">
          <h3 className="text-micro font-semibold uppercase tracking-wide text-ink-muted">
            Classement
          </h3>

          <ol className="divide-y divide-border-subtle rounded-card border border-border-subtle">
            {rows.slice(0, 25).map((entry, index) => (
              <li
                key={entry.iso3}
                className="flex items-baseline gap-2 px-3 py-1.5 text-xs"
              >
                <span className="tabular w-5 shrink-0 text-ink-muted">{index + 1}</span>
                <span className="min-w-0 flex-1 truncate text-ink">{entry.country}</span>
                <span className="tabular shrink-0 font-medium text-ink">
                  {format(entry.value)}
                </span>
                <span className="tabular w-9 shrink-0 text-right text-ink-muted">
                  {entry.year}
                </span>
              </li>
            ))}
          </ol>

          {rows.length > 25 ? (
            <p className="text-micro text-ink-muted">
              Les 25 premiers sur {rows.length}. La grille de gauche porte tous les pays.
            </p>
          ) : null}
        </aside>
      </div>

      {/* ── L'échelle ─────────────────────────────────────────────────────
          Elle annonce ses bornes ET le fait qu'elles saturent : une échelle dont on
          ignore qu'elle est tronquée fait lire « au maximum » là où il faut lire « au
          moins ». */}
      <div className="flex flex-wrap items-center gap-3 border-t border-border-subtle pt-3">
        <span className="tabular text-micro text-ink-muted">≤ {format(scale.low)}</span>
        <div className="h-1.5 min-w-[8rem] flex-1 overflow-hidden rounded-pill">
          <div className="flex h-full">
            {Array.from({ length: 20 }, (_, index) => {
              const value = scale.low + ((scale.high - scale.low) * index) / 19
              return (
                <span
                  key={index}
                  className="flex-1"
                  style={{ backgroundColor: colorOf(value) }}
                />
              )
            })}
          </div>
        </div>
        <span className="tabular text-micro text-ink-muted">≥ {format(scale.high)}</span>
        <p className="text-micro text-ink-muted">
          Bornes aux 5ᵉ et 95ᵉ centiles — au-delà, la couleur sature.
        </p>
      </div>
    </div>
  )
}
