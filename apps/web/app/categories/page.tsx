import type { Metadata } from 'next'
import Link from 'next/link'

import { CACHE_TTL_SECONDS, getCategories, type MarketCategory } from '@zenith/data'
import { EmptyState, SourceNote } from '@zenith/ui'

import { CategoryExplorer } from '@/components/categories/CategoryExplorer'
import { SectorHighlights } from '@/components/categories/SectorHighlights'
import { fr } from '@/content/fr'

export const revalidate = 300
const _ttlGuard: typeof revalidate = CACHE_TTL_SECONDS
void _ttlGuard

export const metadata: Metadata = {
  title: fr.pages.categories,
  description: fr.categories.subtitle,
  alternates: { canonical: '/categories' },
}

/**
 * Secteurs et narratifs de marché.
 *
 * Coquille de page reprise de kraken/DESIGN.md : bande de tête large (titre
 * d'affichage 48px, chapô, repères chiffrés), puis alternance de bandes espacées
 * plutôt qu'un empilement serré de blocs. C'est le rythme, plus que la couleur,
 * qui distinguait cette page de sa référence : elle ouvrait sur un titre de 24px
 * collé en haut de page, sans respiration ni point d'entrée.
 *
 * Ce qui est repris : la hiérarchie (bande de tête → repères → exploration
 * filtrable → renvoi méthodologique) et la performance 24 h sur chaque tuile.
 * Ce qui est changé : pas de sous-navigation par blockchain ni de compteur
 * d'actifs par secteur — la source ne publie ni l'un ni l'autre, et les afficher
 * supposerait de les estimer (§5). Pas de bande promotionnelle non plus : ZENITH
 * informe, il ne vend rien.
 */
export default async function CategoriesPage() {
  const categories = await getCategories(40)

  if (!categories.ok || categories.data.length === 0) {
    return (
      <div className="space-y-10">
        <CategoriesHero categories={null} />
        <EmptyState
          title={fr.states.unavailableTitle}
          description={categories.ok ? null : categories.reason}
          source={categories.source?.label ?? null}
        />
      </div>
    )
  }

  return (
    <div className="space-y-12 sm:space-y-16">
      <CategoriesHero categories={categories.data} />

      <SectorHighlights categories={categories.data} />

      <CategoryExplorer categories={categories.data} />

      <MethodologyBand />

      {/* La source ne publie ces agrégats qu'en dollars : on l'écrit plutôt que
          de convertir nous-mêmes vers l'euro (§5). */}
      <SourceNote
        label={`${categories.source.label} · montants en USD`}
        href={categories.source.attributionUrl}
      />
    </div>
  )
}

/**
 * Bande de tête.
 *
 * Les trois repères chiffrés sont des DÉNOMBREMENTS, jamais des sommes, et c'est
 * une contrainte de fond et non un choix de mise en page : un même actif appartient
 * simultanément à plusieurs secteurs — Bitcoin relève de « Layer 1 » comme de
 * « Proof of Work ». Additionner les capitalisations par secteur le compterait donc
 * deux fois et publierait un total faux. Compter des secteurs reste exact même
 * quand leurs contenus se recoupent.
 *
 * Toute évolution de ce bandeau doit s'y tenir : afficher ici une « capitalisation
 * totale » exigerait une déduplication par actif que la source ne fournit pas (§5).
 */
function CategoriesHero({ categories }: { categories: MarketCategory[] | null }) {
  const rated = (categories ?? []).filter((category) => category.marketCapChange24h !== undefined)
  const rising = rated.filter((category) => (category.marketCapChange24h ?? 0) > 0).length

  return (
    <header className="border-b border-border-subtle pb-10">
      <div className="max-w-3xl space-y-4">
        {/* Filet solaire — le seul emploi de l'or, et il est purement décoratif.
            À 2,05:1 sur le canvas clair, cet or ne peut porter ni texte ni sens ;
            un aplat de quelques pixels est exactement ce qu'il sait faire. Il donne
            au passage une existence au jeton : Tailwind 4 élague du CSS final tout
            jeton de thème qu'aucune classe ne consomme. */}
        <div className="h-1 w-12 rounded-pill bg-accent" aria-hidden="true" />
        <h1 className="display-mega text-ink">{fr.categories.title}</h1>
        <p className="text-base leading-relaxed text-ink-muted sm:text-lg">
          {fr.categories.subtitle}
        </p>
      </div>

      {categories && rated.length > 0 ? (
        <dl className="mt-8 flex flex-wrap gap-x-12 gap-y-5">
          <HeroStat label="Secteurs suivis" value={categories.length} />
          <HeroStat label="En hausse sur 24 h" value={rising} tone="up" />
          <HeroStat label="En repli sur 24 h" value={rated.length - rising} tone="down" />
        </dl>
      ) : null}
    </header>
  )
}

function HeroStat({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone?: 'up' | 'down'
}) {
  const color = tone === 'up' ? 'text-up' : tone === 'down' ? 'text-down' : 'text-ink'

  return (
    <div>
      <dt className="text-xs font-medium tracking-wide text-ink-muted uppercase">{label}</dt>
      <dd className={`tabular mt-1 text-3xl font-semibold ${color}`}>{value}</dd>
    </div>
  )
}

/**
 * Bande de clôture : renvoi méthodologique.
 *
 * Elle occupe la place qu'une bande promotionnelle tiendrait sur une page de
 * plateforme d'échange. Le rythme visuel est le même — fond contrasté, titre de
 * bande, deux actions — mais le contenu renvoie à ce qui engage ZENITH plutôt
 * qu'à une inscription.
 */
function MethodologyBand() {
  return (
    <section
      className="rounded-lg bg-surface-muted p-6 sm:p-10"
      aria-labelledby="categories-methodologie"
    >
      <div className="max-w-2xl space-y-3">
        <h2 id="categories-methodologie" className="display-md text-ink">
          D’où viennent ces secteurs ?
        </h2>
        <p className="text-sm leading-relaxed text-ink-muted">
          Les catégories ne sont pas définies par ZENITH : elles proviennent telles quelles
          de la source de données, qui décide seule du rattachement d’un actif à un secteur.
          Un même actif peut relever de plusieurs d’entre eux, si bien que les
          capitalisations par secteur ne s’additionnent pas.
        </p>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/methodologie"
          className="rounded-card bg-brand px-5 py-2.5 text-sm font-medium text-on-brand transition-colors hover:bg-brand-strong"
        >
          Méthodologie &amp; sources
        </Link>
        <Link
          href="/apprendre"
          className="rounded-card border border-border-subtle bg-surface px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:border-brand"
        >
          Apprendre à lire ces chiffres
        </Link>
      </div>
    </section>
  )
}
