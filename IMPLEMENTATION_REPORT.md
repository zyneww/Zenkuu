# Rapport de mise en œuvre — chantier C

Branche `migration-coingecko`. Huit tâches, cinq phases. Écrit le 5 septembre 2026.

Chaque section dit ce qui est **implémenté**, **partiel** ou **bloqué**, et ce qui a
été mesuré au navigateur plutôt que supposé.

---

## Vue d'ensemble

| # | Tâche | État |
|---|---|---|
| T1 | En-tête identique à CoinGecko | **Implémenté**, une réserve de vérification |
| T2 | Rare UI et Opensource UI | **Partiel** — 3 composants sur 5 placés, les paquets nommés n'existent pas sous ce nom |
| T3 | Bouton « Follow asset » | **Implémenté** |
| T4 | Infobulle de graphique façon Blockworks | **Implémenté** — l'essentiel préexistait, deux défauts corrigés |
| T5 | Six blocs Dropstab | **Partiel** — cinq livrés, le sixième n'a pas de source |
| T6 | Pied de pagination CoinGecko | **Implémenté** |
| T7 | Entrée « Analytics » et méga-menu | **Implémenté** |
| T8 | Quatre pages Analytics | **Implémenté** |

Sept commits, `lint` / `typecheck` / `test` propres à chaque étape. Tests : **552
passés** (six sont partis avec le module qu'ils couvraient, voir T8).

---

## T1 — En-tête

**Implémenté.** Le logotype passe de `h-8` à `h-6`, l'espacement du menu de `gap-4` à
`gap-6`, les entrées de `px-3` à `px-2` en `13px/1,425`, et `--header-height` de 4 rem à
3,5 rem.

La mesure qui a décidé du logotype : à hauteur égale, leur mot fait environ 12 px par
caractère, le nôtre 18,8 — un rapport de 1,57. Aligner la HAUTEUR DU BLOC donnait donc
un mot beaucoup plus gros que le leur. C'est la taille du mot qui a été alignée.

> ⚠️ **Réserve.** Le comportement responsive n'a pas pu être vérifié : le gestionnaire
> de fenêtres de cette machine ignore les demandes de redimensionnement du navigateur.
> Les valeurs sont justes aux largeurs mesurées ; les points de rupture ne le sont que
> par lecture du code.

---

## T2 — Rare UI et Opensource UI

**Partiel, et le blocage est en amont.**

Les deux paquets npm nommés par le brief ne sont pas ceux qu'il désigne :

- `rareui` est le nom d'une CLI dont le registre ne contient **aucun** des cinq
  composants demandés ;
- `opensource-ui` est d'un autre auteur et n'exporte que `Text` et `Glyph` ;
- `@appui/components`, que le site opensourceui.in met en avant, répond **404**.

Les cinq composants existent en revanche dans le registre shadcn
`swamimalode07/rare-ui`, servi en JSON à `https://www.rareui.com/r/<slug>.json`. Ce sont
eux qui ont été repris, à la main : `shadcn add` voulait écraser `lib/utils.ts` et avait
déjà ajouté un doublon de `cn@0.2.5`, revenu depuis. Bun reste le seul gestionnaire, le
verrou est cohérent — la consigne « ne jamais mélanger Bun/npm sans raison » est tenue.

**Trois des cinq sont placés, là où ils apportent quelque chose :**

| Composant | Emploi |
|---|---|
| `ScrollProgress` | `ReadingProgress`, sur la fiche d'actif — la page la plus longue du site |
| `DeleteButton` | `SavedScreens`, sur la suppression d'un écran enregistré, avec confirmation et toast |
| `AnimatedCounter` | `components/locale/Counter.tsx`, qui en dérive les séparateurs depuis `Intl` |

Chacun a demandé une correction avant de tenir : `ScrollProgress` posait trois états
sans condition dans une mesure observée par un `ResizeObserver` — « Maximum update depth
exceeded », capsule invisible ; il ne rendait rien. Corrigé par des mises à jour
fonctionnelles qui rendent la même référence quand rien ne change. Vérifié ensuite :
capsule 54 × 32, console propre.

**Les deux autres ont été RETIRÉS du dépôt, et c'est une décision assumée.**
`GooeyNav` et `BounceSidebar` n'ont pas de place sur ce site qui améliore quoi que ce
soit :

- le seul rail vertical est `ChartsSidebar`, une reproduction mesurée de Blockworks avec
  champ de recherche, groupes repliables et typographie relevée. `BounceSidebar` n'a ni
  recherche ni repli : l'y substituer aurait retiré deux fonctions pour ajouter une
  animation ;
- toutes les rangées d'onglets du site — `SegmentedControl`, `LinkTabs`, `ChartsTabs` —
  sont déjà dessinées contre une référence. La seule surface neuve, la barre d'onglets
  des pages Analytics, est une rangée de pilules relevée chez Blockworks ; y poser un
  fondu gluant dans un orange qui n'est pas celui de ZENKUU aurait été de l'ornement.

La consigne dit « ne livre jamais de composants décoratifs ». Les garder inutilisés
aurait laissé cinq cents lignes mortes ; les placer de force aurait enfreint la
consigne. Ils sont donc partis. **Restauration :** récupérer
`https://www.rareui.com/r/gooey-nav.json` et `.../bounce-sidebar.json`, et écrire leur
champ `content` dans `components/ui/`. Dites-moi où vous les voulez et je les remets.

**Opensource UI** (`filter-sort`, `toast-notification`, `text-loader`) n'a pas été
installé : le paquet correspondant n'existe pas, et le besoin était déjà couvert. Les
toasts passent par `lib/notify.ts`, émetteur unique sur `sonner` — qui était monté dans
la mise en page **sans un seul appel `toast()` nulle part**. Il n'y avait donc rien à
migrer, seulement à brancher.

---

## T3 — Bouton « Follow asset »

**Implémenté.** Commit `1d12328`.

L'étoile isolée à gauche du logo est retirée. Le raisonnement qui l'y tenait — « suivre
un actif est une action sur l'objet, pas sur son nom » — valait pour un TABLEAU, où
cinquante lignes portent la même commande et où la répétition explique le glyphe. En
tête de fiche elle est seule de son espèce.

`FollowAssetButton` la remplace : libellé, `aria-pressed`, bascule optimiste, état
désactivé quand la base manque, et un toast qui distingue les trois motifs d'échec que
l'action sait rendre.

**Deux constats à retenir :**

> ⚠️ **Le brief supposait une connexion qui n'existe pas.** Il demandait « ouvrir
> l'overlay de connexion si l'utilisateur n'est pas connecté ». `toggleWatchlist` appelle
> `ensureOwnerId()`, qui crée le cookie visiteur à la première écriture : il n'y a
> **aucun** état non connecté à intercepter. Un panneau de connexion aurait barré un
> geste qui marche déjà.

> ⚠️ **Une clé courte finit toujours par servir deux fois.** Le bouton affichait
> « Tracked » : la clé `'Suivi'` existait déjà dans la table, traduite ainsi pour un tout
> autre usage. C'est le risque propre à une table dont le français EST la clé. La forme
> longue `'Actif suivi'` lève l'ambiguïté.

Vérifié sur `/crypto/solana` : « Follow asset » ↔ « Following », `aria-pressed` suit, un
toast des deux côtés, état conservé après rechargement, anneau de focus visible.

---

## T4 — Infobulle de graphique

**Implémenté.** Commit `cf5ca01`.

Les cinq propriétés demandées **préexistaient** sur les deux moteurs de graphiques du
site : verticale tiretée, pastille cerclée du fond sur chaque courbe, bulle sombre
translucide qui se cale sur le point le plus proche et se replace près des bords. Le
tactile est porté par les bibliothèques — `onTouchMove` dans recharts 3.10.1,
`touchmove` dans le rendu canvas d'amCharts 5.20.2, vérifiés dans les sources
installées.

Mesuré chez Blockworks pour comparaison : fond `rgba(30,30,30,.9)`, filet 1 px `#444`,
rayon 5 px, rembourrage 6/10, texte 11/17, flou 5 px, ombre `6px 6px 10px -3px`.

**Ce qui a été corrigé, en revanche, était réel :** `AreaPlot` passait quatre propriétés
à son curseur, dont **trois ne peignaient rien** — `.recharts-tooltip-cursor` dans
`globals.css` réécrit le trait, sa cadence et son épaisseur. Le commentaire qui les
défendait annonçait un motif « 4 4 » aligné sur amCharts : ni l'un ni l'autre n'était
vrai, la page dessinait « 3 3 » et amCharts était passé à « 3 3 » de son côté.

La seule propriété qui agissait, `strokeOpacity: 0.8`, séparait les deux moteurs au lieu
de les réunir : `ink` 32 % × 0,8 d'un côté, `ink-muted` 55 % de l'autre. Le jeton
`--chart-crosshair` a été ramené sur les valeurs d'amCharts — et non l'inverse, amCharts
construisant ses couleurs en JavaScript et ne pouvant pas lire un `color-mix()`.

Mesuré sur une sonde portant la classe de recharts : `color(srgb 0.588 0.624 0.686 /
0.55)`, tirets 3 px, épaisseur 1 px — soit `#969faf` à 55 %, exactement ce que peint
amCharts.

---

## T5 — Les six blocs Dropstab

**Partiel : cinq livrés, un impossible.** Commit `fa04ded`.

`AssetSeriesCards` (« Séries du marché ») est supprimé. À sa place, sur la fiche
d'actif :

| Bloc | Donnée |
|---|---|
| **{Nom} face à ses voisins** | Cinq capitalisations, avec le rapport de taille de chacune à celle de l'actif |
| **Performance détaillée** | L'actif contre le bitcoin et l'ether, sur les six fenêtres publiées |
| **Records de cours** | Plus haut / plus bas, dates, multiple et écart publié |
| **Convertir {SYM}** | Deux champs, cotation native quand la source en publie une |
| **Places de cotation** | Les paires, triées par volume, paginées |

**Aucun appel réseau supplémentaire.** Les places de cotation étaient même déjà chargées
— cent paires à chaque rendu de fiche — pour n'en extraire qu'un symbole TradingView.

> ⚠️ **« Activities » n'est pas livré, et c'est une absence de source.** La référence y
> liste les campagnes de points et d'airdrops en cours sur le jeton : une donnée que
> DropsTab produit et publie lui-même. Aucun fournisseur du registre ne l'expose, et
> aucune API gratuite ne la couvre pour l'ensemble des actifs de ZENKUU. Un bloc vide ou
> garni d'exemples aurait été le placeholder que le cahier des charges interdit.

**Sur la colonne « Gain Potential » de la référence :** elle est reprise sous
« Taille relative ». Le nombre est le même — le rapport de deux capitalisations
publiées — mais l'intitulé de la référence laisse entendre qu'un jeton pourrait
atteindre la taille de son voisin. Le §5 interdit ce sous-entendu.

**Les lignes d'étalon de la matrice sont calculées, et le calcul est une identité, pas
une estimation.** À fenêtre et devise égales, la paire actif/étalon rend exactement
`(1 + rs) / (1 + rb) − 1`. Une case dont l'une des deux moitiés manque affiche « — » ; la
section entière se retire quand aucun étalon n'est disponible — le cas de toute action —
parce qu'elle ne serait alors qu'un doublon du rail de gauche.

**Deux défauts mesurés pendant la vérification :** les cellules de montant sortaient en
euro sur une page dont l'en-tête affichait des dollars (un formateur appelé côté serveur
écrit toujours la devise de la source ; la devise d'affichage est une préférence locale
que seul `Money`, côté client, sait lire) ; et le convertisseur portait l'initiale du
code monétaire à la place du logo — un « U » solitaire devant « USD ».

