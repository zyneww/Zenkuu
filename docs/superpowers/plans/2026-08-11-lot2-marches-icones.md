# Lot 2 — Marchés : identité, icônes, bandeaux, fiches

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Donner à chaque actif une identité visuelle et descriptive — vrai logo, emoji de famille, secteur, pays, place — et rapprocher les pages de classement de la densité de CoinGecko.

**Architecture:** L'identité des actifs non-crypto est ajoutée à `yahoo-universe.ts`, qui porte déjà leur liste : une table parallèle divergerait au premier ajout de valeur. Un composant `AssetLogo` unique remplace les rendus d'icônes dispersés, avec une branche par classe et un repli commun. Les pages de classement gagnent un bandeau paramétré par classe qui n'affiche que des données réellement disponibles.

**Tech Stack:** Next.js 16, React 19, Tailwind 4, TypeScript, vitest 4.

**Spec de référence:** `docs/superpowers/specs/2026-08-11-refonte-header-marches-actualites-design.md` §5

## Global Constraints

- **§5 — jamais de donnée inventée.** Un champ absent est rendu comme absent (module masqué), jamais comme 0 ni comme « — » qui suggérerait une valeur nulle.
- **§7 — aucune référence à un achat, une vente ou un ordre.**
- **Aucune valeur hexadécimale dans un composant** : les couleurs passent par les jetons de `globals.css`.
- **Aucun plafond de largeur dans un composant** : `.shell` / `.shell-bleed` sont les seuls porteurs de largeur (lot 1).
- **Une source sans clé est DÉSACTIVÉE, pas simulée** : le module concerné disparaît ou retombe sur un repli explicite.
- **Vérifications** : `bun run typecheck`, `bun run lint`, `bun run test` depuis la racine.
- **L'utilisateur commite lui-même** — ne jamais lancer `git add` ni `git commit`.

---

## Découvertes d'exploration qui façonnent ce plan

1. **`packages/data/src/providers/yahoo-universe.ts` porte déjà la liste** des 18 actions, 10 ETF, 12 matières premières et 10 indices, avec `symbol` et `name`. La spec prévoyait un fichier `asset-identity.ts` séparé : ce serait deux listes des mêmes actifs à synchroniser à la main. On étend `UniverseEntry`.

2. **`AssetLogo` existe déjà**, dans `apps/web/components/AssetTile.tsx`, et est consommé par `MarketTable`. Il n'y a donc pas à créer un composant mais à en déplacer un et à l'enrichir.

3. **Le bug « AAP »** vient de `AssetTile.tsx:55` (`asset.symbol.slice(0, 3)`) et de `SearchOverlay.tsx:327`.

4. **`AssetMetricRail` couvre déjà** les performances multi-périodes et l'amplitude 52 semaines pour toutes les classes, via le registre `lib/asset-metrics.ts`. La spec prévoyait de les construire : elles existent. Seuls manquent le bloc d'identité et les fondamentaux.

---

## File Structure

| Fichier | Rôle | Action |
|---|---|---|
| `packages/data/src/providers/yahoo-universe.ts` | liste + identité des actifs non-crypto | Modifier |
| `packages/data/src/asset-identity.test.ts` | tests de cohérence de la table | **Créer** |
| `apps/web/components/asset/AssetLogo.tsx` | rendu d'icône unique, une branche par classe | **Créer** |
| `apps/web/components/asset/monogram.ts` | calcul du monogramme, pur | **Créer** |
| `apps/web/components/asset/monogram.test.ts` | tests du monogramme | **Créer** |
| `apps/web/components/AssetTile.tsx` | retire son `AssetLogo` local, importe le nouveau | Modifier |
| `apps/web/components/search/SearchOverlay.tsx` | utilise le monogramme partagé | Modifier |
| `apps/web/components/market/MarketHighlights.tsx` | bandeau de cartes par classe | **Créer** |
| `apps/web/components/market/MarketPageView.tsx` | monte le bandeau | Modifier |
| `apps/web/components/asset/AssetIdentity.tsx` | bloc secteur/pays/place/devise | **Créer** |
| `apps/web/components/asset/AssetPageView.tsx` | monte le bloc d'identité | Modifier |

---

## Task 1 : Identité des actifs dans l'univers Yahoo

**Files:**
- Modify: `packages/data/src/providers/yahoo-universe.ts`
- Test: `packages/data/src/asset-identity.test.ts`

**Interfaces:**
- Produces :
  - `interface UniverseEntry` étendue de `domain?`, `sector?`, `country?`, `exchange?`, `family?`, `emoji?`
  - `type CommodityFamily = 'precious' | 'industrial' | 'energy' | 'agricultural'`
  - `function findUniverseEntryBySymbol(symbol: string): UniverseEntry | undefined`

