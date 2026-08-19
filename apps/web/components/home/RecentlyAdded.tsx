import type { DataResult, NewListing } from '@zenkuu/data'
import { ChangeBadge, EmptyState } from '@zenkuu/ui'

import { Link } from '@/i18n/navigation'
import { Money } from '@/components/locale/Money'
import { monogram } from '@/components/asset/monogram'
import { getContent } from '@/lib/content'
import { getPhrase } from '@/lib/content'

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
 */
export async function RecentlyAdded({ result }: { result: DataResult<NewListing[]> }) {
  const fr = await getContent()
  const t = await getPhrase()

  return (
    <section className="flex h-full flex-col rounded-card border border-border-subtle bg-surface p-4">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold text-ink">{t('Récemment cotés')}</h2>
        <Link
          href="/nouvelles-cotations"
          className="shrink-0 text-xs font-medium text-brand transition-colors hover:text-brand-strong"
        >
          Tout voir
        </Link>
      </div>

      {result.ok && result.data.length > 0 ? (
        <ul className="flex-1 divide-y divide-border-subtle">
          {result.data.slice(0, 4).map((listing) => (
            <li key={listing.id} className="flex items-center gap-2 py-1.5">
              <span
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-pill bg-brand-soft text-[0.5rem] font-bold text-brand-strong"
                aria-hidden="true"
              >
                {monogram(listing.name, listing.symbol)}
              </span>

              <span className="min-w-0 flex-1 truncate text-xs font-medium text-ink">
                {listing.symbol.toUpperCase()}
                <span className="ml-1.5 font-normal text-ink-muted">{listing.name}</span>
              </span>

              <span className="tabular shrink-0 text-xs text-ink">
                <Money value={listing.price} from={listing.currency} />
              </span>

              <span className="w-16 shrink-0 text-right">
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
