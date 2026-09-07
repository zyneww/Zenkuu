'use client'

import { useRestitutionDuFocus } from '@/components/ui/focus-restitution'
import { usePhrase } from '@/components/locale/ContentProvider'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'

import { LoginForm } from '@/components/account/LoginForm'

/**
 * Fenêtre de connexion — la COQUE, plus le formulaire.
 *
 * ── CE QUI A QUITTÉ CE FICHIER ────────────────────────────────────────────────
 *
 * Toute la mécanique du code à six chiffres vit dans `LoginForm` : la connexion se
 * fait aussi depuis un panneau déroulant de l'en-tête, où une modale plein écran
 * serait disproportionnée.
 *
 * Ce qui restait ici — le voile, le cadre, la croix, l'écoute d'Échap, le bouton
 * plein écran qui servait de zone de clic extérieure — a quitté le fichier à son
 * tour : c'est `Dialog` de shadcn/ui, donc celui de Radix, qui le fait. Et il fait
 * DAVANTAGE, sur trois points qui manquaient et qu'on ne voit qu'à l'usage :
 *
 *   · LE PIÈGE À FOCUS. La tabulation sortait de la fenêtre et parcourait la page
 *     dessous, invisible. Radix la retient dans la modale et rend le focus au
 *     déclencheur à la fermeture.
 *   · `aria-hidden` SUR LE RESTE DU DOCUMENT. Un lecteur d'écran pouvait lire la page
 *     masquée par le voile comme si elle était encore là.
 *   · LE DÉFILEMENT DU FOND, qui continuait sous le voile.
 *
 * ⚠️ LE TITRE EST OBLIGATOIRE ET IL EST MASQUÉ. Radix exige un `DialogTitle` — sans
 * lui il avertit en console et la fenêtre reste anonyme à l'oreille. Il ne peut pas
 * s'afficher pour autant : `LoginForm` écrit déjà « Se connecter » en tête de son
 * étape « adresse », et deux titres empilés se contrediraient à l'étape du code.
 * D'où `sr-only` — le titre existe pour l'arbre d'accessibilité, pas pour l'œil.
 *
 * ── QUI OUVRE ENCORE CETTE FENÊTRE ────────────────────────────────────────────
 *
 * La page de paramètres, et elle seule. L'en-tête ne l'appelle plus — son bouton de
 * compte déroule le formulaire sous lui. La modale reste justifiée sur `/parametres` :
 * elle y est déclenchée depuis le corps de la page, où il n'y a pas de bouton auquel
 * ancrer un panneau flottant.
 */
export function LoginOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = usePhrase()

  const restitution = useRestitutionDuFocus()

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent
        /* Rend le focus au bouton qui a ouvert cette fenêtre : elle est CONTRÔLÉE et
           n'a pas de `DialogTrigger`, donc Radix ne sait pas à qui le rendre et le
           laisse sur `<body>`. Voir `useRestitutionDuFocus`. */
        {...restitution}
        className="max-w-sm border-border-subtle bg-overlay shadow-overlay sm:max-w-sm"
      >
        <DialogTitle className="sr-only">{t('Connexion')}</DialogTitle>
        <LoginForm visible={open} />
      </DialogContent>
    </Dialog>
  )
}
