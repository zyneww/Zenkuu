import type { ComponentType } from 'react'

import { InstagramGlyph } from '@/components/BrandIcons'

/**
 * Contenu du pied de page.
 *
 * Structure inspirée d'OKX (colonnes thématiques, barre légale, communauté) mais
 * vidée de tout ce qui relève de l'exécution d'ordres : leur pied de page consacre
 * deux colonnes entières à « Acheter des cryptos » et « Trading », qui n'ont
 * évidemment aucun équivalent ici (§7). L'espace correspondant revient aux
 * ressources et à la transparence sur les sources — c'est ce qui a de la valeur pour
 * un site d'information.
 */

export interface FooterLink {
  label: string
  href: string
  /** Lien sortant : ouvre dans un nouvel onglet et porte rel="noopener". */
  external?: boolean
  ready?: boolean
}

export interface SocialLink extends FooterLink {
  /** Glyphe du réseau — cf. `components/BrandIcons.tsx`. */
  icon: ComponentType<{ className?: string }>
  /** Identifiant du compte, affiché à côté de l'icône. */
  handle: string
}

export interface FooterColumn {
  title: string
  links: FooterLink[]
}

export const FOOTER_COLUMNS: FooterColumn[] = [
  {
    title: 'Marchés',
    links: [
      { label: 'Cryptomonnaies', href: '/crypto' },
      { label: 'Actions', href: '/actions' },
      { label: 'ETF', href: '/etf' },
      { label: 'Indices', href: '/indices' },
      { label: 'Devises', href: '/devises' },
      { label: 'Matières premières', href: '/matieres-premieres' },
    ],
  },
  {
    title: 'Données & analyse',
    links: [
      { label: 'Catégories & secteurs', href: '/categories' },
      { label: 'Hausses et baisses', href: '/crypto/mouvements' },
      { label: 'Indice de sentiment', href: '/sentiment' },
      { label: 'Actualités', href: '/actualites' },
    ],
  },
  {
    title: 'Ressources',
    links: [
      { label: 'Méthodologie & sources', href: '/methodologie' },
      { label: 'Apprendre', href: '/apprendre' },
      { label: 'Bien démarrer', href: '/bien-demarrer' },
      { label: 'API & développeurs', href: '/developpeurs' },
    ],
  },
  {
    title: 'ZENITH',
    links: [
      { label: 'À propos', href: '/a-propos' },
      { label: 'Nouveautés', href: '/nouveautes' },
      { label: 'Blog', href: '/blog' },
      { label: 'Centre d’aide', href: '/aide' },
    ],
  },
]

/**
 * Comptes sociaux réellement ouverts.
 *
 * Un seul pour l'instant, et c'est volontaire : afficher une rangée d'icônes dont
 * la plupart pointeraient vers des profils inexistants serait la même faute que
 * d'inventer un chiffre. On n'affiche que ce qui existe, et le bloc « Communauté »
 * disparaît entièrement si ce tableau redevient vide.
 */
export const SOCIAL_LINKS: SocialLink[] = [
  {
    label: 'Instagram',
    handle: '@zenithmrkt',
    href: 'https://www.instagram.com/zenithmrkt/',
    icon: InstagramGlyph,
    external: true,
  },
]

/**
 * Sources créditées en pied de page.
 *
 * Plusieurs de ces API demandent une attribution visible dans leurs conditions
 * d'utilisation gratuites. Les regrouper ici évite de dépendre de la présence d'un
 * module particulier sur la page pour honorer cet engagement.
 */
export const DATA_SOURCES: FooterLink[] = [
  { label: 'CoinGecko', href: 'https://www.coingecko.com', external: true },
  { label: 'Frankfurter (BCE)', href: 'https://frankfurter.dev', external: true },
  { label: 'Yahoo Finance', href: 'https://finance.yahoo.com', external: true },
  { label: 'Alternative.me', href: 'https://alternative.me', external: true },
]
