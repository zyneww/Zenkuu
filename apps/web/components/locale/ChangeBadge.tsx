'use client'

import type { ComponentProps } from 'react'

import { ChangeBadge as Badge } from '@zenkuu/ui'
import { useLocale } from 'next-intl'

import { usePhrase } from '@/components/locale/ContentProvider'

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
 * ── L'`aria-label` ET L'INFOBULLE SONT TRADUITS ICI, ET NULLE PART AILLEURS ──
 *
 * Ils sortaient EN FRANÇAIS DANS LES TREIZE LANGUES : un utilisateur de synthèse
 * vocale anglophone entendait « en hausse de 2,34 % sur 24 heures ». Le composant de
 * `packages/ui` accepte pour cela une propriété `libelles`, dont son en-tête annonçait
 * qu'elle servirait à traiter « les quarante-huit points d'appel un par un ». Elle
 * n'était passée nulle part : la migration n'avait jamais commencé, et elle n'avait
 * pas à commencer sous cette forme.
 *
 * Cette enveloppe la remplit UNE FOIS pour les quarante-sept appels. C'est le même
 * mouvement que pour `locale`, et pour la même raison : ce que `packages/ui` ne peut
 * pas savoir, l'application le sait ici, et une seule fois.
 *
 * ⚠️ `moins` DOIT FINIR PAR UNE ESPACE, et la clé de traduction ne la porte pas. Le
 * composant l'insère par `formatted.replace('−', libelles.moins)` : sans elle, la
 * synthèse vocale lit « moins2,34 % ». C'est une contrainte de GABARIT, pas de
 * langue — une clé « moins » avec une espace invisible au bout serait un piège pour
 * les douze traducteurs, et la première à sauter au premier nettoyage d'éditeur.
 *
 * ── `periodLabel` EST TRADUIT ICI AUSSI, ET C'EST LA TABLE QUI LE PERMET ─────
 *
 * Il restait français quand un appelant en passait un — dix-neuf points d'appel, et le
 * repli traduit ne servait qu'aux autres. Une première note attribuait la moitié du
 * défaut au FOURNISSEUR, via `changePeriodLabel` : **c'était inexact**. Ce champ n'est
 * écrit qu'à un seul endroit de tout le dépôt, `providers/frankfurter.ts`, et c'est
 * notre propre code qui y met « depuis le taux BCE précédent ». Rien ne venait du
 * dehors, donc rien n'était hors de portée.
 *
 * La table de phrases étant INDEXÉE PAR LE TEXTE FRANÇAIS, lui passer une chaîne
 * française est exactement le mécanisme prévu : `t()` rend la traduction si la clé
 * existe, et la chaîne d'entrée sinon. Une ligne couvre donc les dix-neuf appels, et
 * un libellé futur sans clé retombe sur le comportement d'aujourd'hui plutôt que de
 * casser.
 *
 * ⚠️ TOUS LES `periodLabel` NE PASSENT PAS PAR ICI. `TreemapFigure` en reçoit un aussi
 * et compose « sur {periodLabel} » de son côté, sans toucher à ce badge — d'où
 * « l'acquisition » dans `TreasuryOverview`, qui n'a pas de sens hors de cette phrase
 * et n'a donc pas de clé.
 */
export function ChangeBadge(props: Omit<ComponentProps<typeof Badge>, 'locale' | 'libelles'>) {
  const locale = useLocale()
  const t = usePhrase()

  return (
    <Badge
      {...props}
      locale={locale}
      {...(props.periodLabel !== undefined ? { periodLabel: t(props.periodLabel) } : {})}
      libelles={{
        hausse: t('en hausse de'),
        baisse: t('en baisse de'),
        stable: t('stable,'),
        moins: `${t('moins')} `,
        periodeDefaut: t('sur 24 heures'),
        variation: t('Variation'),
        absente: t('Donnée non fournie par la source'),
      }}
    />
  )
}
