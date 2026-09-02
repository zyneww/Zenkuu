'use client'

import { CommandItem } from '@/components/ui/command'
import { Link } from '@/i18n/navigation'
import { ChangeBadge } from '@zenkuu/ui'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * LA PASTILLE DE RÉSULTAT — CE QUE BACKPACK MONTRE AVANT QU'ON AIT TAPÉ
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Relevé sur backpack.exchange le 2026-09-02, et la distinction compte : leur panneau
 * a DEUX rendus.
 *
 *   · Champ VIDE → des PASTILLES, trois par rangée, logo + symbole + variation.
 *   · Champ REMPLI → des LIGNES pleine largeur, logo + symbole + nom + prix + variation.
 *
 * Ce n'est pas une inconséquence de leur part. Une pastille tient sur une demi-ligne :
 * on en voit vingt d'un coup d'œil, ce qui est exactement ce qu'il faut pour PARCOURIR
 * une sélection qu'on n'a pas demandée. Une ligne porte plus d'informations mais
 * n'en montre que huit : c'est ce qu'il faut pour COMPARER des résultats qu'on a
 * cherchés.
 *
 * ── CE QU'UNE PASTILLE NE PORTE PAS, ET POURQUOI ───────────────────────────
 *
 * Ni le nom complet, ni le prix. « Bitcoin » à côté de « BTC » est une redondance dans
 * un espace où chaque caractère coûte, et le prix demanderait une largeur variable qui
 * casserait l'alignement des rangées. Les deux restent dans la ligne, qui a la place.
 *
 * Le survol et la sélection clavier fonctionnent comme sur une ligne : `CommandItem`
 * ne présume rien de la forme de ce qu'il enveloppe.
 */
export function ResultPill({
  href,
  symbol,
  name,
  image,
  change24h,
  onNavigate,
}: {
  href: string
  symbol: string
  /** Sert à l'annonce vocale et à l'identité cmdk, pas à l'affichage. */
  name: string
  image?: string
  change24h?: number
  onNavigate: () => void
}) {
  return (
    /* ⚠️ `value` DOIT PORTER LE NOM en plus du symbole, même s'il n'est pas affiché :
       cmdk s'en sert comme identité de ligne, et deux actifs de symboles proches sur
       deux classes différentes se confondraient sans lui. */
    <CommandItem
      asChild
      value={`${name} ${symbol}`}
      className="w-auto rounded-pill border border-border-subtle bg-surface-muted px-2 py-1.5 data-[selected=true]:border-brand data-[selected=true]:bg-surface-hover"
    >
      <Link href={href} onClick={onNavigate} className="flex items-center gap-1.5">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element -- vignettes 16px hors domaines optimisés
          <img src={image} alt="" width={16} height={16} className="shrink-0 rounded-pill" loading="lazy" />
        ) : null}

        <span className="text-xs font-medium uppercase text-ink">{symbol}</span>

        {/* La variation est la SECONDE moitié de ce que dit une pastille — sans elle
            il ne resterait qu'une liste de symboles, que le tableau donne déjà. */}
        {change24h !== undefined ? <ChangeBadge value={change24h} size="sm" /> : null}
      </Link>
    </CommandItem>
  )
}
