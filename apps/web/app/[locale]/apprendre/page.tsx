import type { Metadata } from 'next'
import { Link } from '@/i18n/navigation'

import { CoverArt } from '@/components/editorial/CoverArt'
import { LessonBrowser } from '@/components/learn/LessonBrowser'
import { LESSONS, LESSON_TOPICS, levelLabel } from '@/content/apprendre'
import { glossaryByLetter } from '@/content/glossaire'
import { getContent, getSeo } from '@/lib/content'

/**
 * La fiche mise en avant, choisie à la main.
 *
 * Écrite ici plutôt que déduite — « la première du tableau » ferait dépendre la une de
 * l'ordre de déclaration du contenu, et changerait sans que personne l'ait décidé.
 */
const FEATURED_SLUG = 'sans-signaux-imaginaires'

/**
 * Métadonnées DÉRIVÉES DE LA LANGUE, d'où la fonction plutôt que la constante.
 *
 * Un `export const metadata` est évalué une fois au chargement du module : il ne
 * peut pas connaître la locale de la requête, et servait donc un titre français sur
 * les pages anglaises.
 */
export async function generateMetadata(): Promise<Metadata> {
  const fr = await getContent()
  const seo = await getSeo()
  return {
  title: fr.pages.learn,
  description: seo(
    '/apprendre',
    'Comprendre ce que vous regardez : capitalisation, volume, offre, chandeliers, moyennes mobiles et indices de sentiment — expliqués sans jargon.',
  ),
  alternates: { canonical: '/apprendre' },
  }
}

/**
 * Hub pédagogique.
 *
 * Refonte : la page ouvrait directement sur une liste filtrable, sans point
 * d'entrée. Elle propose désormais un parcours conseillé en tête, puis la
 * bibliothèque complète, recherchable et filtrable par niveau.
 *
 * Le parcours est une SÉLECTION ÉDITORIALE, pas un classement de popularité :
 * ZENKUU ne mesure pas l'audience de ses pages, et présenter un ordre comme « le
 * plus lu » serait une donnée inventée (§5).
 *
 * ── IL TRAVERSE LES TROIS NIVEAUX, ET C'EST TOUT L'INTÉRÊT ──────────────────
 *
 * Il s'arrêtait à trois fiches, toutes DÉBUTANTES. C'était un point d'entrée, pas un
 * parcours : arrivé au bout, le lecteur retombait sur une bibliothèque de quatorze
 * fiches sans savoir laquelle prendre ensuite — exactement le problème que ce bloc
 * était censé résoudre, repoussé de trois écrans.
 *
 * Les six étapes montent maintenant en difficulté, et chaque vignette affiche son
 * niveau : trois débutantes, deux intermédiaires, une avancée. La progression se voit
 * donc sans être écrite.
 *
 * L'ORDRE N'EST PAS ARBITRAIRE, chaque étape s'appuie sur la précédente :
 *   1. ce qu'un grand nombre mesure (capitalisation) ;
 *   2. pourquoi il ne se lit pas seul (volume et liquidité) ;
 *   3. ce qu'un graphique ne dit pas (signaux imaginaires) ;
 *   4. comment le lire quand même (chandeliers) ;
 *   5. ce qui se cache derrière la quantité (offre en circulation) ;
 *   6. comment situer un actif dans son marché (dominance).
 *
 * ⚠️ CHAQUE ENTRÉE DOIT EXISTER DANS `LESSONS`. Un slug erroné est filtré en silence
 * par le `.filter(Boolean)` juste en dessous : le parcours perdrait une étape sans
 * qu'aucune erreur ne le signale, et la numérotation se refermerait dessus.
 */
const STARTING_PATH = [
  'capitalisation',
  'volume-et-liquidite',
  'sans-signaux-imaginaires',
  'lire-des-chandeliers',
  'offre-en-circulation',
  'dominance',
]

