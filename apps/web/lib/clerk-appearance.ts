/**
 * Habillage des composants Clerk aux jetons ZENKUU.
 *
 * ── POURQUOI DES OBJETS DE STYLE ET NON DES CLASSES TAILWIND ───────────────────
 *
 * `appearance.elements` accepte les deux. La première version passait des classes
 * utilitaires — et RIEN ne s'appliquait : ni le masquage de l'en-tête, ni la
 * suppression du cadre. Les classes étaient pourtant bien générées (vérifié dans la
 * feuille servie). Elles perdaient simplement la bataille de spécificité contre les
 * styles internes de Clerk, qui sont plus spécifiques que nos utilitaires à classe
 * unique. Un `display:none` de classe ne l'emporte pas sur un `display:flex` de règle
 * imbriquée.
 *
 * Les objets, eux, sont posés EN LIGNE sur l'élément. Rien dans une feuille de style
 * ne peut les battre, sauf `!important`. C'est le seul moyen fiable ici — et il évite
 * au passage d'aller semer des `!` dans une vingtaine de classes.
 *
 * ── POURQUOI DES `var()` ET NON DES COULEURS FIGÉES ────────────────────────────
 *
 * ZENKUU a deux thèmes, et la bascule se fait côté navigateur sans re-rendu React.
 * Une couleur en dur serait juste dans un thème et fausse dans l'autre. Les `var()`
 * sont résolues à la peinture : les écrans Clerk suivent donc la bascule sans une
 * ligne de JavaScript, comme les graphiques.
 *
 * Seul `colorPrimary` reste un hexadécimal : Clerk en DÉRIVE ses nuances de survol et
 * de focus par calcul colorimétrique, et l'on ne peut pas éclaircir de 10 % une
 * chaîne que le navigateur n'a pas encore résolue.
 */

/* La valeur du thème CLAIR de `--color-brand`, recopiée ici faute de pouvoir la
   résoudre — voir la note ci-dessus. Elle suit donc les retouches de globals.css à la
   main : c'est le seul endroit du site où la palette est dupliquée côté interface. */
const BRAND = '#3d63c2'

export const CLERK_VARIABLES = {
  colorPrimary: BRAND,
  // 0px et non 12px : le design system a supprimé tous les rayons sauf les pastilles.
  // Un formulaire aux angles arrondis au milieu d'une interface à angles vifs se lit
  // comme un encart importé d'ailleurs — ce qu'il est, et c'est ce qu'on évite.
  borderRadius: '0px',
  fontFamily: 'var(--font-inter), ui-sans-serif, system-ui, sans-serif',
} as const

/*
 * ⚠️ BOUTONS DE FOURNISSEUR : ICÔNES SEULES, ET CE N'EST PAS UN CHOIX.
 *
 * La référence affiche « Continuer avec Google » en pleine largeur. Clerk sait le
 * faire, via `appearance.layout.socialButtonsVariant: 'blockButton'` — mais `layout`
 * n'existe PAS dans le type d'apparence de cette version, ni sur les composants ni
 * sur le fournisseur (vérifié : le typage refuse la propriété aux deux endroits).
 * Au-delà de deux fournisseurs, Clerk réduit donc de lui-même les boutons à des
 * pastilles d'icône.
 *
 * Les forcer en pleine largeur par du CSS donnerait des boutons larges ne portant
 * qu'un logo — moins lisible que la rangée compacte actuelle, où trois marques
 * connues se reconnaissent d'un coup d'œil. On garde donc la rangée, et l'on
 * reviendra au libellé le jour où le fournisseur exposera l'option.
 */

/** Fragments partagés — la même bordure et le même fond partout. */
const FIELD = {
  border: '1px solid var(--color-border-subtle)',
  backgroundColor: 'var(--color-surface)',
  color: 'var(--color-ink)',
  boxShadow: 'none',
}

