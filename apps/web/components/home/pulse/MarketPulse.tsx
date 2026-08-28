import type { ReactNode } from 'react'

import {
  getMarketCapBasket,
  getSentiment,
  getSentimentHistory,
  type DataResult,
  type GlobalMarketStats,
} from '@zenkuu/data'
import { ChangeBadge, Sparkline } from '@zenkuu/ui'

import { classify } from '@/components/home/SidePanels'
import { Money } from '@/components/locale/Money'
import { Link } from '@/i18n/navigation'
import { getContent, getPhrase } from '@/lib/content'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * BANDEAU DE SYNTHÈSE — CINQ REPÈRES, AVANT TOUT LE RESTE
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── CE QU'IL REPREND, ET CE QU'IL EN FAIT AUTREMENT ─────────────────────────
 *
 * CoinGecko ouvre sur DEUX cartes empilées à gauche — capitalisation et volume, avec
 * leur courbe — flanquées de deux panneaux de palmarès. Les mêmes chiffres sont ici,
 * mais posés à plat : cinq tuiles de même poids sur une seule rangée, palmarès
 * renvoyés à la grille qui suit. Le premier écran cesse d'être une composition et
 * devient une LIGNE DE RELEVÉ — la forme qu'ont les salles de marché, et celle qui
 * supporte la densité qu'on ajoute en dessous.
 *
 * Cinq et non deux, parce que trois repères que la référence enterre dans sa barre
 * supérieure de 11 px méritent la même taille que les deux autres : la dominance dit
 * la CONCENTRATION du marché, le sentiment son RÉGIME, le nombre d'actifs cotés la
 * PROFONDEUR de ce qu'on regarde. Aucun des trois ne se déduit des deux premiers.
 *
 * ── DEUX TUILES PORTENT UNE COURBE, TROIS NON, ET C'EST MESURÉ ──────────────
 *
 * `--- Capitalisation` et `Sentiment` ont une série derrière eux : le panier de neuf
 * actifs sur trente jours pour la première, l'historique de l'indice pour le second.
 * Les trois autres n'en ont pas — la source ne publie ni historique de volume, ni
 * historique de dominance, ni historique du nombre de cotations. Leur en dessiner une
 * demanderait de l'inventer (§5). Elles portent donc, à la place, la seule chose
 * qu'on sache vraiment en dire : une part, une répartition, un lien.
 *
 * ── LES TROIS APPELS SONT PARALLÈLES, ET AUCUN N'EST BLOQUANT ───────────────
 *
 * L'agrégat mondial arrive de la page (elle en a besoin ailleurs). Les trois autres
 * partent ensemble ; chacun peut échouer seul, et sa tuile se rabat alors sur ce
 * qu'elle sait encore dire plutôt que de disparaître — une rangée à quatre tuiles
 * ferait un trou, là où une tuile sans courbe reste une tuile.
 */
