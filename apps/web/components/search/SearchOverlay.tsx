'use client'

import { Link } from '@/i18n/navigation'
import { useEffect, useRef, useState } from 'react'
import { Search, TrendingUp, X } from 'lucide-react'

import type { SearchResult, TrendingAsset } from '@zenkuu/data'

import { monogram } from '@/components/asset/monogram'
import { useContent } from '@/components/locale/ContentProvider'
import { assetHref } from '@/lib/asset-routes'

interface SearchResponse {
  crypto: SearchResult[]
  autres: SearchResult[]
  cryptoIndisponible: boolean
  requeteTropCourte: boolean
}

interface SearchOverlayProps {
  open: boolean
  onClose: () => void
}

/**
 * Overlay de recherche universelle.
 *
 * Le délai de 250 ms n'est pas un réglage de confort mais une contrainte de quota :
 * sans lui, taper « bitcoin » déclencherait sept requêtes vers une API qui n'en
 * tolère que cinq par minute. Combiné au seuil de deux caractères et au cache
 * serveur, il ramène un mot tapé à un seul appel réseau.
 */
const DEBOUNCE_MS = 250

export function SearchOverlay({ open, onClose }: SearchOverlayProps) {
  const fr = useContent()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [trending, setTrending] = useState<TrendingAsset[]>([])
  const trendingLoaded = useRef(false)
  const inputRef = useRef<HTMLInputElement>(null)

  /**
   * Tendances chargées à la PREMIÈRE ouverture, puis conservées pour la session.
   *
   * Elles ne sont volontairement pas récupérées dans le layout : Next.js aligne le
   * `revalidate` d'une page sur le plus court de tous les appels de son rendu, si
   * bien qu'un seul fetch à 5 minutes placé dans le layout ramenait TOUT le site à
   * 5 minutes. Les charger ici sort cet appel du rendu des pages.
   */
  useEffect(() => {
    if (!open || trendingLoaded.current) return
    trendingLoaded.current = true

    fetch('/api/tendances')
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (payload?.trending) setTrending(payload.trending as TrendingAsset[])
      })
      .catch(() => {
        // Panne des tendances : l'overlay reste pleinement utilisable pour chercher.
        // On réautorise une tentative à la prochaine ouverture.
        trendingLoaded.current = false
      })
  }, [open])

  // Focus à l'ouverture, remise à zéro à la fermeture : rouvrir la recherche doit
  // repartir d'un champ vide, pas de la requête précédente.
  useEffect(() => {
    if (open) {
      inputRef.current?.focus()
    } else {
      // `trending` n'est PAS réinitialisé : le rouvrir doit être instantané, et ces
      // données ne se démodent pas en quelques secondes.
      //
      // `open` est une prop contrôlée par le parent (plusieurs déclencheurs de
      // fermeture — Échap, clic sur le fond, bouton) : remettre l'état à zéro ICI,
      // en réaction à son changement, évite de dupliquer la même réinitialisation
      // dans chaque déclencheur.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setQuery('')
      setResults(null)
      setLoading(false)
    }
  }, [open])

  // Le défilement de la page derrière l'overlay est bloqué : sans cela, la molette
  // fait glisser le contenu sous la fenêtre modale, ce qui est désorientant.
  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [open])

  useEffect(() => {
    if (!open) return

    const term = query.trim()
    if (term.length < 2) {
      // Réaction à `query` en dessous du seuil de recherche : vide le résultat
      // précédent sans attendre une réponse réseau qui n'aura pas lieu.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResults(null)
      setLoading(false)
      return
    }

    setLoading(true)
    // `AbortController` : une réponse lente pour « bit » ne doit pas écraser la
    // réponse déjà arrivée pour « bitcoin ». Sans cela, l'affichage revient en
    // arrière de façon aléatoire selon la latence réseau.
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/recherche?q=${encodeURIComponent(term)}`, {
          signal: controller.signal,
        })
        if (!response.ok) throw new Error(String(response.status))
        setResults((await response.json()) as SearchResponse)
      } catch (error) {
        if ((error as Error).name !== 'AbortError') setResults(null)
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }, DEBOUNCE_MS)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [query, open])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  const found = results ? [...results.crypto, ...results.autres] : []
  const showTrending = query.trim().length < 2

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center px-4 pt-[10vh]"
      role="dialog"
      aria-modal="true"
      aria-label={fr.search.title}
    >
      {/* Fond assombri et flouté, cliquable pour fermer. */}
      <button
        type="button"
        className="absolute inset-0 cursor-default bg-canvas/70 backdrop-blur-sm"
        aria-label={fr.search.close}
        onClick={onClose}
      />

      <div className="relative w-full max-w-2xl overflow-hidden rounded-card border border-border-subtle bg-overlay shadow-overlay">
        <div className="flex items-center gap-3 border-b border-border-subtle px-4 py-3">
          <Search className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden="true" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={fr.search.placeholder}
            className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-muted"
            autoComplete="off"
            spellCheck={false}
          />
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded p-1 text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
            aria-label={fr.search.close}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          {showTrending ? (
            <Section
              title={fr.search.trendingTitle}
              hint={fr.search.trendingHint}
              icon={<TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />}
            >
              {trending.length > 0 ? (
                trending.map((asset) => (
                  <ResultRow
                    key={asset.id}
                    href={assetHref(asset.assetClass, asset.id)}
                    name={asset.name}
                    symbol={asset.symbol}
                    image={asset.image}
                    rank={asset.rank}
                    onNavigate={onClose}
                  />
                ))
              ) : (
                <p className="px-3 py-4 text-xs text-ink-muted">{fr.search.trendingEmpty}</p>
              )}
            </Section>
          ) : loading && !results ? (
            <p className="px-3 py-6 text-center text-xs text-ink-muted">{fr.search.loading}</p>
          ) : found.length > 0 ? (
            <>
              {results!.crypto.length > 0 ? (
                <Section title={fr.assetClass.crypto}>
                  {results!.crypto.map((item) => (
                    <ResultRow
                      key={`c-${item.id}`}
                      href={assetHref(item.assetClass, item.id)}
                      name={item.name}
                      symbol={item.symbol}
                      image={item.image}
                      rank={item.rank}
                      onNavigate={onClose}
                    />
                  ))}
                </Section>
              ) : null}

              {results!.autres.length > 0 ? (
                <Section title={fr.search.otherAssets}>
                  {results!.autres.map((item) => (
                    <ResultRow
                      key={`a-${item.id}`}
                      href={assetHref(item.assetClass, item.id)}
                      name={item.name}
                      symbol={item.symbol}
                      badge={fr.assetClass[item.assetClass]}
                      onNavigate={onClose}
                    />
                  ))}
                </Section>
              ) : null}

              {/* Panne de la source crypto : on le dit au lieu de laisser croire
                  qu'aucune cryptomonnaie ne correspond à la recherche (§5). */}
              {results!.cryptoIndisponible ? (
                <p className="px-3 py-2 text-[0.6875rem] text-ink-muted">
                  {fr.search.cryptoUnavailable}
                </p>
              ) : null}
            </>
          ) : (
            <p className="px-3 py-6 text-center text-xs text-ink-muted">
              {results?.cryptoIndisponible ? fr.search.cryptoUnavailable : fr.search.noResult(query)}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-border-subtle px-4 py-2 text-[0.6875rem] text-ink-muted">
          <span>{fr.search.hint}</span>
          <kbd className="rounded border border-border-subtle bg-surface-muted px-1.5 py-0.5 font-sans">
            Échap
          </kbd>
        </div>
      </div>
    </div>
  )
}

function Section({
  title,
  hint,
  icon,
  children,
}: {
  title: string
  hint?: string
  icon?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="mb-1 last:mb-0">
      <h2 className="flex items-center gap-1.5 px-3 py-1.5 text-[0.6875rem] font-semibold uppercase tracking-wide text-ink-muted">
        {icon}
        {title}
        {hint ? <span className="font-normal normal-case tracking-normal">· {hint}</span> : null}
      </h2>
      <ul>{children}</ul>
    </section>
  )
}

function ResultRow({
  href,
  name,
  symbol,
  image,
  rank,
  badge,
  onNavigate,
}: {
  href: string
  name: string
  symbol: string
  image?: string
  rank?: number
  badge?: string
  onNavigate: () => void
}) {
  return (
    <li>
      <Link
        href={href}
        onClick={onNavigate}
        className="flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-surface-muted"
      >
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element -- vignettes 32px hors domaines optimisés
          <img src={image} alt="" width={22} height={22} className="shrink-0 rounded-none" loading="lazy" />
        ) : (
          <span
            className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-none bg-brand-soft text-[0.5625rem] font-bold text-brand-strong"
            aria-hidden="true"
          >
            {monogram(name, symbol)}
          </span>
        )}

        <span className="min-w-0 flex-1 truncate text-sm text-ink">{name}</span>
        <span className="shrink-0 text-xs uppercase text-ink-muted">{symbol}</span>

        {rank !== undefined ? (
          <span className="tabular shrink-0 text-[0.6875rem] text-ink-muted">#{rank}</span>
        ) : badge ? (
          <span className="shrink-0 rounded bg-surface-muted px-1.5 py-0.5 text-[0.625rem] text-ink-muted">
            {badge}
          </span>
        ) : null}
      </Link>
    </li>
  )
}
