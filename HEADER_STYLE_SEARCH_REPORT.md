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

### Les observations que le prompt demandait nommément, complétées le 2026-09-08

| Observation demandée | Résultat mesuré |
|---|---|
| **Décalage d'apparition (stagger) entre les entrées du menu** | **AUCUN.** Les cinq entrées rendent `transitionDelay: 0s`, `animationDelay: 0s`, `animationName: none`, `opacity: 1`, `transform: none`. Le panneau s'anime d'un bloc ; ses enfants ne s'animent pas individuellement. Leur seule transition est le `all 0.2s` de leur propre survol. |
| **Fermeture — sortie du survol** | Ferme. `aria-expanded` repasse à `false`, et le panneau reste MONTÉ à `opacity: 0`, figé sur l'état de sortie (`translateY(-8px) scaleX(0.96) scaleY(0.94)`). |
| **Fermeture — clic extérieur** | Ferme. |
| **Fermeture — Échap** | **NE FERME PAS.** Vérifié deux fois. |
| **Clavier — focus seul** | N'ouvre pas. C'est le bon comportement : ouvrir au focus piège qui tabule. |
| **Clavier — Entrée** | Ouvre. |
| **Clavier — Tab depuis le déclencheur ouvert** | **N'ENTRE PAS dans le panneau.** Le focus reste sur le bouton ; les cinq liens ne sont pas atteints. |

⚠️ **UNE CORRECTION DE MÉTHODE, parce qu'elle a failli me faire écrire l'inverse.** Mon
premier détecteur d'ouverture cherchait la PRÉSENCE du panneau dans le DOM. Il répondait
donc « ouvert » en permanence, y compris huit secondes après être sorti du survol, ce qui
m'a d'abord fait conclure que leur menu ne se fermait jamais. Le bon critère est
`aria-expanded` : leur panneau reste MONTÉ une fois fermé, exactement comme le viewport
de ZENKUU. Toutes les lignes du tableau ci-dessus ont été rejouées avec le bon critère.

Deux de ces résultats confirment que **l'accessibilité de la référence ne devait pas être
copiée**, et cette fois par la mesure du COMPORTEMENT et non plus par l'inspection des
attributs : chez eux Échap ne ferme pas et Tab n'entre pas. Chez ZENKUU, Échap ferme et
rend le focus au déclencheur — vérifié.

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

⚠️ **`refero.design` a finalement été exploré, et j'y avais écrit une chose fausse.**
J'avais annoncé que ses pages exigeaient un compte sans les avoir ouvertes. Elles
s'ouvrent : 12 des 235 captures et 3 des 21 flux sont visibles sans inscription. Mais
elles sont servies depuis `images.refero.design/screenshots/duolingo.com/**desktop**/…` —
ce sont des captures du site public, celui-là même mesuré en direct. La conclusion tient
donc toujours ; elle tient pour la bonne raison, pas pour celle que j'avais avancée.

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

### La référence a été mesurée en direct, pas seulement lue sur la capture

`app.uniswap.org` s'ouvre **sans authentification** : le panneau a donc été mesuré le
2026-09-08 plutôt que déduit de l'image.

Première surprise : **leur panneau a changé depuis la capture**. Il porte désormais une
rangée d'onglets de portée (All / Tokens / Pools / Wallets) et TROIS sections — « Stocks
by 24H volume », « Tokens by 24H volume », « Pools by 24H volume ». Les onglets de portée
existent déjà chez ZENKUU (`SearchScopes`), relevés en leur temps sur Backpack.

| Propriété mesurée | Valeur |
|---|---|
| Hauteur de ligne | 80 px |
| Rayon de ligne | 20 px |
| Rembourrage | `16px 24px 16px 16px`, `gap: 16px` |
| Transition de ligne | `background-color, transform` — **0,125 s ease-in** |
| Intitulé de section | 16 px, graisse 485, `rgba(255,255,255,0.65)`, sans capitales |
| **Filet entre les sections** | **AUCUN** — `border-top: 0px` sur toutes |

Deux enseignements pour les deux exigences de la capture :

1. **« Séparation nette entre les deux sections »** ne passe PAS par un filet chez eux.
   Elle se fait par l'espacement (12 px de rembourrage haut) et par l'intitulé lui-même.
   C'est déjà ce que fait ZENKUU avec ses `CommandGroup` — rien à changer, et le vérifier
   a évité d'ajouter un trait que la référence n'a pas.
