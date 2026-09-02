import type { ReactNode } from 'react'

import { ChartsSidebar } from '@/components/market/ChartsSidebar'
import { ChartsTabs } from '@/components/market/ChartsTabs'
import { getPhrase } from '@/lib/content'

/**
 * L'ENVELOPPE COMMUNE aux pages de graphiques globaux — rail, onglets, titre.
 *
 * ── POURQUOI UN COMPOSANT ET NON UN `layout.tsx` ───────────────────────────
 *
 * Un layout Next.js ne connaît pas le chemin qu'il enveloppe : il n'a ni
 * `searchParams` ni `params` de la page enfant, et le rail a besoin de savoir
 * laquelle de ses entrées est courante. On peut le déduire des en-têtes de requête,
 * mais cela rend la route dynamique — au prix du cache que ces pages ont justement
 * (`revalidate = 180`).
 *
 * Chaque page passe donc son propre chemin. C'est explicite, et le compilateur
 * signale l'oubli : le paramètre est obligatoire.
 *
 * ⚠️ TROIS DES ENTRÉES DU RAIL N'UTILISENT PAS CETTE ENVELOPPE — `/categories`,
 * `/heatmap` et `/sentiment` sont des pages autonomes, antérieures, avec leur propre
 * mise en page. Le rail y renvoie sans les absorber (voir `charts-nav`).
 */
export async function ChartsShell({
  current,
  title,
  lead,
  children,
}: {
  /** Chemin de la page, tel qu'il figure dans `charts-nav`. */
  current: string
  title: string
  lead: string
  children: ReactNode
}) {
  const t = await getPhrase()

  return (
    /*
      ── DEUX COLONNES : LE RAIL, PUIS LA VUE ────────────────────────────────
      C'est la disposition de la référence. Le rail est `sticky` et disparaît sous
      `lg` (voir `ChartsSidebar`) ; `min-w-0` sur la colonne de droite est
      OBLIGATOIRE, sans quoi la largeur minimale d'une piste flexible est celle de
      son contenu — un tableau large y pousserait le rail hors de l'écran au lieu de
      défiler dans sa propre boîte.
    */
    /* `gap-6` et non `gap-8` : la barre porte désormais un filet à droite, et
       trente-deux pixels entre un filet et le contenu font un couloir vide. */
    <div className="flex gap-6">
      <ChartsSidebar current={current} />

      {/* `space-y-5` : Blockworks resserre. Son titre, ses onglets et sa première
          carte tiennent dans les deux cents premiers pixels — ce qui compte sur une
          page dont l'objet est de MONTRER des figures, pas de les annoncer. */}
      <div className="min-w-0 flex-1 space-y-5">
        {/*
          ══════════════════════════════════════════════════════════════════════
          LE TITRE PASSE AVANT LES ONGLETS, ET RÉTRÉCIT

          Il venait APRÈS eux, en `display-xl` — c'est-à-dire qu'on lisait une rangée
          d'onglets avant de savoir de quelle page ils sont les onglets.

          Blockworks pose le titre en tête à 22 px graisse 600, la phrase de résumé
          juste dessous en petit, puis les onglets. L'ordre est celui de la question
          qu'on se pose : où suis-je, de quoi s'agit-il, que puis-je voir d'autre.

          `display-xl` faisait 40 px et prenait deux lignes sur les titres longs. À
          22 px le titre tient sur une ligne et cesse de repousser la première figure
          sous la ligne de flottaison.
          ══════════════════════════════════════════════════════════════════════ */}
        <header className="space-y-1">
          <h1 className="text-[1.375rem] font-semibold leading-tight text-ink">{t(title)}</h1>
          <p className="max-w-3xl text-sm leading-relaxed text-ink-muted">{t(lead)}</p>
        </header>

        <ChartsTabs current={current} />

        {children}
      </div>
    </div>
  )
}

/**
 * Repère d'attente des vues mises en flux.
 *
 * Une PHRASE et non une silhouette grise. Un squelette animé promet une forme, et se
 * justifie quand l'attente dure une seconde ; celle-ci peut durer trente sur un cache
 * froid, et une silhouette qui palpite une demi-minute se lit comme un blocage. Dire
 * ce qu'on attend, et pourquoi c'est long, informe là où une animation décore.
 */
export async function LoadingNote({ label }: { label: string }) {
  const t = await getPhrase()
  return (
    <p className="rounded-card border border-border-subtle bg-surface px-4 py-6 text-sm text-ink-muted">
      {label}
      <span className="block pt-1 text-xs">
        {t(
          'Cette source se demande une entrée à la fois et limite fortement les appels gratuits : le premier chargement peut prendre plusieurs dizaines de secondes. Les suivants sont servis depuis le cache pendant une heure.',
        )}
      </span>
    </p>
  )
}
