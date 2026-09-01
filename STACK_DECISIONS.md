# Décisions de stack — évaluation du 2026-09-02

Six librairies proposées, évaluées avant toute installation. **Une seule action retenue :
le retrait d'un paquet inutilisé.** Chaque écart est justifié par un fait vérifiable dans
le dépôt ou mesuré au navigateur, jamais par une préférence.

Règle appliquée, énoncée dans la demande : *une librairie adoptée doit être réellement
employée en production ; une librairie écartée doit être justifiée.*

---

## Résumé

| Librairie | Décision | Le fait qui tranche |
| --- | --- | --- |
| **visx** | écartée | La référence ASXN est elle-même sur **Recharts** |
| **anime.js** | écartée | `motion` était déjà là, et déjà inutilisé |
| **motion** (existant) | **retirée** | Importée par **zéro** fichier |
| **TanStack Query** | écartée | Le cache serveur mutualise un appel entre tous les visiteurs |
| **TanStack Table** | écartée | `useTableSort` consolide déjà **huit** tableaux |
| **MathJax** | écartée | **Zéro** formule dans `content/` |
| **Raphaël** | écartée | Non maintenue ; SVG pour IE6 |
| **Preact** | écartée | React 19 sous Next.js 16 |

---

## visx — écartée

**Le fait** : hyperscreener.asxn.xyz a été mesuré au navigateur le 2026-09-02. La page
rend `.recharts-wrapper`, `.recharts-surface`, `.recharts-bar-rectangle`,
`.recharts-cartesian-axis-tick-value` — six graphiques, **zéro `<canvas>`**. La référence
qu'on cherche à reproduire **est sur Recharts**, la même bibliothèque que ZENKUU.

Et la fidélité est déjà obtenue, vérifiée à l'écran (voir `CHARTS_AUDIT.md`) : infobulle
translucide qui glisse, crosshair pointillé, filigrane, puces de série, rampe
d'empilement.

Adopter visx signifierait donc réécrire `AreaPlot` (452 l.), `BarFigure` (327 l.), les
primitives de `chart.tsx` et dix appelants — pour **un gain de fidélité mesuré à zéro**,
et en portant trois bibliothèques de graphiques pendant la migration.

visx reste le bon outil pour un tracé que Recharts ne sait pas faire. Ce cas ne s'est pas
présenté.

## anime.js — écartée, et `motion` retirée

**Le fait** : `motion` (Framer Motion v12) figurait dans les dépendances et était importé
par **zéro fichier**. C'était exactement l'« installation décorative » que la règle
interdit ; elle a été retirée.

Ajouter anime.js aurait été une seconde librairie d'animation pour un métier dont la
première n'était même pas employée.

Les animations du site sont en **CSS** — bandeau défilant, transitions d'état, révélation
des tracés. Ce n'est pas un pis-aller : une `transform` animée par le compositeur tient le
60 im/s sans réveiller le fil principal, celui qui porte déjà un tableau de cent lignes.
`prefers-reduced-motion` les coupe toutes, d'une règle par famille.

Si une animation orchestrée devenait nécessaire (cascade, timeline, tracé SVG), la
question se reposera — et `motion` sera réinstallée pour un emploi réel, plutôt qu'une
troisième candidate ajoutée.

## TanStack Query — écartée

**Le fait** : sans clé d'API, CoinGecko refuse au-delà de quelques appels par minute (voir
l'en-tête de `providers/coingecko.ts`). C'est la contrainte structurante du site.

Le cache **serveur** actuel mutualise un appel entre **tous** les visiteurs :
`runStandalone(clé, source, ttl)`, 180 secondes, une clé par langue et par profondeur. Un
cache **client** le referait par visiteur.

`AssetLiveRefresh` couvre déjà le rafraîchissement, à la cadence du cache — en deçà, il
n'y aurait rien de neuf à chercher — et il ne réveille rien quand l'onglet est caché.

Query est un excellent outil pour une application où les données viennent du client. Sur
un App Router qui les sert depuis le serveur, il déplacerait la charge du bon côté vers le
mauvais.

## TanStack Table — écartée

**Le fait** : `useTableSort` (193 l.) sert **huit** tableaux — `CategoryExplorer`,
`SpotExchangesPanel`, `SpotExchangesExplorer`, `NewListingsTable`, `DexPoolTable`,
`TreasuryTable`, `DerivativeExchangesExplorer`, `ExchangeTickersTable`. La consolidation
que TanStack apporterait **existe déjà**.

`MarketTable` (1 615 l.) ne trie pas : il reçoit des lignes déjà ordonnées et les rend.
Seul `MarketBrowser` porte un pipeline propre, et pour des raisons que TanStack ne
modélise pas telles quelles :

- la vue « Tendance » **réordonne** au lieu de filtrer — il n'existe pas de seuil
  au-delà duquel un actif « est » tendance ;
- les valeurs absentes vont **toujours en dernier**, dans les deux sens : les ranger
  comme des zéros les ferait remonter en tête d'un tri croissant, où elles se liraient
  comme les plus petites valeurs alors qu'elles n'en sont pas ;
- la pagination est **locale et distante** selon que l'appelant détient toutes les
  lignes ou une tranche.

Reproduire ces trois comportements demanderait un `sortingFn`, un `filterFn` et un modèle
de pagination sur mesure — soit autant de configuration que la logique remplacée, pour un
résultat identique, sur la surface la plus exposée du site (accueil, `/crypto`,
`/actions`, `/devises`, `/matières-premières`).

## MathJax — écartée

**Le fait** : recherche de `\frac`, `\sum`, `$$`, `katex`, `mathjax` dans tout
`apps/web/content/` — **aucun résultat**.

Les fiches d'apprentissage, le glossaire et la méthodologie expliquent des notions en
prose. Là où un calcul apparaît, il est écrit en toutes lettres (« la somme des
capitalisations divisée par le total ») parce que c'est ce qui se lit, y compris à la
synthèse vocale — qu'une formule TeX rendue en SVG laisserait muette.

Le jour où une page portera une vraie formule, MathJax ou KaTeX sera le bon outil.

## Raphaël — écartée

Non maintenue depuis des années, conçue pour l'abstraction VML/SVG des navigateurs de
l'ère IE6. Rien de ce qu'elle apporte n'est hors de portée du SVG natif, que ce dépôt
écrit déjà à la main dans une dizaine de figures.

## Preact — écartée

React 19 est la base de Next.js 16 ici. `preact/compat` sur un App Router avec composants
serveur et Server Actions n'est pas un remplacement pris en charge.

Le cas qui la justifierait — un widget embarquable autonome, servi hors du site — n'existe
pas : `TickerWidget` et les autres sont rendus *par* l'application, dans son propre
paquet.
