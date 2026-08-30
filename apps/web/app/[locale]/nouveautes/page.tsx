import type { Metadata } from 'next'

import { RELEASES } from '@/content/nouveautes'
import { getContent, getSeo } from '@/lib/content'
import { getPhrase } from '@/lib/content'

/**
 * Métadonnées DÉRIVÉES DE LA LANGUE, d'où la fonction plutôt que la constante.
 *
 * Un `export const metadata` est évalué une fois au chargement du module : il ne
 * peut pas connaître la locale de la requête, et servait donc un titre français sur
 * les pages anglaises.
 */
export async function generateMetadata(): Promise<Metadata> {
  const fr = await getContent()
  const seo = await getSeo()
  return {
  title: fr.pages.changelog,
  description: seo(
    '/nouveautes',
    'Journal des évolutions de ZENKUU : fonctionnalités livrées, sources de données ajoutées et limites connues.',
  ),
  alternates: { canonical: '/nouveautes' },
  }
}

/**
 * Journal des nouveautés.
 *
 * ⚠️ LA TABLE A DÉMÉNAGÉ dans `content/nouveautes.ts` : le centre d'aide en a besoin
 * lui aussi, pour la section « Annonces » de sa référence. La recopier là-bas aurait
 * garanti que les deux versions divergent à la première livraison.
 */

export default async function NouveautesPage() {
  const t = await getPhrase()
  return (
    <div className="mx-auto max-w-3xl space-y-8 py-6">
      <header className="space-y-3">
        <h1 className="display-xl text-ink">{t('Nouveautés')}</h1>
        <p className="text-base leading-relaxed text-ink-muted">
          {t(
            'Ce qui a été livré, dans l’ordre. Les limites connues sont signalées au même titre que les ajouts — une fonctionnalité partielle est annoncée comme telle.',
          )}
        </p>
      </header>

      <ol className="space-y-8">
        {RELEASES.map((release, index) => (
          <li key={index} className="relative space-y-3 border-l border-border-subtle pl-5">
            <span
              className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-pill bg-brand-strong"
              aria-hidden="true"
            />
            <div className="space-y-1">
              <time dateTime={release.date} className="text-xs font-medium text-ink-muted">
                {t(release.label)}
              </time>
              <h2 className="text-base font-semibold text-ink">{t(release.title)}</h2>
            </div>
            <ul className="space-y-1.5 text-sm leading-relaxed text-ink-muted">
              {release.items.map((item, itemIndex) => (
                <li key={itemIndex} className="flex gap-2">
                  <span aria-hidden="true" className="text-brand-strong">
                    ·
                  </span>
                  <span>{t(item)}</span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </div>
  )
}
