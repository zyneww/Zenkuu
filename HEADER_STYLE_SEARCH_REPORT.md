# Header, direction esthétique, recherche et mode sombre — rapport

Session du **2026-09-07**. Quatre tâches : T1 (animation des mega-menus), T2 (direction
esthétique), T3 (menu de recherche façon Uniswap), et T4 — le mode sombre de
`taostats.io`, ajoutée en cours de session.

Tout ce qui est chiffré ci-dessous a été **mesuré au navigateur**, dans Chrome, sur les
sites de référence eux-mêmes. Ce qui n'a pas pu l'être est signalé comme tel à chaque
fois plutôt qu'estimé.

---

## T1 — Les mega-dropdowns du header

### Ce qui n'allait pas, et que le code disait lui-même

Le panneau était déjà bien construit : un `NavigationMenu` de Radix avec un viewport
unique, aligné sur le bord gauche du déclencheur. Mais une note du fichier avouait le
trou :

> « Et les deux références n'ont pas pu être mesurées. Leurs menus ne s'ouvrent sous
> aucune automatisation — quatre tentatives, deux sites. La durée et la courbe sont donc
> celles du PROJET. »

Les valeurs d'animation étaient donc des jetons internes, pas un relevé. C'est
exactement ce que T1 demandait de corriger.

**Et un défaut structurel s'est révélé à la mesure :** `left` et `height` changeaient
sans transition. Le panneau **se téléportait** d'un bouton au suivant.

### Ce qui a été mesuré sur wrangle.ai

Méthode : échantillonnage image par image (`requestAnimationFrame`) du style en ligne de
leur panneau, plus lecture des styles calculés et de `document.getAnimations()`.

| Élément | Valeur mesurée |
|---|---|
| Déclencheur — fond et encre | **200 ms** · `cubic-bezier(0.4, 0, 0.2, 1)` |
| Chevron — rotation | **200 ms** · `cubic-bezier(0.4, 0, 0.2, 1)` |
| Panneau — ouverture | `opacity 0→1` · `translateY(-8px)→0` · `scaleX(0.96)→1` · `scaleY(0.94)→1` |
| Origine de la transformation | **le milieu de l'intitulé** (`48.5px 0px` sur un bouton de 97 px) |
| Courbe d'ouverture | ressort critique, **sans dépassement** — 50 % à 24 ms, 90 % à 74 ms, 99 % à 130 ms, repos à 215 ms |
| Panneau — passage d'un menu à l'autre | **l'opacité reste à 1,000 et `transform` à `none`** ; seuls `left`, `width` et `height` interpolent |
| Courbe du passage | 50 % à 15 % de la durée, 90 % à 47 % — **plus douce que l'ouverture** |
| Contenu | fondu croisé + `translateX(±14px)` |
| Décalage | `top: calc(100% + 8px)` |
| Anti-fermeture | bande invisible de 8 px (`-top-2 h-2 w-full`) au-dessus du panneau |
| Forme | rayon 12 px · bordure 1 px `#eee` · `shadow-sm` |
| Fond | **aucun voile** ; le flou est sur l'en-tête (`bg-white/90 backdrop-blur-md`) |
| Accessibilité | `aria-expanded` seul — **ni `aria-controls`, ni `aria-haspopup`, ni gestion clavier** |

Le constat central : **leur panneau ne se ferme jamais pour se rouvrir ailleurs. Il se
déforme.** C'est ce qui produit la fluidité, et aucun réglage de durée ne l'obtient à
partir d'un panneau qui disparaît.

### Ce qui a été implémenté

1. **Le glissement.** `left` sur le conteneur et `height` sur le viewport interpolent
   désormais, **conditionnés à `data-shifting`** — un drapeau vrai uniquement quand un
   panneau était déjà ouvert. Sans cette garde, la première ouverture ferait traverser
   la barre au panneau depuis sa position précédente.
2. **Deux courbes, parce que la mesure en montre deux.** L'ouverture prend
   `cubic-bezier(0.16, 1, 0.3, 1)` sur 200 ms (équivalent CSS du ressort mesuré, mêmes
   repères à quelques millisecondes) ; le glissement prend `cubic-bezier(0.25, 1, 0.5, 1)`,
   deux fois moins nerveux — c'est ce que dit le tableau ci-dessus.
3. **Le geste d'entrée** passe de 4 px à 8 px de translation et reprend l'agrandissement,
   avec l'origine au milieu de l'intitulé (`--nav-origin-x`, calculée sur le déclencheur
   ouvert et bornée quand le panneau est ramené contre un bord).

### Un défaut trouvé en vérifiant

