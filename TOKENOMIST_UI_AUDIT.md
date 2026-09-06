# TOKENOMIST_UI_AUDIT.md

Audit des **motifs d'interface** de Tokenomist, relevé le 2026-09-06 sur `https://tokenomist.ai/bitcoin`
(899 éléments visibles inspectés, valeurs calculées lues dans le navigateur).

Les **valeurs** — couleurs, corps, rayons, écarts — vivent dans `TOKENOMIST_DESIGN_TOKENS.md`.
Ce fichier-ci décrit les **assemblages** : de quoi est fait un panneau, comment une barre d'outils
est organisée, ce qui distingue un onglet actif. C'est ce qui se transpose ; la marque, les textes,
les données et les couleurs de Tokenomist ne se transposent pas.

---

## 1. Le principe qui explique tout le reste

Tokenomist est **plat, cerné et dense**. Trois décisions, et elles se tiennent :

1. **Aucune ombre.** Une seule ombre réelle sur toute la page. La profondeur vient de la position
   dans la rampe de gris : un panneau est plus clair que le fond, un bloc encastré est plus sombre
   que le panneau qui le contient.
2. **Un filet d'un pixel, une seule couleur.** Ce filet porte exactement la teinte du cran de rampe
   au-dessus du panneau — et c'est aussi la couleur du survol. Cerner et élever sont le même geste.
3. **Une échelle de 4.** Écart dominant 4 px, second cran 8 px, rembourrage de carte 16 px,
   hauteur de contrôle 32 px, rangée de métrique 20 px de haut. Trois valeurs tiennent là où une
   interface à échelle 8 en met deux.

Ce qui en découle, et qu'on ne verra nulle part sur ce site : pas de carte flottante, pas de
dégradé décoratif, pas de rayon arrondi généreux, pas de bouton haut, pas d'aplat coloré tenant
lieu de fond de section.

---

## 2. Les exceptions, et pourquoi ce sont des exceptions

**Deux dégradés sur toute la page**, et aucun n'est décoratif :

| Où | Dégradé | Ce qu'il signifie |
|---|---|---|
| Carte *Insight Summary* | `linear-gradient(238.92deg, rgba(182,95,239,.2), rgba(230,152,95,.2), rgba(229,53,109,.2))` | contenu **généré**, par opposition aux chiffres mesurés du reste de la page |
| Bandeau d'alerte, 246×32 | `linear-gradient(rgba(255,178,71,.1), transparent)` | promotion temporaire |

Le premier est le motif intéressant : le seul bloc de la page dont le contenu est *écrit* et non
*mesuré* est aussi le seul qui porte une couleur. Le dégradé n'est pas là pour faire joli, il est
là pour dire « ceci n'est pas une donnée ». Un site sérieux peut donc s'autoriser un dégradé, à
condition qu'il porte une information.

---

## 3. Anatomie du panneau

```
┌─ rayon 8 px · fond panneau · rembourrage 16 px · écart interne 16 px ─┐
│  ┌ rangée d'en-tête, 24 px de haut ────────────────────────────────┐  │
│  │  [icône 20] Titre                        Action à droite        │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│  ┌ corps ──────────────────────────────────────────────────────────┐  │
│  │  rangée de 18–20 px : libellé (360 px) ······· valeur (86 px)   │  │
│  │  rangée de 18–20 px : libellé ················ valeur           │  │
│  └─────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────┘
```

Mesures relevées sur la carte *Fundamentals* (480 × 257) :

- rangée d'en-tête **24 px**, titre en `h5`, action à droite sur la même ligne de base ;
- rangées de métrique **18 à 20 px** de haut — deux colonnes, libellé à gauche cadré à 360 px,
  valeur à droite cadrée à 86 px et alignée à droite ;
- le libellé porte un **soulignement pointillé** quand une infobulle existe ; c'est le seul
  affordance d'aide de la page, et il est systématique ;
