# TOKENOMIST_REDESIGN_REPORT.md

Rapport de la refonte du langage visuel de Zenkuu vers la densité et la tenue de Tokenomist.

**Point de retour** : branche `avant-ui/ux-tokenomist`, commit `ffd1f18`, poussée sur `origin`.
`git checkout avant-ui/ux-tokenomist` rend l'état d'avant, y compris le travail qui n'était pas
encore commité au moment de la sauvegarde.

Six commits, 17 fichiers, +1 463 / −136 lignes.

| Commit | Objet |
|---|---|
| `867a616` | La couche de jetons : trois plans, l'approche typographique, les rayons |
| `98a130e` | Le rail reprend ses cartes, le graphique entre dans un panneau, la légende ferme le bloc |
| `6123ea7` | La rangée d'onglets ouvre deux routes que rien ne desservait |
| `7b26f0d` | L'identité tombait à zéro pixel sur téléphone, les onglets débordaient |
| `db3e6aa` | Quatre pastilles actives portaient une ombre que le plan porte désormais seul |
| `d0e8f9f` | Dix-huit jetons déclarés que rien ne lisait |

---

## 1. Ce qui a été mesuré avant d'écrire une ligne

Relevé au navigateur sur `https://tokenomist.ai/bitcoin`, le 2026-09-06, fenêtre de 2 400 px,
**899 éléments visibles inspectés**, valeurs calculées lues dans le document. Thème clair obtenu en
retirant la classe `dark` et en relisant les jetons.

Deux fichiers portent ce relevé : `TOKENOMIST_DESIGN_TOKENS.md` (les valeurs) et
`TOKENOMIST_UI_AUDIT.md` (les motifs). `ZENKUU_REDESIGN_PLAN.md` en fait la traduction vers Zenkuu.

Le codebase a été inventorié en parallèle par cinq passes de lecture — jetons, fiche d'actif,
graphiques, primitives partagées, familles de pages — soit 311 appels d'outils et 1,3 M de jetons
de lecture. C'est cet inventaire qui a fourni les contraintes dures de la section 4.

---

## 2. Les cinq écarts mesurés, et ce qui les a refermés

| # | Écart constaté | Correction |
|---|---|---|
| 1 | **`--color-panel` valait exactement `--color-canvas`**, dans les deux thèmes | Trois plans distincts, écart de +11/+11/+12 en sombre et +7/+7/+6 en clair |
| 2 | **Aucune approche typographique** : 1 193 nœuds de texte sur 1 195 en `normal` | Approche négative sur les neuf crans, de −0,05 px à −1,4 px |
| 3 | **Le filet et le survol portaient deux valeurs** en sombre | Une seule, `#26282f` / `#e6e7ed` |
| 4 | **L'interligne de 13 px valait 18** au lieu de 16 | 13/16, le couple dominant de la référence |
| 5 | **Le rayon de carte était 16 px** ; la référence n'y va que trois fois sur toute sa page | 8 px pour les cartes, 6 pour les contrôles, 4 pour l'encastré |

Le premier expliquait à lui seul l'impression de « page plate ». Il avait une cause historique
honorable — CoinGecko, la référence précédente, est effectivement plat — et une conséquence que le
nom du jeton masquait : la formule de carte réellement écrite dans le dépôt est
`bg-surface rounded-card` (89 occurrences), pas `bg-panel` (14). Les deux noms désignaient deux
choses différentes, dont l'une était invisible. Ils désignent maintenant le même plan.

**Le canvas n'a bougé dans aucun des deux thèmes**, et c'était une contrainte et non un choix : il
porte le plancher d'écart assumé de la marque dans `palette.test.ts` (1,52:1), et l'assombrir aurait
fait tomber ce ratio. La carte monte, la page reste.

---

## 3. Pages et composants refondus

### La fiche d'actif — les quatre zones de la capture 3

