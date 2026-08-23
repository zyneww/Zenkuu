/**
 * Le vocabulaire du graphique, SANS le graphique.
 *
 * ── POURQUOI CE FICHIER EXISTE ───────────────────────────────────────────────
 *
 * `PriceChartInteractive` est chargé à la demande et ne se monte JAMAIS avant
 * l'hydratation : la fiche affiche d'abord une courbe SVG rendue par le serveur, puis
 * bascule sur la version interactive. Tant que l'import restait statique, cette bascule
 * était un raffinement d'affichage sans effet sur le poids — la bibliothèque de tracé
 * partait dans le premier morceau de JavaScript, avant même que la bascule n'ait lieu.
 *
 * Le chargement différé ne suffit pourtant pas à lui seul. `AssetWorkspace` a besoin de
 * `OHLC_KINDS` — une constante de cinq mots — pour décider s'il faut aller chercher des
 * bougies. L'importer depuis le module du graphique le rappellerait tout entier, et le
 * `import()` différé ne servirait plus à rien : on aurait retiré la bibliothèque d'une
 * main et rappelée de l'autre.
 *
 * ⚠️ CET ARGUMENT A CHANGÉ D'ÉCHELLE, PAS DE NATURE. Il pesait 240 Ko du temps de
 * `lightweight-charts`, qui n'était chargée que par cette page ; le graphique est passé
 * à Recharts, désormais partagé avec toutes les figures du site. Le module reste gros —
 * huit cents lignes et l'essentiel des séries de Recharts — et le différer reste juste,
 * mais on ne parle plus d'une bibliothèque entière évitée.
 *
 * Les types de ce fichier sont de toute façon effacés à la compilation ; c'est la
 * CONSTANTE qui commandait le déménagement.
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
 * ── POURQUOI 569 ET NON 624 ──────────────────────────────────────────────────
 *
 * Cette constante décrit le TRACÉ et la BANDE DE VOLUME qui le suit — pas le bloc
 * entier. On vise les 503 pixels de peinture de la référence, auxquels s'ajoutent les
 * 66 pixels de la bande de volume, qui porte l'axe des temps partagé par les deux. La
 * bande de navigation et la barre d'outils vivent en dehors de cette boîte, et
 * s'ajoutent d'elles-mêmes — c'est ce qui reconstitue les 624 pixels du total.
 *
 * Elle valait 531 (503 + 28 d'axe) tant que le volume vivait DANS le tracé, sur un axe
 * masqué. Il a sa bande depuis — voir `PriceChartInteractive` — et l'axe des temps a
 * déménagé sous elle : la boîte grandit donc de la bande, moins l'axe qu'elle reprend.
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
export const ASSET_CHART_HEIGHT = 569

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
   * Image du graphique, peinte dans un canevas.
   *
   * ── POURQUOI UNE PROMESSE ────────────────────────────────────────────────
   *
   * Le tracé était en CANEVAS et la copie tenait en un appel synchrone
   * (`takeScreenshot`). Il est désormais en SVG : le transformer en image demande de
   * le sérialiser, de le charger dans un `Image`, PUIS de le peindre — et un
   * chargement d'image ne se fait pas sur place.
   *
   * Rend `null` si le tracé n'est pas monté, ou si la sérialisation échoue.
   */
  screenshot: () => Promise<HTMLCanvasElement | null>
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

/**
 * Index de la ligne dont l'instant est le plus proche de `stamp`.
 *
 * ── POURQUOI ELLE VIT ICI ET NON DANS LE COMPOSANT ───────────────────────────
 *
 * Pour la même raison que `OHLC_KINDS` : ce fichier est le seul du graphique qui soit
 * du TypeScript nu. `PriceChartInteractive` est un `.tsx` dont le JSX n'est pas
 * transformé par le lanceur de tests, et une fonction qui y vit n'est donc pas
 * testable — seulement ses types, qui s'effacent à la compilation.
 *
 * ── À QUOI ELLE SERT ─────────────────────────────────────────────────────────
 *
 * Le curseur d'amCharts remonte un HORODATAGE, pas un index : sa liste de points est
 * regroupée au-delà d'une certaine densité (`groupData`) et ne correspond plus une à
 * une à la table de l'appelant. C'est cette fonction qui fait le lien, et c'est elle
 * qui décide de quelle ligne le bandeau de lecture affiche les valeurs.
 *
 * ── DICHOTOMIE, ET CE N'EST PAS DE LA COQUETTERIE ────────────────────────────
 *
 * Elle est appelée à chaque déplacement du curseur sur une table qui compte plusieurs
 * milliers de lignes en fenêtre « MAX ». Un balayage linéaire y ferait, sur le fil
 * principal, autant de comparaisons que de points — pendant qu'amCharts repeint. Les
 * lignes sont triées par construction, la dichotomie s'applique donc directement.
 *
 * Le voisin retenu est le plus proche des DEUX qui encadrent l'instant, et non
 * systématiquement celui de gauche : sans cela, le bandeau resterait en retard d'un
 * point sur la moitié du tracé.
 *
 * À ÉGALITÉ EXACTE — le curseur pile entre deux relevés — c'est le PRÉCÉDENT qui
 * l'emporte, et ce n'est pas arbitraire : c'est la valeur qui était en vigueur à cet
 * instant. Le point suivant n'a pas encore été relevé.
 */
export function nearestRow(rows: readonly { t: number }[], stamp: number): number {
  let low = 0
  let high = rows.length - 1

  while (low < high) {
    const middle = (low + high) >> 1
    if ((rows[middle] as { t: number }).t < stamp) low = middle + 1
    else high = middle
  }

  const after = rows[low]
  const before = rows[low - 1]
  if (!before || !after) return low

  return stamp - before.t <= after.t - stamp ? low - 1 : low
}