- l'unité (`USD`) est posée **après** la valeur, en encre tertiaire, hors de la colonne de valeur —
  ce qui garde les chiffres alignés entre eux quelle que soit la longueur de l'unité ;
- une pastille de qualification (`Tokenomist Metric`) se pose **entre** le libellé et sa valeur, en
  pilule, accent doux à 13 % sur encre d'accent.

L'action d'en-tête est une **pilule** : `rounded-full`, rembourrage `4px 12px`, hauteur 30 px, fond
= panneau, filet à l'accent dilué à 30 %, survol = accent à 10 %. C'est le seul bouton visible du
rail gauche : tout le reste est du texte et des chiffres.

---

## 4. Le contrôle segmenté

Le motif le plus employé du site — barres de période, bascules de mode, sélecteurs d'unité.

```
piste :  h-8 (32 px) · rayon 6 px · rembourrage 2 px · écart 2 px · fond = CANVAS
         └─ posée sur un panneau, la piste est donc plus SOMBRE que ce qui l'entoure
pastille active : remonte au fond PANNEAU, encre primaire
pastille inactive : fond transparent, encre secondaire → survol : encre primaire
```

L'inversion est le point : la piste est creusée (elle prend la couleur du fond de page), et
l'élément actif **remonte** au niveau du panneau. Aucune ombre, aucun filet, aucun aplat coloré :
l'état actif se lit parce que la pastille est plus claire que sa rainure.

Deux tailles observées : 32 px (dominante) et 28 px pour les contrôles secondaires.

---

## 5. Les onglets de fiche

```
rangée : 48 px de haut · fond panneau · pleine largeur
onglet : h-12 · border-b-2 transparent · px-px · corps 16 px · graisse 400
   inactif : encre secondaire
   actif   : filet bas à l'accent + encre à l'accent
   désactivé : encre désactivée
```

Le filet bas fait **2 px** — c'est le seul endroit de la page où un filet n'est pas d'un pixel, et
c'est justifié : il porte l'état sélectionné, pas une séparation. Chaque onglet porte une icône de
16 px à gauche de son intitulé.

Les onglets sont posés sur le **panneau**, pas sur le canvas : la rangée fait donc corps avec le
contenu qu'elle commande, alors même qu'aucun filet ne la relie à lui.

---

## 6. La zone analytique — barre d'outils du graphique

Deux rangées, et la séparation entre elles est fonctionnelle :

**Rangée 1 — quelles séries sont affichées**

```
‹  [● Release Schedule ✕] [● BTC/USD ✕]  ›        + Add Metric   ⬇ .csv   </> API & CLI
```

- chaque série est une **pastille amovible** portant sa pastille de couleur et sa croix ;
- des chevrons `‹ ›` encadrent la liste quand elle déborde — pas de repli sur deux lignes ;
- à droite, trois actions de sortie de données, séparées de la liste et alignées à droite.

**Rangée 2 — comment elles sont affichées**

```
[◪ ▥]   [7D 1M 1Y All]   [D👑 W👑 M]   ⚠ 1 Disclaimer          ⛶  📷
```

- deux bascules de type de tracé, en contrôle segmenté ;
- une plage temporelle, en contrôle segmenté ;
- une granularité, en contrôle segmenté, dont deux options portent une couronne (offre payante) ;
- une pastille d'avertissement en fond d'alerte à 10 %, cliquable ;
- à droite, plein écran et capture.

**Ce qu'il faut retenir de l'organisation** : ce qui *choisit la donnée* est à gauche, ce qui
*sort la donnée* est à droite, et les deux rangées sont séparées par un filet d'un pixel. Un
utilisateur n'a jamais à chercher dans quelle rangée se trouve un réglage.

---

## 7. La zone sous le graphique — brosse et légende

C'est la zone que la capture 4 isole. Relevée dans cet ordre, de haut en bas :

1. **Brosse de zoom** — une piste horizontale fine sur toute la largeur, deux poignées rondes, la
   plage retenue teintée d'un aplat sombre légèrement coloré, le reste au fond de la piste. Elle
   n'a ni graduation ni étiquette : elle sert au geste, la lecture se fait sur le graphique.
