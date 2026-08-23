# Migration Windows 11 → Linux (CachyOS)

Le projet a été commencé sous Windows 11, dans `C:\Users\ok\Documents\zenkuu`. Ce
document liste ce qu'il a fallu changer pour qu'il tourne nativement sous Linux, et
surtout **pourquoi** — un correctif dont on a perdu la raison est un correctif qu'on
défait par inadvertance six mois plus tard.

Le dépôt reste **portable dans les deux sens** : rien de ce qui suit ne suppose Linux.
Une reprise ultérieure sous Windows ou macOS fonctionne sans nouveau correctif.

---

## Ce qui n'a PAS eu à changer

Il faut le dire d'abord, parce que c'est l'essentiel et que ça oriente les recherches
futures : **aucun chemin en dur, aucune variable d'environnement Windows, aucun script
`.bat` ou `.ps1` n'existait dans le code applicatif.**

Vérifié par balayage sur `apps/`, `packages/` et `scripts/` : zéro occurrence de lettre
de lecteur, de `%USERPROFILE%`, de `%APPDATA%` ou de séparateur `\` employé comme
séparateur de chemin. Les scripts d'audit utilisaient déjà `path.join` et
`node:fs/promises`. Aucune collision de casse entre fichiers suivis (le piège classique
d'un dépôt né sur un système insensible à la casse), et aucun BOM UTF-8.

Autrement dit, la migration a porté sur l'**environnement** — artefacts, dépendances,
fins de ligne — et non sur le code.

---

## 1. Artefacts de compilation Windows — supprimés

`apps/web/.next/` et `apps/web/.next-verify/` contenaient des chemins absolus Windows
gelés à la compilation :

```
"__NEXT_DIST_DIR": "C:\\Users\\ok\\Documents\\zenkuu\\apps\\web\\.next\\dev"
"outputFileTracingRoot": "C:\\Users\\ok\\Documents\\zenkuu"
```

Ces dossiers sont des **caches**, déjà ignorés par `.gitignore`, mais un cache qui
pointe vers un système de fichiers inexistant produit des erreurs déroutantes — des
modules « introuvables » qui existent pourtant. Supprimés, avec `.turbo/` et
`apps/web/.turbo/` pour la même raison.

Supprimé aussi `desktop.ini`, laissé par l'explorateur Windows et qui référençait
`C:\Users\ok\Downloads\favicon_io\favicon.ico`. Sans effet sous Linux, mais sans objet
non plus.

> **À retenir :** après tout changement de machine, purger `.next*`, `.turbo` et
> `node_modules` avant de chercher plus loin. La moitié des symptômes viennent de là.

---

## 2. Fins de ligne — `.gitattributes` ajouté

**Le dépôt n'avait pas de `.gitattributes`.** 80 fichiers suivis étaient donc
enregistrés en CRLF, le reste en LF.

Ce n'est pas cosmétique :

- un `.mjs` exécutable dont la ligne shebang finit par CR n'est **pas lançable** sous
  Linux — le noyau cherche un interpréteur nommé `node\r` et rend `bad interpreter` ;
- les diffs deviennent illisibles dès qu'un éditeur réécrit un fichier dans l'autre
  convention : le fichier entier apparaît modifié, et la vraie modification disparaît
  dans le bruit.

Ajout de `.gitattributes` avec `* text=auto eol=lf`, plus les binaires marqués
explicitement (images, polices, PDF, `.db`) pour qu'aucune conversion ne les corrompe.
Les 80 fichiers de l'arbre de travail ont été convertis en LF dans la foulée.

`text=auto eol=lf` stocke **et extrait** en LF sur toute plateforme : c'est ce qui rend
la reprise sous Windows sans danger, plutôt que de simplement déplacer le problème.

---

## 3. Dépendances — réinstallation complète obligatoire

`node_modules/` était une installation Windows. Elle contenait :

- des shims `.exe` dans `node_modules/.bin/` (`tsc.exe`, `turbo.exe`, `vitest.exe`,
  `playwright.exe`) ;
- des binaires natifs `win32-x64-msvc` pour **Next SWC**, **libsql** (le client Turso),
  **lightningcss**, **Tailwind oxide**, **sharp**, **esbuild** et **rollup**.

Aucun ne s'exécute sous Linux. Un `bun install` par-dessus ne suffit pas — les paquets
optionnels par plateforme déjà présents ne sont pas réévalués. Il faut supprimer :

```bash
rm -rf node_modules apps/web/node_modules packages/*/node_modules
bun install
```

`bun.lock` référence déjà toutes les plateformes (les verrous Bun sont
multi-plateformes) : **aucune modification du lockfile n'est nécessaire**, et les
variantes `linux-x64-gnu` / `linux-x64-musl` s'installent seules.

Vérifié après coup : `@next+swc-linux-x64-gnu`, `@libsql+linux-x64-gnu`,
`lightningcss-linux-x64-gnu`, `@img+sharp-linux-x64` présents, plus aucun `.exe`.

Versions de l'environnement de reprise : **Bun 1.3.14** (celle exigée par
`packageManager`), **Node 26**.

---

## 4. Navigateurs Playwright — à installer une fois

`playwright` est une dépendance de développement (scripts `scripts/audit-*.mjs`), mais
les navigateurs se téléchargent hors de `node_modules` et ne migrent donc pas :

```bash
bunx playwright install chromium
```

`bunx playwright install-deps` **échoue sous CachyOS et c'est normal** : cette commande
installe des paquets `apt` et ne connaît pas Arch. Les bibliothèques requises sont déjà
présentes dans une installation de bureau standard — le navigateur se lance sans elle,
vérifié.

---

## 5. Deux correctifs de code

Les seules modifications de source qu'a exigées la mise au propre. Ni l'une ni l'autre
n'est spécifique à Linux : les deux existaient aussi sous Windows, mais l'objectif d'un
démarrage **sans aucun avertissement** les a mises au jour.

### `apps/web/instrumentation.ts` — plafond d'écouteurs

Node avertissait à chaque requête un peu composée :

```
MaxListenersExceededWarning: Possible EventEmitter memory leak detected.
11 close listeners added to [ServerResponse].
```

**Ce n'est pas une fuite.** Le SDK Sentry pose un écouteur `close` sur la
`ServerResponse` par span ouvert, et `sentry.server.config.ts` fixe
`tracesSampleRate` à **1 en développement** — volontairement, pour voir ce qu'on vient
d'écrire. Tout est donc tracé, le onzième écouteur arrive, Node crie. En production le
taux retombe à 10 % et le seuil n'est jamais approché : **artefact du mode
développement**.

Baisser l'échantillonnage ferait taire le message au prix de ce que ce réglage sert à
obtenir. Le plafond est donc relevé à 32 — assez pour Sentry, assez bas pour rester un
garde-fou utile (une vraie fuite se compte en centaines et avertira toujours).
`Infinity` supprimerait le message au lieu du problème.

Mesuré : 17 avertissements avant, **0 après**, et 0 dans un serveur lancé sans DSN
Sentry — ce qui confirme l'origine.

### `apps/web/components/asset/AssetLogo.tsx` — dimensions verrouillées

Next avertissait sur chaque ligne des tableaux de `/marches` et `/classements` :

> Image with src "…" has either width or height modified, but not the other.

`width` et `height` n'étaient posés qu'en **attributs** — c'est-à-dire les dimensions
intrinsèques déclarées à Next, pas le rendu. Dans une rangée flex (la moitié des
appelants), `align-items: stretch` étirait la hauteur sans toucher la largeur.
`shrink-0` ne couvre que l'axe principal et ne pouvait pas l'empêcher.

Correctif : `style={{ width: size, height: size }}`, **comme le faisaient déjà les
branches 3, 4 et 6 du même fichier**. La branche 1 était la seule à ne pas le faire.

---

## État vérifié après migration

| Contrôle | Résultat |
|---|---|
| `bun install` | 1110 paquets, binaires Linux, 12 s |
| `bun run typecheck` | 4/4 paquets, 0 erreur |
| `bun run lint` | 0 erreur, 0 avertissement |
| `bun run build` | succès, **0 avertissement** |
| `bun run test` | **268 tests, 24 fichiers, tous verts** |
| `bun run dev` | prêt en **251 ms** sur `http://localhost:3000` |
| Terminal en développement | **0 avertissement** |
| Console navigateur — 18 routes, desktop | **0 message** (hors StrictMode, ci-dessous) |
| Console navigateur — production, 6 routes | **0 message** |

### Le seul message restant, et pourquoi il est correct

En **développement uniquement**, `/crypto/bitcoin` affiche :

```
WebSocket connection to 'wss://stream.binance.com:9443/ws/btcusdt@miniTicker' failed:
WebSocket is closed before the connection is established.
```

`reactStrictMode: true` fait monter → démonter → remonter chaque composant. La
résiliation de `openStream` (`binance-market.ts`) ferme donc un socket encore en
`CONNECTING`, ce que le navigateur signale par ce message exact. **Le code fait ce
qu'il faut** — il vérifie `readyState` avant de fermer, précisément pour ce cas.

Confirmé par mesure : **0 message sur cette même page en build de production**, où
StrictMode ne double plus les montages. Rien à corriger.

---

## Deux points d'environnement à traiter (hors migration)

Découverts en parcourant le site, sans rapport avec le portage — mais bloquants pour
travailler confortablement :

### `COINGECKO_API_KEY` est absente de `apps/web/.env.local`

Conséquence mesurée : `/graphiques` met **58 secondes même à chaud**, et
`/crypto/bitcoin` 167 s au premier appel. Le journal est explicite :

```
[zenkuu:data] crypto:history:bitcoin:365:eur — ProviderError: Quota du fournisseur atteint
[zenkuu:data] crypto:history:tether:365:eur — secours Binance en échec : Actif « tether » hors du secours Binance
```

`getMarketCapBasket('eur', 365)` demande 365 jours d'historique par actif, CoinGecko
répond 429, et le secours Binance ne couvre pas les stablecoins. C'est **exactement** ce
que `.env.example` annonce sans clé (« une salve sans clé passe 5 fois puis se fait
refuser »). Le palier Demo est gratuit et sans carte bancaire, et l'application s'y
adapte seule.

### Trois variables Clerk mortes dans `apps/web/.env.local`

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY
NEXT_PUBLIC_CLERK_BILLING_ENABLED
```

`.env.example` documente le retrait de Clerk : les comptes sont désormais tenus par le
site lui-même (code à usage unique), et l'abonnement n'existe plus. Ces trois variables
ne sont plus lues par aucun code. Elles peuvent être supprimées — et les clés révoquées
chez Clerk, puisqu'elles traînent en clair dans un fichier local.

---

## Reprendre le projet sur une nouvelle machine

```bash
rm -rf node_modules apps/web/node_modules packages/*/node_modules
rm -rf apps/web/.next apps/web/.next-verify .turbo apps/web/.turbo
bun install
bunx playwright install chromium      # seulement pour les scripts d'audit
cp .env.example apps/web/.env.local   # puis renseigner au moins COINGECKO_API_KEY
bun run dev
```
