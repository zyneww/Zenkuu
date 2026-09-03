/**
 * ══════════════════════════════════════════════════════════════════════════════
 * LE JOURNAL DES LIVRAISONS
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── POURQUOI CETTE TABLE A QUITTÉ LA PAGE ───────────────────────────────────
 *
 * Elle vivait dans `app/[locale]/nouveautes/page.tsx`, sa seule lectrice. Le centre
 * d'aide en a désormais besoin lui aussi : la référence (kucoin.com/support) y pose une
 * section « Annonces », et la seule chose que ce site puisse honnêtement y mettre est
 * ce journal — il n'y a pas de service à annoncer, seulement des livraisons.
 *
 * Recopier les trois dernières entrées dans le centre d'aide aurait garanti qu'elles
 * divergent à la première mise à jour. Elles vivent donc ici, et les deux pages les
 * lisent.
 *
 * ⚠️ LES ENTRÉES DÉCRIVENT DES LIVRAISONS RÉELLES, datées d'après l'historique du
 * dépôt. Un changelog inventé se repère immédiatement — et sur un site dont l'argument
 * principal est de ne rien inventer, ce serait la contradiction la plus visible
 * possible (§5).
 */

/**
 * Nature d'une livraison, portée en pastille sur la page.
 *
 * Trois valeurs et pas davantage : au-delà, l'étiquette cesse de classer et devient
 * une seconde description. Elles répondent à la seule question qu'un lecteur de
 * changelog se pose avant de lire — « est-ce que ça change ce que je sais faire, ou
 * bien ce que je faisais déjà ? »
 *
 *   `nouveaute`  une page, un outil ou une donnée qui n'existait pas
 *   `amelioration`  quelque chose qui existait et qui fonctionne mieux
 *   `correction`  quelque chose qui était faux et qui ne l'est plus
 *
 * ⚠️ UNE ENTRÉE PEUT EN PORTER PLUSIEURS, et la plupart en portent deux : une
 * livraison d'une semaine mêle presque toujours de l'ajout et de la reprise. Forcer
 * une étiquette unique obligerait à trancher arbitrairement, ou à scinder des
 * livraisons qui ont eu lieu ensemble.
 */
export type ReleaseTag = 'nouveaute' | 'amelioration' | 'correction'

export const RELEASE_TAG_LABELS: Record<ReleaseTag, string> = {
  nouveaute: 'Nouveauté',
  amelioration: 'Amélioration',
  correction: 'Correction',
}

export interface Release {
  date: string
  /** Format lisible affiché — la date ISO sert à l'attribut `dateTime`. */
  label: string
  title: string
  tags: ReleaseTag[]
  items: string[]
}

