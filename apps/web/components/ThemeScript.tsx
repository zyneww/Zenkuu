export const THEME_STORAGE_KEY = 'zenkuu-theme'

/**
 * Clé du mode Liquid Glass, distincte de celle du thème.
 *
 * Les deux réglages sont indépendants — on peut vouloir du verre en clair comme en
 * sombre — et les loger dans une même clé obligerait à inventer un format composé
 * (« dark+glass ») que le script ci-dessous devrait analyser, pour ne rien gagner.
 */
export const GLASS_STORAGE_KEY = 'zenkuu-glass'

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
 * Le mode Liquid Glass suit le même chemin, et pour la même raison : il redéfinit
 * les tons de SURFACE du site. Appliqué seulement après l'hydratation, on verrait
 * la page s'afficher en surfaces pleines avant de basculer en verre — un
 * clignotement encore plus visible que celui du thème, puisqu'il touche chaque
 * carte de la page et non le seul fond.
 */
const script = `
(function () {
  try {
    var stored = localStorage.getItem('${THEME_STORAGE_KEY}');
    var dark = stored === 'dark' || (stored !== 'light' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', dark);
    document.documentElement.classList.toggle(
      'glass',
      localStorage.getItem('${GLASS_STORAGE_KEY}') === '1'
    );
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
