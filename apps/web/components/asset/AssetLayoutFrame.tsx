'use client'

import { Check, ChevronDown, Columns2, Rows2, PanelLeft } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

/**
 * Cadre à deux colonnes de la fiche, et son sélecteur de disposition.
 *
 * ── POURQUOI UN CHOIX, PLUTÔT QU'UNE BONNE DISPOSITION ────────────────────────
 *
 * La fiche impose un rail de chiffres à gauche et le graphique à droite. C'est le
 * bon défaut — c'est celui de la référence — mais il n'est pas bon pour TOUT LE
 * MONDE : sur un portable de treize pouces, le rail prélève 288 pixels sur les 900
 * disponibles, et la courbe se retrouve à l'étroit ; sur un grand écran, on préfère
 * parfois voir les chiffres en bandeau et donner toute la largeur au tracé.
 *
 * Aucune de ces trois lectures n'est fausse, et rien dans la page ne permet de
 * deviner laquelle convient. C'est donc un réglage, comme chez OKX — et comme chez
 * eux, il est MÉMORISÉ : un réglage de confort qu'il faut reposer à chaque visite
 * coûte plus qu'il ne rapporte.
 *
 * ── LE RAIL N'EST PAS MASQUÉ EN LARGE, IL EST DÉPLACÉ ─────────────────────────
 *
 * La disposition « pleine largeur » ne cache pas les chiffres : elle les remet
 * SOUS le contenu, en trois colonnes. Les masquer ferait de ce bouton un interrupteur
 * qui supprime de l'information, ce qu'un réglage de mise en page n'a pas à faire —
 * et le lecteur qui l'a choisi une fois ne comprendrait pas, trois visites plus tard,
 * pourquoi sa fiche a moins de contenu que celle du voisin.
 */

export type AssetLayout = 'rail' | 'compact' | 'wide'

const LAYOUTS: { id: AssetLayout; label: string; hint: string; icon: React.ReactNode }[] = [
  {
    id: 'rail',
    label: 'Rail complet',
    hint: 'Chiffres à gauche, graphique à droite',
    icon: <PanelLeft className="h-3.5 w-3.5" aria-hidden="true" />,
  },
  {
    id: 'compact',
    label: 'Rail étroit',
    hint: 'Plus de largeur pour le graphique',
    icon: <Columns2 className="h-3.5 w-3.5" aria-hidden="true" />,
  },
  {
    id: 'wide',
    label: 'Pleine largeur',
    hint: 'Chiffres en bandeau sous le contenu',
    icon: <Rows2 className="h-3.5 w-3.5" aria-hidden="true" />,
  },
]

const STORAGE_KEY = 'zenkuu:asset-layout'

function isLayout(value: string | null): value is AssetLayout {
  return value === 'rail' || value === 'compact' || value === 'wide'
}

