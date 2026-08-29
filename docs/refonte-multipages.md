# Refonte multi-pages — objectif et critères d'acceptation

Document de référence pour la refonte T1→T10. Chaque tâche est terminée quand **tous**
ses critères sont vérifiés, pas quand le code est écrit.

## Objectif

Reconstruire dix surfaces de ZENKUU d'après les références CryptoRank, CoinGecko,
TradingView et KuCoin, en ne branchant que des données déjà disponibles dans
`packages/data`, sans régression sur les pages existantes.

**Preuve de fin** : `bun run lint` et `bun run build` passent sans erreur, les scripts
`scripts/audit-liens.mjs`, `audit-overflow.mjs` et `audit-responsive.mjs` ne signalent
aucune régression, et chaque tâche a été vérifiée sous Chrome dans les deux thèmes et
aux trois largeurs (375 / 768 / 1440).

## Portée

**Inclus** : T1→T10, puis protection de `main` et refonte du README GitHub.

**Exclus** : toute fonctionnalité qui suppose que ZENKUU détienne des fonds ou exécute
des ordres (soldes, dépôts, retraits, historique de conversion serveur). Le site est en
lecture seule — cf. `app/[locale]/pourquoi-zenkuu/page.tsx`.

## Conditions d'arrêt

Je m'arrête et je demande si :

- une tâche exige une donnée qu'aucun provider de `packages/data/src/providers/` ne sert ;
- une tâche impose de contredire une décision d'architecture documentée dans le code ;
- un correctif pour une tâche casserait une page hors périmètre.

## État de départ

- Branche `main`, 303 fichiers non commités — **commiter d'abord** comme point de reprise.
- Serveur de dev déjà sur le port 3000. Ne pas en lancer un second.
- **Ne pas lancer `next build` pendant que le serveur de dev tourne** : cela corrompt le
  cache Turbopack et met tout le site en 500. Le build de vérification se fait après avoir
  arrêté le serveur.
- Livraison **par tâche** : un commit par tâche, vérification Chrome, présentation, puis suite.

## Sources de données (vérifiées)

| Besoin | Source |
|---|---|
| Cryptos, catégories, dominance | `providers/coingecko.ts`, `coingecko-extras.ts`, `coinpaprika.ts` |
| Actions, ETF, indices, matières premières | `providers/yahoo*.ts` (dont `yahoo-screener.ts`) |
| Devises | `providers/frankfurter.ts`, `src/currencies.ts` |
| Fear & Greed | `providers/sentiment.ts` |
| Capitalisation historique | `src/market-cap-series.ts` |
| Pools DEX | `providers/geckoterminal.ts` |
| Macro | `providers/worldbank.ts` |
| Auth | `lib/oauth.ts` (google, x) + `lib/auth-actions.ts` (code email) |

## Critères d'acceptation par tâche

### T1 — /categories
- Aucune bordure ni contour visible sur le tableau ; les lignes se distinguent au survol seul.
- Clic sur la recherche → panneau « Filtrer les catégories… » avec liste déroulante ;
  sélection d'une catégorie → le tableau se filtre effectivement.
- Sélecteur de devise en haut à droite, branché sur `currencies.ts`, changeant réellement
  les montants affichés.
- Fermeture au clic extérieur et à `Échap` ; navigation clavier dans la liste.

### T2 — /sentiment
- Reconstruite : titre, sous-titre, jauge 0–100 avec les 4 zones, section « Valeurs
  historiques », FAQ complète en français (définition, fonctionnement, utilisation, et les
  5 modules de calcul).
- La jauge affiche la valeur réelle de `providers/sentiment.ts`, jamais une constante.

### T3 — /graphiques + pages de la sidebar
- Sidebar : Coins (Vue d'ensemble, Dominance Bitcoin, Heatmap), Actifs du monde réel,
  Catégories, Trésoreries, NFT — chaque entrée mène à une page qui existe et rend des données.
- Paragraphe de synthèse calculé sur les données réelles du jour.
- Graphique « Capitalisation totale » : sélecteur 24H/7D/14D/1M/3M/Max fonctionnel, export
  CSV, code d'intégration, ligne de stats.
- Graphiques Dominance BTC, DeFi, Stablecoins, Altcoins.
- Une entrée sans source de données est **retirée de la sidebar**, pas remplie de faux.

### T4 — /heatmap
- Treemap : aire ∝ capitalisation, couleur = variation %, échelle vert/rouge/gris.
- Sélecteurs de source et de période, mode « taille uniforme », tooltip au survol,
  clic → fiche de l'actif.
- Hauteur comparable à CoinGecko (carte intégrée), pas de plein écran.

### T5 — Accueil
- Onglets Favoris / Crypto / Actions / Devises : chaque clic remplace le contenu du tableau
  par la source correspondante (favoris locaux, coingecko, yahoo-screener, frankfurter).
- Transition animée, indicateur d'onglet actif animé, aucun flash ni saut de hauteur.
- Onglet Favoris vide → état vide explicite, pas un tableau blanc.

### T6 — Navigation
- « Parcourir » renommé « Coins », en mega-dropdown : icône + titre + description,
  sections titrées, intitulés en français.
- « Actualités » déplacé dans le dropdown « Analyse », retiré de la barre.
- Nouveau dropdown « TradFi » : Actions, Devises, ETF, Indices, Matières premières, Macro,
  Rachats — toutes des routes existantes.
- Chaque entrée pointe vers une route qui répond 200.

### T7 — /convertisseur, /apprendre, /aide
- **/convertisseur** : champs Payer/Recevoir, sélecteurs avec logos, bouton d'inversion,
  taux réel, mention « 0 frais », FAQ traduite. **Sans soldes, sans bouton Convertir,
  sans historique serveur** — ZENKUU ne détient rien.
- **/apprendre** : hero, section Featured, sections par catégorie avec « Voir plus », niveau
  de difficulté par carte, glossaire A–Z, bannière de fin. Contenu depuis `content/`.
- **/aide** : recherche, grille de catégories avec sous-liens et « Voir plus », Annonces,
  Articles populaires, bloc « Un problème persiste ? ».

### T8 — /connexion et /inscription
- Layout split-screen : panneau gauche sombre à fond étoilé animé, slogan, bouclier ZENKUU
  **dessiné pour ZENKUU** (aucun asset KuCoin).
- Panneau droit reproduisant la capture 5 **à l'identique** : onglets
  « Email/Téléphone | Sous-compte | QR Code », champ de saisie, bouton clair « Suivant »,
  séparateur « Ou continuer avec », bouton Passkey, puis Telegram / Google / Apple, et le
  lien d'inscription.
- L'onglet « Email/Téléphone » réutilise `LoginForm.tsx` (`requestLoginCode` /
  `verifyLoginCode`) : adresse → code à usage unique. C'est le seul parcours complet.
