'use client'

import type { ReactNode } from 'react'

import { useCarousel } from '@/components/ui/carousel'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * LE FONDU DE BORD — CE QUI DÉBORDE S'EFFACE AU LIEU D'ÊTRE COUPÉ
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Un rail horizontal tranche ses cartes à ras : la dernière visible est sectionnée
 * net, et rien ne dit si c'est la fin de la liste ou s'il en reste. Le fondu répond à
 * cette question sans un mot — une carte qui s'efface annonce une suite, une carte
 * entière annonce la fin.
 *
 * ── LE MASQUE EST CONDITIONNEL, ET C'EST TOUT L'INTÉRÊT ────────────────────
 *
 * Un fondu permanent des deux côtés serait plus simple à écrire, et faux : au premier
 * chargement, la carte la plus à gauche s'effacerait alors qu'il n'y a rien avant elle.
 * Le lecteur comprendrait qu'il a raté quelque chose.
 *
 * `canScrollPrev` et `canScrollNext` viennent d'embla, qui les tient déjà à jour pour
 * désactiver les flèches. Le fondu apparaît donc EXACTEMENT du côté où il reste des
 * cartes, et disparaît en bout de course — la même vérité que les flèches, dite en
 * image.
 *
 * ── POURQUOI `mask-image` ET NON UN VOILE EN DÉGRADÉ ───────────────────────
 *
 * Un `<div>` en dégradé posé par-dessus doit connaître la couleur du FOND pour s'y
 * fondre. Sur un site à deux thèmes, cela veut dire deux dégradés, et un raccord qui
 * se voit dès qu'une carte passe dessous avec une couleur différente.
 *
 * `mask-image` ne peint rien : il rend le contenu progressivement TRANSPARENT. Le fond
 * réel apparaît donc dessous, quel qu'il soit, en clair comme en sombre, et sans
 * qu'aucune valeur de couleur ne soit écrite ici.
 *
 * ⚠️ `WebkitMaskImage` EN PLUS DE `maskImage`. Safari ne comprend toujours pas la
 * propriété standard sans préfixe sur les masques en dégradé : sans la seconde ligne,
 * l'effet est absent sur iPhone — c'est-à-dire précisément là où un rail se pousse au
 * doigt et où le fondu sert le plus.
 */
export function RailFade({ children }: { children: ReactNode }) {
  const { canScrollPrev, canScrollNext } = useCarousel()

  /* 48 px de fondu : assez pour qu'une carte s'efface visiblement, assez peu pour ne
     pas manger son contenu. En dessous de 32 px l'effet se lit comme un flou de
     rendu ; au-delà de 64 px, le titre de la carte de bord devient illisible alors
     qu'on veut justement le lire pour décider de faire défiler. */
  const de = canScrollPrev ? 'transparent 0, #000 48px' : '#000 0'
  const a = canScrollNext ? '#000 calc(100% - 48px), transparent 100%' : '#000 100%'
  const masque = `linear-gradient(to right, ${de}, ${a})`

  return (
    <div
      className="min-w-0 flex-1"
      style={{
        maskImage: masque,
        WebkitMaskImage: masque,
        /* La transition porte sur le masque lui-même : le fondu APPARAÎT en douceur
           quand on quitte le début du rail, au lieu de surgir d'un coup au premier
           pixel de défilement. */
        transition: 'mask-image var(--duration-state) var(--ease-standard)',
      }}
    >
      {children}
    </div>
  )
}
