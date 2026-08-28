/**
 * Les cinq zones de l'indice — DÉFINIES UNE FOIS.
 *
 * Elles servent au cadran, aux mini-jauges des valeurs historiques et au tableau de
 * l'échelle. Les répéter dans les trois aurait garanti qu'un ajustement de seuil ou
 * de teinte en oublie un, et que la page affiche « Peur » en vert quelque part.
 *
 * ── LES BORNES SONT CELLES DE LA SOURCE ────────────────────────────────────
 *
 * Alternative.me classe lui-même chaque relevé (`value_classification`), et ces
 * bornes reproduisent son découpage. `classify()` — utilisé ailleurs sur le site —
 * applique exactement les mêmes seuils : les deux doivent rester d'accord, sans quoi
 * l'accueil et cette page nommeraient différemment la même valeur.
 *
 * ⚠️ `to` est INCLUSIF. La valeur 24 est de la peur extrême, 25 de la peur.
 *
 * ── LES TEINTES SONT LE SPECTRE DE SENTIMENT, PAS LA RAMPE DE LA HEATMAP ───
 *
 * ⚠️ Une première version peignait ces zones avec `heat-down` / `heat-down-dim` /
 * `gold` / `heat-up-dim` / `heat-up`. C'était un contresens : `heat-*` encode une
 * INTENSITÉ — `-dim` est la version sombre de la même couleur — alors que l'indice
 * parcourt un SPECTRE dont le milieu est jaune. « Peur » sortait en bordeaux
 * (#7f1d1d) là où il doit être orange, et l'arc ne se lisait plus comme un dégradé.
 *
 * `--color-sentiment-1..5` existe pour ça, et bascule d'un thème à l'autre. Ce sont
 * des JETONS CSS et non des classes utilitaires : ils sont passés à des attributs
 * SVG (`fill`, `stroke`), qui ne comprennent pas les classes Tailwind.
 */
export interface SentimentBand {
  id: 'extreme-fear' | 'fear' | 'neutral' | 'greed' | 'extreme-greed'
  from: number
  /** Borne haute INCLUSE. */
  to: number
  /** Nom court, pour les libellés couchés le long du cadran. */
  short: string
  color: string
}

export const SENTIMENT_BANDS: readonly SentimentBand[] = [
  { id: 'extreme-fear', from: 0, to: 24, short: 'Peur extrême', color: 'var(--color-sentiment-1)' },
  { id: 'fear', from: 25, to: 44, short: 'Peur', color: 'var(--color-sentiment-2)' },
  { id: 'neutral', from: 45, to: 55, short: 'Neutre', color: 'var(--color-sentiment-3)' },
  { id: 'greed', from: 56, to: 74, short: 'Avidité', color: 'var(--color-sentiment-4)' },
  {
    id: 'extreme-greed',
    from: 75,
    to: 100,
    short: 'Avidité extrême',
    color: 'var(--color-sentiment-5)',
  },
]

/**
 * Teinte du spectre à une position quelconque, par interpolation entre les crans.
 *
 * Sert à la couronne de graduations du cadran, où cent traits parcourent l'échelle :
 * les peindre par zone produirait cinq blocs, là où la référence montre un dégradé
 * continu.
 *
 * ⚠️ L'interpolation est confiée à `color-mix` et non calculée ici. Les crans sont
 * des VARIABLES CSS dont la valeur dépend du thème : un composant serveur ne peut
 * pas les lire, et mélanger des composantes RVB imposerait de figer les deux
 * palettes dans le JavaScript — donc de les voir diverger de `globals.css`.
 */
export function sentimentRamp(ratio: number): string {
  const clamped = Math.min(1, Math.max(0, ratio))
  const scaled = clamped * (SENTIMENT_BANDS.length - 1)
  /* `length - 2` borne l'index : à ratio = 1, `floor` vaut 4 et l'accès au cran
     suivant sortirait du tableau. */
  const index = Math.min(SENTIMENT_BANDS.length - 2, Math.floor(scaled))
  const local = scaled - index
  const from = SENTIMENT_BANDS[index] as SentimentBand
  const to = SENTIMENT_BANDS[index + 1] as SentimentBand

  return `color-mix(in srgb, ${from.color} ${Math.round((1 - local) * 100)}%, ${to.color})`
}

/** Zone d'une valeur. Le dernier cran sert de repli : l'indice est borné à 100. */
export function sentimentBand(value: number): SentimentBand {
  return (
    SENTIMENT_BANDS.find((band) => value <= band.to) ??
    (SENTIMENT_BANDS[SENTIMENT_BANDS.length - 1] as SentimentBand)
  )
}
