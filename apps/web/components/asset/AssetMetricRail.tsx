import { Link } from '@/i18n/navigation'
import { getTranslations } from 'next-intl/server'

import type { AssetClass, AssetDetail } from '@zenkuu/data'
import { ChangeBadge, formatPercent } from '@zenkuu/ui'

import { MetricValue } from '@/components/asset/MetricValue'
import { InfoTip } from '@/components/ui/InfoTip'
import { Panel } from '@/components/ui/Panel'
import { ASSET_CLASS_SEGMENT } from '@/lib/asset-routes'
import {
  METRICS,
  extremeMessage,
  metricHref,
  type MetricDef,
  type MetricGroup,
} from '@/lib/asset-metrics'

/**
 * Rail de métriques — colonne dense, groupée par thème, chaque ligne explicable et
 * cliquable.
 *
 * ── CHAQUE GROUPE EST UNE CARTE, ET NON PLUS UNE BANDE DU MÊME RUBAN ──────────
 *
 * Les quatre groupes étaient séparés par un titre en petites capitales sur un filet.
 * Ils sont désormais quatre panneaux autonomes (`Panel`), et ce n'est pas un
 * habillage : c'est ce qui rend le rail SCANNABLE. Sur un ruban continu de vingt
 * lignes, tous les filets se valent — celui qui sépare deux lignes d'un même groupe
 * et celui qui sépare deux groupes ont la même épaisseur, et l'œil doit lire les
 * titres pour retrouver les frontières. Quatre cartes posent la frontière dans la
 * GÉOMÉTRIE : un intervalle de fond nu, qu'on voit sans lire.
 *
 * Le coût est réel et mesuré : quatre marges internes de 16px allongent la colonne
 * d'environ 90 pixels. C'est le prix d'une hiérarchie visible, et il se paie une
 * fois — la colonne reste plus courte que les vingt chiffres en bandes horizontales
 * qu'elle a remplacés.
 *
 * ── CE QUI EST REPRIS DE LA RÉFÉRENCE, ET CE QUI NE L'EST PAS ─────────────────
 *
 * Repris : la FORME et son INTERACTION. Une colonne étroite, des lignes serrées
 * « libellé · valeur · variation », des groupes titrés — et surtout, le fait que
 * chaque ligne soit une porte : une infobulle qui dit ce que la mesure signifie, un
 * lien vers une page qui la détaille. C'est ce qui distingue un tableau de bord d'un
 * simple tableau : le lecteur qui ne connaît pas « valorisation diluée » n'a pas à
 * quitter la page pour l'apprendre, et celui qui la connaît peut creuser.
 *
 * Non repris : les métriques elles-mêmes. La référence affiche revenus, TVL
 * on-chain, porteurs, gaz consommé, émissions et rachats — des données propriétaires
 * qu'aucune source gratuite ne publie. Les afficher supposerait de les estimer (§5).
 *
 * ── LES SIX CLASSES D'ACTIFS, UN SEUL COMPOSANT ───────────────────────────────
 *
 * Une paire de devises n'a ni capitalisation ni offre ; un indice n'a pas de volume ;
 * une matière première n'a pas de rang. Le registre (`lib/asset-metrics.ts`) porte la
 * condition de présence de chaque ligne, et un groupe vide disparaît entièrement,
 * titre compris. Un rail de tirets serait pire qu'un rail court : il ferait passer
 * une absence de donnée pour une donnée nulle.
 */

const GROUP_ORDER: MetricGroup[] = ['market', 'range', 'supply', 'change']

const GROUP_TITLES: Record<MetricGroup, string> = {
  // « Fondamentaux » et non plus « Repères de marché ». Le titre précédent décrivait
  // la COLONNE (des repères, dans un rail) ; maintenant que chaque groupe est une
  // carte autonome, il doit décrire SON CONTENU. Capitalisation, volume et
  // valorisation diluée sont les fondamentaux d'un actif, pas des repères.
  market: 'Fondamentaux',
  range: 'Amplitude',
  supply: 'Offre',
  change: 'Variations',
}

