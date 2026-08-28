import type { Metadata } from 'next'
import { Link } from '@/i18n/navigation'

import {
  CACHE_TTL_SECONDS,
  getForexRates,
  getMoversUniverse,
  getRanking,
  type AssetClass,
  type DataResult,
  type MarketAsset,
} from '@zenkuu/data'
import { EmptyState, SourceNote } from '@zenkuu/ui'

import { AssetClassTabs } from '@/components/market/AssetClassTabs'
import { RankingBoard } from '@/components/market/RankingBoard'
import { RANKING_SIZE } from '@/components/home/ClassMoversGrid'
import { assetClassFromSegment, ASSET_CLASS_SEGMENT } from '@/lib/asset-routes'
import { getContent, getPhrase, getSeo } from '@/lib/content'

export const revalidate = 180
const _ttlGuard: typeof revalidate = CACHE_TTL_SECONDS
void _ttlGuard

/**
 * Univers crypto retenu.
 *
 * 250 est le PLAFOND de la source (CoinGecko refuse au-delà), et le texte de bas de
 * page en fait un argument plutôt qu'une contrainte subie : sur un jeton minuscule,
 * un seul échange déplace le cours de dizaines de points, et un classement non borné
 * ne remonterait que ce bruit.
 */
const CRYPTO_UNIVERSE = 250

/** Lien d'un onglet de classe — la page reste la même, seul `?classe=` change. */
function rankingHref(assetClass: AssetClass): string {
  return assetClass === 'crypto'
    ? '/classements'
    : `/classements?classe=${ASSET_CLASS_SEGMENT[assetClass]}`
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}): Promise<Metadata> {
  const t = await getPhrase()
  const fr = await getContent()
  const seo = await getSeo()
  const assetClass = readClass(await searchParams)

  /*
   * CANONIQUE VERS LA PAGE NUE, quelle que soit la classe.
   *
   * Les six vues partagent la même adresse à un paramètre près et n'ont donc pas
   * six pages à indexer : laisser chacune se déclarer canonique produirait six URL
   * concurrentes sur des contenus très proches, ce que les moteurs traitent comme de
   * la duplication. Une seule fait autorité, les autres y renvoient.
   */
  return {
    title:
      assetClass === 'crypto'
        ? t('Classements crypto')
        : `${t('Classements')} — ${fr.assetClass[assetClass]}`,
    description: seo(
      '/classements',
      'Plus fortes hausses, plus fortes baisses, volumes les plus élevés et rotation la plus forte, sur 1 heure à 30 jours.',
    ),
    alternates: { canonical: '/classements' },
  }
}

/** `?classe=` lu comme sur `/marches`, avec la crypto en défaut. */
function readClass(params: Record<string, string | string[] | undefined>): AssetClass {
  const raw = params['classe']
  const value = Array.isArray(raw) ? raw[0] : raw
  return (value ? assetClassFromSegment(value) : null) ?? 'crypto'
}

