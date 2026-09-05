'use client'

import { Link } from '@/i18n/navigation'
import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'

import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'

import { HELP_ARTICLES } from '@/content/aide'
import { usePhrase } from '@/components/locale/ContentProvider'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * LE CHAMP DE RECHERCHE DU CENTRE D'AIDE — ET RIEN D'AUTRE
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── CE QUI EN EST PARTI ─────────────────────────────────────────────────────
 *
 * Ce composant portait AUSSI la grille de rubriques, affichée au repos et remplacée
 * par les résultats dès qu'on tapait. C'était le montage de l'ancienne page, où la
 * grille n'existait qu'ici.
 *
 * La page est refaite sur le modèle demandé (help.fiverr.com), qui pose la recherche
 * dans un BANDEAU en tête et la grille de rubriques dans le corps, sous des onglets
 * de public. Les deux ne peuvent plus se remplacer l'une l'autre : elles ne sont plus
 * au même endroit de la page. La grille vit donc dans `HelpCategoryGrid`, et ce
 * composant se réduit à ce qu'il a toujours dû être — un champ et ses résultats.
 *
 * ── LA RECHERCHE RESTE LOCALE ───────────────────────────────────────────────
 *
 * Le corpus tient dans quelques kilo-octets déjà présents dans le paquet. Une route
 * d'API ferait un aller-retour serveur pour filtrer un tableau que le navigateur a
 * sous la main. La recherche universelle de l'en-tête, elle, interroge bien le
 * serveur — mais elle porte sur des milliers d'actifs, pas sur une quinzaine
 * d'articles.
 */
export function HelpSearch({
  suggestions = [],
}: {
  /**
   * Les « recherches fréquentes » proposées sous le champ.
   *
   * ⚠️ CE NE SONT PAS DES REQUÊTES POPULAIRES, et le libellé de la page le dit :
   * ZENKUU ne mesure pas ce que ses lecteurs cherchent. Ce sont des ENTRÉES
   * suggérées, choisies à la main. Annoncer une popularité qu'on ne mesure pas serait
   * une donnée inventée comme une autre (§5).
   */
  suggestions?: readonly string[]
}) {
  const t = usePhrase()
  const [query, setQuery] = useState('')

  const normalized = query.trim().toLowerCase()

  const results = useMemo(() => {
    if (normalized.length < 2) return null

    return HELP_ARTICLES.filter((article) =>
      // Le corps est inclus dans la recherche : on cherche souvent une aide par un
      // mot qui figure dans la réponse, pas dans son titre (« BCE », « 429 »…).
      [article.title, article.summary, article.categoryTitle, ...article.body]
        .join(' ')
        .toLowerCase()
        .includes(normalized),
    )
  }, [normalized])

  return (
    <div className="space-y-3">
      {/* Cran `lg` : c'est le champ de recherche PRINCIPAL de la page d'aide, la
          première chose qu'on y fait. Les autres champs du site sont en `sm` ou `md`. */}
      <InputGroup size="lg" className="bg-surface">
        <InputGroupInput
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('Rechercher dans le centre d’aide')}
          aria-label={t('Rechercher dans le centre d’aide')}
        />
        <InputGroupAddon>
          <Search />
        </InputGroupAddon>
      </InputGroup>

      {/* Les suggestions ne s'affichent QUE tant qu'on n'a rien tapé : sous une liste
          de résultats, elles proposeraient de remplacer une réponse par une autre
          question. */}
      {results === null && suggestions.length > 0 ? (
        <div className="flex flex-wrap items-center justify-center gap-1.5 text-xs">
          <span className="text-ink-muted">{t('Pour commencer')}</span>
          {suggestions.map((entry) => (
            <button
              key={entry}
              type="button"
              onClick={() => setQuery(entry)}
              className="rounded-pill border border-border-subtle bg-surface px-2.5 py-1 text-ink transition-colors duration-150 hover:border-brand hover:text-brand"
            >
              {t(entry)}
            </button>
          ))}
        </div>
      ) : null}

      {results ? (
        /* `text-left` : le bandeau centre son contenu, une liste de résultats non.
           Un titre d'article centré sur trois lignes n'a plus de marge à laquelle
           l'œil revient. */
        <section aria-live="polite" className="space-y-2 text-left">
          <h2 className="text-sm font-semibold text-ink">
            {results.length === 0
              ? t('Aucun article ne correspond')
              : `${results.length} ${results.length > 1 ? t('articles trouvés') : t('article trouvé')}`}
          </h2>

          {results.length === 0 ? (
            <p className="text-sm leading-relaxed text-ink-muted">
              {t('Reformulez avec un autre terme, ou parcourez les rubriques ci-dessous.')}
            </p>
          ) : (
            <ul className="space-y-2">
              {results.map((article) => (
                <li key={article.slug}>
                  <Link
                    href={{ pathname: '/aide/[slug]', params: { slug: article.slug } }}
                    className="block rounded-card border border-border-subtle bg-surface p-3 transition-colors hover:border-brand"
                  >
                    <span className="text-[0.6875rem] font-medium text-ink-muted">
                      {t(article.categoryTitle)}
                    </span>
                    <span className="block text-sm font-medium text-ink">{t(article.title)}</span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-ink-muted">
                      {t(article.summary)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  )
}
