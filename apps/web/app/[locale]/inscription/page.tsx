import type { Metadata } from 'next'

import { AuthPageView } from '@/components/account/AuthPageView'
import { getSeo } from '@/lib/content'
import { ACCOUNTS_ENABLED } from '@/lib/session'
import { CONFIGURED_PROVIDERS } from '@/lib/oauth'

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSeo()
  return {
    title: 'Inscription',
    description: seo(
      '/inscription',
      'Créez un compte ZENKUU avec une adresse électronique. Ni mot de passe ni vérification d’identité — le compte ne sert qu’à emporter vos listes de suivi.',
    ),
    alternates: { canonical: '/inscription' },
    // Même raisonnement que `/connexion` : voir la note qui l'accompagne.
    robots: { index: false, follow: true },
  }
}

export default function InscriptionPage() {
  return (
    <AuthPageView mode="signup" configured={CONFIGURED_PROVIDERS} enabled={ACCOUNTS_ENABLED} />
  )
}
