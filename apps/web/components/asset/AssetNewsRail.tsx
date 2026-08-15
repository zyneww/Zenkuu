'use client'

import type { NewsItem } from '@zenkuu/data'

import { useRelativeTime } from '@/components/locale/useRelativeTime'

/**
 * Rail d'actualités de la fiche — la CHRONOLOGIE, pas le fil.
 *
 * ── DEUX PRÉSENTATIONS POUR LE MÊME CONTENU, ET C'EST VOULU ───────────────────
 *
 * `AssetNewsPanel` existe déjà et rend les mêmes articles avec le gabarit de
 * `/actualites` : vignette, chapeau, rubrique, filtres. C'est ce qu'il faut dans un
 * ONGLET, où l'on vient pour lire.
 *
 * Ce rail-ci répond à une autre question — « qu'est-il arrivé à cet actif, et
 * quand ? » — qu'on se pose EN REGARDANT LE GRAPHIQUE, pour rattacher un décrochage
 * à un événement. D'où une colonne étroite, sans image, ordonnée du plus récent au
 * plus ancien et coupée par jour. C'est la forme du panneau « Recently Happened
 * to » de CoinGecko, et elle est adaptée à cet usage précisément parce qu'elle
 * sacrifie le confort de lecture à la densité temporelle.
 *
 * ── LA COUPURE PAR JOUR EST CALCULÉE CÔTÉ CLIENT ─────────────────────────────
 *
 * « Aujourd'hui » et « Hier » dépendent du fuseau du LECTEUR, pas du serveur. Rendus
 * côté serveur, ils seraient faux pour la moitié de la planète et provoqueraient en
 * prime un écart d'hydratation. Le composant est donc client, et le regroupement se
 * fait au rendu — comme `useRelativeTime`, qui existe pour la même raison.
 */
export function AssetNewsRail({
  news,
  name,
}: {
  /** Articles DÉJÀ filtrés sur l'actif par l'appelant. */
  news: NewsItem[]
  name: string
}) {
  if (news.length === 0) {
    return (
      <p className="rounded-card border border-border-subtle bg-surface px-3 py-4 text-xs leading-relaxed text-ink-muted">
        Aucun de nos flux n’a écrit « {name} » récemment. Ce n’est pas la preuve qu’il ne
        s’est rien passé — seulement qu’aucune de nos sources ne l’a nommé.
      </p>
    )
  }

  /*
   * Tri décroissant AVANT le regroupement.
   *
   * Les flux arrivent agrégés source par source, donc dans un ordre qui n'a rien de
   * chronologique. Grouper d'abord donnerait des journées correctes mais désordonnées
   * à l'intérieur — et un rail dont la première ligne n'est pas la plus récente ne
   * sert plus à rattacher un décrochage à un événement.
   */
  const sorted = [...news].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  )

  const groups = groupByDay(sorted)

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <section key={group.key}>
          <h3 className="sticky top-0 z-10 -mx-0.5 bg-canvas/95 px-0.5 pb-1.5 pt-0.5 text-[0.6875rem] font-semibold uppercase tracking-wide text-ink-muted backdrop-blur">
            {group.label}
          </h3>

          <ol className="space-y-3">
            {group.items.map((item) => (
              <li key={item.id}>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="group block"
                >
                  {/* La puce et l'heure AVANT le titre, comme chez CoinGecko : dans une
                      colonne qu'on parcourt du regard pour situer un événement, c'est
                      le QUAND qu'on cherche en premier, pas le quoi. */}
                  <span className="mb-1 flex items-center gap-1.5 text-[0.6875rem] text-ink-muted">
                    <span
                      className="h-1.5 w-1.5 shrink-0 rounded-pill bg-border-subtle"
                      aria-hidden="true"
                    />
                    <RelativeTime iso={item.publishedAt} />
                  </span>

                  <span className="block text-xs font-medium leading-snug text-ink transition-colors group-hover:text-brand-strong">
                    {item.title}
                  </span>

                  <span className="mt-1.5 inline-flex items-center rounded-pill border border-border-subtle px-2 py-0.5 text-micro text-ink-muted">
                    {item.source}
                  </span>
                </a>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  )
}

/** Isolé dans son composant : `useRelativeTime` est un crochet, il ne peut pas être
    appelé dans la boucle de rendu du parent. */
function RelativeTime({ iso }: { iso: string }) {
  return <>{useRelativeTime(iso)}</>
}

interface DayGroup {
  key: string
  label: string
  items: NewsItem[]
}

/**
 * Regroupe par journée LOCALE, en conservant l'ordre reçu.
 *
 * La clé est la date au format ISO court plutôt que le libellé : deux jours
 * différents peuvent porter le même libellé traduit une fois le mois écoulé, et un
 * regroupement par libellé les fusionnerait silencieusement.
 */
function groupByDay(items: NewsItem[]): DayGroup[] {
  const today = startOfDay(new Date())
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  const groups = new Map<string, DayGroup>()

  for (const item of items) {
    const date = new Date(item.publishedAt)
    if (Number.isNaN(date.getTime())) continue

    const day = startOfDay(date)
    const key = day.toISOString().slice(0, 10)

    if (!groups.has(key)) {
      const label =
        day.getTime() === today.getTime()
          ? "Aujourd'hui"
          : day.getTime() === yesterday.getTime()
            ? 'Hier'
            : day.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
      groups.set(key, { key, label, items: [] })
    }

    groups.get(key)!.items.push(item)
  }

  return [...groups.values()]
}

function startOfDay(date: Date): Date {
  const copy = new Date(date)
  copy.setHours(0, 0, 0, 0)
  return copy
}
