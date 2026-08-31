import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { getExchangeProfile } from '@zenkuu/data'
import { EmptyState, SourceNote, formatCompact } from '@zenkuu/ui'

import { Button } from '@/components/ui/button'
import { ExchangeLogo } from '@/components/asset/ExchangeLogo'
import { ExchangeTickersTable } from '@/components/market/ExchangeTickersTable'
import { Link } from '@/i18n/navigation'
import { getPhrase } from '@/lib/content'

/* Une heure, comme le TTL de la donnée — voir `getExchangeProfile`. */
export const revalidate = 3600

interface RouteProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: RouteProps): Promise<Metadata> {
  const { id } = await params
  const result = await getExchangeProfile(id)

  if (!result.ok || !result.data) {
    return { title: 'Place introuvable' }
  }

  const place = result.data
  const kind = place.derivatives ? 'produits dérivés' : 'comptant'

  return {
    title: `${place.name} — place de ${kind}`,
    description:
      `Volume, paires cotées et profil de ${place.name}, place de ${kind}` +
      `${place.country ? ` établie ${frenchIn(place.country)}` : ''}. ` +
      'ZENKUU ne référence aucun carnet d’ordres et ne permet aucune transaction.',
    alternates: { canonical: `/places/${id}` },
  }
}

/**
 * FICHE D'UNE PLACE DE COTATION.
 *
 * ── UNE PAGE POUR QUATRE NATURES ────────────────────────────────────────────
 *
 * CoinGecko sert quatre gabarits — comptant centralisé, comptant décentralisé, dérivés
 * centralisés, dérivés décentralisés — et les quatre partagent leur en-tête, leur
 * bloc d'identité et leur tableau de paires. Ce qui change réellement tient en deux
 * points : les CHIFFRES mis en avant, et les COLONNES du tableau.
 *
 * Cette page les traite donc comme des variations d'un même écran plutôt que comme
 * quatre écrans. `ExchangeProfile` porte les champs des deux mondes en optionnel, et
 * chaque bloc se retire quand sa donnée manque — ce qui produit exactement les quatre
 * rendus, sans quatre fichiers à tenir d'accord.
 *
 * ── CE QUE LA PAGE NE FAIT PAS ──────────────────────────────────────────────
 *
 * Aucun lien d'inscription, aucun code de parrainage, aucun classement maison. Le §1
 * vaut ici plus qu'ailleurs : une fiche de plateforme d'échange est précisément la
 * page où un site de données se transforme en apporteur d'affaires. Les liens sortent
 * en `nofollow`, et la note de confiance reste attribuée à la source — c'est un
 * jugement, pas une mesure, et il n'est pas le nôtre.
 */
