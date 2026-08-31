# Migration vers CoinGecko — rapport d'étape

Établi le 2026-08-31, après 91 commits sur la branche `migration-coingecko`.

Ce document dit ce qui est **implémenté**, **partiel** ou **bloqué**, et pourquoi. Il
ne remplace pas `COINGECKO_AUDIT.md` (le relevé des 68 pages) ni `DESIGN_SYSTEM.md`
(les jetons) : il dit où en est le produit.

---

## 1. Implémenté

### Le design system

| Domaine | État |
|---|---|
| Palette | Intégrale, clair par défaut. Quatre couples sous WCAG AA, épinglés dans `ECARTS` |
| Police | **Inter**, y compris les chiffres — leur fonte, servie telle quelle |
| Échelle de titre | **Un seul cran à 24 px**, sur les 16 pages principales |
| Interlettrage | **Zéro resserrement négatif** dans la feuille de style |
| Filet | 1,25 px partout où la référence trace un trait |

La palette a demandé trois corrections successives, chacune sur une mesure fausse :
le vert d'accent pris pour une couleur de texte, le texte des boutons cru noir, les
deux motifs d'onglet confondus. Les trois sont documentées dans les commits.

### Le chrome

- **Bandeau de repères** dans l'en-tête, sur toutes les pages (il n'était que sur deux).
- **Méga-menus** aux rubriques de la référence — Cryptomonnaies, Plateformes, Actifs
  réels, Apprendre, Portefeuille, Plus.
- **Pied de page** sans fond propre : la référence n'en a pas, seul un filet sépare.

### Le tableau de marché

Colonnes, ordre et densité de la référence : rang, cours, variations 1 h / 24 h / 7 j /
1 M, volume, capitalisation, FDV, ratio, courbe 7 jours en fin de ligne. **100 lignes**
par page au lieu de 25.

Sa grille par défaut était modelée sur **MEXC**, et sa propre note le disait — « la
référence n'en affiche pas » de rang. CoinGecko en affiche un.

### La fiche d'actif

- **Barre d'onglets rétablie**, aux dimensions relevées. Elle avait été retirée au motif
  que la référence n'en a pas ; elle en a sept.
- **Hiérarchie inversée** : le cours passe à 36 px, le nom à 18. C'était l'inverse.
- Les onglets sans contenu se retirent d'eux-mêmes de la barre.

### Quatre pages neuves

| Page | Ce qu'elle apporte |
|---|---|
| `/glossaire` | Les 32 définitions, extraites de `/apprendre` où elles n'avaient pas d'adresse |
| `/classements/sommet` | L'écart au sommet historique, avec la date du record |
| `/crypto/bitcoin/halving` | Le calendrier des halvings, **calculé** — leur table porte une coquille |
| `/crypto/[id]/historique` | La série jour par jour. Le composant existait et n'était **rendu nulle part** |

### L'audit

**68 pages sur 68**, `--strict` passe. C'est la première exigence de la liste de clôture.

---

## 2. Partiel

### L'en-tête reste collant

Leur en-tête est en `position: static` : il défile entièrement, sans barre de
remplacement. Celui de ZENKUU est collant, et le bandeau de repères posé au-dessus part
au défilement pendant que la navigation reste.

**Pourquoi ce n'est pas fait** : aligner retirerait la navigation collante de tout le
site. C'est un arbitrage d'usage, pas un oubli — il tient en une ligne si la fidélité
doit primer.

### Le panneau droit ne colle pas au même endroit

La référence colle son panneau à `top: 0` parce que rien ne le surplombe. Celui de
ZENKUU se cale sous l'en-tête collant, faute de quoi il glisserait dessous.

**Conséquence directe du point précédent** : les deux se règlent ensemble.

### Les resserrements positifs subsistent

57 occurrences de `tracking-wide` et au-delà, sur des libellés en capitales. Aucun relevé
n'établit ce que la référence y fait : les retirer sans mesure remplacerait un écart par
un autre.

### `/crypto` n'affiche pas l'offre TOTALE

L'offre en circulation y est — vérifié, Bitcoin rend « 20,1 M BTC ». Ce point affirmait
un écart plus large ; il se réduit à l'offre totale, que leur catalogue porte en plus.

Le champ existe (`totalSupply`). L'écart entre les deux offres est la dilution à venir,
que `Cap./FDV` exprime déjà autrement — une quinzième colonne pour redire ce qu'une
autre dit se paie en largeur sans rien apprendre.

