/**
 * Contenu du Centre d'aide.
 *
 * Les articles vivent dans une DONNÉE, pas dans du JSX, pour trois raisons qui
 * comptent ici : la barre de recherche doit pouvoir les parcourir, la page d'index
 * doit pouvoir les regrouper par catégorie, et chaque article doit exister comme
 * page indexable (§9). Trois usages d'une même source — l'écrire une seule fois est
 * la seule façon d'éviter qu'ils divergent.
 *
 * Règle de rédaction : ces articles décrivent ce que ZENKUU FAIT RÉELLEMENT. Aucun
 * ne promet une fonctionnalité absente, et aucun ne parle d'achat, de vente ou de
 * dépôt — le site n'en propose pas (§7).
 */

export interface HelpArticle {
  slug: string
  title: string
  /** Résumé affiché dans la liste et dans les résultats de recherche. */
  summary: string
  /** Corps de l'article, un élément par paragraphe. */
  body: string[]
}

export interface HelpCategory {
  id: string
  title: string
  description: string
  /** Nom d'icône lucide, résolu à l'affichage — la donnée ne dépend pas de React. */
  icon: 'database' | 'book-open' | 'user' | 'scale'
  articles: HelpArticle[]
}

/**
 * Articles proposés en entrée de parcours.
 *
 * Le libellé est « à lire en premier » et non « les plus consultés » : ZENKUU ne
 * mesure pas l'audience de ses pages, et annoncer une popularité qu'on ne mesure pas
 * serait une donnée inventée comme une autre (§5). Cette sélection est éditoriale et
 * l'assume.
 */
export const HELP_STARTING_POINTS = [
  'origine-des-donnees',
  'frequence-actualisation',
  'ni-achat-ni-vente',
] as const

