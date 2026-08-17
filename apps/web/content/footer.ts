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
    /*
     * ── LES SIX LIENS VISENT MAINTENANT LES ONGLETS DE `/marches` ────────────
     *
     * Ils pointaient vers `/crypto`, `/actions`, `/etf`… — pages supprimées depuis, et
     * désormais redirigées. Un pied de page qui n'émet que des redirections coûte un
     * aller-retour à chaque clic et dilue le signal pour les moteurs, qui suivent ces
     * liens sur CHAQUE page du site : le pied de page est le plus gros émetteur de
     * liens internes d'un site, et donc l'endroit où une redirection se paie le plus.
     *
     * Les deux places s'ajoutent à la colonne : ce sont des marchés au même titre que
     * les six classes, et elles n'apparaissaient nulle part en pied de page.
     */
    title: 'Marchés',
    links: [
      { label: 'Cryptomonnaies', href: '/marches' },
      { label: 'Actions', href: '/marches?classe=actions' },
      { label: 'ETF', href: '/marches?classe=etf' },
      { label: 'Indices', href: '/marches?classe=indices' },
      { label: 'Devises', href: '/marches?classe=devises' },
      { label: 'Matières premières', href: '/marches?classe=matieres-premieres' },
      { label: 'Places de cotation', href: '/places' },
      { label: 'Places de dérivés', href: '/perpetuels' },
    ],
  },
  {
    title: 'Données & analyse',
    links: [
      { label: 'Catégories & secteurs', href: '/categories' },
      { label: 'Données de trading', href: '/mouvements' },
      { label: 'Points marquants', href: '/points-marquants' },
      { label: 'Graphiques globaux', href: '/graphiques' },
      { label: 'Nouvelles cryptomonnaies', href: '/nouvelles-cotations' },
      { label: 'Heatmap sectorielle', href: '/heatmap' },
      { label: 'Screener', href: '/screener' },
      { label: 'Comparateur', href: '/comparateur' },
      { label: 'Convertisseur', href: '/convertisseur' },
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
    title: 'ZENKUU',
    links: [
      { label: 'À propos', href: '/a-propos' },
      // Placée haut dans la colonne : c'est la seule page du pied qui engage une
      // dépense, et une entrée commerciale enterrée en dernière ligne se lit comme
      // une gêne à la dissimuler.
      { label: 'Mes alertes', href: '/alertes' },
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
    handle: '@getzenkuu',
    href: 'https://www.instagram.com/getzenkuu/',
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
