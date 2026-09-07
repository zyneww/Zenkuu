'use client'

import { useMemo, useState } from 'react'

import { ChangeBadge } from '@/components/locale/ChangeBadge'
import { EmptyState, type Formatters } from '@zenkuu/ui'

import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react'

import { Search } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Link } from '@/i18n/navigation'
import { Field, FieldLabel } from '@/components/ui/field'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Slider } from '@/components/ui/slider'
import { useCurrency } from '@/components/locale/CurrencyProvider'
import { Money } from '@/components/locale/Money'
import { ExportMenu } from '@/components/tools/ExportMenu'
import { SavedScreens } from '@/components/tools/SavedScreens'
import type {
  ScreenerColumn,
  ScreenerFilter,
  ScreenerMarket,
  ScreenerRow,
} from '@/components/tools/screener-markets'
import type { ScreenCriteria } from '@/lib/screen-actions'
import { usePhrase } from '@/components/locale/ContentProvider'
import { ScreenerFilterPanel } from '@/components/tools/ScreenerFilterPanel'
import { emphasise } from '@/components/locale/emphasise'
import { useFormatters } from '@/components/locale/useFormatters'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * LE SCREENER — un seul outil, six marchés
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Tout se passe CÔTÉ CLIENT sur les lignes reçues avec la page. C'est le choix qui
 * rend l'outil utilisable : un filtre servi par le serveur ferait un aller-retour par
 * mouvement de curseur, et aucune de nos sources ne tolère cette cadence. En
 * contrepartie, le périmètre est borné — et il est écrit, parce qu'un screener qui
 * laisse croire qu'il balaie tout un marché alors qu'il en voit une tranche ment sur
 * son résultat (§5).
 *
 * ── CE COMPOSANT NE CONNAÎT AUCUN MARCHÉ ─────────────────────────────────────
 *
 * Il ne sait ni ce qu'est une action, ni ce qu'est un pool. Il reçoit des LIGNES
 * normalisées — un nom, une devise, un sac de nombres indexés par clé — et un
 * DESCRIPTEUR qui dit quelles colonnes montrer, quels filtres offrir et quels
 * préréglages proposer. Voir `screener-markets.ts`, où vivent les six.
 *
 * C'était auparavant un composant crypto : cinq colonnes, quatre préréglages et sept
 * variables d'état écrites en dur. Chaque marché supplémentaire aurait été une copie du
 * fichier, et six copies d'un tri à trois états divergent au premier correctif.
 *
 * ── LES SEUILS SONT DES MINIMUMS, SAUF QUAND ILS SONT DES MAXIMUMS ───────────
 *
 * Sur des grandeurs qui s'étalent sur six ordres de grandeur — une capitalisation, un
 * volume — une borne haute ne sert pratiquement jamais, et deux curseurs par critère
 * doublent la charge sans gain. Deux grandeurs font exception et se filtrent par le
 * HAUT : le PER et les frais de gestion, où la question est « pas plus cher que ». Le
 * descripteur le déclare par filtre.
 */

/** Ramène un seuil dans les bornes de son barème. */
function clampIndex(value: number, max: number): number {
  return Math.min(Math.max(Math.round(value), 0), max)
}

/** Seuil neutre d'un filtre — celui qui ne retient rien. */
/** Le seuil d'un filtre : un nombre, ou une paire pour une fourchette. */
type Seuil = number | [number, number]

function neutralOf(filter: ScreenerFilter): Seuil {
  /* Le neutre d'une FOURCHETTE, ce sont ses deux bornes : elle ne retient rien tant
     qu'elle couvre toute l'étendue. */
  if (filter.direction === 'range') return [filter.min ?? 0, filter.max ?? 0]
  if (filter.steps) return 0
  return filter.direction === 'max' ? (filter.max ?? 0) : (filter.min ?? 0)
}

/** Le seuil courant filtre-t-il réellement quelque chose ? */
function isActive(filter: ScreenerFilter, value: Seuil): boolean {
  const neutre = neutralOf(filter)
  /* Une fourchette est active dès qu'UNE de ses bornes a bougé : resserrer par le bas
     filtre autant que resserrer par le haut. */
  if (Array.isArray(value) && Array.isArray(neutre)) {
    return value[0] !== neutre[0] || value[1] !== neutre[1]
  }
  return value !== neutre
}

/* `nombres` en argument : ces deux aides vivent hors du composant — `displayThreshold`
   est appelée depuis le rendu d'un curseur, mais aussi récursivement pour chaque borne
   d'une fourchette. Un crochet y serait illégal ; le paramètre rend visible dans la
   signature que la mise en forme suit la langue. */
function compactAmount(value: number, nombres: Formatters): string {
  return nombres.compact(value) ?? String(value)
}

/**
 * Libellé du seuil, tel qu'il s'affiche à droite du curseur.
 *
 * `currency` est la devise du SITE, passée par l'appelant : un seuil marqué
 * `currency` s'écrit dans l'unité que le tableau affiche, faute de quoi le nombre du
 * curseur et celui de la colonne ne parleraient pas de la même chose.
 */
