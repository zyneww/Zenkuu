'use client'

import { Link, usePathname } from '@/i18n/navigation'

/**
 * Barre d'onglets de la FAMILLE « données de marché ».
 *
 * ── LE MANQUE QU'ELLE COMBLE ─────────────────────────────────────────────────
 *
 * Quatre pages traitent du marché crypto sous quatre angles — les cours, les
 * classements, les données de trading, les points marquants. Elles se renvoyaient
 * l'une à l'autre par des liens en fin de page, dans un paragraphe. Autrement dit :
 * on ne découvrait l'existence des trois autres qu'après avoir lu la première en
 * entier, et il fallait remonter pour y aller.
 *
 * C'est la structure d'OKX qui manquait ici, et c'est la partie de leur mise en page
 * qui vaut vraiment d'être reprise : `Marchés | Classements | Données de trad.` est
 * posé EN TÊTE, sur les quatre pages, et dit d'emblée que ce sont quatre vues d'un
 * même sujet plutôt que quatre destinations sans rapport.
 *
 * ── DE VRAIS LIENS, ET L'ÉTAT VIENT DU CHEMIN ────────────────────────────────
 *
 * Pas d'onglets JavaScript : chaque vue est une URL indexable, partageable, ouvrable
 * au clic milieu. L'onglet actif est déduit de `usePathname()` plutôt que passé en
 * prop — une prop obligerait chacune des quatre pages à se nommer elle-même, et la
 * cinquième à ne pas oublier de le faire.
 *
 * `startsWith` et non l'égalité : `/crypto/bitcoin` n'est pas la page des cours, et
 * l'égalité stricte est donc juste ici — mais elle serait fausse le jour où l'une de
 * ces vues gagnerait un sous-chemin. On compare donc au chemin exact pour `/crypto`,
 * qui a des enfants, et par préfixe pour les autres, qui n'en ont pas.
 */

const TABS = [
  { href: '/crypto', label: 'Cours', exact: true },
  { href: '/crypto/all-coins', label: 'Classements', exact: false },
  { href: '/crypto/mouvements', label: 'Données de trading', exact: false },
  { href: '/crypto/highlights', label: 'Points marquants', exact: false },
] as const

export function MarketDataTabs() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Vues du marché crypto"
      /* Le filet inférieur court sur TOUTE la largeur, pas seulement sous les onglets :
         c'est lui qui fait lire la rangée comme une barre d'onglets plutôt que comme
         une série de boutons. L'onglet actif l'interrompt de son propre trait. */
      className="-mx-1 overflow-x-auto border-b border-border-subtle"
    >
      <ul className="flex items-center gap-1 px-1">
        {TABS.map((tab) => {
          const active = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href)

          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? 'page' : undefined}
                className={`inline-block whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors duration-150 ${
                  active
                    ? 'border-brand text-ink'
                    : 'border-transparent text-ink-muted hover:text-ink'
                }`}
              >
                {tab.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
