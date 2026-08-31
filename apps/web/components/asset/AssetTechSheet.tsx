import { ExternalLink } from 'lucide-react'

import type { AssetDetail } from '@zenkuu/data'

import { CopyButton } from '@/components/asset/CopyButton'
import { getPhrase } from '@/lib/content'

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

export async function AssetTechSheet({ asset }: { asset: AssetDetail }) {
  const t = await getPhrase()
  const contracts = Object.entries(asset.contracts ?? {})
  const explorers = asset.explorerUrls ?? []
  const community = Object.entries(asset.communityUrls ?? {})

  const hasOfficial = asset.homepageUrl || asset.whitepaperUrl || asset.sourceCodeUrl
  if (contracts.length === 0 && explorers.length === 0 && community.length === 0 && !hasOfficial) {
    return null
  }

  return (
    /* Le titre s'aligne sur les autres groupes du rail — voir `RailSection`. Il portait
       `display-sm`, hérité du temps où ce bloc vivait en pleine largeur au pied de la
       page : dans une colonne de 288 pixels, un titre de 20 pixels au-dessus de
       pastilles de 12 écrase ce qu'il annonce. */
    <section aria-labelledby="fiche-technique" className="space-y-4">
      <h2
        id="fiche-technique"
        className="border-b border-border-subtle pb-1 text-micro font-semibold uppercase tracking-wide text-ink-muted"
      >
        {t('Fiche technique')}
      </h2>

      {contracts.length > 0 ? (
        <div className="space-y-2">
          <h3 className="text-xs font-medium text-ink">
            Contrats {contracts.length > 1 ? `· ${contracts.length} chaînes` : null}
          </h3>
          {/* Plus de carte ni de fond : la liste se pose au ras de la colonne, comme le
             reste du rail. Les filets de séparation suffisent à la tenir. */}
          <ul className="divide-y divide-border-subtle">
            {contracts.map(([chain, address]) => (
              <li key={chain} className="flex items-center gap-2 py-1.5">
                <span className="w-20 shrink-0 text-xs font-medium text-ink">
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

      {/*
        ── UNE LIGNE PAR CATÉGORIE, VALEUR À DROITE — la forme « Info » de CoinGecko.

        Les liens étaient rangés en TROIS GROUPES TITRÉS, chacun dépliant une grappe de
        pastilles bordées : « Ressources officielles » avec trois pastilles, puis
        « Explorateurs de blocs » avec six, puis « Communauté » avec deux. Dans une
        colonne de 288 pixels, cela faisait une trentaine de lignes et quatre niveaux de
        titre pour une poignée de liens.

        La référence traite exactement la même matière en LIGNES DE TABLEAU :
        un libellé à gauche, la ou les pastilles à droite, un filet entre chaque. C'est
        la forme d'une fiche signalétique, et elle a trois propriétés que la grappe
        n'avait pas :

          · les libellés s'alignent, donc se balaient d'un regard ;
          · une catégorie absente retire UNE ligne, pas un titre et son bloc ;
          · la hauteur devient proportionnelle au nombre de catégories, pas au nombre
            de liens — six explorateurs tiennent sur la même ligne que le site officiel.

        `dl` et non `ul` : ce sont des couples nom/valeur, et c'est l'élément que la
        norme prévoit pour cela. Un lecteur d'écran annonce alors « Explorateurs,
        etherscan.io » plutôt que deux listes sans rapport.
      */}
      <dl className="divide-y divide-border-subtle">
        {asset.homepageUrl ? (
          <SheetRow label={t('Site')} links={[{ label: hostLabel(asset.homepageUrl), url: asset.homepageUrl }]} />
        ) : null}

        {asset.whitepaperUrl ? (
          <SheetRow label={t('Livre blanc')} links={[{ label: t('Lire'), url: asset.whitepaperUrl }]} />
        ) : null}

        {asset.sourceCodeUrl ? (
          <SheetRow label={t('Code source')} links={[{ label: hostLabel(asset.sourceCodeUrl), url: asset.sourceCodeUrl }]} />
        ) : null}

        {explorers.length > 0 ? (
          <SheetRow
            label="Explorateurs"
            links={explorers.map((url) => ({ label: hostLabel(url), url }))}
          />
        ) : null}

        {community.length > 0 ? (
          <SheetRow
            label={t('Communauté')}
            links={community.map(([label, url]) => ({ label, url }))}
          />
        ) : null}
      </dl>
    </section>
  )
}

/**
 * Une ligne de la fiche : un libellé, et ses liens alignés à droite.
 *
 * ── LES LIENS SONT PLAFONNÉS, ET LE RESTE SE DÉPLIE ─────────────────────────
 *
 * Certains actifs déclarent huit explorateurs de blocs. Les poser tous sur une ligne
 * de 180 pixels utiles produirait quatre rangées d'enroulement, c'est-à-dire
 * exactement la grappe qu'on vient de remplacer.
 *
 * Les deux premiers sont donc visibles, et les autres derrière un « +6 » — la même
 * mécanique que le « 14 more » de la référence. C'est un `<details>` natif : il
 * s'ouvre sans JavaScript, reste imprimable, et se referme d'un second clic.
 */
function SheetRow({
  label,
  links,
}: {
  label: string
  links: { label: string; url: string }[]
}) {
  const visible = links.slice(0, 2)
  const hidden = links.slice(2)

  return (
    <div className="flex items-start justify-between gap-3 py-2">
      <dt className="shrink-0 pt-1 text-xs text-ink-muted">{label}</dt>

      <dd className="flex min-w-0 flex-wrap items-center justify-end gap-1">
        {visible.map((link) => (
          <SheetLink key={link.url} {...link} />
        ))}

        {hidden.length > 0 ? (
          <details className="group/details relative">
            <summary className="flex cursor-pointer list-none items-center rounded-control border border-border-subtle bg-surface px-2 py-1 text-[0.6875rem] text-ink-muted transition-colors hover:border-brand hover:text-ink">
              +{hidden.length}
            </summary>
            {/* Le dépliant se pose EN SURIMPRESSION plutôt qu'en flux : dans une colonne
                de rail, pousser les blocs suivants de six lignes à chaque ouverture
                ferait sauter tout ce qui est en dessous. */}
            <div className="absolute right-0 z-20 mt-1 flex w-max max-w-[16rem] flex-wrap justify-end gap-1 rounded-card border border-border-subtle bg-surface p-2 shadow-lg">
              {hidden.map((link) => (
                <SheetLink key={link.url} {...link} />
              ))}
            </div>
          </details>
        ) : null}
      </dd>
    </div>
  )
}

async function SheetLink({ label, url }: { label: string; url: string }) {
  const t = await getPhrase()
  return (
    <a
      href={url}
      target="_blank"
      rel="nofollow noopener noreferrer"
      title={label}
      className="inline-flex max-w-[9rem] items-center gap-1 rounded-control border border-border-subtle bg-surface px-2 py-1 text-[0.6875rem] text-ink transition-colors hover:border-brand hover:text-brand"
    >
      <span className="truncate">{label}</span>
      <ExternalLink className="h-2.5 w-2.5 shrink-0" aria-hidden="true" />
      <span className="sr-only">{t('(nouvelle fenêtre)')}</span>
    </a>
  )
}
