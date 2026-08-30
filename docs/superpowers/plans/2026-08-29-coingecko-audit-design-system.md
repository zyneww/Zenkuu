# Sous-projet A — Audit CoinGecko et système de dessin · plan d'implémentation

> **Pour les agents d'exécution :** SOUS-COMPÉTENCE REQUISE — utiliser
> `superpowers:subagent-driven-development` (recommandé) ou
> `superpowers:executing-plans` pour dérouler ce plan tâche par tâche. Les étapes
> utilisent la syntaxe à cases (`- [ ]`) pour le suivi.

**But :** produire l'audit complet de toutes les pages de CoinGecko et le système de
dessin structurel qui en découle, en posant les jetons correspondants, **sans qu'un seul
pixel du site ZENKUU ne bouge**.

**Architecture :** deux documents à la racine du dépôt (`COINGECKO_AUDIT.md`,
`DESIGN_SYSTEM.md`), une couche de jetons `--v2-*` additive et inerte dans
`globals.css`, et un vérificateur qui transforme « l'audit est complet » d'un jugement en
une commande. L'audit se déroule page par page, un commit par page, de sorte qu'une
interruption ne coûte jamais plus que la page en cours.

**Outils :** MCP `chrome-devtools` (captures sur disque et styles calculés), MCP
`claude-in-chrome` (le Chrome réel de l'exploitant, pour les seules pages exigeant sa
session CoinGecko), Node 20+, vitest, Playwright via les scripts d'audit existants,
Tailwind 4, Next 16. Voir « Outillage navigateur » pour la répartition.

**Spec :** [`docs/superpowers/specs/2026-08-29-coingecko-audit-design-system-design.md`](../specs/2026-08-29-coingecko-audit-design-system-design.md)

**Branche :** `migration-coingecko`

## Contraintes globales

Elles s'appliquent implicitement à **chaque** tâche de ce plan.

- **Zéro donnée factice, mock ou placeholder, à aucun stade** (dev, staging, prod). Une
  absence se dit ; elle ne se comble pas.
- **Aucun signal d'achat ou de vente.** Le site décrit ce qui a été observé.
- **Les deux thèmes à chaque écran.** Un composant regardé seulement en sombre n'est pas fini.
- **Plancher typographique 11 px, cible tactile 32 px**, sauf unités de `viewBox` SVG.
- **Tous les textes en français**, rédigés — jamais traduits par copier-coller.
- **Aucun identifiant n'est saisi dans le navigateur**, à aucun moment. L'observation des
  pages de compte se fait dans la session CoinGecko déjà ouverte par l'exploitant.
- **Rien de CoinGecko n'est copié** : ni feuille de style, ni SVG, ni composant
  JavaScript, ni texte, ni logo, ni mascotte, ni illustration. Seules des *mesures* sont
  relevées, et ce qui est écrit est reconstruit.
- **Les jetons nouveaux portent le préfixe `--v2-`.** Aucun jeton `--v2-color-*` :
  les couleurs restent celles de ZENKUU, la couche `--v2-*` ne porte que de la structure.
- **Un commit par page auditée.**
- **Pas de `next build` tant que le serveur de développement tourne** — cela corrompt le
  cache Turbopack et met tout le site en erreur 500, y compris avec un `distDir` distinct.
- **Aucun second serveur de développement n'est démarré** : celui du port 3000 tourne déjà.

## Outillage navigateur — répartition des rôles

**Le MCP `chrome-devtools` n'est plus employé.** Il partage un unique profil Chrome
(`~/.cache/chrome-devtools-mcp/chrome-profile`, sans `--isolated`) entre toutes les
sessions de la machine : deux sessions y entrent en collision sur le verrou de profil,
et rien ne permet à un agent de distinguer « son » processus de celui d'autrui. Un
sous-agent a tenté de dénouer ce conflit et a tué tous les processus du serveur, ceux
des autres sessions compris. Le problème est structurel, pas accidentel, et il reste
68 pages pendant lesquelles il se reproduirait.

| | `scripts/audit-coingecko-page.mjs` | `claude-in-chrome` |
|---|---|---|
| Moteur | Chromium via Playwright, **profil isolé par exécution** | le Chrome réel de l'exploitant |
| Session CoinGecko | non | **oui** |
| Capture sur disque | **oui**, nativement | non — l'image revient dans la réponse |
| `getComputedStyle` | **oui**, en lot, vers un JSON | oui (`javascript_tool`) |
| Coût pour 68 pages | une commande par page | un aller-retour d'outil par action |

**Règle :** l'outil de relevé du dépôt (tâche 3bis) fait tout le travail — captures et
mesures — sur les pages publiques et sur ZENKUU en local. `claude-in-chrome` n'est employé
que pour les pages qui exigent la session CoinGecko de l'exploitant.

Pour ces pages-là, la capture de référence **ne peut pas être écrite sur disque**. L'entrée
d'audit consigne alors l'observation en texte et le dit dans « Notes » : une capture
manquante qu'on signale vaut mieux qu'une capture d'une page déconnectée qu'on ferait
passer pour la page connectée.

⚠️ **Aucune commande qui tue un processus** (`pkill`, `kill`, `killall`) ni qui supprime un
fichier de verrou système, dans aucune tâche. Un conflit d'outillage se remonte à
l'exploitant ; il ne se résout pas à l'aveugle sur des processus qui peuvent appartenir à
quelqu'un d'autre.

---

### Tâche 1 : Préparer le terrain et figer la preuve d'invariance

Le critère d'achèvement du sous-projet A est que le site soit **inchangé**. Cette preuve
ne peut être constituée qu'avant que quoi que ce soit ne bouge, donc en premier.

**Fichiers :**
- Modifier : `.gitignore` (fin de fichier)
- Créer : `docs/references/coingecko/` (dossier de travail, non versionné)
- Créer : `docs/references/zenkuu-avant/` (captures de référence, non versionnées)

Aucun fichier gardien : les dossiers étant exclus, un `.gardien` le serait aussi et ne
ferait pas exister l'arborescence dans Git. `mkdir -p` à l'étape 2 suffit — ces dossiers
n'ont besoin d'exister que sur le disque de qui exécute.

**Interfaces :**
- Produit : le dossier `docs/references/coingecko/<slug>/` où toutes les tâches suivantes
  écrivent leurs captures ; les captures d'invariance relues par la tâche 11.

- [ ] **Étape 1 : Ajouter la règle d'exclusion**

Ajouter à la fin de `.gitignore` :

```gitignore
# Captures de référence de CoinGecko (sous-projet A) et état d'avant-migration de
# ZENKUU.
#
# Ce sont des outils de travail, pas des livrables. Trois raisons de ne pas les
# versionner : ce sont des captures d'un site TIERS, elles pèsent plusieurs dizaines
# de mégaoctets, et une mesure d'un instant qui entre dans l'historique finit par
# passer pour un état de référence longtemps après être devenue fausse.
#
# Ce qui est versionné, ce sont les MESURES en texte, dans COINGECKO_AUDIT.md et
# DESIGN_SYSTEM.md, chacune datée et accompagnée de sa provenance.
docs/references/coingecko/
docs/references/zenkuu-avant/
docs/references/zenkuu-apres/
```

`zenkuu-apres/` figure ici bien qu'il ne soit créé qu'à la tâche 11 : les trois dossiers
relèvent de la même règle, et poser l'exclusion en trois fois inviterait à en oublier une.

- [ ] **Étape 2 : Vérifier que la règle mord**

```bash
mkdir -p docs/references/coingecko docs/references/zenkuu-avant
git check-ignore -q docs/references/coingecko/accueil/desktop-sombre.png && echo IGNORE
git check-ignore -q docs/references/zenkuu-avant/accueil-sombre.png && echo IGNORE
git check-ignore -q docs/references/coinbase-analyse.md || echo "TOUJOURS SUIVI (attendu)"
```

Attendu : `IGNORE`, `IGNORE`, `TOUJOURS SUIVI (attendu)`. La troisième ligne vérifie que
la nouvelle règle n'a pas emporté la référence Coinbase déjà versionnée.

- [ ] **Étape 3 : Capturer l'état d'avant-migration de ZENKUU**

Le serveur de développement tourne déjà sur le port 3000 — ne pas en démarrer un second.
Avec `chrome-devtools` (`take_screenshot` avec `filePath` et `fullPage: true`, après
`resize_page` à 1440 px), capturer six pages représentatives dans les deux thèmes vers
`docs/references/zenkuu-avant/` :

| Page | Fichiers attendus |
|---|---|
| `http://localhost:3000/fr` | `accueil-clair.png`, `accueil-sombre.png` |
| `http://localhost:3000/fr/crypto` | `crypto-clair.png`, `crypto-sombre.png` |
| `http://localhost:3000/fr/crypto/bitcoin` | `fiche-clair.png`, `fiche-sombre.png` |
| `http://localhost:3000/fr/categories` | `categories-clair.png`, `categories-sombre.png` |
| `http://localhost:3000/fr/heatmap` | `heatmap-clair.png`, `heatmap-sombre.png` |
| `http://localhost:3000/fr/actualites` | `actualites-clair.png`, `actualites-sombre.png` |

Le basculement de thème se fait par le sélecteur de thème du site, pas en forçant la
classe `dark` en JavaScript : c'est le chemin réel du visiteur, et `ThemeScript` participe
au rendu.

- [ ] **Étape 4 : Vérifier que les douze captures existent**

```bash
ls docs/references/zenkuu-avant/ | wc -l
```

Attendu : `12`.

- [ ] **Étape 5 : Commit**

