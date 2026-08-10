/**
 * Applique les migrations Drizzle à la base Turso.
 *
 * Pourquoi ce script plutôt que `drizzle-kit push` : `push` compare le schéma au
 * vivant et ouvre une invite interactive dès qu'il rencontre une table qu'il ne
 * connaît pas — ce qui est le cas de `__turso_internal_mvcc_meta`, créée par Turso
 * lui-même. Cette invite exige un terminal, donc échoue dans tout contexte
 * automatisé (CI, agent, script). Le migrateur, lui, applique des fichiers SQL
 * versionnés et tient son propre journal : il est REJOUABLE sans risque et ne
 * demande jamais rien.
 *
 * Usage :
 *   TURSO_DATABASE_URL=libsql://… TURSO_AUTH_TOKEN=… node scripts/migrate.mjs
 */

import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import { migrate } from 'drizzle-orm/libsql/migrator'

const url = process.env['TURSO_DATABASE_URL']?.trim()
const authToken = process.env['TURSO_AUTH_TOKEN']?.trim()

if (!url) {
  console.error(
    'TURSO_DATABASE_URL manquante. Les migrations ne peuvent pas être appliquées.',
  )
  process.exit(1)
}

// Le schéma est vérifié ICI plutôt que laissé au client : son message d'erreur
// (`URL_SCHEME_NOT_SUPPORTED`) ne dit pas quelle valeur utiliser à la place.
if (!/^(libsql|wss?|https?|file):/.test(url)) {
  console.error(
    `Schéma d'URL non supporté : « ${url.split(':')[0]}: ». Utilisez « libsql:// ».`,
  )
  process.exit(1)
}

const client = createClient(authToken ? { url, authToken } : { url })
const db = drizzle(client)

await migrate(db, { migrationsFolder: './migrations' })

const tables = await client.execute(
  "select name from sqlite_master where type='table' and name not like 'sqlite_%' order by name",
)

console.log('Migrations appliquées. Tables présentes :')
for (const row of tables.rows) console.log(`  · ${row['name']}`)

client.close()
