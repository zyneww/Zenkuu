'use client'

import type { AssetClass, SearchResult } from '@zenkuu/data'
import { useMemo, useState } from 'react'

import { usePhrase } from '@/components/locale/ContentProvider'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * LES ONGLETS DE PORTÉE — RELEVÉS SUR LA RECHERCHE DE BACKPACK
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Mesurés sur backpack.exchange le 2026-09-02 : onglet actif à 13 px en graisse 500 et
 * encre pleine, inactif en graisse 400 et gris, gouttière de 20 px entre les deux.
 *
 * ── LEURS ONGLETS NE SONT PAS LES NÔTRES, ET C'EST NORMAL ──────────────────
 *
 * Backpack propose « All / Spot / Futures / Stocks / Lend » — quatre types de MARCHÉ
 * plus le prêt, parce que c'est une plateforme d'échange. ZENKUU ne fait pas
 * s'échanger : il donne à voir. Ses onglets sont donc des CLASSES D'ACTIFS, ce qui est
 * la seule division que ses données connaissent.
 *
 * Reprendre « Futures » ou « Lend » aurait forcé à inventer une catégorie sans donnée
 * derrière — exactement ce que la consigne interdit (§5).
 *
 * ── CE QUI N'EST PAS PROPOSÉ, ET POURQUOI ──────────────────────────────────
 *
 * Une portée qui ne renverrait jamais rien est pire qu'absente : elle promet un
 * contenu qui n'existe pas. Les onglets sont donc calculés à partir de ce que la
 * réponse porte VRAIMENT — un onglet apparaît parce que des résultats l'habitent, pas
 * parce qu'une constante le déclare.
 */

/** La portée retenue : une classe d'actif, ou toutes. */
export type SearchScope = AssetClass | 'all'

