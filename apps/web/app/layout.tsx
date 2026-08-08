import type { Metadata } from 'next'
import { Inter } from 'next/font/google'

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

/**
 * Pied de page.
 *
 * L'avertissement « lecture seule » n'est pas décoratif : c'est ce qui matérialise
 * le positionnement du §1 et tient ZENITH à distance du conseil en investissement.
 */
function Footer() {
  return (
    <footer className="mt-12 border-t border-border-subtle bg-surface-muted">
      <div className="mx-auto max-w-[1040px] px-4 py-8 text-center text-xs text-ink-muted">
        <span
          className="brand-mark brand-mark-mascotte mx-auto mb-3 block h-10 w-12 text-brand opacity-70"
          role="img"
          aria-label={`Mascotte ${fr.site.name}`}
        />
        <p className="mx-auto max-w-2xl leading-relaxed">{fr.footer.disclaimer}</p>
        <p className="mt-2">{fr.footer.dataNote}</p>
        <p className="pt-3 font-medium text-ink">{fr.footer.rights(new Date().getFullYear())}</p>
      </div>
    </footer>
  )
}
