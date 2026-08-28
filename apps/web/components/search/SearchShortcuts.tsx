import { ArrowDown, ArrowUp, CornerDownLeft } from 'lucide-react'

import { Kbd } from '@/components/ui/kbd'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * LE PIED DU PANNEAU DE RECHERCHE — CE QUE LE CLAVIER SAIT FAIRE
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── POURQUOI L'ÉCRIRE PLUTÔT QUE DE LAISSER DÉCOUVRIR ───────────────────────
 *
 * Le panneau répond DÉJÀ aux flèches, à Entrée et à Échap — cmdk le fait depuis le
 * premier jour. Personne ne le savait : rien ne l'annonçait, et un champ de recherche
 * qui s'utilise à la souris n'invite pas à essayer le clavier.
 *
 * Ces quatre mentions ne changent aucun comportement. Elles rendent visible ce qui
 * existait, ce qui est la façon la moins coûteuse d'améliorer un outil — et la seule
 * qui ne risque rien.
 *
 * ⚠️ ELLES DÉCRIVENT LE COMPORTEMENT RÉEL, ET DOIVENT SUIVRE S'IL CHANGE. Une
 * légende qui ment sur un raccourci est pire que pas de légende : on essaie, rien ne
 * se passe, et l'on conclut que le panneau est cassé. Les quatre touches listées ici
 * sont celles que `Command` de cmdk câble, plus l'Échap de Radix.
 *
 * ── MASQUÉ AU DOIGT ─────────────────────────────────────────────────────────
 *
 * `hidden sm:flex` : sur un téléphone il n'y a pas de touche Tab, et cette rangée n'y
 * serait qu'une bande de vingt-huit pixels décrivant des gestes impossibles.
 */
export function SearchShortcuts({
  strings,
}: {
  strings: { navigate: string; cancel: string; open: string }
}) {
  return (
    <div
      /* `aria-hidden` : un lecteur d'écran annonce déjà les rôles de liste et d'option
         de cmdk, qui portent leur propre convention de navigation. Lui lire en plus
         « TAB flèche bas flèche haut » ajouterait du bruit à chaque ouverture. */
      aria-hidden="true"
      className="mt-1.5 hidden items-center gap-3 border-t border-border-subtle px-2 pt-2 text-[0.6875rem] text-ink-muted sm:flex"
    >
      <span className="flex items-center gap-1">
        <Kbd className="text-[0.625rem]">Tab</Kbd>
        <Kbd className="text-[0.625rem]">
          <ArrowDown className="h-2.5 w-2.5" />
        </Kbd>
        <Kbd className="text-[0.625rem]">
          <ArrowUp className="h-2.5 w-2.5" />
        </Kbd>
        {strings.navigate}
      </span>

      <span className="flex items-center gap-1">
        <Kbd className="text-[0.625rem]">Échap</Kbd>
        {strings.cancel}
      </span>

      {/* Rejeté à droite : c'est l'action qui CONCLUT la recherche, et la placer au
          bout de la rangée la distingue des deux qui la parcourent. */}
      <span className="ml-auto flex items-center gap-1">
        <Kbd className="text-[0.625rem]">
          <CornerDownLeft className="h-2.5 w-2.5" />
        </Kbd>
        {strings.open}
      </span>
    </div>
  )
}
