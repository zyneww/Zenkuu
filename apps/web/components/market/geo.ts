/**
 * Frontières du monde — chargement, projection, échelle de couleur.
 *
 * ── LE FOND DE CARTE EST SERVI PAR LE SITE, PAS PAR UN CDN ───────────────────
 *
 * `public/geo/countries-110m.json` : 177 pays, coordonnées arrondies au centième de
 * degré, soit environ 170 kilo-octets bruts et 45 compressés. La source est Natural
 * Earth (domaine public), dont le fichier d'origine pèse 838 kilo-octets — on n'en
 * conserve que la géométrie, le code ISO-3 et le nom.
 *
 * L'arrondi au centième mérite d'être justifié : c'est environ un kilomètre à
 * l'équateur, soit très en dessous du pixel à toute échelle où l'on affiche un
 * planisphère entier. Il divise le poids par cinq sans qu'aucune frontière ne bouge à
 * l'œil.
 *
 * ── LE CHARGEMENT EST DIFFÉRÉ, ET MÉMORISÉ ──────────────────────────────────
 *
 * Le fond est demandé au montage de la carte, pas au rendu de la page : il n'entre
 * donc pas dans le coût du premier affichage, et un visiteur qui ne descend pas
 * jusqu'à la figure ne le paie jamais. La promesse est mémorisée au niveau du module,
 * ce qui évite un second téléchargement si la carte se remonte.
 */

export interface CountryFeature {
  iso: string
  name: string
  /** Anneaux de coordonnées `[longitude, latitude]`, polygones aplatis. */
  rings: [number, number][][]
}

interface RawFeature {
  properties: { iso: string; name: string }
  geometry:
    | { type: 'Polygon'; coordinates: [number, number][][] }
    | { type: 'MultiPolygon'; coordinates: [number, number][][][] }
}

let pending: Promise<CountryFeature[]> | null = null

export function loadCountries(): Promise<CountryFeature[]> {
  if (pending) return pending

  pending = fetch('/geo/countries-110m.json')
    .then((response) => {
      if (!response.ok) throw new Error(`Fond de carte indisponible (${response.status})`)
      return response.json() as Promise<{ features: RawFeature[] }>
    })
    .then((doc) => {
      /*
       * ── FUSION PAR CODE ISO, ET LE DÉFAUT QU'ELLE CORRIGE ÉTAIT BRUYANT ──────
       *
       * Natural Earth publie PLUSIEURS entités pour un même pays : la Turquie a ses
       * parties européenne et asiatique, la Russie ses enclaves, et d'autres leurs
       * territoires détachés. Rendus tels quels, ces doublons produisaient autant
       * d'éléments React portant la même clé — 277 avertissements « Encountered two
       * children with the same key » relevés dans la console, et un rendu si chargé
       * que l'onglet ne répondait plus assez pour qu'une capture aboutisse.
       *
       * Les fusionner est aussi CORRECT sur le fond : ces morceaux sont un seul pays,
       * portent une seule valeur macroéconomique, et doivent se peindre, se survoler
       * et se sélectionner ensemble. Les garder distincts aurait permis de cliquer sur
       * une moitié de la Turquie.
       */
      const byIso = new Map<string, CountryFeature>()

      for (const feature of doc.features) {
        /* Polygones et multipolygones sont APLATIS en une liste d'anneaux. La
           distinction n'a d'intérêt que pour un remplissage à trous — les enclaves —
           que ni le tracé ni le raycasting n'exploitent ici. La conserver imposerait
           deux chemins de code pour un résultat identique à l'écran. */
        const rings =
          feature.geometry.type === 'Polygon'
            ? feature.geometry.coordinates
            : feature.geometry.coordinates.flat()

        const existing = byIso.get(feature.properties.iso)
        if (existing) existing.rings.push(...rings)
        else
          byIso.set(feature.properties.iso, {
            iso: feature.properties.iso,
            name: feature.properties.name,
            rings: [...rings],
          })
      }

      return [...byIso.values()]
    })
    .catch((error) => {
      // La promesse mémorisée est LIBÉRÉE en cas d'échec : sans cela, une coupure
      // réseau passagère condamnerait la carte pour toute la durée de la session.
      pending = null
      throw error
    })

  return pending
}

/**
 * Projection équirectangulaire — `x = longitude`, `y = −latitude`.
 *
 * ── POURQUOI CELLE-CI, ET PAS MERCATOR ───────────────────────────────────────
 *
 * Mercator est la projection des cartes en ligne, et elle est ici le mauvais choix :
 * elle multiplie la surface du Groenland par quatorze. Sur une carte de MESURES par
 * pays, cela donne un poids visuel énorme à des pays peu peuplés et écrase les zones
 * équatoriales — exactement l'inverse de ce qu'on veut lire.
 *
 * L'équirectangulaire ne conserve ni les surfaces ni les angles, mais elle ne
 * privilégie personne : chaque degré vaut le même nombre de pixels partout. C'est
 * aussi la projection qu'utilise TradingView pour ses Macro Maps, et elle a une
 * propriété pratique décisive — les coordonnées se lisent directement, sans trigonométrie.
 */
