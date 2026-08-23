import {
  getCryptoGlobalStats,
  getRanking,
  type AssetClass,
  type MarketAsset,
} from '@zenkuu/data'
import { EmptyState, formatCompact } from '@zenkuu/ui'

import { AssetRow } from '@/components/home/AssetRow'
import { Link } from '@/i18n/navigation'
import { marketHref } from '@/lib/asset-routes'
import { getContent, getPhrase } from '@/lib/content'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * LE PANORAMA — OÙ EN SONT LES MARCHÉS, TOUS ENSEMBLE
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── CE QU'IL REMPLACE, ET POURQUOI L'ÉCHANGE EST BON ───────────────────────
 *
 * Le bas de l'accueil portait un CONVERTISSEUR puis une CARTE THERMIQUE. Les deux
 * sont conservés au dépôt et gardent leur page — `/convertisseur` et `/heatmap` — et
 * c'est précisément l'argument de leur retrait d'ici : ce sont des OUTILS, c'est-à-dire
 * des surfaces qu'on ouvre avec une question en tête. Personne n'arrive sur une page
 * d'accueil pour convertir cinq RAIN en euros ; on y va, depuis le menu, quand on a
 * un montant à convertir. Occuper le bas de la page la plus visitée du site avec deux
 * outils, c'est payer en hauteur de page ce qu'un lien de menu donne gratuitement.
 *
 * Ce qui manquait, à l'inverse, est ce que fait la référence : un RELEVÉ. Le haut de
 * la page ne parle que de crypto — c'est assumé, c'est la classe qui ouvre le site —
 * et la page se refermait donc sans jamais dire où en sont les indices, le dollar, le
 * pétrole ou les taux. Or le multi-actifs est le seul argument que CoinGecko ne peut
 * pas reprendre.
 *
 * ── QUATRE CARTES, ET LE DÉCOUPAGE SUIT LES QUESTIONS ──────────────────────
 *
 *   INDICES        où en sont les grandes places
 *   CRYPTO         quelle taille a le marché, et qui le domine
 *   DEVISES        combien vaut l'euro face aux monnaies qui comptent
 *   MATIÈRES       l'énergie et les métaux, c'est-à-dire les coûts d'entrée
 *
 * Les taux ne forment pas une cinquième carte : le rendement américain à dix ans et
 * l'indice dollar sont DANS l'univers des indices (`^TNX`, `DX-Y.NYB`), et les en
 * extraire pour leur faire une carte à eux séparerait deux chiffres de la trentaine
 * qui les entoure sans que rien ne le justifie.
 *
 * ── UNE CARTE QUI ÉCHOUE DISPARAÎT, LES AUTRES RESTENT ─────────────────────
 *
 * Trois fournisseurs distincts alimentent ces quatre cartes — Yahoo pour les indices
 * et les matières premières, la BCE pour les devises, CoinGecko pour la crypto. Une
 * panne de l'un ne doit pas emporter les autres : chaque carte se rabat sur la phrase
 * de SON fournisseur, à l'intérieur de son propre cadre.
 *
 * ── AUCUN APPEL DE PLUS QUE NÉCESSAIRE ─────────────────────────────────────
 *
 * `getCryptoGlobalStats('eur')` est la MÊME entrée de cache que celle de l'en-tête de
 * la page : la lire ici ne coûte rien. Les trois classements partagent leurs clés avec
 * les onglets correspondants de `/marches`.
 */

/** Lignes par carte. Cinq : la hauteur des deux cartes voisines. */
const ROWS = 5

/**
 * Les classes tenues par une carte de cotations, DANS L'ORDRE DE LECTURE.
 *
 * Pas les sept. Les actions et les ETF comptent des dizaines de lignes dont aucune
 * n'est « la » ligne à montrer — un top 5 y serait le haut de l'univers que nous
 * suivons, pas un repère de marché. Les NFT n'ont aucune source déclarée (§5).
 *
 * Ces trois-là ont au contraire un petit nombre de valeurs canoniques : quelques
 * indices de référence, quelques paires majeures, quelques matières premières. Un
 * top 5 y est effectivement le haut du tableau.
 */
const CLASSES: readonly AssetClass[] = ['index', 'forex', 'commodity']

