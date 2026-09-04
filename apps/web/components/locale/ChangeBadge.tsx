'use client'

import type { ComponentProps } from 'react'

import { ChangeBadge as Badge } from '@zenkuu/ui'
import { useLocale } from 'next-intl'

/**
 * La variation de prix, dans la langue de la page.
 *
 * ── POURQUOI UNE ENVELOPPE PLUTÔT QUE QUARANTE-SEPT PROPRIÉTÉS ───────────────
 *
 * `packages/ui` ne connaît aucune locale — c'est sa contrainte fondatrice, et celle
 * qui a produit le défaut : `ChangeBadge` appelait `formatPercent(value)` sans
 * langue, retombait sur le défaut anglo-saxon, et une page française affichait
 * « 0,032 $US » à côté de « −13.43% ». Deux conventions dans la même cellule.
 *
 * Le remède évident — passer la langue à chaque appel — aurait touché quarante-sept
 * points d'appel dans trente-deux fichiers, dont vingt-deux n'ont aucune locale en
 * portée. Une enveloppe la tient une fois pour tous.
 *
 * ── ELLE PORTE LE MÊME NOM, ET C'EST DÉLIBÉRÉ ────────────────────────────────
 *
 * Les quarante-sept balises `<ChangeBadge …>` restent écrites telles quelles : seule
 * la LIGNE D'IMPORT change de source. Un renommage aurait produit le même résultat
 * en touchant quarante-sept lignes de plus, sans rien apprendre à personne.
 *
 * ── COMPOSANT CLIENT, COMME `Money` ──────────────────────────────────────────
 *
 * Même raisonnement que lui, et même voisinage : les deux vivent dans la même cellule
 * de tableau, si bien que ce badge n'ajoute aucune frontière que le montant d'à côté
 * ne franchisse déjà. Les propriétés qui le traversent sont toutes sérialisables, un
 * composant serveur peut donc le rendre sans rien changer chez lui.
 *
 * ── CE QU'ELLE NE CORRIGE PAS ────────────────────────────────────────────────
 *
 * ⚠️ L'`aria-label` ET L'INFOBULLE RESTENT FRANÇAIS DANS LES TREIZE LANGUES. Le
 * composant de `packages/ui` accepte pour cela une propriété `libelles`, dont son
 * en-tête dit qu'elle existe justement pour traiter « les quarante-huit points
 * d'appel un par un ». Mesuré : elle n'est passée nulle part, la migration n'a jamais
 * commencé.
 *
 * Cette enveloppe la rend faisable EN UN SEUL ENDROIT — ici, avec `usePhrase()` — au
 * lieu des quarante-huit annoncés. Elle n'est pas faite : c'est une décision de
 * mise en scène qui appartient à qui l'a prise, et sept phrases à traduire en douze
 * langues n'entrent pas dans un correctif de formatage.
 */
export function ChangeBadge(props: Omit<ComponentProps<typeof Badge>, 'locale'>) {
  const locale = useLocale()

  return <Badge {...props} locale={locale} />
}