export function project(
  lon: number,
  lat: number,
  width: number,
  height: number,
): [number, number] {
  return [((lon + 180) / 360) * width, ((90 - lat) / 180) * height]
}

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * PROJECTION ORTHOGRAPHIQUE — LA TERRE VUE DE L'ESPACE, POUR L'ONGLET « GLOBE »
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── CE QU'ELLE FAIT, EN UNE PHRASE ──────────────────────────────────────────
 *
 * Elle place chaque point du globe sur une sphère unitaire, applique la rotation
 * demandée (la longitude et la latitude qui font FACE au lecteur), puis regarde la
 * sphère depuis l'infini : les coordonnées à l'écran sont simplement `x` et `y`, et
 * `z` dit si le point est sur la face visible ou derrière.
 *
 * C'est la projection de toutes les vues « planète » — et, contrairement à
 * l'équirectangulaire d'à côté, elle ne déforme pas les pôles : elle les cache.
 *
 * ── POURQUOI PAS THREE.JS ───────────────────────────────────────────────────
 *
 * Un globe WebGL était l'autre voie. Elle coûte environ sept cents kilo-octets de
 * moteur 3D pour dessiner cent soixante-dix-sept polygones plats sur une sphère, et
 * elle rendrait la figure OPAQUE : un canevas WebGL n'a ni nœud par pays, ni survol
 * par élément, ni nom lisible par une synthèse vocale. La carte d'à côté a choisi le
 * SVG pour ces trois raisons exactement (voir `MacroChoropleth`), et rien ne change
 * ici — le fond de carte, les couleurs, l'infobulle et le clic sont les mêmes.
 *
 * Ce qu'on abandonne en échange : l'éclairage, l'atmosphère et les textures d'un
 * vrai rendu 3D. La rotation, le zoom et la perspective sphérique, eux, sont ici.
 *
 * ── LE POINT CACHÉ EST RABATTU SUR L'HORIZON, IL N'EST PAS SUPPRIMÉ ─────────
 *
 * ⚠️ C'EST LE SEUL ENDROIT DÉLICAT DE CE FICHIER. Un pays à cheval sur le bord du
 * globe — la Russie vue depuis l'Atlantique — a des points devant et des points
 * derrière. Jeter les seconds referme le polygone par une CORDE qui traverse la
 * sphère : un trait droit en plein océan, très visible.
 *
 * On rabat donc chaque point caché sur le cercle d'horizon, dans sa propre
 * direction. Le contour épouse alors le bord du globe, ce qui est exactement la
 * silhouette qu'on attend — et ne coûte qu'une normalisation.
 */
export interface GlobeRotation {
  /** Longitude au centre du disque, en degrés. */
  lon: number
  /** Latitude au centre du disque, en degrés. */
  lat: number
}

const RAD = Math.PI / 180

/**
 * Point du globe à l'écran, plus sa visibilité.
 *
 * `visible` est vrai quand le point est sur la face tournée vers le lecteur. Les
 * appelants s'en servent pour deux choses : écarter un pays entièrement caché sans
 * le dessiner, et décider s'il faut rabattre le point sur l'horizon.
 */
export function orthographic(
  lon: number,
  lat: number,
  rotation: GlobeRotation,
  radius: number,
  cx: number,
  cy: number,
): { x: number; y: number; visible: boolean } {
  const phi = lat * RAD
  const lambda = (lon - rotation.lon) * RAD
  const phi0 = rotation.lat * RAD

  const cosPhi = Math.cos(phi)
  const sinPhi = Math.sin(phi)
  const cosLambda = Math.cos(lambda)

  /* Repère de la sphère unitaire, après rotation. `z` positif = face visible. */
  const x = cosPhi * Math.sin(lambda)
  const y = Math.cos(phi0) * sinPhi - Math.sin(phi0) * cosPhi * cosLambda
  const z = Math.sin(phi0) * sinPhi + Math.cos(phi0) * cosPhi * cosLambda

  if (z >= 0) return { x: cx + radius * x, y: cy - radius * y, visible: true }

  /* Face cachée : on rabat sur l'horizon, dans la direction du point. La norme peut
     être nulle au pôle exactement opposé au regard — un seul point sur la sphère —
     et l'on retombe alors sur le bord droit plutôt que de diviser par zéro. */
  const norm = Math.hypot(x, y)
  if (norm === 0) return { x: cx + radius, y: cy, visible: false }

  return { x: cx + (radius * x) / norm, y: cy - (radius * y) / norm, visible: false }
}

