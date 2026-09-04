import { usePhrase } from '@/components/locale/ContentProvider'
import { ArrowRight } from 'lucide-react'

import type { MoversPeriod } from '@zenkuu/data'

import { Link } from '@/i18n/navigation'

/**
 * Lien « Voir en détail » — dix lignes ne sont pas un classement, c'est un aperçu.
 *
 * ── POURQUOI DANS L'EN-TÊTE, ET PAS SOUS LA LISTE ────────────────────────────
 *
 * Sous la dernière ligne, il se lit comme « charger la suite » et fait attendre un
 * allongement sur place. Dans l'en-tête, il annonce une AUTRE page avant qu'on ait
 * commencé à lire — ce qui est précisément l'information utile à qui cherche un actif
 * précis plutôt qu'à qui balaie le palmarès.
 *
 * ── IL EMPORTE LA PÉRIODE ────────────────────────────────────────────────────
 *
 * Arriver sur « 24 h » après avoir réglé le palmarès sur « 7 j » ferait perdre le
 * réglage au moment exact où l'on veut aller plus loin. Le paramètre voyage donc dans
 * l'URL, ce qui rend aussi le classement partageable tel qu'on l'a vu.
 *
 * ── UN COMPOSANT PARTAGÉ, ET NON DEUX COPIES ─────────────────────────────────
 *
 * Deux surfaces l'utilisent : les quatre palmarès de `/classements`, qui vivent
 * dans un composant CLIENT, et les deux cartes de `/mouvements`, rendues côté
 * serveur. Un composant sans état ni effet traverse la frontière sans rien exiger — et
 * le recopier des deux côtés aurait garanti qu'un des deux liens perde la période le
 * jour où l'autre gagne un paramètre.
 */
export function RankingDetailLink({
  type,
  period,
}: {
  /** `hausses`, `baisses`, `volumes` ou `rotation`. */
  type: string
  period: MoversPeriod
}) {
  const t = usePhrase()
  return (
    <Link
      href={{ pathname: '/classements/[type]', params: { type }, query: { periode: period } }}
      className="group inline-flex shrink-0 items-center gap-1 rounded-control border border-border-subtle px-2 py-1 text-[0.6875rem] font-medium text-ink-muted transition-colors duration-150 hover:border-brand hover:text-ink"
    >
      {t('Voir en détail')}
      <ArrowRight
        className="h-3 w-3 transition-transform duration-150 group-hover:translate-x-0.5"
        aria-hidden="true"
      />
    </Link>
  )
}
