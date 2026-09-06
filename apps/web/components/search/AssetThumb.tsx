import { monogram } from '@/components/asset/monogram'

/**
 * La vignette d'une ligne de recherche : le logo de la source, ou un monogramme.
 *
 * ── POURQUOI ELLE EXISTE COMME COMPOSANT ────────────────────────────────────
 *
 * Elle était écrite deux fois — dans `SearchResults` et, au moment d'ajouter
 * l'historique, elle allait l'être une troisième. Huit lignes recopiées ne coûtent
 * rien à écrire et beaucoup à tenir : le repli en monogramme, la taille de 22 px, le
 * `loading="lazy"` et la dérogation de lint qui l'accompagne doivent rester d'accord
 * entre toutes les lignes du panneau, faute de quoi deux listes voisines n'auront pas
 * la même hauteur de ligne.
 *
 * ⚠️ `text-[0.5625rem]` — 9 PX — EST HORS DE L'ÉCHELLE TYPOGRAPHIQUE, ET C'EST
 * ASSUMÉ ICI PLUTÔT QUE DISPERSÉ. `--text-micro` vaut 11 px, ce qui déborde d'une
 * pastille de 22 px dès qu'un monogramme fait deux lettres. La valeur était déjà dans
 * `SearchResults` ; la rassembler ici la rend modifiable en un seul endroit, ce qui
 * est la seule chose qu'on puisse faire de mieux qu'un cran nommé qui n'existe pas.
 */
export function AssetThumb({
  name,
  symbol,
  image,
}: {
  name: string
  symbol: string
  image?: string
}) {
  if (image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- vignettes 22px hors domaines optimisés
      <img
        src={image}
        alt=""
        width={22}
        height={22}
        className="shrink-0 rounded-pill"
        loading="lazy"
      />
    )
  }

  return (
    <span
      className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-pill bg-brand-soft text-[0.5625rem] font-bold text-brand-strong"
      aria-hidden="true"
    >
      {monogram(name, symbol)}
    </span>
  )
}
