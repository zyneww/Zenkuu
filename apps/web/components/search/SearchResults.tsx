'use client'

import { TrendingUp } from 'lucide-react'

import { ChangeBadge } from '@zenkuu/ui'

import { Link } from '@/i18n/navigation'
import { Money } from '@/components/locale/Money'
import { monogram } from '@/components/asset/monogram'
import { useContent } from '@/components/locale/ContentProvider'
import { Badge } from '@/components/ui/badge'
import { CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command'
import { Spinner } from '@/components/ui/spinner'
import { assetHref } from '@/lib/asset-routes'
import type { useAssetSearch } from '@/components/search/useAssetSearch'

/**
 * Corps de résultats, PARTAGÉ par le champ de l'en-tête et la fenêtre de recherche.
 *
 * Il ne porte aucune décision : ni l'ouverture, ni la position, ni le cadre. Il reçoit
 * l'état renvoyé par `useAssetSearch` et le met en forme. C'est ce qui permet aux deux
 * surfaces d'afficher exactement la même chose — y compris les cas que l'on oublie
 * toujours dans une copie : recherche en cours, aucun résultat, source crypto saturée.
 *
 * ── IL DOIT ÊTRE RENDU DANS UN `<CommandList>` ───────────────────────────────
 *
 * Ce composant ne rend que le CONTENU d'une liste `cmdk` : des groupes et des lignes.
 * Ses deux appelants l'enveloppent chacun dans le `Command`/`CommandList` qui convient
 * à sa forme — une fenêtre modale pour l'un, un tiroir sous le champ pour l'autre.
 * Rendu hors de ce contexte, cmdk lève.
 *
 * ⚠️ LES DEUX APPELANTS DOIVENT POSER `shouldFilter={false}`. Par défaut, cmdk filtre
 * lui-même les lignes sur la saisie du champ. Ici la recherche est faite PAR LE
 * SERVEUR : ce que ce composant reçoit est déjà le résultat, et laisser cmdk le
 * refiltrer ferait disparaître les bonnes réponses — « btc » ne contient pas
 * « Bitcoin » au sens de sa comparaison de chaînes, et la ligne serait masquée.
 *
 * ── CE QUE cmdk APPORTE, ET QUI ÉTAIT ÉCRIT À LA MAIN ────────────────────────
 *
 * `HeaderSearch` portait une fonction de trente lignes qui lisait les `a[href]` du
 * tiroir par `querySelectorAll` à chaque frappe pour déplacer le focus à la flèche.
 * cmdk fait mieux, et sans code : les flèches déplacent une SÉLECTION (l'élément
 * reste dans l'ordre du DOM, `aria-activedescendant` l'annonce), `Entrée` déclenche
 * la ligne sélectionnée, et la sélection se replace toute seule quand la liste change
 * sous elle — ce que l'index maison ne savait pas faire, il pointait régulièrement une
 * ligne disparue depuis la dernière réponse réseau.
 *
 * ── LES QUATRE ÉTATS, DANS L'ORDRE OÙ ILS SE PRÉSENTENT ───────────────────────
 *
 *   1. saisie trop courte  → tendances
 *   2. requête en vol      → « recherche en cours »
 *   3. résultats           → crypto d'abord, puis les autres classes
 *   4. rien                → message nommant la requête, ou panne de la source
 *
 * L'ordre compte : tester « aucun résultat » avant « en cours » ferait clignoter le
 * message d'absence à chaque frappe.
 */
export function SearchResults({
  search,
  onNavigate,
}: {
  search: ReturnType<typeof useAssetSearch>
  onNavigate: () => void
}) {
  const fr = useContent()
  const { results, loading, trending, showTrending, found, query } = search

  if (showTrending) {
    return (
      <CommandGroup heading={<GroupHeading title={fr.search.trendingTitle} hint={fr.search.trendingHint} icon={<TrendingUp className="size-3.5" aria-hidden="true" />} />}>
        {trending.length > 0 ? (
          trending.map((asset) => (
            <ResultRow
              key={asset.id}
              href={assetHref(asset.assetClass, asset.id)}
              name={asset.name}
              symbol={asset.symbol}
              image={asset.image}
              rank={asset.rank}
              price={asset.price}
              currency={asset.currency}
              change24h={asset.change24h}
              onNavigate={onNavigate}
            />
          ))
        ) : (
          <p className="px-3 py-4 text-xs text-ink-muted">{fr.search.trendingEmpty}</p>
        )}
      </CommandGroup>
    )
  }

  if (loading && !results) {
    return (
      /* `CommandEmpty` et non un `<p>` : cmdk le marque `role="presentation"` et le
         retire du décompte des lignes sélectionnables. Un paragraphe ordinaire posé
         dans la liste resterait annoncé comme une option par la synthèse vocale. */
      <CommandEmpty className="flex items-center justify-center gap-2 py-6 text-xs text-ink-muted">
        <Spinner className="size-3.5" />
        {fr.search.loading}
      </CommandEmpty>
    )
  }

  if (found.length > 0 && results) {
    return (
      <>
        {results.crypto.length > 0 ? (
          <CommandGroup heading={<GroupHeading title={fr.assetClass.crypto} />}>
            {results.crypto.map((item) => (
              <ResultRow
                key={`c-${item.id}`}
                href={assetHref(item.assetClass, item.id)}
                name={item.name}
                symbol={item.symbol}
                image={item.image}
                rank={item.rank}
                onNavigate={onNavigate}
              />
            ))}
          </CommandGroup>
        ) : null}

        {results.autres.length > 0 ? (
          <CommandGroup heading={<GroupHeading title={fr.search.otherAssets} />}>
            {results.autres.map((item) => (
              <ResultRow
                key={`a-${item.id}`}
                href={assetHref(item.assetClass, item.id)}
                name={item.name}
                symbol={item.symbol}
                badge={fr.assetClass[item.assetClass]}
                onNavigate={onNavigate}
              />
            ))}
          </CommandGroup>
        ) : null}

        {/* Panne de la source crypto : on le dit au lieu de laisser croire qu'aucune
            cryptomonnaie ne correspond à la recherche (§5). */}
        {results.cryptoIndisponible ? (
          <p className="px-3 py-2 text-[0.6875rem] text-ink-muted">{fr.search.cryptoUnavailable}</p>
        ) : null}
      </>
    )
  }

  return (
    <CommandEmpty className="px-3 py-6 text-center text-xs text-ink-muted">
      {results?.cryptoIndisponible ? fr.search.cryptoUnavailable : fr.search.noResult(query)}
    </CommandEmpty>
  )
}

/**
 * Intitulé d'un groupe.
 *
 * `CommandGroup` accepte un `heading` en `ReactNode`, ce qui permet d'y loger l'icône
 * et l'indice sans quitter la sémantique de cmdk — l'intitulé reste relié au groupe
 * par `aria-labelledby`, ce qu'un `<h2>` posé à côté ne ferait pas.
 */
function GroupHeading({
  title,
  hint,
  icon,
}: {
  title: string
  hint?: string
  icon?: React.ReactNode
}) {
  return (
    <span className="flex items-center gap-1.5">
      {icon}
      {title}
      {hint ? <span className="font-normal normal-case tracking-normal">· {hint}</span> : null}
    </span>
  )
}

function ResultRow({
  href,
  name,
  symbol,
  image,
  rank,
  badge,
  price,
  currency,
  change24h,
  onNavigate,
}: {
  href: string
  name: string
  symbol: string
  image?: string
  rank?: number
  badge?: string
  /* ── LE COUPLE COURS + VARIATION ─────────────────────────────────────
     Les trois voyagent ENSEMBLE ou pas du tout : un cours sans sa devise n'est
     qu'un nombre, et une variation sans son cours n'a rien à qualifier. Les
     résultats de RECHERCHE ne les portent pas — l'endpoint de recherche ne
     publie qu'un nom, un symbole et un rang — quand les TENDANCES, elles, sont
     rechargées enrichies. La ligne sert donc les deux formes. */
  price?: number
  currency?: string
  change24h?: number
  onNavigate: () => void
}) {
  return (
    /*
      ── `asChild` : LA LIGNE RESTE UN VRAI LIEN ────────────────────────────────

      Le réflexe avec cmdk est `onSelect` + `router.push`. Il est faux ici : un
      résultat de recherche doit s'ouvrir dans un onglet au clic milieu, se copier par
      le menu contextuel et exister pour les robots d'indexation — trois choses qu'un
      `<div>` qui navigue en JavaScript ne fait pas.

      `asChild` donne le comportement de cmdk (sélection à la flèche, `Entrée` qui
      déclenche) à un `<a href>` produit par le `Link` localisé de next-intl. La
      sélection clavier active alors le lien lui-même.

      ⚠️ `value` EST OBLIGATOIRE et doit être STABLE. cmdk s'en sert comme identité de
      ligne ; sans lui il retombe sur le texte rendu, et deux actifs homonymes sur deux
      classes différentes se confondraient. On y met le nom ET le symbole, ce qui rend
      aussi la ligne trouvable par les deux si le filtrage de cmdk était un jour
      réactivé.

      `rounded-control` et non `rounded-card` : ces lignes s'aboutent et se
      parcourent, elles ne se prennent pas une par une. Voir la doctrine des deux
      familles de rayons dans globals.css.
    */
    <CommandItem
      asChild
      value={`${name} ${symbol}`}
      className="gap-3 rounded-control px-3 py-2 data-[selected=true]:bg-surface-muted"
    >
      <Link href={href} onClick={onNavigate}>
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element -- vignettes 22px hors domaines optimisés
          <img
            src={image}
            alt=""
            width={22}
            height={22}
            className="shrink-0 rounded-pill"
            loading="lazy"
          />
        ) : (
          <span
            className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-pill bg-brand-soft text-[0.5625rem] font-bold text-brand-strong"
            aria-hidden="true"
          >
            {monogram(name, symbol)}
          </span>
        )}

        {/*
          ══════════════════════════════════════════════════════════════════════
          LE SYMBOLE PASSE DEVANT, LE NOM LE SUIT EN GRIS
          ══════════════════════════════════════════════════════════════════════

          La ligne s'écrivait « Ethereum … ETH … #2 » : le nom d'abord, le code rejeté
          à droite, le rang à l'extrême droite. Trois informations d'identité réparties
          sur toute la largeur, et l'œil devait traverser la ligne pour les réunir.

          Elles sont désormais GROUPÉES à gauche, dans l'ordre où on les reconnaît :
          `ETH` en gras — c'est ce qu'on tape et ce qu'on retient —, son rang collé
          contre lui en pastille, puis `Ethereum` en gris dessous. La droite de la
          ligne est rendue au COURS et à sa variation, qui sont l'autre moitié de ce
          qu'on vient chercher.

          Deux lignes de texte et non une : sur 26 rem, « Ethereum » à côté de « ETH »
          plus un cours plus un pourcentage se serait tronqué dès les noms longs.
        */}
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-sm font-semibold uppercase text-ink">{symbol}</span>

            {rank !== undefined ? (
              <span className="tabular shrink-0 rounded-[4px] bg-surface-muted px-1 text-micro leading-4 text-ink-muted">
                {rank}
              </span>
            ) : badge ? (
              <Badge variant="secondary" className="shrink-0 px-1.5 py-0 text-micro font-normal">
                {badge}
              </Badge>
            ) : null}
          </span>

          <span className="truncate text-xs text-ink-muted">{name}</span>
        </span>

        {/* Le cours n'apparaît que si la ligne le porte — voir la note des props. Le
            groupe entier disparaît alors, plutôt que de réserver une colonne vide qui
            décalerait le nom sur les résultats de recherche. */}
        {price !== undefined && currency ? (
          <span className="flex shrink-0 flex-col items-end gap-0.5">
            <span className="tabular text-sm text-ink">
              <Money value={price} from={currency} />
            </span>
            {change24h !== undefined ? <ChangeBadge value={change24h} size="sm" /> : null}
          </span>
        ) : null}
      </Link>
    </CommandItem>
  )
}
