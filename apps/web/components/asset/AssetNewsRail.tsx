'use client'

import Image from 'next/image'
import { useState } from 'react'

import type { NewsItem } from '@zenkuu/data'

import { useRelativeTime } from '@/components/locale/useRelativeTime'
import { isOptimizableNewsImage } from '@/lib/news-image-hosts'

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
          {/*
            LE TITRE DE JOURNÉE REDEVIENT COLLANT.

            Il l'avait été, puis ne l'avait plus été, et les deux décisions étaient
            justes en leur temps — c'est le CONTENANT qui a changé deux fois :

              · fil dans un cadre défilant  → collant, il se fixe en haut du cadre ;
              · fil défilant avec la page   → NON collant, sinon il se fixerait au bord
                de la fenêtre, c'est-à-dire derrière l'en-tête du site : invisible tout
                en réservant sa place, le pire des deux mondes ;
              · fil dans un cadre défilant  → collant de nouveau (état actuel).

            Le cadre est revenu avec `overscroll-contain` — voir `AssetNewsAside`. Le
            titre se fixe donc en haut de la surface défilante, et l'on sait toujours
            quelle journée on lit, même après vingt articles.

            `bg-canvas` est indispensable : sans fond, les articles défileraient VISIBLES
            derrière le titre. Le `-mx-0.5 px-0.5` étend ce fond d'un demi-cran de chaque
            côté pour couvrir les descendants qui affleurent.
          */}
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
                  className="group flex gap-2.5"
                >
                  {/*
                    ── LA VIGNETTE, ET POURQUOI ELLE EST PETITE ────────────────

                    Le rail n'en portait aucune, au motif — écrit en tête de fichier —
                    qu'il sacrifie le confort de lecture à la densité temporelle. Le
                    principe reste juste ; c'est la conclusion qui allait trop loin.

                    Une vignette de 48 pixels ne coûte pas de hauteur : elle tient dans
                    celle que le titre occupe déjà, sur deux lignes. Et elle gagne ce
                    qu'aucun texte ne donne aussi vite — la reconnaissance de l'article
                    déjà vu ailleurs, et l'identification du sujet (un graphique, un
                    portrait, un logo de plateforme) avant même d'avoir lu.

                    Elle est DÉCORATIVE : `alt=""` et le lien porte déjà le titre. Une
                    description de vignette d'article ne serait de toute façon qu'une
                    répétition du titre pour un lecteur d'écran.
                  */}
                  <NewsThumbnail item={item} />

                  <span className="min-w-0 flex-1">
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

/**
 * Vignette d'un article — ou rien du tout.
 *
 * ── TROIS ISSUES, ET AUCUNE N'EST UNE IMAGE BRISÉE ──────────────────────────
 *
 * 1. L'article n'a pas de vignette. Sept des vingt-neuf flux n'en publient aucune, et
 *    `fetchOgImage` ne complète qu'un lot borné. On rend `null` : la ligne redevient
 *    ce qu'elle était, du texte pleine largeur.
 *
 * 2. L'hôte n'est pas déclaré dans `next.config.ts`. On rend `null` AVANT d'essayer.
 *    C'est le point qui compte : l'optimiseur de Next lève sur un hôte inconnu, et
 *    comme la vérification a lieu au rendu, une seule vignette d'un éditeur qui a
 *    changé de CDN mettrait la fiche entière en erreur 500. Voir `news-image-hosts`.
 *
 * 3. L'hôte est déclaré mais le fichier a disparu. `onError` retire alors la vignette,
 *    ce que le point 2 ne peut pas prévoir — un 404 ne s'anticipe pas.
 *
 * ── `sizes` EST OBLIGATOIRE ET NON DÉCORATIF ────────────────────────────────
 *
 * Sans lui, Next demande la plus grande variante possible, soit plusieurs centaines de
 * kilo-octets par vignette de 48 pixels. Déclaré, il fait servir la variante de 96 px
 * — le double, pour les écrans à densité élevée.
 */
function NewsThumbnail({ item }: { item: NewsItem }) {
  const [failed, setFailed] = useState(false)

  if (failed || !isOptimizableNewsImage(item.imageUrl)) return null

  return (
    <span className="block h-12 w-12 shrink-0 overflow-hidden rounded-control bg-surface-muted">
      <Image
        src={item.imageUrl}
        alt=""
        width={48}
        height={48}
        sizes="48px"
        /* `no-referrer` : la vignette est hébergée par l'ÉDITEUR, l'afficher fait donc
           appeler son serveur depuis le navigateur du lecteur. Sans cet attribut, il
           saurait depuis quelle fiche de ZENKUU l'image a été chargée — voir la note du
           champ dans `types.ts`. */
        referrerPolicy="no-referrer"
        className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
        onError={() => setFailed(true)}
      />
    </span>
  )
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
