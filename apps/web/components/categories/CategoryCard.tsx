import Link from 'next/link'

import { ChangeBadge, formatCurrency } from '@zenith/ui'

import type { MarketCategory } from '@zenith/data'

/**
 * Carte d'un secteur de marché.
 *
 * Reprise structurelle : une tuile par secteur, avec sa performance 24 h et un
 * aperçu visuel de ses actifs représentatifs — c'est ce qui rend une grille de
 * catégories lisible d'un coup d'œil, là où un tableau impose de lire ligne à ligne.
 *
 * Écart assumé : les logos servent d'indice de reconnaissance, pas de lien. Les
 * rendre cliquables créerait deux cibles de navigation concurrentes dans une même
 * carte, ce qui dégrade l'usage au clavier et au lecteur d'écran.
 */
export function CategoryCard({ category }: { category: MarketCategory }) {
  const logos = (category.topAssets ?? []).slice(0, 4)

  return (
    <article className="relative flex h-full flex-col justify-between gap-4 rounded-card border border-border-subtle bg-surface p-5 transition-colors hover:border-brand">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-semibold leading-snug">
          {/*
            Le lien s'étend à toute la carte via `after:absolute inset-0` plutôt que
            d'envelopper le contenu. Deux raisons : la carte reste un `<article>` et
            non un bloc de lien géant, ce qui préserve sa structure pour les lecteurs
            d'écran ; et le clavier n'a qu'UNE cible — le nom — au lieu de traverser
            chaque élément de la carte. La souris, elle, atteint toute la surface.
            Le parent porte donc `relative`, sans quoi la surcouche se calerait sur
            l'ancêtre positionné le plus proche, quelque part dans la page.
          */}
          <Link
            href={`/categories/${category.id}`}
            className="text-ink transition-colors after:absolute after:inset-0 after:content-[''] hover:text-brand-strong"
          >
            {category.name}
          </Link>
        </h3>
        <ChangeBadge value={category.marketCapChange24h} size="sm" />
      </div>

      <dl className="space-y-1.5 text-xs">
        <div className="flex items-baseline justify-between gap-2">
          <dt className="text-ink-muted">Capitalisation</dt>
          <dd className="tabular font-medium text-ink">
            {formatCurrency(category.marketCap, 'USD', { compact: true }) ?? '—'}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-2">
          <dt className="text-ink-muted">Volume 24 h</dt>
          <dd className="tabular text-ink-muted">
            {formatCurrency(category.volume24h, 'USD', { compact: true }) ?? '—'}
          </dd>
        </div>
      </dl>

      {logos.length > 0 ? (
        <div className="flex items-center gap-1.5">
          <div className="flex -space-x-1.5">
            {logos.map((src, index) => (
              // eslint-disable-next-line @next/next/no-img-element -- logos distants
              <img
                key={`${category.id}-${index}`}
                src={src}
                alt=""
                aria-hidden="true"
                loading="lazy"
                width={20}
                height={20}
                className="h-5 w-5 rounded-full border border-surface bg-surface-muted object-contain"
              />
            ))}
          </div>
          <span className="text-[0.6875rem] text-ink-muted">actifs représentatifs</span>
        </div>
      ) : null}
    </article>
  )
}
