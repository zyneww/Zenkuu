import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'

import * as schema from './schema'

/**
 * Connexion Turso — optionnelle, exactement comme les sources de marché et Clerk.
 *
 * Le principe du §5 est appliqué ici aussi : une brique non configurée SE SIGNALE,
 * elle ne casse pas le reste. Sans `TURSO_DATABASE_URL`, le site fonctionne
 * intégralement — seule la watchlist persistée annonce son indisponibilité.
 *
 * `getDb()` renvoie donc `null` plutôt que de lever : l'appelant est obligé par le
 * typage de traiter le cas, ce qui rend l'oubli impossible à compiler.
 */
const url = process.env.TURSO_DATABASE_URL?.trim()
const authToken = process.env.TURSO_AUTH_TOKEN?.trim()

export const DB_ENABLED = Boolean(url)

/** Raison lisible de l'indisponibilité, affichée à l'utilisateur. */
export function dbUnavailableReason(): string | null {
  if (url) return null
  return 'La base de données n’est pas configurée sur cette instance : les listes de suivi ne sont pas conservées.'
}

/**
 * Instance mémorisée au module.
 *
 * Recréer un client à chaque appel rouvrirait une connexion HTTP par requête. En
 * environnement serverless le module est réévalué par instance froide, ce qui donne
 * exactement le bon cycle de vie : une connexion par instance, réutilisée ensuite.
 */
let instance: ReturnType<typeof drizzle<typeof schema>> | null = null

export function getDb() {
  if (!url) return null
  if (instance) return instance

  instance = drizzle(
    createClient(authToken ? { url, authToken } : { url }),
    { schema },
  )
  return instance
}

export { schema }
