# HeroUI v3 sur Zenkuu — recensement des 71 composants

Ce document répond à une seule question, pour chacun des 71 composants publiés par
HeroUI v3 : **est-il repris sur le site, et sinon pourquoi ?**

> HeroUI v3 est en **bêta**, sans chemin de migration depuis la v2. Paquets installés :
> `@heroui/react` + `@heroui/styles` 3.2.4.

---

## Deux façons de reprendre une primitive composée

Les composants HeroUI se composent de parties (`Slider.Track`, `Tooltip.Content`…).
Deux voies, et **une seule impasse**.

**Voie 1 — composer les parties chez nous.** Les appelants écrivent
`<Slider min max value />` et ignorent qu'il existe un `Slider.Track`. On remplace
l'intérieur sans qu'un seul fichier appelant bouge. C'est la voie la moins chère, mais
elle n'est ouverte que si les appelants ne voient déjà qu'un composant.

**Voie 2 — exposer le composé et adapter les appelants.** Quand nos fichiers écrivent
déjà `<Tooltip><TooltipTrigger/><TooltipContent/></Tooltip>`, on réexporte le composé de
HeroUI et l'on réécrit ces fichiers. Plus coûteux, parfaitement faisable — appliqué à
`Tooltip` (5 fichiers), `Avatar`, `Disclosure`.

**L'impasse — envelopper chaque partie.** Interposer un composant maison autour de
`Tooltip.Trigger` et `Tooltip.Content` casse la reconnaissance que HeroUI fait de ses
propres enfants. **Constaté, pas supposé** : le déclencheur recevait bien sa classe
`tooltip__trigger`, et la bulle ne s'ouvrait jamais — ni au survol, ni au focus. Cette
tentative a été annulée, puis reprise par la voie 2, où l'infobulle s'ouvre.

## Le piège de couleur, résolu une fois pour toutes

Le CSS de HeroUI n'écrit pas toujours `var(--accent)` : une partie utilise l'utilitaire
Tailwind `bg-accent`, qui se résout par `--color-accent`. Or ce jeton appartient au pont
shadcn du site, où « accent » désigne le **gris de survol** — pas la couleur de marque.
59 occurrences dans 15 feuilles étaient concernées.

`globals.css` redéclare donc `--color-accent` **sur les racines BEM de HeroUI**. Les
propriétés personnalisées s'héritant, chaque sous-arbre HeroUI lit la menthe et le reste
de la page continue de lire le gris. Vérifié : `#5eead4` dans un `.slider`, `#2f2f2f` sur
le `body`.

> ⚠️ **En adoptant un composant, ajouter sa racine à cette liste.** L'oubli ne casse rien
> à la compilation : le composant s'affiche simplement en gris là où il devrait porter la
> couleur de marque.

---

## A — Adoptés (15)

| Composant | Où | Voie | Ce que la reprise a apporté |
|---|---|---|---|
| `ToggleButtonGroup` | Moteur du graphique | 2 | `role="radiogroup"` (« un parmi deux ») ; flèches gauche/droite |
| `Spinner` | Recherche | 1 | Libellé d'attente en français — l'ancien annonçait « Loading » |
| `Skeleton` | 4 fichiers | 1 | Balayage au lieu de clignotement ; jeton de fond correct |
| `ProgressBar` | Progression de l'offre | 1 | `role="progressbar"` avec `aria-valuenow/min/max` |
| `Kbd` | Recherche (`Ctrl+K`, `Échap`) | 1 | Supprime un couplage de style à distance |
| `Separator` | 6 fichiers | 1 | Trois niveaux de contraste |
| `Chip` | Pastilles de classement | 1 | Sépare la couleur de la forme |
| `Slider` | Macro, screener | 1 | Vrai `<input type="range">` : clavier natif |
| `Meter` | Barre de sentiment | 1 | `role="meter"` au lieu de `role="img"` |
| `ScrollShadow` | Onglets de fiche | 1 | Fondu : la bande dit qu'elle continue |
| `Switch` | *(aucun emploi)* | 1 | Migré ; **non vérifié à l'écran, faute d'appelant** |
| `Tooltip` | 5 fichiers | 2 | Supprime le `TooltipProvider` obligatoire et les `asChild` |
| `Checkbox` | Sélecteur de colonnes | 1 | Remplissage de marque, coche en `on-brand` |
| `Avatar` | Menu du compte | 2 | — |
| `Disclosure` / `DisclosureGroup` | Menu mobile | 2 | Titre, déclencheur et chevron séparés au lieu d'être fondus |

