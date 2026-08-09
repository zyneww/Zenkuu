import type { Metadata } from 'next'
import Link from 'next/link'
import { Check, Database, Eye, Globe2, Minus, Scale, ShieldCheck, Wallet } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Pourquoi ZENITH',
  description:
    'Multi-actifs, gratuit, en lecture seule et sans donnée inventée : les partis pris qui distinguent ZENITH des plateformes de suivi de marché existantes.',
  alternates: { canonical: '/pourquoi-zenith' },
}

/**
 * Page argumentaire.
 *
 * Refonte : la page alignait six cartes de même poids, ce qui aplatissait
 * l'argumentation. Elle suit désormais la progression d'une page de réassurance —
 * promesse, bandeau de garanties, sections développées en alternance, tableau
 * comparatif, non-objectifs, appel à l'action.
 *
 * Écart structurel assumé par rapport aux références du secteur : là où une
 * plateforme d'échange met en avant la sécurité des fonds, la profondeur de son
 * carnet d'ordres et ses agréments, ZENITH n'a ni fonds, ni carnet, ni ordre. Ses
 * arguments portent donc sur la donnée et sur ce qu'il refuse de faire (§1, §7). Le
 * tableau comparatif oppose des CATÉGORIES de sites, jamais un concurrent nommé :
 * comparer nommément supposerait de décrire leurs pratiques, ce qu'on ne peut pas
 * sourcer.
 */

const GUARANTEES = [
  { icon: Eye, label: 'Aucune donnée inventée' },
  { icon: Wallet, label: 'Aucun ordre, aucun fonds' },
  { icon: Scale, label: 'Gratuit, sans compte obligatoire' },
  { icon: Database, label: 'Sources citées et vérifiables' },
]

const SECTIONS = [
  {
    icon: Globe2,
    title: 'Toutes les classes d’actifs, une seule grille de lecture',
    body: [
      'Cryptomonnaies, devises, actions, ETF, matières premières et indices vivent au même endroit, avec les mêmes colonnes, les mêmes graphiques et les mêmes conventions d’affichage.',
      'Suivre un patrimoine diversifié ne devrait pas imposer d’ouvrir trois sites et d’apprendre trois façons de présenter une variation. Une variation sur 24 heures se lit de la même manière sur une action et sur une cryptomonnaie.',
    ],
    proof: 'Six classes d’actifs, une seule interface de tableau et un seul composant de graphique.',
  },
  {
    icon: Eye,
    title: 'Une donnée absente reste absente',
    body: [
      'Quand une source ne publie pas une information, elle apparaît comme indisponible. Pas d’estimation, pas de valeur de remplissage, pas de moyenne calculée en douce pour combler une colonne.',
      'La règle est appliquée par la structure du code, et non laissée à la vigilance de qui l’écrit : une source non configurée ne peut techniquement pas produire de nombre, elle produit un état vide que l’affichage est obligé de traiter.',
    ],
    proof:
      'Exemple concret : la vue en chandeliers disparaît sur les devises, parce que la BCE ne publie qu’un taux de référence par jour ouvré — sans ouverture ni plus haut.',
  },
  {
    icon: Wallet,
    title: 'Aucun intérêt à ce que vous passiez un ordre',
    body: [
      'ZENITH n’exécute rien et ne détient rien. Vous ne trouverez nulle part un bouton d’achat, de vente, de dépôt, de retrait ou de connexion à un portefeuille.',
      'Ce positionnement a une conséquence directe sur ce que vous lisez : le site ne gagne rien à ce que vous achetiez ou vendiez, il n’a donc aucune raison de mettre en avant un actif plutôt qu’un autre.',
    ],
    proof: 'Aucune page du site ne comporte de fonction de transaction, sur aucune classe d’actif.',
  },
  {
    icon: ShieldCheck,
    title: 'Des limites annoncées plutôt que masquées',
    body: [
      'Les cours ne sont pas en temps réel, et le site l’écrit. Les classements de plus fortes hausses portent sur un univers précis, et le site le précise sous le tableau.',
      'Une méthode connue vaut mieux qu’une précision suggérée qui n’existe pas. C’est aussi ce qui permet de vérifier un chiffre : on sait quoi comparer, et à quelle heure.',
    ],
    proof:
      'Chaque module affiche sa source et l’horodatage de la dernière valeur reçue.',
  },
]

const COMPARISON = [
  { feature: 'Plusieurs classes d’actifs au même endroit', zenith: true, mono: false, broker: true },
  { feature: 'Consultation sans compte', zenith: true, mono: true, broker: false },
  { feature: 'Aucune fonction de transaction', zenith: true, mono: true, broker: false },
  { feature: 'Sources citées module par module', zenith: true, mono: false, broker: false },
  { feature: 'Donnée manquante signalée comme telle', zenith: true, mono: false, broker: false },
]

