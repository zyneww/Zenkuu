import type { AssetProfile } from '@zenkuu/data'
import { formatCompact, formatShare } from '@zenkuu/ui'

/* Les DEUX primitives, et ce n'est pas un oubli : ce fichier rend un bloc de contenu
   principal (positions, secteurs — sur 900 pixels, où une carte a du sens) et un bloc
   de rail (les repères — sur 288, où elle coûte plus qu'elle n'apporte). Voir
   l'en-tête de `RailSection`. */
import { Panel } from '@/components/ui/Panel'
import { RailSection } from '@/components/ui/RailSection'
import { ShareDonut, type SharePart } from '@/components/asset/ShareDonut'
import { getPhrase } from '@/lib/content'

/**
 * COMPOSITION D'UN FONDS — positions, secteurs, nature des actifs.
 *
 * ── CE QUE CETTE SECTION COMBLE ───────────────────────────────────────────────
 *
 * La fiche d'un ETF n'avait qu'un cours et un graphique. C'est la moitié de ce qu'on
 * vient y chercher : un fonds n'est pas un actif, c'est un PANIER, et sa question
 * propre est « qu'est-ce qu'il y a dedans ». Un tracker mondial et un tracker sectoriel
 * ont la même courbe à l'œil et n'ont rien à voir.
 *
 * ── LES DIX PREMIÈRES POSITIONS, ET LE RESTE EST NOMMÉ ────────────────────────
 *
 * Yahoo publie les dix principales lignes, jamais l'inventaire complet — un fonds
 * mondial en compte mille cinq cents. Leur somme est donc affichée, ce qui dit
 * implicitement ce qui reste : dix-huit pour cent pour un tracker mondial, quatre-vingt
 * pour cent pour un fonds concentré. C'est la mesure de concentration la plus directe,
 * et elle ne coûte aucune donnée supplémentaire.
 *
 * ── L'ANNEAU DES SECTEURS RÉUTILISE CELUI DES PLACES DE COTATION ──────────────
 *
 * `ShareDonut` sert déjà à répartir le volume d'une crypto entre ses places. Une
 * répartition est une répartition : même figure, même légende, même seuil d'affichage.
 * En écrire une seconde donnerait deux anneaux qui divergeraient à la première
 * retouche.
 */
export async function AssetHoldings({ profile, assetName }: { profile: AssetProfile; assetName: string }) {
  const t = await getPhrase()
  const holdings = profile.holdings ?? []
  const sectors = profile.sectors ?? []
  const allocation = profile.allocation ?? []

  if (holdings.length === 0 && sectors.length === 0 && allocation.length === 0) return null

  const topWeight = holdings.reduce((sum, entry) => sum + entry.weight, 0)

  const sectorParts: SharePart[] = sectors.map((entry) => ({
    label: entry.sector,
    value: entry.weight,
  }))

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className="display-sm text-ink">Composition</h2>
        <p className="max-w-3xl text-xs leading-relaxed text-ink-muted">
          Ce que {assetName} détient réellement, tel que l’émetteur le déclare. Les
          pondérations datent du dernier inventaire publié et non du jour : un fonds
          rééquilibre par trimestre, pas en continu.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {holdings.length > 0 ? (
          <Panel
            title="Principales positions"
            subtitle={`${holdings.length} lignes publiées · ${formatShare(topWeight)} du fonds`}
          >
            <ol className="space-y-1.5">
              {holdings.map((entry, index) => (
                <li key={`${entry.symbol ?? entry.name}-${index}`} className="space-y-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0 truncate text-xs text-ink">
                      {entry.symbol ? (
                        <span className="tabular mr-1.5 font-semibold uppercase text-ink-muted">
                          {entry.symbol}
                        </span>
                      ) : null}
                      {entry.name}
                    </span>
                    <span className="tabular shrink-0 text-xs font-medium text-ink">
                      {formatShare(entry.weight)}
                    </span>
                  </div>
                  {/*
                    La barre est mise à l'échelle de la PLUS GROSSE position, pas de
                    cent pour cent. Une ligne à 5 % dans un fonds dont la première pèse
                    5,2 % produirait sinon dix barres invisibles et identiques, là où
                    tout l'intérêt est de comparer les dix entre elles.
                  */}
                  <div className="h-1 overflow-hidden rounded-full bg-surface" role="presentation">
                    <div
                      className="h-full rounded-full bg-brand"
                      style={{
                        width: `${Math.max((entry.weight / (holdings[0]?.weight ?? 1)) * 100, 2)}%`,
                      }}
                    />
                  </div>
                </li>
              ))}
            </ol>

            <p className="mt-3 border-t border-border-subtle pt-2 text-micro leading-relaxed text-ink-muted">
              La source ne publie que les dix premières lignes. Les{' '}
              {formatShare(Math.max(100 - topWeight, 0))} restants se répartissent entre des
              positions qu’elle ne détaille pas.
            </p>
          </Panel>
        ) : null}

        <div className="space-y-4">
          {/* `ShareDonut` se retire de lui-même en dessous de deux parts — voir son
              en-tête. Aucune condition à écrire ici. */}
          {sectorParts.length > 0 ? (
            <ShareDonut
              title="Exposition sectorielle"
              subtitle={t('Part de chaque secteur dans le portefeuille du fonds')}
              parts={sectorParts}
              restNoun="secteurs"
              valueHeader="Part"
            />
          ) : null}

          {allocation.length > 0 ? (
            <Panel title={t('Nature des actifs')}>
              <dl className="space-y-1.5">
                {allocation.map((entry) => (
                  <div key={entry.label} className="flex items-baseline justify-between gap-3">
                    <dt className="text-xs text-ink-muted">{entry.label}</dt>
                    <dd className="tabular text-xs font-medium text-ink">
                      {formatShare(entry.weight)}
                    </dd>
                  </div>
                ))}
              </dl>
            </Panel>
          ) : null}
        </div>
      </div>
    </section>
  )
}

