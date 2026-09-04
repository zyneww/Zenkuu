import type { Metadata } from 'next'
import { Link } from '@/i18n/navigation'

import { KeyFigures } from '@/components/about/KeyFigures'
import { emphasise, weave } from '@/components/locale/emphasise'
import { setRequestLocale } from 'next-intl/server'

import { getContent, getPhrase, getSeo } from '@/lib/content'
import { pageAlternates } from '@/lib/site'

/**
 * Métadonnées DÉRIVÉES DE LA LANGUE, d'où la fonction plutôt que la constante.
 *
 * Un `export const metadata` est évalué une fois au chargement du module : il ne
 * peut pas connaître la locale de la requête, et servait donc un titre français sur
 * les pages anglaises.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  setRequestLocale(locale)

  const fr = await getContent()
  const seo = await getSeo()
  return {
  title: fr.pages.about,
  description: seo(
    '/a-propos',
    'ZENKUU est une plateforme d’analyse de marché multi-actifs, en lecture seule : ni courtier, ni plateforme d’échange, ni conseiller en investissement.',
  ),
  alternates: await pageAlternates('/a-propos'),
  }
}

/**
 * Page « À propos ».
 *
 * Refonte : la page enchaînait des paragraphes de même poids. Elle suit désormais la
 * progression d'une page institutionnelle — mission en tête, principes, chiffres
 * clés, ce que le site n'est pas, puis points d'entrée.
 *
 * Deux écarts assumés par rapport à la référence :
 *  • pas de section équipe. Elle supposerait de nommer de vraies personnes ; en
 *    inventer serait trompeur pour le visiteur, et ZENKUU n'a pas d'équipe publique
 *    à présenter à ce stade ;
 *  • les chiffres clés décrivent le PRODUIT et non l'entreprise — voir la note dans
 *    `KeyFigures`.
 */

/**
 * Les trois principes, SANS icône ni carte.
 *
 * Chacun portait une icône choisie par synonymie — des calques pour « une grille de
 * lecture », un bouclier pour « donnée absente », une boussole pour « aucun
 * intérêt » — qui n'ajoutait aucune information et signalait surtout que la page
 * avait été remplie à partir d'un gabarit. Trois cartes bordées de même poids
 * aplatissaient par ailleurs la hiérarchie : le texte fait le travail seul.
 */
const PRINCIPLES = [
  {
    title: 'Une grille de lecture, toutes les classes d’actifs',
    body: 'Les mêmes colonnes, les mêmes graphiques et les mêmes conventions d’affichage, qu’il s’agisse d’une cryptomonnaie, d’une action ou d’une paire de devises. Comparer ne devrait pas imposer de changer de site ni de repères.',
  },
  {
    title: 'Une donnée absente reste absente',
    body: 'Quand une source ne publie pas une information, elle apparaît comme indisponible. Aucune estimation, aucune valeur de remplissage. La règle est portée par la structure du code, pas laissée à la vigilance de qui l’écrit.',
  },
  {
    title: 'Aucun intérêt à ce que vous agissiez',
    body: 'ZENKUU n’exécute pas d’ordres et ne détient pas de fonds. Le site ne gagne rien à ce que vous achetiez ou vendiez quoi que ce soit, ce qui lui permet d’afficher les chiffres sans les orienter.',
  },
]