/**
 * Classements — LES SIX CLASSES, et non plus la crypto seule.
 *
 * ── CE QUI CHANGE ────────────────────────────────────────────────────────────
 *
 * La page s'appelait « Classements crypto » et n'interrogeait que
 * `getMoversUniverse`. C'était un reste de l'époque où le site était une plateforme
 * crypto : les cinq autres classes suivies — actions, ETF, indices, matières
 * premières, devises — n'avaient nulle part où être classées, alors que la question
 * « qu'est-ce qui monte le plus chez les matières premières ? » se pose exactement
 * comme pour les jetons.
 *
 * Les onglets sont ceux de `/marches` (`AssetClassTabs`), avec `hrefFor` pour rester
 * sur cette page. Le lecteur retrouve donc la même barre au même endroit d'une page
 * à l'autre, ce qui est le principal argument pour ne pas en dessiner une autre.
 *
 * ── LA VOCATION NE CHANGE PAS ───────────────────────────────────────────────
 *
 * Elle servait un second tableau de cotation paginé, doublon de `/marches`. Elle
 * présente des palmarès SIMULTANÉS — hausses, baisses, volumes, rotation — que l'on
 * compare d'un seul regard, là où la référence empile des onglets au-dessus d'un
 * tableau unique et oblige à mémoriser. Une SEULE période commande les quatre :
 * comparer des hausses sur 1 h à des baisses sur 7 j n'aurait aucun sens.
 *
 * ── UN SEUL APPEL PAR CLASSE, ET IL EST DÉJÀ EN CACHE ───────────────────────
 *
 * Les quatre palmarès sortent du MÊME classement, trié quatre fois en mémoire.
 *
 * Pour les quatre classes Yahoo, `RANKING_SIZE` est IMPORTÉ de `ClassMoversGrid`
 * plutôt que redéclaré : `getRanking` fait entrer `perPage` dans sa clé de cache, si
 * bien que cette page vise la même entrée que les sections de l'accueil et que
 * `/marches`. Sur cache chaud, elle n'émet aucune requête sortante. Une taille propre
 * ouvrirait une seconde entrée pour la même donnée — et chez Yahoo un classement se
 * construit SYMBOLE PAR SYMBOLE, donc vingt appels de plus par régénération.
 *
 * Vingt couvre par ailleurs l'univers entier de ces classes : dix-huit actions, dix
 * ETF, dix indices, douze matières premières. Le classement est donc EXHAUSTIF, pas
 * tronqué — ce que le texte de bas de page dit explicitement, parce qu'un palmarès
 * silencieux sur son périmètre laisse croire qu'il couvre le marché entier.
 */