function displayThreshold(
  filter: ScreenerFilter,
  value: Seuil,
  currency: string,
  nombres: Formatters,
): string {
  if (!isActive(filter, value)) return 'aucun'

  /* Une FOURCHETTE s'annonce par ses deux bornes, séparées d'un tiret demi-cadratin :
     « −10 % – −2 % ». Chaque borne est mise en forme par le même code que le seuil
     simple, en réentrant ici — sinon les deux affichages divergeraient au premier
     changement d'unité ou de devise. */
  if (Array.isArray(value)) {
    const borne = (n: number) => displayThreshold(filter, n, currency, nombres)
    return `${borne(value[0])} – ${borne(value[1])}`
  }

  const prefix = filter.direction === 'max' ? '≤ ' : ''

  if (filter.currency) {
    return `${prefix}${nombres.currency(value, currency, { compact: true }) ?? compactAmount(value, nombres)}`
  }

  const unit = filter.unit ?? ''
  const amount = filter.steps
    ? compactAmount(value, nombres)
    : (nombres.number(value, Number.isInteger(value) ? 0 : 2) ?? String(value))

  /* Une unité qui commence par une lettre ou un espace se colle sans blanc
     supplémentaire — « 15 ans », « /10 » — là où un symbole en demande un. */
  const gap = unit === '' || unit.startsWith('/') || unit.startsWith(' ') ? '' : ' '
  return `${prefix}${amount}${gap}${unit}`
}

