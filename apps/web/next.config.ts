import type { NextConfig } from 'next'

const config: NextConfig = {
  reactStrictMode: true,

  // Les paquets internes sont consommés en TypeScript source, sans étape de build
  // intermédiaire : une modification dans `packages/data` est visible immédiatement
  // en développement.
  transpilePackages: ['@zenith/data', '@zenith/ui'],

  images: {
    // Logos d'actifs servis par CoinGecko. Liste explicite plutôt que joker : tout
    // nouvel hôte d'images doit être un ajout conscient.
    remotePatterns: [
      { protocol: 'https', hostname: 'coin-images.coingecko.com' },
      { protocol: 'https', hostname: 'assets.coingecko.com' },
    ],
  },
}

export default config
