import type { Metadata } from 'next'
import { Inter } from 'next/font/google'

import { Footer } from '@/components/Footer'
import { NavBar } from '@/components/NavBar'
import { ThemeScript } from '@/components/ThemeScript'
import { fr } from '@/content/fr'

import './globals.css'

// Inter (§3.1). `display: swap` évite le texte invisible pendant le chargement de
// la police, qui pénalise le LCP mesuré (§9).
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: {
    // Gabarit d'onglet demandé : « Zenith | Accueil », « Zenith | Compte »…
    // La marque en tête reste lisible même quand l'onglet est réduit à quelques
    // caractères — c'est justement l'intérêt de la mettre devant plutôt que derrière.
    default: `${fr.site.name} | ${fr.site.tagline}`,
    template: `${fr.site.name} | %s`,
  },
  description: fr.site.description,
  applicationName: fr.site.name,
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
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // `suppressHydrationWarning` : ThemeScript modifie `class` avant l'hydratation,
    // React signalerait donc un écart serveur/client sur cet attribut précis.
    <html lang="fr" className={inter.variable} suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-screen bg-canvas text-ink antialiased">
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
      </body>
    </html>
  )
}