export async function MarketPulse({ globals }: { globals: DataResult<GlobalMarketStats> }) {
  const fr = await getContent()
  const t = await getPhrase()

  const [basket, sentiment, sentimentHistory] = await Promise.all([
    /* Trente jours et non l'année : cette courbe fait 96 pixels de large. À 365 points
       elle devient une texture, et la question qu'on lui pose ici — « d'où vient-on
       ce mois-ci ? » — n'a pas besoin de plus. La fenêtre annuelle vit dans les
       analyses globales, en bas de page, où elle a la place de se lire. */
    getMarketCapBasket('eur', 30),
    getSentiment(),
    getSentimentHistory(30),
  ])

  const stats = globals.ok ? globals.data : null
  const mood = sentiment.ok ? sentiment.data : null

  const capSeries = basket.ok ? basket.data.points.map((point) => point.total) : []
  const moodSeries = sentimentHistory.ok ? sentimentHistory.data.map((point) => point.value) : []

  const btc = stats?.dominance?.['btc']
  const eth = stats?.dominance?.['eth']
  /* Le reste est CALCULÉ et non lu : la source ne publie que les premières places, et
     un total qui ne fait pas cent sans le dire laisserait croire à une donnée perdue. */
  const others =
    typeof btc === 'number' && typeof eth === 'number' ? Math.max(0, 100 - btc - eth) : null

  /* Part du volume dans la capitalisation — la ROTATION du marché sur la journée.
     C'est ce qu'un volume brut ne dit pas : 83 Md$ est un grand nombre dans l'absolu
     et un marché atone rapporté à 2 400 Md$ de capitalisation. */
  const turnover =
    stats && stats.totalMarketCap > 0 ? (stats.totalVolume24h / stats.totalMarketCap) * 100 : null

  return (
    <section
      aria-label={t('Repères du marché')}
      className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5"
    >
      {/* ── CAPITALISATION ───────────────────────────────────────────────── */}
      <PulseTile label={t('Capitalisation mondiale')} href="/graphiques">
        {stats ? (
          <>
            <PulseValue>
              <Money value={stats.totalMarketCap} from={stats.currency} compact />
            </PulseValue>
            <PulseFoot>
              <ChangeBadge value={stats.marketCapChange24h} size="sm" />
              <span className="text-ink-muted">{t('sur 24 h')}</span>
            </PulseFoot>
          </>
        ) : (
          <PulseMissing reason={globals.ok ? null : globals.reason} />
        )}

        {capSeries.length > 1 ? (
          <PulseChart>
            <Sparkline
              values={capSeries}
              width={140}
              height={30}
              label={t('Capitalisation du panier sur 30 jours')}
            />
          </PulseChart>
        ) : null}
      </PulseTile>

      {/* ── VOLUME ───────────────────────────────────────────────────────── */}
      <PulseTile label={t('Volume échangé sur 24 h')} href="/crypto">
        {stats ? (
          <>
            <PulseValue>
              <Money value={stats.totalVolume24h} from={stats.currency} compact />
            </PulseValue>
            <PulseFoot>
              {turnover !== null ? (
                <>
                  <span className="tabular font-medium text-ink">{turnover.toFixed(1)} %</span>
                  <span className="text-ink-muted">{t('de la capitalisation')}</span>
                </>
              ) : (
                <span className="text-ink-muted">{t('rotation indisponible')}</span>
              )}
            </PulseFoot>
          </>
        ) : (
          <PulseMissing reason={globals.ok ? null : globals.reason} />
        )}

        {/* Une JAUGE et non une courbe : la rotation est une part, et une part se lit
            sur une règle. Bornée à 20 % — au-delà, le marché entier a changé de mains
            dans la journée, ce qui n'arrive pas ; la borne rend donc les valeurs
            ordinaires (2 à 6 %) réellement distinguables entre elles. */}
        {turnover !== null ? (
          <PulseChart>
            <div className="h-1.5 w-full overflow-hidden rounded-pill bg-surface-muted">
              <div
                className="h-full rounded-pill bg-brand"
                style={{ width: `${Math.min(100, (turnover / 20) * 100).toFixed(1)}%` }}
              />
            </div>
          </PulseChart>
        ) : null}
      </PulseTile>

      {/* ── DOMINANCE ────────────────────────────────────────────────────── */}
      <PulseTile label={t('Dominance')} href="/indices">
        {typeof btc === 'number' ? (
          <>
            <PulseValue>
              <span className="tabular">{btc.toFixed(1)} %</span>
            </PulseValue>
            <PulseFoot>
              <span className="text-ink-muted">{t('pour Bitcoin')}</span>
            </PulseFoot>
          </>
        ) : (
          <PulseMissing reason={globals.ok ? null : globals.reason} />
        )}

        {typeof btc === 'number' && typeof eth === 'number' && others !== null ? (
          <PulseChart>
            <div className="flex flex-col gap-1.5">
              {/* Trois segments, et le troisième est nommé « autres » plutôt que laissé
                  muet : une barre qui ne fait pas cent sans explication se lit comme un
                  défaut de rendu. */}
              <div className="flex h-1.5 w-full overflow-hidden rounded-pill bg-surface-muted">
                <span className="bg-data-5" style={{ width: `${btc.toFixed(1)}%` }} />
                <span className="bg-data-1" style={{ width: `${eth.toFixed(1)}%` }} />
                <span className="bg-data-4" style={{ width: `${others.toFixed(1)}%` }} />
              </div>
              <p className="flex flex-wrap gap-x-2 gap-y-0.5 text-2xs text-ink-muted">
                <span className="text-data-5">BTC {btc.toFixed(1)} %</span>
                <span className="text-data-1">ETH {eth.toFixed(1)} %</span>
                <span className="text-data-4">
                  {t('autres')} {others.toFixed(1)} %
                </span>
              </p>
            </div>
          </PulseChart>
        ) : null}
      </PulseTile>

      {/* ── SENTIMENT ────────────────────────────────────────────────────── */}
      <PulseTile label={t('Sentiment du marché')} href="/sentiment">
        {mood ? (
          <>
            <PulseValue>
              <span className="tabular">{mood.value}</span>
              <span className="text-base font-normal text-ink-muted"> / 100</span>
            </PulseValue>
            <PulseFoot>
              <span className="text-ink-muted">{classify(mood.value, fr.sentiment.scale)}</span>
            </PulseFoot>
          </>
        ) : (
          <PulseMissing reason={sentiment.ok ? null : sentiment.reason} />
        )}

        {moodSeries.length > 1 ? (
          <PulseChart>
            <Sparkline
              values={moodSeries}
              width={140}
              height={30}
              label={t('Indice de sentiment sur 30 jours')}
            />
          </PulseChart>
        ) : null}
      </PulseTile>

      {/* ── PROFONDEUR ───────────────────────────────────────────────────── */}
      <PulseTile label={t('Actifs cotés')} href="/crypto">
        {stats ? (
          <>
            <PulseValue>
              <span className="tabular">{stats.activeAssets.toLocaleString('fr-FR')}</span>
            </PulseValue>
            <PulseFoot>
              <span className="text-ink-muted">{t('suivis par la source crypto')}</span>
            </PulseFoot>
          </>
        ) : (
          <PulseMissing reason={globals.ok ? null : globals.reason} />
        )}
      </PulseTile>
    </section>
  )
}

