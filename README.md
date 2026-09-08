<div align="center">

# ZENKUU

**Suivi de marché multi-actifs, en français.**
Cryptomonnaies, actions, ETF, indices, devises et matières premières — une seule grammaire de lecture.

[![Next.js](https://img.shields.io/badge/Next.js-16.3-000000?logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19.2-087EA4?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.3-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Bun](https://img.shields.io/badge/Bun-1.3-FBF0DF?logo=bun&logoColor=black)](https://bun.sh)

</div>

---

## Lecture seule, par construction

ZENKUU **n'exécute aucun ordre**, ne détient aucun fonds, ne connecte aucun portefeuille
et n'intègre aucun tunnel d'achat. Les liens sortants vers des plateformes tierces sont
cités sans recommandation.

## Démarrer

```bash
bun install
bun run dev
```

→ [localhost:3000](http://localhost:3000). **Aucune variable d'environnement n'est requise.**

## Ce que le site couvre

| Espace | Contenu |
|---|---|
| **Accueil** | Mouvements, secteurs, tendances, actualités |
| **Fiches d'actif** | Crypto, actions, ETF, indices, devises, matières premières |
| **Marchés** | Classements, screener, comparateur, heatmap |
| **Analyse** | Graphiques, sentiment, perpétuels, macro, places de cotation |
| **Personnel** | Liste de suivi et alertes, sans compte obligatoire |
| **Outils** | Convertisseur, widgets intégrables |

Interface disponible en **13 langues**.

## Les deux règles qui expliquent le reste du code

**1. Zéro donnée inventée.** Aucun placeholder chiffré, aucun « 0 » de remplissage, aucun
graphique vide qui laisserait croire à une mesure. Quand une source manque, l'interface
le dit — c'est la raison d'être du composant `EmptyState`.

**2. Chaque fournisseur derrière un adaptateur.** Aucun appel réseau brut dans une page.
Les sources vivent dans `packages/data`, derrière des types communs, avec cache et
limiteur de débit — le quota gratuit de CoinGecko est la contrainte qui a le plus
façonné ce code.

## Structure

```
apps/web          Application Next.js (App Router)
packages/data     Adaptateurs de sources, cache, types
packages/ui       Composants et formateurs partagés
packages/db       Persistance (suivi, alertes)
packages/config   Configuration commune
```

## Scripts

```bash
bun run dev        # serveur de développement
bun run build      # build de production
bun run lint       # ESLint
bun run typecheck  # TypeScript
bun run test       # Vitest
```

> [!IMPORTANT]
> Ne pas lancer `bun run build` pendant que le serveur de développement tourne :
> le cache Turbopack est partagé et se corrompt.

## Sources

CoinGecko · Yahoo Finance · Binance · Frankfurter (BCE) · Coinpaprika · GeckoTerminal ·
Alternative.me · Banque mondiale · flux RSS

Toutes sans clé obligatoire. `COINGECKO_API_KEY` est facultative et relève seulement le
quota.

## Documentation

| Document | Contenu |
|---|---|
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Architecture détaillée, budget de requêtes, conventions |
| [`HEADER_STYLE_SEARCH_REPORT.md`](HEADER_STYLE_SEARCH_REPORT.md) | Relevés d'interface mesurés au navigateur |
| [`DUOLINGO_STYLE_TOKENS.md`](DUOLINGO_STYLE_TOKENS.md) | Direction esthétique et arbitrages |

## Licence

Projet privé. Les données affichées appartiennent à leurs sources respectives et sont
attribuées à l'endroit où elles apparaissent, conformément à leurs conditions
d'utilisation.
