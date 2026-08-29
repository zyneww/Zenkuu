# Migration ZENKUU → réplique CoinGecko — Sous-projet A : audit et système de dessin

- **Date** : 29 août 2026
- **Statut** : spec validée, plan d'implémentation à écrire
- **Périmètre de ce document** : le sous-projet A uniquement. Les sous-projets B à E
  reçoivent chacun leur propre spec, écrite au moment de les entamer.

---

## 1. Contexte

ZENKUU compte 62 pages et 288 composants, en français, sombre par défaut, avec un système
de dessin propre décrit dans `DESIGN.md` et un cahier des charges dans `ZENKUU.md`.
CoinGecko y est déjà la référence mesurée : `DESIGN.md` compare les rayons des deux sites
et note que le palier à 16 px est *délibérément* conservé comme l'un des rares traits qui
distinguent la page de sa référence.

La demande est d'aller au bout : faire de ZENKUU une réplique fonctionnelle de CoinGecko,
pour ensuite décider page par page de ce qui est gardé, aménagé ou retiré. La fidélité
prime sur la vitesse, et chaque page doit rester identifiable et réversible.

`ZENKUU.md` §7 énonce que le système de dessin ne change que sur demande explicite.
**Ce document est cette demande explicite.** Un renvoi vers lui est ajouté à `ZENKUU.md`
§3.1 et §7 dans le cadre du sous-projet A, faute de quoi le cahier des charges et le code
se contrediraient.

## 2. Découpage

Le chantier complet est trop gros pour une spec unique. Il est découpé en cinq
sous-projets, chacun avec sa spec, son plan et son cycle d'implémentation.

| # | Sous-projet | Livrable | Dépend de |
|---|---|---|---|
| **A** | Audit et système de dessin | `COINGECKO_AUDIT.md`, `DESIGN_SYSTEM.md`, jetons | — |
| **B** | Socle de composants et chrome | navigation, mega-dropdowns, pied de page, overlay de recherche, primitives de tableau, sparklines, onglets, tooltips, modales, toasts, pagination | A |
| **C** | Gabarit d'actif universel | page coin CoinGecko généralisée aux six classes d'actifs | A, B |
| **D** | Pages de marché | accueil, catégories, exchanges, graphiques globaux, heatmap, dominance, classements | A, B |
| **E** | Contenu et services | portefeuille, apprendre, actualités, glossaire, widgets, page API, halving, méthodologie | A, B |

L'insertion de **B** est le choix structurant. La fidélité de CoinGecko ne vit pas dans
une trentaine de mises en page mais dans une vingtaine de composants partagés que chaque
page recompose.
Migrer des pages avant que ce socle existe reviendrait à le réécrire une fois par page.

## 3. Décisions actées

1. **Palette** — la structure de CoinGecko est copiée (grille, densité, échelle
   typographique, composants, interactions) ; **les couleurs restent celles de ZENKUU** :
   sombre par défaut, bleu glacier `#a9eafe` en sombre et cyan profond `#0e7490` en clair.
   `DESIGN_SYSTEM.md` enregistre donc les couleurs de CoinGecko comme des *rôles*
   (fond, surface, filet, accent, hausse, baisse), remplis par la palette ZENKUU.
2. **Classes d'actifs** — le gabarit de page coin de CoinGecko est **généralisé aux six
   classes** (crypto, devises, actions, ETF, indices, matières premières). Traité dans le
   sous-projet C ; l'audit doit relever ce qui, dans ce gabarit, est spécifique à la crypto.
3. **Quota** — une clé Demo CoinGecko gratuite est créée par l'exploitant et posée en
   `COINGECKO_API_KEY` dans `apps/web/.env.local`. Le code la lit déjà
   (`packages/data/src/providers/coingecko.ts`) et bascule seul de 8 à 25 requêtes par
   fenêtre, avec un cache ramené de 300 s à 45 s. Un redémarrage du serveur de développement
   suffit : la variable n'est pas préfixée `NEXT_PUBLIC_`, elle n'est pas figée à la compilation.
