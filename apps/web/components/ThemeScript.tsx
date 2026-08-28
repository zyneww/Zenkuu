import Script from 'next/script'

export const THEME_STORAGE_KEY = 'zenkuu-theme'

/**
 * Clé du mode Liquid Glass, RETIRÉE — laissée nommée ici le temps d'un nettoyage.
 *
 * Le mode a été supprimé, mais la clé `zenkuu-glass` reste écrite dans le stockage
 * local des visiteurs qui l'avaient activé. Le script ci-dessous l'efface donc au
 * prochain passage : sans cela, elle survivrait indéfiniment dans leur navigateur,
 * sans plus rien piloter. Cette ligne pourra disparaître une fois les visiteurs
 * revenus au moins une fois — disons dans quelques mois.
 */
const LEGACY_GLASS_KEY = 'zenkuu-glass'

/**
 * Applique le thème AVANT la première peinture.
 *
 * Sans ce script, la page s'afficherait une fraction de seconde en clair avant que
 * React n'hydrate et ne bascule en sombre : le fameux flash blanc, particulièrement
 * agressif sur un site consulté le soir. Il doit donc rester du JavaScript brut
 * injecté dans le document, exécuté de façon synchrone — un `useEffect` s'exécute
 * après la peinture, trop tard par construction.
 *
 * ── LA PRÉFÉRENCE SYSTÈME DÉCIDE DE LA PREMIÈRE IMPRESSION ──────────────────
 *
 * Le script a longtemps forcé le sombre en l'absence de choix mémorisé, au motif que
 * le thème sombre porte l'identité du site. L'argument tenait sur l'esthétique et
 * cédait sur l'usage : un visiteur dont l'appareil est en clair — parce qu'il est
 * dehors, parce que son écran est réglé ainsi, parce que son système bascule à
 * l'heure — recevait une page sombre qu'il n'avait pas demandée, et devait la
 * corriger à la main à chaque appareil.
 *
 * Le script suit donc `prefers-color-scheme` quand rien n'est mémorisé, comme le
 * fait la référence de la refonte (cryptorank.io). Un choix EXPLICITE, lui, l'emporte
 * toujours sur le système : c'est tout l'intérêt du réglage, et c'est pourquoi la
 * classe reste posée à la main plutôt que déléguée à une règle `@media`.
 *
 * ⚠️ « PAS DE CLÉ » SIGNIFIE « SUIVRE LE SYSTÈME », ici comme dans le store.
 * `applyTheme` efface la clé pour le mode « système » (voir lib/stores/settings.ts) :
 * les deux lectures doivent s'accorder, sans quoi le mode système se rechargerait en
 * autre chose que lui-même.
 *
 * La classe est toujours posée explicitement, ce qui permet à la variante Tailwind
 * `dark` de se baser uniquement sur elle.
 *
 * Il efface AUSSI la clé du mode Liquid Glass, retiré du produit. C'est le seul
 * endroit du site qui s'exécute chez tout visiteur avant tout le reste : y placer le
 * nettoyage garantit qu'aucune clé orpheline ne subsiste, y compris chez ceux qui
 * n'ouvriront jamais le panneau de réglages.
 */
/**
 * Clé de la largeur de fiche — même mécanique que le thème, même raison.
 *
 * Le réglage « Étirée » retire le plafond de largeur des fiches d'actif. Lu
 * seulement à l'hydratation, il ferait sauter toute la page d'une largeur à l'autre
 * après la première peinture. Il est donc appliqué ici, avant.
 */
export const LAYOUT_STORAGE_KEY = 'zenkuu-layout'

const script = `
(function () {
  try {
    var stored = localStorage.getItem('${THEME_STORAGE_KEY}');
    /* Pas de clé mémorisée = suivre l'appareil. matchMedia est disponible partout où
       ce script s'exécute ; le repli sur faux ne couvre que les contextes sans media
       query du tout, où le clair est l'hypothèse la moins surprenante.
       (Aucune apostrophe inverse dans ce commentaire : il vit DANS un littéral de
       gabarit, qu'elle refermerait.) */
    var dark = stored === 'dark'
      || (stored !== 'light'
          && !!window.matchMedia
          && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', dark);
    if (localStorage.getItem('${LAYOUT_STORAGE_KEY}') === 'wide') {
      document.documentElement.setAttribute('data-layout', 'wide');
    }
    localStorage.removeItem('${LEGACY_GLASS_KEY}');
  } catch (e) {
    /* localStorage indisponible (navigation privée stricte) : la préférence système
       reste lisible, elle, et c'est elle qui décide — le choix mémorisé n'ayant pas
       pu être lu, pas nié. */
    document.documentElement.classList.toggle(
      'dark',
      !!window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches,
    );
  }
})();
`

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * `next/script` EN `beforeInteractive`, ET NON UNE BALISE `<script>` NUE
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── LE DÉFAUT QUE CELA CORRIGE ───────────────────────────────────────────────
 *
 * React 19 avertit à CHAQUE rendu qui produit une balise `<script>` : « Scripts
 * inside React components are never executed when rendering on the client ».
 * L'avertissement est juste dans le cas général, et sans objet ici — ce script n'a de
 * rôle qu'au premier chargement, quand le navigateur analyse le HTML servi.
 *
 * Une version précédente tentait de le faire taire en basculant le `type` entre
 * `text/javascript` (serveur) et `text/plain` (client). ⚠️ CELA NE MARCHAIT PAS :
 * React regarde le NOM DE LA BALISE, pas son type, et l'avertissement tombait à chaque
 * chargement de page en développement. Le contournement ajoutait en prime une
 * divergence serveur/client dans un composant dont tout l'intérêt est de s'exécuter
 * avant l'hydratation.
 *
 * `next/script` en `beforeInteractive` est l'API prévue pour exactement ce besoin :
 * Next injecte le contenu dans le document SERVI, avant tout autre script, sans
 * passer par le rendu DOM de React — l'avertissement n'a donc plus lieu d'être, et la
 * protection contre le flash de thème est inchangée.
 *
 * ⚠️ CETTE STRATÉGIE N'EST VALABLE QUE DANS LA DISPOSITION RACINE. Employée dans une
 * page, Next la déclasse silencieusement en `afterInteractive`, c'est-à-dire après la
 * première peinture — le flash reviendrait sans qu'aucune erreur ne le signale.
 * Ce composant est monté par `app/[locale]/layout.tsx`, et doit le rester.
 *
 * `id` est OBLIGATOIRE pour un script en ligne : c'est la clé par laquelle Next
 * garantit qu'il n'est injecté qu'une fois, même si le composant est monté deux fois.
 */
export function ThemeScript() {
  return (
    /* La règle `no-before-interactive-script-outside-document` vise le ROUTEUR
       `pages/`, où cette stratégie n'est valable que dans `_document.js`. Sous le
       routeur `app/`, la place prévue est justement la disposition racine — c'est ce
       que documente Next, et c'est vérifié ici : le script est injecté dans `<head>`
       et pose la classe de thème avant la première peinture. */
    // eslint-disable-next-line @next/next/no-before-interactive-script-outside-document
    <Script
      id="zenkuu-theme"
      strategy="beforeInteractive"
      dangerouslySetInnerHTML={{ __html: script }}
    />
  )
}