```bash
git add .gitignore
git commit -m "$(cat <<'EOF'
Les captures de référence restent hors de l'historique

Le sous-projet A relève des mesures sur un site tiers ; seules les
mesures en texte entrent dans le dépôt. L'état d'avant-migration de
ZENKUU est capturé maintenant, sinon la preuve d'invariance ne peut
plus être constituée.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Tâche 2 : Le vérificateur du document d'audit

`COINGECKO_AUDIT.md` est construit sur plusieurs sessions, page par page. Sans
vérificateur, « l'audit est complet » reste une affirmation. Ce script en fait une
commande qui échoue.

**Fichiers :**
- Créer : `scripts/audit-coingecko-doc.mjs`
- Créer : `scripts/audit-coingecko-doc.test.mjs`

**Interfaces :**
- Produit : `verifier(source: string) => { problemes: string[], restantes: string[], entrees: number }`,
  et un exécutable en ligne de commande `node scripts/audit-coingecko-doc.mjs [--strict]`
  qui sort en code 1 si un problème est trouvé, ou si `--strict` et qu'il reste des pages
  non auditées. Consommé par les tâches 3, 4, 5 et 11.

- [ ] **Étape 1 : Écrire le test qui échoue**

Créer `scripts/audit-coingecko-doc.test.mjs` :

```js
import { describe, expect, it } from 'vitest'

import { CHAMPS, verifier } from './audit-coingecko-doc.mjs'

/** Un document minimal mais conforme : une page listée, cochée, et son entrée. */
const CONFORME = `# Audit de CoinGecko

## Liste des pages

- [x] Accueil — \`/fr\`

## Entrées

### Accueil — \`/fr\`

- **Date du relevé** : 2026-08-29
- **Rôle** : la porte d'entrée du site.
- **Priorité** : phase 1
- **État** : audité
- **Composants** :
  - tableau des cotations
  - bandeau des tendances
- **Fonctionnalités** : tri des colonnes, pagination
- **Interactions** : survol de ligne, ouverture du menu principal
- **Données requises** : cotations — CoinGecko, disponible
- **Écart avec ZENKUU** : \`/fr\` — trois colonnes manquantes
- **Notes** : rien à signaler
`

describe('verifier', () => {
  it('ne remonte aucun problème sur un document conforme', () => {
    const { problemes, restantes, entrees } = verifier(CONFORME)
    expect(problemes).toEqual([])
    expect(restantes).toEqual([])
    expect(entrees).toBe(1)
  })

  it('accepte une valeur de champ étalée sur les lignes suivantes', () => {
    /* « Composants » n'a rien après les deux-points : sa valeur est la liste en
       dessous. Un vérificateur qui ne lit que la fin de ligne la déclarerait vide. */
    expect(verifier(CONFORME).problemes).toEqual([])
  })

  it('signale un champ manquant', () => {
    const source = CONFORME.replace('- **Notes** : rien à signaler\n', '')
    expect(verifier(source).problemes).toContain('/fr : champ « Notes » manquant.')
  })

  it('signale un champ présent mais vide', () => {
    const source = CONFORME.replace('- **Rôle** : la porte d\'entrée du site.', '- **Rôle** :')
    expect(verifier(source).problemes).toContain('/fr : champ « Rôle » vide.')
  })

  it('signale une date qui n’est pas au format AAAA-MM-JJ', () => {
    const source = CONFORME.replace('2026-08-29', '29 août 2026')
    expect(verifier(source).problemes).toContain(
      '/fr : « Date du relevé » n’est pas une date AAAA-MM-JJ.',
    )
  })

  it('signale une case cochée sans entrée d’audit', () => {
    /* Tout ce qui suit le titre d'entrée est retiré : la case reste cochée, l'entrée
       disparaît. C'est exactement l'état d'un audit interrompu entre deux étapes. */
    const source = CONFORME.split('### Accueil')[0]
    expect(verifier(source).problemes).toContain('/fr : case cochée sans entrée d’audit.')
  })

  it('signale une entrée absente de la liste des pages', () => {
    const source = CONFORME.replace('- [x] Accueil — `/fr`', '- [x] Autre — `/fr/autre`')
    expect(verifier(source).problemes).toContain(
      '/fr : entrée présente mais absente de la liste des pages.',
    )
  })

  it('compte les pages restantes sans en faire un problème', () => {
    const source = CONFORME.replace(
      '- [x] Accueil — `/fr`',
      '- [x] Accueil — `/fr`\n- [ ] Catégories — `/fr/categories`',
    )
    const { problemes, restantes } = verifier(source)
    expect(problemes).toEqual([])
    expect(restantes).toEqual(['/fr/categories'])
  })

  it('signale un document sans liste de pages', () => {
    expect(verifier('# Rien\n').problemes).toContain(
      'Aucune liste de pages : la section « Liste des pages » est vide ou absente.',
    )
  })

  it('exporte les dix champs du schéma', () => {
    expect(CHAMPS).toHaveLength(10)
  })
})
```

- [ ] **Étape 2 : Lancer le test pour le voir échouer**

```bash
bunx vitest run scripts/audit-coingecko-doc.test.mjs
```

Attendu : ÉCHEC — `Failed to load ./audit-coingecko-doc.mjs`, le module n'existe pas encore.

- [ ] **Étape 3 : Écrire le vérificateur**

Créer `scripts/audit-coingecko-doc.mjs` :

```js
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * « L'AUDIT EST COMPLET » DOIT ÊTRE UNE COMMANDE, PAS UNE AFFIRMATION
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * COINGECKO_AUDIT.md se construit sur plusieurs sessions, une page par commit. Un
 * document de cette taille, relu à l'œil, laisse passer un champ vide ou une case
 * cochée sans entrée — et c'est précisément ce genre de trou qui se découvre en
 * phase d'implémentation, quand il coûte le plus cher.
 *
 * Ce script vérifie la STRUCTURE du document, pas la qualité de l'audit. Il ne sait
 * pas si une mesure est juste ; il sait qu'elle est présente, datée et rattachée à
 * une page de la liste.
 *
 * Usage :
 *   node scripts/audit-coingecko-doc.mjs            # structure seule
 *   node scripts/audit-coingecko-doc.mjs --strict   # exige AUSSI que tout soit coché
 */

/** Les dix champs du schéma d'entrée, dans l'ordre où ils doivent apparaître. */
export const CHAMPS = [
  'Date du relevé',
  'Rôle',
  'Priorité',
  'État',
  'Composants',
  'Fonctionnalités',
  'Interactions',
  'Données requises',
  'Écart avec ZENKUU',
  'Notes',
]

/** `- [x] Accueil — ` + une URL entre accents graves. */
const LIGNE_CASE = /^- \[( |x)\] .*?`(\/[^`]*)`/gm

/** `### Accueil — ` + la même URL. */
const TITRE_ENTREE = /^### .+?`(\/[^`]*)`\s*$/gm

/**
 * Découpe le corps d'une entrée en champs.
 *
 * La valeur d'un champ ne tient PAS forcément sur sa ligne : « Composants » est une
 * liste posée en dessous. Chaque champ court donc jusqu'au marqueur suivant, ce qui
 * absorbe naturellement les lignes de continuation.
 */
function champsDe(corps) {
  const table = new Map()
  const marqueurs = [...corps.matchAll(/^- \*\*(.+?)\*\* *:(.*)$/gm)]
  marqueurs.forEach((marqueur, index) => {
    const debut = marqueur.index + marqueur[0].length
    const fin = index + 1 < marqueurs.length ? marqueurs[index + 1].index : corps.length
    table.set(marqueur[1], (marqueur[2] + corps.slice(debut, fin)).trim())
  })
  return table
}

export function verifier(source) {
  const problemes = []

  const cases = new Map()
  for (const ligne of source.matchAll(LIGNE_CASE)) {
    cases.set(ligne[2], ligne[1] === 'x')
  }

  const titres = [...source.matchAll(TITRE_ENTREE)]
  const entrees = new Map()
  titres.forEach((titre, index) => {
    const debut = titre.index + titre[0].length
    const fin = index + 1 < titres.length ? titres[index + 1].index : source.length
    entrees.set(titre[1], source.slice(debut, fin))
  })

  if (cases.size === 0) {
    problemes.push('Aucune liste de pages : la section « Liste des pages » est vide ou absente.')
  }

  for (const [url, corps] of entrees) {
    if (!cases.has(url)) {
      problemes.push(`${url} : entrée présente mais absente de la liste des pages.`)
    }
    const champs = champsDe(corps)
    for (const champ of CHAMPS) {
      if (!champs.has(champ)) problemes.push(`${url} : champ « ${champ} » manquant.`)
      else if (champs.get(champ) === '') problemes.push(`${url} : champ « ${champ} » vide.`)
    }
    const date = champs.get('Date du relevé')
    if (date !== undefined && date !== '' && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      problemes.push(`${url} : « Date du relevé » n’est pas une date AAAA-MM-JJ.`)
    }
  }

  for (const [url, cochee] of cases) {
    if (cochee && !entrees.has(url)) {
      problemes.push(`${url} : case cochée sans entrée d’audit.`)
    }
  }

  const restantes = [...cases].filter(([, cochee]) => !cochee).map(([url]) => url)
  return { problemes, restantes, entrees: entrees.size }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const strict = process.argv.includes('--strict')
  const source = readFileSync(new URL('../COINGECKO_AUDIT.md', import.meta.url), 'utf8')
  const { problemes, restantes, entrees } = verifier(source)

  for (const probleme of problemes) console.error(`✗ ${probleme}`)
  console.log(`${entrees} entrée(s) · ${restantes.length} page(s) restante(s)`)

  const incomplet = strict && restantes.length > 0
  if (incomplet) {
    console.error(`✗ --strict : ${restantes.length} page(s) non auditée(s) — ${restantes.join(', ')}`)
  }
  process.exit(problemes.length > 0 || incomplet ? 1 : 0)
}
```

- [ ] **Étape 4 : Lancer le test pour le voir passer**

```bash
bunx vitest run scripts/audit-coingecko-doc.test.mjs
```

Attendu : 10 tests au vert.

- [ ] **Étape 5 : Commit**

```bash
git add scripts/audit-coingecko-doc.mjs scripts/audit-coingecko-doc.test.mjs
git commit -m "$(cat <<'EOF'
La complétude de l'audit devient une commande

Un document construit sur plusieurs sessions, relu à l'œil, laisse
passer un champ vide ou une case cochée sans entrée. Le vérificateur
lit la structure et sort en erreur ; --strict exige en plus que toutes
les cases soient cochées.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Tâche 3 : Étape 0 — énumérer les pages de CoinGecko