export default function ApprendrePage() {
  const starters = STARTING_PATH.map((slug) =>
    LESSONS.find((lesson) => lesson.slug === slug),
  ).filter((lesson): lesson is (typeof LESSONS)[number] => Boolean(lesson))

  return (
    <div className="space-y-10 py-6">
      {/*
        BANDEAU COLORÉ en tête, comme la référence — mais aux couleurs de la marque
        et non en aplat criard. Il règle un vrai problème : cette page est un HUB, pas
        un article, et un titre posé sur le fond de page la faisait ressembler à une
        fiche de plus. Le bandeau dit « vous êtes à l'entrée » avant même la lecture.

        Le dégradé est tiré des jetons : il suit donc les deux thèmes sans qu'aucune
        couleur ne soit écrite ici.
      */}
      {/*
        BANDEAU COLORÉ en tête, comme la référence — mais aux couleurs de la marque et
        non en aplat criard. Il règle un vrai problème : cette page est un HUB, pas un
        article, et un titre posé sur le fond de page la faisait ressembler à une fiche
        de plus. Le bandeau dit « vous êtes à l'entrée » avant même la lecture.

        ⚠️ LE TITRE NE PROMET PAS D'ÊTRE « LA MEILLEURE FAÇON D'APPRENDRE ». C'est la
        formule de la référence, et c'est une phrase de vitrine : elle se compare à des
        concurrents plutôt que de dire ce qu'on va lire. Le nôtre annonce l'objet et sa
        limite — ces fiches expliquent, elles ne conseillent pas — ce qui est aussi la
        seule promesse qu'on puisse tenir.
      */}
      <header className="rounded-card bg-gradient-to-br from-brand to-brand-strong px-7 py-8">
        <h1 className="display-lg text-on-brand">Apprendre la crypto et les marchés</h1>
        <p className="mt-2 max-w-2xl text-base leading-relaxed text-on-brand/85">
          Comprendre ce que vous regardez : ce que chaque chiffre mesure réellement,
          et surtout ce qu’il ne mesure pas. Aucune de ces fiches ne recommande d’agir
          — ZENKUU explique des notions, il ne conseille pas.
        </p>
      </header>

      <FeaturedLesson />

      <section className="space-y-3" aria-labelledby="par-ou-commencer">
        {/* « Parcours conseillé » et non plus « Par où commencer » : le bloc ne donne
            plus un point de départ mais une progression complète, du premier grand
            nombre à la lecture d'une part de marché. Le sous-titre nomme les trois
            niveaux traversés, ce que les vignettes montrent déjà une par une —
            l'annoncer d'abord évite d'avoir à les compter pour s'en rendre compte. */}
        <div>
          <h2 id="par-ou-commencer" className="text-sm font-semibold text-ink">
            Parcours conseillé
          </h2>
          <p className="mt-0.5 text-xs text-ink-muted">
            Six fiches dans l’ordre, du débutant à l’avancé.
          </p>
        </div>
        <ol className="grid gap-5 sm:grid-cols-3">
          {starters.map((lesson, index) => (
            <li key={lesson.slug}>
              <Link href={`/apprendre/${lesson.slug}`} className="group flex h-full flex-col gap-2.5">
                <span className="relative block overflow-hidden rounded-card">
                  <CoverArt seed={lesson.slug} label={levelLabel(lesson.level)} />
                  {/* Le NUMÉRO D'ÉTAPE est ce qui distingue ce bloc de la bibliothèque
                      plus bas : ces trois fiches forment un parcours ORDONNÉ, et sans
                      lui rien ne dit qu'il faut les lire dans cet ordre. Posé sur la
                      couverture plutôt qu'à côté du titre, il se lit avant elle. */}
                  <span
                    className="absolute left-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-canvas text-xs font-bold text-brand-strong"
                    aria-hidden="true"
                  >
                    {index + 1}
                  </span>
                </span>
                <span className="text-sm font-semibold leading-snug text-ink group-hover:text-brand-strong">
                  {lesson.title}
                </span>
                <span className="text-xs leading-relaxed text-ink-muted">{lesson.summary}</span>
              </Link>
            </li>
          ))}
        </ol>
        <p className="text-micro text-ink-muted">
          Parcours conseillé par la rédaction — ZENKUU ne mesure pas l’audience de ses
          pages et ne prétend donc pas afficher « les plus lues ».
        </p>
      </section>

      <TopicSections />

      <section className="space-y-4" aria-labelledby="bibliotheque">
        <div>
          <h2 id="bibliotheque" className="text-sm font-semibold text-ink">
            Toute la bibliothèque
          </h2>
          {/* Le navigateur filtrable SUIT les sections par sujet plutôt que de les
              remplacer : les sections répondent à « qu'y a-t-il sur ce thème », le
              filtre à « où est la fiche sur X ». Deux questions, deux outils. */}
          <p className="mt-0.5 text-xs text-ink-muted">
            Les mêmes fiches, filtrables par sujet et par niveau.
          </p>
        </div>
        <LessonBrowser />
      </section>

      <Glossary />

      {/*
        ── LA BANNIÈRE DE FIN, ET CE QU'ELLE N'ANNONCE PAS ────────────────────

        ⚠️ La référence ferme sa page par une bannière d'APPLICATION MOBILE —
        « téléchargez, notez 4,8, App Store et Google Play ». ZENKUU n'a pas
        d'application : reprendre le bloc obligerait soit à inventer des boutons de
        téléchargement qui ne mènent nulle part, soit à annoncer un produit qui
        n'existe pas. Les deux sont exclus (§5).

        Ce qui ferme la page dit donc où aller ensuite, vers des pages réelles : la
        méthode derrière les chiffres, et l'aide sur le site lui-même.
      */}
      <section className="rounded-card bg-gradient-to-br from-brand to-brand-strong px-7 py-7">
        <h2 className="display-sm text-on-brand">Et maintenant ?</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-on-brand/85">
          Ces fiches expliquent des notions de marché. Pour comprendre comment ZENKUU
          collecte et rafraîchit ses données, ou pour une question sur le site lui-même,
          deux pages prennent le relais.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/a-propos"
            className="inline-flex min-h-9 items-center rounded-pill bg-canvas px-4 text-sm font-semibold text-ink transition-opacity hover:opacity-90"
          >
            Notre méthode
          </Link>
          <Link
            href="/aide"
            className="inline-flex min-h-9 items-center rounded-pill border border-on-brand/40 px-4 text-sm font-semibold text-on-brand transition-colors hover:bg-on-brand/10"
          >
            Centre d’aide
          </Link>
        </div>
      </section>
    </div>
  )
}

