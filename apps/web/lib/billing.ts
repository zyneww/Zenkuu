import { AUTH_ENABLED } from '@/lib/auth'

/**
 * Catalogue des offres — « Zenkuu Pro » (§8 du cahier des charges).
 *
 * ── POURQUOI CLERK BILLING ET NON STRIPE EN DIRECT ────────────────────────────
 *
 * Les deux facturent via Stripe ; la différence est ailleurs. Avec Stripe brut, il
 * faut une table d'abonnements, un webhook pour la tenir à jour, et une lecture en
 * base à CHAQUE garde — donc un aller-retour de plus sur des pages dont le §9 exige
 * qu'elles soient rapides. Clerk place l'entitlement dans le jeton de session : la
 * garde devient une lecture locale, gratuite, identique au serveur et au navigateur.
 *
 * Le prix de ce choix est réel et assumé : le catalogue ci-dessous ne CRÉE rien. Les
 * plans et fonctions vivent dans le tableau de bord Clerk (Billing → Plans), et ce
 * fichier n'en est que le miroir — nécessaire parce que le tableau comparatif de
 * `/tarifs` doit s'afficher même sans facturation configurée, et parce qu'un slug
 * écrit à la main dans dix composants finit toujours par diverger dans l'un d'eux.
 *
 * ⚠️ Les slugs sont la SEULE partie qui ne se choisit pas librement : ils doivent
 * correspondre au caractère près à ceux saisis dans le tableau de bord. D'où leur
 * forme anglaise et sans accent, contrairement au reste du projet — un identifiant
 * de fournisseur n'est pas du contenu.
 */

/**
 * Facturation activée ?
 *
 * Drapeau DISTINCT de `AUTH_ENABLED`, et il le faut : Clerk peut être configuré
 * (comptes fonctionnels) sans que la facturation le soit. Dans ce cas `<PricingTable />`
 * lève `cannot_render_billing_disabled` en développement et se rend vide en
 * production — autrement dit une page de tarifs blanche, ce qui est pire qu'une page
 * qui explique. Même doctrine que `lib/auth.ts` : une brique non configurée se
 * signale, elle ne fait pas tomber le reste.
 *
 * Lu au module et non à l'appel : `NEXT_PUBLIC_*` est remplacé à la compilation côté
 * client, une lecture dynamique y renverrait `undefined`.
 */
const billingFlag = process.env.NEXT_PUBLIC_CLERK_BILLING_ENABLED

export const BILLING_ENABLED = AUTH_ENABLED && billingFlag === 'true'

/** Slug du plan payant, tel que saisi dans Clerk → Billing → Plans (onglet *User*). */
export const PRO_PLAN = 'pro'

/**
 * Fonctions vendues, rattachées au plan dans le tableau de bord.
 *
 * On garde par FONCTION et non par PLAN partout où c'est possible. La différence
 * paraît cosmétique et ne l'est pas : le jour où un palier intermédiaire apparaît,
 * ou qu'une fonction descend dans l'offre gratuite, un `has({ feature })` suit le
 * changement fait dans le tableau de bord sans qu'une ligne de code bouge. Un
 * `has({ plan: 'pro' })` semé dans quinze fichiers, non.
 *
 * ── COMMENT CETTE LISTE A ÉTÉ ARRÊTÉE ─────────────────────────────────────────
 *
 * Par relevé de ce que vendent réellement TradingView, CoinGecko, stockanalysis.com
 * et Finviz Elite. Trois fonctions reviennent chez les QUATRE — sans publicité,
 * listes démultipliées, alertes de prix — et deux chez les plus sérieux — export de
 * données, écrans de screener sauvegardés. Ce sont exactement celles ci-dessous.
 *
 * Ce qu'ils vendent et que nous NE vendons PAS, faute de pouvoir le tenir : données
 * en temps réel et historique de dix ans. Nos sources sont gratuites et plafonnées à
 * quelques appels par minute (§7, §9) ; promettre du temps réel serait vendre ce
 * qu'on ne peut pas livrer, ce que le §5 interdit aussi sûrement qu'un chiffre
 * inventé.
 */
