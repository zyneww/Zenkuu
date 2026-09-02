'use client'

import { useMemo, useState } from 'react'
import { ChevronDown, Search } from 'lucide-react'

import { Link } from '@/i18n/navigation'
import { usePhrase } from '@/components/locale/ContentProvider'
import { CHART_GROUPS, CHART_INDICATORS, CHART_LINKS } from '@/components/market/charts-nav'
import { matchRange } from '@/components/search/match-range'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * LA BARRE LATÉRALE DES ANALYSES — RÉÉCRITE SUR BLOCKWORKS
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Relevé sur blockworks.com/analytics le 2026-09-02 : 187 px de large, fond
 * transparent, un filet à droite (#282a2f), un champ de recherche en tête, puis des
 * groupes repliables — intitulé 14 px graisse 600 en blanc, entrées 14 px graisse 500
 * en gris.
 *
 * ── CE QUE LA VERSION PRÉCÉDENTE FAISAIT, ET CE QUI CHANGE ─────────────────
 *
 * Elle listait neuf entrées réparties en trois blocs, chacune précédée d'un
 * pictogramme, sans champ de recherche et sans repli. À neuf entrées cela tenait ;
 * c'est justement ce qui la rendait fragile — la dixième ou la quinzième auraient
 * allongé la colonne sans que rien ne s'y oppose.
 *
 * Blockworks en affiche une trentaine dans la même hauteur, et y arrive par deux
 * moyens : les groupes se replient, et un champ filtre l'ensemble. Les deux sont
 * repris ici, non parce que neuf entrées le demandent, mais parce que c'est ce qui
 * rend la barre indifférente à leur nombre.
 *
 * ── LE CHAMP CHERCHE DANS TOUTES LES ENTRÉES, GROUPES REPLIÉS COMPRIS ──────
 *
 * C'est sa raison d'être : une entrée qu'on ne trouve pas parce que son groupe est
 * fermé serait pire que pas de champ du tout. Pendant une recherche, les groupes qui
 * portent un résultat s'ouvrent, et ceux qui n'en portent aucun disparaissent.
 *
 * ── LES PICTOGRAMMES ONT ÉTÉ RETIRÉS ──────────────────────────────────────
 *
 * Neuf pictogrammes différents dans une colonne de 187 px, c'est neuf formes à
 * apprendre pour distinguer neuf mots déjà écrits à côté. La référence n'en a aucun,
 * et sa colonne se lit plus vite. Ce qui reste — l'indentation sous un intitulé de
 * groupe — dit tout ce que l'œil a besoin de savoir.
 */

type Entree = { label: string; href: string }
type Groupe = { titre: string; entrees: Entree[] }

export function ChartsSidebar({ current }: { current: string }) {
  const t = usePhrase()
  const [requete, setRequete] = useState('')

  /* Les trois groupes, construits une fois depuis la navigation existante. Le
     découpage ne change pas — c'est sa PRÉSENTATION qui est réécrite. */
  const groupes: Groupe[] = useMemo(
    () => [
      { titre: 'Marchés', entrees: CHART_GROUPS[0]?.entries ?? [] },
      { titre: 'Secteurs', entrees: CHART_LINKS },
      { titre: 'Indicateurs', entrees: CHART_INDICATORS },
    ],
    [],
  )

  const terme = requete.trim()

  /* La recherche compare sur les libellés TRADUITS, pas sur les clés françaises : un
     lecteur anglophone tape « heat », pas « thermique ». `matchRange` ignore la casse
     et les accents — c'est le même code que la recherche du site, déjà sous test. */
  const filtres = useMemo(
    () =>
      groupes
        .map((groupe) => ({
          ...groupe,
          entrees: groupe.entrees.filter(
            (e) => terme === '' || matchRange(t(e.label), terme) !== null,
          ),
        }))
        .filter((groupe) => groupe.entrees.length > 0),
    [groupes, terme, t],
  )

  return (
    /* 187 px mesurés, `shrink-0` pour que la colonne ne se comprime pas quand le
       contenu de droite est large. Elle disparaît sous `lg` : à 187 px sur un
       téléphone il ne resterait rien pour le contenu, et `ChartsTabs` prend le relais. */
    <aside
      aria-label={t('Analyses')}
      className="hidden w-[187px] shrink-0 border-r border-border-subtle pr-4 lg:block"
    >
      <div className="sticky top-[calc(var(--header-height)+1rem)] space-y-4">
        <label className="relative block">
          <span className="sr-only">{t('Filtrer les analyses')}</span>
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-ink-muted"
          />
          <input
            type="search"
            value={requete}
            onChange={(event) => setRequete(event.target.value)}
            placeholder={t('Rechercher')}
            className="w-full rounded-control border border-border-subtle bg-surface-muted py-1.5 pl-8 pr-2 text-xs text-ink placeholder:text-ink-muted focus:border-brand focus:outline-none"
          />
        </label>

        {filtres.length === 0 ? (
          <p className="px-1 text-xs text-ink-muted">{t('Aucune analyse ne correspond')}</p>
        ) : null}

        {filtres.map((groupe) => (
          <GroupeVue
            key={groupe.titre}
            titre={t(groupe.titre)}
            entrees={groupe.entrees}
            current={current}
            /* Pendant une recherche les groupes s'ouvrent : un résultat caché dans un
               groupe replié ne serait pas un résultat. */
            ouvert={terme !== '' || groupe.entrees.some((e) => e.href === current)}
            t={t}
          />
        ))}
      </div>
    </aside>
  )
}

function GroupeVue({
  titre,
  entrees,
  current,
  ouvert,
  t,
}: {
  titre: string
  entrees: Entree[]
  current: string
  ouvert: boolean
  t: (text: string) => string
}) {
  return (
    /* `key={String(ouvert)}` force `<details>` à reprendre son état de départ quand la
       recherche change. Sans lui, un groupe que l'utilisateur a fermé resterait fermé
       alors qu'il porte désormais un résultat — `open` n'est qu'une valeur INITIALE sur
       un élément non contrôlé. */
    <details key={String(ouvert)} open={ouvert} className="group">
      <summary className="flex cursor-pointer list-none items-center justify-between py-1 text-sm font-semibold text-ink [&::-webkit-details-marker]:hidden">
        {titre}
        <ChevronDown
          aria-hidden="true"
          className="size-3.5 text-ink-muted transition-transform duration-150 group-open:rotate-180 motion-reduce:transition-none"
        />
      </summary>

      <ul className="mt-1 space-y-0.5">
        {entrees.map((entree) => {
          const actif = entree.href === current

          return (
            <li key={entree.href}>
              {/* 14 px graisse 500, mesuré. L'entrée active passe en encre pleine sur
                  la surface de survol — pas de filet latéral ni de gras : la colonne
                  est étroite, et un filet y mangerait de la largeur utile. */}
              <Link
                href={entree.href}
                aria-current={actif ? 'page' : undefined}
                className={`block rounded-control px-2 py-1.5 text-sm font-medium transition-colors ${
                  actif ? 'bg-surface-hover text-ink' : 'text-ink-muted hover:text-ink'
                }`}
              >
                {t(entree.label)}
              </Link>
            </li>
          )
        })}
      </ul>
    </details>
  )
}
