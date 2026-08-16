/**
 * GROUPE DU RAIL — un titre, des lignes, aucune carte.
 *
 * ── POURQUOI LE RAIL PERD SES CARTES ──────────────────────────────────────────
 *
 * Il était fait de `Panel` : sept cartes bordées, à fond soulevé, empilées dans une
 * colonne de 288 pixels. Le raisonnement d'alors tenait en une phrase — quatre cartes
 * posent la frontière entre groupes dans la GÉOMÉTRIE, qu'on voit sans lire, là où un
 * ruban continu la confie à des titres qu'il faut lire. C'est vrai, et ce n'était pas
 * le bon arbitrage.
 *
 * Ce qu'il ignorait : une carte prélève 32 pixels de marge interne, 2 de bordure et
 * 12 d'intervalle. Sept cartes, c'est plus de trois cents pixels de hauteur dépensés en
 * encadrements — dans la colonne la plus étroite de la page, celle dont tout l'intérêt
 * est de tenir vingt chiffres dans la hauteur du graphique. Le rail dépassait le
 * graphique de deux écrans.
 *
 * Et le bénéfice se payait deux fois : sur 288 pixels, sept bordures verticales
 * dessinent sept fois le même rectangle. L'œil ne les lit plus comme des frontières,
 * il les lit comme une texture.
 *
 * La référence ne met aucune carte dans sa colonne. Ses groupes sont plats : un titre
 * discret, des lignes serrées, et un intervalle entre groupes. La frontière reste
 * géométrique — c'est le BLANC qui la porte, pas un trait — et elle ne coûte rien.
 *
 * ── CE QUI DISTINGUE CE COMPOSANT DE `Panel` ──────────────────────────────────
 *
 * `Panel` reste la carte du contenu principal, où elle a du sens : sur 900 pixels de
 * large, un bloc a besoin d'un bord pour ne pas flotter. Les deux coexistent parce
 * qu'ils répondent à deux largeurs, pas à deux goûts — et le rail n'a plus à réclamer
 * `padded={false}` ou `rule={false}` pour approcher ce qu'il voulait vraiment.
 */

export function RailSection({
  title,
  subtitle,
  action,
  children,
}: {
  /** Titre du groupe. Absent, le bloc n'a pas d'en-tête. */
  title?: React.ReactNode
  /** Ligne d'explication sous le titre. */
  subtitle?: React.ReactNode
  /** Lien ou bouton aligné à droite du titre — « Tout voir », « Explorer ». */
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section>
      {title !== undefined ? (
        <div className="mb-1.5 flex items-baseline justify-between gap-2 border-b border-border-subtle pb-1">
          {/*
            Le titre est PLUS PETIT que les valeurs qu'il coiffe, et c'est délibéré.
            Dans une carte, il portait 14 pixels et une graisse forte : il devenait
            l'élément le plus visible du bloc, alors qu'il n'est qu'une étiquette de
            rangement — personne ne vient lire le mot « Fondamentaux ». Ce sont les
            chiffres qu'on vient lire, et ils doivent gagner.
          */}
          <h2 className="text-micro font-semibold uppercase tracking-wide text-ink-muted">
            {title}
          </h2>
          {action !== undefined ? <div className="shrink-0">{action}</div> : null}
        </div>
      ) : null}

      {subtitle !== undefined ? (
        <p className="mb-1.5 text-micro leading-snug text-ink-muted">{subtitle}</p>
      ) : null}

      {children}
    </section>
  )
}
