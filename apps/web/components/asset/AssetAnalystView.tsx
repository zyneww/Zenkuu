import type { AssetProfile } from '@zenkuu/data'

import { Money } from '@/components/locale/Money'
import { RailSection } from '@/components/ui/RailSection'
import { getPhrase } from '@/lib/content'

/**
 * CONSENSUS D'ANALYSTES — ce qui répond, sur une action, à la question que le
 * « sentiment » pose sur une cryptomonnaie.
 *
 * ── POURQUOI CE BLOC EXISTE ───────────────────────────────────────────────────
 *
 * Le rail d'une cryptomonnaie porte un sondage d'audience : la part de votes
 * haussiers publiée par la source. Le rail d'une action n'avait rien à cet endroit,
 * alors que la question est la même — « qu'en pensent les autres ? » — et que la
 * réponse boursière est d'une autre nature : des professionnels identifiés, qui
 * engagent leur nom et publient un objectif chiffré.
 *
 * ── CE QU'IL FAUT DIRE, ET QUE LA PLUPART DES SITES TAISENT ───────────────────
 *
 * Un objectif de cours n'est pas une valeur attendue. Le consensus des analystes
 * porte un biais haussier structurel et documenté : les recommandations « vendre »
 * sont rares parce qu'elles coûtent l'accès à l'entreprise couverte. Ce bloc affiche
 * donc la RÉPARTITION en entier — y compris les cases vides du côté vendeur, qui
 * disent quelque chose par leur vide — et rappelle en une ligne ce que ces chiffres
 * sont (§5, §7).
 *
 * ── DEUX DÉNOMBREMENTS, ET ILS NE S'ADDITIONNENT PAS ──────────────────────────
 *
 * Le nombre d'opinions derrière l'objectif moyen vient d'un module, la répartition
 * des recommandations d'un autre. Ils diffèrent régulièrement de quelques unités.
 * Les réconcilier serait inventer ; ils sont donc affichés séparément, chacun là où
 * il s'applique.
 */

/** Les cinq degrés, du plus favorable au moins, avec leur teinte de marché. */
const LEVELS = [
  { key: 'strongBuy', label: 'Achat fort', tone: 'bg-[var(--color-up)]' },
  { key: 'buy', label: 'Achat', tone: 'bg-[var(--color-up)]/60' },
  { key: 'hold', label: 'Conserver', tone: 'bg-[var(--color-ink-muted)]/50' },
  { key: 'sell', label: 'Vente', tone: 'bg-[var(--color-down)]/60' },
  { key: 'strongSell', label: 'Vente forte', tone: 'bg-[var(--color-down)]' },
] as const

/** Traduction de la clé de recommandation globale publiée par la source. */
const RECOMMENDATIONS: Record<string, string> = {
  strong_buy: 'Achat fort',
  buy: 'Achat',
  hold: 'Conserver',
  sell: 'Vente',
  strong_sell: 'Vente forte',
  underperform: 'Sous-performance',
  outperform: 'Surperformance',
}

