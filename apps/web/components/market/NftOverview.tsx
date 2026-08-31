import type { NftCollection } from '@zenkuu/data'
import { formatCompact, formatShare } from '@zenkuu/ui'

import { emphasise } from '@/components/locale/emphasise'
import { HeatmapFrame } from '@/components/tools/HeatmapFrame'
import { TreemapFigure, TreemapLegend, type TreemapTile } from '@/components/tools/TreemapFigure'
import { getPhrase } from '@/lib/content'

/**
 * VUE D'ENSEMBLE DES COLLECTIONS NFT — trois compteurs et une carte thermique.
 *
 * ── CE QUE LA GRILLE NE MONTRAIT PAS ──────────────────────────────────────────
 *
 * La page listait dix vignettes, triées par capitalisation. Chacune est juste et
 * l'ensemble ne dit rien du RAPPORT entre elles : le lecteur doit comparer dix nombres
 * abrégés pour découvrir que la première pèse plus que les cinq suivantes réunies.
 *
 * La référence pose une carte thermique et un compteur de « dominance » en tête de sa
 * page NFT, exactement pour cette raison. On reprend les deux, sur notre sélection.
 *
 * ── « PART DE LA SÉLECTION » ET NON « DOMINANCE » ─────────────────────────────
 *
 * La référence peut écrire « Punk Dominance » parce qu'elle classe l'ensemble du
 * marché NFT. Nous ne le pouvons pas : l'endpoint de classement des collections est
 * réservé à l'offre payante, et notre liste est arrêtée à la main (voir
 * `TRACKED_NFT_COLLECTIONS`). La part que nous affichons est donc une part DE NOTRE
 * SÉLECTION, ce que le libellé et la note disent explicitement.
 *
 * C'est la même règle que pour le panier de capitalisations : un agrégat dont la
 * composition est choisie doit porter sa composition dans son nom.
 *
 * ── LA COULEUR PORTE LE PLANCHER, PAS LA CAPITALISATION ───────────────────────
 *
 * `floorChange24h` est la variation du PRIX PLANCHER, seule variation que la source
 * publie pour une collection. Ce n'est pas la variation de sa capitalisation — le
 * nombre d'exemplaires en vente bouge lui aussi — et la note le précise, faute de quoi
 * la carte se lirait comme une carte de capitalisations colorée par elle-même.
 */
export async function NftOverview({ collections }: { collections: NftCollection[] }) {
  const t = await getPhrase()
  const ranked = collections
    .filter((collection) => (collection.marketCapUsd ?? 0) > 0)
    .sort((a, b) => (b.marketCapUsd ?? 0) - (a.marketCapUsd ?? 0))

  if (ranked.length === 0) return null

  const total = ranked.reduce((sum, collection) => sum + (collection.marketCapUsd as number), 0)
  const volume = ranked.reduce((sum, collection) => sum + (collection.volume24hUsd ?? 0), 0)
  const leader = ranked[0] as NftCollection
  const leaderShare = ((leader.marketCapUsd as number) / total) * 100

  const tiles: TreemapTile[] = ranked.map((collection) => ({
    id: collection.id,
    label: collection.symbol?.toUpperCase() ?? collection.name,
    title: collection.name,
    value: collection.marketCapUsd as number,
    ...(collection.floorChange24h !== undefined ? { change: collection.floorChange24h } : {}),
    /*
      ── ICÔNE ET LIEN, LES DEUX VENANT DE LA SOURCE ─────────────────────────

      L'image est la vignette publiée par la source ; la destination est le SITE OFFICIEL
      de la collection, également publié — voir `NftCollection.homepage` pour le choix de
      cette destination plutôt qu'une URL construite, qu'on n'a pas pu vérifier.

      Les deux sont facultatifs et se retirent d'eux-mêmes : une collection sans image
      garde son symbole, une collection sans site garde une tuile inerte. C'est ce qui
      rend l'ajout sûr — aucune tuile ne peut se casser faute de champ.
    */
    ...(collection.image ? { image: collection.image } : {}),
    ...(collection.homepage ? { href: collection.homepage } : {}),
  }))

  return (
    <section className="space-y-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat
          label={t('Capitalisation de la sélection')}
          value={`${formatCompact(total)} $`}
          hint={`${ranked.length} collections suivies`}
        />
        <Stat
          label={t('Volume 24 h')}
          value={`${formatCompact(volume)} $`}
          hint={t('ventes sur les mêmes collections')}
        />
        <Stat
          label={`Part de ${leader.name}`}
          value={formatShare(leaderShare) ?? '—'}
          hint={t('de la sélection, pas du marché NFT')}
        />
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="display-sm text-ink">{t('Carte des collections')}</h2>
          <TreemapLegend />
        </div>

        {/* Même cadre que la carte du marché : une figure de tuiles est la seule du
            site dont la lisibilité dépend directement de sa surface. */}
        <HeatmapFrame>
          <TreemapFigure
            tiles={tiles}
            periodLabel="24 heures"
            /* PLUS HAUTE que les autres cartes : six tuiles seulement, dont les
               vignettes et les noms complets demandent de la place. À 360 pixels, les
               trois dernières collections ne pouvaient porter ni image ni montant. Les
               cartes de marché, elles, pavent cent tuiles et gagnent à rester compactes. */
            height="min(62vh, 520px)"
            valueUnit=" $"
          />
        </HeatmapFrame>

        <p className="max-w-4xl text-xs leading-relaxed text-ink-muted">
          {emphasise(
            t(
              'Surface : capitalisation de la collection. Couleur : variation du **prix plancher** sur 24 heures — la seule variation que la source publie ici, et qui n’est pas celle de la capitalisation : le nombre d’exemplaires en vente bouge lui aussi. Les surfaces se partagent **notre sélection**, pas le marché NFT : voir la note en bas de page. Montants en dollars.',
            ),
          )}
        </p>
      </div>
    </section>
  )
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-card border border-border-subtle bg-panel p-4">
      <p className="truncate text-xs text-ink-muted">{label}</p>
      <p className="figure mt-1 text-xl font-semibold leading-tight text-ink">{value}</p>
      <p className="mt-1 text-micro leading-snug text-ink-muted">{hint}</p>
    </div>
  )
}
