import type { Metadata } from 'next'
import { Link } from '@/i18n/navigation'

import {
  CACHE_TTL_SECONDS,
  MACRO_FIRST_YEAR,
  MACRO_INDICATORS,
  getMacroIndicator,
  macroHistoryYears,
  packMacroSeries,
} from '@zenkuu/data'
import { EmptyState, SourceNote } from '@zenkuu/ui'

import { MacroExplorer } from '@/components/market/MacroExplorer'
import { MacroIndicatorSearch } from '@/components/market/MacroIndicatorSearch'
import { MacroMap, type MacroTone } from '@/components/market/MacroMap'
import { emphasise } from '@/components/locale/emphasise'
import { getPhrase, getSeo } from '@/lib/content'

/** Les cinq séries gardées en accès direct — voir la note sur la rangée de raccourcis. */
const FEATURED = ['inflation', 'chomage', 'croissance', 'dette', 'interets'] as const

export const revalidate = 3600
const _ttlGuard: number = CACHE_TTL_SECONDS
void _ttlGuard

/**
 * Métadonnées DÉRIVÉES DE LA LANGUE, d'où la fonction plutôt que la constante.
 *
 * Un `export const metadata` est évalué une fois au chargement du module : il ne
 * peut pas connaître la locale de la requête, et servait donc un titre français sur
 * les pages traduites. `generateMetadata` est appelée par requête.
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getPhrase()
  const seo = await getSeo()

  return {
    title: t('Carte macroéconomique'),
    description: seo(
      '/macro',
      'Inflation, chômage, croissance, dette publique et taux d’intérêt réels, pays par pays, d’après les séries de la Banque mondiale.',
    ),
    alternates: { canonical: '/macro' },
  }
}

/**
 * CARTE MACROÉCONOMIQUE — l'environnement dans lequel les marchés se tiennent.
 *
 * ── POURQUOI CETTE PAGE EXISTE SUR UN SITE DE COURS ───────────────────────────
 *
 * Le site publiait des cours et rien de ce qui les entoure. Or la question qu'un
 * lecteur se pose devant un marché en recul — « est-ce ce marché, ou est-ce le
 * pays ? » — n'avait aucune réponse ici. Cinq indicateurs y répondent, et ce sont ceux
 * que toutes les cartes macro montrent.
 *
 * ── UNE HEURE DE `revalidate` POUR UNE DONNÉE ANNUELLE ────────────────────────
 *
 * Ce n'est pas une incohérence. La donnée change une fois par an, mais la page est
 * régénérée à l'heure pour la même raison que les autres : c'est le pas commun du
 * site, et un pas plus long ferait vivre une page servie depuis un cache dont plus
 * personne ne surveille la date. Le vrai coût est porté par le cache applicatif du
 * fournisseur, réglé à six heures.
 *
 * ── UN SEUL INDICATEUR EST CHARGÉ PAR VISITE ─────────────────────────────────
 *
 * Le choix passe par l'URL (`?indicateur=`) et non par un état React, ce qui permet
 * de ne demander à la source QUE la série regardée. Charger les cinq d'avance
 * coûterait cinq appels pour quatre séries que la plupart des visiteurs ne
 * regarderont pas — et rendrait la page partageable sans son indicateur.
 */
