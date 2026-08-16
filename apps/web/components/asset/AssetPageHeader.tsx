import { getTranslations } from 'next-intl/server'

import type { AssetClass, AssetDetail } from '@zenkuu/data'
import { ChangeBadge, formatDateTime } from '@zenkuu/ui'

import { AssetBenchmarkRatio } from '@/components/asset/AssetBenchmarkRatio'
import { AssetLogo } from '@/components/asset/AssetLogo'
import { AssetRangeBar } from '@/components/asset/AssetRangeBar'

/**
 * EN-TÊTE DE FICHE, PLEINE LARGEUR.
 *
 * ── POURQUOI L'IDENTITÉ REMONTE HORS DU RAIL ──────────────────────────────────
 *
 * Elle vivait en tête de la colonne de gauche, avec les chiffres. Le raisonnement
 * d'alors était juste sur un point — le rail met les chiffres à hauteur d'œil, à côté
 * de la courbe — et faux sur un autre : il en a conclu que l'IDENTITÉ devait suivre
 * les chiffres dans la colonne.
 *
 * Or une colonne de 288 pixels impose sa loi à ce qu'on y met. Le nom de l'actif,
 * qui est le `<h1>` de la page, y tenait en 18 pixels — la taille d'un sous-titre de
 * section. Sur la même page, le titre « Toutes les métriques » d'une sous-section de
 * l'onglet Analyse était plus gros que le nom de l'actif. La hiérarchie visuelle
 * disait donc l'inverse de la hiérarchie réelle.
 *
 * La référence pose l'identité EN PLEINE LARGEUR au-dessus de tout, et le rail
 * commence dessous, avec les seuls chiffres. C'est la disposition retenue ici. Le
 * gain de hauteur qui justifiait le rail est préservé : ce bloc-ci ne porte pas la
 * rangée de six chiffres ni les répartitions qui gonflaient l'ancien bandeau — il
 * porte une ligne d'identité, le cours, et rien d'autre.
 *
 * ── CE QUE LE BLOC PORTE, DANS L'ORDRE DE LECTURE ─────────────────────────────
 *
 *   1. Fil d'Ariane et FRAÎCHEUR de la donnée, aux deux bouts d'une même ligne.
 *   2. Logo, nom, code, rang, catégories.
 *   3. Cours, variation, cours en actif de référence, amplitude du jour.
 *   4. Les deux actions : alerte et suivi.
 *
 * La fraîcheur monte ici depuis la barre de méta des onglets, où elle était en gris
 * de 11 pixels sous le mot « Source ». C'est pourtant la réponse à « ce que je lis,
 * de quand date-t-il », question qu'on se pose AVANT de lire le chiffre et pas après.
 *
 * ── AUCUN BOUTON D'ACHAT, ET C'EST STRUCTUREL ─────────────────────────────────
 *
 * Les deux références posent ici « Trade » ou « Add to Portfolio ». Ce site observe
 * et n'exécute rien : l'emplacement revient au suivi et à l'alerte, qui répondent à
 * la même intention — garder un œil — sans rien promettre qu'on ne fait pas.
 */
