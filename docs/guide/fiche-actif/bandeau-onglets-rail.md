# Le bandeau, les onglets, le rail de chiffres

Une fiche d'actif se lit de haut en bas en trois temps : **qui c'est**, **ce qu'on veut
en voir**, **ses chiffres**.

## Le bandeau d'identité

En haut, dans l'ordre :

1. **Le fil d'Ariane** — `Accueil › Cryptomonnaies › Bitcoin`. Chaque maillon est
   cliquable, et le dernier dit où vous êtes.
2. **L'identité** — logo, nom, code (`BTC`), et le rang de capitalisation en pastille
   contre le logo quand la source le publie.
3. **Les étiquettes de catégorie** — « Layer 1 (L1) », « Smart Contract Platform »…
   Elles viennent de la source telle quelle. ⚠️ Elles ne sont **pas** cliquables : la
   source publie des libellés, pas les identifiants qu'attendent les pages de catégorie,
   et fabriquer un lien depuis le texte affiché en produirait un sur cinq qui tombe à
   côté.
4. **Les liens officiels** — site, X, Reddit, Telegram, explorateurs, livre blanc, code.
   Seuls ceux que la source publie apparaissent. Au-delà de quelques-uns, les suivants
   se replient sous un chevron.
5. **L'étoile de suivi**, à droite.

⚠️ **Ce bandeau ne bouge pas quand vous changez d'onglet.** C'est voulu : seul le
contenu en dessous est remplacé. Vous ne perdez jamais de vue quel actif vous lisez.

## Les onglets

| Onglet | Ce qu'il porte | Où |
|---|---|---|
| **Aperçu** | le graphique, le rail de chiffres, les actualités | partout |
| **Métriques** | le catalogue de toutes les mesures publiées, filtrable | partout |
| **Valeurs historiques** | la clôture de chaque journée et l'écart avec la veille | cryptomonnaies |
| **Halving** | le calendrier des divisions de récompense | bitcoin seulement |

L'onglet **Halving** n'existe que pour le bitcoin, parce que le halving est une règle de
son protocole. Un onglet qui mènerait à une page absente n'est pas affiché.

### L'onglet Métriques

Il liste **les mesures réellement renseignées** pour cet actif, groupées comme le rail
les groupe, chacune avec sa valeur du jour. Une rangée de filtres en haut porte le
décompte de chaque groupe — `Toutes 19 · Fondamentaux 5 · Amplitude 4 · Offre 4 ·
Variations 6`.

Les flèches ← → déplacent le filtre au clavier, `Début` et `Fin` sautent aux extrémités.

Chaque carte mène à la page de la mesure, qui en donne la définition complète et, quand
une série existe, son évolution sur un an. ⚠️ **Trois mesures seulement ont une série** :
le cours, la capitalisation et le volume. Les autres n'existent qu'à l'instant présent
chez la source, et leur page le dit au lieu de tracer une ligne plate.

## Le rail de chiffres

La colonne de gauche, sous le graphique sur téléphone. Quatre groupes :

* **Fondamentaux** — capitalisation, volume 24 h, valorisation diluée, rapport
  capitalisation/FDV, valeur verrouillée, rang, place de cotation.
* **Amplitude** — plus haut et plus bas sur 24 h, extrêmes historiques et l'écart qui
  vous en sépare.
* **Offre** — en circulation, totale, maximale, part émise.
* **Variations** — 1 h, 24 h, 7 j, 14 j, 30 j, 1 an.

Un groupe sans aucune donnée **disparaît entièrement**, titre compris.

Chaque ligne porte deux choses :

* une **infobulle** « ⓘ » qui dit ce que la mesure signifie, sans quitter la page ;
* un **lien** sur le libellé, vers la page de cette mesure.

L'écart à un record est en **gris**, pas en rouge : « −36 % du record » n'est pas une
baisse du jour, c'est une position dans une amplitude. Seules les vraies variations sont
colorées.
