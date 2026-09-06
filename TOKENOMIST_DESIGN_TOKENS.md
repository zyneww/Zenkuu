# TOKENOMIST_DESIGN_TOKENS.md

Valeurs **mesurées** dans le navigateur sur `https://tokenomist.ai/bitcoin`, le 2026-09-06,
fenêtre 2400 px de large, thème sombre (le thème par défaut du site), puis thème clair obtenu
en retirant la classe `dark` de `<html>` et en relisant les valeurs calculées.

Rien ici n'est supposé. Chaque ligne porte le nombre d'occurrences relevées sur les 899 éléments
visibles de la page, ou le nom du jeton interne de Tokenomist qui la produit.

> **Ce que ce fichier n'est pas.** Ce n'est pas une liste de valeurs à recopier telles quelles.
> Tokenomist est rose ; Zenkuu est bleu et le reste. Ce fichier relève une **grammaire** — combien
> de plans, quel écart entre eux, quel poids de filet, quelle approche typographique — et c'est
> la grammaire qui se transpose, pas la teinte. Le fichier de correspondance vers les jetons
> Zenkuu est `ZENKUU_REDESIGN_PLAN.md`.

---

## 1. La rampe

Tout le gris de Tokenomist sort d'**une seule rampe neutre chaude**, teintée vers le magenta :
dans les douze valeurs ci-dessous, le canal rouge est toujours supérieur au bleu, et le bleu au vert
dans la moitié claire. Ce n'est pas un gris neutre décalé au hasard — c'est la teinte de l'accent
rose diluée dans le gris, ce qui fait tenir la page ensemble sans qu'aucune surface ne soit colorée.

```
#110D0F   #171214   #1C1719   #292426   #443C3F   #796B72
#A99DA4   #D7D0D3   #E7E4E6   #F5F4F4   #FCFCFC   #FDFCFC
```

Les deux thèmes puisent dans cette rampe unique, chacun par un bout. Un jeton nommé
`black-secondary` vaut `#D7D0D3` en sombre et `#443C3F` en clair : le **rôle** est le même
(encre secondaire), la position dans la rampe est symétrique.

---

## 2. Les rôles, thème par thème

| Rôle | Jeton Tokenomist | Sombre | Clair | Occurrences |
|---|---|---|---|---|
| Fond de page | `background-secondary` | `#110D0F` | `#F5F4F4` | 11 |
| Panneau, carte | `background-primary` | `#1C1719` | `#FCFCFC` | **69** |
| Filet **et** surface de survol | `black-background` | `#292426` | `#E7E4E6` | 23 fond + 32 filet |
| Encre primaire | `black-primary` | `#FDFCFC` | `#171214` | 92 |
| Encre secondaire | `black-secondary` | `#D7D0D3` | `#443C3F` | 182 |
| Encre tertiaire | `black-terteriary` *(sic)* | `#A99DA4` | `#796B72` | 104 |
| Encre désactivée | `black-disabled` | `#443C3F` | `#D7D0D3` | 7 |
| Accent de marque | `primary-primary` | `#ED5A8F` | `#C51052` | 40 |
| Accent doux | `primary-background` | `rgba(240 68 131 / .13)` | idem | 4 |
| Hausse, succès | `symmetric-success` | `#7CFA7C` | `#259B25` | 9 |
| Baisse, danger | `symmetric-danger` | `#FF6955` | `#DC4935` | — |
| Alerte | `symmetric-warning` | `#FFE459` | — | 7 |
| Fond d'alerte | `symmetric-warning-background` | `rgba(255 228 89 / .098)` | — | 2 |
| Information | `symmetric-info` | `#6AC5F9` | — | 1 |
| Fond d'information | `symmetric-info-background` | `rgba(106 197 249 / .098)` | — | 1 |

### Trois faits qui portent tout le reste

