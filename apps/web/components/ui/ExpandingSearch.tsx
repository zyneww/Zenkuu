'use client'

import { usePhrase } from '@/components/locale/ContentProvider'
import { Search, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

/**
 * LOUPE QUI SE DÉPLOIE EN CHAMP DE RECHERCHE.
 *
 * ── CE QU'ELLE REMPLACE, ET CE QU'ELLE REND ─────────────────────────────────
 *
 * Un champ de recherche pleine largeur occupait la rangée d'outils des tableaux. Il
 * est utile une fois sur vingt — on filtre rarement une page qu'on vient d'ouvrir —
 * et il prenait la place que les vues rapides et les périodes se disputaient.
 *
 * Replié, il ne coûte que 28 pixels. Déplié, il en fait 224 et rend exactement le même
 * service. C'est le compromis que font les barres d'outils denses, et il ne se paie
 * que si l'on s'en sert.
 *
 * ── TROIS DÉCLENCHEURS, ET C'EST NÉCESSAIRE ─────────────────────────────────
 *
 * Le SURVOL déploie, comme demandé — c'est le geste le plus rapide à la souris.
 * Le CLIC aussi, sans quoi le contrôle serait inutilisable au doigt : un écran tactile
 * n'a pas de survol, et une loupe qui ne réagit qu'à un événement qu'il ne produit pas
 * est un bouton mort.
 * Le FOCUS clavier également, pour la même raison au clavier.
 *
 * ── IL NE SE REFERME PAS SUR CE QU'ON A ÉCRIT ───────────────────────────────
 *
 * Une fois du texte saisi, quitter la zone ne replie plus : le filtre est actif, et
 * escamoter le champ qui le porte ferait disparaître la seule trace visible de la
 * raison pour laquelle le tableau ne montre que trois lignes. Il faut vider — ou
 * cliquer la croix — pour retrouver la loupe.
 *
 * ── L'ANIMATION PORTE SUR `width`, ET C'EST ASSUMÉ ──────────────────────────
 *
 * `transform: scaleX` serait composé par le GPU et n'entraînerait aucun recalcul de
 * mise en page. Il déformerait aussi l'icône et le texte, qui doivent rester nets.
 * `width` provoque un reflux — sur UN élément d'une barre d'outils, pendant 200 ms,
 * une fois par usage. Le coût est réel et négligeable ; la déformation, elle, se
 * verrait.
 */
export function ExpandingSearch({
  value,
  onChange,
  placeholder = 'Rechercher…',
  label,
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  /** Libellé accessible. Le champ n'en a pas de visible une fois replié. */
  label: string
}) {
  const t = usePhrase()
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  /* Une saisie en cours MAINTIENT le champ ouvert — voir l'en-tête. */
  const expanded = open || value.length > 0

  /* Le focus est posé À L'OUVERTURE, pas au montage : sans cela, la loupe volerait le
     curseur au chargement de la page. `open` seul en dépendance — le champ ne doit pas
     reprendre le focus à chaque frappe. */
  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  return (
    <div
      ref={rootRef}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => {
        /* On ne referme que si le champ n'a ni texte NI focus : sortir la souris
           pendant qu'on tape effacerait le curseur sous les doigts. */
        if (value.length === 0 && document.activeElement !== inputRef.current) setOpen(false)
      }}
      className="relative flex items-center"
    >
      <Search
        className={`pointer-events-none absolute left-2 h-4 w-4 text-ink-muted transition-opacity duration-200 ${
          expanded ? 'opacity-100' : 'opacity-70'
        }`}
        aria-hidden="true"
      />

      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          if (value.length === 0) setOpen(false)
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            onChange('')
            setOpen(false)
            inputRef.current?.blur()
          }
        }}
        placeholder={expanded ? placeholder : ''}
        aria-label={label}
        /*
          `w-8` replié — la largeur d'un bouton d'icône, pour que la loupe s'aligne
          avec les autres commandes de la rangée. `appearance-none` retire la croix
          native de `type="search"`, qui viderait le champ sans prévenir le composant
          et laisserait le panneau ouvert sur un filtre déjà annulé.

          LE FOND N'APPARAÎT QU'UNE FOIS DÉPLOYÉ : une pastille de 28 pixels autour
          d'une loupe se lirait comme un bouton, alors que ce n'en est pas un. Replié,
          le champ est donc transparent, et seule la loupe se voit.

          C'était une BORDURE et c'est devenu un fond : la barre d'outils de ce tableau
          n'emploie plus le trait, réservé désormais à la délimitation des régions de
          la page. Voir la note du groupe de périodes dans `MarketBrowser`.
        */
        className={`h-8 appearance-none rounded-control pl-8 text-sm text-ink outline-none transition-[width,background-color,padding] duration-200 ease-out placeholder:text-ink-muted focus:ring-2 focus:ring-brand-soft [&::-webkit-search-cancel-button]:hidden ${
          expanded ? 'w-56 bg-surface-muted pr-8' : 'w-8 cursor-pointer bg-transparent pr-0'
        }`}
      />

      {value.length > 0 ? (
        <button
          type="button"
          onClick={() => {
            onChange('')
            inputRef.current?.focus()
          }}
          aria-label={t('Effacer la recherche')}
          className="absolute right-1.5 flex h-5 w-5 items-center justify-center rounded-sm text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  )
}
