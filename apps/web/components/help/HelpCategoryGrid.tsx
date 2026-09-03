'use client'

import { BookOpen, Database, Scale, Sliders, Star, User } from 'lucide-react'

import { HELP_CATEGORIES } from '@/content/aide'
import { Link } from '@/i18n/navigation'
import { usePhrase } from '@/components/locale/ContentProvider'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * LES RUBRIQUES D'AIDE, EN CARTES — LA FORME DE help.hellobonsai.com
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── CE QUE CETTE GRILLE ÉTAIT, ET POURQUOI ELLE CHANGE ─────────────────────
 *
 * Elle reprenait Kraken : trois COLONNES nues sous une rangée d'onglets de public,
 * chacune listant cinq titres d'articles et un lien « Voir tous les articles ».
 *
 * Deux choses la desservaient, et la seconde est la vraie :
 *
 *   · LES ONGLETS FILTRAIENT SIX RUBRIQUES. Trois publics pour six cartes, c'est un
 *     filtre qui cache la moitié de ce qu'il classe. Un filtre gagne son écran à
 *     partir de plusieurs dizaines d'entrées ; en dessous, montrer tout coûte moins
 *     cher au lecteur que lui apprendre à choisir un onglet.
 *
 *   · LES CINQ TITRES D'ARTICLES DOUBLAIENT LA PAGE DE RUBRIQUE. Ils occupaient le
 *     gros de la colonne pour montrer une partie de ce que le clic montre en entier,
 *     et poussaient la sixième rubrique sous la ligne de flottaison.
 *
 * La carte de Bonsai dit trois choses et s'arrête : DE QUOI ça parle (le titre), CE
 * QU'ON Y TROUVE (une phrase), et COMBIEN (le compte). C'est exactement ce qu'il faut
 * pour choisir où cliquer — le reste appartient à la page qui s'ouvre.
 *
 * Le champ `audiences` du contenu N'EST PAS SUPPRIMÉ : les pages de rubrique s'en
 * servent, et il redeviendrait un filtre légitime le jour où le centre d'aide
 * comptera trente rubriques.
 *
 * ── LA CARTE ENTIÈRE EST LE LIEN, ET C'EST UNE DÉCISION ────────────────────
 *
 * Un titre cliquable dans une carte inerte laisse quatre-vingts pour cent de la
 * surface morte, et l'on découvre en cliquant à côté que ça ne marche pas. `<Link>`
 * enveloppe donc tout, et le titre n'est plus un lien — il ne peut pas y avoir de lien
 * dans un lien.
 */

/**
 * Les pictogrammes, résolus ici.
 *
 * Le contenu déclare un NOM d'icône et non un composant : `content/aide.ts` est une
 * table de données, importée par des pages serveur comme par ce composant client.
 * Y poser un composant React le rendrait dépendant de React.
 */
const HELP_ICONS = {
  database: Database,
  'book-open': BookOpen,
  user: User,
  scale: Scale,
  sliders: Sliders,
  star: Star,
} as const

export function HelpCategoryGrid() {
  const t = usePhrase()

  return (
    /*
      DEUX COLONNES ET NON TROIS, gouttière de 24 px — les mesures de la référence,
      relevées au navigateur (cartes de 468 px, `gap: 24px`).

      Deux plutôt que trois parce que la carte porte une PHRASE : sur trois colonnes,
      une description de douze mots tombe sur quatre lignes et les cartes cessent
      d'avoir la même hauteur. Deux colonnes laissent la phrase tenir sur deux lignes.
    */
    <ul className="grid gap-6 sm:grid-cols-2">
      {HELP_CATEGORIES.map((category) => {
        const Icon = HELP_ICONS[category.icon]
        return (
          <li key={category.id}>
            <Link
              href={`/aide/rubrique/${category.id}`}
              /* `h-full` : les deux cartes d'une rangée s'alignent sur la plus haute.
                 Sans lui, une description courte laisse un bord bas décalé de son
                 voisin, ce qui se lit comme un défaut de gabarit.

                 `flex-col` avec le compte en `mt-auto` : le nombre se colle au bas de
                 la carte quelle que soit la longueur de la phrase — c'est ce qui aligne
                 les compteurs entre eux, et c'est ce que fait la référence. */
              className="flex h-full flex-col rounded-card border border-border-subtle bg-surface p-5 transition-colors duration-150 hover:border-brand"
            >
              {/* La TUILE d'icône, et non l'icône nue. La référence pose chaque
                  pictogramme sur un carré adouci teinté : c'est ce qui lui donne un
                  poids comparable au titre sans l'agrandir, et ce qui fait lire la
                  carte de haut en bas plutôt qu'en diagonale. */}
              <span className="flex h-9 w-9 items-center justify-center rounded-nested bg-brand-soft">
                <Icon className="h-4.5 w-4.5 text-brand-strong" aria-hidden="true" strokeWidth={1.75} />
              </span>

              <h3 className="mt-4 text-sm font-semibold text-ink">{t(category.title)}</h3>

              <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">
                {t(category.description)}
              </p>

              {/* ══════════════════════════════════════════════════════════════
                  LE COMPTEUR D'ARTICLES

                  ⚠️ IL EST CALCULÉ, JAMAIS ÉCRIT À LA MAIN. `category.articles.length`
                  suit la réalité du contenu : ajouter un article met le compteur à
                  jour, et il ne peut pas mentir. Un nombre saisi en dur dériverait au
                  premier ajout, et personne ne le vérifierait.

                  ⚠️ ET NOS NOMBRES SONT PETITS. La référence affiche 26, 44, 15 ; nos
                  rubriques en portent trois ou quatre. C'est ce qu'il y a, et
                  l'afficher est plus honnête que de le cacher — un compteur absent
                  laisserait imaginer une profondeur que le site n'a pas (§5).
                  ══════════════════════════════════════════════════════════════ */}
              <p className="mt-5 text-xs text-ink-muted">
                {category.articles.length === 1
                  ? t('Un seul article')
                  : t('{n} articles').replace('{n}', String(category.articles.length))}
              </p>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
