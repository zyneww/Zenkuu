'use client'

import { History, LineChart, Scissors, Table2 } from 'lucide-react'
import { useSelectedLayoutSegment } from 'next/navigation'

import { usePhrase } from '@/components/locale/ContentProvider'
import type { AppHref } from '@/i18n/navigation'
import { metricsHref } from '@/lib/asset-metrics'
import { assetHref } from '@/lib/asset-routes'
import type { AssetClass } from '@zenkuu/data'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * LE REGISTRE DES ONGLETS D'UNE FICHE
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── POURQUOI IL EXISTE À PART DE LA RANGÉE ──────────────────────────────────
 *
 * Deux lecteurs, et le second est arrivé avec le bandeau persistant. La RANGÉE dessine
 * les onglets ; le FIL D'ARIANE a besoin du seul libellé de l'onglet courant, pour que
 * son dernier maillon dise « Métriques » plutôt que de répéter le nom de l'actif.
 *
 * ⚠️ SANS CE PARTAGE, LA PAGE PORTERAIT DEUX `aria-current="page"`. Le fil marque son
 * dernier maillon comme la page courante, la rangée marque son onglet actif de même :
 * si le fil s'arrêtait au nom de l'actif, il désignerait comme courante une page qu'on
 * a quittée, et deux éléments se déclareraient « la page » en même temps. Le maillon
 * d'onglet règle les deux d'un coup — le nom de l'actif redevient un lien vers l'aperçu,
 * et le seul `aria-current` du fil est celui qui dit vrai.
 *
 * ── L'ONGLET ACTIF SE LIT DANS LE SEGMENT DE ROUTE, PAS DANS UNE PROP ───────
 *
 * `useSelectedLayoutSegment()` rend le segment de FICHIER du sous-chemin actif —
 * `null` sur l'aperçu, `'metriques'`, `'historique'`, `'halving'` ailleurs. Il est donc
 * insensible à la langue : `/en/crypto/bitcoin/metrics` rend `'metriques'`, parce que
 * c'est le nom du dossier et non celui de l'URL.
 *
 * C'est ce qui a permis de retirer la prop `active` que chaque page passait à la main.
 * Elle était une occasion de mentir — une page pouvait se déclarer sur un onglet qu'elle
 * n'était pas — et surtout, le bandeau étant désormais rendu UNE SEULE FOIS par le
 * layout partagé, il n'y a plus personne pour la passer.
 *
 * ⚠️ LE CROCHET NE VAUT QUE SOUS LE LAYOUT DE LA FICHE. Il rend le segment relatif à la
 * mise en page la plus proche ; appelé depuis un composant rendu ailleurs, il
 * désignerait un autre niveau de l'arbre. Ses deux appelants vivent dans `AssetShell`.
 */

export interface AssetTab {
  /** Segment de route, ou `null` pour l'aperçu — qui n'en a pas. */
  segment: string | null
  label: string
  icon: typeof LineChart
  href: AppHref
}

export function useAssetTabs(assetClass: AssetClass, id: string): {
  tabs: AssetTab[]
  active: AssetTab | undefined
} {
  const t = usePhrase()
  const segment = useSelectedLayoutSegment()

  /* ⚠️ L'HISTORIQUE ET LE HALVING NE SONT DÉCLARÉS QUE POUR LA CRYPTO dans
     `i18n/pathnames.ts` : leurs littéraux de route n'existent pas pour les autres
     classes, et le typage de `Link` refuserait la compilation. Les deux premiers
     onglets, eux, se composent par les tables de routes et valent pour les six. */
  const crypto = assetClass === 'crypto'

  const tabs: AssetTab[] = [
    {
      segment: null,
      /* « Aperçu » et « Valeurs historiques » SONT DÉJÀ DANS LA TABLE DE PHRASES, et
         c'est la raison de ce choix d'intitulés. La table est indexée par le texte
         français et `phrases.test.ts` exige que les douze locales portent exactement
         les mêmes clés : un mot inventé ici, ce sont douze traductions à écrire, ou
         un onglet qui sort en français sur les onze autres langues.

         « Halving » n'y est pas, et reste tel quel : c'est le terme employé sans
         traduction dans la plupart des langues, et c'est déjà celui qu'affichait le
         fil d'Ariane de la page elle-même. */
      label: t('Aperçu'),
      icon: LineChart,
      /* `assetHref` plutôt qu'un littéral : la fiche a six routes selon la classe, et
         la table qui les tient est déjà écrite. */
      href: assetHref(assetClass, id),
    },
    {
      segment: 'metriques',
      label: t('Métriques'),
      icon: Table2,
      href: metricsHref(assetClass, id),
    },
    ...(crypto
      ? [
          {
            segment: 'historique',
            label: t('Valeurs historiques'),
            icon: History,
            href: { pathname: '/crypto/[id]/historique' as const, params: { id } },
          },
        ]
      : []),
    /* Le halving est une règle du protocole du bitcoin, et la route le vérifie :
       `if (id !== 'bitcoin') notFound()`. L'onglet suit la même condition, sinon il
       promettrait une page qui répond 404. */
    ...(crypto && id === 'bitcoin'
      ? [
          {
            segment: 'halving',
            label: t('Halving'),
            icon: Scissors,
            href: { pathname: '/crypto/[id]/halving' as const, params: { id } },
          },
        ]
      : []),
  ]

  return { tabs, active: tabs.find((tab) => tab.segment === segment) }
}
