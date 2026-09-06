# Onglets stables, socle de style, conformité Component Gallery

Rapport de chantier. Ce qui est fait, ce qui ne l'est pas, et pourquoi dans les deux cas.

Vérifications transverses à chaque étape : **550 tests**, `tsc --noEmit` et `eslint`
propres, relevés au navigateur en thème clair et sombre.

---

## T1 — Le bandeau d'identité ne bouge plus

### Le défaut, mesuré avant correction

Chaque onglet d'une fiche était une **page** qui redessinait son propre en-tête, et les
trois n'étaient pas d'accord :

| Onglet | Ce qu'il rendait |
|---|---|
| Aperçu | fil d'Ariane complet, logo, nom, étiquettes, étoile de suivi, rangée d'onglets |
| Valeurs historiques | un fil écrit à la main, trois maillons, sans maillon d'accueil, puis un titre — **ni logo ni identité** |
| Métriques | idem, avec un logo de 40 px et un autre titre |

Changer d'onglet remplaçait donc la page entière, rangée d'onglets comprise.

### La correction

Un `layout.tsx` **par classe d'actif** (six fichiers) rend `AssetShell` : fil d'Ariane,
identité, étiquettes, actions, rangée d'onglets, puis `{children}`. Next.js ne re-rend
pas une mise en page quand on navigue entre ses enfants.

### ⚠️ Pourquoi pas `TabPanels` de Headless UI

La demande nommait deux voies — « layout partagé Next.js **ou** composant parent qui ne
se démonte jamais » — et suggérait `TabPanels` pour la seconde. **Les panneaux clients
auraient coûté les trois pages.** Un `TabGroup` tient ses panneaux dans un seul
document : les métriques, l'historique et le halving cesseraient d'être des adresses. On
perdrait le lien profond, l'indexation de trois pages par actif, et le catalogue de
métriques bâti la veille précisément pour donner **une** adresse canonique à ces mesures.
Le §9 du projet fait du référencement le premier moteur d'acquisition.

Le layout obtient le même résultat, et plus strictement : un `TabGroup` client re-rendrait
son `TabList` à chaque bascule ; un layout ne se re-rend pas du tout.

### La preuve

Un marqueur posé sur les **nœuds du DOM** avant navigation — un remontage produirait un
nœud neuf, sans marqueur.

| Onglet | Nœuds survivants | Fil d'Ariane | Rangée d'onglets | `h1` | Défilement |
|---|---|---|---|---|---|
| Aperçu → Métriques | `fil-1` + `onglets-1` | 101/370/16 | 240/370/37 | 1 | 0 → 0 |
| → Valeurs historiques | idem | 101/370/16 | 240/370/37 | 1 | 0 → 0 |
| → Halving | idem | 101/370/16 | 240/370/37 | 1 | 0 → 0 |
| → Aperçu | idem | 101/370/16 | 240/370/37 | 1 | 0 → 0 |

Depuis une page défilée à **490 px**, la bascule laisse le défilement à **490** : aucun
saut, ce que la demande exigeait explicitement. Vérifié aussi en thème sombre et sur
`/fr/actions/aapl` (deux onglets).

### Le comportement étroit

La protection des deux rangées d'onglets — `overflow-x-auto` + `whitespace-nowrap` — ne
dépend d'**aucune requête média** : contraindre la largeur de leur conteneur la teste
exactement comme le ferait un écran étroit. Mesuré à 375 px puis à 320 px :

| Largeur | Rangée de la fiche | Rangée de filtres |
|---|---|---|
| 375 px | **37 px de haut**, défile | **38 px de haut**, défile |
| 320 px | **37 px de haut**, défile | **38 px de haut**, défile |

Une seule hauteur dans les deux cas, donc aucun repli sur deux lignes — c'est le défaut
que les notes du code décrivent (« à 375 px, *Valeurs historiques* passait sur deux
lignes et le filet du bas ne soulignait plus que la seconde »).

⚠️ **La grille de cartes n'a pas pu être vérifiée en étroit.** Ses colonnes viennent de
`sm:` et `lg:`, qui lisent la fenêtre et non le conteneur ; or la fenêtre du navigateur
piloté a refusé le redimensionnement (2400 px effectifs après une demande à 390). Les
trois colonnes relevées sont donc celles du grand écran.

### Trois défauts trouvés en chemin

- **Deux `<h1>` par page.** Le bandeau porte désormais le seul `h1` — le nom de l'actif —
  et les panneaux passent en `h2`. C'est le plan réel du document, et la structure de la
  référence (« All metrics » sous un bandeau qui nomme le projet).
- **La rangée s'annonçait « navigation Aperçu ».** Son `aria-label` valait le nom d'un de
  ses propres onglets, sur les quatre pages. Remplacé par `Sections de la fiche`, déjà
  présent dans la table.
