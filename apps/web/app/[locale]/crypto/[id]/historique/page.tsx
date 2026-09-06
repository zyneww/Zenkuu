import { getAsset, getAssetHistory } from '@zenkuu/data'
import { EmptyState } from '@zenkuu/ui'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { PriceHistoryTable } from '@/components/asset/PriceHistoryTable'
import { getPhrase, getSeo } from '@/lib/content'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * L'HISTORIQUE DE COURS, JOUR PAR JOUR
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── LE COMPOSANT EXISTAIT, LA PAGE MANQUAIT ────────────────────────────────
 *
 * `PriceHistoryTable` vit dans le dépôt depuis longtemps, testé et documenté. Il
 * n'était RENDU NULLE PART : la fiche d'actif l'a retiré, avec cette note — « une
 * pièce justificative, pas une analyse ; elle reste servie par l'export du
 * graphique ».
 *
 * L'argument tenait tant que la table était une section parmi d'autres. La référence
 * en fait une PAGE — `/coins/[id]/historical_data`, relevée le 2026-08-31, quatre
 * colonnes : date, capitalisation, volume, clôture. Une pièce justificative mérite
 * une adresse : on y renvoie, on la partage, un moteur l'indexe.
 *
 * ── CE QUI EST REPRIS, ET CE QUI NE L'EST PAS ──────────────────────────────
 *
 * Le composant est monté TEL QUEL, sans réécriture. Il porte quatorze journées, son
 * export, et sa règle de sélection : le DERNIER point de chaque journée, qui
 * correspond à la clôture connue — prendre le premier ou faire une moyenne
 * produirait un nombre qui ne figure nulle part chez la source.
 *
 * ⚠️ LEURS QUATRE COLONNES NE SONT PAS TOUTES SERVIES. Ils affichent capitalisation
 * et volume par jour ; `PriceHistory` ne porte que le cours. Les ajouter demanderait
 * une seconde série par actif, pour une page de consultation ponctuelle. La table
 * dit donc ce qu'elle sait — date, clôture, variation — et rien de plus.
 *
 * ── LA PROFONDEUR EST CELLE DE LA FICHE ────────────────────────────────────
 *
 * 30 jours, comme le graphique par défaut. Le composant n'en affiche que quatorze
 * (`MAX_ROWS`) : demander davantage coûterait un appel plus lourd pour des lignes
 * que personne ne verrait.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {

  const { id } = await params
  const t = await getPhrase()
  const seo = await getSeo()
  const asset = await getAsset(id, 'crypto', 'eur')
  const name = asset.ok ? asset.data.name : id

  return {
    title: `${t('Historique des cours')} — ${name}`,
    description: seo(
      '/crypto/[id]/historique',
      'La série des clôtures quotidiennes, jour par jour, avec la variation d’une séance à l’autre.',
    ),
  }
}

export default async function HistoriquePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const t = await getPhrase()

  /* Les deux lectures partent ENSEMBLE : la fiche sert le nom et la devise, la série
     sert la table. Les enchaîner doublerait l'attente pour rien. */
  const [asset, history] = await Promise.all([
    getAsset(id, 'crypto', 'eur'),
    getAssetHistory(id, 'crypto', 30, 'eur'),
  ])

  /* Un identifiant inconnu vient de l'URL, saisissable à la main : 404 franc plutôt
     qu'un encadré d'erreur sur une page qui ne décrit rien. */
  if (!asset.ok) notFound()

  return (
    <div className="space-y-6">
      {/* ⚠️ LE FIL D'ARIANE ET LA RANGÉE D'ONGLETS ONT QUITTÉ CETTE PAGE.

          Elle les rendait elle-même, et son fil n'était pas celui de l'aperçu : trois
          maillons au lieu de quatre, sans le maillon d'accueil, et écrit à la main
          plutôt qu'avec le composant de fil du site. Changer d'onglet remplaçait donc
          l'en-tête par un autre — c'est le défaut que `AssetShell` corrige, en les
          rendant une seule fois pour les quatre onglets. */}
      <header className="max-w-3xl space-y-3">
        {/* ⚠️ `h2` ET NON `h1` : le bandeau persistant porte déjà celui de la page — le
            nom de l'actif. Deux `h1` cohabitaient, relevés au navigateur. Le nom quitte
            l'intitulé pour la même raison : il est écrit juste au-dessus. */}
        <h2 className="display-xl text-ink">{t('Historique des cours')}</h2>
        <p className="text-lg leading-relaxed text-ink-muted">
          {t(
            'La clôture de chaque journée, et l’écart avec la veille. Le graphique montre une forme ; ce tableau donne les nombres.',
          )}
        </p>
      </header>

      {history.ok ? (
        <PriceHistoryTable
          history={history.data}
          currency={asset.data.currency}
          assetName={asset.data.name}
        />
      ) : (
        <EmptyState
          title={t('Historique indisponible')}
          description={history.reason}
          source={history.source?.label ?? null}
          tone="warning"
        />
      )}
    </div>
  )
}
