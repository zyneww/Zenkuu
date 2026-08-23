# Optimisation — ce qui a été mesuré, changé, et ce qui reste

Ce document ne liste pas des bonnes pratiques : il liste des **mesures**, ce qu'elles ont
révélé, et ce que chaque correctif a changé. Une optimisation sans chiffre avant/après
n'est pas une optimisation, c'est une intuition.

Toutes les mesures ci-dessous ont été prises **au navigateur, sur build de production**
(`next build` + `next start`), avec `PerformanceObserver` — LCP, CLS et tâches longues
tels que les compte Core Web Vitals.

---

## Le résultat en une ligne

Sur les pages où le cache dispose d'une valeur, **le temps d'affichage est passé de 20 à
84 secondes à moins d'une seconde** — un facteur supérieur à cent. Un seul changement en
est responsable, et il tient en une trentaine de lignes.

---

## 1. Le défaut principal : le cache faisait attendre au lieu de servir

### Ce qui a été mesuré

| page | cache chaud | cache expiré |
|---|---|---|
| `/` | 536 ms | **31 188 ms** |
| `/marches` | 196 ms | **19 652 ms** |
| `/actualites` | 748 ms | **83 920 ms** |

Le rapport est de cent à un. Et ce n'était pas un cas rare : `CACHE_TTL_SECONDS` vaut
**180 secondes**, donc chaque page redevenait froide toutes les trois minutes, et le
premier visiteur de chaque fenêtre encaissait la totalité de l'appel amont.

### La cause

`cached()` dans `packages/data/src/cache.ts` disposait déjà d'un filet de valeur périmée
— mais il ne se déclenchait **qu'en cas d'erreur**. Une source simplement LENTE n'en
bénéficiait pas :

```
const hit = await cache.get(key)
if (hit !== null) return hit
// … et ici on ATTENDAIT le fournisseur, quel que soit le temps qu'il prenne
```

Le mécanisme était donc à moitié construit : `getStale()` existait, la fenêtre de grâce
de six heures existait, mais rien ne les utilisait sur le chemin normal.

### Le correctif

**Servir le périmé immédiatement, rafraîchir derrière** (*stale-while-revalidate*).
Une entrée expirée repart tout de suite vers l'appelant, et la source est relancée en
arrière-plan sans que personne ne l'attende.

Ce n'est pas une entorse au « zéro donnée inventée » (§5), et pour exactement la raison
que le fichier écrivait déjà à propos du filet d'erreur : **rien n'est fabriqué**. C'est
une valeur réellement lue chez la source, à un instant daté, et chaque module affiche cet
horodatage (`SourceNote`). La règle interdit d'inventer un chiffre, pas d'en montrer un
ancien en le datant.

### Après

| page | cache expiré, avant | cache expiré, après |
|---|---|---|
| `/marches` | 19 652 ms | **164 ms** |
| `/actualites` | 83 920 ms | **716 ms** |
| `/classements` | — | **96 ms** |
| `/macro` | — | **148 ms** |
| `/` | 31 188 ms | **448 – 1 004 ms** |

### Deux pièges rencontrés en chemin, et qui méritent d'être connus

**La déduplication s'est cassée en silence.** La première version lisait
`cache.getStale()` *avant* de construire la promesse. Cet `await` rend la main à la
boucle d'événements : trois appels concurrents franchissaient tous le garde `inFlight`
avant que le premier ne s'inscrive, et **trois requêtes partaient au lieu d'une**. Le
test `déduplique bien les appels concurrents` l'a attrapé immédiatement — sans lui, la
régression partait en production sous couvert d'une optimisation.

La consultation du périmé vit donc désormais **à l'intérieur** de la promesse
enregistrée. Il ne doit exister aucun `await` entre le test de `inFlight` et son `set`.

