'use client'

import { ExternalLink } from 'lucide-react'
import { useEffect, useState } from 'react'

import type { TreasuryReport } from '@zenkuu/data'
import { formatCompact, formatCurrency, formatPercent } from '@zenkuu/ui'

import { usePanelVisible } from '@/components/asset/panel-visibility'
import { usePhrase } from '@/components/locale/ContentProvider'
import { Table, TableBody, TableHeader } from '@/components/ui/table'
import { TablePagination } from '@/components/ui/TablePagination'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * TRÉSORERIES — LES SOCIÉTÉS COTÉES QUI DÉTIENNENT L'ACTIF À LEUR BILAN
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── CE QUE CE REGISTRE EST, ET N'EST PAS ────────────────────────────────────
 *
 * Un relevé DÉCLARATIF : ce que des sociétés cotées ont annoncé détenir, à la date de
 * leur annonce. Ni une mesure on-chain, ni un état vérifié — une société qui a vendu
 * sans le publier y figure encore. La phrase sous le tableau le dit au lecteur, parce
 * qu'un tableau de chiffres alignés se lit comme un état de fait.
 *
 * ── TROIS COLONNES DE LA RÉFÉRENCE MANQUENT, ET C'EST VOLONTAIRE ────────────
 *
 * Elle affiche en plus « Type », « Activity in Last 30d » et « mNAV ». Aucune des trois
 * ne voyage dans l'endpoint public : la première est une classification maison, la
 * deuxième un delta calculé sur son propre historique, la troisième un rapport entre
 * capitalisation boursière et valeur des jetons — qui exigerait la capitalisation de
 * chaque société. Les afficher demanderait de les inventer (§5) ; le tableau porte donc
 * les six colonnes réellement publiées.
 *
 * ── IL SE CHARGE QUAND LA SECTION APPROCHE, JAMAIS AU RENDU ─────────────────
 *
 * Un appel externe de plus sur un quota mesuré à huit par minute. Le faire porter à la
 * fiche entière le ferait payer à tous les visiteurs, y compris à ceux qui ne
 * descendent jamais jusqu'ici. Voir `usePanelVisible`, et `/api/tresorerie`.
 *
 * ── L'ABSENCE DE REGISTRE RETIRE LA SECTION ─────────────────────────────────
 *
 * La source n'en publie pas pour tous les actifs. Rien ne s'affiche alors — ni encadré
 * d'absence, ni titre orphelin : c'est la règle du reste de la fiche.
 */
/** Tailles de page proposées — les mêmes que la table des places de cotation. */
const PAGE_SIZES = [10, 25, 50] as const

