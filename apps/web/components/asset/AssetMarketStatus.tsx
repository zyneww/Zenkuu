'use client'

import { useLocale } from 'next-intl'
import { useEffect, useState } from 'react'

import type { AssetDetail } from '@zenkuu/data'
import { usePhrase } from '@/components/locale/ContentProvider'

/**
 * « Marché fermé · à la clôture 22:00 · NASDAQ » — la ligne sous le cours.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * POURQUOI UN COURS A BESOIN QU'ON DISE S'IL EST VIVANT
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * La fiche affiche déjà la fraîcheur de la donnée, en haut : « CoinGecko · 16 août
 * 22:00 ». C'est suffisant pour une cryptomonnaie, dont le marché ne ferme jamais —
 * un cours de dix-huit heures y signale une panne de collecte.
 *
 * Pour une action, la même ligne induit en erreur. Un cours vieux de dix-huit heures
 * un dimanche n'est pas périmé : c'est le DERNIER COURS COTÉ, et il le restera
 * jusqu'à lundi matin. Sans cette distinction, le lecteur ne peut pas trancher entre
 * « le site est en panne » et « la bourse est fermée » — et il n'a aucun moyen de le
 * deviner, la variation du jour restant figée à la même valeur pendant tout le
 * week-end.
 *
 * La référence pose exactement cette ligne au même endroit, sous le prix : « At
 * close: 8:00:00PM EDT · NASDAQ ».
 *
 * ── L'HEURE EST CELLE DE LA PLACE, PAS CELLE DU LECTEUR ───────────────────────
 *
 * « À la clôture 22:00 » n'a de sens qu'assorti du fuseau : une bourse ouvre et ferme
 * SUR SON FUSEAU, et l'afficher dans celui du visiteur reviendrait à publier un
 * horaire que personne ne retrouvera sur le site de la bourse. On formate donc dans
 * `session.timezone`, et le sigle du fuseau est écrit à côté.
 *
 * ── POURQUOI CE COMPOSANT EST CLIENT, ET RENDU VIDE AU PREMIER PASSAGE ────────
 *
 * L'état — ouvert ou fermé — dépend de l'heure COURANTE, que le serveur et le
 * navigateur ne lisent pas au même instant. Pire, les pages de fiches sont mises en
 * cache : un « Marché ouvert » calculé au moment du rendu serait servi tel quel
 * plusieurs heures durant, y compris après la cloche.
 *
 * Le premier rendu ne montre donc RIEN, et l'état apparaît après le montage. C'est le
 * même arbitrage que pour les dates relatives du site (voir `useRelativeTime`) : une
 * ligne qui arrive une image plus tard vaut mieux qu'une ligne fausse mise en cache.
 *
 * ── IL SE RAFRAÎCHIT, PARCE QU'UNE CLOCHE SONNE PENDANT QU'ON REGARDE ─────────
 *
 * Une fiche reste ouverte des dizaines de minutes dans un onglet. Sans minuterie, la
 * ligne dirait « Marché ouvert » une heure après la clôture. La cadence est à la
 * minute : c'est la résolution de ce qu'on affiche, et y descendre coûte un calcul de
 * date par minute.
 */