C'est cette liste, et non un inventaire mental, qui définit « toutes les pages ». Elle est
figée avant le premier audit.

**Fichiers :**
- Créer : `COINGECKO_AUDIT.md`

**Interfaces :**
- Consomme : `node scripts/audit-coingecko-doc.mjs` (tâche 2).
- Produit : la section « Liste des pages » de `COINGECKO_AUDIT.md`, file de travail des
  tâches 4 et 5.

- [ ] **Étape 1 : Relever les points d'entrée**

Avec `chrome-devtools`, sur `https://www.coingecko.com/` :

1. Ouvrir **chacun** des menus et mega-dropdowns de la navigation principale, relever
   toutes les destinations.
2. Dérouler le pied de page jusqu'en bas, relever toutes les destinations.
3. Charger `https://www.coingecko.com/sitemap.xml` et ses sitemaps enfants, relever les
   sections de pages (pas les millions d'URL de pages coin : une entrée « page coin »
   représentative suffit, les onglets étant listés séparément).
4. Ouvrir l'overlay de recherche et relever les destinations qu'il propose.

Exclure du périmètre : pages légales, publicitaires, carrières.

- [ ] **Étape 2 : Écrire le squelette du document**

Créer `COINGECKO_AUDIT.md` sur ce moule — la liste ci-dessous est un **exemple de forme**,
à remplacer intégralement par ce que l'étape 1 a réellement relevé :

```markdown
# Audit de CoinGecko

Relevé page par page en vue de la migration de ZENKUU. Ce document décrit un site
tiers : il n'en reproduit ni le code, ni les textes, ni les assets de marque, et ne
consigne que des mesures, chacune datée.

Spec : `docs/superpowers/specs/2026-08-29-coingecko-audit-design-system-design.md`
Vérification : `node scripts/audit-coingecko-doc.mjs --strict`

## Liste des pages

Figée le AAAA-MM-JJ à partir de la navigation, des mega-dropdowns, du pied de page,
du plan de site et de l'overlay de recherche. Une case cochée signifie qu'une entrée
complète existe plus bas.

### Phase 1 — cœur

- [ ] Accueil — `/fr`
- [ ] Page coin, onglet Vue d'ensemble — `/fr/coins/bitcoin`
- [ ] …

### Phase 2 — données

- [ ] …

### Phase 3 — contenu et services

- [ ] …

## Entrées

## Synthèse — données sans source gratuite

Rassemblée au fil de l'audit à partir du champ « Données requises » de chaque entrée.
Posée en question à l'exploitant à la fin du sous-projet A.

| Donnée | Pages concernées | Source CoinGecko | Équivalent gratuit |
|---|---|---|---|
```

- [ ] **Étape 3 : Vérifier la structure**

```bash
node scripts/audit-coingecko-doc.mjs
```

Attendu : sortie `0 entrée(s) · N page(s) restante(s)` où N est le nombre de pages
relevées, et **code de sortie 0**. Aucune ligne `✗` : à ce stade rien n'est coché, donc
rien n'est incohérent.

- [ ] **Étape 4 : Vérifier que le mode strict échoue bien**

```bash
node scripts/audit-coingecko-doc.mjs --strict; echo "code=$?"
```

Attendu : `code=1` et une ligne `✗ --strict : N page(s) non auditée(s)`. C'est la porte
qui restera fermée jusqu'à la tâche 11.

- [ ] **Étape 5 : Commit**

```bash
git add COINGECKO_AUDIT.md
git commit -m "$(cat <<'EOF'
La liste des pages de CoinGecko est figée

Relevée sur la navigation, les mega-dropdowns, le pied de page, le plan
de site et l'overlay de recherche. C'est elle qui définit « toutes les
pages » pour la suite du sous-projet, et non un inventaire de mémoire.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Tâche 3bis : L'outil de relevé

Le MCP de navigation s'est révélé structurellement inutilisable (voir « Outillage
navigateur »). Les 68 pages seront relevées par un script du dépôt, qui pilote Chromium
par Playwright — déjà une dépendance du projet, et déjà employé par
`scripts/audit-responsive.mjs`.

Ce n'est pas seulement un remplacement : c'est aussi ce qui rend la boucle de la tâche 5
abordable. Une commande par page remplace une dizaine d'allers-retours d'outil.

**Fichiers :**
- Créer : `scripts/audit-coingecko-page.mjs`
- Créer : `scripts/audit-coingecko-page.test.mjs`

**Interfaces :**
- Consomme : `playwright`, déjà installé à la racine.
- Produit : la commande
  `node scripts/audit-coingecko-page.mjs --url=<chemin> --slug=<slug> [--selectors=<liste>] [--base=<origine>]`
  qui écrit six captures dans `docs/references/coingecko/<slug>/` et un relevé de styles
  dans `docs/references/coingecko/<slug>/mesures.json`. Consommée par les tâches 4, 5 et 11.

- [ ] **Étape 1 : Écrire le test qui échoue**

Le script est de l'entrée-sortie : ce qui mérite un test unitaire, c'est la **construction
des chemins et des arguments**, pas le pilotage du navigateur. Extraire ces deux fonctions
pures et les tester ; le pilotage sera éprouvé par la fumée de l'étape 5.

Créer `scripts/audit-coingecko-page.test.mjs` :

```js
import { describe, expect, it } from 'vitest'

import { cheminsDeCapture, lireArguments } from './audit-coingecko-page.mjs'

describe('lireArguments', () => {
  it('lit url et slug', () => {
    const a = lireArguments(['--url=/fr', '--slug=accueil'])
    expect(a.url).toBe('/fr')
    expect(a.slug).toBe('accueil')
  })

  it('applique l’origine de CoinGecko par défaut', () => {
    expect(lireArguments(['--url=/fr', '--slug=accueil']).base).toBe('https://www.coingecko.com')
  })

  it('accepte une origine explicite, pour auditer ZENKUU en local', () => {
    const a = lireArguments(['--url=/fr', '--slug=z', '--base=http://localhost:3000'])
    expect(a.base).toBe('http://localhost:3000')
  })

  it('découpe la liste de sélecteurs sur les virgules', () => {
    const a = lireArguments(['--url=/fr', '--slug=a', '--selectors=table td,a.lien'])
    expect(a.selectors).toEqual(['table td', 'a.lien'])
  })

  it('rend une liste de sélecteurs vide quand l’argument est absent', () => {
    expect(lireArguments(['--url=/fr', '--slug=a']).selectors).toEqual([])
  })

  it('exige url et slug', () => {
    expect(() => lireArguments(['--url=/fr'])).toThrow(/slug/)
    expect(() => lireArguments(['--slug=a'])).toThrow(/url/)
  })

  it('refuse un slug qui sortirait du dossier de références', () => {
    /* Un slug est un nom de dossier, pas un chemin : sans ce garde-fou,
       `--slug=../../..` écrirait des captures n'importe où dans le dépôt. */
    expect(() => lireArguments(['--url=/fr', '--slug=../evasion'])).toThrow(/slug/)
  })
})

describe('cheminsDeCapture', () => {
  it('rend six chemins, trois largeurs par deux thèmes', () => {
    const chemins = cheminsDeCapture('accueil')
    expect(chemins).toHaveLength(6)
  })

  it('nomme les fichiers largeur-thème, sous le dossier du slug', () => {
    const noms = cheminsDeCapture('accueil').map((c) => c.fichier)
    expect(noms).toEqual([
      'docs/references/coingecko/accueil/360-clair.png',
      'docs/references/coingecko/accueil/360-sombre.png',
      'docs/references/coingecko/accueil/768-clair.png',
      'docs/references/coingecko/accueil/768-sombre.png',
      'docs/references/coingecko/accueil/1440-clair.png',
      'docs/references/coingecko/accueil/1440-sombre.png',
    ])
  })

  it('porte la largeur et le thème de chaque capture', () => {
    const [premier] = cheminsDeCapture('accueil')
    expect(premier.largeur).toBe(360)
    expect(premier.theme).toBe('clair')
  })
})
```

- [ ] **Étape 2 : Lancer le test pour le voir échouer**

```bash
bunx vitest run scripts/audit-coingecko-page.test.mjs
```

Attendu : ÉCHEC — le module n'existe pas.

- [ ] **Étape 3 : Écrire le script**

Créer `scripts/audit-coingecko-page.mjs`. Exigences, dans l'ordre d'importance :

1. **Exporte `lireArguments(argv)` et `cheminsDeCapture(slug)`**, aux signatures que le
   test fixe. Le bloc de ligne de commande est gardé comme dans
   `scripts/audit-coingecko-doc.mjs` (comparaison de `import.meta.url` à
   `pathToFileURL(process.argv[1]).href`), pour que l'import par vitest ne lance rien.
2. **Trois largeurs — 360, 768, 1440 — et deux thèmes.** Capture pleine page.
3. **Le thème se bascule par le mécanisme réel du site**, jamais en forçant une classe CSS.
   Repérer une fois comment CoinGecko persiste la préférence (stockage local ou cookie),
   le poser avant le chargement, et **écrire en commentaire la clé observée et la date du
   relevé**. Si le mécanisme reste introuvable, ne rien forcer : lever une erreur explicite
   qui dit ce qui a été cherché.
4. **`--selectors`** relève `getComputedStyle` sur le premier nœud correspondant à chaque
   sélecteur, **en une seule évaluation dans la page**, et écrit `mesures.json` :
   pour chaque sélecteur, le sélecteur, un extrait de texte pour l'identifier, et les
   propriétés — famille et graisse de police, taille, interligne, interlettrage, couleur,
   fond, filet, rayon, ombre, rembourrages, marges, durée et courbe de transition.
   Un sélecteur sans correspondance est consigné comme tel, jamais omis en silence.
5. **`--base`** permet de viser ZENKUU en local ; la valeur par défaut est CoinGecko.
6. **Profil isolé par exécution** — c'est le comportement par défaut de
   `chromium.launch()`, ne pas le contourner par un `userDataDir` partagé. C'est ce qui
   supprime la classe d'incident qui a fait tomber le MCP.
7. **Aucune commande qui tue un processus.** Si le navigateur ne démarre pas, lever et
   sortir en code 1.

- [ ] **Étape 4 : Lancer le test pour le voir passer**

```bash
bunx vitest run scripts/audit-coingecko-page.test.mjs
```

Attendu : 10 tests au vert.

- [ ] **Étape 5 : Épreuve de fumée sur une vraie page**

```bash
node scripts/audit-coingecko-page.mjs --url=/fr --slug=fumee --selectors="body,a,button"
ls docs/references/coingecko/fumee/
```

Attendu : six fichiers `.png` et un `mesures.json`. Vérifier que le JSON porte des valeurs
réelles pour les trois sélecteurs, et que les captures `-clair` et `-sombre` diffèrent en
taille — deux fichiers identiques signaleraient que la bascule de thème n'a pas pris.

Puis supprimer le dossier d'épreuve : `rm -rf docs/references/coingecko/fumee`.

- [ ] **Étape 6 : Commit**

```bash
git add scripts/audit-coingecko-page.mjs scripts/audit-coingecko-page.test.mjs
git commit -m "$(cat <<'EOF'
L'audit reçoit son propre outil de relevé

