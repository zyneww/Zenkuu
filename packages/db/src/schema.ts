import { index, integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

/**
 * Schéma relationnel — Turso (libSQL), dialecte SQLite.
 *
 * Périmètre volontairement étroit : ZENKUU est en lecture seule (§7). Il n'y a donc
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
    /**
     * Liste à laquelle l'actif appartient.
     *
     * ── POURQUOI UNE COLONNE DE TEXTE ET NON UNE TABLE `watchlists` ────────────
     *
     * Une table dédiée serait le modèle canonique, et elle serait ici plus lourde que
     * ce qu'elle rapporte. Une liste n'a AUCUN attribut propre — pas de description,
     * pas d'ordre, pas de partage, pas de date de création utile : elle n'est rien
     * d'autre que son nom. La table ne contiendrait donc qu'une clé et un libellé,
     * au prix d'une jointure sur la requête la plus fréquente du site et d'une
     * migration des lignes existantes.
     *
     * La valeur par défaut est ce qui rend la migration indolore : les lignes déjà
     * en base basculent toutes dans « Ma liste », qui est exactement ce qu'elles
     * étaient avant que les listes multiples existent.
     *
     * ⚠️ Ce qu'on perd, et qu'il faut assumer : renommer une liste est un UPDATE de
     * masse, et une liste vidée de tous ses actifs cesse d'exister. Les deux sont
     * acceptables pour un objet qui n'est qu'une étiquette ; ils ne le seraient plus
     * le jour où une liste porterait un réglage propre — ce jour-là, on crée la table.
     */
    listName: text('list_name').notNull().default('Ma liste'),
    /** Classe d'actif ZENKUU : crypto, stock, etf, index, commodity, forex. */
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
    /*
     * Unicité PAR LISTE, et non par utilisateur.
     *
     * C'est le changement qu'imposent les listes multiples : le même actif a
     * parfaitement sa place dans « À surveiller » et dans « Mon panier », alors qu'il
     * n'a aucun sens deux fois dans la même. La contrainte reste posée en BASE et pas
     * seulement dans le code : deux clics rapides sur « suivre » partent en parallèle
     * et gagneraient la course contre une vérification applicative.
     */
    uniqueIndex('watchlist_user_list_asset_idx').on(
      table.userId,
      table.listName,
      table.assetClass,
      table.assetId,
    ),
    // La requête dominante est « toute la liste d'un utilisateur, la plus récente en tête ».
    index('watchlist_user_idx').on(table.userId, table.createdAt),
  ],
)

/**
 * Alertes de prix.
 *
 * ── CE QUE CETTE TABLE N'EST PAS ──────────────────────────────────────────────
 *
 * Ce n'est ni un ordre, ni une position, ni un engagement — le §7 l'interdirait. Une
 * alerte est une NOTIFICATION : « prends-moi au courant si le prix franchit ce seuil ».
 * Rien n'est exécuté, rien n'est détenu, et le franchissement n'a d'autre effet qu'un
 * courriel.
 *
 * ── POURQUOI LE SEUIL EST STOCKÉ AVEC SA DEVISE ───────────────────────────────
 *
 * Un seuil sans devise est ininterprétable : « au-dessus de 50 000 » ne veut rien dire
 * si l'utilisateur a réglé son affichage en dollars et que la vérification lit des
 * euros. La comparaison serait fausse d'environ 8 % en permanence — une erreur qui ne
 * se voit pas à la lecture du code, seulement au déclenchement au mauvais moment.
 */
export const priceAlerts = sqliteTable(
  'price_alerts',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: text('user_id').notNull(),
    assetClass: text('asset_class').notNull(),
    assetId: text('asset_id').notNull(),
    /** Libellé figé, même raison que pour la liste de suivi : afficher sans appeler. */
    label: text('label').notNull(),
    symbol: text('symbol'),
    /** `above` : déclenche au franchissement à la hausse. `below` : à la baisse. */
    direction: text('direction').notNull(),
    /*
     * `real` et non `integer` : un seuil est un prix, et un prix est fractionnaire.
     * SQLite s'en tirerait par affinité de type (une valeur non convertible en entier
     * reste stockée en REAL), mais la colonne mentirait sur son contenu — et le jour
     * où quelqu'un lit le schéma pour écrire une requête, il se trompe.
     */
    threshold: real('threshold').notNull(),
    /** Devise du seuil (ISO 4217, minuscules) — cf. l'avertissement ci-dessus. */
    currency: text('currency').notNull(),
    /**
     * Adresse de notification, COPIÉE depuis Clerk à la création.
     *
     * La tâche planifiée s'exécute hors de toute session : elle n'a pas de contexte
     * Clerk à interroger, et un appel à l'API Clerk par alerte coûterait une requête
     * réseau par ligne à chaque passage. Le prix à payer est une adresse qui peut se
     * périmer : un changement d'e-mail côté Clerk ne se propage pas ici, et l'alerte
     * partira à l'ancienne adresse. C'est un compromis conscient, borné par le fait
     * qu'une alerte est éphémère — elle est consommée puis désactivée.
     */
    email: text('email').notNull(),
    /**
     * Une alerte déclenchée NE SE RÉARME PAS toute seule.
     *
     * Sans cela, un prix qui oscille autour du seuil enverrait un courriel à chaque
     * passage de la tâche, soit quatre par heure. Le réarmement est un geste explicite
     * de l'utilisateur, qui vaut accusé de réception.
     */
    active: integer('active', { mode: 'boolean' }).notNull().default(true),
    triggeredAt: integer('triggered_at', { mode: 'timestamp' }),
    /** Prix relevé au moment du déclenchement — conservé pour l'affichage a posteriori. */
    triggeredPrice: real('triggered_price'),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    // La tâche planifiée ne lit QUE les alertes actives, groupées par actif : c'est
    // l'index qui décide de son coût, pas celui par utilisateur.
    index('alerts_active_idx').on(table.active, table.assetClass, table.assetId),
    index('alerts_user_idx').on(table.userId, table.createdAt),
  ],
)