export const FEATURES = {
  /**
   * Aucun emplacement publicitaire rendu (§8.1).
   *
   * ⚠️ DÉCLARÉ MAIS PAS ENCORE LU par le code, et c'est volontaire : le site ne
   * contient aujourd'hui aucun emplacement publicitaire, la promesse est donc tenue
   * pour tout le monde. Le slug existe dès maintenant pour que le rattachement au
   * plan soit fait dans le tableau de bord au moment de la mise en vente, et non
   * dans l'urgence le jour où la régie arrive — un abonné qui verrait de la
   * publicité pendant les heures de décalage aurait raison de le reprocher.
   *
   * Tant que cette ligne n'est pas branchée, elle N'EST PAS VENDUE : elle ne figure
   * pas dans les arguments de `PLAN_CARDS` ci-dessous.
   */
  adsFree: 'ads_free',
  /** Export des tableaux dans les cinq formats de `lib/export-formats.ts`. */
  exportData: 'export_data',
  /** Listes de suivi multiples et nommées, sans plafond d'actifs. */
  unlimitedWatchlist: 'unlimited_watchlist',
  /** Filtres avancés du screener. */
  advancedScreener: 'advanced_screener',
  /** Écrans de screener enregistrés et rappelés. */
  savedScreens: 'saved_screens',
  /** Alertes de prix par courriel au-delà du quota gratuit. */
  priceAlerts: 'price_alerts',
  /** Comparateur étendu — six actifs au lieu de quatre. */
  deepData: 'deep_data',
} as const

export type ZenkuuFeature = (typeof FEATURES)[keyof typeof FEATURES]

/* ── Plafonds de l'offre gratuite ────────────────────────────────────────────
 *
 * Ces cinq nombres SONT l'offre gratuite. Ils sont réunis ici, et pas dispersés dans
 * les composants qui les appliquent, parce qu'une offre se lit d'un bloc : c'est le
 * seul endroit d'où l'on peut vérifier qu'elle reste cohérente — et généreuse.
 *
 * Repères relevés chez les concurrents en août 2026 :
 *   · TradingView gratuit : 1 liste de 30 symboles, 3 alertes, avec publicité
 *   · CoinGecko gratuit   : 2 portefeuilles, 500 transactions, avec publicité
 *   · Finviz gratuit      : screener à 20 lignes par page, données différées
 *
 * La règle qu'on s'impose : ne jamais être en dessous du plus généreux d'entre eux
 * sur une fonction que nous savons rendre. Un site qui se présente comme plus
 * ouvert que les gros ne peut pas être plus radin sur le premier chiffre venu.
 */

/**
 * Actifs suivis en offre gratuite.
 *
 * Trente, comme TradingView — et c'est une correction assumée d'un premier chiffre à
 * dix, qui nous plaçait sous tous les concurrents alors que le §1 promet l'inverse.
 * Ce n'est d'ailleurs plus le plafond qui vend l'abonnement : c'est
 * `FREE_WATCHLIST_COUNT`.
 */
export const FREE_WATCHLIST_LIMIT = 30

/**
 * Nombre de LISTES en offre gratuite.
 *
 * Une seule, et c'est là que se joue vraiment l'offre. Vendre du volume punit
 * l'utilisateur assidu ; vendre de l'ORGANISATION — « Crypto », « Mes actions »,
 * « À surveiller » — ne retire rien à personne et devient utile exactement au moment
 * où quelqu'un suit assez d'actifs pour vouloir les trier. C'est aussi le modèle de
 * TradingView, dont le palier payant s'intitule « multiple watchlists ».
 */
export const FREE_WATCHLIST_COUNT = 1

/** Alertes armées simultanément — le quota de TradingView gratuit, au symbole près. */
export const FREE_ALERT_LIMIT = 3

/** Alertes armées pour un abonné. Borne haute assumée : la tâche planifiée les relit toutes. */
export const PRO_ALERT_LIMIT = 100

