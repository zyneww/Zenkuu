'use client'

import { Link } from '@/i18n/navigation'
import { useState } from 'react'

import { HELP_AUDIENCES, HELP_CATEGORIES, type HelpAudience } from '@/content/aide'
import { HELP_ICONS } from '@/components/help/help-icons'
import { usePhrase } from '@/components/locale/ContentProvider'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * LES RUBRIQUES D'AIDE — TROIS ONGLETS DE PUBLIC, PUIS UNE GRILLE
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * C'est la pièce centrale du modèle repris (help.fiverr.com) : une rangée d'onglets
 * soulignés, puis des colonnes portant chacune un pictogramme, un titre, quelques
 * titres d'articles en clair, et un bouton « Voir tous les articles ».
 *
 * ── POURQUOI LES TITRES D'ARTICLES SONT ÉCRITS ICI ──────────────────────────
 *
 * La grille précédente n'affichait que le nom de la rubrique, sa phrase et un
 * compteur (« 4 articles »). Un compteur ne renseigne sur rien : il faut ouvrir la
 * rubrique pour savoir si elle contient la réponse, et si elle ne la contient pas,
 * revenir en arrière et recommencer.
 *
 * Les titres, eux, RÉPONDENT parfois à eux seuls — « À quelle fréquence les données
 * sont actualisées » est déjà la moitié de la réponse — et permettent en tout cas de
 * choisir sans ouvrir. C'est le choix du modèle, et c'est le bon : le coût est
 * quelques lignes de hauteur, le gain un aller-retour de moins par question.
 *
 * ── POURQUOI LES ONGLETS SONT UN VRAI FILTRE ────────────────────────────────
 *
 * Voir `HelpAudience` dans `content/aide.ts`. Trois onglets qui montreraient la même
 * grille seraient un décor coûtant deux clics ; ceux-ci retirent réellement des
 * rubriques. Une rubrique déclarée sous deux publics apparaît sous les deux, sans
 * duplication de son texte.
 *
 * ── ET POURQUOI CE COMPOSANT EST CLIENT ─────────────────────────────────────
 *
 * Pour l'état de l'onglet, et pour lui seul. Le CONTENU, lui, est rendu dans le HTML
 * initial — toutes les rubriques sont dans le document, seule leur visibilité change.
 * Un centre d'aide dont les articles n'existeraient qu'après exécution du JavaScript
 * ne serait indexé par personne (§9).
 */
export function HelpCategoryGrid() {
  const t = usePhrase()
  const [audience, setAudience] = useState<HelpAudience>('visiteur')

  const visible = HELP_CATEGORIES.filter((category) => category.audiences.includes(audience))

  return (
    <div className="space-y-8">
      {/* ── LES ONGLETS ──────────────────────────────────────────────────
          Un filet continu sous toute la rangée, et l'onglet actif le recouvre d'un
          trait plus épais : c'est ce qui rattache l'onglet à la grille qu'il
          commande, là où trois boutons flottants se liraient comme des liens. */}
      <div role="tablist" aria-label={t('Public')} className="flex gap-6 border-b border-border-subtle">
        {HELP_AUDIENCES.map((entry) => {
          const active = entry.id === audience
          return (
            <button
              key={entry.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setAudience(entry.id)}
              className={`-mb-px border-b-2 pb-2.5 text-sm transition-colors duration-150 ${
                active
                  ? 'border-ink font-semibold text-ink'
                  : 'border-transparent text-ink-muted hover:text-ink'
              }`}
            >
              {t(entry.label)}
            </button>
          )
        })}
      </div>

      {/* ── LA GRILLE ────────────────────────────────────────────────────
          `items-start` : les colonnes n'ont pas le même nombre d'articles, et sans
          lui la plus courte s'étirerait à la hauteur de la plus longue en laissant
          son bouton flotter au milieu du vide. */}
      <div className="grid items-start gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((category) => {
          const Icon = HELP_ICONS[category.icon]
          return (
            <section key={category.id} aria-labelledby={`rubrique-${category.id}`}>
              <Icon className="h-6 w-6 text-ink" aria-hidden="true" strokeWidth={1.5} />

              <h3 id={`rubrique-${category.id}`} className="mt-3 text-lg font-semibold text-ink">
                {t(category.title)}
              </h3>

              {/* ══════════════════════════════════════════════════════════════
                  LE COMPTEUR D'ARTICLES — RELEVÉ CHEZ KRAKEN

                  Leur grille écrit « Getting Started · 107 articles », en 14 px gris
                  sous le titre. Le nombre fait deux choses qu'un titre seul ne fait
                  pas : il dit si la rubrique VAUT le clic, et il situe l'effort — on
                  n'aborde pas de la même façon trois articles et trois cents.

                  ⚠️ IL EST CALCULÉ, JAMAIS ÉCRIT À LA MAIN. `category.articles.length`
                  suit la réalité du contenu : ajouter un article met le compteur à
                  jour, et il ne peut pas mentir. Un nombre saisi en dur dériverait au
                  premier ajout, et personne ne le vérifierait.

                  ⚠️ ET NOS NOMBRES SONT PETITS. Kraken affiche 107, 210, 314 ; nos
                  rubriques en portent trois ou quatre. C'est ce qu'il y a, et
                  l'afficher est plus honnête que de le cacher — un compteur absent
                  laisserait imaginer une profondeur que le site n'a pas (§5).
                  ══════════════════════════════════════════════════════════════ */}
              <p className="mt-0.5 text-sm text-ink-muted">
                {category.articles.length === 1
                  ? t('Un seul article')
                  : t('{n} articles').replace('{n}', String(category.articles.length))}
              </p>

              <ul className="mt-4 space-y-2.5">
                {/* Cinq au plus : au-delà, la colonne cesse d'être un aperçu et
                    devient la page de rubrique, que le bouton du dessous atteint
                    déjà. Le modèle s'arrête au même endroit. */}
                {category.articles.slice(0, 5).map((article) => (
                  <li key={article.slug}>
                    <Link
                      href={`/aide/${article.slug}`}
                      className="text-sm leading-snug text-ink-muted transition-colors duration-150 hover:text-brand"
                    >
                      {t(article.title)}
                    </Link>
                  </li>
                ))}
              </ul>

              <Link
                href={`/aide/rubrique/${category.id}`}
                className="mt-5 inline-flex rounded-sm border border-border-subtle px-3 py-1.5 text-xs font-medium text-ink transition-colors duration-150 hover:border-brand hover:text-brand"
              >
                {t('Voir tous les articles')}
              </Link>
            </section>
          )
        })}
      </div>
    </div>
  )
}
