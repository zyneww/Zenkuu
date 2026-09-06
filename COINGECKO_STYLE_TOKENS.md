# Le socle de style CoinGecko, tel qu'il est appliqué aux fiches d'actif

Ce document n'invente rien. Il **relève** ce qui a été mesuré sur `coingecko.com` puis
appliqué aux pages de suivi de ZENKUU, et en fait le contrat que les autres familles de
pages doivent tenir. Les valeurs sont celles qui sortent réellement du navigateur, pas
celles que le code déclare — voir `SITE_STYLE_AUDIT.md` pour la différence, qui n'est pas
toujours nulle.

Relevés effectués sur `localhost:3000/fr/crypto/bitcoin` et ses onglets, thème clair,
fenêtre 1568 px, le 2026-09-07.

---

## 1. Les couleurs

Elles vivent déjà dans `app/globals.css`, et ce tableau ne fait que nommer celles qui
décident de l'apparence d'une page. Le thème clair a été aligné sur CoinGecko en
échantillonnant les pixels PEINTS de sa page d'accueil — elle ne déclare aucune variable
`:root`, il n'y avait donc rien à lire.

| Jeton | Clair | Rôle |
|---|---|---|
| `--color-canvas` | `#ffffff` | le fond de la page, **blanc pur** |
| `--color-surface-muted` | `#eff2f5` | le seul gris de remplissage : pastilles, survols, cellules d'appui |
| `--color-border-subtle` | `#eff2f5` | **le filet vaut le gris de remplissage** — c'est ce qui rend les séparations si discrètes |
| `--color-ink` | `#0f172a` | encre pleine : titres, valeurs qui comptent |
| `--color-ink-secondary` | `#334155` | encre de repère : les valeurs du rail |
| `--color-ink-muted` | `#64748b` | libellés, unités, texte d'accompagnement |
| `--color-up` / `--color-down` | `#00a83e` / `#ff3a33` | hausse / baisse |

⚠️ **Le filet et le fond gris sont la même couleur.** Ce n'est pas une économie de
jetons : chez la référence, une bordure ne se distingue jamais d'un aplat, ce qui fait
que rien ne « boîte ». Un filet plus sombre que le gris d'appui redessinerait des cadres
que la référence n'a pas.

---

## 2. Les rayons — quatre crans, pas un de plus

| Jeton | Valeur | Ce qui le porte |
|---|---|---|
| `--radius-card` | `12px` | une CARTE : un objet posé sur la page, avec un début et une fin |
| `--radius-control` | `8px` | un CONTRÔLE : bouton, champ, pastille de filtre, onglet de filtre |
| `--radius-pill` | `9999px` | une VIGNETTE ronde et une étiquette de catégorie, rien d'autre |
| `--radius-dense` | `0px` | une surface qu'on parcourt et dont les rangées s'aboutent (tableaux) |

**La règle de partage** : ce qu'on CLIQUE porte 8 px ; ce qu'on LIT porte 12 px ; ce qui
est ROND est rond. Un bouton à 12 px se lit comme une carte cliquable, ce qui est le
défaut le plus fréquent trouvé par l'audit.

⚠️ **Aucune valeur arbitraire.** `rounded-[14px]`, `rounded-lg`, `rounded-md`,
`rounded-2xl` n'appartiennent pas au barème : ce sont des restes de shadcn/ui, dont
l'échelle par défaut ne correspond à rien ici.

---

## 3. Les ombres — il n'y en a pas

Relevé sur la fiche : **une seule** déclaration d'ombre non nulle dans tout le corps de
la page, et c'est un anneau de focus.

`--shadow-overlay` existe et ne sert qu'aux surfaces qui FLOTTENT réellement au-dessus du
document : menus, popovers, fenêtres modales. Une carte posée dans le flux ne porte pas
d'ombre ; c'est son filet à `--color-border-subtle` qui la délimite.

---

## 4. Les fonds — « no background » est une règle, pas une préférence

