'use client'

import { useEffect, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

import { PASSWORD_MIN } from '@/lib/password'
import { hasPassword, removeOwnPassword, setOwnPassword } from '@/lib/auth-actions'
import { Button } from '@/components/ui/button'
import { usePhrase } from '@/components/locale/ContentProvider'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * POSER, CHANGER OU RETIRER SON MOT DE PASSE
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * C'est le SEUL endroit du site où l'on définit un mot de passe, et c'est délibéré :
 * l'inscription se fait par adresse et code, sans en demander. Un compte sans mot de
 * passe est un état normal et complet, pas une configuration inachevée — d'où l'absence
 * de tout bandeau d'incitation.
 *
 * ── CE QUE CETTE CARTE REND POSSIBLE, ET QUI EST LE VRAI SUJET ─────────────
 *
 * Le parcours « mot de passe oublié » du site passe par ici. Il n'y a pas de jeton de
 * réinitialisation ni de courriel dédié : on se connecte par code — le site sait déjà
 * prouver qu'on tient une adresse — puis on pose un nouveau mot de passe.
 *
 * Cela évite une seconde famille de jetons, sa table, sa durée de validité, son gabarit
 * de courriel, et le risque propre à tout lien de réinitialisation qui traîne dans une
 * boîte pendant des heures.
 *
 * ── LE RETRAIT EST OFFERT, ET IL EST SÛR ───────────────────────────────────
 *
 * Retirer son mot de passe ne ferme aucune porte : le code par courriel reste. C'est
 * ce qui rend le geste proposable — sur un site où le mot de passe serait l'unique
 * chemin, il enfermerait dehors.
 */
export function PasswordCard() {
  const t = usePhrase()
  const [existe, setExiste] = useState<boolean | null>(null)
  const [ouvert, setOuvert] = useState(false)
  const [valeur, setValeur] = useState('')
  const [affiche, setAffiche] = useState(false)
  const [pending, setPending] = useState(false)
  const [retour, setRetour] = useState<{ ton: 'ok' | 'erreur'; texte: string } | null>(null)

  useEffect(() => {
    let vivant = true
    void hasPassword().then((reponse) => {
      if (vivant) setExiste(reponse)
    })
    return () => {
      vivant = false
    }
  }, [])

  async function enregistrer(event: React.FormEvent) {
    event.preventDefault()
    if (pending) return
    setPending(true)
    setRetour(null)

    const result = await setOwnPassword(valeur)
    setPending(false)

    if (result.ok) {
      setExiste(true)
      setOuvert(false)
      setValeur('')
      setRetour({ ton: 'ok', texte: t('Mot de passe enregistré.') })
      return
    }

    setRetour({ ton: 'erreur', texte: motif(result, t) })
  }

  async function retirer() {
    if (pending) return
    setPending(true)
    setRetour(null)
    const result = await removeOwnPassword()
    setPending(false)
    if (result.ok) {
      setExiste(false)
      setRetour({
        ton: 'ok',
        texte: t('Mot de passe retiré. La connexion par courriel reste disponible.'),
      })
      return
    }
    setRetour({ ton: 'erreur', texte: t('Le retrait a échoué. Réessayez.') })
  }

  return (
    <div className="rounded-card border border-border-subtle bg-surface p-4">
      <h3 className="text-sm font-semibold text-ink">{t('Mot de passe')}</h3>

      <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-ink-muted">
        {existe === null
          ? t('Vérification…')
          : existe
            ? t('Ce compte a un mot de passe. Vous pouvez aussi vous connecter par code envoyé par courriel — les deux chemins restent ouverts.')
            : t('Ce compte n’a pas de mot de passe, et n’en a pas besoin : la connexion par code envoyé par courriel suffit. En poser un rend la connexion plus rapide.')}
      </p>

      {ouvert ? (
        <form onSubmit={enregistrer} className="mt-4 max-w-sm space-y-3" noValidate>
          <div className="relative">
            <input
              type={affiche ? 'text' : 'password'}
              /* `new-password` et non `current-password` : c'est ce qui fait proposer
                 une suggestion au gestionnaire de mot de passe du navigateur, plutôt
                 que de remplir l'ancien. */
              autoComplete="new-password"
              value={valeur}
              onChange={(event) => {
                setValeur(event.target.value)
                setRetour(null)
              }}
              aria-label={t('Nouveau mot de passe')}
              placeholder={t('Au moins {n} caractères').replace('{n}', String(PASSWORD_MIN))}
              className="h-10 w-full rounded-control border border-border-subtle bg-surface-muted pl-3 pr-10 text-sm text-ink placeholder:text-ink-muted focus:border-brand focus:outline-none"
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setAffiche((precedent) => !precedent)}
              aria-label={affiche ? t('Masquer le mot de passe') : t('Afficher le mot de passe')}
              className="absolute right-0 top-0 flex h-10 w-10 items-center justify-center text-ink-muted transition-colors duration-150 hover:text-ink"
            >
              {affiche ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
            </button>
          </div>

          {/* ⚠️ AUCUNE JAUGE DE ROBUSTESSE. Elles notent surtout la présence de classes
              de caractères, ce que les règles du site refusent justement de prescrire
              (voir `lib/password.ts`) : une jauge verte sur « Motdepasse1! » enseignerait
              exactement le mauvais réflexe. La contrainte réelle — la longueur — est
              dite dans le champ. */}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={pending || valeur.length < PASSWORD_MIN}>
              {pending ? t('Enregistrement…') : t('Enregistrer')}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setOuvert(false)
                setValeur('')
                setRetour(null)
              }}
            >
              {t('Annuler')}
            </Button>
          </div>
        </form>
      ) : (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={() => setOuvert(true)} disabled={existe === null}>
            {existe ? t('Changer le mot de passe') : t('Définir un mot de passe')}
          </Button>
          {existe ? (
            <Button variant="outline" onClick={() => void retirer()} disabled={pending}>
              {t('Retirer le mot de passe')}
            </Button>
          ) : null}
        </div>
      )}

      {retour ? (
        <p
          role="status"
          className={`mt-3 text-xs ${retour.ton === 'ok' ? 'text-ink' : 'text-down'}`}
        >
          {retour.texte}
        </p>
      ) : null}
    </div>
  )
}

/** Les refus de robustesse, chacun avec sa cause — un « refusé » nu ne dit pas quoi corriger. */
function motif(
  result: { ok: false; reason: string; weakness?: string },
  t: (text: string) => string,
): string {
  if (result.reason === 'weak-password') {
    switch (result.weakness) {
      case 'trop-court':
        return t('Trop court : au moins {n} caractères.').replace('{n}', String(PASSWORD_MIN))
      case 'trop-long':
        return t('Trop long.')
      case 'trop-courant':
        return t('Ce mot de passe est parmi les plus utilisés au monde. Choisissez-en un autre.')
      case 'contient-adresse':
        return t('Évitez votre adresse e-mail : c’est le premier essai d’un attaquant.')
      default:
        return t('Ce mot de passe est trop faible.')
    }
  }
  if (result.reason === 'not-signed-in') return t('Votre session a expiré. Reconnectez-vous.')
  if (result.reason === 'unavailable') {
    return t('La connexion n’est pas configurée sur cette instance.')
  }
  return t('L’enregistrement a échoué. Réessayez.')
}
