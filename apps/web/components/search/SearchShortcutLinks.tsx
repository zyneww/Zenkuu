'use client'

import { ArrowDownRight, ArrowUpRight, Flame, Sparkles, TrendingUp } from 'lucide-react'

import { Link, type AppHref } from '@/i18n/navigation'
import { usePhrase } from '@/components/locale/ContentProvider'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * LA RANGÉE DE RACCOURCIS DU PANNEAU DE RECHERCHE
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Relevé sur `tokenomist.ai` : sous le champ, une rangée de pastilles —
 * « Highlights This Week », « Biggest Cliff Unlocks », « Trending TGEs »,
 * « Top Burns & Buybacks », « Insider Unlocks ».
 *
 * ── LEURS CINQ INTITULÉS NE SONT PAS LES NÔTRES, ET C'EST OBLIGATOIRE ───────
 *
 * Quatre des cinq portent sur des données que ce site n'a pas :
 *
 *   · « Cliff Unlocks » et « Insider Unlocks » supposent un calendrier de
 *     déverrouillage par jeton. `AssetSupply` le consigne depuis longtemps : aucune
 *     source gratuite ne le publie, et « les afficher supposerait de les ESTIMER ».
 *   · « Trending TGEs » suppose des dates d'émission initiale. Notre plus proche
 *     équivalent est `/nouvelles-cotations`, qui liste des cotations RÉCENTES — un
 *     fait mesuré, et pas la même chose qu'un lancement.
 *   · « Top Burns & Buybacks » : nous avons `/rachats`, qui porte les rachats de
 *     jetons. Les BRÛLAGES, eux, n'ont pas de source ici.
 *
 * Les cinq entrées ci-dessous sont donc les nôtres, et chacune mène à une page
 * réellement servie. Le principe retenu est celui de la référence — un point d'entrée
 * vers ce qui bouge, avant même d'avoir tapé quoi que ce soit — sans reprendre un
 * vocabulaire que nos données ne soutiennent pas (§5).
 *
 * ── POURQUOI DES LIENS ET NON DES FILTRES ───────────────────────────────────
 *
 * Chez elle, ces pastilles filtrent la liste du panneau. Ici elles NAVIGUENT, et la
 * raison est que les listes visées ne sont pas des sous-ensembles du catalogue
 * cherchable : un palmarès de hausses est un classement calculé côté serveur, pas un
 * filtre sur des résultats de recherche. Les rendre comme des filtres promettrait une
 * restriction du panneau, et en produirait une navigation.
 *
 * La flèche oblique de chacune dit cette sortie, comme celle des entrées de menu qui
 * quittent la page ailleurs sur le site.
 */

interface Raccourci {
  href: AppHref
  label: string
  icon: typeof Flame
}

const RACCOURCIS: Raccourci[] = [
  {
    href: { pathname: '/classements/[type]', params: { type: 'hausses' } },
    label: 'Plus fortes hausses',
    icon: ArrowUpRight,
  },
  {
    href: { pathname: '/classements/[type]', params: { type: 'baisses' } },
    label: 'Plus fortes baisses',
    icon: ArrowDownRight,
  },
  {
    href: { pathname: '/classements/[type]', params: { type: 'volumes' } },
    label: 'Les plus échangées',
    icon: TrendingUp,
  },
  { href: '/nouvelles-cotations', label: 'Nouvelles cotations', icon: Sparkles },
  { href: '/rachats', label: 'Rachats de jetons', icon: Flame },
]

export function SearchShortcutLinks({ onNavigate }: { onNavigate: () => void }) {
  const t = usePhrase()

  return (
    /* ⚠️ HORS DE `CommandList`, ET L'ENDROIT COMPTE. cmdk traite ses descendants
       comme des lignes sélectionnables au clavier ; cette rangée y deviendrait cinq
       « résultats » que les flèches parcourraient avant d'atteindre le premier actif.
       C'est la même raison qui tient `SearchShortcuts` — la légende des touches — en
       dehors de la liste.

       `flex-wrap` : à cinq pastilles la rangée déborde d'un panneau de 26 rem, et
       elle passe à la ligne plutôt que d'imposer un défilement horizontal dans une
       surface qui défile déjà verticalement. */
    <div className="flex flex-wrap items-center gap-1.5 px-3 pb-1 pt-2">
      {RACCOURCIS.map(({ href, label, icon: Icon }) => (
        <Link
          key={label}
          href={href}
          onClick={onNavigate}
          /* La géométrie des pastilles de catégorie de la fiche d'actif, à un cran en
             dessous : 12 px au lieu de 14, parce qu'elles sont cinq sur une rangée
             étroite là où la fiche en aligne trois sur toute sa largeur. */
          className="inline-flex items-center gap-1.5 rounded-control bg-surface-muted px-2.5 py-1.5 text-xs font-semibold leading-4 text-ink-secondary transition-colors hover:text-brand-strong"
        >
          <Icon className="size-3.5 shrink-0" aria-hidden="true" />
          {t(label)}
        </Link>
      ))}
    </div>
  )
}
