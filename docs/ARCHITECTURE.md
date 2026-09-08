# ZENKUU — architecture

> Document de référence. Pour une présentation courte du projet et le démarrage rapide,
> voir le [README](../README.md).

**Plateforme francophone de suivi de marché multi-actifs** — cryptomonnaies, actions,
ETF, indices, devises et matières premières, sur une même grammaire de lecture.

**Lecture seule, par construction.** ZENKUU n'exécute aucun ordre, ne détient aucun
fonds, ne connecte aucun portefeuille et n'intègre aucun tunnel d'achat. Les liens
sortants vers des plateformes tierces sont cités sans recommandation.

```bash
bun install
bun run dev          # http://localhost:3000
```

Aucune variable d'environnement n'est requise pour lancer le site.

---

## Table des matières

- [Les deux règles qui expliquent le reste du code](#les-deux-règles-qui-expliquent-le-reste-du-code)
- [Ce que le site montre](#ce-que-le-site-montre)
- [La fiche d'actif, en détail](#la-fiche-dactif-en-détail)
- [Sources](#sources)
- [Le budget de requêtes](#le-budget-de-requêtes)
- [Architecture](#architecture)
- [Interface](#interface)
- [Internationalisation](#internationalisation)
- [Démarrer](#démarrer)
- [Vérifier](#vérifier)
- [Conventions du dépôt](#conventions-du-dépôt)
- [Ce que ZENKUU ne fera pas](#ce-que-zenkuu-ne-fera-pas)

---

## Les deux règles qui expliquent le reste du code

Tout le reste — la forme des types, le découpage des paquets, ce qui est absent du
site — découle de ces deux règles. Les lire d'abord fait gagner du temps.

### 1. Zéro donnée inventée

Aucune valeur affichée n'est estimée, interpolée ou comblée. Une donnée absente est
rendue **comme absente** — jamais comme un zéro, jamais comme un tiret qui passerait
pour une valeur.

Cette règle est appliquée par le TYPE, pas par la discipline :

```ts
type DataResult<T> =
  | { ok: true; data: T; source: DataSource }
  | { ok: false; kind: 'unconfigured' | 'error' | 'notFound'; reason: string; source: DataSource | null }
```

Une page ne peut pas afficher un chiffre sans avoir traité le cas de son absence, et
`kind` distingue les trois causes — source non configurée, panne, identifiant
inexistant — parce qu'elles appellent trois réactions différentes : état vide, message
d'attente, 404.

**Le corollaire visuel : une section sans donnée n'existe pas.** Elle ne s'affiche pas
vide en annonçant son propre vide. `AssetPools`, `AssetHoldings` et `AssetOwnership`
se retirent tous de l'arbre quand leur source n'a rien livré — un encadré « non publié
par nos sources » se lit comme une panne, jamais comme une position éditoriale.

**Ce que cette règle coûte, en clair.** Pas de courbe de capitalisation mondiale sur
longue période : aucune source gratuite ne la publie, et la déduire de la dominance
actuelle serait une estimation présentée comme une mesure. Pas de calendrier
économique. Pas de comparaison entre classes d'actifs dont les champs ne se
correspondent pas.

**La seule entorse apparente, et pourquoi elle n'en est pas une.** Le cache sert une
valeur PÉRIMÉE plutôt que d'attendre une source lente (voir
[Le budget de requêtes](#le-budget-de-requêtes)). Rien n'y est fabriqué : c'est une
valeur réellement lue chez la source, à un instant daté, et chaque module affiche cet
horodatage. La règle interdit d'inventer un chiffre, pas d'en montrer un ancien en le
datant.

### 2. Chaque fournisseur derrière un adaptateur

Aucun composant n'importe un module `providers/*`. Changer de source revient à écrire
un adaptateur qui satisfait `MarketDataProvider` et à l'inscrire au registre.

Les méthodes du contrat sont **optionnelles** parce que la disponibilité varie
réellement d'une source à l'autre : la BCE ne publie ni volume ni chandeliers. Un
module dont la méthode est absente n'est pas rendu — il n'est pas rempli de zéros.

C'est cette règle qui a permis de changer trois fois de bibliothèque de tracé sans
toucher à une seule page.

---

## Ce que le site montre

| Espace | Ce qu'on y trouve |
|---|---|
| **Accueil** | Tableau de bord d'analyses — mouvements, secteurs, tendances, actualités |
| **Fiches d'actif** | `/crypto/…`, `/actions/…`, `/etf/…`, `/indices/…`, `/devises/…`, `/matieres-premieres/…` |
| **Marchés** | Classements par classe, screener, comparateur, heatmap |
| **Analyse** | Graphiques, sentiment, perpétuels, macro, places de cotation |
| **Actualités** | Fil agrégé, blog, nouvelles cotations |
| **Personnel** | Liste de suivi et alertes — sans compte obligatoire, sous cookie anonyme |
| **Outils** | Convertisseur, widgets intégrables, embed |

---

## La fiche d'actif, en détail

C'est la page la plus travaillée du site et celle où les arbitrages se voient. Elle est
**unique** — cinq sections empilées, pas cinq onglets exclusifs — pour une raison
concrète : cliquer « Places » faisait auparavant disparaître le graphique, qui est la
raison d'être de la page.

**Une seule bande collante.** L'en-tête du site (64 px), puis une rangée de 48 px qui
porte le sommaire en permanence et RÉVÈLE l'identité de l'actif — logo, nom, code,
cours, variation — dès qu'elle se colle. Elle en portait deux jusqu'ici, soit 156 px de
chrome permanent au-dessus d'un graphique.

**Le cours tique, et le dit.** Le cours de l'en-tête et la fin de la courbe sont
poussés par un WebSocket Binance (~1 message/s). À chaque mouvement, le nombre
s'illumine brièvement — vert s'il monte, rouge s'il baisse, 600 ms, comparé au tic
précédent et non à l'ouverture.

**Le reste de la page se rafraîchit seul**, à la cadence du cache (voir plus bas), et
jamais dans un onglet caché. Un onglet laissé ouvert une heure n'affiche plus un
« Volume 24 h » d'il y a une heure.

**Le graphique** est piloté par amCharts 5, précédé d'un tracé SVG rendu par le serveur
— immédiat, indexable, sans JavaScript. Les deux écrivent **exactement** les mêmes
étiquettes d'axe (`formatAxisMoney`), sans quoi l'échelle sauterait à l'hydratation.

L'échelle des prix est la seule chose du site qui ne suive pas la locale : elle écrit
`$55.00` et non `55 $US`. C'est une convention de marché — CoinGecko, TradingView,
Bloomberg — pas un texte. L'infobulle, elle, garde le format français.

**Le bandeau de lecture suit le curseur** et revient au dernier relevé — vivant — dès
qu'on quitte le tracé.

**Deux filets verticaux** séparent les chiffres du contenu et le contenu de la colonne
d'actualités, laquelle ouvre sur une une en grand puis déroule le fil, logos des médias
compris.

---

## Sources

Toutes sans clé obligatoire. `COINGECKO_API_KEY` est facultative et relève seulement le
quota.

| Source | Couverture | Note |
|---|---|---|
| CoinGecko | Crypto : cours, capitalisations, secteurs, places, dérivés | Quota serré sans clé — la contrainte de conception principale |
| Yahoo Finance | Actions, ETF, indices, matières premières | Univers fixe, un appel par symbole |
| Binance | Cours en direct, bougies, carnet d'ordres | WebSocket depuis le navigateur du visiteur — ne touche pas notre quota |
| Frankfurter (BCE) | Devises | Un taux par jour ouvré, pas d'intraday |
| Coinpaprika | Date de premier relevé des cryptomonnaies | Seule source gratuite de cette donnée |
| GeckoTerminal | Pools de liquidité on-chain | Une chaîne interrogée par jeton, la plus profonde |
| Alternative.me | Indice Fear & Greed | Publié une fois par jour |
| Banque mondiale | Indicateurs macro | Annuel |
| Flux RSS | Actualités | Fusion en tourniquet, jamais par tri chronologique global |

---

## Le budget de requêtes

C'est la contrainte qui a le plus façonné ce code, et elle mérite d'être comprise avant
d'ajouter quoi que ce soit.

**Le quota est mesuré, pas lu dans une documentation.** Une salve de 40 requêtes sur
`/ping` chez CoinGecko sans clé passe 5 fois puis se fait refuser dès la sixième. Le
palier réel est donc bien plus serré que les 30/min annoncés. Le client HTTP se cale sur
l'observation : 8 requêtes par fenêtre et 400 ms d'écart minimum sans clé, 25 et 150 ms
avec.

**Un seul TTL de référence : `CACHE_TTL_SECONDS` = 180 s**, aligné sur trois couches —
le cache applicatif, le `revalidate` des pages et le rafraîchissement automatique des
fiches. Les données lentes (secteurs, sentiment, places) ont des durées plus longues,
volontairement décalées pour que tout n'expire pas au même instant.

**Le périmé est servi immédiatement, et rafraîchi derrière.** Le relevé qui a motivé ce
choix, sur build de production, en LCP :

| Page | À chaud | À froid (avant) |
|---|---|---|
| `/` | 536 ms | 31 188 ms |
| `/marches` | 196 ms | 19 652 ms |
| `/actualites` | 748 ms | 83 920 ms |

Le rapport est de cent à un, et il ne s'agissait pas d'un cas rare : avec un TTL de
180 s, chaque page redevenait froide toutes les trois minutes et le premier visiteur de
chaque fenêtre encaissait la totalité.

**Les appels concurrents sont dédupliqués** sur la clé de cache — sans quoi trois
visiteurs simultanés déclencheraient trois appels identiques.

**La taille de page entre dans la clé de cache.** Deux pages qui demandent le même
classement avec des tailles différentes ouvrent deux entrées et paient deux fois. Les
tailles sont donc alignées entre pages.

---

## Architecture

```
apps/web        Next.js 16 (App Router), Tailwind CSS 4, amCharts 5 + Recharts
packages/data   Types, cache, client HTTP à quota, adaptateurs, requêtes
packages/db     Turso / libSQL + Drizzle — liste de suivi et alertes
packages/ui     Composants et formatage partagés — zéro dépendance
packages/config Configurations TypeScript et ESLint partagées
```

**`packages/ui` n'a aucune dépendance de production**, et c'est délibéré : c'est le
paquet que tout le monde importe. Les composants qui ont besoin de primitives
(Radix, Base UI) vivent dans `apps/web/components/ui`.

**Deux bibliothèques de tracé, et ce n'est pas un accident.** amCharts 5 pilote le
graphique des fiches, parce que la référence visée dessine avec Highcharts et
qu'amCharts est ce qui s'en approche le plus — curseur, infobulle, formats d'axe,
étiquette de dernière valeur sont des primitives chez lui. Recharts couvre toutes les
autres figures du site.

> ⚠️ La marque « amCharts » sous le tracé n'est pas un oubli : la licence gratuite
> l'exige.

---

## Interface

Le socle est **shadcn/ui** (style `new-york`, primitives Radix), soit une soixantaine de
composants dans `apps/web/components/ui`, complété par des composants maison quand la
donnée financière l'exige (`ChangeBadge`, `MetricValue`, `ShareDonut`, `AssetLogo`…).

Le registre **ReUI** est branché dans `components.json` :

```bash
bunx --bun shadcn@latest add @reui/<composant>
```

Ses 21 composants sont libres d'usage ; les blocs et les Motion Icons demandent une
licence (`REUI_LICENSE_KEY` dans `.env.local`). En pratique, l'essentiel de son
catalogue recouvre ce que shadcn fournit déjà ici — n'y aller que pour ce qui manque
réellement.

**Un design system par jetons.** Aucune couleur en dur : `--color-up`, `--color-down`,
`--color-ink`, `--color-canvas`, `--color-border-subtle`… Les thèmes clair et sombre
redéfinissent les jetons, jamais les composants. `apps/web/app/palette.test.ts` vérifie
les contrastes.

---

## Internationalisation

Treize langues **réellement traduites** — fr, en, es, de, it, nl, pl, pt-BR, ru, tr, vi,
ja, zh — routées par `next-intl` en `localePrefix: 'as-needed'` : le français reste sur
`/crypto/bitcoin`, l'anglais passe par `/en/crypto/bitcoin`.

Le sélecteur en propose 34. Les 21 autres sont une **préférence enregistrée**, pas une
URL : ouvrir `/xx/…` sans messages servirait du texte français sous une URL étrangère,
que Google indexerait comme contenu dupliqué. Ajouter une langue = ajouter son code à
`TRANSLATED_LOCALES` ; routage, plan du site et `hreflang` s'en déduisent.

Ce qui dépend de l'horloge ou du fuseau du **lecteur** — « il y a 11 h »,
« Aujourd'hui », l'heure d'un point de courbe — est calculé côté client. Rendu par le
serveur, ce serait faux pour la moitié de la planète et provoquerait un écart
d'hydratation.

---

## Démarrer

```bash
bun install
bun run dev          # http://localhost:3000
```

Sans clé, chaque brique optionnelle se désactive proprement et l'annonce.

```bash
cp .env.example .env.local   # Turso (base) et Resend (courriel), tous deux facultatifs
```

`.env.local` n'est jamais versionné. **Les clés d'API ne doivent jamais être
commitées.**

| Variable | Effet en son absence |
|---|---|
| `COINGECKO_API_KEY` | Quota serré (8 req/fenêtre au lieu de 25) — le site fonctionne |
| `TURSO_*` | Liste de suivi et alertes désactivées, avec un état vide qui l'explique |
| `RESEND_API_KEY` | Alertes par courriel non envoyées |
| `YOUTUBE_API_KEY` | Sections vidéo d'« Apprendre » vides — **lue au build** |

---

## Vérifier

```bash
bun run typecheck    # tsc --noEmit sur les 5 paquets
bun run lint         # ESLint, compilateur React compris
bun run test         # vitest — 336 tests
bun run build
```

Trois audits maison, à lancer après une retouche de mise en page :

```bash
node scripts/audit-overflow.mjs     # débordements horizontaux
node scripts/audit-responsive.mjs   # points de rupture
node scripts/audit-liens.mjs        # liens morts
```

### Purger les caches

```bash
bun run clean              # .turbo, .next et dist de tous les paquets
bun run clean --keep-next  # caches Turborepo seuls — sans gêner un serveur de dev
```

**À faire périodiquement.** `.turbo/cache` reçoit une entrée par exécution de tâche et
Turborepo n'en supprime jamais aucune — il n'existe pas d'option de purge automatique.
Sur ce dépôt, il avait atteint **32 Go pour 387 entrées** avant qu'on y regarde. Le
dossier étant ignoré par git, rien ne le signale.

`node_modules` n'est jamais supprimé, même par `bun run clean` : sa réinstallation
dépend du réseau, alors que tout le reste se régénère hors ligne.

---

## Conventions du dépôt

**Les commentaires expliquent POURQUOI, pas quoi.** Ce dépôt en compte beaucoup, et
c'est assumé : un commentaire qui paraphrase le code est du bruit, mais un commentaire
qui raconte ce qui a été essayé avant — et pourquoi ça n'a pas tenu — évite qu'on le
réessaie. Plusieurs fichiers portent le relevé au navigateur qui a tranché la décision.

**Les messages de commit décrivent un changement de comportement**, pas un diff :
« L'accueil devient un tableau de bord d'analyses, et non plus une liste de listes ».

**Une logique non triviale laisse un test derrière elle** — le plus petit qui échoue si
elle casse. Pas de framework, pas de fixtures. Corollaire pratique : elle vit dans un
`.ts` et non dans un `.tsx`, dont le JSX n'est pas transformé par le lanceur de tests
(c'est pourquoi `nearestRow` habite `chart-kinds.ts` et non le composant qui l'appelle).

---

## Ce que ZENKUU ne fera pas

- Exécuter, router ou simuler un ordre
- Connecter un portefeuille, détenir ou transférer des fonds
- Donner un conseil d'investissement personnalisé
- Afficher un chiffre dont la source n'est pas citable
- Annoncer une fonctionnalité qu'aucune source ne permet de livrer

---

## Licence

Projet privé. Les données affichées appartiennent à leurs sources respectives et sont
attribuées à l'endroit où elles apparaissent, conformément à leurs conditions
d'utilisation.