export function AssetMarketStatus({
  asset,
  /**
   * Rappeler le nom de la place après l'état.
   *
   * Faux quand l'appelant l'écrit déjà lui-même — c'est le cas de la ligne d'identité
   * de la fiche, où la bourse précède immédiatement cette mention.
   */
  showPlace = true,
}: {
  asset: AssetDetail
  showPlace?: boolean
}) {
  const locale = useLocale()

  const t = usePhrase()
  const session = asset.session
  const [now, setNow] = useState<number | null>(null)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(Date.now())
    const timer = window.setInterval(() => setNow(Date.now()), 60_000)
    return () => window.clearInterval(timer)
  }, [])

  /* Sans séance publiée, il n'y a rien à dire — et surtout rien à deviner. C'est le
     cas de toute la crypto, qui ne ferme pas, et des sources qui ne livrent pas ces
     métadonnées. Un « Marché ouvert » par défaut serait une affirmation gratuite. */
  if (!session || now === null) return null

  const state = statusOf(session, now, t, locale)
  if (!state) return null

  const place = asset.exchange ?? null

  return (
    <p className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-micro text-ink-muted">
      {/*
        ── VERT OUVERT, ROUGE FERMÉ ────────────────────────────────────────────

        La pastille était verte ou GRISE, au motif qu'une bourse fermée le dimanche
        n'est pas une anomalie — ce qui reste vrai. Elle est désormais rouge, sur le
        modèle de CoinGecko, et le raisonnement qui l'emporte est celui de la LISIBILITÉ
        À DISTANCE : un gris à cinquante pour cent d'opacité, sur six pixels, ne se
        distingue pas du texte gris qui l'entoure. La pastille ne se remarquait donc
        que lorsqu'elle était verte, c'est-à-dire dans le seul cas où l'information
        était la moins utile.

        Le rouge ne dit pas « panne » : il est lu comme un état, exactement comme le
        rouge d'un feu. Ce qui distingue un état d'une alerte n'est pas la teinte mais
        le texte à côté, et celui-ci dit « à la clôture », pas « erreur ».

        Le vert reste celui de DISPONIBILITÉ du système, distinct du vert de hausse —
        les confondre ferait lire « le cours monte » là où on dit « la séance est
        ouverte ». Le rouge, lui, emprunte au ton de baisse : le site n'a pas de rouge
        d'état, et en introduire un troisième pour six pixels serait plus coûteux que le
        léger rapprochement de sens.
      */}
      <span
        aria-hidden="true"
        className={`h-1.5 w-1.5 shrink-0 rounded-pill ${
          state.open ? 'bg-[var(--color-status)]' : 'bg-down'
        }`}
      />
      <span>
        {state.label}
        {/*
          LA PLACE N'EST RÉPÉTÉE QUE SI L'APPELANT NE L'AFFICHE PAS DÉJÀ.

          Cette ligne vit désormais dans la ligne d'identité de la fiche, où le nom de
          la bourse est écrit juste avant elle. L'y répéter donnerait « NASDAQ · Marché
          fermé · NASDAQ ». Les appelants qui la placent ailleurs — sous le cours, par
          exemple — gardent le rappel, faute de quoi la phrase ne dirait pas de quelle
          bourse elle parle.
        */}
        {place && showPlace ? <> · {place}</> : null}
      </span>
    </p>
  )
}

/**
 * L'état de la séance, et la phrase qui va avec.
 *
 * ── TROIS CAS, PAS DEUX ───────────────────────────────────────────────────────
 *
 * Avant l'ouverture, pendant, après. Le troisième et le premier disent des choses
 * différentes — « à la clôture » désigne un cours déjà fixé, « ouverture à » annonce
 * un cours qui ne l'est pas encore — et les fondre en un seul « marché fermé »
 * perdrait justement ce que le lecteur cherche.
 *
 * ── CE QU'ON NE PRÉTEND PAS SAVOIR ────────────────────────────────────────────
 *
 * La source publie la séance ORDINAIRE DU JOUR, et rien d'autre : ni les séances
 * étendues, ni le calendrier des jours fériés, ni la prochaine ouverture. On ne dit
 * donc jamais « rouvre lundi à 9 h 30 » — ce serait une déduction de notre part, et
 * elle serait fausse le 25 décembre. La phrase se limite à l'horaire que la source a
 * effectivement livré.
 */
function statusOf(
  session: NonNullable<AssetDetail['session']>,
  now: number,
  t: (text: string) => string,
  locale: string,
): { open: boolean; label: string } | null {
  const opens = session.opensAt ? Date.parse(session.opensAt) : NaN
  const closes = session.closesAt ? Date.parse(session.closesAt) : NaN

  const time = (iso: string) =>
    new Intl.DateTimeFormat(locale, {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: session.timezone,
      timeZoneName: 'short',
    }).format(new Date(iso))

  if (Number.isFinite(closes) && now > closes && session.closesAt) {
    return { open: false, label: `À la clôture : ${time(session.closesAt)}` }
  }

  if (Number.isFinite(opens) && now < opens && session.opensAt) {
    return { open: false, label: `Marché fermé — ouverture à ${time(session.opensAt)}` }
  }

  if (Number.isFinite(opens) && Number.isFinite(closes) && now >= opens && now <= closes) {
    return session.closesAt
      ? { open: true, label: t('Marché ouvert — clôture à {h}').replace('{h}', time(session.closesAt)) }
      : { open: true, label: t('Marché ouvert') }
  }

  /* Ni ouverture ni clôture exploitables : on se tait. Une séance dont on ne connaît
     qu'un fuseau ne permet de rien affirmer. */
  return null
}