export const RELEASES: Release[] = [
  {
    date: '2026-09-03',
    label: '3 septembre 2026',
    title: 'Fiches d’actif : la barre d’outils, le zoom et les surfaces',
    tags: ['amelioration', 'correction'],
    items: [
      'Le graphique se zoome à la molette, centré sur le curseur. Le geste pilote la bande de navigation plutôt que l’axe : la position reste montrée, et l’on revient en tirant les poignées.',
      'La courbe passe au rouge quand la fenêtre affichée se termine plus bas qu’elle n’a commencé. Une hausse garde l’azur de la marque.',
      'Le menu « Comparer » reçoit un champ de recherche et la navigation aux flèches. Il filtre la liste chargée, et le dit — il n’interroge pas le serveur.',
      'Les réglages du graphique passent en interrupteurs sous une roue dentée, avec leurs sections titrées.',
      'Le graphique TradingView suit désormais le thème RÉSOLU du site. Il restait en clair pour tout lecteur n’ayant jamais touché au réglage, le mode « système » étant la valeur par défaut.',
      'Sous TradingView, « Capitalisation » charge le symbole que la plateforme publie pour elle, et se grise là où il n’en existe aucun.',
      'Une page qui glissait de quatorze pixels à l’ouverture de tout menu ne bouge plus : deux compensations de barre de défilement se contredisaient.',
      '/categories/ecosystemes rejoint /categories comme une vue, avec redirection. Les deux pages rendaient le même composant sur la même requête.',
    ],
  },
  {
    date: '2026-09-02',
    label: '2 septembre 2026',
    title: 'Screener, heatmap et pages graphiques',
    tags: ['nouveaute', 'amelioration'],
    items: [
      'Le screener reçoit des filtres à fourchette, des écrans prédéfinis et un panneau de catégories.',
      'La heatmap adopte une rampe continue plutôt que des paliers, et ses libellés repassent le seuil de contraste.',
      'Les pages graphiques prennent la structure de leur référence : bandes de repères, légende à droite du tracé, tracés en barres.',
      'Une barre d’onglets en pied d’écran sur téléphone, à portée de pouce.',
      'Les pages /blog et /apprendre sont retirées du site, sans redirection ni vestige.',
    ],
  },
  {
    date: '2026-08-31',
    label: '31 août 2026',
    title: 'Douze langues, sans exception',
    tags: ['nouveaute'],
    items: [
      'Tous les textes de l’interface passent par la table de phrases, y compris ceux qu’une balise coupait en deux et ceux qui vivaient dans un attribut ou un ternaire.',
      'Le glossaire et les deux foires aux questions sont traduits dans les douze langues.',
      'Deux relevés indépendants de textes non traduits tombent à zéro.',
    ],
  },
  {
    date: '2026-08-30',
    label: '30 août 2026',
    title: 'La structure des pages, recalée sur la référence',
    tags: ['amelioration', 'correction'],
    items: [
      'L’accueil, la navigation et les fiches d’actif reprennent la disposition de la référence, mesurée au navigateur page par page.',
      'Le panneau d’actualités revient sur les fiches : il avait été retiré sur une mesure fausse.',
      'Les contrastes de texte sur fond coloré et les états sélectionnés reviennent à la mesure.',
    ],
  },
  {
    date: '2026-08-09',
    label: '9 août 2026',
    title: 'Graphiques enrichis, comptes et centre d’aide',
    tags: ['nouveaute', 'amelioration'],
    items: [
      'Graphiques : ajout des vues chandeliers, barres, ligne et écart, en complément de l’aire. Les vues en bougies n’apparaissent que si la source publie réellement de l’OHLC.',
      'Options de graphique : volume échangé, moyenne mobile adaptée à la fenêtre, et lignes de plus haut, moyenne et plus bas.',
      'Le volume est extrait de la réponse d’historique déjà récupérée : il n’occasionne aucun appel supplémentaire aux sources.',
      'Comptes utilisateurs via Clerk, avec pages de connexion et d’inscription. En l’absence de configuration, le site fonctionne normalement et l’annonce explicitement.',
      'Centre d’aide : douze articles répartis en quatre catégories, avec recherche locale et une page par article.',
      'Section Apprendre : neuf fiches classées par thème et par niveau.',
      'Nouvelles pages « Pourquoi ZENKUU », « Bien démarrer » et « API & développeurs ».',
    ],
  },
  {
    date: '2026-08-09',
    label: '9 août 2026',
    title: 'Navigation, recherche et devises',
    tags: ['nouveaute'],
    items: [
      'Recherche universelle couvrant toutes les classes d’actifs depuis l’en-tête.',
      'En-tête centré avec quatre menus déroulants accessibles au clavier.',
      'Sélecteur de langue et de devise ; la devise choisie s’applique à l’ensemble du site.',
      'Graphiques interactifs sur les fiches d’actif, avec sélecteur de période.',
      'Pied de page complet, avec mentions de sources et rappel du cadre en lecture seule.',
    ],
  },
  {
    date: '2026-08-09',
    label: '9 août 2026',
    title: 'Socle du projet',
    tags: ['nouveaute'],
    items: [
      'Monorepo Turborepo et Bun, TypeScript strict.',
      'Couche d’adaptateurs de données à interface commune : CoinGecko, Frankfurter (BCE), Yahoo Finance, flux RSS d’actualités et Alternative.me.',
      'Cache à durées étagées, déduplication des appels concurrents et limitation de débit à fenêtre glissante.',
      'Design system clair crème/orange, thème sombre, bascule sans clignotement au chargement.',
      'Six classements et six fiches d’actif, catégories, actualités et indice de sentiment.',
    ],
  },
]
