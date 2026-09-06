import { getTranslations } from 'next-intl/server'
import { getPhrase } from '@/lib/content'

import type { AssetClass, AssetDetail } from '@zenkuu/data'
import { ChangeBadge } from '@/components/locale/ChangeBadge'

import { MetricValue } from '@/components/asset/MetricValue'
import { InfoTip } from '@/components/ui/InfoTip'
import { RailSection } from '@/components/ui/RailSection'
import { getFormatters } from '@/lib/formatters'
import { Link } from '@/i18n/navigation'
import {
  METRICS,
  METRIC_GROUP_ORDER,
  METRIC_GROUP_TITLES,
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

/* L'ordre et les intitulés vivent au registre depuis que le catalogue des métriques
   les lit lui aussi — voir `METRIC_GROUP_TITLES`. Deux copies auraient divergé. */

export async function AssetMetricRail({
  asset,
  assetClass,
  groups: requested = METRIC_GROUP_ORDER,
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
  const nombres = await getFormatters()

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
    /* ⚠️ `space-y-2` ET NON 6 — LES GROUPES ONT REPRIS LEUR BORD, LE BLANC PEUT RENDRE.

       Vingt-quatre pixels séparaient deux listes nues, faute de quoi elles n'en
       faisaient qu'une de vingt lignes (voir la note d'origine de `RailSection`).
       Les groupes portant de nouveau une carte, la frontière est géométrique et le
       blanc n'a plus à la porter seul : huit pixels suffisent, et c'est l'écart que
       la référence met entre les blocs de sa colonne. Les seize pixels rendus
       financent le rembourrage des cartes — voir l'arithmétique dans `RailSection`.

       ⚠️ COMMENTAIRE NU ET NON `{​/* … *​/}`, comme les autres commentaires de ce
       fichier placés en position d'expression : à l'intérieur d'un `return (…)`, les
       accolades ouvriraient une SECONDE expression là où une seule est admise. C'est
       l'erreur qui a mis la page en 500 au premier essai de ce changement, et le
       fichier la documentait déjà ailleurs — je l'ai refaite quand même. */
    <aside data-rail-group className="space-y-2" aria-label={phrase('Repères chiffrés')}>
      {groups.map(({ group, rows }) => (
        <RailSection key={group} title={phrase(METRIC_GROUP_TITLES[group])}>
          <dl>
            {rows.map(({ metric, value }) => {
              const message = messageOf(metric)
              const label = t(`${message}.label`)
              const change = metric.readChange?.(asset)

              return (
                <div
                  key={metric.slug}
                  /* ── LA GÉOMÉTRIE DE LIGNE EST CELLE DE LA RÉFÉRENCE ──────────
                     `flex justify-between py-3`, filet entre deux lignes et non sous
                     chacune — relevé sur `coingecko.com/en/coins/hyperliquid` le
                     2026-09-06 en remontant les ancêtres de « Market Cap ».

                     `py-1.5` (6 px) devient `py-3` (12 px). Le doublement se paie en
                     hauteur, et il est financé par le retrait des cartes du rail :
                     quatre cartes rendaient une centaine de pixels, vingt lignes en
                     reprennent cent vingt. Le rail finit à peu près où il finissait,
                     avec des lignes deux fois plus aérées. */
                  className="group flex items-baseline justify-between gap-1.5 border-b border-border-subtle py-3 last:border-0"
                >
                  <dt className="flex min-w-0 flex-1 items-center gap-1">
                    {/*
                      ── LE LIBELLÉ REDEVIENT UN LIEN, SANS REDEVENIR SOULIGNÉ ─────

                      Il l'avait été, puis ne l'était plus, et la note qui expliquait
                      le retrait tenait en deux arguments. Le premier — « le rail
                      devient une colonne de vingt textes soulignés, et l'œil finit
                      par ignorer le soulignement » — vise le SOULIGNEMENT PERMANENT,
                      pas le lien : il ne revient pas. La destination ne se signale
                      qu'à l'approche, par la couleur et par le trait, comme partout
                      ailleurs sur le site.

                      Le second — « ces pages n'existent plus comme destination de
                      premier plan » — n'est plus vrai : la fiche porte de nouveau un
                      onglet « Métriques », et son catalogue est exactement l'endroit
                      où ces vingt pages sont revendiquées.

                      L'INFOBULLE RESTE À CÔTÉ, et les deux ne font pas doublon : elle
                      répond à « qu'est-ce que c'est » sans quitter la page, le lien à
                      « montre-moi son évolution ». C'est la distinction que la
                      référence fait aussi.
                    */}
                    {/* ⚠️ 14/20/500 ET NON 13/18/400, ET LA MESURE A DÛ ÊTRE REFAITE.
                        Un premier relevé donnait ces lignes à 12/20/500 pour le libellé
                        et 13/18,5/400 pour la valeur — il avait attrapé deux éléments
                        qui ne sont pas ceux-là (une borne d'amplitude et un nœud masqué).
                        Repris par géométrie sur la colonne gauche de la fiche Bitcoin de
                        CoinGecko, le 4 septembre 2026 : « Market Cap », « Fully Diluted
                        Valuation », « 24 Hour Trading Vol », « Circulating Supply »,
                        « Total Supply » et « Max Supply » sortent TOUTES en 14/20/500,
                        encre atténuée. Leurs valeurs sortent en 14/20/600. */}
                    <Link
                      href={metricHref(assetClass, asset.id, metric.slug)}
                      className="truncate text-sm font-medium text-ink-muted transition-colors hover:text-brand-strong hover:underline"
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
                    /* ⚠️ `text-ink-secondary` ET NON `text-ink` — LA RÉFÉRENCE MET
                       SON ENCRE PLEINE AILLEURS. Ses valeurs de repère sortent en
                       `#334155` (slate-700), quand `#0f172a` est réservé au nom de
                       l'actif et au cours. C'est ce qui fait que la colonne ne
                       concurrence pas le grand chiffre qui la surmonte. */
                    <dd className="tabular shrink-0 text-sm font-semibold text-ink-secondary">
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
                        {nombres.percent(change)}
                      </dd>
                    )
                  ) : null}
                </div>
              )
            })}
          </dl>

          {/*
            ── PAS DE LIEN « TOUTES LES MÉTRIQUES » EN PIED DE COLONNE ────────

            Il y en a eu un ; il menait au catalogue, lequel avait quitté la fiche. Le
            catalogue est revenu — `/{classe}/{id}/metriques` — mais il se rejoint par
            l'ONGLET, en haut de page, pas par un lien au pied de la quatrième carte
            d'une colonne qu'il faut dérouler pour atteindre.

            ⚠️ CETTE NOTE DISAIT QUE CES PAGES N'ÉTAIENT JOIGNABLES QU'EN TAPANT LEUR
            ADRESSE. Ce n'est plus vrai : chaque libellé de ce rail mène désormais à la
            sienne, et l'onglet mène au catalogue qui les liste toutes. Le constat
            était juste quand il a été écrit — la sonde qui pêche les routes dans les
            liens rendus n'en trouvait aucune —, il ne l'est plus.

            Elles ne sont toujours PAS déclarées dans `app/sitemap.ts`, et cette
            décision-là ne change pas : vingt et une mesures fois cent actifs font deux
            mille URL très minces, et un plan gonflé de pages sans profondeur dessert
            les pages qui comptent. Un lien entrant suffit à les rendre atteignables
            par un robot ; c'est ce qui manquait, pas une entrée de plan.
          */}

        </RailSection>
      ))}
    </aside>
  )
}