/**
 * Écrans de screener sauvegardés.
 *
 * Les critères sont stockés en JSON sérialisé plutôt qu'en colonnes. Le schéma du
 * screener bouge — deux critères ont été ajoutés le mois dernier — et une colonne par
 * critère imposerait une migration à chaque évolution de l'outil, pour une donnée que
 * rien n'interroge jamais autrement que « tout, pour cet écran ».
 *
 * La contrepartie est réelle : la base ne valide RIEN de ce contenu. La lecture doit
 * donc traiter un JSON invalide ou périmé comme un écran illisible, jamais faire
 * confiance à sa forme.
 */
export const savedScreens = sqliteTable(
  'saved_screens',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: text('user_id').notNull(),
    name: text('name').notNull(),
    /** JSON sérialisé des critères — forme non garantie, cf. ci-dessus. */
    criteria: text('criteria').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    uniqueIndex('screens_user_name_idx').on(table.userId, table.name),
    index('screens_user_idx').on(table.userId, table.createdAt),
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

/**
 * Archive des actualités — la seule table qui ne dépende d'aucun utilisateur.
 *
 * ── POURQUOI ELLE EXISTE ──────────────────────────────────────────────────────
 *
 * Un flux RSS ne publie que ses ~30 derniers articles. Aucune requête, à aucun
 * fournisseur, ne permet de retrouver les actualités d'il y a trois mois : ce que le
 * flux a poussé hors de sa fenêtre est perdu pour quiconque ne l'a pas conservé.
 *
 * Le calendrier du fil d'actualités EXIGE donc cette table. Sans elle, la
 * fonctionnalité ne serait pas dégradée, elle serait impossible.
 *
 * ── CE QU'ELLE NE PEUT PAS FAIRE ──────────────────────────────────────────────
 *
 * Remonter avant sa mise en service. L'interface doit le dire explicitement plutôt
 * que d'afficher un jour vide : une date sans article, sans explication, se lit comme
 * une panne.
 *
 * ── DURÉE DE CONSERVATION : 90 JOURS ──────────────────────────────────────────
 *
 * Purgée par la même tâche que la collecte. Sans purge, la table croît indéfiniment
 * — 29 flux × ~30 articles × 96 collectes par jour — et Turso facture au stockage.
 * À 90 jours elle se stabilise autour de 54 000 lignes, très en deçà du palier
 * gratuit.
 */
export const newsArticles = sqliteTable(
  'news_articles',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    /**
     * URL CANONIQUE — clé de déduplication, d'où l'index unique.
     *
     * Le même article revient à chaque collecte tant qu'il reste dans la fenêtre du
     * flux, et paraît souvent dans deux flux d'un même éditeur. Les paramètres de
     * campagne (`utm_*`) sont retirés avant insertion : sans cela, deux liens vers le
     * même article ne se ressembleraient pas et la table doublonnerait.
     */
    url: text('url').notNull(),
    title: text('title').notNull(),
    excerpt: text('excerpt'),
    imageUrl: text('image_url'),
    /** Identifiant du flux (`coindesk`), et non son libellé — celui-ci peut changer. */
    sourceId: text('source_id').notNull(),
    sourceLabel: text('source_label').notNull(),
    category: text('category').notNull(),
    lang: text('lang').notNull(),
    author: text('author'),
    /** Date de PUBLICATION déclarée par le flux — la seule sur laquelle on filtre. */
    publishedAt: integer('published_at', { mode: 'timestamp' }).notNull(),
    /** Date de COLLECTE, distincte : elle sert à la purge et au diagnostic. */
    collectedAt: integer('collected_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    uniqueIndex('news_url_idx').on(table.url),
    // Le calendrier ne filtre que sur cette colonne : sans index, chaque consultation
    // d'une date passée parcourrait la table entière.
    index('news_published_idx').on(table.publishedAt),
  ],
)

export type WatchlistItem = typeof watchlistItems.$inferSelect
export type NewWatchlistItem = typeof watchlistItems.$inferInsert
export type NewsArticle = typeof newsArticles.$inferSelect
export type NewNewsArticle = typeof newsArticles.$inferInsert
export type UserPreferences = typeof userPreferences.$inferSelect
export type PriceAlert = typeof priceAlerts.$inferSelect
export type NewPriceAlert = typeof priceAlerts.$inferInsert
export type SavedScreen = typeof savedScreens.$inferSelect
export type NewSavedScreen = typeof savedScreens.$inferInsert