const COMMON_ELEMENTS = {
  rootBox: { width: '100%' },
  socialButtonsIconButton: {
    ...FIELD,
  },
  socialButtonsBlockButton: {
    ...FIELD,
    // Hauteur alignée sur le bouton principal : trois boutons de hauteurs
    // différentes dans une même colonne se lisent comme trois niveaux d'importance.
    minHeight: '2.5rem',
  },
  socialButtonsBlockButtonText: { color: 'var(--color-ink)', fontWeight: 500 },
  dividerLine: { backgroundColor: 'var(--color-border-subtle)' },
  dividerText: { color: 'var(--color-ink-muted)' },
  formFieldLabel: { color: 'var(--color-ink)' },
  formFieldInput: FIELD,
  formButtonPrimary: {
    backgroundColor: 'var(--color-brand)',
    color: 'var(--color-on-brand)',
    boxShadow: 'none',
    // Clerk met ses libellés en capitales ; le reste du site n'en a nulle part.
    textTransform: 'none' as const,
    fontWeight: 500,
    minHeight: '2.5rem',
  },
  formFieldInputShowPasswordButton: { color: 'var(--color-ink-muted)' },
  identityPreviewText: { color: 'var(--color-ink)' },
  identityPreviewEditButton: { color: 'var(--color-brand)' },
  formResendCodeLink: { color: 'var(--color-brand)' },
  otpCodeFieldInput: FIELD,
  footerActionText: { color: 'var(--color-ink-muted)' },
  footerActionLink: { color: 'var(--color-brand)' },
} as const

/**
 * Pages `/connexion` et `/inscription`.
 *
 * La carte perd son ombre propre : elle est déjà posée dans une colonne centrée, et
 * deux cadres imbriqués ajoutent du bruit sans rien délimiter de plus. Son en-tête,
 * en revanche, RESTE — une page atteinte directement doit se présenter seule.
 */
export const CLERK_PAGE_ELEMENTS = {
  ...COMMON_ELEMENTS,
  cardBox: { width: '100%', boxShadow: 'none', border: '1px solid var(--color-border-subtle)' },
  card: { backgroundColor: 'var(--color-surface)', boxShadow: 'none' },
  headerTitle: { color: 'var(--color-ink)' },
  headerSubtitle: { color: 'var(--color-ink-muted)' },
  footer: { backgroundColor: 'var(--color-surface)' },
} as const

/**
 * Fenêtre de compte — même base, mais SANS chrome du tout.
 *
 * Trois retraits, chacun pour une raison précise :
 *
 * · `header` — la fenêtre porte déjà son titre. Celui de Clerk le répéterait deux
 *   centimètres plus bas, et surtout il occuperait l'espace où la mascotte doit venir
 *   se poser sur le premier bouton.
 *
 * · `footerAction` — c'est la ligne « pas encore de compte ? ». On la remplace par la
 *   nôtre, qui bascule connexion ↔ inscription SANS fermer la fenêtre ni naviguer.
 *
 *   ⚠️ On masque la LIGNE D'ACTION, pas le pied entier. Le pied porte aussi la mention
 *   « Secured by Clerk », que le palier gratuit impose de laisser visible. Masquer le
 *   pied l'emporterait avec — un raccourci d'apparence qui deviendrait un manquement
 *   aux conditions d'utilisation du fournisseur.
 *
 * · bordure et fond — la fenêtre EST le cadre. Un second cadre à l'intérieur donnerait
 *   l'écran de connexion d'un autre site posé dans le nôtre.
 */
export const CLERK_OVERLAY_ELEMENTS = {
  ...COMMON_ELEMENTS,
  cardBox: { width: '100%', boxShadow: 'none', border: 'none' },
  card: {
    backgroundColor: 'transparent',
    boxShadow: 'none',
    padding: 0,
    gap: '0.75rem',
    border: 'none',
  },
  header: { display: 'none' },
  /*
   * `background` et non `backgroundColor` : Clerk pose sa teinte de pied via la
   * propriété RACCOURCIE. Une déclaration `background-color` en ligne ne l'écrase pas
   * — le raccourci, appliqué après, réinitialise la couleur. Le pied restait donc
   * gris au milieu d'une fenêtre blanche, et ressemblait à une seconde carte.
   */
  footer: { background: 'transparent', padding: '0.75rem 0 0' },
  footerPages: { background: 'transparent' },
  footerAction: { display: 'none' },
} as const
