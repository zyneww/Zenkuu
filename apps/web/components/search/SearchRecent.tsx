'use client'

import { Clock } from 'lucide-react'

import { Link } from '@/i18n/navigation'
import { AssetThumb } from '@/components/search/AssetThumb'
import { SEARCH_ROW_CLASS } from '@/components/search/row-style'
import { usePhrase } from '@/components/locale/ContentProvider'
import { CommandGroup, CommandItem } from '@/components/ui/command'
import { assetHref } from '@/lib/asset-routes'
import type { RecentSearch } from '@/components/search/recent-searches'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * LES RECHERCHES RÉCENTES, EN TÊTE DU PANNEAU VIDE
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Relevé sur `tokenomist.ai` : « Recent Search » ouvre le panneau, avec un
 * « Clear History » au bord opposé de son intitulé.
 *
 * ── ELLE PASSE AVANT LES TENDANCES, ET C'EST L'ORDRE QUI COMPTE ─────────────
 *
 * Ce que le lecteur a lui-même consulté vaut mieux qu'un classement général : c'est
 * la seule liste du panneau qui lui soit propre. La référence fait le même partage —
 * l'historique à gauche, les plus consultés à droite —, et notre panneau étant en une
 * colonne, la hiérarchie se dit par l'ordre.
 *
 * ── LE BOUTON D'EFFACEMENT EST DANS L'INTITULÉ, PAS DANS LA LISTE ───────────
 *
 * `CommandGroup` accepte un `heading` en `ReactNode` : le bouton y vit, donc HORS des
 * lignes sélectionnables. Posé dans la liste, il deviendrait une ligne que les
 * flèches traverseraient et qu'`Entrée` déclencherait — un effacement à un doigt de
 * la touche qui ouvre un actif.
 *
 * ⚠️ IL N'EST PAS UN `<button>` DANS UN `<button>`. L'intitulé de groupe de cmdk est
 * un `<div>`, pas une cible : le bouton y est donc seul de son espèce, et rien ne
 * s'imbrique.
 */
export function SearchRecent({
  entries,
  onClear,
  onNavigate,
}: {
  entries: readonly RecentSearch[]
  onClear: () => void
  onNavigate: () => void
}) {
  const t = usePhrase()

  if (entries.length === 0) return null

  return (
    <CommandGroup
      heading={
        <span className="flex items-center gap-1.5">
          <Clock className="size-3.5" aria-hidden="true" />
          {t('Recherches récentes')}
          <button
            type="button"
            onClick={onClear}
            /* `ml-auto` plutôt qu'un `justify-between` sur le parent : l'icône et
               l'intitulé doivent rester groupés à gauche, et `justify-between` les
               aurait répartis sur toute la largeur dès qu'il y a trois enfants. Même
               motif que la colonne de droite des tendances. */
            className="ml-auto font-medium normal-case tracking-normal text-ink-muted transition-colors hover:text-ink"
          >
            {t('Effacer l’historique')}
          </button>
        </span>
      }
    >
      {entries.map((entry) => (
        <CommandItem
          key={`recent-${entry.assetClass}-${entry.id}`}
          asChild
          /* Préfixé : un actif peut figurer à la fois dans l'historique et dans les
             tendances, et cmdk se sert de `value` comme identité de ligne. Deux lignes
             de même valeur se confondraient à la sélection. */
          value={`recent ${entry.name} ${entry.symbol}`}
          className={SEARCH_ROW_CLASS}
        >
          <Link href={assetHref(entry.assetClass, entry.id)} onClick={onNavigate}>
            <AssetThumb
              name={entry.name}
              symbol={entry.symbol}
              {...(entry.image ? { image: entry.image } : {})}
            />

            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="truncate text-sm font-semibold uppercase text-ink">
                {entry.symbol}
              </span>
              <span className="truncate text-xs text-ink-muted">{entry.name}</span>
            </span>
          </Link>
        </CommandItem>
      ))}
    </CommandGroup>
  )
}