export default async function RankingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const t = await getPhrase()
  const fr = await getContent()
  const assetClass = readClass(await searchParams)

  const result = await loadRanking(assetClass)

  /*
   * PÉRIMÈTRE ANNONCÉ, JAMAIS SUPPOSÉ — et surtout jamais dans les mots d'une autre
   * classe.
   *
   * La crypto est bornée aux 250 premières capitalisations d'un marché qui en compte
   * des milliers ; les cinq autres classes sont EXHAUSTIVES sur un univers restreint.
   * Deux situations opposées, qu'un même mot recouvrirait sans les distinguer.
   *
   * Surtout, le défaut de `RankingBoard` parle de « plus grandes capitalisations » —
   * une notion qui n'existe ni pour une paire de devises ni pour un baril de brut. La
   * phrase est donc fournie ici pour tout ce qui n'est pas de la crypto.
   */
  const scopeLabel =
    assetClass === 'crypto'
      ? undefined
      : t('Classement exhaustif : les {count} actifs de cette classe suivis par ZENKUU.').replace(
          '{count}',
          String(result.ok ? result.data.length : 0),
        )

  return (
    <div className="space-y-8">
      <header className="max-w-3xl space-y-3">
        <h1 className="display-xl text-ink">
          {assetClass === 'crypto'
            ? t('Classements crypto')
            : `${t('Classements')} — ${fr.assetClass[assetClass]}`}
        </h1>
        <p className="text-lg leading-relaxed text-ink-muted">
          {t(
            'Quatre palmarès à confronter : ce qui monte, ce qui baisse, ce qui s’échange le plus, et ce qui tourne le plus vite au regard de sa taille.',
          )}
        </p>
      </header>

      <AssetClassTabs current={assetClass} hrefFor={rankingHref} />

      {result.ok && result.data.length > 0 ? (
        <>
          <RankingBoard assets={result.data} {...(scopeLabel ? { scopeLabel } : {})} />

          <section className="max-w-2xl space-y-2 border-t border-border-subtle pt-6">
            <h2 className="text-sm font-semibold text-ink">Comment lire ces classements</h2>

            {assetClass === 'crypto' ? (
              <p className="text-sm leading-relaxed text-ink-muted">
                Le périmètre est <strong className="text-ink">borné aux 250 plus grandes
                capitalisations</strong>, et ce n’est pas une limite technique : sur un jeton
                minuscule, un seul échange déplace le cours de dizaines de points. Un
                classement non borné ne remonterait que ce bruit.
              </p>
            ) : (
              <p className="text-sm leading-relaxed text-ink-muted">
                Cette classe compte un univers restreint et entièrement suivi : le classement
                la couvre donc <strong className="text-ink">en totalité</strong>, sans
                troncature. Un palmarès y décrit le marché tel que ZENKUU le suit, ce qui
                n’est pas la même chose que le marché mondial de cette classe.
              </p>
            )}

            <p className="text-sm leading-relaxed text-ink-muted">
              La <strong className="text-ink">rotation</strong> rapporte le volume de 24 heures
              à la capitalisation. Une rotation élevée signale un actif très échangé au
              regard de sa taille — ce qui décrit une activité, jamais une direction.
              {/* Dit ici plutôt que laissé constater : les devises n'ont ni capitalisation
                  ni volume publié, et deux des quatre palmarès y sont donc absents. Sans
                  cette phrase, leur absence se lit comme une panne. */}
              {assetClass === 'forex' ? (
                <>
                  {' '}
                  <strong className="text-ink">
                    Elle n’apparaît pas sur les devises, ni le palmarès des volumes :
                  </strong>{' '}
                  une paire de change n’a ni capitalisation ni volume publié par la Banque
                  centrale européenne.
                </>
              ) : null}
            </p>

            <p className="text-sm text-ink-muted">
              Pour le détail des cours :{' '}
              <Link href="/crypto" className="text-brand hover:underline">
                cotations
              </Link>{' '}
              ·{' '}
              {/* Les renvois vers « données de trading » et « points marquants » ont
                  disparu avec les deux pages qu'ils visaient (demande explicite). La
                  heatmap prend leur place : c'est la lecture d'ensemble la plus proche
                  de ce qu'ils apportaient — les extrêmes du jour, d'un coup d'œil. */}
              <Link href="/heatmap" className="text-brand hover:underline">
                heatmap sectorielle
              </Link>
            </p>
          </section>

          <SourceNote
            strings={{ source: t('Source :'), dated: t('données du {date}') }}
            label={result.source.label}
            href={result.source.attributionUrl}
            updatedAt={result.data[0]?.lastUpdated}
          />
        </>
      ) : (
        <EmptyState
          title="Classements momentanément indisponibles"
          description={result.ok ? null : result.reason}
          source={result.source?.label ?? null}
          tone={result.ok ? 'neutral' : 'warning'}
        />
      )}
    </div>
  )
}

/**
 * Une classe, une source — et trois chemins distincts, non interchangeables.
 *
 *   · CRYPTO — `getMoversUniverse` sert 250 actifs AVEC leurs variations sur toutes
 *     les fenêtres, ce qu'un `getRanking` borné à vingt ne donnerait pas. C'est
 *     l'appel que fait déjà `/mouvements`, donc déjà en cache.
 *   · YAHOO — `getRanking` à `RANKING_SIZE`, pour partager la clé de cache des
 *     sections d'accueil et de `/marches`. Voir l'en-tête de la page.
 *   · DEVISES — la table de change de la BCE, qui n'est pas un classement : elle ne
 *     porte ni capitalisation ni volume, et deux des quatre palmarès s'y videront
 *     d'eux-mêmes. `RankingBoard` filtre déjà sur la présence des champs, donc rien
 *     à traiter ici — la page, elle, l'annonce en toutes lettres.
 */
function loadRanking(assetClass: AssetClass): Promise<DataResult<MarketAsset[]>> {
  if (assetClass === 'crypto') return getMoversUniverse(CRYPTO_UNIVERSE, 'eur')
  if (assetClass === 'forex') return getForexRates()
  return getRanking({ assetClass, currency: 'eur', perPage: RANKING_SIZE })
}
