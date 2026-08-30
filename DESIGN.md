---
version: 1
name: ZENKUU
description: >-
  Un site d'information de marché en lecture seule, CLAIR par défaut. Le fond est un
  blanc pur sur lequel les surfaces se distinguent par des filets gris très pâles
  (#e5e7eb) plutôt que par des paliers d'éclaircissement ; en thème sombre, le fond
  descend à un bleu-noir profond (#0d1217) et les surfaces remontent par paliers
  (#1b232d). La tension de marque est un vert franc (#4bcc00 en clair, #80e038 en
  sombre) qui ne sert JAMAIS de couleur de texte au repos : uniquement en aplat, sous
  une encre noire. Les liens sont en encre, et ne verdissent qu'au survol. Toute la
  donnée chiffrée est composée en chasse fixe (DM Mono) pour que les colonnes ne
  tressautent pas d'un rafraîchissement à l'autre ; tout le reste est en Inter. La
  densité est assumée — 14 px de corps dominant, des tableaux de cent lignes — et
  c'est ce qui distingue le site des vitrines du secteur.

colors:
  brand: "#80e038"
  brand-light: "#4bcc00"
  brand-strong: "#99e660"
  brand-strong-light: "#35af00"
  canvas: "#0d1217"
  canvas-light: "#ffffff"
  surface: "#1b232d"
  surface-light: "#f8fafc"
  panel: "#0d1217"
  panel-light: "#ffffff"
  surface-muted: "#35353a"
  surface-muted-light: "#f8fafc"
  border-subtle: "#3f3f46"
  border-subtle-light: "#e5e7eb"
  ink: "#dfe5ec"
  ink-light: "#0f172a"
  ink-muted: "#9eb0c7"
  ink-muted-light: "#64748b"
  up: "#32ca5b"
  up-light: "#00a83e"
  down: "#ff3a33"
  down-light: "#ff3a33"

typography:
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
  scale:
    micro: 11px
    v2-2xs: 12px
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
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, sans-serif"
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1.14
    letterSpacing: -0.12px
  reading:
    fontFamily: "Inter, sans-serif"
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.6
  table-secondary:
    fontFamily: "Inter, sans-serif"
    fontSize: 13px
    fontWeight: 400
  micro:
    fontFamily: "Inter, sans-serif"
    fontSize: 11px
    fontWeight: 500
  numeric:
    fontFamily: "'DM Mono', ui-monospace, monospace"
    fontSize: 14px
    fontWeight: 400
  display-hero:
    fontFamily: "Inter, sans-serif"
    fontSize: 48px
    fontWeight: 700
    lineHeight: 1.17
    letterSpacing: -0.021em
  display-xl:
    fontFamily: "Inter, sans-serif"
    fontSize: 40px
    fontWeight: 700
    lineHeight: 1.18
    letterSpacing: -0.018em
  display-lg:
    fontFamily: "Inter, sans-serif"
    fontSize: 36px
    fontWeight: 700
    lineHeight: 1.22
    letterSpacing: -0.014em
  display-md:
    fontFamily: "Inter, sans-serif"
    fontSize: 28px
    fontWeight: 700
    lineHeight: 1.29
    letterSpacing: -0.018em
  display-sm:
    fontFamily: "Inter, sans-serif"
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
> composé en Inter (en Figtree à l’époque de cette note).
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

**Inter** porte l'interface et les titres. **DM Mono** porte les nombres.

**Inter est la fonte de la référence, servie telle quelle.** CoinGecko compose tout son
site en Inter — 363 mesures concordantes sur neuf pages, relevées le 2026-08-30, avec la
pile de repli `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica,
Arial`. Inter est publiée sous SIL OFL et servie par `next/font/google` : il n'y a aucune
raison de lui chercher un équivalent.

⚠️ **Ce paragraphe décrivait un tout autre problème jusqu'au 2026-08-30.** ZENKUU servait
Figtree comme équivalent libre de *Kufox Sans*, la fonte SUR MESURE de **KuCoin** — cible
d'une refonte antérieure, légitimement non redistribuable. Le raisonnement était juste
pour cette cible ; il ne s'applique pas à CoinGecko, dont la fonte est publique.

| Fonte | Chasse | x | Capitale | x/cap |
|---|---|---|---|---|
| **Inter** (servie) | 1733 | 54 | 73 | 0,740 |
| Figtree (précédente) | 1644 | 50 | 70 | 0,714 |
| Geist (avant elle) | 1673 | 53 | 71 | 0,746 |

⚠️ **Inter est 5,4 % plus large que Figtree à corps égal, et c'est la direction qui
casse.** Le passage à Figtree allait dans le sens sûr : les colonnes dimensionnées au
caractère près gagnaient de la marge. Celui-ci va dans l'autre sens — un libellé qui
tenait tout juste peut se mettre à déborder. Sa hauteur d'x monte de 50 à 54 (+8 %) : le
texte paraît plus grand à corps identique, ce qui est la proportion voulue. L'échelle en
pixels ne bouge pas. Le détail vit dans l'entête de `apps/web/app/[locale]/layout.tsx`.

⚠️ **CoinGecko sert une variante `Inter-Dark` en thème sombre**, relevée en tête de pile
dans les mesures. Elle n'est pas distribuée publiquement : les deux thèmes reçoivent donc
la même Inter.

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

**Deux systèmes coexistent le temps de la migration.** `text-micro` à `text-4xl`
appartiennent à l'échelle héritée de ZENKUU, ci-dessus. `v2-2xs` (12 px) est le premier
cran de la couche `--v2-*` posée par l'audit CoinGecko (`DESIGN_SYSTEM.md`, section 10) —
un cran que ZENKUU n'avait pas, entre son plancher `text-micro` (11 px) et `text-xs`
(13 px). `impeccable` valide chaque taille du dépôt contre l'union des deux : amputer
cette liste d'un cran `--v2-*` ferait signaler comme défaut une valeur pourtant relevée et
documentée. Les crans hérités disparaîtront un par un à mesure que les sous-projets B à E
retirent les anciens jetons ; l'union ne dure que le temps de la migration.

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
4. **11 px de plancher, 24 px de cible tactile.** `scripts/audit-responsive.mjs` les
   fait respecter sur six formats.

   ⚠️ **La cible tactile était à 32 px jusqu'au 30 août 2026.** Elle passe à 24 px, le
   minimum du critère WCAG 2.2 AA 2.5.8 : la référence dont ce site reproduit la
   structure descend sous 32 px sur ses contrôles, et garder l'ancien seuil interdisait
   la fidélité sur toute une famille de composants. C'est un arbitrage de l'exploitant
   entre deux exigences légitimes, pas un abandon — 24 px reste normatif, et rien en
   dessous n'est acceptable.
5. **Une fonctionnalité absente est grisée avec sa raison, jamais masquée ni simulée.**
   C'est le traitement des fournisseurs OAuth non configurés, et celui des méthodes de
   connexion que le site ne sert pas.