`duration-*` et `ease-*` de Tailwind posent **`animation-…` ET `transition-…`**. Le
viewport restant `data-[state=open]` pendant le glissement, la courbe d'entrée écrasait
celle de `height` : relevé au navigateur, `left` glissait en `cubic-bezier(0.25, 1, 0.5, 1)`
pendant que `height` suivait `cubic-bezier(0.16, 1, 0.3, 1)`. Les deux moitiés de la même
déformation se désynchronisaient. Les utilitaires d'entrée sont désormais visés sur
`[animation-duration]` / `[animation-timing-function]` seuls.

### Ce qui n'a pas pu être mesuré

**La fermeture.** Motion l'anime en `requestAnimationFrame`, que Chrome coupe dès qu'un
onglet passe en arrière-plan : sous automatisation, l'animation de sortie ne se joue tout
simplement pas. Les valeurs de sortie restent celles du projet (100 ms, sans
agrandissement) et ne prétendent à aucun relevé.

### Ce qui n'a délibérément PAS été copié

**Leur accessibilité.** Leurs déclencheurs ne portent que `aria-expanded` : pas de
`aria-controls`, pas de `aria-haspopup`, aucune navigation au clavier native.
L'implémentation de ZENKUU, bâtie sur Radix, est **strictement plus accessible que la
référence**. Seule la mécanique d'animation a été reprise.

### Vérifié

- Glissement : `left` et `height` sur `0.2s cubic-bezier(0.25, 1, 0.5, 1)`, opacité
  constante, `transform: none`, origine à 45,4 px (le milieu de l'intitulé « Analytics »).
- Première ouverture : aucune transition (`data-shifting="false"`), animation
  `enter / 0.2s / cubic-bezier(0.16, 1, 0.3, 1)`.
- Clavier : Entrée ouvre, `aria-expanded` bascule, Échap referme **et rend le focus au
  déclencheur**.
- `prefers-reduced-motion` : `motion-reduce:transition-none` et `motion-reduce:animate-none`
  présents dans le CSS compilé, doublés d'une règle globale qui ramène toute transition
  à 0,01 ms.
- Aucun décalage de mise en page : le panneau est en position absolue.

---

## T2 — Direction esthétique

### Le conflit, et la réponse

Le prompt demandait Duolingo pour tout le site ; le chantier précédent avait aligné le
site sur CoinGecko. Les deux sont opposés. La question a été posée **avant toute
implémentation**, comme exigé.

**Réponse retenue — option 1 :** CoinGecko reste dominant pour la densité de données ;
Duolingo n'inspire que des éléments ponctuels, sans changer la structure dense.

### Justification

Elle n'est pas seulement une préférence : le code porte des dizaines de valeurs
**mesurées** chez CoinGecko, Backpack, Tokenomist et ASXN, chacune accompagnée de son
relevé. Basculer globalement vers Duolingo aurait jeté ce travail au profit d'un langage
qui, sur un point précis, est incompatible avec la densité : **sa graisse est unique
(700 partout)**. Un tableau dense a besoin d'une hiérarchie fine — symbole, nom, cours et
variation ne peuvent pas tous crier.

### Ce qui a été relevé et appliqué

`DUOLINGO_STYLE_TOKENS.md` porte le relevé complet (typographie, couleurs, anatomie du
bouton à tranche) **et le tri** — un relevé sans tri serait une invitation à tout
appliquer.

Une seule surface l'emprunte : **`EmptyState` dans sa forme pleine**. Un état vide n'est
pas une ligne de données, c'est un message. Marque 28 → 44 px, titre 14 px/500 →
18 px/700, respiration `py-10 gap-2` → `py-14 gap-3`.

**La forme `compact` ne bouge pas d'un pixel** — c'est elle qui vit dans les panneaux de
données (24 des 66 appels). C'est exactement la frontière que l'option 1 trace.

### Ce qui n'a PAS été emprunté, et pourquoi

| Élément | Raison |
|---|---|
| Vert #58CC02 | Le site a déjà une marque (#00dbbc depuis T4) ; deux couleurs saturées = deux marques |
| Capitales à 0,8 px d'interlettrage | 15 à 20 % de largeur en plus sur des intitulés français |
| Graisse 700 partout | Détruit la hiérarchie fine d'un tableau — le point exact d'incompatibilité |
| Bouton à tranche (3,33 px) | Le bouton principal porte déjà un enfoncement **mesuré** chez Backpack |
| Mascotte, illustrations | Identité propriétaire — interdit par le prompt |
| Gamification (séries, badges) | Suppose un usage répété à récompenser ; un site de cours n'en a pas |

---

## T3 — Le menu de recherche façon Uniswap

### Ce qui existait déjà

La première section de la capture — « Popular tokens » : logo rond, nom, symbole gris
dessous, prix à droite, variation colorée — **existait déjà**, alimentée par
`/api/tendances` avec de vraies données. Il manquait la seconde section.

### Pourquoi ce ne sont pas des collections NFT

Ce n'est pas un choix de goût. L'endpoint qui classe les collections NFT par volume
(`/nfts/markets`) est **réservé à l'offre payante** de CoinGecko : il répond
`error_code 10005`, vérification déjà consignée dans le dépôt. ZENKUU n'a qu'une
**sélection arrêtée de six collections**, lues une par une.

Deux conséquences : intituler « populaires » une liste écrite à la main serait faux, et
six appels séquencés derrière un limiteur ouvriraient le panneau en plusieurs secondes.

La question a été posée, et la réponse retenue est **« Catégories en vue »**.

### Ce qui a été implémenté

- `getTopNarratives(5)` — un **vrai classement** : les secteurs triés par ampleur du
  mouvement sur 24 h, au-dessus d'un milliard de capitalisation.
- Les deux listes voyagent dans **une seule réponse** : `/api/tendances` les charge en
  parallèle (`Promise.all`), et une panne de l'une ne fait pas tomber l'autre puisque
  `DataResult` porte son propre `ok`. Le panneau garde un seul aller-retour.
- `CategoryRow` : logo représentatif, nom, capitalisation en gris dessous, variation
  colorée à droite. C'est la grammaire du panneau « Narratifs » de l'accueil, transposée
  dans la géométrie des lignes de recherche — et c'est la disposition de la capture (un
  nom, un fait de TAILLE en gris dessous, une valeur à droite).
