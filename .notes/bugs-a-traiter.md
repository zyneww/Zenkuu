# Trouvé pendant la refonte visuelle — à traiter dans la passe d'optimisation

## 1. RÉSOLU — « l'accueil fige le navigateur » était un artefact de mesure

Le constat était faux, et il a coûté cher : ni gel, ni défaut d'hydratation.

Le serveur de développement s'annonce sur `localhost:3000`. En l'ouvrant par
`127.0.0.1:3000`, Next.js considère la page comme une AUTRE ORIGINE et refuse de
lui servir ses propres morceaux de code :

    ⚠ Blocked cross-origin request to Next.js dev resource /_next/static/chunks/…

Sans ces morceaux, `hydrateRoot` n'est jamais atteint. La page reste alors du HTML
mort : aucun menu ne s'ouvre, aucune courbe ne se dessine, et `window.next` existe
pourtant — d'où l'illusion d'un React chargé mais bloqué.

Ce qui a fait perdre le plus de temps : **rien ne le signale côté navigateur**.
Console vide, `readyState: complete`, aucune erreur. Le diagnostic n'est visible
que dans les JOURNAUX DU SERVEUR, qui l'écrivent en clair avec le remède
(`allowedDevOrigins`).

Les timeouts CDP, eux, venaient d'onglets abîmés par des captures répétées sur un
document d'un mégaoctet — pas de la page.

À retenir : **toujours ouvrir le site par la même origine que celle annoncée au
démarrage**, et lire les journaux du serveur AVANT d'instrumenter le code.

## 2. RÉSOLU — une courbe impossible à tracer disparaissait sans rien dire

Défaut réel, celui-là, trouvé une fois le point 1 écarté.

`AreaPlot` retourne `null` en dessous de deux points — un seul relevé ne décrit
aucune évolution. Mais ce seuil vivait uniquement dans le composant, et chaque
appelant devait le deviner. `HeroChart` gardait sur `points.length > 0` : avec
exactement un relevé — l'état NORMAL d'une série que le site vient de commencer à
enregistrer — il rendait le graphique, qui s'effaçait aussitôt.

Mesuré sur l'accueil : une zone de trois cents pixels à zéro enfant. Ni courbe, ni
message, ni erreur. Deux autres appelants étaient exposés (`BasketCharts` avec une
série à zéro point, `ComparatorView` sans garde).

Corrigé À LA SOURCE : le silence est devenu explicite (`quiet`, réservé aux
étincelles de tableau) et le défaut est désormais une phrase traduite dans les
treize langues. Un appelant qui oublie le garde obtient une explication, pas un
trou.

## 2 bis. RÉSOLU — le compte et le seuil partagent enfin leur source

La carte affichait « Courbe en cours de constitution — 3 relevés enregistrés »
alors que `MetricCard` traçait dès deux points : le nombre annoncé et la série
transmise ne venaient pas du même endroit.

`MetricCard` n'existe plus, et `DominanceView` a été réécrit. Il compare
`points.length` à `MIN_POINTS_FOR_CHART`, importé de `@zenkuu/data` — un seul
seuil, partagé — et n'affiche plus AUCUN compte tant que la série n'est pas prête
(`series.ready ? … : null`). L'incohérence ne peut donc plus se produire : il n'y a
plus deux chiffres à faire diverger, il n'y en a qu'un, et il ne sort pas.

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

**Le scanner existe désormais.** `scripts/audit-interactif.mjs` lit `aria-label`,
`title` et `placeholder` sur chaque page anglaise, en cherchant le MOT ENTIER pour
qu'un « Devise » ne s'accroche pas dans « Devises ». Deux défauts de cette famille
ont déjà été pris et corrigés par ce moyen : le titre de la fenêtre des préférences,
resté « Devise » et « Langue » en dur alors que le composant tenait son traducteur
douze lignes plus haut ; et le chevron du champ de filtre des catégories, qui
n'avait aucun nom du tout.

⚠️ `alt` reste HORS du champ, délibérément. Les vignettes d'actualité portent le
titre de l'article, en français chez les rédactions françaises : c'est du contenu,
pas de l'interface. Le traduire reviendrait à réécrire l'article d'autrui — c'est
la même raison qui écarte les sous-arbres `<article>` du contrôle de texte.

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
