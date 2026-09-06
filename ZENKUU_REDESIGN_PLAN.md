# ZENKUU_REDESIGN_PLAN.md

Plan de refonte du langage visuel de Zenkuu vers le niveau de densité et de tenue de Tokenomist.

Deux fichiers le précèdent et le fondent :
`TOKENOMIST_DESIGN_TOKENS.md` (les valeurs mesurées) et `TOKENOMIST_UI_AUDIT.md` (les motifs relevés).
Ce fichier-ci est la **traduction** vers Zenkuu : ce qui change, dans quel ordre, et ce qui ne se fera pas.

L'état d'avant la refonte est sauvegardé sur la branche **`avant-ui/ux-tokenomist`** (commit `ffd1f18`),
poussée sur `origin`.

---

## 0. Ce que la refonte n'est pas

Zenkuu a déjà un système de jetons sérieux : 42 jetons de couleur en clair, 36 en sombre, deux ponts
vers shadcn/ui et HeroUI v3, et **trois tests qui remesurent le contraste WCAG à chaque exécution**.
Ce système n'est pas le problème. Le problème est ailleurs, et il tient en cinq points mesurés :

| # | Ce qui cloche aujourd'hui | Mesure |
|---|---|---|
| 1 | **`--color-panel` vaut exactement `--color-canvas`** — une carte ne se distingue pas du fond | `#0e0f14` = `#0e0f14` en sombre, `#f8f8f9` = `#f8f8f9` en clair |
| 2 | **Aucune approche typographique** — 1 193 nœuds de texte sur 1 195 en `letter-spacing: normal` | Tokenomist : −0,12 à −1 px selon le corps |
| 3 | **Le rythme est hors grille** — `gap-6` (68×) et `gap-10` (41×) n'existent pas chez la référence | Tokenomist : 2 · 4 · 8 · 12 · 16 · 24 |
| 4 | **Le cran dense est 14 px, pas 13** — et l'interligne de 11 px vaut 16,5 px | Tokenomist : 13/16 dominant, 11/14 |
| 5 | **La formule de carte est recopiée 98 fois dans ~60 fichiers** pendant que `Panel` a 2 consommateurs | inventaire des primitives |

Les points 1 et 5 expliquent à eux seuls l'impression de « page plate et non composée » : il n'y a
littéralement pas de plan de carte dans la palette, et rien qui centralise ce qu'est une carte.

---

## 1. Correspondance des rôles — Tokenomist → Zenkuu

L'accent de Tokenomist est rose. Celui de Zenkuu reste **l'azur `#91d7e3`**, imposé par l'exploitant
le 2026-09-01. Le rôle se transpose, la teinte non.

| Rôle | Tokenomist (sombre / clair) | Zenkuu — jeton | Décision |
|---|---|---|---|
| Fond de page | `#110D0F` / `#F5F4F4` | `--color-canvas` | conservé `#0e0f14` / `#f8f8f9` |
| **Panneau, carte** | `#1C1719` / `#FCFCFC` | `--color-panel` | **change** : cesse d'égaler le canvas |
| **Filet = survol** | `#292426` / `#E7E4E6` | `--color-border-subtle` **et** `--color-surface-hover` | **change** : les deux convergent |
| Piste creusée (segmenté) | = canvas | `--color-surface-muted` | **change** : rejoint le canvas |
| Pastille active (segmenté) | = panneau | `--color-surface-active` | **change** : rejoint le panneau |
| Encre primaire | `#FDFCFC` / `#171214` | `--color-ink` | conservé |
| Encre secondaire | `#D7D0D3` / `#443C3F` | — **manquant** | **ajout** : Zenkuu n'a que deux niveaux d'encre |
| Encre tertiaire | `#A99DA4` / `#796B72` | `--color-ink-muted` | devient le 3ᵉ niveau |
| Accent | `#ED5A8F` / `#C51052` | `--color-brand` / `--color-brand-strong` | conservé — `-strong` en clair, seul à passer AA |
| Accent doux ~10 % | `rgba(240,68,131,.13)` | — | **ajout** : règle généralisée |
| Hausse | `#7CFA7C` / `#259B25` | `--color-up` | conservé `#00794b` / clair mesuré Backpack |
| Baisse | `#FF6955` / `#DC4935` | `--color-down` | conservé `#d20032` |

**Le troisième niveau d'encre est le seul vrai manque de la palette.** Tokenomist fait sa hiérarchie
par la couleur d'encre (primaire 92 relevés, secondaire 182, tertiaire 104) bien plus que par la
graisse — 700 n'apparaît que 10 fois sur toute la page. Zenkuu n'a que `ink` et `ink-muted` : toute
nuance intermédiaire y est aujourd'hui rendue par du gras, ce qui alourdit.

---

## 2. Phases

### Phase 1 — La couche de jetons

1. **Séparer `--color-panel` du canvas.** C'est le changement dont tout le reste dépend.
2. **Faire converger filet et survol** sur une seule valeur, dans les deux thèmes.
3. **Ajouter `--color-ink-secondary`**, et repositionner `--color-ink-muted` en tertiaire.
4. **Ajouter l'approche typographique** aux neuf crans : `--text-*--letter-spacing`, négative et
   croissante avec le corps. Purement additif — aucun composant à toucher.