| Zone | Ce qui a changé |
|---|---|
| **BLEUE** — rail de 424 px | Les quatre groupes redeviennent des cartes (rayon 8, rembourrage 12, écart 8). La rangée d'onglets s'ouvre au-dessus. |
| **VERTE** — colonne du graphique | Le graphique entre dans un panneau cerné. Le panneau s'arrête avant la bande de variations, qui porte déjà sa carte. |
| **JAUNE** — colonne d'actualités | Inchangée en structure ; elle hérite du nouveau plan de carte et de la nouvelle densité par les jetons. |
| **ORANGE** — sous le graphique | Reçoit la brosse, un filet, l'intitulé « Grandeur tracée » et la liste des séries affichées — la légende ne se cache plus hors comparaison. |

**Le vide mesuré à droite du bas du rail** : 84 px avant, 20 après la légende, **−6 après le
panneau**. Les deux colonnes finissent à six pixels l'une de l'autre.

### La rangée d'onglets

`Aperçu` · `Valeurs historiques` · `Halving` (bitcoin seul). 48 px, filet bas de 2 px à l'accent sur
l'onglet actif, icône de 16 px, corps 16/400 — la forme relevée sur la référence.

Elle ouvre **deux routes qui étaient servies et que rien ne desservait** : `/crypto/[id]/historique`
et `/crypto/[id]/halving`, joignables uniquement en tapant leur adresse. Les deux sous-pages portent
la même rangée avec leur propre onglet actif, sans quoi la navigation ne serait réversible que dans
un sens.

### Diffusion au reste du site

La couche de jetons se propage **sans toucher un composant** : 146 emplois de `rounded-card`,
126 de `bg-surface`, 111 de `rounded-control`, et l'approche typographique sur tous les crans. Les
pages d'accueil, de listing, d'analytics et de graphiques ont été vérifiées au navigateur après
coup — elles reçoivent le nouveau système par les jetons seuls.

Quatre composants ont été corrigés parce qu'ils **contredisaient** le nouveau système :
`ui/SegmentedControl`, `settings/SegmentedControl`, `ui/tabs` et `market/GlobalChartCard` portaient
une ombre sur leur pastille active. Cette ombre rattrapait un défaut de jeton — `--color-surface-active`
valait un gris deux crans *sous* la piste, donc l'état actif s'assombrissait au lieu de s'élever.
Le jeton retourné, l'ombre n'avait plus rien à rattraper. **Mesure après coup sur la fiche : 0 ombre
réelle**, comme la référence (une seule sur ses 899 éléments).

---

## 4. Ce qui n'a pas été construit, et pourquoi

Aucune donnée n'a été inventée. Ces blocs existent chez Tokenomist et n'ont **pas** d'équivalent :

| Bloc | Raison, tirée du code |
|---|---|
| Table d'allocations + beignet | Aucune allocation de jeton par catégorie n'existe. Le champ `allocation` du dépôt appartient à `yahoo-profile.ts` et décrit la répartition **par nature d'actif d'un fonds** — pas la même donnée. |
| Unlock Events, calendrier de déverrouillage | Rien : aucun champ, aucun fournisseur, aucun composant. `AssetSupply.tsx` le documentait déjà : « Les afficher supposerait de les ESTIMER. » |
| Release Schedule, courbe d'émission | Idem. Seule exception : le halving du **bitcoin seul**, calculé depuis les règles du protocole — et c'est précisément la route que la rangée d'onglets vient d'ouvrir. |
| Bouton « Create Alert » | La fonctionnalité d'alerte n'existe pas. Le seul bouton branché de l'en-tête est le suivi (`toggleWatchlist`). |
| Onglet « Tokenomics » | Aucune donnée derrière. |
| Onglet « Métriques » | Vingt et une pages de métrique existent, aucune n'est canonique — un onglet qui en ouvrirait une mentirait. Surtout, `AssetMetricRail` a délibérément **délié** ses vingt libellés : « ces pages n'existent plus comme destination de premier plan ». Un onglet les y remettrait sans discuter cette décision. |
| « Explore our API » | Zenkuu n'expose aucune API publique. `app/api/*` sert l'application elle-même. |
| Marqueurs d'offre payante | Pas d'offre payante. |
| Dégradé de la carte générée | Le motif est bon — une couleur qui dit « ceci est écrit, pas mesuré » — mais Zenkuu ne produit aucun texte généré. Rien à marquer. |