4. **Profondeur d'audit** — protocole complet sur toutes les pages, sans échantillonnage.
5. **Approche de migration** — jetons additifs, composants isolés, **un commit par page**.
   Les nouveaux jetons cohabitent avec les anciens ; les anciens ne sont supprimés qu'à la
   toute fin de la migration.
6. **Captures de référence** — conservées sur disque dans `docs/references/coingecko/`,
   **gitignorées**. Elles ne rentrent pas dans l'historique et ne sont pas redistribuées ;
   seules les mesures, en texte, entrent dans l'audit.
7. **Nommage des jetons** — préfixe `--v2-*` pendant toute la migration
   (`--v2-text-sm`, `--v2-space-3`, `--v2-radius-control`). Aucune référence à la marque
   copiée dans le code. La dernière étape de la migration complète est un renommage
   mécanique qui laisse tomber le préfixe.
8. **Pages nécessitant un compte** — l'exploitant dispose d'une session CoinGecko déjà
   ouverte dans son Chrome. Ces pages sont donc auditées telles qu'elles se rendent.
   **Aucun identifiant n'est saisi par l'agent, à aucun moment** : l'observation se fait
   dans la session existante, rien d'autre.

## 4. Ce qui n'est pas copié

- **Marque** : logo, mascotte, nom, illustrations propriétaires. Le branding reste ZENKUU.
- **Code** : ni feuilles de style, ni SVG, ni composants JavaScript de CoinGecko. Ce qui
  est relevé, ce sont des *mesures* — couleurs, tailles, durées, courbes d'accélération,
  espacements — qui ne sont pas protégeables ; ce qui est écrit est reconstruit.
- **Textes** : aucun copier-coller. Toute la rédaction est en français, écrite pour ZENKUU.
- **Pages légales, publicitaires et carrières** : hors périmètre.

## 5. Livrables du sous-projet A

| Artefact | Emplacement | Nature |
|---|---|---|
| `COINGECKO_AUDIT.md` | racine du dépôt | une entrée par page, schéma fixe, cases à cocher |
| `DESIGN_SYSTEM.md` | racine du dépôt | le système structurel extrait, mesuré |
| Couche de jetons `--v2-*` | `apps/web/app/globals.css` | additive, inerte, rien ne la consomme encore |
| Union des échelles typographiques | entête de `DESIGN.md` | pour que `impeccable` ne signale pas les tailles nouvelles |
| Couples de contraste nouveaux | `apps/web/app/palette.test.ts` | pour que la contrainte n°3 de `DESIGN.md` reste vérifiée |
| Renvoi vers cette spec | `ZENKUU.md` §3.1 et §7 | lève la contradiction avec le cahier des charges |
| Captures de référence | `docs/references/coingecko/` (gitignoré) | 3 largeurs × 2 thèmes par page |

## 6. Protocole d'audit

Une boucle identique pour chaque page, exécutée avec le MCP `chrome-devtools` — seul des
deux à savoir écrire une capture sur disque, et celui qui lit les styles calculés. Le MCP
`claude-in-chrome`, qui pilote le Chrome réel de l'exploitant, n'intervient que sur les
pages exigeant sa session CoinGecko ; pour celles-là la capture de référence ne peut pas
être écrite sur disque, et l'entrée d'audit le signale.

**Étape 0 — Énumération, une seule fois.**
Navigation, tous les mega-dropdowns ouverts, pied de page, et `sitemap.xml`. Le résultat
est une liste figée écrite en tête de `COINGECKO_AUDIT.md` avec une case à cocher par page.
C'est cette liste qui définit « toutes les pages », et non un inventaire mental. La liste
minimale attendue par l'exploitant sert de contrôle de complétude, pas de définition :
accueil, pages coin et leurs onglets, catégories et pages de catégorie, exchanges (spot,
DEX, dérivés) et pages d'exchange, trending, gainers & losers, nouvelles cryptos,
all-time high, highlights, graphiques globaux, heatmap, dominance BTC, comparateur,
convertisseur, watchlist, portefeuille, NFT et floor price, RWA, treasuries,
chaînes et écosystèmes, halving, recherche globale, learn et articles, news, glossaire,
widgets, page API, méthodologie, à propos.