export default async function MacroPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const t = await getPhrase()
  const params = await searchParams
  const raw = params['indicateur']
  const requested = Array.isArray(raw) ? raw[0] : raw

  /* Un identifiant inconnu retombe sur le premier plutôt que de rendre une page
     vide : le paramètre vient de l'URL, donc de n'importe où. */
  const indicator =
    MACRO_INDICATORS.find((entry) => entry.id === requested) ?? MACRO_INDICATORS[0]

  /*
   * L'ANNÉE VIENT DE L'URL, et elle n'y arrive que par « Copier le lien ».
   *
   * Le curseur temporel ne l'y écrit PAS à chaque cran : une navigation par pixel
   * parcouru rechargerait la page serveur des dizaines de fois pendant un seul geste.
   * Elle est donc en lecture seule ici, et sert uniquement à rouvrir un lien partagé
   * sur l'année que son auteur regardait.
   */
  const rawYear = params['annee']
  const parsedYear = Number(Array.isArray(rawYear) ? rawYear[0] : rawYear)
  const initialYear = Number.isFinite(parsedYear) && parsedYear > 1900 ? parsedYear : null

  /*
   * TOUTE L'HISTOIRE PUBLIÉE — 1960 à aujourd'hui, et non la seule dernière valeur.
   *
   * C'est ce qui alimente le curseur temporel et la courbe du panneau de pays. Le
   * surcoût est UNE requête plus grosse — la source rend une observation par pays et
   * par année dans la même réponse, sans pagination — et non soixante-six requêtes ;
   * le cache applicatif la garde six heures, et la clé distingue cette profondeur de
   * l'instantané que demande l'aperçu de l'accueil. Voir `macroHistoryYears`.
   */
  const result = await getMacroIndicator(indicator.code, macroHistoryYears())

  return (
    <div className="space-y-6 py-6">
      <header className="space-y-3">
        <h1 className="display-xl text-ink">{t('Carte macroéconomique')}</h1>
        <p className="max-w-3xl text-sm leading-relaxed text-ink-muted">
          {emphasise(
            t(
              'L’état des économies, pays par pays. Ces chiffres ne sont pas des cours : ce sont des séries **annuelles**, publiées avec plusieurs mois de retard et à des dates différentes selon les pays. Chaque valeur porte donc son année, et deux pays côte à côte peuvent décrire deux moments distincts. L’historique remonte à **{year}**, là où la source commence — mais tous les pays ne sont pas renseignés si loin, et le décompte sous le curseur dit combien le sont pour l’année affichée.',
            ).replace('{year}', String(MACRO_FIRST_YEAR)),
          )}
        </p>
      </header>

      {/* ── Le choix de l'indicateur ─────────────────────────────────────────

          DEUX GESTES POUR UN MÊME CHOIX, et ce n'est pas une redite.

          À gauche, cinq raccourcis : ce sont les séries qu'on vient consulter neuf
          fois sur dix, et un clic les atteint. De vrais liens et non des boutons — le
          choix vit dans l'URL, ce qui le rend partageable, indexable et navigable au
          bouton « retour ».

          À droite, la recherche sur les quarante-cinq. Elle répond à l'autre cas :
          celui où l'on sait ce qu'on cherche et où aucun raccourci ne le porte. Mettre
          les quarante-cinq en boutons rendrait les cinq introuvables ; n'offrir que la
          recherche obligerait à taper pour atteindre l'inflation. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Indicateurs courants" className="flex flex-wrap gap-1.5">
          {FEATURED.map((id) => {
            const entry = MACRO_INDICATORS.find((candidate) => candidate.id === id)
            if (!entry) return null

            return (
              <Link
                key={entry.id}
                href={`/macro?indicateur=${entry.id}`}
                aria-current={entry.id === indicator.id ? 'page' : undefined}
                className={`rounded-control border px-3 py-1.5 text-xs font-medium transition-colors duration-150 ${
                  entry.id === indicator.id
                    ? 'border-brand bg-brand text-on-brand'
                    : 'border-border-subtle text-ink-muted hover:border-brand hover:text-ink'
                }`}
              >
                {entry.label}
              </Link>
            )
          })}

          {/* L'indicateur COURANT s'ajoute à la rangée quand il ne s'y trouve pas :
              sans cela, choisir « Espérance de vie » dans la recherche laisserait cinq
              raccourcis tous inactifs, et rien à l'écran ne dirait ce qu'on regarde. */}
          {FEATURED.includes(indicator.id as (typeof FEATURED)[number]) ? null : (
            <span
              aria-current="page"
              className="rounded-control border border-brand bg-brand px-3 py-1.5 text-xs font-medium text-on-brand"
            >
              {indicator.label}
            </span>
          )}
        </nav>

        <MacroIndicatorSearch current={indicator.id} />
      </div>

      <p className="max-w-3xl text-xs leading-relaxed text-ink-muted">
        {t(indicator.hint)}
      </p>

      {!result.ok ? (
        /*
          L'ÉCHEC EST FRÉQUENT ICI, et le message le dit plutôt que de laisser croire
          à une panne de notre côté. Relevé au navigateur : ce service répond parfois
          502 sur toutes ses séries pendant plusieurs minutes, y compris celles qui
          venaient de fonctionner. Un indicateur qui manque aujourd'hui revient
          généralement de lui-même — et les autres restent atteignables, d'où
          l'invitation à en essayer un.
        */
        <EmptyState
          title={`« ${indicator.label} » indisponible pour le moment`}
          description={`${result.reason} Ce service public répond par à-coups : l’indicateur revient de lui-même, souvent en quelques minutes. Les autres indicateurs de la rangée ci-dessus restent accessibles.`}
          source={result.source?.label ?? null}
          tone="warning"
        />
      ) : result.data.length === 0 ? (
        <EmptyState
          title="Aucun pays publié pour cet indicateur"
          description="La source ne renseigne cette série pour aucun pays de son catalogue."
          compact
        />
      ) : (
        <>
          {/*
            LA SÉRIE EST COMPACTÉE UNE FOIS, POUR LES DEUX FIGURES.

            Les deux composants ci-dessous sont des composants CLIENT : ce qu'on leur
            passe est sérialisé dans la charge utile de la page. Avec soixante-six ans
            d'historique, la même série transportée en objets nommés réécrirait
            « France » et « Europe & Central Asia » soixante-six fois — voir
            `packMacroSeries` pour la mesure.

            L'encodage a lieu ICI plutôt que dans chaque composant : le faire deux fois
            enverrait deux copies de la même série, ce qui annulerait le gain.
          */}
          <MacroExplorer
            series={packMacroSeries(result.data)}
            unit={indicator.unit}
            tone={indicator.tone as MacroTone}
            scale={indicator.scale}
            indicatorId={indicator.id}
            indicatorLabel={indicator.label}
            initialYear={initialYear}
          />

          {/* La grille par région SUBSISTE sous les figures, et ce n'est pas une
              redite. Une carte répond à « où » ; elle ne répond pas à « lequel est le
              plus haut », qui demande de comparer des surfaces colorées à l'œil. La
              grille classe, et donne à chaque pays la même tuile quelle que soit sa
              superficie — le Luxembourg y est aussi lisible que la Russie. */}
          <MacroMap
            series={packMacroSeries(result.data)}
            unit={indicator.unit}
            tone={indicator.tone as MacroTone}
            valueScale={indicator.scale}
          />

          {result.source ? (
            <SourceNote label={result.source.label} href={result.source.attributionUrl} />
          ) : null}
        </>
      )}
    </div>
  )
}
