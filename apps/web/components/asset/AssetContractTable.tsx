'use client'

import { Copy, ExternalLink } from 'lucide-react'
import { useState } from 'react'

import type { AssetDetail } from '@zenkuu/data'
import { Table, TableBody, TableHeader } from '@/components/ui/table'
import { usePhrase } from '@/components/locale/ContentProvider'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * LE MÊME JETON, SUR PLUSIEURS CHAÎNES — UNE TABLE, PAS UNE LISTE
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── POURQUOI CETTE TABLE EXISTE SOUS CELLE DES PLACES ───────────────────────
 *
 * La table du dessus répond à « où ce jeton s'échange-t-il ». Celle-ci répond à la
 * question qui vient juste après et qu'aucun tableau de places ne traite : « lequel
 * est-ce, au juste ? » Un jeton déployé sur six chaînes a six adresses de contrat, et
 * envoyer des fonds à la mauvaise les perd définitivement.
 *
 * La fiche technique du rail les portait déjà, dans une colonne de 288 pixels où les
 * adresses passaient à la ligne au milieu. Ici elles tiennent d'un trait, avec leur
 * bouton de copie et leur lien d'explorateur.
 *
 * ⚠️ CE N'EST PAS UNE TABLE DE MARCHÉ, et elle ne doit pas en prendre l'apparence :
 * pas de cours, pas de volume, pas de capitalisation PAR CHAÎNE. La source ne les
 * publie pas, et les répartir au prorata serait de l'invention (§5). Ce que cette
 * table sait, c'est sur quelles chaînes le jeton existe et à quelle adresse.
 *
 * ── LA COPIE PLUTÔT QUE LA SÉLECTION ────────────────────────────────────────
 *
 * Une adresse de contrat ne se lit pas, elle se colle. Le bouton de copie est donc la
 * commande principale de chaque ligne, et l'accusé de réception tient deux secondes —
 * assez pour être vu, trop court pour rester en travers du chemin.
 */

/** Explorateurs par chaîne, pour les réseaux que la source nomme le plus souvent. */
const EXPLORERS: Record<string, { label: string; url: (address: string) => string }> = {
  ethereum: { label: 'Etherscan', url: (a) => `https://etherscan.io/token/${a}` },
  'binance-smart-chain': { label: 'BscScan', url: (a) => `https://bscscan.com/token/${a}` },
  'polygon-pos': { label: 'PolygonScan', url: (a) => `https://polygonscan.com/token/${a}` },
  solana: { label: 'Solscan', url: (a) => `https://solscan.io/token/${a}` },
  'arbitrum-one': { label: 'Arbiscan', url: (a) => `https://arbiscan.io/token/${a}` },
  'optimistic-ethereum': {
    label: 'Optimistic Etherscan',
    url: (a) => `https://optimistic.etherscan.io/token/${a}`,
  },
  base: { label: 'BaseScan', url: (a) => `https://basescan.org/token/${a}` },
  avalanche: { label: 'Snowtrace', url: (a) => `https://snowtrace.io/token/${a}` },
}

/** Le nom de chaîne tel que la source l'écrit, rendu lisible. */
function chainLabel(chain: string): string {
  return chain
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export function AssetContractTable({ asset }: { asset: AssetDetail }) {
  const t = usePhrase()
  const [copied, setCopied] = useState<string | null>(null)

  const contracts = Object.entries(asset.contracts ?? {}).filter(
    ([chain, address]) => chain && address,
  )

  /* Un seul contrat n'est pas une table : c'est une ligne, et la fiche technique du
     rail la porte déjà. La table ne se justifie qu'à partir de DEUX chaînes, où la
     question « laquelle ? » se pose réellement. */
  if (contracts.length < 2) return null

  return (
    <section aria-labelledby="contrats-titre" className="space-y-3">
      <div className="space-y-1">
        <h2 id="contrats-titre" className="display-sm text-ink">
          {t('Contrats de')} {asset.name}
        </h2>
        <p className="text-sm leading-relaxed text-ink-muted">
          {t(
            'Le même jeton existe sur plusieurs chaînes, avec une adresse différente sur chacune. Vérifiez la chaîne avant toute opération : une adresse valide sur un réseau ne l’est sur aucun autre.',
          )}
        </p>
      </div>

      <div className="rounded-card">
        <Table className="border-collapse sm:min-w-[640px]">
          <caption className="sr-only">
            {t('Adresses de contrat de')} {asset.name}
          </caption>
          <TableHeader className="[&_tr]:border-b-0">
            <tr className="border-b border-border-subtle bg-surface-muted/35 text-left text-xs text-ink-muted">
              <th scope="col" className="w-10 px-3 py-2.5 text-right font-semibold">#</th>
              <th scope="col" className="px-3 py-2.5 font-semibold">{t('Chaîne')}</th>
              <th scope="col" className="px-3 py-2.5 font-semibold">{t('Adresse')}</th>
              <th scope="col" className="px-3 py-2.5 text-right font-semibold">
                {t('Explorateur')}
              </th>
            </tr>
          </TableHeader>

          <TableBody className="divide-y divide-border-subtle">
            {contracts.map(([chain, address], index) => {
              const explorer = EXPLORERS[chain]

              return (
                <tr
                  key={chain}
                  className="transition-colors duration-150 hover:bg-surface-muted/60"
                >
                  <td className="tabular px-3 py-2.5 text-right text-xs text-ink-muted/70">
                    {index + 1}
                  </td>

                  <th scope="row" className="px-3 py-2.5 text-left font-medium text-ink">
                    {chainLabel(chain)}
                  </th>

                  <td className="px-3 py-2.5">
                    <span className="flex items-center gap-2">
                      {/* `break-all` : une adresse n'a ni espace ni césure naturelle, et
                          sans cette règle elle déborde de sa cellule sur les largeurs
                          moyennes au lieu de se replier. */}
                      <code className="min-w-0 break-all font-mono text-xs text-ink-muted">
                        {address}
                      </code>
                      <button
                        type="button"
                        onClick={() => {
                          void navigator.clipboard?.writeText(address)
                          setCopied(chain)
                          window.setTimeout(() => setCopied(null), 2000)
                        }}
                        title={t('Copier l’adresse')}
                        aria-label={`${t('Copier l’adresse')} ${chainLabel(chain)}`}
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-control text-ink-muted transition-colors duration-150 hover:bg-surface-muted hover:text-ink"
                      >
                        <Copy className="h-3 w-3" aria-hidden="true" />
                      </button>
                      {/* `aria-live` : l'accusé apparaît sans que le focus bouge, donc
                          rien ne l'annoncerait à un lecteur d'écran sans cette région. */}
                      <span aria-live="polite" className="text-[0.625rem] text-brand">
                        {copied === chain ? t('Copiée') : ''}
                      </span>
                    </span>
                  </td>

                  <td className="px-3 py-2.5 text-right text-xs">
                    {explorer ? (
                      <a
                        href={explorer.url(address)}
                        target="_blank"
                        rel="nofollow noopener noreferrer"
                        className="inline-flex items-center gap-1 text-brand hover:underline"
                      >
                        {explorer.label}
                        <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
                        <span className="sr-only">{t('(nouvelle fenêtre)')}</span>
                      </a>
                    ) : (
                      /* Chaîne sans explorateur déclaré : un tiret, jamais un lien
                         fabriqué. Deviner l'URL d'un explorateur inconnu enverrait sur
                         une page d'erreur — ou pire, sur le mauvais réseau. */
                      <span className="text-ink-muted/60">—</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </section>
  )
}
