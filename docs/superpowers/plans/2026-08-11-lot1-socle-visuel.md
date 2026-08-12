# Lot 1 — Socle visuel : largeur, polices, en-tête, animation des menus

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer la coque centrée 1240px par une coque pleine largeur alignée à gauche façon Token Terminal, en Geist, avec des menus déroulants animés façon OKX.

**Architecture:** Trois plafonds de largeur contradictoires sont unifiés derrière un utilitaire CSS unique. Les trois familles de polices sont remplacées par Geist sans renommer les variables CSS qui les portent, ce qui laisse intacts les composants consommateurs. L'animation de fermeture des menus exige de garder le panneau monté pendant sa transition : cette logique est extraite en réducteur pur, testable sans navigateur ni bibliothèque de rendu.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS 4, `next/font/google`, vitest 4, bun 1.3.

**Spec de référence:** `docs/superpowers/specs/2026-08-11-refonte-header-marches-actualites-design.md`

## Global Constraints

- **Aucune valeur hexadécimale dans un composant.** Les couleurs passent exclusivement par les jetons de `globals.css`. Aucune variante `dark:` dans un composant.
- **Aucun changement de palette ni de rayon.** `--radius-*` reste à `0px`.
- **Le barème d'espacement de Tailwind est en `rem`.** Ne jamais modifier `html { font-size }` : cela multiplierait chaque marge et chaque hauteur du site. La taille de texte se règle par les jetons `--text-*`.
- **Un commentaire qui contredit son code est un défaut.** Tout commentaire dont cette refonte invalide le propos doit être réécrit dans le même commit, jamais laissé en place ni supprimé sans remplacement.
- **`prefers-reduced-motion` est déjà géré globalement** par `globals.css:428-440`, qui force `transition-duration: 0.01ms !important`. Aucune branche conditionnelle en JavaScript n'est nécessaire ni souhaitée.
- **Commandes de vérification** (depuis la racine) : `bun run typecheck`, `bun run lint`, `bun run test`, `bun run build`.
- **Langue des commentaires et des libellés : français**, comme tout le dépôt.

---

## File Structure

| Fichier | Rôle | Action |
|---|---|---|
| `apps/web/app/globals.css` | jetons + utilitaires `.shell` / `.shell-bleed` / `.prose-measure` + jetons de durée de menu + jetons `--text-*` | Modifier |
| `apps/web/app/[locale]/layout.tsx` | chargement des polices, conteneur `<main>` | Modifier |
| `apps/web/components/Footer.tsx` | conteneur du pied de page | Modifier |
| `apps/web/components/nav/presence.ts` | machine à états d'apparition/disparition, pure | **Créer** |
| `apps/web/components/nav/presence.test.ts` | tests du réducteur | **Créer** |
| `apps/web/components/nav/usePresence.ts` | branchement React du réducteur | **Créer** |
| `apps/web/components/NavBar.tsx` | disposition de l'en-tête + panneau animé | Modifier |
| `apps/web/content/navigation.ts` | second groupe de raccourcis | Modifier |

Le dossier `components/nav/` est créé pour cette occasion : `NavBar.tsx` fait déjà 331 lignes et absorber en plus une machine à états la rendrait difficile à tenir en tête d'un seul regard.

---

## Task 1 : Unifier les trois largeurs derrière `.shell`

**Files:**
- Modify: `apps/web/app/globals.css` (ajout dans `@layer components`)
- Modify: `apps/web/app/[locale]/layout.tsx:201`
- Modify: `apps/web/components/Footer.tsx:21`
- Modify: `apps/web/components/NavBar.tsx:128`

**Interfaces:**
- Consumes: rien
- Produces: classes CSS `.shell` et `.prose-measure`, utilisables par tout composant.

**Contexte pour l'implémenteur.** La largeur du site est aujourd'hui fixée à trois endroits avec trois valeurs différentes — `1240px` dans l'en-tête, `1280px` dans le contenu, `1120px` dans le pied de page. C'est la cause du désalignement visible entre la barre de navigation et le contenu. On ne se contente pas de changer les trois valeurs : on les remplace par un seul utilitaire, pour que la prochaine modification tienne en une ligne.

- [ ] **Step 1 : Ajouter les deux utilitaires dans `globals.css`**

À placer dans le bloc `@layer components` existant, juste avant `.display-mega` :

