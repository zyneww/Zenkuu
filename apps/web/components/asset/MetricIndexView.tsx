import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'

import type { AssetClass } from '@zenkuu/data'
import { getAsset } from '@zenkuu/data'
import { EmptyState } from '@zenkuu/ui'

import { AssetLogo } from '@/components/asset/AssetLogo'
import { AssetTabs } from '@/components/asset/AssetTabs'
import { ChangeBadge } from '@/components/locale/ChangeBadge'
import { MetricValue } from '@/components/asset/MetricValue'
import { Link } from '@/i18n/navigation'
import { assetHref, marketHref } from '@/lib/asset-routes'
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
      <nav aria-label={phrase('Fil d’Ariane')} className="text-xs text-ink-muted">
        <Link href={marketHref(assetClass)} className="transition-colors hover:text-ink">
          {fr.assetClass[assetClass]}
        </Link>
        <span className="mx-1.5" aria-hidden="true">
          /
        </span>
        <Link href={assetHref(assetClass, data.id)} className="transition-colors hover:text-ink">
          {data.name}
        </Link>
        <span className="mx-1.5" aria-hidden="true">
          /
        </span>
        <span className="text-ink">{phrase('Métriques')}</span>
      </nav>

      {/* La même rangée que sur la fiche, avec CETTE page pour onglet actif — sans
          elle, on arrive ici par un onglet et il ne reste que le fil d'Ariane pour
          repartir. Voir `AssetTabs`. */}
      <AssetTabs assetClass={assetClass} id={data.id} active="metriques" />

      <header className="flex items-center gap-3">
        <AssetLogo asset={data} size={40} />
        <div>
          <h1 className="display-xl text-ink">
            {phrase('Métriques')} — {data.name}
          </h1>
          <p className="text-sm text-ink-muted">
            {phrase('Chaque mesure publiée pour cet actif, avec la page qui la détaille.')}
          </p>
        </div>
      </header>

      {groupes.length === 0 ? (
        <EmptyState
          title={fr.states.unavailableTitle}
          description={phrase('Aucune mesure n’est publiée pour cet actif.')}
          compact
        />
      ) : (
        /* Deux colonnes au-delà du téléphone : quatre groupes empilés feraient une
           page à faire défiler pour une liste qui tient sur un écran. */
        <div className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-2">
          {groupes.map(({ group, rows }) => (
            <section key={group}>
              <h2 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                {phrase(METRIC_GROUP_TITLES[group])}
              </h2>

              {/* ⚠️ UNE LISTE, PAS UNE LISTE DE DÉFINITIONS. Le rail est un `<dl>` :
                  il POSE des couples terme/valeur, et rien n'y est cliquable en
                  entier. Ici chaque rangée est un LIEN, et un `<a>` ne peut pas
                  contenir le `<dt>`/`<dd>` d'un `<dl>` — la spécification n'autorise
                  entre eux qu'un `<div>`. Un catalogue de destinations est une liste
                  de liens ; la valeur y accompagne le nom, elle ne le définit pas. */}
              <ul>
                {rows.map((metric) => {
                  const message =
                    metric.message === 'ath' || metric.message === 'atl'
                      ? extremeMessage(metric.message, assetClass)
                      : metric.message
                  const value = metric.read(data)

                  return (
                    <li key={metric.slug} className="border-b border-border-subtle last:border-0">
                      {/* ── LA LIGNE ENTIÈRE EST LE LIEN, PAS LE SEUL LIBELLÉ ──────
                          C'est un catalogue : chaque ligne n'a qu'une destination, et
                          la cible tient alors toute la hauteur de la rangée plutôt
                          qu'un mot. La même géométrie que le rail — `flex
                          justify-between py-3`, filet entre deux lignes — pour qu'on
                          reconnaisse ici ce qu'on a lu là-bas. */}
                      <Link
                        href={metricHref(assetClass, data.id, metric.slug)}
                        className="flex items-baseline justify-between gap-2 py-3 transition-colors hover:text-brand-strong"
                      >
                        <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink-muted">
                          {t(`${message}.label`)}
                        </span>
                        <span className="tabular shrink-0 text-sm font-semibold text-ink-secondary">
                          {metric.kind === 'change' ? (
                            <ChangeBadge value={Number(value)} size="sm" />
                          ) : value !== undefined ? (
                            <MetricValue
                              metric={metric}
                              value={value}
                              asset={data}
                              isForex={isForex}
                            />
                          ) : null}
                        </span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
