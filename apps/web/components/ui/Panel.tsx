'use client'

import { Button } from '@/components/ui/button'
import { Card } from '@heroui/react'
import { cn } from '@/lib/utils'

/**
 * PANNEAU — la carte du second plan.
 *
 * ── POURQUOI UNE PRIMITIVE, ALORS QUE LA CARTE EXISTAIT DÉJÀ ──────────────────
 *
 * Le projet écrivait jusqu'ici ses cartes à la main :
 * `rounded-card border border-border-subtle bg-surface p-4`, répété à l'identique
 * dans une dizaine de composants. Cette formule marchait tant que `surface` valait
 * `canvas` — la carte n'était qu'un filet, et un filet n'a pas de règles internes.
 *
 * Le second plan (`--color-panel`) change cela. Une surface qui se soulève doit le
 * faire PARTOUT DE LA MÊME HAUTEUR, sans quoi la page se lit comme un empilement
 * accidentel plutôt que comme une hiérarchie. Une valeur dupliquée à dix endroits
 * ne tient pas cette promesse : il suffit d'un `bg-surface` oublié pour qu'une
 * carte s'enfonce dans la page au milieu de neuf autres qui flottent.
 *
 * ── CE QU'IL RESTE À CE FICHIER DEPUIS QU'IL S'APPUIE SUR `Card` ─────────────
 *
 * La structure vient maintenant de shadcn/ui : `Card`, `CardHeader`, `CardTitle`,
 * `CardDescription`, `CardAction`, `CardContent`. Ce qui reste ici est ce que la
 * bibliothèque ne peut pas savoir — la DENSITÉ, et le soulignement du titre.
 *
 * ⚠️ LA DENSITÉ EST RÉÉCRITE, ET IL FAUT DIRE POURQUOI. `Card` respire à `py-6`,
 * `px-6`, `gap-6` : vingt-quatre pixels partout. C'est le bon réglage pour une page
 * de contenu ; c'en est un mauvais pour un tableau de bord qui aligne huit panneaux
 * de chiffres dans une hauteur d'écran. Le projet tient sa grille de 4 px (§3.1) et
 * ses panneaux à `p-4`. Les classes de densité posées ici ÉCRASENT donc celles de
 * `Card` — `cn` fait gagner la dernière — et c'est le seul endroit du site où cet
 * écrasement a lieu, pour que la valeur reste modifiable en un point.
 *
 * ── LE TITRE EST SOULIGNÉ, ET C'EST UNE DÉCISION ──────────────────────────────
 *
 * Repris de la référence, mais pas pour l'ornement : le soulignement remplace le
 * filet de séparation horizontal qui courait sous les titres de section. Un filet
 * pleine largeur à l'intérieur d'une carte déjà bordée met DEUX traits parallèles à
 * douze pixels l'un de l'autre. Le soulignement, lui, ne mesure que le titre : il
 * marque la même frontière sans rajouter de ligne à la page.
 *
 * Il est désactivable (`rule={false}`) pour les panneaux dont l'en-tête porte des
 * outils à droite — là, c'est la rangée entière qui fait frontière, et souligner le
 * titre en plus le ferait passer pour un lien.
 */

export interface PanelProps {
  /** Titre du panneau. Absent, l'en-tête entier disparaît. */
  title?: React.ReactNode
  /** Ligne d'explication sous le titre. */
  subtitle?: React.ReactNode
  /** Contrôles alignés à droite de l'en-tête : filtres, export, plein écran. */
  tools?: React.ReactNode
  /**
   * Niveau de titre. Un panneau n'impose pas son rang dans le document : c'est la
   * page qui sait si ce bloc est une sous-section d'une autre. Par défaut `h2`.
   */
  headingLevel?: 'h2' | 'h3' | 'h4'
  /** Soulignement du titre. Voir l'en-tête du fichier. */
  rule?: boolean
  /** Marge interne du corps. `false` pour un tableau qui doit toucher les bords. */
  padded?: boolean
  className?: string
  children: React.ReactNode
}

