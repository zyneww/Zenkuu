import type { Metadata } from 'next'
import { DM_Mono, Figtree } from 'next/font/google'
import { notFound } from 'next/navigation'
import { NextIntlClientProvider, hasLocale } from 'next-intl'
import { getMessages, setRequestLocale } from 'next-intl/server'

import { routing } from '@/i18n/routing'
import { isRtl } from '@/components/settings/languages'

import { getExchangeRates } from '@zenkuu/data'

import { BackToTop } from '@/components/BackToTop'
import { ContentProvider } from '@/components/locale/ContentProvider'
import { CurrencyProvider } from '@/components/locale/CurrencyProvider'
import { stripFunctions } from '@/content/locales'
import { Footer } from '@/components/Footer'
import { NavBar } from '@/components/NavBar'
import { OrganizationJsonLd } from '@/components/seo/JsonLd'
import { ThemeScript } from '@/components/ThemeScript'
import { Toaster } from '@/components/ui/sonner'
import { getContent } from '@/lib/content'
import { CONFIGURED_PROVIDERS } from '@/lib/oauth'
import { ACCOUNTS_ENABLED } from '@/lib/session'
import { SITE_URL, languageAlternates } from '@/lib/site'

// Chemin ABSOLU et non « ./globals.css » : ce fichier descend d'un cran sous
// `app/[locale]/`, quand la feuille de style reste à la racine de `app/` — elle ne
// dépend d'aucune langue.
import '@/app/globals.css'

/**
 * Police d'INTERFACE ET D'AFFICHAGE — Figtree.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * ⚠️ LA POLICE DE LA RÉFÉRENCE EST PROPRIÉTAIRE. CECI EST SON ÉQUIVALENT LIBRE.
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * La refonte demande la fonte de KuCoin. Relevée sur leur page — `getComputedStyle`
 * sur le corps du document — c'est **Kufox Sans**, chargée en variable de 400 à 800,
 * romaine et italique. C'est une fonte SUR MESURE, commandée pour cette marque : elle
 * ne se vend pas, ne se distribue pas, et la recopier depuis leur CDN serait un vol de
 * fichier autant qu'une violation de licence. Il fallait donc son équivalent le plus
 * proche parmi les fontes libres — ce que la consigne prévoyait explicitement.
 *
 * ── LE CHOIX EST MESURÉ, PAS ESTIMÉ À L'ŒIL ─────────────────────────────────
 *
 * Trois grandeurs relevées au canevas, à corps 100, sur la chaîne
 * « Capitalisation boursiere 1234567890 » — la chasse totale, la hauteur d'x et la
 * hauteur de capitale. La troisième colonne, le RAPPORT x/capitale, est celle qui
 * décide : c'est elle qui fait qu'une fonte paraît grande ou petite à corps égal,
 * bien plus que la chasse.
 *
 *   Kufox Sans (cible)   chasse 1675   x 51   cap 71   x/cap 0,718
 *   Figtree              chasse 1644   x 50   cap 70   x/cap 0,714   ← retenue
 *   Geist (précédente)   chasse 1673   x 53   cap 71   x/cap 0,746
 *   Urbanist             chasse 1561   x 51   cap 71   x/cap 0,718
 *   Manrope              chasse 1683   x 55   cap 73   x/cap 0,753
 *   Plus Jakarta Sans    chasse 1736   x 54   cap 75   x/cap 0,720
 *   Outfit               chasse 1608   x 48   cap 70   x/cap 0,686
 *   Inter                chasse 1733   x 54   cap 73   x/cap 0,740
 *   Poppins              chasse 1804   x 56   cap 71   x/cap 0,789
 *   Be Vietnam Pro       chasse 1826   x 53   cap 74   x/cap 0,716
 *   Sora                 chasse 1864   x 54   cap 73   x/cap 0,740
 *
 * Figtree est la seule à tomber près de la cible sur les TROIS à la fois : 1,9 % plus
 * étroite, une demi-unité de hauteur d'x, quatre millièmes d'écart sur le rapport.
 * Urbanist reproduit le rapport au millième près mais perd 6,8 % de chasse — une
 * densité sensiblement différente. Les autres s'écartent d'au moins 3,5 %.
 *
 * ── LA SUBSTITUTION VA DANS LE SENS SÛR ─────────────────────────────────────
 *
 * Figtree est 1,8 % PLUS ÉTROITE que Geist à corps égal. C'est la direction qui ne
 * casse rien : les colonnes de tableau dimensionnées au caractère près gagnent
 * quelques pixels de marge au lieu d'en perdre. Un libellé qui débordait déjà
 * débordera encore ; aucun ne se met à déborder du fait du changement.
 *
 * ⚠️ CE QUI CHANGE VRAIMENT EST LA HAUTEUR D'X : 50 contre 53, soit 5,7 % de moins.
 * Le texte PARAÎT donc légèrement plus petit à corps identique, et c'est précisément
 * ce que « adopter les proportions de KuCoin » veut dire — leur fonte a des capitales
 * hautes et un œil modeste. L'échelle en pixels, elle, ne bouge pas : 13 px de corps,
 * 16 px d'interligne, graisse 500, interlettrage −0,12 px restent ceux relevés sur
 * tokenomist.ai (voir `--text-sm` dans globals.css).
 *
 * ── UN SEUL FICHIER POUR TOUTE L'ÉCHELLE ─────────────────────────────────────
 *
 * `next/font/google` sert la version VARIABLE de Figtree : les cinq graisses utilisées
 * par le site viennent d'une ressource unique, et le navigateur interpole au lieu de
 * synthétiser un gras artificiel. `display: 'swap'` évite le texte invisible pendant
 * le chargement, qui pénalise le LCP mesuré (§9).
 *
 * `app/fonts/Switzer-Variable.woff2` A ÉTÉ SUPPRIMÉ. Il n'était plus référencé par
 * personne depuis le passage à `next/font/google` — 43 kilooctets de fonte morte que
 * le dépôt trimballait, et un candidat de plus à la confusion pour qui cherche
 * quelle fonte le site sert vraiment. Le répertoire `app/fonts/` disparaît avec lui.
 */
