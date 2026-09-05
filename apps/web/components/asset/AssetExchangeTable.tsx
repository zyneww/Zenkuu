'use client'

import { ExternalLink } from 'lucide-react'
import { useMemo, useState } from 'react'

import type { AssetTicker } from '@zenkuu/data'

import { ExchangeLogo } from '@/components/asset/ExchangeLogo'
import { usePhrase } from '@/components/locale/ContentProvider'
import { Money } from '@/components/locale/Money'
import { useFormatters } from '@/components/locale/useFormatters'
import { useRelativeTime } from '@/components/locale/useRelativeTime'
import { TablePagination } from '@/components/ui/TablePagination'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * OÙ SE NÉGOCIE CET ACTIF — LE BLOC « EXCHANGES » DE dropstab.com
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── CES DONNÉES ÉTAIENT DÉJÀ CHARGÉES, ET N'ÉTAIENT PLUS AFFICHÉES ──────────
 *
 * ⚠️ LE POINT VAUT D'ÊTRE ÉCRIT : `getAssetTickers` est appelé à CHAQUE rendu de
 * fiche, pour cent paires. Le composant qui les rendait — `AssetTickers` — a été
 * retiré avec l'ancien jeu d'onglets, et les cent lignes ne servaient plus qu'à
 * DEVINER LE SYMBOLE TradingView (voir `tradingview-symbol.ts`, `fromTickers`). Un
 * appel réseau complet dépensé sur un quota mesuré à huit requêtes par minute, pour en
 * extraire une chaîne de caractères.
 *
 * Ce bloc ne coûte donc rien : il rend ce qui était déjà payé.
 *
 * ── PAS DE FILTRE COMPTANT / DEX / DÉRIVÉS, ET C'EST UNE ABSENCE DE DONNÉE ──
 *
 * La référence pose quatre onglets au-dessus de sa table. `AssetTicker` ne porte
 * AUCUN champ de nature de marché : la réponse `/coins/{id}/tickers` ne distingue pas
 * un carnet centralisé d'un pool automatisé. Les quatre onglets seraient donc quatre
 * boutons dont trois ne filtreraient rien — exactement le « bouton sans action » que
 * le cahier des charges interdit.
 *
 * ── LE TRI PAR DÉFAUT EST LE VOLUME, ET LA PART EST CALCULÉE SUR CE QU'ON VOIT ─
 *
 * La source renvoie ses paires dans un ordre qui lui est propre. Le volume est le seul
 * critère qui réponde à « où ça se passe vraiment », et c'est celui de la référence.
 *
 * La part de volume vient du champ publié quand la source le donne. Sinon elle n'est
 * PAS reconstituée : le dénominateur serait le total des cent paires reçues, alors que
 * l'actif s'échange sur davantage — une part calculée là-dessus sommerait à 100 % en
 * décrivant un sous-ensemble, ce qui est plus faux que de ne rien dire.
 */

/* 10 comme la référence : ce bloc n'est pas la page des places, c'est un aperçu au
   milieu d'une fiche. Le sélecteur du pied ouvre les cent lignes à qui les veut. */
const PAR_PAGE_INITIAL = 10

