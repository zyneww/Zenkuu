# Relevé du langage visuel de Duolingo, et ce que ZENKUU en prend

**Relevé le 2026-09-07** sur `duolingo.com` (page publique), au navigateur, en lisant
les styles calculés. Ce document sert la tâche T2, dont la direction a été tranchée
avant toute implémentation.

---

## 0. La décision qui commande tout le reste

Le prompt de T2 posait un conflit : le site venait d'être aligné sur **CoinGecko**
(dense, sobre, financier) et T2 demandait **Duolingo** (ludique, arrondi, coloré). Les
deux directions sont opposées ; la question a été posée avant d'écrire une ligne.

**Réponse retenue — option 1 :**

> CoinGecko reste la direction dominante pour la densité de données (tableaux, pages de
> suivi, screener, charts). Duolingo n'inspire que des éléments ponctuels
> (micro-animations, boutons d'action principaux, empty states, onboarding,
> gamification éventuelle) **sans changer la structure dense**.

Ce document est donc un relevé **et** un tri : ce qui est repris, ce qui ne l'est pas,
et pourquoi. Un relevé sans ce tri serait une invitation à tout appliquer.

---

## 1. Ce qui a été mesuré

Toutes les valeurs ci-dessous sont des styles **calculés**, lus sur les éléments réels.
Rien n'est estimé à l'œil ni repris d'une capture.

### Typographie

| Rôle | Valeur mesurée |
|---|---|
| Fonte | `duolingo-sans`, repli `sans-serif` |
| Titre principal (`h1`) | 32 px · graisse **700** · interligne `normal` · sans interlettrage |
| Encre du titre | `rgb(75, 75, 75)` — **#4B4B4B**, un gris chaud, jamais du noir |
| Corps | 17 px |
| Intitulé de bouton | 15 px · graisse **700** · interlettrage **0,8 px** · **CAPITALES** |

Le fait notable n'est pas la taille mais la **graisse unique** : 700 partout, du titre
au bouton. Duolingo n'a pas de demi-gras. La hiérarchie se fait par la TAILLE et la
COULEUR, jamais par le poids.

### Couleurs

| Rôle | Valeur mesurée |
|---|---|
| Vert de marque | `rgb(88, 204, 2)` — **#58CC02** |
| Bleu d'action secondaire | `rgb(28, 176, 246)` — **#1CB0F6** |
| Encre de titre | **#4B4B4B** |
| Fond de page | `#ffffff` |

Deux couleurs saturées, et c'est tout sur cette page. La saturation ne vient pas du
NOMBRE de teintes mais de leur pureté : #58CC02 est un vert presque primaire.

### Le bouton — la pièce signature

Mesuré sur « GET STARTED » :

| Propriété | Valeur mesurée |
|---|---|
| Hauteur | **50 px** |
| Rayon | **12 px** |
| Rembourrage horizontal | 16 px |
| `border-bottom` | **3,33 px solid** |
| Face | `::before` en `inset: 0`, fond **#58CC02** |
| Fond du bouton lui-même | transparent |

**C'est cette structure qui produit le relief.** Le bouton ne porte pas d'ombre —
`box-shadow: none`, vérifié. Le relief vient d'un **bord inférieur de 3,33 px** qui
réserve la place d'une « tranche », et d'une face posée par-dessus en pseudo-élément.
Une ombre portée aurait donné un objet qui FLOTTE ; une tranche donne un objet POSÉ.

> ⚠️ **L'ÉTAT ENFONCÉ N'A PAS PU ÊTRE MESURÉ.** Leurs feuilles de style sont servies
> depuis un domaine tiers : `cssRules` est bloqué par la politique d'origine, et `:active`
> ne se force pas sans les outils de développement. Le geste d'enfoncement (translation
> vers le bas de la hauteur de la tranche) est une **convention** connue de ce motif, pas
> un relevé. Il est signalé comme tel partout où il apparaît.

---

## 2. Ce que ZENKUU reprend, et où

### Repris — les états vides non compacts

C'est la surface que l'option 1 nomme explicitement, et la seule du site où le langage
de Duolingo apporte quelque chose sans rien coûter à la densité.

