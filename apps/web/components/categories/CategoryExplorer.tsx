'use client'

import { Search } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { useMemo, useState } from 'react'

import {
  Combobox,
  ComboboxContent,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@/components/ui/combobox'
import { InputGroupAddon } from '@/components/ui/input-group'

import type { MarketCategory } from '@zenkuu/data'
import { ChangeBadge, EmptyState } from '@zenkuu/ui'

import { BoardCurrency } from '@/components/market/BoardCurrency'
import { Money } from '@/components/locale/Money'
import { SortableHeader } from '@/components/ui/SortableTable'
import { usePhrase } from '@/components/locale/ContentProvider'

type SortKey = 'marketCap' | 'volume' | 'change' | 'name'
type Direction = 'asc' | 'desc'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * L'ANNUAIRE DES SECTEURS — UN TITRE, UN CHAMP, UN TABLEAU
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── CE QUI A ÉTÉ RETIRÉ, ET POURQUOI ────────────────────────────────────────
 *
 * La page portait, au-dessus de ce tableau : quatre repères chiffrés, une bande de
 * « secteurs en forte hausse », une bande de faits saillants, une rangée de pastilles
 * de tri, une bascule grille/tableau, une pagination, et une bande méthodologique.
 * Sept blocs pour une page dont la question est « quels secteurs, dans quel ordre ».
 *
 * La référence retenue (DropsTab) n'en garde que trois — un titre, un champ de
 * recherche, un tableau — et c'est la forme demandée. Chacun des blocs supprimés
 * répondait à une question que le tableau répond DÉJÀ, et mieux : les plus fortes
 * hausses sont un tri sur la colonne de variation, les repères chiffrés sont un
 * décompte de lignes.
 *
 * ── PAS DE PAGINATION : LA RÉFÉRENCE N'EN A PAS ─────────────────────────────
 *
 * Elle affiche ses cent vingt-cinq secteurs d'un seul tenant. Le nôtre en tient
 * autant que la source en valorise, dans une seule page : la source les livre TOUS
 * dans un appel unique, la pagination ne faisait donc économiser aucun octet réseau —
 * seulement des lignes de HTML, au prix d'un clic entre chaque cinquantaine.
 *
 * ⚠️ LES SECTEURS SANS CAPITALISATION SONT ÉCARTÉS. La source publie environ sept
 * cent cinquante entrées, dont la moitié sont des rubriques de taxonomie ne portant
 * aucun actif valorisé — ni capitalisation, ni volume, ni composant (vérifié sur la
 * réponse brute). Les afficher alignerait des centaines de lignes de tirets. Le
 * filtrage se fait dans la page, qui l'annonce sous le titre.
 */
export function CategoryExplorer({
  categories,
  /**
   * Capitalisation MONDIALE en dollars, pour la colonne de dominance.
   *
   * ⚠️ Elle ne vient PAS de la somme de ce tableau et ne pourrait pas en venir : un
   * actif appartient à plusieurs secteurs à la fois — Bitcoin relève de « Layer 1 »
   * comme de « Proof of Work » — et additionner les colonnes le compterait deux fois.
   * C'est l'agrégat global publié par la source, dédupliqué par construction.
   *
   * `null` quand cet agrégat manque : la colonne affiche alors des tirets plutôt
   * qu'un rapport calculé sur un dénominateur inventé (§5).
   */
  totalMarketCap,
  /**
   * Filtre PRÉ-REMPLI à l'ouverture, et modifiable ensuite.
   *
   * Il sert à `/categories/ecosystemes`, qui n'est pas une autre page mais la même
   * ouverte sur « Ecosystem ». Une valeur INITIALE et non contrôlée : le lecteur doit
   * pouvoir l'effacer et retrouver la liste entière sans changer d'adresse — sans quoi
   * la page pré-filtrée serait une impasse.
   *
   * ⚠️ Passer par une prop plutôt que par `?filtre=` dans l'URL est ce qui garde les
   * deux pages STATIQUES : lire un paramètre de requête ferait basculer la route en
   * rendu dynamique, et lui coûterait son cache de trois minutes.
   */
  defaultQuery = '',
}: {
  categories: MarketCategory[]
  totalMarketCap: number | null
  defaultQuery?: string
}) {
  const t = usePhrase()
  const [query, setQuery] = useState(defaultQuery)
  const [panelOpen, setPanelOpen] = useState(false)
  const [sort, setSort] = useState<SortKey>('marketCap')
  const [direction, setDirection] = useState<Direction>('desc')

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const filtered = needle
      ? categories.filter(
          (category) =>
            category.name.toLowerCase().includes(needle) ||
            // La recherche couvre aussi la définition du secteur : « prêt » doit
            // trouver « Lending/Borrowing » même si le mot n'est pas dans le nom.
            category.description?.toLowerCase().includes(needle),
        )
      : categories

    // Copie avant tri : `sort` mute en place, et muter la prop réordonnerait la
    // liste du parent à chaque rendu.
    const sorted = [...filtered].sort((a, b) => {
      switch (sort) {
        case 'name':
          return a.name.localeCompare(b.name, 'fr')
        case 'change':
          // Les valeurs absentes partent TOUJOURS en fin de liste, quel que soit le
          // sens du tri : une donnée manquante n'est ni la plus forte hausse ni la
          // plus forte baisse, et la faire remonter en tête croissant serait faux.
          return compare(a.marketCapChange24h, b.marketCapChange24h)
        case 'volume':
          return compare(a.volume24h, b.volume24h)
        default:
          return compare(a.marketCap, b.marketCap)
      }
    })

    return direction === 'desc' ? sorted : reverseKeepingMissingLast(sorted, sort)
  }, [categories, query, sort, direction])

  function applySort(key: SortKey) {
    if (key === sort) {
      setDirection((current) => (current === 'desc' ? 'asc' : 'desc'))
    } else {
      setSort(key)
      // Un nouveau critère repart en décroissant — l'ordre attendu d'un classement —
      // sauf le nom, qui se lit naturellement de A à Z.
      setDirection(key === 'name' ? 'asc' : 'desc')
    }
  }

  return (
    <section className="space-y-4" aria-labelledby="explorer-secteurs">
      <h2 id="explorer-secteurs" className="sr-only">
        {t('Tous les secteurs')}
      </h2>

      {/* Le filtre à gauche, la devise à droite, sur une seule bande — la disposition
          de la référence. Le champ reste COURT : c'est un filtre, pas la commande
          principale de la page. Étalé sur toute la largeur, il passerait pour une
          recherche de site. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/*
          ⚠️ `items={[]}` et `filter={null}` : la liste et son filtrage vivent dans
          `visible` — le composant ne sert qu'à tenir l'ouverture, la navigation au
          clavier et le positionnement. Même montage que `AssetPicker`, dont l'en-tête
          détaille pourquoi.

          Le champ est ICI le déclencheur, donc HORS du panneau : le chevron par défaut
          est celui qu'on veut, et l'ancrage vicieux décrit dans `AssetPicker` — un
          panneau qui s'ancre sur un élément de lui-même — ne peut pas se produire.
        */}
        <Combobox
          open={panelOpen}
          onOpenChange={setPanelOpen}
          inputValue={query}
          onInputValueChange={(value: string) => {
            setQuery(value)
            /* Taper ROUVRE le panneau : après avoir choisi un secteur, le lecteur qui
               corrige sa saisie attend de revoir la liste, pas un champ muet. */
            setPanelOpen(true)
          }}
          filter={null}
          items={[]}
        >
          {/*
            ⚠️ L'OUVERTURE EST PILOTÉE À LA MAIN, et `openOnInputClick` ne suffit pas.

            La collection que Base UI connaît est `items={[]}` — le filtrage est le
            nôtre. Il en déduit une liste vide (`data-list-empty` sur le champ, relevé
            au navigateur) et REFUSE d'ouvrir : le clic ne produisait rien du tout.
            L'état `open` étant contrôlé, le poser nous-mêmes passe outre.
          */}
          <ComboboxInput
            placeholder={t('Filtrer les catégories…')}
            aria-label={t('Filtrer les secteurs par nom ou par définition')}
            className="h-8 w-full max-w-[16rem] text-sm"
            onClick={() => setPanelOpen(true)}
          >
            <InputGroupAddon align="inline-start">
              <Search className="h-3.5 w-3.5 text-ink-muted" />
            </InputGroupAddon>
          </ComboboxInput>

          <ComboboxContent className="border border-border-subtle bg-overlay shadow-overlay">
            <ComboboxList className="max-h-72">
              {/*
                ⚠️ `Combobox.Empty` NE PEUT PAS SERVIR : il se règle sur la collection
                que Base UI connaît, et cette collection est `items={[]}`. Il tiendrait
                donc la liste pour vide en permanence, au-dessus des entrées visibles.
                `visible` est la seule source qui sache ce qui est réellement rendu.
              */}
              {visible.length === 0 ? (
                <p className="px-3 py-6 text-center text-sm text-ink-muted">
                  {t('Aucun secteur ne correspond')}
                </p>
              ) : null}

              {visible.map((category) => (
                <ComboboxItem
                  key={category.id}
                  /*
                   * ⚠️ `value` PORTE LE NOM, PAS L'IDENTIFIANT.
                   *
                   * Base UI écrit lui-même la `value` de l'item choisi dans le champ,
                   * APRÈS notre `onClick`. Avec l'identifiant, « Layer 1 (L1) » y
                   * déposait son slug `layer-1` — que le filtre, qui compare au nom,
                   * ne retrouvait pas : le tableau se vidait au lieu de se réduire au
                   * secteur demandé. Relevé au navigateur.
                   *
                   * Le nom fait donc les deux : identité de l'item pour Base UI, et
                   * terme de filtre pour nous.
                   */
                  value={category.name}
                  /* Le clic REMPLACE le filtre par le nom exact : le tableau se réduit
                     alors à ce secteur, et le champ montre pourquoi. Le lecteur peut
                     l'effacer pour retrouver la liste entière. */
                  onClick={() => {
                    setQuery(category.name)
                    setPanelOpen(false)
                  }}
                  className="px-3 py-2 text-sm"
                >
                  {category.name}
                </ComboboxItem>
              ))}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>

        {/* Même sélecteur que le tableau de cotations, et même préférence de site :
            changer de devise ici la change partout (voir `BoardCurrency`). */}
        <BoardCurrency />
      </div>

      {query.trim() ? (
        <p className="text-xs text-ink-muted" aria-live="polite">
          {visible.length} secteur{visible.length > 1 ? 's' : ''} correspondant à «{' '}
          {query.trim()} »
        </p>
      ) : null}

      {visible.length === 0 ? (
        <EmptyState
          title={t('Aucun secteur ne correspond')}
          description={t('Essayez un autre terme, ou effacez le filtre.')}
          compact
        />
      ) : (
        <CategoryTable
          categories={visible}
          totalMarketCap={totalMarketCap}
          sort={sort}
          direction={direction}
          onSort={applySort}
        />
      )}
    </section>
  )
}