Relevé sur la fiche : **cinq** éléments peints dans tout le corps de la page (trois gris
d'appui, deux blancs). Tout le reste est transparent sur le canevas.

Une famille de pages qui compte trente aplats a gardé l'ancien style : la carte n'est pas
le contenant par défaut, elle est l'exception qu'on justifie.

---

## 5. La typographie — 14 px est le cran de densité

| Jeton | Taille | Emploi |
|---|---|---|
| `--text-2xs` | 11 px | pastilles d'état, mentions légales |
| `--text-xs` | 13 px | colonnes secondaires de tableau, texte d'accompagnement |
| `--text-sm` | **14 px** | **le cran dominant** : libellés, valeurs, boutons, onglets |
| `--text-base` | 16 px | paragraphes de lecture — **jamais un contrôle** |
| `--text-lg` | 18 px | titres de carte |
| `--text-2xl` | 28 px | agrégat de carte |
| `--text-4xl` | 44 px | le cours en tête de fiche |

Graisses relevées sur la fiche, par ordre de fréquence : `14/600` (valeurs et onglets),
`13/500` (libellés de rail), `14/500`, `13/400`.

⚠️ **Un contrôle ne porte jamais 16 px.** C'est le cran de LECTURE. Un bouton sans classe
de taille hérite du 16 px du corps de page : l'audit a trouvé plusieurs contrôles dans ce
cas, et ils sortent plus gros que le texte qu'ils commandent.

---

## 6. Les contrôles — la géométrie relevée

| Ce qu'on mesure | Valeur |
|---|---|
| Hauteur d'un bouton ordinaire | **32 px** (`h-8`) |
| Hauteur d'un onglet | **37 px** (`px-4 py-2` sur 14/20) |
| Rayon | `rounded-control` (8 px) |
| Corps / graisse | 14 px / 500 ou 600 |
| Rembourrage horizontal | 12 px (`px-3`) pour un bouton, 16 px (`px-4`) pour un onglet |
| Transition | `duration-150`, sur la couleur seulement |

Un bouton icône est **carré** : `h-8 w-8`, rayon `rounded-control`, jamais `rounded-card`.

---

## 7. Les onglets

Deux formes, et elles ne se confondent pas.

**Onglets de NAVIGATION** (chaque onglet est une adresse) : `<nav>` + liens,
`aria-current="page"` sur l'actif, encre pleine sur l'actif et encre atténuée ailleurs,
un trait unique de 2 px qui GLISSE d'un onglet à l'autre, filet de rangée en dessous.
Voir `AssetTabs`.

**Onglets de PANNEAU** (le contenu est dans la même page) : `role="tablist"` de Headless
UI, `aria-selected`, `aria-controls`, flèches + `Home`/`End`, trait sous l'onglet actif.
Voir `MetricCatalogue`.

⚠️ Ne jamais poser `role="tab"` sur un lien : cela promet un pilotage clavier qui
n'existe pas et masque le fait que l'élément navigue.

---

## 8. Les séparations

Un filet de `1.25px` en `--color-border-subtle`, **entre** deux lignes et non sous
chacune (`last:border-0`). C'est la géométrie relevée sur la colonne de repères de la
fiche Bitcoin de CoinGecko.

Les groupes ne portent pas de carte : ils sont séparés par du blanc (`space-y-2` entre
sections d'un rail) et par un titre en petites capitales atténuées.

---

## 9. Les tableaux

| Ce qu'on mesure | Valeur retenue |
|---|---|
| `th` | 12 px / 600, rembourrage `8px 4px` |
| `td` | 14 px / 400, rembourrage `8px 4px` |
| Filet | sous chaque ligne, `--color-border-subtle` |
| Rayon | aucun (`--radius-dense`) : les rangées s'aboutent |

C'est la densité de `/fr/crypto`, le tableau de marché de référence. L'audit a trouvé une
seconde densité (`10px 12px`, `td` à 13 px) sur d'autres tableaux du site.

---

## 10. Ce que ce socle ne couvre pas

- **Les couleurs de données** (`--color-data-*`, `--chart-*`) : elles obéissent à la
  lisibilité d'une série, pas à l'identité de la page.
- **La carte thermique et les treemaps** : leurs tuiles sont des données peintes, et le
  nombre d'aplats y est normal.
- **Les vignettes d'actif** : rondes par nature, hors du barème des rayons.