```css
  /* ───────────────────────────────────────────────────────────────────────────
     COQUE DE PAGE — largeur unique du site.

     Remplace trois plafonds contradictoires qui coexistaient : 1240px dans
     l'en-tête, 1280px dans le contenu, 1120px dans le pied de page. Trois valeurs
     pour une seule intention, d'où le désalignement visible entre la barre de
     navigation et le contenu qu'elle surmonte.

     1440px : la largeur relevée sur Token Terminal, notre référence de mise en
     page. Mesurée sur une capture en 1919px de large, leur contenu court de x=260
     à x=1655 — soit un conteneur de 1440px centré, moins 24px de marge interne de
     chaque côté. C'est plus large que les 1280px d'avant, ce qui était la demande,
     sans aller bord à bord.

     Ne PAS confondre avec `.shell-bleed` ci-dessous : chez Token Terminal comme
     ici, la barre de navigation traverse tout l'écran alors que le contenu reste
     centré. Les deux ne s'alignent donc pas, et c'est voulu.
     ─────────────────────────────────────────────────────────────────────────── */
  .shell {
    width: 100%;
    max-inline-size: 1440px;
    margin-inline: auto;
    padding-inline: 24px;
  }

  /* ───────────────────────────────────────────────────────────────────────────
     BANDE PLEINE LARGEUR — l'en-tête, et rien d'autre pour l'instant.

     Une barre de navigation qui s'arrête à 1440px laisse, sur un grand écran, deux
     vides de part et d'autre d'un filet qui, lui, traverse : le résultat se lit
     comme un défaut d'alignement plutôt que comme une intention. D'où la
     séparation entre la largeur du CONTENU et celle des BANDES.
     ─────────────────────────────────────────────────────────────────────────── */
  .shell-bleed {
    width: 100%;
    padding-inline: 24px;
  }

  /* ───────────────────────────────────────────────────────────────────────────
     MESURE DE LECTURE — la seule exception à la pleine largeur.

     Réservée au TEXTE COURANT des pages éditoriales. Au-delà d'environ 90
     caractères, l'œil ne retrouve plus le début de la ligne suivante en revenant à
     la marge : c'est une limite physiologique, pas une préférence de mise en page.

     Elle ne s'applique QU'AUX PARAGRAPHES. Titres, images, tableaux et encadrés de
     ces mêmes pages restent en pleine largeur — les brider ferait un site à deux
     largeurs, ce qui est précisément ce qu'on vient de supprimer.
     ─────────────────────────────────────────────────────────────────────────── */
  .prose-measure {
    max-inline-size: 75ch;
  }
```

- [ ] **Step 2 : Remplacer le conteneur du contenu**

Dans `apps/web/app/[locale]/layout.tsx`, ligne 201 :

```tsx
              <main id="contenu" className="mx-auto max-w-[1280px] px-4 py-6">
```

devient :

```tsx
              <main id="contenu" className="shell py-6">
```

- [ ] **Step 3 : Remplacer le conteneur du pied de page**

Dans `apps/web/components/Footer.tsx`, ligne 21 :

```tsx
      <div className="mx-auto max-w-[1120px] px-4 py-10">
```

devient :

```tsx
      <div className="shell py-10">
```

- [ ] **Step 4 : Remplacer le conteneur de l'en-tête**

Dans `apps/web/components/NavBar.tsx`, ligne 128 :

```tsx
          className="relative mx-auto flex h-16 max-w-[1240px] items-center justify-between gap-4 px-4"
```

devient :

```tsx
          className="shell-bleed relative flex h-16 items-center gap-4"
```

`justify-between` disparaît dès maintenant : la tâche 4 le remplace par un flux naturel. Entre-temps les groupes se collent à gauche, ce qui est un état transitoire attendu et non un défaut.

- [ ] **Step 5 : Vérifier que rien ne casse**

```bash
bun run typecheck && bun run lint && bun run build
```

Attendu : succès. Aucun test unitaire ne couvre la mise en page ; la vérification est ici la compilation et la revue visuelle du pas suivant.

- [ ] **Step 6 : Vérification visuelle**

Lancer `bun run dev`, ouvrir `http://localhost:3000` et contrôler que :
- l'en-tête, le contenu et le pied de page commencent tous à 24px du bord gauche ;
- aucune page ne défile horizontalement.

- [ ] **Step 7 : Commit**

```bash
git add apps/web/app/globals.css apps/web/app/\[locale\]/layout.tsx apps/web/components/Footer.tsx apps/web/components/NavBar.tsx
git commit -m "Une seule largeur de page, au lieu de trois qui se contredisaient"
```

---

## Task 2 : Passer à Geist et corriger l'échelle de texte

**Files:**
- Modify: `apps/web/app/[locale]/layout.tsx:2`, `:28-73`
- Modify: `apps/web/app/globals.css` (bloc `@theme`, commentaires sur les polices)

**Interfaces:**
- Consumes: rien
- Produces: les variables `--font-inter`, `--font-mono-numeric`, `--font-display-brand` continuent d'exister avec les mêmes noms ; seules leurs valeurs changent. Aucun composant consommateur n'est modifié.

**Contexte pour l'implémenteur.** Trois familles sont chargées aujourd'hui : Inter (interface), IBM Plex Sans (titres), JetBrains Mono (nombres). On passe à Geist et Geist Mono, qui couvrent les trois rôles — la distinction titre/interface est alors portée par la graisse et non par un changement de famille.

Les noms des variables CSS **ne changent pas**. C'est le point qui rend cette tâche courte : `--font-sans`, `--font-display` et `--font-mono` sont consommés par des centaines d'endroits, qui suivent automatiquement. Le nom `--font-inter` devient trompeur ; il sera renommé plus tard, une fois le rendu validé — mêler un renommage et un changement de fonte dans un même commit rendrait un retour en arrière inutilement pénible.

- [ ] **Step 1 : Vérifier que Geist est disponible dans cette version de Next**

```bash
node -e "const f=require('next/font/google'); console.log('Geist' in f, 'Geist_Mono' in f)"
```

Attendu : `true true`.

