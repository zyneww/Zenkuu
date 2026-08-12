'use client'

import { useEffect, useState } from 'react'

/**
 * Ancienneté relative — « il y a 2 h » — SANS écart d'hydratation.
 *
 * ── LE DÉFAUT QUE CE CROCHET SUPPRIME ─────────────────────────────────────────
 *
 * Il a été trouvé par Sentry dans les minutes qui ont suivi son installation, avec
 * le diff exact : `AssetTickers` rendait « il y a 23 min » côté serveur et « il y a
 * 22 min » côté client. React interrompt alors l'hydratation de la branche fautive
 * et la reconstruit entièrement — sur un tableau de cinquante places de cotation,
 * c'est tout le tableau qui est jeté et refait.
 *
 * La cause tient à un malentendu répandu : `'use client'` ne signifie PAS « rendu
 * seulement dans le navigateur ». Un composant client est rendu une première fois
 * par le SERVEUR pour produire le HTML initial, puis hydraté. `Date.now()` y est
 * donc évalué DEUX FOIS, à quelques secondes ou minutes d'intervalle — et il suffit
 * qu'une minute passe entre les deux pour que le texte diffère.
 *
 * C'est un piège de conception, pas une étourderie : le calcul est juste, le rendu
 * est juste, et rien ne signale l'écart en dehors d'un avertissement de console
 * qu'on finit par ne plus voir.
 *
 * ── LA PARADE : PARTIR DE L'ABSOLU, PASSER AU RELATIF APRÈS LE MONTAGE ────────
 *
 * Le premier rendu — celui du serveur, puis celui de l'hydratation — donne la date
 * ABSOLUE, identique des deux côtés par construction. L'effet, qui ne s'exécute que
 * dans le navigateur et après l'hydratation, bascule ensuite sur le libellé
 * relatif.
 *
 * Le lecteur ne voit rien de ce va-et-vient : il se joue en une image. Et la date
 * absolue reste une réponse honnête pour qui n'a pas de JavaScript — là où un
 * « il y a 23 min » figé au moment de la génération de la page vieillirait en
 * silence, et mentirait au bout d'une heure de cache.
 */
export function useRelativeTime(iso: string | undefined): string {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // Correction délibérée après le premier rendu : c'est tout le mécanisme.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true)
  }, [])

  if (!iso) return '—'
  return mounted ? formatRelative(iso) : formatAbsolute(iso)
}

/** « il y a 23 min ». Exporté pour les rares appels hors composant. */
export function formatRelative(iso: string): string {
  const parsed = Date.parse(iso)
  if (!Number.isFinite(parsed)) return '—'

  const minutes = Math.round((Date.now() - parsed) / 60_000)
  if (minutes < 0) return '—'
  if (minutes < 2) return 'à l’instant'
  if (minutes < 60) return `il y a ${minutes} min`

  const hours = Math.round(minutes / 60)
  if (hours < 24) return `il y a ${hours} h`

  const days = Math.round(hours / 24)
  if (days < 7) return `il y a ${days} j`

  return formatAbsolute(iso)
}

/**
 * « 12 août, 07:36 » — le repli stable des deux côtés de l'hydratation.
 *
 * Le fuseau est FIGÉ sur Paris, et c'est la condition pour que ce libellé soit le
 * même sur le serveur et dans le navigateur. Sans lui, un serveur en UTC et un
 * lecteur à Bruxelles produiraient deux heures différentes — on aurait déplacé
 * l'écart d'hydratation au lieu de le supprimer.
 */
export function formatAbsolute(iso: string): string {
  const parsed = Date.parse(iso)
  if (!Number.isFinite(parsed)) return '—'

  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Paris',
  }).format(parsed)
}