- **Le fil d'Ariane s'arrêtait au nom de l'actif** sur les quatre onglets, désignant comme
  page courante une page qu'on avait quittée. Il gagne un maillon d'onglet.

### L'onglet Métriques a sa propre structure

Une rangée de filtres portant chacun son décompte (`Toutes 19 · Fondamentaux 5 ·
Amplitude 4 · Offre 4 · Variations 6`), puis une grille de cartes — la forme de la
capture 3. **C'est ici que `Tabs` de Headless UI est le bon outil** : de vrais panneaux
d'un même document, sans navigation.

⚠️ **Les cartes ne portent pas de mini-courbe.** Trois de nos dix-neuf métriques
seulement ont une série réelle ; les seize autres n'existent qu'à l'instant présent chez
la source. Seize courbes plates pour la symétrie inventeraient une histoire que personne
n'a publiée.

---

## T2 — Le socle de style

Deux documents livrés : **`COINGECKO_STYLE_TOKENS.md`** (le contrat, extrait de ce qui est
appliqué aux fiches) et **`SITE_STYLE_AUDIT.md`** (le relevé, sept familles de pages).

Méthode : une sonde exécutée dans le navigateur compte, parmi les éléments **réellement
peints**, les rayons, les ombres, les fonds, les filets et la géométrie de chaque bouton.
Elle mesure ce que le lecteur voit, pas ce que les classes annoncent — et les deux
divergent.

### Ce qui était déjà acquis

- Le filet est unifié à **1,25 px `#eff2f5`** sur les sept pages, sans exception.
- Les ombres ont disparu du flux partout.
- `/crypto` est au socle : 108 rayons de contrôle, quatorze aplats sur près de trois
  mille nœuds.

### Ce qui a été corrigé

| Écart | Portée |
|---|---|
| `StatsBarCollapse` : contrôle de 32 px en `rounded-card`, corps hérité à 16 px | accueil + **six classements** |
| Convertisseur : quatre commandes en pastille, deux sans classe de taille — **aucun rayon de contrôle sur la page** | `/convertisseur` |
| 14 rayons hors barème (`rounded-[14px]`, `[6px]`, `-lg`, `-2xl`) | composants partagés : cartes de statistique, onglets de lien, deux modales, état vide, mégamenu, bouton de suppression |
| `shadow-lg` de shadcn, qui **ne résout aucune valeur** — les deux modales n'avaient donc pas d'ombre | `dialog`, `alert-dialog` |
| `bg-[#14151b]` : la seule couleur du site sans jeton | `TreemapFigure` |
| `h1` à 36 px quand les 38 autres titres sont à 24 | `/aide` |

Après correction, la sonde rejouée donne : convertisseur à **quatre** rayons de contrôle
et tous ses boutons en `r8 14px` ; accueil sans `h32 r12 16px`.

### ⚠️ Deux fausses alertes, écartées après lecture du code

- `navigation-menu.tsx` porte `rounded-md` (6 px) : relevé **délibéré**, documenté sur
  place — « c'est le rayon de LEUR panneau de navigation ».
- Les 149 aplats de `/categories` sont ses **vignettes d'actif**, pas un décor.

Une sonde qui compte des rayons ne sait pas cela ; les fichiers, si.

### Ce qui reste, avec le motif

- **Deux densités de tableau.** `/crypto` sert `pad 8/4`, `/categories` et `/screener`
  `pad 10/12`. Les colonnes des seconds sont dimensionnées pour leur densité : le
  changement est large et demande un relevé de débordement après coup.
- **Deux `SegmentedControl`** de même nom, l'un dans `ui/`, l'autre dans `settings/`.
- **L'accueil est deux crans plus petit** — 11 px sur quarante nœuds contre 14 ailleurs.
  Écart d'emploi, pas de jeton ; le corriger rallonge la page. Arbitrage de produit.
- **Familles non sondées** : places de cotation, carte thermique, graphiques globaux,
  analytics, changelog.

---

## T3 — Component Gallery : composant par composant

Component Gallery documente, pour chaque motif, le markup ARIA et le pilotage clavier
attendus. Le tableau dit ce qui a été **vérifié sur le rendu** et ce qui ne l'a pas été.