- Composant séparé de `ResultRow` : une catégorie n'a ni symbole, ni rang, ni cours
  convertible, ni rien à suivre — c'est-à-dire **aucune** des quatre choses autour
  desquelles `ResultRow` est construit. La géométrie, elle, est partagée à la classe près.

### Adaptations aux données réelles

- **La capitalisation reste en dollars et n'est pas convertie** : la source ne la publie
  qu'ainsi pour les catégories. Même réserve que le panneau de l'accueil.
- Aucun placeholder, aucune donnée simulée. Vérifié au navigateur : cinq catégories
  réelles avec leurs capitalisations et variations servies par la source.
- Deux phrases sur trois ont été évitées : `Capitalisation` existait déjà dans les douze
  tables, et l'intitulé de colonne a été supprimé — à droite il n'y a qu'une pastille
  signée, elle se décrit seule. Une seule clé nouvelle, traduite dans les douze langues.

### Navigation au clavier

Les lignes sont des `CommandItem` de cmdk rendus en vrais liens : les flèches les
parcourent, Entrée ouvre, Échap ferme — sans code supplémentaire.

---

## T4 — Le mode sombre de taostats.io

Tâche ajoutée en cours de session : « exactement le même mode sombre que
`https://taostats.io/` ».

### Méthode

Leurs variables `--nl-*` ont été lues **résolues sur `<html>`**, et non dans les feuilles
de style — celles-ci déclarent les valeurs CLAIRES, qui auraient donné une palette
entièrement fausse.

### La rampe

| Jeton ZENKUU | Valeur | Origine taostats |
|---|---|---|
| `--color-canvas` | `#0e0f11` | `--nl-bg-primary` |
| `--color-surface-muted` | `#131416` | `--nl-bg-quaternarry`, blanc 2 % |
| `--color-surface` / `-panel` / `-overlay` | `#18191b` | `--nl-card-surface` |
| `--color-border-subtle` | `#1c1d1f` | `--nl-border-primary` |
| `--color-surface-hover` | `#242424` | `--nl-gray-highlight` |
| `--color-surface-active` | `#2e2e2e` | `--nl-bg-input-primary` |
| `--color-ink` | `#ffffff` | `--nl-fg-primary` |
| `--color-ink-secondary` | `#9f9fa0` | `--nl-fg-secondary` |
| `--color-ink-muted` | `#6a6c70` | `--nl-fg-tertiary` |
| `--color-brand` | `#00dbbc` | `--nl-fg-brand` |
| `--color-up` | `#00dbbc` | `--nl-positive-trend` |
| `--color-down` | `#ff3d57` | `--nl-negative-trend` |
| `--color-status` | `#249cff` | `--nl-fg-dark-blue` |

### Trois constats qui ne se devinaient pas

1. **Les neutres sont froids en bas, neutres en haut.** `#0e0f11` a R < G < B — un noir
   légèrement bleuté, pas un gris. Mais leurs deux niveaux hauts sont parfaitement neutres
   (36/36/36 et 46/46/46). L'asymétrie est chez eux.
2. **Le filet et le survol étaient un seul jeton ici** (`#26282f`). Chez eux ce sont deux
   valeurs, dont un filet en **blanc bleuté** (`#f3f8ff` à 6 %) et non en blanc pur.
