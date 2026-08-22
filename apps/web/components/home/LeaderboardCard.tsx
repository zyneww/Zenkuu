import type { ReactNode } from 'react'

import { ChangeBadge, formatPercent } from '@zenkuu/ui'

import { AreaSpark } from '@/components/charts/AreaSpark'
import { Link } from '@/i18n/navigation'

/** Une ligne de palmarès. `value` est un nœud pour laisser passer `<Money>`. */
export interface LeaderRow {
  key: string
  href: string
  name: string
  symbol?: string
  image?: string
  value: ReactNode
  change?: number
  /**
   * Part de la ligne dans la PLUS GRANDE du bloc, entre 0 et 1.
   *
   * C'est la largeur de la barre tracée sous la ligne, et elle est rapportée au
   * maximum du bloc plutôt qu'à son total : rapportée au total, la première barre
   * d'un palmarès très concentré occuperait 60 % et les quatre suivantes seraient
   * quatre traits indiscernables. Le maximum donne toujours une barre pleine en tête
   * et un écart lisible derrière — c'est une échelle de COMPARAISON, pas une part.
   */
  share: number
}

/** Un bloc de cinq lignes, avec son intitulé et la fenêtre qu'il couvre. */
export interface LeaderBlock {
  title: string
  hint: string
  rows: LeaderRow[]
}

/**
 * CARTE DE CLASSEMENT — un agrégat, sa courbe, et ce qui le compose.
 *
 * ── POURQUOI LES TROIS ÉTAGES SONT SUR LA MÊME CARTE ────────────────────────
 *
 * L'ancienne page séparait les deux lectures : une carte « Capitalisation du marché »
 * portait le total et sa courbe, trois panneaux voisins portaient les palmarès. Un
 * lecteur qui voyait « −1,8 % sur 24 h » devait donc descendre et changer de bloc pour
 * savoir QUI avait baissé, et rien ne garantissait que le palmarès d'à côté parlât de
 * la même grandeur — il classait par variation quand le total parlait de taille.
 *
 * Réunis, les trois étages se lisent d'un seul mouvement : le total répond à
 * « combien », la courbe à « depuis quand », les lignes à « à cause de qui ». Et la
 * garantie manquante devient structurelle — les lignes sont classées PAR la grandeur
 * annoncée en haut de la carte, puisque c'est la même carte qui décide des deux.
 *
 * ── LA BARRE SOUS CHAQUE LIGNE N'EST PAS UN ORNEMENT ────────────────────────
 *
 * Cinq montants alignés en colonne se comparent mal : « 439,1 M » et « 224,6 M » sont
 * deux textes de même longueur, et l'œil doit lire les chiffres pour voir le rapport
 * du simple au double. La barre le montre avant la lecture. C'est la seule raison
 * pour laquelle elle est là — elle ne porte aucune information que la colonne des
 * montants ne porte déjà, elle la rend instantanée.
 */
export function LeaderboardCard({
  title,
  value,
  change,
  hint,
  spark,
  blocks,
}: {
  title: string
  value: ReactNode
  change?: number
  /** Ce que le nombre du haut mesure exactement, ex. « Dernier relevé ». */
  hint: string
  /** Série de la courbe. Moins de deux points : la courbe disparaît, pas la carte. */
  spark: number[]
  blocks: LeaderBlock[]
}) {
  /* La courbe reprend le SENS de la variation affichée, et non une couleur de marque :
     une aire verte sous un badge rouge est un contresens que l'œil relève avant le
     texte. Sans variation connue, le ton neutre — une couleur de direction supposerait
     une direction. */
  const tone =
    change === undefined
      ? 'var(--color-ink-muted)'
      : change >= 0
        ? 'var(--color-up)'
        : 'var(--color-down)'

  return (
    <section className="flex flex-col overflow-hidden rounded-panel border border-border-subtle bg-panel">
      {/* ── L'AGRÉGAT ─────────────────────────────────────────────────────── */}
      <div className="px-4 pb-2 pt-3.5">
        <h3 className="text-sm text-ink-muted">{title}</h3>

        <p className="mt-1 flex flex-wrap items-baseline gap-2">
          <span className="tabular text-2xl font-semibold text-ink">{value}</span>
          <ChangeBadge value={change} size="sm" />
        </p>

        <p className="mt-0.5 text-micro text-ink-muted">{hint}</p>
      </div>

      {/* ── LA COURBE ─────────────────────────────────────────────────────── */}
      <div className="h-12">
        <AreaSpark
          data={spark.map((point, index) => ({ x: index, y: point }))}
          color={tone}
          height={48}
          format="compact"
        />
      </div>

      {/* ── CE QUI LE COMPOSE ─────────────────────────────────────────────── */}
      {blocks.map((block) => (
        <div key={block.title} className="border-t border-border-subtle px-4 py-2.5">
          <div className="flex items-baseline justify-between gap-2 pb-1">
            <h4 className="text-xs font-medium text-ink">{block.title}</h4>
            <span className="shrink-0 text-micro text-ink-muted">{block.hint}</span>
          </div>

          <ol className="flex flex-col">
            {block.rows.map((row, index) => (
              <li key={row.key} className="relative">
                <Link
                  href={row.href}
                  className="flex items-center gap-2 py-1.5 transition-colors duration-150 hover:bg-surface-muted"
                >
                  <span className="tabular w-3 shrink-0 text-micro text-ink-muted">{index + 1}</span>

                  {row.image ? (
                    /* eslint-disable-next-line @next/next/no-img-element -- logo distant, déjà dimensionné */
                    <img
                      src={row.image}
                      alt=""
                      aria-hidden="true"
                      loading="lazy"
                      className="h-4 w-4 shrink-0 rounded-pill"
                    />
                  ) : (
                    <span
                      className="h-4 w-4 shrink-0 rounded-pill bg-surface-muted"
                      aria-hidden="true"
                    />
                  )}

                  <span className="min-w-0 flex-1 truncate text-xs text-ink">
                    {row.name}
                    {row.symbol ? (
                      <span className="ml-1.5 text-micro uppercase text-ink-muted">
                        {row.symbol}
                      </span>
                    ) : null}
                  </span>

                  <span className="tabular shrink-0 text-xs text-ink">{row.value}</span>

                  <span
                    className={`tabular w-14 shrink-0 text-right text-xs ${
                      row.change === undefined
                        ? 'text-ink-muted'
                        : row.change >= 0
                          ? 'text-up'
                          : 'text-down'
                    }`}
                  >
                    {formatPercent(row.change) ?? '—'}
                  </span>
                </Link>

                {/* La barre est POSÉE SUR le bas de la ligne et non insérée dans le
                    flux : glissée entre deux lignes, elle ajouterait deux pixels à
                    chacune des dix lignes de la carte, soit vingt pixels de hauteur
                    pour une indication qui n'occupe aucune place à l'écran.

                    `aria-hidden` — elle redit la colonne des montants, qu'un lecteur
                    d'écran vient d'annoncer. */}
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute bottom-0 left-0 h-0.5 rounded-pill"
                  style={{
                    width: `${Math.max(2, Math.min(100, row.share * 100))}%`,
                    background: 'color-mix(in oklab, var(--color-data-1) 70%, transparent)',
                  }}
                />
              </li>
            ))}
          </ol>
        </div>
      ))}
    </section>
  )
}
