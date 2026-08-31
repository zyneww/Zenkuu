import type { AssetProfile } from '@zenkuu/data'
import { formatCompact, formatShare } from '@zenkuu/ui'

import { Panel } from '@/components/ui/Panel'
import { getPhrase } from '@/lib/content'

/**
 * RÉPARTITION DU CAPITAL — qui détient l'entreprise.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * CETTE SECTION REMPLACE UN AVEU D'IGNORANCE, ET SEULEMENT LÀ OÙ IL ÉTAIT FAUX
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * L'onglet Écosystème portait un encadré « Détentions institutionnelles — non
 * publiées par nos sources ». Le texte était honnête et il reste exact POUR LA
 * CRYPTO : ni CoinGecko sur son palier gratuit, ni Binance ne publient les trésoreries
 * d'entreprise exposées à un jeton.
 *
 * Il était faux pour la bourse. La donnée existe, elle est réglementaire, et elle
 * voyage dans la même requête que les ratios déjà chargés — nous ne l'avions
 * simplement pas demandée. L'encadré d'absence reste donc en place partout où il dit
 * vrai, et cède la place ici.
 *
 * ── CE QUE CES CHIFFRES DISENT, ET CE QU'ILS NE DISENT PAS ───────────────────
 *
 * Ils viennent de déclarations TRIMESTRIELLES : une position déclarée au 30 juin peut
 * avoir été soldée depuis. La date accompagne donc chaque ligne — non par souci
 * d'exhaustivité, mais parce qu'un tableau de détenteurs sans date se lit comme un
 * état du jour, ce qu'il n'est jamais.
 *
 * La part des initiés mérite une lecture prudente dans l'autre sens : elle est
 * structurellement élevée chez un fondateur encore présent, et basse chez une société
 * ancienne. Elle ne dit ni confiance ni défiance, seulement une structure.
 */
export async function AssetOwnership({
  profile,
  assetName,
}: {
  profile: AssetProfile
  assetName: string
}) {
  const t = await getPhrase()
  const ownership = profile.ownership
  if (!ownership) return null

  const holders = ownership.topInstitutions ?? []
  const hasBreakdown =
    ownership.insidersPercent !== undefined || ownership.institutionsPercent !== undefined

  if (!hasBreakdown && holders.length === 0) return null

  /*
   * Le RESTE se calcule, il n'est pas publié.
   *
   * La source donne la part des initiés et celle des institutions ; ce qui manque pour
   * atteindre cent est le public — actionnaires individuels et détenteurs non
   * déclarants. Le nommer vaut mieux que de laisser une somme qui ne tombe pas juste,
   * et le déduire est ici légitime : c'est une soustraction, pas une estimation.
   */
  const known = (ownership.insidersPercent ?? 0) + (ownership.institutionsPercent ?? 0)
  const publicShare = hasBreakdown && known < 100 ? 100 - known : undefined

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className="display-sm text-ink">{t('Répartition du capital')}</h2>
        <p className="max-w-3xl text-xs leading-relaxed text-ink-muted">
          {t(
            'Qui détient {nom}, d’après les déclarations réglementaires. Elles sont trimestrielles : une position affichée ici a pu changer depuis sa date de dépôt.',
          ).replace('{nom}', assetName)}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
        {hasBreakdown ? (
          <Panel
            title={t('Structure')}
            {...(ownership.institutionsCount !== undefined
              ? { subtitle: `${formatCompact(ownership.institutionsCount)} institutions déclarantes` }
              : {})}
          >
            <dl>
              <Line label="Institutions" value={formatShare(ownership.institutionsPercent)} />
              <Line
                label={t('Initiés')}
                value={formatShare(ownership.insidersPercent)}
                hint="dirigeants et administrateurs"
              />
              <Line
                label="Public"
                value={formatShare(publicShare)}
                hint={t('par différence, non déclaré comme tel')}
              />
            </dl>
          </Panel>
        ) : null}

        {holders.length > 0 ? (
          <Panel
            title={t('Principaux détenteurs institutionnels')}
            subtitle={t('Dix premières lignes déclarées')}
          >
            <ol className="space-y-1.5">
              {holders.map((holder, index) => (
                <li key={`${holder.name}-${index}`} className="space-y-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0 truncate text-xs text-ink">{holder.name}</span>
                    <span className="tabular shrink-0 text-xs font-medium text-ink">
                      {formatShare(holder.percentHeld) ?? '—'}
                    </span>
                  </div>

                  {/*
                    La barre est mise à l'échelle du PREMIER détenteur, pas de cent pour
                    cent. Aucune institution ne dépasse jamais dix pour cent d'une grande
                    capitalisation : rapportées à cent, les dix barres seraient dix traits
                    identiques et invisibles, là où tout l'intérêt est de les comparer
                    entre elles. Même règle que pour les positions d'un fonds.
                  */}
                  <div className="h-1 overflow-hidden rounded-full bg-surface" role="presentation">
                    <div
                      className="h-full rounded-full bg-brand"
                      style={{
                        width: `${Math.max(
                          ((holder.percentHeld ?? 0) / (holders[0]?.percentHeld || 1)) * 100,
                          2,
                        )}%`,
                      }}
                    />
                  </div>

                  <p className="text-micro text-ink-muted">
                    {formatCompact(holder.shares) ?? '—'} titres
                    {holder.reportedAt ? ` · déclaré le ${formatDay(holder.reportedAt)}` : ''}
                  </p>
                </li>
              ))}
            </ol>
          </Panel>
        ) : null}
      </div>
    </section>
  )
}

function Line({
  label,
  value,
  hint,
}: {
  label: string
  value: string | null
  hint?: string
}) {
  if (value === null) return null

  return (
    <div className="border-b border-border-subtle py-1.5 last:border-0">
      <div className="flex items-baseline justify-between gap-2">
        <dt className="min-w-0 flex-1 text-xs text-ink-muted">{label}</dt>
        <dd className="tabular shrink-0 text-xs font-medium text-ink">{value}</dd>
      </div>
      {hint ? (
        <p className="text-micro leading-snug text-ink-muted opacity-80">{hint}</p>
      ) : null}
    </div>
  )
}

function formatDay(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }).format(
    date,
  )
}
