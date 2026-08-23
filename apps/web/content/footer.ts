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

/** Un intertitre et les liens qu'il coiffe. */
export interface FooterGroup {
  title: string
  links: FooterLink[]
}

export interface FooterColumn {
  /**
   * Étiquette de la colonne, JAMAIS rendue à l'écran.
   *
   * Elle nomme le `<nav>` pour les technologies d'assistance : sans elle, un lecteur
   * d'écran annoncerait quatre régions « navigation » indiscernables en pied de page.
   * Ce qui se voit, ce sont les intertitres des groupes — la colonne elle-même n'a
   * pas de titre visible dans cette composition.
   */
  label: string
  groups: FooterGroup[]
}

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * QUATRE COLONNES DE GROUPES, ET NON CINQ LISTES À PLAT
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── POURQUOI LE NIVEAU DE GROUPE APPARAÎT ───────────────────────────────────
 *
 * La composition demandée (TradingView) n'empile pas des colonnes titrées : elle
 * empile des GROUPES titrés à l'intérieur de colonnes muettes. La différence n'est pas
 * cosmétique — elle change ce qu'on peut ranger.
 *
 * À plat, chaque famille devait tenir dans exactement une colonne, ce qui forçait des
 * regroupements par défaut : « Actualités » et « Nouvelles cryptomonnaies » vivaient
 * sous « Ressources » faute d'une sixième colonne pour les publications, et les huit
 * entrées de « Marchés » mélangeaient six classes d'actifs avec deux annuaires de
 * places — des objets qui ne répondent pas à la même question.
 *
 * Avec un niveau de groupe, une colonne porte plusieurs familles courtes. Les classes
 * d'actifs se séparent des places, les lectures de marché des indicateurs, les outils
 * de l'espace personnel. Onze intertitres au lieu de cinq, et aucune liste de plus de
 * six lignes : c'est ce qui rend une grille de trente liens lisible.
 *
 * ── LES LIENS EUX-MÊMES N'ONT PAS BOUGÉ ─────────────────────────────────────
 *
 * Aucune adresse n'est ajoutée ni retirée ici : seul le rangement change. Les liens de
 * marché continuent de viser les onglets de `/marches` plutôt que les anciennes pages
 * `/crypto`, `/actions`… supprimées et redirigées — le pied de page est le plus gros
 * émetteur de liens internes du site, et c'est donc l'endroit où une redirection se
 * paie le plus cher, à chaque clic et pour chaque robot.
 */
export const FOOTER_COLUMNS: FooterColumn[] = [
  {
    label: 'Marchés',
    groups: [
      {
        title: 'Classes d’actifs',
        links: [
          { label: 'Cryptomonnaies', href: '/marches' },
          { label: 'Actions', href: '/marches?classe=actions' },
          { label: 'ETF', href: '/marches?classe=etf' },
          { label: 'Indices', href: '/marches?classe=indices' },
          { label: 'Devises', href: '/marches?classe=devises' },
          { label: 'Matières premières', href: '/marches?classe=matieres-premieres' },
        ],
      },
      {
        title: 'Places',
        links: [
          { label: 'Places de cotation', href: '/places' },
          { label: 'Places de dérivés', href: '/perpetuels' },
        ],
      },
    ],
  },
  {
    label: 'Analyse',
    groups: [
      {
        title: 'Lectures de marché',
        links: [
          { label: 'Graphiques globaux', href: '/graphiques' },
          { label: 'Catégories & secteurs', href: '/categories' },
          { label: 'Heatmap sectorielle', href: '/heatmap' },
          { label: 'Points marquants', href: '/points-marquants' },
        ],
      },
      {
        title: 'Indicateurs',
        links: [
          { label: 'Données de trading', href: '/mouvements' },
          { label: 'Indice de sentiment', href: '/sentiment' },
          { label: 'Macroéconomie', href: '/macro' },
        ],
      },
    ],
  },
  {
    label: 'Outils',
    groups: [
      {
        title: 'Outils',
        links: [
          { label: 'Screener', href: '/screener' },
          { label: 'Comparateur', href: '/comparateur' },
          { label: 'Convertisseur', href: '/convertisseur' },
          { label: 'Widgets à intégrer', href: '/widgets' },
        ],
      },
      {
        // Placé haut dans la colonne : `/alertes` est la seule page du pied qui engage
        // une dépense, et une entrée commerciale enterrée en dernière ligne se lit
        // comme une gêne à la dissimuler.
        title: 'Mon espace',
        links: [
          { label: 'Mes alertes', href: '/alertes' },
          { label: 'Ma sélection', href: '/suivi' },
        ],
      },
    ],
  },
  {
    label: 'Zenkuu',
    groups: [
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
        title: 'Publications',
        links: [
          { label: 'Actualités', href: '/actualites' },
          { label: 'Nouvelles cryptomonnaies', href: '/nouvelles-cotations' },
          { label: 'Blog', href: '/blog' },
        ],
      },
      {
        title: 'La société',
        links: [
          { label: 'À propos', href: '/a-propos' },
          { label: 'Pourquoi Zenkuu', href: '/pourquoi-zenkuu' },
          { label: 'Nouveautés', href: '/nouveautes' },
          { label: 'Centre d’aide', href: '/aide' },
        ],
      },
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