**Si l'un des deux est `false`** : installer le paquet officiel à la place, `bun add geist --cwd apps/web`, et importer depuis `geist/font/sans` et `geist/font/mono`. Le reste de la tâche est identique — seules les lignes d'import et de déclaration changent.

- [ ] **Step 2 : Remplacer les trois déclarations de police**

Dans `apps/web/app/[locale]/layout.tsx`, ligne 2 :

```tsx
import { IBM_Plex_Sans, Inter, JetBrains_Mono } from 'next/font/google'
```

devient :

```tsx
import { Geist, Geist_Mono } from 'next/font/google'
```

Puis remplacer intégralement les lignes 28 à 73 par :

```tsx
/**
 * Police d'INTERFACE et d'AFFICHAGE — Geist.
 *
 * Elle remplace un système à deux familles (Inter pour l'interface, IBM Plex Sans
 * pour les titres). Ce dédoublement suivait kraken/DESIGN.md, qui fait porter la
 * voix d'une page par le contraste entre deux fontes ; on la fait désormais porter
 * par la GRAISSE d'une seule. Le gain est double : une famille de moins à
 * télécharger sur chaque page — ce que le §9 mesure en LCP — et une identité
 * typographique plus nette, là où deux grotesques voisines se distinguaient mal.
 *
 * `display: swap` évite le texte invisible pendant le chargement (§9).
 *
 * QUATRE GRAISSES, et c'est le maximum acceptable : chaque graisse est un fichier
 * chargé partout. 400 pour le texte courant, 500 pour la navigation et les
 * libellés, 600 pour le cran « Feature Title », 700 pour les titres d'affichage.
 */
const sans = Geist({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
})

/**
 * Police des NOMBRES — Geist Mono.
 *
 * DESIGN.md prescrit une police dédiée pour toute donnée tabulaire, et la raison
 * est fonctionnelle plutôt qu'esthétique : en chasse proportionnelle, un « 1 » est
 * plus étroit qu'un « 8 », si bien qu'une colonne de cotation se décale
 * visuellement à chaque rafraîchissement. La chasse fixe supprime ce ballet.
 *
 * Deux graisses seulement : les nombres n'ont besoin ni de gras ni d'italique.
 */
const mono = Geist_Mono({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500'],
  variable: '--font-mono-numeric',
})

```

Il n'y a **que deux constantes** après cette substitution : `sans` et `mono`. Ne pas créer de troisième constante pour l'affichage — la police de titre n'est plus une famille distincte, et le pas 4 fait pointer `--font-display` directement sur `--font-inter` dans le CSS.

**Attention** : le `variable:` de `sans` reste `'--font-inter'`. Ce n'est pas un oubli mais le choix documenté ci-dessus : conserver le nom permet aux centaines de consommateurs de suivre sans être retouchés. Ne pas le « corriger ».

- [ ] **Step 3 : Simplifier la composition des variables**

Ligne 172 de `layout.tsx` :

```tsx
      className={`${inter.variable} ${mono.variable} ${display.variable}`}
```

devient :

```tsx
      className={`${sans.variable} ${mono.variable}`}
```

`--font-display-brand` n'est plus défini nulle part : c'est voulu, et le pas 4 retire la seule référence qui en restait.

- [ ] **Step 4 : Faire pointer la police d'affichage sur la même famille**

Dans `apps/web/app/globals.css`, dans le bloc `@theme`, remplacer :

```css
  --font-display: var(--font-display-brand), var(--font-inter), ui-sans-serif, system-ui, sans-serif;
```

par :

```css
  /* La police d'affichage n'est plus une famille distincte : c'est la police
     d'interface en graisse 700. Le jeton subsiste parce que les quatre classes
     `.display-*` le consomment — le supprimer obligerait à les retoucher toutes
     pour un gain nul. */
  --font-display: var(--font-inter), ui-sans-serif, system-ui, sans-serif;
```

Réécrire également le bloc de commentaire qui le surmonte (celui qui justifie IBM Plex Sans comme repli de la fonte de marque de kraken) : il documente un système à deux familles qui n'existe plus.

- [ ] **Step 5 : Régler la taille de texte par les jetons, jamais par la racine**

Toujours dans `@theme`, ajouter :

```css
  /* ───────────────────────────────────────────────────────────────────────────
     ÉCHELLE DE TEXTE — réglée ici, et SURTOUT PAS par `html { font-size }`.

     Tailwind 4 exprime tout son barème d'espacement en `rem` : `p-4`, `gap-6`,
     `h-16`, `space-y-8`… Passer la racine de 16 à 15px multiplierait donc chaque
     marge, chaque hauteur et chaque gouttière du site par 0,9375. Ce ne serait pas
     un réglage typographique mais une réduction silencieuse de toute la grille de
     4px que le §3.1 définit.

     Ces deux jetons n'atteignent que le texte. L'espacement reste calé sur une
     racine à 16px.
     ─────────────────────────────────────────────────────────────────────────── */
  --text-base: 0.9375rem; /* 15px */
  --text-sm: 0.875rem;    /* 14px */
```

- [ ] **Step 6 : Vérifier**

```bash
bun run typecheck && bun run lint && bun run build
```

Attendu : succès. Une erreur `Cannot find name 'inter'` ou `'display'` signale un oubli au pas 3.

