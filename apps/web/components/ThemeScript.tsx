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
 * ── LE SOMBRE EST LE DÉFAUT, ET NON LA PRÉFÉRENCE SYSTÈME ───────────────────
 *
 * Le script suivait `prefers-color-scheme`. Il ne le suit plus : seul un choix
 * explicite « clair » écarte le thème sombre.
 *
 * La raison n'est pas une préférence de goût. Le thème sombre PORTE l'identité du
 * site — le fond y a une origine, l'accent y rayonne, et c'est là que la palette
 * de données a été réglée. Servir le thème clair à la moitié des visiteurs parce
 * que leur système est en clair reviendrait à ce que le site n'ait pas de première
 * impression : elle dépendrait d'un réglage qu'il ne contrôle pas.
 *
 * Le thème clair reste entier et accessible d'un clic. Ce qui change est
 * seulement ce qu'on montre d'abord.
 *
 * La classe est toujours posée explicitement, ce qui permet à la variante Tailwind
 * `dark` de se baser uniquement sur elle.
 *
 * Il efface AUSSI la clé du mode Liquid Glass, retiré du produit. C'est le seul
 * endroit du site qui s'exécute chez tout visiteur avant tout le reste : y placer le
 * nettoyage garantit qu'aucune clé orpheline ne subsiste, y compris chez ceux qui
 * n'ouvriront jamais le panneau de réglages.
 */
const script = `
(function () {
  try {
    var stored = localStorage.getItem('${THEME_STORAGE_KEY}');
    var dark = stored !== 'light';
    document.documentElement.classList.toggle('dark', dark);
    localStorage.removeItem('${LEGACY_GLASS_KEY}');
  } catch (e) {
    /* localStorage indisponible (navigation privée stricte) : on reste en sombre,
       comme le défaut ci-dessus — l'attribut n'ayant pas pu être lu, pas retiré. */
    document.documentElement.classList.add('dark');
  }
})();
`

/**
 * `type` BASCULANT selon le côté où le composant est rendu.
 *
 * React 19 avertit en développement dès qu'un rendu produit une balise `<script>` :
 * « Scripts inside React components are never executed when rendering on the
 * client ». L'avertissement est JUSTE — un script inséré par une mise à jour du DOM
 * ne s'exécute pas — mais sans objet ici, puisque celui-ci n'a de rôle qu'au tout
 * premier chargement, quand le navigateur analyse le HTML servi.
 *
 * La parade est celle que documente Next.js (guide « Preventing flash before
 * hydration ») : `text/javascript` côté serveur, où le script doit s'exécuter, et
 * `text/plain` côté client, où le navigateur l'ignore silencieusement. La console
 * reste propre sans que la protection contre le flash ne soit affaiblie.
 *
 * `suppressHydrationWarning` couvre la différence de `type` entre les deux rendus.
 */
export function ThemeScript() {
  return (
    <script
      type={typeof window === 'undefined' ? 'text/javascript' : 'text/plain'}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: script }}
    />
  )
}