export function AssetExchangeTable({
  tickers,
  logos,
}: {
  tickers: readonly AssetTicker[]
  /** Identifiant de place → URL de logo, assemblée une fois par la page. */
  logos: Record<string, string>
}) {
  const t = usePhrase()
  const nombres = useFormatters()

  const [page, setPage] = useState(1)
  const [parPage, setParPage] = useState<number>(PAR_PAGE_INITIAL)

  const triees = useMemo(
    () => [...tickers].sort((a, b) => (b.volume24h ?? 0) - (a.volume24h ?? 0)),
    [tickers],
  )

  if (triees.length === 0) return null

  const debut = (page - 1) * parPage
  const visibles = triees.slice(debut, debut + parPage)

  return (
    <section aria-labelledby="places-titre" className="space-y-3">
      <h2 id="places-titre" className="display-sm text-ink">
        {t('Places de cotation')}
      </h2>

      <div className="overflow-x-auto rounded-card border border-border-subtle bg-surface">
        <table className="w-full min-w-[42rem] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border-subtle">
              <th scope="col" className="px-4 py-2.5 text-left font-medium text-ink-muted">
                {t('Place')}
              </th>
              <th scope="col" className="px-4 py-2.5 text-left font-medium text-ink-muted">
                {t('Paire')}
              </th>
              <th scope="col" className="px-4 py-2.5 text-right font-medium text-ink-muted">
                {t('Cours')}
              </th>
              <th scope="col" className="px-4 py-2.5 text-right font-medium text-ink-muted">
                {t('Volume 24 h')}
              </th>
              <th scope="col" className="px-4 py-2.5 text-right font-medium text-ink-muted">
                {t('Part')}
              </th>
              <th scope="col" className="px-4 py-2.5 text-right font-medium text-ink-muted">
                {t('Mis à jour')}
              </th>
            </tr>
          </thead>

          <tbody>
            {visibles.map((ticker, index) => (
              <tr
                /* La clé assemble place + paire : une même place cote souvent le même
                   actif contre plusieurs contreparties, et l'identifiant seul les
                   confondrait. Le rang ferme la clé — deux paires identiques sur deux
                   marchés d'une même place existent aussi. */
                key={`${ticker.exchangeId ?? ticker.exchange}-${ticker.base}-${ticker.target}-${debut + index}`}
                className="border-b border-border-subtle last:border-b-0"
              >
                <td className="px-4 py-2.5">
                  <span className="flex items-center gap-2">
                    <ExchangeLogo
                      name={ticker.exchange}
                      {...(ticker.exchangeId && logos[ticker.exchangeId]
                        ? { src: logos[ticker.exchangeId] }
                        : {})}
                      size={20}
                    />
                    <span className="truncate text-ink">{ticker.exchange}</span>
                  </span>
                </td>

                <td className="px-4 py-2.5">
                  {/* Le lien direct vers la paire n'existe pas partout : sans lui, la
                      cellule reste du texte plutôt qu'un lien mort. */}
                  {ticker.tradeUrl ? (
                    <a
                      href={ticker.tradeUrl}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="inline-flex items-center gap-1 font-medium text-ink hover:underline"
                    >
                      {ticker.base}/{ticker.target}
                      <ExternalLink className="size-3 shrink-0" aria-hidden="true" />
                    </a>
                  ) : (
                    <span className="font-medium text-ink">
                      {ticker.base}/{ticker.target}
                    </span>
                  )}
                </td>

                {/* `Money` plutôt que le formateur brut : la devise d'affichage est un
                    réglage du visiteur, et les cotations arrivent dans celle des
                    sources. Voir la note de `AssetVsPeers`. */}
                <td className="tabular whitespace-nowrap px-4 py-2.5 text-right text-ink">
                  <Money value={ticker.price} from={ticker.currency} />
                </td>

                <td className="tabular whitespace-nowrap px-4 py-2.5 text-right text-ink">
                  <Money value={ticker.volume24h} from={ticker.currency} compact />
                </td>

                <td className="tabular px-4 py-2.5 text-right text-ink-muted">
                  {ticker.volumePercent !== undefined
                    ? `${nombres.fixed(ticker.volumePercent, 2) ?? '—'} %`
                    : '—'}
                </td>

                <td className="px-4 py-2.5 text-right text-ink-muted">
                  {ticker.lastTraded ? <DerniereCotation iso={ticker.lastTraded} /> : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <TablePagination
        page={page}
        perPage={parPage}
        total={triees.length}
        /* ⚠️ LA CLÉ FRANÇAISE, NON TRADUITE. `TablePagination` compare `unit` à une
           liste blanche de mots FRANÇAIS avant de composer sa phrase ; lui passer
           `t('paire')` fonctionne en français — où la clé EST la traduction — et
           retombe silencieusement sur « résultat » dans les douze autres langues.
           C'est le composant qui traduit, pas l'appelant. */
        unit="paire"
        onPageChange={setPage}
        onPerPageChange={(valeur) => {
          setParPage(valeur)
          /* Retour à la première page : rester à la page 7 après être passé de 10 à
             100 lignes désigne une page qui n'existe plus. */
          setPage(1)
        }}
      />
    </section>
  )
}

/** Isolé : `useRelativeTime` est un crochet, il ne peut pas vivre dans une boucle. */
function DerniereCotation({ iso }: { iso: string }) {
  return <>{useRelativeTime(iso)}</>
}
