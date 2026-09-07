# REDESIGN_TOKENTERMINAL_REPORT.md

Rapport du chantier demandé le 2026-09-06 : fiches de suivi façon **Token Terminal**,
recherche globale façon **Tokenomist**, nettoyage de l'accueil, composants Headless UI,
documentation et icônes Font Awesome.

Branche : `claude/zenkuu-tracking-search-redesign-267e4c`.
Point de retour antérieur au chantier Tokenomist : `avant-ui/ux-tokenomist` (`ffd1f18`).

---

## 0. Ce qui a été livré, en un tableau

| Tâche | État | En une phrase |
|---|---|---|
| **T1** — fiches de suivi | **fait** | Rangée d'onglets, bloc prix en tête de rail, libellés de métriques reliés, grille de répartitions en bas de page. |
| **T2** — recherche globale | **fait** | Pastilles de raccourcis, recherches récentes, liste de suivi, tendances classées, légende clavier. |
| **T3** — nettoyage accueil | **fait** | Ticker défilant, menu « Les plus populaires » et champ « Filtrer » retirés, avec leur machinerie. |
| **T4** — Headless UI | **fait** | Les quatre rangées à contrat ARIA rompu sont traitées : deux `RadioGroup`, un `TabGroup` restructuré, un filtre remis en `aria-pressed`. |
| **T5** — documentation | **partiel** | Guide écrit et publié sur `main`, MCP autorisé, `.gitbook.yaml` en place. Reste **une étape d'interface** : finir l'installation Git Sync. Voir §5. |
| **T6** — Font Awesome | **fait, sans remplacement** | Câblé et vérifié ; l'audit n'a trouvé aucune icône incohérente à remplacer. Voir §6. |

⚠️ **Une seule tâche n'est pas close** — T5, et son dernier obstacle n'est plus une
autorisation mais **un réglage d'interface** que l'API GitBook n'expose pas. Le §5 donne
la marche à suivre en quatre points. Le reste est en place et vérifié au navigateur.

---

## 1. T1 — Les fiches de suivi

Toutes les fiches passent par **un seul composant**, `AssetPageView` : la refonte porte
donc d'un coup sur les six classes (`/crypto`, `/actions`, `/devises`, `/etf`,
`/indices`, `/matieres-premieres`).

### Ce qui a été repris de la référence

| Zone de Token Terminal | Chez Zenkuu |
|---|---|
| Fil d'Ariane compact | déjà en place, trois maillons |
| Bandeau d'identité | logo, rang, nom, ticker, pastilles de catégorie, liens officiels |
| Rangée d'onglets secondaires | `Aperçu · Métriques · Valeurs historiques · Halving` |
| Bloc prix en tête de colonne gauche | **rétabli** — voir ci-dessous |
| Table « Key metrics » dense | `AssetMetricRail`, libellés **reliés** à leurs 21 pages |
| Barre d'outils de graphique | grandeur tracée, période, comparaison, export |
| Grille de mini-graphiques en bas | **créée** — `AssetDistributions` |

### Le bloc prix redescend, et la bande d'identité le perd

`AssetPriceCard` existait mais avait été retirée de la fiche ; ses trois valeurs — cours,
variation 24 h, amplitude — étaient montées dans la bande de l'en-tête. Elle est rétablie
**en tête du rail**, à la place que lui donne la référence.

⚠️ **Les cellules de la bande sont parties en même temps, et c'était la condition.** Deux
cours sur un même écran, dont l'un branché sur le flux Binance et l'autre figé au rendu,
ne se contredisent pas souvent — mais quand ils le font, rien ne dit lequel croire.
`AssetTopBar` ne porte plus que les deux commandes ; `TopBarCell`, devenu sans emploi, a
été supprimé. Le cours reste visible en défilant : c'est le rôle d'`AssetStickyBar`.

### La grille du bas — `AssetDistributions`