---

## 5. Décisions prises au jugement

**Le rail retrouve ses cartes, contre une note qui les avait retirées.** Cette note était juste au
jour où elle a été écrite : sept cartes coûtaient plus de trois cents pixels dans une colonne
étroite. Son argument a été **remesuré** plutôt que cru : le rail faisait 778 px contre 806 au
graphique, soit 28 px d'avance et non « deux écrans » de retard — ce chiffre décrivait l'état à sept
cartes, il n'y en a plus que quatre. Rembourrage 12 et non 16 : notre colonne fait 408 px, la sienne
480.

**Le second argument de cette note tient toujours, et il borne le retour en arrière** : quatre cartes
ne font pas une texture, sept oui. Si le rail regagne des groupes, c'est cette limite qu'il faudra
rouvrir, pas le rembourrage.

**Les tableaux gardent leur absence de plaque.** Une décision mesurée et documentée l'avait retirée
(« sur une page qui aligne plusieurs listes, ces plaques se lisaient comme autant de cartes
flottantes »). La référence met sa table dans un panneau, mais elle n'en a qu'une, quand Zenkuu en
aligne plusieurs de 19 000 lignes. La décision existante l'emporte.

**Les ombres des surcouches restent.** Menus, listes déroulantes, boîtes de dialogue, tiroirs,
recherche : une couche qui flotte au-dessus du contenu est le seul endroit où l'élévation est réelle.
La référence n'en montre pas parce qu'aucune n'était ouverte au moment du relevé.

**La rangée d'onglets s'arrête à la colonne principale** au lieu de traverser la page comme chez la
référence : celle-ci n'a pas de colonne d'actualités à droite, et des onglets qui la traverseraient
laisseraient croire qu'ils la commandent aussi.

**Les intitulés viennent de la table de phrases existante.** Elle est indexée par le texte français
et `phrases.test.ts` exige que les douze locales portent les mêmes clés : un mot inventé, ce sont
douze traductions à écrire ou un onglet qui sort en français sur onze langues. « Aperçu »,
« Valeurs historiques » et « Grandeur tracée » existaient déjà — cette dernière est le vocabulaire
propre de la barre d'outils, ce qui garde les deux endroits d'accord.

---

## 6. Correctifs de fond rencontrés en chemin

**Le bloc d'identité tombait à zéro pixel de large sur téléphone.** Mesuré à 375 px : rangée 343 px,
bloc d'identité **0 px**, pastille « Smart Contract Platform » réduite à « S ». `flex-1` vaut
`flex: 1 1 0%`, donc une base nulle : le bloc ne réclamait rien et n'obtenait que ce que la bande de
repères laissait, c'est-à-dire rien. `flex-wrap` sur la rangée + `basis-72` sur le bloc. Identité
343 px après correction.

**Quatre commentaires du dépôt étaient devenus faux** et ont été corrigés sur place plutôt que
supprimés — ils consignent des mesures qui restent utiles :
- la note de `--color-surface-active` disait le jeton élagué faute de consommateur : il en a quatre ;
- la note de la légende du graphique affirmait qu'elle était « sous la bande de navigation » quand le
  code la rendait au-dessus — l'ordre suit maintenant l'intention ;
- la note de `RailSection` décrivait une référence qui n'est plus celle du chantier ;
- la note du bloc `--v2-*` citait deux macros d'espacement qui viennent d'être retirées.

---

## 7. Vérifications

| Contrôle | Résultat |
|---|---|
| `bun run test` | 552 tests, 48 fichiers — passent |
| `palette.test.ts` | 22 paires de contraste WCAG dans les deux thèmes + 2 écarts assumés — passent |
| `bunx tsc --noEmit` | propre |
| `bun run lint` | propre |
| Balayage de 51 routes | 48 en 200 (voir §8) |
| Débordement horizontal à 375 / 758 / 1565 px | 0 |
| Ombres réelles sur la fiche | 0 |
| Thèmes clair **et** sombre | vérifiés au navigateur sur la fiche et sur un listing |

