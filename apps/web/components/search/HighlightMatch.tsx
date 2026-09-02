import type { ReactNode } from 'react'

import { matchRange } from '@/components/search/match-range'

/**
 * Met en évidence la partie du texte qui correspond à ce qui a été tapé.
 *
 * ── POURQUOI CELA COMPTE PLUS QU'IL N'Y PARAÎT ─────────────────────────────
 *
 * Une liste de résultats répond à deux questions : « qu'as-tu trouvé ? » et « POURQUOI
 * as-tu trouvé ça ? ». La seconde reste muette sans surbrillance — on tape « eth », on
 * obtient « Lido Staked Ether », et on ne voit pas d'où vient la correspondance.
 *
 * Tout le calcul vit dans `match-range.ts`, sous test. Ce composant ne fait que
 * découper aux bornes qu'on lui donne : c'est la raison de la séparation, et elle tient
 * en ce que ce fichier n'a plus rien qui puisse être faux.
 */
export function HighlightMatch({ text, query }: { text: string; query: string }): ReactNode {
  const bornes = matchRange(text, query)
  if (bornes === null) return text

  const [de, a] = bornes

  return (
    <>
      {text.slice(0, de)}
      {/* `<mark>` et non un `<span>` coloré : c'est l'élément que HTML réserve à « ce
          passage est pertinent pour ce que le lecteur cherche », et les lecteurs
          d'écran l'annoncent comme tel.

          Son fond jaune par défaut ne suivrait pas le thème — d'où la remise à plat,
          qui garde la SÉMANTIQUE et confie l'apparence à la palette. La graisse fait le
          travail que le fond faisait, sans peindre un rectangle dans une liste dense. */}
      <mark className="bg-transparent font-semibold text-brand-strong">{text.slice(de, a)}</mark>
      {text.slice(a)}
    </>
  )
}