La référence remplit sa moitié basse d'une grille à deux colonnes. Ses découpes — par
chaîne, par version de protocole — **n'existent pas ici** : `AssetDetail.contracts`
associe une chaîne à une *adresse*, sans aucun poids, et aucune source branchée ne
versionne un protocole.

Trois découpes réelles les remplacent, et **aucune ne coûte un appel réseau de plus** :

| Découpe | Source, déjà chargée |
|---|---|
| crypto — volume 24 h par **place de cotation** | `tickers`, lu pour `AssetExchangeTable` |
| crypto — volume 24 h par **contrepartie** | le même tableau, autre clé |
| action — **répartition du capital** + premiers porteurs | `profile.ownership` |

Relevé sur `/fr/crypto/bitcoin` : 71 places, 10 contreparties, totaux concordants à
26,7 Md $. Sur `/fr/actions/aapl` : 66,4 % institutions, 31,9 % autres détenteurs, 1,6 %
initiés, d'après 7 751 déclarations.

`profile.ownership` **arrive dans le même appel que les ratios boursiers déjà affichés et
n'était lue nulle part.** C'était la meilleure donnée inutilisée du dépôt.

`AssetHoldings` **était écrit et n'était appelé nulle part** : la fiche n'importait de son
fichier que `AssetProfileRail`, son voisin. Il porte les trois découpes que Yahoo publie
pour un fonds. Il est branché.

### ⚠️ Deux légendes corrigées après relevé, dont une qui mentait sur la mesure

- « Flottant » nommait le reste `100 − initiés − institutions`. Le flottant désigne les
  titres **disponibles** à la négociation, ce qui inclut l'essentiel des positions
  institutionnelles : le mot faisait de cette part le complément de ce qu'elle recouvre.
  Devenu « Autres détenteurs ».
- « Part du capital déclarée par chacun », sous les premiers porteurs. `ShareDonut`
  **normalise ses parts à cent** : Blackrock y paraissait à 25 % du capital d'Apple quand
  la source le déclare à un peu moins de 7 %. La légende dit désormais qu'il s'agit d'un
  poids **dans ce groupe**.

### Ce qui n'a pas été construit, faute de donnée

| Bloc de la référence | Raison, vérifiée dans le code |
|---|---|
| **« Products »**, arborescence repliable | Aucune entité produit ni sous-protocole dans `AssetDetail`. `categories` est une liste de noms, sans pondération ni hiérarchie. |
| **« Financial statement »** | Aucun compte de résultat ni bilan nulle part. `AssetProfile` ne porte que ratios, détentions, secteurs, actionnariat. |
| **Sélecteur de granularité** (« Daily ») | La granularité est **imposée par la source** : 5 min sous 1 j, horaire ≤ 90 j, quotidienne au-delà ; `interval` renvoie 401 sur le palier gratuit. Un sélecteur promettrait un réglage qui n'existe pas. |
| **Variation colorée sur chaque ligne** | Une seule variation d'une autre grandeur que le cours existe : `marketCapChange24h`. Ni volume, ni valorisation diluée, ni rang, ni offre n'ont de champ de variation — `rankChange`, `volumeChange`, `fdvChange` : zéro occurrence dans le dépôt. |
| Pastilles de filtre « chaîne / version » | Compter les chaînes donnerait des parts **égales** — un jeton sur six réseaux afficherait six fois 16,7 %, ce qui ressemble à une mesure sans en être une. |
| Répartition de l'**offre** en anneau | Mesurable, mais `AssetSupply` la rend déjà en jauges dans le rail, à trois centimètres de là. |

---

## 2. T2 — La recherche globale

Le panneau reprend la structure de `tokenomist.ai`, avec des données réelles :

- **rangée de pastilles** vers cinq classements existants — plus fortes hausses, plus
  fortes baisses, les plus échangées, nouvelles cotations, rachats de jetons ;
- **« Recherches récentes »** avec « Effacer l'historique », tenues dans le navigateur ;
- **« Ma liste de suivi »** avec « Tout voir », alimentée par la vraie liste de
  l'utilisateur, toutes classes confondues, et son état vide ;
