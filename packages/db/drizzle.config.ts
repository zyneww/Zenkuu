import type { Config } from 'drizzle-kit'

/**
 * Configuration drizzle-kit — génération et application des migrations.
 *
 * Les identifiants sont lus dans l'environnement, jamais écrits ici (§9). Sans
 * `TURSO_DATABASE_URL`, les commandes `db:generate` / `db:push` échouent
 * explicitement : c'est le comportement voulu pour un outil d'administration, à la
 * différence du runtime du site qui, lui, doit se dégrader proprement.
 */
export default {
  schema: './src/schema.ts',
  out: './migrations',
  dialect: 'turso',
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL ?? '',
    authToken: process.env.TURSO_AUTH_TOKEN,
  },
} satisfies Config
