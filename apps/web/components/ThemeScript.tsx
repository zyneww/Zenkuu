export const THEME_STORAGE_KEY = 'zenith-theme'

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
 */
const script = `
(function () {
  try {
    var stored = localStorage.getItem('${THEME_STORAGE_KEY}');
    var dark = stored === 'dark' || (stored !== 'light' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', dark);
  } catch (e) {
    /* localStorage indisponible (navigation privée stricte) : on reste en clair. */
  }
})();
`

export function ThemeScript() {
  return <script suppressHydrationWarning dangerouslySetInnerHTML={{ __html: script }} />
}