- **« Tendances · les plus consultés 24 h »** avec rang, logo, cours, variation et étoile
  de suivi en ligne ;
- **légende clavier** en pied : `Tab` parcourir, `Échap` annuler, `↵` ouvrir ;
- ouverture par `/` et par `Ctrl/⌘ + K`.

⚠️ **« Most Viewed » est honnête sur sa source.** Zenkuu n'a aucune mesure d'audience
propre ; le classement affiché est celui de CoinGecko, et l'intitulé dit « les plus
consultés 24 h » sans laisser croire à un compteur maison.

---

## 3. T3 — Le nettoyage de l'accueil

Les trois éléments encadrés sur la capture ont été retirés, **avec la machinerie qu'ils
alimentaient** — −494 lignes pour +67.

| Retiré | Ce qui part avec | Où la fonction se retrouve |
|---|---|---|
| **Ticker défilant** | `.ruban-piste` et ses trois règles CSS | — |
| **Menu « Les plus populaires »** | `BOARD_VIEWS`, `BOARD_LINKS`, `BoardViewMenu`, l'état `tab`, et toute la mécanique « En tendance » (état, effet, second appel réseau, état vide) | `/classements/hausses` et `/classements/baisses`, déjà liés depuis les cartes du ruban |
| **Champ « Filtrer les cryptomonnaies »** | `searchable` sur l'appelant de l'accueil seulement | la loupe de l'en-tête, qui interroge les 19 670 actifs du catalogue |

⚠️ `@keyframes zenkuu-ticker` **reste** : `TickerWidget` l'utilise pour la bande
embarquable servie par `/embed/ticker`, qui est un autre produit.

⚠️ **Un seul recul assumé** : « En tendance » perd son entrée sur l'accueil. Le
classement reste servi par la recherche globale, qui l'affiche à chaque ouverture.

**Impact vérifié.** Aucun vide laissé : le tableau suit directement la rangée d'univers.
Aucun débordement horizontal à 1 565 px ni à 773 px. La hauteur du substitut de
chargement a été recalculée — et une **erreur de mesure héritée** corrigée au passage :
les deux notes précédentes comparaient la valeur au ruban entier, alors que
`BlockSkeleton` ajoute 32 px devant le cadre. Écrire 149 pour un ruban de 149 px laissait
32 px de décalage, soit ce que la note d'avant croyait avoir refermé. Ruban relevé à
94 px : la valeur devient 62.

---

## 4. T4 — Headless UI

⚠️ **CE PARAGRAPHE A DIT FAUX DANS SA PREMIÈRE VERSION, ET LA CAUSE MÉRITE D'ÊTRE
ÉCRITE.** Il annonçait « neuf fichiers déclarent `role="tablist"`, aucun ne gère les
flèches ». Le compte venait d'un `grep` sur le nom du rôle, qui ramenait aussi les
fichiers où il n'apparaît que **dans un commentaire expliquant pourquoi on ne l'emploie
pas** — `AuthPageView`, `AssetShell`, `PreferenceOverlay` et `ScreenerView` avaient déjà
tranché correctement, et `MetricCatalogue` était déjà sur Headless UI. Mesurer un défaut
sur le texte plutôt que sur le balisage l'avait multiplié par deux.

**Le compte réel était quatre.** Ils sont tous traités.

### Le défaut, et ce qu'il coûtait

Quatre éléments portaient `role="tablist"` et `role="tab"` **écrits à la main, sans une
seule touche câblée**. Le motif ARIA des onglets impose au composant de gérer lui-même
les flèches et l'index roulant : la synthèse vocale annonçait « onglet 2 sur 4 » et les
flèches ne déplaçaient rien. Un rôle qui promet ce que le code ne tient pas est **pire
qu'un bouton nu**, qui au moins n'annonce rien.

Aucun des quatre n'était lié à l'URL — le deep-linking n'était donc jamais en jeu, contre
ce que la première version de ce paragraphe affirmait aussi.

