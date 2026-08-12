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

  return (
    <section
      className={`rounded-card border border-border-subtle bg-panel ${padded ? 'p-4' : 'p-0'} ${className}`}
    >
      {hasHeader ? (
        <div
          className={`flex flex-wrap items-start justify-between gap-x-3 gap-y-2 ${
            padded ? 'mb-3' : 'px-4 pb-3 pt-4'
          }`}
        >
          <div className="min-w-0">
            {title !== undefined ? (
              <Heading
                className={`text-sm font-semibold text-ink ${
                  // `decoration-2` et un décalage franc : à 1px, un soulignement
                  // sous du texte de 14px se confond avec le jambage des lettres.
                  rule ? 'underline decoration-border-subtle decoration-2 underline-offset-8' : ''
                }`}
              >
                {title}
              </Heading>
            ) : null}
            {subtitle !== undefined ? (
              <p className={`text-xs text-ink-muted ${rule ? 'mt-3' : 'mt-1'}`}>{subtitle}</p>
            ) : null}
          </div>

          {tools !== undefined ? (
            <div className="flex shrink-0 flex-wrap items-center gap-1.5">{tools}</div>
          ) : null}
        </div>
      ) : null}

      {children}
    </section>
  )
}

/**
 * Bouton d'outil d'en-tête de panneau.
 *
 * Petit, bordé, jamais plein : ces contrôles bordent le titre et ne doivent pas lui
 * disputer l'attention. La référence les dessine ainsi, et pour une raison qui tient
 * au-delà du goût — un panneau en porte parfois quatre, et quatre aplats colorés
 * alignés feraient de l'en-tête la zone la plus vive de la carte.
 */
export function PanelTool({
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className="inline-flex items-center gap-1.5 rounded-control border border-border-subtle px-2 py-1 text-xs font-medium text-ink-muted transition-colors duration-150 hover:border-brand hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  )
}