export function ScreenerView({
  rows: source,
  market,
  /** Population totale interrogée, avant tout filtre. */
  total,
}: {
  rows: ScreenerRow[]
  market: ScreenerMarket
  total: number
}) {
  const t = usePhrase()
  const [preset, setPreset] = useState('tout')
  const [query, setQuery] = useState('')


  /* La devise du site sert DEUX fois : à écrire les seuils monétaires, et à les
     comparer. Les deux doivent passer par la même conversion, sinon le curseur
     annonce une échelle et le filtre en applique une autre. */
  const { currency, convert } = useCurrency()

  /**
   * Seuils courants, un par filtre du marché.
   *
   * Un seul objet et non une variable par curseur : le descripteur décide du nombre de
   * filtres, et un composant ne peut pas déclarer un nombre variable de `useState`.
   *
   * Les valeurs sont les GRANDEURS elles-mêmes — mille millions, pas « cran 3 ». C'est
   * ce qui permet à un préréglage de poser exactement ce qu'un curseur poserait, et à
   * un écran enregistré de survivre à un changement de barème : ajouter un cran
   * déplacerait tous les indices, jamais les montants.
   */
  /* `Seuil` et non `number` : un filtre en fourchette en porte DEUX. Le type dit ce
     que la table contient réellement, plutôt que de laisser chaque lecteur deviner. */
  const [thresholds, setThresholds] = useState<Record<string, Seuil>>({})

  /*
   * ══════════════════════════════════════════════════════════════════════════
   * CHARGEMENT PROGRESSIF, ET NON PAGINATION
   * ══════════════════════════════════════════════════════════════════════════
   *
   * Le tableau était paginé — cinquante lignes, un pied avec numéros de page et un
   * sélecteur de densité. C'est la forme juste pour une LISTE qu'on consulte, et la
   * mauvaise pour un CRIBLE qu'on parcourt, ce qui est la différence entre les deux
   * usages :
   *
   *   · ON NE SAUTE PAS À LA PAGE 7 D'UN SCREENER. On descend jusqu'à ce qu'on ait
   *     assez vu. Les numéros de page servaient donc une navigation que personne
   *     n'exerce ici.
   *
   *   · LA PAGINATION FAIT PERDRE CE QU'ON VIENT DE LIRE. Comparer la douzième ligne
   *     à la cinquante-troisième demande deux allers-retours, et à chacun l'écran
   *     recommence en haut. Un ajout à la suite garde les deux à l'écran.
   *
   * C'est aussi ce que font TradingView et Backpack, dont la référence a été demandée.
   *
   * ⚠️ TOUT RESTE EN MÉMOIRE, IL N'Y A AUCUN APPEL RÉSEAU DERRIÈRE CE BOUTON. Les
   * lignes sont déjà toutes là — le serveur les a servies avec la page. Le bouton ne
   * fait qu'en dévoiler davantage, et c'est pourquoi il n'a ni état d'attente ni
   * message d'erreur : il ne peut pas échouer.
   */
  const PAS = 50
  const [affichees, setAffichees] = useState(PAS)
  const [columnSetId, setColumnSetId] = useState(market.columnSets[0]!.id)

  /*
   * Tri courant.
   *
   * `null` = l'ordre de la source. Ce n'est pas un tri « par défaut » sur une colonne :
   * c'est l'ABSENCE de tri, et la distinction se voit — aucune flèche n'est allumée. Un
   * troisième clic sur un en-tête y revient, ce qui donne un moyen de revenir en
   * arrière sans recharger la page.
   */
  const [sort, setSort] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null)

  const columnSet =
    market.columnSets.find((entry) => entry.id === columnSetId) ?? market.columnSets[0]!

  function thresholdOf(filter: ScreenerFilter): Seuil {
    return thresholds[filter.key] ?? neutralOf(filter)
  }

  /* Les clés dont le seuil filtre RÉELLEMENT. Elles ouvrent leur groupe dans le
     panneau et y affichent un compte : un filtre qui agit sans se voir est le pire cas
     — la liste est réduite et rien à l'écran ne dit pourquoi. */
  const filtresActifs = useMemo(
    () =>
      new Set(
        market.filters.filter((f) => isActive(f, thresholdOf(f))).map((f) => f.key),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `thresholdOf` lit `thresholds`
    [market.filters, thresholds],
  )

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase()

    return source.filter((row) => {
      if (needle && !`${row.name} ${row.symbol}`.toLowerCase().includes(needle)) return false

      for (const filter of market.filters) {
        const threshold = thresholds[filter.key] ?? neutralOf(filter)
        if (!isActive(filter, threshold)) continue

        const raw = row.values[filter.key]
        /*
         * UN CRITÈRE PORTÉ SUR UNE DONNÉE ABSENTE EXCLUT LA LIGNE.
         *
         * « PER au plus 15 » ne peut pas être satisfait par une société dont le PER
         * n'est pas publié — Yahoo n'en publie pas quand la société perd de l'argent,
         * et laisser passer ces lignes remplirait un filtre « peu chères » de sociétés
         * déficitaires. L'absence n'est ni un zéro ni un laissez-passer (§5).
         */
        if (raw === undefined) return false

        /* UN SEUIL MONÉTAIRE SE COMPARE DANS LA DEVISE AFFICHÉE, et la conversion part
           de la devise DÉCLARÉE PAR LA LIGNE : elle varie d'une place de cotation à
           l'autre sur les actions, et comparer un montant en yens à un seuil en euros
           écarterait toute la cote de Tokyo. */
        const value = filter.currency ? convert(raw, row.currency) : raw

        if (Array.isArray(threshold)) {
          /* Les deux bornes sont INCLUSIVES : « entre −10 et −2 % » retient une ligne à
             exactement −10. Un lecteur qui pose une borne s'attend à ce qu'elle
             appartienne à ce qu'il a demandé. */
          if (value < threshold[0] || value > threshold[1]) return false
        } else if (filter.direction === 'max') {
          if (value > threshold) return false
        } else if (value < threshold) return false
      }

      return true
    })
  }, [source, market.filters, thresholds, query, convert])

  /*
   * ── TRI, APPLIQUÉ APRÈS LE FILTRE ─────────────────────────────────────────
   *
   * Dans cet ordre et pas l'autre : trier mille lignes pour n'en garder ensuite que
   * douze serait du travail jeté à chaque mouvement de curseur.
   *
   * Les lignes SANS VALEUR sont rejetées en fin de liste dans les deux sens. Les
   * traiter comme des zéros les ferait remonter en tête d'un tri croissant, où elles se
   * liraient comme les plus petites valeurs du marché — alors qu'elles ne sont pas
   * mesurées (§5).
   */
  const sortedRows = useMemo(() => {
    if (!sort) return rows

    const direction = sort.direction === 'asc' ? 1 : -1

    return [...rows].sort((a, b) => {
      const left = a.values[sort.key]
      const right = b.values[sort.key]

      if (left === undefined && right === undefined) return 0
      if (left === undefined) return 1
      if (right === undefined) return -1

      return direction * (left - right)
    })
  }, [rows, sort])

  /**
   * Trois états par colonne : décroissant, croissant, aucun tri.
   *
   * Le premier clic donne le DÉCROISSANT et non le croissant, contrairement à
   * l'habitude des tableaux de fichiers. Sur des grandeurs de marché, « montre-moi les
   * plus gros » est la question qu'on pose en cliquant sur « Capitalisation » ;
   * commencer par les plus petits obligerait à cliquer deux fois à chaque fois.
   */
  function toggleSort(key: string) {
    setSort((current) => {
      if (!current || current.key !== key) return { key, direction: 'desc' }
      if (current.direction === 'desc') return { key, direction: 'asc' }
      return null
    })
  }

  /*
   * LA FENÊTRE SE REFERME QUAND LES CRITÈRES CHANGENT.
   *
   * Sans cela, quelqu'un qui a déplié six cents lignes puis resserre un filtre garde
   * six cents lignes dépliées sur un résultat qui en compte douze — le bouton
   * disparaît, mais la position de défilement, elle, reste à mi-hauteur d'un tableau
   * qui n'existe plus.
   *
   * L'ajustement se fait PENDANT LE RENDU plutôt que dans un effet : un effet
   * peindrait d'abord l'ancien état avant de le corriger.
   */
  const signature = `${market.id}|${preset}|${query.trim()}|${JSON.stringify(thresholds)}|${sort?.key ?? ''}${sort?.direction ?? ''}`
  const [lastSignature, setLastSignature] = useState(signature)
  if (signature !== lastSignature) {
    setLastSignature(signature)
    setAffichees(PAS)
  }

  const visible = sortedRows.slice(0, affichees)
  const reste = sortedRows.length - visible.length

  function reset() {
    setPreset('tout')
    setThresholds({})
    setQuery('')
  }

  /**
   * Applique un préréglage — c'est-à-dire POSE DES SEUILS.
   *
   * Il remplace la table entière plutôt que de la compléter : deux préréglages
   * successifs cumuleraient sinon leurs seuils, et « Peu chères » après « À dividende »
   * donnerait une population qu'aucun des deux ne décrit.
   */
  function applyPreset(id: string) {
    setPreset(id)
    const entry = market.presets.find((candidate) => candidate.id === id)
    setThresholds(entry ? { ...entry.thresholds } : {})
  }

  const criteria: ScreenCriteria = { market: market.id, preset, query, thresholds }

  function applySaved(saved: ScreenCriteria) {
    /* Un écran enregistré sur un AUTRE marché ne s'applique pas ici : ses clés de
       seuil n'existent pas dans ce descripteur, et le rejouer ne filtrerait rien tout
       en allumant un préréglage inconnu. `SavedScreens` les masque déjà ; ce garde-fou
       couvre le cas d'un écran enregistré avant l'ajout des marchés. */
    if (saved.market && saved.market !== market.id) return

    const known = market.presets.some((entry) => entry.id === saved.preset)
    setPreset(known ? saved.preset : 'tout')
    setQuery(saved.query)

    /* Les seuils sont revalidés filtre par filtre : un écran enregistré avant qu'un
       filtre soit retiré porterait sinon une clé qui ne commande plus rien. */
    const next: Record<string, number> = {}
    for (const filter of market.filters) {
      const value = saved.thresholds?.[filter.key]
      if (typeof value !== 'number' || !Number.isFinite(value)) continue
      next[filter.key] = filter.steps
        ? (filter.steps[clampIndex(filter.steps.indexOf(value), filter.steps.length - 1)] ?? value)
        : value
    }
    setThresholds(next)
  }

  const filtering =
    preset !== 'tout' ||
    query !== '' ||
    market.filters.some((filter) => isActive(filter, thresholdOf(filter)))

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2" role="group" aria-label={t('Filtres rapides')}>
        {market.presets.map((entry) => (
          <button
            key={entry.id}
            type="button"
            onClick={() => applyPreset(entry.id)}
            aria-pressed={preset === entry.id}
            title={t(entry.hint)}
            className={`rounded-control border px-3 py-1.5 text-xs font-medium transition-colors duration-150 ${
              preset === entry.id
                ? 'border-brand bg-brand text-on-brand'
                : 'border-border-subtle bg-surface text-ink-muted hover:border-brand hover:text-ink'
            }`}
          >
            {t(entry.label)}
          </button>
        ))}
      </div>

      {/*
        Barre des écrans enregistrés, placée SOUS les préréglages et AU-DESSUS des
        curseurs. C'est l'ordre de lecture : « un départ rapide », puis « un départ que
        j'ai moi-même défini », puis le réglage fin.
      */}
      <SavedScreens criteria={criteria} onApply={applySaved} />

      {/* ══════════════════════════════════════════════════════════════════
          LE CHAMP DE NOM RESTE AU-DESSUS DU TABLEAU

          Il n'a rejoint aucune des sept catégories, et c'est délibéré : ce n'est pas un
          filtre de GRANDEUR mais une recherche par identité. On y tape « bit » pour
          trouver Bitcoin, pas pour restreindre une population — et une recherche se
          place là où le regard commence, pas au fond d'un groupe replié.
          ══════════════════════════════════════════════════════════════════ */}
      <div className="max-w-sm">
        {/* `Field` porte l'intitulé, `FieldLabel` le lie au champ par `htmlFor`. Un
            `<label>` écrit autour d'un `<input>` nu tient tant que la balise ne bouge
            pas ; celui-ci désigne le contrôle par son identifiant, et survit donc au
            groupe qui s'intercale entre les deux pour poser la loupe. */}
        <Field>
          <FieldLabel htmlFor="screener-nom">{t('Nom ou symbole')}</FieldLabel>
          <InputGroup size="sm">
            <InputGroupInput
              id="screener-nom"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('Filtrer…')}
            />
            <InputGroupAddon>
              <Search />
            </InputGroupAddon>
          </InputGroup>
        </Field>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          DEUX COLONNES — LE TABLEAU À GAUCHE, LES FILTRES À DROITE

          C'est la disposition de la référence, et elle règle un défaut mécanique : le
          bandeau de filtres poussait le tableau vers le bas, si bien qu'on filtrait une
          liste qu'on ne voyait plus. Côte à côte, on voit l'effet de chaque réglage au
          moment où on le fait.

          `min-w-0` sur la colonne de gauche est OBLIGATOIRE : sans lui, la largeur
          minimale d'une piste de grille est celle de son contenu, et un tableau large
          pousserait le panneau hors de l'écran au lieu de défiler dans sa propre boîte.

          Sous `xl`, le panneau repasse AU-DESSUS du tableau plutôt qu'à côté : une
          colonne de 288 px et un tableau de dix colonnes ne tiennent pas ensemble sur
          un ordinateur portable.
          ══════════════════════════════════════════════════════════════════ */}
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_288px]">
        <div className="min-w-0 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="tabular text-sm text-ink-muted" aria-live="polite">
          {/* Une PHRASE par unité, et non « {n} sur {total} » suivi d'un nom : le
              français y accorde son participe (« retenues » contre « retenus »), le
              japonais n'a rien à accorder, et le russe décline le nom après le
              nombre. Aucun assemblage de morceaux ne satisfait les trois. */}
          {emphasise(
            t(`**{n}** sur {total} ${market.unit} retenus`)
              .replace('{n}', String(rows.length))
              .replace('{total}', String(total)),
          )}
        </p>

        <div className="flex flex-wrap items-center gap-2">
          {/*
            L'export porte sur `sortedRows` ENTIER, pas sur la page affichée plus bas.
            C'est tout l'intérêt de la fonction : le tableau se lit page par page, le
            fichier n'a pas cette contrainte.

            Les colonnes exportées sont celles du JEU AFFICHÉ, et non un jeu fixe : on
            exporte ce qu'on regarde. Un fichier qui contiendrait d'autres colonnes que
            l'écran obligerait à retrouver dans le tableur ce qu'on venait de composer.
          */}
          <ExportMenu
            filename={`zenkuu-screener-${market.id}`}
            sheetName="Screener"
            rows={sortedRows}
            columns={[
              { header: t('Nom'), value: (row) => row.name },
              { header: t('Symbole'), value: (row) => row.symbol },
              { header: t('Devise'), value: (row) => row.currency ?? '' },
              ...columnSet.columns.map((column) => ({
                header: t(column.label),
                value: (row: ScreenerRow) => row.values[column.key] ?? '',
              })),
            ]}
          />

          {filtering ? (
            <Button size="xs" variant="outline" onClick={reset}>
              {t('Réinitialiser les filtres')}
            </Button>
          ) : null}
        </div>
      </div>

      {/*
        ── LA RANGÉE DE JEUX DE COLONNES ────────────────────────────────────────

        Elle se lit comme une barre d'onglets et n'en est PAS une au sens ARIA : un
        onglet change de panneau, celui-ci change les colonnes d'un même tableau. Un
        `role="tablist"` ferait annoncer « panneau 2 sur 4 » à un lecteur d'écran, qui
        chercherait ensuite un contenu qui n'existe pas. Un groupe de boutons à état
        pressé décrit exactement ce qui se passe.

        Elle est posée AU-DESSUS du tableau et sous les filtres, dans l'ordre où les
        deux questions se posent : ce que je cherche, puis ce que je veux en voir.

        Elle disparaît quand le marché n'a qu'un jeu — un sélecteur à un choix n'est
        pas un sélecteur. Le compteur, lui, reste.
      */}
      <div
        className="flex flex-wrap items-center gap-1 border-b border-border-subtle"
        role="group"
        aria-label={t('Colonnes affichées')}
      >
        {market.columnSets.length > 1
          ? market.columnSets.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => setColumnSetId(entry.id)}
                aria-pressed={entry.id === columnSet.id}
                title={t(entry.hint)}
                className={`-mb-px border-b-2 px-3 pb-2 pt-1 text-xs font-medium transition-colors duration-150 ${
                  entry.id === columnSet.id
                    ? 'border-brand text-ink'
                    : 'border-transparent text-ink-muted hover:text-ink'
                }`}
              >
                {t(entry.label)}
              </button>
            ))
          : null}

        <p className="tabular ml-auto pb-2 pr-1 text-xs text-ink-muted" aria-live="polite">
          <strong className="text-ink">{sortedRows.length}</strong> résultat
          {sortedRows.length > 1 ? 's' : ''}
        </p>
      </div>

      {sortedRows.length === 0 ? (
        <EmptyState
          title={t('Aucune ligne ne satisfait ces critères')}
          description={t('Assouplissez un seuil, ou réinitialisez les filtres.')}
          compact
        />
      ) : (
        <div className="overflow-x-auto rounded-card">
          <table className="w-full border-collapse text-sm sm:min-w-[46rem]">
            <caption className="sr-only">
              {t('Résultats du filtre — colonnes « {set} »').replace(
                '{set}',
                t(columnSet.label),
              )}
            </caption>
            <thead>
            {/* ⚠️ `[&>th]:font-semibold` ET NON `font-semibold` SEUL, ET LA MESURE
                L'A IMPOSÉ. La feuille de l'agent utilisateur porte `th { font-weight:
                bold }` : une règle qui vise LE `th`, donc elle bat toute graisse héritée
                de cette rangée. Relevé au navigateur après un premier essai — les
                en-têtes sortaient en 700 quand leurs voisins triables, qui posent la
                classe sur eux-mêmes, sortaient en 600.

                La taille et l'encre, elles, s'héritent normalement : elles restent sur
                la rangée. */}
              <tr className="border-b border-border-subtle text-left text-[length:var(--v2-text-2xs)] [&>th]:font-semibold text-ink-muted">
                <th scope="col" className="hidden px-3 py-2.5 sm:table-cell">
                  #
                </th>
                <th scope="col" className="px-3 py-2.5">
                  {market.id === 'dex' ? t('Pool') : market.id === 'cex' ? t('Place') : t('Actif')}
                </th>

                {columnSet.columns.map((column) => {
                  const active = sort?.key === column.key
                  return (
                    <th
                      key={column.key}
                      scope="col"
                      aria-sort={
                        active ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'
                      }
                      className={`px-3 py-2.5 text-right ${hiddenClass(column)}`}
                    >
                      {/*
                        L'en-tête ENTIER est le bouton, et non une icône posée à côté du
                        libellé : une cible de 12 pixels dans un tableau dense se rate
                        une fois sur trois, et le libellé est de toute façon ce que la
                        main vise.
                      */}
                      <button
                        type="button"
                        onClick={() => toggleSort(column.key)}
                        title={
                          column.hint
                            ? t(column.hint)
                            : t('Trier par {column}').replace('{column}', t(column.label))
                        }
                        className={`inline-flex w-full items-center justify-end gap-1 transition-colors duration-150 hover:text-ink ${
                          active ? 'text-ink' : ''
                        }`}
                      >
                        {t(column.label)}
                        {active ? (
                          sort.direction === 'asc' ? (
                            <ArrowUp className="h-3 w-3 shrink-0" aria-hidden="true" />
                          ) : (
                            <ArrowDown className="h-3 w-3 shrink-0" aria-hidden="true" />
                          )
                        ) : (
                          /* La double flèche est TOUJOURS présente, en retrait : sans
                             elle, rien ne dit qu'une colonne est triable, et un tableau
                             dont on ne sait pas qu'il se trie ne se trie jamais. */
                          <ChevronsUpDown
                            className="h-3 w-3 shrink-0 opacity-40"
                            aria-hidden="true"
                          />
                        )}
                      </button>
                    </th>
                  )
                })}
              </tr>
            </thead>

            <tbody className="divide-y divide-border-subtle">
              {visible.map((row, index) => (
                <tr
                  key={row.id}
                  className="group transition-colors duration-150 hover:bg-surface-muted/60"
                >
                  {/* LE RANG EST CELUI DE LA VUE, pas celui de la source. Un rang de
                      source n'aurait aucun sens après un tri par frais de gestion, et
                      la plupart de nos marchés n'en publient pas. */}
                  <td className="tabular hidden px-3 py-2.5 text-xs text-ink-muted sm:table-cell">
                    {/* Le décalage a disparu avec la pagination : la fenêtre commence
                        toujours à la première ligne, `index` EST le rang. */}
                    {index + 1}
                  </td>

                  <th scope="row" className="px-3 py-2.5 text-left font-normal">
                    <Identity row={row} />
                  </th>

                  {columnSet.columns.map((column) => (
                    <td
                      key={column.key}
                      className={`tabular px-3 py-2.5 text-right text-ink ${hiddenClass(column)}`}
                    >
                      <Cell column={column} row={row} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {sortedRows.length > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3">
          {/* LE DÉCOMPTE RESTE, et il est plus utile qu'avant : il dit à la fois où
              l'on en est et combien il reste, ce que des numéros de page ne disaient
              qu'indirectement. */}
          <p className="text-xs text-ink-muted">
            {t('{n} sur {total} lignes')
              .replace('{n}', String(visible.length))
              .replace('{total}', String(sortedRows.length))}
          </p>

          {reste > 0 ? (
            <button
              type="button"
              onClick={() => setAffichees((precedent) => precedent + PAS)}
              className="h-9 rounded-control border border-border-subtle px-4 text-xs font-medium text-ink transition-colors duration-150 hover:border-brand hover:text-brand"
            >
              {/* Le nombre EXACT qui va s'ajouter, et non « Afficher plus » : sur un
                  reste de douze lignes, promettre cinquante serait faux, et sur un reste
                  de mille, ne rien dire laisse ignorer qu'on est loin du bout. */}
              {t('Afficher {n} de plus').replace('{n}', String(Math.min(PAS, reste)))}
            </button>
          ) : null}
        </div>
      ) : null}
        </div>

        {/* ⚠️ PAS DE `order` ICI, ET J'EN AVAIS MIS UN.

            J'avais posé `xl:order-1` sur la colonne du tableau en croyant faire
            diverger l'ordre de lecture et l'ordre visuel. C'était doublement inutile :
            l'ordre voulu est le MÊME pour les deux — le tableau d'abord dans le
            balisage, à gauche à l'écran — et le balisage le donne déjà.

            Le résultat à l'écran était l'inverse de l'intention : `order-1` sur le
            premier enfant le fait passer APRÈS le second, qui reste à 0. Le tableau
            atterrissait donc dans la piste de 288 px et le panneau dans celle qui
            s'étire. Vu à l'écran, pas déduit. */}
        <ScreenerFilterPanel
          filters={market.filters}
          actives={filtresActifs}
          onReset={() => {
            setPreset('libre')
            setThresholds({})
          }}
          resetLabel={t('Tout effacer')}
          renderFilter={(filter) => (
            <FilterSlider
              filter={filter}
              currency={currency}
              value={thresholdOf(filter)}
              onChange={(value) => {
                /* Toucher un curseur ÉTEINT le préréglage : celui-ci a posé des seuils,
                   et les modifier signifie qu'on ne regarde plus sa population. */
                setPreset('libre')
                setThresholds((current) => ({ ...current, [filter.key]: value }))
              }}
            />
          )}
        />
      </div>
    </div>
  )
}

/**
 * Colonne d'identité — logo, nom, seconde ligne, symbole.
 *
 * Elle N'EST PAS toujours un lien. Les marchés boursiers balaient un millier de
 * symboles alors que nos fiches d'actif reposent sur une liste écrite à la main d'une
 * cinquantaine : lier chaque ligne produirait des centaines de 404. Une ligne sans
 * `href` reste donc inerte plutôt que de promettre une page qui n'existe pas.
 */
function Identity({ row }: { row: ScreenerRow }) {
  const body = (
    <>
      {row.image ? (
        // eslint-disable-next-line @next/next/no-img-element -- domaines de fournisseurs non déclarés
        <img
          src={row.image}
          alt=""
          loading="lazy"
          className="h-[22px] w-[22px] shrink-0 rounded-pill"
        />
      ) : null}
      {/* `flex-1` sur le nom pousse le symbole contre le bord droit de la colonne. */}
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium text-ink group-hover:text-brand">
          {row.name}
        </span>
        {row.meta ? (
          <span className="block truncate text-[0.6875rem] text-ink-muted">{row.meta}</span>
        ) : null}
      </span>
      <span className="shrink-0 text-right text-xs uppercase text-ink-muted">{row.symbol}</span>
    </>
  )

  if (!row.href) return <span className="flex min-w-0 items-center gap-3">{body}</span>

  return (
    <Link href={row.href} className="flex min-w-0 items-center gap-3">
      {body}
    </Link>
  )
}

/**
 * Une cellule, rendue selon le FORMAT déclaré par sa colonne.
 *
 * Le format et non une fonction de rendu : les descripteurs de marché traversent la
 * frontière serveur → client, et une fermeture ne s'y sérialise pas. Voir l'en-tête de
 * `screener-markets.ts`.
 */
function Cell({ column, row }: { column: ScreenerColumn; row: ScreenerRow }) {
  const nombres = useFormatters()

  const value = row.values[column.key]
  if (value === undefined || !Number.isFinite(value)) {
    return <span className="text-ink-muted">—</span>
  }

  /*
    L'UNITÉ est en retrait et non à la même graisse que le nombre : « 81,9 k BTC » se
    lit comme un montant suivi de son unité, là où deux éléments de même poids se
    liraient comme deux valeurs.

    ⚠️ L'ESPACE EST DANS LE TEXTE, pas seulement dans la marge. Une `ml-1` produit le
    bon rendu à l'écran et RIEN dans le flux textuel : la cellule se copiait « 9ans »
    et un lecteur d'écran annonçait « neufans ». L'espace insécable étroite (U+202F)
    donne les deux — le blanc typographique français, et un caractère réel.
  */
  const unit = column.unit ? (
    <span className="text-xs font-normal text-ink-muted">{` ${column.unit}`}</span>
  ) : null

  switch (column.format) {
    case 'money':
      return <Money value={value} {...(row.currency ? { from: row.currency } : {})} />
    case 'moneyCompact':
      return <Money value={value} {...(row.currency ? { from: row.currency } : {})} compact />
    case 'change':
      return <ChangeBadge value={value} size="sm" />
    case 'percent':
      return (
        <>
          {nombres.number(value, value < 10 ? 2 : 1)} %{unit}
        </>
      )
    case 'ratio':
      return (
        <>
          {nombres.number(value, 2)}
          {unit}
        </>
      )
    case 'count':
      /* Un dénombrement sous dix mille s'écrit EN ENTIER : « 1 240 transactions » se
         lit, « 1,2 k » perd la précision qu'on venait chercher. Au-delà, l'ordre de
         grandeur suffit. */
      return (
        <>
          {value < 10_000 ? nombres.number(value, 0) : nombres.compact(value)}
          {unit}
        </>
      )
    case 'year':
      /* `toFixed(0)` et non `formatNumber` : ce dernier grouperait les milliers, et
         « 2 017 » se lit comme un dénombrement plutôt que comme une année. */
      return <>{value.toFixed(0)}</>
    case 'compact':
      return (
        <>
          {nombres.compact(value)}
          {unit}
        </>
      )
  }
}

/** Classe Tailwind de masquage d'une colonne selon son point de rupture. */
function hiddenClass(column: ScreenerColumn): string {
  if (column.hideBelow === 'sm') return 'hidden sm:table-cell'
  if (column.hideBelow === 'md') return 'hidden md:table-cell'
  if (column.hideBelow === 'lg') return 'hidden lg:table-cell'
  return ''
}

/**
 * Un curseur de seuil — à paliers ou continu, selon ce que le filtre déclare.
 *
 * ── POURQUOI DEUX MÉCANIQUES DANS UN SEUL COMPOSANT ──────────────────────────
 *
 * Les grandeurs de MONTANT s'étalent sur six ordres de grandeur : un curseur linéaire
 * de zéro à cent milliards passerait quatre-vingt-dix-neuf pour cent de sa course
 * au-dessus du milliard, et le premier pixel de déplacement écarterait la moitié du
 * marché. Elles reçoivent donc un barème par crans.
 *
 * Les grandeurs BORNÉES — une variation en pourcentage, un taux de frais, une note sur
 * dix — n'ont pas ce problème : leur étendue tient dans un ordre de grandeur, et un
 * curseur continu y est plus fin qu'un barème.
 *
 * Les deux rendent le même contrôle et posent le même genre de valeur — une GRANDEUR,
 * jamais un indice — ce qui permet aux préréglages et aux écrans enregistrés d'ignorer
 * la distinction.
 */
function FilterSlider({
  filter,
  currency,
  value,
  onChange,
}: {
  filter: ScreenerFilter
  /** Devise du site — celle dans laquelle un seuil monétaire s'écrit et se compare. */
  currency: string
  value: Seuil
  onChange: (value: Seuil) => void
}) {
  const t = usePhrase()
  const nombres = useFormatters()
  const steps = filter.steps

  /*
   * ══════════════════════════════════════════════════════════════════════════
   * DEUX POIGNÉES OU UNE, SELON CE QUE LE FILTRE DÉCLARE
   * ══════════════════════════════════════════════════════════════════════════
   *
   * Le contrôle est le MÊME : c'est le nombre de valeurs qui change ce qu'il rend.
   * Un filtre `range` livre une paire, `Slider` en déduit deux poignées, et
   * `onValueChange` rend une paire. Rien à brancher de plus.
   *
   * ⚠️ LA FOURCHETTE N'EST PAS COMPATIBLE AVEC `steps`. Un barème par crans est une
   * ÉCHELLE NON LINÉAIRE — les capitalisations vont de un million à mille milliards
   * par sauts choisis — et deux poignées sur une telle échelle demanderaient de
   * décider ce que « entre le cran 3 et le cran 6 » veut dire à l'affichage. Aucun
   * filtre du site n'en a besoin ; le cas est écarté plutôt que deviné.
   */
  const estFourchette = Array.isArray(value)
  const index = steps && !estFourchette ? Math.max(0, steps.indexOf(value)) : 0

  return (
    <label className="block">
      <span className="mb-1 flex items-baseline justify-between gap-2 text-xs text-ink-muted">
        {t(filter.label)}
        <span className="tabular text-ink">{displayThreshold(filter, value, currency, nombres)}</span>
      </span>
      {/* `Slider` de shadcn/ui — même substitution que sur la carte macro, voir la note
          qui y est posée, notamment sur le tableau attendu par `value`. La valeur
          lisible reste celle de l'intitulé au-dessus, déjà mise en forme par
          `displayThreshold` : le curseur n'a rien à afficher de son côté. */}
      <Slider
        aria-label={t(filter.label)}
        min={steps ? 0 : (filter.min ?? 0)}
        max={steps ? steps.length - 1 : (filter.max ?? 100)}
        step={steps ? 1 : (filter.step ?? 1)}
        value={estFourchette ? value : [steps ? index : value]}
        onValueChange={(next) => {
          if (estFourchette) {
            /* Les bornes sont RÉORDONNÉES : HeroUI laisse la poignée haute passer sous
               la basse, et une paire inversée retiendrait zéro ligne sans que rien ne
               dise pourquoi. */
            const paire = [Number(next[0]), Number(next[1])].sort((a, b) => a - b)
            onChange([paire[0] as number, paire[1] as number])
            return
          }
          const raw = Number(next[0])
          onChange(steps ? (steps[clampIndex(raw, steps.length - 1)] ?? 0) : raw)
        }}
      />
    </label>
  )
}