**Le rafraîchissement d'arrière-plan a sa propre table.** `refreshing` est séparée de
`inFlight`, et doit le rester : `inFlight` déduplique les appelants **qui attendent**,
`refreshing` déduplique un travail que **personne** n'attend. Les mêler ferait qu'un
appelant arrivant pendant un rafraîchissement recevrait la promesse du rafraîchissement —
et attendrait donc la source, ce que tout le mécanisme cherche à lui épargner.

Le `.catch()` sur la promesse d'arrière-plan n'est pas défensif mais **obligatoire** :
personne ne l'attend, un rejet non traité ferait tomber le processus Node entier.

### Garde-fou laissé derrière

`packages/data/src/cache.test.ts` — « sert la valeur périmée sans attendre, et rafraîchit
derrière ». Il ne mesure pas un temps absolu (ce qui dépendrait de la machine) mais la
seule chose qui compte : que le second appel **n'attend pas** le fournisseur lent.

---

## 2. Core Web Vitals — état mesuré

Build de production, cache constitué, viewport 1440×900 :

| page | LCP | CLS | tâches > 50 ms |
|---|---|---|---|
| `/` | 448 – 1 004 ms ✓ | 0 ✓ | 51 – 118 ms |
| `/marches` | 164 ms ✓ | 0 ✓ | 49 – 56 ms |
| `/macro` | 148 ms ✓ | 0 ✓ | 24 – 26 ms |
| `/actualites` | 716 ms ✓ | 0 ✓ | 24 – 28 ms |
| `/classements` | 96 ms ✓ | 0 ✓ | 33 – 38 ms |

Seuils Core Web Vitals : LCP < 2 500 ms, CLS < 0,1.

**Le CLS mérite d'être souligné : il est à zéro.** Ce n'est pas un hasard mais le
résultat d'une pratique déjà en place avant ce chantier — chaque `<Suspense>` porte un
substitut dont la hauteur approche celle du contenu réel (`SectionSkeleton`,
`HeatmapSkeleton`, `MoversSkeleton`). Un substitut plus court ferait sauter tout le bas
de la page à l'arrivée des données. **Ne pas retirer ces hauteurs.**

---

## 3. Base de données — auditée, rien à corriger

Vérification complète du schéma (`packages/db/src/schema.ts`) contre les migrations
appliquées (`packages/db/migrations/*.sql`).

**Onze index déclarés, onze présents en migration.** Aucune dérive, aucun index manquant :

| table | index | couvre |
|---|---|---|
| `watchlist_items` | `watchlist_user_list_asset_idx` (unique), `watchlist_user_idx` | unicité par liste, listage par utilisateur daté |
| `price_alerts` | `alerts_active_idx`, `alerts_user_idx` | balayage du planificateur (actif + actif ciblé), listage utilisateur |
| `saved_screens` | `screens_user_name_idx` (unique), `screens_user_idx` | unicité du nom, listage daté |
| `accounts` | `accounts_email_idx` (unique) | connexion par courriel |
| `login_codes` | `login_codes_email_idx` | vérification du code à usage unique |
| `sessions` | `sessions_account_idx` | résolution de session |
| `news_articles` | `news_url_idx` (unique), `news_published_idx` | déduplication à l'insertion, filtre du calendrier |

Chaque index correspond à un motif de requête réel. Le plus notable est
`alerts_active_idx` sur `(active, asset_class, asset_id)` : c'est exactement l'ordre dont
la tâche planifiée a besoin, et un index sur `active` seul aurait laissé un balayage.

**Aucune requête N+1 relevée** : la couche de données n'itère pas de requêtes par ligne.
Le point qui y ressemblait — l'adaptateur Yahoo, qui construit un classement symbole par
symbole — est une contrainte de la source et non un défaut de code ; il est traité par le
cache partagé (point 5).

---

## 4. Le préchargement des liens affamait la page qu'il devait accélérer

### Ce qui a été mesuré

Sur `/mouvements`, en build de production :

```
requêtes de préchargement émises : 23  (12 routes distinctes)
    /places/gdax   /places/binance   /places/kraken   /places/okex
    /places/bitget /places/gate      /places/bitstamp /places/bybit_spot
```

