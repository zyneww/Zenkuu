import { ExternalLink } from 'lucide-react'

import type { AssetDetail } from '@zenkuu/data'

import { CopyButton } from '@/components/asset/CopyButton'

/**
 * Fiche technique : contrats, chaînes, explorateurs, liens officiels.
 *
 * Tout provient de la réponse DÉJÀ récupérée pour le cours — `links` et `platforms`
 * étaient renvoyés par la source et jetés faute d'être typés. Zéro appel réseau.
 *
 * Chaque bloc disparaît indépendamment : une chaîne native comme Bitcoin n'a pas
 * d'adresse de contrat, un actif sans dépôt public n'a pas de code source. Un
 * gabarit fixe afficherait des rangées vides là où l'absence est la donnée (§5).
 *
 * Les liens sortent en `nofollow noopener` : ce sont des ressources tierces que
 * ZENKUU cite sans les cautionner, et `noopener` empêche la page ouverte d'accéder
 * à `window.opener`.
 */

/** Noms lisibles des chaînes. La source renvoie ses identifiants techniques. */
const CHAIN_LABELS: Record<string, string> = {
  ethereum: 'Ethereum',
  'binance-smart-chain': 'BNB Chain',
  'polygon-pos': 'Polygon',
  avalanche: 'Avalanche',
  'arbitrum-one': 'Arbitrum',
  'optimistic-ethereum': 'Optimism',
  base: 'Base',
  solana: 'Solana',
  fantom: 'Fantom',
  xdai: 'Gnosis Chain',
  harmony_shard_0: 'Harmony',
  'huobi-token': 'HECO',
  sora: 'SORA',
  near_protocol: 'NEAR',
  tron: 'TRON',
}

function chainLabel(id: string): string {
  return CHAIN_LABELS[id] ?? id.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

/** Nom d'hôte d'une URL, pour libeller un lien sans afficher l'URL entière. */
function hostLabel(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

export function AssetTechSheet({ asset }: { asset: AssetDetail }) {
  const contracts = Object.entries(asset.contracts ?? {})
  const explorers = asset.explorerUrls ?? []
  const community = Object.entries(asset.communityUrls ?? {})

  const hasOfficial = asset.homepageUrl || asset.whitepaperUrl || asset.sourceCodeUrl
  if (contracts.length === 0 && explorers.length === 0 && community.length === 0 && !hasOfficial) {
    return null
  }

  return (
    <section aria-labelledby="fiche-technique" className="space-y-5">
      <h2 id="fiche-technique" className="display-sm text-ink">
        Fiche technique
      </h2>

      {contracts.length > 0 ? (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-ink">
            Contrats {contracts.length > 1 ? `· ${contracts.length} chaînes` : null}
          </h3>
          <ul className="divide-y divide-border-subtle rounded-card border border-border-subtle bg-panel">
            {contracts.map(([chain, address]) => (
              <li key={chain} className="flex items-center gap-3 px-3 py-2.5">
                <span className="w-28 shrink-0 text-xs font-medium text-ink">
                  {chainLabel(chain)}
                </span>
                {/* `break-all` plutôt que `truncate` : une adresse tronquée sans
                    moyen de la lire en entier ne sert à rien, et le bouton de copie
                    reste la voie normale pour la récupérer. */}
                <code className="min-w-0 flex-1 break-all font-mono text-[0.6875rem] text-ink-muted">
                  {address}
                </code>
                <CopyButton value={address} label={`Copier l’adresse ${chainLabel(chain)}`} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2">
        {hasOfficial ? (
          <LinkGroup
            title="Ressources officielles"
            links={[
              ...(asset.homepageUrl ? [{ label: 'Site officiel', url: asset.homepageUrl }] : []),
              ...(asset.whitepaperUrl ? [{ label: 'Livre blanc', url: asset.whitepaperUrl }] : []),
              ...(asset.sourceCodeUrl ? [{ label: 'Code source', url: asset.sourceCodeUrl }] : []),
            ]}
          />
        ) : null}

        {explorers.length > 0 ? (
          <LinkGroup
            title="Explorateurs de blocs"
            links={explorers.map((url) => ({ label: hostLabel(url), url }))}
          />
        ) : null}

        {community.length > 0 ? (
          <LinkGroup
            title="Communauté"
            links={community.map(([label, url]) => ({ label, url }))}
          />
        ) : null}
      </div>
    </section>
  )
}

function LinkGroup({ title, links }: { title: string; links: { label: string; url: string }[] }) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      <ul className="flex flex-wrap gap-2">
        {links.map((link) => (
          <li key={link.url}>
            <a
              href={link.url}
              target="_blank"
              rel="nofollow noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-card border border-border-subtle bg-surface px-3 py-1.5 text-xs text-ink transition-colors hover:border-brand hover:text-brand-strong"
            >
              {link.label}
              <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
              <span className="sr-only">(nouvelle fenêtre)</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