Puis, **par page** :

**1. Captures** — 360, 768 et 1440 px de large, en clair et en sombre. Six images par
page, écrites dans `docs/references/coingecko/<slug>/`.

**2. Structure** — arbre d'accessibilité. Les composants sont nommés et rattachés à leurs
occurrences déjà relevées ailleurs : le but est de converger vers un inventaire de
composants partagés, pas d'accumuler autant de descriptions indépendantes qu'il y a de pages.

**3. Mesures** — `getComputedStyle` sur un échantillon nommé de nœuds : famille et graisse
de police, taille, interligne, interlettrage, couleur, fond, filet, rayon, ombre,
espacements internes et externes, durées et courbes d'accélération des transitions.

**4. États** — survol des lignes de tableau, des en-têtes triables, des onglets, des
boutons et des liens ; focus clavier ; état actif ; état trié ; état vide ; état de
chargement ; état d'erreur.

**5. Interactions** — chaque menu et sous-menu ouvert, la recherche, les filtres, la
pagination, et le défilement de la page **entière**, sections éditoriales, FAQ et liens
sous le fold compris.

**6. Écriture et commit** — l'entrée d'audit est rédigée et committée avant de passer à la
page suivante. Une page auditée égale un commit ; une interruption ne coûte jamais plus que
la page en cours.

## 7. Schéma d'une entrée d'audit

Chaque entrée de `COINGECKO_AUDIT.md` porte les mêmes champs, dans le même ordre :

```
### <titre> — `<url>`

- **Date du relevé** : AAAA-MM-JJ
- **Rôle** : à quoi sert la page, en une phrase
- **Priorité** : phase 1 | 2 | 3
- **État** : à auditer | audité | implémenté | vérifié
- **Composants** : liste nommée ; les composants déjà relevés ailleurs sont
  référencés, pas redécrits
- **Fonctionnalités** : ce que la page permet de faire
- **Interactions** : tri, filtres, pagination, menus, overlays
- **Données requises** : une ligne par donnée, avec la source ZENKUU
  correspondante — disponible, partiellement disponible, ou absente
- **Écart avec ZENKUU** : la page existante la plus proche, et ce qui la sépare
- **Notes** : particularités, pièges, comportements JavaScript notables
```

Le champ **Données requises** est ce qui fait de l'audit autre chose qu'un catalogue
visuel : à la fin du sous-projet A, l'exploitant sait exactement quelles pages ne peuvent
pas être alimentées par une source gratuite, sans qu'une ligne d'interface ait été écrite.
Ces cas sont rassemblés dans une section de synthèse en fin de document et posés en
question à l'exploitant.

## 8. Le système de dessin extrait

`DESIGN_SYSTEM.md` enregistre le système **structurel** de CoinGecko et fait correspondre
chaque valeur relevée à un jeton ZENKUU, nouveau ou existant :

- échelle typographique — familles, graisses, tailles, interlignes, interlettrages ;
- densité — hauteur de ligne de tableau, rembourrage de cellule, hauteur de contrôle ;
- rythme d'espacement — le pas de la grille d'espacement et ses multiples effectivement employés ;
- rayons — les paliers relevés et leur emploi ;
- élévation — ombres et paliers de surface ;
- grille et points d'arrêt ;
- iconographie — tailles, épaisseur de trait, grille de dessin ;
- mouvement — durées et courbes, par famille d'interaction.

Les couleurs y figurent comme **rôles** uniquement. Le rôle « accent » est rempli par le
bleu glacier ZENKUU, pas par la couleur de CoinGecko.