- [ ] **Step 7 : Vérification visuelle**

Lancer `bun run dev` et contrôler dans l'inspecteur que :
- `body` rend en Geist et non en Inter ni en police système ;
- un nombre de tableau de cotation rend en Geist Mono ;
- un titre `.display-mega` rend en Geist 700 ;
- **les marges n'ont pas changé** — comparer la hauteur de l'en-tête, qui doit rester à 64px exactement.

- [ ] **Step 8 : Commit**

```bash
git add apps/web/app/\[locale\]/layout.tsx apps/web/app/globals.css
git commit -m "Geist remplace Inter, IBM Plex et JetBrains Mono"
```

---

## Task 3 : Machine à états d'apparition, en réducteur pur

**Files:**
- Create: `apps/web/components/nav/presence.ts`
- Test: `apps/web/components/nav/presence.test.ts`

**Interfaces:**
- Consumes: rien
- Produces:
  - `type PresenceState = 'closed' | 'open' | 'closing'`
  - `type PresenceEvent = 'open' | 'close' | 'transitionEnd'`
  - `function nextPresence(state: PresenceState, event: PresenceEvent): PresenceState`
  - `function isMounted(state: PresenceState): boolean`

**Contexte pour l'implémenteur.** `NavBar.tsx:277` rend aujourd'hui `{isOpen ? <div/> : null}`. Un élément démonté ne peut pas s'animer en sortie : React le retire de l'arbre avant que le navigateur ne peigne la première image de la transition. Pour animer la fermeture, il faut donc garder le panneau monté pendant sa disparition, puis le démonter.

Cela introduit un troisième état — « en train de se fermer » — et c'est là que naissent les défauts : un panneau qui reste bloqué à l'écran, ou qui disparaît d'un coup si on le rouvre pendant sa fermeture. On isole donc cette logique dans une fonction pure, sans React ni DOM, pour pouvoir l'éprouver directement.

Les deux transitions qui comptent, et qu'un test doit fixer :
- `closing` + `open` → `open` : rouvrir pendant la fermeture **annule** la fermeture. Sans cette règle, un aller-retour rapide du curseur fait disparaître le menu sous le pointeur.
- `open` + `transitionEnd` → `open` : un `transitionend` reçu alors qu'on est ouvert est celui de l'animation d'*entrée*. L'ignorer est indispensable, sinon le panneau se démonte aussitôt après être apparu.

- [ ] **Step 1 : Écrire les tests d'abord**

Créer `apps/web/components/nav/presence.test.ts` :

```ts
import { describe, expect, it } from 'vitest'

import { isMounted, nextPresence } from './presence'

describe('nextPresence', () => {
  it("ouvre depuis l'état fermé", () => {
    expect(nextPresence('closed', 'open')).toBe('open')
  })

  it('passe par « closing » et non directement par « closed »', () => {
    expect(nextPresence('open', 'close')).toBe('closing')
  })

  it('démonte à la fin de la transition de fermeture', () => {
    expect(nextPresence('closing', 'transitionEnd')).toBe('closed')
  })

  /*
   * Le cas qui motive tout ce réducteur : le curseur ressort du menu puis y
   * revient aussitôt. Sans cette règle, la fermeture se poursuit et le panneau
   * disparaît sous le pointeur — le défaut le plus irritant d'un menu au survol.
   */
  it('annule la fermeture si on rouvre pendant la disparition', () => {
    expect(nextPresence('closing', 'open')).toBe('open')
  })

  /*
   * `transitionend` est émis par l'animation d'ENTRÉE aussi. Le traiter comme un
   * signal de démontage ferait disparaître le panneau juste après son apparition.
   */
  it("ignore la fin de la transition d'entrée", () => {
    expect(nextPresence('open', 'transitionEnd')).toBe('open')
  })

  it('ignore une fermeture déjà en cours', () => {
    expect(nextPresence('closing', 'close')).toBe('closing')
  })

  it('ignore une fermeture demandée alors que tout est déjà fermé', () => {
    expect(nextPresence('closed', 'close')).toBe('closed')
  })

  it('ignore un transitionEnd reçu à l’état fermé', () => {
    expect(nextPresence('closed', 'transitionEnd')).toBe('closed')
  })
})

describe('isMounted', () => {
  it('garde le panneau monté pendant la fermeture', () => {
    expect(isMounted('closing')).toBe(true)
  })

  it('monte le panneau ouvert', () => {
    expect(isMounted('open')).toBe(true)
  })

  it('démonte le panneau fermé', () => {
    expect(isMounted('closed')).toBe(false)
  })
})
```

- [ ] **Step 2 : Lancer les tests et vérifier qu'ils échouent**

```bash
bun run test -- presence
```

Attendu : ÉCHEC, `Failed to resolve import "./presence"`.

- [ ] **Step 3 : Écrire l'implémentation minimale**

Créer `apps/web/components/nav/presence.ts` :