Huit rendus serveur complets de fiches de place, déclenchés **sans qu'aucun lien n'ait
été cliqué**.

### Pourquoi c'est coûteux ici, et pas sur un site ordinaire

Next précharge tout `<Link>` qui **entre dans le champ de vision** — comportement par
défaut, et **actif en production uniquement**. D'où un défaut totalement invisible en
développement : rien ne le signale tant qu'on n'a pas construit et mesuré.

Sur un site de contenu statique, précharger est presque gratuit. Ici, chaque lien de
liste mène à une **route dynamique dont le rendu interroge la source**. Et ces rendus
passent par le **même limiteur de débit** que la page en cours de lecture :

```
maxRequestsPerWindow: apiKey ? 25 : 8     // par minute
minIntervalMs:        apiKey ? 150 : 400
```

Sans clé, huit appels par minute. Un tableau de cinquante lignes qui en précharge
cinquante consomme donc plusieurs minutes de quota — **pour la page qu'on est en train de
regarder**. Le préchargement affamait le rendu courant.

### Le correctif

`prefetch={false}` sur les liens de **listes denses** uniquement :

| composant | lignes typiques |
|---|---|
| `MarketTable` | 50 |
| `AssetRow` (panneaux d'accueil) | ~30 au total |
| `RankingBoard` | 40 (4 palmarès × 10) |
| `ExploreTable` | 15 à 50 |
| `SpotExchangesPanel` | 8 |
| `DerivativeExchangesExplorer` | 10+ |

L'arbitrage est net : au plus **un** de ces liens sera cliqué. On échange une navigation
légèrement moins instantanée contre quarante-neuf rendus serveur épargnés à chaque
affichage.

⚠️ **Ne pas généraliser aux liens de navigation.** Le menu, l'en-tête et les liens
« Tout voir » gardent leur préchargement : ils sont peu nombreux, mènent à des pages que
le lecteur atteint réellement, et leur préchargement est ce qui rend la navigation fluide.
La distinction est « lien de liste » contre « lien de navigation », pas « tous les liens ».

### Après

```
requêtes de préchargement émises : 9  (5 routes distinctes)
```

Les huit rendus de fiches ont disparu ; ne restent que les liens de navigation.

Effet sur la page la plus touchée, au **premier** affichage (cache vide) :

| page | avant | après |
|---|---|---|
| `/mouvements` | 117 170 ms | **2 692 ms** |

Le gain est de deux ordres de grandeur, et il porte sur le cas le plus défavorable — celui
où le cache n'a rien à servir. C'est exactement le cas que le point 1 ne pouvait pas
couvrir.

---

## 5. Réseau — le cache partagé plutôt que des appels dupliqués

Le levier le plus efficace n'est pas de réduire le nombre d'appels mais de faire viser à
plusieurs pages **la même entrée de cache**.

`getRanking` fait entrer `perPage` dans sa clé. Une taille propre à chaque page ouvrirait
donc une entrée par page pour la même donnée — et chez Yahoo, où un classement se
construit symbole par symbole, ce serait **vingt appels sortants de plus par
régénération et par page**.

`RANKING_SIZE` (20) est donc déclaré une fois dans `ClassMoversGrid` et **importé** par :

- `CrossAssetMovers` (bloc « ce qui bouge » de l'accueil),
- `/classements`, pour ses cinq classes non-crypto.

Ces trois consommateurs partagent une entrée avec `/marches` et avec les pages de classe.
Sur cache chaud, les deux nouveaux blocs n'émettent **aucune requête sortante**.

⚠️ **Ne pas remplacer `RANKING_SIZE` par une valeur locale**, quelle que soit la tentation
d'ajuster le nombre de lignes affichées. Le nombre de lignes se règle à l'affichage, pas
à la requête.

Même principe ailleurs :

- `MarketSummaryHero` reçoit les devises **en argument** depuis la page, qui les charge
  déjà pour son ruban. Un second appel ajouterait de la latence et, surtout, une seconde
  échéance : les deux pourraient expirer différemment et afficher deux taux distincts sur
  le même écran.
- `CrossAssetMovers` reçoit l'univers crypto déjà chargé pour le tableau d'exploration.
- `getCryptoOverview` sert désormais 50 actifs au lieu de 10 — **sans appel
  supplémentaire** : les 100 étaient déjà téléchargés avec leurs courbes, et 90 étaient
  jetés.

---

## 6. Chargement et rendu

Déjà en place avant ce chantier, et vérifié :

- **Streaming par section.** Chaque classe d'actif de l'accueil est un composant serveur
  sous son propre `<Suspense>`. Les classes Yahoo échouent régulièrement ; isolées, une
  panne sur les ETF n'empêche ni les actions ni le reste de la page de s'afficher. Un
  `Promise.all` global ferait attendre la plus lente avant de rendre quoi que ce soit.
- **ISR.** `export const revalidate = 180`, aligné sur `CACHE_TTL_SECONDS` par un garde
  de typage qui fait échouer le typecheck si les deux divergent.
- **Échéance sur les devises** (`withDeadline`, 2 s) sur l'accueil seulement, là où la
  donnée n'alimente qu'un ruban. L'appel n'est pas annulé : il continue et remplit le
  cache pour la visite suivante.

Ajouté pendant ce chantier :

- `CrossAssetMovers` est sous `<Suspense>` — il est haut dans la page **sans** être
  bloquant, ce qui est la seule façon d'y placer quatre classes Yahoo.

---

## 7. Robustesse

- **Console navigateur : 0 message réel** sur 21 routes, en développement comme en
  production. Le seul message restant en développement est un artefact de
  `reactStrictMode` sur `/crypto/bitcoin` (WebSocket fermé pendant sa poignée de main par
  le double montage) — absent du build de production, vérifié.
- **Avertissement `MaxListenersExceededWarning` supprimé** — voir `MIGRATION.md`.
- **269 tests** verts, dont un nouveau sur le comportement du cache.
- **`lint` et `typecheck` sans erreur ni avertissement.**
- **Aucun débordement horizontal, aucune cible tactile sous 32 px** sur les six formats
  de `scripts/audit-responsive.mjs`.

---

## 8. Ce qui reste lent, et pourquoi ce n'est pas du code

**Le tout premier appel d'une clé reste bloquant, et doit le rester** : il n'y a alors
aucune valeur, même périmée, à servir. Attendre est la seule option honnête.

Or ce premier appel est aujourd'hui très lent, et la cause est mesurée :

```
[zenkuu:data] crypto:history:bitcoin:365:eur — ProviderError: Quota du fournisseur atteint
```

**`COINGECKO_API_KEY` est absente de `apps/web/.env.local`.** Sans clé, le plafond mesuré
est de cinq requêtes avant refus (429), alors que le seul rendu de l'accueil en consomme
cinq et chaque fiche d'actif deux de plus. Conséquences relevées sur un serveur au cache
vide :

| page | premier appel, avant | premier appel, après | en régime |
|---|---|---|---|
| `/mouvements` | 117 s | **2,7 s** | 2,8 s |
| `/heatmap` | 60 s | **2,7 s** | 2,7 s |
| `/actualites` | 97 s | 27 s | **2,9 s** |
| `/marches` | 21 s | 33 s | **2,7 s** |
| `/places` | > 120 s | > 120 s | **2,8 s** |
| `/crypto/bitcoin` | > 120 s | > 120 s | **7,6 s** |

*(Les temps « après » incluent 2,5 s d'attente délibérée dans la sonde de mesure : le
temps de réponse réel est de l'ordre de 150 à 350 ms.)*

En **régime établi — c'est-à-dire l'état d'un site en service — les 21 routes répondent,
20 d'entre elles sous 3 secondes, avec zéro message console.**

Les deux pages encore lentes au tout premier appel (`/places`, `/crypto/bitcoin`) sont
celles qui réclament le plus de clés distinctes. Elles ne peuvent pas être accélérées par
du code : le limiteur les sérialise volontairement pour protéger le quota, et il a raison
de le faire.

**Le palier Demo de CoinGecko est gratuit et sans carte bancaire**, et porte le plafond à
30 appels/minute ; l'application s'y adapte seule, aucun changement de code n'est
nécessaire. C'est le correctif de performance le plus rentable qui reste, et il ne
s'écrit pas en TypeScript.

---

## 9. Piège de mesure — à connaître avant de refaire ces relevés

Un balayage a d'abord rapporté **34 erreurs console** et des chunks en 404/500. Aucune
n'était réelle.

Cause : un `next build` avait été lancé **pendant qu'un serveur servait le même
`distDir`**. Le serveur continuait de servir un manifeste dont les fichiers venaient
d'être remplacés. `next.config.ts` documente exactement ce piège — « les symptômes, pages
en 404 et modules introuvables, ressemblent à des défauts applicatifs » — et c'est
précisément ce qui s'est produit.

Aggravant : le `kill` du serveur précédent avait échoué en silence, et le nouveau serveur
n'avait jamais démarré (`EADDRINUSE`, visible dans son seul journal).

**Protocole pour mesurer proprement :**

```bash
# 1. vérifier qu'aucun serveur ne tient le port
pgrep -af "next-server"

# 2. construire dans un dossier DÉDIÉ, jamais celui d'un serveur en cours
rm -rf apps/web/.next-verify
cd apps/web && ZENKUU_DIST_DIR=.next-verify bun x next build

# 3. démarrer, PUIS vérifier que le démarrage a réussi
ZENKUU_DIST_DIR=.next-verify bun x next start --port 3002 > prod.log 2>&1 &
grep -i EADDRINUSE prod.log     # doit être vide

# 4. mesurer DEUX fois : le premier passage constitue le cache, le second mesure
```

Après application de ce protocole : **zéro message console sur 21 routes**, et zéro chunk
en échec.

---

## Résumé des changements

| Fichier | Changement |
|---|---|
| `packages/data/src/cache.ts` | *stale-while-revalidate* + table `refreshing` séparée |
| `packages/data/src/cache.test.ts` | garde-fou sur le service du périmé sans attente |
| `packages/data/src/queries.ts` | `topByMarketCap` : 10 → 50 actifs, sans appel supplémentaire |
| `apps/web/components/market/MarketTable.tsx` | `prefetch={false}` sur les lignes (50 rendus épargnés) |
| `apps/web/components/market/RankingBoard.tsx` | idem (40 lignes) |
| `apps/web/components/market/SpotExchangesPanel.tsx` | idem (8 fiches de place) |
| `apps/web/components/market/DerivativeExchangesExplorer.tsx` | idem |
| `apps/web/components/home/AssetRow.tsx` | idem (panneaux d'accueil) |
| `apps/web/components/home/ExploreTable.tsx` | idem |
| `apps/web/components/home/ClassMoversGrid.tsx` | `RANKING_SIZE` exporté, pour partager la clé de cache |
| `apps/web/components/home/CrossAssetMovers.tsx` | palmarès multi-classes, sous `<Suspense>`, cache partagé |
| `apps/web/app/[locale]/page.tsx` | devises et univers crypto passés en argument plutôt que rechargés |

---

## État final vérifié

| Contrôle | Résultat |
|---|---|
| `bun run typecheck` | 4/4 paquets, 0 erreur |
| `bun run lint` | 0 erreur, 0 avertissement |
| `bun run build` | succès, 0 avertissement |
| `bun run test` | **269 tests**, tous verts |
| Console navigateur, 21 routes, production | **0 message** |
| Routes répondant en 200 | **21 / 21** |
| Routes sous 3 s en régime | **20 / 21** |
| LCP sur les 5 pages clés | **96 – 1 004 ms** (seuil : 2 500 ms) |
| CLS sur les 5 pages clés | **0** (seuil : 0,1) |
| Débordement horizontal, 6 formats | **0** |
| Cibles tactiles sous 32 px | **0** |