Le MCP de navigation partage un profil Chrome entre toutes les sessions
de la machine : deux sessions y entrent en collision et aucune ne peut
dénouer le conflit sans toucher aux processus des autres. Playwright
était déjà là, déjà piloté par audit-responsive.mjs, et son profil est
isolé par exécution.

Une commande par page remplace une dizaine d'allers-retours d'outil, ce
qui rend les 68 pages restantes abordables.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Tâche 3ter : Les états interactifs

La perte du MCP de navigation a été compensée pour la **capture** et la **mesure**, pas
pour l'**interaction**. Les étapes 4 et 5 du protocole — survol, focus, actif, et les
durées de transition qui vont avec — ne sont plus exécutables, et la tâche 4 a dû
consigner « non observé » sur tout ce volet.

C'est un tiers du protocole demandé, et `DESIGN_SYSTEM.md` a besoin de ces valeurs : sa
famille « mouvement » ne se remplit qu'avec des durées et des courbes relevées sur de
vrais changements d'état.

Playwright sait survoler, cliquer et donner le focus nativement. Étendre l'outil est donc
la même manœuvre qui a déjà fait gagner la capture — et le résultat est **meilleur** qu'un
pilotage à la main : la même commande rejoue les mêmes états sur les 68 pages, alors qu'un
opérateur les explore différemment à chaque fois.

**Fichiers :**
- Modifier : `scripts/audit-coingecko-page.mjs`
- Modifier : `scripts/audit-coingecko-page.test.mjs`

**Interfaces :**
- Consomme : la structure existante — `lireArguments`, `mesurerSelecteurs`,
  `REFERENCE_MESURES`, la boucle des six passes de `main`.
- Produit : un argument `--interactions=<liste de sélecteurs>` et une clé `interactions`
  dans `mesures.json`. Consommé par les tâches 4 (tour de complétion), 5 et 6.

- [ ] **Étape 1 : Écrire les tests qui échouent**

Ce qui se teste sans navigateur, c'est la **lecture de l'argument** et le **calcul du
delta**. Le pilotage sera éprouvé par la fumée de l'étape 5.

Ajouter à `scripts/audit-coingecko-page.test.mjs` :

```js
import { deltaDEtat } from './audit-coingecko-page.mjs'

describe('lireArguments — interactions', () => {
  it('découpe la liste de sélecteurs interactifs sur les virgules', () => {
    const a = lireArguments(['--url=/fr', '--slug=a', '--interactions=tr,a.lien'])
    expect(a.interactions).toEqual(['tr', 'a.lien'])
  })

  it('rend une liste vide quand l’argument est absent', () => {
    expect(lireArguments(['--url=/fr', '--slug=a']).interactions).toEqual([])
  })
})

describe('deltaDEtat', () => {
  /* Un état interactif ne se décrit pas par un dump complet : trois états sur dix-huit
     sélecteurs et deux thèmes produiraient des milliers de lignes dont l'immense
     majorité serait identique au repos. Ce qui porte l'information, c'est ce qui
     CHANGE — et c'est cela seul que le système de dessin consomme. */
  it('ne garde que les propriétés qui ont changé', () => {
    const repos = { color: 'rgb(0, 0, 0)', backgroundColor: 'rgb(255, 255, 255)' }
    const actif = { color: 'rgb(0, 0, 255)', backgroundColor: 'rgb(255, 255, 255)' }
    expect(deltaDEtat(repos, actif)).toEqual({ color: 'rgb(0, 0, 255)' })
  })

  it('rend un objet vide quand rien ne bouge', () => {
    const etat = { color: 'rgb(0, 0, 0)' }
    expect(deltaDEtat(etat, { ...etat })).toEqual({})
  })

  it('signale une propriété apparue', () => {
    expect(deltaDEtat({}, { outlineColor: 'rgb(1, 2, 3)' })).toEqual({
      outlineColor: 'rgb(1, 2, 3)',
    })
  })

  it('signale une propriété disparue plutôt que de la taire', () => {
    /* Une bordure qui DISPARAÎT au survol est un fait de dessin. L'omettre
       laisserait croire qu'elle persiste. */
    expect(deltaDEtat({ borderTopWidth: '1px' }, {})).toEqual({ borderTopWidth: null })
  })

  it('tolère un état absent — un sélecteur sans correspondance', () => {
    expect(deltaDEtat(null, { color: 'rgb(1, 1, 1)' })).toEqual({})
    expect(deltaDEtat({ color: 'rgb(1, 1, 1)' }, null)).toEqual({})
  })
})
```

- [ ] **Étape 2 : Lancer les tests pour les voir échouer**

```bash
bunx vitest run scripts/audit-coingecko-page.test.mjs
```

Attendu : ÉCHEC — `deltaDEtat` n'est pas exporté, et `interactions` est indéfini.

- [ ] **Étape 3 : Étendre le script**

Exigences, par ordre d'importance :

1. **`deltaDEtat(repos, etat)` exportée**, aux signatures que les tests fixent. Fonction
   pure, sans dépendance au navigateur.
2. **`--interactions=<liste>`** lu par `lireArguments`, découpé sur les virgules, liste
   vide par défaut. Quand l'argument est absent, **le comportement du script ne change
   pas d'un iota** : les tâches déjà faites doivent pouvoir rejouer leur commande à
   l'identique.
3. **Le sondage a lieu pendant les deux passes de la largeur de référence** (1440 px),
   en thème clair **et** en thème sombre. Pas de chargement de page supplémentaire : la
   page est déjà là. Les couleurs d'état diffèrent entre thèmes, d'où les deux.
4. **Trois états par sélecteur** : repos, survol, focus. Le repos est la mesure déjà
   relevée ; le survol par `locator.hover()` ; le focus par `locator.focus()`. Après
   chaque changement d'état, laisser passer la transition avant de mesurer — une valeur
   lue à mi-transition est fausse, et la durée est lisible dans la propriété
   `transition` du repos.
5. **Ce qui est écrit, ce sont les deltas**, pas les états complets. Ajouter à
   `mesures.json` une clé `interactions` : pour chaque thème, pour chaque sélecteur, le
   delta du survol et celui du focus. Le focus doit inclure les propriétés d'`outline`,
   qui portent l'anneau de focus.
6. **Un sélecteur qui ne peut pas être survolé ou recevoir le focus est consigné comme
   tel**, jamais omis en silence : hors écran, masqué, non focusable. La raison est
   écrite dans le relevé.
7. **Aucun clic.** Le survol et le focus ne modifient pas l'état de la page ; un clic
   peut naviguer, ouvrir une modale, ou déclencher une action. Le tri au clic reste hors
   de portée de cette tâche et continue d'être consigné « non observé » — c'est un
   compromis assumé, pas un oubli.
8. **Une limite de temps globale au sondage.** Un sélecteur qui ne répond pas ne doit
   pas bloquer une campagne de 68 pages : au-delà de la limite, consigner l'échec et
   continuer.

- [ ] **Étape 4 : Lancer les tests pour les voir passer**

```bash
bunx vitest run scripts/audit-coingecko-page.test.mjs
```

Attendu : tous au vert, les 26 précédents compris.

- [ ] **Étape 5 : Épreuve de fumée**

D'abord la non-régression — sans `--interactions`, rien ne doit changer :

```bash
node scripts/audit-coingecko-page.mjs --url=/fr --slug=fumee-sans --selectors="body,a,button"
```

Puis le sondage, sur des sélecteurs réellement interactifs :

```bash
node scripts/audit-coingecko-page.mjs --url=/fr --slug=fumee-avec \
  --selectors="body,a,button" --interactions="tbody tr,thead th,a,button"
```

Vérifier dans `mesures.json` : la clé `interactions` porte les deux thèmes, chaque
sélecteur y a un delta de survol et un de focus, et **au moins un delta n'est pas vide** —
un site dont aucun élément ne réagirait au survol serait invraisemblable, et des deltas
tous vides signaleraient que le sondage n'a rien mesuré.

Chronométrer la seconde commande et reporter le surcoût par rapport à la première.

Supprimer les deux dossiers d'épreuve ensuite.

- [ ] **Étape 6 : Commit**

