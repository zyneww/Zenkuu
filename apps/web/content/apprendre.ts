/**
 * Contenu pédagogique, classé par thème ET par niveau.
 *
 * Le niveau n'est pas décoratif : il pilote un filtre sur la page. Un lecteur qui
 * découvre les marchés et un lecteur qui cherche la définition exacte de l'offre
 * diluée n'ont pas besoin des mêmes fiches, et les mélanger dans une liste unique
 * dessert les deux.
 *
 * Comme pour l'aide, ces fiches expliquent des NOTIONS. Aucune ne recommande d'agir
 * — ZENKUU ne fournit pas de conseil en investissement (§7).
 *
 * ── POURQUOI DES SECTIONS TITRÉES PLUTÔT QU'UNE SUITE DE PARAGRAPHES ────────
 *
 * Le corps était un `string[]` — des paragraphes à la file, sans structure. Trois
 * choses en découlaient, toutes mauvaises pour une page qui se veut consultable :
 * aucun sommaire n'était constructible, aucun lien profond ne pouvait viser un
 * passage précis, et un moteur de recherche ne voyait qu'un bloc de texte sans
 * hiérarchie là où la référence du secteur (CoinGecko Learn) expose des `h2`
 * ancrés.
 *
 * Le modèle est donc celui du blog — `ArticleSection`, réutilisé tel quel plutôt
 * que recopié : deux définitions de la même chose divergeraient, et le sommaire
 * comme le temps de lecture se calculent déjà à partir de cette forme.
 *
 * ── `takeaways` : CE QUI SE LIT AVANT L'ARTICLE ─────────────────────────────
 *
 * Trois à quatre phrases posées en tête. Ce n'est pas un résumé décoratif : c'est
 * la réponse pour le lecteur qui n'ira pas au bout, et l'ancrage pour celui qui
 * ira. Elles ne contiennent RIEN qui ne soit démontré plus bas.
 */

import type { ArticleSection } from '@/content/blog'

export type Level = 'debutant' | 'intermediaire' | 'avance'

export const LEVELS: { id: Level; label: string; hint: string }[] = [
  { id: 'debutant', label: 'Débutant', hint: 'Aucun prérequis' },
  { id: 'intermediaire', label: 'Intermédiaire', hint: 'Vous lisez déjà des cours' },
  { id: 'avance', label: 'Avancé', hint: 'Notions de valorisation' },
]

export interface Lesson {
  slug: string
  title: string
  level: Level
  summary: string
  /** Points à retenir, affichés en tête de fiche. Trois à quatre, jamais davantage. */
  takeaways: string[]
  /** Corps structuré. Chaque section titrée devient une entrée du sommaire. */
  sections: ArticleSection[]
  /**
   * Requête envoyée à YouTube pour illustrer la fiche.
   *
   * ÉCRITE À LA MAIN, et non dérivée du titre. Un titre de fiche est rédigé pour
   * être lu (« Lire une capitalisation, et connaître ses limites ») ; il fait une
   * mauvaise requête, parce qu'il porte une intention éditoriale que le moteur de
   * YouTube prend au premier degré. La formulation ci-dessous vise ce qu'un
   * pédagogue aurait mis dans SON titre.
   *
   * Absente, la requête du thème sert de repli — c'est le sens de « vidéos sur le
   * sujet OU la catégorie ».
   */
  videoQuery?: string
}

export interface LessonTopic {
  id: string
  title: string
  description: string
  /** Requête de repli pour les fiches du thème qui n'en déclarent pas. */
  videoQuery: string
  lessons: Lesson[]
}