export async function AssetMetricRail({
  asset,
  assetClass,
  groups: requested = GROUP_ORDER,
}: {
  asset: AssetDetail
  assetClass: AssetClass
  /**
   * Groupes à rendre, dans l'ordre donné.
   *
   * Sert à CÉDER un groupe à un composant qui le traite mieux — aujourd'hui
   * « Offre », repris par `AssetSupply` sous forme de jauges. Le registre reste la
   * source unique du contenu ; seule la RÉPARTITION entre composants change ici.
   * Une liste de nombres et deux barres de progression racontent la même chose,
   * mais la seconde répond d'un regard à « où en est l'émission ».
   */
  groups?: readonly MetricGroup[]
}) {
  const t = await getTranslations('metric')
  const isForex = assetClass === 'forex'
  const segment = ASSET_CLASS_SEGMENT[assetClass]

  /**
   * Clé de message d'une métrique.
   *
   * Les extrêmes en ont DEUX selon la classe d'actif : Yahoo ne publie pas de record
   * absolu pour les valeurs boursières, son champ `ath` porte en réalité le plus haut
   * des 52 dernières semaines. Le libellé et l'explication changent donc ensemble,
   * plutôt qu'un suffixe collé à un texte resté faux.
   */
  const messageOf = (metric: MetricDef): string =>
    metric.message === 'ath' || metric.message === 'atl'
      ? extremeMessage(metric.message, assetClass)
      : metric.message

  const groups = requested.map((group) => ({
    group,
    rows: METRICS.filter((metric) => metric.group === group)
      .map((metric) => ({ metric, value: metric.read(asset) }))
      .filter((row): row is { metric: MetricDef; value: number | string } => row.value !== undefined),
  })).filter((entry) => entry.rows.length > 0)

  if (groups.length === 0) return null

  return (
    <aside className="space-y-3" aria-label="Repères chiffrés">
      {groups.map(({ group, rows }) => (
        <Panel key={group} title={GROUP_TITLES[group]}>
          <dl>
            {rows.map(({ metric, value }) => {
              const message = messageOf(metric)
              const label = t(`${message}.label`)
              const change = metric.readChange?.(asset)

              return (
                <div
                  key={metric.slug}
                  className="group flex items-baseline justify-between gap-1.5 border-b border-border-subtle/60 py-1.5 last:border-0"
                >
                  <dt className="flex min-w-0 flex-1 items-center gap-1">
                    {/*
                      La ligne entière est un lien, pas seulement le libellé : une
                      cible de clic d'un mot sur une ligne de 250 pixels se rate, et
                      c'est la valeur que l'œil vise en premier de toute façon.
                    */}
                    <Link
                      href={metricHref(segment, asset.id, metric.slug)}
                      // Soulignement POINTILLÉ permanent, repris de la référence : il
                      // annonce « ce libellé s'explique » sans occuper de place, là
                      // où vingt icônes « ⓘ » en colonne feraient une ponctuation.
                      // Il devient CONTINU au survol — la promesse se confirme quand
                      // le lien devient réellement actionnable.
                      className="truncate text-xs text-ink-muted underline decoration-border-subtle decoration-dotted underline-offset-4 transition-colors duration-150 hover:text-brand-strong hover:decoration-solid"
                    >
                      {label}
                    </Link>
                    {/*
                      L'INFOBULLE EST POSÉE EN PERMANENCE, PAS RÉVÉLÉE AU SURVOL.
                     
                      Elle apparaissait à l'approche du curseur, pour éviter qu'une
                      colonne de vingt « ⓘ » ne fasse un rail de ponctuation. Le
                      raisonnement se retournait contre lui : une aide qui n'existe
                      qu'une fois qu'on a trouvé la ligne n'aide personne à la
                      trouver, et son apparition soudaine déplaçait le regard au
                      moment précis où il se posait sur la valeur.
                     
                      Elle est donc là dès le premier coup d'œil, sans enveloppe qui
                      la fasse varier : `InfoTip` porte déjà sa teinte discrète et son
                      renfort au survol de l'icône elle-même. Le bruit que le masquage
                      cherchait à éviter est réglé par la taille — 14 pixels, la
                      hauteur d'x du libellé qu'elle suit — et non par l'effacement.
                    */}
                    <InfoTip content={t(`${message}.help`)} label={`À propos de : ${label}`} />
                  </dt>

                  {metric.kind !== 'change' ? (
                    <dd className="tabular shrink-0 text-xs font-medium text-ink">
                      <MetricValue metric={metric} value={value} asset={asset} isForex={isForex} />
                    </dd>
                  ) : null}

                  {metric.kind === 'change' ? (
                    <dd className="tabular shrink-0 text-right text-xs">
                      <ChangeBadge value={Number(value)} size="sm" />
                    </dd>
                  ) : change !== undefined ? (
                    // Écart au record : il occupe la colonne de variation parce que
                    // c'est là que l'œil le cherche déjà, mais en gris — ce n'est pas
                    // une variation du cours, c'est une distance à un extrême.
                    <dd className="tabular shrink-0 text-right text-xs text-ink-muted">
                      {formatPercent(change)}
                    </dd>
                  ) : null}
                </div>
              )
            })}
          </dl>
        </Panel>
      ))}
    </aside>
  )
}