const sans = Figtree({
  subsets: ['latin'],
  display: 'swap',
  /* ⚠️ LE NOM DE LA VARIABLE RESTE `--font-geist`. Il est lu par `--font-sans` ET
     `--font-display` dans `globals.css` : le renommer demanderait de toucher aux deux
     pour un gain nul. Ce fichier est la seule source de vérité sur la fonte servie ;
     le nom du tuyau n'a pas à la répéter. */
  variable: '--font-geist',
})

/**
 * Police des NOMBRES — DM Mono.
 *
 * DESIGN.md prescrit une police dédiée pour toute donnée tabulaire, et la raison est
 * fonctionnelle plutôt qu'esthétique : en chasse proportionnelle, un « 1 » est plus
 * étroit qu'un « 8 », si bien qu'une colonne de cotation se décale visuellement à
 * chaque rafraîchissement. La chasse fixe supprime ce ballet.
 *
 * ── POURQUOI ELLE REVIENT À LA PLACE DE MARTIAN MONO ────────────────────────
 *
 * Martian Mono avait été choisie pour porter l'identité de la marque, DM Mono ayant
 * été écartée comme « empruntée à Tokenomist ». La refonte assume désormais cet
 * emprunt : `dm_mono` est la seconde fonte relevée sur leur page, et les colonnes de
 * chiffres sont l'endroit où l'écart entre les deux se voit le plus. Martian Mono est
 * large de nature — c'est ce que son axe `wdth` sert à corriger ; DM Mono est étroite
 * de dessin, ce qui est le bon défaut sur onze colonnes.
 *
 * ── LA GRAISSE EST BORNÉE, ET IL FAUT QU'ELLE LE RESTE ──────────────────────
 *
 * DM Mono ne connaît que 300, 400 et 500. Un `font-bold` posé sur un nombre demande
 * 700 : le navigateur l'obtient alors en ÉPAISSISSANT le tracé lui-même, ce qui bave
 * à 11 px. `globals.css` borne donc la graisse de la classe `.tabular` à 500 — voir
 * la règle en fin de fichier. Ne pas retirer ce garde-fou en croyant débloquer un
 * gras manquant.
 *
 * ── CE QU'ELLE NE FAIT PAS ──────────────────────────────────────────────────
 *
 * Elle ne porte PAS le chiffre héros d'une fiche d'actif. À quarante pixels, l'espace
 * des milliers d'une chasse fixe vaut la largeur d'un chiffre entier et coupe le cours
 * en deux. Rien ne s'alignant sous un cours, la chasse fixe n'y apporte que son
 * défaut : ce chiffre-là est posé dans la police de texte, avec ses chiffres
 * tabulaires.
 *
 * ── ⚠️ ELLE N'A PAS SUIVI LE PASSAGE À FIGTREE, ET C'EST DÉLIBÉRÉ ───────────
 *
 * La refonte demande la fonte de KuCoin. Leur page n'en charge QU'UNE : Kufox Sans
 * porte aussi leurs cotations — « $0.16383361 » est composé dans la même fonte
 * proportionnelle que le reste. Aligner ZENKUU là-dessus reviendrait à supprimer la
 * chasse fixe des colonnes de chiffres.
 *
 * Ce serait échanger une ressemblance contre une régression mesurable. KuCoin affiche
 * cinq cours dans un encadré ; ce site en aligne cent sur onze colonnes, rafraîchis
 * toutes les trois minutes. C'est exactement la situation que la chasse fixe existe
 * pour tenir, et le défaut qu'elle supprime — la colonne qui tressaute quand un « 1 »
 * remplace un « 8 » — se verrait à chaque rafraîchissement.
 *
 * « La police KuCoin » désigne donc ici la fonte d'INTERFACE. Les nombres gardent la
 * leur.
 */