/**
 * Chemin SVG d'un pays sur le globe, ou `null` s'il est entièrement caché.
 *
 * Le rejet des pays cachés n'est pas une optimisation cosmétique : sans lui, la
 * moitié du monde serait dessinée écrasée sur le cercle d'horizon, en un liseré de
 * couleurs qui n'appartient à personne.
 */
export function globePath(
  country: CountryFeature,
  rotation: GlobeRotation,
  radius: number,
  cx: number,
  cy: number,
): string | null {
  let anyVisible = false
  const parts: string[] = []

  for (const ring of country.rings) {
    /* Les anneaux de moins de trois points ne dessinent rien mais produisent un
       chemin invalide que certains moteurs rendent comme un trait. */
    if (ring.length < 3) continue

    const points: string[] = []
    let ringVisible = false

    for (const [lon, lat] of ring) {
      const point = orthographic(lon, lat, rotation, radius, cx, cy)
      if (point.visible) ringVisible = true
      points.push(`${point.x.toFixed(1)},${point.y.toFixed(1)}`)
    }

    /* Un anneau dont AUCUN point n'est visible est intégralement derrière : le
       dessiner ne produirait qu'un arc collé au bord. */
    if (!ringVisible) continue

    anyVisible = true
    parts.push(`M${points.join('L')}Z`)
  }

  return anyVisible ? parts.join('') : null
}

/** Chemin SVG d'un pays, dans un cadre de dimensions données. */
export function countryPath(country: CountryFeature, width: number, height: number): string {
  return country.rings
    .map((ring) => {
      /* Les anneaux de moins de trois points ne dessinent rien mais produisent un
         chemin invalide que certains moteurs rendent comme un trait. */
      if (ring.length < 3) return ''

      const points = ring.map(([lon, lat]) => {
        const [x, y] = project(lon, lat, width, height)
        return `${x.toFixed(1)},${y.toFixed(1)}`
      })

      return `M${points.join('L')}Z`
    })
    .join('')
}

/*
 * `toSphere` VIVAIT ICI, et est parti avec le globe.
 *
 * Elle projetait une coordonnée sur la sphère unité dans la convention de three.js.
 * Plus rien ne l'appelle depuis que `/macro` n'a qu'une représentation. Elle n'est pas
 * gardée « au cas où » : une fonction sans appelant est une fonction sans test et sans
 * garantie, et la retrouver dans l'historique coûte moins cher que de la maintenir.
 */

/**
 * Échelle de couleur d'une valeur macroéconomique.
 *
 * ── BORNÉE PAR LES CENTILES, PAS PAR LES EXTRÊMES ───────────────────────────
 *
 * Une échelle tendue du minimum au maximum serait écrasée par un seul pays : sur
 * l'inflation, un pays en hyperinflation à 200 % ramènerait tous les autres dans le
 * premier vingtième de la rampe, et la carte deviendrait monochrome. Les bornes sont
 * donc les 5ᵉ et 95ᵉ centiles, et les valeurs au-delà saturent.
 *
 * ── LE SENS DE LECTURE VIENT DE L'INDICATEUR ────────────────────────────────
 *
 * Une inflation haute est mauvaise, une croissance haute est bonne. Peindre les deux
 * avec la même rampe ferait lire « rouge = fort » ici et « rouge = faible » là, pour
 * la même couleur sur la même page. Le ton est donc porté par l'indicateur, et c'est
 * lui qui décide de quel côté la rampe est chaude.
 */
export type MacroTone = 'high-good' | 'high-bad' | 'neutral'

export function macroColor(
  value: number | undefined,
  low: number,
  high: number,
  tone: MacroTone,
): string {
  if (value === undefined) return 'var(--color-surface-muted)'

  const span = high - low
  const ratio = span > 0 ? Math.min(1, Math.max(0, (value - low) / span)) : 0.5

  if (tone === 'neutral') {
    return `color-mix(in srgb, var(--color-brand) ${Math.round(12 + ratio * 68)}%, var(--color-surface))`
  }

  /* `good` est la part de l'échelle jugée FAVORABLE. Pour un indicateur où le haut est
     mauvais, elle s'inverse — et c'est la seule chose que `tone` change. */
  const good = tone === 'high-good' ? ratio : 1 - ratio
  const base = good >= 0.5 ? 'var(--color-up)' : 'var(--color-down)'
  const intensity = Math.abs(good - 0.5) * 2

  return `color-mix(in srgb, ${base} ${Math.round(14 + intensity * 62)}%, var(--color-surface))`
}

/** Centile d'une série TRIÉE, par interpolation linéaire entre les rangs encadrants. */
export function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0
  if (sorted.length === 1) return sorted[0] as number

  const rank = (sorted.length - 1) * p
  const low = Math.floor(rank)
  const high = Math.ceil(rank)
  if (low === high) return sorted[low] as number

  return (sorted[low] as number) + ((sorted[high] as number) - (sorted[low] as number)) * (rank - low)
}
