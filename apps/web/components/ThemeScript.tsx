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
 * Logique : un choix explicite mémorisé l'emporte ; à défaut, on suit la préférence
 * système. La classe est toujours posée explicitement, ce qui permet à la variante
 * Tailwind `dark` de se baser uniquement sur cette classe.
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
    var dark = stored === 'dark' || (stored !== 'light' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', dark);
    localStorage.removeItem('${LEGACY_GLASS_KEY}');
  } catch (e) {
    /* localStorage indisponible (navigation privée stricte) : on reste en clair. */
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
