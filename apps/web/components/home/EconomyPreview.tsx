import { MACRO_INDICATORS, getMacroIndicator, type MacroObservation } from '@zenkuu/data'
import { EmptyState, SourceNote } from '@zenkuu/ui'

import { Link } from '@/i18n/navigation'

/**
 * Pays mis en avant dans l'aperçu.
 *
 * Une SÉLECTION, et il faut l'assumer comme telle : la Banque mondiale publie plus de
 * deux cents pays, dont l'immense majorité n'intéresse pas un lecteur venu voir des
 * cours. Les huit retenus sont les grandes économies dont les marchés sont couverts
 * ailleurs sur ce site — la France d'abord, le site étant publié en français.
 *
 * Le TRI est celui de cette liste, pas celui des valeurs. Classer par inflation
 * décroissante ferait remonter des pays en crise monétaire et transformerait un
 * aperçu en palmarès, ce qui n'est pas la question posée ici. La carte complète, elle,
 * classe et compare.
 */
const FEATURED = ['FRA', 'DEU', 'GBR', 'USA', 'JPN', 'CHN', 'IND', 'BRA'] as const

/**
 * ÉCONOMIE — l'aperçu qui renvoie vers la carte macroéconomique.
 *
 * ── CE QUE CE BLOC N'EST PAS ─────────────────────────────────────────────────
 *
 * Ce n'est pas une carte miniature. TradingView place une choroplèthe réduite à cet
 * endroit, et la reproduire ici serait un contresens : une carte du monde haute de
 * deux cents pixels ne se lit pas — les pays y font quelques pixels — et le coût de
 * chargement d'un fond de carte serait payé par tous les visiteurs de l'accueil, y
 * compris ceux qui ne descendent jamais jusque-là.
 *
 * Huit lignes chiffrées disent la même chose en se lisant réellement, et la carte
 * garde son intérêt là où elle en a un : sur sa propre page, en pleine largeur.
 *
 * ── UN SEUL INDICATEUR ───────────────────────────────────────────────────────
 *
 * L'inflation, parce que c'est celle qui explique le plus directement ce que font les
 * marchés — taux, devises, obligations. Les cinq indicateurs sont sur `/macro` ; en
 * charger cinq ici coûterait cinq appels à une source dont on sait qu'elle répond par
 * à-coups, pour un bloc de fin de page.
 */
export async function EconomyPreview() {
  const indicator = MACRO_INDICATORS[0]!
  const result = await getMacroIndicator(indicator.code)

  if (!result.ok) {
    return (
      <EmptyState
        title={`« ${indicator.label} » indisponible pour le moment`}
        /* Le ton reste MESURÉ : ce service public répond 502 sur toutes ses séries
           pendant quelques minutes, puis revient de lui-même. Annoncer une panne
           inquiéterait à tort — et la carte complète reste atteignable. */
        description={`${result.reason} Ce service public répond par à-coups ; la carte complète reste accessible.`}
        source={result.source?.label ?? null}
        tone="warning"
      />
    )
  }

  const byIso = new Map<string, MacroObservation>(
    result.data.map((entry: MacroObservation) => [entry.iso3, entry]),
  )
  const rows = FEATURED.flatMap((iso3) => {
    const entry = byIso.get(iso3)
    return entry ? [entry] : []
  })

  if (rows.length === 0) {
    return <EmptyState title="Aucun pays publié pour cet indicateur" description={null} compact />
  }

  return (
    <div className="space-y-3">
      <div className="rounded-card border border-border-subtle bg-surface">
        <div className="flex items-baseline justify-between gap-3 border-b border-border-subtle px-4 py-3">
          <h3 className="text-sm font-semibold text-ink">
            {indicator.label} <span className="font-normal text-ink-muted">· {indicator.unit}</span>
          </h3>
          <Link
            href="/macro"
            className="shrink-0 text-xs font-medium text-brand transition-colors hover:text-brand-strong"
          >
            Carte complète
          </Link>
        </div>

        <ul className="divide-y divide-border-subtle">
          {rows.map((entry) => (
            <li key={entry.iso3} className="flex items-baseline justify-between gap-3 px-4 py-2">
              <span className="min-w-0 truncate text-xs text-ink">{entry.country}</span>

              <span className="flex shrink-0 items-baseline gap-2">
                {/*
                  L'ANNÉE EST AFFICHÉE, et ce n'est pas un détail d'érudition. Ces
                  séries sont ANNUELLES et publiées à des dates différentes selon les
                  pays : deux lignes voisines peuvent décrire deux moments distincts.
                  Sans l'année, la colonne se lirait comme un relevé simultané, ce
                  qu'elle n'est pas.
                */}
                <span className="tabular text-[0.6875rem] text-ink-muted">{entry.year}</span>
                <span className="tabular text-xs font-medium text-ink">
                  {entry.value.toFixed(1)} {indicator.unit === '%' ? '%' : ''}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      {result.source ? (
        <SourceNote label={result.source.label} href={result.source.attributionUrl} />
      ) : null}
    </div>
  )
}