### Ce qui a été fait, cas par cas

| Composant | Traitement | Pourquoi celui-là |
|---|---|---|
| **`ClassTabs`** + `MarketBrowser` | `TabGroup / TabList / Tab / TabPanels / TabPanel` | Seul vrai jeu d'onglets : chaque entrée sert **un autre jeu de lignes**. |
| **`MacroExplorer`** (Carte / Globe) | `RadioGroup / Radio` | Ne révèle pas un panneau parmi deux : change la **projection** du même contenu. |
| **`SectorMap`** (grandeur mesurée) | `RadioGroup / Radio` | Choisit la grandeur qui **colore** la carte ; le contenu ne change pas de nature. |
| **`SearchScopes`** | `role="group"` + `aria-pressed` | **Pas** de Headless UI, et c'est délibéré — voir ci-dessous. |

**`ClassTabs` est le seul cas où le groupe a dû être restructuré.** `aria-controls` ne
peut relier un onglet à un panneau que si les deux vivent sous le même `TabGroup` : la
rangée était rendue seule, plus haut, et ne pouvait donc rien désigner. Le groupe
enveloppe désormais la rangée **et** le tableau. Un panneau par onglet, mais **un seul
tableau monté** — seul le panneau sélectionné reçoit le contenu, les trois autres restent
vides : la structure est juste pour la synthèse vocale, le coût reste celui d'un tableau.
La liste d'univers est extraite dans `visibleUniverses()` et partagée entre les onglets et
les panneaux, ce qui rend impossible le décalage d'un cran.

**⚠️ `SearchScopes` n'a volontairement pas reçu Headless UI.** Cette rangée vit dans un
`Command` de cmdk, qui possède déjà `↑` et `↓` pour parcourir les résultats. `TabGroup`
comme `RadioGroup` réclament ces mêmes touches dès que le focus entre dans le groupe : on
aurait échangé un défaut d'accessibilité contre un conflit de raccourcis. Et le composant
n'est de toute façon pas un jeu d'onglets — c'est un **filtre**, qui retranche des lignes
de la seule liste existante. Des bascules exclusives avec `aria-pressed` décrivent
exactement cela, sans engager aucune touche.

### Vérifié au clavier, au navigateur

- **`ClassTabs`** — clic sur « Crypto » (index 1), `→` porte focus **et** sélection sur
  « Actions » (index 2), et le panneau rempli devient le n° 2. `tabindex` roulant
  relevé : `[-1, 0, -1, -1]`.
- **`MacroExplorer`** — clic sur « Carte », `→` bascule sur « Globe », `aria-checked`
  suit, et le globe se dessine.
- **`SearchScopes`** — `role="group"`, quatre boutons, `aria-pressed` correct, plus aucun
  `aria-selected` orphelin.
- Audit final : **zéro** `role="tablist"` ou `role="tab"` écrit à la main dans le
  balisage. Les occurrences restantes sont des commentaires qui expliquent la décision.

⚠️ **`SectorMap` n'a pas pu être vérifié à l'écran : le composant n'avait aucun
appelant.** Seul son type `SectorNode` était importé, par `explorer-sectors.ts`, lui-même
importé par son seul test. Un triangle fermé de 657 lignes que rien n'atteignait — la
migration y était correcte et invisible.

**Les trois fichiers ont été supprimés** dans la foulée. La doctrine que portait
`drift()` — une variation calculée depuis nos propres points n'est légitime que si elle
dit sur quelle profondeur elle porte — survit dans `GlobalChartCard` et
`PriceHistoryTable`, qui la mettent en œuvre pour de vrai.

### Ce qui n'a pas été migré, et c'est un choix

