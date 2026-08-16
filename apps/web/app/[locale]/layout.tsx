import type { Metadata } from 'next'
import { DM_Mono } from 'next/font/google'
import localFont from 'next/font/local'
import { notFound } from 'next/navigation'
import { NextIntlClientProvider, hasLocale } from 'next-intl'
import { getMessages, setRequestLocale } from 'next-intl/server'

import { routing } from '@/i18n/routing'
import { isRtl } from '@/components/settings/languages'

import { getExchangeRates } from '@zenkuu/data'

import { ContentProvider } from '@/components/locale/ContentProvider'
import { CurrencyProvider } from '@/components/locale/CurrencyProvider'
import { stripFunctions } from '@/content/locales'
import { Footer } from '@/components/Footer'
import { NavBar } from '@/components/NavBar'
import { OrganizationJsonLd } from '@/components/seo/JsonLd'
import { ThemeScript } from '@/components/ThemeScript'
import { getContent } from '@/lib/content'
import { CONFIGURED_PROVIDERS } from '@/lib/oauth'
import { ACCOUNTS_ENABLED } from '@/lib/session'
import { SITE_URL } from '@/lib/site'

// Chemin ABSOLU et non « ./globals.css » : ce fichier descend d'un cran sous
// `app/[locale]/`, quand la feuille de style reste à la racine de `app/` — elle ne
// dépend d'aucune langue.
import '@/app/globals.css'

/**
 * Police d'INTERFACE ET D'AFFICHAGE — Switzer.
 *
 * ── POURQUOI PAS CELLE D'OKX ─────────────────────────────────────────────────
 *
 * La demande était « la même police qu'OKX ». Relevé au navigateur sur
 * okx.com/fr-fr/markets/prices : ils composent en `OKXSans`, servie depuis
 * `/cdn/assets/okfe/libs/fonts/OKX_Sans/*.woff2`. C'est une fonte PROPRIÉTAIRE,
 * dessinée pour eux et distribuée sous leur seul nom de domaine. On ne peut ni
 * l'héberger — ce serait une contrefaçon — ni la charger depuis chez eux : un lien
 * direct vers le CDN d'un tiers casse le jour où ils changent d'empreinte, et fait
 * dépendre le rendu de notre site de l'infrastructure d'un concurrent.
 *
 * Switzer est le substitut LIBRE le plus proche : grotesque géométrique de l'Indian
 * Type Foundry, sous ITF Free Font License (usage commercial autorisé), même
 * hauteur d'x généreuse et mêmes terminaisons droites qu'OKX Sans. Elle remplace
 * Inter, qui était le choix de CoinGecko et de Tokenomist — un site de marché qui
 * compose comme tous les autres n'a pas de voix propre.
 *
 * ── UN SEUL FICHIER POUR TOUTE L'ÉCHELLE ─────────────────────────────────────
 *
 * `Switzer-Variable.woff2` porte l'axe `wght` de 100 à 900 en 42 ko. Les cinq
 * graisses utilisées par le site viennent donc d'une ressource unique, là où les
 * fichiers statiques équivalents en auraient demandé cinq. D'où `weight: '100 900'`
 * — la plage, et non une valeur : c'est ce qui indique au navigateur qu'il peut
 * interpoler plutôt que de synthétiser un gras artificiel.
 *
 * ── POURQUOI `app/fonts/` ET NON `public/` ───────────────────────────────────
 *
 * `next/font/local` traite le fichier à la compilation : il l'émet sous
 * `/_next/static/media/` avec une empreinte de contenu, donc en cache immuable, et
 * génère la règle `@font-face` avec les métriques de repli qui suppriment le
 * décalage de mise en page au chargement. Déposé dans `public/`, il serait servi tel
 * quel, sans empreinte et sans ces métriques.
 *
 * `display: 'swap'` évite le texte invisible pendant le chargement, qui pénalise le
 * LCP mesuré (§9).
 */
const sans = localFont({
  src: '../fonts/Switzer-Variable.woff2',
  weight: '100 900',
  display: 'swap',
  variable: '--font-switzer',
})

/**
 * Police des NOMBRES — DM Mono.
 *
 * DESIGN.md prescrit une police dédiée pour toute donnée tabulaire, et la raison
 * est fonctionnelle plutôt qu'esthétique : en chasse proportionnelle, un « 1 » est
 * plus étroit qu'un « 8 », si bien qu'une colonne de cotation se décale
 * visuellement à chaque rafraîchissement. La chasse fixe supprime ce ballet.
 *
 * C'est la mono de Tokenomist, relevée au navigateur sur sa page de tarifs (`DM Mono`
 * en 400 et 500). Elle accompagne Inter chez eux comme ici.
 *
 * LES GRAISSES SONT DÉCLARÉES, contrairement à Inter ci-dessus, parce que DM Mono
 * n'est PAS variable : elle n'existe qu'en 300, 400 et 500. On ne prend que les deux
 * dernières, seules utilisées — 400 pour les colonnes, 500 pour un chiffre mis en
 * avant. Sa graisse maximale étant 500, un `font-semibold` posé sur un nombre serait
 * SYNTHÉTISÉ par le navigateur, c'est-à-dire épaissi artificiellement ; les styles
 * `.tabular` et `.numeric` de globals.css bornent la graisse pour cette raison.
 */
const mono = DM_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
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
  alternates: { types: { 'application/rss+xml': '/blog/rss.xml' } },
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
      className={`${sans.variable} ${mono.variable}`}
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

              <main id="contenu" className="shell py-6">
                {children}
              </main>

              <Footer />
            </CurrencyProvider>
          </ContentProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