5. **Resserrer les interlignes denses** : 11 px passe de 16,5 à 14 ; 13 px de 18 à 16.
6. **Ramener les rayons** : `--radius-card` 16 → 8, `--radius-nested` 12 → 8, `--radius-control` 8 → 6.
   `--radius-sm` (4 px) devient le rayon dominant des petits objets.
7. **Élaguer** les jetons sans consommateur relevés par l'inventaire (`--glow`, `--color-status-soft`,
   `--spacing-section`, `--spacing-band`, `--radius-3xl/-4xl`, `--color-sidebar-*`, `--chart-stack-1..5`,
   `--chart-overlay`, cinq `--v2-*`) — ou les brancher si la refonte leur donne un emploi.
8. **Rejouer `palette.test.ts`** après chaque valeur touchée. Les 22 paires doivent passer et les deux
   écarts assumés ne doivent ni empirer ni devenir inutiles — le test casse dans les deux sens.

> ⚠️ `--radius` est déclaré **deux fois** (ligne 720 en `@theme`, ligne 1241 sur `:root`). HeroUI v3
> dérive son rayon de champ par `calc(--radius × 1.5)`. Les deux déclarations doivent bouger ensemble
> ou pas du tout.

### Phase 1b — La primitive de panneau

Un seul composant `Panel` : fond panneau, filet d'un pixel, rayon 8, rembourrage 16, écart interne 16,
avec un emplacement d'en-tête (titre à gauche, action à droite) et un corps. Il remplace les 98
recopies manuelles. Migration progressive, en commençant par la fiche d'actif.

### Phase 2 — La fiche d'actif

La structure existante **n'est pas à refaire** : le rail flottant de 424 px résout un vrai problème
(le rail est plus court que le contenu, une grille laisserait des milliers de pixels de vide). Ce qui
change est la **surface** et la **densité**, pas la mécanique.

