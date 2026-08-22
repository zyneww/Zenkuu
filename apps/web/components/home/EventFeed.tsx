import type { DataResult, NewsItem } from '@zenkuu/data'
import { EmptyState } from '@zenkuu/ui'

import { RelativeTime } from '@/components/home/RelativeTime'
import { Link } from '@/i18n/navigation'
import { getContent, getPhrase } from '@/lib/content'

/** Entrées affichées. Trois tiennent à la hauteur des deux cartes voisines du rang. */
const COUNT = 3

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * FIL D'ÉVÉNEMENTS DATÉS — LA TROISIÈME CARTE DU RANG DE TÊTE
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── CE QU'ELLE REMPLACE ─────────────────────────────────────────────────────
 *
 * La carte « Favoris », qui occupait un tiers du rang de tête pour dire à un visiteur
 * sans compte « commencez votre liste de suivi ». C'était un appel à l'inscription
 * posé au même rang que deux blocs de données, et il restait vide pour la majorité
 * des visiteurs. Les favoris n'ont pas disparu du site — l'étoile de chaque ligne de
 * tableau les alimente toujours, et `/suivi` les rassemble.
 *
 * ── L'ÂGE EST LE SEUL MORCEAU CLIENT DE CETTE CARTE ─────────────────────────
 *
 * Tout le reste est rendu sur le serveur et mis en cache avec la page. L'âge, lui,
 * dépend de l'instant où on REGARDE et non de celui où la page a été rendue : calculé
 * au serveur, un « il y a 2 h » servi depuis le cache une heure plus tard mentirait
 * d'une heure. `RelativeTime` le calcule donc chez le lecteur, et rend la date absolue
 * en attendant — voir son en-tête pour la contrainte d'hydratation que cela impose.
 */
export async function EventFeed({ result }: { result: DataResult<NewsItem[]> }) {
  const fr = await getContent()
  const t = await getPhrase()

  const items = result.ok ? result.data.slice(0, COUNT) : []

  if (items.length === 0) {
    return (
      <EmptyState
        title={fr.states.unavailableTitle}
        description={result.ok ? null : result.reason}
        compact
      />
    )
  }

  return (
    <div className="flex flex-col rounded-panel border border-border-subtle bg-panel p-4">
      <ul className="divide-y divide-border-subtle">
        {items.map((item) => (
          <li key={item.id} className="py-2.5 first:pt-0 last:pb-0">
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="group flex gap-2.5"
            >
              {/* Pastille de source à la place d'une vignette : une image d'éditeur
                  ferait appeler son serveur depuis le navigateur du lecteur. La
                  première lettre suffit à distinguer trois lignes. */}
              <span
                aria-hidden="true"
                className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-pill bg-surface-muted text-micro font-semibold text-ink-muted"
              >
                {item.source.slice(0, 1).toUpperCase()}
              </span>

              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="line-clamp-2 text-xs font-medium leading-snug text-ink group-hover:text-brand-strong">
                  {item.title}
                </span>
                <span className="flex flex-wrap items-center gap-x-1.5 text-micro text-ink-muted">
                  <span className="truncate">{item.source}</span>
                  {item.publishedAt ? (
                    <>
                      <span aria-hidden="true">·</span>
                      <RelativeTime iso={item.publishedAt} />
                    </>
                  ) : null}
                </span>
              </span>
            </a>
          </li>
        ))}
      </ul>

      <Link
        href="/actualites"
        className="mt-3 border-t border-border-subtle pt-3 text-xs text-brand transition-colors hover:text-brand-strong"
      >
        {t('Tout voir')} <span aria-hidden="true">→</span>
      </Link>
    </div>
  )
}