**Contexte.** Ce fichier est déjà la source de vérité des actifs non-crypto. On lui ajoute ce qui manque pour afficher un logo (le domaine de l'entreprise), un emoji (la famille d'une matière première) et un bloc descriptif (secteur, pays, place).

Le `domain` sert à construire l'URL du logo : les fournisseurs de logos indexent par domaine et non par ticker, parce qu'un ticker n'est unique qu'au sein d'une place — `SAN` est Sanofi à Paris et Banco Santander à Madrid.

- [ ] **Step 1 : Écrire les tests de cohérence**

Créer `packages/data/src/asset-identity.test.ts` :

```ts
import { describe, expect, it } from 'vitest'

import { YAHOO_UNIVERSE, findUniverseEntryBySymbol, toSlug } from './providers/yahoo-universe'

const TOUS = Object.values(YAHOO_UNIVERSE).flat()

describe('univers Yahoo', () => {
  it('donne un identifiant d’URL unique à chaque actif', () => {
    const slugs = TOUS.map((entry) => toSlug(entry.symbol))
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  /*
   * Le domaine porte le logo. Une action sans domaine retombe sur un monogramme,
   * ce qui est acceptable ; une action avec un domaine MAL FORMÉ produirait une
   * requête vers une adresse inexistante à chaque rendu de ligne.
   */
  it('n’accepte que des domaines nus, sans protocole ni chemin', () => {
    for (const entry of [...YAHOO_UNIVERSE.stock, ...YAHOO_UNIVERSE.etf]) {
      if (!entry.domain) continue
      expect(entry.domain, `${entry.symbol}`).toMatch(/^[a-z0-9-]+(\.[a-z0-9-]+)+$/)
    }
  })

  /*
   * Une matière première SANS emoji tomberait sur un monogramme construit depuis
   * « GC=F » — illisible. L'emoji est donc obligatoire pour cette classe seule.
   */
  it('donne un emoji et une famille à chaque matière première', () => {
    for (const entry of YAHOO_UNIVERSE.commodity) {
      expect(entry.emoji, `${entry.symbol} sans emoji`).toBeTruthy()
      expect(entry.family, `${entry.symbol} sans famille`).toBeTruthy()
    }
  })

  it('retrouve une entrée par son symbole exact', () => {
    expect(findUniverseEntryBySymbol('AAPL')?.name).toBe('Apple')
    expect(findUniverseEntryBySymbol('GC=F')?.emoji).toBeTruthy()
  })

  it('ne retrouve rien pour un symbole inconnu', () => {
    expect(findUniverseEntryBySymbol('INEXISTANT')).toBeUndefined()
  })
})
```

- [ ] **Step 2 : Lancer les tests, vérifier l'échec**

```bash
bunx vitest run packages/data/src/asset-identity.test.ts
```

Attendu : ÉCHEC — `findUniverseEntryBySymbol` n'existe pas.

- [ ] **Step 3 : Étendre le type et la table**

Voir le corps complet dans l'implémentation. Points fixés :
- `domain` pour les 18 actions et 10 ETF (émetteur pour un ETF : `SPY` → `ssga.com`).
- `emoji` + `family` pour les 12 matières premières.
- `sector`, `country`, `exchange` pour actions et ETF.
- `findUniverseEntryBySymbol` parcourt les quatre classes.

- [ ] **Step 4 : Tests au vert**

```bash
bunx vitest run packages/data/src/asset-identity.test.ts
```

---

## Task 2 : Monogramme correct et `AssetLogo` unifié

**Files:**
- Create: `apps/web/components/asset/monogram.ts`, `monogram.test.ts`, `AssetLogo.tsx`
- Modify: `apps/web/components/AssetTile.tsx`, `apps/web/components/search/SearchOverlay.tsx`

**Interfaces:**
- Consumes : `UniverseEntry`, `findUniverseEntryBySymbol` (tâche 1)
- Produces :
  - `function monogram(name: string, symbol: string): string`
  - `function AssetLogo(props: { asset: …; size?: number }): JSX.Element`

**Contexte.** `AssetTile.tsx:55` calcule le monogramme par `symbol.slice(0, 3)` : `AAPL` devient `AAP`, un fragment de ticker qui ne désigne rien. Un monogramme se prend sur le **nom**.

Le cas des paires de devises est déjà traité dans le code existant et doit être conservé : pour `EUR/USD`, c'est la contrepartie qui distingue les lignes, sans quoi toutes les paires en euro afficheraient « EUR ».