3. **Le turquoise sert quatre rôles à la fois** : marque, bordure de marque, succès **et
   hausse**. Un lien et un « +2,4 % » sont désormais la même encre.

Les couleurs à canal alpha sont écrites **aplaties** sur leur propre fond : le parseur de
`palette.test.ts` ne lit que du hex à six chiffres, et un jeton en `rgb(… / α)` aurait
disparu de ses assertions sans bruit.

### Un jeton a dû suivre sans être demandé

`--color-status`. Sa note exigeait un ton « décalé franchement par rapport au vert de
hausse ». La hausse étant devenue turquoise, le cyan `#22d3ee` se serait retrouvé à
quelques degrés d'elle — la condition se serait inversée en silence. Il prend leur bleu
franc `#249cff` (6,64:1).

### ⚠️ Ce que cela coûte

**Le thème sombre passait AA intégralement. Ce n'est plus le cas.**

Leur gris tertiaire (`#6a6c70`) ne passe sur **aucun** des quatre fonds — et il ne passe
pas chez eux non plus :

| Fond | Ratio mesuré |
|---|---|
| `--color-canvas` (#0e0f11) | 3,65:1 |
| `--color-surface-muted` (#131416) | 3,50:1 |
| `--color-surface` (#18191b) | 3,34:1 |
| `--color-surface-hover` (#242424) | **2,95:1** |

Le gris qu'il remplace tenait 6,02:1 au pire. À 2,95:1, un petit corps sur une ligne
survolée est difficile à lire, et pas seulement pour une vue déficiente.

Les quatre couples sont inscrits dans le mécanisme d'écarts documentés de
`palette.test.ts`, où ils ne peuvent plus se dégrader sans faire échouer la suite.

**Une ligne annulerait ce coût** : `--color-ink-muted: #9f9fa0` — leur gris *secondaire*,
7,25:1, qui reste une valeur de taostats. Le prix serait un niveau de gris sur trois au
lieu des trois. **C'est un arbitrage d'exploitant, et il est écrit dans le test.**

Le reste passe confortablement : marque 10,83:1, baisse 5,53:1, blanc 19,18:1.

### Vérifié

15 jetons sur 16 identiques au relevé, lus dans le navigateur — le seizième n'étant qu'un
`#ffffff` minifié en `#fff`. Le fond de page rend `rgb(14, 15, 17)`. **Le thème clair est
intact** : seul le bloc `.dark` a été touché.

---

## État des vérifications

| Contrôle | Résultat |
|---|---|
| `tsc --noEmit` | ✅ propre |
| `eslint` sur les fichiers touchés | ✅ propre |
| Tests | ✅ **974 passent** |
| Thème clair / sombre | ✅ les deux vérifiés au navigateur |
| Clavier (menus) | ✅ Entrée, Échap, focus rendu |
| `prefers-reduced-motion` | ✅ règles présentes dans le CSS compilé |
| Décalage de mise en page | ✅ aucun (panneau en position absolue) |

**Réserve sur les tests :** 36 fichiers échouent, tous sous `.claude/worktrees/` — des
worktrees périmés dont les dépendances ne sont pas installées et qui ne compilent pas.
C'est un état préexistant, sans rapport avec cette session. Aucun test du dépôt lui-même
n'échoue.

---

## Points en attente ou nécessitant une décision

1. **Le contraste de l'encre atténuée en sombre.** Le point le plus important de ce
   rapport. Quatre couples sous AA, le pire à 2,95:1, en échange de la fidélité exacte à
   taostats. Une ligne les annule. **La décision revient à l'exploitant.**
2. **Marque et hausse sont la même couleur** (#00dbbc). Ce n'est pas un défaut
   d'accessibilité — le signe et le chevron portent déjà le sens — mais un lien et un
   pourcentage en hausse ne se distinguent plus par la couleur. Si l'on veut les séparer,
   c'est `--color-brand` qui doit bouger, pas `--color-up`.
3. **La fermeture des menus** reste sur les valeurs du projet, faute d'avoir pu mesurer
   celle de wrangle.ai.
4. **Le bouton à tranche de Duolingo** mériterait d'exister si un parcours d'inscription
   ou d'onboarding est construit. L'ajouter aujourd'hui serait une variante que rien
   n'emploie.
5. **`refero.design`** n'a pas été exploré : ses pages exigent un compte, et le relevé au
   navigateur sur `duolingo.com` a suffi. Une capture d'écran n'aurait de toute façon pas
   donné un style calculé.
6. **Les palettes catégorielles** (`--color-data-*`, `--color-sentiment-*`,
   `--chart-stack-*`) n'ont pas été alignées sur taostats : ils n'exposent pas
   d'équivalent, et en inventer un aurait été fabriquer un relevé.