/**
 * ── « À LA UNE » ──────────────────────────────────────────────────────────────
 *
 * La référence ouvre sa page par un article mis en avant, plus large que les autres.
 * Le principe est bon : une bibliothèque de seize fiches ne dit pas par où entrer, et
 * une carte pleine largeur tranche cette hésitation.
 *
 * ⚠️ LA FICHE EST CHOISIE PAR LA RÉDACTION, et la mention le dit. La référence
 * affiche « Featured » sans préciser sur quoi repose le choix — audience, partenariat,
 * ancienneté. ZENKUU ne mesure pas l'audience de ses pages : prétendre afficher « la
 * plus lue » serait un chiffre inventé.
 */
function FeaturedLesson() {
  const lesson = LESSONS.find((entry) => entry.slug === FEATURED_SLUG)
  if (!lesson) return null

  return (
    <section aria-labelledby="a-la-une" className="space-y-3">
      <h2 id="a-la-une" className="text-sm font-semibold text-ink">
        À la une
      </h2>

      <Link
        href={`/apprendre/${lesson.slug}`}
        className="group grid gap-5 overflow-hidden rounded-card border border-border-subtle bg-surface transition-colors hover:border-brand/40 sm:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]"
      >
        <CoverArt seed={lesson.slug} label={levelLabel(lesson.level)} />
        <div className="flex flex-col justify-center gap-2 px-5 pb-5 sm:py-6 sm:pl-0 sm:pr-6">
          <span className="text-micro font-semibold uppercase tracking-wide text-brand-strong">
            {lesson.topicTitle}
          </span>
          <span className="display-sm leading-tight text-ink group-hover:text-brand-strong">
            {lesson.title}
          </span>
          <span className="text-sm leading-relaxed text-ink-muted">{lesson.summary}</span>
          <span className="text-xs text-ink-muted">
            Niveau {levelLabel(lesson.level).toLowerCase()} · choix de la rédaction
          </span>
        </div>
      </Link>
    </section>
  )
}

/**
 * ── LES SUJETS, UN PAR SECTION ────────────────────────────────────────────────
 *
 * C'est la forme de la référence : un titre de thème, puis ses articles en cartes.
 *
 * ⚠️ AUCUN « VOIR PLUS » NE S'AFFICHE AUJOURD'HUI, et c'est voulu. La référence en pose
 * un sous chaque section parce que les siennes contiennent des dizaines d'articles ;
 * les nôtres en portent trois. Un lien « voir plus » sous trois cartes qui montrent
 * déjà tout ce qu'il y a promet une suite qui n'existe pas. Il apparaîtra de lui-même
 * le jour où un sujet dépassera `TOPIC_PREVIEW` fiches — la condition est écrite, elle
 * attend juste du contenu.
 */
