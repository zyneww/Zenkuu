import type { MarketAsset } from '@zenith/data'
import { ChangeBadge } from '@zenith/ui'

/**
 * Bandeau de synthèse au-dessus d'un classement.
 *
 * Reprise structurelle : une page de cotation situe le marché avant de dérouler ses
 * lignes. Sans ce repère, le lecteur voit une variation sans savoir si elle va dans
 * le sens du marché ou contre lui.
 *
 * Choix déterminant : ces chiffres sont calculés sur les actifs DÉJÀ CHARGÉS, sans
 * aucun appel supplémentaire. Interroger un agrégat global coûterait une requête de
 * plus par page sur un quota mesuré à cinq par minute. La contrepartie est que la
 * portée doit être annoncée — d'où le libellé explicite, qui vaut mieux qu'un
 * « Marché » vague suggérant une exhaustivité fausse (§5).
 */
export function MarketStatsStrip({
  assets,
  scopeLabel,
}: {
  assets: MarketAsset[]
  scopeLabel: string
}) {
  const withChange = assets.filter((asset) => asset.change24h !== undefined)
  if (withChange.length === 0) return null

  const gainers = withChange.filter((asset) => (asset.change24h ?? 0) > 0).length
  const losers = withChange.filter((asset) => (asset.change24h ?? 0) < 0).length
  const average =
    withChange.reduce((sum, asset) => sum + (asset.change24h ?? 0), 0) / withChange.length

  return (
    // `<dl>` et non `<section>` : les cellules sont des paires libellé/valeur, et
    // `<dt>`/`<dd>` n'ont de sens qu'à l'intérieur d'une liste de définitions. Le
    // choix est structurel, pas décoratif — c'est ce qui permet à un lecteur d'écran
    // d'annoncer « Actifs affichés : 50 » plutôt que deux fragments sans lien.
    <dl
      aria-label="Synthèse de la sélection affichée"
      className="grid grid-cols-2 gap-px overflow-hidden rounded-card border border-border-subtle bg-border-subtle sm:grid-cols-4"
    >
      <Cell label="Actifs affichés" value={String(assets.length)} />
      <Cell label="Variation moyenne 24 h" node={<ChangeBadge value={average} size="sm" />} />
      <Cell label="En hausse" value={String(gainers)} tone="up" />
      <Cell label="En baisse" value={String(losers)} tone="down" />

      <div className="col-span-2 bg-surface px-3 py-2 sm:col-span-4">
        <p className="text-[0.6875rem] text-ink-muted">
          Calculé sur {scopeLabel}, pas sur l’ensemble du marché.
        </p>
      </div>
    </dl>
  )
}

function Cell({
  label,
  value,
  node,
  tone,
}: {
  label: string
  value?: string
  node?: React.ReactNode
  tone?: 'up' | 'down'
}) {
  return (
    <div className="bg-surface px-3 py-2.5">
      <dt className="text-[0.6875rem] text-ink-muted">{label}</dt>
      <dd
        className={`mt-0.5 text-sm font-semibold ${
          tone === 'up' ? 'text-up' : tone === 'down' ? 'text-down' : 'text-ink'
        }`}
      >
        {node ?? value}
      </dd>
    </div>
  )
}