2. **« Hover net sur chaque ligne »** : leurs lignes sont transitionnées sur 125 ms. Les
   nôtres le sont déjà — **à 150 ms**, par la règle globale de `globals.css` qui couvre
   `[role="option"]`, ce que cmdk pose sur chaque ligne. 25 ms d'écart, et voir la
   réserve ci-dessous.

⚠️ **UNE TENTATIVE DE RÉGLAGE QUI N'A RIEN FAIT, ET CE QU'ELLE A RÉVÉLÉ.** J'ai d'abord
posé `duration-[125ms] ease-in` sur les lignes. Mesuré ensuite au navigateur : sans le
moindre effet, `transition-duration` valait toujours `0.15s`. La règle globale n'est dans
**aucune couche de cascade**, et du CSS hors couche l'emporte sur tout CSS en couche —
donc sur l'intégralité des utilitaires Tailwind, quel que soit l'ordre du fichier.

La note de cette règle affirmait précisément l'inverse (« toute classe utilitaire posée
sur l'élément la remplace »). Elle a été corrigée sur place : une note qui ment sur le
comportement du CSS coûte plus cher que pas de note. Le correctif réel — ranger le bloc
dans `@layer base` — rendrait leur effet d'un coup à toutes les classes `transition-*` du
site, y compris celles écrites en croyant agir. C'est un chantier à part, confié à une
tâche séparée, et pas quelque chose à déclencher pour 25 ms sur une liste.

### Une duplication trouvée en chemin, et refermée

La chaîne de classes d'une ligne était recopiée **quatre fois** — deux dans
`SearchResults`, une dans `SearchRecent`, une dans `SearchWatchlist`. Or le panneau
empile jusqu'à quatre sections dont les lignes s'aboutent : elles doivent avoir la même
hauteur et la même surbrillance, sans quoi la liste paraît cassée à la jointure. Quatre
copies rendent cette égalité invérifiable. Elles passent à `SEARCH_ROW_CLASS`.

### Navigation au clavier — mesurée, et non plus affirmée

Cette section disait que « les flèches les parcourent, Entrée ouvre, Échap ferme ». C'était
une déduction de la structure, pas un relevé. Le prompt exigeant une « navigation clavier
complète », elle a été mise à l'épreuve le 2026-09-08 :

| Test | Résultat |
|---|---|
| `Ctrl + K` | Ouvre le panneau, première ligne sélectionnée |
| Flèche bas × 19 | La sélection parcourt les **21 lignes** et **traverse les quatre sections** |
| Arrivée dans « Catégories en vue » | Oui — index 19, « AI Applications » |
| La ligne de catégorie est un vrai lien | Oui — `href="/fr/categories/ai-applications"` |
| Surbrillance de la ligne sélectionnée | Visible à l'écran (vérifiée au zoom sur la dernière ligne) |
| Échap | Fermé par le `onKeyDown` explicite de `HeaderSearch` et par le `Popover` de Radix |

⚠️ **DEUX PIÈGES D'AUTOMATISATION ONT FAILLI ME FAIRE DÉCLARER DEUX DÉFAUTS INEXISTANTS.**
Ils sont écrits ici parce qu'ils se représenteront :

1. **Les frappes synthétiques n'atteignent pas le champ.** `Ctrl + K` fonctionnait — il est
   posé sur un écouteur de `document` — mais ni les flèches ni le texte tapé n'arrivaient
   à l'entrée, alors que `document.activeElement` ÉTAIT le champ et que `document.hasFocus()`
   valait `true`. Ce qui l'a prouvé : après avoir « tapé » `bitc`, `input.value` valait `""`.
   J'allais conclure que les flèches ne marchaient pas. Un `KeyboardEvent` construit et
   dispatché en JavaScript passe, lui, et déplace bien la sélection.
2. **`getComputedStyle` ment sur les éléments du portail Radix.** La ligne sélectionnée
   rendait `background-color: rgba(0, 0, 0, 0)` alors qu'elle portait la classe, qu'elle
   satisfaisait le sélecteur (`matches()` vrai) et que la règle existait — vérifié sur un
   témoin. Ce qui a tranché : poser `style.backgroundColor` **en ligne** sur cette même
   ligne se relisait AUSSI transparent, ce qui est impossible pour un élément rendu. La
   lecture était donc l'artefact. Une capture d'écran zoomée montre la surbrillance.

