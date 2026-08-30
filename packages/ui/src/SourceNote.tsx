import { formatDateTime } from './format'

interface SourceNoteProps {
  label: string
  href: string
  /** Horodatage renvoyé par la source elle-même, pas l'heure du rendu. */
  updatedAt?: string
  /**
   * Les deux libellés de la mention, traduits par l'appelant.
   *
   * Ce paquet ne connaît pas la locale — il sert aussi les gabarits
   * d'embarquement, qui n'ont pas d'i18n. Le français reste le défaut pour qu'il
   * fonctionne seul ; le site, lui, passe la version traduite.
   */
  strings?: { source: string; dated: string }
}

/**
 * Attribution de la source et fraîcheur de la donnée.
 *
 * Afficher l'origine et l'horodatage relève autant de la confiance que du respect
 * des conditions d'usage des API gratuites. L'heure indiquée est celle publiée par
 * la source : c'est la seule qui renseigne réellement l'utilisateur, alors que
 * l'heure de rendu ne dirait rien de la fraîcheur derrière un cache de 5 minutes.
 */
export function SourceNote({ label, href, updatedAt, strings }: SourceNoteProps) {
  const stamp = formatDateTime(updatedAt)

  return (
    /*
     * ⚠️ UN `span` EN BLOC, ET NON UN `p`. C'était un `<p>`, et plusieurs appelants
     * le placent À L'INTÉRIEUR d'un paragraphe — pour finir une phrase par son
     * attribution, ce qui est l'usage naturel. Or un `<p>` ne peut pas en contenir un
     * autre : le navigateur ferme le premier avant d'ouvrir le second, l'arbre rendu
     * cesse de correspondre à celui du serveur, et React abandonne l'hydratation de
     * toute la branche. Relevé par `audit-responsive` sur la saison des altcoins,
     * sous la forme « Hydration failed ».
     *
     * Corrigé ICI plutôt qu'au site d'appel : une douzaine d'appelants auraient chacun
     * pu se tromper à nouveau, et un `span` en bloc rend exactement la même chose.
     */
    <span className="mt-3 block text-[0.6875rem] text-ink-muted">
      {strings?.source ?? 'Source :'}{' '}
      {/* `inline-flex` et non le `inline` par défaut : le plancher tactile du site
          repose sur `min-height`, qui n'a AUCUN effet sur une boîte en ligne. Relevé
          par `audit-responsive`, qui mesurait ces liens à quatorze pixels de haut —
          soit une cible qu'on rate au doigt une fois sur trois. Le lien reste dans le
          fil de la phrase ; seule sa boîte gagne de la hauteur. */}
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-h-8 items-center underline underline-offset-2 hover:text-brand"
      >
        {label}
      </a>
      {stamp ? (
        <> · {(strings?.dated ?? 'données du {date}').replace('{date}', stamp)}</>
      ) : null}
    </span>
  )
}
