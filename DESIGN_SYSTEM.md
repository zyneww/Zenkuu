# Le système de dessin structurel relevé sur CoinGecko

Relevé par mesure, en vue de la migration de ZENKUU. Aucune feuille de style, aucun
SVG et aucun texte de CoinGecko n'est reproduit ici : ce document ne contient que des
valeurs mesurées, chacune accompagnée du nœud et de la page où elle a été relevée.

**Les couleurs n'y figurent que comme RÔLES.** ZENKUU garde sa palette : bleu glacier
`#a9eafe` en sombre, cyan profond `#0e7490` en clair, sombre par défaut. Le rôle
« accent » est rempli par le bleu glacier, pas par la couleur de la référence.

Source : `COINGECKO_AUDIT.md` · Spec : `docs/superpowers/specs/2026-08-29-coingecko-audit-design-system-design.md`

Neuf pages sur dix ont un `mesures.json` exploitable : accueil, api, catégorie
(meme-token), catégories, page coin (Bitcoin, vue d'ensemble), page d'exchange
(Binance), exchanges spot, graphiques globaux, apprendre (narratives). La page
**portefeuille n'a pas de `mesures.json`** — la bascule de thème y a échoué à
l'audit ; rien n'est relevé ici pour elle, aucune valeur n'est inventée à sa place.
La page **api** compte 42 relevés mais **zéro sondage d'états** (survol/focus) : ses
composants interactifs n'ont pas de deltas et ne figurent donc pas dans les tableaux
d'interaction.

Méthode d'agrégation : `grep`/`sed`/`sort | uniq -c` sur les neuf `mesures.json`
(936 Ko, 27 842 lignes cumulées) — jamais de lecture intégrale. La règle de tri :
**une valeur vue une fois est une exception, une valeur vue trente fois est un
palier du système.**

---

## 1. Typographie

| Valeur mesurée | Occurrences | Relevée sur | Jeton ZENKUU |
|---|---|---|---|
| 13px / 18,525px / normal | 406 | boutons de pied de page, liens du pied de page, onglets (`gecko-tab-chip-item`), pagination, toutes pages | `--text-xs` (existant — 0,8125rem = 13px, interligne 1,125rem = 18px) |
| 14px / 20px / normal | 192 | cellule de tête et de première ligne de `table.sortable`, `h1`, toutes pages | `--text-sm` (existant — 0,875rem = 14px, interligne 1,25rem = 20px) |
| 12px / 16px / normal | 50 | `.gecko-up` / `.gecko-down` (variation de prix), pastilles de rang | `--v2-text-2xs` (nouveau — 12px/16px ; ZENKUU n'a que 11px pour ce cran, `--text-2xs`) |
| 24px | 20 | agrégats de carte, catégorie, exchange | **fusionné** dans `--text-2xl` (existant, 28px) — 20 occurrences est sous le seuil de 30 posé en section 3, et un jeton existant porte déjà le même rôle documenté (« agrégat de carte ») à 4px près ; pas de jeton `--v2-*` créé |
| 36px | 12 | chiffre héros d'une carte (accueil, page coin) | `--text-3xl` (existant — 2,25rem = 36px) |
| 18px / 28px | 12 | titres de section | `--text-lg` (existant — 1,125rem = 18px, interligne 1,75rem = 28px) |
| 16px | 12 | paragraphes, `#embed` (graphiques globaux) | `--text-base` (existant — 1rem = 16px) |
| 30px | 10 | en-têtes de bloc (catégories, exchanges) | **fusionné** dans `--text-2xl` (existant, 28px, écart 2px) — 10 occurrences est sous le seuil ; pas de jeton `--v2-*` créé |
| 26px | 6 | sous-titre de fiche | **fusionné** dans `--text-2xl` (existant, 28px, écart 2px) — 6 occurrences, compte anecdotique ; pas de jeton `--v2-*` créé |
| 20px | 6 | libellé de section secondaire | **fusionné** dans `--text-xl` (existant, 22px, écart 2px) — 6 occurrences, compte anecdotique ; pas de jeton `--v2-*` créé |

**Famille de police.** Tous les nœuds mesurés rapportent `Inter, -apple-system, …`
en thème clair et `Inter-Dark, Inter, -apple-system, …` en thème sombre (363
occurrences chacun — c'est la même police, la variante « Dark » n'est qu'une
étiquette de contexte de thème, pas un dessin différent). ZENKUU utilise Geist
(`--font-sans`). C'est un choix de marque, pas une mesure structurelle : ce document
ne recommande **pas** de créer un jeton `--v2-font-*` pour l'aligner sur Inter —
hors périmètre de cet audit structurel.

**Interlettrage.** Toutes les valeurs mesurées, à toutes les tailles, rapportent
`normal` (pas de resserrement). ZENKUU applique un `letter-spacing` négatif par
cran (`-0,12px` à `-1px`). C'est une différence de dessin délibérée de ZENKUU, pas
une lacune à combler : rien à créer ici.

---

## 2. Densité

**Le constat structurel principal.** `globals.css` documente `--text-sm` (14px)
comme « LE CRAN DE DENSITÉ, dominant sur la référence ». Le relevé confirme que
13px (406) domine 14px (192) en compte global — mais **pas pour la même famille de
nœuds** :

Autrement dit : CoinGecko n'est **pas** uniformément un cran plus dense que ZENKUU.
Sa donnée primaire (les cellules de tableau qui portent l'information) est au même
cran que le cran dominant de ZENKUU (14px / `--text-sm`). C'est son chrome —
navigation, pied de page, contrôles secondaires — qui **majoritairement** descend
d'un cran, à 13px, là où `--text-xs` de ZENKUU est aujourd'hui documenté pour
« colonnes secondaires de tableau ». **La correspondance à corriger n'est pas la
taille des jetons, mais leur rôle documenté** : `--text-xs` (13px) doit couvrir le
chrome/la navigation en plus des colonnes secondaires ; `--text-sm` (14px) reste le
cran des données primaires. Aucun nouveau jeton de taille n'est nécessaire pour ce
constat — seule la légende d'usage de `--text-xs` doit s'élargir.

**Deux contre-exemples, pour ne pas lire ce qui précède comme une règle absolue :**
le sélecteur de devise `[data-settings-target="currencyText"]` — un contrôle, donc
en principe du chrome — est mesuré à **14px sur 42 occurrences**, soit 22 % de toute
la population 14px de ce relevé ; et `.gecko-toggle-track` (bascule) alterne entre
13px (18 occ.) et 14px (24 occ.) **selon la page**, sans cran unique. Un lecteur qui
appliquerait 13px à tout contrôle sans vérifier commettrait l'erreur inverse de
celle que ce document corrige.

| Valeur mesurée | Occurrences | Relevée sur | Jeton ZENKUU |
|---|---|---|---|
| 13px, majoritaire sur le chrome (nav, pied de page, contrôles) | 406 | pied de page, boutons, onglets, pagination | `--text-xs` (existant, portée d'usage à élargir) |
| 14px, majoritaire sur les données (cellules, `h1`) | 192 | `table.sortable`, `.gecko-homepage-coin-table` | `--text-sm` (existant, confirmé cran dominant) |
| 14px sur un contrôle (contre-exemple) | 42 | `[data-settings-target="currencyText"]`, sélecteur de devise | `--text-sm` (existant — ce contrôle ne suit pas la règle majoritaire du chrome) |
| 13px/14px selon la page (contre-exemple) | 18 / 24 | `.gecko-toggle-track`, bascule | pas de cran unique — à vérifier composant par composant en tâche 7, pas déduit de la règle générale |

---

## 3. Rythme d'espacement

Rembourrages (padding) mesurés sur les quatre côtés (haut/droite/bas/gauche), agrégés
toutes pages. **Note de méthode :** le compteur additionne les quatre côtés d'un même
nœud dans un seul total par valeur — un bouton dont le rembourrage est `6px` en haut/bas
et `10px` à droite/gauche contribue deux fois à « 6px » et deux fois à « 10px ». La
conclusion d'échelle (paliers cohérents en base 2px) tient malgré ce mode de compte,
mais la colonne « Relevée sur » nomme un sélecteur qui porte en réalité deux valeurs
selon l'axe, pas une valeur unique :

| Valeur mesurée | Occurrences | Relevée sur | Jeton ZENKUU |
|---|---|---|---|
| 6px | 340 | `#use-app-btn button` (rembourrage haut/bas, 6px — droite/gauche 10px) et boutons similaires | `--v2-space-2` (nouveau — ZENKUU n'a pas d'échelle d'espacement de contrôle, seulement `--spacing-section` 96px et `--spacing-band` 64px, macro) |
| 10px | 330 | `#use-app-btn button` (rembourrage droite/gauche), `table.sortable tbody tr:first-child td:nth-child(4)` (cellule de tableau) | `--v2-space-4` (nouveau) |
| 12px | 168 | `table.sortable thead th[aria-sort]` (en-tête de colonne) | `--v2-space-5` (nouveau) |
| 4px | 126 | `#embed` et petits écarts internes | `--v2-space-1` (nouveau) |
| 16px | 88 | conteneurs de section, `#embed`, `.gecko-tab-underline-item.selected` (rembourrage droite/gauche) | `--v2-space-6` (nouveau) |
| 8px | 58 | `.gecko-tab-underline-item.selected` (rembourrage haut/bas, 8px — droite/gauche 16px) | `--v2-space-3` (nouveau — **gardé séparé de `--v2-space-2` (6px)**, pas fusionné : ce sont deux tailles de contrôle réellement distinctes — `#use-app-btn button` (6px/10px) est un petit bouton compact, `.gecko-tab-underline-item.selected` (8px/16px) est un onglet plus grand ; les deux se retrouvent sur plusieurs pages, pas un doublon de mesure) |

Marges mesurées :

| Valeur mesurée | Occurrences | Relevée sur | Jeton ZENKUU |
|---|---|---|---|
| 4px | 132 | espacement de paragraphe, titres | `--v2-space-1` (même jeton que le rembourrage 4px ci-dessus) |
| 32px | 54 | séparation de bloc | `--v2-space-7` (nouveau) |

**Verdict.** ZENKUU n'a aujourd'hui aucune échelle d'espacement de contrôle (seules
deux valeurs macro, section/bande). Les sept paliers ci-dessus (4/6/8/10/12/16/32px)
sont tous au-dessus du seuil d'exception (≥30 occurrences) et forment une échelle
cohérente en base 2px, numérotée `--v2-space-1` (4px) à `--v2-space-7` (32px) sans
saut ni lettre insérée. **Toute cette famille est nouvelle**, à trancher en tâche 7.

---

## 4. Rayons

| Valeur mesurée | Occurrences | Relevée sur | Jeton ZENKUU |
|---|---|---|---|
| 0px | 468 | grande majorité des nœuds (texte, cellules) | pas de rayon — cohérent avec `--radius-dense: 0px` (existant) |
| 8px | 192 | boutons, onglets, contrôles | `--radius-control` (existant — 8px, identique) |
| 6px | 48 | pastilles de rang, petits contrôles | `--radius-md` (existant — 6px, identique) |
| 12px | 12 | cartes, conteneurs de section | `--radius-card` (existant — 12px, identique) |
| `8px 8px 0px 0px` | 6 | en-tête de carte à coins arrondis en haut seulement | **gardé sous le seuil de 30** (6 occurrences) : aucun jeton ZENKUU ne porte une forme composite (coins hauts seulement) — il n'y a rien à quoi le rattacher, contrairement aux tailles de titre de la section 1. `--v2-radius-top` (nouveau — reprend la magnitude de `--radius-control` (8px) existant, seule la forme composite est nouvelle) |

Trois coïncidences exactes sur quatre paliers : la charte de rayons de ZENKUU
couvre déjà la quasi-totalité de ce que CoinGecko utilise.

---

## 5. Élévation

Famille **mal couverte par le relevé** : aucune ombre portée avec flou (type carte
flottante, menu déroulant, fenêtre modale) n'a été capturée sur les neuf pages —
`--shadow-overlay` existant de ZENKUU (flou 60px) n'a pas d'équivalent mesuré côté
CoinGecko dans cet audit. Deux familles d'ombres dures (sans flou) ont en revanche
été relevées, toutes deux liées à des interactions :

| Valeur mesurée | Occurrences | Relevée sur | Jeton ZENKUU |
|---|---|---|---|
| `… 0px 4px 0px 0px` (décalage dur, couleur variable) | 12 | boutons pressés/survolés (`button[data-action]`) | **gardé sous le seuil de 30** (12 occurrences) : `--shadow-overlay` existant est une ombre floutée, pas un décalage dur — aucun jeton ne porte cette forme, il n'y a rien à quoi la rattacher. `--v2-shadow-press` (nouveau — décalage 4px, pas de flou) |
| `… 0px 0px 0px 2px` (anneau, couleur variable) | 4 | états de focus/squelette de chargement | **gardé sous le seuil de 30** (4 occurrences, le plus bas du document) : le compte est faible parce que peu de composants étaient focalisés au moment de la capture statique, pas parce que le motif est rare — un anneau de focus porte l'accessibilité (jamais sacrifiable, cf. contraintes globales) et n'a pas d'équivalent ZENKUU. `--v2-shadow-ring` (nouveau — anneau 2px, pas de flou) |
| `none` | 594 | majorité des nœuds statiques | cohérent, aucun jeton requis |

**À signaler :** l'absence de mesure d'ombre de survol pour cartes/menus n'est pas
une absence réelle chez CoinGecko (ses menus déroulants et tooltips ont
vraisemblablement une ombre) — c'est une lacune du relevé statique, ces éléments
n'étant pas ouverts au moment de la capture.

---

## 6. Grille et points d'arrêt

Famille **mal couverte** : l'outil de relevé n'a capturé que trois largeurs de
référence pour le sondage responsive — aucune structure de grille CSS
(`grid-template-columns`, nombre de colonnes) n'a été mesurée.

| Valeur mesurée | Occurrences | Relevée sur | Jeton ZENKUU |
|---|---|---|---|
| 360px (mobile) | 18 | largeur de référence, toutes pages sondées | pas de jeton dédié — proche du point de rupture `sm` par défaut de Tailwind (640px), pas identique |
| 768px (tablette) | 18 | largeur de référence, toutes pages sondées | coïncide avec le point de rupture `md` par défaut de Tailwind (768px) |
| 1440px (bureau) | 27 | largeur de référence, toutes pages sondées | au-delà du point de rupture `xl` par défaut de Tailwind (1280px), pas de jeton `2xl` personnalisé dans `globals.css` |

Aucun point de rupture intermédiaire (1024px, `lg`) n'a été sondé. **Cette famille
ne peut pas être tranchée honnêtement** au-delà de ces trois échantillons : pas de
jeton `--v2-*` proposé ici, faute de données de grille réelle.

---

## 7. Iconographie

Famille **non couverte par le relevé** : aucun sélecteur mesuré ne cible une balise
`svg` ou une classe d'icône sur les neuf pages (`grep -c 'svg\|icon' */mesures.json`
renvoie zéro partout). L'outil de relevé de styles capte `getComputedStyle` sur des
sélecteurs texte/conteneur, pas les dimensions ou le viewBox des icônes SVG.
**Aucune valeur n'est inventée pour cette famille** — elle reste à documenter au
moment où un composant à icônes sera effectivement migré et inspecté à la main.

---

## 8. Mouvement

| Valeur mesurée | Occurrences | Relevée sur | Jeton ZENKUU |
|---|---|---|---|
| durée 0s | 552 | grande majorité des nœuds (pas de transition déclarée) | cohérent, aucun jeton requis |
| durée 0,15s / courbe `ease` puis `cubic-bezier(0.4, 0, 0.2, 1)` mêlées | 174 | boutons, onglets, bascules (éléments interactifs) | `--duration-state` (existant — 150ms, identique) et `--ease-standard` (existant — `cubic-bezier(0.4, 0, 0.2, 1)`, identique) |

Vérifié : la courbe `ease` brute (552 occurrences) correspond aux nœuds sans
transition réelle (valeur par défaut du navigateur, pas un choix de dessin) ; la
courbe `cubic-bezier(0.4, 0, 0.2, 1)` (174 occurrences) accompagne systématiquement
la durée 0,15s sur les éléments réellement interactifs. Coïncidence confirmée sur
les deux jetons de mouvement existants — rien à créer dans cette famille.

---

## 9. Rôles de couleur

Couleurs enregistrées uniquement comme rôles, mesures RGB à titre de preuve de
provenance — la valeur RGB de CoinGecko n'est **pas** reprise dans le jeton ZENKUU,
seul le rôle l'est.

| Rôle | Valeur mesurée (preuve) | Relevée sur | Jeton ZENKUU |
|---|---|---|---|
| fond (canvas) | `rgb(255, 255, 255)` clair / `rgb(13, 18, 23)` sombre | conteneur de page, toutes pages | `--color-canvas` (existant) |
| surface (panneau/ligne) | `rgb(255, 255, 255)` clair, 68 occ. / `rgb(13, 18, 23)` sombre, 41 occ. | ligne de `table.sortable`, en-tête de colonne | `--color-panel` (existant) |
| surface survolée (clair) | `rgb(248, 250, 252)` — delta de survol, `.gecko-homepage-coin-table tbody tr:first-child` | accueil | `--color-surface` (existant — coïncidence exacte, #f8fafc) |
| surface survolée (sombre) | `rgb(27, 35, 45)` / `rgb(33, 45, 59)` — deltas de survol, boutons et lignes | accueil, plusieurs pages | **aucun jeton existant ne coïncide** — `--color-panel` sombre est `#2f2f33`, la valeur mesurée en est distincte. **Rôle à créer** : une couleur de surface survolée sombre, nommée dans la convention `--color-*` existante (pas `--v2-*`, réservé à la structure), valeur à trancher en tâche 9 |
| filet (bordure) | `rgb(229, 231, 235)` — 648 occ., cellules et conteneurs, toutes pages, tous thèmes | toutes pages | `--color-border-subtle` (existant — coïncidence exacte, #e5e7eb, en thème clair) |
| accent | — (non repris : le rôle est rempli par la palette ZENKUU, pas par la couleur mesurée) | onglet sélectionné, bouton d'action | `--color-brand` (existant — bleu glacier `#a9eafe` en sombre, cyan profond `#0e7490` en clair, par consigne du projet) |
| hausse | `rgb(0, 168, 62)` clair / `rgb(50, 202, 91)` sombre — `.gecko-up`, 6+ pages | toutes pages avec données de marché | `--color-up` (existant) |
| baisse | `rgb(255, 58, 51)` — `.gecko-down`, identique dans les deux thèmes, 18 occ. | toutes pages avec données de marché | `--color-down` (existant) |
| encre (texte principal) | `rgb(15, 23, 42)` clair, 65 occ. / `rgb(223, 229, 236)` sombre, 65 occ. | `h1`, texte de cellule | `--color-ink` (existant) |
| encre atténuée | `rgb(100, 116, 139)` clair / `rgb(74, 99, 130)`, `rgb(158, 176, 199)` sombre | libellés secondaires | `--color-ink-muted` (existant) |
| en-tête collant (sticky) | non distingué du fond de ligne dans ce relevé — `thead th[aria-sort]` partage la même valeur de fond que les lignes de données | `table.sortable`, toutes pages | **rôle non tranchable ici** : le relevé statique ne capture pas l'état scrollé/collant d'un en-tête ; pas de jeton proposé, à observer lors de la migration du composant tableau |

**Bilan couleurs :** sept rôles sur neuf coïncident avec un jeton ZENKUU existant.
Deux rôles restent sans jeton correspondant — surface survolée en thème sombre
(à créer, tâche 9) et en-tête collant (non mesurable ici, à observer plus tard).

---

## 10. Table de correspondance — jetons nouveaux uniquement

Cette section récapitule les **seuls** jetons `--v2-*` nouveaux identifiés dans ce
document ; c'est elle que la tâche 7 implémente littéralement. Tous les autres
paliers relevés coïncident avec un jeton ZENKUU déjà existant ou y ont été fusionnés
(voir sections 1 à 9) et ne demandent aucune création. Le seuil de la section 3
(≥30 occurrences pour être un palier plutôt qu'une exception) s'applique à toute
cette table : trois jetons ci-dessous (`--v2-radius-top`, `--v2-shadow-press`,
`--v2-shadow-ring`) sont en dessous et sont gardés avec une justification explicite
plutôt que fusionnés, faute de jeton ZENKUU existant sur lequel les rattacher —
voir sections 4 et 5 pour le détail de chaque cas.

| Jeton | Valeur | Occurrences | Origine (section) |
|---|---|---|---|
| `--v2-text-2xs` | 12px / 16px | 50 | 1. Typographie — `.gecko-up`/`.gecko-down`, pastilles de rang |
| `--v2-space-1` | 4px | 126 | 3. Rythme d'espacement |
| `--v2-space-2` | 6px | 340 | 3. Rythme d'espacement |
| `--v2-space-3` | 8px | 58 | 3. Rythme d'espacement — gardé distinct de `--v2-space-2`, deux tailles de contrôle réelles |
| `--v2-space-4` | 10px | 330 | 3. Rythme d'espacement |
| `--v2-space-5` | 12px | 168 | 3. Rythme d'espacement |
| `--v2-space-6` | 16px | 88 | 3. Rythme d'espacement |
| `--v2-space-7` | 32px | 54 | 3. Rythme d'espacement |
| `--v2-radius-top` | `8px 8px 0px 0px` | 6 | 4. Rayons — en-tête de carte (sous le seuil, gardé : aucun jeton ne porte cette forme composite) |
| `--v2-shadow-press` | `0px 4px 0px 0px`, couleur héritée | 12 | 5. Élévation — bouton pressé/survolé (sous le seuil, gardé : aucun jeton ne porte un décalage dur sans flou) |
| `--v2-shadow-ring` | `0px 0px 0px 2px`, couleur héritée | 4 | 5. Élévation — anneau de focus/squelette (sous le seuil, gardé : accessibilité du focus, jamais sacrifiable) |

**Fusionnés, pas créés** (voir section 1 pour le détail) : 24px (agrégat de carte)
dans `--text-2xl` ; 30px (en-tête de bloc) dans `--text-2xl` ; 26px (sous-titre de
fiche) dans `--text-2xl` ; 20px (libellé de section secondaire) dans `--text-xl`.
Ces quatre paliers, tous sous le seuil de 30 occurrences et à moins de 4px d'un
jeton ZENKUU existant, ne figurent pas dans la table ci-dessus.

Aucun jeton `--v2-color-*` n'est créé, conformément aux contraintes globales : la
couleur de surface survolée sombre signalée en section 9 est une nouvelle entrée de
la palette `--color-*` existante, pas un jeton `--v2-*` — elle relève de la tâche 9,
pas de la tâche 7.

**Bilan global.** Sur l'ensemble des familles structurelles (typographie, densité,
rayons, mouvement), la grande majorité des paliers mesurés — tailles de police
dominantes, rayons de contrôle et de carte, durée et courbe d'état — coïncident
avec un jeton ZENKUU déjà en place. La famille d'espacement de contrôle est en
revanche entièrement absente de `globals.css` et constitue le principal chantier
de la tâche 7.

---

## Dette héritée — statut des données financières gratuites d'exchange

`COINGECKO_AUDIT.md` ne compte que deux lignes pour dix pages sur le statut de
gratuité du score de confiance décomposé, de l'année de création, du pays du siège
et de l'historique d'incidents d'un exchange. D'après la documentation publique de
l'API CoinGecko (endpoint `/exchanges/{id}`), les champs `trust_score`,
`trust_score_rank`, `year_established`, `country` et `centralized` sont exposés par
le plan gratuit ; en revanche, le **détail de décomposition du score de confiance**
(les sous-critères qui le composent) et l'**historique d'incidents** ne figurent
dans aucun champ documenté de l'API publique, gratuite ou payante — CoinGecko ne
publie que le score agrégé. **Tranché :** l'année de création et le pays du siège
sont disponibles gratuitement via l'API ; la décomposition du score de confiance et
l'historique d'incidents ne le sont pas et doivent être considérés comme
indisponibles par l'API, à documenter comme tels plutôt qu'à simuler.

---

## Divergence assumée — hauteur du bouton `default`

`apps/web/components/ui/button.tsx`, variante `size="default"`, applique la taille
de texte mesurée (13px, `--text-xs`) et le rembourrage horizontal mesuré (10px,
`--v2-space-4`), mais **conserve `h-9` (36px)** au lieu de suivre la hauteur
implicite de CoinGecko. Chez la référence, 13px de texte + 6px de rembourrage
vertical de chaque côté donnent environ **31px** de hauteur de bouton — sous les
**32px de cible tactile minimum** que `DESIGN.md` pose comme non négociable (voir
« Ce qui n'est pas négociable », point 4) et que `scripts/audit-responsive.mjs`
fait respecter sur six formats. **Tranché : l'accessibilité l'emporte sur la
fidélité à la mesure.** Le rembourrage vertical (`py-2`) reste sans effet réel sur
la hauteur finale, imposée par `h-9`, mais est gardé dans le code pour la
lisibilité (cohérence avec les autres tailles du composant). Ne pas « corriger »
`h-9` vers une valeur plus proche de 31px sans revisiter d'abord cette contrainte.

---

## Réserves

- Les comptes d'occurrences agrègent les neuf pages avec `mesures.json` ; ils ne
  sont pas pondérés par trafic réel des pages CoinGecko, seulement par ce que
  l'audit a choisi de sonder.
- Les rôles de couleur sombres pour lesquels aucune coïncidence n'a été trouvée
  (surface survolée) sont mesurés sur un échantillon restreint (accueil et une
  poignée de composants) — la valeur définitive reste à trancher visuellement en
  tâche 9, pas à déduire arithmétiquement de ces RGB.
- La famille grille/points de rupture et la famille iconographie sont documentées
  comme non couvertes plutôt qu'estimées : aucune valeur n'y est inventée.
- L'élévation « carte flottante / menu déroulant » de CoinGecko existe très
  probablement dans son interface réelle mais n'a pas été capturée par ce relevé
  statique ; ne pas la confondre avec une absence de dessin chez CoinGecko.