export async function MarketPanorama() {
  const fr = await getContent()
  const t = await getPhrase()

  const [globals, ...rankings] = await Promise.all([
    getCryptoGlobalStats('eur'),
    ...CLASSES.map((assetClass) =>
      getRanking({ assetClass, page: 1, perPage: ROWS, currency: 'eur' }),
    ),
  ])

  return (
    /* Même filet de section que les blocs qu'il remplace : une ligne horizontale
       pleine largeur au-dessus, qui marque le passage du tableau au relevé. */
    <section
      className="flex flex-col gap-3 border-t border-border-subtle pt-8"
      aria-label={t('Panorama des marchés')}
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-normal text-ink-muted">{t('Panorama des marchés')}</h2>
        <Link
          href="/marches"
          className="shrink-0 text-sm text-brand transition-colors hover:text-brand-strong"
        >
          {fr.home.seeAll} <span aria-hidden="true">→</span>
        </Link>
      </div>

      {/* Deux colonnes à partir de `sm`, quatre à partir de `xl`. Pas trois : une
          rangée de trois laisserait la quatrième carte seule sur sa ligne, à quatre
          fois la largeur de ses voisines. */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {/* La CRYPTO ouvre la rangée : c'est la classe dont tout le reste de la page
            parle, et la carte répond à la question que le tableau au-dessus ne traite
            pas — quelle TAILLE a ce marché, et qui le domine. */}
        <CryptoCard globals={globals} />

        {CLASSES.map((assetClass, index) => {
          const result = rankings[index]
          const assets: MarketAsset[] = result?.ok ? result.data.slice(0, ROWS) : []

          return (
            <PanelCard
              key={assetClass}
              title={fr.assetClass[assetClass]}
              href={marketHref(assetClass)}
              seeAll={fr.home.seeAll}
            >
              {assets.length > 0 ? (
                <ul className="flex-1 divide-y divide-border-subtle">
                  {assets.map((asset) => (
                    <li key={asset.id}>
                      {/* Sans `rank` : ces colonnes ne sont pas des palmarès mais des
                          relevés — « voici où en sont les indices », pas « voici les
                          cinq premiers ». Une numérotation ferait croire à un
                          classement par performance. */}
                      <AssetRow asset={asset} />
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState
                  title={fr.states.unavailableTitle}
                  description={result && !result.ok ? result.reason : null}
                  compact
                />
              )}
            </PanelCard>
          )
        })}
      </div>
    </section>
  )
}

/** Le cadre commun aux quatre cartes — titre, lien, contenu qui remplit la hauteur. */
function PanelCard({
  title,
  href,
  seeAll,
  children,
}: {
  title: string
  href: string
  seeAll: string
  children: React.ReactNode
}) {
  return (
    <section className="flex h-full flex-col rounded-card border border-border-subtle bg-surface p-4">
      <div className="mb-2 flex items-start justify-between gap-3">
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
        <Link
          href={href}
          prefetch={false}
          className="shrink-0 text-xs font-medium text-brand-strong hover:underline"
        >
          {seeAll}
        </Link>
      </div>
      {children}
    </section>
  )
}

/**
 * La carte crypto — capitalisation, volume, et la barre de dominance.
 *
 * ── LA BARRE DIT CE QUE QUATRE NOMBRES NE DISENT PAS ───────────────────────
 *
 * « BTC 59,7 % · ETH 11,3 % · autres 29 % » demande de reconstituer mentalement des
 * proportions à partir de trois pourcentages. La barre segmentée les MONTRE, et c'est
 * exactement ce que fait la référence : on y lit d'un coup d'œil que le bitcoin pèse
 * plus que tout le reste réuni, ce qui est la seule chose à retenir.
 *
 * ── « AUTRES » EST CALCULÉ, ET IL PEUT ÊTRE FAUX SI ON N'Y PREND PAS GARDE ──
 *
 * La source publie une part par symbole, pas un reste. Le calculer par soustraction
 * est juste, à une condition : borner à zéro. Les parts sont arrondies à la décimale
 * chez le fournisseur, et deux arrondis vers le haut suffisent à faire dépasser 100 —
 * auquel cas un reste négatif produirait un segment de largeur négative, que le
 * navigateur ignore en silence. La barre paraîtrait alors simplement incomplète.
 */
async function CryptoCard({
  globals,
}: {
  globals: Awaited<ReturnType<typeof getCryptoGlobalStats>>
}) {
  /* Le dictionnaire est relu ici plutôt que traversé en six props. `getContent` et
     `getPhrase` sont mémorisés par requête : ce second appel ne coûte rien, et il
     garde les libellés à côté du balisage qui les emploie. */
  const fr = await getContent()
  const t = await getPhrase()

  const title = fr.assetClass.crypto
  const seeAll = fr.home.seeAll
  const stats = globals.ok ? globals.data : null

  if (!stats) {
    return (
      <PanelCard title={title} href="/marches" seeAll={seeAll}>
        <EmptyState
          title={fr.states.unavailableTitle}
          description={globals.ok ? null : globals.reason}
          compact
        />
      </PanelCard>
    )
  }

  const btc = stats.dominance['btc'] ?? 0
  const eth = stats.dominance['eth'] ?? 0
  const others = Math.max(0, 100 - btc - eth)

  return (
    <PanelCard title={title} href="/marches" seeAll={seeAll}>
      <div className="flex flex-1 flex-col gap-4">
        <dl className="grid grid-cols-2 gap-x-3 gap-y-3">
          <Figure label={t('Capitalisation')} value={`${formatCompact(stats.totalMarketCap)} €`} />
          <Figure label={t('Volume 24 h')} value={`${formatCompact(stats.totalVolume24h)} €`} />
        </dl>

        <div className="space-y-2">
          <p className="text-micro font-semibold uppercase tracking-wide text-ink-muted/70">
            {t('Dominance')}
          </p>

          {/* `flex` et des largeurs en pourcentage plutôt qu'un dégradé : chaque
              segment reste un élément à part, donc mesurable, inspectable et
              annonçable — un dégradé ne serait qu'une image. */}
          <div className="flex h-2 w-full overflow-hidden rounded-pill bg-surface-muted">
            <span className="bg-data-1" style={{ width: `${btc}%` }} />
            <span className="bg-data-2" style={{ width: `${eth}%` }} />
            <span className="bg-data-3" style={{ width: `${others}%` }} />
          </div>

          <ul className="flex flex-wrap gap-x-3 gap-y-1 text-[0.6875rem] text-ink-muted">
            <Share color="bg-data-1" label="BTC" value={btc} />
            <Share color="bg-data-2" label="ETH" value={eth} />
            <Share color="bg-data-3" label={t('Autres')} value={others} />
          </ul>
        </div>
      </div>
    </PanelCard>
  )
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-micro font-semibold uppercase tracking-wide text-ink-muted/70">
        {label}
      </dt>
      <dd className="tabular text-sm font-semibold text-ink">{value}</dd>
    </div>
  )
}

function Share({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <li className="flex items-center gap-1.5">
      <span className={`h-2 w-2 shrink-0 rounded-full ${color}`} aria-hidden="true" />
      {label} <span className="tabular text-ink">{value.toFixed(1)} %</span>
    </li>
  )
}
