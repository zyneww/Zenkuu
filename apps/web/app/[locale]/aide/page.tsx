import type { Metadata } from 'next'
import { BookOpen, FlaskConical, Newspaper } from 'lucide-react'

import { InstagramGlyph } from '@/components/BrandIcons'
import { Link } from '@/i18n/navigation'
import { HelpCategoryGrid } from '@/components/help/HelpCategoryGrid'
import { HelpSearch } from '@/components/help/HelpSearch'
import { HELP_ARTICLES, HELP_STARTING_POINTS } from '@/content/aide'
import { RELEASES } from '@/content/nouveautes'
import { getContent, getPhrase, getSeo } from '@/lib/content'

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
    title: fr.pages.help,
    description: seo(
      '/aide',
      'Questions fréquentes sur les données de ZENKUU, leur fraîcheur, les graphiques et les limites de ce que le site affiche.',
    ),
    alternates: { canonical: '/aide' },
  }
}

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * CENTRE D'AIDE — LA STRUCTURE DE help.fiverr.com
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Quatre étages, dans cet ordre, et c'est celui du modèle :
 *
 *   1. un BANDEAU pleine largeur, teinté, portant une question en gros et un champ
 *      de recherche large, avec quelques entrées suggérées dessous ;
 *   2. la GRILLE DE RUBRIQUES sous des onglets de public — chaque colonne montre ses
 *      titres d'articles en clair, pas un compteur ;
 *   3. une SECONDE BANDE teintée, « À lire en premier », en deux colonnes de liens ;
 *   4. une rangée de CARTES vers ce qui n'est pas de l'aide — blog, actualités,
 *      méthodologie, compte social.
 *
 * ── LES DEUX BANDES SONT PLEINE LARGEUR, ET LA PAGE NE L'EST PAS ────────────
 *
 * C'est ce qui donne au modèle son rythme : deux aplats qui traversent l'écran
 * encadrent un contenu qui, lui, reste dans la colonne. Le gabarit du site pose déjà
 * `.shell` autour du contenu des pages ; les bandes en sortent par une marge négative
 * calculée sur la gouttière, puis remettent un `.shell` à l'intérieur pour que leur
 * TEXTE reste aligné sur le reste. Voir `.bleed` dans globals.css.
 *
 * ── CE QUI N'EST PAS REPRIS DU MODÈLE, ET POURQUOI ──────────────────────────
 *
 * Sa barre supérieure propre (« help. » + « Go to Fiverr » + « My support requests »).
 * ZENKUU n'a pas de centre d'aide sur un sous-domaine séparé : cette page vit sous la
 * navigation du site, et lui superposer une seconde barre ferait deux navigations
 * concurrentes sur le même écran.
 *
 * De même, aucun bouton « Contacter le support » : il n'y a pas de guichet
 * d'assistance derrière. La bande finale renvoie donc vers la Méthodologie, qui est
 * la vraie réponse à « je n'ai pas trouvé » sur un site de données (§5).
 */