export const LESSON_TOPICS: LessonTopic[] = [
  {
    id: 'fondamentaux',
    title: 'Lire un marché',
    description: 'Les grandeurs que vous croiserez sur chaque fiche d’actif.',
    videoQuery: 'comprendre les indicateurs de marché capitalisation volume',
    lessons: [
      {
        slug: 'capitalisation',
        title: 'Lire une capitalisation, et connaître ses limites',
        level: 'debutant',
        summary:
          'La capitalisation multiplie un cours par une quantité — ce n’est pas de l’argent investi.',
        videoQuery: 'capitalisation boursière définition explication',
        takeaways: [
          'La capitalisation est un produit : le dernier cours coté multiplié par le nombre d’unités en circulation.',
          'Elle ne mesure aucune somme réellement engagée, et personne ne pourrait la retirer du marché.',
          'Sur un actif peu échangé, elle peut reposer sur une poignée de transactions.',
          'Elle ne se lit jamais seule : le volume dit combien de transactions la soutiennent.',
        ],
        sections: [
          {
            title: 'Ce que le calcul fait exactement',
            paragraphs: [
              'La capitalisation est le produit du cours par le nombre d’unités en circulation. Elle sert à comparer des tailles, pas à mesurer une somme réellement engagée.',
              'Le point à retenir tient dans le mot « dernier » : le cours utilisé est celui de la DERNIÈRE transaction, quelle que soit sa taille. Un échange portant sur une unité fixe le prix appliqué ensuite à des milliards d’unités.',
            ],
          },
          {
            title: 'L’erreur de lecture la plus fréquente',
            paragraphs: [
              'L’erreur la plus fréquente consiste à lire « 800 milliards de capitalisation » comme « 800 milliards ont été investis ». C’est faux : si la dernière transaction s’est faite à un certain prix, ce prix est appliqué à l’intégralité des unités existantes, y compris celles que personne ne cherche à vendre.',
              'La réciproque est vraie aussi, et elle surprend davantage : cette somme ne pourrait pas être retirée du marché. Vendre l’ensemble des unités ferait s’effondrer le cours bien avant la dernière, si bien que le montant réellement encaissé n’aurait rien à voir avec le nombre affiché.',
            ],
          },
          {
            title: 'Pourquoi elle se lit avec le volume',
            paragraphs: [
              'Conséquence pratique : sur un actif peu échangé, une capitalisation élevée peut reposer sur très peu de transactions. C’est pourquoi le volume mérite d’être lu en même temps que la capitalisation, jamais séparément.',
              'Deux actifs affichant la même capitalisation ne sont donc pas comparables tant qu’on ignore ce qui s’y échange chaque jour. Le premier réflexe utile, sur une fiche ZENKUU, est de regarder la ligne de volume juste à côté.',
            ],
          },
          {
            title: 'Ce que ZENKUU affiche, et d’où il le tient',
            paragraphs: [
              'La capitalisation présentée sur chaque fiche est celle publiée par la source de la classe d’actif concernée, jamais un produit recalculé par nos soins. Quand la source ne la publie pas — c’est le cas pour certaines valeurs — la ligne est absente plutôt que reconstruite.',
              'La devise d’affichage, elle, résulte d’une conversion au taux de référence quotidien de la Banque centrale européenne, indiquée sous le module.',
            ],
          },
        ],
      },
      {
        slug: 'volume-et-liquidite',
        title: 'Volume et liquidité : pourquoi une forte variation peut tromper',
        level: 'debutant',
        summary:
          'Une variation à deux chiffres sur un volume minuscule ne dit presque rien.',
        videoQuery: 'volume et liquidité sur les marchés explication',
        takeaways: [
          'Le volume mesure ce qui a changé de mains ; la liquidité, la facilité à échanger sans déplacer le cours.',
          'Une même variation en pourcentage n’a pas le même sens selon le volume qui la porte.',
          'Un carnet d’ordres peu garni fait bouger le cours pour de petites quantités.',
          'Les classements de hausses de ZENKUU sont bornés aux 100 plus grandes capitalisations, précisément pour cette raison.',
        ],
        sections: [
          {
            title: 'Deux grandeurs distinctes, souvent confondues',
            paragraphs: [
              'Le volume mesure ce qui a réellement changé de mains sur une période. La liquidité, elle, décrit la facilité à échanger sans faire bouger le cours.',
              'Elles vont souvent de pair sans jamais se confondre : un actif peut connaître une journée de volume exceptionnel tout en restant illiquide, si ce volume s’est concentré sur quelques échanges de gros blocs.',
            ],
          },
          {
            title: 'La même hausse, deux significations',
            paragraphs: [
              'Une hausse de 40 % sur un actif dont le volume quotidien est faible peut résulter de quelques transactions. La même hausse sur un actif très échangé traduit un mouvement de marché autrement plus large.',
              'Le pourcentage, lui, est identique dans les deux cas. C’est ce qui rend les classements de variations trompeurs quand rien ne borne leur univers : ils remontent mécaniquement ce qui bouge le plus, c’est-à-dire ce qui s’échange le moins.',
            ],
          },
          {
            title: 'Ce que le carnet d’ordres ajoute',
            paragraphs: [
              'La liquidité se lit dans le carnet d’ordres : la quantité offerte à l’achat et à la vente autour du cours courant. Un carnet épais absorbe un ordre important sans que le prix bouge ; un carnet mince le laisse traverser plusieurs niveaux de prix d’un coup.',
              'ZENKUU affiche ce carnet quand la source le publie, et omet le module sinon — un dégradé de profondeur reconstitué à partir de rien ne dirait rien de vrai.',
            ],
          },
          {
            title: 'Le garde-fou appliqué aux classements',
            paragraphs: [
              'C’est la raison pour laquelle les classements de plus fortes hausses de ZENKUU sont calculés sur les 100 plus grandes capitalisations : sans ce garde-fou, ils seraient dominés en permanence par des actifs minuscules.',
              'Ce périmètre est écrit à côté du titre de chaque classement, et non caché dans une note de bas de page : un classement dont on ignore l’univers n’est pas interprétable.',
            ],
          },
        ],
      },
      {
        slug: 'offre-en-circulation',
        title: 'Offre en circulation, offre totale, offre maximale',
        level: 'intermediaire',
        summary: 'Trois nombres distincts, souvent confondus, aux implications différentes.',
        videoQuery: 'offre en circulation offre totale offre maximale crypto',
        takeaways: [
          'La circulation compte les unités disponibles ; le total inclut ce qui existe sans circuler ; le maximum est un plafond, quand il existe.',
          'L’écart entre circulation et total mesure une dilution possible, que la capitalisation courante ne reflète pas.',
          'La capitalisation « pleinement diluée » applique le cours courant à l’offre maximale — une projection, pas une mesure.',
          'Un actif sans plafond est affiché comme tel, jamais avec un nombre de convenance.',
        ],
        sections: [
          {
            title: 'Trois définitions à ne pas intervertir',
            paragraphs: [
              'L’offre en circulation désigne les unités effectivement disponibles. L’offre totale inclut ce qui existe mais reste bloqué ou non distribué. L’offre maximale est le plafond, quand il en existe un.',
              'Les trois nombres coexistent sur une même fiche et n’y répondent pas à la même question : combien circule aujourd’hui, combien a été créé, et combien pourra l’être au maximum.',
            ],
          },
          {
            title: 'Ce que l’écart entre deux d’entre eux annonce',
            paragraphs: [
              'L’écart entre circulation et total indique ce qui pourrait arriver sur le marché à l’avenir. Un écart important signale une dilution potentielle, que la capitalisation courante ne reflète pas.',
              'La grandeur qui tente de la chiffrer s’appelle la capitalisation pleinement diluée : le cours courant multiplié par l’offre maximale. Elle a une limite structurelle qu’il faut connaître — elle suppose que le cours resterait le même après l’arrivée de toutes les unités manquantes, ce qui est précisément ce qu’une dilution rend improbable.',
            ],
          },
          {
            title: 'Quand le plafond n’existe pas',
            paragraphs: [
              'Certains actifs n’ont aucun plafond. Dans ce cas, ZENKUU affiche l’information comme absente plutôt que d’inscrire un nombre arbitraire.',
              'La distinction compte : « pas de plafond » et « plafond inconnu de notre source » ne se lisent pas pareil, et confondre les deux sous un tiret unique reviendrait à trancher une question qu’on n’a pas tranchée.',
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'graphiques',
    title: 'Lire un graphique',
    description: 'Ce que les représentations montrent — et ce qu’elles ne montrent pas.',
    videoQuery: 'apprendre à lire un graphique boursier débutant',
    lessons: [
      {
        slug: 'lire-des-chandeliers',
        title: 'Lire un graphique en chandeliers',
        level: 'intermediaire',
        summary: 'Quatre valeurs par bougie : ouverture, plus haut, plus bas, clôture.',
        videoQuery: 'lire un graphique en chandeliers japonais débutant',
        takeaways: [
          'Chaque bougie résume un intervalle par quatre valeurs : ouverture, plus haut, plus bas, clôture.',
          'Le corps relie ouverture et clôture ; les mèches marquent les extrêmes atteints entre les deux.',
          'La couleur compare la clôture à l’ouverture de la MÊME bougie, et rien d’autre.',
          'Changer l’intervalle change la figure : la même série raconte deux histoires en 30 minutes et en 4 heures.',
        ],
        sections: [
          {
            title: 'Les quatre valeurs d’une bougie',
            paragraphs: [
              'Chaque bougie résume un intervalle de temps par quatre valeurs. Le corps relie l’ouverture à la clôture ; les mèches marquent les extrêmes atteints pendant l’intervalle.',
              'Ce qui se passe À L’INTÉRIEUR de l’intervalle est perdu. Une bougie au corps minuscule et aux longues mèches signale un aller-retour violent revenu à son point de départ, mais elle ne dit ni dans quel ordre, ni en combien de fois.',
            ],
          },
          {
            title: 'Ce que la couleur dit, et ce qu’elle ne dit pas',
            paragraphs: [
              'La couleur indique seulement si la clôture est au-dessus ou en dessous de l’ouverture. Elle ne dit rien de la tendance plus large, ni de la comparaison avec la bougie précédente.',
              'Une bougie verte peut donc clôturer bien plus bas que la bougie rouge qui la précède. Lire une succession de couleurs comme une trajectoire est l’erreur la plus courante sur ce type de graphique.',
            ],
          },
          {
            title: 'L’intervalle est un choix, pas un réglage neutre',
            paragraphs: [
              'L’intervalle est décisif : la même série affichée en bougies de 30 minutes ou de 4 heures raconte deux histoires différentes. ZENKUU indique la granularité réellement fournie par la source, qui l’impose selon la fenêtre demandée.',
              'Ce n’est pas un détail d’affichage : agréger huit bougies de 30 minutes en une bougie de 4 heures efface sept ouvertures, sept clôtures et l’essentiel des mèches. La figure obtenue est plus lisse, et plus pauvre.',
            ],
          },
        ],
      },
      {
        slug: 'moyennes-mobiles',
        title: 'Ce qu’une moyenne mobile dit, et ne dit pas',
        level: 'intermediaire',
        summary: 'Un lissage du passé, calculé avec un retard structurel.',
        videoQuery: 'moyenne mobile bourse explication simple',
        takeaways: [
          'Une moyenne mobile est un lissage de valeurs passées, recalculé à chaque nouveau point.',
          'Elle est en retard par construction, et ce retard croît avec la période choisie.',
          'Un croisement de moyennes est un fait arithmétique sur des données passées, pas une prévision.',
          'ZENKUU les superpose au cours sans jamais les présenter comme des signaux.',
        ],
        sections: [
          {
            title: 'Ce que la moyenne calcule',
            paragraphs: [
              'Une moyenne mobile calcule la moyenne des dernières valeurs, recalculée à chaque nouveau point. Elle atténue le bruit pour rendre une tendance plus lisible.',
              'La période — 20, 50, 200 points — est le seul réglage, et c’est tout le sujet : elle décide de la quantité d’information qu’on accepte de perdre pour gagner en lisibilité.',
            ],
          },
          {
            title: 'Le retard n’est pas un défaut, c’est la définition',
            paragraphs: [
              'Elle est par construction en retard : elle intègre des valeurs passées, donc elle réagit après le cours. Ce retard croît avec la période choisie.',
              'Une moyenne à 200 points continue de monter plusieurs semaines après un retournement du cours, simplement parce que les valeurs anciennes qu’elle contient sont encore hautes. Ce n’est pas un dysfonctionnement à corriger — c’est ce qu’un lissage fait.',
            ],
          },
          {
            title: 'Les croisements, et ce qu’on leur fait dire',
            paragraphs: [
              'Elle ne prédit rien. Les croisements de moyennes sont des faits arithmétiques sur des données passées, pas des signaux — et ZENKUU ne les présente jamais comme tels.',
              'La formulation courante « la moyenne courte croise la longue à la hausse » décrit exactement une chose : deux suites de nombres se sont croisées. Toute conclusion sur la suite appartient au lecteur, pas au graphique, et ZENKUU ne la formule pas à sa place (§7).',
            ],
          },
        ],
      },
      {
        slug: 'sans-signaux-imaginaires',
        title: 'Lire un graphique sans y projeter de signaux imaginaires',
        level: 'debutant',
        summary: 'L’œil humain trouve des figures dans le bruit. C’est le piège principal.',
        videoQuery: 'biais cognitifs et illusion de figures sur les graphiques',
        takeaways: [
          'La perception humaine détecte des motifs y compris dans des séries parfaitement aléatoires.',
          'Une figure repérée après coup n’a aucune valeur prédictive du seul fait qu’on la repère.',
          'L’échelle, la fenêtre et l’intervalle changent radicalement l’allure d’une même série.',
          'Trois vérifications suffisent avant de conclure : période affichée, échelle utilisée, volume associé.',
        ],
        sections: [
          {
            title: 'Le cerveau complète, même quand il n’y a rien',
            paragraphs: [
              'Notre perception détecte spontanément des motifs, y compris dans des séries parfaitement aléatoires. Une figure repérée après coup sur un graphique n’a donc aucune valeur prédictive en soi.',
              'L’expérience classique consiste à tracer une marche aléatoire et à la montrer sans dire ce qu’elle est : on y trouve des supports, des résistances et des épaules-tête-épaules avec la même facilité que sur un cours réel. La figure existe bien ; c’est sa portée qui n’existe pas.',
            ],
          },
          {
            title: 'Trois réglages qui changent tout',
            paragraphs: [
              'Changer l’échelle verticale, la fenêtre ou l’intervalle modifie radicalement l’allure d’une même série. Une « tendance » évidente sur trois mois peut disparaître sur trois ans.',
              'L’échelle logarithmique mérite une mention à part : sur un actif qui a été multiplié par cent, elle rend comparables des variations en pourcentage éloignées dans le temps, là où l’échelle linéaire écrase tout le passé contre l’axe. Deux représentations justes, deux lectures opposées.',
            ],
          },
          {
            title: 'Le réflexe de vérification',
            paragraphs: [
              'Le réflexe utile est de toujours vérifier trois choses avant de conclure : quelle période est affichée, quelle échelle est utilisée, et quel volume accompagne le mouvement.',
              'Ces trois éléments sont visibles sur chaque graphique de ZENKUU, et c’est délibéré : un graphique qui cache sa fenêtre ou son échelle demande à être cru sur parole.',
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'contexte',
    title: 'Contexte et indicateurs',
    description: 'Les indicateurs agrégés que publie ZENKUU, et leur portée réelle.',
    videoQuery: 'indicateurs de sentiment et de marché explication',
    lessons: [
      {
        slug: 'indice-de-sentiment',
        title: 'Comment lire un indice de sentiment',
        level: 'debutant',
        summary: 'Un indicateur composite d’ambiance, pas une mesure de valeur.',
        videoQuery: 'indice fear and greed crypto explication',
        takeaways: [
          'L’indice agrège plusieurs mesures hétérogènes en un seul nombre de 0 à 100.',
          'Il décrit un climat de marché, jamais la valeur d’un actif.',
          'Sa méthodologie est celle d’Alternative.me, son éditeur, et non celle de ZENKUU.',
          'Comme tout indice composite, il dépend entièrement des pondérations choisies par son auteur.',
        ],
        sections: [
          {
            title: 'Ce que l’indice agrège',
            paragraphs: [
              'L’indice de peur et d’avidité agrège plusieurs mesures — volatilité, volume, tendances de recherche — en un seul nombre de 0 à 100.',
              'Réduire des grandeurs sans unité commune à un seul nombre suppose de décider ce que chacune pèse. C’est une décision éditoriale, prise par l’éditeur de l’indice, et elle n’est pas déductible du résultat.',
            ],
          },
          {
            title: 'Climat n’est pas valorisation',
            paragraphs: [
              'Il décrit un climat, pas une valorisation. Un indice bas signifie que le marché est nerveux, pas qu’un actif est bon marché.',
              'La confusion est d’autant plus facile que le vocabulaire y invite : « peur extrême » se lit spontanément comme une occasion. L’indice ne dit rien de tel — il mesure une ambiance, à un instant, sur un marché entier.',
            ],
          },
          {
            title: 'La source, et pourquoi elle est nommée',
            paragraphs: [
              'Sa méthodologie est celle de la source qui le publie, Alternative.me, et non celle de ZENKUU. Comme tout indicateur composite, il dépend entièrement des pondérations choisies par son auteur.',
              'C’est pourquoi la mention de source figure sous le module, avec la date de la publication reprise. Un indice composite affiché sans son auteur demande une confiance qu’aucun chiffre ne mérite par lui-même.',
            ],
          },
        ],
      },
      {
        slug: 'dominance',
        title: 'La dominance : une part, pas une performance',
        level: 'avance',
        summary: 'Elle peut monter alors que l’actif baisse.',
        videoQuery: 'dominance bitcoin explication',
        takeaways: [
          'La dominance est la part d’un actif dans la capitalisation totale de sa classe.',
          'Elle bouge pour deux raisons indépendantes : l’actif change, ou le reste du marché change.',
          'Une dominance qui monte pendant que le cours baisse est un cas normal, pas une anomalie.',
          'Elle situe un actif dans son marché ; elle ne mesure aucune performance.',
        ],
        sections: [
          {
            title: 'La définition, et sa conséquence immédiate',
            paragraphs: [
              'La dominance mesure la part d’un actif dans la capitalisation totale de sa classe.',
              'C’est un rapport, donc un nombre à deux dépendances. Le numérateur est l’actif observé ; le dénominateur est tout le reste. Rien ne garantit qu’ils bougent dans le même sens.',
            ],
          },
          {
            title: 'Pourquoi elle peut monter dans un marché qui baisse',
            paragraphs: [
              'Comme toute part relative, elle bouge pour deux raisons distinctes : parce que l’actif change de valeur, ou parce que le reste du marché change. Une dominance qui augmente pendant que le cours baisse signifie simplement que le reste baisse plus vite.',
              'Le cas se produit régulièrement lors des reculs généralisés, où les grandes capitalisations reculent moins que les petites. La dominance monte alors sans qu’aucun achat supplémentaire n’ait eu lieu.',
            ],
          },
          {
            title: 'L’usage qui reste juste',
            paragraphs: [
              'Elle est donc utile pour situer un actif dans son marché, et trompeuse si on la lit comme une mesure de performance.',
              'Lue à côté de la variation du cours, elle ajoute une information que celle-ci ne porte pas : le mouvement observé est-il propre à cet actif, ou partagé par toute sa classe.',
            ],
          },
        ],
      },
      {
        slug: 'taux-de-change',
        title: 'Pourquoi les conversions utilisent le taux BCE',
        level: 'avance',
        summary: 'Un taux de référence quotidien, stable et vérifiable — pas un cours de marché.',
        videoQuery: 'taux de change de référence BCE fonctionnement',
        takeaways: [
          'ZENKUU convertit avec le taux de référence publié chaque jour ouvré par la Banque centrale européenne.',
          'Ce taux est un point de référence unique par jour, pas une cotation en continu.',
          'L’avantage est la reproductibilité : deux visiteurs voient le même montant, traçable à une publication officielle.',
          'La contrepartie est assumée, et la devise d’origine comme la date du taux sont toujours affichées.',
        ],
        sections: [
          {
            title: 'Le taux retenu',
            paragraphs: [
              'ZENKUU convertit les montants avec le taux de référence publié chaque jour ouvré par la Banque centrale européenne.',
              'Il est publié en début d’après-midi, pour la journée, et ne bouge plus ensuite. Les week-ends et jours fériés reprennent la dernière publication.',
            ],
          },
          {
            title: 'Ce qu’on gagne à ne pas suivre le marché en continu',
            paragraphs: [
              'Ce n’est pas un cours de marché en continu : c’est un point de référence unique par jour. L’avantage est la stabilité et la vérifiabilité — deux visiteurs consultant la même page voient le même montant, traçable à une publication officielle.',
              'Un taux en continu aurait l’effet inverse : deux consultations à quelques secondes d’intervalle donneraient deux montants, et aucun des deux ne serait vérifiable après coup.',
            ],
          },
          {
            title: 'Ce qu’on y perd, et comment on l’annonce',
            paragraphs: [
              'La contrepartie est assumée : un montant converti n’est pas un cours réellement coté. C’est pourquoi la devise d’origine et la date du taux appliqué sont toujours affichées à côté.',
              'Sur les paires très volatiles, l’écart avec le marché du moment peut se voir. Il est donc lisible, plutôt que masqué derrière un chiffre unique présenté comme le cours.',
            ],
          },
        ],
      },
    ],
  },

  /*
   * ── LES CLASSES D'ACTIFS ────────────────────────────────────────────────────
   *
   * Ce thème comblait un trou mesurable : le site suit six classes, et les deux
   * thèmes précédents n'en expliquaient qu'UNE. « Lire un marché » parle de
   * capitalisation et d'offre en circulation — des grandeurs de cryptoactif ; « Lire
   * un graphique » et « Contexte » sont transverses. Un lecteur arrivant sur une
   * fiche d'ETF ou une paire de devises ne trouvait donc rien qui lui dise ce qu'il
   * regarde.
   *
   * Chaque fiche suit ici la même règle que les précédentes : elle explique ce que le
   * chiffre MESURE, puis ce qu'il ne mesure pas. C'est la seconde moitié qui compte —
   * un cours de matière première qui n'est pas un cours au comptant, un indice qui
   * pondère par le prix et non par la taille, ce sont des pièges qu'on ne soupçonne
   * pas tant que personne ne les a nommés.
   *
   * Aucune ne conseille d'agir (§7).
   */
  {
    id: 'classes',
    title: 'Les classes d’actifs',
    description: 'Ce que chaque marché suivi par ZENKUU cote réellement.',
    videoQuery: 'différences entre actions ETF indices matières premières',
    lessons: [
      {
        slug: 'actions-et-etf',
        title: 'Une action, un ETF : ce que vous détenez n’est pas la même chose',
        level: 'debutant',
        summary:
          'L’une est une part d’entreprise, l’autre une part de panier — et leur cours ne se forme pas pareil.',
        videoQuery: 'différence entre une action et un ETF explication',
        takeaways: [
          'Une action est une fraction du capital d’une entreprise ; un ETF, une part d’un fonds qui détient un panier.',
          'Le cours d’un ETF suit la valeur de son panier, sans s’y confondre exactement.',
          'La variation d’un ETF agrège des dizaines ou centaines de titres et ne dit rien d’une entreprise précise.',
          'Deux ETF sur le même indice peuvent diverger par leurs frais et leur méthode de réplication.',
        ],
        sections: [
          {
            title: 'Deux objets, deux façons de former un prix',
            paragraphs: [
              'Une action est une fraction du capital d’une entreprise. Son cours résulte directement de la confrontation des ordres d’achat et de vente sur cette entreprise-là.',
              'Un ETF est une part d’un fonds qui détient un panier de titres. Son cours suit la valeur de ce panier — sa « valeur liquidative » — mais s’en écarte légèrement au fil de la séance, parce que la part se négocie en continu alors que le panier n’est valorisé qu’à intervalles réguliers.',
            ],
          },
          {
            title: 'Ce qu’une variation d’ETF ne vous apprend pas',
            paragraphs: [
              'Deux conséquences pratiques. La variation d’un ETF ne dit rien d’une entreprise en particulier : elle agrège des dizaines ou des centaines de titres, dont les mouvements se compensent en partie. Et deux ETF portant le même nom d’indice peuvent afficher des performances différentes, selon les frais qu’ils prélèvent et la manière dont ils répliquent le panier.',
              'La réplication est le point le moins connu : un fonds peut détenir tous les titres de l’indice, un échantillon représentatif, ou passer par un contrat d’échange avec une contrepartie. Les trois méthodes visent le même indice et ne suivent pas la même trajectoire.',
            ],
          },
          {
            title: 'Ce que ZENKUU cote',
            paragraphs: [
              'ZENKUU affiche le cours de la part tel que la place le publie, jamais une valeur liquidative recalculée.',
              'C’est le chiffre qu’un lecteur retrouverait chez son intermédiaire, et le seul dont la provenance soit vérifiable. Reconstruire une valeur liquidative supposerait de connaître la composition exacte du panier à l’instant considéré — ce qu’aucune source gratuite ne publie en continu.',
            ],
          },
        ],
      },
      {
        slug: 'indices',
        title: 'Ce qu’un indice mesure, et ce que sa pondération lui fait dire',
        level: 'intermediaire',
        summary:
          'Deux indices sur le même marché peuvent diverger uniquement par leur méthode de calcul.',
        videoQuery: 'comment fonctionne un indice boursier pondération',
        takeaways: [
          'Un indice n’est pas un actif : c’est un nombre calculé à partir d’un panier, selon une formule publiée.',
          'La pondération décide de tout — par capitalisation pour le CAC 40 et le S&P 500, par prix pour le Dow Jones.',
          'Deux indices du même marché peuvent diverger sans qu’aucune entreprise ne se soit comportée autrement.',
          'Le niveau d’un indice n’a aucune signification absolue ; seule sa variation se compare.',
        ],
        sections: [
          {
            title: 'Un nombre, pas un actif',
            paragraphs: [
              'Un indice n’est pas un actif : c’est un nombre calculé à partir d’un panier de valeurs, selon une formule publiée par celui qui le maintient. On ne l’achète pas — on achète éventuellement un fonds qui cherche à le suivre.',
              'Le maintien de cette formule est un travail continu : entrées et sorties de valeurs, ajustements après division d’action ou distribution. Chacun de ces gestes fait bouger l’indice sans qu’aucun cours n’ait changé.',
            ],
          },
          {
            title: 'La pondération change le résultat',
            paragraphs: [
              'La pondération change tout. La plupart des grands indices — CAC 40, S&P 500 — pondèrent par la capitalisation : une entreprise deux fois plus grosse pèse deux fois plus. Le Dow Jones, lui, pondère par le PRIX de l’action : une action à 500 € y pèse dix fois plus qu’une action à 50 €, indépendamment de la taille des deux entreprises.',
              'Ce n’est pas une curiosité historique sans effet. Deux indices couvrant le même marché peuvent progresser différemment sans qu’aucune entreprise ne se soit comportée autrement — l’écart vient de la formule, pas des sociétés.',
            ],
          },
          {
            title: 'Pourquoi le niveau ne veut rien dire',
            paragraphs: [
              'Le niveau d’un indice n’a par ailleurs aucune signification absolue : il dépend de sa valeur de départ et de sa date de base. Seule sa VARIATION se compare d’un indice à l’autre.',
              'Comparer « 7 800 points » à « 5 200 points » n’a donc pas de sens : les deux nombres descendent de conventions choisies à des dates différentes, parfois séparées d’un siècle.',
            ],
          },
        ],
      },
      {
        slug: 'paires-de-devises',
        title: 'Lire une paire de devises, et dans quel sens',
        level: 'debutant',
        summary:
          'EUR/USD à 1,17 signifie qu’un euro s’échange contre 1,17 dollar — l’ordre des trois lettres est l’information.',
        videoQuery: 'comment lire une paire de devises EUR USD',
        takeaways: [
          'Une paire s’écrit base/contrepartie : le taux dit combien de la seconde vaut UNE unité de la première.',
          'Une paire qui monte décrit une base qui se renforce, jamais l’inverse.',
          'Il n’existe pas de cours unique du change : le marché est de gré à gré, sans place centrale.',
          'ZENKUU s’appuie donc sur le taux de référence quotidien de la BCE.',
        ],
        sections: [
          {
            title: 'L’ordre des trois lettres est l’information',
            paragraphs: [
              'Une paire s’écrit toujours base/contrepartie. Dans EUR/USD, l’euro est la base : le taux dit combien d’unités de la seconde devise vaut UNE unité de la première.',
              'Inverser mentalement les deux codes inverse la lecture du graphique entier — c’est l’erreur la plus coûteuse sur ce type de fiche, et la plus facile à commettre.',
            ],
          },
          {
            title: 'Le même fait, énoncé dans deux sens',
            paragraphs: [
              'Une paire qui monte signifie donc que la base se renforce face à la contrepartie — et jamais l’inverse. EUR/USD qui passe de 1,15 à 1,17 décrit un euro plus cher en dollars, ce qui est identique à un dollar moins cher en euros. Le même fait, énoncé dans deux sens.',
            ],
          },
          {
            title: 'Pourquoi aucun cours n’est « le » cours',
            paragraphs: [
              'Il n’existe pas de cours unique du change : le marché des devises est de gré à gré, sans place centrale, et deux intermédiaires peuvent afficher des taux légèrement différents au même instant.',
              'C’est la raison pour laquelle ZENKUU s’appuie sur le taux de référence quotidien de la Banque centrale européenne plutôt que sur un cours en continu — voir la fiche qui lui est consacrée.',
            ],
          },
        ],
      },
      {
        slug: 'matieres-premieres',
        title: 'Le cours d’une matière première est celui d’un contrat, pas d’un sac de blé',
        level: 'intermediaire',
        summary:
          'Ce qui est coté porte une échéance, et cette échéance déforme la lecture d’un historique long.',
        videoQuery: 'contrats à terme matières premières fonctionnement',
        takeaways: [
          'Le cours affiché est celui d’un contrat à terme, sur l’échéance de référence la plus proche.',
          'À l’expiration, la cotation bascule sur l’échéance suivante et crée une discontinuité.',
          'Cette discontinuité n’est pas un mouvement de marché : le prix change parce que le contrat a changé.',
          'Une variation est fiable sur une fenêtre courte et demande de la prudence sur une fenêtre longue.',
        ],
        sections: [
          {
            title: 'Ce qui est réellement coté',
            paragraphs: [
              'Le pétrole, l’or ou le blé se cotent principalement par des contrats à terme : un engagement à livrer une quantité définie à une date donnée. Le cours affiché est celui de l’échéance la plus proche, dite « échéance de référence ».',
              'Un contrat à terme porte donc plus qu’un prix de marchandise : il incorpore le coût du temps, du stockage et de l’assurance jusqu’à la date de livraison.',
            ],
          },
          {
            title: 'Le basculement d’échéance, et ce qu’il fabrique',
            paragraphs: [
              'Cette échéance arrive à terme, et la cotation bascule alors sur la suivante. Ce basculement crée une discontinuité qui n’est PAS un mouvement de marché : le prix change parce que le contrat a changé.',
              'Un historique long de matière première est donc une couture de contrats successifs, pas la trajectoire d’un même objet. Sur des horizons de plusieurs années, l’écart entre cette couture et l’évolution réelle du prix au comptant peut être considérable.',
            ],
          },
          {
            title: 'Comment lire une variation malgré cela',
            paragraphs: [
              'À retenir en lisant une variation : elle est fiable sur des fenêtres courtes, et demande de la prudence sur des fenêtres longues.',
              'Sur quelques jours, le contrat observé est le même d’un bout à l’autre de la fenêtre : la variation décrit bien un mouvement de prix. Sur cinq ans, elle additionne les mouvements de dizaines de contrats différents.',
            ],
          },
        ],
      },
      {
        slug: 'series-macroeconomiques',
        title: 'Une série macroéconomique n’est pas un cours',
        level: 'debutant',
        summary:
          'Publiée une fois par an, avec des mois de retard, à des dates différentes selon les pays — et révisée ensuite.',
        videoQuery: 'indicateurs macroéconomiques PIB inflation explication',
        takeaways: [
          'Un cours se forme en continu ; une donnée macroéconomique est une mesure publiée longtemps après la période décrite.',
          'Deux pays côte à côte peuvent décrire deux années différentes, faute de publier au même rythme.',
          'Un pays sans couleur sur la carte n’a pas une valeur nulle : il n’a rien publié pour cette année.',
          'Ces séries sont révisées après coup, sans qu’aucune erreur n’ait été commise.',
        ],
        sections: [
          {
            title: 'Une mesure, pas une cotation',
            paragraphs: [
              'Un cours se forme en continu et vaut à l’instant où on le lit. Une donnée macroéconomique — inflation, chômage, dette publique — est une MESURE, produite par un institut national puis harmonisée, et publiée longtemps après la période qu’elle décrit.',
            ],
          },
          {
            title: 'Trois conséquences visibles sur la carte',
            paragraphs: [
              'Trois conséquences que la carte macroéconomique de ZENKUU affiche explicitement. La valeur porte son année, qui n’est pas forcément celle du curseur. Deux pays côte à côte peuvent décrire deux moments distincts, parce qu’ils ne publient pas au même rythme. Et un pays sans couleur n’a pas une valeur nulle : il n’a rien publié pour cette année-là.',
              'La dernière est la plus importante à l’œil : une carte qui colorerait les pays sans donnée en « zéro » dessinerait une géographie fausse, et personne ne le verrait.',
            ],
          },
          {
            title: 'La révision est le fonctionnement normal',
            paragraphs: [
              'Ces séries sont en outre RÉVISÉES : une valeur peut changer des mois après sa première publication, sans qu’aucune erreur n’ait été commise — c’est le fonctionnement normal de la statistique publique.',
              'Les comparer à des cours de marché, ou en attendre une réactivité comparable, revient donc à leur demander ce qu’elles ne sont pas faites pour dire.',
            ],
          },
        ],
      },
    ],
  },
]

export const LESSONS: (Lesson & { topicId: string; topicTitle: string; topicVideoQuery: string })[] =
  LESSON_TOPICS.flatMap((topic) =>
    topic.lessons.map((lesson) => ({
      ...lesson,
      topicId: topic.id,
      topicTitle: topic.title,
      topicVideoQuery: topic.videoQuery,
    })),
  )

export function findLesson(slug: string) {
  return LESSONS.find((lesson) => lesson.slug === slug)
}

export function levelLabel(level: Level): string {
  return LEVELS.find((entry) => entry.id === level)?.label ?? level
}

/**
 * Fiches proposées en fin de lecture.
 *
 * Le MÊME THÈME d'abord, puis le reste de la bibliothèque pour compléter. L'ordre
 * n'est pas un classement de pertinence calculé : c'est celui du corpus, tel que la
 * rédaction l'a rangé. ZENKUU ne mesure pas l'audience de ses pages, et un « articles
 * similaires » présenté comme mesuré serait une donnée inventée (§5).
 *
 * Le complément hors thème existe pour une raison précise : un thème de trois fiches
 * n'en offrirait que deux, et une rangée de deux vignettes sous une grille de trois se
 * lit comme un trou.
 */
export function relatedLessons(lesson: { slug: string; topicId: string }, limit = 3) {
  const sameTopic = LESSONS.filter(
    (entry) => entry.topicId === lesson.topicId && entry.slug !== lesson.slug,
  )
  const others = LESSONS.filter(
    (entry) => entry.topicId !== lesson.topicId && entry.slug !== lesson.slug,
  )

  return [...sameTopic, ...others].slice(0, limit)
}
