import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

/**
 * Schéma relationnel — Turso (libSQL), dialecte SQLite.
 *
 * Périmètre volontairement étroit : ZENITH est en lecture seule (§7). Il n'y a donc
 * ni ordre, ni solde, ni mouvement de fonds à stocker — uniquement ce qu'un visiteur
 * a choisi de suivre et ses préférences d'affichage.
 *
 * Aucune table « utilisateur » : l'identité est détenue par Clerk, et la dupliquer
 * ici créerait deux sources de vérité à resynchroniser à chaque suppression de
 * compte. On stocke seulement l'identifiant Clerk comme clé étrangère logique.
 */

export const watchlistItems = sqliteTable(
  'watchlist_items',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    /** Identifiant Clerk (`user_…`). Non contraint en base : Clerk en est le propriétaire. */
    userId: text('user_id').notNull(),
    /** Classe d'actif ZENITH : crypto, stock, etf, index, commodity, forex. */
    assetClass: text('asset_class').notNull(),
    /** Identifiant de l'actif chez sa source (`bitcoin`, `aapl`…). */
    assetId: text('asset_id').notNull(),
    /**
     * Libellé figé au moment de l'ajout.
     *
     * Il sert UNIQUEMENT à afficher la liste sans interroger les sources : montrer
     * une watchlist de 30 lignes coûterait sinon 30 appels externes, très au-delà du
     * quota. Ce n'est pas une donnée de marché — aucun prix n'est stocké ici, et
     * c'est délibéré : un prix figé en base deviendrait faux dès la minute suivante,
     * exactement le genre de valeur périmée que le §5 proscrit.
     */
    label: text('label').notNull(),
    symbol: text('symbol'),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    // Un même actif ne peut être suivi qu'une fois par utilisateur. La contrainte est
    // posée en BASE et pas seulement dans le code : deux clics rapides sur « suivre »
    // partent en parallèle et gagneraient la course contre une vérification applicative.
    uniqueIndex('watchlist_user_asset_idx').on(table.userId, table.assetClass, table.assetId),
    // La requête dominante est « toute la liste d'un utilisateur, la plus récente en tête ».
    index('watchlist_user_idx').on(table.userId, table.createdAt),
  ],
)

export const userPreferences = sqliteTable('user_preferences', {
  userId: text('user_id').primaryKey(),
  /** Devise d'affichage (ISO 4217). */
  currency: text('currency'),
  /** Thème choisi : `light`, `dark`, ou absent pour « suivre le système ». */
  theme: text('theme'),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
})

export type WatchlistItem = typeof watchlistItems.$inferSelect
export type NewWatchlistItem = typeof watchlistItems.$inferInsert
export type UserPreferences = typeof userPreferences.$inferSelect
