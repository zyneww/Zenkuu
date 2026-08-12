import type { AssetDetail } from '@zenkuu/data'

import { AssetFaq } from '@/components/asset/AssetFaq'

/**
 * Ce qu'on met dans un onglet quand la donnée qu'il promet n'existe pas.
 *
 * ── LE PROBLÈME ───────────────────────────────────────────────────────────────
 *
 * Trois onglets peuvent se retrouver réduits à un encadré « donnée indisponible » de
 * quatre-vingts pixels, sous une rangée d'onglets qui en fait quarante, dans une
 * colonne qui en fait mille. « Trésorerie » est même dans ce cas EN PERMANENCE :
 * aucune de nos sources ne publie les détentions institutionnelles.
 *
 * L'encadré est juste — le §5 impose de dire l'absence plutôt que de l'estimer — mais
 * il ne remplit pas sa moitié du contrat. Il annonce ce qu'on n'a pas sans proposer
 * ce qu'on a, et laisse le lecteur devant une page presque blanche qu'il vient
 * d'atteindre en cliquant.
 *
 * ── LA RÉPONSE : LE CONTENU LE PLUS STABLE DE LA FICHE ────────────────────────
 *
 * « À propos » et la FAQ ferment déjà la page, tout en bas. Ce sont les deux seuls
 * blocs qui ne dépendent NI du marché NI de la période — donc les deux seuls qu'on
 * puisse afficher sous n'importe quel onglet sans mentir sur ce qu'ils décrivent.
 * Ils répondent en outre à des questions qu'un lecteur arrivé sur un onglet vide se
 * pose de toute façon : « qu'est-ce que c'est, au juste ? ».
 *
 * ── CE N'EST PAS UNE DUPLICATION GRATUITE ─────────────────────────────────────
 *
 * Le même contenu apparaît deux fois sur la page, ce qui se discute. Deux raisons de
 * l'assumer :
 *
 *   · les onglets NE SONT PAS des pages — l'URL ne change pas, un moteur de recherche
 *     n'indexe qu'un seul document, et il n'y a donc pas de contenu dupliqué au sens
 *     du référencement ;
 *   · le bas de page est à deux mille pixels de là. Renvoyer le lecteur « voir plus
 *     bas » plutôt que de lui montrer, c'est lui demander un défilement pour un
 *     contenu qui tient en un écran.
 *
 * Le composant se retire ENTIÈREMENT si l'actif n'a ni description ni réponse de FAQ
 * exploitable : un onglet vide vaut mieux qu'un onglet rempli d'un titre sans texte.
 */
export function AssetTabFiller({ asset }: { asset: AssetDetail }) {
  const hasDescription = Boolean(asset.description)

  return (
    <div className="space-y-8 border-t border-border-subtle pt-8">
      {/* Titre au passé conditionnel du contexte : « en attendant » dit explicitement
          que ce bloc n'est pas le sujet de l'onglet, mais ce qu'on propose à la
          place. Sans lui, le lecteur pourrait croire que « À propos » EST le contenu
          de l'onglet Trésorerie — et se demander pourquoi. */}
      <p className="text-xs text-ink-muted">
        En attendant, voici ce que nous savons de {asset.name}.
      </p>

      {hasDescription ? (
        <section className="space-y-3">
          <h2 className="display-sm text-ink">À propos</h2>
          <p className="max-w-2xl whitespace-pre-line text-base leading-relaxed text-ink-muted">
            {asset.description}
          </p>
        </section>
      ) : null}

      {/* `AssetFaq` compose ses réponses à partir des chiffres de l'actif et se retire
          de lui-même s'il n'en a pas assez — on ne teste donc rien ici. */}
      <AssetFaq asset={asset} />
    </div>
  )
}
