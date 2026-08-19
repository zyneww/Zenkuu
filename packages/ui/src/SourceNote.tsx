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
    <p className="mt-3 text-[0.6875rem] text-ink-muted">
      {strings?.source ?? 'Source :'}{' '}
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="underline underline-offset-2 hover:text-brand-strong"
      >
        {label}
      </a>
      {stamp ? (
        <> · {(strings?.dated ?? 'données du {date}').replace('{date}', stamp)}</>
      ) : null}
    </p>
  )
}
