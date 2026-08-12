# Refonte : en-tête, largeur, typographie, marchés, actualités, convertisseur

**Date** : 2026-08-11
**État** : validé (toutes les décisions arrêtées avec l'utilisateur)
**Livraison** : 4 lots, validation utilisateur entre chaque

---

## 1. Intention

Six chantiers demandés en une fois. Ils se rangent en deux familles :

- **Une refonte de la coque** — en-tête, largeur de page, polices, animation des menus.
  Elle touche tout le site et conditionne le reste : la construire en premier évite de
  reprendre chaque page deux fois.
- **Un approfondissement du contenu** — pages de classement, icônes, fiches d'actifs,
  fil d'actualités, sélecteur du convertisseur.

La référence visuelle est **Token Terminal** pour la coque, **OKX** pour l'animation des
menus, **CoinGecko** pour la densité des pages de marché. On en reprend la *grammaire*,
jamais la palette ni l'identité — le §7 du projet l'interdit et les jetons de couleur
ZENKUU restent inchangés.

---

## 2. Ce qui est explicitement hors périmètre

- Aucun changement de palette de couleurs.
- Aucun changement du rayon de bordure (angles vifs, `--radius-*: 0`).
- Aucun ajout de fonction d'achat, de vente ou d'ordre (§7).
- Aucun refactoring non lié aux six chantiers.

---

## 3. Décisions arrêtées

| Sujet | Décision |
|---|---|
| En-tête | Pleine largeur, logo au bord gauche, menus alignés à sa droite |
| Second groupe de nav | Oui — 3 raccourcis à pastille après un filet |
| Largeur de contenu | **1440px centré** (mesuré sur Token Terminal), `padding-inline: 24px` |
| Largeur des bandes | Pleine largeur — en-tête uniquement |
| Texte courant | Bridé à ~75 caractères sur les pages éditoriales uniquement |
| Polices | Geist + Geist Mono, corps 15px |
| Animation des menus | Glissement bas 8px + fondu · 180 ms ouverture / 120 ms fermeture |
| Logos actions & ETF | API de logos par domaine, repli monogramme |
| Icônes matières premières | Emoji dans une pastille teintée par famille |
| Bandeau des pages de marché | Adapté par classe, uniquement des données réelles |
| Fiche action / ETF | Identité + performances + amplitude 52 s. + fondamentaux + actualités |
| Sources d'actualités | ~25 flux : anglais international + français de référence |
| Archive d'actualités | Table Turso alimentée par cron, purge à 90 jours |
| Filtres d'actualités | Thème · Source · Langue · Actif mentionné |
| Images manquantes | Résolution `og:image` de l'article, repli pastille de marque |
| Sélecteur du convertisseur | Panneau de recherche à sections |
| Clés d'API | Codé avec repli ; l'utilisateur renseigne `.env.local` plus tard |

---

## 4. Lot 1 — Socle visuel

### 4.1 Largeur : unifier trois valeurs contradictoires

L'état actuel fixe la largeur à **trois endroits, avec trois valeurs différentes** — ce
qui produit le désalignement visible entre l'en-tête et le contenu :

| Fichier | Ligne | Valeur actuelle |
|---|---|---|
| `apps/web/components/NavBar.tsx` | 128 | `max-w-[1240px]` |
| `apps/web/app/[locale]/layout.tsx` | 201 | `max-w-[1280px]` |
| `apps/web/components/Footer.tsx` | 21 | `max-w-[1120px]` |

**Décision** : deux utilitaires dans `globals.css`, parce que l'en-tête et le contenu ne
suivent pas la même règle.

```css
@layer components {
  /* Contenu — 1440px centré. */
  .shell {
    width: 100%;
    max-inline-size: 1440px;
    margin-inline: auto;
    padding-inline: 24px;
  }

  /* Bandes traversantes — l'en-tête, et rien d'autre. */
  .shell-bleed {
    width: 100%;
    padding-inline: 24px;
  }
}
```

**Correction du 11/08/2026.** La première version de cette spec prescrivait une pleine
largeur sans plafond, sur la foi d'une description erronée de Token Terminal que j'avais
fournie à l'utilisateur au moment du choix. Vérification faite sur capture d'écran :
**Token Terminal ne va pas bord à bord**. Sur une fenêtre de 1919px, son contenu court de
x=260 à x=1655 — soit un conteneur de 1440px centré, moins 24px de marge interne. Seule
sa barre de navigation traverse l'écran.

Cette structure est délibérée et se retrouve chez la plupart des terminaux de données : la
barre traverse parce qu'un filet qui s'arrête à mi-écran se lit comme un défaut
d'alignement, tandis que le contenu reste borné pour rester lisible.

1440px reste nettement plus large que les 1280px d'avant — l'élargissement demandé est
donc bien obtenu. Trois valeurs en dur deviennent deux jetons, et changer la largeur du
site redevient une modification d'une ligne.

### 4.2 Texte courant

Un second utilitaire `.prose-measure` (`max-inline-size: 75ch`) s'applique **aux
paragraphes seuls** de `/blog`, `/aide`, `/apprendre`, `/a-propos`. Titres, images,
tableaux et encadrés de ces mêmes pages restent en pleine largeur.

Raison : au-delà d'environ 90 caractères, l'œil ne retrouve plus le début de la ligne
suivante en revenant à la marge. C'est une limite physiologique, pas une préférence.

### 4.3 En-tête

`justify-between` et les deux `flex-1 basis-0` disparaissent — ils existaient pour
centrer la nav, ce qui n'est plus l'objectif.

```
│← 24px →│ [logo] Marchés▾ Données▾ Analyse▾ Actualités▾ Plus▾ │ Heatmap● Screener● Sentiment●   …ml-auto…   🔍 Rechercher ⌘K  [Connexion]  ☰ │← 24px →│
```

- **Groupe 1** — logo, puis les 5 menus déroulants, `gap-1`.
- **Filet** — `<span aria-hidden>` de 1px, hauteur 20px, `bg-border-subtle`.
- **Groupe 2** — 3 raccourcis directs (`/heatmap`, `/screener`, `/sentiment`), chacun
  suivi d'une pastille de 6px. Masqué sous `xl` (place insuffisante).
- **Groupe 3** — `ml-auto` : recherche, authentification, tiroir.

Le commentaire d'en-tête de `NavBar.tsx` (« bande centrée façon AniList », lignes 17-23)
documente un choix que cette refonte annule. Il est **réécrit**, pas supprimé : un
commentaire qui contredit le code qu'il surmonte est pire qu'une absence de commentaire.

**Point de vigilance sur le tiroir `HeaderMenu`.** Le commentaire des lignes 118-126
explique que `relative` est posé sur le conteneur centré 1240px, et non sur le
`<header>`, faute de quoi le tiroir se collait au bord droit de l'écran — « à plusieurs
centaines de pixels du bouton qui l'ouvre ».

Cette parade **cesse de fonctionner** dès que le conteneur devient pleine largeur : il
redevient aussi large que le `<header>`, et le défaut d'origine réapparaît tel quel.

L'ancrage descend donc d'un cran : `relative` passe du conteneur au **groupe 3**
(`ml-auto`, qui contient le bouton). Le tiroir tombe alors sous son bouton quelle que
soit la largeur de la fenêtre, ce qui est la propriété réellement recherchée. Le
commentaire est réécrit pour dire cela.

### 4.4 Animation des menus

**Le blocage** : `NavBar.tsx:277` rend `{isOpen ? <div/> : null}`. Un élément démonté ne
peut pas s'animer en sortie — React le retire de l'arbre avant que le navigateur ne peigne
la première image de la transition.

**La solution** : garder le panneau monté pendant la fermeture.

```
état          monté ?   data-state   opacity   translateY
fermé         non       —            —         —
ouverture     oui       "open"       0 → 1     -8px → 0     180 ms
fermeture     oui       "closed"     1 → 0     0 → -8px     120 ms
puis          non       —            —         —            (démontage sur transitionend)
```

Le démontage est déclenché par `transitionend`, pas par un `setTimeout` — un délai codé
en dur se désynchronise de la durée CSS dès que celle-ci change, et ne se déclenche pas
du tout sous `prefers-reduced-motion`. Un garde-fou `setTimeout` de 400 ms couvre le cas
où `transitionend` ne serait jamais émis (onglet en arrière-plan).

Fermeture plus rapide qu'ouverture (120 vs 180 ms) : une fermeture lente donne
l'impression que le menu colle au curseur.

Nouveaux jetons dans `@theme`, à côté des `--duration-state` / `--duration-move`
existants :

```css
--duration-menu-in: 180ms;
--duration-menu-out: 120ms;
```

La règle `prefers-reduced-motion` déjà présente dans `globals.css` les neutralise sans
code supplémentaire — c'est précisément l'intérêt de passer par des jetons.

### 4.5 Polices

`apps/web/app/[locale]/layout.tsx` charge aujourd'hui trois familles : `Inter`,
`IBM_Plex_Sans`, `JetBrains_Mono`.

**Remplacement** par `Geist` et `Geist_Mono` (`next/font/google`).

Point clé : les **noms de variables CSS sont conservés**, seules leurs valeurs changent.

| Variable | Avant | Après |
|---|---|---|
| `--font-inter` | Inter | Geist |
| `--font-display-brand` | IBM Plex Sans | Geist (graisse 700) |
| `--font-mono-numeric` | JetBrains Mono | Geist Mono |

Les centaines de composants qui consomment `--font-sans`, `--font-display` et
`--font-mono` ne sont pas touchés. Le nom `--font-inter` devient trompeur ; il est
renommé `--font-ui` dans un second temps, une fois le rendu validé — un renommage et un
changement de fonte dans le même commit rendraient un éventuel retour en arrière
inutilement pénible.

Le bloc de commentaire de `globals.css` justifiant le système à deux polices (Inter +
IBM Plex) est réécrit : Geist couvre désormais les deux rôles par la graisse.

**Corps à 15px — surtout pas via `html { font-size: 15px }`.**

C'est la solution qui vient à l'esprit, et elle casserait la mise en page du site entier.
Tailwind 4 exprime **tout son barème d'espacement en `rem`** : `p-4`, `gap-6`, `h-16`,
`space-y-8`… Changer la taille de police racine de 16 à 15px multiplie donc chaque marge,
chaque hauteur et chaque gouttière du site par 0,9375. Ce n'est pas un réglage
typographique, c'est une réduction silencieuse de toute la grille de 4px que le §3.1
définit.

On redéfinit à la place les **jetons de l'échelle typographique**, qui n'affectent que le
texte :

```css
@theme {
  --text-base: 0.9375rem;  /* 15px */
  --text-sm: 0.875rem;     /* 14px */
}
```

L'espacement reste calé sur une racine à 16px, la grille de 4px est intacte, et seul le
corps de texte grossit — ce qui est exactement la demande.

Nav en graisse 500.

**Vérification requise à l'implémentation** : confirmer que `Geist` et `Geist_Mono` sont
exportés par `next/font/google` dans la version de Next installée (^16.3.0). Repli si
absent : le paquet npm `geist`.

---

## 5. Lot 2 — Marchés et icônes

### 5.1 Le bug du monogramme

`SearchOverlay.tsx:327` et `AssetTile.tsx:55` construisent le monogramme par
`symbol.slice(0, 3)`. Pour `AAPL` cela donne `AAP` — un fragment de ticker qui ne
désigne rien.

**Correction** : le monogramme se prend sur le **nom**, sur 2 caractères, initiales des
deux premiers mots quand il y en a plusieurs.

```
Apple            → Ap
Meta Platforms   → MP
JPMorgan Chase   → JC
```

### 5.2 `AssetLogo` — un composant, une branche par classe

Tous les rendus d'icônes actuels sont remplacés par un composant unique.

| Classe | Source | Repli |
|---|---|---|
| `crypto` | image CoinGecko (déjà disponible) | monogramme |
| `stock`, `etf` | API de logos, via ticker → domaine | monogramme |
| `commodity` | emoji en pastille teintée par famille | — |
| `forex` | drapeau du pays de la devise | code ISO |
| `index` | monogramme de la place de cotation | — |

Le repli monogramme est le **même code** pour toutes les branches. Une seule
implémentation à corriger, un seul rendu à reconnaître pour le lecteur.

Le composant ne fait **aucune requête depuis le navigateur** vers l'API de logos : l'URL
est construite côté serveur à partir de la table d'identité, et `onError` bascule sur le
repli. Sans `LOGO_API_KEY`, la branche action/ETF part directement au repli — conforme
au §5 (« une source sans clé est simplement désactivée »).

### 5.3 Table d'identité des actifs

Nouveau fichier `packages/data/src/asset-identity.ts`, statique et sans clé.

```ts
interface AssetIdentity {
  symbol: string
  name: string
  domain?: string        // logo (AAPL → apple.com)
  sector?: string
  country?: string
  exchange?: string
  currency?: string
  family?: CommodityFamily   // 'precious' | 'industrial' | 'energy' | 'agricultural'
  emoji?: string
}
```

Elle sert **trois** consommateurs — le logo, le bandeau de page, le bloc d'identité de la
fiche. Une table par consommateur divergerait au premier ajout de valeur.

Couverture : les ~150 actifs actuellement suivis. Un actif absent de la table dégrade
proprement (monogramme, sections d'identité masquées) ; il n'échoue jamais.

### 5.4 Bandeau des pages de classement

`MarketPageView` reçoit une configuration de bandeau par classe. Chaque carte n'affiche
que ce que la source fournit réellement — aucune case n'est inventée, aucune colonne ne
se remplit de « — ».

| Classe | Carte 1 | Carte 2 | Carte 3 |
|---|---|---|---|
| `crypto` | capitalisation totale + sparkline | tendances | plus fortes hausses |
| `stock` | variation moyenne + sparkline | tendances | plus fortes hausses |
| `etf` | variation moyenne | ETF les plus suivis | plus fortes hausses |
| `commodity` | métaux précieux (Or, Argent) | énergie (WTI, Brent) | plus fortes hausses |
| `forex` | paires de référence (EUR/USD…) | variation moyenne | plus fortes variations |
| `index` | indices de référence | variation moyenne | plus fortes hausses |

La bande de statistiques actuelle (`MarketStatsStrip`) est conservée sous le bandeau :
elle porte la mention « calculé sur les N actifs suivis, pas sur l'ensemble du marché »,
qui est une précision d'honnêteté à ne pas perdre.

### 5.5 Fiche action / ETF / indice / devise

Quatre sections, chacune indépendante et dégradant seule :

1. **Identité** — secteur, pays, place, devise. Source : table statique. Sans clé.
2. **Performances multi-périodes** — 1 j / 7 j / 1 m / 1 an. Source : Yahoo, déjà en place.
3. **Amplitude 52 semaines** — barre de position, réutilise `AssetRangeBar`. Sans clé.
4. **Fondamentaux** — capitalisation, PER, dividende. **Exige `TWELVE_DATA_API_KEY`** ;
   sans elle, la section est **masquée**, pas vide.

Sections 1 à 3 fonctionnent dès aujourd'hui, sans aucune inscription.

---

## 6. Lot 3 — Actualités

### 6.1 Sources

`FEEDS` dans `providers/news.ts` compte aujourd'hui **4 entrées**. Il passe à ~25.

`FeedSource` gagne un champ `lang: 'fr' | 'en'`. `NewsCategory` passe de 3 à 6 valeurs :
`crypto`, `marches`, `economie`, `regulation`, `matieres`, `technologie`.

```
Crypto EN     CoinDesk · The Block · Decrypt · Cointelegraph · Bitcoin Magazine
Marchés EN    Reuters Business · CNBC · MarketWatch · Yahoo Finance
Régulation EN SEC · CFTC · Federal Reserve
Crypto FR     Journal du Coin · Cryptoast · Cointribune
Marchés FR    Les Échos · La Tribune · BFM Bourse · France Info éco
```

La liste définitive est arrêtée à l'implémentation, après vérification que chaque flux
répond et publie effectivement. **Un flux mort n'est pas ajouté** — il produirait une
source cochable dans le filtre qui ne renverrait jamais rien.

### 6.2 Archive

**Contrainte** : un flux RSS ne renvoie que ses ~30 derniers articles. Aucune requête ne
peut récupérer les actualités d'il y a trois mois. Le calendrier **exige** une
persistance.

Nouvelle table dans `packages/db/src/schema.ts` :

```ts
export const newsArticles = sqliteTable('news_articles', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  url: text('url').notNull(),              // clé de déduplication
  title: text('title').notNull(),
  excerpt: text('excerpt'),
  imageUrl: text('image_url'),
  sourceId: text('source_id').notNull(),
  category: text('category').notNull(),
  lang: text('lang').notNull(),
  publishedAt: integer('published_at').notNull(),
  collectedAt: integer('collected_at').notNull(),
}, (t) => [
  uniqueIndex('news_url_idx').on(t.url),
  index('news_published_idx').on(t.publishedAt),
])
```

- **Déduplication par URL canonique** (paramètres `utm_*` retirés avant insertion) : le
  même article apparaît dans plusieurs collectes successives et parfois dans deux flux.
- **`published_at` indexé** : c'est la seule colonne sur laquelle le calendrier filtre.
- **Purge à 90 jours**, exécutée par la même tâche que la collecte.

Route `/api/cron/actualites`, protégée par `CRON_SECRET` — le même mécanisme que
`/api/cron/alertes`, déjà en place. Déclarée dans `apps/web/vercel.json`.

**Lecture** : aujourd'hui → flux en direct ; toute date antérieure → base. Sans
`TURSO_DATABASE_URL`, le calendrier est désactivé avec un message explicite, et le fil du
jour fonctionne normalement (§5).

**Limite à annoncer au lecteur** : l'archive ne remonte pas avant la mise en service. Le
calendrier grise les dates antérieures et affiche « aucune actualité archivée avant le
JJ/MM/AAAA ». Une date vide sans explication se lit comme une panne.

### 6.3 Images manquantes

`extractImage` (`news.ts:176`) cherche `media:content`, `enclosure` et `<img>`. Quand
aucun n'est présent, l'article n'a pas d'image.

Chaîne de résolution :

1. Image du flux RSS.
2. Sinon → requête `GET` de l'article côté serveur, lecture de `<meta property="og:image">`.
3. Sinon → pastille de marque du média.

L'étape 2 est faite **une seule fois par article**, au moment de la collecte par le cron,
et le résultat est stocké dans `image_url`. Elle ne se produit donc jamais pendant le
rendu d'une page. Requête plafonnée à 5 s, `Range: bytes=0-32768` (les balises `meta`
sont dans le `<head>`), échec silencieux vers l'étape 3.

### 6.4 Filtres

| Filtre | Nature | Fondement |
|---|---|---|
| Thème | classification | porté par le flux — vrai par construction |
| Source | sélection | identité du flux |
| Langue | sélection | déclarée par le flux |
| Actif mentionné | **recherche plein texte** | correspondance littérale dans le titre |

**Point de conception important.** `news.ts:22-31` pose un principe explicite : la
rubrique vient du flux et n'est *jamais* déduite du texte, parce que deviner par
mots-clés « produirait des étiquettes fausses — donc de la donnée inventée », proscrite
au même titre qu'un chiffre inventé (§5).

Le filtre « actif mentionné » ne viole pas ce principe **à condition d'être une recherche
et non une classification**. Concrètement :

- Il répond à « montre-moi les articles où le mot *Bitcoin* apparaît » — une affirmation
  vraie par construction, vérifiable par le lecteur qui lit le titre.
- Il ne pose **aucune étiquette** sur l'article et n'affiche jamais « cet article
  parle de Bitcoin ».
- La carte d'article ne gagne aucun badge d'actif.
- Le libellé de l'interface dit « Articles mentionnant **Bitcoin** », jamais
  « Actualités Bitcoin ».

Cette distinction n'est pas cosmétique : c'est elle qui sépare une fonction honnête d'une
donnée inventée.

### 6.5 Calendrier

Sélecteur de date, dates sans article grisées, navigation mois par mois, bornes = mise en
service et aujourd'hui. Un raccourci « Aujourd'hui » et « 7 derniers jours » couvre le cas
courant sans ouvrir le calendrier.

---

## 7. Lot 4 — Convertisseur

Le sélecteur devient un panneau flottant :

```
┌────────────────────────────────┐
│ 🔍 Rechercher un actif…        │
├────────────────────────────────┤
│ [BTC] [ETH] [EUR] [USD] [🥇 Or]│   raccourcis
├────────────────────────────────┤
│ CRYPTOMONNAIES                 │   en-tête collé
│  ₿ Bitcoin              BTC    │
│ DEVISES                        │
│  € Euro                 EUR    │
│ MATIÈRES PREMIÈRES             │
│  🥇 Or                  XAU    │
└────────────────────────────────┘
```

Il reprend la mécanique clavier de `SearchOverlay` (flèches, `Entrée`, `Échap`,
`aria-activedescendant`, défilement suivant l'entrée active) : même comportement, rien de
nouveau à apprendre. Les icônes viennent d'`AssetLogo` (lot 2), l'animation d'ouverture de
`usePresence` (lot 1).

**Ce que le remplacement coûte, et qu'il faut assumer.** Un `<select>` natif est
utilisable au clavier sans qu'on écrive une ligne. Le remplacer OBLIGE à réimplémenter
tout ce qu'il donnait gratuitement. Un sélecteur plus joli mais inaccessible serait une
régression, pas une amélioration — c'est la seule raison pour laquelle ce composant est
plus long que la liste déroulante qu'il remplace.

---

## 8. Clés d'API

Trois variables sont ajoutées à `.env.example`, documentées selon la convention du
fichier (à quoi elle sert, ce qui se passe sans elle, où l'obtenir).

| Variable | Sans elle |
|---|---|
| `LOGO_API_KEY` | logos actions/ETF → monogrammes |
| `TWELVE_DATA_API_KEY` | section « Fondamentaux » masquée |
| `TURSO_DATABASE_URL` | calendrier désactivé, fil du jour intact |

Aucune ne bloque une livraison. Chaque repli est écrit et testé **en même temps** que le
chemin nominal — un repli jamais exercé est un repli cassé.

---

## 9. Ordre et validation

| Lot | Contenu | Dépend de |
|---|---|---|
| 1 | largeur, en-tête, polices, animation | — |
| 2 | `AssetLogo`, table d'identité, bandeaux, fiches | lot 1 |
| 3 | sources, archive, filtres, calendrier, images | lot 1 |
| 4 | sélecteur du convertisseur | lots 1 et 2 |

Validation utilisateur après chaque lot. Le lot 1 conditionne tout : une correction de cap
sur l'en-tête coûte alors un lot, pas l'ensemble du chantier.

`bun run lint`, `typecheck`, `test` et `build` doivent passer à la fin de chaque lot.

---

## 10. Risques

| Risque | Parade |
|---|---|
| `Geist` absent de `next/font/google` en Next 16 | vérifier avant d'écrire ; repli sur le paquet `geist` |
| L'API de logos tombe ou change de contrat | repli monogramme systématique, jamais d'image cassée |
| Un flux RSS meurt silencieusement | flux vérifiés à l'ajout ; une source sans article ne s'affiche pas dans le filtre |
| Cron Vercel limité à 1/jour sur le palier Hobby | documenté dans `.env.example`, comme pour `/api/cron/alertes` |
| La pleine largeur casse une mise en page existante | revue page par page au lot 1 avant validation |
| Un actif hors table d'identité | dégradation propre : monogramme, sections masquées |