`Meter` et `ScrollShadow` ne sont pas des remplacements mais des **capacités neuves** :
ni la jauge sémantique ni l'affordance de défilement n'existaient.

## B — Non repris, avec la raison

### B1 — Blocage réel : routage localisé

`Breadcrumbs` — ses `Breadcrumbs.Item` prennent un `href` brut et son `render` n'accepte
que des éléments intrinsèques. Le site sert **plusieurs langues** avec préfixe d'URL
(`localePrefix: 'as-needed'` sur `fr, en, es, de, it, nl…`) : un `<a href="/">` enverrait
un visiteur anglophone vers l'accueil français. Le fil d'Ariane reste sur notre `Link`
localisé.

### B2 — Blocage réel : contexte de champ React Aria

`Input`, `Label`, `TextArea` et leurs voisins vivent **dans** un `TextField` : posés
seuls, ils ne reçoivent ni identifiant ni câblage ARIA. Nos formulaires utilisent
`<Input>` autonome avec leur propre `<Label htmlFor>`. La voie 2 est ouverte, mais elle
suppose de réécrire **chaque formulaire** — un chantier à décider pour lui-même.

`Input` (25 fichiers) · `Label` (4) · `TextArea` · `TextField` · `SearchField` ·
`NumberField` · `Form` · `Description` · `ErrorMessage` · `FieldError` · `InputGroup` ·
`DateField` · `TimeField` · `ComboBox` · `Autocomplete` · `InputOTP`

### B3 — Faisables par la voie 2, non faits

Rien ne s'y oppose techniquement ; c'est un coût de réécriture, chiffré ici pour que la
décision soit prise en connaissance de cause.

| Composant | Fichiers à réécrire |
|---|---|
| `Table` | 7 |
| `Modal` (Dialog) | 5 |
| `Drawer` | 2 |
| `Select` | 2 |
| `Popover` | 1 |
| `Pagination` | 1 |
| `Card` | 1 (via `Panel`) |
| `Tabs` | 1 |
| `Dropdown` / `ListBox` / `Menu` | menus de navigation |
| `AlertDialog` | 1 |
| `Alert` | 2 — les deux appelants réécrivent déjà tout par `className` |

### B4 — Sans emploi sur le site

`ColorArea` · `ColorField` · `ColorPicker` · `ColorSlider` · `ColorSwatch` ·
`ColorSwatchPicker` · `ColorInputGroup` — aucun sélecteur de couleur.

`Calendar` · `RangeCalendar` · `DatePicker` · `DateRangePicker` · `CalendarYearPicker` —
le cadrage du graphique a son propre `DateRangeCalendar`, très lié à la barre d'outils.

`Toast` — le site utilise `sonner`.
`Badge` — celui de HeroUI est une **pastille de notification**, pas notre étiquette de
classement (passée par `Chip`).
`Button` · `Link` · `CloseButton` · `Typography` · `Surface` · `ProgressCircle` ·
`ToggleButton` · `Tag` · `EmptyState` · `Header` · `Fieldset` · `Toolbar` · les `*Group`
— équivalents maison déjà accordés aux jetons du site.

---

Rappel : v3 est en bêta. Chaque montée de version peut déplacer une API.
