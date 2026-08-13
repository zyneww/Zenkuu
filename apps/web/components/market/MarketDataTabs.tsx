'use client'

import { Link, usePathname } from '@/i18n/navigation'

/**
 * Barre d'onglets de l'ACTIVITÉ DU MARCHÉ — deux vues d'un même instant.
 *
 * ── DEUX ET NON QUATRE, APRÈS COUP ───────────────────────────────────────────
 *
 * Elle en portait quatre : cours, classements, données de trading, points marquants.
 * C'était une lecture trop large. « Cours » relève désormais de « Parcourir », et
 * « Classements » garde son entrée propre dans le menu Données — les mettre en
 * onglets d'un même groupe laissait entendre qu'on ne les atteignait que par là,
 * alors que chacun est une destination à part entière.
 *
 * Ne restent que les deux qui répondent RÉELLEMENT à la même question — « que fait
 * le marché en ce moment ? » — par deux angles qu'on ne peut pas regarder ensemble :
 * les volumes et l'exposition d'un côté, les extrêmes du jour de l'autre. C'est
 * exactement le cas où une barre d'onglets vaut mieux que deux entrées de menu :
 * elles ne se complètent pas, elles s'alternent.
 *
 * ── DE VRAIS LIENS, ET L'ÉTAT VIENT DU CHEMIN ────────────────────────────────
 *
 * Pas d'onglets JavaScript : chaque vue est une URL indexable, partageable, ouvrable
 * au clic milieu. L'onglet actif est déduit de `usePathname()` plutôt que passé en
 * prop — une prop obligerait chaque page à se nommer elle-même, et la troisième à ne
 * pas oublier de le faire.
 *
 * Le drapeau `exact` subsiste alors qu'aucune des deux vues n'a de sous-chemin
 * aujourd'hui. Il coûte un booléen et évite le piège du jour où l'une en gagnera un :
 * une comparaison par préfixe allumerait alors l'onglet parent sur la page enfant.
 */

const TABS = [
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
