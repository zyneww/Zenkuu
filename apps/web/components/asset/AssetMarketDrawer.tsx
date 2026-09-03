'use client'

import { ChevronRight, TrendingUp, X } from 'lucide-react'
import { Search } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'

import type { AssetClass, SearchResult, TrendingAsset } from '@zenkuu/data'
import { ChangeBadge } from '@zenkuu/ui'

import { monogram } from '@/components/asset/monogram'
import { Link } from '@/i18n/navigation'
import { assetHref } from '@/lib/asset-routes'
import { usePhrase } from '@/components/locale/ContentProvider'

/**
 * Tiroir des marchés — la colonne de gauche des plateformes de trading.
 *
 * ── LE MANQUE QU'IL COMBLE ────────────────────────────────────────────────────
 *
 * Passer d'une fiche à une autre imposait un détour par la recherche globale, qui
 * est une fenêtre MODALE : elle noircit la page, bloque le défilement et se referme
 * sur la navigation. Le geste « je compare deux actifs » — le plus courant sur ce
 * genre de page — coûtait donc trois interactions et faisait disparaître deux fois
 * ce qu'on était en train de lire.
 *
 * OKX règle cela par une colonne permanente à gauche du graphique. On en reprend la
 * fonction sans en reprendre la place : chez eux elle est toujours dépliée, ce qui se
 * défend sur une page de trading où l'on saute de paire en paire toute la journée,
 * mais pas sur une page de consultation où elle mangerait un quart de la largeur au
 * profit d'un geste occasionnel. D'où un TIROIR : une poignée discrète sur le bord,
 * et la colonne complète au clic.
 *
 * ── CE QU'IL N'AFFICHE PAS, ET POURQUOI ───────────────────────────────────────
 *
 * Pas de cours ni de variation sur les résultats de RECHERCHE, contrairement à la
 * référence. Ce n'est pas un oubli : `SearchResult` ne porte volontairement ni prix
 * ni variation, parce que les renseigner coûterait un appel réseau PAR LIGNE sur un
 * quota qui en tolère cinq par minute (voir son type). Inventer ces colonnes — ou les
 * remplir de tirets — ferait passer une contrainte de source pour une donnée.
 *
 * Les TENDANCES, elles, arrivent déjà chiffrées de leur propre appel : elles portent
 * donc leur variation. C'est la même règle appliquée dans les deux sens — on montre
 * ce qu'on a, jamais ce qu'on suppose.
 */

const DEBOUNCE_MS = 250

/**
 * Filtres proposés au-dessus des résultats.
 *
 * `null` pour « Tout » plutôt qu'une chaîne magique : la valeur sert directement de
 * prédicat, et un `null` se lit comme « aucun filtre » sans table de correspondance.
 */
const FILTERS: { id: AssetClass | null; label: string }[] = [
  { id: null, label: 'Tout' },
  { id: 'crypto', label: 'Cryptos' },
  { id: 'stock', label: 'Actions' },
  { id: 'etf', label: 'ETF' },
  { id: 'forex', label: 'Devises' },
  { id: 'index', label: 'Indices' },
  { id: 'commodity', label: 'Matières' },
]

interface SearchResponse {
  crypto: SearchResult[]
  autres: SearchResult[]
  cryptoIndisponible: boolean
  requeteTropCourte: boolean
}

