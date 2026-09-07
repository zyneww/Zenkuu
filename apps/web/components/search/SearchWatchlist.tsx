'use client'

import { Star } from 'lucide-react'

import { AssetThumb } from '@/components/search/AssetThumb'
import { SEARCH_ROW_CLASS } from '@/components/search/row-style'
import { Link } from '@/i18n/navigation'
import { usePhrase } from '@/components/locale/ContentProvider'
import { CommandGroup, CommandItem } from '@/components/ui/command'
import { assetHref, marketHref } from '@/lib/asset-routes'
import type { AssetClass } from '@zenkuu/data'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * LA LISTE DE SUIVI DANS LE PANNEAU DE RECHERCHE
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Relevé sur `tokenomist.ai` : « My Watchlist » avec, quand elle est vide, une étoile,
 * la phrase « You haven't followed any tokens yet » et un bouton « Get Started ».
 *
 * ── L'ÉTAT VIDE EST LE VRAI SUJET DE CE COMPOSANT ───────────────────────────
 *
 * Une section qui disparaît quand elle est vide n'apprend rien : le lecteur qui ne
 * suit rien ne saura jamais qu'il POURRAIT suivre. C'est exactement pourquoi la
 * référence en dessine un, et pourquoi il est repris.
 *
 * ⚠️ MAIS ELLE DISPARAÎT QUAND LE SUIVI EST INDISPONIBLE, et c'est l'inverse du même
 * raisonnement. Sans base ni service d'envoi, `available` vaut faux : proposer alors
 * « commencez votre liste » mènerait à un bouton de connexion qui n'existe pas sur
 * cette instance. Un état vide dit « il n'y a rien ENCORE » ; il ne doit pas servir à
 * dire « il n'y aura jamais rien ».
 *
 * ── LE BOUTON MÈNE OÙ ON PEUT RÉELLEMENT SUIVRE ─────────────────────────────
 *
 * « Get Started » chez elle ouvre l'inscription. Ici il mène au CATALOGUE : suivre un
 * actif se fait par l'étoile d'une ligne de tableau, et c'est là qu'il faut aller. Un
 * bouton qui ouvrirait la fenêtre de connexion promettrait que le compte est la
 * condition, alors que la liste fonctionne pour un visiteur anonyme — elle est
 * rattachée à son cookie, et lui est réattribuée s'il se connecte plus tard.
 */
export function SearchWatchlist({
  followed,
  onNavigate,
}: {
  followed: {
    available: boolean
    entries: { assetClass: AssetClass; assetId: string; label: string; symbol: string }[]
  } | null
  onNavigate: () => void
}) {
  const t = usePhrase()

  /* `null` = la réponse n'est pas revenue. On ne rend RIEN plutôt qu'un état vide qui
     se remplirait sous les yeux — un « vous ne suivez aucun actif » qui se transforme
     en liste de six lignes se lit comme une erreur du site. */
  if (!followed || !followed.available) return null

  /*
   * ── LA LISTE EST PLAFONNÉE, ET LE RELEVÉ L'A IMPOSÉ ───────────────────────
   *
   * Première version sans plafond, ouverte sur une liste réelle de treize actifs : les
   * tendances tombaient sous le pli, et le panneau vide — dont c'est LE contenu —
   * demandait de faire défiler pour être vu.
   *
   * Six lignes tiennent au-dessus des tendances. Au-delà, le lien du bandeau mène au
   * tableau de bord, qui porte la liste entière AVEC les cours : la suite n'est pas
   * cachée, elle est renvoyée là où elle est mieux servie.
   */
  const VISIBLES = 6
  const reste = followed.entries.length - VISIBLES

  const heading = (
    <span className="flex items-center gap-1.5">
      <Star className="size-3.5" aria-hidden="true" />
      {t('Ma liste de suivi')}
      {reste > 0 ? (
        <Link
          href="/tableau-de-bord"
          onClick={onNavigate}
          /* `ml-auto` plutôt qu'un `justify-between` sur le parent : l'icône et
             l'intitulé restent groupés à gauche. Même motif que le bouton d'effacement
             de l'historique et que la colonne de droite des tendances. */
          className="ml-auto font-medium normal-case tracking-normal text-ink-muted transition-colors hover:text-ink"
        >
          {t('Tout voir')}
        </Link>
      ) : null}
    </span>
  )

  if (followed.entries.length === 0) {
    return (
      <CommandGroup heading={heading}>
        {/* Hors `CommandItem` : ce bloc n'est pas une ligne à choisir, et les flèches
            ne doivent pas s'y arrêter. Le lien, lui, reste tabulable — c'est la
            navigation ordinaire du document, pas celle de la liste. */}
        <div className="flex flex-col items-center gap-2 px-3 py-5 text-center">
          <Star className="size-6 text-ink-muted" aria-hidden="true" />
          <p className="text-xs text-ink-muted">{t('Vous ne suivez encore aucun actif.')}</p>
          <Link
            /* `marketHref` plutôt que `'/crypto'` écrit à la main : la route interne est
               traduite par next-intl selon la langue, et la table est déjà le point
               unique de vérité des destinations de classe. */
            href={marketHref('crypto')}
            onClick={onNavigate}
            className="rounded-control bg-surface-muted px-3 py-1.5 text-xs font-semibold text-ink-secondary transition-colors hover:text-brand-strong"
          >
            {t('Parcourir les cryptomonnaies')}
          </Link>
        </div>
      </CommandGroup>
    )
  }

  return (
    <CommandGroup heading={heading}>
      {followed.entries.slice(0, VISIBLES).map((entry) => (
        <CommandItem
          key={`suivi-${entry.assetClass}-${entry.assetId}`}
          asChild
          /* Préfixé, comme l'historique : un actif peut figurer dans la liste de suivi
             ET dans les tendances, et cmdk se sert de `value` comme identité de ligne. */
          value={`suivi ${entry.label} ${entry.symbol}`}
          className={SEARCH_ROW_CLASS}
        >
          <Link href={assetHref(entry.assetClass, entry.assetId)} onClick={onNavigate}>
            {/* Sans image : la table ne stocke pas l'adresse du logo — elle changerait
                chez la source sans que rien ne la mette à jour. Le monogramme est le
                repli que `AssetThumb` applique déjà à tout actif sans vignette. */}
            <AssetThumb name={entry.label} symbol={entry.symbol} />

            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="truncate text-sm font-semibold uppercase text-ink">
                {entry.symbol}
              </span>
              <span className="truncate text-xs text-ink-muted">{entry.label}</span>
            </span>
          </Link>
        </CommandItem>
      ))}
    </CommandGroup>
  )
}