---

## T6 — Pied de pagination

**Implémenté.** Commit `6986802`.

La barre existait déjà et portait les trois éléments demandés. Deux écarts, dont le
second n'était pas visible dans le fichier qui l'a causé :

1. **Le cran 25 manquait.** La liste sautait de 10 à 50 — un facteur cinq entre deux
   crans voisins, au milieu duquel se trouve la hauteur d'un écran de portable.
   `ROW_CHOICES` est partagé par la barre ET par `/api/cotations`, qui s'en sert comme
   borne de clés de cache : un seul endroit à changer.

2. **`MarketTable` avait remonté le sélecteur de lignes dans sa rangée d'outils.** La
   note qui l'y tenait — « les réglages sont en haut » — est juste dans l'absolu et
   fausse ici pour une raison mécanique : la barre centre ses numéros sur **trois**
   pistes, et repasse à deux quand le sélecteur manque, ce qui colle les crans au bord
   droit. Retirer un contrôle du pied en déplaçait donc deux.

Mesuré sur `/crypto`, barre de 1 648 px : compteur centré à 117, pagination à **824** —
le milieu exact —, sélecteur à 1 585. Les quatre crans sont proposés et « 25 » rend bien
vingt-cinq lignes.

Aucun autre tableau du site ne pagine sans cette barre : les onze qui paginent
l'utilisent déjà, et les autres occurrences de `perPage` sont des tailles de requête.