`Listbox`, `Menu`, `Combobox`, `Select` et `Button` **n'ont pas** remplacé l'existant.
Le dépôt porte déjà `radix-ui`, `@base-ui/react`, `@heroui/react` et `cmdk` ; les menus et
listes en place sont bâtis sur Radix, qui gère déjà clavier, focus et positionnement. Les
remplacer n'apporterait **aucun gain d'accessibilité** et ajouterait une **quatrième**
bibliothèque d'interface sur des composants qui vont bien — ce que la consigne
elle-même interdit : « ne pas remplacer un composant qui fonctionne déjà bien sans
bénéfice d'accessibilité ou de cohérence clair ».

Les autres composants nommés par la consigne — `Listbox`, `Menu`, `Combobox`, `Select`,
`Button` — n'ont **pas** été migrés, et c'est un choix : le dépôt porte déjà
`radix-ui`, `@base-ui/react`, `@heroui/react` et `cmdk`. Les menus et listes existants
sont bâtis sur Radix, qui gère déjà clavier, focus et positionnement. Les remplacer
n'apporterait aucun gain d'accessibilité et ajouterait une **quatrième** bibliothèque
d'interface sur des composants qui vont bien — ce que la consigne elle-même interdit.

---

## 5. T5 — Documentation : tout est prêt sauf une étape d'interface

L'autorisation OAuth **a été donnée** et le serveur répond. L'inspection a alors montré
que le blocage n'avait jamais été là où je le croyais.

### Ce qui est en place

| Élément | État |
|---|---|
| MCP GitBook | ✔ connecté — organisation **Zenkuu** (`VNNShnnbfRfr9IjBTiL3`), site **Zenkuu Docs** (`site_bFvaH`), espace `H92Om9ArW2NG9kLIhWoi` |
| Contenu du guide | ✔ 8 fichiers, 427 lignes, en français, sous `docs/guide` |
| `.gitbook.yaml` | ✔ racine `./docs/guide/`, `readme: README.md`, `summary: SUMMARY.md` |
| Publication sur `main` | ✔ `7179104..624bbf0`, avance rapide pure — le sync a désormais quelque chose à tirer |

### ⚠️ Ce qui reste, et pourquoi je ne peux pas le faire

L'espace est en **`editMode: "locked"`**, et la cause est nommée par l'API elle-même :

    "gitSync": { "installationProvider": "github", "installationStatus": "pending" }

**Une installation Git Sync a été commencée le 2026-09-06 et jamais terminée.** GitBook
verrouille un espace dès qu'un dépôt en devient la source ; la synchronisation étant
restée `pending`, l'espace est verrouillé *sans* recevoir de contenu. C'est l'impasse que
le commit `c4acf2d` avait constatée en écrivant « l'espace GitBook est verrouillé ».

Le guide d'usage du serveur est formel : « **Git Sync setup is not available through this
server.** » Aucun outil MCP ne termine une installation GitHub — c'est une étape de
l'interface, et écrire les pages par l'API à la place serait un contresens : cela ferait
de GitBook la source de vérité contre le dépôt, exactement ce que `.gitbook.yaml` met en
garde de ne pas faire.

### La marche à suivre — quatre points

1. Ouvrir l'espace : `https://app.gitbook.com/o/VNNShnnbfRfr9IjBTiL3/s/H92Om9ArW2NG9kLIhWoi/`
2. Dans **Integrations → Git Sync**, finir l'installation de l'app GitHub et choisir le
   dépôt **`zyneww/Zenkuu`**, branche **`main`**.
3. ⚠️ **Choisir le sens Git → GitBook pour le premier échange.** L'inverse écraserait
   `docs/guide` avec le contenu de l'espace, qui est vide. Ce sens-là est irréversible
   dans ses effets : il n'y a rien à récupérer une fois le dossier remplacé.
4. `.gitbook.yaml` étant à la racine du dépôt, GitBook lira `docs/guide/` seul. Les autres
   documents de `docs/` — plans, audits, relevés — restent hors ligne, ce qui est voulu.

Une fois l'échange passé, `get_site_structure` montrera les pages importées et l'espace
sortira de `locked`.

---

## 6. T6 — Font Awesome : câblé, et il ne remplace rien

