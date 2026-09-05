import { ChangeBadge } from '@/components/locale/ChangeBadge'
import { Money } from '@/components/locale/Money'

/**
 * BANDE DE TROIS CHIFFRES EN TÊTE DE PAGE.
 *
 * ── UN CHIFFRE ABSENT LAISSE SA CARTE, ET DIT « — » ────────────────────────
 *
 * C'est l'inverse de la règle habituelle du site, où un module sans donnée disparaît.
 * La bande est une GRILLE de trois : en retirer une carte décalerait les deux autres
 * et ferait lire une mise en page différente selon l'état d'une source. Ici l'absence
 * se dit dans la carte, à sa place, ce qui est aussi plus honnête — le lecteur voit
 * qu'une mesure existe et qu'elle manque, au lieu de ne pas savoir qu'elle existe.
 *
 * ── LA NOTE SOUS CHAQUE CHIFFRE N'EST PAS DÉCORATIVE ───────────────────────
 *
 * Ces agrégats ont tous un périmètre qui n'est pas évident : « valeur immobilisée »
 * est une somme sur cent chaînes et non sur toutes, « frais » n'est pas « revenu ». Un
 * grand nombre sans son périmètre est un nombre qu'on lira faux.
 */
export interface StatItem {
  key: string
  label: string
  /** En dollars quand `unit` vaut `usd`. `undefined` = la source n'a pas répondu. */
  value: number | undefined
  unit: 'usd'
  /** Variation en pourcentage, quand la source la publie. */
  change?: number
  note: string
}

export function StatStrip({ items }: { items: StatItem[] }) {
  return (
    <dl className="grid gap-3 sm:grid-cols-3 [&>*]:min-w-0">
      {items.map((item) => (
        <div
          key={item.key}
          className="rounded-card border border-border-subtle bg-surface p-4"
        >
          <dt className="text-xs font-medium text-ink-muted">{item.label}</dt>

          <dd className="mt-1 space-y-1">
            <p className="tabular flex flex-wrap items-baseline gap-2 text-xl font-semibold leading-tight text-ink">
              <Money value={item.value} from="USD" compact />
              {item.change !== undefined ? <ChangeBadge value={item.change} size="sm" /> : null}
            </p>
            <p className="text-micro leading-snug text-ink-muted">{item.note}</p>
          </dd>
        </div>
      ))}
    </dl>
  )
}