export default async function AProposPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  /*
   * ── CE QUI REND CETTE PAGE STATIQUE ─────────────────────────────────────────
   *
   * `getPhrase()` passe par `getLocale()` de next-intl, qui LIT LES EN-TÊTES de la
   * requête faute de savoir d'où vient la locale. Une page qui lit les en-têtes ne
   * peut pas être pré-rendue : elle bascule en rendu à la demande, et le site entier
   * y est passé sans que rien ne le signale — cinquante-trois pages, y compris
   * celle-ci qui n'affiche que du texte.
   *
   * `setRequestLocale` coupe cette lecture : la locale vient du SEGMENT D'URL, que
   * `generateStaticParams` du layout énumère à la construction. L'appel doit précéder
   * toute lecture de contenu, sinon `getLocale()` a déjà consulté les en-têtes.
   */
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getPhrase()
  return (
    <div className="mx-auto max-w-4xl space-y-12 py-6">
      {/* Sans surtitre. « Notre mission » en petites capitales colorées au-dessus du
          titre est une convention de page d'accueil logicielle : elle occupe une
          ligne pour annoncer que la ligne suivante est un titre. */}
      <header className="space-y-4">
        <h1 className="display-xl text-ink">{t('Rendre lisible n’importe quel marché, au même endroit')}</h1>
        <p className="max-w-2xl text-lg leading-relaxed text-ink-muted">{t('ZENKUU réunit les cryptomonnaies, les devises, les actions, les ETF, les matières premières et les indices — avec la même profondeur de lecture pour chacun, et sans jamais vous demander d’ouvrir un compte pour consulter un cours.')}</p>
      </header>

      <section className="max-w-2xl space-y-6">
        {PRINCIPLES.map((principle) => (
          <article key={t(principle.title)} className="space-y-1.5">
            <h2 className="text-base font-semibold leading-snug text-ink">{t(principle.title)}</h2>
            <p className="text-base leading-relaxed text-ink-muted">{t(principle.body)}</p>
          </article>
        ))}
      </section>

      <KeyFigures />

      <Section title={t('Pourquoi ce site existe')}>
        <p>{t('La plupart des sites de suivi de marché sont mono-actif : l’un couvre la crypto, l’autre la bourse, un troisième les devises. Suivre un patrimoine diversifié impose donc d’ouvrir trois onglets et de jongler entre trois conventions d’affichage. ZENKUU part de l’intuition inverse — une seule grille de lecture, appliquée à toutes les classes d’actifs.')}</p>
      </Section>

      <Section title={t('Ce que nous ne faisons pas')}>
        <ul className="space-y-2">
          <li>
            <strong className="text-ink">{t('Aucune exécution d’ordre.')}</strong>{t('Vous ne trouverez nulle part sur ce site un bouton d’achat, de vente ou de dépôt. Ce n’est pas une fonctionnalité manquante, c’est un choix de départ.')}</li>
          <li>
            <strong className="text-ink">{t('Aucune conservation de fonds.')}</strong>{t('ZENKUU ne se connecte à aucun portefeuille ni à aucun courtier.')}</li>
          <li>
            {emphasise(
              t(
                '**Aucun conseil en investissement.** Nous affichons des données et des indicateurs publiés par des tiers. Rien de ce que vous lisez ici ne constitue une recommandation personnalisée.',
              ),
            )}
          </li>
          <li>
            {weave(
              /* Le renvoi vers `/methodologie` est tombé avec la page (demande
                 explicite). La promesse, elle, reste écrite ici — c'est désormais
                 cette page qui la porte, et les sources sont nommées dans la barre
                 légale du pied. */
              t('**Aucune donnée inventée.** Une valeur que nos sources ne publient pas est affichée comme absente, jamais complétée ni estimée.'),
              (href, label, key) => (
                <Link
                  key={key}
                  href={href}
                  className="underline underline-offset-2 hover:text-brand"
                >
                  {label}
                </Link>
              ),
            )}
          </li>
        </ul>
      </Section>

      <Section title={t('Comment nous nous finançons')}>
        <p>{t('Le site est gratuit à l’usage. Il pourra à terme être financé par de la publicité display, un abonnement optionnel sans publicité, et des liens d’affiliation vers des plateformes tierces clairement identifiés comme tels. Aucun de ces leviers ne modifiera les chiffres affichés ni l’ordre des classements.')}</p>
      </Section>

      <Section title={t('Langue et devise')}>
        <p>{t('ZENKUU est publié en français, avec l’euro comme devise de référence. Quand une conversion est appliquée, la devise d’origine et la date du taux utilisé sont affichées à côté du montant, afin qu’un chiffre converti ne puisse jamais être confondu avec un cours réellement coté.')}</p>
      </Section>

      {/* Deux renvois en texte, sur un filet. Un encadré coloré contenant une
          phrase d'accroche et deux boutons de même poids est un pied de page
          promotionnel : ici, ce sont deux liens vers deux pages, rien de plus. */}
      <section className="flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-border-subtle pt-8">
        <Link href="/pourquoi-zenkuu" className="text-sm text-ink hover:underline">{t('Les partis pris, en détail')}</Link>
        <Link href="/aide" className="text-sm text-ink hover:underline">{t('Questions fréquentes')}</Link>
      </section>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="max-w-2xl space-y-3">
      <h2 className="display-sm text-ink">{title}</h2>
      <div className="space-y-3 text-base leading-relaxed text-ink-muted">{children}</div>
    </section>
  )
}
