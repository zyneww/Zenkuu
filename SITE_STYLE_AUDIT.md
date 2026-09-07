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
| `/places` | 4 ×5, 12 ×1, 8 ×1 | 5 blancs | 13/400 | `h32 r8 14px`, `h20 r4 12px` |
| `/analytics` | 8 ×9, 12 ×4 | 4 blancs | 14/400 | `h36 r8 14px`, `h32 r8 14px` |
| `/graphiques/dominance` | 8 ×13, 12 ×6 | 4 gris, 2 blancs | 13/400 | — |
| `/aide` | 12 ×10, 4 ×6, 8 ×1 | — | 14/600 | `h26 pill 13px` *(mots-clés, légitime)* |
| `/heatmap` | 5 ×50 *(tuiles)*, 8 ×6 | — | 14/500 | `h32 r8 14px`, `h24 r8 14px` |
| `/nouveautes` | 8 ×11 | — | 14/400 | — |
| `/comparateur` | 12 ×1 | — | — | — |

**Le balayage est complet** : onze familles sondées, plus les fiches d'actif qui servent
de référence.

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

### E. Les tableaux — ⚠️ CETTE SECTION DISAIT FAUX, ET LE MOTIF EST INSTRUCTIF

**Ce qu'elle affirmait :** « `/crypto` sert `th 12/600 pad 8px 4px` et `td 14/400`.
`/categories` et `/screener` servent `th 12/500 pad 10px 12px` et `td 13/400`. Deux
tableaux de marché, deux densités. »

**C'était une erreur de mesure, pas d'observation.** La première sonde lisait
`querySelector('th')` et `querySelector('td')` — c'est-à-dire la **première** cellule du
document. Or la première colonne d'un tableau de marché est presque toujours une colonne
secondaire : une étoile de suivi, un rang. Elle est donc plus étroite et plus petite que
le corps du tableau, et la prendre pour sa densité est faux.

Une seconde sonde, qui rend la **distribution** de toutes les cellules, donne :

