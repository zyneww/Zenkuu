'use client'

import type { AssetDetail } from '@zenkuu/data'
import { formatCompact, formatCurrency, formatDateTime } from '@zenkuu/ui'

import { useContent } from '@/components/locale/ContentProvider'
import { useCurrency } from '@/components/locale/CurrencyProvider'

/**
 * Questions fréquentes sur un actif — entièrement DÉRIVÉES de sa donnée réelle.
 *
 * Aucune réponse n'est rédigée à l'avance : chaque entrée reprend une valeur
 * effectivement chargée, et les questions dont la donnée manque ne sont pas
 * affichées. Une FAQ écrite « en dur » sur une fiche générique finirait
 * inévitablement par affirmer quelque chose de faux sur l'un des milliers d'actifs.
 *
 * ── POURQUOI ELLE A QUITTÉ LE PLAN DE TRAVAIL DU GRAPHIQUE ────────────────────
 *
 * Elle y était le troisième d'une rangée de sous-onglets posée au-dessus de la barre
 * d'outils — la dernière chose qui séparait la fiche de la disposition de la
 * référence, chez qui la courbe démarre immédiatement sous les onglets principaux.
 *
 * Sa place est en BAS DE PAGE, et pas seulement parce que la référence l'y met. Une
 * FAQ répond à des questions qu'on se pose APRÈS avoir regardé les chiffres ; enfermée
 * dans un onglet de graphique, elle n'était atteignable qu'en abandonnant la courbe.
 * En bas de page, elle est aussi lue par les moteurs de recherche sans qu'un état
 * React ait à être hydraté — ce qui compte, le §9 faisant du référencement organique
 * le premier moteur d'acquisition.
 *
 * ── LA DEVISE VIENT DU SITE, PLUS DU GRAPHIQUE ────────────────────────────────
 *
 * Le composant lisait le sélecteur LOCAL de la barre d'outils. Il suit désormais la
 * devise choisie par le lecteur pour tout le site, comme chaque autre montant de la
 * page (voir `Money`) — ce qui est plus juste : un sélecteur de graphique n'a jamais
 * eu vocation à régler le libellé d'une phrase.
 */
export function AssetFaq({ asset }: { asset: AssetDetail }) {
  const fr = useContent()
  const { currency, convert } = useCurrency()

  /* Les réponses sont des PHRASES : le montant y est interpolé, il ne peut donc pas
     passer par le composant `Money`. La conversion est faite à la main, avec la même
     fonction que lui — une seule source de taux pour toute la page. */
  const money = (value: number, compact = false) =>
    formatCurrency(convert(value, asset.currency), currency, compact ? { compact: true } : undefined) ??
    '—'

  const entries: { question: string; answer: string }[] = [
    {
      question: fr.asset.faq.priceQ(asset.name),
      answer: fr.asset.faq.priceA(
        asset.name,
        money(asset.price),
        formatDateTime(asset.lastUpdated) ?? '—',
      ),
    },
  ]

  if (asset.marketCap !== undefined) {
    entries.push({
      question: fr.asset.faq.capQ(asset.name),
      answer: fr.asset.faq.capA(money(asset.marketCap, true), asset.rank),
    })
  }

  if (asset.ath !== undefined && asset.assetClass === 'crypto') {
    entries.push({
      question: fr.asset.faq.athQ(asset.name),
      answer: fr.asset.faq.athA(
        money(asset.ath),
        asset.athDate ? formatDay(asset.athDate) : null,
      ),
    })
  }

  if (asset.maxSupply !== undefined) {
    entries.push({
      question: fr.asset.faq.supplyQ(asset.name),
      answer: fr.asset.faq.supplyA(
        formatCompact(asset.maxSupply) ?? '—',
        asset.symbol,
        formatCompact(asset.circulatingSupply),
      ),
    })
  }

  entries.push({ question: fr.asset.faq.buyQ(asset.name), answer: fr.asset.faq.buyA })

  return (
    <section aria-labelledby="faq-titre" className="space-y-3">
      <h2 id="faq-titre" className="display-sm text-ink">
        {fr.asset.tabs.faq}
      </h2>

      {/* Deux colonnes à partir de `sm`, comme la FAQ de la page de tarifs : une
          liste de questions courtes sur toute la largeur d'un écran laisse des
          lignes de deux mots suivies d'un grand vide. */}
      <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
        {entries.map((entry) => (
          <div key={entry.question}>
            <dt className="text-sm font-semibold text-ink">{entry.question}</dt>
            <dd className="mt-1 text-sm leading-relaxed text-ink-muted">{entry.answer}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

function formatDay(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' }).format(date)
}
