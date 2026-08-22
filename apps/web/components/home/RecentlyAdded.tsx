import type { DataResult, NewListing } from '@zenkuu/data'
import { ChangeBadge, EmptyState } from '@zenkuu/ui'

import { Money } from '@/components/locale/Money'
import { monogram } from '@/components/asset/monogram'
import { getContent } from '@/lib/content'

/**
 * Panneau « Récemment cotés » du bandeau de tête.
 *
 * ── AUCUNE LIGNE N'EST UN LIEN, ET C'EST OBLIGATOIRE ─────────────────────────
 *
 * Ces actifs viennent de Coinpaprika, dont les identifiants ne sont PAS ceux de
 * CoinGecko qui sert les fiches du site. Un `<Link href={`/crypto/${listing.id}`}>`
 * compilerait, s'afficherait, et mènerait à une page introuvable — le type
 * `NewListing` est d'ailleurs séparé de `MarketAsset` exactement pour rendre cette
 * confusion visible à la lecture. Le lien global du panneau, lui, mène à la page qui
 * sait quoi faire de ces identifiants.
 *
 * ── LE MONOGRAMME PLUTÔT QU'UNE VIGNETTE ─────────────────────────────────────
 *
 * La source ne publie pas de logo pour ces actifs — ils viennent d'être cotés. Un
 * emplacement d'image vide sur chaque ligne se lirait comme un chargement bloqué ;
 * deux lettres sur un aplat de marque disent au contraire « il n'y a rien à charger ».
 *
 * ── LE NOMBRE DE LIGNES APPARTIENT À L'APPELANT ──────────────────────────────
 *
 * Ce composant affiche TOUT ce qu'on lui donne, et ne tronque pas. Il tronquait à
 * quatre en dur, exactement comme `HighlightPanel` tronquait à cinq, avec le même
 * défaut : le plafond vivait ici, la taille de la requête vivait dans la page, et les
 * deux ne pouvaient que diverger. Ils avaient d'ailleurs divergé — le panneau était
 * étiré à 455 pixels par le bloc d'actualités voisin, et quatre lignes y laissaient
 * 250 pixels de blanc que ce fichier ne pouvait pas voir.
 *
 * Une seule valeur décide donc, et c'est l'argument de `getNewListings` dans la page :
 * ce qui est demandé à la source est ce qui s'affiche, aucune ligne n'est chargée pour
 * être jetée.
 */
export async function RecentlyAdded({ result }: { result: DataResult<NewListing[]> }) {
  const fr = await getContent()

  return (
    /* SANS TITRE PROPRE, et ce n'est pas un oubli : l'explorateur pose les intitulés
       de sa colonne de droite HORS des cartes, comme il le fait pour « Aperçu du
       marché » et « Classements ». Un titre ici en ferait deux, l'un sous l'autre.
       Voir le point d'appel dans `app/[locale]/page.tsx`. */
    <section className="flex h-full flex-col rounded-panel border border-border-subtle bg-panel p-4">
      {/* ── LA LIGNE EST EN DEUX COLONNES, ET LA DROITE EST EMPILÉE ────────────
          Le cours et sa variation sont l'un SOUS l'autre, alignés à droite, et non
          côte à côte sur une seule ligne. C'est la disposition de la référence, et elle
          règle un vrai défaut de l'ancienne : côte à côte, la variation devait réserver
          une largeur fixe pour que la colonne des cours ne danse pas d'une ligne à
          l'autre — d'où un `w-16` arbitraire, trop large pour « +1,1 % » et trop étroit
          pour « −100,00 % ». Empilée, chacune s'aligne sur le bord droit et aucune ne
          contraint l'autre. */}
      {result.ok && result.data.length > 0 ? (
        <ul className="flex-1 divide-y divide-border-subtle">
          {result.data.map((listing) => (
            <li key={listing.id} className="flex items-center gap-2.5 py-2">
              <span
                className="flex size-6 shrink-0 items-center justify-center rounded-pill bg-brand-soft text-[0.5rem] font-bold text-brand-strong"
                aria-hidden="true"
              >
                {monogram(listing.name, listing.symbol)}
              </span>

              <span className="min-w-0 flex-1 truncate text-sm text-ink">
                {listing.symbol.toUpperCase()}
                <span className="ml-1.5 font-normal text-ink-muted">{listing.name}</span>
              </span>

              <span className="flex shrink-0 flex-col items-end gap-0.5">
                <span className="tabular text-sm text-ink">
                  <Money value={listing.price} from={listing.currency} />
                </span>
                <ChangeBadge value={listing.change24h} size="sm" />
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          title={fr.states.unavailableTitle}
          description={result.ok ? null : result.reason}
          compact
        />
      )}
    </section>
  )
}