- [ ] **Step 1 : Tests du monogramme**

```ts
import { describe, expect, it } from 'vitest'

import { monogram } from './monogram'

describe('monogram', () => {
  it('prend les deux premières lettres d’un nom en un mot', () => {
    expect(monogram('Apple', 'AAPL')).toBe('Ap')
  })

  it('prend les initiales des deux premiers mots', () => {
    expect(monogram('Meta Platforms', 'META')).toBe('MP')
    expect(monogram('JPMorgan Chase', 'JPM')).toBe('JC')
  })

  /* Le défaut corrigé : `slice(0, 3)` donnait « AAP » pour Apple. */
  it('ne tronque jamais le symbole à trois lettres', () => {
    expect(monogram('Apple', 'AAPL')).not.toBe('AAP')
  })

  /* Pour une paire, c'est la CONTREPARTIE qui distingue les lignes : toutes les
     paires en euro afficheraient sinon « EU ». */
  it('prend la contrepartie d’une paire de devises', () => {
    expect(monogram('Euro / Dollar', 'EUR/USD')).toBe('USD')
    expect(monogram('Euro / Livre', 'EUR/GBP')).toBe('GBP')
  })

  it('retombe sur le symbole quand le nom est vide', () => {
    expect(monogram('', 'BTC')).toBe('BT')
  })

  it('ignore la ponctuation en tête de nom', () => {
    expect(monogram('L’Oréal', 'OR.PA')).toBe('LO')
  })
})
```

- [ ] **Step 2 : Vérifier l'échec, puis implémenter, puis vérifier le succès**

- [ ] **Step 3 : `AssetLogo` avec une branche par classe**

Ordre de résolution, du plus spécifique au plus général :
1. `asset.image` fourni par la source (crypto) → `<Image>`
2. classe `commodity` → emoji de l'univers, dans une pastille teintée par famille
3. classe `stock` / `etf` et `domain` connu et `LOGO_API_KEY` présente → logo distant
4. sinon → monogramme

- [ ] **Step 4 : Remplacer les deux consommateurs**

`AssetTile.tsx` réexporte `AssetLogo` depuis le nouveau module pour ne pas casser `MarketTable`, puis l'import est corrigé. `SearchOverlay.tsx:327` utilise `monogram`.

---

## Task 3 : Bandeau des pages de classement

**Files:**
- Create: `apps/web/components/market/MarketHighlights.tsx`
- Modify: `apps/web/components/market/MarketPageView.tsx`

**Contexte.** CoinGecko place trois cartes au-dessus de son tableau. Nos sources ne fournissent pas les mêmes données selon la classe : Yahoo ne publie ni capitalisation ni volume fiable pour les actions. Chaque carte n'affiche donc que ce qui existe, et le bandeau se compose par classe.

Comme `MarketStatsStrip`, le bandeau se calcule **sur les actifs déjà chargés** : aucun appel réseau supplémentaire, et la portée est annoncée.

| Classe | Carte 1 | Carte 2 | Carte 3 |
|---|---|---|---|
| `crypto` | capitalisation cumulée + variation | tendances | plus fortes hausses |
| `stock`, `etf`, `index` | variation moyenne | plus forts volumes | plus fortes hausses |
| `commodity` | métaux précieux | énergie | plus fortes hausses |
| `forex` | paires de référence | variation moyenne | plus fortes variations |

---

## Task 4 : Bloc d'identité sur la fiche d'actif

**Files:**
- Create: `apps/web/components/asset/AssetIdentity.tsx`
- Modify: `apps/web/components/asset/AssetPageView.tsx`

**Contexte.** La fiche crypto affiche description et fiche technique sous les onglets. Les actions n'ont ni l'une ni l'autre chez Yahoo — la zone est vide. Le bloc d'identité la remplit avec secteur, pays, place de cotation et devise, tirés de la table de la tâche 1.

Il se monte au même endroit que `AssetTechSheet` et **disparaît entièrement** si l'actif est absent de la table.

---

## Vérification finale

- [ ] `bun run typecheck && bun run lint && bun run test` — succès
- [ ] `/actions` : logos réels ou monogrammes corrects, jamais « AAP »
- [ ] `/matieres-premieres` : emoji en pastille teintée par famille
- [ ] `/etf`, `/indices`, `/devises` : bandeau cohérent, aucune carte vide
- [ ] Fiche d'une action : bloc d'identité présent
- [ ] Fiche d'une crypto : bloc d'identité absent (pas dans la table), sans trou visuel
