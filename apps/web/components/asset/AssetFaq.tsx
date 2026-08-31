'use client'

import { ChevronDown } from 'lucide-react'
import { useLocale } from 'next-intl'

import type { AssetDetail } from '@zenkuu/data'
import { formatCompact, formatCurrency, formatDateTime } from '@zenkuu/ui'

import { useContent, usePhrase } from '@/components/locale/ContentProvider'
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
  const t = usePhrase()
  const locale = useLocale()
  const { currency, convert } = useCurrency()

  /**
   * Les phrases viennent de la TABLE et non du dictionnaire, et ce n'est pas une
   * question de style.
   *
   * Ce composant est CLIENT. Les entrées `asset.faq` du dictionnaire sont des
   * FONCTIONS, et une fonction ne franchit pas la frontière serveur → client :
   * elles arrivaient `undefined`, le repli de `useContent()` les rétablissait
   * depuis `fr`, et les cinq questions s'affichaient en français dans les douze
   * autres langues. La table de phrases est un objet de chaînes — elle traverse.
   *
   * Les valeurs sont substituées après coup plutôt qu'interpolées : c'est ce qui
   * permet au traducteur de déplacer `{nom}` ou `{cours}` où sa langue les veut.
   */
  const remplir = (texte: string, valeurs: Record<string, string>) =>
    Object.entries(valeurs).reduce(
      (phrase, [nom, valeur]) => phrase.replaceAll(`{${nom}}`, valeur),
      t(texte),
    )

  /* Les réponses sont des PHRASES : le montant y est interpolé, il ne peut donc pas
     passer par le composant `Money`. La conversion est faite à la main, avec la même
     fonction que lui — une seule source de taux pour toute la page. */
  const money = (value: number, compact = false) =>
    formatCurrency(convert(value, asset.currency), currency, compact ? { compact: true } : undefined) ??
    '—'

  const entries: { question: string; answer: string }[] = [
    {
      question: remplir('Quel est le cours de {nom} aujourd’hui ?', { nom: asset.name }),
      answer: remplir(
        '{nom} s’échange à {cours}. Dernière valeur publiée par notre source le {date}.',
        {
          nom: asset.name,
          cours: money(asset.price),
          date: formatDateTime(asset.lastUpdated) ?? '—',
        },
      ),
    },
  ]

  if (asset.marketCap !== undefined) {
    entries.push({
      question: remplir('Quelle est la capitalisation de {nom} ?', { nom: asset.name }),
      answer: remplir(
        asset.rank
          ? 'Sa capitalisation s’élève à {capitalisation}, ce qui le place au rang {rang} de sa classe d’actif.'
          : 'Sa capitalisation s’élève à {capitalisation}.',
        { capitalisation: money(asset.marketCap, true), rang: String(asset.rank ?? '') },
      ),
    })
  }

  if (asset.ath !== undefined && asset.assetClass === 'crypto') {
    entries.push({
      question: remplir('Quel est le plus haut historique de {nom} ?', { nom: asset.name }),
      answer: remplir(
        asset.athDate
          ? 'Son plus haut historique est de {cours}, atteint le {date}.'
          : 'Son plus haut historique est de {cours}.',
        { cours: money(asset.ath), date: asset.athDate ? formatDay(asset.athDate, locale) : '' },
      ),
    })
  }

  if (asset.maxSupply !== undefined) {
    const circulante = formatCompact(asset.circulatingSupply)
    entries.push({
      question: remplir('Combien d’unités de {nom} existeront au maximum ?', { nom: asset.name }),
      answer: remplir(
        circulante
          ? 'L’offre maximale est de {max} {symbole}, dont {circulante} {symbole} sont actuellement en circulation.'
          : 'L’offre maximale est de {max} {symbole}.',
        {
          max: formatCompact(asset.maxSupply) ?? '—',
          symbole: asset.symbol,
          circulante: circulante ?? '',
        },
      ),
    })
  }

  entries.push({
    question: remplir('Peut-on acheter {nom} sur ZENKUU ?', { nom: asset.name }),
    answer: t(
      'Non. ZENKUU est une plateforme d’information : nous n’exécutons aucun ordre, ne détenons aucun fonds et ne sommes ni courtier ni plateforme d’échange.',
    ),
  })

  return (
    <section aria-labelledby="faq-titre" className="space-y-3">
      <h2 id="faq-titre" className="display-sm text-ink">
        {fr.asset.tabs.faq}
      </h2>

      {/* Lignes dépliables, comme chez la référence : la FAQ tient désormais dans
          une colonne à côté d'« À propos », où cinq questions suivies de leur
          réponse feraient deux fois la hauteur du texte de gauche.

          `<details>` NATIF, pas un accordéon React : la réponse reste dans le HTML
          servi même repliée, donc lue par les moteurs sans hydratation — c'est toute
          la raison d'être de ce bloc (voir l'en-tête du fichier). La première est
          ouverte pour que le motif « ça se déplie » se voie sans cliquer. */}
      <div className="divide-y divide-border-subtle border-y border-border-subtle">
        {entries.map((entry, index) => (
          <details key={entry.question} className="group" open={index === 0}>
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-3.5 text-sm font-semibold text-ink [&::-webkit-details-marker]:hidden">
              {entry.question}
              <ChevronDown
                aria-hidden
                className="size-4 shrink-0 text-ink-muted transition-transform duration-200 group-open:rotate-180"
              />
            </summary>
            <p className="pb-4 text-sm leading-relaxed text-ink-muted">{entry.answer}</p>
          </details>
        ))}
      </div>
    </section>
  )
}

function formatDay(iso: string, locale: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(date)
}
