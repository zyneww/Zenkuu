'use client'

import { useLocale } from 'next-intl'

import { TRANSLATED_LOCALES } from '@/components/settings/languages'
import { usePathname, useRouter } from '@/i18n/navigation'
import { useSettings } from '@/lib/stores/settings'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * CHOISIR UNE LANGUE — ET Y ALLER VRAIMENT
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── LE DÉFAUT QUE CE CROCHET CORRIGE ────────────────────────────────────────
 *
 * Les deux sélecteurs de langue — le menu de l'en-tête et la fenêtre de préférences —
 * appelaient `useSettings().setLanguage`, qui écrit UNE CLÉ DANS LE STOCKAGE LOCAL et
 * rien d'autre. Aucun des deux ne navigait.
 *
 * Le résultat, relevé au navigateur : choisir « English » refermait le menu, laissait la
 * page en français, et faisait afficher « Langue · EN » à côté d'un site entièrement
 * francophone. La ligne du menu et le badge du pied de page annonçaient donc une langue
 * qui n'était pas celle servie — une mention fausse, exactement ce que l'en-tête de
 * `LocaleBadge` dit vouloir éviter.
 *
 * ── DEUX SOURCES, ET UNE SEULE FAIT FOI ─────────────────────────────────────
 *
 * La langue AFFICHÉE est celle de la route (`useLocale`), parce que c'est elle qui
 * décide du texte réellement rendu. Le magasin, lui, garde la préférence : il sert le
 * tableau de bord et le pied de page hors route localisée, et il survit à un
 * rechargement. Les deux étaient auparavant en désaccord sans que rien ne les rapproche.
 *
 * ── SEULES LES LANGUES TRADUITES SONT NAVIGABLES ────────────────────────────
 *
 * `routing` ne connaît que `TRANSLATED_LOCALES` : demander `/de/…` sans messages
 * allemands servirait du français sous une URL allemande, ce que `i18n/routing.ts`
 * interdit explicitement pour des raisons de référencement. Une langue non traduite
 * reste donc une préférence enregistrée — le comportement annoncé par la fenêtre — et
 * ne provoque aucune navigation.
 */
/**
 * ══════════════════════════════════════════════════════════════════════════════
 * LA LANGUE CHOISIE SURVIT À LA VISITE — ET C'EST UN COOKIE QUI LE PERMET
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── LE DÉFAUT ────────────────────────────────────────────────────────────────
 *
 * Le choix n'était mémorisé QUE dans le stockage local, lu par du JavaScript de page.
 * Or l'adresse sans préfixe (`/`, `/crypto/bitcoin`) est servie en français par le
 * routage, et cette décision est prise AVANT tout JavaScript. Un lecteur passé en
 * anglais qui rouvrait le site par son signet ou par un résultat de recherche
 * retombait donc en français, la préférence restant vraie dans le menu — encore une
 * mention qui annonce autre chose que ce qui est servi.
 *
 * ── POURQUOI UN COOKIE, ET POURQUOI CELUI-LÀ ────────────────────────────────
 *
 * Seul un cookie voyage avec la requête, donc avant le rendu. `NEXT_LOCALE` est le nom
 * que next-intl emploie déjà : le réutiliser évite d'en inventer un second qui
 * divergerait le jour où l'on rallume la détection automatique.
 *
 * ⚠️ IL N'ACTIVE PAS LA DÉTECTION PAR `Accept-Language`, qui reste éteinte pour les
 * raisons de référencement décrites dans `i18n/routing.ts` : un robot n'a pas de
 * cookie, il continue donc de voir le français sur les adresses sans préfixe. Ce
 * cookie ne suit QUE les choix explicites.
 *
 * `SameSite=Lax` : il doit accompagner une navigation venue d'un autre site — un lien
 * partagé, un résultat de recherche — sinon il ne servirait qu'aux visites directes.
 * Aucune donnée personnelle : un code de langue sur deux lettres.
 */
const LOCALE_COOKIE = 'NEXT_LOCALE'
const ONE_YEAR_SECONDS = 31_536_000

function rememberInCookie(code: string): void {
  if (typeof document === 'undefined') return
  document.cookie = `${LOCALE_COOKIE}=${encodeURIComponent(code)}; path=/; max-age=${ONE_YEAR_SECONDS}; samesite=lax`
}

export function useLanguageChoice(): {
  /** La langue RÉELLEMENT servie — celle de la route. */
  language: string
  /** Enregistre la préférence, et navigue quand la langue est traduite. */
  setLanguage: (code: string) => void
} {
  const locale = useLocale()
  const pathname = usePathname()
  const router = useRouter()
  const remember = useSettings((state) => state.setLanguage)

  return {
    language: locale,
    setLanguage: (code) => {
      remember(code)
      rememberInCookie(code)
      if (code === locale) return
      if (!(TRANSLATED_LOCALES as readonly string[]).includes(code)) return
      /* `replace` et non `push` : changer de langue n'est pas un pas de navigation
         qu'on veut pouvoir défaire à la flèche « retour ». Le lecteur qui revient en
         arrière s'attend à la page PRÉCÉDENTE, pas à sa traduction. */
      router.replace(pathname, { locale: code as (typeof TRANSLATED_LOCALES)[number] })
    },
  }
}
