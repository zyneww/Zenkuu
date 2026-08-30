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
| 24px | 20 | agrégats de carte, catégorie, exchange | proche de `--text-2xl` (28px, existant) — écart non négligeable, pas de coïncidence : `--v2-text-2xl-dense` (nouveau, 24px) |
| 36px | 12 | chiffre héros d'une carte (accueil, page coin) | `--text-3xl` (existant — 2,25rem = 36px) |
| 18px / 28px | 12 | titres de section | `--text-lg` (existant — 1,125rem = 18px, interligne 1,75rem = 28px) |
| 16px | 12 | paragraphes, `#embed` (graphiques globaux) | `--text-base` (existant — 1rem = 16px) |
| 30px | 10 | en-têtes de bloc (catégories, exchanges) | entre `--text-2xl` (28px) et `--text-3xl` (36px), pas de coïncidence : `--v2-text-heading` (nouveau, 30px) |
| 26px | 6 | sous-titre de fiche | pas de coïncidence directe : `--v2-text-subheading` (nouveau, 26px) |
| 20px | 6 | libellé de section secondaire | pas de coïncidence directe, écart faible avec `--text-xl` (22px) — retenu comme variante : `--v2-text-heading-sm` (nouveau, 20px) |

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
navigation, pied de page, contrôles secondaires — qui descend d'un cran, à 13px,
là où `--text-xs` de ZENKUU est aujourd'hui documenté pour « colonnes secondaires
de tableau ». **La correspondance à corriger n'est pas la taille des jetons, mais
leur rôle documenté** : `--text-xs` (13px) doit couvrir le chrome/la navigation en
plus des colonnes secondaires ; `--text-sm` (14px) reste le cran des données
primaires. Aucun nouveau jeton de taille n'est nécessaire pour ce constat — seule
la légende d'usage de `--text-xs` doit s'élargir.

| Valeur mesurée | Occurrences | Relevée sur | Jeton ZENKUU |
|---|---|---|---|
| 13px sur chrome (nav, pied de page, contrôles) | 406 | pied de page, boutons, onglets, pagination | `--text-xs` (existant, portée d'usage à élargir) |
| 14px sur données (cellules, `h1`) | 192 | `table.sortable`, `.gecko-homepage-coin-table` | `--text-sm` (existant, confirmé cran dominant) |

---

## 3. Rythme d'espacement

Rembourrages (padding) mesurés sur les quatre côtés, agrégés toutes pages :

| Valeur mesurée | Occurrences | Relevée sur | Jeton ZENKUU |
|---|---|---|---|
| 6px | 340 | `#use-app-btn button` et boutons similaires | `--v2-space-2` (nouveau — ZENKUU n'a pas d'échelle d'espacement de contrôle, seulement `--spacing-section` 96px et `--spacing-band` 64px, macro) |
| 10px | 330 | `table.sortable tbody tr:first-child td:nth-child(4)` (cellule de tableau) | `--v2-space-3` (nouveau) |
| 12px | 168 | `table.sortable thead th[aria-sort]` (en-tête de colonne) | `--v2-space-4` (nouveau) |
| 4px | 126 | `#embed` et petits écarts internes | `--v2-space-1` (nouveau) |
| 16px | 88 | conteneurs de section, `#embed` | `--v2-space-5` (nouveau) |
| 8px | 58 | `.gecko-tab-underline-item.selected` | `--v2-space-2b` (nouveau — proche de 6px mais distinct, à trancher en tâche 7 : fusionner avec 6px ou garder séparé selon usage réel) |

Marges mesurées :

| Valeur mesurée | Occurrences | Relevée sur | Jeton ZENKUU |
|---|---|---|---|
| 4px | 132 | espacement de paragraphe, titres | `--v2-space-1` (même jeton que le rembourrage 4px ci-dessus) |
| 32px | 54 | séparation de bloc | `--v2-space-6` (nouveau) |

**Verdict.** ZENKUU n'a aujourd'hui aucune échelle d'espacement de contrôle (seules
deux valeurs macro, section/bande). Les six paliers ci-dessus (4/6/8/10/12/16px,
plus 32px) sont tous au-dessus du seuil d'exception (≥30 occurrences sauf 32px à 54)
et forment une échelle cohérente en base 2px. **Toute cette famille est nouvelle**,
à trancher en tâche 7 sous forme d'échelle `--v2-space-1` à `--v2-space-6`.

---

## 4. Rayons

| Valeur mesurée | Occurrences | Relevée sur | Jeton ZENKUU |
|---|---|---|---|
| 0px | 468 | grande majorité des nœuds (texte, cellules) | pas de rayon — cohérent avec `--radius-dense: 0px` (existant) |
| 8px | 192 | boutons, onglets, contrôles | `--radius-control` (existant — 8px, identique) |
| 6px | 48 | pastilles de rang, petits contrôles | `--radius-md` (existant — 6px, identique) |
| 12px | 12 | cartes, conteneurs de section | `--radius-card` (existant — 12px, identique) |
| `8px 8px 0px 0px` | 6 | en-tête de carte à coins arrondis en haut seulement | pas de jeton composite existant : `--v2-radius-top` (nouveau — reprend la valeur de `--radius-control`, forme composite seulement) |

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
| `… 0px 4px 0px 0px` (décalage dur, couleur variable) | 12 | boutons pressés/survolés (`button[data-action]`) | pas de jeton équivalent : `--v2-shadow-press` (nouveau — décalage 4px, pas de flou) |
| `… 0px 0px 0px 2px` (anneau, couleur variable) | 4 | états de focus/squelette de chargement | pas de jeton équivalent : `--v2-shadow-ring` (nouveau — anneau 2px, pas de flou) |
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
paliers relevés coïncident avec un jeton ZENKUU déjà existant (voir sections 1 à 9)
et ne demandent aucune création.

| Jeton | Valeur | Occurrences | Origine (section) |
|---|---|---|---|
| `--v2-text-2xs` | 12px / 16px | 50 | 1. Typographie — `.gecko-up`/`.gecko-down`, pastilles de rang |
| `--v2-text-2xl-dense` | 24px | 20 | 1. Typographie — agrégats de carte |
| `--v2-text-heading` | 30px | 10 | 1. Typographie — en-têtes de bloc |
| `--v2-text-subheading` | 26px | 6 | 1. Typographie — sous-titre de fiche |
| `--v2-text-heading-sm` | 20px | 6 | 1. Typographie — libellé de section secondaire |
| `--v2-space-1` | 4px | 126 | 3. Rythme d'espacement |
| `--v2-space-2` | 6px | 340 | 3. Rythme d'espacement |
| `--v2-space-2b` | 8px | 58 | 3. Rythme d'espacement (à fusionner ou non avec `--v2-space-2`, tâche 7) |
| `--v2-space-3` | 10px | 330 | 3. Rythme d'espacement |
| `--v2-space-4` | 12px | 168 | 3. Rythme d'espacement |
| `--v2-space-5` | 16px | 88 | 3. Rythme d'espacement |
| `--v2-space-6` | 32px | 54 | 3. Rythme d'espacement |
| `--v2-radius-top` | `8px 8px 0px 0px` | 6 | 4. Rayons — en-tête de carte |
| `--v2-shadow-press` | `0px 4px 0px 0px`, couleur héritée | 12 | 5. Élévation — bouton pressé/survolé |
| `--v2-shadow-ring` | `0px 0px 0px 2px`, couleur héritée | 4 | 5. Élévation — anneau de focus/squelette |

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