export function Panel({
  title,
  subtitle,
  tools,
  headingLevel: Heading = 'h2',
  rule = true,
  padded = true,
  className = '',
  children,
}: PanelProps) {
  const hasHeader = title !== undefined || tools !== undefined

  /*
   * ⚠️ `asChild` A DISPARU AVEC SHADCN, ET LA SÉMANTIQUE EST PRÉSERVÉE AUTREMENT.
   *
   * La `Card` de shadcn acceptait `asChild` pour se rendre en `<section>` plutôt qu'en
   * `<div>` — ce qui compte : un panneau titré est une section de document, et un
   * lecteur d'écran le liste comme tel.
   *
   * `Card` de HeroUI ne connaît pas `asChild` mais accepte `render`, qui remplace son
   * élément racine. Le `<section>` est donc conservé, avec toutes les classes et tous
   * les attributs que HeroUI y pose.
   */
  return (
    <Card
      render={(props) => <section {...props} />}
      className={cn(
        'gap-0 rounded-card border-border-subtle bg-panel py-0 shadow-none',
        padded ? 'p-4' : 'p-0',
        className,
      )}
    >
      <>
        {hasHeader ? (
          <Card.Header
            className={cn(
              'flex flex-wrap items-start justify-between gap-x-3 gap-y-2 px-0',
              padded ? 'mb-3' : 'px-4 pb-3 pt-4',
            )}
          >
            <div className="min-w-0">
              {title !== undefined ? (
                /* `render` remplace l'élément racine de `Card.Title` par le niveau de
                   titre demandé (`h2` par défaut) : la carte garde ses classes, le
                   document garde sa hiérarchie. C'est l'équivalent HeroUI du `asChild`
                   de shadcn. */
                <Card.Title
                  render={(props) => <Heading {...props} />}
                  className={cn(
                    'text-sm font-semibold text-ink',
                    // `decoration-2` et un décalage franc : à 1px, un soulignement
                    // sous du texte de 14px se confond avec le jambage des lettres.
                    rule && 'underline decoration-border-subtle decoration-2 underline-offset-8',
                  )}
                >
                  {title}
                </Card.Title>
              ) : null}
              {subtitle !== undefined ? (
                <Card.Description className={cn('text-xs text-ink-muted', rule ? 'mt-3' : 'mt-1')}>
                  {subtitle}
                </Card.Description>
              ) : null}
            </div>

            {/* ⚠️ `CardAction` N'A PAS D'ÉQUIVALENT CHEZ HEROUI, et il n'en faut pas :
                c'était un `<div>` que shadcn plaçait par grille dans son en-tête. Ici
                l'en-tête est déjà un `flex justify-between`, et les outils se tiennent
                à droite d'eux-mêmes. */}
            {tools !== undefined ? (
              <div className="flex shrink-0 flex-wrap items-center gap-1.5">{tools}</div>
            ) : null}
          </Card.Header>
        ) : null}

        <Card.Content className="px-0">{children}</Card.Content>
      </>
    </Card>
  )
}

/**
 * Bouton d'outil d'en-tête de panneau.
 *
 * Petit, bordé, jamais plein : ces contrôles bordent le titre et ne doivent pas lui
 * disputer l'attention. La référence les dessine ainsi, et pour une raison qui tient
 * au-delà du goût — un panneau en porte parfois quatre, et quatre aplats colorés
 * alignés feraient de l'en-tête la zone la plus vive de la carte.
 *
 * ── CE N'EST PLUS UN BOUTON ÉCRIT ICI ─────────────────────────────────────────
 *
 * C'est le `Button` de shadcn/ui en `outline`, taille `xs` — exactement la définition
 * ci-dessus : bordé, sur fond de surface, jamais plein. Le composant garde son nom et
 * sa signature (`onClick`, `disabled`, `children`) parce que quinze appelants s'en
 * servent ; ce qui change est ce qu'il rend. Il gagne au passage l'anneau de focus
 * visible, le survol et l'état désactivé du système, qu'une chaîne de classes recopiée
 * ne suivait pas quand la palette bougeait.
 */
export function PanelTool({
  children,
  className,
  ...props
}: Omit<React.ComponentProps<typeof Button>, 'size' | 'variant'>) {
  return (
    <Button {...props} size="xs" variant="outline" className={className}>
      {children}
    </Button>
  )
}
