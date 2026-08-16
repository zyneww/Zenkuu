import type { Metadata } from 'next'
import { Link } from '@/i18n/navigation'

import { CACHE_TTL_SECONDS, MACRO_INDICATORS, getMacroIndicator } from '@zenkuu/data'
import { EmptyState, SourceNote } from '@zenkuu/ui'

import { MacroMap, type MacroTone } from '@/components/market/MacroMap'

export const revalidate = 3600
const _ttlGuard: number = CACHE_TTL_SECONDS
void _ttlGuard

export const metadata: Metadata = {
  title: 'Carte macroéconomique',
  description:
    'Inflation, chômage, croissance, dette publique et taux d’intérêt réels, pays par pays, d’après les séries de la Banque mondiale.',
  alternates: { canonical: '/macro' },
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
  const params = await searchParams
  const raw = params['indicateur']
  const requested = Array.isArray(raw) ? raw[0] : raw

  /* Un identifiant inconnu retombe sur le premier plutôt que de rendre une page
     vide : le paramètre vient de l'URL, donc de n'importe où. */
  const indicator =
    MACRO_INDICATORS.find((entry) => entry.id === requested) ?? MACRO_INDICATORS[0]

  const result = await getMacroIndicator(indicator.code)

  return (
    <div className="space-y-6 py-6">
      <header className="space-y-3">
        <h1 className="display-xl text-ink">Carte macroéconomique</h1>
        <p className="max-w-3xl text-sm leading-relaxed text-ink-muted">
          L’état des économies, pays par pays. Ces chiffres ne sont pas des cours : ce
          sont des séries <strong className="text-ink">annuelles</strong>, publiées avec
          plusieurs mois de retard et à des dates différentes selon les pays. Chaque
          valeur porte donc son année, et deux pays côte à côte peuvent décrire deux
          moments distincts.
        </p>
      </header>

      {/* ── Les indicateurs ─────────────────────────────────────────────────
          De vrais liens et non des boutons : le choix vit dans l'URL, ce qui le rend
          partageable, indexable et navigable au bouton « retour ». */}
      <nav aria-label="Indicateur" className="flex flex-wrap gap-1.5">
        {MACRO_INDICATORS.map((entry) => (
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
        ))}
      </nav>

      <p className="max-w-3xl text-xs leading-relaxed text-ink-muted">{indicator.hint}</p>

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
          <MacroMap
            observations={result.data}
            unit={indicator.unit}
            tone={indicator.tone as MacroTone}
          />

          {result.source ? (
            <SourceNote label={result.source.label} href={result.source.attributionUrl} />
          ) : null}
        </>
      )}
    </div>
  )
}