```bash
git add scripts/audit-coingecko-page.mjs scripts/audit-coingecko-page.test.mjs
git commit -m "$(cat <<'EOF'
Le relevé sonde aussi le survol et le focus

Les étapes « états » et « interactions » du protocole étaient devenues
inexécutables avec la perte du MCP de navigation, et DESIGN_SYSTEM.md a
besoin des durées et des couleurs d'état pour sa famille « mouvement ».

Playwright sonde nativement, et le fait mieux qu'un pilotage à la main
sur 68 pages : la même commande rejoue les mêmes états partout. Seuls
les DELTAS sont écrits — trois états sur dix-huit sélecteurs et deux
thèmes seraient illisibles, et ce qui informe, c'est ce qui change.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Tâche 4 : Auditer l'accueil — la page qui fixe la méthode

L'accueil porte la navigation, le tableau de cotations, les sparklines, les cartes de
tendance et le pied de page : c'est la page où le plus grand nombre de composants
partagés est relevé pour la première fois. La faire en premier, seule, permet d'ajuster la
méthode avant de la répéter trente fois.

**Fichiers :**
- Modifier : `COINGECKO_AUDIT.md` (section « Entrées », et la case correspondante)
- Créer : `docs/references/coingecko/accueil/` (six captures, non versionnées)

**Interfaces :**
- Consomme : la liste de pages (tâche 3), `verifier` en ligne de commande (tâche 2).
- Produit : la première entrée d'audit, dont les noms de composants font référence pour
  toutes les entrées suivantes ; les mesures que la tâche 6 agrège.

- [ ] **Étape 1 : Capturer**

Avec l'outil de la tâche 3bis, qui produit les six fichiers et le relevé de styles en une
commande :

```bash
node scripts/audit-coingecko-page.mjs --url=/fr --slug=accueil --selectors="<liste>"
```

La liste de sélecteurs est celle de l'étape 3 : compose-la d'abord en lisant la page, puis
lance la commande une seule fois. Résultat attendu dans `docs/references/coingecko/accueil/` :
`360-clair.png`, `360-sombre.png`, `768-clair.png`, `768-sombre.png`, `1440-clair.png`,
`1440-sombre.png`, et `mesures.json`.

- [ ] **Étape 2 : Relever la structure**

Lire l'arbre d'accessibilité de la page. Nommer chaque composant en français, dans le
vocabulaire de ZENKUU (« tableau de cotations », « bandeau de tendances », « pastille de
variation »…), pas dans celui de CoinGecko. Ces noms deviennent le vocabulaire commun de
tout l'audit.

- [ ] **Étape 3 : Mesurer**

Avec `chrome-devtools`, relever `getComputedStyle` sur un échantillon **nommé** de nœuds :
au minimum une cellule de tableau, un en-tête de colonne triable, une ligne de tableau, un
lien, un bouton plein, un bouton discret, un onglet actif, un onglet inactif, une pastille
de variation, un titre de section, un texte secondaire.

Pour chacun : famille et graisse de police, taille, interligne, interlettrage, couleur,
fond, filet, rayon, ombre, rembourrages, marges, durées et courbes de transition.

Consigner la valeur **et le nœud sur lequel elle a été relevée**. Une mesure sans
provenance est un défaut au même titre qu'une donnée inventée.

- [ ] **Étape 4 : Éprouver les états et les interactions**

Survol d'une ligne de tableau, d'un en-tête triable, d'un onglet, d'un bouton, d'un lien.
Focus clavier sur chacun. État actif. État trié, dans les deux sens. État vide, état de
chargement, état d'erreur si la page sait les produire. Ouvrir chaque menu et sous-menu,
la recherche, les filtres, la pagination. Faire défiler la page **entière**, sections
éditoriales, FAQ et liens sous le fold compris.

- [ ] **Étape 5 : Écrire l'entrée et cocher la case**

Ajouter sous `## Entrées` de `COINGECKO_AUDIT.md`, avec les dix champs du schéma :

```markdown
### Accueil — `/fr`

- **Date du relevé** : AAAA-MM-JJ
- **Rôle** : …
- **Priorité** : phase 1
- **État** : audité
- **Composants** :
  - …
- **Fonctionnalités** : …
- **Interactions** : …
- **Données requises** : …
- **Écart avec ZENKUU** : …
- **Notes** : …
```

Puis passer `- [ ] Accueil — \`/fr\`` à `- [x]` dans la liste des pages. Toute donnée sans
équivalent gratuit va **aussi** dans le tableau de la section « Synthèse ».

- [ ] **Étape 6 : Vérifier**

```bash
node scripts/audit-coingecko-doc.mjs
```

Attendu : `1 entrée(s) · N-1 page(s) restante(s)`, aucune ligne `✗`, code de sortie 0.

- [ ] **Étape 7 : Commit**

```bash
git add COINGECKO_AUDIT.md
git commit -m "$(cat <<'EOF'
L'accueil de CoinGecko est audité

Première entrée : elle fixe le vocabulaire de composants que réutilisent
toutes les suivantes, et l'échantillon de nœuds sur lequel les mesures
sont relevées.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Tâche 5 : Auditer les pages archétypes

**Cette tâche a été réduite en cours de route, et c'est une décision, pas un renoncement.**

Le découpage de ce plan repose sur une phrase : *« la fidélité de CoinGecko ne vit pas
dans une trentaine de mises en page, mais dans une vingtaine de composants partagés que
chaque page recompose. »* L'audit de l'accueil l'a confirmée — 22 composants nommés d'un
seul coup. Auditer les 67 pages restantes pour retrouver ces composants est donc un
sur-échantillonnage : la valeur est concentrée sur les premières pages et décroît vite,
les dernières ne faisant que référencer ce qui est déjà décrit.

Deux faits ont achevé de trancher : l'énumération a trouvé **68 pages** là où l'ordre de
grandeur annoncé était la moitié, et le site n'a toujours pas bougé d'une ligne — alors
que la réplique est demandée précisément pour pouvoir juger page par page ce qui est gardé.

**Cette tâche audite donc les pages qui portent des familles de composants nouvelles.**
Les autres seront auditées **au moment de leur migration**, quand la question « qu'est-ce
que je garde ? » est concrète et que le relevé sert immédiatement.

**Fichiers :**
- Modifier : `COINGECKO_AUDIT.md` (une entrée et une case par page auditée, plus le
  marquage des pages différées)
- Créer : `docs/references/coingecko/<slug>/` (six captures par page, non versionnées)

**Le critère de choix.** Une page mérite d'être auditée maintenant si elle porte une
**famille de composants** qu'aucune page déjà auditée ne porte. Une page qui recompose
les mêmes composants dans un ordre différent n'apprend rien au système de dessin.

Sélection proposée — à confirmer en lisant les pages, pas à appliquer aveuglément :

| Page | Famille qu'elle apporte |
|---|---|
| Accueil — `/fr` | ✅ fait : tableau dense, navigation, pied de page, overlay de recherche |
| Page coin, Vue d'ensemble — `/fr/coins/bitcoin` | gabarit de détail, onglets, widgets de statistiques, graphique |
| Catégories — `/fr/categories` | tableau de listes non chiffrées |
| Page de catégorie — `/fr/categories/meme-token` | tableau filtré, en-tête de contexte |
| Exchanges, spot — `/fr/platesformes` | tableau à colonnes de confiance et de volume |
| Page d'exchange — `/fr/platesformes/binance` | gabarit de détail non-actif, tableau de paires |
| Graphiques globaux — `/fr/charts` | page à dominante graphique |
| Une page éditoriale (learn ou article) | gabarit de lecture, typographie longue |
| Page API | gabarit marchand — tarifs, appels à l'action |
| Portefeuille — `/fr/portfolio` | gabarit de compte, états vides |

Si en auditant l'une d'elles tu constates qu'elle n'apporte **aucun** composant nouveau,
dis-le et passe à la suivante : c'est une information utile, pas un échec. Inversement,
si une page hors de cette liste s'avère nécessaire, ajoute-la en motivant.

**Marquer les pages différées.** À la fin de la tâche, ajouter dans `COINGECKO_AUDIT.md`,
en tête de la liste des pages, une note disant que les cases non cochées ne sont pas un
travail en retard mais un travail **délibérément différé au moment de la migration de
chaque page**, avec la raison. Sans cette note, un lecteur futur lira 58 cases vides comme
un audit inachevé.

⚠️ **Conséquence sur le vérificateur.** `node scripts/audit-coingecko-doc.mjs --strict`
continuera d'échouer tant que les 58 pages différées ne sont pas cochées — et **c'est le
comportement correct** : l'audit n'est effectivement pas complet. Ne modifie pas le
vérificateur pour le faire taire. Le critère de clôture du sous-projet A change en
conséquence (voir tâche 11) ; `--strict` reste la porte de la complétude finale, qui se
franchira à la fin de la migration.

**Interfaces :**
- Consomme : le vocabulaire de composants posé par la tâche 4 — un composant déjà nommé
  est **référencé, pas redécrit**. C'est ce qui fait converger l'audit vers un inventaire
  de composants partagés au lieu d'une pile de descriptions indépendantes.
- Produit : l'ensemble des mesures que la tâche 6 agrège en système de dessin.

Pour **chaque** page non cochée de la liste, dans l'ordre :

- [ ] **Étape 1 : Capturer**

```bash
node scripts/audit-coingecko-page.mjs --url=<chemin> --slug=<slug> --selectors="<liste>"
```

Une seule commande produit les six captures et `mesures.json` dans
`docs/references/coingecko/<slug>/`. La liste de sélecteurs reprend le gabarit posé par la
tâche 4, augmenté des sélecteurs propres à la page.

- [ ] **Étape 2 : Relever la structure**

Arbre d'accessibilité. Les composants déjà nommés dans une entrée précédente sont
référencés par leur nom ; seuls les composants nouveaux, ou les variantes qui diffèrent
réellement, sont décrits.

- [ ] **Étape 3 : Mesurer**

`getComputedStyle` sur les nœuds propres à la page — ceux dont le composant n'a pas déjà
été mesuré. Famille et graisse de police, taille, interligne, interlettrage, couleur,
fond, filet, rayon, ombre, rembourrages, marges, durées et courbes. Chaque valeur porte
le nœud sur lequel elle a été relevée.

Si une mesure **contredit** une valeur déjà consignée pour le même composant, ne pas
écraser : consigner les deux avec leurs provenances et le noter dans « Notes ». C'est le
signal d'une variante réelle, et l'écraser reviendrait à inventer une cohérence.

- [ ] **Étape 4 : Éprouver les états et les interactions**

Survol des lignes, en-têtes triables, onglets, boutons, liens. Focus clavier. État actif,
trié, vide, chargement, erreur. Ouvrir chaque menu et sous-menu, la recherche, les
filtres, la pagination. Défilement de la page entière, FAQ et sections éditoriales sous le
fold comprises.

Pour une page nécessitant un compte, observer ce que rend la session déjà ouverte de
l'exploitant. **Ne saisir aucun identifiant.** Si la session a expiré, marquer l'entrée
« à réauditer » dans « Notes », cocher la case malgré tout pour ne pas bloquer la file, et
signaler le cas à l'exploitant en fin de tâche.

Si la page **ne se rend pas** — erreur du serveur, restriction régionale, test A/B qui
sert une variante — écrire l'entrée avec ce qui a réellement été observé, le dire dans
« Notes », et cocher la case. Ne rien extrapoler depuis une autre page : une mesure
inventée dans l'audit se propagerait ensuite dans tout le système de dessin.

- [ ] **Étape 5 : Écrire l'entrée et cocher la case**

Ajouter sous `## Entrées`, avec les dix champs du schéma :

