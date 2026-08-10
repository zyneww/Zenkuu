import type { NextConfig } from 'next'

const config: NextConfig = {
  reactStrictMode: true,

  /**
   * Dossier de sortie surchargeable, pour pouvoir construire SANS perturber un
   * serveur de développement en cours.
   *
   * `next build` et `next dev` écrivent tous deux dans `.next`. Lancer un build
   * pendant qu'un serveur tourne lui retire donc le sol sous les pieds : il continue
   * de servir des morceaux remplacés, et les symptômes — pages en 404, modules
   * introuvables — ressemblent à des défauts applicatifs. Le piège est d'autant plus
   * traître que le build, lui, réussit.
   *
   *   ZENITH_DIST_DIR=.next-verify bun run build
   *
   * Vaut aussi pour l'intégration continue, où deux tâches peuvent bâtir en
   * parallèle sur la même copie de travail.
   *
   * ⚠️ EFFET DE BORD À CONNAÎTRE : Next réécrit `next-env.d.ts` — fichier SUIVI par
   * git — pour qu'il pointe vers le dossier de sortie utilisé. Après un build
   * isolé, ce fichier référence donc un dossier temporaire, et un `git commit`
   * distrait publierait une référence morte que personne d'autre ne peut résoudre.
   * Vérifier `git status` après coup, et rétablir `./.next/types/...` — ce que fait
   * de toute façon le prochain `next dev`.
   */
  distDir: process.env.ZENITH_DIST_DIR || '.next',

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