```ts
/**
 * Machine à états de l'apparition et de la disparition d'un panneau flottant.
 *
 * ── POURQUOI UNE FONCTION PURE PLUTÔT QU'UN `useState` DANS LE COMPOSANT ──────
 *
 * Animer une SORTIE impose de garder l'élément monté pendant sa disparition : un
 * nœud retiré de l'arbre est retiré du document avant que le navigateur n'ait peint
 * la première image de la transition. Il faut donc un troisième état, entre
 * « ouvert » et « fermé », et c'est lui qui apporte les défauts — panneau bloqué à
 * l'écran, ou disparaissant sous le curseur quand on le rouvre trop vite.
 *
 * Trois états et trois événements font neuf combinaisons, dont deux ne se
 * découvrent qu'à l'usage et se reproduisent mal à la main dans un navigateur.
 * Isolée ici, sans React ni DOM, la règle s'éprouve directement.
 */

export type PresenceState = 'closed' | 'open' | 'closing'

export type PresenceEvent = 'open' | 'close' | 'transitionEnd'

export function nextPresence(state: PresenceState, event: PresenceEvent): PresenceState {
  switch (event) {
    case 'open':
      /* Depuis « closing » aussi, et c'est l'intérêt principal de ce réducteur :
         rouvrir ANNULE la fermeture en cours. */
      return 'open'

    case 'close':
      /* Uniquement depuis « open ». Une fermeture demandée pendant une fermeture
         redémarrerait l'animation à mi-parcours, avec un saut visible. */
      return state === 'open' ? 'closing' : state

    case 'transitionEnd':
      /* `transitionend` est émis par l'animation d'ENTRÉE comme par celle de
         SORTIE. Seule la seconde démonte ; confondre les deux ferait disparaître
         le panneau juste après son apparition. */
      return state === 'closing' ? 'closed' : state
  }
}

/** Le panneau reste dans l'arbre pendant sa disparition — sans quoi rien à animer. */
export function isMounted(state: PresenceState): boolean {
  return state !== 'closed'
}
```

- [ ] **Step 4 : Lancer les tests et vérifier qu'ils passent**

```bash
bun run test -- presence
```

Attendu : 11 tests réussis.

- [ ] **Step 5 : Commit**

```bash
git add apps/web/components/nav/presence.ts apps/web/components/nav/presence.test.ts
git commit -m "Machine à états d'un panneau qui doit survivre à sa propre fermeture"
```

---

## Task 4 : Branchement React du réducteur

**Files:**
- Create: `apps/web/components/nav/usePresence.ts`

**Interfaces:**
- Consumes: `nextPresence`, `isMounted`, `PresenceState` de `./presence`
- Produces: `function usePresence(isOpen: boolean): { state: PresenceState; mounted: boolean; onTransitionEnd: () => void }`

**Contexte pour l'implémenteur.** Le composant `DropdownMenu` connaît un booléen `isOpen` piloté par le parent. Ce crochet le traduit en état d'apparition et fournit les deux choses dont le JSX a besoin : faut-il monter le panneau, et quel gestionnaire brancher sur la fin de transition.

Le garde-fou temporel est indispensable. `transitionend` **n'est pas émis** si l'élément est masqué en cours de route, si l'onglet passe en arrière-plan avant la fin de l'animation, ou si une autre règle CSS annule la transition. Sans filet, le panneau resterait monté et invisible, en capturant les clics. 400 ms est confortablement au-delà des 120 ms de la fermeture.

- [ ] **Step 1 : Écrire le crochet**

Créer `apps/web/components/nav/usePresence.ts` :

```ts
'use client'

import { useEffect, useRef, useState } from 'react'

import { isMounted, nextPresence, type PresenceState } from './presence'

/**
 * Traduit un booléen d'ouverture en état d'apparition animable.
 *
 * La logique des transitions vit dans `presence.ts`, éprouvée par ses propres
 * tests ; ce crochet ne fait que la brancher sur React et sur l'horloge.
 */
export function usePresence(isOpen: boolean) {
  const [state, setState] = useState<PresenceState>(isOpen ? 'open' : 'closed')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setState((current) => nextPresence(current, isOpen ? 'open' : 'close'))
  }, [isOpen])

  /*
   * GARDE-FOU — `transitionend` n'est PAS garanti.
   *
   * Il n'est pas émis si l'élément est masqué en cours d'animation, si l'onglet
   * passe en arrière-plan, ou si une règle CSS annule la transition. Sans ce filet,
   * le panneau resterait monté et invisible tout en continuant de capturer les
   * clics — un défaut invisible en développement et bien réel à l'usage.
   *
   * 400 ms : très au-delà des 120 ms de la fermeture, donc jamais déclenché en
   * fonctionnement normal.
   */
  useEffect(() => {
    if (state !== 'closing') return

    timer.current = setTimeout(() => {
      setState((current) => nextPresence(current, 'transitionEnd'))
    }, 400)

    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [state])

  return {
    state,
    mounted: isMounted(state),
    onTransitionEnd: () => {
      setState((current) => nextPresence(current, 'transitionEnd'))
    },
  }
}
```

- [ ] **Step 2 : Vérifier**

```bash
bun run typecheck && bun run lint
```

Attendu : succès.

- [ ] **Step 3 : Commit**

```bash
git add apps/web/components/nav/usePresence.ts
git commit -m "Crochet React branchant la machine à états sur l'horloge"
```

---

## Task 5 : Disposition de l'en-tête façon Token Terminal