/** Actifs comparables côte à côte. Le §2 en promet 2 à 4 ; l'abonnement pousse à 6. */
export const FREE_COMPARE_LIMIT = 4
export const PRO_COMPARE_LIMIT = 6

/*
 * ⚠️ CE QU'ON A RENONCÉ À VENDRE, ET POURQUOI L'ÉCRIRE ICI.
 *
 * Une « profondeur d'historique » réservée (30 jours en gratuit, 365 en Pro) avait été
 * envisagée — c'est ce que vend stockanalysis.com. Elle a été RETIRÉE de l'offre
 * après vérification dans le code : le graphique de la fiche charge déjà n'importe
 * quelle période à la demande, pour tout le monde. La « débloquer » aurait donc voulu
 * dire la RETIRER d'abord aux utilisateurs gratuits, ce que la page /tarifs interdit
 * noir sur blanc (« Pro ajoute, ne reprend jamais »).
 *
 * Ce qui se vend à la place est l'EXPORT de ce tableau : la donnée reste ouverte à
 * tous, seule sa sortie en fichier est un service. Ne pas réintroduire de plafond ici
 * sans avoir vérifié que la fonction n'est pas déjà gratuite ailleurs.
 */

/**
 * Prix pour UNE périodicité.
 *
 * La structure remplace un couple `price` / `altPrice` où l'annuel n'était qu'une
 * phrase (« ou 29,04 $ par an — 38 % d'économie »). Une phrase ne se bascule pas :
 * pour que la page propose le choix mensuel/annuel, il faut deux jeux de montants
 * comparables, pas un montant et son commentaire.
 */
export interface PlanPrice {
  /** Montant mis en avant, TOUJOURS ramené au mois — sans quoi les deux périodicités
      ne se comparent pas d'un coup d'œil. */
  amount: string
  /** Unité du montant ci-dessus. */
  unit: string
  /** Montant barré, quand cette périodicité en économise un. */
  strikethrough?: string
  /** Pastille d'économie — un pourcentage, plus sûr qu'un compte de mois. */
  savings?: string
  /** Ce qui est RÉELLEMENT débité, et à quelle cadence. */
  billed?: string
}

export interface PlanCard {
  slug: string
  name: string
  /** À qui l'offre s'adresse — une ligne sous le nom. */
  audience: string
  /** Prix affichés dans le tableau comparatif statique. Clerk fait foi à l'achat. */
  monthly: PlanPrice
  /** Absent = l'offre n'a pas de périodicité annuelle (le gratuit). */
  annual?: PlanPrice
  pitch: string
  lines: string[]
  /**
   * Fonctions ABSENTES de cette offre, marquées d'une croix.
   *
   * Elles ne sont pas décoratives : une colonne qui n'aligne que des coches ne dit
   * pas ce qu'on gagne à changer d'offre, et oblige à comparer deux listes ligne à
   * ligne. Les nommer répond à la question directement.
   */
  missing?: string[]
  highlighted: boolean
}

/**
 * Tableau comparatif STATIQUE, rendu même sans facturation configurée.
 *
 * Il double `<PricingTable />` volontairement. Ce composant est un îlot client qui
 * n'apparaît qu'après hydratation et n'existe pas dans le HTML servi : une page de
 * tarifs qui n'en contient rien n'est indexable sur aucun de ses arguments, alors
 * que le §9 fait du référencement le premier moteur d'acquisition. Le tableau porte
 * donc le discours, le composant Clerk porte la transaction.
 *
 * ⚠️ Les prix ci-dessous sont de l'AFFICHAGE. Le montant réellement débité est celui
 * du tableau de bord Clerk ; les deux doivent être tenus en accord à la main.
 *
 * ⚠️ Aucune ligne ne doit décrire une fonction non branchée. C'est la règle qui a
 * écarté « sans publicité » de la liste : le droit existe, le code ne le lit pas
 * encore, donc on ne le vend pas.
 */
