import type { Metadata } from 'next'
import { IBM_Plex_Sans, Inter, JetBrains_Mono } from 'next/font/google'

import { getExchangeRates } from '@zenith/data'

import { AuthProvider } from '@/components/auth/AuthProvider'
import { CurrencyProvider } from '@/components/locale/CurrencyProvider'
import { Footer } from '@/components/Footer'
import { NavBar } from '@/components/NavBar'
import { OrganizationJsonLd } from '@/components/seo/JsonLd'
import { ThemeScript } from '@/components/ThemeScript'
import { fr } from '@/content/fr'
import { SITE_URL } from '@/lib/site'

import './globals.css'

// Inter (§3.1). `display: swap` évite le texte invisible pendant le chargement de
// la police, qui pénalise le LCP mesuré (§9).
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

/**
 * Police des nombres.
 *
 * DESIGN.md prescrit une police dédiée pour toute donnée tabulaire, et la raison
 * est fonctionnelle plutôt qu'esthétique : en chasse proportionnelle, un « 1 » est
 * plus étroit qu'un « 8 », si bien qu'une colonne de cotation se décale
 * visuellement à chaque rafraîchissement. La chasse fixe supprime ce ballet.
 *
 * Deux graisses seulement : le poids d'une police chargée sur chaque page se paie
 * en LCP (§9), et les nombres n'ont besoin ni de gras ni d'italique.
 */
const mono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500'],
  variable: '--font-mono-numeric',
})

/**
 * Police d'affichage — titres uniquement.
 *
 * kraken/DESIGN.md décrit un système à DEUX polices : une fonte de marque pour les
 * titres, une fonte produit pour l'interface. C'est ce dédoublement qui donne à une
 * page sa voix, davantage que le choix de l'une ou l'autre fonte prise isolément.
 * La fonte de marque étant propriétaire, on retient le repli que le template
 * désigne lui-même — IBM Plex Sans, sous licence libre.
 *
 * DEUX GRAISSES SEULEMENT, et c'est un arbitrage de performance assumé : chaque
 * graisse est un fichier téléchargé sur toutes les pages, et le LCP est une
 * exigence du §9. 600 sert au cran « Feature Title », 700 à tous les titres
 * d'affichage — aucun autre poids n'est utilisé par le système.
 */
const display = IBM_Plex_Sans({
  subsets: ['latin'],
  display: 'swap',
  weight: ['600', '700'],
  variable: '--font-display-brand',
})

export const metadata: Metadata = {
  // Sans `metadataBase`, Next.js émet les URL canoniques et les images Open Graph en
  // chemin RELATIF — invalides pour un moteur de recherche comme pour un aperçu de
  // partage. C'est le prérequis de toutes les balises `alternates.canonical` posées
  // dans les pages.
  metadataBase: new URL(SITE_URL),
  title: {
    // Gabarit d'onglet demandé : « Zenith | Accueil », « Zenith | Cryptomonnaies »…
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

// Le layout ne charge AUCUNE donnée, volontairement. Next.js aligne le `revalidate`
// d'une page sur le plus court de tous les appels de son rendu : un seul fetch à
// 5 minutes placé ici ramènerait l'ensemble du site à 5 minutes, y compris les pages
// qui n'ont besoin d'être régénérées qu'une fois par demi-heure. Les tendances de
// l'overlay de recherche sont donc chargées à la demande, via /api/tendances.
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Les taux de change sont le SEUL chargement du layout, et c'est assumé : la
  // devise d'affichage vaut pour tout le site, il faut donc les connaître avant de
  // rendre quoi que ce soit. Le TTL d'une heure les aligne sur la cadence réelle de
  // publication de la BCE — un taux par jour ouvré — sans écraser le `revalidate`
  // des pages plus rapides.
  const rates = await getExchangeRates()

  return (
    // `suppressHydrationWarning` : ThemeScript modifie `class` avant l'hydratation,
    // React signalerait donc un écart serveur/client sur cet attribut précis.
    <html
      lang="fr"
      className={`${inter.variable} ${mono.variable} ${display.variable}`}
      suppressHydrationWarning
    >
      <head>
        <ThemeScript />
        <OrganizationJsonLd />
      </head>
      <body className="min-h-screen bg-canvas text-ink antialiased">
        <AuthProvider>
          <CurrencyProvider rates={rates.ok ? rates.data : null}>
            <a
              href="#contenu"
              className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-card focus:bg-surface focus:px-4 focus:py-2 focus:text-sm focus:shadow"
            >
              {fr.nav.skipToContent}
            </a>

            <NavBar />

            <main id="contenu" className="mx-auto max-w-[1280px] px-4 py-6">
              {children}
            </main>

            <Footer />
          </CurrencyProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
