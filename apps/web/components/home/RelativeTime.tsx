'use client'

import { useLocale } from 'next-intl'
import { useSyncExternalStore } from 'react'

import { usePhrase } from '@/components/locale/ContentProvider'

/** Une minute, une heure et un jour en millisecondes — les trois paliers du calcul. */
const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * ÂGE D'UNE PUBLICATION — « il y a 6 h » PLUTÔT QU'UNE DATE
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── POURQUOI L'ÂGE RELATIF ──────────────────────────────────────────────────
 *
 * « il y a 6 h » répond à la question qu'on se pose devant un fil — est-ce récent —
 * quand « 22/08/2026 » demande un calcul. La date exacte reste accessible : elle est
 * portée par l'attribut `dateTime`, que le navigateur expose au survol et que les
 * lecteurs d'écran annoncent.
 *
 * ── POURQUOI CÔTÉ CLIENT, ALORS QUE LE RESTE DE LA CARTE EST SERVEUR ────────
 *
 * Parce que l'âge dépend de l'instant où on REGARDE, pas de celui où la page a été
 * rendue. La page est régénérée toutes les trois minutes et servie depuis un cache :
 * un « il y a 2 h » calculé au rendu serveur peut donc être lu une heure plus tard et
 * mentir d'une heure. Lu chez le lecteur, il est juste par construction.
 *
 * ── L'HORLOGE EST UN ÉTAT EXTERNE, PAS UN ÉTAT REACT ────────────────────────
 *
 * Elle avance sans que React en soit prévenu, et elle n'a pas de valeur au rendu
 * serveur : c'est la définition de ce que `useSyncExternalStore` sert à lire. L'écrire
 * en `useState` corrigé dans un `useEffect` marcherait, et produirait un rendu de plus
 * à chaque montage — ce que le linter React refuse à juste titre sur une carte qui en
 * monte trois.
 *
 * Le pas d'abonnement est la MINUTE, et c'est ce qui rend l'instantané stable : deux
 * lectures dans la même minute rendent le même entier, donc React ne re-rend pas en
 * boucle. C'est aussi la plus petite unité que le libellé sait exprimer — un pas plus
 * fin ferait travailler le navigateur pour un texte identique.
 *
 * Effet de bord acquis, et il est bienvenu : l'âge se rafraîchit tout seul sur un
 * onglet resté ouvert, au lieu de vieillir en silence.
 *
 * ── LE PREMIER RENDU EST LA DATE, ET C'EST OBLIGATOIRE ──────────────────────
 *
 * Serveur et client doivent produire le MÊME HTML au premier passage, sinon React
 * signale une divergence d'hydratation. L'horloge du serveur et celle du lecteur ne
 * coïncidant jamais, l'âge ne peut pas être ce premier rendu.
 *
 * La date absolue, elle, est identique des deux côtés — elle se calcule à partir de la
 * seule chaîne ISO, sans lire d'horloge. Elle sert donc d'instantané serveur, et un
 * visiteur sans JavaScript la garde plutôt que de voir un trou.
 */

function subscribe(onChange: () => void): () => void {
  const timer = setInterval(onChange, MINUTE)
  return () => clearInterval(timer)
}

/** Minute courante depuis l'époque. Stable d'une lecture à l'autre dans la minute. */
function getSnapshot(): number | null {
  return Math.floor(Date.now() / MINUTE)
}

/** Pas d'horloge au rendu serveur : `null` fait retomber sur la date absolue. */
function getServerSnapshot(): number | null {
  return null
}

export function RelativeTime({ iso }: { iso: string }) {
  const locale = useLocale()
  const t = usePhrase()
  const minute = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  const at = Date.parse(iso)
  if (Number.isNaN(at)) return null

  return (
    <time dateTime={iso}>
      {minute === null
        ? new Date(at).toLocaleDateString(locale, {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          })
        : describe(minute * MINUTE - at, t)}
    </time>
  )
}

/**
 * Met un écart de temps en mots.
 *
 * Trois paliers seulement — minutes, heures, jours. Au-delà d'un mois le fil n'affiche
 * plus rien de pertinent de toute façon : ses entrées sont les plus récentes d'un
 * réservoir rafraîchi en continu.
 *
 * Un âge NÉGATIF est ramené à « à l'instant » plutôt que rendu tel quel. Il arrive :
 * certains flux datent leur publication de l'heure de bouclage, qui peut précéder de
 * quelques minutes l'horloge du lecteur. « il y a −3 min » se lit comme un défaut.
 */
function describe(age: number, t: (text: string) => string): string {
  if (age < MINUTE) return t('à l’instant')

  if (age < HOUR) {
    return t('il y a {n} min').replace('{n}', String(Math.floor(age / MINUTE)))
  }

  if (age < DAY) {
    return t('il y a {n} h').replace('{n}', String(Math.floor(age / HOUR)))
  }

  return t('il y a {n} j').replace('{n}', String(Math.floor(age / DAY)))
}