- Google et X sont actifs quand configurés. **Sous-compte, QR Code, Passkey et Apple sont
  rendus mais désactivés**, avec au survol la raison de leur inactivité — même traitement
  que celui déjà appliqué à un fournisseur OAuth non configuré (`CONFIGURED_PROVIDERS`,
  `lib/oauth.ts`). Un bouton actif sans backend serait une fausse fonctionnalité, ce que la
  contrainte globale interdit.
- ⚠️ **TELEGRAM EST RETIRÉ DE CE CRITÈRE.** Il y figurait par relevé de la capture 5. Les
  cinq autres méthodes désactivées coûtent une icône générique ou un logotype DÉJÀ dans le
  dépôt ; Telegram demanderait d'y recopier une marque de plus pour un bouton qui ne mènera
  nulle part, ce qui tombe sous la contrainte « ne pas copier d'assets propriétaires ». Les
  logotypes de `social-logos.tsx` ne sont admis que parce qu'une charte d'authentification
  les impose pour un fournisseur avec lequel on s'authentifie réellement. La rangée compte
  donc trois boutons — Google, X, Apple — soit la forme de la référence, sans la marque en
  trop.
- Le popover navbar continue de fonctionner ; les nouvelles pages s'ajoutent, ne remplacent pas.
  Les deux commandes de l'en-tête ouvrent toujours la fenêtre : les pages servent les cas où
  il n'y a pas eu de clic — lien partagé, signet, retour d'OAuth, redirection.
- Les deux pages sont en `robots: index:false, follow:true` : elles n'ont rien à offrir à qui
  arrive d'un moteur, et une page de connexion bien classée détourne les requêtes de marque
  vers un écran sans issue (§9).
- L'animation du fond respecte `prefers-reduced-motion`.

### T9 — Retour en haut
- Bouton flottant en bas à droite sur toutes les pages, absent en haut de page, apparaissant
  après un défilement suffisant, retour fluide au clic.
- Respecte `prefers-reduced-motion`, atteignable au clavier, libellé accessible,
  ne recouvre aucune barre collante existante.
- ⚠️ `scrollTo({ top: 0 })` **sans `behavior`** : une valeur explicite écrase la propriété
  CSS `scroll-behavior`, donc la règle qui la ramène à `auto` sous `prefers-reduced-motion`
  (`globals.css`). Omis, `behavior` vaut « suis la feuille de style ».
- Trois corrections annexes, imposées par ce bouton :
  · `main#contenu` reçoit `tabIndex={-1}` — le focus doit pouvoir y revenir après la
    remontée, faute de quoi il retombe sur `body`. Le lien d'évitement du gabarit en
    bénéficie : sa cible n'était pas focusable, il déplaçait donc le défilement mais pas
    le focus.
  · le `Toaster` passe à `offset={88}` — Sonner peint en bas à droite à un z-index de six
    chiffres et recouvrait le bouton.
  · la flèche de la barre d'identité des fiches (`AssetLayoutFrame`) est **retirée** : deux
    commandes identiques s'affichaient simultanément. Elle portait en plus le défaut
    `behavior: 'smooth'` décrit ci-dessus.

### T10 — Design system
- Police identifiée et appliquée globalement ; si propriétaire, équivalent libre le plus
  proche, **signalé explicitement** dans ce document et dans le commit.
- Boutons, menus, inputs, badges, cartes, tableaux harmonisés : rayons, ombres, états
  hover/focus/active, transitions.
- Le remplacement de `Switzer-Variable.woff2` ne dégrade aucune page existante — vérifié par
  passage sur les pages les plus denses (fiche d'actif, screener, classements).

## Après T10

- Protection de `main` sur GitHub (`zyneww/Zenkuu`).
- README refondu : présentation, captures, stack, installation, architecture.

## Contraintes permanentes

- Ne rien casser hors périmètre.
- Clair et sombre vérifiés à chaque tâche.
- Responsive 375 / 768 / 1440.
- Français, ton du site.
- Aucun placeholder, aucune fausse donnée.
- Aucun asset propriétaire copié.