export function AssetLayoutFrame({
  rail,
  children,
}: {
  rail: React.ReactNode
  children: React.ReactNode
}) {
  /**
   * `rail` au premier rendu, TOUJOURS, quel que soit le contenu du stockage.
   *
   * Lire `localStorage` dans l'initialiseur de `useState` produirait un HTML serveur
   * (qui n'a pas accès au stockage) différent du premier rendu client — l'écart
   * d'hydratation classique, que React signale en console et corrige en repeignant
   * l'arbre entier. On part donc du défaut et l'on applique la préférence dans un
   * effet, après montage : le seul coût est un reflux de mise en page pour les
   * lecteurs qui ont choisi autre chose, une fois, au chargement.
   */
  const [layout, setLayout] = useState<AssetLayout>('rail')
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (isLayout(stored)) setLayout(stored)
    } catch {
      // Stockage refusé — navigation privée, cookies bloqués, iframe cloisonnée.
      // La fiche reste parfaitement utilisable sur la disposition par défaut ; ce
      // n'est pas un cas d'erreur à signaler au lecteur.
    }
  }, [])

  useEffect(() => {
    if (!open) return
    function onPointerDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false)
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  function choose(next: AssetLayout) {
    setLayout(next)
    setOpen(false)
    try {
      window.localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Le choix vaut pour cette visite, il ne survivra pas au rechargement. Mieux
      // que de refuser le changement.
    }
  }

  const active = LAYOUTS.find((entry) => entry.id === layout) ?? LAYOUTS[0]!

  return (
    <>
      {/* Bandeau de commande : une seule commande, alignée à droite, au-dessus du
          cadre qu'elle règle. La poser dans la barre du graphique l'aurait rendue
          plus visible — mais elle ne règle pas le graphique, elle règle la PAGE, et
          la ranger avec les commandes de tracé l'aurait mal annoncée. */}
      <div ref={rootRef} className="relative flex justify-end">
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          aria-expanded={open}
          aria-haspopup="menu"
          title="Choisir la disposition de la fiche"
          className={`flex h-7 items-center gap-1.5 px-2 text-xs font-medium transition-colors duration-150 ${
            open ? 'bg-surface-muted text-ink' : 'text-ink-muted hover:bg-surface-muted hover:text-ink'
          }`}
        >
          {active.icon}
          <span className="hidden sm:inline">{active.label}</span>
          <ChevronDown
            className={`h-3 w-3 shrink-0 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
        </button>

        {open ? (
          <div
            role="menu"
            className="absolute right-0 top-full z-40 mt-1 min-w-[16rem] rounded-dense border border-border-subtle bg-overlay p-1 shadow-overlay"
          >
            {LAYOUTS.map((entry) => (
              <button
                key={entry.id}
                type="button"
                role="menuitem"
                onClick={() => choose(entry.id)}
                className={`flex w-full items-start gap-2 px-2 py-1.5 text-left transition-colors duration-150 ${
                  entry.id === layout ? 'text-brand-strong' : 'text-ink hover:bg-surface-muted'
                }`}
              >
                <span className="mt-0.5 w-3.5 shrink-0">
                  {entry.id === layout ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : null}
                </span>
                <span className="mt-0.5 shrink-0">{entry.icon}</span>
                <span className="min-w-0">
                  <span className="block text-xs font-medium">{entry.label}</span>
                  <span className="block text-[0.6875rem] text-ink-muted">{entry.hint}</span>
                </span>
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {/*
        ── LES TROIS DISPOSITIONS ────────────────────────────────────────────────

        `items-start` dans les deux cas où la grille a deux colonnes : sans lui, la
        colonne courte s'étire à la hauteur de la longue, et le rail d'une paire de
        devises — qui n'a ni offre ni communauté — finirait par plusieurs centaines de
        pixels de vide. C'est aussi la classe de défaut qui a fait déborder une carte
        par-dessus le pied de page sur l'accueil ; on ne la réintroduit pas ici.
      */}
      {layout === 'wide' ? (
        <div className="space-y-4">
          <div className="min-w-0">{children}</div>

          {/* Le rail passe en bandeau : ses panneaux se répartissent sur trois
              colonnes plutôt que de s'empiler sur toute la largeur, où chaque ligne
              de « libellé … valeur » ferait un mètre de blanc au milieu. */}
          <div className="[&>aside]:grid [&>aside]:grid-cols-1 [&>aside]:gap-3 [&>aside]:space-y-0 md:[&>aside]:grid-cols-2 xl:[&>aside]:grid-cols-3">
            {rail}
          </div>
        </div>
      ) : (
        <div
          className={`grid grid-cols-1 items-start gap-4 ${
            layout === 'compact'
              ? 'lg:grid-cols-[minmax(0,15rem)_minmax(0,1fr)]'
              : 'lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]'
          }`}
        >
          {rail}
          <div className="min-w-0">{children}</div>
        </div>
      )}
    </>
  )
}
