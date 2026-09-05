'use client'

import { useLocale } from 'next-intl'
import { useMemo } from 'react'

import { BarFigure } from '@/components/charts/BarFigure'
import { usePhrase } from '@/components/locale/ContentProvider'
import { useCurrency } from '@/components/locale/CurrencyProvider'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * LES FRAIS PAYÉS — EN BARRES MENSUELLES
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── EN BARRES, PARCE QU'UN FLUX N'EST PAS UN NIVEAU ────────────────────────
 *
 * `AreaPlot` documente la règle et elle s'applique ici : « une aire relie visuellement
 * deux points par une pente, ce qui suggère un CONTINUUM ». Des frais encaissés ne
 * forment pas un continuum — chaque période est un montant reçu, indépendant de la
 * suivante, et la pente entre deux barres n'existe pas.
 *
 * ── AU MOIS, ET C'EST UNE CORRECTION MESURÉE ───────────────────────────────
 *
 * ⚠️ LA PREMIÈRE VERSION TRAÇAIT LES 730 POINTS QUOTIDIENS, ET LE CADRE SORTAIT VIDE.
 * Relevé au navigateur : axes gradués, filigrane visible, aucune barre. Sept cent
 * trente barres sur huit cent soixante pixels font 1,18 pixel chacune, espacement
 * compris — il ne reste rien à peindre.
 *
 * Le regroupement au mois donne vingt-quatre barres, chacune large d'une trentaine de
 * pixels. Et il est JUSTE : des frais sont un flux, et un flux se somme. Un total
 * mensuel est une grandeur réelle, contrairement à une capitalisation mensuelle qui
 * n'aurait aucun sens (voir la note de `series-grouping.ts` sur cette distinction).
 *
 * Le mois COURANT est écarté : il est incomplet par construction, et sa barre
 * tronquée se lirait comme un effondrement de l'activité.
 *
 * ── LA CONVERSION PASSE PAR LE CONTEXTE, PAS PAR LE FORMATEUR ──────────────
 *
 * Les points arrivent en dollars. `BarFigure` reçoit des nombres nus et les rend tels
 * quels : sans conversion ici, l'axe afficherait des dollars sous le symbole de la
 * devise choisie — un chiffre juste sous une étiquette fausse, ce qui est pire qu'une
 * conversion absente.
 */
export function FeeSeries({ points }: { points: { timestamp: number; value: number }[] }) {
  const t = usePhrase()
  const locale = useLocale()
  const { convert } = useCurrency()

  const data = useMemo(() => {
    const format = new Intl.DateTimeFormat(locale, { month: 'short', year: '2-digit' })

    /* Clé calendaire LOCALE, comme l'étiquette : regrouper en UTC puis libeller en
       heure locale fait tomber le dernier relevé d'un mois dans le paquet du
       précédent, et produit deux barres portant le même mois. Le défaut est
       documenté dans `series-grouping.ts`, où il a été observé. */
    const maintenant = new Date()
    const moisCourant = `${maintenant.getFullYear()}-${maintenant.getMonth()}`

    const paquets = new Map<string, { label: string; frais: number }>()

    for (const point of points) {
      const date = new Date(point.timestamp)
      const cle = `${date.getFullYear()}-${date.getMonth()}`
      if (cle === moisCourant) continue

      const paquet = paquets.get(cle)
      const montant = convert(point.value, 'USD')
      if (paquet) paquet.frais += montant
      else paquets.set(cle, { label: format.format(date), frais: montant })
    }

    return [...paquets.values()]
  }, [points, convert, locale])

  if (data.length < 2) return null

  return (
    <BarFigure
      height={280}
      data={data}
      ariaLabel={t('Frais payés, mois par mois')}
      series={[{ key: 'frais', label: t('Frais payés'), color: 'var(--color-brand)' }]}
    />
  )
}