---

## 8. Problèmes résiduels

**`/fr/analytics/tokenized-assets` répond 500** — « No intl context found ». **Préexistant, et
vérifié comme tel** : la route échoue à l'identique quand on restaure `globals.css` et
`ui/SegmentedControl.tsx` depuis la branche de sauvegarde. Aucun des 17 fichiers touchés n'est sur
son chemin de rendu. C'est un défaut de fournisseur `next-intl` sur cette route, sans rapport avec
la refonte.

*(`/fr/analytics/apy` avait aussi répondu 500 lors du premier balayage : échec de compilation
transitoire, la route répond 200 trois fois de suite après vérification. `/fr/classements/gagnants`
n'existe pas — les identifiants réels sont `hausses`, `baisses`, `volumes`, `rotation`, `sommet`.)*

**La languette d'actualités recouvre le contenu sur téléphone.** Elle est `fixed right-0 top-1/2` par
construction — un recouvrement de bord assumé, comme la bulle de chat de la référence. À 375 px, elle
passe sur la bande de cours. Non corrigé : le corriger revient à repenser l'affordance.

**`rounded-[12px]!` en dur dans `ui/SegmentedControl`** — une valeur `!important` hors échelle, qui
contredit les rayons 8/6/4. Repérée, non touchée : elle est le seul rayon de la piste segmentée et
la changer demande de remesurer les trois composants qui rendent ce motif.

---

## 9. Dettes relevées et non traitées

Elles ne sont pas nées de ce chantier ; elles le rendront plus coûteux à poursuivre.

- **La formule de carte est recopiée 98 fois dans ~60 fichiers** pendant que `Panel` a 2 consommateurs.
  Une primitive unique les remplacerait — mais la Phase 1 ayant rendu ces 98 emplacements corrects
  d'un coup, la consolidation est devenue un refactor **sans effet visuel**, donc non prioritaire.
- **Deux composants `SegmentedControl`** (`ui/` et `settings/`), plus deux autres implémentations du
  même motif. Ils sont maintenant d'accord sur la couleur et l'absence d'ombre ; ils restent deux.
- **Quatre mécaniques d'onglets** distinctes.
- **Deux états vides, deux paginations, deux ou trois cartes.**
- **Trois bibliothèques d'interface** (HeroUI, Radix, Base UI) et **deux moteurs de graphique**
  (amCharts 5 pour la fiche, Recharts ailleurs).
- **17 tableaux écrits en HTML brut**, sans primitive commune.
- **29 pages réécrivent leur propre en-tête**, dont 13 mot pour mot ; 9 écrivent à la main un fil
  d'Ariane alors que `ui/breadcrumb.tsx` n'a qu'un seul usage.
- **`accordion.tsx` n'a plus de consommateur réel** (import vide résiduel dans `MobileNav`).
- **La couche `--v2-*` compte sept jetons morts.** Non élaguée : elle porte des mesures relevées chez
  CoinGecko et un contrat bidirectionnel avec `DESIGN_SYSTEM.md`. La retirer effacerait des mesures
  pour un gain nul.
- **Aucune échelle de z-index** : le code écrit des littéraux (`z-10` 29 fois, `z-50` 19 fois…).

---

## 10. Ce que ce chantier n'a pas couvert

Le périmètre demandé était le site entier. Ce qui a été **fait** couvre la fondation et la fiche
d'actif ; ce qui suit ne l'a **pas** été, et devra faire l'objet d'une suite :

- La refonte page par page des ~29 pages qui composent leur propre en-tête.
- L'unification des primitives dupliquées listées au §9.
- Une vérification systématique des 64 routes au navigateur — seules la fiche, l'accueil, les
  listings, `/analytics` et `/graphiques` ont été regardées.
- Un audit d'accessibilité au clavier. Le contraste est couvert par `palette.test.ts` dans les deux
  thèmes, et le focus visible est déjà global (`:focus-visible` sur `:root`) ; la navigation au
  clavier de bout en bout n'a pas été éprouvée.
- Les états de chargement et squelettes, que la référence n'a pas exposés au moment du relevé.
