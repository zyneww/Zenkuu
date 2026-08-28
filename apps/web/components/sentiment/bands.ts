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
 * ── LES TEINTES VIENNENT DE LA HEATMAP ─────────────────────────────────────
 *
 * `heat-*` et `gold` sont déjà déclinés pour le thème clair et le thème sombre. Ce
 * sont des JETONS CSS et non des classes utilitaires : ils sont passés à des
 * attributs SVG (`fill`), qui ne comprennent pas les classes Tailwind.
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
  { id: 'extreme-fear', from: 0, to: 24, short: 'Peur extrême', color: 'var(--color-heat-down)' },
  { id: 'fear', from: 25, to: 44, short: 'Peur', color: 'var(--color-heat-down-dim)' },
  { id: 'neutral', from: 45, to: 55, short: 'Neutre', color: 'var(--color-gold)' },
  { id: 'greed', from: 56, to: 74, short: 'Avidité', color: 'var(--color-heat-up-dim)' },
  {
    id: 'extreme-greed',
    from: 75,
    to: 100,
    short: 'Avidité extrême',
    color: 'var(--color-heat-up)',
  },
]

/** Zone d'une valeur. Le dernier cran sert de repli : l'indice est borné à 100. */
export function sentimentBand(value: number): SentimentBand {
  return (
    SENTIMENT_BANDS.find((band) => value <= band.to) ??
    (SENTIMENT_BANDS[SENTIMENT_BANDS.length - 1] as SentimentBand)
  )
}
