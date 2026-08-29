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

export interface Release {
  date: string
  /** Format lisible affiché — la date ISO sert à l'attribut `dateTime`. */
  label: string
  title: string
  items: string[]
}

export const RELEASES: Release[] = [
  {
    date: '2026-08-09',
    label: '9 août 2026',
    title: 'Graphiques enrichis, comptes et centre d’aide',
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
    items: [
      'Monorepo Turborepo et Bun, TypeScript strict.',
      'Couche d’adaptateurs de données à interface commune : CoinGecko, Frankfurter (BCE), Yahoo Finance, flux RSS d’actualités et Alternative.me.',
      'Cache à durées étagées, déduplication des appels concurrents et limitation de débit à fenêtre glissante.',
      'Design system clair crème/orange, thème sombre, bascule sans clignotement au chargement.',
      'Six classements et six fiches d’actif, catégories, actualités et indice de sentiment.',
    ],
  },
]