export default async function ExchangePage({ params }: RouteProps) {
  const t = await getPhrase()
  const { id } = await params
  const result = await getExchangeProfile(id)

  /*
   * DEUX ÉCHECS DISTINCTS, ET L'ORDRE DES GARDES N'EST PAS INDIFFÉRENT.
   *
   * `ok: false` décrit une source en panne — on affiche un état d'erreur, la place
   * existe peut-être. `data: null` décrit une place qui n'existe pas, ce qui mérite un
   * vrai 404 : confondre les deux ferait indexer des pages d'erreur pour des
   * identifiants fantaisistes.
   *
   * La panne est traitée EN PREMIER, et c'est une contrainte du typage autant qu'une
   * question de logique : écrire `if (result.ok && !result.data) notFound()` avant
   * laisse TypeScript incapable de conclure que `result.data` est non nul plus bas —
   * il ne relie pas les deux conditions. Sorti d'abord du cas d'échec, le reste se
   * rétrécit tout seul.
   */
  if (!result.ok) {
    return (
      <div className="space-y-6 py-6">
        <EmptyState
          title={t('Fiche de place indisponible')}
          description={result.reason}
          source={result.source?.label ?? null}
          tone="warning"
        />
      </div>
    )
  }

  if (!result.data) notFound()

  const place = result.data
  const kindLabel = place.derivatives ? 'Produits dérivés' : 'Marché au comptant'

  return (
    <div className="space-y-8 py-6">
      <nav aria-label={t('Fil d’Ariane')} className="text-xs text-ink-muted">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link href="/" className="hover:text-brand">
              Accueil
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            {/* Le fil remonte vers la LISTE DONT LA PLACE VIENT : les dérivés vers
                `/perpetuels`, le comptant vers `/places`. Un fil qui renverrait
                toujours au même endroit ferait mentir la moitié des fiches. */}
            <Link
              href={place.derivatives ? '/perpetuels' : '/places'}
              className="hover:text-brand"
            >
              {place.derivatives ? 'Places de dérivés' : 'Places de cotation'}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="font-medium text-ink" aria-current="page">
            {place.name}
          </li>
        </ol>
      </nav>

      {/* ── Identité ─────────────────────────────────────────────────────── */}
      <header className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-pill border border-border-subtle bg-surface">
            <ExchangeLogo name={place.name} src={place.image} size={32} />
          </span>

          <div className="min-w-0">
            <h1 className="display-xl leading-none text-ink">{place.name}</h1>

            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-ink-muted">
              <span className="rounded-pill border border-border-subtle px-2 py-0.5 font-medium">
                {kindLabel}
              </span>

              {/* La nature vient de la SOURCE ici, à la différence du classement de la
                  liste qui est le nôtre — d'où l'infobulle qui le dit. */}
              {place.centralized !== undefined ? (
                <span
                  title={t('Nature publiée par la source')}
                  className={`rounded-pill px-2 py-0.5 font-medium ${
                    place.centralized ? 'bg-surface-muted' : 'bg-up-soft text-up'
                  }`}
                >
                  {place.centralized ? 'Dépositaire' : 'Décentralisée'}
                </span>
              ) : null}

              {place.country ? <span>{place.country}</span> : null}
              {place.yearEstablished ? <span>· depuis {place.yearEstablished}</span> : null}
            </div>
          </div>
        </div>

        {/* Le lien vers l'opérateur, en `nofollow` — voir l'en-tête.

            `Button asChild` et non `ButtonLink` : la destination est EXTERNE, donc
            sans préfixe de locale à poser. `asChild` prête les classes du bouton à
            un `<a>` ordinaire, qui reste la bonne balise pour sortir du site. */}
        {place.url ? (
          <Button asChild size="sm" variant="outline">
            <a href={place.url} target="_blank" rel="nofollow noopener noreferrer">
              Site de la place
              <span className="sr-only"> {t('(nouvelle fenêtre)')}</span>
            </a>
          </Button>
        ) : null}
      </header>

      {/* ── Les chiffres, et seulement ceux que la nature publie ──────────── */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {place.derivatives ? (
          <>
            <Stat
              label={t('Intérêt ouvert')}
              value={place.openInterestBtc !== undefined ? `${formatCompact(place.openInterestBtc)} ₿` : '—'}
              hint={t('positions non dénouées')}
            />
            <Stat
              label="Volume 24 h"
              value={place.volume24hBtc !== undefined ? `${formatCompact(place.volume24hBtc)} ₿` : '—'}
              hint={t('en bitcoin, unité de la source')}
            />
            <Stat
              label={t('Contrats perpétuels')}
              value={place.perpetualPairs !== undefined ? String(place.perpetualPairs) : '—'}
              hint={t('sans échéance')}
            />
            <Stat
              label={t('Contrats à échéance')}
              value={place.futuresPairs !== undefined ? String(place.futuresPairs) : '—'}
              hint={t('avec date de règlement')}
            />
          </>
        ) : (
          <>
            <Stat
              label={t('Note de confiance')}
              value={place.trustScore !== undefined ? `${place.trustScore} / 10` : '—'}
              hint={
                place.trustRank !== undefined
                  ? `rang ${place.trustRank} · jugement de la source`
                  : 'jugement de la source'
              }
            />
            <Stat
              label="Volume 24 h"
              value={place.volume24hBtc !== undefined ? `${formatCompact(place.volume24hBtc)} ₿` : '—'}
              hint={t('en bitcoin, unité de la source')}
            />
            <Stat
              label={t('Actifs cotés')}
              value={place.coins !== undefined ? String(place.coins) : '—'}
              hint={t('référencés par la source')}
            />
            <Stat
              label="Paires"
              value={place.pairs !== undefined ? String(place.pairs) : '—'}
              hint={t('couples cotés')}
            />
          </>
        )}
      </div>

      {place.tickers.length > 0 ? (
        <ExchangeTickersTable tickers={place.tickers} derivatives={place.derivatives} />
      ) : (
        <EmptyState
          title={t('Aucune paire publiée')}
          description={t('La source ne détaille pas les paires cotées sur cette place.')}
          compact
        />
      )}

      {/* ── À propos, et les réseaux ──────────────────────────────────────── */}
      {place.description || place.social ? (
        <section className="max-w-3xl space-y-3">
          <h2 className="display-sm text-ink">À propos de {place.name}</h2>

          {place.description ? (
            <>
              <p className="whitespace-pre-line text-sm leading-relaxed text-ink-muted">
                {place.description}
              </p>
              {/* Le texte de la source est en ANGLAIS. On l'affiche tel quel plutôt
                  que de le traduire à la volée : une traduction automatique d'une
                  présentation d'opérateur financier introduirait des approximations
                  que rien ne signalerait au lecteur (§5). */}
              <p className="text-micro text-ink-muted opacity-80">
                Présentation publiée en anglais par {result.source?.label ?? 'la source'},
                reprise sans traduction.
              </p>
            </>
          ) : null}

          {place.social ? (
            <ul className="flex flex-wrap gap-2">
              {/* `Object.entries` perd le type de la valeur sur un objet à clés
                  optionnelles : sans cette assertion, `url` arrive en `unknown`. Le
                  contrat est garanti par `ExchangeProfile['social']`, dont toutes les
                  valeurs sont des chaînes. */}
              {(Object.entries(place.social) as [string, string][]).map(([network, url]) => (
                <li key={network}>
                  <Button asChild size="xs" variant="outline" className="capitalize">
                    <a href={url} target="_blank" rel="nofollow noopener noreferrer">
                      {network}
                      <span className="sr-only"> {t('(nouvelle fenêtre)')}</span>
                    </a>
                  </Button>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}

      {result.source ? (
        <SourceNote label={t(result.source.label)} href={result.source.attributionUrl} strings={{ source: t('Source :'), dated: t('données du {date}') }} />
      ) : null}

      <p className="max-w-3xl text-xs leading-relaxed text-ink-muted">{t('ZENKUU ne référence aucun carnet d’ordres et ne permet aucune transaction. Cette fiche situe une place d’échange ; elle n’y donne pas accès, et la note de confiance affichée est un jugement publié par la source, ni une mesure ni un avis de ZENKUU.')}</p>
    </div>
  )
}

async function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-card bg-surface p-3">
      <p className="text-micro uppercase tracking-wide text-ink-muted">{label}</p>
      <p className="tabular mt-1 text-lg font-semibold text-ink">{value}</p>
      <p className="text-micro text-ink-muted">{hint}</p>
    </div>
  )
}

/**
 * Préposition devant un nom de pays.
 *
 * « établie à Singapour » et « établie aux Îles Caïmans » ne prennent pas la même :
 * la source rend des noms anglais bruts qu'on ne peut pas fléchir correctement sans
 * une table. On s'en tient donc à la forme neutre — « établie · Singapour » — plutôt
 * qu'à une préposition fausse une fois sur trois.
 */
function frenchIn(country: string): string {
  return `· ${country}`
}