| Motif | Statut | Ce qui a été constaté |
|---|---|---|
| **Tabs** (panneau) | **créé, conforme** | `MetricCatalogue` : `role="tablist"`, 5 onglets, `aria-selected` exact, tabindex tournant (0 / −1), `aria-controls` sur chacun, `aria-labelledby` sur chaque panneau, **lien croisé refermé**. Clavier essayé touche par touche : → → `End` `Home` ← déplacent focus, sélection ET contenu (19 → 5 → 4 → 6 → 19 → 6 cartes), avec enroulement |
| **Tabs** (navigation) | **corrigé** | `AssetTabs` reste `<nav>` + liens + `aria-current="page"` — le markup correct pour des onglets qui sont des adresses. `aria-label` corrigé |
| **Breadcrumbs** | **corrigé** | quatre maillons, un seul `aria-current` par `nav`, dernier maillon en `BreadcrumbPage` |
| **Progress bar** | **conforme** | 2 sur la fiche, `aria-valuenow` et `aria-valuemax` présents sur les deux |
| **Slider** | **conforme** | 12 sur `/screener`, tous natifs `input[type=range]`, tous étiquetés, `aria-valuetext` renseigné |
| **Button group** | **conforme** | le sélecteur de thème est un `role="radiogroup"` nommé « Thème » portant 3 `role="radio"` |
| **Button** | **corrigé** | aucun bouton visible sans nom accessible sur les cinq pages sondées ; géométrie ramenée au socle (voir T2) |
| **Modal** | **corrigé (style), non vérifié (comportement)** | `rounded-card` + `shadow-overlay`. ⚠️ **Le comportement n'a pas pu être mesuré** : ni clic réel, ni clic synthétique, ni `Entrée` n'ouvrent les surfaces Radix sous automatisation — `aria-expanded` reste `false`. Le dépôt consignait déjà cette limite. Le piège de focus, `Échap` et la restitution du focus viennent de Radix Dialog par construction, mais **je ne les ai pas constatés** |
| **Dropdown menu** | **corrigé (style), non vérifié** | même limite. `aria-haspopup="menu"` présent sur le déclencheur |
| **Empty state** | **corrigé** | conteneur en `rounded-card`, vignette en `rounded-control` |
| **Card** | **corrigé** | `rounded-card` partout, filet plutôt qu'ombre |
| **Badge / pill** | **conforme** | la pastille reste réservée aux étiquettes et vignettes — les cinq de `/aide` sont des mots-clés, pas des commandes |
| **Pagination** | **conforme** | `rounded-control` sur toutes les cases (chantier précédent) |
| **Carousel** | **noté** | puces de 20 × 20 px, pas de **24 px centre à centre** : la dérogation d'espacement de WCAG 2.2 §2.5.8 est tenue — deux disques de 24 px qui se touchent sans se recouvrir. Limite basse, non corrigée |
| **Fieldset** | **conforme** | aucun champ sans étiquette sur les pages sondées |
| **List** | **conforme** | aucun lien visible sans nom accessible |
| **Footer** | **conforme** | hiérarchie de titres correcte, `nav` nommés |
| **Accordion** | **non applicable en l'état** | aucun `aria-expanded` de repli sur les pages sondées ; les seuls relevés sont les déclencheurs de mégamenu |
| **Toggle / switch** | **non applicable** | `role="switch"` absent du site : les réglages binaires sont des groupes de radios |
| **Select** | **conforme** | `NativeSelect` conserve le `<select>` natif — donc le sélecteur du système en mobilité, le clavier et la recherche par frappe |
| **Spinner** | **non vérifié** | présent (`components/ui/spinner`), pas isolé pendant ce chantier |
| **Toast** | **non vérifié** | `sonner`, non déclenché sous automatisation |
| **Alert**, **Checkbox**, **Datepicker**, **Progress indicator**, **Content slider**, **Pull quote**, **Rating** | **hors périmètre** | soit absents du site, soit non atteints par les pages sondées |

### ⚠️ Un faux positif de ma propre sonde, à ne pas corriger

Elle signalait « `aria-expanded` sans `aria-controls` » sur les six déclencheurs de
mégamenu. Le motif **Disclosure Navigation** de l'APG rend `aria-controls` **facultatif**,
et Radix ne l'émet pas. Aucune correction n'était due.

---

## Ce que ce chantier n'a pas fait

- **Le comportement des surfaces superposées** (modale, mégamenu, sélecteur) n'a pas pu
  être constaté : elles ne s'ouvrent sous aucune automatisation disponible ici. C'est la
  seule lacune de vérification du rapport, et elle est structurelle, pas un oubli.
- **T2 n'est pas terminé** : cinq familles de pages n'ont pas été sondées, et les trois
  écarts de fond (densité de tableau, doublon de `SegmentedControl`, cran de l'accueil)
  restent ouverts avec leur motif écrit.
- **Aucun contrôle d'accessibilité automatisé** (axe-core, Lighthouse) n'a été exécuté :
  aucun n'est installé dans le dépôt. Tout ce qui figure au tableau vient d'une sonde
  écrite pour ce chantier et rejouée page par page.