export default async function AidePage() {
  const t = await getPhrase()

  const starters = HELP_STARTING_POINTS.map((slug) =>
    HELP_ARTICLES.find((article) => article.slug === slug),
  ).filter((article): article is (typeof HELP_ARTICLES)[number] => Boolean(article))

  return (
    <div className="space-y-14 pb-4">
      {/* ══ 1. LE BANDEAU DE RECHERCHE ══════════════════════════════════════ */}
      <section className="bleed bg-surface-muted">
        <div className="shell flex flex-col items-center gap-6 py-14 text-center">
          <h1 className="display-lg max-w-2xl text-ink">
            {t('Comment pouvons-nous vous aider ?')}
          </h1>

          {/* `max-w-2xl` : le champ du modèle est large mais pas pleine largeur — un
              champ de deux mille pixels fait perdre le curseur de vue quand on tape à
              gauche et que le bouton est à droite. */}
          <div className="w-full max-w-2xl">
            <HelpSearch
              suggestions={['devise', 'graphique', 'liste de suivi', 'source', 'conseil']}
            />
          </div>
        </div>
      </section>

      {/* ══ 2. LES RUBRIQUES ════════════════════════════════════════════════ */}
      <HelpCategoryGrid />

      {/* ══ 3. À LIRE EN PREMIER ════════════════════════════════════════════
          Sélection ÉDITORIALE, et le titre le dit. « Les plus consultés »
          supposerait une mesure d'audience que ZENKUU ne fait pas (§5). */}
      <section className="bleed bg-surface-muted" aria-labelledby="a-lire-en-premier">
        <div className="shell py-12">
          <h2 id="a-lire-en-premier" className="display-sm text-ink">
            {t('À lire en premier')}
          </h2>

          <ul className="mt-6 grid gap-x-10 gap-y-3 sm:grid-cols-2">
            {starters.map((article) => (
              <li key={article.slug}>
                <Link
                  href={`/aide/${article.slug}`}
                  className="text-sm text-ink transition-colors duration-150 hover:text-brand"
                >
                  {t(article.title)}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ══ 4. ANNONCES ═════════════════════════════════════════════════════
          La référence pose ici une section « Announcements » — listings, maintenances,
          promotions.

          ⚠️ ZENKUU N'A RIEN DE TOUT CELA À ANNONCER : pas de cotation à ouvrir, pas de
          maintenance de plateforme, pas d'offre. La seule chose qu'on puisse
          honnêtement mettre sous ce titre est le journal des LIVRAISONS — ce qui a
          changé sur le site. Les entrées viennent de la même table que la page
          Nouveautés, et non d'une copie qui divergerait à la première mise à jour. */}
      <section aria-labelledby="annonces">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 id="annonces" className="display-sm text-ink">
            {t('Annonces')}
          </h2>
          <Link href="/nouveautes" className="text-sm text-ink hover:underline">
            {t('Tout le journal')}
          </Link>
        </div>

        <ul className="mt-6 divide-y divide-border-subtle border-y border-border-subtle">
          {RELEASES.slice(0, 3).map((release, index) => (
            <li key={index}>
              <Link
                href="/nouveautes"
                className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3 transition-colors duration-150 hover:text-brand"
              >
                <span className="text-sm font-medium text-ink">{t(release.title)}</span>
                <time dateTime={release.date} className="shrink-0 text-xs text-ink-muted">
                  {t(release.label)}
                </time>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* ══ 5. AILLEURS SUR LE SITE ═════════════════════════════════════════
          La « Community » du modèle, et les quatre destinations existent réellement.
          Aucune n'est un lien mort ni une page à venir. */}
      <section aria-labelledby="ailleurs">
        <h2 id="ailleurs" className="display-sm text-ink">
          {t('Ailleurs sur le site')}
        </h2>

        <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {ELSEWHERE.map((entry) => {
            const Icon = entry.icon
            const body = (
              <>
                {/* Pas de `strokeWidth` ici, contrairement à la grille de rubriques :
                    le glyphe Instagram est un tracé PLEIN dessiné dans le dépôt, pas
                    une icône lucide, et il n'a donc pas d'épaisseur de trait. */}
                <Icon className="h-5 w-5 text-ink" aria-hidden="true" />
                <span className="mt-3 block text-sm font-semibold text-ink">{t(entry.title)}</span>
                <span className="mt-1 block text-xs leading-relaxed text-ink-muted">
                  {t(entry.description)}
                </span>
              </>
            )

            return (
              <li key={entry.href}>
                {entry.external ? (
                  <a
                    href={entry.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block h-full rounded-card border border-border-subtle bg-surface p-4 transition-colors duration-150 hover:border-brand"
                  >
                    {body}
                  </a>
                ) : (
                  <Link
                    href={entry.href}
                    className="block h-full rounded-card border border-border-subtle bg-surface p-4 transition-colors duration-150 hover:border-brand"
                  >
                    {body}
                  </Link>
                )}
              </li>
            )
          })}
        </ul>
      </section>

      {/* ══ 6. UN PROBLÈME PERSISTE ? ═══════════════════════════════════════
          Le bloc « Still have problems? » de la référence, qui ouvre chez elle un
          formulaire de ticket et un chat d'assistance.

          ⚠️ IL N'Y A PAS DE GUICHET DERRIÈRE, et le bloc le dit plutôt que de le
          laisser découvrir après un clic. ZENKUU est un site de consultation sans
          compte obligatoire : personne n'attend de ticket. Ce qu'on peut offrir est
          réel — la méthode qui explique d'où viennent les chiffres, et un compte
          social ouvert où l'on répond.

          Annoncer un support inexistant serait la promesse la plus coûteuse de cette
          page : elle ne se découvre qu'au moment où quelqu'un a réellement un
          problème. */}
      <section className="bleed bg-surface-muted" aria-labelledby="probleme-persiste">
        <div className="shell flex flex-col items-center gap-4 py-12 text-center">
          <h2 id="probleme-persiste" className="display-sm text-ink">
            {t('Un problème persiste ?')}
          </h2>
          <p className="max-w-2xl text-sm leading-relaxed text-ink-muted">
            {t(
              'ZENKUU n’a pas de service d’assistance : c’est un site de consultation, sans compte obligatoire ni transaction. Si un chiffre vous semble faux, la page « À propos » explique d’où il vient et comment il est rafraîchi — c’est presque toujours là que se trouve la réponse. Sinon, le compte Instagram est ouvert.',
            )}
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/a-propos"
              className="inline-flex min-h-9 items-center rounded-pill bg-brand px-4 text-sm font-semibold text-on-brand transition-opacity hover:opacity-90"
            >
              {t('Comprendre nos données')}
            </Link>
            <a
              href="https://www.instagram.com/getzenkuu/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-9 items-center rounded-pill border border-border-subtle px-4 text-sm font-semibold text-ink transition-colors hover:bg-surface"
            >
              {t('Nous écrire sur Instagram')}
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}

/**
 * Les quatre destinations de la dernière rangée.
 *
 * Déclarées en table plutôt qu'écrites quatre fois dans le rendu : la seule chose qui
 * change d'une carte à l'autre est le contenu, et une table rend impossible d'en
 * déclarer une sans son pictogramme ou sans sa phrase.
 */
const ELSEWHERE: readonly {
  href: string
  /** Lien SORTANT : nouvelle fenêtre et `rel="noopener"`. Absent = route interne. */
  external?: boolean
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' }>
  title: string
  description: string
}[] = [
  {
    /* La carte visait `/methodologie`, supprimée sur demande explicite. Elle pointe
       désormais vers « À propos », qui porte ce que cette page disait de tenable sans
       elle : le positionnement du site et ses limites déclarées. */
    href: '/a-propos',
    icon: FlaskConical,
    title: 'À propos de ZENKUU',
    description:
      'Ce que le site fait, ce qu’il ne fait pas, et les limites que nous écrivons plutôt que de les dissimuler.',
  },
  {
    href: '/apprendre',
    icon: BookOpen,
    title: 'Apprendre',
    description: 'Les notions de marché expliquées, pour lire les pages sans dictionnaire.',
  },
  {
    href: '/actualites',
    icon: Newspaper,
    title: 'Actualités',
    description: 'Le fil des publications suivies par le site, par classe d’actif.',
  },
  {
    href: 'https://www.instagram.com/getzenkuu/',
    external: true,
    icon: InstagramGlyph,
    title: 'Instagram',
    description: 'Le seul compte social ouvert à ce jour.',
  },
]