Chaque valeur porte sa provenance : la page et le nœud sur lesquels elle a été relevée.
Une valeur sans provenance est un défaut, au même titre qu'une donnée inventée.

## 9. La couche de jetons

Les jetons `--v2-*` sont ajoutés à `apps/web/app/globals.css`, dans un bloc délimité et
commenté. À la fin du sous-projet A, **rien ne les consomme** : le site est strictement
inchangé à l'écran.

Deux points d'intégration avec l'outillage existant, à traiter dès A :

- **`impeccable` lit l'échelle typographique dans l'entête de `DESIGN.md`** et valide
  contre elle chaque taille écrite dans le dépôt. Pendant la migration, cet entête doit
  porter l'**union** des deux échelles, sinon chaque taille nouvelle est signalée comme un
  défaut et la file d'exceptions recommence à grossir — exactement le problème que le
  remplacement de l'ancienne analyse Coinbase avait résolu.
- **`apps/web/app/palette.test.ts` mesure les contrastes.** Tout couple fond/texte
  nouveau introduit par la densité de CoinGecko y est ajouté, sinon la contrainte n°3 de
  `DESIGN.md` — les deux thèmes à chaque écran, contrastes mesurés et rejoués — cesse
  d'être vérifiée sur les écrans migrés.

## 10. Vérification

Les trois scripts d'audit du dépôt sont réutilisés tels quels, aucun nouveau n'est écrit :

- `scripts/audit-responsive.mjs` — plancher de 11 px, cible tactile de 32 px, six formats ;
- `scripts/audit-overflow.mjs` ;
- `scripts/audit-liens.mjs`.

S'y ajoutent `turbo run lint` et `turbo run typecheck`, et `vitest run` pour
`palette.test.ts`.

**`next build` n'est pas lancé tant que le serveur de développement tourne** : cela
corrompt le cache Turbopack et met l'ensemble du site en erreur 500, y compris avec un
`distDir` distinct. Aucun second serveur de développement n'est démarré non plus, celui du
port 3000 étant déjà actif.

## 11. Modes de défaillance

| Risque | Traitement |
|---|---|
| CoinGecko change pendant l'audit | Chaque entrée est datée. Une mesure sans date ne se rejoue pas. |
| Session CoinGecko expirée en cours d'audit | Les pages concernées sont marquées « à réauditer » et l'audit continue. Aucun identifiant n'est saisi. |
| Une page ne se rend pas (erreur, région, test A/B) | L'entrée est écrite avec l'observation réelle et marquée comme telle. Rien n'est extrapolé. |
| Interruption de session | Une page auditée égale un commit. Le travail perdu se limite à la page en cours. |
| Une donnée CoinGecko n'a aucune source gratuite | Consignée dans la section de synthèse et posée en question à l'exploitant, jamais comblée par une valeur inventée. |

## 12. Non-objectifs du sous-projet A

Aucune page migrée. Aucun composant construit. Aucune modification visible du site. Les
seuls fichiers de production touchés sont `globals.css` (ajout de jetons inertes),
`DESIGN.md` (union des échelles), `palette.test.ts` (nouveaux couples de contraste) et
`ZENKUU.md` (renvoi vers cette spec).

## 13. Critères d'achèvement

Le sous-projet A est terminé quand, et seulement quand :

1. La liste de pages de l'étape 0 est écrite et **chaque case est cochée**.
2. Chaque entrée d'audit porte les dix champs du schéma, sans champ vide.
3. `DESIGN_SYSTEM.md` couvre les huit familles de la section 8, chaque valeur portant sa
   provenance.
4. Les jetons `--v2-*` sont en place et l'entête de `DESIGN.md` porte l'union des échelles.
5. `palette.test.ts` passe avec les nouveaux couples.
6. Lint, typecheck et les trois scripts d'audit passent.
7. La section de synthèse des données sans source gratuite est écrite et posée en question
   à l'exploitant.
8. Une capture d'écran du site avant et après A montre qu'il est **inchangé**.