`EmptyState` avait, dans sa forme pleine : une marque de 28 px, un titre de 14 px en
graisse 500, une description de 12 px. C'est la sobriété d'un tableau appliquée à un
écran qui n'a rien à montrer — or un état vide n'est pas une ligne de données, c'est un
message.

Trois valeurs changent, chacune tirée du relevé ci-dessus :

| | Avant | Après | Origine |
|---|---|---|---|
| Marque | 28 px | **44 px** | Duolingo mène par l'illustration, pas par le texte |
| Titre | 14 px / 500 | **18 px / 700** | leur graisse unique, leur hiérarchie par la taille |
| Respiration | `py-10 gap-2` | `py-14 gap-3` | leurs écrans vides sont aérés |

⚠️ **LA FORME `compact` N'EST PAS TOUCHÉE.** Elle est celle qui vit DANS les panneaux de
données — `NarrativesPanel` s'en sert, et vingt-trois autres appels aussi. C'est
exactement la frontière que l'option 1 trace : Duolingo s'arrête où la densité commence.

### Repris — rien d'autre, pour l'instant

### NON repris, et pourquoi

| Élément Duolingo | Raison du refus |
|---|---|
| **Le vert #58CC02** | Le site a une couleur de marque, désormais le turquoise #00dbbc de taostats. En ajouter une seconde saturée créerait deux marques. |
| **Les CAPITALES à 0,8 px d'interlettrage** | Sur des intitulés français longs (« Marchés traditionnels ») les capitales coûtent 15 à 20 % de largeur — dans une barre de navigation déjà à six entrées, c'est une ligne qui déborde. |
| **La graisse 700 partout** | Elle détruit la hiérarchie fine dont un tableau dense a besoin : symbole, nom, cours et variation ne peuvent pas tous crier. C'est le point exact où les deux directions s'excluent. |
| **Le bouton à tranche de 3,33 px** | Le bouton principal du site porte déjà un enfoncement MESURÉ (`active:scale-[0.98]`, relevé chez Backpack). Le remplacer échangerait une valeur mesurée contre une convention non mesurée — voir la réserve du §1. |
| **La mascotte et les illustrations** | Identité propriétaire. Le prompt l'interdit, et c'est la bonne règle. |
| **La gamification (séries, badges)** | Elle suppose un usage RÉPÉTÉ et une progression. Un site de cours d'actifs n'a ni l'un ni l'autre à récompenser : une série de consultations ne mesure rien pour le lecteur. |

---

## 3. Ce qui reste ouvert

- **Le bouton à tranche** mériterait d'exister comme variante à part si un parcours
  d'inscription ou d'onboarding est un jour construit : c'est là qu'un bouton
  « d'engagement » a un sens, et là que la tranche gagnerait contre l'échelle de 2 %.
  L'ajouter aujourd'hui serait une variante que rien n'emploie.
- **L'état enfoncé de Duolingo** reste à mesurer si le navigateur permet un jour de
  forcer `:active` sur leur page.
- **`refero.design`** a été exploré le 2026-09-08, et ce qui était écrit ici avant était
  faux : j'avais annoncé que « ses pages exigent un compte » sans les avoir ouvertes.
  Elles s'ouvrent. Voici ce qu'on y trouve réellement :

  | Galerie | Total | Visible sans compte |
  |---|---|---|
  | `search?site_id[id][]=147` (captures) | 235 pages | **12** |
  | `search/flows?site_id[id][]=147` (flux) | 21 flux | **3** |

  Le reste est derrière l'inscription (« 223 more pages hidden », « 18 more flows
  hidden »).

  ⚠️ **CE QUE CELA N'APPORTE PAS, ET C'EST LE POINT.** Les images visibles sont servies
  depuis `images.refero.design/screenshots/duolingo.com/**desktop**/…` — ce sont des
  captures du SITE PUBLIC, celui-là même qui a été mesuré en direct plus haut. Elles ne
  montrent pas l'application, et une capture ne donne de toute façon aucun style
  calculé : ni durée, ni courbe, ni valeur exacte de couleur.

  La conclusion tient donc toujours — le relevé au navigateur sur la source de première
  main était la bonne méthode — mais elle tient pour la bonne raison, pas pour celle
  que j'avais avancée.
