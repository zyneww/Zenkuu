---
version: 1
name: ZENKUU
description: >-
  Un site d'information de marché en lecture seule, sombre par défaut. Le fond est un
  gris de nuit (#18181b) sur lequel les surfaces montent par paliers d'éclaircissement
  plutôt que par ombres — surface, panneau, surface sourde. La tension de marque est un
  bleu glacier (#a9eafe en sombre, un cyan profond #0e7490 en clair), employé avec
  parcimonie : liens, onglet actif, un seul bouton plein par écran. Toute la donnée
  chiffrée est composée en chasse fixe (DM Mono) pour que les colonnes ne tressautent
  pas d'un rafraîchissement à l'autre ; tout le reste est en Figtree. La densité est
  assumée — 14 px de corps dominant, des tableaux de cent lignes — et c'est ce qui
  distingue le site des vitrines du secteur.

colors:
  brand: "#a9eafe"
  brand-strong: "#cdf3ff"
  brand-light: "#0e7490"
  brand-strong-light: "#155e75"
  canvas: "#18181b"
  canvas-light: "#ffffff"
  surface: "#27272a"
  surface-light: "#f8fafc"
  panel: "#2f2f33"
  panel-light: "#ffffff"
  surface-muted: "#35353a"
  surface-muted-light: "#f1f5f9"
  border-subtle: "#3f3f46"
  border-subtle-light: "#e5e7eb"
  ink: "#ffffff"
  ink-light: "#111827"
  ink-muted: "#a1a1aa"
  ink-muted-light: "#4b5563"
  up: "#22c55e"
  up-light: "#15803d"
  down: "#ef4444"
  down-light: "#dc2626"

typography:
  # L'ÉCHELLE ÉNUMÉRÉE. Ce sont les jetons `--text-*` de `apps/web/app/globals.css`,
  # aux mêmes valeurs et dans le même ordre. Toute taille littérale écrite dans un
  # composant doit tomber sur l'un de ces crans.
  scale:
    micro: 11px
    xs: 13px
    sm: 14px
    base: 16px
    lg: 18px
    xl: 22px
    2xl: 28px
    3xl: 36px
    display-xl: 40px
    4xl: 44px
    hero: 48px

  body:
    fontFamily: "Figtree, ui-sans-serif, system-ui, -apple-system, sans-serif"
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1.14
    letterSpacing: -0.12px
  reading:
    fontFamily: "Figtree, sans-serif"
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.6
  table-secondary:
    fontFamily: "Figtree, sans-serif"
    fontSize: 13px
    fontWeight: 400
  micro:
    fontFamily: "Figtree, sans-serif"
    fontSize: 11px
    fontWeight: 500
  numeric:
    fontFamily: "'DM Mono', ui-monospace, monospace"
    fontSize: 14px
    fontWeight: 400
  display-hero:
    fontFamily: "Figtree, sans-serif"
    fontSize: 48px
    fontWeight: 700
    lineHeight: 1.17
    letterSpacing: -0.021em
  display-xl:
    fontFamily: "Figtree, sans-serif"
    fontSize: 40px
    fontWeight: 700
    lineHeight: 1.18
    letterSpacing: -0.018em
  display-lg:
    fontFamily: "Figtree, sans-serif"
    fontSize: 36px
    fontWeight: 700
    lineHeight: 1.22
    letterSpacing: -0.014em
  display-md:
    fontFamily: "Figtree, sans-serif"
    fontSize: 28px
    fontWeight: 700
    lineHeight: 1.29
    letterSpacing: -0.018em
  display-sm:
    fontFamily: "Figtree, sans-serif"
    fontSize: 22px
    fontWeight: 600
    lineHeight: 1.2

rounded:
  control: 8px
  card: 12px
  panel: 16px
  pill: 9999px

shadows:
  overlay: "0 12px 60px rgb(0 0 0 / 0.7), 0 1px 2px rgb(0 0 0 / 0.4)"
  overlay-light: "0 12px 60px rgb(0 0 0 / 0.12), 0 1px 2px rgb(0 0 0 / 0.06)"
---

# Le système de dessin de ZENKUU

> ⚠️ **Ce fichier a remplacé une analyse de Coinbase.com.**
>
> Le DESIGN.md précédent portait `name: Coinbase-design-analysis` et décrivait un fond
> blanc, un bleu #0052ff et les fontes sous licence CoinbaseDisplay / CoinbaseSans.
> C'était une pièce d'INSPIRATION importée en début de projet, jamais remplacée — et
> jamais vraie de ce site, qui est sombre par défaut, glacier plutôt que bleu roi, et
> composé en Figtree.
>
> Le coût n'était pas seulement documentaire. Le détecteur `impeccable` lit l'échelle
> typographique dans l'entête de CE fichier : il validait donc chaque taille écrite
> dans le dépôt contre l'échelle de Coinbase, d'où une file d'exceptions accumulées
> pour des valeurs parfaitement légitimes. L'analyse d'origine est conservée à
> `docs/references/coinbase-analyse.md` — elle garde sa valeur de référence, elle
> n'avait simplement rien à faire en position d'autorité.

La source de vérité reste `apps/web/app/globals.css`. Ce document la décrit ; il ne la
remplace pas. Quand les deux divergent, c'est la feuille de style qui a raison et ce
fichier qui est à corriger.

---

## Les couleurs

Le site est **sombre par défaut**, et cela se joue dès le serveur : `<html>` porte la
classe `dark` dans le HTML servi, `ThemeScript` la RETIRE ensuite si le visiteur a
choisi le clair. Un lecteur qui bloque le JavaScript voit donc l'identité du site, pas
un thème clair par accident.

### Les paliers de surface

Il n'y a **pas d'ombre entre les étages** : la profondeur vient de l'éclaircissement.

| Rôle | Sombre | Clair | Emploi |
|---|---|---|---|
| `canvas` | `#18181b` | `#ffffff` | le fond de page |
| `surface` | `#27272a` | `#f8fafc` | une carte posée sur le fond |
| `panel` | `#2f2f33` | `#ffffff` | les panneaux de l'accueil |
| `surface-muted` | `#35353a` | `#f1f5f9` | un encadré DANS une carte |

⚠️ En thème clair, `canvas` et `panel` valent tous deux `#ffffff` : le panneau ne se
détache alors que par sa bordure. C'est voulu — un empilement de gris sur fond blanc se
lit comme une salissure.

### Le filet

**Un seul** — `border-subtle` (`#3f3f46` / `#e5e7eb`). `--color-border` en est un ALIAS,
pas une seconde valeur : le site ne connaît qu'une épaisseur de trait, et les jetons
hérités de shadcn/ui y sont tous reroutés (`globals.css`, ligne ~921).

### La marque

`brand` (`#a9eafe` en sombre, `#0e7490` en clair) est une **tension**, pas une couleur
de remplissage. Elle porte les liens, l'onglet actif, l'indicateur de graduation, et un
seul bouton plein par écran. Un second aplat de marque sur la même vue annule le
premier.

### Hausse et baisse

`up` / `down` ne sont **jamais** un jugement (§7). Ils qualifient une variation
observée, rien d'autre. Le vert et le rouge changent de valeur entre les thèmes pour
tenir le contraste sur les deux fonds.

⚠️ Les jetons `heat-*` de la carte thermique, eux, sont **invariants au thème** : ce sont
des aplats saturés qui portent leur propre contraste, et les faire basculer rendrait la
même tuile illisible d'un thème à l'autre. `--color-heat-flat` (`#3d3d3d`) existe pour
la tuile sans variation, qui autrement empruntait `surface-muted` et rendait du blanc
sur presque-blanc en thème clair.

---

## La typographie

### Les deux fontes

**Figtree** porte l'interface et les titres. **DM Mono** porte les nombres.

⚠️ **Figtree est un ÉQUIVALENT LIBRE, choisi par mesure.** La refonte demande la fonte de
KuCoin ; relevée sur leur page, c'est *Kufox Sans*, une fonte sur mesure et propriétaire
qui ne se distribue pas. Trois grandeurs relevées au canevas à corps 100 — chasse totale,
hauteur d'x, hauteur de capitale — désignent Figtree comme la plus proche parmi les
fontes libres :

| Fonte | Chasse | x | Capitale | x/cap |
|---|---|---|---|---|
| **Kufox Sans** (cible) | 1675 | 51 | 71 | 0,718 |
| **Figtree** (retenue) | 1644 | 50 | 70 | **0,714** |
| Geist (précédente) | 1673 | 53 | 71 | 0,746 |
| Urbanist | 1561 | 51 | 71 | 0,718 |
| Manrope | 1683 | 55 | 73 | 0,753 |
| Plus Jakarta Sans | 1736 | 54 | 75 | 0,720 |
| Inter | 1733 | 54 | 73 | 0,740 |

Le rapport x/capitale est la colonne qui décide : c'est lui qui fait qu'une fonte paraît
grande ou petite à corps égal. Le détail du raisonnement vit dans l'entête de
`apps/web/app/[locale]/layout.tsx`.

**DM Mono n'a pas suivi.** KuCoin compose ses cotations dans sa fonte proportionnelle ;
ce site aligne cent lignes sur onze colonnes rafraîchies toutes les trois minutes, et la
chasse fixe est ce qui empêche la colonne de tressauter quand un « 1 » remplace un « 8 ».
Sa graisse est bornée à 500 dans `globals.css` : DM Mono ne connaît que 300/400/500, et
un `font-bold` la ferait synthétiser par épaississement du tracé, ce qui bave à 11 px.

### L'échelle

Elle est **énumérée**, et l'entête de ce fichier en est la copie exécutable — c'est
elle que le détecteur `impeccable` fait respecter.

| Jeton | Taille | Emploi |
|---|---|---|
| `text-micro` | 11 px | **le plancher absolu** — pastilles d'état, mentions de source |
| `text-xs` | 13 px | colonnes secondaires de tableau |
| `text-sm` | 14 px | **le cran de densité**, dominant |
| `text-base` | 16 px | le cran de lecture — paragraphes, boutons |
| `text-lg` | 18 px | titres de carte |
| `text-xl` → `text-4xl` | 22 → 44 px | agrégats, chiffres héros |

⚠️ **11 px est un plancher, pas une suggestion.** `scripts/audit-responsive.mjs` échoue
sur tout texte en dessous. Une valeur plus petite dans un composant est un défaut, sauf
lorsqu'il s'agit d'**unités de `viewBox` SVG** — un `fontSize="54"` sur un tracé mis à
l'échelle n'est pas de la typographie, et ces cas passent par la liste d'exceptions de
`.impeccable/config.json`, jamais par une classe.

### Les titres

`display-hero` à `display-sm` sont **fluides** (`clamp()`) : ils se resserrent sur
téléphone sans qu'on ait à les redéclarer par point d'arrêt. L'interlettrage est négatif
au-dessus de 24 px et **normal en dessous** — le resserrement n'aide la lecture que sur
les grands corps ; plus bas il colle les lettres sans rien gagner.

---

## Les formes

| Jeton | Rayon | Emploi |
|---|---|---|
| `rounded-control` | **8 px** | boutons, champs, menus, onglets, pastilles de période |
| `rounded-card` | 12 px | cartes |
| `rounded-panel` | 16 px | panneaux de l'accueil |
| `rounded-pill` | 9999 px | badges, avatars, jetons |

⚠️ **`rounded-md` (6 px) est proscrit.** Les fichiers vendus par le registre shadcn/ui
arrivaient avec le rayon par défaut de Tailwind, jamais adapté aux jetons du projet :
42 occurrences réparties sur 21 fichiers de `components/ui/` rendaient à 6 px pendant que
tout le reste du site rendait à 8. Chaque menu déroulant, chaque sélecteur, chaque champ
et chaque palette de commandes était donc légèrement plus anguleux que le bouton d'à côté.
Elles sont toutes passées à `rounded-control`.

Relevé au navigateur, avant et après, sur l'accueil — et comparé à la référence :

| | 6 px | 8 px | 12 px | 16 px | pilule |
|---|---|---|---|---|---|
| ZENKUU, avant | 5 | 6 | 2 | 3 | 1 |
| ZENKUU, après | **0** | 44 | 3 | 17 | 34 |
| coingecko.com | 3 | 37 | 4 | — | — |

Les 8 px dominent des deux côtés. La divergence qui reste est le palier à 16 px, que
CoinGecko n'a pas : c'est l'arrondi des panneaux de l'accueil, et il est **gardé
délibérément** — c'est l'un des rares traits qui distinguent la page de sa référence.

---

## Le mouvement

Toute animation passe par `--duration-move` et `--ease-standard`, et **toute** est
neutralisée sous `prefers-reduced-motion` par la règle générale en fin de `globals.css`.

⚠️ Le défilement doux vient de `scroll-behavior: smooth` posé sur `html`, ramené à `auto`
sous `prefers-reduced-motion`. **Ne jamais écrire `behavior: 'smooth'` en JavaScript** :
une valeur explicite écrase la propriété CSS, donc la règle d'accessibilité avec elle.
`window.scrollTo({ top: 0 })` sans `behavior` suit la feuille de style. Voir
`components/BackToTop.tsx`.

---

## Ce qui n'est pas négociable

1. **Aucune donnée inventée** (§5). Pas de valeur d'exemple, pas de série factice, pas de
   pourcentage de démonstration. Une absence se dit ; elle ne se comble pas.
2. **Aucun signal d'achat ou de vente** (§7). Le site décrit ce qui a été observé. Une
   hausse est une hausse, pas une opportunité.
3. **Les deux thèmes, à chaque écran.** Un composant qui n'a été regardé qu'en sombre
   n'est pas fini.
4. **11 px de plancher, 32 px de cible tactile.** `scripts/audit-responsive.mjs` les
   fait respecter sur six formats.
5. **Une fonctionnalité absente est grisée avec sa raison, jamais masquée ni simulée.**
   C'est le traitement des fournisseurs OAuth non configurés, et celui des méthodes de
   connexion que le site ne sert pas.