**Voie retenue : paquets npm Free, sans Kit** — arbitrage de l'exploitant. La skill
`setup-fa` recommande un Kit, qui exige `fa login` : pas de binaire `fa` sur le `PATH`,
pas de `FA_API_TOKEN`, session non interactive.

Installé dans `apps/web` : `fontawesome-svg-core` 7.3.1, `free-solid-svg-icons` 7.3.1,
`react-fontawesome` 3.5.0. Câblage dans `app/[locale]/layout.tsx` :

```tsx
import { config } from '@fortawesome/fontawesome-svg-core'
import '@fortawesome/fontawesome-svg-core/styles.css'
config.autoAddCss = false
```

⚠️ **Les deux lignes vont ensemble.** Next.js bloque l'injection automatique de la
feuille ; sans elle, chaque SVG s'affiche à sa taille intrinsèque — plein écran. Vérifié
au navigateur avec une sonde posée puis retirée : règle `svg-inline--fa` présente, icône
rendue à 28 × 22 px.

`.font-awesome.md` est écrit et committé : `/add-icon` et `/suggest-icon` fonctionnent,
bornés au style `solid` et à la licence Free — un seul paquet de famille étant installé,
la règle est mécanique et non déclarative.

### ⚠️ Aucune icône du site n'a été remplacée, et c'est un constat d'audit

La consigne demandait de « remplacer progressivement les icônes incohérentes ». **L'audit
n'en a trouvé aucune.** Le site tient sur `lucide-react` dans **66 fichiers**, de façon
cohérente, plus cinq jeux maison dont chacun porte dans son en-tête la raison de son
existence :

- les **logos sociaux** sont des marques : la charte de Google impose ses quatre couleurs
  sur un bouton de connexion et interdit le monochrome, ce que `faGoogle` est. `lucide` a
  lui-même retiré ses logos de marques pour des raisons de licence ;
- les **vignettes de matières premières** sont des carrés colorés repris de DropsTab —
  lingots dorés, goutte noire du brut. Font Awesome ne rend que du monochrome : la
  substitution perdrait la couleur, qui est ici l'information.

Poser des Font Awesome **à côté** de lucide créerait précisément l'incohérence que
l'opération prétend corriger. Une migration est possible ; elle touche 66 fichiers et
doit se faire **d'un seul tenant**.

---

## 6 bis. Deux dettes héritées, refermées en chemin

**La synthèse vocale parlait français dans les treize langues.** `ChangeBadge` construit
un `aria-label` et une infobulle que l'œil ne voit jamais : les deux étaient écrits en
français et sortaient tels quels partout, sur un badge présent dans trente-deux fichiers.
Le composant prévoyait pourtant une prop `libelles`, jamais passée. L'enveloppe
`components/locale/ChangeBadge` injecte déjà `locale` pour les quarante-sept appels ;
elle injecte désormais aussi les mots et la période, par le même chemin et sans qu'aucun
appel ne change.

⚠️ **Une note de ce rapport attribuait la moitié du défaut au fournisseur** — via
`changePeriodLabel`. C'était inexact : ce champ n'est écrit qu'à un seul endroit du
dépôt, `providers/frankfurter.ts`, par notre propre code. Rien ne venait du dehors, donc
rien n'était hors de portée.

**Le code mort a été balayé.** Le triangle `SectorMap` ayant été trouvé par accident, les
six dossiers de `apps/web` ont été passés au crible. Trente-quatre candidats, **cinq
vrais** — les autres étant des catalogues chargés par `import()` explicite, une
convention next-intl, un module lu par `next.config.ts`, et un nom de deux lettres à
quarante appelants. 329 lignes de plus retirées, chaque symbole vérifié un par un.

⚠️ **J'avais réparé du code mort.** `hooks/use-resize-observer.ts` est de la partie :
c'est le fichier dont j'ai corrigé l'import `@react-types/shared` en début de chantier.
Le défaut était réel — tout clone neuf échouait au typecheck — mais le supprimer
l'aurait refermé aussi, en retirant soixante-dix-huit lignes au lieu d'en ajouter dix.