/**
 * Devise d'affichage, alignée sur ce que Clerk débite réellement.
 *
 * ⚠️ DOLLARS, ET CE N'EST PAS UN CHOIX — c'est un constat.
 *
 * La devise n'est pas réglable plan par plan : elle vient de la passerelle de
 * paiement de l'instance. Sur une instance de développement, Clerk utilise sa
 * passerelle partagée, qui facture en USD (« Customers will be charged in USD »,
 * relevé dans le tableau de bord). Afficher « 3,90 € » pendant que la carte est
 * débitée de 3,90 $ serait un prix faux — exactement ce que le §5 proscrit, et en
 * pire, puisqu'il porte sur de l'argent.
 *
 * Pour passer à l'euro : connecter un compte Stripe propre à l'instance de PRODUCTION
 * (Billing → Payment gateway) et y régler la devise. Ce jeton bascule alors, et lui
 * seul — c'est la raison de son existence.
 */
const CURRENCY = '$'

export const PLAN_CARDS: PlanCard[] = [
  {
    slug: 'free',
    name: 'Gratuit',
    audience: 'Pour tout le monde',
    monthly: { amount: `0 ${CURRENCY}`, unit: 'pour toujours' },
    pitch:
      'Le site entier : toutes les classes d’actif, toutes les fiches, tous les graphiques. Ce n’est pas une version d’essai, et aucune publicité n’y est affichée.',
    lines: [
      'Toutes les classes d’actif, toutes les fiches, tous les graphiques',
      'Classements, catégories, heatmap, convertisseur',
      `Comparateur jusqu’à ${FREE_COMPARE_LIMIT} actifs`,
      'Screener avec les filtres de base',
      `Une liste de suivi, jusqu’à ${FREE_WATCHLIST_LIMIT} actifs`,
      `${FREE_ALERT_LIMIT} alertes de prix par courriel`,
      'Historique de prix sur toutes les périodes, graphique compris',
      'Actualités, blog et parcours d’apprentissage',
    ],
    missing: [
      'Listes de suivi multiples et sans plafond',
      'Export des tableaux en fichier',
      'Filtres avancés et écrans enregistrés',
    ],
    highlighted: false,
  },
  {
    slug: PRO_PLAN,
    name: 'Zenkuu Pro',
    audience: 'Pour qui regarde tous les jours',
    monthly: { amount: `3,90 ${CURRENCY}`, unit: 'par mois', billed: `46,80 ${CURRENCY} sur un an` },
    /*
     * 2,42 et 29,04 — et non 2,50 et 29 : les deux corrigent des chiffres faux.
     *
     * · Clerk saisit l'annuel en ÉQUIVALENT MENSUEL et le multiplie par douze. Le
     *   plus proche de 29 est 2,42 × 12 = 29,04. Arrondir à « 29 » dans l'affichage
     *   ferait un prix annoncé différent du prix débité.
     * · L'économie réelle est 46,80 − 29,04 = 17,76, soit 4,5 mois — pas 2,5. Le
     *   POURCENTAGE est plus sûr que le compte de mois : il reste juste si les deux
     *   montants bougent.
     *
     * Le montant mis en avant est l'équivalent MENSUEL, comme pour l'offre au mois :
     * afficher 29,04 à côté de 3,90 ferait paraître l'annuel sept fois plus cher.
     */
    annual: {
      amount: `2,42 ${CURRENCY}`,
      unit: 'par mois',
      strikethrough: `3,90 ${CURRENCY}`,
      savings: '38 % d’économie',
      billed: `29,04 ${CURRENCY} facturés une fois par an`,
    },
    pitch:
      'Pour qui suit le marché tous les jours. Rien n’est repris au gratuit : tout est ajouté.',
    lines: [
      'Listes de suivi multiples et nommées, sans plafond d’actifs',
      `${PRO_ALERT_LIMIT} alertes de prix par courriel`,
      'Export des tableaux en CSV, Excel, JSON, Markdown et presse-papiers',
      'Filtres avancés du screener (variation 7 j, rotation)',
      'Écrans de screener enregistrés et rappelés en un clic',
      `Comparateur jusqu’à ${PRO_COMPARE_LIMIT} actifs au lieu de ${FREE_COMPARE_LIMIT}`,
      'Soutien direct au développement du site',
    ],
    highlighted: true,
  },
]
