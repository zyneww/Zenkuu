import { getTranslations } from 'next-intl/server'
import { getPhrase } from '@/lib/content'

import type { AssetClass, AssetDetail } from '@zenkuu/data'
import { ChangeBadge, formatPercent } from '@zenkuu/ui'

import { MetricValue } from '@/components/asset/MetricValue'
import { InfoTip } from '@/components/ui/InfoTip'
import { RailSection } from '@/components/ui/RailSection'
import {
  METRICS,
  extremeMessage,
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
  const phrase = await getPhrase()
  const isForex = assetClass === 'forex'

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
    /*
      `data-rail-group` : point d'accroche de la disposition « pleine largeur », où le
      rail devient une grille. Sans lui, ce groupe entier — fondamentaux, amplitude,
      variations — tombe dans UNE seule cellule et forme une colonne trois fois plus
      haute que ses voisines. L'attribut permet au cadre de le passer en
      `display: contents`, ce qui rend ses trois sections à la grille sans rien changer
      ailleurs. Voir `AssetLayoutFrame`.
    */
    <aside data-rail-group className="space-y-6" aria-label={phrase('Repères chiffrés')}>
      {groups.map(({ group, rows }) => (
        <RailSection key={group} title={phrase(GROUP_TITLES[group])}>
          <dl>
            {rows.map(({ metric, value }) => {
              const message = messageOf(metric)
              const label = t(`${message}.label`)
              const change = metric.readChange?.(asset)

              return (
                <div
                  key={metric.slug}
                  className="group flex items-baseline justify-between gap-1.5 border-b border-border-subtle py-1.5 last:border-0"
                >
                  <dt className="flex min-w-0 flex-1 items-center gap-1">
                    {/*
                      ── LE LIBELLÉ N'EST PLUS UN LIEN ─────────────────────────

                      Chacune des vingt lignes menait à sa page de métrique, sous un
                      soulignement pointillé. Deux défauts en découlaient, et le second
                      est le vrai motif.

                      Le rail devenait une colonne de vingt liens. Sur une page qui en
                      porte déjà une centaine, vingt destinations alignées dans la
                      colonne la plus dense ne se lisent plus comme des portes : elles
                      se lisent comme du texte souligné, et l'œil finit par ignorer le
                      soulignement.

                      Surtout, ces pages n'existent PLUS comme destination de premier
                      plan : le catalogue « Toutes les métriques » a été retiré de la
                      fiche, et un rail qui continuerait de pointer vingt fois vers lui
                      enverrait vers une profondeur que la page ne revendique plus.

                      L'INFOBULLE RESTE, et elle suffit : la question qu'on se pose
                      devant « valorisation diluée » est « qu'est-ce que c'est », à
                      laquelle elle répond sur place — pas « montre-moi sa courbe ».
                    */}
                    <span className="truncate text-xs text-ink-muted">{label}</span>
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
                    {/* ⚠️ LE LIBELLÉ PASSE PAR LA TABLE, ET IL NE LE FAISAIT PAS.

              Il s'écrivait `` `À propos de : ${label}` `` — un gabarit français dans un
              `aria-label`, donc invisible à l'œil et lu tel quel par toute synthèse
              vocale, quelle que soit la langue du site. Relevé sur la page anglaise :
              quinze occurrences de « À propos de : Market cap » sur la seule fiche
              d'actif.

              C'est exactement la famille de défauts que le projet dit avoir éliminée —
              « les libellés passés en attribut ou en ternaire rejoignent la table » —
              et elle avait survécu ici parce qu'un attribut ne se relit jamais. */}
          <InfoTip content={t(`${message}.help`)} label={phrase('À propos de : {nom}').replace('{nom}', label)} />
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
                    metric.changeKind === 'variation' ? (
                      /*
                       * VRAIE VARIATION : colorée, comme chez la référence, qui pose un
                       * pourcentage signé à droite de chaque repère. C'est aujourd'hui
                       * la capitalisation, seule mesure de ce rail dont la source publie
                       * un mouvement sur 24 h — voir la note de son entrée au registre.
                       */
                      <dd className="tabular shrink-0 text-right text-xs">
                        <ChangeBadge value={change} size="sm" />
                      </dd>
                    ) : (
                      /*
                       * Écart au record : il occupe la même colonne parce que c'est là
                       * que l'œil le cherche déjà, mais en GRIS. « −49 % du record » n'est
                       * pas une baisse du jour, c'est une position dans une amplitude ;
                       * le peindre en rouge dirait qu'elle vient de se produire.
                       */
                      <dd className="tabular shrink-0 text-right text-xs text-ink-muted">
                        {formatPercent(change)}
                      </dd>
                    )
                  ) : null}
                </div>
              )
            })}
          </dl>

          {/*
            ── « EXPLORER TOUTES LES MÉTRIQUES » A ÉTÉ RETIRÉ ──────────────────

            Il fermait le dernier groupe et menait au catalogue des dix-sept mesures,
            lequel a quitté la fiche. Un lien de pied de colonne vers une section
            supprimée est la pire des deux options : il subsiste, il attire l'œil, et
            il ne mène plus là où il prétend.

            Les pages de métrique elles-mêmes SUBSISTENT sous
            `/{classe}/{id}/metriques/{slug}`. Ce qui disparaît est leur mise en avant
            depuis ce rail, pas leur existence.

            ⚠️ CETTE NOTE DISAIT « ELLES SONT INDEXÉES ET PARTAGÉES ». C'EST FAUX, ET
            ÇA L'ÉTAIT DÉJÀ QUAND ELLE A ÉTÉ ÉCRITE. Vérifié : aucun lien du site n'y
            mène — la sonde qui pêche les routes dans les liens rendus n'en a trouvé
            aucune — et `app/sitemap.ts` ne les déclare pas. Une page sans lien
            entrant ni entrée de plan n'est pas indexée : un moteur n'a aucun chemin
            pour l'atteindre. Elles ne sont donc joignables qu'en tapant leur adresse.

            Elles ne sont PAS ajoutées au plan de site pour autant : dix-sept mesures
            fois cent actifs font mille sept cents URL très minces, et un plan gonflé
            de pages sans profondeur dessert les pages qui comptent. Le choix à faire
            — les relier depuis la fiche, ou les retirer — revient à l'exploitant ;
            ce qui ne pouvait pas rester, c'est une note qui affirmait le contraire de
            l'état réel.
          */}

        </RailSection>
      ))}
    </aside>
  )
}
