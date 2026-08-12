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
])

export default eslintConfig
