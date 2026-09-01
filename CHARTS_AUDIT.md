# CHARTS_AUDIT — harmonisation sur le langage visuel ASXN HyperScreener

Référence : <https://hyperscreener.asxn.xyz/home>, relevée au navigateur le 2026-09-02.

---

## 1. Ce que la référence emploie, mesuré et non deviné

Relevé sur la page en direct (variables CSS calculées, attributs SVG, styles calculés
des infobulles et des puces).

### Bibliothèque

**Recharts.** Confirmé par la présence de `.recharts-wrapper`, `.recharts-surface`,
`.recharts-bar-rectangle`, `.recharts-cartesian-axis-tick-value` — six graphiques sur la
page d'accueil, zéro `<canvas>`, 49 `<svg>`. Icônes **lucide**, variables CSS pour le
thème.

> ZENKUU a déjà `recharts@3.8.0` en dépendance, et lucide partout. **La bibliothèque
> n'est donc pas un obstacle** — aucune question à poser, rien à installer.

### Fonds et cadres

| Rôle | Valeur relevée |
| --- | --- |
| `--bg-body` / `--bg-primary` | `#0f1a1e` |
| `--bg-card` | `#0f1a1f` |
| `--border-color` | `#404040` |
| `--border-color-secondary` | `#242424` |
| `--hover-bg` | `#ffffff0a` |

Vert-noir très sombre, cartes à **1 px** de bordure fine, rayon **4 px** sur les petits
éléments.

### Palette de séries

| Jeton | Valeur | Emploi observé |
| --- | --- | --- |
| `--chart-dark-green` | `#226b59` | premier segment empilé (BTC) |
| `--chart-green-alt` | `#5e9286` | deuxième segment (ETH) |
| `--chart-grey` | `#a49e9e` | troisième (SOL) |
| `--chart-grey-light` | `#c5c4c4` | quatrième (HYPE) |
| `--chart-white` | `#f2f1f1` | reste (Others) |
| — | `rgba(255, 140, 0, 1)` | **courbe cumulée**, superposée |
| `--accent-green` | `#51a691` | barres non empilées (aplat unique) |
| `--chart-grid-color` | `#374151` | grille |

Deux familles distinctes, et c'est délibéré : les **segments empilés** vont du vert
sombre au blanc, en une seule rampe ; la **courbe superposée** est orange, la seule
couleur chaude de la page. Elle ne se confond avec aucun segment.

### Épaisseurs

- séries de ligne : `stroke-width: 1.5`
- courbe cumulée superposée : `stroke-width: 2`
- barres : `fill-opacity: 1` sur l'aplat, la transparence vient de la teinte elle-même

### Infobulle — mesurée au survol

```
background   rgba(11, 11, 13, 0.8)
backdrop     blur(40px)
border       1.11px solid oklch(1 0 0 / 0.1)
radius       4px
padding      4px 8px
transition   transform 0.25s cubic-bezier(0.3, 1, 0.8, 1)
```

La transition sur `transform` est ce qui la fait **glisser** en suivant le curseur au
lieu de sauter d'un point à l'autre. La courbe `cubic-bezier(0.3, 1, 0.8, 1)` sort vite
puis se pose — elle rattrape le curseur sans le dépasser.

Contenu : date en tête (gris, `Aug 1, 2025`), puis une ligne par série — pastille de
couleur, nom, valeur formatée (`BTC: 108.75B`).

### Crosshair

Trait vertical **pointillé** + trait horizontal **pointillé**, clairs et fins, avec un
point d'ancrage sur la courbe. Observé au survol (capture d'écran) ; les attributs SVG
exacts n'ont pas pu être lus, l'état de survol ne survivant pas entre deux appels
d'outil.

### Puces de légende — mesurées

```
conteneur    rounded-[4px] border border-foreground/30 px-2 py-1
             transition-all duration-200 cubic-bezier(0.4, 0, 0.2, 1)
pastille     12 × 12 px, radius 2px, aplat de la couleur de série
libellé      12px, text-muted-secondary
```

`cubic-bezier(0.4, 0, 0.2, 1)` **est exactement `--ease-standard` de ZENKUU**, et 200 ms
est à un cran de `--duration-state` (150 ms). Le vocabulaire de mouvement du projet
convient tel quel.

Un bouton **« Deselect all »** ferme la rangée, dans la même forme.

### Sélecteurs de période

Lettres seules — `D` `W` `M` `Y` sur les grands graphiques, `1D 7D 1M 3M 1Y` sur les
cartes de tête. L'état actif est **encadré** (grands) ou **souligné** (cartes de tête).

### Autres éléments

- **Dropdown** « 4 coins selected » pour choisir les séries.
- **Brush** : mini-timeline de zoom sous les grands graphiques, avec deux poignées.
- **Sélecteurs de type** : icônes barres / ligne / tendance (lucide `chart-column`,
  `chart-spline`, `trending-up`), plus `calendar-days` et une icône capture.
- **Statistiques d'en-tête** : grande valeur (`$8.59B`) + `24h +4.06%` `30d +136.67%`.
- **Filigrane** : « ASXN » derrière le tracé, `color: oklab(0.708 0 0 / 0.2)`,
  `letter-spacing: 0.4px`. À reprendre avec **ZENKUU**.
- **Double axe Y** avec étiquettes **verticales** (`Volume (USD)` / `Cumulative Volume (USD)`).

---

