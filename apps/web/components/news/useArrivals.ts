'use client'

import { useState } from 'react'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * LES ARTICLES QUI VIENNENT D'ARRIVER — ET EUX SEULS
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── LE PROBLÈME ──────────────────────────────────────────────────────────────
 *
 * Une animation d'entrée posée en CSS sur `<li>` se déclenche au MONTAGE. Sur un fil
 * d'actualités, cela veut dire : à chaque chargement de page, les quinze lignes
 * s'animent d'un coup. C'est exactement ce qu'on ne veut pas — la page doit s'afficher
 * au repos, et le mouvement doit signaler quelque chose de NEUF, pas la simple
 * existence de la liste.
 *
 * ── CE QUE FAIT CE CROCHET ───────────────────────────────────────────────────
 *
 * Il retient les identifiants déjà vus. Au PREMIER rendu, il les déclare tous connus :
 * personne n'anime. Ensuite, tout identifiant absent de cette mémoire est un article
 * réellement nouveau, et c'est le seul à porter la classe d'entrée.
 *
 * ── QUAND CELA SE PRODUIT VRAIMENT ───────────────────────────────────────────
 *
 * Sur les fiches d'actif, `AssetLiveRefresh` appelle `router.refresh()` toutes les
 * quelques minutes. Next re-rend l'arbre serveur et React RÉCONCILIE : les `<li>`
 * existants gardent leur nœud du DOM, seuls les nouveaux se montent. C'est le cas
 * exact que ce crochet distingue, et il ne serait pas distinguable autrement — un
 * remontage complet ferait tout animer, une comparaison de longueur raterait un
 * article inséré au milieu.
 *
 * ── POURQUOI L'ÉTAT SE MET À JOUR PENDANT LE RENDU ───────────────────────────
 *
 * ⚠️ CE N'EST PAS UN OUBLI D'EFFET, ET LES DEUX AUTRES FORMES ONT ÉTÉ ESSAYÉES.
 *
 *   · UN `useRef` LU PENDANT LE RENDU. La forme la plus courte, et la première écrite.
 *     `react-hooks/refs` la refuse — « Cannot access refs during render » — et la règle
 *     a raison sur le fond : une valeur lue au rendu doit être de l'état, sinon rien ne
 *     garantit que l'affichage la reflète.
 *
 *   · UN `useEffect` QUI POSE LES ARRIVANTS APRÈS COUP. Elle passe le linteur et
 *     produit un défaut visible : la ligne se rend d'abord SANS la classe, à sa hauteur
 *     pleine, puis l'effet l'ajoute au rendu suivant. L'animation part alors de
 *     `max-height: 0` une image trop tard — la ligne apparaît, se replie, puis se
 *     déplie. Un clignotement, pour une animation censée adoucir une insertion.
 *
 * La mise à jour PENDANT le rendu est la forme que React documente pour exactement ce
 * cas (« ajuster l'état quand une propriété change ») : l'appel au setter jette le
 * rendu en cours et en relance un immédiatement, AVANT tout commit. La liste n'est donc
 * jamais peinte sans ses classes, et il n'y a rien à rattraper.
 *
 * La boucle est bornée par construction : le setter n'est appelé que si un identifiant
 * est inconnu, et le rendu suivant les connaît tous.
 *
 * ── LES ARRIVANTS RESTENT MARQUÉS ────────────────────────────────────────────
 *
 * Un identifiant qui a animé garde sa classe jusqu'à la prochaine arrivée. C'est
 * délibéré : retirer la classe pendant l'animation l'ANNULE. Elle ne se rejoue pas —
 * une animation CSS ne repart que sur un montage ou un vrai retrait/ajout de classe —
 * et la laisser en place ne coûte rien.
 */
export interface Memoire {
  /** Tous les identifiants déjà passés par ici. */
  connus: ReadonlySet<string>
  /** Ceux du dernier lot arrivé — ceux qui portent la classe d'entrée. */
  arrivants: ReadonlySet<string>
}

/**
 * La transition de mémoire, isolée du crochet pour être vérifiable.
 *
 * Elle rend la MÊME référence quand rien n'est neuf : c'est ce qui borne la mise à
 * jour pendant le rendu — le composant ne se relance que si l'objet change.
 */
export function absorbe(memoire: Memoire, ids: readonly string[]): Memoire {
  const neufs = ids.filter((id) => !memoire.connus.has(id))
  if (neufs.length === 0) return memoire

  return {
    connus: new Set([...memoire.connus, ...neufs]),
    arrivants: new Set(neufs),
  }
}

export function useArrivals(ids: string[]): ReadonlySet<string> {
  const [memoire, setMemoire] = useState<Memoire>(() => ({
    connus: new Set(ids),
    arrivants: new Set<string>(),
  }))

  const suivante = absorbe(memoire, ids)
  if (suivante !== memoire) setMemoire(suivante)

  return suivante.arrivants
}