export async function AssetPageHeader({
  asset,
  assetClass,
  price,
  actions,
  rankLabel,
  breadcrumb,
  sourceLabel,
}: {
  asset: AssetDetail
  assetClass: AssetClass
  /**
   * Le cours, rendu par l'appelant.
   *
   * Il ne peut pas l'être ici : selon la classe d'actif, c'est un composant client
   * branché sur un flux temps réel ou un simple montant converti. Ce bloc sait où
   * poser le prix et à quelle taille, pas d'où il vient.
   */
  price: React.ReactNode
  /** Alerte et suivi. Passés en enfant pour la même raison que le prix. */
  actions: React.ReactNode
  rankLabel: string
  breadcrumb: React.ReactNode
  sourceLabel: string | null
}) {
  const t = await getTranslations('metric')
  const isForex = assetClass === 'forex'
  const categories = (asset.categories ?? []).slice(0, 3)
  const updated = formatDateTime(asset.lastUpdated)

  return (
    <header className="space-y-4">
      {/* ── Fil d'Ariane et fraîcheur, aux deux bouts d'une même ligne ─────────
          Une seule rangée pour deux informations de même nature : où je suis, et de
          quand date ce que je vois. Les empiler ferait deux lignes de 11 pixels pour
          ce qui tient sur une. */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        {breadcrumb}

        {sourceLabel ? (
          <p className="flex items-center gap-1.5 text-micro text-ink-muted">
            {/*
              La pastille est un ÉTAT, pas un ornement : elle reprend le vert de
              disponibilité du système, distinct du vert de hausse (voir globals.css).
              Confondre les deux ferait lire « le cours monte » là où on dit « la
              donnée est fraîche ».
            */}
            <span
              aria-hidden="true"
              className="h-1.5 w-1.5 shrink-0 rounded-pill bg-[var(--color-status)]"
            />
            <span>
              {sourceLabel}
              {updated ? ` · ${updated}` : ''}
            </span>
          </p>
        ) : null}
      </div>

      {/* ── Identité et cours, sur deux colonnes à partir de `md` ──────────────
          Le nom à gauche, le cours à droite : c'est la disposition de la référence, et
          elle tient parce que les deux blocs se lisent indépendamment. En dessous de
          `md` ils s'empilent, le nom d'abord — sur 375 pixels, un cours posé à côté
          d'un nom long réduirait les deux à des fragments. */}
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
        <div className="flex min-w-0 items-start gap-3">
          {/* Le logo dans un disque bordé, et non posé à nu sur le fond : les sources
              livrent des marques aux formes et aux fonds très inégaux — carrées,
              rondes, transparentes, blanches sur blanc. Le disque leur impose à
              toutes la même empreinte. */}
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-pill border border-border-subtle bg-surface">
            <AssetLogo asset={asset} size={28} />
          </span>

          <div className="min-w-0">
            {/*
              LE NOM ET LE CODE SUR LA MÊME LIGNE, ce que la colonne étroite interdisait.

              Sur 288 pixels, « Euro / Dollar américain » suivi de sa pastille tenait
              en deux lignes et menaçait de se tronquer. En pleine largeur, la ligne
              porte le nom en 30 pixels, le code en gris à côté, et le rang en
              pastille — exactement la ligne de titre de la référence.
            */}
            <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
              <h1 className="display-lg leading-none text-ink">{asset.name}</h1>
              <span className="text-lg font-semibold uppercase leading-none tracking-wide text-ink-muted">
                {asset.symbol}
              </span>
              {asset.rank !== undefined ? (
                <span className="tabular rounded-pill border border-border-subtle px-1.5 py-0.5 text-micro font-medium leading-none text-ink-muted">
                  #{asset.rank}
                  {/* Le libellé complet du rang est ACCOLÉ à la pastille : un lecteur
                      d'écran annonce « #1, 1ʳᵉ capitalisation » d'un seul tenant, au
                      lieu d'un dièse isolé. */}
                  <span className="sr-only"> — {rankLabel}</span>
                </span>
              ) : null}
            </div>

            {/* Sous-titre de classement, comme le « Blockchains (L1) » de la référence.
                Trois catégories tiennent ici là où la colonne n'en supportait que deux. */}
            {categories.length > 0 || asset.exchange ? (
              <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-ink-muted">
                {asset.exchange ? <span className="font-medium">{asset.exchange}</span> : null}
                {categories.map((category) => (
                  <span
                    key={category}
                    className="rounded-pill border border-border-subtle px-2 py-0.5 font-medium"
                  >
                    {category}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <p className="tabular text-4xl font-bold leading-none text-ink">
              <span className="sr-only">{t('price.label')} : </span>
              {price}
            </p>
            {asset.change24h !== undefined ? (
              <span className="tabular text-base font-semibold leading-none">
                <ChangeBadge value={asset.change24h} periodLabel={asset.changePeriodLabel} />
              </span>
            ) : null}
          </div>

          {/* Cours en actif de référence — voir son en-tête. Absent hors crypto. */}
          <AssetBenchmarkRatio asset={asset} />

          {/* L'amplitude du jour ACCOLÉE au cours, et l'endroit est dicté par la
              lecture : un curseur ne situe rien s'il est éloigné du chiffre qu'il
              situe. Largeur bornée pour qu'il ne s'étire pas sur tout l'écran. */}
          <div className="max-w-sm">
            <AssetRangeBar asset={asset} isRate={isForex} />
          </div>
        </div>
      </div>

      {/* ── Les deux actions ───────────────────────────────────────────────────
          Sous l'identité plutôt qu'à côté : à droite du cours, elles se seraient
          disputé la ligne avec lui sur un écran moyen, et le cours doit gagner. */}
      <div className="flex flex-wrap gap-2">{actions}</div>
    </header>
  )
}
