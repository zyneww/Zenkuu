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
  /**
   * Titre visible de la colonne.
   *
   * ⚠️ IL NE L'ÉTAIT PAS. Cette étiquette ne servait qu'à nommer la colonne pour les
   * technologies d'assistance, parce que la composition d'alors affichait les
   * intertitres des GROUPES et non celui de la colonne. Le pied de page a été refait
   * sur un modèle à un seul niveau (voir `components/Footer.tsx`) : les groupes sont
   * fondus, et c'est ce libellé qui coiffe la liste.
   */
  label: string
  /*
   * ⚠️ LES LIENS SONT DIRECTS, PLUS DE `groups` INTERMÉDIAIRE.
   *
   * Une colonne portait des GROUPES, chacun avec son propre titre : « Marchés »
   * contenait « Classes d'actifs » puis « Places ». Deux niveaux de titre dans un pied
   * de page.
   *
   * Le pied est passé à la forme plate de Backpack — un intitulé par colonne, une liste
   * dessous. Le niveau intermédiaire n'a alors plus rien à porter, et le garder aurait
   * demandé d'inventer un titre par groupe pour satisfaire le type, titre que personne
   * n'afficherait. Un champ obligatoire jamais lu finit toujours par être rempli
   * n'importe comment.
   */
  links: FooterLink[]
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
  /*
   * ══════════════════════════════════════════════════════════════════════════
   * SIX COLONNES PLATES — LA FORME DE BACKPACK, PAS CELLE D'OPENROUTER
   * ══════════════════════════════════════════════════════════════════════════
   *
   * Le pied portait QUATRE colonnes, chacune découpée en deux ou trois sections
   * titrées : « Marchés » contenait « Classes d'actifs » puis « Places », « Analyse »
   * contenait « Lectures de marché » puis « Indicateurs ». Deux niveaux de titre.
   *
   * Backpack n'en a qu'un : six colonnes, un intitulé chacune, une liste dessous.
   * Relevé le 2026-09-02 — Company, Help & Support, Products, Crypto Markets, Token
   * Prices, Stock Prices.
   *
   * ── POURQUOI UN SEUL NIVEAU VAUT MIEUX ICI ─────────────────────────────
   *
   * Un pied de page se PARCOURT, il ne se lit pas. Deux niveaux obligent à comprendre
   * la hiérarchie avant de trouver le lien : on lit « Marchés », puis « Classes
   * d'actifs », puis « Actions ». Trois lectures pour un clic. À plat, l'intitulé de
   * colonne suffit à situer, et l'œil descend directement à la ligne voulue.
   *
   * ⚠️ AUCUNE ADRESSE N'EST INVENTÉE. Chaque `href` ci-dessous existe dans
   * `app/[locale]/` — vérifié route par route. Un pied de page est le plus gros
   * émetteur de liens internes du site : un lien mort s'y paie à chaque visite et
   * pour chaque robot.
   */
  {
    label: 'La société',
    links: [
      { label: 'À propos', href: '/a-propos' },
      { label: 'Pourquoi Zenkuu', href: '/pourquoi-zenkuu' },
      { label: 'Nouveautés', href: '/nouveautes' },
      { label: 'Centre d’aide', href: '/aide' },
    ],
  },
  {
    label: 'Apprendre',
    links: [
      { label: 'Fiches thématiques', href: '/apprendre' },
      { label: 'Bien démarrer', href: '/bien-demarrer' },
      { label: 'Glossaire', href: '/glossaire' },
      { label: 'Actualités', href: '/actualites' },
      { label: 'Blog', href: '/blog' },
    ],
  },
  {
    label: 'Outils',
    links: [
      { label: 'Recherche filtrée', href: '/screener' },
      { label: 'Comparateur', href: '/comparateur' },
      { label: 'Convertisseur', href: '/convertisseur' },
      { label: 'Widget bandeau', href: '/embed/ticker' },
    ],
  },
  {
    label: 'Marchés crypto',
    links: [
      { label: 'Cryptomonnaies', href: '/crypto' },
      { label: 'Catégories & secteurs', href: '/categories' },
      { label: 'Nouvelles cotations', href: '/nouvelles-cotations' },
      { label: 'Places de cotation', href: '/places' },
      { label: 'Places de dérivés', href: '/perpetuels' },
    ],
  },
  {
    label: 'Marchés traditionnels',
    links: [
      { label: 'Actions', href: '/actions' },
      { label: 'ETF', href: '/etf' },
      { label: 'Indices', href: '/indices' },
      { label: 'Devises', href: '/devises' },
      { label: 'Matières premières', href: '/matieres-premieres' },
    ],
  },
  {
    label: 'Analyses',
    links: [
      { label: 'Graphiques globaux', href: '/graphiques' },
      { label: 'Carte thermique', href: '/heatmap' },
      { label: 'Indice de sentiment', href: '/sentiment' },
      { label: 'Macroéconomie', href: '/macro' },
      { label: 'Tous les palmarès', href: '/classements' },
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
 * Liens de la BARRE LÉGALE, à droite des sources.
 *
 * ⚠️ CE NE SONT PAS DES CONDITIONS D'UTILISATION NI UNE POLITIQUE DE
 * CONFIDENTIALITÉ, et la place qu'ils occupent est pourtant celle-là dans le modèle
 * repris. Ces deux pages n'existent pas : Zenkuu n'ouvre pas de compte payant, ne
 * collecte pas de moyen de paiement et n'exécute aucun ordre. Écrire « Conditions
 * d'utilisation » au-dessus d'un lien mort — ou d'une page inventée pour l'occasion —
 * serait exactement la faute que le §5 interdit.
 *
 * Les deux entrées pointent donc vers les pages qui existent et qui répondent à la
 * question que l'on se pose en regardant cet endroit du pied : d'où viennent les
 * chiffres, et à qui parler. Le jour où de vraies mentions légales sont rédigées,
 * elles se déclarent ici et rien d'autre ne bouge.
 */
export const LEGAL_LINKS: FooterLink[] = [
  /* ⚠️ « Méthodologie & sources » A ÉTÉ RETIRÉ AVEC SA PAGE, et c'est la perte la
     plus sérieuse de cette suppression : c'était le lien qui répondait à « d'où
     viennent ces chiffres » depuis toutes les pages du site.

     Ce qui répond encore, à côté de cette liste : les SOURCES elles-mêmes
     (`DATA_SOURCES`), nommées et liées dans la même barre, et l'attribution CoinGecko
     qui la suit. Le lecteur voit donc toujours qui publie les chiffres ; il ne lit
     plus notre explication de la façon dont nous les traitons. */
  { label: 'Centre d’aide', href: '/aide' },
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