## 2. Ce que ZENKUU aligne aujourd'hui

Treize composants, deux bibliothèques, aucun vocabulaire commun d'interaction.

| Composant | Lignes | Consommateurs | Base | État |
| --- | ---: | ---: | --- | --- |
| `charts/AreaPlot` | 452 | 10 | SVG maison | [ ] |
| `charts/BarFigure` | 327 | 2 | SVG maison | [ ] |
| `charts/LineFigure` | 206 | **0** | SVG maison | [ ] à supprimer |
| `asset/PriceChartAm` | 856 | 1 | amCharts 5 | [ ] |
| `asset/PriceChartInteractive` | 1203 | 6 | amCharts 5 | [ ] |
| `asset/ShareDonut` | 360 | 1 | SVG maison | [ ] |
| `asset/TechnicalGauge` | 195 | 1 | SVG maison | [ ] |
| `home/SentimentGauge` | 121 | 2 | SVG maison | [ ] |
| `sentiment/SentimentBars` | 282 | 2 | SVG maison | [ ] |
| `sentiment/SentimentDial` | 239 | 1 | SVG maison | [ ] |
| `tools/ComparatorRadar` | 182 | 1 | SVG maison | [ ] |
| `tools/TreemapFigure` | 460 | 4 | SVG maison | [ ] |
| `market/MacroMap` | 334 | 3 | SVG maison | [ ] |
| `Sparkline` (packages/ui) | — | 10 | SVG maison | [ ] |

**Deux bibliothèques cohabitent** : `@amcharts/amcharts5` porte les deux graphiques de
cours, tout le reste est du SVG écrit à la main. `recharts@3.8.0` est en dépendance mais
n'est plus employé — `chart-theme.ts` documente son retrait.

`chart-theme.ts` existe déjà et porte le bon principe : **les couleurs sont des jetons
CSS, jamais des valeurs figées**, pour que le tracé suive la bascule de thème sans
re-rendu. C'est la fondation sur laquelle le système ASXN se pose.

---

## 3. L'arbitrage à trancher — le mode CLAIR

**Le langage ASXN est SOMBRE.** Fond vert-noir, séries qui vont du vert sombre au blanc,
infobulle noire translucide. ZENKUU sert les deux thèmes, et son thème clair est un
canvas blanc.

Transposer la rampe telle quelle en clair donnerait du blanc sur blanc pour le dernier
segment empilé. La rampe doit donc **s'inverser** en clair — du vert sombre vers un gris
soutenu plutôt que vers le blanc — et l'infobulle passer d'un noir translucide à un
blanc translucide de même opacité.

C'est le seul point où la fidélité au relevé ne peut pas être littérale. Le langage est
repris ; les valeurs de la rampe claire sont dérivées.

---

## 4. Plan

### Phase A — le socle ✅
- [x] Jetons dans `globals.css` : rampe d'empilement `--chart-stack-1..5` (claire **et**
      sombre), `--chart-overlay`, jetons d'infobulle, crosshair, filigrane.
- [x] Infobulle restylée dans `components/ui/chart.tsx` — fond translucide, flou 40 px,
      rayon 4 px, rembourrage resserré, bordure à 10 %.
- [x] Le **glissement** de l'infobulle (`transform .25s cubic-bezier(.3, 1, .8, 1)`), le
      crosshair pointillé, la grille et le filigrane, dans `globals.css`.
- [x] `components/charts/asxn.tsx` — puces de série, bascule « tout afficher / masquer »,
      sélecteur de période (encadré **et** souligné), filigrane, rampe d'empilement.
- [x] Filigrane posé sur les trois grandes figures (`BasketCharts`, `ComparatorView`,
      `GlobalChartCard` en grande taille). **Vérifié au navigateur** : filigrane en
      trame derrière la courbe, infobulle translucide à date en tête et pastille de
      couleur, crosshair vertical au point survolé.

### Phase B — les graphiques cartésiens
- [ ] `AreaPlot` (10 consommateurs — le plus rentable)
- [ ] `BarFigure`
- [ ] `LineFigure` — **supprimer**, aucun consommateur
- [ ] `Sparkline`

### Phase C — les deux graphiques de cours
- [ ] `PriceChartInteractive`
- [ ] `PriceChartAm`

### Phase D — les figures non cartésiennes
- [ ] `TreemapFigure`, `MacroMap`, `ShareDonut`, `ComparatorRadar`
- [ ] `SentimentDial`, `SentimentGauge`, `SentimentBars`, `TechnicalGauge`

### Phase E — vérification
- [ ] Survol, infobulle, puces, périodes, brush, redimensionnement, clair/sombre
- [ ] `bun run typecheck` / `lint` / `test` propres
- [ ] Rapport final : implémenté / partiel / bloqué

---

## 5. Données — ce qui manque pour reproduire certains effets

- **Empilement par actif** (BTC / ETH / SOL / Others) : ZENKUU a les capitalisations par
  actif et les catégories, donc l'empilement par actif ou par secteur est possible sur
  les séries qui le portent. À vérifier série par série au moment de la migration.
- **Courbe cumulée superposée** : dérivable de toute série de volume par somme courante.
  Ce n'est pas une donnée inventée, c'est une transformation de la série affichée — à
  condition de le DIRE dans la légende, ce que fait la référence (« Cumulative Volume »).

Aucun placeholder n'est employé. Une série absente laisse son état vide, comme partout
ailleurs sur le site (§5).