/**
 * REPÈRES D'UN FONDS OU D'UNE ACTION — la carte du rail.
 *
 * Les mêmes chiffres que le registre de métriques, mais ceux que CoinGecko et Token
 * Terminal ne connaissent pas parce qu'ils ne couvrent pas la bourse : frais de
 * gestion, encours, rendement distribué d'un côté ; ratio cours/bénéfice, cours/actif
 * net, bénéfice par action et bêta de l'autre.
 *
 * Ils ne rejoignent PAS `lib/asset-metrics.ts`, et c'est un choix : ce registre lit
 * `AssetDetail`, qui est le contrat commun aux six classes d'actifs. Y ajouter des
 * champs qu'une seule classe renseigne le transformerait en union de tous les cas
 * particuliers — exactement ce que le type commun existe pour éviter.
 */
export function AssetProfileRail({ profile }: { profile: AssetProfile }) {
  const rows: { label: string; value: string; hint?: string }[] = []

  /* `formatShare` rend `null` sur une entrée non finie — le cas est déjà écarté par
     l'adaptateur, mais le typage l'ignore. Le repli garde la ligne plutôt que de la
     faire disparaître pour un cas qui ne se produit pas. */
  const share = (value: number): string => formatShare(value) ?? '—'

  if (profile.expenseRatio !== undefined) {
    rows.push({
      label: 'Frais de gestion',
      value: `${share(profile.expenseRatio)} / an`,
      hint: 'prélevés sur l’actif, déjà déduits du cours',
    })
  }
  if (profile.totalAssets !== undefined) {
    rows.push({ label: 'Encours', value: formatCompact(profile.totalAssets) ?? '—' })
  }
  if (profile.yieldPercent !== undefined) {
    rows.push({ label: 'Rendement distribué', value: share(profile.yieldPercent) })
  }
  if (profile.trailingPE !== undefined) {
    rows.push({ label: 'Cours / bénéfice', value: profile.trailingPE.toFixed(1).replace('.', ',') })
  }
  if (profile.forwardPE !== undefined) {
    rows.push({
      label: 'C / B prévisionnel',
      value: profile.forwardPE.toFixed(1).replace('.', ','),
      hint: 'sur les bénéfices attendus, donc estimé par le marché',
    })
  }
  if (profile.priceToBook !== undefined) {
    rows.push({ label: 'Cours / actif net', value: profile.priceToBook.toFixed(1).replace('.', ',') })
  }
  if (profile.eps !== undefined) {
    rows.push({ label: 'Bénéfice par action', value: profile.eps.toFixed(2).replace('.', ',') })
  }
  if (profile.beta !== undefined) {
    rows.push({
      label: 'Bêta',
      value: profile.beta.toFixed(2).replace('.', ','),
      hint: '1 = bouge comme son marché',
    })
  }

  if (rows.length === 0) return null

  return (
    /*
      « Valorisation » et non « Fondamentaux » pour une action : le registre de
      métriques ouvre déjà le rail par une carte de ce nom, et deux cartes homonymes
      à cent pixels l'une de l'autre laissent le lecteur chercher laquelle porte quoi.
      Le titre décrit d'ailleurs mieux ce qu'il coiffe — un ratio cours/bénéfice n'est
      pas un fondamental, c'est ce que le marché paie pour un fondamental.
    */
    <RailSection title={profile.expenseRatio !== undefined ? 'Le fonds' : 'Valorisation'}>
      <dl>
        {rows.map((row) => (
          <div
            key={row.label}
            className="border-b border-border-subtle py-1.5 last:border-0"
          >
            <div className="flex items-baseline justify-between gap-2">
              <dt className="min-w-0 flex-1 truncate text-xs text-ink-muted">{row.label}</dt>
              <dd className="tabular shrink-0 text-xs font-medium text-ink">{row.value}</dd>
            </div>
            {/* L'explication sous la ligne plutôt qu'en infobulle : ces notions-là ne
                sont pas connues du lecteur qui arrive d'un moteur de recherche, et une
                aide qu'il faut découvrir au survol n'aide que ceux qui savent déjà
                qu'elle existe. Trois mots suffisent. */}
            {row.hint ? (
              <p className="text-micro leading-snug text-ink-muted opacity-80">{row.hint}</p>
            ) : null}
          </div>
        ))}
      </dl>
    </RailSection>
  )
}