const mono = DM_Mono({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  display: 'swap',
  variable: '--font-mono-numeric',
})

/**
 * Métadonnées DÉRIVÉES DE LA LANGUE, d'où la fonction plutôt que la constante.
 *
 * Un `export const metadata` est évalué une fois au chargement du module : il ne
 * peut pas connaître la locale de la requête, et servait donc un titre français sur
 * les pages anglaises. `generateMetadata` est appelée par requête.
 */
export async function generateMetadata(): Promise<Metadata> {
  const fr = await getContent()
  return {
  // Sans `metadataBase`, Next.js émet les URL canoniques et les images Open Graph en
  // chemin RELATIF — invalides pour un moteur de recherche comme pour un aperçu de
  // partage. C'est le prérequis de toutes les balises `alternates.canonical` posées
  // dans les pages.
  metadataBase: new URL(SITE_URL),
  title: {
    // Gabarit d'onglet demandé : « Zenkuu | Accueil », « Zenkuu | Cryptomonnaies »…
    // La marque en tête reste lisible même quand l'onglet est réduit à quelques
    // caractères — c'est justement l'intérêt de la mettre devant plutôt que derrière.
    default: `${fr.site.name} | ${fr.site.tagline}`,
    template: `${fr.site.name} | %s`,
  },
  description: fr.site.description,
  applicationName: fr.site.name,
  // Découverte du flux déclarée à la RACINE et non sur la seule page du blog : c'est
  // ce qui permet à l'extension d'un navigateur ou à un lecteur de flux de proposer
  // l'abonnement depuis n'importe quelle page du site. Les pages qui redéfinissent
  // `alternates` doivent penser à le réémettre — d'où sa présence sur `/blog`.
  /*
   * ── `hreflang` : LES TREIZE LANGUES SE DÉCLARENT COMME SŒURS ────────────────
   *
   * Sans cette table, un moteur voit treize adresses au contenu structurellement
   * identique et n'a AUCUN moyen de savoir qu'elles sont les traductions les unes des
   * autres. Il élit alors une version canonique lui-même, et les douze autres se
   * disputent le classement de la première — c'est précisément le risque de contenu
   * dupliqué que `i18n/routing.ts` documente, et qui devient réel maintenant que le
   * routage ne compte plus quatre langues mais treize.
   *
   * ⚠️ PORTÉE RÉELLE : Next.js remplace `alternates` en bloc plutôt que de le
   * fusionner. Cette déclaration couvre donc les pages qui ne définissent pas leur
   * propre `alternates` — l'accueil en fait partie. Celles qui posent un `canonical`
   * (`/macro`, `/places`…) devront réémettre `languages` pour en bénéficier ; c'est
   * signalé ici plutôt que découvert plus tard dans un rapport d'indexation.
   */
  alternates: {
    types: { 'application/rss+xml': '/blog/rss.xml' },
    languages: languageAlternates(),
  },
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    siteName: fr.site.name,
    title: `${fr.site.name} | ${fr.site.tagline}`,
    description: fr.site.description,
  },
  }
}