export default function PourquoiZenithPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-14 py-6">
      <header className="space-y-4 text-center">
        <p className="text-xs font-medium uppercase tracking-wide text-brand-strong">
          Nos partis pris
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">
          Pourquoi ZENITH
        </h1>
        <p className="mx-auto max-w-2xl text-base leading-relaxed text-ink-muted">
          La plupart des plateformes de suivi de marché sont adossées à un service
          qu’elles cherchent à vous vendre. ZENITH n’a rien à vous vendre : c’est un
          site d’information, et cela change ce qu’il peut se permettre d’afficher.
        </p>
      </header>

      {/* Bandeau de garanties : les quatre engagements en un coup d'œil, avant le
          développement de chacun plus bas. */}
      <ul className="grid grid-cols-2 gap-px overflow-hidden rounded-card border border-border-subtle bg-border-subtle sm:grid-cols-4">
        {GUARANTEES.map((item) => (
          <li key={item.label} className="flex flex-col items-center gap-2 bg-surface px-3 py-4 text-center">
            <item.icon className="h-5 w-5 text-brand-strong" aria-hidden="true" />
            <span className="text-xs font-medium leading-snug text-ink">{item.label}</span>
          </li>
        ))}
      </ul>

      {/* Sections développées, en alternance gauche/droite sur écran large. */}
      <div className="space-y-10">
        {SECTIONS.map((section, index) => (
          <section
            key={section.title}
            className={`flex flex-col gap-5 sm:flex-row sm:items-start ${
              index % 2 === 1 ? 'sm:flex-row-reverse' : ''
            }`}
          >
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-card bg-brand-soft"
              aria-hidden="true"
            >
              <section.icon className="h-6 w-6 text-brand-strong" />
            </div>

            <div className="flex-1 space-y-2.5">
              <h2 className="text-lg font-semibold text-ink">{section.title}</h2>
              {section.body.map((paragraph, paragraphIndex) => (
                <p key={paragraphIndex} className="text-sm leading-relaxed text-ink-muted">
                  {paragraph}
                </p>
              ))}
              <p className="rounded-card border-l-2 border-brand bg-surface-muted px-3 py-2 text-xs leading-relaxed text-ink-muted">
                {section.proof}
              </p>
            </div>
          </section>
        ))}
      </div>

      <section className="space-y-3" aria-labelledby="comparatif">
        <h2 id="comparatif" className="text-lg font-semibold text-ink">
          Comment ZENITH se situe
        </h2>
        <p className="text-sm leading-relaxed text-ink-muted">
          La comparaison porte sur des <strong className="text-ink">types de sites</strong>,
          pas sur des acteurs nommés : décrire les pratiques d’un concurrent
          supposerait de les sourcer une par une.
        </p>

        <div className="overflow-x-auto rounded-card border border-border-subtle bg-surface">
          <table className="w-full min-w-[520px] border-collapse text-sm">
            <caption className="sr-only">
              Comparaison entre ZENITH, un site de suivi mono-actif et une plateforme d’échange
            </caption>
            <thead>
              <tr className="border-b border-border-subtle text-left text-xs text-ink-muted">
                <th scope="col" className="px-3 py-2.5 font-medium">Fonctionnement</th>
                <th scope="col" className="px-3 py-2.5 text-center font-medium text-brand-strong">
                  ZENITH
                </th>
                <th scope="col" className="px-3 py-2.5 text-center font-medium">
                  Site mono-actif
                </th>
                <th scope="col" className="px-3 py-2.5 text-center font-medium">
                  Plateforme d’échange
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {COMPARISON.map((row) => (
                <tr key={row.feature}>
                  <th scope="row" className="px-3 py-2.5 text-left font-normal text-ink">
                    {row.feature}
                  </th>
                  <Mark value={row.zenith} />
                  <Mark value={row.mono} />
                  <Mark value={row.broker} />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-4 rounded-card border border-border-subtle bg-surface-muted p-6">
        <h2 className="text-lg font-semibold text-ink">Ce que ZENITH n’est pas</h2>
        <ul className="space-y-2 text-sm leading-relaxed text-ink-muted">
          <li>
            <strong className="text-ink">Ni plateforme d’échange, ni courtier.</strong> Aucune
            fonction d’ordre, de dépôt ou de retrait n’existe sur ce site.
          </li>
          <li>
            <strong className="text-ink">Ni conseiller en investissement.</strong> Les
            indicateurs affichés décrivent des données passées. Aucun n’est assorti d’un
            signal d’achat ou de vente.
          </li>
          <li>
            <strong className="text-ink">Ni fournisseur de données.</strong> ZENITH relaie
            des sources tierces, qu’il nomme. Il ne produit aucune cotation.
          </li>
        </ul>
      </section>

      <section className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/bien-demarrer"
          className="rounded-card bg-brand-strong px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-ink"
        >
          Bien démarrer
        </Link>
        <Link
          href="/apprendre"
          className="rounded-card border border-border-subtle px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-brand"
        >
          Apprendre à lire les chiffres
        </Link>
        <Link
          href="/methodologie"
          className="rounded-card border border-border-subtle px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-brand"
        >
          Méthodologie & sources
        </Link>
      </section>
    </div>
  )
}

/** Cellule de comparaison. L'information est portée par le texte, pas par la couleur seule (§9). */
function Mark({ value }: { value: boolean }) {
  return (
    <td className="px-3 py-2.5 text-center">
      {value ? (
        <>
          <Check className="mx-auto h-4 w-4 text-up" aria-hidden="true" />
          <span className="sr-only">Oui</span>
        </>
      ) : (
        <>
          <Minus className="mx-auto h-4 w-4 text-ink-muted" aria-hidden="true" />
          <span className="sr-only">Non</span>
        </>
      )}
    </td>
  )
}
