import type { Metadata } from 'next'
import Link from 'next/link'
import { Check, Minus } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Pourquoi ZENITH',
  description:
    'Multi-actifs, gratuit, en lecture seule et sans donnée inventée : les partis pris qui distinguent ZENITH des plateformes de suivi de marché existantes.',
  alternates: { canonical: '/pourquoi-zenith' },
}

/**
 * Page argumentaire.
 *
 * DÉMONTÉE du gabarit de page d'accueil logicielle qu'elle reprenait, et dont
 * chaque élément était une convention sans contenu :
 *
 *   · le surtitre en petites capitales colorées (« NOS PARTIS PRIS ») au-dessus
 *     d'un titre centré — ouverture standard qui n'apprend rien ;
 *   · le bandeau de quatre garanties icône-au-dessus-du-libellé, qui annonçait en
 *     quatre mots ce que les sections développent juste en dessous ;
 *   · l'alternance gauche/droite pilotée par `index % 2`, c'est-à-dire une symétrie
 *     décidée par la parité d'un compteur et non par le propos ;
 *   · une icône par section, choisie par synonymie (un œil pour « donnée absente »,
 *     un portefeuille pour « aucun ordre »), qui n'ajoutait aucune information ;
 *   · un encadré « preuve » identique à la fin de chaque section, répété au point
 *     de devenir du papier peint.
 *
 * Ce qui reste : du texte aligné à gauche, une hiérarchie portée par la typographie,
 * et les exemples concrets rendus à leur statut de PHRASES plutôt que d'encadrés.
 * Le tableau comparatif est conservé — il porte de l'information, lui, et une grille
 * est la bonne forme pour comparer. Il oppose des CATÉGORIES de sites, jamais un
 * concurrent nommé : décrire nommément les pratiques d'un tiers supposerait de les
 * sourcer une par une.
 */

const SECTIONS = [
  {
    title: 'Toutes les classes d’actifs, une seule grille de lecture',
    body: [
      'Cryptomonnaies, devises, actions, ETF, matières premières et indices vivent au même endroit, avec les mêmes colonnes, les mêmes graphiques et les mêmes conventions d’affichage.',
      'Suivre un patrimoine diversifié ne devrait pas imposer d’ouvrir trois sites et d’apprendre trois façons de présenter une variation. Une variation sur 24 heures se lit de la même manière sur une action et sur une cryptomonnaie.',
    ],
    proof: 'Six classes d’actifs, une seule interface de tableau et un seul composant de graphique.',
  },
  {
    title: 'Une donnée absente reste absente',
    body: [
      'Quand une source ne publie pas une information, elle apparaît comme indisponible. Pas d’estimation, pas de valeur de remplissage, pas de moyenne calculée en douce pour combler une colonne.',
      'La règle est appliquée par la structure du code, et non laissée à la vigilance de qui l’écrit : une source non configurée ne peut techniquement pas produire de nombre, elle produit un état vide que l’affichage est obligé de traiter.',
    ],
    proof:
      'La vue en chandeliers disparaît sur les devises : la BCE ne publie qu’un taux de référence par jour ouvré, sans ouverture ni plus haut.',
  },
  {
    title: 'Aucun intérêt à ce que vous passiez un ordre',
    body: [
      'ZENITH n’exécute rien et ne détient rien. Vous ne trouverez nulle part un bouton d’achat, de vente, de dépôt, de retrait ou de connexion à un portefeuille.',
      'Ce positionnement a une conséquence directe sur ce que vous lisez : le site ne gagne rien à ce que vous achetiez ou vendiez, il n’a donc aucune raison de mettre en avant un actif plutôt qu’un autre.',
    ],
    proof: 'Aucune page du site ne comporte de fonction de transaction, sur aucune classe d’actif.',
  },
  {
    title: 'Des limites annoncées plutôt que masquées',
    body: [
      'Les cours ne sont pas en temps réel, et le site l’écrit. Les classements de plus fortes hausses portent sur un univers précis, et le site le précise sous le tableau.',
      'Une méthode connue vaut mieux qu’une précision suggérée qui n’existe pas. C’est aussi ce qui permet de vérifier un chiffre : on sait quoi comparer, et à quelle heure.',
    ],
    proof: 'Chaque module affiche sa source et l’horodatage de la dernière valeur reçue.',
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
    <div className="mx-auto max-w-3xl space-y-12 py-6">
      {/* Alignement à GAUCHE, comme le reste du site. Un titre centré au-dessus
          d'un paragraphe centré est une mise en page d'affiche, pas d'article :
          l'œil perd le bord d'appel qui lui sert de repère d'une ligne à l'autre. */}
      <header className="space-y-4">
        <h1 className="display-xl text-ink">Pourquoi ZENITH</h1>
        <p className="max-w-2xl text-lg leading-relaxed text-ink-muted">
          La plupart des plateformes de suivi de marché sont adossées à un service
          qu’elles cherchent à vous vendre. ZENITH n’a rien à vous vendre : c’est un
          site d’information, et cela change ce qu’il peut se permettre d’afficher.
        </p>
      </header>

      <div className="space-y-10">
        {SECTIONS.map((section) => (
          <section key={section.title} className="space-y-3">
            <h2 className="display-sm text-ink">{section.title}</h2>

            {section.body.map((paragraph, index) => (
              <p key={index} className="max-w-2xl text-base leading-relaxed text-ink-muted">
                {paragraph}
              </p>
            ))}

            {/* L'exemple concret redevient une phrase. En encadré répété quatre
                fois, il cessait d'être lu — un filet suffit à le distinguer du
                développement qui précède. */}
            <p className="max-w-2xl border-l-2 border-border-subtle pl-4 text-sm leading-relaxed text-ink-muted">
              {section.proof}
            </p>
          </section>
        ))}
      </div>

      <section className="space-y-3" aria-labelledby="comparatif">
        <h2 id="comparatif" className="display-sm text-ink">
          Comment ZENITH se situe
        </h2>
        <p className="max-w-2xl text-base leading-relaxed text-ink-muted">
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
                <th scope="col" className="px-3 py-2.5 text-center font-medium text-ink">
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

      <section className="space-y-3">
        <h2 className="display-sm text-ink">Ce que ZENITH n’est pas</h2>
        <ul className="max-w-2xl space-y-2.5 text-base leading-relaxed text-ink-muted">
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

      {/* Une seule action mise en avant, et deux renvois en texte. Trois boutons de
          même poids centrés en bas de page ne hiérarchisent rien : ils demandent au
          lecteur de choisir à la place de l'auteur. */}
      <section className="flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-border-subtle pt-8">
        <Link
          href="/bien-demarrer"
          className="rounded-card bg-brand px-5 py-2.5 text-sm font-medium text-on-brand transition-colors hover:bg-brand-strong"
        >
          Bien démarrer
        </Link>
        <Link href="/methodologie" className="text-sm text-brand hover:underline">
          Méthodologie &amp; sources
        </Link>
        <Link href="/apprendre" className="text-sm text-brand hover:underline">
          Apprendre à lire les chiffres
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
