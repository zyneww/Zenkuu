# Spécification UI/UX — Harmonisation visuelle & ergonomique sur Backpack Exchange

> **Référence analysée au navigateur (2026-09-02)** : [backpack.exchange](https://backpack.exchange/), `/markets`, `/trade/BTC_USD`.  
> **Cible** : Aligner l'ensemble de ZENKUU sur la *vibe*, la précision d'instrument, les surfaces d'obsidienne, les transparences, les halos de lumière (*glows*), les tuiles imbriquées et la micro-typographie de Backpack, tout en préservant l'identité cyan/menthe de la marque Zenkuu et la rigueur de données du projet (*Zéro donnée inventée*).

---

## Sommaire

1. [Principes directeurs & ADN visuel](#1-principes-directeurs--adn-visuel)
2. [Système de jetons CSS — Tailwind 4 (`@theme`)](#2-système-de-jetons-css--tailwind-4-theme)
3. [Précision typographique & hiérarchie](#3-précision-typographique--hiérarchie)
4. [Échelle des formes, rayons & bordures](#4-échelle-des-formes-rayons--bordures)
5. [Effets de matière : Glow, Sheen, Transparence & Grain](#5-effets-de-matière--glow-sheen-transparence--grain)
6. [Composants fondamentaux (Design Primitives)](#6-composants-fondamentaux-design-primitives)
7. [Navigation & Chrome (Header & Footer)](#7-navigation--chrome-header--footer)
8. [Surfaces métiers : Fiches d'actifs, Marchés & Outils](#8-surfaces-métiers--fiches-dactifs-marchés--outils)
9. [Graphiques & Visualisations de données](#9-graphiques--visualisations-de-données)
10. [Plan de migration pas-à-pas & critères d'acceptation](#10-plan-de-migration-pas-à-pas--critères-dacceptation)

---

## 1. Principes directeurs & ADN visuel

### 1.1 L'esthétique Backpack
Backpack ne ressemble ni à un tableur froid (façon Bloomberg), ni à une application grand public bavarde (façon Coinbase), ni à une grille surchargée de publicités (façon CoinGecko). Son langage visuel repose sur quatre piliers mesurés :
1. **L'obsidienne étagée** : Une hiérarchie stricte de 5 niveaux de profondeur (`L0` à `L4`), du noir chaud d'arrière-plan (`#0e0f14`) aux cartes sombres (`#14151b`), puis aux inputs et sous-panneaux (`#191a20`) et aux états de survol (`#202127`).
2. **La micro-affordance géométrique** : Une distinction nette entre ce qui est **manipulable** (boutons, champs, onglets en pilules complètes `rounded-full` ou `rounded-lg`) et ce qui est **contenant** (cartes en `rounded-2xl` à 16 px, bordures de 1 px chirurgicales).
3. **Lueurs diffuses & reflets fins (*Glow & Sheen*)** : De discrets halos radiaux (`blur-3xl`, opacité 4 à 8 %) disposés sous les sections d'ouverture, accompagnés de filets supérieurs translucides qui donnent un aspect de verre taillé aux bordures de cartes.
4. **Densité d'instrument sans bruit** : Suppression des bordures verticales inutiles dans les tableaux, interlignes serrés, chiffres composés en chasse fixe tabulaire (`tabular-nums`), symboles d'actifs mis en avant en capitales moyennes (13 px, graisse 500) et noms en retrait (11 px).

### 1.2 Respect des règles Zenkuu
* **Zéro donnée inventée** : Aucune fioriture décorative ne doit simuler un statut, une liquidité ou un chiffre.
* **Marque préservée** : Les surfaces, bordures et boutons adoptent la grammaire de Backpack ; la teinte d'accentuation de Zenkuu demeure l'**azur ZENKUU** (`#91d7e3` / `#1c7a89`), tandis que le vert (`#00c278`) et le rouge (`#ea383b`) restent cantonnés aux variations de marché.

---

## 2. Système de jetons CSS — Tailwind 4 (`@theme`)

Les jetons ci-dessous traduisent fidèlement les valeurs relevées sur `backpack.exchange` pour les intégrer au fichier [globals.css](file:///home/ok/Documents/zenkuu/apps/web/app/globals.css).

### 2.1 Surfaces & Arrière-plans étagés (Layers)

| Jeton Zenkuu cible | Rôle | Valeur Sombre (Backpack) | Valeur Claire (Backpack Light) |
|---|---|---|---|
| `--color-canvas` / `l0` | Fond d'écran global | `#0e0f14` (`rgb(14, 15, 20)`) | `#f8f8f9` |
| `--color-surface` / `l1` | Cartes & grands panneaux | `#14151b` (`rgb(20, 21, 27)`) | `#eeeff1` |
| `--color-surface-nested` / `l2` | Inputs, cartes encastrées | `#191a20` (`rgb(25, 26, 32)`) | `#eaecf4` |
| `--color-surface-hover` / `l3` | Survol de ligne & boutons secondaires | `#202127` (`rgb(32, 33, 39)`) | `#e6e7ed` |
| `--color-surface-active` / `l4` | Onglets actifs & boutons segmentés | `#383a45` (`rgb(56, 58, 69)`) | `#cacfd9` |
| `--color-overlay` | Menus volants, tiroirs, modales | `#14151b` (avec `shadow-2xl`) | `#ffffff` |

### 2.2 Bordures & Filets de séparation

| Jeton | Rôle | Sombre | Clair |
|---|---|---|---|
| `--color-border-subtle` | Filet standard de carte | `#1c1e26` ou `rgba(255, 255, 255, 0.07)` | `#e6e7ed` |
| `--color-border-medium` | Bordure d'input ou focus | `#2e313d` ou `rgba(255, 255, 255, 0.14)` | `#0f172a24` |
| `--color-border-sheen` | Reflet lumineux supérieur de carte | `rgba(255, 255, 255, 0.12)` | `rgba(255, 255, 255, 0.8)` |
| `--color-divider` | Ligne de coupe interne | `rgba(255, 255, 255, 0.05)` | `rgba(15, 23, 42, 0.06)` |

### 2.3 Niveaux de texte & Emphase typographique

| Jeton | Emploi | Sombre | Clair |
|---|---|---|---|
| `--color-high-emphasis` | Titres, tickers, cours actuels | `#f4f4f6` (Ivory pur) | `#14151b` |
| `--color-med-emphasis` | Noms d'actifs, labels d'en-tête | `#969faf` (Gris neutre froid) | `#5d606f` |
| `--color-low-emphasis` | Rangs, sous-titres, dates, icônes neutres | `#75798a` | `#75798a` |

### 2.4 Couleurs de Marché (Ticks, Badges & Variations)

| Rôle | Sombre (Backpack exact) | Clair (Backpack exact) |
|---|---|---|
| **Hausse (Up Text)** | `#00c278` | `#00794b` |
| **Hausse (Fond transparent)** | `rgba(0, 194, 120, 0.08)` (`#00c27814`) | `rgba(0, 121, 75, 0.08)` |
| **Hausse (Bordure / Filet)** | `rgba(0, 194, 120, 0.25)` | `rgba(0, 121, 75, 0.2)` |
| **Baisse (Down Text)** | `#ea383b` | `#d20032` |
| **Baisse (Fond transparent)** | `rgba(234, 56, 59, 0.10)` (`#ea383b1f`) | `rgba(210, 0, 50, 0.08)` |
| **Baisse (Bordure / Filet)** | `rgba(234, 56, 59, 0.30)` | `rgba(210, 0, 50, 0.2)` |
| **Marque Zenkuu (Accent)** | `#91d7e3` (Azur pâle) | `#1c7a89` |
| **Glow Marque Zenkuu** | `rgba(145, 215, 227, 0.07)` | `rgba(28, 122, 137, 0.05)` |

---

## 3. Précision typographique & hiérarchie

### 3.1 Polices de caractères
* **Texte d'interface & Titrage** : `InterVariable` (ou `Inter`), avec graisse 400 pour le texte courant, 500 pour les contrôles et 600–700 pour les chiffres clés et titres.
* **Nombres financiers** : `DM Mono` ou `Inter` avec l'utilitaire `tabular-nums` obligatoire (`font-variant-numeric: tabular-nums`). Ceci empêche tout tressautement lors des rafraîchissements en temps réel.

### 3.2 Tailles mesurées chez Backpack
* **Titres H1 marketing** : 48 px à 72 px, graisse 700, `letter-spacing: -0.025em`, avec animation *shimmer* sur le mot d'accent.
* **Titres de section H2** : 24 px à 30 px, graisse 700.
* **Titres de cartes / widgets** : 16 px à 18 px, graisse 600.
* **Tickers / Symboles** : **13 px**, graisse 500, en capitales strictes (`text-[13px] font-medium uppercase text-high-emphasis`).
* **Noms d'actifs secondaires** : **11 px**, graisse 400 (`text-[11px] text-med-emphasis`).
* **En-têtes de colonnes de tableau** : **12 px**, graisse 500, `text-med-emphasis`.
* **Micro-badges & tags de statut** : 10 px à 11 px, graisse 600.

---

## 4. Échelle des formes, rayons & bordures

Backpack utilise une échelle à double pôle : **très arrondi pour les contrôles**, **modérément arrondi pour les cartes**, **strictement carré pour les tables**.

```
  0 px   ─────────────────  Tableaux, carnets d'ordres (flux continu)
  4 px   ─── rounded-sm ──  Micro-pastilles, indicateurs 24x24
  8 px   ─── rounded-lg ──  Boutons carrés, champs de saisie, items de menu
 12 px   ─── rounded-xl ──  Conteneurs d'input, sous-cartes, blocs secondaires
 16 px   ─── rounded-2xl ─  Cartes principales, panneaux de marché
 24 px   ─── rounded-3xl ─  Cadres d'ouverture, grandes modales
9999 px  ─── rounded-full   Barres de navigation, recherche hero, pilules de tri
```

### Règles d'or des bordures
1. **Épaisseur constante** : Toutes les bordures structurelles sont de **1 px** (`border border-border-subtle`).
2. **Pas de bordures verticales dans les listes** : Les tableaux et listes ne tracent que des filets horizontaux très discrets (`border-b border-border-subtle/50`). La distinction des colonnes se fait par l'alignement et l'espacement.
3. **Survol sans saut de boîte** : Ne jamais changer `border-width` au survol. Le survol modifie `border-color` (`hover:border-border-medium`) ou applique un halo de boîte (`hover:shadow-[0_0_12px_rgba(255,255,255,0.03)]`).

---

## 5. Effets de matière : Glow, Sheen, Transparence & Grain

### 5.1 Les Halos lumineux d'arrière-plan (*Backdrop Glow*)
Backpack pose de vastes ellipses colorées très diffuses derrière ses sections clés pour réchauffer l'obsidienne sombre sans altérer la lisibilité du texte :

```html
<!-- Halo lumineux d'arrière-plan adapté pour Zenkuu (Cyan diffus) -->
<div class="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden" aria-hidden="true">
  <div
    class="h-[440px] w-[500px] rounded-full blur-3xl sm:h-[600px] sm:w-[900px]"
    style="background: radial-gradient(ellipse at center, color-mix(in srgb, var(--color-brand) 7%, transparent) 0%, transparent 70%);"
  />
</div>
```

### 5.2 Les reflets supérieurs de cartes (*Card Sheen Line*)
Chaque carte ou panneau majeur comporte un trait lumineux de 1 px sur son arête supérieure qui simule la réfraction de la lumière :

```html
<div class="relative overflow-hidden rounded-2xl border border-border-subtle bg-surface">
  <!-- Filet supérieur de brillance (Sheen) -->
  <div
    class="pointer-events-none absolute inset-x-0 top-0 h-px"
    style="background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.12) 50%, transparent 100%);"
    aria-hidden="true"
  />
  <!-- Contenu de la carte -->
  <div class="p-5">...</div>
</div>
```

### 5.3 L'animation Shimmer sur le texte d'accent
Sur les mots clés de titres marketing, Backpack applique un dégradé mobile qui scintille doucement :

```css
@keyframes shimmer {
  0% { background-position: 100% 0; }
  100% { background-position: -100% 0; }
}

.text-shimmer {
  background: linear-gradient(
    90deg,
    var(--color-brand) 0%,
    var(--color-brand) 40%,
    color-mix(in srgb, var(--color-brand) 70%, white) 50%,
    var(--color-brand) 60%,
    var(--color-brand) 100%
  );
  background-size: 200% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  animation: shimmer 6s ease-in-out infinite;
}
```

### 5.4 Glassmorphism & Flous
* **Barre d'en-tête** : `bg-canvas/80 backdrop-blur-md border-b border-border-subtle`
* **Infobulle de graphique** : `bg-[#0e0f14]/85 backdrop-blur-md border border-border-medium shadow-xl`
* **Tiroir / Overlay de recherche** : `bg-black/60 backdrop-blur-sm`

---

## 6. Composants fondamentaux (Design Primitives)

### 6.1 Boutons

```
┌────────────────────────────────────────────────────────────────────────┐
│  [ Primary Pill (9999px) ]     [ Secondary Button (8px) ]   [ Icon ]   │
│  bg-brand text-black font-600   bg-surface-hover text-high   size-8    │
└────────────────────────────────────────────────────────────────────────┘
```

#### A. Bouton Pilule Primaire (Call to action principal)
```tsx
// Style : Blanc cassé ou Cyan Zenkuu, texte sombre en contraste maximal, arrondi total
className="inline-flex items-center justify-center rounded-full bg-high-emphasis px-5 py-2 text-sm font-semibold text-canvas transition-all duration-150 ease-out hover:opacity-90 active:scale-[0.98]"
```

#### B. Bouton Secondaire / Action de tableau
```tsx
// Style : Fond sombre L3, texte clair, coins à 8px
className="inline-flex items-center justify-center rounded-lg bg-surface-hover px-3 py-1.5 text-xs font-medium text-high-emphasis transition-colors duration-150 hover:bg-surface-active"
```

#### C. Contrôle Segmenté (Binary / Multi Tabs)
Utilisé pour *Buy / Sell*, *Spot / Perp*, *1D / 7D / 1M* :
```tsx
// Conteneur en rail arrondi avec capsule active animée
<div role="tablist" class="inline-flex rounded-full border border-border-subtle bg-surface-nested p-1 shadow-sm">
  <button role="tab" aria-selected="true" class="rounded-full bg-high-emphasis px-4 py-1.5 text-xs font-semibold text-canvas transition-colors">
    Spot
  </button>
  <button role="tab" aria-selected="false" class="rounded-full px-4 py-1.5 text-xs font-medium text-med-emphasis hover:text-high-emphasis transition-colors">
    Perpétuels
  </button>
</div>
```

### 6.2 Cartes & Tuiles
* **Structure globale** : `rounded-2xl border border-border-subtle bg-surface transition-all duration-150 ease-out hover:scale-[1.005] hover:-translate-y-px hover:shadow-sm`
* **Conteneurs de données imbriqués (*Nested Cards*)** : `rounded-xl bg-surface-nested border border-border-subtle/60 p-3`

### 6.3 Badges & Variations (+2,4 %, -1,8 %)
Remplacer les badges rectangulaires épais par les micro-pastilles fluides de Backpack :
* **Hausse** : `bg-[rgba(0,194,120,0.1)] text-[#00c278] border border-[rgba(0,194,120,0.2)] rounded-md px-1.5 py-0.5 text-xs font-medium tabular-nums`
* **Baisse** : `bg-[rgba(234,56,59,0.1)] text-[#ea383b] border border-[rgba(234,56,59,0.2)] rounded-md px-1.5 py-0.5 text-xs font-medium tabular-nums`

---

## 7. Navigation & Chrome (Header & Footer)

### 7.1 L'en-tête Flottant en Pilule (*Backpack Pill Navbar*)
L'en-tête actuel de Zenkuu est une barre pleine de 64 px avec méga-menus. L'alignement sur Backpack sublime cette surface en un bandeau aérien :

```
┌────────────────────────────────────────────────────────────────────────┐
│ [Logo Zenkuu]       (  Marchés  Cryptos  Actions  Outils  Plus  )      │
│                     └──────────────────────────────────────────┘      │
│                     Pilule flottante centrale (backdrop-blur)         │
│                                           [ / Recherche ]  [Compte]    │
└────────────────────────────────────────────────────────────────────────┘
```

#### Spécifications techniques du Header
1. **Conteneur externe** : `sticky top-0 z-40 w-full h-16 bg-canvas/80 backdrop-blur-md border-b border-border-subtle px-6 flex items-center justify-between`
2. **Pilule de navigation centrale** :
   * `hidden md:flex items-center gap-6 rounded-full border border-border-subtle/80 bg-surface/80 px-6 py-2 shadow-sm`
   * Liens en `text-sm font-medium text-med-emphasis hover:text-high-emphasis transition-colors duration-150`
   * Marqueur d'onglet actif discret : texte `text-high-emphasis font-semibold` sans soulignement lourd.
3. **Barre de recherche intégrée avec raccourci** :
   * Boîte pilule compacte : `flex items-center gap-2 rounded-full border border-border-subtle bg-surface-nested px-3 py-1.5 text-xs text-med-emphasis hover:border-border-medium cursor-pointer`
   * Kbd visible : `rounded bg-surface-active px-1.5 py-0.5 text-[10px] font-mono text-high-emphasis` affichant `/`.

### 7.2 Overlay de Recherche Universelle (Modal)
Reprendre l'architecture de [SearchScopes.tsx](file:///home/ok/Documents/zenkuu/apps/web/components/search/SearchScopes.tsx) :
* Onglets supérieurs horizontaux en 13 px : `Tout`, `Cryptomonnaies`, `Actions`, `ETF`, `Indices`, `Devises`, `Matières premières`.
* Groupement vertical strict par catégorie en capitales discrètes (ex: `CRYPTOMONNAIES`, `ACTIONS`).
* Lignes denses avec logo en monogramme ou image circulaire 24 px, symbole à gauche (13 px font-500) et nom en dessous (11 px gris), cours et variation 24 h alignés à droite.
* Surlignage `HighlightMatch` sans décalage Unicode.

---

## 8. Surfaces métiers : Fiches d'actifs, Marchés & Outils

### 8.1 Fiche d'Actif : Organisation en Terminal Pro
La page `/crypto/[id]` et `/actions/[id]` abandonne l'empilement vertical monolithique pour adopter la rigueur de grille du terminal Backpack :
1. **Bandeau supérieur de cotation** :
   * Logo 32 px + Symbole en grand (24 px bold) + Cours en direct WebSocket.
   * **Animation de tick** : illumination brève (vert `#00c278` si hausse, rouge `#ea383b` si baisse) sur fond translucide pendant 600 ms, sans variation de taille ni décalage de boîte.
2. **Graphique interactif principal** :
   * Logé dans une carte `rounded-2xl border border-border-subtle bg-surface p-4`.
   * Barre d'outils supérieure compacte : sélecteur de chandeliers / ligne, sélecteur de durée (`1D`, `7D`, `1M`, `1Y`, `Tout`) en segmented tabs de 12 px.
3. **Blocs de statistiques & Tokenomique en tuiles 2x2** :
   * Chaque métrique (Cap. boursière, Volume 24 h, Offre en circulation, ATH) réside dans une tuile imbriquée `rounded-xl bg-surface-nested p-3.5 border border-border-subtle/50`.
   * Libellé en 11 px `text-med-emphasis`, valeur en 15 px `font-semibold tabular-nums text-high-emphasis`.

### 8.2 Tableau de Marché (Market Table)
* **Hauteur de ligne** : 44 px à 48 px (densité calculée pour afficher 20 lignes sans défilement sur écran standard).
* **Hover de ligne** : `hover:bg-surface-hover` (`#202127`), avec transition douce de 100 ms.
* **Typographie des colonnes** :
  * Col 1 (Rang) : `text-xs tabular-nums text-low-emphasis w-10 text-center`
  * Col 2 (Actif) : Logo 24 px + Ticker 13 px (font-500) + Nom 11 px (gris)
  * Col 3 (Prix) : 13 px font-semibold `tabular-nums text-high-emphasis text-right`
  * Col 4-6 (1 h, 24 h, 7 j) : Badges translucides ou texte coloré vert/rouge avec flèche fine SVG
  * Col 7-8 (Volume & Market Cap) : 12 px `text-high-emphasis tabular-nums text-right`
  * Col 9 (Mini-courbe 7j Sparkline) : Tracé SVG 120x36 px sans grille, vert ou rouge selon la tendance 7j.

### 8.3 Carte Thermique (Heatmap Treemap)
* Application intégrale de la rampe continue `backpackTone` déjà présente dans [treemap.ts](file:///home/ok/Documents/zenkuu/apps/web/components/tools/treemap.ts) :
  * Neutre : `#1a1d23` (`rgb(26, 29, 35)`)
  * Hausse max (+3 %) : `#186848` (`rgb(24, 104, 72)`)
  * Baisse max (-3 %) : `#782e31` (`rgb(120, 46, 49)`)
* Espacement entre tuiles : **4 px**, rayon de courbure : **5 px** (`rounded-[5px]`).
* Infobulle au survol : fond noir translucide, flou de 40 px, bordure fine 1 px.

---

## 9. Graphiques & Visualisations de données

### 9.1 Graphiques Recharts (Analyses, Macro, Comparateur)
Alignement sur l'audit [CHARTS_AUDIT.md](file:///home/ok/Documents/zenkuu/CHARTS_AUDIT.md) et la référence ASXN / Backpack :
* **Fond** : Transparent ou sur carte `#14151b`.
* **Lignes de grille cartésienne** : Pointillées fines, couleur `#202127` (`rgba(255, 255, 255, 0.05)`).
* **Crosshair** : Trait vertical pointillé blanc fin (`strokeDasharray="3 3"`, opacité 0.4).
* **Infobulle dynamique (Glide Tooltip)** :
  * `background: rgba(14, 15, 20, 0.85)`
  * `backdrop-filter: blur(20px)`
  * `border: 1px solid rgba(255, 255, 255, 0.1)`
  * `border-radius: 8px`
  * `box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5)`
  * Transition CSS sur `transform` avec courbe `cubic-bezier(0.3, 1, 0.8, 1)` (glissement fluide qui colle au curseur).

---

## 10. État de la migration — relevé, et non plan

> ⚠️ **CETTE SECTION ÉTAIT UN PLAN ; ELLE EST DEVENUE UN RELEVÉ.**
>
> Elle portait vingt cases à cocher, écrites avant l'implémentation et jamais
> relues depuis. Les cocher aurait menti deux fois : sur ce qui n'a pas été fait,
> et — plus grave — sur ce qui a été fait AUTREMENT. Le brief CoinGecko est arrivé
> après ce plan et l'a remplacé sur plusieurs points ; une case cochée aurait
> effacé la trace de ce choix.
>
> Chaque ligne dit donc ce que le code fait aujourd'hui, vérifié dans le code, avec
> l'écart quand il y en a un.

### Phase 1 — Jetons de `globals.css`

| Prévu | État |
|---|---|
| Palette d'obsidienne étagée `L0`–`L4` | **Fait.** `--color-canvas` `#0e0f14`, `--color-surface` `#14151b`, `--color-surface-muted`, `--color-surface-hover` `#202127`, `--color-surface-active`. |
| Accents `#91d7e3` / `#00c278` / `#ea383b` | **Fait en thème sombre** — `--color-brand`, `--color-up`, `--color-down`. Le thème CLAIR emploie `#00794b` et `#d20032` : le vert et le rouge d'origine ne tiennent pas 4,5:1 sur un fond crème, et `app/palette.test.ts` refuserait la paire. L'accent, lui, est le même des deux côtés. |
| Utilitaires `glow-brand`, `glow-subtle`, `card-sheen` | **Deux sur trois.** `glow-brand` et `card-sheen` existent et servent. `glow-subtle` n'a jamais eu d'appelant : une classe que personne n'emploie est du poids mort dans une feuille de style chargée à chaque page, et son absence n'est pas une dette. |

### Phase 2 — Composants de base

| Prévu | État |
|---|---|
| `Button.tsx` en pillule | **Sans objet sous cette forme.** Il n'y a pas de `components/ui/Button.tsx` : les boutons viennent de HeroUI, habillés par les jetons. La pillule `rounded-full` a été écartée avec la direction Backpack — CoinGecko emploie des angles courts, et c'est cette référence qui prime. |
| `Card.tsx` : coins, fond `L1`, `card-sheen` | **Fait.** `packages/ui/src/Card.tsx` porte `card-sheen rounded-card border border-border-subtle bg-surface`. |
| `ChangeBadge.tsx` : fonds translucides, police tabulaire | **Fait.** `packages/ui/src/ChangeBadge.tsx` porte `tabular` et `rounded-md` en variante pleine. |
| Segmented buttons dans `Tabs.tsx` | **Fait ailleurs.** Il n'y a pas de `Tabs.tsx` ; le contrôle segmenté vit dans `components/ui/SegmentedControl.tsx`, avec un indicateur glissant MESURÉ (`offsetLeft` / `offsetWidth` + `ResizeObserver`) plutôt que la table de translations d'Opensource UI, qui plafonne à cinq options et suppose des largeurs égales. |

### Phase 3 — Navigation haute

| Prévu | État |
|---|---|
| Pilule centrale flottante `backdrop-blur-md` | **Écarté avec la direction Backpack.** L'en-tête suit désormais la structure CoinGecko : barre pleine largeur, deux niveaux, méga-menus. Le `backdrop-blur-md` subsiste là où il a un sens — la barre d'onglets mobile (`MobileTabBar.tsx`), posée par-dessus le contenu qui défile. |
| Raccourci clavier `/` sur la recherche | **Fait.** `components/search/HeaderSearch.tsx`. |
| Tiroir mobile sur fond `L1` | **Fait.** `MobileNav.tsx`. |

### Phase 4 — Tableaux de cotation

| Prévu | État |
|---|---|
| Hauteur de ligne 44 px | **Obtenue autrement.** `py-2` de part et d'autre plutôt qu'une hauteur figée : une ligne dont le contenu passe à deux lignes en écran étroit doit grandir, et une hauteur fixe la tronquerait. |
| Aucune bordure verticale | **Fait.** Seules des bordures horizontales entre lignes. |
| Survol `#202127` | **Fait**, par `hover:bg-surface-hover`, dont c'est la valeur. |
| Tailles 13 px / 11 px | **Remplacées par l'échelle CoinGecko** — `--v2-text-2xs` et `text-xs`. Deux tailles écrites en dur auraient échappé au thème et à la mise à l'échelle typographique. |

### Phase 5 — Fiche d'actif

| Prévu | État |
|---|---|
| En-tête de cours et flash de tick | **Fait**, puis REFAIT : l'en-tête a pris la forme Blockworks demandée après ce plan. |
| Tuiles `L2` pour les métriques | **Fait.** `components/asset/AssetMetricGrid.tsx`. |
| Sélecteurs de période amCharts et Recharts | **Fait**, et la barre d'outils a depuis été refondue sur le modèle Dropstab. |

### Critères de non-régression — mesurés

1. `bun run typecheck` et `bun run lint` : **passent**.
2. Tests Vitest : **537 sur 47 fichiers**, tous verts, à la racine du dépôt.
   ⚠️ Compter depuis `apps/web` en rend 406 sur 34 : c'est la mesure du seul
   paquet web, et elle laisse de côté `packages/`. Le plan annonçait 496, un
   chiffre plausible pour une suite qui a depuis grandi.
3. `audit-responsive.mjs` : **aucun débordement horizontal** sur six formats.
4. Contraste WCAG AA dans les deux thèmes : tenu par `app/palette.test.ts`, qui
   refuse toute paire sous 4,5:1 — les écarts assumés y sont déclarés un par un,
   avec leur raison.
5. `audit-interactif.mjs` : survol, focus, noms accessibles, infobulles et
   erreurs de console sur les vingt-six routes.
6. `audit-surfaces.mjs` : chaque fond peint appartient à la rampe, dans les deux
   thèmes, la rampe de référence étant LUE sur la page plutôt que recopiée ici.
7. `audit-mouvement.mjs` : `prefers-reduced-motion` coupe effectivement le
   mouvement, mesuré sur les durées calculées et non sur les règles écrites.
8. `audit-liens.mjs` : chaque destination interne RENDUE répond.
