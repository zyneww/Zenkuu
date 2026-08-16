# ZENKUU

Plateforme francophone de suivi de marché multi-actifs : cryptomonnaies, actions,
ETF, indices, devises et matières premières.

**Lecture seule, par construction.** ZENKUU n'exécute aucun ordre, ne détient aucun
fonds, ne connecte aucun portefeuille et n'intègre aucun tunnel d'achat. Les liens
sortants vers des plateformes tierces sont cités sans recommandation.

---

## Les deux règles qui expliquent le reste du code

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
inexistant — parce qu'elles appellent trois réactions différentes (état vide, message
d'attente, 404).

Conséquences visibles : pas de courbe de capitalisation mondiale sur longue période
(aucune source gratuite ne la publie, et la déduire de la dominance actuelle serait
une estimation présentée comme une mesure) ; pas de calendrier économique ; pas de
comparaison entre classes d'actifs dont les champs ne se correspondent pas.

### 2. Chaque fournisseur derrière un adaptateur

Aucun composant n'importe un module `providers/*`. Changer de source revient à écrire
un adaptateur qui satisfait `MarketDataProvider` et à l'inscrire au registre.

Les méthodes du contrat sont **optionnelles** parce que la disponibilité varie
réellement d'une source à l'autre : la BCE ne publie ni volume ni chandeliers. Un
module dont la méthode est absente n'est pas rendu — il n'est pas rempli de zéros.

---

## Sources

Toutes sans clé obligatoire. `COINGECKO_API_KEY` est facultative et relève seulement
le quota.

| Source | Couverture | Note |
|---|---|---|
| CoinGecko | Crypto : cours, capitalisations, secteurs, places, dérivés | Quota serré sans clé — le nombre d'appels par page est la contrainte de conception principale |
| Yahoo Finance | Actions, ETF, indices, matières premières | Univers fixe, un appel par symbole |
| Frankfurter (BCE) | Devises | Un taux par jour ouvré, pas d'intraday |
| Coinpaprika | Date de premier relevé des cryptomonnaies | Seule source gratuite de cette donnée |
| Alternative.me | Indice Fear & Greed | Publié une fois par jour |
| Flux RSS | Actualités | Fusion en tourniquet, jamais par tri chronologique global |

---

## Démarrer

```bash
bun install
bun run dev          # http://localhost:3000
```

Aucune variable d'environnement n'est requise pour lancer le site : sans clé, chaque
brique optionnelle se désactive proprement et l'annonce.

```bash
cp .env.example .env.local   # Turso (base) et Resend (courriel), tous deux facultatifs
```

`.env.local` n'est jamais versionné. Les clés d'API ne doivent jamais être commitées.

### Vérification

```bash
bun run typecheck
bun run test
bun run build
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

## Architecture

```
apps/web        Next.js (App Router), Tailwind CSS 4, Recharts
packages/data   Couche d'accès : types, cache, client HTTP, adaptateurs, requêtes
packages/db     Turso / libSQL + Drizzle — liste de suivi
packages/ui     Composants partagés et formatage
packages/config Configurations TypeScript et ESLint partagées
```

### Cache

Un seul TTL de référence — 300 s — aligné sur trois couches : le cache applicatif, le
`revalidate` des pages et celui du client HTTP. Les données lentes (secteurs,
sentiment, places de marché) ont des durées plus longues, volontairement décalées pour
que tout le cache n'expire pas au même instant.

**La taille de page entre dans la clé de cache.** Deux pages qui demandent le même
classement avec des tailles différentes ouvrent deux entrées et paient deux fois — ce
qui, chez un fournisseur qui construit un classement symbole par symbole, se compte en
dizaines de requêtes sortantes. Les tailles sont donc alignées entre pages.

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