### ~~Les données historiques n'ont pas d'adresse~~ — comblé

`/crypto/[id]/historique` existe depuis le 2026-08-31. Ce point disait que
`PriceHistoryTable` rendait la série « DANS l'onglet Analyse » : c'était déjà faux — le
composant n'était rendu NULLE PART. Il dormait dans le dépôt, testé et documenté, sans
appelant.

⚠️ Deux de leurs quatre colonnes manquent : capitalisation et volume par jour.
`PriceHistory` ne porte que le cours, et les ajouter demanderait une seconde série par
actif pour une page de consultation ponctuelle.

---

## 3. Bloqué

Quatre familles de données sont hors de portée. **Aucune n'est un manque à combler** :
chacune décrit quelque chose que ZENKUU n'a pas et ne peut pas produire honnêtement.

### Les mécaniques d'audience

Consultations (« Trending », « Most Viewed »), mises en liste de suivi (« Upcoming »),
programme de points (« Candy »). Elles mesurent le trafic de l'opérateur, pas le marché.

⚠️ **Un « tendances » bâti sur la variation ou le volume mesurerait autre chose et le
dirait mal.** C'est l'écart le plus tentant à combler de travers.

### Le calendrier de vesting

`/en/highlights/incoming-token-unlocks` demande la date et le volume des déblocages
à venir. Ils viennent des documents de l'émetteur, agrégés à la main.

### Les détentions de trésorerie

Les trois pages de trésoreries (244, 231 et une poignée de lignes) reposent sur des
dépôts réglementaires et des annonces d'entreprises. Aucune source de cotation ne les
produit. Le **mNAV** — valeur de marché rapportée à l'actif net — demande en plus le
nombre d'actions en circulation.

### Le rattachement des jetons adossés

Nécessaire au classement rehypothéqué ET aux cinq pages RWA. Il faut savoir que `WBTC`
représente du bitcoin, `stETH` de l'ether, pour des centaines de jetons.

⚠️ **Les pages « Stocks », « ETFs » et « Commodities » de la référence ne listent pas des
actions mais des actions TOKENISÉES.** `/actions`, `/etf` et `/matieres-premieres` chez
ZENKUU listent de vraies valeurs via Yahoo. Même mot, deux sujets — ce n'est pas un
manque, c'est un objet distinct.

### Le bouton « Buy » de leur tableau

Leur colonne 3 — juste après le nom, AVANT le cours — porte un bouton « Buy », lien
d'affiliation vers une plateforme d'échange.

⚠️ **C'est le seul endroit du site où la fidélité de mise en page entre frontalement
en conflit avec le §7**, qui interdit tout signal d'achat ou de vente. Ce n'est pas
seulement le mot : sa POSITION dirait que l'achat est la première chose à faire d'une
ligne de cotation.

ZENKUU met « Fiche » en DERNIÈRE colonne — un lien vers la page de l'actif, qui ferme
la ligne au lieu de l'ouvrir. La décision était déjà prise et documentée dans le code ;
le relevé n'a fait que préciser ce qu'elle écarte.

### Hors périmètre par nature

Les pages d'API (4), Premium, Mobile, Candy et Research vendent un abonnement, une
application native, un programme de fidélité et les travaux d'un cabinet de recherche.
ZENKUU ne vend rien.

---

## 4. Deux décisions qui appartiennent à l'exploitant

### Le texte blanc sur le bouton vert donne 2,11:1

Sous le seuil WCAG AA de 4,5:1, sur les appels à l'action les plus visibles du site.
C'est la valeur de la référence, vérifiée sur cinq boutons distincts. Le noir donnerait
9,94:1.

La fidélité a été appliquée — c'est le troisième arbitrage de ce type, et les deux
précédents ont été tranchés dans ce sens. L'écart est **épinglé** dans
`app/palette.test.ts` : il ne peut pas empirer sans casser le test, et s'il repassait AA
le test échouerait aussi, pour forcer son retrait.

Le thème sombre, lui, passe à 4,70:1.

### Trois autres couples sont sous le seuil

`--color-up` (3,15:1), `--color-down` (3,56:1) et `--color-brand` en texte (2,11:1),
tous en thème clair, tous aux teintes de la référence.

