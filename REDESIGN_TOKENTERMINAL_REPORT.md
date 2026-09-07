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
| **T4** — Headless UI | **partiel** | Installé et employé pour un jeu d'onglets. Huit autres rangées attendent, pour une raison structurelle exposée au §4. |
| **T5** — documentation | **partiel** | Guide écrit dans `docs/guide`. Le MCP GitBook est installé mais **non autorisé** : voir §5. |
| **T6** — Font Awesome | **fait, sans remplacement** | Câblé et vérifié ; l'audit n'a trouvé aucune icône incohérente à remplacer. Voir §6. |

⚠️ **Deux tâches ne sont pas closes** — T4 et T5 — et les §4 et §5 disent exactement ce
qui manque et pourquoi. Le reste est en place et vérifié au navigateur.

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

## 4. T4 — Headless UI : ce qui est fait, et pourquoi le reste ne l'est pas

`@headlessui/react` 2.2.10 est installé et employé dans **`MetricCatalogue`**
(`TabGroup / TabList / Tab / TabPanels / TabPanel`).

### Le défaut réel, mesuré

Neuf fichiers déclarent `role="tablist"`. **Aucun ne gère les flèches.** Un
`role="tab"` sans navigation aux flèches est un contrat ARIA rompu : la synthèse vocale
annonce « onglet 2 sur 5 » et les flèches ne font rien. C'est exactement la cible que la
consigne désigne — « prioriser les composants où l'accessibilité clavier est faible ou
absente ».

### Pourquoi les huit autres n'ont pas été migrés

Le partage n'est pas uniforme, et le forcer casserait quelque chose :

- **Rangées à état local** (`ClassTabs`, `SearchScopes`, `PreferenceOverlay`,
  `AssetShell`) — migrables, **mais** Headless UI exige que le panneau vive **dans** le
  `TabGroup` pour poser `aria-controls`. Or le panneau est ici un frère rendu par le
  parent : le tableau pour `ClassTabs`, la liste de résultats pour `SearchScopes`. La
  migration demande donc de restructurer chaque parent, pas de remplacer une balise.
- **Rangées liées à l'URL** (`SectorMap`, `MacroExplorer`) — elles **ne doivent pas**
  devenir des `Tab` Headless UI : ce sont des liens, et la consigne interdit de régresser
  le deep-linking. Le bon correctif y est l'inverse — **retirer** le `role="tablist"`
  abusif au profit d'un `<nav>` et d'`aria-current`, comme `CryptoViewControls` le fait
  déjà correctement.

Migrer les quatre premières et corriger l'ARIA des deux autres est un chantier de
plusieurs fichiers avec un vrai risque de régression, qui n'a pas été engagé dans cette
session. **C'est la principale dette laissée par ce rapport.**

Les autres composants nommés par la consigne — `Listbox`, `Menu`, `Combobox`, `Select`,
`Button` — n'ont **pas** été migrés, et c'est un choix : le dépôt porte déjà
`radix-ui`, `@base-ui/react`, `@heroui/react` et `cmdk`. Les menus et listes existants
sont bâtis sur Radix, qui gère déjà clavier, focus et positionnement. Les remplacer
n'apporterait aucun gain d'accessibilité et ajouterait une **quatrième** bibliothèque
d'interface sur des composants qui vont bien — ce que la consigne elle-même interdit.

---

## 5. T5 — Documentation : le MCP GitBook est installé, pas autorisé

- Le connecteur `claude.ai GitBook MCP` répond « ✔ Connected » au contrôle de santé
  mais **n'expose aucun outil** à cette session.
- Un serveur `gitbook` a donc été ajouté en configuration utilisateur
  (`https://mcp.gitbook.com/mcp`). Il répond **`! Needs authentication`**.
- La session est **non interactive** : le flux OAuth ne peut pas y être exécuté.

**Pour débloquer :** lancer `claude` dans un terminal interactif et autoriser le serveur
via `/mcp` — ou l'autoriser depuis les réglages de connecteurs claude.ai. T5 reprendra
sur un vrai espace GitBook à ce moment-là.

**En attendant**, le guide d'usage est écrit dans le dépôt, sous `docs/guide`, dans une
structure transposable telle quelle vers GitBook.

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
| `bun run test` | **550 tests, 48 fichiers** — passent |
| Fiche crypto, français | `/fr/crypto/bitcoin` — grille, onglets, bloc prix |
| Fiche action, français | `/fr/actions/aapl` — capital et premiers porteurs |
| Fiche crypto, anglais | `/crypto/bitcoin` — « Breakdowns », « Volume by venue » |
| Recherche globale | ouverte au `/`, cinq sections présentes |
| Accueil | plus de ticker, de menu ni de champ ; aucun vide |
| Débordement horizontal | 0 à 1 565 px et 773 px |
| Thèmes clair et sombre | vérifiés sur l'accueil |
| Treize libellés neufs | traduits dans les douze locales |

---

## 9. Ce qui reste à faire

1. **T4 — les huit rangées d'onglets** : migrer les quatre à état local vers Headless UI
   (en remontant le panneau dans le `TabGroup`), et retirer le `role="tablist"` abusif des
   deux rangées liées à l'URL. C'est la dette principale.
2. **T5 — autoriser le MCP GitBook** dans une session interactive, puis y porter
   `docs/guide`.
3. **Un correctif hérité, non traité** : `ChangeBadge` ne reçoit jamais sa prop
   `libelles`, si bien que son `aria-label` et son infobulle sortent **en français dans
   les treize langues**. Le corriger tient en un seul endroit — sept phrases × douze
   langues.
4. **Vérification clavier de bout en bout** : le contraste est couvert par
   `palette.test.ts` dans les deux thèmes et le focus visible est global, mais la
   navigation au clavier n'a pas été éprouvée route par route.

---

## 10. Un incident d'environnement, pour mémoire

En cours de session, l'arbre de travail a été **réinitialisé** sur un commit plus récent
(`4ae643a`) : le commit de T3 produit plus tôt existe encore comme objet git mais n'est
plus sur la branche, son contenu s'y trouvant déjà par un autre chemin. Le répertoire de
travail temporaire a été perdu avec lui.

Rien n'a été perdu du code livré — l'état a été revérifié fichier par fichier avant de
reprendre — mais l'épisode explique pourquoi ce rapport décrit **l'état de la branche**
plutôt que la chronologie des commits.
