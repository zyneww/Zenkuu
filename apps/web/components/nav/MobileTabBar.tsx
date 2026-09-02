'use client'

import { Home, Search, Star, Menu } from 'lucide-react'
import { usePathname } from 'next/navigation'

import { Link } from '@/i18n/navigation'
import { usePhrase } from '@/components/locale/ContentProvider'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * LA BARRE D'ONGLETS DU BAS — CE QUI REND UN SITE UTILISABLE D'UNE MAIN
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Relevée sur coingecko.com au téléphone : une barre fixe en pied d'écran, cinq à six
 * entrées, icône au-dessus du mot, l'active en couleur de marque.
 *
 * ── POURQUOI EN BAS, ET NON EN HAUT ────────────────────────────────────────
 *
 * Le pouce d'une main qui tient l'appareil atteint le tiers inférieur de l'écran. Tout
 * ce qui vit en haut demande de changer de prise — sur un iPhone 12 mini de 375 px de
 * large, l'en-tête est à quinze centimètres du pouce au repos.
 *
 * Le site avait un tiroir, ouvert par un bouton en haut à gauche : deux gestes hors de
 * portée pour atteindre n'importe quelle page. La barre en met quatre à un geste.
 *
 * ── QUATRE ENTRÉES, ET NON LES SIX DE LA RÉFÉRENCE ─────────────────────────
 *
 * Leur barre porte Home, Portfolio, Search, Ask, Sign Up, Menu. Deux de ces six n'ont
 * aucun équivalent ici et ne peuvent pas en avoir : le portefeuille demande un compte,
 * « Ask » un assistant. « Sign Up » non plus — les comptes ont été retirés du site.
 *
 * Restent Accueil, Recherche et Menu, auxquels s'ajoutent les Favoris — qui existent
 * déjà, tenus par un cookie anonyme, et qui sont ce qu'un lecteur revient chercher.
 *
 * Quatre entrées à 375 px font 93 px chacune : de quoi porter un mot entier sans
 * l'abréger. Six en feraient 62, et « Cryptomonnaies » n'y tiendrait pas.
 */

const ENTREES = [
  { href: '/', label: 'Accueil', icon: Home },
  { href: '/screener', label: 'Recherche', icon: Search },
  { href: '/tableau-de-bord', label: 'Favoris', icon: Star },
] as const

export function MobileTabBar({ onOpenMenu }: { onOpenMenu?: () => void }) {
  const t = usePhrase()
  const pathname = usePathname()

  /* Le chemin porte le préfixe de langue (`/en/screener`) : on le retire pour comparer
     à des adresses qui n'en ont pas. Sans cela, aucune entrée ne serait jamais active
     hors du français. */
  const chemin = pathname.replace(/^\/[a-z]{2}(-[A-Z]{2})?(?=\/|$)/, '') || '/'

  return (
    /*
      `fixed bottom-0` et `lg:hidden` : la barre n'existe que sur les écrans où la
      navigation du haut disparaît. Sur grand écran, elle doublerait un menu déjà
      atteignable et mangerait 56 px de hauteur utile.

      ⚠️ `pb-[env(safe-area-inset-bottom)]` : sur un iPhone à encoche, la zone du bas
      est occupée par la barre de gestes du système. Sans cette marge, le dernier
      onglet se trouve SOUS elle — visible mais intouchable, ce qui est le pire des
      deux états.

      `backdrop-blur` avec un fond à 90 % : le contenu qui défile dessous reste
      perceptible, ce qui dit que la page continue derrière la barre.
    */
    <nav
      aria-label={t('Navigation principale')}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border-subtle bg-canvas/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
    >
      <ul className="flex items-stretch">
        {ENTREES.map((entree) => {
          const Icone = entree.icon
          const actif = entree.href === '/' ? chemin === '/' : chemin.startsWith(entree.href)

          return (
            <li key={entree.href} className="flex-1">
              <Link
                href={entree.href}
                aria-current={actif ? 'page' : undefined}
                /* `min-h-14` : 56 px, au-dessus du plancher tactile de 44 px du
                   projet. Une barre au ras du minimum se rate au doigt en marchant. */
                className={`flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 transition-colors ${
                  actif ? 'text-brand-strong' : 'text-ink-muted'
                }`}
              >
                <Icone className="size-5 shrink-0" aria-hidden="true" />
                {/* `text-micro` (11 px) : le mot entier plutôt qu'une abréviation.
                    Une icône seule se devine ; accompagnée de son mot, elle se lit. */}
                <span className="text-micro leading-none">{t(entree.label)}</span>
              </Link>
            </li>
          )
        })}

        {/* Le menu est un BOUTON et non un lien : il ouvre le tiroir existant plutôt
            que de mener à une page. Le rendre semblable aux trois autres serait
            mentir sur ce qu'il fait. */}
        <li className="flex-1">
          <button
            type="button"
            onClick={onOpenMenu}
            className="flex min-h-14 w-full flex-col items-center justify-center gap-0.5 px-1 text-ink-muted transition-colors"
          >
            <Menu className="size-5 shrink-0" aria-hidden="true" />
            <span className="text-micro leading-none">{t('Menu')}</span>
          </button>
        </li>
      </ul>
    </nav>
  )
}
