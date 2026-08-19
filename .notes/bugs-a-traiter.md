# Trouvé pendant la refonte visuelle — à traiter dans la passe d'optimisation

## 1. L'accueil fige le moteur de rendu

Constaté au navigateur : sur `/fr`, `Runtime.evaluate` expire au bout de 45 s et
`Page.captureScreenshot` au bout de 30 s. Deux onglets successifs ont gelé.
`/methodologie`, elle, répond normalement — le défaut est donc propre à l'accueil,
non au site.

React s'hydrate pourtant sans erreur : aucune exception en console, et le crochet
d'instrumentation ne signale que 97 ms.

Suspects, dans l'ordre : le bandeau de cotations animé (`TickerWidget`, animation
CSS en boucle sur une bande dupliquée), la carte thermique (`HomeHeatmap`), les
graphiques (`AreaPlot` en instancie plusieurs).

## 2. Conséquence visible : les courbes des cartes de mesure ne se dessinent pas

`AreaPlot` rend son conteneur — mesuré à 318 × 128 dans le DOM — mais jamais le
`<svg>`. Le tracé est conditionné à `width > 0 && scales`, et `width` vient d'un
`ResizeObserver` posé dans un `useEffect`. Le conteneur ayant bien sa largeur dans
le DOM, l'effet ne s'exécute pas : cohérent avec un moteur figé avant qu'il ne
tourne.

À vérifier une fois le point 1 réglé — les deux ne font peut-être qu'un.

## 3. Les cartes de mesure réservent la place d'une courbe absente

Traité : `MetricCard` accepte désormais `pending`, qui écrit la raison de
l'absence à la place du tracé. Ne se déclenche que si la série est vraiment vide —
ce qui n'est pas le cas ici, voir le point 2.

## 4. Les attributs d'accessibilité sont restés en français

Le comparateur fr/en ne lit que le TEXTE VISIBLE : il découpe le HTML sur les
balises et ne regarde jamais dans les attributs. Tout `aria-label`, `title` et
`placeholder` écrit en dur lui a donc échappé — et ce sont précisément les
libellés qu'un lecteur d'écran annonce.

Un utilisateur de synthèse vocale en japonais entend donc « Fermer », « Repères
chiffrés », « Regroupement plus fin ». C'est la seule partie du site qui n'a pas
été traduite, et c'est celle qui compte le plus pour qui ne voit pas l'écran.

À mesurer avec un scanner d'ATTRIBUTS, non de texte.

## 5. Temps de réponse mesurés (serveur de développement)

Relevés au `curl`, deuxième passage donc caches chauds. À reprendre en
production, mais l'écart entre les routes est déjà parlant.

    /fr                1,61 s      accueil
    /fr/marches        0,93 s
    /fr/screener       0,69 s
    /fr/methodologie   0,35 s      page de texte pur

À froid, l'accueil montait à 4,9 s — c'était la compilation Turbopack, pas la
page. Le rapport de 4,6× entre l'accueil et une page de texte, lui, tient après
chauffe : il vient du nombre de sources interrogées.

`/methodologie` à 0,35 s est le meilleur argument pour la génération statique des
pages de texte : elles paient aujourd'hui un rendu serveur pour un contenu qui ne
change jamais.