**Files:**
- Modify: `apps/web/components/NavBar.tsx:17-23` (commentaire), `:128-215` (structure)
- Modify: `apps/web/content/navigation.ts` (fin du fichier)

**Interfaces:**
- Consumes: `.shell` de la tâche 1
- Produces: `NAV_SHORTCUTS: NavShortcut[]` exporté depuis `content/navigation.ts`

**Contexte pour l'implémenteur.** L'en-tête centre aujourd'hui sa navigation à l'aide de deux `flex-1 basis-0` posés sur les groupes latéraux — un dispositif dont le commentaire des lignes 133-137 explique qu'il corrige un décalage de 27 pixels. Tout cela disparaît : la navigation n'est plus centrée mais alignée à gauche, contre le logo.

**Le piège à ne pas manquer.** Le commentaire des lignes 118-126 explique que `relative` est posé sur le conteneur centré et non sur le `<header>`, faute de quoi le tiroir `HeaderMenu` se collait au bord droit de l'écran, « à plusieurs centaines de pixels du bouton qui l'ouvre ». Cette parade **cesse de fonctionner** dès que le conteneur devient pleine largeur : il redevient aussi large que le `<header>` et le défaut d'origine réapparaît à l'identique. L'ancrage doit donc descendre sur le groupe de droite, qui contient le bouton.

- [ ] **Step 1 : Déclarer les raccourcis**

Ajouter à la fin de `apps/web/content/navigation.ts` :

```ts
/**
 * Raccourcis directs de l'en-tête — second groupe, après le filet.
 *
 * Ils ne doublent PAS les menus déroulants : ce sont nos trois outils propres, ceux
 * qu'aucun agrégateur concurrent ne propose, et qui se perdraient au troisième rang
 * d'un menu. Un raccourci n'existe que s'il mène quelque part — pas de `ready`
 * ici, contrairement aux entrées de menu.
 *
 * Libellés en français comme le reste de ce fichier : la navigation n'est pas
 * encore passée par le dictionnaire de traduction, et l'y faire entrer pour ces
 * trois entrées seules créerait une incohérence de plus.
 */
export interface NavShortcut {
  label: string
  href: string
  /** Jeton de couleur de la pastille. Décor : elle ne porte aucune information. */
  dot: string
}

export const NAV_SHORTCUTS: NavShortcut[] = [
  { label: 'Heatmap', href: '/heatmap', dot: 'bg-data-1' },
  { label: 'Screener', href: '/screener', dot: 'bg-data-4' },
  { label: 'Sentiment', href: '/sentiment', dot: 'bg-data-3' },
]
```

- [ ] **Step 2 : Réécrire le commentaire d'en-tête du composant**

Dans `apps/web/components/NavBar.tsx`, remplacer les lignes 17 à 23 :

```tsx
/**
 * Barre de navigation — bande pleine largeur alignée à gauche.
 *
 * La disposition suit Token Terminal : logo au bord gauche de l'écran, menus
 * immédiatement à sa droite, actions rejetées à l'extrême droite. Elle REMPLACE une
 * bande centrée de 1240px calquée sur AniList — l'ancien parti pris laissait, sur un
 * écran large, deux vides symétriques que le contenu pleine largeur ne justifiait
 * plus.
 *
 * Aucun plafond de largeur ici : `.shell` porte la largeur du site entier, en un
 * seul endroit (voir globals.css).
 */
```

- [ ] **Step 3 : Remplacer la structure de la barre**

Remplacer le contenu du `<div ref={navRef}>` — c'est-à-dire des lignes 128 à 215 actuelles, jusqu'au `</div>` fermant qui suit `<HeaderMenu … />` — par :

