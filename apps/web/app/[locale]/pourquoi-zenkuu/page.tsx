import type { Metadata } from 'next'
import { Link } from '@/i18n/navigation'
import { ButtonLink } from '@/components/ui/ButtonLink'
import { Check, Minus } from 'lucide-react'
import { emphasise } from '@/components/locale/emphasise'
import { getPhrase, getSeo } from '@/lib/content'

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
    title: t('Pourquoi ZENKUU'),
    description: seo(
      '/pourquoi-zenkuu',
      'Multi-actifs, gratuit, en lecture seule et sans donnée inventée : les partis pris qui distinguent ZENKUU des plateformes de suivi de marché existantes.',
    ),
    alternates: { canonical: '/pourquoi-zenkuu' },
  }
}

/**
 * Page argumentaire.
 *
 * ── UN ALLER-RETOUR, ET IL FAUT LE DIRE ───────────────────────────────────────
 *
 * Cette page reprenait un gabarit de page d'accueil logicielle. Il a été DÉMONTÉ,
 * parce que chacun de ses éléments était une convention sans contenu : surtitre en
 * petites capitales colorées, bandeau de quatre garanties qui annonçait en quatre
 * mots ce que les sections développaient juste dessous, alternance gauche/droite
 * pilotée par `index % 2` — une symétrie décidée par la parité d'un compteur —, une
 * icône par section choisie par synonymie, un encadré « preuve » répété jusqu'à
 * devenir du papier peint.
 *
 * La forme revient aujourd'hui, calée sur kraken.com/why-kraken : titre centré très
 * large, puis GRILLE DE CARTES. Ce n'est pas un reniement, parce que ce qui était
 * reproché n'était pas la forme mais le VIDE qu'elle habillait. Une grille de cartes
 * dont chaque carte porte un parti pris, son développement et son exemple vérifiable
 * n'est pas le même objet qu'une grille de six icônes et six slogans.
 *
 * Ce qui ne revient PAS, et la liste compte autant que ce qui revient : pas de
 * surtitre décoratif, pas d'icône par carte, pas de bandeau de garanties, pas
 * d'alternance mécanique. La page emprunte une mise en page, pas une rhétorique.
 *
 * ── POURQUOI LE CENTRAGE EST ACCEPTÉ ICI ET NULLE PART AILLEURS ───────────────
 *
 * Un titre centré au-dessus d'un paragraphe centré est une mise en page d'AFFICHE :
 * l'œil y perd le bord d'appel qui lui sert de repère d'une ligne à l'autre. C'est
 * disqualifiant sur un article, et c'est précisément ce qu'on veut sur les trois
 * premières lignes d'une page dont le rôle est de POSER une position avant de
 * l'argumenter. Le centrage s'arrête donc au héros ; tout ce qui se lit reste aligné
 * à gauche.
 *
 * Le tableau comparatif est conservé — il porte de l'information, et une grille est
 * la bonne forme pour comparer. Il oppose des CATÉGORIES de sites, jamais un
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
      'ZENKUU n’exécute rien et ne détient rien. Vous ne trouverez nulle part un bouton d’achat, de vente, de dépôt, de retrait ou de connexion à un portefeuille.',
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
  { feature: 'Plusieurs classes d’actifs au même endroit', zenkuu: true, mono: false, broker: true },
  { feature: 'Consultation sans compte', zenkuu: true, mono: true, broker: false },
  { feature: 'Aucune fonction de transaction', zenkuu: true, mono: true, broker: false },
  { feature: 'Sources citées module par module', zenkuu: true, mono: false, broker: false },
  { feature: 'Donnée manquante signalée comme telle', zenkuu: true, mono: false, broker: false },
]

export default async function PourquoiZenkuuPage() {
  const t = await getPhrase()
  return (
    <div className="mx-auto max-w-5xl space-y-14 py-6">
      {/* ── HÉROS ─────────────────────────────────────────────────────────────
          Centré, et seul à l'être. Voir l'en-tête du fichier : le centrage sert à
          POSER une position, il dessert tout ce qui se lit ensuite. */}
      <header className="mx-auto max-w-3xl space-y-5 text-center">
        <h1 className="display-xl text-ink">{t('Pourquoi ZENKUU')}</h1>
        <p className="text-lg leading-relaxed text-ink-muted">{t('La plupart des plateformes de suivi de marché sont adossées à un service qu’elles cherchent à vous vendre. ZENKUU n’a rien à vous vendre : c’est un site d’information, et cela change ce qu’il peut se permettre d’afficher.')}</p>

        <div className="flex flex-wrap justify-center gap-3 pt-1">
          <ButtonLink
            href="/crypto"
          >{t('Explorer les marchés')}</ButtonLink>
          <ButtonLink
            href="/a-propos"
            variant="outline"
            size="lg"
          >{t('À propos de ZENKUU')}</ButtonLink>
        </div>
      </header>

      {/* ── LES PARTIS PRIS, EN GRILLE ────────────────────────────────────────

          Deux colonnes et non trois : chaque carte porte deux paragraphes et un
          exemple, ce qui n'entre pas dans un tiers de largeur sans devenir une
          colonne de six mots par ligne. La référence tient en trois colonnes parce
          que ses cartes tiennent en une phrase.

          L'étirement des cellules est LAISSÉ ACTIF, à l'inverse de l'accueil :
          quatre cartes bordées qui finiraient à des hauteurs différentes se liraient
          comme un défaut d'alignement, et une carte de texte n'a rien qui puisse
          déborder d'une hauteur imposée. C'est l'exemple exact où `items-start`
          serait le mauvais réflexe. */}
      <section aria-labelledby="partis-pris" className="space-y-4">
        <h2 id="partis-pris" className="display-sm text-center text-ink">{t('Quatre partis pris, et ce qui les rend vérifiables')}</h2>

        <div className="grid gap-4 md:grid-cols-2">
          {SECTIONS.map((section) => (
            <article
              key={t(section.title)}
              className="flex flex-col gap-3 rounded-card border border-border-subtle bg-surface p-6 transition-colors duration-150 hover:border-ink-muted/40"
            >
              <h3 className="text-lg font-semibold leading-snug text-ink">{t(section.title)}</h3>

              {section.body.map((paragraph, index) => (
                <p key={index} className="text-sm leading-relaxed text-ink-muted">
                  {t(paragraph)}
                </p>
              ))}

              {/* L'exemple reste une PHRASE au filet, et non l'encadré coloré qu'il
                  était : répété quatre fois, un encadré cesse d'être lu. Poussé en
                  bas de carte par `mt-auto`, il occupe la même place dans les quatre
                  — ce qui le rend repérable sans le rendre criard. */}
              <p className="mt-auto border-l-2 border-brand/40 pl-3 text-xs leading-relaxed text-ink-muted">
                {t(section.proof)}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-3" aria-labelledby="comparatif">
        <h2 id="comparatif" className="display-sm text-ink">
          {t('Comment ZENKUU se situe')}
        </h2>
        <p className="max-w-2xl text-base leading-relaxed text-ink-muted">
          {emphasise(
            t(
              'La comparaison porte sur des **types de sites**, pas sur des acteurs nommés : décrire les pratiques d’un concurrent supposerait de les sourcer une par une.',
            ),
          )}
        </p>

        <div className="overflow-x-auto rounded-card border border-border-subtle bg-surface">
          {/* Le plancher de 520 pixels tombe sous `sm`. Aucune colonne ne peut partir :
              une comparaison à laquelle il manque un terme n'en est plus une. Les trois
              colonnes de verdicts ne portent qu'un signe, elles se resserrent sans
              perte ; seuls les en-têtes reviennent à la ligne. */}
          <table className="w-full border-collapse text-sm sm:min-w-[520px]">
            <caption className="sr-only">{t('Comparaison entre ZENKUU, un site de suivi mono-actif et une plateforme d’échange')}</caption>
            <thead>
              <tr className="border-b border-border-subtle text-left text-xs text-ink-muted">
                <th scope="col" className="px-3 py-2.5 font-medium">
                  {t('Fonctionnement')}
                </th>
                <th scope="col" className="px-3 py-2.5 text-center font-medium text-ink">
                  ZENKUU
                </th>
                <th scope="col" className="px-3 py-2.5 text-center font-medium">
                  {t('Site mono-actif')}
                </th>
                <th scope="col" className="px-3 py-2.5 text-center font-medium">{t('Plateforme d’échange')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {COMPARISON.map((row) => (
                <tr key={row.feature}>
                  <th scope="row" className="px-3 py-2.5 text-left font-normal text-ink">
                    {t(row.feature)}
                  </th>
                  <Mark value={row.zenkuu} />
                  <Mark value={row.mono} />
                  <Mark value={row.broker} />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="display-sm text-ink">{t('Ce que ZENKUU n’est pas')}</h2>
        <ul className="max-w-2xl space-y-2.5 text-base leading-relaxed text-ink-muted">
          <li>
            <strong className="text-ink">{t('Ni plateforme d’échange, ni courtier.')}</strong>{t('Aucune fonction d’ordre, de dépôt ou de retrait n’existe sur ce site.')}</li>
          <li>
            {emphasise(
              t(
                '**Ni conseiller en investissement.** Les indicateurs affichés décrivent des données passées. Aucun n’est assorti d’un signal d’achat ou de vente.',
              ),
            )}
          </li>
          <li>
            <strong className="text-ink">{t('Ni fournisseur de données.')}</strong>{t('ZENKUU relaie des sources tierces, qu’il nomme. Il ne produit aucune cotation.')}</li>
        </ul>
      </section>

      {/*
        PIED DE PAGE D'ARGUMENTAIRE — une action, et une seule.

        Il portait trois boutons de même poids : le lecteur devait choisir à la place
        de l'auteur. Il n'en reste qu'un, et il ne redit PAS ceux du héros —
        « Explorer les marchés » et « Méthodologie » sont déjà là-haut. Quelqu'un qui
        a lu la page entière n'a pas besoin qu'on lui repropose l'entrée : il a
        besoin de la marche suivante.
      */}
      <section className="flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-border-subtle pt-8">
        <ButtonLink
          href="/bien-demarrer"
        >{t('Bien démarrer')}</ButtonLink>
        <Link href="/apprendre" className="text-sm text-ink hover:underline">{t('Apprendre à lire les chiffres')}</Link>
      </section>
    </div>
  )
}

/** Cellule de comparaison. L'information est portée par le texte, pas par la couleur seule (§9). */
async function Mark({ value }: { value: boolean }) {
  const t = await getPhrase()
  return (
    <td className="px-3 py-2.5 text-center">
      {value ? (
        <>
          <Check className="mx-auto h-4 w-4 text-up" aria-hidden="true" />
          <span className="sr-only">{t('Oui')}</span>
        </>
      ) : (
        <>
          <Minus className="mx-auto h-4 w-4 text-ink-muted" aria-hidden="true" />
          <span className="sr-only">{t('Non')}</span>
        </>
      )}
    </td>
  )
}
