import type { AssetDetail } from '@zenkuu/data'
import { formatCompact } from '@zenkuu/ui'

import { RailSection } from '@/components/ui/RailSection'
import { getPhrase } from '@/lib/content'

/**
 * Audience et activité de développement.
 *
 * ── DEUX BLOCS DANS UNE SEULE CARTE, ET C'EST UN CHOIX ────────────────────────
 *
 * Abonnés et commits n'ont rien à voir : l'un mesure une attention, l'autre un
 * travail. Ils partagent pourtant la même carte parce qu'ils répondent à la même
 * question, celle qu'aucun chiffre de marché ne traite — « y a-t-il quelqu'un
 * derrière ? ». Un jeton dont le cours monte sans compte social ni dépôt vivant ne
 * raconte pas la même histoire qu'un jeton au même cours suivi par cent mille
 * personnes et commité chaque semaine.
 *
 * Deux cartes séparées auraient dispersé cette lecture sur deux blocs de trois
 * lignes, dont chacun est trop maigre pour exister seul.
 *
 * ── CE QUE CES CHIFFRES NE DISENT PAS ─────────────────────────────────────────
 *
 * Des abonnés s'achètent, et des commits se fabriquent. Ces mesures sont des
 * indices d'activité, pas des preuves de qualité, et la fiche ne les présente jamais
 * comme un jugement — pas de seuil, pas de note, pas de code couleur. Les nombres
 * bruts, et le lecteur conclut.
 *
 * Chaque ligne dont la source n'a rien publié DISPARAÎT (voir `positive` dans
 * l'adaptateur CoinGecko) : un « 0 abonné » ferait lire un échec là où il n'y a
 * qu'un projet sans ce réseau.
 */
export async function AssetCommunity({ asset }: { asset: AssetDetail }) {
  const t = await getPhrase()
  const community = asset.community
  const developer = asset.developer

  const rows: { label: string; value: number; hint?: string }[] = []

  if (community?.twitterFollowers !== undefined) {
    rows.push({ label: t('Abonnés X'), value: community.twitterFollowers })
  }
  if (community?.redditSubscribers !== undefined) {
    rows.push({ label: t('Membres Reddit'), value: community.redditSubscribers })
  }
  if (community?.telegramUsers !== undefined) {
    rows.push({ label: t('Membres Telegram'), value: community.telegramUsers })
  }

  const devRows: { label: string; value: number; hint?: string }[] = []

  if (developer?.stars !== undefined) devRows.push({ label: t('Étoiles'), value: developer.stars })
  if (developer?.forks !== undefined) devRows.push({ label: t('Bifurcations'), value: developer.forks })
  if (developer?.contributors !== undefined) {
    devRows.push({ label: t('Contributeurs'), value: developer.contributors })
  }
  if (developer?.commits4Weeks !== undefined) {
    devRows.push({
      label: t('Commits'),
      value: developer.commits4Weeks,
      // La seule ligne du lot qui mesure un RYTHME et non un cumul. Sans cette
      // précision, « 312 » se lirait comme un total depuis l'origine du projet.
      hint: t('4 sem.'),
    })
  }
  if (developer?.issuesOpen !== undefined) {
    devRows.push({ label: t('Tickets ouverts'), value: developer.issuesOpen })
  }

  if (rows.length === 0 && devRows.length === 0) return null

  return (
    <RailSection title={t('Communauté et code')}>
      {rows.length > 0 ? <StatList rows={rows} /> : null}

      {devRows.length > 0 ? (
        <>
          {rows.length > 0 ? (
            <p className="mb-1.5 mt-4 text-micro font-semibold uppercase tracking-wide text-ink-muted">
              {t('Dépôt public')}
            </p>
          ) : null}
          <StatList rows={devRows} />
        </>
      ) : null}
    </RailSection>
  )
}

function StatList({ rows }: { rows: { label: string; value: number; hint?: string }[] }) {
  return (
    <dl>
      {rows.map((row) => (
        <div
          key={row.label}
          className="flex items-baseline justify-between gap-1.5 border-b border-border-subtle py-1.5 last:border-0"
        >
          <dt className="min-w-0 flex-1 truncate text-xs text-ink-muted">
            {row.label}
            {row.hint ? <span className="ml-1 opacity-60">· {row.hint}</span> : null}
          </dt>
          <dd className="tabular shrink-0 text-xs font-medium text-ink">
            {formatCompact(row.value)}
          </dd>
        </div>
      ))}
    </dl>
  )
}