2. Un **filet d'un pixel** sépare la brosse de ce qui suit.
3. **`Metrics`** — intitulé en encre tertiaire, corps 11–12 px.
4. La liste des séries de la métrique principale : **pastille ronde de couleur + nom**, une par ligne.
5. **`Release Schedule`** — second intitulé de groupe, même traitement que `Metrics`.
6. Les séries de ce second groupe, même traitement.
7. À droite, sur la ligne de `Metrics` : **« Want to integrate this data? *Explore our API* »** —
   phrase en encre tertiaire, lien souligné en encre primaire.
8. Tout en bas, en encre la plus faible : **« Chart time is displayed in UTC+0 »**.

Le principe : la zone ne répète pas le graphique, elle le **documente** — quelles séries, de quel
groupe, dans quel fuseau, et par quelle porte y accéder en machine. Beaucoup de blanc, aucune boîte
vide : la hauteur est occupée par de l'information de second plan, pas par du remplissage.

---

## 8. La table d'allocations

- en-tête de colonne en encre tertiaire, corps 11–13 px, **sans fond ni filet** ;
- rangées séparées par rien du tout — c'est l'alignement des colonnes qui structure ;
- première colonne portant un **interrupteur** par ligne (afficher/masquer la série) et une pastille
  de qualification (`Dynamic`) ;
- colonnes numériques **alignées à droite**, en `tabular-nums` ;
- un chevron `›` en tête de colonne pour déplier ;
- au-dessus de la table, une rangée d'actions : `View Data Source`, `Tokenomics`, `.csv`, `API & CLI`,
  chacune en bouton fantôme de 32 px avec son icône ;
- à gauche de la table, le **beignet** de répartition occupe une colonne fixe d'environ 248 px, la
  table prenant les 862 px restants.

Le beignet n'a pas de légende propre : la table **est** sa légende. C'est un choix qui économise une
colonne entière et qui n'est possible que parce que les deux sont côte à côte.

---

## 9. En-tête d'actif

Une seule rangée, très dense, quatre groupes de gauche à droite :

1. **Identité** — logo 40 px, nom en 32 px, ticker en pastille grise, puis sous le nom :
   `Rank #1` · `Layer 1` · `Blockchain` · `View all` (pastilles, la dernière en accent).
2. **Cours** — libellé `Price` en encre tertiaire au-dessus, valeur en dessous.
3. **Une bande de repères** — `Burn`, `Buyback`, `Dynamic`, `Claim`, `Raise Amount`, chacun avec son
   libellé au-dessus et sa valeur en dessous. **Les repères sans donnée affichent `--`**, ils ne
   disparaissent pas.
4. **Actions** — icône de signalement, `☆ Watchlist`, `🔔 Create Alert` (le seul bouton plein de la page).

Le point à retenir : **`--` plutôt que rien**. Une colonne vide reste une colonne, ce qui garde la
bande stable d'un actif à l'autre — Bitcoin n'a ni burn ni buyback, et la bande a exactement la
même forme que pour un jeton qui en a. C'est l'inverse du réflexe « masquer ce qui est vide », et
c'est ce qui empêche l'en-tête de changer de géométrie à chaque navigation.

À droite de la rangée d'onglets, en encre tertiaire : `Version 1` / `Updated: 31 Aug 2026`.

---

## 10. Mouvement et états

Une seule transition sur tout le site : `color, background-color, border-color` en **200 ms**,
`cubic-bezier(0.4, 0, 0.2, 1)`. Rien ne se déplace, rien ne change d'échelle, rien ne s'estompe.