| Zone | Contenu actuel | Ce qui change |
|---|---|---|
| **BLEUE** — rail 424 px | `AssetMetricRail` (groupes market/range/change) + `AssetSupply` | chaque groupe devient un `Panel` ; rangées à 20 px ; libellé/valeur en deux colonnes ; unité hors de la colonne de valeur |
| **VERTE** — centre | `AssetWorkspace` (graphique + barre d'outils) | le cadre devient un `Panel` ; barre d'outils réorganisée « choisir à gauche, sortir à droite » ; contrôles ramenés à 32 px |
| **JAUNE** — 288 px, ≥ 1280 px | `AssetNewsAside` | cartes d'actualité au motif `Panel` ; état vide utile ; hauteur réservée au chargement |
| **ORANGE** — sous le graphique | `AssetChangeStrip`, `AssetVsPeers`, `AssetPerformanceMatrix`, records, places | reçoit la brosse `ChartNavigator` + une légende de séries + `SourceNote` + la note de fuseau |

### Phase 3 — Diffusion

Par ordre de portée décroissante, d'après l'inventaire des familles de pages :

1. `.shell` et la coquille globale (64 routes)
2. `MarketTable` (1 705 l., 6 listings + dérivés)
3. `Panel` → les ~60 fichiers qui recopient la formule de carte
4. `TablePagination` (27 pages)
5. `EmptyState` (48 fichiers) · `SourceNote` (28) · `ChangeBadge` (37)
6. `NavBar` / `NavMenus` / `Footer`
7. `MarketPageView` · `ChartsShell` · `AnalyticsShell` · `MetricPageView`
8. Les 29 pages qui réécrivent leur propre en-tête

---

## 3. Ce qui ne se construira pas — et pourquoi

Ces blocs existent chez Tokenomist et **n'auront pas d'équivalent Zenkuu**, faute de donnée.
L'inventaire du code est formel sur chacun.

| Bloc Tokenomist | Pourquoi il ne se fait pas |
|---|---|
| **Table d'allocations + beignet** | Aucune allocation de jeton par catégorie n'existe. Le champ `allocation` du code appartient à `yahoo-profile.ts` et décrit la répartition **par nature d'actif d'un fonds** (ETF) — ce n'est pas la même donnée. |
| **Unlock Events / calendrier de déblocage** | Rien : aucun champ, aucun fournisseur, aucun composant. `AssetSupply.tsx` le documente déjà : « Rien de tout cela n'est publié par une source gratuite […] Les afficher supposerait de les ESTIMER. » |
| **Release Schedule / courbe d'émission** | Idem. Seule exception : le halving du **bitcoin seul**, calculé depuis les règles du protocole, sur `/crypto/bitcoin/halving` — une sous-route qu'aucun lien ne dessert aujourd'hui. |
| **Bouton « Create Alert »** | La fonctionnalité d'alerte **n'existe pas**. Le seul bouton branché de l'en-tête est le suivi (`toggleWatchlist`). Un bouton qui n'agit pas ne sera pas dessiné. |
| **Onglets de fiche** (Overview / Tokenomics / …) | La fiche est une page unique ; `AssetSections` a été supprimé. Trois des cinq onglets de la référence n'auraient aucun contenu. Une rangée d'onglets dont deux mènent à des sous-routes non liées (`/historique`, `/metriques`) est envisageable — mais c'est une décision de navigation, pas de style, et elle est notée en question ouverte plus bas. |
| **« Explore our API »** | Zenkuu n'expose **aucune API publique**. `app/api/*` sert l'application elle-même (recherche, cotations, suivi). Pas de porte à annoncer. |
| **Marqueurs d'offre payante** (couronnes) | Pas d'offre payante. |
| **`Version 1` / `Updated: …`** | Pas de versionnage de fiche. `SourceNote` porte déjà l'horodatage réel des données, et c'est la bonne information. |

Le motif de la carte **Insight Summary** — un dégradé qui signale « ceci est écrit, pas mesuré » —
est intéressant et reprenable **le jour où** Zenkuu produira du texte généré. Il n'en produit pas
aujourd'hui : rien à marquer, donc pas de dégradé.

---

## 4. Ce qui se reprend en l'état

- L'absence d'ombres. Zenkuu y est **déjà** : 0 ombre réelle mesurée sur la fiche.
- Le filet d'un pixel comme seul poids. Zenkuu y est déjà (45 relevés, tous à 1 px).
- La transition unique de 200 ms sur les seules couleurs.
- Le `--` pour un repère sans valeur, plutôt que la disparition du repère.
- La barre d'outils organisée « choisir à gauche, sortir à droite ».
- Le contrôle segmenté à piste creusée — Zenkuu **a déjà** ce motif dans `ChartToolbar`, et un
  commentaire du fichier le nomme « le creusé ». Il gagne à être unifié : il existe aujourd'hui
  **deux composants nommés `SegmentedControl`** plus deux autres implémentations du même motif.
- Le focus visible : `:focus-visible { outline: 2px solid var(--color-brand); outline-offset: 2px }`
  est déjà global. Rien à changer.

---

## 5. Dettes que la refonte croise, sans les avoir créées

L'inventaire les a relevées. Elles ne sont pas dans le périmètre demandé, mais elles rendront la
diffusion plus coûteuse si on ne les nomme pas :

- **Quatre mécaniques d'onglets** distinctes coexistent.
- **Deux composants `SegmentedControl`** (`ui/` et `settings/`) plus deux autres implémentations.
- **Deux états vides**, **deux paginations**, **deux ou trois cartes**.
- **Trois bibliothèques d'interface** (HeroUI, Radix, Base UI) et **deux moteurs de graphique**
  (amCharts 5 pour la fiche, Recharts partout ailleurs).
- **17 tableaux en HTML brut**, sans primitive commune.
- `accordion.tsx` n'a plus de consommateur réel (import vide résiduel dans `MobileNav`).

---

## 6. Garde-fous d'exécution

1. **`palette.test.ts` est le juge.** Toute valeur de couleur touchée est validée par lui, dans les
   deux thèmes. Il casse dans les deux sens : un écart assumé qui s'améliore doit sortir de la liste.
2. **`tokens-v2.test.ts` lie le code à `DESIGN_SYSTEM.md`.** Ajouter ou retirer un `--v2-*` oblige à
   mettre le document à jour dans le même geste.
3. **La table de phrases est indexée par le texte français.** Réécrire un libellé impose de fournir
   les douze traductions (`messages/*.json`).
4. **Ne pas lancer `next build` pendant que le serveur de dev tourne** — cela corrompt le cache
   Turbopack et met tout le site en 500.
5. **Les commentaires sont la documentation du projet.** Ils consignent ce qui a été essayé puis
   retiré, avec la mesure à l'appui. Un commentaire supprimé en refactorant est la seule trace d'un
   défaut qui disparaît. Quatre d'entre eux sont **devenus faux** et sont à corriger au passage
   (variantes `dark:`, valeurs hexadécimales en dur, élagage de `--color-surface-active`, inertie de
   la couche `--v2-*`).
6. **`scripts/audit-responsive.mjs` dépasse 35 minutes** après une grosse session : vérifier les pages
   modifiées à la main plutôt que d'attendre l'audit.

---

## 7. Questions ouvertes

Une seule est structurante et sera posée avant d'y toucher :

> **La fiche d'actif doit-elle recevoir une rangée d'onglets ?**
> Elle est aujourd'hui une page unique. Trois sous-routes existent et ne sont desservies par aucun
> lien : `/historique`, `/metriques/[metrique]`, et `/halving` (bitcoin seul). Une rangée d'onglets
> les rendrait joignables et donnerait à la fiche la silhouette de la référence — mais elle
> découperait aussi une page qui fonctionne d'un seul tenant.

Les autres arbitrages sont pris au jugement, documentés dans le code, et listés dans le rapport
final `TOKENOMIST_REDESIGN_REPORT.md`.