export function AssetTreasuries({
  assetId,
  assetName,
  symbol,
}: {
  /** Identifiant CoinGecko de l'actif DÉTENU. */
  assetId: string
  assetName: string
  /** Unité des quantités détenues — « HYPE », « BTC ». */
  symbol: string
}) {
  const t = usePhrase()
  const visible = usePanelVisible()
  const [report, setReport] = useState<TreasuryReport | null>(null)

  /*
   * ── LA TABLE SE PAGINE, COMME CELLE DES PLACES ──────────────────────────────
   *
   * Le registre compte jusqu'à une centaine d'entités — relevé sur Bitcoin, cent
   * quatre — et elles étaient TOUTES rendues d'un coup : une table qui occupe cinq
   * écrans au milieu d'une fiche, sans qu'aucun repère ne dise combien il en reste.
   *
   * `TablePagination` est le pied de table déjà employé par les places de cotation :
   * même compteur, mêmes numéros, même sélecteur de lignes. Réutilisé tel quel, il
   * rend les deux tables de la fiche identiques à l'usage, ce qui est la moitié de
   * l'intérêt d'une pagination.
   */
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZES[0])

  useEffect(() => {
    if (!visible) return

    let cancelled = false
    void fetch(`/api/tresorerie?id=${encodeURIComponent(assetId)}`)
      .then((response) => response.json())
      .then((payload) => {
        if (!cancelled && payload?.ok) setReport(payload.report as TreasuryReport)
      })
      /* Échec silencieux : la section disparaît, comme lorsqu'aucun registre n'existe.
         Un encadré d'erreur ferait d'une donnée facultative un incident. */
      .catch(() => undefined)

    return () => {
      cancelled = true
    }
  }, [visible, assetId])

  if (!report || report.holders.length === 0) return null

  const ticker = symbol.toUpperCase()

  /* La tranche visible. Bornée à la dernière page existante : changer le nombre de
     lignes depuis la page 7 laisserait sinon une table vide. */
  const pageCount = Math.max(1, Math.ceil(report.holders.length / pageSize))
  const current = Math.min(page, pageCount)
  const shown = report.holders.slice((current - 1) * pageSize, current * pageSize)

  return (
    <section aria-labelledby="tresorerie-titre" className="space-y-3">
      <div className="space-y-1">
        <h2 id="tresorerie-titre" className="display-sm text-ink">
          {t('Trésoreries {nom}').replace('{nom}', assetName)}
        </h2>
        <p className="text-sm leading-relaxed text-ink-muted">
          {report.totalHoldings > 0
            ? report.percentOfMarketCap !== undefined
              ? t(
                  'Les sociétés cotées qui déclarent détenir {nom} à leur bilan — {total} {ticker} au total, soit {part} de sa capitalisation.',
                )
                  .replace('{nom}', assetName)
                  .replace('{total}', formatCompact(report.totalHoldings) ?? '—')
                  .replace('{ticker}', ticker)
                  .replace('{part}', formatPercent(report.percentOfMarketCap)?.replace('+', '') ?? '—')
              : t(
                  'Les sociétés cotées qui déclarent détenir {nom} à leur bilan — {total} {ticker} au total.',
                )
                  .replace('{nom}', assetName)
                  .replace('{total}', formatCompact(report.totalHoldings) ?? '—')
                  .replace('{ticker}', ticker)
            : t('Les sociétés cotées qui déclarent détenir {nom} à leur bilan.').replace(
                '{nom}',
                assetName,
              )}
        </p>
      </div>

      <div className="rounded-card">
        {/* Colonnes prioritaires sous `sm` : l'entité et sa détention. Le coût et la
            valeur du jour, qui servent à juger la plus-value latente, reviennent dès la
            première largeur supplémentaire. Même règle que la table des places. */}
        <Table className="border-collapse sm:min-w-[720px]">
          <caption className="sr-only">
            {t('Sociétés cotées détenant {nom}').replace('{nom}', assetName)}
          </caption>
          <TableHeader className="[&_tr]:border-b-0">
            <tr className="border-b border-border-subtle bg-surface-muted/35 text-left text-xs text-ink-muted">
              <th scope="col" className="w-10 px-3 py-2.5 text-right font-semibold">#</th>
              <th scope="col" className="px-3 py-2.5 font-semibold">{t('Entité')}</th>
              <th scope="col" className="px-3 py-2.5 text-right font-semibold">
                Détention ({ticker})
              </th>
              <th scope="col" className="hidden px-3 py-2.5 text-right font-semibold sm:table-cell">
                {t('Coût total')}
              </th>
              <th scope="col" className="hidden px-3 py-2.5 text-right font-semibold sm:table-cell">
                {t('Valeur aujourd’hui')}
              </th>
              <th scope="col" className="hidden px-3 py-2.5 text-right font-semibold md:table-cell">
                {t('Part de l’offre')}
              </th>
            </tr>
          </TableHeader>

          <TableBody className="divide-y divide-border-subtle">
            {shown.map((holder, index) => (
              <tr
                key={`${holder.name}-${index}`}
                className="transition-colors duration-150 hover:bg-surface-muted/60"
              >
                {/* Le rang est celui du REGISTRE, pas celui de la page : à la page 2,
                    la première ligne est la onzième détentrice, et afficher « 1 »
                    laisserait croire à un second classement. */}
                <td className="tabular px-3 py-2.5 text-right text-xs text-ink-muted/70">
                  {(current - 1) * pageSize + index + 1}
                </td>

                <th scope="row" className="px-3 py-2.5 text-left font-medium text-ink">
                  <span className="inline-flex items-center gap-2">
                    {holder.country ? (
                      /* Le DRAPEAU est composé à partir du code pays, sans image :
                         deux lettres décalées dans le bloc des indicateurs régionaux
                         Unicode. Zéro requête, zéro dépendance — et c'est exactement ce
                         que la référence affiche. Un code qui n'est pas deux lettres ne
                         produit rien plutôt qu'un carré vide. */
                      <span aria-hidden="true" className="text-base leading-none">
                        {flagOf(holder.country)}
                      </span>
                    ) : null}
                    <span className="min-w-0">{holder.name}</span>
                    {holder.ticker ? (
                      <span className="shrink-0 rounded-control bg-surface-muted px-1.5 py-0.5 text-micro font-semibold uppercase tracking-wide text-ink-muted">
                        {holder.ticker}
                      </span>
                    ) : null}
                  </span>
                </th>

                <td className="tabular px-3 py-2.5 text-right text-ink">
                  {formatCompact(holder.holdings) ?? '—'}
                </td>

                {/* ⚠️ EN DOLLARS, ET PAS DANS LA DEVISE DU SITE. La source ne publie ces
                    deux montants qu'ainsi ; les convertir mêlerait le taux du jour à des
                    valeurs d'entrée historiques, ce qui produirait un coût d'acquisition
                    faux. L'en-tête de colonne ne prétend rien d'autre. */}
                <td className="tabular hidden px-3 py-2.5 text-right text-ink-muted sm:table-cell">
                  {formatCurrency(holder.entryValueUsd, 'USD', { compact: true }) ?? '—'}
                </td>

                <td className="tabular hidden px-3 py-2.5 text-right text-ink-muted sm:table-cell">
                  {formatCurrency(holder.currentValueUsd, 'USD', { compact: true }) ?? '—'}
                </td>

                <td className="tabular hidden px-3 py-2.5 text-right text-ink-muted md:table-cell">
                  {formatPercent(holder.percentOfSupply)?.replace('+', '') ?? '—'}
                </td>
              </tr>
            ))}
          </TableBody>
        </Table>
      </div>

      <TablePagination
        page={current}
        perPage={pageSize}
        total={report.holders.length}
        /* « ligne » et non « entité » : `TablePagination` ne compose ses phrases que
           pour les huit unités qu'il traduit dans les treize langues, et toute autre
           retombe silencieusement sur « résultat ». Voir `UNITS` là-bas. */
        unit="ligne"
        perPageChoices={PAGE_SIZES}
        onPageChange={setPage}
        onPerPageChange={(size) => {
          setPageSize(size)
          setPage(1)
        }}
      />

      <p className="text-xs leading-relaxed text-ink-muted">
        {t('Registre déclaratif : il recense ce que ces sociétés ont ANNONCÉ détenir, à la date de leur annonce. Ce n’est ni une mesure on-chain ni un état vérifié. Le coût total et la valeur du jour sont publiés en dollars ; leur écart est une plus ou moins-value latente, rien n’a été réalisé.')}
      </p>

      <p className="text-xs text-ink-muted">
        <a
          href="https://www.coingecko.com/en/public-companies"
          target="_blank"
          rel="nofollow noopener noreferrer"
          className="inline-flex items-center gap-1 hover:text-brand"
        >
          {t('Registre complet chez CoinGecko')}
          <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
          <span className="sr-only">{t('(nouvelle fenêtre)')}</span>
        </a>
      </p>
    </section>
  )
}

/**
 * Le drapeau d'un code pays ISO à deux lettres, en émoji.
 *
 * Chaque lettre est décalée dans le bloc des indicateurs régionaux Unicode ; la paire
 * forme un drapeau que la police du système rend. Rien d'autre à charger. Un code qui
 * n'est pas exactement deux lettres rend une chaîne vide plutôt qu'un carré blanc.
 */
function flagOf(country: string): string {
  const code = country.trim().toUpperCase()
  if (!/^[A-Z]{2}$/.test(code)) return ''
  return String.fromCodePoint(...[...code].map((letter) => 0x1f1e6 + letter.charCodeAt(0) - 65))
}