const TOPIC_PREVIEW = 4

function TopicSections() {
  return (
    <div className="space-y-8">
      {LESSON_TOPICS.map((topic) => {
        const shown = topic.lessons.slice(0, TOPIC_PREVIEW)
        const hidden = topic.lessons.length - shown.length

        return (
          <section key={topic.id} className="space-y-3" aria-labelledby={`sujet-${topic.id}`}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id={`sujet-${topic.id}`} className="text-sm font-semibold text-ink">
                {topic.title}
              </h2>
              {hidden > 0 ? (
                <Link
                  href={`/apprendre#${topic.id}`}
                  className="text-xs font-medium text-brand hover:underline"
                >
                  Voir les {topic.lessons.length} fiches
                </Link>
              ) : null}
            </div>

            <ul className="grid gap-5 sm:grid-cols-3">
              {shown.map((lesson) => (
                <li key={lesson.slug}>
                  <Link
                    href={`/apprendre/${lesson.slug}`}
                    className="group flex h-full flex-col gap-2.5"
                  >
                    <CoverArt seed={lesson.slug} label={levelLabel(lesson.level)} />
                    <span className="text-sm font-semibold leading-snug text-ink group-hover:text-brand-strong">
                      {lesson.title}
                    </span>
                    <span className="text-xs leading-relaxed text-ink-muted">{lesson.summary}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}

/**
 * ── LE GLOSSAIRE, RANGÉ PAR LETTRE ────────────────────────────────────────────
 *
 * La référence en fait une page entière avec un index A–Z cliquable en tête. Le nôtre
 * tient sous la bibliothèque : trente-deux entrées ne justifient pas une route à part,
 * et les avoir sur la même page que les fiches permet d'y renvoyer depuis chacune.
 *
 * L'index de tête ne liste QUE les lettres qui portent une entrée. Un alphabet complet
 * dont la moitié des lettres ne mène nulle part fait chercher ce qui n'existe pas.
 */
function Glossary() {
  const groups = glossaryByLetter()

  return (
    <section className="space-y-5 border-t border-border-subtle pt-8" aria-labelledby="glossaire">
      <div>
        <h2 id="glossaire" className="display-sm text-ink">
          Glossaire
        </h2>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-ink-muted">
          Le vocabulaire nécessaire pour lire le site. Chaque définition dit ce que la
          notion mesure — et ce qu’elle ne mesure pas.
        </p>
      </div>

      <nav aria-label="Index du glossaire" className="flex flex-wrap gap-1.5">
        {groups.map((group) => (
          <a
            key={group.letter}
            href={`#glossaire-${group.letter}`}
            className="inline-flex min-h-8 min-w-8 items-center justify-center rounded-control border border-border-subtle px-2 text-sm font-semibold text-ink-muted transition-colors hover:border-brand hover:text-brand-strong"
          >
            {group.letter}
          </a>
        ))}
      </nav>

      <div className="space-y-6">
        {groups.map((group) => (
          <div key={group.letter} id={`glossaire-${group.letter}`} className="space-y-2">
            <h3 className="text-sm font-bold text-brand-strong">{group.letter}</h3>
            <dl className="divide-y divide-border-subtle border-t border-border-subtle">
              {group.entries.map((entry) => (
                <div key={entry.term} className="grid gap-1 py-3 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] sm:gap-5">
                  <dt className="text-sm font-semibold text-ink">
                    {entry.term}
                    {/* `inline-flex min-h-8` : le plancher tactile du site repose sur
                        `min-height`, sans effet sur une boîte en ligne. `audit-responsive`
                        mesurait ces liens à 27 × 17 px — une cible qu'on rate au doigt.
                        Le libellé s'allonge aussi : « fiche » seul ne dit pas où il mène. */}
                    {entry.lesson ? (
                      <>
                        {' '}
                        <Link
                          href={`/apprendre/${entry.lesson}`}
                          className="inline-flex min-h-8 items-center px-1 text-xs font-normal text-brand hover:underline"
                        >
                          voir la fiche
                        </Link>
                      </>
                    ) : null}
                  </dt>
                  <dd className="text-sm leading-relaxed text-ink-muted">{entry.definition}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
    </section>
  )
}
