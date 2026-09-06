import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'

import type { AssetClass } from '@zenkuu/data'
import { getAsset } from '@zenkuu/data'
import { EmptyState } from '@zenkuu/ui'

import { ChangeBadge } from '@/components/locale/ChangeBadge'
import { MetricCatalogue } from '@/components/asset/MetricCatalogue'
import { MetricValue } from '@/components/asset/MetricValue'
import {
  METRIC_GROUP_ORDER,
  METRIC_GROUP_TITLES,
  availableMetrics,
  extremeMessage,
  metricHref,
} from '@/lib/asset-metrics'
import { fr } from '@/content/fr'
import { getPhrase } from '@/lib/content'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * LE CATALOGUE DES MÉTRIQUES D'UN ACTIF
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── POURQUOI CETTE PAGE N'EXISTAIT PAS, ET POURQUOI ELLE EXISTE ─────────────
 *
 * Vingt et une pages de métrique sont écrites et servies depuis longtemps. Aucun lien
 * du site n'y menait : la rangée d'onglets le consignait — « il n'y a pas UNE
 * destination mais vingt et une, et aucune n'est canonique » —, et le rail avait perdu
 * ses liens de libellé pour la même raison. Elles n'étaient joignables qu'en tapant
 * leur adresse.
 *
 * Cette page est la destination qui manquait. Elle ne calcule rien de neuf : elle
 * range les mesures DÉJÀ affichées par le rail, dans les mêmes groupes et le même
 * ordre, et donne à chacune son chemin. C'est ce qui la rend tenable — aucun appel
 * supplémentaire, une seule lecture de la fiche, mise en cache comme toutes les
 * autres.
 *
 * ── ELLE N'AFFICHE QUE CE QUI EST RENSEIGNÉ ──────────────────────────────────
 *
 * `availableMetrics` écarte les mesures dont la source ne publie rien pour CET actif :
 * une paire de devises n'a ni offre ni capitalisation. Un catalogue de tirets ferait
 * passer une absence de donnée pour une donnée nulle, et promettrait vingt et une
 * pages dont la moitié répondraient 404 — la page de métrique renvoie un 404 franc
 * quand la valeur manque.
 *
 * ── LA VALEUR EST LÀ, MAIS ELLE N'EST PAS LE SUJET ──────────────────────────
 *
 * Chaque ligne porte son chiffre du jour. Non pour remplacer le rail — il est plus
 * dense et vit à côté du graphique — mais parce qu'un catalogue de noms seuls
 * obligerait à ouvrir vingt et une pages pour savoir laquelle mérite d'être ouverte.
 */
export async function MetricIndexView({ assetClass, id }: { assetClass: AssetClass; id: string }) {
  const [asset, t, phrase] = await Promise.all([
    getAsset(id, assetClass, 'eur'),
    getTranslations('metric'),
    getPhrase(),
  ])

  /* Identifiant inconnu : 404 franc. Il vient de l'URL, donc il se tape à la main, et
     un encadré d'erreur sur une page qui ne décrit aucun actif vaudrait moins qu'une
     réponse honnête. */
  if (!asset.ok && asset.kind === 'notFound') notFound()

  if (!asset.ok) {
    return (
      <EmptyState
        title={fr.asset.notFoundTitle}
        description={asset.reason}
        source={asset.source?.label ?? null}
        tone="warning"
      />
    )
  }

  const data = asset.data
  const isForex = assetClass === 'forex'
  const disponibles = availableMetrics(data)

  const groupes = METRIC_GROUP_ORDER.map((group) => ({
    group,
    rows: disponibles.filter((metric) => metric.group === group),
  })).filter((entry) => entry.rows.length > 0)

  return (
    <div className="space-y-6">
      {/* ⚠️ LE FIL D'ARIANE, LA RANGÉE D'ONGLETS ET LE LOGO ONT QUITTÉ CETTE VUE.

          Elle les rendait elle-même, d'une autre main que l'aperçu : fil plus court, pas
          d'étiquettes, pas d'étoile de suivi. Changer d'onglet remplaçait donc l'identité
          de l'actif par une autre — c'est le défaut que `AssetShell` corrige, en les
          rendant UNE FOIS pour les quatre onglets depuis le `layout.tsx` de la fiche.

          Le titre reste, sans le logo : le bandeau au-dessus porte déjà le logo, le nom
          et les étiquettes. Répéter la vignette à quarante pixels d'elle-même ne dirait
          rien de plus, et c'est aussi ce que fait la référence — son panneau « Metrics »
          ouvre sur un titre nu. */}
      {/* ⚠️ `h2` ET NON `h1`, ET LE RELEVÉ L'A IMPOSÉ. Le bandeau persistant porte déjà
          le `h1` de la page — le nom de l'actif, rendu par `AssetHeadline`. Cette vue en
          posait un second : constaté au navigateur, `document.querySelectorAll('h1')`
          rendait « Bitcoin » ET « Métriques — Bitcoin » sur la même page.

          Le plan du document suit maintenant la structure réelle : l'actif est le titre,
          l'onglet en est une section. C'est aussi celle de la référence, dont le panneau
          s'intitule « All metrics » sous un bandeau qui nomme le projet.

          Le nom de l'actif quitte l'intitulé pour la même raison : il est écrit trois
          lignes plus haut, en gros. Le `<title>` de l'onglet de navigateur, lui, le
          garde — voir `buildMetricsIndexMetadata`. */}
      <header>
        <h2 className="display-xl text-ink">{phrase('Métriques')}</h2>
        <p className="text-sm text-ink-muted">
          {phrase('Chaque mesure publiée pour cet actif, avec la page qui la détaille.')}
        </p>
      </header>

      {groupes.length === 0 ? (
        <EmptyState
          title={fr.states.unavailableTitle}
          description={phrase('Aucune mesure n’est publiée pour cet actif.')}
          compact
        />
      ) : (
        /* ⚠️ LES VALEURS SONT RENDUES ICI, PAS DANS LE CATALOGUE. `MetricValue` et
           `ChangeBadge` lisent les formateurs de locale, qui sont asynchrones : ce sont
           des composants SERVEUR, et le catalogue est un composant client (il tient les
           onglets de filtre). Les nœuds voyagent donc déjà rendus, en propriété — c'est
           la « fente » habituelle entre les deux mondes, et elle évite de rapatrier toute
           la mécanique de formatage côté navigateur. */
        <MetricCatalogue
          groups={groupes.map(({ group, rows }) => ({
            key: group,
            label: phrase(METRIC_GROUP_TITLES[group]),
            cards: rows.map((metric) => {
              const message =
                metric.message === 'ath' || metric.message === 'atl'
                  ? extremeMessage(metric.message, assetClass)
                  : metric.message
              const value = metric.read(data)

              return {
                slug: metric.slug,
                label: t(`${message}.label`),
                help: t(`${message}.help`),
                href: metricHref(assetClass, data.id, metric.slug),
                value:
                  metric.kind === 'change' ? (
                    <ChangeBadge value={Number(value)} size="sm" />
                  ) : value !== undefined ? (
                    <MetricValue metric={metric} value={value} asset={data} isForex={isForex} />
                  ) : null,
              }
            }),
          }))}
        />
      )}
    </div>
  )
}