```markdown
### <titre> — `<url>`

- **Date du relevé** : AAAA-MM-JJ
- **Rôle** : …
- **Priorité** : phase 1 | 2 | 3
- **État** : audité
- **Composants** :
  - …
- **Fonctionnalités** : …
- **Interactions** : …
- **Données requises** : …
- **Écart avec ZENKUU** : …
- **Notes** : …
```

Passer la case correspondante à `- [x]`. Reporter toute donnée sans équivalent gratuit
dans le tableau de la section « Synthèse ».

Pour une page coin, le champ « Notes » doit dire **ce qui, dans le gabarit, est spécifique
à la crypto** — tokenomics, adresses de contrat, marchés DEX, offre en circulation. C'est
la matière première du sous-projet C, qui généralise ce gabarit aux six classes d'actifs.

- [ ] **Étape 6 : Vérifier**

```bash
node scripts/audit-coingecko-doc.mjs
```

Attendu : aucune ligne `✗`, code de sortie 0, et le compteur de pages restantes décrémenté
de un.

- [ ] **Étape 7 : Commit**

```bash
git add COINGECKO_AUDIT.md
git commit -m "$(cat <<'EOF'
<Titre de la page> est auditée

<Une ligne sur ce que la page a appris : un composant nouveau, une
variante, une donnée sans source gratuite.>

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

- [ ] **Étape 8 : Condition de sortie de la boucle**

```bash
node scripts/audit-coingecko-doc.mjs --strict; echo "code=$?"
```

Tant que `code=1`, reprendre à l'étape 1 avec la page suivante. Quand `code=0`, toutes les
cases sont cochées et la tâche 5 est terminée.

---

### Tâche 6 : Extraire le système de dessin

**Fichiers :**
- Créer : `DESIGN_SYSTEM.md`

**Interfaces :**
- Consomme : toutes les mesures de `COINGECKO_AUDIT.md`.
- Produit : la table de correspondance mesure → jeton `--v2-*`, que la tâche 7 implémente
  et que la tâche 8 vérifie.

- [ ] **Étape 1 : Agréger les mesures par famille**

Relire l'ensemble des mesures de `COINGECKO_AUDIT.md` et les regrouper en huit familles.
Pour chaque valeur, garder combien de fois elle a été observée et sur quels nœuds : une
valeur vue une fois est une exception, une valeur vue trente fois est un palier du système.

- [ ] **Étape 2 : Écrire le document**

Créer `DESIGN_SYSTEM.md` sur ce moule :

```markdown
# Le système de dessin structurel relevé sur CoinGecko

Relevé par mesure, en vue de la migration de ZENKUU. Aucune feuille de style, aucun
SVG et aucun texte de CoinGecko n'est reproduit ici : ce document ne contient que des
valeurs mesurées, chacune accompagnée du nœud et de la page où elle a été relevée.

**Les couleurs n'y figurent que comme RÔLES.** ZENKUU garde sa palette : bleu glacier
`#a9eafe` en sombre, cyan profond `#0e7490` en clair, sombre par défaut. Le rôle
« accent » est rempli par le bleu glacier, pas par la couleur de la référence.

Source : `COINGECKO_AUDIT.md` · Spec : `docs/superpowers/specs/2026-08-29-coingecko-audit-design-system-design.md`

## 1. Typographie
## 2. Densité
## 3. Rythme d'espacement
## 4. Rayons
## 5. Élévation
## 6. Grille et points d'arrêt
## 7. Iconographie
## 8. Mouvement
## 9. Rôles de couleur
## 10. Table de correspondance
```

Chaque section porte un tableau de la forme :

```markdown
| Valeur mesurée | Occurrences | Relevée sur | Jeton ZENKUU |
|---|---|---|---|
| 14 px / 20 px / -0,12 px | 34 | cellule de tableau, `/fr` | `--text-sm` (existant) |
| 13 px / 18 px / 0 px | 12 | libellé secondaire, `/fr/coins/bitcoin` | `--v2-text-xs` (nouveau) |
```

La colonne « Jeton ZENKUU » désigne soit un jeton **existant** dont la valeur coïncide —
auquel cas rien n'est créé —, soit un jeton `--v2-*` **nouveau**. La section 10 récapitule
les seuls jetons nouveaux : c'est elle que la tâche 7 implémente.

La section 9 liste les rôles de couleur observés (fond, surface, surface survolée, filet,
accent, hausse, baisse, encre, encre atténuée…) et, pour chacun, le jeton ZENKUU qui le
remplit. **Un rôle sans jeton ZENKUU correspondant est une couleur nouvelle à créer** : le
signaler explicitement, c'est ce que la tâche 9 consomme.

- [ ] **Étape 3 : Vérifier qu'aucune valeur n'est orpheline**

```bash
grep -c '^| ' DESIGN_SYSTEM.md
grep -n '^| ' DESIGN_SYSTEM.md | grep -v ' | .* | .* | .* |' || echo "TOUTES LES LIGNES ONT QUATRE COLONNES"
```

Attendu : la seconde commande affiche `TOUTES LES LIGNES ONT QUATRE COLONNES`. Une ligne
sans provenance est un défaut.

- [ ] **Étape 4 : Commit**

```bash
git add DESIGN_SYSTEM.md
git commit -m "$(cat <<'EOF'
Le système de dessin est extrait des mesures

Huit familles structurelles, chaque valeur accompagnée du nœud et de la
page où elle a été relevée. Les couleurs n'y sont que des rôles : la
palette reste celle de ZENKUU.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Tâche 7 : Poser la couche de jetons `--v2-*`

**Fichiers :**
- Modifier : `apps/web/app/globals.css` (nouveau bloc `@theme`, après le bloc existant qui
  se termine avant `@theme` de la ligne ~896)
- Créer : `apps/web/app/tokens-v2.test.ts`

**Interfaces :**
- Consomme : la section 10 de `DESIGN_SYSTEM.md` (tâche 6).
- Produit : les jetons `--v2-*` que les sous-projets B à E consomment.

- [ ] **Étape 1 : Écrire le test qui échoue**

Créer `apps/web/app/tokens-v2.test.ts` :

```ts
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * LA COUCHE `--v2-*` EST INERTE, ET CE TEST L'Y OBLIGE
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Le sous-projet A pose des jetons et ne les consomme pas : son critère
 * d'achèvement est que le site soit INCHANGÉ à l'écran. Une classe `v2-` écrite par
 * inadvertance dans un composant romprait cette garantie sans que rien ne le
 * signale — la page rendrait simplement un peu différemment.
 *
 * Ce test tient aussi les deux documents alignés : un jeton posé dans la feuille de
 * style sans figurer dans DESIGN_SYSTEM.md est un jeton sans provenance, et un jeton
 * documenté mais absent de la feuille est une promesse non tenue.
 */

const CSS = readFileSync(
  fileURLToPath(new URL('./globals.css', import.meta.url)),
  'utf8',
)
const SYSTEME = readFileSync(
  fileURLToPath(new URL('../../../DESIGN_SYSTEM.md', import.meta.url)),
  'utf8',
)

const declares = [...CSS.matchAll(/^\s+(--v2-[a-z0-9-]+):/gm)].map((m) => m[1] as string)

describe('la couche de jetons --v2-*', () => {
  it('déclare au moins un jeton', () => {
    expect(declares.length).toBeGreaterThan(0)
  })

  it('ne déclare aucun jeton de couleur : la palette reste celle de ZENKUU', () => {
    expect(declares.filter((nom) => nom.startsWith('--v2-color-'))).toEqual([])
  })

  it('documente chaque jeton déclaré dans DESIGN_SYSTEM.md', () => {
    expect(declares.filter((nom) => !SYSTEME.includes(nom))).toEqual([])
  })

  it('déclare chaque jeton que DESIGN_SYSTEM.md promet', () => {
    const promis = [...new Set([...SYSTEME.matchAll(/`(--v2-[a-z0-9-]+)`/g)].map((m) => m[1] as string))]
    expect(promis.filter((nom) => !declares.includes(nom))).toEqual([])
  })
})
```

- [ ] **Étape 2 : Lancer le test pour le voir échouer**

```bash
bunx vitest run apps/web/app/tokens-v2.test.ts
```

Attendu : ÉCHEC sur « déclare au moins un jeton » — aucun `--v2-*` n'existe encore.

- [ ] **Étape 3 : Poser les jetons**

Insérer dans `apps/web/app/globals.css`, juste avant le second bloc `@theme` (ligne ~896,
celui qui reroute les jetons hérités de shadcn/ui), un bloc délimité :

