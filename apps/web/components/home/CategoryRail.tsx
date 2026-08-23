'use client'

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel'
import { usePhrase } from '@/components/locale/ContentProvider'
import { Link } from '@/i18n/navigation'

export interface RailEntry {
  href: string
  label: string
  /** Rendue en pastille pleine plutôt qu'en pastille de filet. */
  current?: boolean
}

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * RAIL DE SECTEURS — UNE SEULE LIGNE, QUOI QU'IL ARRIVE
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── CE QU'IL REPREND À LA RÉFÉRENCE, ET CE QU'IL N'EN REPREND PAS ───────────
 *
 * La GÉOMÉTRIE, mesurée au navigateur sur tokenomist.ai/overview : pastille de
 * 26 px de haut, 12 px de flanc, rayon 16 px, filet de 1,25 px, texte de 13 px en
 * graisse 500. Ces valeurs ne sont pas approchées « au plus proche cran Tailwind » —
 * un rayon de 16 px sur une pastille de 26 px n'est PAS une pilule, et le rendre en
 * `rounded-pill` donnerait un ovale là où la référence donne un rectangle très
 * adouci. C'est la différence entre « étiquette » et « bouton », et elle se voit.
 *
 * Ce qu'il n'en reprend pas : leur rail FILTRE la page sur place. Le nôtre NAVIGUE
 * vers la page du secteur. Reproduire le filtrage demanderait de remonter l'état
 * dans un composant client, de re-solliciter la source à chaque pastille et de
 * réécrire l'URL pour que le résultat reste partageable — pour un gain nul ici, où
 * chaque secteur a déjà sa page et où celle-ci en montre bien plus qu'un filtre.
 *
 * ── POURQUOI CE COMPOSANT EST CLIENT ────────────────────────────────────────
 *
 * Pour les deux flèches, et pour rien d'autre. Un rail qui déborde sans les
 * proposer est parcourable au doigt et au pavé tactile, mais pas à la souris seule :
 * il n'y a pas de barre horizontale sous un `scrollbar-none`, et `shift+molette`
 * n'est connu de personne. Les flèches sont donc une affordance, pas un ornement —
 * d'où le fait qu'elles n'apparaissent QUE du côté où il reste à voir.
 *
 * Le calcul est délibérément grossier — une marge d'un pixel sur la comparaison —
 * parce que `scrollLeft` est fractionnaire dès que le facteur de zoom du navigateur
 * ne vaut pas 1, et qu'une comparaison stricte laisserait la flèche de droite
 * allumée en fin de course. Voir la note sur `EDGE_SLACK`.
 */
export function CategoryRail({ entries, label }: { entries: RailEntry[]; label: string }) {
  const t = usePhrase()

  if (entries.length === 0) return null

  return (
    /*
      ── LE RAIL PASSE SUR `Carousel` ──────────────────────────────────────────

      Il portait sa propre mécanique : un `ResizeObserver`, un `onScroll`, un calcul
      de fin de course à un pixel près, et deux flèches qui appelaient `scrollBy`.
      Une soixantaine de lignes, correctes, pour ce qu'`embla` — sur quoi `Carousel`
      est bâti — fait de lui-même. Ce qu'il apporte en plus :

        · LE GLISSER À LA SOURIS. Un `overflow-x-auto` ne se saisit pas au curseur :
          sans barre visible (`scrollbar-none`), la souris seule ne pouvait PAS
          parcourir le rail, et c'est exactement ce que les flèches compensaient.
        · LE CLAVIER. Les flèches gauche/droite déplacent le rail quand il a le focus.
        · LES BORNES. Les boutons se DÉSACTIVENT en fin de course au lieu de
          disparaître — la rangée ne se décale plus latéralement quand on atteint un
          bord, ce que le masquage provoquait à chaque extrémité.

      ⚠️ `containScroll: 'trimSnaps'` ET `basis-auto` : embla suppose par défaut des
      diapositives de largeur égale qui remplissent le cadre. Ces pastilles ont chacune
      la largeur de son libellé — sans ces deux réglages, embla les étire toutes à la
      largeur du rail et n'en montre qu'une.
    */
    <Carousel
      opts={{ align: 'start', containScroll: 'trimSnaps', dragFree: true }}
      aria-label={label}
      className="relative flex min-w-0 items-center gap-2"
    >
      <CarouselPrevious
        variant="outline"
        className="static size-6 shrink-0 translate-y-0"
        aria-label={t('Secteurs précédents')}
      />

      <CarouselContent className="-ml-2 min-w-0 flex-1 items-center">
        {entries.map((entry) => (
          <CarouselItem key={entry.href} className="basis-auto pl-2">
            <Link
              href={entry.href}
              aria-current={entry.current ? 'page' : undefined}
              className={`inline-flex h-[26px] shrink-0 items-center rounded-[16px] border px-3 text-sm transition-colors duration-150 ${
                entry.current
                  ? 'border-brand bg-brand-soft text-brand-strong'
                  : 'border-border-subtle text-ink hover:border-brand hover:text-brand'
              }`}
            >
              {entry.label}
            </Link>
          </CarouselItem>
        ))}
      </CarouselContent>

      <CarouselNext
        variant="outline"
        className="static size-6 shrink-0 translate-y-0"
        aria-label={t('Secteurs suivants')}
      />
    </Carousel>
  )
}