export async function AssetAnalystView({
  profile,
  currency,
  price,
}: {
  profile: AssetProfile | null
  /** Devise de cotation — les objectifs sont publiés dedans. */
  currency: string
  /** Cours courant, pour situer l'objectif moyen. */
  price: number
}) {
  const t = await getPhrase()
  const analyst = profile?.analyst
  if (!analyst) return null

  const distribution = analyst.distribution
  const total = distribution
    ? distribution.strongBuy +
      distribution.buy +
      distribution.hold +
      distribution.sell +
      distribution.strongSell
    : 0

  /*
   * Écart entre l'objectif moyen et le cours du jour.
   *
   * C'est la seule lecture utile du chiffre : « 245 $ » ne dit rien sans savoir d'où
   * l'on part. Le pourcentage n'est PAS une prévision de rendement — il mesure la
   * distance entre une opinion et un fait, ce que la note sous le bloc précise.
   */
  const upside =
    analyst.targetMean !== undefined && price > 0
      ? ((analyst.targetMean - price) / price) * 100
      : null

  if (!distribution && analyst.targetMean === undefined) return null

  return (
    <RailSection title={t('Consensus d’analystes')}>
      {analyst.recommendation ? (
        <p className="mb-2 text-sm font-semibold text-ink">
          {RECOMMENDATIONS[analyst.recommendation] ?? analyst.recommendation}
          {total > 0 ? (
            <span className="ml-1.5 text-xs font-normal text-ink-muted">
              sur {total} avis
            </span>
          ) : null}
        </p>
      ) : null}

      {distribution && total > 0 ? (
        <>
          {/*
            Barre empilée plutôt que cinq lignes chiffrées : la question qu'on se pose
            en un coup d'œil est « ça penche de quel côté », pas « combien exactement ».
            Les nombres restent lisibles juste en dessous.
          */}
          <div
            className="flex h-1.5 w-full overflow-hidden rounded-pill"
            role="img"
            aria-label={LEVELS.map(
              (level) => `${level.label} : ${distribution[level.key]}`,
            ).join(', ')}
          >
            {LEVELS.map((level) => {
              const count = distribution[level.key]
              if (count === 0) return null
              return (
                <span
                  key={level.key}
                  className={level.tone}
                  style={{ width: `${(count / total) * 100}%` }}
                />
              )
            })}
          </div>

          <dl className="mt-2">
            {LEVELS.map((level) => (
              <div
                key={level.key}
                className="flex items-baseline justify-between gap-2 border-b border-border-subtle py-1 last:border-0"
              >
                <dt className="flex items-center gap-1.5 text-xs text-ink-muted">
                  <span
                    aria-hidden="true"
                    className={`h-1.5 w-1.5 shrink-0 rounded-pill ${level.tone}`}
                  />
                  {level.label}
                </dt>
                {/* Un zéro s'affiche ICI, contrairement à la règle habituelle du site,
                    et c'est délibéré : « 0 vente forte » est un FAIT publié par la
                    source, pas une donnée manquante. C'est même l'information la plus
                    parlante du bloc — voir l'en-tête sur le biais du consensus. */}
                <dd className="tabular shrink-0 text-xs font-medium text-ink">
                  {distribution[level.key]}
                </dd>
              </div>
            ))}
          </dl>
        </>
      ) : null}

      {analyst.targetMean !== undefined ? (
        <div className="mt-3 space-y-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-xs text-ink-muted">{t('Objectif moyen')}</span>
            <span className="tabular text-xs font-medium text-ink">
              <Money value={analyst.targetMean} from={currency} />
            </span>
          </div>

          {upside !== null ? (
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-xs text-ink-muted">{t('Écart au cours')}</span>
              <span
                className={`tabular text-xs font-medium ${
                  upside >= 0 ? 'text-up' : 'text-down'
                }`}
              >
                {upside >= 0 ? '+' : ''}
                {upside.toFixed(1).replace('.', ',')} %
              </span>
            </div>
          ) : null}

          {analyst.targetLow !== undefined && analyst.targetHigh !== undefined ? (
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-xs text-ink-muted">{t('Fourchette')}</span>
              <span className="tabular text-xs text-ink-muted">
                <Money value={analyst.targetLow} from={currency} /> —{' '}
                <Money value={analyst.targetHigh} from={currency} />
              </span>
            </div>
          ) : null}

          {analyst.count !== undefined ? (
            <p className="text-micro leading-snug text-ink-muted opacity-80">
              {analyst.count} opinion{analyst.count > 1 ? 's' : ''} retenue
              {analyst.count > 1 ? 's' : ''} pour l’objectif
            </p>
          ) : null}
        </div>
      ) : null}

      <p className="mt-3 text-micro leading-snug text-ink-muted">
        {t('Opinions de bureaux d’analyse, pas une prévision. Le consensus penche structurellement à l’achat : les recommandations de vente y sont rares.')}
      </p>
    </RailSection>
  )
}