export function AssetMarketDrawer({ currentId }: { currentId?: string }) {
  const t = usePhrase()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<AssetClass | null>(null)
  const [results, setResults] = useState<SearchResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [trending, setTrending] = useState<TrendingAsset[]>([])

  const trendingLoaded = useRef(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  /* Tendances chargées à la PREMIÈRE ouverture seulement, et conservées ensuite : le
     tiroir se rouvre et se referme sans arrêt pendant qu'on compare, et redemander la
     même liste à chaque fois brûlerait le quota pour rien. */
  useEffect(() => {
    if (!open || trendingLoaded.current) return
    trendingLoaded.current = true

    fetch('/api/tendances')
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (payload?.trending) setTrending(payload.trending as TrendingAsset[])
      })
      .catch(() => {
        // Panne des tendances : le tiroir reste utilisable pour chercher. On
        // réautorise une tentative à la prochaine ouverture.
        trendingLoaded.current = false
      })
  }, [open])

  /* Focus au champ à l'ouverture. La requête n'est PAS effacée à la fermeture,
     contrairement à la recherche globale : on referme souvent le tiroir pour regarder
     la fiche qu'on vient d'ouvrir, et retrouver sa liste au retour est exactement ce
     qu'on attend d'un tiroir — c'est ce qui le distingue d'une fenêtre modale. */
  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  /* Recherche — mêmes garde-fous que l'overlay global : seuil de deux caractères,
     temporisation, et abandon de la requête précédente. Sans le dernier, une réponse
     lente pour « bit » écrase celle déjà arrivée pour « bitcoin ». */
  useEffect(() => {
    if (!open) return

    const term = query.trim()
    if (term.length < 2) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResults(null)
      setLoading(false)
      return
    }

    setLoading(true)
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

  /* Le filtre s'applique APRÈS la réponse, sur les deux paquets réunis. Le passer au
     service produirait une requête par changement de puce, pour trier une liste déjà
     en mémoire — et la source ne sait de toute façon pas filtrer par classe. */
  const found = useMemo(() => {
    const all = results ? [...results.crypto, ...results.autres] : []
    return filter ? all.filter((item) => item.assetClass === filter) : all
  }, [results, filter])

  const trendingShown = useMemo(
    () => (filter ? trending.filter((item) => item.assetClass === filter) : trending),
    [trending, filter],
  )

  const searching = query.trim().length >= 2

  return (
    /*
      ── LE TIROIR EST UN `Sheet`, ET IL EST `modal={false}` ────────────────────

      `Sheet` est le `Dialog` de Radix qui entre par un bord. Il apporte la poignée
      comme déclencheur relié (`aria-expanded`, `aria-controls`), la touche Échap, le
      clic extérieur, le retour du focus à la fermeture et l'animation d'entrée —
      cinq choses écrites à la main ici, dont deux dans un `useEffect` à quatre
      écouteurs de document.

      ⚠️ `modal={false}` N'EST PAS UN DÉTAIL. Par défaut un `Sheet` bloque le
      défilement de la page, masque le reste du document aux lecteurs d'écran et
      piège le focus. C'est exactement ce qu'on NE veut pas ici : un tiroir est un
      accessoire de la fiche qu'on est en train de lire, pas un état qui la suspend —
      on garde le graphique sous les yeux pendant qu'on cherche l'actif à comparer.
      Le repasser à `true` rendrait la page inerte derrière lui.

      Corollaire : Radix ne pose alors PAS de voile, et celui qui suit reste donc
      écrit à la main.
    */
    <Sheet open={open} onOpenChange={setOpen} modal={false}>
      {/*
        ── LA POIGNÉE ────────────────────────────────────────────────────────────

        `fixed` et collée au bord gauche de la FENÊTRE, pas de la colonne : c'est ce
        qui la rend atteignable sans défiler, où qu'on en soit dans la page. Elle est
        verticale et étroite — 28 pixels — parce qu'elle doit se remarquer sans
        prétendre au statut de bouton principal ; le libellé tourné à 180° est la
        convention des tiroirs latéraux, et il évite une icône de plus à décoder.

        Masquée sous `lg` : sur un téléphone, un tiroir de 320 pixels recouvrirait la
        fiche entière, et la recherche de l'en-tête y répond déjà.
      */}
      <SheetTrigger
        aria-label={t('Ouvrir la liste des marchés')}
        className={`fixed left-0 top-1/2 z-40 hidden -translate-y-1/2 items-center gap-1.5 border border-l-0 border-border-subtle bg-panel py-4 pl-1 pr-1.5 text-ink-muted shadow-overlay transition-colors duration-150 hover:bg-surface-muted hover:text-ink lg:flex ${
          open ? 'pointer-events-none opacity-0' : 'opacity-100'
        }`}
      >
        <Search className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span
          aria-hidden="true"
          className="text-micro font-semibold uppercase tracking-widest"
          style={{ writingMode: 'vertical-rl' }}
        >{t('Marchés')}</span>
      </SheetTrigger>

      {/* Voile : il ne bloque pas le défilement, à la différence de la recherche
          modale. Un tiroir est un accessoire de la page, pas un état qui la
          suspend — et l'on veut pouvoir continuer à lire ce qu'il laisse voir. */}
      <div
        aria-hidden="true"
        /* ⚠️ 50 % ET NON 40 % : c'est la valeur des QUATRE autres voiles du site —
           `dialog`, `sheet`, `drawer`, `alert-dialog`. Ce tiroir-ci était le seul à
           assombrir moins fort, sans raison écrite nulle part ; deux surfaces modales
           d'une même page se seraient donc détachées différemment de leur fond.

           Le voile n'est pas une surface de la rampe et n'a pas de jeton : c'est un
           NOIR TRANSPARENT, la même chose dans les deux thèmes. Ce qu'il doit être,
           c'est identique à lui-même partout. */
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-200 ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />

      <SheetContent
        ref={panelRef}
        side="left"
        className="z-50 w-80 gap-0 border-r border-border-subtle bg-panel p-0 shadow-overlay sm:max-w-80"
      >
        {/* ── En-tête ──────────────────────────────────────────────────────── */}
        <SheetHeader className="flex-row items-center justify-between gap-2 space-y-0 border-b border-border-subtle px-3 py-2.5 pr-10">
          <SheetTitle className="text-sm font-semibold text-ink">{t('Marchés')}</SheetTitle>
        </SheetHeader>

        {/* ── Champ ────────────────────────────────────────────────────────── */}
        <div className="border-b border-border-subtle p-3">
          <div className="flex items-center gap-2">
            <InputGroup size="sm">
              <InputGroupInput
                ref={inputRef}
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t('Rechercher une crypto, une action…')}
                aria-label={t('Rechercher un actif')}
              />
              <InputGroupAddon>
                <Search />
              </InputGroupAddon>
            </InputGroup>
            {query ? (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label={t('Effacer la recherche')}
                className="shrink-0 text-ink-muted transition-colors hover:text-ink"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            ) : null}
          </div>

          {/* Puces de classe. Elles filtrent AUSSI les tendances, sans quoi choisir
              « Actions » sur un champ vide laisserait une liste de cryptos sous une
              puce qui annonce le contraire. */}
          <div className="mt-2 flex flex-wrap gap-1">
            {FILTERS.map((entry) => (
              <button
                key={entry.label}
                type="button"
                onClick={() => setFilter(entry.id)}
                aria-pressed={filter === entry.id}
                className={`h-6 px-2 text-[0.6875rem] font-medium transition-colors duration-150 ${
                  filter === entry.id
                    ? 'bg-brand-soft text-brand-strong'
                    : 'text-ink-muted hover:bg-surface-muted hover:text-ink'
                }`}
              >
                {t(entry.label)}
              </button>
            ))}
          </div>
        </div>

        {/* ── Liste ────────────────────────────────────────────────────────── */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {!searching ? (
            <Section
              title={t('Tendances')}
              icon={<TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />}
            >
              {trendingShown.length > 0 ? (
                trendingShown.map((item) => (
                  <Row
                    key={item.id}
                    href={assetHref(item.assetClass, item.id)}
                    name={item.name}
                    symbol={item.symbol}
                    image={item.image}
                    rank={item.rank}
                    change24h={item.change24h}
                    current={item.id === currentId}
                    onNavigate={() => setOpen(false)}
                  />
                ))
              ) : (
                <Empty>
                  {filter
                    ? 'Aucune tendance dans cette classe pour le moment.'
                    : 'Les tendances ne sont pas disponibles.'}
                </Empty>
              )}
            </Section>
          ) : loading && !results ? (
            <Empty>{t('Recherche…')}</Empty>
          ) : found.length > 0 ? (
            <Section title={`${found.length} résultat${found.length > 1 ? 's' : ''}`}>
              {found.map((item) => (
                <Row
                  key={`${item.assetClass}-${item.id}`}
                  href={assetHref(item.assetClass, item.id)}
                  name={item.name}
                  symbol={item.symbol}
                  image={item.image}
                  rank={item.rank}
                  current={item.id === currentId}
                  onNavigate={() => setOpen(false)}
                />
              ))}
            </Section>
          ) : (
            <Empty>Aucun actif ne correspond à « {query.trim()} ».</Empty>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

function Section({
  title,
  icon,
  children,
}: {
  title: string
  icon?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section>
      <h3 className="sticky top-0 z-10 flex items-center gap-1.5 bg-panel px-3 py-1.5 text-micro font-semibold uppercase tracking-wider text-ink-muted">
        {icon}
        {title}
      </h3>
      <ul>{children}</ul>
    </section>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="px-3 py-6 text-center text-xs text-ink-muted">{children}</p>
}

function Row({
  href,
  name,
  symbol,
  image,
  rank,
  change24h,
  current,
  onNavigate,
}: {
  href: string
  name: string
  symbol: string
  image?: string
  rank?: number
  change24h?: number
  /** Fiche actuellement ouverte — surlignée, et non masquée. */
  current: boolean
  onNavigate: () => void
}) {
  return (
    <li>
      <Link
        href={href}
        onClick={onNavigate}
        aria-current={current ? 'page' : undefined}
        className={`flex items-center gap-2.5 px-3 py-2 transition-colors duration-150 ${
          // L'actif courant reste dans la liste plutôt que d'en être retiré : sa
          // disparition ferait douter de l'exhaustivité des résultats, et le voir
          // surligné situe immédiatement où l'on se trouve dans le classement.
          current ? 'bg-brand-soft' : 'hover:bg-surface-muted'
        }`}
      >
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element -- vignettes 22px hors domaines optimisés
          <img src={image} alt="" width={22} height={22} className="shrink-0" loading="lazy" />
        ) : (
          <span
            className="flex h-[22px] w-[22px] shrink-0 items-center justify-center bg-brand-soft text-[0.5625rem] font-bold text-brand-strong"
            aria-hidden="true"
          >
            {monogram(name, symbol)}
          </span>
        )}

        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-medium text-ink">{name}</span>
          <span className="block text-micro uppercase text-ink-muted">
            {symbol}
            {rank !== undefined ? <span className="tabular"> · #{rank}</span> : null}
          </span>
        </span>

        {change24h !== undefined ? (
          <span className="tabular shrink-0 text-[0.6875rem]">
            <ChangeBadge value={change24h} size="sm" />
          </span>
        ) : (
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-ink-muted" aria-hidden="true" />
        )}
      </Link>
    </li>
  )
}