---

## T7 — Entrée « Analytics »

**Implémenté.** Commit `d37c2ee`.

La barre lit désormais : *Cryptoactifs · Marchés traditionnels · Places de marché ·
**Analytics** · Comprendre · Plus loin*.

Le panneau porte quatre liens en deux sections : l'aperçu seul d'abord — c'est la porte
de la rubrique —, puis les trois vues détaillées. Les mettre sur un pied d'égalité
aurait donné quatre choix équivalents là où il y a une porte et trois pièces.

Aucune entrée `ready: false` : les quatre pages existent et sont servies.

---

## T8 — Les quatre pages Analytics

**Implémenté.** Commit `d37c2ee`. Source unique : **DefiLlama**, comme convenu.

| Route | Contenu | Point d'entrée |
|---|---|---|
| `/analytics` | Valeur immobilisée, frais 24 h et 30 j, frais mois par mois, cinquante plus gros protocoles | `/v2/chains`, `/protocols`, `/overview/fees` |
| `/analytics/blockchains` | Cent chaînes par valeur immobilisée, part, lien vers notre fiche | `/v2/chains` |
| `/analytics/tokenized-assets` | Les 132 protocoles rangés en « RWA » | `/protocols` |
| `/analytics/apy` | Deux cents pools au-dessus de 10 M$ | `yields.llama.fi/pools` |