| État | Traitement |
|---|---|
| Survol d'une ligne, d'un bouton fantôme | le fond monte au cran « surface élevée » (= la couleur du filet) |
| Survol d'un élément posé *sur* un panneau | le fond **descend** au canvas |
| Survol d'un lien ou d'une action | l'encre passe à l'accent |
| Survol d'un texte secondaire | l'encre monte à l'encre primaire |
| Actif (onglet) | filet bas 2 px à l'accent + encre à l'accent |
| Actif (segmenté) | la pastille remonte au fond panneau |
| Désactivé | encre désactivée, sans changement de fond |

---

## 11. Ce qui se reprend, ce qui s'adapte, ce qui s'exclut

### Se reprend tel quel — ce sont des motifs, pas de la marque

- L'absence d'ombres ; la profondeur par la rampe et le filet d'un pixel.
- Le filet et le survol partageant une même valeur.
- L'échelle de 4, le rembourrage de carte à 16, la hauteur de contrôle à 32.
- Les rayons 4 (contrôle) et 8 (carte), et rien au-dessus de 16.
- L'approche typographique négative, croissante avec le corps.
- La hiérarchie par **couleur d'encre** (trois niveaux) plutôt que par graisse.
- Le contrôle segmenté à piste creusée.
- L'onglet à filet bas de 2 px.
- La transition unique de 200 ms sur les seules couleurs.
- Les fonds doux à ~10 % d'alpha de leur propre teinte.
- L'organisation de la barre d'outils : choisir à gauche, sortir à droite.
- La zone sous le graphique qui **documente** plutôt qu'elle ne répète.
- Le `--` pour un repère sans valeur, plutôt que la disparition du repère.

### S'adapte au contexte Zenkuu

- **L'accent.** Tokenomist est rose (`#ED5A8F` / `#C51052`). Zenkuu garde son bleu. Le rôle est
  identique — onglet actif, lien, action, série de données neutre ou positive — la teinte non.
- **La rampe.** Celle de Tokenomist est teintée magenta pour s'accorder à son rose. Zenkuu devra
  teinter la sienne vers son propre accent, ou rester neutre : le principe (une rampe unique dont
  les deux thèmes puisent chacun par un bout) se reprend, pas les douze valeurs.
- **La colonne d'actualités.** Tokenomist n'en a pas. Le motif de carte, la densité et les états
  s'y appliquent, mais sa composition est propre à Zenkuu.
- **Les onglets de fiche.** N'afficher que ceux dont le contenu existe réellement côté Zenkuu.
- **Le vert de hausse.** `#7CFA7C` est un vert fluorescent qui ne tient pas sur un fond clair.
  Zenkuu a déjà un couple hausse/baisse mesuré ; seul le *rôle* et la règle du fond doux à 10 % se
  reprennent.

### Ne se reprend pas — et ce n'est pas négociable

- Le nom, le logo, la typographie de marque, les illustrations, les pictogrammes propres.
- Les intitulés (`Insight Summary`, `Tokenomist Metric`, `Explore our API`…), les textes, la
  formulation des avertissements.
- Le rose de marque comme accent.
- Les données : allocations, calendriers de déblocage, tokenomics, `Version 1`, sources.
- Les offres payantes et leurs marqueurs (les couronnes sur les granularités).
- Le dégradé exact de la carte générée — le *principe* (marquer le contenu généré par une couleur)
  se reprend, la formule à trois arrêts non.

---

## 12. Limites de cet audit

- **Une seule largeur mesurée** (2400 px CSS). Le comportement responsive n'a pas été observé ;
  les classes relevées ne montrent qu'un seul préfixe de point de rupture (`lg:`), ce qui suggère
  une grille peu adaptative, mais ce n'est pas une mesure.
- **Le thème clair n'a pas été observé en situation.** Ses jetons sont exacts — relevés en retirant
  la classe `dark` — mais aucune page claire n'a été rendue. La composition claire de Tokenomist
  reste donc inconnue ; celle de Zenkuu sera une création, pas une copie.
- **Aucun état de chargement observé.** La page était chargée au moment du relevé.
- **Une seule page inspectée en profondeur** (`/bitcoin`). Les variantes de mise en page des autres
  familles de pages de Tokenomist n'ont pas été relevées.