export const HELP_CATEGORIES: HelpCategory[] = [
  {
    id: 'donnees',
    title: 'Données et fraîcheur',
    description: 'D’où viennent les chiffres, à quel rythme ils changent, et pourquoi.',
    icon: 'database',
    articles: [
      {
        slug: 'origine-des-donnees',
        title: 'D’où proviennent les chiffres affichés',
        summary:
          'Chaque classe d’actif a sa source, citée en bas des modules qui l’utilisent.',
        body: [
          'ZENKUU ne produit aucune donnée de marché. Le site interroge des sources publiques et affiche ce qu’elles publient, sans le retoucher.',
          'Les cryptomonnaies viennent de CoinGecko. Les taux de change sont ceux publiés par la Banque centrale européenne, relayés par Frankfurter. Les actions, ETF, indices et matières premières proviennent de Yahoo Finance. L’indice de sentiment vient d’Alternative.me, et les actualités de flux RSS publics.',
          'Chaque module affiche sa source en bas de bloc, avec un lien. Si un chiffre vous semble faux, ce lien mène à l’endroit où le vérifier directement.',
        ],
      },
      {
        slug: 'frequence-actualisation',
        title: 'À quelle fréquence les données sont actualisées',
        summary: 'Entre 5 et 30 minutes selon la donnée — et pourquoi ce n’est pas du temps réel.',
        body: [
          'Les cours sont mis en cache entre 5 et 30 minutes selon leur nature. Un classement de marché change plus vite qu’une liste de secteurs : les durées de cache suivent ce rythme réel plutôt qu’une valeur unique appliquée partout.',
          'ZENKUU n’affiche pas de cours en temps réel, et ne le prétend pas. Les sources gratuites imposent des limites de requêtes strictes ; interroger en continu les dépasserait en quelques minutes et couperait l’accès pour tout le monde.',
          'La date et l’heure de la dernière valeur reçue sont affichées sous les modules concernés. C’est cette date qui fait foi, pas l’instant où vous consultez la page.',
        ],
      },
      {
        slug: 'donnees-indisponibles',
        title: 'Pourquoi certains chiffres apparaissent comme indisponibles',
        summary: 'Une donnée absente est signalée comme telle, jamais remplacée par une estimation.',
        body: [
          'Quand une source ne publie pas une information, ZENKUU affiche un état vide explicite au lieu de combler le trou. C’est une règle de conception, pas un défaut.',
          'Exemples concrets : la Banque centrale européenne publie un taux de référence par jour ouvré, sans ouverture ni plus haut — les vues en chandeliers sont donc indisponibles sur les devises. De même, l’endpoint de bougies de CoinGecko ne renvoie pas de volume : la case « Volume » est alors grisée.',
          'Une estimation affichée sans mention serait indiscernable d’une donnée réelle. Sur un site de cotation, cette confusion est précisément ce qu’il faut éviter.',
        ],
      },
      {
        slug: 'signaler-une-erreur',
        title: 'Signaler une donnée qui vous semble erronée',
        summary: 'Vérifiez d’abord à la source citée, puis écrivez-nous.',
        body: [
          'ZENKUU affiche ce que la source publie. Un écart entre notre affichage et un autre site vient le plus souvent d’une source différente, d’une devise différente, ou d’un horodatage différent.',
          'Premier réflexe : suivez le lien de source affiché sous le module. Si la valeur y est identique, l’écart vient de l’autre site. Si elle diffère, c’est notre affichage qui est en cause et nous voulons le savoir.',
          'Précisez la page, l’actif, la valeur affichée et l’heure de consultation : sans l’heure, un écart de cours est impossible à reconstituer.',
        ],
      },
    ],
  },
  {
    id: 'lecture',
    title: 'Lire le site',
    description: 'Comprendre les classements, les graphiques et les conversions de devise.',
    icon: 'book-open',
    articles: [
      {
        slug: 'devise-affichage',
        title: 'Changer la devise d’affichage',
        summary: 'La devise choisie s’applique à tout le site, via le taux de référence BCE.',
        body: [
          'Le sélecteur en forme de globe, dans l’en-tête, fixe la devise d’affichage pour l’ensemble du site.',
          'Les sources ne cotent pas toutes dans la devise que vous choisissez. Quand une conversion est appliquée, elle utilise le taux de référence de la Banque centrale européenne, et la date de ce taux est affichée sous le montant.',
          'Une conversion reste une conversion : le montant converti n’est pas un cours réellement coté sur un marché. C’est pourquoi la devise d’origine est toujours rappelée.',
        ],
      },
      {
        slug: 'types-de-graphiques',
        title: 'Les types de graphiques disponibles',
        summary: 'Aire, ligne, chandeliers, barres et écart — selon ce que la source publie.',
        body: [
          'La fiche d’un actif propose plusieurs représentations. L’aire et la ligne se contentent d’une série de prix. Les chandeliers et les barres exigent de l’ouverture, du plus haut, du plus bas et de la clôture : ils n’apparaissent que si la source les publie.',
          'Trois options s’ajoutent : le volume échangé, une moyenne mobile, et les lignes de plus haut, moyenne et plus bas sur la période affichée.',
          'La période de la moyenne mobile s’adapte au nombre de points de la fenêtre. Une même moyenne à 20 périodes n’aurait pas le même sens sur une journée en pas de 5 minutes et sur un an en pas quotidien.',
        ],
      },
      {
        slug: 'hausses-et-baisses',
        title: 'Comment sont calculées les plus fortes hausses et baisses',
        summary: 'Sur un univers explicitement annoncé, pas sur le marché entier.',
        body: [
          'Les classements de hausses et de baisses sont calculés sur les 100 plus grandes capitalisations, et cet univers est indiqué sur la page.',
          'Un classement « du marché entier » supposerait de trier des milliers d’actifs par variation, ce qu’aucune source gratuite ne permet. Trier une seule page de résultats donnerait un classement d’apparence globale qui n’en serait pas un.',
          'Annoncer l’univers de calcul est donc préférable à un titre plus vendeur mais faux.',
        ],
      },
    ],
  },
  {
    id: 'comptes',
    title: 'Compte et confidentialité',
    description: 'Ce qu’un compte apporte, et ce que le site sait de vous.',
    icon: 'user',
    articles: [
      {
        slug: 'a-quoi-sert-un-compte',
        title: 'À quoi sert un compte ZENKUU',
        summary: 'À retrouver vos préférences — jamais à détenir des fonds.',
        body: [
          'Un compte ZENKUU sert à conserver une liste de suivi et des préférences d’affichage d’un appareil à l’autre.',
          'Il ne donne accès à aucune fonction financière. ZENKUU ne détient pas de fonds, ne connecte aucun portefeuille et n’exécute aucun ordre — un compte ne change rien à cela.',
          'Consulter l’intégralité des cours, des classements et des graphiques ne demande aucun compte, et cela restera le cas.',
        ],
      },
      {
        slug: 'aucune-donnee-bancaire',
        title: 'ZENKUU ne demande aucune donnée bancaire',
        summary: 'Aucun formulaire du site ne collecte de coordonnées de paiement.',
        body: [
          'Aucune page de ZENKUU ne demande de numéro de carte, de coordonnées bancaires ni de clé d’accès à une plateforme d’échange.',
          'Si une page se présentant comme ZENKUU vous demande ces informations, elle n’est pas la nôtre.',
          'Nous ne demandons jamais non plus de clé d’API d’un exchange, ni d’accès en lecture à un portefeuille : ZENKUU n’a aucun usage de ces informations.',
        ],
      },
    ],
  },
  {
    id: 'limites',
    title: 'Limites et cadre',
    description: 'Ce que ZENKUU ne fait pas, et pourquoi c’est délibéré.',
    icon: 'scale',
    articles: [
      {
        slug: 'ni-achat-ni-vente',
        title: 'Pourquoi ZENKUU ne permet ni achat ni vente',
        summary: 'C’est un choix de positionnement, pas une fonctionnalité en retard.',
        body: [
          'ZENKUU est une plateforme d’information en lecture seule. Il n’y a nulle part de bouton d’achat, de vente, de dépôt, de retrait ou de connexion à un portefeuille.',
          'Exécuter des ordres ou conserver des fonds relève d’activités réglementées, soumises à agrément et à des obligations qui n’ont rien à voir avec l’affichage de cours.',
          'Rester du côté information permet de couvrir toutes les classes d’actifs au même endroit, gratuitement, sans que le site ait un intérêt quelconque à ce que vous passiez un ordre plutôt qu’un autre.',
        ],
      },
      {
        slug: 'pas-de-conseil',
        title: 'ZENKUU ne fournit aucun conseil en investissement',
        summary: 'Les indicateurs affichés sont descriptifs, pas prescriptifs.',
        body: [
          'Rien de ce qui est affiché sur ZENKUU ne constitue une recommandation personnalisée d’achat, de vente ou de conservation.',
          'Les indicateurs présentés — variations, moyennes mobiles, indice de sentiment — décrivent des données passées. Ils ne prédisent rien, et le site ne les assortit d’aucun signal du type « acheter » ou « vendre ».',
          'Pour une recommandation tenant compte de votre situation, adressez-vous à un conseiller en investissement financier agréé.',
        ],
      },
    ],
  },
]

/** Index à plat — la recherche et la génération des routes travaillent dessus. */
export const HELP_ARTICLES: (HelpArticle & { categoryId: string; categoryTitle: string })[] =
  HELP_CATEGORIES.flatMap((category) =>
    category.articles.map((article) => ({
      ...article,
      categoryId: category.id,
      categoryTitle: category.title,
    })),
  )

export function findHelpArticle(slug: string) {
  return HELP_ARTICLES.find((article) => article.slug === slug)
}