// Le layout ne charge AUCUNE donnée, volontairement. Next.js aligne le `revalidate`
// d'une page sur le plus court de tous les appels de son rendu : un seul fetch à
// 5 minutes placé ici ramènerait l'ensemble du site à 5 minutes, y compris les pages
// qui n'ont besoin d'être régénérées qu'une fois par demi-heure. Les tendances de
// l'overlay de recherche sont donc chargées à la demande, via /api/tendances.
/**
 * Pré-rend une variante par langue traduite.
 *
 * Sans cette fonction, `[locale]` reste un segment dynamique et CHAQUE page du site
 * bascule en rendu à la demande — on perdrait l'ISR sur les mille et quelques fiches
 * d'actifs, qui est ce qui rend leur indexation soutenable (§9).
 */
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const fr = await getContent()
  const { locale } = await params

  // Une locale hors liste ne doit pas être servie : le segment `[locale]` attrape
  // tout, y compris `/favicon.ico` ou une URL inventée. Sans ce contrôle, ces
  // requêtes rendraient le site entier sous une étiquette de langue absurde, et
  // seraient indexables.
  if (!hasLocale(routing.locales, locale)) notFound()

  // Indispensable AVANT tout appel de traduction dans l'arbre : sans elle, les
  // composants rendus statiquement basculent en rendu dynamique, ce qui annule le
  // bénéfice de `generateStaticParams` ci-dessus.
  setRequestLocale(locale)

  const [rates, messages, content] = await Promise.all([
    // Les taux de change sont le SEUL chargement de données du layout, et c'est
    // assumé : la devise d'affichage vaut pour tout le site, il faut donc les
    // connaître avant de rendre quoi que ce soit. Le TTL d'une heure les aligne sur
    // la cadence réelle de publication de la BCE — un taux par jour ouvré — sans
    // écraser le `revalidate` des pages plus rapides.
    getExchangeRates(),
    getMessages(),
    getContent(),
  ])

  return (
    // `suppressHydrationWarning` : ThemeScript modifie `class` avant l'hydratation,
    // React signalerait donc un écart serveur/client sur cet attribut précis.
    <html
      lang={locale}
      /* `dir` piloté par la langue et non figé à « ltr ». L'arabe et l'hébreu
         figurent au sélecteur avant d'être traduits : le jour où leurs messages
         arrivent, le sens de lecture est déjà juste — miroir de la mise en page,
         ponctuation et nombres du bon côté. */
      dir={isRtl(locale) ? 'rtl' : 'ltr'}
      /* `dark` POSÉE DÈS LE SERVEUR, et non seulement par `ThemeScript`.

         Le script s'exécute avant la première peinture et suffirait donc à éviter
         le flash. Mais il ne s'exécute pas du tout sans JavaScript, et le HTML
         servi doit déjà porter le thème du site : sans cette classe, un lecteur
         qui bloque les scripts verrait un site clair là où l'identité est sombre.

         `ThemeScript` la RETIRE ensuite si le visiteur a explicitement choisi le
         clair — l'ordre est donc : le défaut arrive avec le document, le choix le
         corrige avant la peinture. */
      className={`dark ${sans.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <ThemeScript />
        <OrganizationJsonLd />
      </head>
      <body className="min-h-screen bg-canvas text-ink antialiased">
        {/* Les messages sont passés au client ICI, une seule fois pour tout l'arbre.
            Les composants serveur, eux, les lisent directement par `getTranslations` :
            ce fournisseur ne sert qu'aux composants marqués « use client », qui sans
            lui lèveraient à la première traduction demandée. */}
        <NextIntlClientProvider messages={messages}>
          {/* Le dictionnaire d'interface traverse vers le client SANS ses fonctions
              — React refuse de sérialiser une fonction, et `stripFunctions` les
              retire donc en amont. `useContent` les rétablit depuis le français.
              Voir `content/locales/index.ts`. */}
          <ContentProvider content={stripFunctions(content)}>
            <CurrencyProvider rates={rates.ok ? rates.data : null}>
              {/*
                ── UN SEUL FOURNISSEUR D'INFOBULLES POUR TOUT LE SITE ──────────

                Le `Tooltip` de shadcn/ui n'en pose pas un implicitement : sans
                fournisseur au-dessus, Radix lève à la première bulle rendue. Il vit
                donc ici, au plus haut, plutôt qu'auprès de chaque déclencheur.

                Ce n'est pas qu'une commodité d'écriture. Le fournisseur porte
                `skipDelayDuration` : une fois qu'une bulle s'est ouverte, les
                suivantes s'ouvrent SANS temporisation tant que le pointeur reste
                dans la zone. C'est ce qui fait qu'un survol le long d'une rangée de
                dix métriques se lit d'un trait au lieu d'attendre 120 ms à chaque
                icône. Un fournisseur par bulle perdrait exactement cette continuité,
                puisque chacun compterait son délai pour lui seul.
              */}
              {/* ⚠️ LE `TooltipProvider` A DISPARU. Radix l'EXIGEAIT au-dessus de
                  toute infobulle — sans lui, rien ne s'affichait et aucune erreur ne
                  le disait. HeroUI rend chaque infobulle autonome, et son délai se
                  règle par bulle plutôt que pour la page entière. */}
              <a
                href="#contenu"
                className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-card focus:bg-surface focus:px-4 focus:py-2 focus:text-sm focus:shadow"
              >
                {fr.nav.skipToContent}
              </a>

              {/*
                ── LA SESSION N'EST PAS LUE ICI, ET C'EST UNE CONTRAINTE DE CACHE ──

                Le réflexe serait de résoudre le compte dans ce composant serveur et de
                le descendre en prop : l'avatar serait alors dans le HTML initial, sans
                le moindre scintillement.

                C'est impossible, et le coût serait invisible jusqu'à la mise en
                production. Lire un cookie dans une MISE EN PAGE bascule toutes les
                routes qu'elle enveloppe en rendu dynamique — c'est-à-dire le site
                entier, dont les classements et l'accueil qui vivent aujourd'hui sur un
                `revalidate = 180`. On échangerait un scintillement de 28 pixels contre
                un rendu serveur complet à chaque visite de chaque page.

                `AccountControl` lit donc lui-même, après montage, un cookie
                d'AFFICHAGE distinct du jeton de session : celui-ci reste `httpOnly`,
                celui-là ne porte qu'un pseudonyme et une adresse. Voir `lib/visitor.ts`
                et `lib/auth-actions.ts`.

                Seuls `accountsEnabled` et la liste des fournisseurs traversent en
                prop : ce sont des lectures de variables d'environnement, qui ne
                rendent rien dynamique.
              */}
              <NavBar accountsEnabled={ACCOUNTS_ENABLED} socialProviders={CONFIGURED_PROVIDERS} />

              {/*
                `tabIndex={-1}` : une cible de lien d'évitement DOIT être focusable.

                Sans lui, le lien « aller au contenu » juste au-dessus déplace le
                défilement mais PAS le focus — la tabulation suivante repart de
                l'en-tête, donc du menu qu'on venait de sauter. Le défaut est ancien et
                silencieux : rien ne le signale, le lien a l'air de fonctionner.

                Le même attribut sert au bouton de retour en haut, qui rend le focus
                ici après avoir remonté la page. Voir `BackToTop`.

                `-1` et non `0` : la cible ne doit pas ENTRER dans l'ordre de
                tabulation — on ne veut pas d'un arrêt supplémentaire sur un conteneur
                à chaque parcours de la page —, seulement pouvoir recevoir le focus
                quand on le lui donne par programme.
              */}
              <main id="contenu" tabIndex={-1} className="shell py-6">
                {children}
              </main>

              <Footer />

              {/* Hors du `main` : il flotte au-dessus de la page entière, pied de page
                  compris, et n'appartient donc à aucun de ses étages. */}
              <BackToTop />

              {/* La pile de notifications passagères — enregistrement d'une alerte,
                  copie d'une adresse, export lancé. Une seule pour tout le site :
                  `toast()` s'appelle de n'importe où sans qu'un composant ait à
                  porter son propre conteneur. */}
              {/*
                ⚠️ `offset` REMONTE LA PILE AU-DESSUS DU BOUTON DE RETOUR EN HAUT.

                Les deux occupent le même coin, et Sonner peint à un z-index de six
                chiffres : une notification recouvrait le bouton exactement au moment
                où l'on venait de faire quelque chose — c'est-à-dire au moment où l'on
                a le plus de chances de vouloir remonter.

                88 pixels = 24 (l'écart du bouton au bord) + 40 (sa hauteur) + 24
                (l'espace entre les deux). Ce n'est pas un nombre choisi à l'œil : s'il
                change, c'est que `bottom-6` ou `size-icon-lg` ont changé dans
                `BackToTop`.
              */}
              <Toaster position="bottom-right" offset={88} closeButton richColors />
            </CurrencyProvider>
          </ContentProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
