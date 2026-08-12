import type { AssetDetail } from '@zenkuu/data'
import { formatShare } from '@zenkuu/ui'

import { Panel } from '@/components/ui/Panel'

/**
 * Vote communautaire haussier / baissier.
 *
 * ── CE PANNEAU PORTE SON PROPRE AVERTISSEMENT, ET CE N'EST PAS NÉGOCIABLE ─────
 *
 * Toutes les autres cartes de la fiche montrent des mesures de marché : un volume
 * est un volume, une capitalisation est une capitalisation. Celle-ci montre un
 * SONDAGE — ce que pensent les gens qui ont cliqué sur un bouton chez la source.
 * La population qui vote n'a aucune raison d'être celle qui détient, et rien ne
 * garantit qu'un vote corresponde à une position réelle.
 *
 * Posé sans mention au milieu de chiffres sourcés, ce pourcentage se lirait comme
 * eux. La ligne d'explication n'est donc pas une politesse : elle est la condition
 * pour que ce chiffre puisse être affiché du tout (§5). Si elle gêne un jour la mise
 * en page, c'est le panneau qui part, pas la mention.
 *
 * ── LA BARRE EST À DEUX SEGMENTS, PAS À UN ────────────────────────────────────
 *
 * Une jauge simple remplie à 31 % se lit « faible ». Or il n'y a pas de « faible »
 * ici : 31 % de haussiers, c'est 69 % de baissiers, et les deux camps existent
 * également. Deux segments accolés disent une RÉPARTITION ; une jauge dirait un
 * niveau, ce qui serait un contresens.
 */
export function AssetSentiment({ asset }: { asset: AssetDetail }) {
  const up = asset.sentimentUpPercent
  if (up === undefined) return null

  // Bornage : la source publie parfois 100 ou 0 tout rond, et une valeur hors [0,100]
  // produirait une barre qui déborde de sa piste.
  const upShare = Math.min(Math.max(up, 0), 100)
  const downShare = 100 - upShare

  return (
    <Panel title="Sentiment">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="tabular font-semibold text-up">{formatShare(upShare)}</span>
        <span className="tabular font-semibold text-down">{formatShare(downShare)}</span>
      </div>

      <div
        className="mt-2 flex h-1.5 overflow-hidden rounded-pill"
        role="img"
        aria-label={`${Math.round(upShare)} % de votes haussiers, ${Math.round(downShare)} % de votes baissiers`}
      >
        <div className="h-full bg-up" style={{ width: `${upShare}%` }} />
        <div className="h-full flex-1 bg-down" />
      </div>

      <div className="mt-2 flex items-baseline justify-between gap-3 text-[0.6875rem] text-ink-muted">
        <span>Haussier</span>
        <span>Baissier</span>
      </div>

      <p className="mt-3 text-[0.6875rem] leading-relaxed text-ink-muted">
        Vote des visiteurs de la source, et non une mesure de marché : rien ne garantit
        qu’un vote corresponde à une position détenue.
      </p>
    </Panel>
  )
}
