/**
 * ══════════════════════════════════════════════════════════════════════════════
 * LE REGROUPEMENT DES SÉRIES — L'ARITHMÉTIQUE, SÉPARÉE DU RENDU
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Ce fichier vivait dans `AssetSeriesCards.tsx`, avec les cartes qu'il alimente. Il en
 * est sorti pour une raison pratique et une raison de fond, dans cet ordre de
 * découverte :
 *
 *   · L'OUTIL DE TEST NE LIT PAS LE JSX ici. Un test posé sur le composant échouait à
 *     l'analyse d'import avant d'exécuter la moindre assertion.
 *
 *   · ET C'EST LA BONNE FRONTIÈRE DE TOUTE FAÇON. Ce qui est ici est du calcul de
 *     dates et de sommes ; ce qui reste là-bas est de la mise en page. Le défaut que
 *     ces fonctions ont porté — un regroupement en UTC libellé en heure locale — était
 *     un défaut d'arithmétique, invisible au typage et repéré à l'écran.
 */

export interface SeriesPoint {
  timestamp: number
  price: number
  volume?: number | undefined
  marketCap?: number | undefined
}

export type Grain = 'jour' | 'semaine' | 'mois'

/**
 * Regroupe les points par pas de temps.
 *
 * ⚠️ LE VOLUME SE SOMME, LA CAPITALISATION SE PREND À LA FIN, ET CONFONDRE LES DEUX
 * DONNERAIT DES CHIFFRES FAUX. Un volume hebdomadaire EST la somme des sept volumes
 * quotidiens ; une capitalisation hebdomadaire n'est pas la somme des sept, c'est celle
 * du dernier jour — l'additionner produirait un nombre sept fois trop grand qui aurait
 * toutes les apparences d'une donnée.
 */
export function regrouper(points: readonly SeriesPoint[], grain: Grain) {
  if (points.length === 0) return []

  /*
   * ⚠️ LE REGROUPEMENT EST EN HEURE LOCALE, ET LA PREMIÈRE VERSION NE L'ÉTAIT PAS.
   *
   * Elle groupait en UTC — `getUTCMonth()`, division du timestamp — et LIBELLAIT en
   * heure locale, via `Intl`. Les deux divergent de deux heures à Paris, si bien qu'un
   * relevé du 31 août à 23 h UTC tombait dans le paquet d'août et s'affichait
   * « 1 sept. ». Résultat vu au navigateur : deux barres mensuelles portant toutes deux
   * « sept. 26 », c'est-à-dire un graphique qui se contredit lui-même.
   *
   * Les deux opérations lisent donc le même calendrier. C'est aussi le bon : un lecteur
   * qui regarde « la semaine du 25 » pense à SA semaine, pas à celle de Greenwich.
   */
  const cle = (timestamp: number) => {
    const date = new Date(timestamp)
    if (grain === 'mois') return `${date.getFullYear()}-${date.getMonth()}`

    /* Minuit local du jour, en millisecondes — la base des deux autres pas. Passer par
       un `Date` plutôt que par une division évite le décalage horaire ET les heures
       d'été, où un jour fait vingt-trois ou vingt-cinq heures. */
    const minuit = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    if (grain === 'semaine') {
      /* Le lundi de la semaine. `getDay()` rend 0 pour dimanche : le décalage de six
         jours le rattache à la semaine qui vient de s'écouler plutôt qu'à la suivante. */
      const jour = minuit.getDay()
      minuit.setDate(minuit.getDate() - (jour === 0 ? 6 : jour - 1))
    }
    return String(minuit.getTime())
  }

  const paquets = new Map<string, SeriesPoint[]>()
  for (const point of points) {
    const k = cle(point.timestamp)
    const paquet = paquets.get(k)
    if (paquet) paquet.push(point)
    else paquets.set(k, [point])
  }

  return [...paquets.values()].map((paquet) => {
    const dernier = paquet[paquet.length - 1] as SeriesPoint
    const premier = paquet[0] as SeriesPoint
    /* L'abscisse porte le DÉBUT de la période et non son dernier point : une barre
       « semaine du 25 » étiquetée « 31 août » se lirait comme un jour isolé. */
    const volumes = paquet.map((p) => p.volume).filter((v): v is number => typeof v === 'number')
    return {
      timestamp: premier.timestamp,
      /* La somme n'existe que si au moins un point la porte : `[].reduce` rendrait
         zéro, c'est-à-dire un volume nul là où la donnée manque (§5). */
      volume: volumes.length > 0 ? volumes.reduce((a, b) => a + b, 0) : undefined,
      marketCap: dernier.marketCap,
      /* La variation de la PÉRIODE, du premier au dernier point — et non la moyenne
         des variations quotidiennes, qui ne décrit rien de reconnaissable. */
      change:
        premier.price > 0 ? ((dernier.price - premier.price) / premier.price) * 100 : undefined,
    }
  })
}