```css
/* ─────────────────────────────────────────────────────────────────────────────
   COUCHE `--v2-*` — LA STRUCTURE RELEVÉE, PAS ENCORE CONSOMMÉE
   ─────────────────────────────────────────────────────────────────────────────
   Ces jetons portent la densité, le rythme d'espacement, l'échelle typographique
   et les rayons relevés lors du sous-projet A. Ils COHABITENT avec les jetons
   existants : rien ne les consomme tant que le sous-projet B n'a pas commencé, et
   le site rend exactement comme avant.

   Aucun jeton de COULEUR ici. La palette de ZENKUU ne change pas ; ce qui change,
   c'est la structure qui la met en scène. `apps/web/app/tokens-v2.test.ts` fait
   respecter cette règle, ainsi que la correspondance avec DESIGN_SYSTEM.md.

   La dernière étape de la migration complète est un renommage mécanique qui laisse
   tomber le préfixe `--v2-`, une fois les anciens jetons retirés.
   ───────────────────────────────────────────────────────────────────────────── */
@theme {
  /* Reprendre ici, une par une, les lignes de la section 10 de DESIGN_SYSTEM.md.
     Chaque jeton garde en commentaire le nœud et la page d'où sa valeur vient. */
}
```

Remplir le bloc à partir de la section 10 de `DESIGN_SYSTEM.md`, un jeton par ligne, avec
sa provenance en commentaire.

⚠️ **Les tailles s'écrivent en `rem`**, comme les `--text-*` existants — `0.875rem` et non
`14px`. Ce n'est pas une préférence : le test de la tâche 8 convertit les valeurs `rem` en
pixels pour les confronter à l'échelle de `DESIGN.md`, et une valeur écrite en pixels lui
échapperait silencieusement. La vérification passerait alors au vert sur une échelle
incomplète, ce qui est pire que de ne pas vérifier du tout.

- [ ] **Étape 4 : Lancer le test pour le voir passer**

```bash
bunx vitest run apps/web/app/tokens-v2.test.ts
```

Attendu : 4 tests au vert.

- [ ] **Étape 5 : Vérifier que rien ne consomme la couche**

```bash
grep -rn -- '--v2-\|v2-text-\|v2-space-\|v2-radius-' apps/web --include='*.tsx' --include='*.ts' | grep -v tokens-v2.test.ts || echo "AUCUN CONSOMMATEUR (attendu)"
```

Attendu : `AUCUN CONSOMMATEUR (attendu)`.

- [ ] **Étape 6 : Commit**

```bash
git add apps/web/app/globals.css apps/web/app/tokens-v2.test.ts
git commit -m "$(cat <<'EOF'
La couche de jetons v2 est posée, et reste inerte

Elle porte la densité, le rythme, l'échelle et les rayons relevés sur la
référence, chacun avec sa provenance. Aucun jeton de couleur : la
palette de ZENKUU ne change pas. Rien ne la consomme encore, et un test
l'y oblige.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Tâche 8 : Réconcilier `DESIGN.md` avec `impeccable`

Le détecteur `impeccable` lit l'échelle typographique dans l'entête de `DESIGN.md` et
valide contre elle **chaque taille écrite dans le dépôt**. Une échelle qui ignore les
tailles `--v2-*` ferait signaler comme défaut chaque valeur légitime des sous-projets
suivants, et la file d'exceptions de `.impeccable/config.json` recommencerait à grossir —
exactement le problème que le remplacement de l'ancienne analyse Coinbase avait résolu.

**Fichiers :**
- Modifier : `DESIGN.md` (entête YAML, clé `typography.scale`, et le corps sous « L'échelle »)
- Modifier : `apps/web/app/tokens-v2.test.ts` (un test de plus)

**Interfaces :**
- Consomme : les jetons `--v2-text-*` posés par la tâche 7.
- Produit : une échelle documentaire qui couvre les deux systèmes le temps de la migration.

- [ ] **Étape 1 : Écrire le test qui échoue**

Ajouter à la fin de `apps/web/app/tokens-v2.test.ts` :

```ts
const DESIGN = readFileSync(
  fileURLToPath(new URL('../../../DESIGN.md', import.meta.url)),
  'utf8',
)

describe('l’échelle typographique de DESIGN.md', () => {
  /**
   * `impeccable` valide chaque taille du dépôt contre cette échelle. Le temps de la
   * migration, elle doit porter l'UNION des deux systèmes — sinon chaque taille
   * nouvelle est signalée comme un défaut et la file d'exceptions regonfle.
   */
  it('couvre toutes les tailles déclarées par la couche --v2-*', () => {
    const tailles = new Set(
      [...DESIGN.matchAll(/^\s{4}[a-z0-9-]+:\s*(\d+)px\s*$/gm)].map((m) => Number(m[1])),
    )
    const manquantes = [...CSS.matchAll(/^\s+--v2-text-[a-z0-9-]*:\s*([\d.]+)rem;/gm)]
      .map((m) => Math.round(Number(m[1]) * 16))
      .filter((px) => !tailles.has(px))
    expect([...new Set(manquantes)]).toEqual([])
  })
})
```

- [ ] **Étape 2 : Lancer le test pour le voir échouer**

```bash
bunx vitest run apps/web/app/tokens-v2.test.ts
```

Attendu : ÉCHEC sur « couvre toutes les tailles déclarées par la couche --v2-* », avec la
liste des tailles absentes de l'échelle.

- [ ] **Étape 3 : Étendre l'échelle**

Dans l'entête YAML de `DESIGN.md`, sous `typography.scale`, ajouter les crans manquants en
gardant l'ordre croissant. Le commentaire existant au-dessus de la clé est complété :

```yaml
  # L'ÉCHELLE ÉNUMÉRÉE. Ce sont les jetons `--text-*` de `apps/web/app/globals.css`,
  # aux mêmes valeurs et dans le même ordre. Toute taille littérale écrite dans un
  # composant doit tomber sur l'un de ces crans.
  #
  # ⚠️ PENDANT LA MIGRATION, C'EST L'UNION DE DEUX SYSTÈMES. La couche `--v2-*`
  # (voir DESIGN_SYSTEM.md) ajoute ses propres crans. `impeccable` lit CETTE liste
  # pour valider chaque taille du dépôt : l'amputer d'un cran `--v2-*` ferait
  # signaler comme défaut une valeur parfaitement légitime, et regonflerait la file
  # d'exceptions de `.impeccable/config.json`. Les crans hérités disparaîtront quand
  # les anciens jetons seront retirés, à la toute fin de la migration.
```

Ajouter dans le corps du document, sous la section « L'échelle », un paragraphe qui dit
lesquels des crans appartiennent à quel système et pourquoi les deux coexistent.

- [ ] **Étape 4 : Lancer le test pour le voir passer**

```bash
bunx vitest run apps/web/app/tokens-v2.test.ts
```

Attendu : 5 tests au vert.

- [ ] **Étape 5 : Commit**

```bash
git add DESIGN.md apps/web/app/tokens-v2.test.ts
git commit -m "$(cat <<'EOF'
L'échelle typographique porte les deux systèmes

impeccable valide chaque taille du dépôt contre l'entête de DESIGN.md.
Sans l'union des deux échelles, chaque taille de la couche v2 serait
signalée comme un défaut et la file d'exceptions regonflerait.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Tâche 9 : Étendre la mesure de contraste aux rôles nouveaux

**Fichiers :**
- Modifier : `apps/web/app/globals.css` (jetons de couleur nouveaux, s'il y en a, dans le
  bloc `@theme` du thème clair **et** dans la règle `.dark`)
- Modifier : `apps/web/app/palette.test.ts` (constante `PAIRS`, ligne ~78)

**Interfaces :**
- Consomme : la section 9 de `DESIGN_SYSTEM.md` (tâche 6), qui signale explicitement les
  rôles sans jeton ZENKUU correspondant.
- Produit : la garantie que la contrainte n°3 de `DESIGN.md` — les deux thèmes à chaque
  écran, contrastes mesurés et rejoués — reste vraie sur les écrans migrés.

- [ ] **Étape 1 : Lister les rôles sans jeton**

Relire la section 9 de `DESIGN_SYSTEM.md`. En extraire la liste des rôles de couleur
observés sur la référence qui n'ont **aucun** jeton ZENKUU correspondant — typiquement le
fond d'une ligne de tableau survolée, ou le fond d'un en-tête de colonne collant.

**Si cette liste est vide, la tâche est un no-op :** le noter en une ligne dans le message
de commit de la tâche 11 et passer à la tâche 10. Ce n'est pas un échec, c'est le résultat
attendu quand la densité nouvelle se contente des surfaces déjà déclarées.

- [ ] **Étape 2 : Écrire le test qui échoue**

Pour chaque rôle nouveau, ajouter la paire correspondante à `PAIRS` dans
`apps/web/app/palette.test.ts`, avec son seuil — `4.5` pour du texte normal, `3` pour un
élément graphique :

```ts
  ['--color-ink', '--color-surface-hover', 4.5],
  ['--color-ink-muted', '--color-surface-hover', 4.5],
```

- [ ] **Étape 3 : Lancer le test pour le voir échouer**

```bash
bunx vitest run apps/web/app/palette.test.ts
```

Attendu : ÉCHEC sur « déclare les jetons que les paires de contraste mettent en jeu », le
jeton n'étant pas encore déclaré.

- [ ] **Étape 4 : Déclarer les jetons dans les deux thèmes**

Ajouter chaque jeton nouveau au bloc `@theme` (thème clair, valeurs par défaut de
Tailwind 4) **et** à la règle `.dark`. Un jeton déclaré d'un seul côté rend le thème
manquant faux sans que rien ne le signale à l'écran.

Choisir les teintes dans la palette ZENKUU — pas dans celle de la référence : ce sont des
paliers de surface, donc un éclaircissement du palier voisin, conformément à la règle
« pas d'ombre entre les étages » de `DESIGN.md`.

- [ ] **Étape 5 : Lancer le test pour le voir passer**

```bash
bunx vitest run apps/web/app/palette.test.ts
```

Attendu : toutes les paires au vert, dans les deux thèmes. Si une paire échoue, le message
donne le ratio obtenu — ajuster la teinte jusqu'au seuil, ne jamais abaisser le seuil.

- [ ] **Étape 6 : Commit**

