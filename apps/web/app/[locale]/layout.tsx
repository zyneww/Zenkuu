import type { Metadata } from 'next'
import { DM_Mono, Inter } from 'next/font/google'
import { notFound } from 'next/navigation'
import { NextIntlClientProvider, hasLocale } from 'next-intl'
import { getMessages, setRequestLocale } from 'next-intl/server'

import { routing } from '@/i18n/routing'
import { isRtl } from '@/components/settings/languages'

import { getExchangeRates } from '@zenkuu/data'

import { AuthProvider } from '@/components/auth/AuthProvider'
import { ContentProvider } from '@/components/locale/ContentProvider'
import { CurrencyProvider } from '@/components/locale/CurrencyProvider'
import { stripFunctions } from '@/content/locales'
import { Footer } from '@/components/Footer'
import { NavBar } from '@/components/NavBar'
import { OrganizationJsonLd } from '@/components/seo/JsonLd'
import { ThemeScript } from '@/components/ThemeScript'
import { getContent } from '@/lib/content'
import { SITE_URL } from '@/lib/site'

// Chemin ABSOLU et non « ./globals.css » : ce fichier descend d'un cran sous
// `app/[locale]/`, quand la feuille de style reste à la racine de `app/` — elle ne
// dépend d'aucune langue.
import '@/app/globals.css'

/**
 * Police d'INTERFACE ET D'AFFICHAGE — Inter.
 *
 * Elle remplace Geist, et le motif n'est pas typographique mais de RESSEMBLANCE : les
 * deux références retenues pour ce site composent en Inter. Relévé au navigateur sur
 * l'une et l'autre — CoinGecko sert `Inter, -apple-system, …` sur toute sa fiche de
 * cotation, Tokenomist charge `inter` en graisses 300 à 700. Geist appartient à Token
 * Terminal, dont on ne reprend que le THÈME SOMBRE.
 *
 * Le retour est d'ailleurs un retour : le site composait en Inter avant Geist, et le
 * nom de variable `--font-inter` — conservé à l'époque pour ne pas retoucher des
 * centaines de composants — redevient exact.
 *
 * AUCUN `weight` DÉCLARÉ, ET C'EST VOLONTAIRE.
 *
 * Inter est une police VARIABLE (axe `wght`, de 100 à 900). Déclarer des graisses
 * ferait télécharger autant de fichiers STATIQUES, alors que l'omission charge une
 * ressource unique couvrant toute l'échelle — ce dont le site se sert réellement,
 * puisqu'il fait porter la voix des titres par la graisse et non par une seconde
 * famille. La documentation de `next/font` recommande explicitement les variables.
 *
 * `display: 'swap'` évite le texte invisible pendant le chargement, qui pénalise le
 * LCP mesuré (§9).
 */
const sans = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
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
          <AuthProvider>
            <CurrencyProvider rates={rates.ok ? rates.data : null}>
              <a
                href="#contenu"
                className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-card focus:bg-surface focus:px-4 focus:py-2 focus:text-sm focus:shadow"
              >
                {fr.nav.skipToContent}
              </a>

              <NavBar />

              <main id="contenu" className="shell py-6">
                {children}
              </main>

              <Footer />
            </CurrencyProvider>
          </AuthProvider>
          </ContentProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
