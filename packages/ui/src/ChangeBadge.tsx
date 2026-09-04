import { formatPercent } from './format'

interface ChangeBadgeProps {
  value: number | undefined
  /**
   * Langue dans laquelle écrire le pourcentage.
   *
   * ⚠️ OBLIGATOIRE, ET C'EST LE CORRECTIF. `formatPercent(value)` était appelé sans
   * langue : il retombait donc sur le défaut anglo-saxon de `format.ts`, et une page
   * française affichait « −0,032 $US » à côté de « −13.43% » — deux conventions dans
   * la même cellule, mesuré sur les tendances de la recherche.
   *
   * Elle n'a PAS de défaut, contrairement à `libelles` ci-dessous : un défaut est ce
   * qui a produit le défaut. Les quarante-sept points d'appel n'ont pourtant rien à
   * fournir — ils passent tous par l'enveloppe
   * `apps/web/components/locale/ChangeBadge.tsx`, qui tient la langue de la requête.
   */
  locale: string
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
  /**
   * Les mots de l'`aria-label` et de l'infobulle.
   *
   * ⚠️ POURQUOI UNE PROPRIÉTÉ ET NON UN APPEL AU TRADUCTEUR.
   *
   * `packages/ui` ne connaît aucune locale : il ne dépend ni de `next-intl`, ni de la
   * table de phrases, qui vivent dans `apps/web`. C'est la contrainte qui a produit le
   * défaut — ces deux textes étaient écrits en français DANS le composant, et
   * sortaient tels quels sur les pages anglaises. Un utilisateur de synthèse vocale
   * anglophone entendait « en hausse de 2,34 % sur 24 heures ».
   *
   * C'est aussi le patron déjà retenu ailleurs dans ce paquet : `EmptyState` reçoit
   * son titre et sa description en propriétés, traduits par l'appelant. Le composant
   * dessine, l'application parle.
   *
   * ⚠️ LES DÉFAUTS RESTENT FRANÇAIS, DÉLIBÉRÉMENT. Le français est la langue source du
   * site : un défaut vide ferait un badge muet, un défaut anglais mentirait sur les
   * pages françaises, qui sont la majorité. Un appelant qui passe `libelles` corrige
   * sa page ; un appelant qui ne le fait pas retrouve exactement le comportement
   * d'avant, ce qui permet de traiter les quarante-huit points d'appel un par un.
   */
  libelles?: {
    hausse: string
    baisse: string
    stable: string
    moins: string
    periodeDefaut: string
    variation: string
    absente: string
  }
}

/** Les mots d'origine — la langue source du site. */
const LIBELLES_FR: NonNullable<ChangeBadgeProps['libelles']> = {
  hausse: 'en hausse de',
  baisse: 'en baisse de',
  stable: 'stable,',
  moins: 'moins ',
  periodeDefaut: 'sur 24 heures',
  variation: 'Variation',
  absente: 'Donnée non fournie par la source',
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
  locale,
  periodLabel,
  size = 'md',
  filled = false,
  showPeriod = false,
  libelles = LIBELLES_FR,
}: ChangeBadgeProps) {
  const formatted = formatPercent(value, locale)

  // Donnée absente : on le montre comme tel, sans jamais afficher « 0,00 % » (§5).
  if (formatted === null || value === undefined) {
    return (
      <span className="text-ink-muted" title={libelles.absente}>
        —
      </span>
    )
  }

  const direction = value > 0 ? 'up' : value < 0 ? 'down' : 'flat'
  const chevron = direction === 'up' ? '▲' : direction === 'down' ? '▼' : '■'

  const tone =
    direction === 'up'
      ? filled
        ? 'bg-up-soft text-up ring-1 ring-up-line'
        : 'text-up'
      : direction === 'down'
        ? filled
          ? 'bg-down-soft text-down ring-1 ring-down-line'
          : 'text-down'
        : 'text-ink-muted'

  /* ⚠️ `ring` ET NON `border`, ET LA DIFFÉRENCE EST MESURABLE.

     Une bordure occupe de la place : ajouter 1 px de chaque côté élargit le badge de
     2 px et pousse tout ce qui le suit sur la ligne. Dans un tableau où le badge
     n'apparaît que sur les valeurs renseignées, les colonnes ne s'aligneraient plus
     d'une ligne à l'autre.

     `ring` est une ombre portée : elle se dessine SANS occuper de place, donc un
     badge cerclé et un badge nu font exactement la même largeur. */
  const spacing = filled ? 'rounded-md px-1.5 py-0.5' : ''
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm'

  const readable = `${
    direction === 'up' ? libelles.hausse : direction === 'down' ? libelles.baisse : libelles.stable
  } ${formatted.replace('−', libelles.moins).replace('+', '')} ${periodLabel ?? libelles.periodeDefaut}`

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
      className={`tabular inline-flex items-center gap-1 whitespace-nowrap font-medium ${textSize} ${tone} ${spacing}`}
      aria-label={readable}
      title={`${libelles.variation} ${periodLabel ?? libelles.periodeDefaut}`}
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