---

## 7. Décisions prises, et par qui

| Décision | Arbitrée par |
|---|---|
| Supprimer le champ « Filtrer », comme le ticker | exploitant |
| Grille de répartitions **sur toutes les classes** | exploitant |
| Rétablir le bloc prix dans le rail | exploitant |
| Relier les libellés de métriques **et** l'onglet | exploitant |
| Font Awesome par paquets npm Free, sans Kit | exploitant |
| Réutiliser `ShareDonut` plutôt qu'écrire une seconde figure | rapport, sur la note du composant |
| Ne pas reprendre les barres de la référence (le cahier des charges dit « ET/OU ») | rapport |
| Ne pas migrer Radix vers Headless UI | rapport, §4 |
| Ne remplacer aucune icône existante | rapport, §6 |

---

## 8. Vérifications

| Contrôle | Résultat |
|---|---|
| `bunx tsc --noEmit` | propre |
| `bun run lint` | propre |
| `bun run test` | **542 tests, 47 fichiers** — passent |
| Fiche crypto, français | `/fr/crypto/bitcoin` — grille, onglets, bloc prix |
| Fiche action, français | `/fr/actions/aapl` — capital et premiers porteurs |
| Fiche crypto, anglais | `/crypto/bitcoin` — « Breakdowns », « Volume by venue » |
| Recherche globale | ouverte au `/`, cinq sections présentes |
| Accueil | plus de ticker, de menu ni de champ ; aucun vide |
| Débordement horizontal | 0 à 1 565 px et 773 px |
| Thèmes clair et sombre | vérifiés sur l'accueil |
| Treize libellés neufs | traduits dans les douze locales |
| Onglets d'univers au clavier | `→` déplace focus **et** sélection ; `tabindex` roulant `[-1,0,-1,-1]` |
| Projection macro au clavier | `→` bascule Carte → Globe, `aria-checked` suit |
| `role="tab"` écrits à la main | **0** restant dans le balisage |
| Lecture vocale de la variation | `/crypto/bitcoin` en anglais : « down by minus 0.57% over 24 hours » |
| Périodes lues à voix haute | accueil en anglais : « over 24 hours / 1 hour / 7 days / 30 days » |
| Code mort restant | balayage de six dossiers : 5 orphelins retirés, 329 lignes |

---

## 9. Ce qui reste à faire

1. **T5 — finir l'installation Git Sync** dans l'interface GitBook, en Git → GitBook.
   **C'est le seul blocage restant, et l'API ne l'expose pas.** Le §5 donne les quatre
   points. Tout le reste de T5 est fait : contenu, configuration, publication sur `main`.
2. **Vérification clavier des autres routes** : les quatre rangées traitées l'ont été au
   navigateur, mais la navigation au clavier n'a pas été éprouvée route par route sur les
   64 pages.
3. **`AssetSentiment` est mort et reste** — 109 lignes dont la seule mention du dépôt est
   un commentaire disant « A ÉTÉ RETIRÉ DE LA FICHE (demande explicite) ». Même statut
   qu'`AssetPriceCard`, retirée puis **rétablie** ce mois-ci. Un composant gardé exprès
   n'est pas un orphelin, et le supprimer ferait de la prochaine demande une réécriture.
   À trancher par l'exploitant, pas par un balayage.

---

## 10. Un incident d'environnement, pour mémoire

En cours de session, l'arbre de travail a été **réinitialisé** sur un commit plus récent
(`4ae643a`) : le commit de T3 produit plus tôt existe encore comme objet git mais n'est
plus sur la branche, son contenu s'y trouvant déjà par un autre chemin. Le répertoire de
travail temporaire a été perdu avec lui.

Rien n'a été perdu du code livré — l'état a été revérifié fichier par fichier avant de
reprendre — mais l'épisode explique pourquoi ce rapport décrit **l'état de la branche**
plutôt que la chronologie des commits.