```tsx
        <div ref={navRef} className="shell-bleed flex h-16 items-center gap-4">
          {/* GROUPE 1 — logo puis menus, collés à gauche. */}
          <Link
            href="/"
            className="flex shrink-0 items-center text-ink transition-opacity hover:opacity-80"
            aria-label={`${fr.site.name} — ${fr.site.tagline}`}
          >
            {/*
              `logo-zenkuu.svg` encode l'image (mascotte + mot-symbole) via un masque
              de luminance — pas de silhouette `currentColor` possible ici. Le
              contenu composité est NOIR sur fond transparent, donc lisible tel quel
              en thème clair ; `dark:invert` le blanchit en thème sombre.

              Dimensions écrites en dur (109×44, ratio du recadrage du viewBox) pour
              éviter le tressautement de mise en page au premier rendu.
            */}
            {/* eslint-disable-next-line @next/next/no-img-element -- SVG local : l'optimiseur de Next ne traite pas ce format */}
            <img
              src="/brand/logo-zenkuu.svg"
              alt={fr.site.name}
              width={109}
              height={44}
              className="h-11 w-[109px] shrink-0 dark:invert"
            />
          </Link>

          <nav aria-label="Navigation principale" className="hidden items-center gap-0.5 lg:flex">
            {NAV_MENUS.map((menu) => (
              <DropdownMenu
                key={menu.label}
                menu={menu}
                isOpen={openMenu === menu.label}
                onOpen={() => openOnHover(menu.label)}
                onClose={closeOnHover}
                onToggle={() => setOpenMenu(openMenu === menu.label ? null : menu.label)}
                onNavigate={() => setOpenMenu(null)}
              />
            ))}
          </nav>

          {/* FILET de séparation. `aria-hidden` : c'est un trait, pas une information —
              un lecteur d'écran n'a rien à en dire. Masqué sous `xl` avec le groupe
              qu'il sépare, sans quoi il flotterait seul. */}
          <span aria-hidden="true" className="hidden h-5 w-px bg-border-subtle xl:block" />

          {/* GROUPE 2 — raccourcis directs, sans menu. Premier à disparaître quand la
              place manque : ce sont des accès rapides, et leurs destinations restent
              toutes atteignables par les menus. */}
          <nav aria-label="Accès rapides" className="hidden items-center gap-4 xl:flex">
            {NAV_SHORTCUTS.map((shortcut) => (
              <Link
                key={shortcut.href}
                href={shortcut.href}
                className="flex items-center gap-1.5 text-sm font-medium text-ink-muted transition-colors duration-150 hover:text-ink"
              >
                {shortcut.label}
                <span aria-hidden="true" className={`h-1.5 w-1.5 shrink-0 ${shortcut.dot}`} />
              </Link>
            ))}
          </nav>

          {/*
            GROUPE 3 — actions, rejetées à droite par `ml-auto`.

            `relative` est ICI, et l'endroit compte. Il portait auparavant sur le
            conteneur centré de 1240px : posé sur le `<header>` pleine largeur, le
            tiroir se collait au bord droit de l'écran, donc à plusieurs centaines de
            pixels du bouton qui l'ouvre. Or ce conteneur est DÉSORMAIS pleine
            largeur lui aussi — l'ancienne parade ne protégeait plus de rien. Ancré au
            groupe qui contient le bouton, le tiroir tombe sous lui quelle que soit la
            largeur de la fenêtre.
          */}
          <div className="relative ml-auto flex items-center gap-2">
            <SearchTrigger onOpen={() => setSearchOpen(true)} />

            <AuthButtons onOpen={setAuthMode} />

            {/* Un seul bouton de menu, à toutes les tailles : il porte le compte et
                les réglages partout, et y ajoute la navigation sous le seuil où la
                barre de menus est masquée. */}
            <button
              type="button"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-card border border-border-subtle text-ink-muted transition-colors duration-150 hover:border-brand hover:text-ink"
              aria-label={fr.nav.openMenu}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              onClick={() => setMenuOpen((value) => !value)}
            >
              <Menu className="h-4 w-4" aria-hidden="true" />
            </button>

            <HeaderMenu
              open={menuOpen}
              onClose={closeMenu}
              onOpenAuth={setAuthMode}
              onOpenPreference={setPreferenceTab}
            />
          </div>
        </div>
```

- [ ] **Step 4 : Compléter l'import**

Ligne 7 de `NavBar.tsx` :

```tsx
import { NAV_MENUS, type NavMenu } from '@/content/navigation'
```

devient :

```tsx
import { NAV_MENUS, NAV_SHORTCUTS, type NavMenu } from '@/content/navigation'
```

- [ ] **Step 5 : Vérifier**

```bash
bun run typecheck && bun run lint && bun run build
```

Attendu : succès.

- [ ] **Step 6 : Vérification visuelle**

`bun run dev`, puis contrôler :
- le logo commence à 24px du bord gauche, les menus le suivent immédiatement ;
- recherche, connexion et bouton de tiroir sont à l'extrême droite ;
- **le tiroir s'ouvre sous son bouton** et non au bord droit de l'écran — c'est la régression que le pas 3 prévient, il faut la vérifier explicitement ;
- entre 1280px et 1536px de large, les raccourcis et leur filet disparaissent ensemble, sans filet orphelin.

- [ ] **Step 7 : Commit**

```bash
git add apps/web/components/NavBar.tsx apps/web/content/navigation.ts
git commit -m "En-tête aligné à gauche sur toute la largeur, avec accès rapides"
```

---

## Task 6 : Animer l'ouverture et la fermeture des menus

**Files:**
- Modify: `apps/web/app/globals.css` (bloc `@theme`)
- Modify: `apps/web/components/NavBar.tsx` (fonction `DropdownMenu`)

**Interfaces:**
- Consumes: `usePresence` de `@/components/nav/usePresence`
- Produces: rien

**Contexte pour l'implémenteur.** Le panneau doit glisser de 8px vers le bas en apparaissant et repartir en sens inverse en disparaissant, avec un fondu. La fermeture est plus rapide que l'ouverture — 120 contre 180 ms : une fermeture lente donne l'impression que le menu colle au curseur.

La transition est portée par un attribut `data-state`, et non par une classe conditionnelle, parce que l'état de départ doit être présent dans le DOM **avant** que la transition ne démarre. Avec un ajout de classe au montage, le navigateur peut regrouper les deux changements en une seule peinture et l'animation d'entrée est purement et simplement sautée.

- [ ] **Step 1 : Ajouter les jetons de durée**

Dans `apps/web/app/globals.css`, bloc `@theme`, à la suite de `--duration-move` (ligne 240) :

