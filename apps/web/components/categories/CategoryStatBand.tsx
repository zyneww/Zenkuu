import type { MarketCategory } from '@zenkuu/data'
import { ChangeBadge, formatCompact } from '@zenkuu/ui'

import { Link } from '@/i18n/navigation'
import { getPhrase } from '@/lib/content'

/**
 * EN-TÊTE CHIFFRÉ DES SECTEURS — quatre repères avant le tableau.
 *
 * ── POURQUOI UNE BANDE AVANT UN TABLEAU DÉJÀ COMPLET ──────────────────────────
 *
 * Le tableau des secteurs est triable, filtrable et plus riche que celui de la
 * référence. Il lui manque pourtant ce que la référence met en une phrase au-dessus du
 * sien : QUEL secteur domine, LEQUEL bouge, et sur combien. Trois cent soixante lignes
 * ne répondent à aucune de ces questions tant qu'on ne les a pas triées trois fois.
 *
 * Une bande de quatre repères y répond avant le premier clic. Aucun n'est nouveau —
 * tous se lisent dans le tableau — mais aucun ne s'y lit d'un coup d'œil.
 *
 * ── LES DEUX EXTRÊMES SONT FILTRÉS PAR TAILLE, ET IL FAUT LE DIRE ─────────────
 *
 * « Plus forte hausse » sur trois cent soixante secteurs, c'est presque toujours un
 * narratif de trois jetons à quarante millions qui a doublé — vrai, et sans rapport
 * avec le marché. Les extrêmes sont donc cherchés parmi les secteurs qui pèsent au
 * moins un milliard, et le libellé le précise : un classement filtré qui ne dit pas
 * son filtre est un classement faux.
 *
 * ── ET LA BANDE DIT AUSSI CE QUI MANQUE ───────────────────────────────────────
 *
 * La référence trace deux courbes que nous ne pouvons pas tracer : capitalisation des
 * secteurs dans le temps, et performance comparée des grands narratifs. La source ne
 * publie aucun historique par catégorie sur son palier gratuit — un seul relevé, celui
 * du jour. Le reconstituer en additionnant les historiques des membres de chaque
 * secteur coûterait des dizaines d'appels pour un proxy plus faible que le panier de
 * capitalisations déjà servi ailleurs. On le dit, et on renvoie là où la profondeur
 * existe réellement.
 */

/** Plancher de capitalisation pour entrer au classement des extrêmes. */
const FLOOR_USD = 1_000_000_000

export async function CategoryStatBand({ categories }: { categories: MarketCategory[] }) {
  const t = await getPhrase()
  const valued = categories.filter((category) => (category.marketCap ?? 0) > 0)
  if (valued.length === 0) return null

  const largest = [...valued].sort((a, b) => (b.marketCap ?? 0) - (a.marketCap ?? 0))[0]

  const movers = valued
    .filter(
      (category) =>
        category.marketCapChange24h !== undefined && (category.marketCap ?? 0) >= FLOOR_USD,
    )
    .sort((a, b) => (b.marketCapChange24h as number) - (a.marketCapChange24h as number))

  const best = movers[0]
  const worst = movers[movers.length - 1]

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label={t('Secteurs cotés')}
          value={String(valued.length)}
          hint={t('sur {n} publiés').replace('{n}', String(categories.length))}
        />

        {largest ? (
          <Stat
            label={t('Plus grand secteur')}
            value={largest.name}
            hint={`${formatCompact(largest.marketCap as number)} $`}
            href={`/categories/${largest.id}`}
          />
        ) : null}

        {/* `best !== worst` : avec un seul secteur au-dessus du plancher, la même ligne
            occuperait les deux cases et annoncerait une hausse et une baisse identiques. */}
        {best && worst && best !== worst ? (
          <>
            <Stat
              label={t('Plus forte hausse 24 h')}
              value={best.name}
              change={best.marketCapChange24h as number}
              hint={`${formatCompact(best.marketCap as number)} $ · ${t('secteurs > 1 Md $')}`}
              href={`/categories/${best.id}`}
            />
            <Stat
              label={t('Plus forte baisse 24 h')}
              value={worst.name}
              change={worst.marketCapChange24h as number}
              hint={`${formatCompact(worst.marketCap as number)} $ · ${t('secteurs > 1 Md $')}`}
              href={`/categories/${worst.id}`}
            />
          </>
        ) : null}
      </div>

      <p className="max-w-4xl text-xs leading-relaxed text-ink-muted">
        Ces chiffres décrivent le <strong className="text-ink">{t('jour')}</strong>, et pas autre
        chose : la source ne publie aucun historique par secteur sur son palier gratuit, un
        seul relevé à la fois. Il n’y a donc pas de courbe sectorielle sur cette page, et
        n’en inventer aucune est préférable à en estimer une. Pour de la profondeur, voir la{' '}
        <Link href="/graphiques" className="font-medium text-ink hover:underline">
          vue générale
        </Link>{' '}
        et son panier de capitalisations, qui remonte à douze mois — et la{' '}
        <Link
          href="/graphiques?vue=secteurs"
          className="font-medium text-ink hover:underline"
        >
          carte thermique
        </Link>{' '}
        pour voir ces mêmes secteurs en surfaces. Montants en dollars, tels que publiés.
      </p>
    </div>
  )
}

function Stat({
  label,
  value,
  hint,
  change,
  href,
}: {
  label: string
  value: string
  hint: string
  change?: number
  href?: string
}) {
  const body = (
    <>
      <p className="truncate text-xs text-ink-muted">{label}</p>
      <p className="mt-1 flex items-baseline gap-2">
        <span className="truncate text-base font-semibold leading-tight text-ink">{value}</span>
        {change !== undefined ? <ChangeBadge value={change} size="sm" /> : null}
      </p>
      <p className="tabular mt-1 truncate text-micro leading-snug text-ink-muted">{hint}</p>
    </>
  )

  const shell = 'rounded-card border border-border-subtle bg-panel p-4'

  return href !== undefined ? (
    <Link href={href} className={`${shell} block transition-colors duration-150 hover:border-brand`}>
      {body}
    </Link>
  ) : (
    <div className={shell}>{body}</div>
  )
}
