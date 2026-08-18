import type { Metadata } from 'next'
import { Link } from '@/i18n/navigation'

import { CACHE_TTL_SECONDS, getCategories, getMoversUniverse } from '@zenkuu/data'
import { EmptyState, SourceNote } from '@zenkuu/ui'

import { MarketHeatmap } from '@/components/tools/MarketHeatmap'
import { getPhrase } from '@/lib/content'

export const revalidate = 180
const _ttlGuard: typeof revalidate = CACHE_TTL_SECONDS
void _ttlGuard

export const metadata: Metadata = {
  title: 'Carte thermique du marché',
  description:
    'Le marché crypto en une figure, par pièce ou par secteur : la surface porte la capitalisation, la couleur porte la variation.',
  alternates: { canonical: '/heatmap' },
}

/**
 * Heatmap sectorielle.
 *
 * AUCUN APPEL SUPPLÉMENTAIRE : la liste des secteurs est déjà chargée et mise en cache
 * pour `/categories`, et la source la livre entière en une seule réponse. Cette page
 * est une seconde LECTURE de la même donnée — celle qui répond à « où le marché
 * bouge-t-il ? » plutôt qu'à « combien pèse ce secteur ? ».
 *
 * ── DEUX DÉCOUPAGES, ET LE SECOND EST ARRIVÉ APRÈS ───────────────────────────
 *
 * Cette page n'offrait que le découpage par SECTEUR. La note qui tient encore ici
 * soutenait qu'une carte par ACTIF « exigerait de recharger le classement complet et
 * n'apporterait rien que le tableau ne dise déjà ». La seconde moitié de la phrase
 * était fausse : un tableau ne montre pas de surfaces, et c'est toute la raison d'être
 * d'une carte thermique. La première l'était aussi, mais par accident — le classement
 * de cent actifs est DÉJÀ chargé et mis en cache pour la page des mouvements, sous une
 * clé qui ne dépend d'aucun actif.
 *
 * La page offre donc les deux, sur une bascule. Les deux figures répondent à des
 * questions distinctes : par pièce on voit QUI bouge, par secteur on voit OÙ ça bouge —
 * dix actifs d'un même narratif qui prennent deux pour cent chacun ne se remarquent
 * nulle part individuellement, et sautent aux yeux groupés.
 */
export default async function HeatmapPage() {
  const t = await getPhrase()
  /*
   * Les deux jeux partent ENSEMBLE et ne coûtent rien : `getCategories` sert déjà
   * `/categories` et les graphiques, `getMoversUniverse` sert déjà `/mouvements`.
   * Leurs clés de cache ne dépendent d'aucun actif — un seul téléchargement de chaque
   * alimente tout le site.
   */
  const [categories, assets] = await Promise.all([getCategories(), getMoversUniverse(100, 'eur')])

  const hasSectors = categories.ok && categories.data.length > 0
  const hasAssets = assets.ok && assets.data.length > 0

  return (
    <div className="space-y-8">
      <header className="max-w-3xl space-y-3">
        <h1 className="display-xl text-ink">{t("Carte thermique du marché")}</h1>
        <p className="text-lg leading-relaxed text-ink-muted">{t("Le marché en un coup d’œil : la surface porte la capitalisation, la couleur porte la variation. Basculez entre les pièces et les secteurs, et cliquez un rectangle pour l’ouvrir.")}</p>
      </header>

      {hasSectors || hasAssets ? (
        <>
          <MarketHeatmap
            assets={assets.ok ? assets.data : []}
            categories={categories.ok ? categories.data : []}
          />
          <SourceNote
            label={`${(categories.ok ? categories.source : assets.source)?.label ?? 'CoinGecko'} · montants en USD`}
            href={
              (categories.ok ? categories.source : assets.source)?.attributionUrl ??
              'https://www.coingecko.com'
            }
          />
        </>
      ) : (
        <EmptyState
          title="Carte indisponible"
          description={categories.ok ? null : categories.reason}
          tone="warning"
        />
      )}

      <section className="max-w-2xl space-y-2 border-t border-border-subtle pt-6">
        <h2 className="text-sm font-semibold text-ink">Comment lire cette carte</h2>
        <p className="text-sm leading-relaxed text-ink-muted">
          Deux variables sur une seule figure. Un grand rectangle rouge et un petit
          rectangle rouge affichent la même variation dans un tableau — ici, le premier
          concerne une part du marché que le second ne pèse pas. C’est ce rapprochement
          qu’un tableau demande de faire mentalement, ligne à ligne.
        </p>
        <p className="text-sm leading-relaxed text-ink-muted">
          Les deux découpages ne s’additionnent pas de la même façon, et c’est la seule
          chose à retenir avant de les comparer. Par{' '}
          <strong className="text-ink">pièce</strong>, les surfaces se partagent un tout :
          chaque actif est compté une fois. Par{' '}
          <strong className="text-ink">secteur</strong>, non — un actif appartient à
          plusieurs narratifs, Bitcoin relève de « Layer 1 » comme de « Proof of Work », si
          bien que la somme des rectangles dépasse largement la capitalisation mondiale. La
          seconde carte compare les secteurs entre eux, elle ne les additionne pas.
        </p>
        <p className="text-sm leading-relaxed text-ink-muted">
          La période ne s’applique qu’aux pièces : la source publie cinq fenêtres de
          variation par actif, et une seule par secteur. Le détail de chaque narratif est
          sur sa page — voir{' '}
          <Link href="/categories" className="text-brand hover:underline">
            tous les secteurs
          </Link>
          .
        </p>
      </section>
    </div>
  )
}