/** Tri numérique décroissant, valeurs absentes rejetées en fin de liste. */
function compare(a: number | undefined, b: number | undefined): number {
  if (a === undefined && b === undefined) return 0
  if (a === undefined) return 1
  if (b === undefined) return -1
  return b - a
}

/**
 * Inversion du sens qui GARDE les valeurs absentes en dernier.
 *
 * Un simple `.reverse()` les remonterait en tête du tri croissant, où elles
 * passeraient pour les plus petites valeurs — alors qu'elles ne sont pas des valeurs.
 */
function reverseKeepingMissingLast(sorted: MarketCategory[], sort: SortKey): MarketCategory[] {
  if (sort === 'name') return [...sorted].reverse()

  const field: keyof MarketCategory =
    sort === 'change' ? 'marketCapChange24h' : sort === 'volume' ? 'volume24h' : 'marketCap'

  const rated = sorted.filter((category) => category[field] !== undefined)
  const missing = sorted.filter((category) => category[field] === undefined)
  return [...rated.reverse(), ...missing]
}

function CategoryTable({
  categories,
  totalMarketCap,
  /*
   * LES EN-TÊTES SONT LA SEULE COMMANDE DE TRI.
   *
   * La rangée de pastilles qui doublait ce tri a disparu avec le reste de l'habillage :
   * c'est sur l'en-tête de colonne qu'on clique d'instinct, et deux commandes pour un
   * même état sont deux occasions de les voir se contredire.
   */
  sort,
  direction,
  onSort,
}: {
  categories: MarketCategory[]
  totalMarketCap: number | null
  sort: SortKey
  direction: Direction
  onSort: (key: SortKey) => void
}) {
  const t = usePhrase()
  /* L'état du tri est porté ici par DEUX variables — clé et sens — là où le composant
     partagé n'en attend qu'une. On les assemble plutôt que de refondre l'explorateur :
     sa logique de tri gère des cas que le mécanisme générique ne connaît pas, comme le
     nom qui repart en croissant quand tous les autres repartent en décroissant. */
  const sortState = { key: sort, direction }

  return (
    /*
     * SANS CADRE NI FILETS DE LIGNES — la forme de la référence.
     *
     * Le tableau portait un encadré arrondi, un filet sous l'en-tête et un filet entre
     * chaque ligne. Trois traits pour séparer ce que l'alignement des colonnes sépare
     * déjà : sur une grille de nombres cadrés à droite, la structure se lit dans les
     * chiffres, pas dans les traits qui les entourent.
     *
     * Ce qui RESTE : le survol de ligne, qui est la seule séparation dont un lecteur
     * a besoin — celle de la ligne qu'il suit du regard — et un filet sous l'en-tête,
     * qui ancre les libellés de colonnes. Les retirer TOUS ferait flotter les en-têtes
     * au-dessus des données sans les rattacher à rien.
     */
    <div className="overflow-x-auto">
      {/* Colonnes prioritaires sous `sm` — voir la note de `MarketTable`. */}
      <table className="w-full border-collapse text-sm sm:min-w-[720px]">
        <caption className="sr-only">{t('Secteurs de marché')}</caption>
        <thead>
          <tr className="border-b border-border-subtle text-left text-[length:var(--v2-text-2xs)] font-semibold text-ink-muted">
            <th scope="col" className="hidden px-3 py-2.5 font-medium sm:table-cell">#</th>
            <SortableHeader
              label={t('Secteur')}
              sortKey="name"
              align="left"
              sort={sortState}
              onToggle={onSort}
            />
            <SortableHeader
              label={t('Variation 24 h')}
              sortKey="change"
              sort={sortState}
              onToggle={onSort}
            />
            <SortableHeader
              label={t('Volume 24 h')}
              sortKey="volume"
              className="hidden md:table-cell"
              sort={sortState}
              onToggle={onSort}
            />
            <SortableHeader
              label={t('Capitalisation')}
              sortKey="marketCap"
              sort={sortState}
              onToggle={onSort}
            />
            {/* « Dominance » n'est PAS triable : elle est la capitalisation divisée
                par une constante, donc le même ordre que la colonne voisine. Deux
                en-têtes qui produisent le même classement laisseraient croire à deux
                critères. */}
            <th scope="col" className="hidden px-3 py-2.5 text-right font-medium lg:table-cell">
              {t('Dominance')}
            </th>
          </tr>
        </thead>
        <tbody>
          {categories.map((category, index) => (
            <tr key={category.id} className="transition-colors hover:bg-surface-muted/60">
              <td className="tabular hidden px-3 py-2.5 text-xs text-ink-muted sm:table-cell">
                {index + 1}
              </td>
              <th scope="row" className="px-3 py-2.5 text-left font-medium">
                {/* Logos AVANT le nom, comme chez la référence : ils disent en un coup
                    d'œil de quel secteur il s'agit, souvent avant que le nom soit lu.
                    Le nom porte le lien, pas la ligne entière — la cellule contient
                    déjà les logos, eux-mêmes cliquables, et deux zones cliquables
                    imbriquées produisent un HTML invalide et un piège au clavier. */}
                <span className="flex items-center gap-2">
                  <TopAssets category={category} />
                  <Link
                    href={`/categories/${category.id}`}
                    /* `inline-flex items-center` et non le `inline` par défaut : le
                       plancher tactile de globals.css repose sur `min-height`, qui n'a
                       AUCUN effet sur une boîte en ligne. */
                    className="inline-flex items-center text-ink transition-colors hover:text-brand hover:underline"
                  >
                    {category.name}
                  </Link>
                </span>
              </th>
              <td className="px-3 py-2.5 text-right">
                <ChangeBadge value={category.marketCapChange24h} size="sm" />
              </td>
              {/* `Money` et non `formatCurrency(…, 'USD')` : ce tableau était le seul
                  du site à ignorer la devise choisie par le visiteur. La source cote
                  bien en dollars — c'est ce que dit `from` — mais l'affichage suit la
                  préférence, comme partout ailleurs (§5 : l'origine reste nommée). */}
              <td className="tabular hidden px-3 py-2.5 text-right text-ink-muted md:table-cell">
                <Money value={category.volume24h} from="USD" compact />
              </td>
              <td className="tabular px-3 py-2.5 text-right text-ink">
                <Money value={category.marketCap} from="USD" compact />
              </td>
              <td className="tabular hidden px-3 py-2.5 text-right text-ink-muted lg:table-cell">
                {dominance(category.marketCap, totalMarketCap)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Part du secteur dans la capitalisation mondiale — voir la note de `totalMarketCap`. */
function dominance(marketCap: number | undefined, total: number | null): string {
  if (marketCap === undefined || !total) return '—'
  return `${((marketCap / total) * 100).toFixed(2)} %`
}

/**
 * Logos des trois principaux actifs, CLIQUABLES vers leur fiche.
 *
 * Ils étaient auparavant purement décoratifs, faute d'identifiants. La source les
 * publie dans la même réponse : les rendre cliquables transforme un ornement en
 * point d'entrée, sans coût. Le nom accompagne chaque lien en lecture d'écran seule —
 * une image sans texte alternatif ne serait pas atteignable au clavier.
 */
export function TopAssets({ category }: { category: MarketCategory }) {
  const logos = category.topAssets ?? []
  const ids = category.topAssetIds ?? []
  if (logos.length === 0) return <span className="text-xs text-ink-muted">—</span>

  return (
    <span className="flex items-center gap-1">
      {logos.map((src, index) => {
        const id = ids[index]

        const image = (
          // eslint-disable-next-line @next/next/no-img-element -- logos distants
          <img
            src={src}
            alt=""
            aria-hidden="true"
            loading="lazy"
            width={20}
            height={20}
            className="h-5 w-5 rounded-pill border border-surface bg-surface-muted object-contain"
          />
        )

        // Sans identifiant, le logo reste une vignette : mieux vaut une image inerte
        // qu'un lien vers une page qui n'existe pas.
        return id ? (
          <Link
            key={`${category.id}-${id}`}
            href={`/crypto/${id}`}
            className="transition-opacity hover:opacity-75"
          >
            {image}
            <span className="sr-only">{id}</span>
          </Link>
        ) : (
          <span key={`${category.id}-${index}`}>{image}</span>
        )
      })}
    </span>
  )
}