```bash
git add apps/web/app/globals.css apps/web/app/palette.test.ts
git commit -m "$(cat <<'EOF'
Les rôles de couleur nouveaux passent la mesure de contraste

La densité relevée sur la référence demande des surfaces que ZENKUU
n'avait pas. Elles sont déclarées dans les DEUX thèmes et leurs paires
entrent dans palette.test.ts, sinon la contrainte n°3 de DESIGN.md
cesserait d'être vérifiée sur les écrans migrés.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Tâche 10 : Lever la contradiction avec le cahier des charges

`ZENKUU.md` §7 énonce que le système de dessin ne change que sur demande explicite, et
§3.1 le décrit comme « tranché, en place ». Sans renvoi vers la spec, le cahier des
charges et le code se contrediraient dès le sous-projet B.

**Fichiers :**
- Modifier : `ZENKUU.md` (sous `### 3.1 Design system`, ligne 45 ; ligne 47 ; ligne 261 ;
  sous `## 7. Contraintes non négociables`, ligne 672)

⚠️ **`ZENKUU.md` nomme « Geist » à TROIS endroits** — lignes 47, 261 et 672 —, et non au
seul endroit que corrige l'étape 2. La police retenue est **Figtree**, choisie par mesure
(voir le tableau de `DESIGN.md`) ; les trois mentions sont donc périmées et l'étape 1 les
corrige toutes, sans quoi la vérification de l'étape 3 échouerait sur celles qui restent.

**Interfaces :**
- Consomme : la spec du sous-projet A.
- Produit : un cahier des charges qui ne contredit plus le dépôt.

- [ ] **Étape 1 : Amender la section 3.1**

Insérer immédiatement sous le titre `### 3.1 Design system (tranché, en place)` :

```markdown
> ⚠️ **Une migration est en cours.** Le système décrit ci-dessous reste celui du site
> tel qu'il rend aujourd'hui. Une couche `--v2-*` cohabite avec lui dans
> `globals.css` : elle porte la structure — densité, rythme, échelle, rayons —
> relevée sur la référence du secteur, et documentée dans `DESIGN_SYSTEM.md`. **Les
> couleurs, elles, ne changent pas** : sombre par défaut, bleu glacier.
>
> Le cadre de la migration vit dans
> `docs/superpowers/specs/2026-08-29-coingecko-audit-design-system-design.md`.
```

Puis corriger les deux mentions périmées de la police, dans la même section :

- **ligne 47**, `- Police d'interface et d'affichage : **Geist** · nombres : **DM Mono**`
  devient `- Police d'interface et d'affichage : **Figtree** · nombres : **DM Mono**` ;
- **ligne 261**, `Geist, variable,` devient `Figtree, variable,`.

`DESIGN.md` documente le passage à Figtree et la mesure qui l'a décidé — le rapport
hauteur d'x sur hauteur de capitale. `ZENKUU.md` ne l'avait pas suivi.

- [ ] **Étape 2 : Amender la section 7**

Remplacer la dernière puce de `## 7. Contraintes non négociables` — celle qui commence par
« Le design system (Geist + DM Mono… » — par :

```markdown
- Le design system est la base par défaut ; tout changement doit être explicitement
  demandé. **Une telle demande a été formulée le 29 août 2026** et son cadre est
  écrit dans `docs/superpowers/specs/2026-08-29-coingecko-audit-design-system-design.md` :
  la structure migre vers celle de la référence du secteur, la palette ZENKUU et le
  sombre par défaut sont conservés. Cette puce reste en vigueur pour tout changement
  qui sortirait de ce cadre.
```

Noter que la puce d'origine décrit « Geist + DM Mono », alors que `DESIGN.md` a depuis
retenu **Figtree** : corriger au passage, la mention est périmée.

- [ ] **Étape 3 : Vérifier qu'aucune contradiction ne subsiste**

```bash
grep -n "Geist" ZENKUU.md || echo "PLUS DE MENTION PÉRIMÉE (attendu)"
grep -c "2026-08-29-coingecko-audit-design-system-design.md" ZENKUU.md
```

Attendu : `PLUS DE MENTION PÉRIMÉE (attendu)` puis `2`.

- [ ] **Étape 4 : Commit**

```bash
git add ZENKUU.md
git commit -m "$(cat <<'EOF'
Le cahier des charges reconnaît la migration en cours

§7 exigeait une demande explicite pour toucher au système de dessin :
elle existe, elle est datée, et les deux sections renvoient désormais
vers elle. La mention « Geist » était périmée depuis le passage à
Figtree, elle tombe avec.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Tâche 11 : Vérification finale et preuve d'invariance

**Fichiers :**
- Modifier : `COINGECKO_AUDIT.md` (section « Synthèse — données sans source gratuite »)
- Créer : `docs/references/zenkuu-apres/` (captures, non versionnées)

**Interfaces :**
- Consomme : tout ce qui précède.
- Produit : le rapport de fin de sous-projet A et la liste de questions posées à
  l'exploitant, qui conditionne le contenu des sous-projets suivants.

- [ ] **Étape 1 : Toutes les vérifications automatiques**

```bash
node scripts/audit-coingecko-doc.mjs
bunx vitest run
bun run lint
bun run typecheck
```

Attendu : code de sortie 0 pour la première, la troisième et la quatrième.

⚠️ **`--strict` n'est PLUS le critère de clôture du sous-projet A**, la tâche 5 ayant été
réduite aux pages archétypes. Il continuera d'échouer sur les pages différées, et c'est
juste : l'audit n'est pas complet, il est délibérément partiel. Le critère devient :

1. `node scripts/audit-coingecko-doc.mjs` **sans** `--strict` rend le code 0 — donc chaque
   entrée écrite est structurellement valide et rattachée à la liste ;
2. **toutes les pages archétypes de la tâche 5 sont cochées** ;
3. la note expliquant que les cases restantes sont différées, et pourquoi, figure en tête
   de la liste des pages.

`--strict` reste la porte de la complétude finale, qui se franchira quand la migration
aura audité les dernières pages.

⚠️ **`bunx vitest run` échoue déjà avant ce sous-projet**, sur une assertion périmée de
`apps/web/components/tools/treemap.test.ts` (`heatTone(undefined)` y est attendu en
`surface-muted`, alors que le code rend `heat-flat` depuis une correction de contraste
mesurée). Ce défaut vient de `main`, pas d'ici. Le critère est donc : **aucun échec
NOUVEAU par rapport à cette ligne de base**, et le décompte des tests en échec doit rester
à un seul, celui-là. Un second échec, quel qu'il soit, bloque la clôture du sous-projet.

**Ne pas lancer `next build`** : le serveur de développement tourne.

- [ ] **Étape 2 : Les trois scripts d'audit du dépôt**

```bash
node scripts/audit-responsive.mjs
node scripts/audit-overflow.mjs /
node scripts/audit-liens.mjs
```

Attendu : aucun défaut nouveau par rapport à l'état d'avant-migration. Le sous-projet A ne
touchant à aucun composant, tout défaut signalé ici préexiste ou vient d'une erreur de
saisie dans `globals.css`.

- [ ] **Étape 3 : Constituer la preuve d'invariance**

Recapturer les douze vues de la tâche 1, aux mêmes URL, mêmes thèmes, même largeur, vers
`docs/references/zenkuu-apres/`. Comparer chaque paire à son homologue de
`docs/references/zenkuu-avant/`.

Attendu : **aucune différence visible**. Une différence signale qu'un jeton `--v2-*` est
consommé quelque part, ou qu'un jeton existant a été modifié par inadvertance — dans les
deux cas, corriger avant de clore le sous-projet.

- [ ] **Étape 4 : Écrire la synthèse des données manquantes**

Compléter le tableau de la section « Synthèse — données sans source gratuite » de
`COINGECKO_AUDIT.md` à partir du champ « Données requises » de toutes les entrées.
Vérifier que les cas connus y figurent : NFT et floor price (aucune source depuis la
fermeture de l'API Reservoir le 15 octobre 2025), et toute donnée relevée pendant l'audit
qui n'a pas d'équivalent chez CoinGecko, Binance, Frankfurter, Yahoo, CoinPaprika,
alternative.me ou DefiLlama.

- [ ] **Étape 5 : Commit**

```bash
git add COINGECKO_AUDIT.md
git commit -m "$(cat <<'EOF'
Le sous-projet A est clos : l'audit est complet et le site inchangé

--strict passe, les douze vues d'avant et d'après sont identiques, et la
synthèse liste les données qu'aucune source gratuite ne couvre.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

- [ ] **Étape 6 : Rendre compte et poser les questions**

Présenter à l'exploitant :

1. `COINGECKO_AUDIT.md` et `DESIGN_SYSTEM.md`, pour validation — c'est le point de
   validation qu'il a demandé avant toute implémentation.
2. Le tableau de synthèse des données sans source gratuite, **posé en question** : pour
   chaque ligne, garder la page avec un état vide explicite, la retirer du périmètre, ou
   chercher une source.
3. Toute page marquée « à réauditer » faute de session valide.
4. Les écarts entre la liste de pages attendue par l'exploitant et celle réellement
   relevée à l'étape 0.

Les questions sont posées avec l'outil `/question`, conformément à la consigne.

---

## Ce qui vient après

Le sous-projet A terminé et validé, le suivant est **B — socle de composants et chrome**,
qui reçoit sa propre spec puis son propre plan. Il consomme la couche `--v2-*` et
l'inventaire de composants partagés produit par l'audit. C'est lui qui rendra la couche de
jetons vivante : la preuve d'invariance de la tâche 11 cesse alors d'être vraie, et c'est
normal.

**Une condition préalable à B, pas à A :** la clé Demo CoinGecko doit être posée en
`COINGECKO_API_KEY` dans `apps/web/.env.local`, puis le serveur de développement
redémarré. Le sous-projet A n'en a pas besoin — il lit le site de CoinGecko, pas son API —
mais B alimente des composants réels et se heurterait aux 8 requêtes par fenêtre de
l'endpoint public. Vérifier avant d'ouvrir B :

```bash
grep -q '^COINGECKO_API_KEY=.' apps/web/.env.local && echo "CLÉ POSÉE" || echo "CLÉ MANQUANTE — B est bloqué"
```
