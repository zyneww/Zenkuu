import type { ReactNode } from 'react'

import { LinkTabs, TabsBar } from '@/components/ui/LinkTabs'
import type { AppHref } from '@/i18n/navigation'
import { getPhrase } from '@/lib/content'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * L'ENVELOPPE DES QUATRE PAGES « ANALYTICS »
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Titre, phrase de résumé, rangée d'onglets. La même disposition que `ChartsShell`,
 * et pour la même raison qu'elle donne : un `layout.tsx` de Next ne connaît pas le
 * chemin qu'il enveloppe, et le déduire des en-têtes de requête rendrait les quatre
 * routes dynamiques — c'est-à-dire leur ferait perdre le cache d'une heure qui est
 * précisément ce qui rend ces pages tenables.
 *
 * Chaque page passe donc son chemin. Le compilateur signale l'oubli.
 *
 * ── PAS DE RAIL LATÉRAL, ALORS QUE LES RÉFÉRENCES EN ONT UN ────────────────
 *
 * Blockworks et Token Terminal posent une colonne de navigation à gauche. Ils ont de
 * quoi la remplir — plusieurs dizaines de vues. Il y en a QUATRE ici : un rail de
 * quatre entrées coûterait 220 px de largeur sur toutes les pages pour montrer ce
 * qu'une rangée d'onglets dit sur une ligne.
 *
 * `/graphiques` a déjà un rail, et c'est justifié là-bas — dix entrées réparties en
 * trois familles. Introduire un second paradigme de navigation pour quatre pages
 * apprendrait au lecteur une chose de plus sans lui en montrer davantage.
 *
 * ── LA VARIANTE PILULE, ET NON LE SOULIGNÉ ─────────────────────────────────
 *
 * C'est celle qui a été relevée chez Blockworks, et `LinkTabs` la porte déjà. Elle a
 * ici un avantage propre : ces quatre onglets ne sont pas les sections d'un même
 * document mais quatre lectures distinctes, et une pilule désigne un objet là où un
 * souligné désigne une position dans une séquence.
 */

/** Les quatre vues, dans l'ordre où elles se lisent. */
export const ANALYTICS_TABS: { id: string; href: AppHref; label: string }[] = [
  { id: '/analytics', href: '/analytics', label: 'Overview' },
  { id: '/analytics/blockchains', href: '/analytics/blockchains', label: 'Blockchains' },
  { id: '/analytics/tokenized-assets', href: '/analytics/tokenized-assets', label: 'Tokenized assets' },
  { id: '/analytics/apy', href: '/analytics/apy', label: 'APY' },
]

export async function AnalyticsShell({
  current,
  title,
  lead,
  children,
}: {
  /** Chemin de la page, tel qu'il figure dans `ANALYTICS_TABS`. */
  current: string
  title: string
  lead: string
  children: ReactNode
}) {
  const t = await getPhrase()

  return (
    <div className="space-y-5">
      {/* Le titre avant les onglets — l'ordre de `ChartsShell`, et celui de la question
          qu'on se pose : où suis-je, de quoi s'agit-il, que puis-je voir d'autre. */}
      <header className="space-y-1">
        <h1 className="text-[1.375rem] font-semibold leading-tight text-ink">{t(title)}</h1>
        <p className="max-w-3xl text-sm leading-relaxed text-ink-muted">{t(lead)}</p>
      </header>

      <TabsBar ariaLabel={t('Vues analytiques')} variant="pill">
        {/* ⚠️ LES LIBELLÉS D'ONGLETS NE PASSENT PAS PAR `t()`, et c'est délibéré :
            « Overview », « Blockchains », « APY » sont les noms des routes, écrits en
            anglais des deux côtés (voir la note de `pathnames.ts`). Traduire l'étiquette
            d'un lien dont l'adresse reste anglaise ferait diverger ce qu'on lit de ce
            qu'on atteint. */}
        <LinkTabs variant="pill" tabs={ANALYTICS_TABS} active={current} />
      </TabsBar>

      {children}
    </div>
  )
}

/**
 * Repère d'attente — le même parti que `LoadingNote` de `ChartsShell`.
 *
 * Une phrase et non une silhouette animée : ces réponses pèsent plusieurs mégaoctets
 * et le premier chargement peut durer plusieurs secondes. Un squelette qui palpite
 * pendant ce temps se lit comme un blocage ; dire ce qu'on attend informe.
 */
export async function AnalyticsLoading({ label }: { label: string }) {
  const t = await getPhrase()
  return (
    <p className="rounded-card border border-border-subtle bg-surface px-4 py-6 text-sm text-ink-muted">
      {label}
      <span className="block pt-1 text-xs">
        {t('Réponse volumineuse, mise en cache une heure après le premier chargement.')}
      </span>
    </p>
  )
}
