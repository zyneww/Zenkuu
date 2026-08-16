import { index, integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

/**
 * Schéma relationnel — Turso (libSQL), dialecte SQLite.
 *
 * Périmètre volontairement étroit : ZENKUU est en lecture seule (§7). Il n'y a donc
 * ni ordre, ni solde, ni mouvement de fonds à stocker — uniquement ce qu'un visiteur
 * a choisi de suivre et ses préférences d'affichage.
 *
 * Aucune table « utilisateur », et il n'y en a jamais eu. L'identité était d'abord
 * tenue par un fournisseur d'authentification tiers ; elle tient désormais dans un
 * cookie anonyme tiré au sort côté application (`apps/web/lib/visitor.ts`). Les deux
 * arrivent ici sous la même forme — une chaîne opaque dans `user_id` — et c'est
 * précisément pourquoi le retrait des comptes n'a demandé AUCUNE migration de ces
 * colonnes.
 */

export const watchlistItems = sqliteTable(
  'watchlist_items',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    /** Identifiant opaque du visiteur — cf. l'en-tête du fichier. Non contraint en base. */
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
    /**
     * Nom donné À L'ALERTE par son auteur — distinct de `label`, qui nomme l'ACTIF.
     *
     * Facultatif, et l'interface propose un nom par défaut plutôt que d'exiger une
     * saisie. Il n'existe que pour la page `/alertes` : dix alertes sur le bitcoin y
     * étaient dix lignes identiques à l'œil, et il fallait lire le seuil pour les
     * distinguer.
     */
    title: text('title'),
    /**
     * Message libre, recopié tel quel dans le courriel de déclenchement.
     *
     * C'est une NOTE À SOI-MÊME — « sortir la moitié », « regarder le volume avant » —
     * et pas un champ de mise en forme : il part en texte brut, sans balisage.
     */
    note: text('note'),
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
     * Adresse de notification, SAISIE PAR L'AUTEUR au moment où il crée l'alerte.
     *
     * Elle était auparavant recopiée depuis le compte du fournisseur
     * d'authentification. Les comptes ont été retirés du site, et cette colonne est
     * ce qui rend les alertes possibles sans eux : c'est la seule chose que le site
     * ait jamais réellement eu besoin de savoir d'un visiteur.
     *
     * Elle reste STOCKÉE et non lue ailleurs à chaque passage : la tâche planifiée
     * s'exécute hors de toute requête, et un aller-retour par ligne pour retrouver
     * une adresse coûterait une requête réseau par alerte à chaque tour.
     */
    email: text('email').notNull(),
    /**
     * L'alerte se réarme-t-elle après un déclenchement ?
     *
     * Faux par défaut, et c'est l'ancien comportement unique : un prix qui oscille
     * autour du seuil enverrait sinon un courriel à chaque passage de la tâche, soit
     * quatre par heure. Le réarmement était donc un geste explicite de l'utilisateur.
     *
     * Vrai, c'est la case « à chaque fois » de la fenêtre de création. Elle a un sens
     * pour une surveillance de long cours — « préviens-moi chaque fois que ça repasse
     * sous 50 000 » — et la protection contre le martèlement passe alors par
     * `triggeredAt` : la tâche ne renvoie rien dans les vingt-quatre heures qui
     * suivent un envoi pour la même alerte.
     */
    recurring: integer('recurring', { mode: 'boolean' }).notNull().default(false),
    /**
     * Date au-delà de laquelle l'alerte est ignorée puis effacée.
     *
     * Nulle = sans échéance, ce qui reste le défaut. Une échéance sert aux
     * surveillances liées à un événement daté — une publication de résultats, une
     * échéance de contrat — après quoi l'alerte n'est plus qu'un courriel parasite
     * que personne ne pensera à supprimer.
     */
    expiresAt: integer('expires_at', { mode: 'timestamp' }),
    /**
     * L'alerte est-elle armée ?
     *
     * Distinct de `recurring` : celui-ci décrit ce qui se passe APRÈS un
     * déclenchement, celui-là dit si le seuil est actuellement surveillé.
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

/**
 * COMPTES — la table que ce schéma n'avait jamais eue.
 *
 * ── POURQUOI ELLE EXISTE MAINTENANT ───────────────────────────────────────────
 *
 * L'identité était tenue par un fournisseur tiers, et l'en-tête de ce fichier
 * expliquait qu'une table locale créerait deux sources de vérité à resynchroniser.
 * Le raisonnement était juste tant que le fournisseur existait. Il a été retiré du
 * site, et il ne reste donc qu'une source possible : celle-ci.
 *
 * ── CE QU'ELLE NE CONTIENT PAS, ET C'EST L'ESSENTIEL ──────────────────────────
 *
 * Aucun mot de passe, aucun condensat de mot de passe, aucune question secrète. La
 * connexion se fait par CODE À USAGE UNIQUE envoyé par courriel (`login_codes`) : il
 * n'y a donc pas de secret durable à stocker, donc rien à faire fuir, rien à saler,
 * rien à faire tourner le jour où l'algorithme de hachage vieillit.
 *
 * C'est un arbitrage, pas une simplification gratuite. On perd la connexion hors
 * ligne et la connexion instantanée ; on gagne de ne jamais détenir le secret d'un
 * visiteur — sur un site qui ne fait que publier des cours, la balance est nette.
 *
 * Une adresse, un pseudonyme. Rien d'autre : ce site n'a besoin de rien d'autre.
 */
export const accounts = sqliteTable(
  'accounts',
  {
    /**
     * UUID, et NON un entier auto-incrémenté.
     *
     * Cet identifiant devient la valeur de `user_id` dans les quatre tables
     * ci-dessus — c'est ce qui permet à un visiteur anonyme de garder sa liste en se
     * connectant : on réécrit sa colonne, sans rien déplacer. Un entier séquentiel
     * s'y prêterait aussi, mais il fuiterait le nombre de comptes à quiconque en lit
     * un, et il entrerait en collision avec les identifiants anonymes, qui sont des
     * UUID.
     */
    id: text('id').primaryKey(),
    /** Adresse, EN MINUSCULES — la normalisation est faite à l'écriture. */
    email: text('email').notNull(),
    /**
     * Pseudonyme affiché.
     *
     * Proposé à partir de la partie locale de l'adresse à la création, puis
     * modifiable. Il n'est ni unique ni vérifié : il ne sert qu'à l'affichage, et
     * l'initiale qu'on en tire pour l'avatar de l'en-tête.
     */
    handle: text('handle').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
    /** Dernière connexion — affichée dans le menu de compte, rien de plus. */
    lastSeenAt: integer('last_seen_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [uniqueIndex('accounts_email_idx').on(table.email)],
)

/**
 * Codes de connexion à usage unique.
 *
 * ── LE CODE N'EST PAS STOCKÉ EN CLAIR ─────────────────────────────────────────
 *
 * La colonne porte son CONDENSAT SHA-256. Un code à six chiffres est trivial à
 * retrouver par force brute depuis un condensat — l'espace fait un million de
 * valeurs — et ce n'est pas ce que la mesure protège : elle protège contre la
 * LECTURE de la table, qui donnerait sinon à qui la consulte les codes en cours de
 * validité de tout le monde, immédiatement utilisables.
 *
 * La vraie défense contre la force brute est ailleurs : `attempts`, plafonné, et une
 * validité de quelques minutes.
 */
export const loginCodes = sqliteTable(
  'login_codes',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    /** L'adresse visée, en minuscules. Le compte peut ne pas exister encore. */
    email: text('email').notNull(),
    /** SHA-256 du code, en hexadécimal — cf. ci-dessus. */
    codeHash: text('code_hash').notNull(),
    expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
    /**
     * Essais infructueux déjà consommés.
     *
     * C'est LA protection contre la force brute, et elle doit vivre en base et non en
     * mémoire : le site tourne sur des instances sans état, et un compteur local
     * repartirait de zéro à chaque requête servie par une autre.
     */
    attempts: integer('attempts').notNull().default(0),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [index('login_codes_email_idx').on(table.email, table.createdAt)],
)

/**
 * Sessions ouvertes.
 *
 * ── LE COOKIE PORTE UN JETON, LA TABLE SON CONDENSAT ──────────────────────────
 *
 * Même règle que pour les codes, et elle compte davantage ici : un jeton de session
 * vaut une connexion complète, sans expiration à quelques minutes pour en limiter la
 * portée. Une table lue par un tiers ne doit pas lui livrer de quoi se faire passer
 * pour chacun de ses utilisateurs.
 *
 * ── POURQUOI UNE TABLE PLUTÔT QU'UN COOKIE SIGNÉ ──────────────────────────────
 *
 * Un cookie signé — un JWT, par exemple — n'exige aucune lecture en base et c'est son
 * seul avantage. Il rend en revanche la DÉCONNEXION impossible à garantir : un jeton
 * émis reste valable jusqu'à son échéance, y compris après « Se déconnecter », y
 * compris s'il a été volé. Une ligne qu'on supprime ferme la session pour de bon,
 * partout, immédiatement. Sur ce site la lecture en base est de toute façon déjà
 * faite pour la liste de suivi : elle ne coûte rien de plus.
 */
export const sessions = sqliteTable(
  'sessions',
  {
    /** SHA-256 du jeton porté par le cookie, en hexadécimal. */
    tokenHash: text('token_hash').primaryKey(),
    accountId: text('account_id').notNull(),
    expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [index('sessions_account_idx').on(table.accountId)],
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

export type Account = typeof accounts.$inferSelect
export type NewAccount = typeof accounts.$inferInsert
export type LoginCode = typeof loginCodes.$inferSelect
export type Session = typeof sessions.$inferSelect
export type WatchlistItem = typeof watchlistItems.$inferSelect
export type NewWatchlistItem = typeof watchlistItems.$inferInsert
export type NewsArticle = typeof newsArticles.$inferSelect
export type NewNewsArticle = typeof newsArticles.$inferInsert
export type UserPreferences = typeof userPreferences.$inferSelect
export type PriceAlert = typeof priceAlerts.$inferSelect
export type NewPriceAlert = typeof priceAlerts.$inferInsert
export type SavedScreen = typeof savedScreens.$inferSelect
export type NewSavedScreen = typeof savedScreens.$inferInsert
