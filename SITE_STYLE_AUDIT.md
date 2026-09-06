# Écarts au socle de style, famille de pages par famille de pages

Contrat de référence : `COINGECKO_STYLE_TOKENS.md`.

Méthode : une sonde exécutée dans le navigateur sur chaque page compte, parmi les
éléments **réellement peints** du corps de page (largeur et hauteur supérieures à 8 px),
les rayons, les ombres, les fonds, les filets, les couples taille/graisse, et relève la
géométrie de chaque bouton. Elle mesure donc ce que le lecteur voit, et non ce que les
classes annoncent. Thème clair, fenêtre 1568 px, 2026-09-07.

---

## Le relevé

| Page | Rayons dominants | Fonds peints | Corps dominant | Boutons |
|---|---|---|---|---|
| **`/crypto/bitcoin/metriques`** *(référence)* | 8 ×14, 12 ×6 | 3 gris, 2 blancs | 14/600 | `h32 r8 14px`, `h37 r8 14px` |
| `/` (accueil) | pill ×59, **12 ×23**, 8 ×4 | **28 blancs**, 17 gris | **11/400 ×40** | **`h32 r12 16px`**, `h20 pill 16px` |
| `/crypto` | 8 ×108, 4 ×7 | 14 blancs | 14/400 | **`h32 r12 16px`**, `h36 r8 14px`, `h20 r4 12px` |
| `/categories` | 8 ×13, 4 ×4, **14 ×3** | 149 gris *(vignettes)* | 14/400 | `h24 r8`, `h32 r8`, `h20 r4` |
| `/screener` | 8 ×11, **16 ×11** | 9 blancs | 14/400 | **cinq géométries**, dont `h29 r0` et `h20 r0`, et trois à **13 px** |
| `/convertisseur` | **12 ×11, aucun 8** | 10 blancs | 14/400 | **toutes pastilles**, `h34 pill 16px`, `h36 pill 16px` |
| `/parametres` | pill ×3, 8 ×3, **6 ×1** | 2 gris, 2 blancs | 14/500 | **`r8`, `r6` et `r0` sur la même page** |

---

## Ce qui est CONFORME, et qu'il ne faut pas toucher

- **Le filet est unifié.** `1.25px` en `#eff2f5` sur toutes les pages relevées, sans
  exception. C'est la brique la mieux tenue du site.
- **Les ombres ont disparu partout.** Aucune page ne dépasse la poignée d'anneaux de
  focus. La règle « pas d'ombre dans le flux » est acquise.
- **`/crypto` est déjà au socle** : 108 rayons de contrôle, quatorze aplats sur près de
  trois mille nœuds, corps dominant à 14 px.
- **Les 149 aplats de `/categories`** ne sont PAS un écart : ce sont les vignettes
  d'actif empilées dans la colonne « Secteur », chacune un rond gris cerclé de blanc.
  Une sonde qui compte des aplats ne distingue pas un décor d'une donnée ; l'œil, si.

---

## Les écarts, par gravité

### A. Un contrôle qui porte un rayon de carte — **partagé, donc prioritaire**

`components/home/StatsBarCollapse.tsx` : un bouton icône de 32 px avec `rounded-card`
(12 px). Il apparaît sur l'accueil ET sur les six pages de classement — c'est le
`h32 r12 16px` qui revient dans deux lignes du relevé. Il hérite aussi du corps de 16 px
faute de classe de taille.

### B. Le convertisseur n'a jamais reçu le socle

Quatre contrôles en `rounded-pill` (`components/tools/ConverterView.tsx`), dont deux sans
classe de taille — d'où le 16 px. La page ne contient **aucun** rayon de contrôle : ses
seuls rayons sont ceux de ses cartes.

### C. Rayons hors barème, dans des composants partagés

| Fichier | Écrit | Attendu |
|---|---|---|
| `components/charts/StatCard.tsx` | `rounded-[14px]` | `rounded-card` |
| `components/market/GlobalChartCard.tsx` | `rounded-[14px]` | `rounded-card` |
| `components/ui/scroll-progress.tsx` ×2 | `rounded-[14px]` | `rounded-card` |
| `components/ui/SegmentedControl.tsx` | `rounded-[12px]!` | `rounded-card!` *(même valeur, écrite hors barème)* |
| `components/ui/LinkTabs.tsx` | `rounded-[6px]` | `rounded-control` |
| `components/tools/TreemapFigure.tsx` | `rounded-[12px]` | `rounded-card` |
| `components/ui/dialog.tsx`, `alert-dialog.tsx`, `empty.tsx`, `nav/NavMenus.tsx` | `rounded-lg` | `rounded-card` |
| `components/ui/delete-button.tsx` ×3 | `rounded-2xl` | `rounded-card` |

Total : **14 déclarations hors barème** contre 144 `rounded-card` et 117
`rounded-control` — le socle est majoritaire, l'écart est une traîne.

⚠️ **Deux fausses alertes, écartées après lecture du code.**

- `components/ui/navigation-menu.tsx` porte `rounded-md` (6 px) sur le panneau déroulant
  de l'en-tête, et c'est un relevé DÉLIBÉRÉ, documenté sur place : « `rounded-md` (6 px)
  et non `rounded-control` (8 px), qui est le rayon de LEUR panneau de navigation ». La
  sonde ne pouvait pas le savoir ; le fichier, si. Inchangé.
- `components/home/SectorMap.tsx` porte `rounded-md` sur ses tuiles de treemap. Une tuile
  de quelques dizaines de pixels ne peut pas porter le rayon d'une carte sans se
  déformer : c'est de la donnée peinte, hors barème par nature (§10 du socle). Inchangé.

### D. Une couleur écrite en dur

`components/tools/TreemapFigure.tsx` : `bg-[#14151b]`. Aucun jeton ne porte cette valeur,
et elle ne suit donc pas le thème.

### E. Deux densités de tableau

`/crypto` sert `th 12/600 pad 8px 4px` et `td 14/400`. `/categories` et `/screener`
servent `th 12/500 pad 10px 12px` et `td 13/400`. Deux tableaux de marché, deux
densités : c'est l'écart le plus visible à l'œil nu, et le plus coûteux à corriger
puisqu'il touche la largeur des colonnes.

### F. Deux composants de même nom

`components/ui/SegmentedControl.tsx` et `components/settings/SegmentedControl.tsx`
coexistent. Le premier sert la barre d'outils du graphique, les catégories et les pools ;
le second, les réglages d'affichage. C'est exactement la « variante locale improvisée »
que le socle interdit.

### G. L'accueil est deux crans plus petit que le reste du site

Corps dominant : **11 px sur 40 nœuds**, contre 14 px partout ailleurs. Ce n'est pas un
écart de jeton — `--text-2xs` existe et vaut 11 px — mais un écart d'EMPLOI : la page
d'accueil emploie comme cran courant ce que le socle réserve aux pastilles d'état.

---

## Ce que cet audit ne tranche pas

- **La densité de tableau à retenir** (§E) : le socle a inscrit celle de `/crypto`, mais
  les colonnes de `/categories` et `/screener` sont dimensionnées pour l'autre. Le
  changement est mécanique et large ; il demande un relevé de débordement après coup.
- **Le cran de l'accueil** (§G) : passer 40 nœuds de 11 à 13 px rallonge la page. C'est
  un arbitrage de produit, pas une correction de jeton.