La leçon commune : quand une mesure au navigateur affirme qu'un composant est cassé,
**vérifier d'abord que l'instrument fonctionne** — en lui faisant mesurer quelque chose
dont on connaît déjà la réponse.

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
| `bun run build` | ✅ **1 tâche réussie, 1 min 40** |
| Thème sombre — menus et panneau | ✅ vérifiés au navigateur |
| Thème clair — menus et panneau | ✅ vérifiés au navigateur ; jetons clairs intacts (`#fff`, `#91d7e3`, `#00a83e`) |
| Responsive — 375 px | ✅ la fenêtre de recherche du téléphone rend la nouvelle section |
| Clavier (menus) | ✅ Entrée, Échap, focus rendu |
| Clavier (panneau de recherche) | ✅ Ctrl+K, flèches sur les 21 lignes et les 4 sections, surbrillance visible |
| `prefers-reduced-motion` | ✅ règles présentes dans le CSS compilé |
| Décalage de mise en page | ✅ aucun (panneau en position absolue) |

Le build a été lancé **serveur de développement arrêté** : les faire tourner ensemble
corrompt le cache Turbopack et met le site en 500.

### Un défaut trouvé en vérifiant le responsive, et corrigé

À 375 px, la catégorie « Robinhood Chain Meme » affichait **l'icône d'image cassée** du
navigateur. Elle porte bien une URL de logo, mais la source publie ces vignettes par
identifiant d'actif et un actif retiré laisse son URL en 404 — cas normal, pas une panne.
Le repli en monogramme ne se déclenchait que sur une URL **absente**.

La correction est allée dans `AssetThumb` plutôt qu'à l'endroit où le défaut se montrait,
et c'est la deuxième moitié du sujet : ce composant existe précisément parce que le bloc
vignette avait été écrit deux fois. J'en avais écrit une **troisième** copie dans
`CategoryRow` sans le voir, et `ResultRow` en gardait une quatrième depuis avant. Les deux
passent à `AssetThumb` : le défaut est réglé partout d'un coup, et vingt-six lignes
disparaissent.

### Un défaut trouvé en vérifiant, et NON corrigé — il préexiste

Un chargement propre de l'accueil produit **deux erreurs d'hydratation** React. La pile
d'appels, relevée dans la surcouche de Next :

    components/locale/Money.tsx (66:10) @ Amount
    components/home/MarketRibbon.tsx (251:9 ← 133:13 ← 132:19)
    app/[locale]/page.tsx (198:9)

**Aucun de ces trois fichiers n'a été touché de la session.** Le bandeau de cours de
l'accueil ne rend pas le même texte côté serveur et côté client — piste la plus probable :
`Money` convertit via `useCurrency()`, et la devise ou le taux disponibles au rendu serveur
diffèrent de ceux que le client lit. C'est hors du périmètre de cette session ; une tâche
séparée a été proposée, avec la pile et la piste.

⚠️ **Méthode, pour qui reprendra** : la console du navigateur est CUMULATIVE sur la vie de
l'onglet — un onglet réutilisé mélange les erreurs de tous les chargements précédents, et
m'a d'abord fait croire que le défaut venait de mes propres manipulations. La surcouche de
Next, elle, se remet à zéro à chaque chargement et donne le compte juste. C'est un onglet
NEUF qui a tranché.

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
5. **La règle globale de transition de `globals.css` neutralise silencieusement toutes les
   classes `transition-*` du site** sur les liens, boutons, champs, onglets et options.
   Elle n'est dans aucune couche de cascade ; sa propre note affirmait le contraire. La
   note est corrigée, le correctif (`@layer base`) est confié à une tâche séparée parce
   qu'il rendrait leur effet d'un coup à des classes écrites en croyant agir.
6. **La divergence d'hydratation du bandeau de marché**, préexistante et documentée
   ci-dessus. Elle ne bloque rien — React régénère l'arbre côté client — mais elle coûte
   un rendu complet à chaque visite de l'accueil.
7. **Les palettes catégorielles** (`--color-data-*`, `--color-sentiment-*`,
   `--chart-stack-*`) n'ont pas été alignées sur taostats : ils n'exposent pas
   d'équivalent, et en inventer un aurait été fabriquer un relevé.
