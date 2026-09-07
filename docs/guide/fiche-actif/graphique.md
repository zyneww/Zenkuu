# Le graphique et ses réglages

## La barre d'outils

De gauche à droite :

* **Prix / Capitalisation** — ce que la courbe trace.
* **Comparer** — ajoute jusqu'à quatre séries sur le même graphique. Le panneau
  s'ouvre sur les tendances du moment ; le champ filtre **ce qui est déjà chargé**,
  d'où le message « Aucun actif de cette liste » plutôt que « aucun résultat » — l'actif
  existe peut-être, il n'est simplement pas dans les tendances.
* **Le type de tracé** — courbe, chandeliers quand la source les publie, TradingView,
  profondeur du carnet d'ordres.
* **Les périodes** — `24H`, `7J`, `1M`, `3M`, `YTD`, `1A`, `MAX`.
* **Le calendrier**, pour une plage précise.
* **L'engrenage**, qui ouvre les réglages ci-dessous.
* **Le téléchargement**, qui exporte ce que vous voyez.

## Les réglages

### Ce qui s'ajoute au graphique

| Réglage | Ce qu'il fait |
|---|---|
| **Volume** | la bande d'histogrammes sous la courbe |
| **Navigateur** | la mini-carte du bas, pour se déplacer dans le temps |
| **Moyenne mobile** | lisse la courbe |
| **Lignes de repère** | la grille |
| **Échelle logarithmique** | utile sur une plage `MAX`, où un actif peut avoir fait ×1000 |
| **Indice de peur et d'avidité** | une seconde courbe, sur son propre axe |

⚠️ **L'indice de peur et d'avidité ne concerne que les cryptomonnaies**, et il mesure le
sentiment du marché **entier**, pas celui de l'actif affiché. Il a son propre axe, à
droite, borné de 0 à 100 : le superposer à l'échelle des cours n'aurait aucun sens.

### La dénomination

**Cours en USD**, **en BTC**, **en ETH** — trois entrées exclusives. Tracer l'ether en
bitcoin répond à une question que le dollar ne pose pas : « lequel des deux monte le plus
vite ? »

### L'infobulle

Deux cases décident de ce que la bulle de survol affiche en plus du cours : la
**variation** et la **capitalisation**.

## Ce qui n'existe pas, et pourquoi

Deux réglages fréquemment demandés **ne sont pas là**, et l'absence est une limite de
source, pas un oubli :

* **Le taux de financement** (*funding rate*). La source le publie comme un instantané
  par place de marché, jamais comme une série. On ne peut donc pas le tracer dans le
  temps.
* **La valorisation diluée en courbe.** C'est un champ à l'instant présent ; la réponse
  historique de la source ne transporte que le cours, le volume et la capitalisation.

Les tracer supposerait de les reconstituer, c'est-à-dire d'inventer une histoire que
personne n'a publiée.

## Le mode sombre

Le graphique se redessine avec la palette du thème. Si vous basculez le thème pendant
qu'il est affiché, il se reconstruit — c'est normal et bref.