/**
 * Le cadre d'une tuile.
 *
 * `justify-between` et `h-full` : les cinq tuiles finissent à la même hauteur et leur
 * figure du bas s'aligne, quelle que soit la longueur du libellé de leur pied. Sans
 * cela, la rangée se lit comme cinq blocs mal posés plutôt que comme un relevé.
 *
 * Le libellé est cliquable quand la mesure a une page dédiée — c'est le seul lien de
 * la tuile, et il porte le titre plutôt qu'un « voir plus » ajouté en bas : la tuile
 * reste alors une surface de lecture, pas une carte d'appel à l'action.
 */
function PulseTile({
  label,
  href,
  children,
}: {
  label: string
  href?: string
  children: ReactNode
}) {
  return (
    <div className="flex h-full flex-col gap-2 rounded-panel border border-border-subtle bg-surface p-4">
      {href ? (
        <Link
          href={href}
          prefetch={false}
          className="text-2xs uppercase tracking-wide text-ink-muted transition-colors hover:text-brand"
        >
          {label}
        </Link>
      ) : (
        <span className="text-2xs uppercase tracking-wide text-ink-muted">{label}</span>
      )}
      {children}
    </div>
  )
}

function PulseValue({ children }: { children: ReactNode }) {
  return <p className="tabular text-xl font-semibold leading-tight text-ink">{children}</p>
}

function PulseFoot({ children }: { children: ReactNode }) {
  return <p className="flex flex-wrap items-baseline gap-1.5 text-xs">{children}</p>
}

/** Pousse la figure au BAS de la tuile, quelle que soit la hauteur du texte au-dessus. */
function PulseChart({ children }: { children: ReactNode }) {
  return <div className="mt-auto pt-2">{children}</div>
}

/**
 * Ce qu'affiche une tuile dont la source n'a pas répondu.
 *
 * La PHRASE DU FOURNISSEUR, jamais une phrase inventée : elle distingue « aucune
 * source configurée » de « la source n'a pas répondu », et le lecteur n'a pas à
 * deviner laquelle des deux il lit (§5).
 */
function PulseMissing({ reason }: { reason: string | null }) {
  return (
    <>
      <p className="text-xl font-semibold leading-tight text-ink-muted">—</p>
      {reason ? <p className="text-2xs leading-snug text-ink-muted">{reason}</p> : null}
    </>
  )
}
