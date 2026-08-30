import { formatPercent } from './format'

interface ChangeBadgeProps {
  value: number | undefined
  /** Période réellement couverte, quand ce n'est pas 24 h (cf. `changePeriodLabel`). */
  periodLabel?: string
  size?: 'sm' | 'md'
  /** Fond coloré, pour les mises en avant. */
  filled?: boolean
  /**
   * Écrire la période À CÔTÉ du chiffre — « ▲ +1,1 % (24 h) ».
   *
   * ── POURQUOI CE N'EST PAS LE DÉFAUT ─────────────────────────────────────────
   *
   * Ce badge vit surtout dans des TABLEAUX, sous un en-tête de colonne qui nomme déjà
   * la période. L'y répéter cinquante fois par page ajouterait cinquante fois la même
   * information, dans la colonne la plus étroite du tableau.
   *
   * Sur une FICHE, il n'y a pas d'en-tête de colonne : le chiffre est seul à côté du
   * cours, et rien ne dit sur quelle durée il porte. La référence de marché l'écrit
   * pour cette raison, et c'est le seul endroit où ça vaut la place.
   */
  showPeriod?: boolean
}

/**
 * Variation de prix.
 *
 * La couleur n'est jamais le seul porteur d'information (§9) : le signe (+/−) et
 * le chevron transmettent le sens indépendamment de la perception des couleurs.
 * Un `aria-label` explicite complète, car « ▲ +2,34 % » se lit mal à la synthèse
 * vocale.
 */
export function ChangeBadge({
  value,
  periodLabel,
  size = 'md',
  filled = false,
  showPeriod = false,
}: ChangeBadgeProps) {
  const formatted = formatPercent(value)

  // Donnée absente : on le montre comme tel, sans jamais afficher « 0,00 % » (§5).
  if (formatted === null || value === undefined) {
    return (
      <span className="text-ink-muted" title="Donnée non fournie par la source">
        —
      </span>
    )
  }

  const direction = value > 0 ? 'up' : value < 0 ? 'down' : 'flat'
  const chevron = direction === 'up' ? '▲' : direction === 'down' ? '▼' : '■'

  const tone =
    direction === 'up'
      ? filled
        ? 'bg-up-soft text-up'
        : 'text-up'
      : direction === 'down'
        ? filled
          ? 'bg-down-soft text-down'
          : 'text-down'
        : 'text-ink-muted'

  const spacing = filled ? 'rounded-md px-1.5 py-0.5' : ''
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm'

  const readable = `${direction === 'up' ? 'en hausse de' : direction === 'down' ? 'en baisse de' : 'stable,'} ${formatted.replace('−', 'moins ').replace('+', '')} ${periodLabel ?? 'sur 24 heures'}`

  return (
    // `whitespace-nowrap` en complément de l'espace insécable posée par
    // `formatPercent` : celle-ci protège le pourcent, mais le chevron et le nombre
    // restent séparés par un `gap` de flex, donc coupables. Les colonnes de variation
    // vivent dans des largeurs fixes (`w-16`) où la coupure est certaine sans cette
    // règle — un nombre séparé de son signe se lit comme un affichage cassé.
    <span
      /* Graisse 400 et non 500. Dans le tableau de la référence, les variations
         (1 h, 24 h, 7 j, 30 j) sont rendues en 14px/400, exactement comme le cours et
         le volume : rien ne les épaissit. Elles se distinguent par la COULEUR, qui
         suffit — les épaissir en plus disait deux fois la même chose. */
      className={`tabular inline-flex items-center gap-1 whitespace-nowrap font-normal ${textSize} ${tone} ${spacing}`}
      aria-label={readable}
      title={periodLabel ? `Variation ${periodLabel}` : 'Variation sur 24 heures'}
    >
      <span aria-hidden="true" className="text-[0.7em]">
        {chevron}
      </span>
      {formatted}
      {showPeriod ? (
        /* `aria-hidden` : la période est DÉJÀ dans l'`aria-label` du badge, qui la lit
           en toutes lettres (« sur 24 heures »). L'annoncer deux fois ferait entendre
           « en hausse de 1,1 % sur 24 heures, 24 h ». */
        <span aria-hidden="true" className="font-normal text-ink-muted">
          ({periodLabel ?? '24 h'})
        </span>
      ) : null}
    </span>
  )
}
