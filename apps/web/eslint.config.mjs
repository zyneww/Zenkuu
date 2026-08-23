import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'

/**
 * `next lint` a été retiré en Next.js 16 (§ ZENKUU.md « Reste à faire ») : cette
 * configuration au format « flat » suit exactement le remplacement documenté par
 * Next.js — `eslint-config-next/core-web-vitals` + `/typescript`, appelée via le
 * CLI ESLint (`eslint .`, voir le script `lint` de ce paquet).
 */
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  /*
   * `.next*` et non `.next` : `next.config.ts` prévoit un dossier de sortie
   * surchargeable par `ZENKUU_DIST_DIR`, pour bâtir sans perturber un serveur de
   * développement en cours. Le motif étroit laissait ESLint analyser ce dossier — et
   * signaler des centaines d'erreurs dans du code MACHINE, ni corrigeables ni
   * pertinentes, qui noyaient les vraies.
   *
   * ⚠️ NE PAS CONFONDRE avec le même joker dans `.gitignore`, qui lui a bel et bien
   * cassé la compilation CSS (commit f92c79e) : Tailwind 4 lit `.gitignore` pour
   * savoir quoi exclure de son scan, et son implémentation n'y traite pas le joker
   * comme git le fait. ESLint, lui, applique ses propres motifs et n'a aucun rapport
   * avec la détection des sources Tailwind — vérifié : lint propre, CSS intact.
   */
  globalIgnores(['.next*/**', 'out/**', 'build/**', 'next-env.d.ts']),

  /*
   * ─────────────────────────────────────────────────────────────────────────────
   * `components/base/**` — CODE VENDU, PAS CODE ÉCRIT ICI
   *
   * Ce dossier est produit par `npx untitledui@latest add <composant>`, qui recopie
   * les composants d'Untitled UI dans le dépôt. Ils nous appartiennent — on les
   * corrige quand ils ont tort, et deux correctifs y sont d'ailleurs posés et
   * commentés (le chevron de `select-native`, l'encre du bouton primaire). Ils sont
   * néanmoins RÉÉCRITS par la commande à chaque ajout ou mise à jour.
   *
   * Deux règles de style s'y déclenchent en masse, et aucune ne décrit un défaut :
   *
   *   · `no-empty-object-type` — leurs `interface X extends Y {}` sont des points
   *     d'extension DÉLIBÉRÉS : ils donnent un nom stable à un type d'API pour que
   *     l'ajout d'une prop plus tard n'en change pas la signature publique ;
   *   · `no-img-element` — un avatar ou une pastille de badge affiche une image
   *     DISTANTE de dimensions inconnues, cas où `next/image` exige une déclaration
   *     de domaine que le composant générique ne peut pas porter. Le dépôt fait déjà
   *     le même choix pour les vignettes d'actualité, avec sa propre justification.
   *
   * Les corriger à la main les ferait revenir au prochain `add`, et le message
   * d'ESLint aurait alors formé un bruit permanent — exactement ce que la note du
   * `globalIgnores` ci-dessus reproche à l'analyse des dossiers machine.
   *
   * ⚠️ PORTÉE VOLONTAIREMENT ÉTROITE : deux règles, un dossier. Tout le reste de
   * l'analyse continue de s'appliquer à ces fichiers.
   * ───────────────────────────────────────────────────────────────────────────── */
  {
    files: [
      'components/base/**/*.tsx',
      'components/application/**/*.tsx',
      'components/foundations/**/*.tsx',
      'components/shared-assets/**/*.tsx',
      'hooks/**/*.ts',
      'utils/cx.ts',
      'utils/is-react-component.ts',
    ],
    rules: {
      /* Les trois règles du COMPILATEUR REACT et le commentaire `@ts-expect-error`
         sans description viennent du même endroit : leurs composants sont écrits
         pour un projet où le compilateur n'est pas activé. Les corriger demanderait
         de réécrire leur gestion d'état — et serait effacé au prochain `add`. */
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/refs': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-unused-expressions': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@next/next/no-img-element': 'off',
      /* `prefer-const` — même motif : `tag-select` déclare un `let` qu'il ne
         réassigne pas. C'est leur style, il revient à chaque `add`, et le corriger
         n'apprend rien à personne. */
      'prefer-const': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
])

export default eslintConfig