**a. Le panneau est plus clair que le canvas dans LES DEUX thèmes.**
`#110D0F → #1C1719` en sombre, `#F5F4F4 → #FCFCFC` en clair. Ce n'est pas un miroir : en clair,
un thème inversé mécaniquement aurait posé un panneau plus *sombre* que le fond. Tokenomist ne le
fait pas — une carte s'avance toujours vers la lumière, quel que soit le thème. Le clair n'est
donc pas une inversion, c'est une seconde composition dans la même rampe.

**b. Le filet et le fond de survol portent la MÊME valeur.**
`black-background` (`#292426` / `#E7E4E6`) sert à la fois de couleur de bordure — 32 relevés — et
de fond de survol — 23 relevés, via `hover:bg-black-background`. C'est la clé du relief de
Tokenomist : survoler une ligne, c'est la remplir de la teinte de son propre filet. Le contour et
l'élévation ne sont pas deux idées séparées mais deux emplois d'un même cran de rampe.

**c. Tout fond doux est sa propre teinte à ~10 % d'alpha.**
`.13` pour l'accent, `.098` pour l'alerte et l'information. Aucune teinte pastel n'est mélangée à
la main : la pastille d'alerte est du jaune d'alerte à 9,8 %, posée sur le panneau. Une seule
valeur à décider par rôle, et les deux thèmes la partagent.

---

## 3. Il n'y a pas d'ombres

Sur 899 éléments visibles, **une seule** ombre réelle : `rgba(23,73,77,.15) 0 20px 30px` — sur un
unique élément. Les quatorze autres relevés sont la valeur neutralisée que Tailwind écrit pour son
anneau de focus (`0 0 0 0 transparent`), c'est-à-dire l'absence d'ombre exprimée en toutes lettres.

Toute la profondeur de Tokenomist tient donc dans deux moyens : **la position dans la rampe** et
**le filet d'un pixel**. Une carte ne flotte pas, elle est *plus claire*. Un menu ne projette pas,
il est *cerné*. C'est ce qui donne à la page son aspect d'instrument plutôt que d'application.

---

## 4. Typographie

Une seule fonte : **Inter**. `DM Mono` est chargée par le document mais n'apparaît sur aucun des
576 nœuds de texte relevés — les chiffres sont en Inter avec `tabular-nums` (18 occurrences).

| Corps | Interligne | Approche | Occurrences | Emploi observé |
|---|---|---|---|---|
| 10 px | 12 px | — | 22 | micro-libellés, unités |
| 11 px | 14 px | — | 32 | pastilles d'état, légendes |
| 12 px | 16 px | — | 7 | rare |
| **13 px** | **16 px** | **−0,12 px** | **126** | **le cran dominant** : cellules, libellés, valeurs |
| 14 px | 20 px | −0,20 px | 72 | intitulés de section, onglets secondaires |
| 16 px | 24 px | −0,30 px | 60 | onglets de fiche, titres de carte |
| 32 px | — | −1 px | 2 | chiffre héros |
| 24 px | — | — | 1 | rarissime |

**L'approche est négative partout, et d'autant plus serrée que le corps est grand** :
−0,12 à 13 px, −0,20 à 14, −0,30 à 16, −1 à 32. Rapportée au corps, c'est une progression régulière
(−0,9 % à −3,1 %). C'est la signature typographique la plus visible du site, et celle qui coûte le
moins cher à reprendre : Zenkuu n'a aujourd'hui aucune règle d'approche.

Graisses : **400** (348 relevés), **500** (182 — la graisse de travail), **600** (61, réservée aux
en-têtes et aux valeurs qui comptent), **700** (10, quasi absente). Il n'y a pas de gras franc sur
cette page : la hiérarchie se fait par la **couleur d'encre** — primaire, secondaire, tertiaire —
bien plus que par le poids.

---

## 5. Formes

| | Valeur | Occurrences |
|---|---|---|
| Rayon dominant | **4 px** | 91 |
| Rayon de carte, de panneau | **8 px** | 23 |
| Rayon intermédiaire | 6 px | 6 |
| Rayon large | 16 px | 3 (rarissime) |
| Pastille | pilule | 29 |
| Poids de filet | **1 px, et rien d'autre** | 32 |