export function SearchScopes({
  scopes,
  active,
  onSelect,
  counts,
}: {
  /** Les portées à proposer, déjà réduites à celles qui portent des résultats. */
  scopes: readonly SearchScope[]
  active: SearchScope
  onSelect: (scope: SearchScope) => void
  /** Nombre de résultats par portée, pour l'annonce vocale. */
  counts: Readonly<Partial<Record<SearchScope, number>>>
}) {
  const t = usePhrase()

  /* Un seul onglet ne se choisit pas : la barre disparaît plutôt que d'afficher un
     unique bouton toujours actif, qui ressemblerait à un contrôle en panne. */
  if (scopes.length < 2) return null

  const nom: Record<SearchScope, string> = {
    all: t('Tout'),
    crypto: t('Cryptomonnaies'),
    stock: t('Actions'),
    etf: t('ETF'),
    index: t('Indices'),
    forex: t('Devises'),
    commodity: t('Matières premières'),
    nft: t('NFT'),
  }

  return (
    /*
      ══════════════════════════════════════════════════════════════════════════
      ⚠️ `role="tablist"` A ÉTÉ RETIRÉ : IL PROMETTAIT UN CLAVIER QUI N'EXISTAIT PAS
      ══════════════════════════════════════════════════════════════════════════

      La note d'origine disait : « la synthèse vocale annonce alors "onglet 2 sur 5", et
      les flèches gauche/droite y naviguent nativement ». La première moitié était vraie,
      la seconde fausse. `role="tab"` ne câble AUCUNE touche : le motif ARIA impose au
      composant de gérer lui-même les flèches et l'index roulant, et rien ici ne le
      faisait. Le rôle annonçait donc un contrat que le code ne tenait pas — pire qu'un
      bouton nu, qui au moins ne promet rien.

      ── POURQUOI PAS LES ONGLETS DE HEADLESS UI, QUI RÉGLERAIENT LE CLAVIER ────

      Parce que cette rangée vit DANS un `Command` de cmdk, qui possède déjà les flèches :
      ↑ et ↓ déplacent la sélection dans la liste de résultats, depuis le champ de saisie.
      `TabGroup` et `RadioGroup` réclament ces deux mêmes touches dès que le focus entre
      dans le groupe. Le lecteur qui tabule jusqu'aux portées puis appuie sur ↓ changerait
      alors de portée au lieu de descendre dans les résultats — on aurait échangé un
      défaut d'accessibilité contre un conflit de raccourcis.

      ── CE QUE C'EST VRAIMENT ─────────────────────────────────────────────────

      Pas des onglets : un FILTRE. Il ne révèle pas un panneau parmi plusieurs, il
      retranche des lignes de la seule liste qui existe. Le rôle juste est donc un groupe
      de bascules exclusives — `aria-pressed` sur chacune, ce qui n'engage aucune touche
      et décrit exactement ce que le bouton fait.

      ⚠️ `gap-5` = 20 px, mesuré chez eux. Et pas de filet sous la barre : le leur est à
      zéro, l'entrée active se signale par sa GRAISSE et son encre, pas par un souligné.
      Un souligné ajouterait une ligne horizontale de plus dans un panneau qui en a
      déjà — le champ au-dessus, les intitulés de section en dessous.
    */
    <div
      role="group"
      aria-label={t('Portée de la recherche')}
      className="flex flex-wrap items-center gap-5 px-3 pb-2 pt-1"
    >
      {scopes.map((scope) => {
        const selected = scope === active
        const n = counts[scope]

        return (
          <button
            key={scope}
            type="button"
            /* `aria-pressed` et non `aria-selected` : celui-ci n'a de sens que dans une
               liste d'options ou un jeu d'onglets, et la synthèse vocale le lit
               « non sélectionné » sur toutes les portées inactives — un bruit de plus à
               chaque frappe. `aria-pressed` dit « bascule enfoncée », qui est le fait. */
            aria-pressed={selected}
            onClick={() => onSelect(scope)}
            /* La transition ne porte que sur la COULEUR. Animer la graisse ferait
               bouger la largeur du mot, et toute la barre se décalerait à chaque
               changement d'onglet. */
            className={`text-[13px] transition-colors ${
              selected ? 'font-medium text-ink' : 'font-normal text-ink-muted hover:text-ink'
            }`}
          >
            {nom[scope]}
            {/* Le compte n'est PAS affiché — Backpack ne l'affiche pas non plus, et
                six nombres entre parenthèses alourdiraient une barre qui doit se lire
                d'un coup d'œil. Il part quand même à la synthèse vocale, où il est
                utile : on ne peut pas y compter les lignes du regard. */}
            {n !== undefined ? (
              <span className="sr-only"> {t('{n} résultats').replace('{n}', String(n))}</span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}


/**
 * ══════════════════════════════════════════════════════════════════════════════
 * L'ÉTAT DE PORTÉE — PARTAGÉ PAR LES DEUX SURFACES DE RECHERCHE
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Le site a DEUX recherches : `HeaderSearch`, un tiroir sous le champ de l'en-tête sur
 * grand écran, et `SearchOverlay`, une fenêtre pleine hauteur sur téléphone. Elles
 * partagent déjà leurs données (`useAssetSearch`) et leur rendu (`SearchResults`) ;
 * elles partagent désormais aussi leur portée.
 *
 * Dupliquer ces trente lignes aurait garanti qu'elles divergent : la correction d'un
 * défaut d'un côté n'aurait pas traversé de l'autre, et l'écart ne se serait vu qu'en
 * redimensionnant la fenêtre.
 *
 * ⚠️ LA PORTÉE EFFECTIVE EST DÉRIVÉE, JAMAIS REMISE À ZÉRO PAR UN EFFET.
 *
 * Le cas : on cherche « apple », on choisit l'onglet « Actions », on efface, on tape
 * « bitcoin ». L'onglet « Actions » n'existe plus dans ces résultats. Le corriger dans
 * un `useEffect` provoquerait un second rendu — l'utilisateur verrait une liste vide
 * l'espace d'une image avant qu'elle ne se remplisse — et le linter le refuse à juste
 * titre.
 *
 * Dérivée, la correction est immédiate et sans rendu intermédiaire. L'état garde le
 * choix de l'utilisateur, qui redevient effectif si cette classe reparaît.
 */
export function useSearchScopes(found: readonly SearchResult[]) {
  const [scope, setScope] = useState<SearchScope>('all')

  const scopes = useMemo(() => {
    const presentes = new Set<AssetClass>(found.map((item) => item.assetClass))
    /* L'ordre est FIXE, et suit celui du menu du site. Un ordre par décompte se
       réarrangerait à chaque frappe : le bloc qu'on visait glisserait sous le curseur
       entre deux lettres. */
    const ordre: AssetClass[] = ['crypto', 'stock', 'etf', 'index', 'forex', 'commodity', 'nft']
    return ['all' as SearchScope, ...ordre.filter((c) => presentes.has(c))]
  }, [found])

  const counts = useMemo(() => {
    const n: Partial<Record<SearchScope, number>> = { all: found.length }
    for (const item of found) n[item.assetClass] = (n[item.assetClass] ?? 0) + 1
    return n
  }, [found])

  return {
    scopes,
    counts,
    /** Le choix de l'utilisateur, tel qu'il l'a exprimé. */
    scope,
    setScope,
    /** Ce qui s'applique réellement — voir la note ci-dessus. */
    active: scopes.includes(scope) ? scope : ('all' as SearchScope),
  }
}
