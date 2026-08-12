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
 */

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
  body: string[]
}

export interface LessonTopic {
  id: string
  title: string
  description: string
  lessons: Lesson[]
}

export const LESSON_TOPICS: LessonTopic[] = [
  {
    id: 'fondamentaux',
    title: 'Lire un marché',
    description: 'Les grandeurs que vous croiserez sur chaque fiche d’actif.',
    lessons: [
      {
        slug: 'capitalisation',
        title: 'Lire une capitalisation, et connaître ses limites',
        level: 'debutant',
        summary:
          'La capitalisation multiplie un cours par une quantité — ce n’est pas de l’argent investi.',
        body: [
          'La capitalisation est le produit du cours par le nombre d’unités en circulation. Elle sert à comparer des tailles, pas à mesurer une somme réellement engagée.',
          'L’erreur la plus fréquente consiste à lire « 800 milliards de capitalisation » comme « 800 milliards ont été investis ». C’est faux : si la dernière transaction s’est faite à un certain prix, ce prix est appliqué à l’intégralité des unités existantes, y compris celles que personne ne cherche à vendre.',
          'Conséquence pratique : sur un actif peu échangé, une capitalisation élevée peut reposer sur très peu de transactions. C’est pourquoi le volume mérite d’être lu en même temps que la capitalisation, jamais séparément.',
        ],
      },
      {
        slug: 'volume-et-liquidite',
        title: 'Volume et liquidité : pourquoi une forte variation peut tromper',
        level: 'debutant',
        summary:
          'Une variation à deux chiffres sur un volume minuscule ne dit presque rien.',
        body: [
          'Le volume mesure ce qui a réellement changé de mains sur une période. La liquidité, elle, décrit la facilité à échanger sans faire bouger le cours.',
          'Une hausse de 40 % sur un actif dont le volume quotidien est faible peut résulter de quelques transactions. La même hausse sur un actif très échangé traduit un mouvement de marché autrement plus large.',
          'C’est la raison pour laquelle les classements de plus fortes hausses de ZENKUU sont calculés sur les 100 plus grandes capitalisations : sans ce garde-fou, ils seraient dominés en permanence par des actifs minuscules.',
        ],
      },
      {
        slug: 'offre-en-circulation',
        title: 'Offre en circulation, offre totale, offre maximale',
        level: 'intermediaire',
        summary: 'Trois nombres distincts, souvent confondus, aux implications différentes.',
        body: [
          'L’offre en circulation désigne les unités effectivement disponibles. L’offre totale inclut ce qui existe mais reste bloqué ou non distribué. L’offre maximale est le plafond, quand il en existe un.',
          'L’écart entre circulation et total indique ce qui pourrait arriver sur le marché à l’avenir. Un écart important signale une dilution potentielle, que la capitalisation courante ne reflète pas.',
          'Certains actifs n’ont aucun plafond. Dans ce cas, ZENKUU affiche l’information comme absente plutôt que d’inscrire un nombre arbitraire.',
        ],
      },
    ],
  },
  {
    id: 'graphiques',
    title: 'Lire un graphique',
    description: 'Ce que les représentations montrent — et ce qu’elles ne montrent pas.',
    lessons: [
      {
        slug: 'lire-des-chandeliers',
        title: 'Lire un graphique en chandeliers',
        level: 'intermediaire',
        summary: 'Quatre valeurs par bougie : ouverture, plus haut, plus bas, clôture.',
        body: [
          'Chaque bougie résume un intervalle de temps par quatre valeurs. Le corps relie l’ouverture à la clôture ; les mèches marquent les extrêmes atteints pendant l’intervalle.',
          'La couleur indique seulement si la clôture est au-dessus ou en dessous de l’ouverture. Elle ne dit rien de la tendance plus large, ni de la comparaison avec la bougie précédente.',
          'L’intervalle est décisif : la même série affichée en bougies de 30 minutes ou de 4 heures raconte deux histoires différentes. ZENKUU indique la granularité réellement fournie par la source, qui l’impose selon la fenêtre demandée.',
        ],
      },
      {
        slug: 'moyennes-mobiles',
        title: 'Ce qu’une moyenne mobile dit, et ne dit pas',
        level: 'intermediaire',
        summary: 'Un lissage du passé, calculé avec un retard structurel.',
        body: [
          'Une moyenne mobile calcule la moyenne des dernières valeurs, recalculée à chaque nouveau point. Elle atténue le bruit pour rendre une tendance plus lisible.',
          'Elle est par construction en retard : elle intègre des valeurs passées, donc elle réagit après le cours. Ce retard croît avec la période choisie.',
          'Elle ne prédit rien. Les croisements de moyennes sont des faits arithmétiques sur des données passées, pas des signaux — et ZENKUU ne les présente jamais comme tels.',
        ],
      },
      {
        slug: 'sans-signaux-imaginaires',
        title: 'Lire un graphique sans y projeter de signaux imaginaires',
        level: 'debutant',
        summary: 'L’œil humain trouve des figures dans le bruit. C’est le piège principal.',
        body: [
          'Notre perception détecte spontanément des motifs, y compris dans des séries parfaitement aléatoires. Une figure repérée après coup sur un graphique n’a donc aucune valeur prédictive en soi.',
          'Changer l’échelle verticale, la fenêtre ou l’intervalle modifie radicalement l’allure d’une même série. Une « tendance » évidente sur trois mois peut disparaître sur trois ans.',
          'Le réflexe utile est de toujours vérifier trois choses avant de conclure : quelle période est affichée, quelle échelle est utilisée, et quel volume accompagne le mouvement.',
        ],
      },
    ],
  },
  {
    id: 'contexte',
    title: 'Contexte et indicateurs',
    description: 'Les indicateurs agrégés que publie ZENKUU, et leur portée réelle.',
    lessons: [
      {
        slug: 'indice-de-sentiment',
        title: 'Comment lire un indice de sentiment',
        level: 'debutant',
        summary: 'Un indicateur composite d’ambiance, pas une mesure de valeur.',
        body: [
          'L’indice de peur et d’avidité agrège plusieurs mesures — volatilité, volume, tendances de recherche — en un seul nombre de 0 à 100.',
          'Il décrit un climat, pas une valorisation. Un indice bas signifie que le marché est nerveux, pas qu’un actif est bon marché.',
          'Sa méthodologie est celle de la source qui le publie, Alternative.me, et non celle de ZENKUU. Comme tout indicateur composite, il dépend entièrement des pondérations choisies par son auteur.',
        ],
      },
      {
        slug: 'dominance',
        title: 'La dominance : une part, pas une performance',
        level: 'avance',
        summary: 'Elle peut monter alors que l’actif baisse.',
        body: [
          'La dominance mesure la part d’un actif dans la capitalisation totale de sa classe.',
          'Comme toute part relative, elle bouge pour deux raisons distinctes : parce que l’actif change de valeur, ou parce que le reste du marché change. Une dominance qui augmente pendant que le cours baisse signifie simplement que le reste baisse plus vite.',
          'Elle est donc utile pour situer un actif dans son marché, et trompeuse si on la lit comme une mesure de performance.',
        ],
      },
      {
        slug: 'taux-de-change',
        title: 'Pourquoi les conversions utilisent le taux BCE',
        level: 'avance',
        summary: 'Un taux de référence quotidien, stable et vérifiable — pas un cours de marché.',
        body: [
          'ZENKUU convertit les montants avec le taux de référence publié chaque jour ouvré par la Banque centrale européenne.',
          'Ce n’est pas un cours de marché en continu : c’est un point de référence unique par jour. L’avantage est la stabilité et la vérifiabilité — deux visiteurs consultant la même page voient le même montant, traçable à une publication officielle.',
          'La contrepartie est assumée : un montant converti n’est pas un cours réellement coté. C’est pourquoi la devise d’origine et la date du taux appliqué sont toujours affichées à côté.',
        ],
      },
    ],
  },
]

export const LESSONS: (Lesson & { topicId: string; topicTitle: string })[] =
  LESSON_TOPICS.flatMap((topic) =>
    topic.lessons.map((lesson) => ({ ...lesson, topicId: topic.id, topicTitle: topic.title })),
  )

export function findLesson(slug: string) {
  return LESSONS.find((lesson) => lesson.slug === slug)
}

export function levelLabel(level: Level): string {
  return LEVELS.find((entry) => entry.id === level)?.label ?? level
}
