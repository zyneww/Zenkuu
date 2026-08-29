import type { Metadata } from 'next'

import { AuthPageView } from '@/components/account/AuthPageView'
import { getSeo } from '@/lib/content'
import { ACCOUNTS_ENABLED } from '@/lib/session'
import { CONFIGURED_PROVIDERS } from '@/lib/oauth'

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSeo()
  return {
    title: 'Connexion',
    description: seo(
      '/connexion',
      'Connectez-vous à ZENKUU avec un code à six chiffres envoyé par courriel. Aucun mot de passe, et le site s’utilise sans compte.',
    ),
    alternates: { canonical: '/connexion' },
    /*
     * ── NI INDEXÉE NI SUIVIE, ET C'EST DÉLIBÉRÉ ────────────────────────────
     *
     * L'acquisition passe par la recherche (§9), mais pas par cette page-ci : elle
     * n'a aucun contenu à offrir à qui arrive d'un moteur, et une page de connexion
     * bien classée détourne des requêtes de marque vers un écran sans issue. Les
     * pages qui MÉRITENT ce trafic sont `/pourquoi-zenkuu` et `/bien-demarrer`.
     *
     * `follow` reste tout de même autorisé : le lien vers `/inscription` et ceux du
     * pied de page continuent de transmettre.
     */
    robots: { index: false, follow: true },
  }
}

export default function ConnexionPage() {
  return (
    <AuthPageView mode="signin" configured={CONFIGURED_PROVIDERS} enabled={ACCOUNTS_ENABLED} />
  )
}