⚠️ **Atténuation réelle** : le signe et la flèche portent déjà le sens de la variation,
donc WCAG 1.4.1 (information par la couleur seule) reste satisfait. Seul 1.4.3
(contraste) échoue.

---

## 5. Ce que la méthode a coûté, et ce qu'elle a rattrapé

Trois défauts de relevé ont été trouvés et corrigés en cours de route. Ils valent d'être
écrits parce qu'ils se reproduiront :

1. **Le nœud sans texte propre.** L'outil lisait la couleur sur des conteneurs vides,
   d'où 84 mesures à `rgb(0, 0, 238)` — le bleu de lien par défaut du navigateur, qui ne
   peint aucun pixel. Corrigé par `indexPorteurDuTexte`, six tests.

2. **La variante mobile déclarée en premier.** La sonde visait le premier nœud du DOM,
   pas le premier VISIBLE. Trois composants d'accueil ont été signalés « masqués » à tort.

3. **Une absence mesurée n'est pas une absence.** Le panneau droit de leur accueil est
   REPLIABLE ; sondé dans un navigateur neuf, il était replié. J'ai conclu qu'il n'existait
   pas et l'ai supprimé de ZENKUU. Rétabli le même jour.

Et une erreur de raisonnement, rattrapée par la vérification : j'ai trié le classement du
sommet **par écart** — « qui approche de son record en tête », ce qui paraissait juste.
La page remontait des fonds monétaires tokenisés, dont le cours ne bouge pas. La
référence trie par capitalisation, l'écart est en colonne.

---

## 6. Reste à faire

- ~~Le build de production~~ — **vérifié le 2026-08-31 : il passe en 59 s**, 80 routes
  générées, zéro erreur de compilation. Les treize `ProviderError` du journal viennent du
  flux d'actualités qui n'a pas répondu pendant la génération : le code dégrade
  proprement, c'est le comportement voulu. Serveur de développement relancé ensuite,
  toutes les pages répondent sous 1,4 s une fois le cache chaud.
- ~~Les redirections~~ — **26 posées le 2026-08-31**, depuis les chemins de la référence
  vers leurs équivalents ZENKUU. Vérifiées serveur relancé, y compris avec préfixe de
  langue. Ce sont des 308, pas des réécritures : servir le contenu sous leur adresse
  ferait deux URL pour une page.
- **Les 29 pages CoinGecko sans route ZENKUU**, dont la moitié est bloquée par les données
  ci-dessus.
- **Les performances** : premières mesures faites le 2026-08-31, sur le serveur de
  développement.

  | Page | LCP | CLS |
  |---|---|---|
  | Accueil | 1880 ms | **0,001** (était 0,125) |
  | `/crypto` | 1700 ms | 0,001 |
  | `/crypto/bitcoin` | 1252 ms | 0,047 |

  Les trois sont sous les seuils (LCP < 2500 ms, CLS < 0,1). Le gain de l'accueil vient
  de deux substituts de chargement mal dimensionnés — un ruban déclaré à 210 px pour
  149 réels.

  ⚠️ **CES CHIFFRES VIENNENT DU SERVEUR DE DÉVELOPPEMENT**, qui compile à la demande.
  Le CLS est fiable — un décalage de mise en page ne dépend pas du mode de compilation
  — mais LCP et TTFB seront meilleurs en production. **Une mesure sur build reste à
  faire.**

  ⚠️ **UNE TENTATIVE D'AMÉLIORATION A ÉTÉ ANNULÉE.** Le CLS de 0,047 de la fiche vient
  d'une section de hauteur nulle — `places` sur Bitcoin — qui occupe les 48 px de
  `space-y-12` de part et d'autre. La masquer après mesure a fait MONTER le CLS à
  0,057 : masquer un bloc après peinture est exactement le décalage qu'on cherchait à
  éviter. Deux approches essayées, deux échecs :

    · `empty:hidden` ne s'applique pas — la section contient toujours un
      `PanelVisibilityProvider`, donc elle n'est jamais vide au sens CSS ;
    · une classe posée depuis la mesure marche, mais arrive trop tard.

  La correction juste serait de ne pas RENDRE la section, ce qui demande au parent de
  savoir ce que l'enfant rendra — le problème que `AssetPageView` documente déjà. La
  valeur reste sous le seuil ; l'amélioration n'en vaut pas le risque aujourd'hui.