```css
  /* Menus déroulants — deux durées ASYMÉTRIQUES, et c'est délibéré : une fermeture
     aussi lente que l'ouverture donne l'impression que le panneau colle au curseur.
     Elles sont neutralisées par la règle `prefers-reduced-motion` plus bas, comme
     les deux durées ci-dessus. */
  --duration-menu-in: 180ms;
  --duration-menu-out: 120ms;
```

- [ ] **Step 2 : Déclarer les états du panneau**

Dans `globals.css`, à l'intérieur du bloc `@layer components`, à la suite de `.prose-measure` :

```css
  /* ───────────────────────────────────────────────────────────────────────────
     PANNEAU DE MENU DÉROULANT — apparition et disparition.

     L'état est porté par `data-state` et non par une classe ajoutée au montage.
     La raison est mécanique : pour qu'une transition se joue, l'état de DÉPART doit
     avoir été peint avant que l'état d'arrivée ne soit appliqué. Une classe ajoutée
     dans le même cycle que le montage laisse le navigateur regrouper les deux en une
     seule peinture, et l'animation d'entrée est tout simplement sautée.

     Le démontage effectif est piloté par `usePresence`, qui attend `transitionend`.
     ─────────────────────────────────────────────────────────────────────────── */
  .menu-panel {
    transition-property: opacity, transform;
    transition-timing-function: var(--ease-standard);
  }

  .menu-panel[data-state='open'] {
    opacity: 1;
    transform: translateY(0);
    transition-duration: var(--duration-menu-in);
  }

  .menu-panel[data-state='closing'] {
    opacity: 0;
    transform: translateY(-8px);
    transition-duration: var(--duration-menu-out);
  }
```

- [ ] **Step 3 : Brancher le crochet dans `DropdownMenu`**

Dans `NavBar.tsx`, ajouter à la liste des imports :

```tsx
import { usePresence } from '@/components/nav/usePresence'
```

Puis, dans la fonction `DropdownMenu`, juste après la ligne `const panelId = …` :

```tsx
  /* Le panneau survit à sa propre fermeture : `mounted` reste vrai pendant la
     disparition, le temps que la transition se joue. Voir components/nav/presence.ts. */
  const { state, mounted, onTransitionEnd } = usePresence(isOpen)
```

- [ ] **Step 4 : Rendre le panneau selon l'état**

Remplacer la ligne 277 `{isOpen ? (` et la balise ouvrante `<div>` qui la suit par le bloc ci-dessous. **Tout le contenu interne** (`menu.sections.map(…)`) reste strictement identique ; seules la condition et la balise ouvrante changent.

```tsx
      {mounted ? (
        <div
          id={panelId}
          data-state={state}
          onTransitionEnd={onTransitionEnd}
          className="menu-panel absolute left-1/2 top-full z-50 ml-[-10rem] w-80 pt-2 opacity-0"
        >
```

**Le détail qui casse tout si on le rate.** L'ancienne version centrait le panneau avec `-translate-x-1/2`. Cet utilitaire pose un `transform` — la propriété même que `.menu-panel[data-state]` réécrit en `translateY`. Les deux ne peuvent pas coexister : le centrage serait effacé dès la première image de l'animation et le panneau partirait vers la droite en s'ouvrant.

Le centrage passe donc par une marge négative, qui ne touche pas au `transform` : `w-80` vaut `20rem`, `ml-[-10rem]` en décale exactement la moitié. Résultat identique, sans conflit.

`opacity-0` fournit l'état de départ de l'animation d'entrée ; `data-state="open"` l'amène à 1.

- [ ] **Step 5 : Vérifier**

```bash
bun run typecheck && bun run lint && bun run test && bun run build
```

Attendu : succès, 11 tests de `presence` réussis.

- [ ] **Step 6 : Vérification visuelle**

`bun run dev`, puis contrôler :
- le panneau glisse vers le bas en apparaissant et remonte en disparaissant ;
- il reste **centré sous son bouton** pendant toute l'animation, sans glisser latéralement — c'est le piège du pas 4 ;
- un aller-retour rapide du curseur hors du menu puis à l'intérieur **n'efface pas** le panneau ;
- dans les réglages du système, activer « réduire les animations », recharger : le panneau apparaît et disparaît instantanément, sans rester bloqué à l'écran.

- [ ] **Step 7 : Commit**

```bash
git add apps/web/app/globals.css apps/web/components/NavBar.tsx
git commit -m "Les menus déroulants s'ouvrent et se ferment en glissant"
```

---

## Vérification finale du lot

- [ ] `bun run typecheck && bun run lint && bun run test && bun run build` — succès complet
- [ ] Revue visuelle de `/`, `/crypto`, `/actions`, `/blog` en thème clair **et** sombre
- [ ] Aucune page ne défile horizontalement entre 360px et 2560px de largeur
- [ ] `/blog` : les paragraphes sont bridés, les images et tableaux ne le sont pas

**Note.** `.prose-measure` est déclarée en tâche 1 mais n'est appliquée à aucun paragraphe : les pages éditoriales n'ont pas encore été passées en revue. C'est délibéré — cette revue appartient à la vérification visuelle ci-dessus, et l'utilitaire doit exister avant qu'on puisse l'appliquer. Si la revue montre que `/blog` et `/aide` ont besoin de la classe, l'ajouter alors, dans un commit dédié.