Aucun rayon supérieur à 16 px sur toute la page, et 16 n'apparaît que trois fois. Le rayon de
**carte** est 8. Le rayon de **contrôle** est 4. Deux valeurs pour presque tout.

---

## 6. Rythme

Écarts de grille (`gap`) : **4 px** (101), 8 px (68), 2 px (33), 12 px (28), 16 px (20), 24 px (7).

Rembourrages : carte **16 px** · contrôle **6 px 8 px** · pastille **2 px 4 px** · rangée **0 12 px**.

Hauteurs de contrôle : **32 px** (45 relevés — la hauteur du site), 40 px, 24 px, 48 px (onglets).

Le rythme n'est pas une échelle de 8 : c'est une échelle de **4** dont 8 est le second cran. Un
écart de 2 px existe et sert (33 relevés, entre une pastille et son texte). C'est ce qui produit la
densité — trois valeurs de métrique tiennent dans la hauteur où une interface à échelle 8 en met deux.

---

## 7. Mouvement

Une seule transition sur toute la page :

```
transition-property: color, background-color, border-color, (outline, box-shadow)
transition-duration: 0.2s
transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1)
```

Rien ne se déplace, rien ne change de taille, rien ne s'estompe. **Seules les couleurs bougent**,
en 200 ms. Un survol de ligne est un changement de fond, un onglet actif est un changement de filet
et d'encre. C'est la raison pour laquelle la page reste calme sous le curseur alors qu'elle est
extrêmement dense.

Règles de survol relevées, par ordre de fréquence :

| Classe | Effet |
|---|---|
| `hover:bg-black-background` (27) | le fond monte d'un cran vers la surface élevée |
| `hover:text-black-primary` (26) | l'encre monte d'un cran vers l'encre primaire |
| `hover:bg-background-secondary` (22) | le fond **descend** vers le canvas — pour ce qui est posé *sur* un panneau |
| `hover:text-primary-hover` (22) | l'encre passe à l'accent — liens et actions |

---

## 8. Structure de la fiche

| Élément | Mesure |
|---|---|
| En-tête de site | 56 px, `sticky`, fond = **panneau** `#1C1719`, **sans filet bas** |
| Rangée d'onglets de fiche | 48 px, fond panneau, `border-b-2` transparent |
| Onglet actif | filet bas accent + encre accent, corps 16 px, graisse 400 |
| Onglet inactif | encre secondaire |
| Conteneur de page | 1600 px |
| Grille principale | `480 px` (rail gauche) + `1112 px` (centre), gouttière **8 px** |
| Carte du rail | 480 px, rayon 8, rembourrage 16, écart interne 16 |

L'en-tête au fond du **panneau** et non du canvas est un détail qui compte : la barre supérieure est
plus claire que la page, donc elle se détache sans porter ni filet ni ombre.

---

## 9. Ce qui n'a pas été relevé, et pourquoi

- **Le thème clair en situation.** Les valeurs de la colonne « Clair » sont obtenues en retirant la
  classe `dark` et en relisant les jetons. Elles sont exactes en tant que *jetons* ; le rendu réel
  d'une page claire de Tokenomist n'a pas été observé, le site s'ouvrant en sombre. Les rôles
  couleur-par-couleur sont donc sûrs, la composition claire ne l'est pas.
- **Les points de rupture.** Une seule largeur a été mesurée (2400 px). Les classes relevées
  montrent un unique préfixe responsive (`lg:pr-34`), ce qui suggère peu de points de rupture, mais
  ce n'est pas une mesure.
- **Les états de chargement.** La page était déjà chargée au moment du relevé ; aucun squelette
  n'a été observé.
- **La marque.** Logo, illustrations, textes, nom des onglets, contenu des cartes : rien de tout
  cela n'est relevé ici et rien n'en sera repris. Ce fichier ne contient que des mesures de forme.