| Page | `th` | `td` |
|---|---|---|
| `/crypto` | `12/600 pad 10/12` ×8 *(+1 à `8/4` : la colonne d'étoiles)* | `14/400 pad 8/12` ×700 |
| `/categories` | `12/600` ×4 **+ `12/500` ×3** | `14/400` ×200, `13/400` ×100 *(colonnes secondaires)* |
| `/places` | `12/600 pad 10/12` | `14/400 pad 10/12` |
| `/screener` | `12/600` + `12/500` | `14/400` ×300 |
| `/analytics` | **`14/500 pad 10/16`** | `14/400 pad 10/16` |

Le site était donc **beaucoup plus cohérent** que l'audit ne le disait : une seule
densité verticale, un seul corps de cellule. Deux écarts réels subsistaient :

1. **`/analytics` : en-têtes à 14 px**, exactement la taille des 175 cellules qu'ils
   surmontent. Seule la graisse les distinguait, ce qui ne suffit pas à faire lire une
   ligne comme un en-tête.
2. **`/categories` et `/screener` : deux graisses d'en-tête dans la même rangée** — les
   en-têtes triables héritaient de 600, les trois écrits à la main portaient
   `font-medium` et sortaient à 500.

Le rembourrage horizontal (12 px sur les tableaux de marché, 16 px sur analytics) n'est
PAS un écart : il suit le nombre de colonnes. Sept colonnes larges respirent là où neuf
colonnes serrées ne le peuvent pas.

**Les deux écarts sont corrigés.** ⚠️ Et la correction a elle-même demandé deux passes :
retirer `font-medium` a fait passer les en-têtes à **700**, pas à 600. La feuille de
l'agent utilisateur porte `th { font-weight: bold }` — une règle qui vise LE `th`, donc
elle bat toute graisse héritée de la rangée. Il a fallu `[&>th]:font-semibold`, qui vise
le `th` à son tour tout en gardant la déclaration en un seul endroit par tableau.

Relevé après correction : `th 12/600` et `td 14/400` sur les cinq pages.

### F. Deux composants de même nom

`components/ui/SegmentedControl.tsx` et `components/settings/SegmentedControl.tsx`
coexistent. Le premier sert la barre d'outils du graphique, les catégories et les pools ;
le second, les réglages d'affichage. C'est exactement la « variante locale improvisée »
que le socle interdit.

### G bis. Trois tailles de titre de page

| Page | `h1` |
|---|---|
| fiches d'actif | **18 px / 700** — c'est le nom de l'actif dans son bandeau d'identité, pas un titre de page. Délibéré, comme chez la référence |
| accueil, `/crypto`, `/categories`, `/screener`, `/places`, `/parametres` | **24 px / 700** (`display-xl`) — le cran mesuré sur quarante `h1` de la référence |
| `/analytics`, `/graphiques/*` | **22 px / 600** (`display-sm`) |
| `/aide` | **36 px / 700** (`display-lg`) |

`/aide` est **corrigé** : c'était le dernier usage de `display-lg` en titre, et l'écart
le plus large.

⚠️ **`/analytics` et les graphiques globaux ne le sont PAS**, et c'est délibéré : leur
22/600 est le cran `display-sm`, employé de façon cohérente sur toute la famille
« analytics ». Les uniformiser à 24/700 est un geste d'une ligne par page, mais il touche
une famille entière dont l'échelle interne se tient ; le faire sans relever d'abord ses
sous-titres reviendrait à décaler la hiérarchie plutôt qu'à l'aligner.

### G. L'accueil à 11 px — ⚠️ CETTE SECTION DISAIT FAUX ELLE AUSSI

**Ce qu'elle affirmait :** « Corps dominant : 11 px sur 40 nœuds, contre 14 px partout
ailleurs. […] un écart d'EMPLOI : la page d'accueil emploie comme cran courant ce que le
socle réserve aux pastilles d'état. »

**Elle comptait sans regarder QUOI.** Le détail des cinquante-sept nœuds concernés :

| Forme | Nombre | Ce que c'est |
|---|---|---|
| `SPAN.truncate.font-medium` | 17 | les libellés au-dessus des grands chiffres — « Capitalisation totale », « Dominance BTC » |
| `TIME` | 26 | les horodatages des actualités — « il y a 1 h » |
| `SPAN.truncate` | 9 | les noms de source et d'auteur |
| autres | 5 | même nature |

Ce sont **tous** des micro-libellés : exactement l'emploi que le socle prévoit pour ce
cran. Aucun n'est du texte courant. L'accueil ne « lit pas plus petit », il porte
simplement beaucoup de légendes — c'est une page de tableau de bord.

**Le vrai écart était ailleurs, et il touchait tout le site :** quatre-vingts littéraux
`text-[0.6875rem]` dans quarante-sept fichiers écrivaient à la main la valeur que
`.text-micro` porte déjà. Le socle n'admet aucune valeur arbitraire, et le dépôt avait
déjà fait exactement cette migration une fois — trente-huit `text-[0.625rem]`, dont la
note de `globals.css` garde la trace.

**Migrés.** Vérifié au navigateur : cinquante-sept nœuds à 11 px avant comme après, zéro
classe arbitraire restante dans le rendu.

---

## Ce que cet audit ne tranche pas

- **Le cran de l'accueil** (§G) : passer 40 nœuds de 11 à 13 px rallonge la page. C'est
  un arbitrage de produit, pas une correction de jeton.
- **Le titre des pages analytics** (§G bis) : 22/600 est cohérent à l'intérieur de sa
  famille ; l'aligner sur 24/700 demande de relever d'abord ses sous-titres.
- **Le doublon de `SegmentedControl`** (§F) : les deux fichiers rendent des formes
  différentes (l'un des segments à filet, l'autre un curseur qui glisse). Les fondre
  demande de choisir laquelle des deux formes le site garde.

⚠️ **TROIS FOIS, LA SONDE A EU TORT ET LE CODE AVAIT RAISON.**

1. **Les tableaux** (§E) : elle échantillonnait la première cellule, qui est presque
   toujours une colonne secondaire.
2. **Les liens de `/graphiques/dominance`**, dits sans nom accessible : ils sont dans un
   `<details>` replié, donc ni cliquables ni focalisables. Le navigateur les écarte déjà.
3. **Les quarante-deux tuiles de `/heatmap`**, dites sans nom : elles en ont un, par
   `title`. Le défaut de la sonde était ici dans son propre code — son contrôle des
   BOUTONS lisait `title`, celui des LIENS ne le lisait pas.

Une mesure automatique est un indice, pas un verdict. **Mais le troisième indice était
bon quand même** : `title` est le nom accessible de dernier recours — plusieurs lecteurs
d'écran ne l'annoncent pas sans réglage, et il n'existe pas sur écran tactile. Les tuiles
portent désormais aussi un `aria-label`, avec la même chaîne.
