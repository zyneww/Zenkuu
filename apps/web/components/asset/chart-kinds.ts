/**
 * Le vocabulaire du graphique, SANS le graphique.
 *
 * ── POURQUOI CE FICHIER EXISTE ───────────────────────────────────────────────
 *
 * `PriceChartInteractive` est chargé à la demande : il pèse 240 Ko à lui seul, ceux de
 * `lightweight-charts`, et il ne se monte JAMAIS avant l'hydratation — la fiche affiche
 * d'abord une courbe SVG rendue par le serveur, puis bascule sur le canevas. Tant que
 * l'import restait statique, cette bascule était un raffinement d'affichage sans effet
 * sur le poids : la bibliothèque partait dans le premier morceau de JavaScript, avant
 * même que la bascule n'ait lieu.
 *
 * Le chargement différé ne suffit pourtant pas à lui seul. `AssetWorkspace` a besoin de
 * `OHLC_KINDS` — une constante de cinq mots — pour décider s'il faut aller chercher des
 * bougies. L'importer depuis le module du graphique le rappellerait tout entier, et le
 * `import()` différé ne servirait plus à rien : on aurait retiré la bibliothèque d'une
 * main et rappelée de l'autre.
 *
 * D'où ce module, qui ne dépend de rien. Les types y sont de toute façon effacés à la
 * compilation ; c'est la CONSTANTE qui commandait le déménagement.
 */

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * HAUTEUR DU TRACÉ SUR UNE FICHE D'ACTIF — mesurée chez CoinGecko, pas estimée
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Relevé au navigateur sur `coingecko.com/en/coins/bitcoin`, cadre de 913 pixels de
 * large :
 *
 *   · `.highcharts-plot-background`  →  503 px — la zone où la courbe est peinte ;
 *   · `.highcharts-navigator`        →   55 px — la bande de navigation du dessous ;
 *   · `#gecko-coin-chart`            →  624 px — le tout, axes et marges compris.
 *
 * Notre cadre en faisait 320, dont 292 de peinture et 28 d'axe temporel : la courbe
 * occupait un peu plus de la MOITIÉ de la surface de la référence. L'écart ne se voyait
 * pas sur une fenêtre de sept jours et se voyait beaucoup sur « MAX », où dix ans
 * d'histoire s'écrasaient dans trois cents pixels.
 *
 * ── POURQUOI 531 ET NON 624 ──────────────────────────────────────────────────
 *
 * Cette constante décrit le TRACÉ, axe temporel compris — pas le bloc entier. On vise
 * donc les 503 pixels de peinture de la référence, auxquels s'ajoutent les 28 pixels
 * que notre axe temporel occupe sous la courbe. La bande de navigation et la barre
 * d'outils vivent en dehors de cette boîte, et s'ajoutent d'elles-mêmes.
 *
 * ── POURQUOI UNE CONSTANTE PARTAGÉE ──────────────────────────────────────────
 *
 * Deux tracés se succèdent au même endroit : la courbe SVG rendue par le serveur, puis
 * le canevas une fois la bibliothèque arrivée. Deux hauteurs écrites séparément
 * feraient SAUTER la page au moment de la bascule — c'est le décalage de mise en page
 * le plus visible qu'une fiche puisse produire, puisqu'il déplace tout ce qui suit.
 *
 * Elle vit ici plutôt que dans `PriceChartInteractive` pour la raison qui a fait naître
 * ce fichier : le module du graphique pèse 240 Ko et n'est chargé qu'après
 * l'hydratation. Y prendre un nombre le rappellerait tout entier.
 */
export const ASSET_CHART_HEIGHT = 531

export interface ChartPoint {
  timestamp: number
  price: number
  volume?: number
}

/**
 * Repère horizontal posé à une valeur fixe.
 *
 * Sert aux extrêmes HISTORIQUES — le plus haut de tous les temps, le plus bas — qui
 * ne se déduisent pas de la fenêtre affichée et doivent donc être fournis de
 * l'extérieur, contrairement aux lignes de `showPriceLines` qui, elles, se calculent
 * sur les points visibles.
 *
 * Une valeur hors de l'amplitude tracée est SILENCIEUSEMENT ignorée par la
 * bibliothèque : la ligne existe mais sort du cadre. C'est le bon comportement — un
 * graphique sur sept jours n'a aucune raison de s'écraser pour faire tenir un record
 * daté d'il y a deux ans.
 */
export interface ChartReferenceLine {
  value: number
  label: string
  tone: 'up' | 'down' | 'muted'
}

/** Ce que le parent peut demander au graphique une fois monté. */
export interface ChartHandle {
  /**
   * Image composée de toutes les couches du graphique.
   *
   * Passe par `takeScreenshot` de la bibliothèque et non par un `querySelector` sur
   * le canevas : le rendu est réparti sur PLUSIEURS canevas superposés (grille,
   * séries, échelles), et n'en capturer qu'un rendrait une image partielle.
   */
  screenshot: () => HTMLCanvasElement | null
}

export interface ChartCandle {
  timestamp: number
  open: number
  high: number
  low: number
  close: number
  volume?: number
}

/**
 * Types de rendu proposés.
 *
 * `candles` et `bars` sont les seuls à exiger de l'OHLC réel ; les trois autres se
 * contentent d'une série de prix. C'est cette distinction qui permet à la fiche de
 * n'aller chercher les bougies que si l'utilisateur les demande.
 */
export type ChartKind = 'area' | 'line' | 'baseline' | 'candles' | 'bars'

export const OHLC_KINDS: readonly ChartKind[] = ['candles', 'bars']