**Les réponses sont énormes et c'est le fait dominant** : 8 190 protocoles, 17 090 pools,
2 658 protocoles de frais plus 3 086 points de série. Next plafonne son cache de données
à 2 Mo ; les trois premières le dépassent. `bypassNextCache` est donc activé, à la
condition qu'un autre cache prenne le relais — chaque fonction réduit la réponse à
quelques centaines de lignes typées **avant** de rendre la main, et c'est ce résultat que
le cache applicatif mémorise une heure. C'est le raisonnement déjà tenu par
`providers/coinpaprika.ts`.

**Trois précautions sur la page des rendements**, aucune décorative : un plancher de dix
millions de dollars (sur un pool de quelques milliers, une distribution ponctuelle
produit un taux annualisé à quatre chiffres qui n'aura plus cours la semaine suivante) ;
un tri par défaut sur la **taille** et non sur le taux, parce qu'ouvrir sur le taux
décroissant ferait de la page un palmarès, donc une recommandation ; et la moyenne à
trente jours en face du taux du jour, seule colonne qui empêche de lire un pic comme un
rendement.

**Les quatre routes sont les seules du site écrites en anglais des deux côtés**, chemin
interne compris. C'est une exception à la convention de `pathnames.ts`, prise sur la
consigne « anglais par défaut sur toutes les nouvelles routes ».

**Défauts corrigés en cours de route :**

- La figure des frais sortait **vide** — cadre gradué, filigrane, aucune barre. Sept cent
  trente barres quotidiennes sur 860 px font 1,18 px chacune. Regroupées au mois : vingt-quatre
  barres de 38 px, et la somme est juste puisqu'un flux se somme.
- Je passais l'unité de pagination **déjà traduite**. `TablePagination` la compare à une
  liste blanche de mots français avant de composer sa phrase : `unit={t('paire')}`
  marchait en français — où la clé EST la traduction — et retombait sur « résultat » dans
  les douze autres langues. Le défaut touchait aussi le tableau des places de T5.
- « dont 0,00 % de récompenses » s'affichait sur les pools dont la part de récompenses
  vaut quelques millièmes de point. Le seuil est désormais le premier centième affichable.

**Suppression :** `series-grouping.ts` et ses six tests. Le commit de T5 le gardait au
motif qu'il était générique ; il ne l'est pas — son type porte un prix, un volume et une
capitalisation, c'est-à-dire la forme exacte des cartes supprimées. `BarFigure` reste et
sert la figure des frais.

> ⚠️ **Le tracé des frais n'a pas pu être vu.** L'onglet piloté est `hidden`, `rAF` y est
> suspendu, et l'animation de recharts reste figée à 2 % — les barres mesurent 4 px au
> lieu de leur hauteur. Ce qui **est** vérifié : vingt-quatre paquets mensuels, valeurs de
> 0,9 à 3,3 Md $, domaine de l'axe à 3,4 Md — soit exactement le maximum des données. La
> géométrie et l'échelle sont justes ; seule la croissance est gelée par l'outil de mesure.

---

## Traductions

Cinquante et une clés nouvelles, chacune dans les **treize** langues : douze phrases de
suivi et d'écran (T3), treize pour les blocs Dropstab (T5), trente-huit pour les pages
Analytics (T8, dont neuf phrases de compteur dérivées d'un gabarit par langue).

Les tests de parité, de non-recopie du français et de conservation des jetons de
substitution passent sur les douze tables.

> ⚠️ **Un piège rencontré deux fois.** La table est écrite tantôt en apostrophes simples,
> tantôt en guillemets doubles. Un garde-fou qui ne cherchait qu'une des deux formes a
> laissé passer douze doublons de `'24 h'`, refusés par TypeScript (`TS1117`). Le second
> script vérifie les deux formes.

---

## Ce qui reste ouvert

1. **Responsive de l'en-tête (T1)** — non vérifié, le gestionnaire de fenêtres ignore les
   redimensionnements. À revoir sur une machine où le navigateur obéit.
2. **`GooeyNav` et `BounceSidebar` (T2)** — retirés faute de place honnête. Nommez une
   surface et je les remets.
3. **« Activities » (T5)** — attend une source. Rien à faire côté interface tant qu'aucun
   fournisseur ne publie ces campagnes.
4. **La figure des frais (T8)** — à regarder une fois dans un onglet au premier plan.
   La donnée est vérifiée, l'animation ne l'est pas.
