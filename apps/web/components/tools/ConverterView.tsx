'use client'

import { usePhrase } from '@/components/locale/ContentProvider'
import { useLocale } from 'next-intl'
import { ArrowUpDown, BookmarkPlus, ChevronDown, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import type { ExchangeRates, MarketAsset, SupportedCurrency } from '@zenkuu/data'

import { emphasise } from '@/components/locale/emphasise'
import { AssetLogo } from '@/components/asset/AssetLogo'
import { AssetPicker } from '@/components/tools/AssetPicker'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * CONVERTISSEUR — LA CARTE « PAYER / RECEVOIR » DE LA RÉFÉRENCE
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── CE QUE CETTE DISPOSITION REMPLACE ──────────────────────────────────────
 *
 * Trois champs sur une LIGNE — montant, actif, devise — hérités de CoinGecko, avec le
 * résultat sorti de la carte en guise de phrase. C'était juste, et ce n'est pas la
 * forme demandée : la référence (kucoin.com/convert) empile deux panneaux, « Pay » et
 * « Receive », séparés par un bouton d'inversion circulaire. Chaque panneau porte son
 * sélecteur à gauche et son montant à droite.
 *
 * La différence n'est pas cosmétique. En ligne, le résultat est une PHRASE qu'on lit ;
 * empilé, c'est un CHAMP symétrique du premier — et c'est ce qui rend le bouton
 * d'inversion évident. Deux cases de même nature, on échange leur rôle.
 *
 * ── CE QUE LA RÉFÉRENCE PORTE ET QUE NOUS N'AURONS JAMAIS ──────────────────
 *
 * ⚠️ NI SOLDE, NI BOUTON « CONVERTIR », NI HISTORIQUE DE TRANSACTIONS. Sa carte
 * affiche « Available -- » au-dessus de chaque champ et se termine par « Log In to
 * Convert » : ces trois éléments supposent un compte, des fonds déposés et une
 * exécution. ZENKUU ne détient rien et n'exécute rien (§1) ; les reproduire, même
 * grisés, promettrait une fonction qui n'existe pas.
 *
 * Ce qui les remplace est réel : le taux du marché, et un historique LOCAL — les
 * calculs que le lecteur choisit de garder, dans son propre navigateur. Rien ne part
 * sur un serveur, et c'est écrit sous la liste.
 *
 * ── DEUX HORODATAGES DANS UN SEUL NOMBRE ───────────────────────────────────
 *
 * Les actifs sont cotés en euros par leur source ; passer à une autre devise applique
 * un taux BCE publié une fois par jour ouvré. Le résultat combine donc un cours de
 * l'instant et un taux de la veille. Ce n'est pas contournable — aucune source
 * gratuite ne cote chaque actif dans les soixante-deux devises — mais c'est dicible,
 * et c'est écrit sous la carte plutôt que tu.
 *
 * Tout est calculé sur des cours DÉJÀ CHARGÉS : la frappe ne déclenche aucun appel
 * réseau, et le quota de la source n'est pas entamé.
 */

/** Clé de l'historique local. Préfixée comme les autres réglages du site. */
const HISTORY_KEY = 'zenkuu-conversions'

/** Au-delà, la liste cesse d'être un aide-mémoire et devient un journal. */
const HISTORY_MAX = 8

interface SavedConversion {
  id: string
  from: string
  to: string
  amount: number
  result: number
  at: number
}

/**
 * Un nombre lisible quel que soit son ORDRE DE GRANDEUR.
 *
 * La réciproque d'un cours élevé est un nombre minuscule : 1 euro vaut 0,0000181 BTC.
 * Deux décimales l'écriraient « 0,00 », c'est-à-dire un zéro affiché là où il y a une
 * valeur. La précision suit donc la grandeur, jusqu'à huit décimales.
 */
function formatUnit(value: number, locale: string): string {
  const digits = value >= 100 ? 2 : value >= 1 ? 4 : 8
  return new Intl.NumberFormat(locale, { maximumFractionDigits: digits }).format(value)
}

export function ConverterView({
  assets,
  rates,
  currencies,
}: {
  assets: MarketAsset[]
  rates: ExchangeRates | null
  currencies: readonly SupportedCurrency[]
}) {
  const t = usePhrase()
  const locale = useLocale()
  const [amount, setAmount] = useState('1')
  const [assetId, setAssetId] = useState(assets[0]?.id ?? '')
  const [currency, setCurrency] = useState<string>('EUR')
  /** `false` : on paie en crypto et on reçoit de la devise. `true` : l'inverse. */
  const [reversed, setReversed] = useState(false)
  const [history, setHistory] = useState<SavedConversion[]>([])

  /*
   * Relu au MONTAGE et non au premier rendu : le serveur ne connaît pas le stockage du
   * visiteur, et lire avant l'hydratation ferait diverger le HTML rendu de l'arbre
   * attendu par React.
   *
   * ⚠️ C'est exactement le motif que `CurrencyProvider` documente pour la même raison :
   * la règle interdisant `setState` dans un effet vise les cascades de rendus, et cet
   * effet ne s'exécute QU'UNE FOIS, sans dépendance. L'alternative — initialiser l'état
   * en lisant `localStorage` au premier rendu — produirait précisément l'écart
   * d'hydratation qu'on cherche à éviter.
   */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY)
      // eslint-disable-next-line react-hooks/set-state-in-effect -- voir le commentaire ci-dessus
      if (raw) setHistory(JSON.parse(raw) as SavedConversion[])
    } catch {
      /* Stockage refusé ou contenu illisible : on repart d'une liste vide plutôt que
         de faire échouer la page pour un aide-mémoire. */
    }
  }, [])

  const asset = useMemo(
    () => assets.find((entry) => entry.id === assetId) ?? assets[0],
    [assets, assetId],
  )

  const parsed = Number(amount.replace(/\s/g, '').replace(',', '.'))
  const rate = currency === 'EUR' ? 1 : rates?.rates[currency]

  /** Prix d'UNE unité de l'actif dans la devise choisie — la base des deux sens. */
  const unitPrice = asset && rate !== undefined ? asset.price * rate : undefined

  const result = useMemo(() => {
    if (!unitPrice || !Number.isFinite(parsed) || parsed < 0 || unitPrice <= 0) return undefined
    return reversed ? parsed / unitPrice : parsed * unitPrice
  }, [unitPrice, parsed, reversed])

  if (!asset) return null

  const fromLabel = reversed ? currency : asset.symbol.toUpperCase()
  const toLabel = reversed ? asset.symbol.toUpperCase() : currency

  const formattedResult =
    result === undefined
      ? ''
      : new Intl.NumberFormat(locale, {
          maximumFractionDigits: result >= 100 ? 2 : 8,
        }).format(result)

  function persist(next: SavedConversion[]) {
    setHistory(next)
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(next))
    } catch {
      /* La liste reste valable pour la session en cours. */
    }
  }

  function save() {
    if (result === undefined || !Number.isFinite(parsed)) return
    const entry: SavedConversion = {
      /* L'horodatage suffit à identifier une entrée : deux enregistrements ne peuvent
         pas partager la même milliseconde à la vitesse d'un clic. */
      id: String(Date.now()),
      from: fromLabel,
      to: toLabel,
      amount: parsed,
      result,
      at: Date.now(),
    }
    persist([entry, ...history].slice(0, HISTORY_MAX))
  }

  /* Le sélecteur d'actif et celui de devise, rendus à l'une ou l'autre place selon le
     sens : c'est le bouton d'inversion qui les échange, et non deux jeux de champs. */
  const picker = (
    <AssetPicker
      assets={assets}
      selectedIds={[asset.id]}
      onSelect={(entry) => setAssetId(entry.id)}
      triggerClassName="flex items-center gap-2 rounded-pill bg-surface px-2.5 py-1.5 text-left transition-colors hover:bg-surface-muted"
    >
      {(open) => (
        <>
          <AssetLogo asset={asset} size={22} />
          <span className="text-sm font-semibold uppercase text-ink">{asset.symbol}</span>
          <ChevronDown
            className={`h-3.5 w-3.5 shrink-0 text-ink-muted transition-transform ${open ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
        </>
      )}
    </AssetPicker>
  )

  const money = (
    <CurrencySelect value={currency} onChange={setCurrency} currencies={currencies} rates={rates} />
  )

  return (
    <div className="space-y-6">
      {/*
        La carte est ÉTROITE et centrée, comme la référence : un convertisseur est un
        formulaire à deux champs, et l'étaler sur la largeur de la page le ferait lire
        comme un tableau de bord.
      */}
      <div className="mx-auto w-full max-w-md">
        <div className="relative space-y-1 rounded-card border border-border-subtle bg-surface p-4">
          <Panel
            label={t('Payer')}
            selector={reversed ? money : picker}
            value={amount}
            onChange={setAmount}
            editable
            unit={fromLabel}
          />

          {/*
            ── LE BOUTON D'INVERSION CHEVAUCHE LES DEUX PANNEAUX ──────────────
            Posé dans le flux, il écarterait les panneaux de sa propre hauteur. En
            absolu et centré sur la couture, il fait ce que fait la référence : dire
            que les deux cases sont les deux faces d'un même geste.
          */}
          <div className="relative z-10 flex h-0 items-center justify-center">
            <button
              type="button"
              onClick={() => {
                setReversed((value) => !value)
                /* Le montant saisi ne se transporte PAS d'un sens à l'autre : « 1 BTC »
                   inversé donnerait « 1 EUR », un nombre que personne n'a demandé. On
                   repart de l'unité, qui est la question la plus courante. */
                setAmount('1')
              }}
              aria-label={t('Inverser le sens de conversion')}
              className="flex size-9 items-center justify-center rounded-pill border border-border-subtle bg-surface text-ink-muted transition-colors hover:border-brand hover:text-brand"
            >
              <ArrowUpDown className="size-4" aria-hidden="true" />
            </button>
          </div>

          <Panel
            label={t('Recevoir')}
            selector={reversed ? picker : money}
            value={formattedResult}
            unit={toLabel}
          />
        </div>

        {/* ── LE TAUX, SOUS LA CARTE ────────────────────────────────────────
            La référence pose son taux dans la carte, au-dessus du bouton d'exécution.
            Nous n'avons pas ce bouton : le taux ferme donc la carte, et la ligne
            réciproque le double dans l'autre sens — ce que le résultat ne dit pas dès
            que le montant n'est pas 1. */}
        {unitPrice !== undefined && unitPrice > 0 ? (
          <p className="tabular mt-3 text-center text-xs text-ink-muted">
            1 {asset.symbol.toUpperCase()} ≈ {formatUnit(unitPrice, locale)} {currency}
            <span className="mx-2 text-border-subtle">·</span>1 {currency} ≈{' '}
            {formatUnit(1 / unitPrice, locale)} {asset.symbol.toUpperCase()}
          </p>
        ) : null}

        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={save}
            disabled={result === undefined}
            className="inline-flex min-h-9 items-center gap-2 rounded-pill border border-border-subtle px-4 text-sm font-medium text-ink transition-colors hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
          >
            <BookmarkPlus className="size-4" aria-hidden="true" />
            Garder ce calcul
          </button>
        </div>
      </div>

      <LocalHistory history={history} onClear={() => persist([])} />

      {/* ── LES DEUX MENTIONS DE BAS DE PAGE PASSENT PAR LA TABLE ──────────────

          Elles étaient écrites en JSX brut, coupées par les retours à la ligne, et
          sortaient donc en français dans les douze autres langues. Chacune est désormais
          UNE clé, avec ses trous nommés remplis après traduction — `emphasise` porte le
          gras du nom de l'actif, qui ne peut pas voyager dans une chaîne.

          Les dates suivaient `locale` en dur : un lecteur allemand voyait « 1 sept. »
          au milieu d'une phrase allemande. Elles suivent maintenant le locale affiché. */}
      <div className="mx-auto max-w-md text-xs leading-relaxed text-ink-muted">
        <p>
          {emphasise(
            t('Cours de **{actif}** relevé le {date}, coté en euros par la source.')
              .replace('{actif}', asset.name)
              .replace(
                '{date}',
                new Date(asset.lastUpdated).toLocaleString(locale, {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                }),
              ),
          )}
        </p>
        {currency !== 'EUR' ? (
          <p className="mt-1">
            {(rates?.date
              ? t(
                  'Converti au taux BCE du {date} — le résultat combine donc un cours de l’instant et un taux publié une fois par jour ouvré. Un montant converti n’est pas un cours coté.',
                ).replace('{date}', new Date(rates.date).toLocaleDateString(locale))
              : t(
                  'Converti au taux BCE — le résultat combine donc un cours de l’instant et un taux publié une fois par jour ouvré. Un montant converti n’est pas un cours coté.',
                ))}
          </p>
        ) : (
          <p className="mt-1">
            {t('Aucune conversion de devise n’est appliquée : le résultat porte le seul horodatage du cours.')}
          </p>
        )}
      </div>
    </div>
  )
}

/**
 * Un panneau de la carte — intitulé, sélecteur à gauche, montant à droite.
 *
 * Le champ « Recevoir » est en LECTURE SEULE et non désactivé : un champ désactivé
 * sort de l'ordre de tabulation et son texte pâlit, alors que c'est le résultat qu'on
 * vient lire. `readOnly` le laisse sélectionnable et copiable, ce qui est exactement
 * l'usage qu'on en fait.
 */
function Panel({
  label,
  selector,
  value,
  onChange,
  editable = false,
  unit,
}: {
  label: string
  selector: React.ReactNode
  value: string
  onChange?: (next: string) => void
  editable?: boolean
  unit: string
}) {
  return (
    <div className="rounded-card bg-surface-muted px-3 py-3">
      <p className="mb-2 text-xs text-ink-muted">{label}</p>
      <div className="flex items-center gap-3">
        <div className="shrink-0">{selector}</div>
        <input
          type="text"
          inputMode="decimal"
          value={value}
          readOnly={!editable}
          onChange={onChange ? (event) => onChange(event.target.value) : undefined}
          placeholder={editable ? '0' : '—'}
          aria-label={`${label} — montant en ${unit}`}
          className="tabular min-w-0 flex-1 bg-transparent text-right text-xl font-semibold text-ink outline-none placeholder:text-ink-muted"
        />
      </div>
    </div>
  )
}

/**
 * Les calculs gardés — DANS LE NAVIGATEUR, et nulle part ailleurs.
 *
 * La référence titre cette section « History » et y liste des conversions exécutées.
 * La nôtre liste des calculs que le lecteur a choisi de garder : rien n'a été exécuté,
 * et rien n'est envoyé. La phrase sous la liste le dit — un bloc nommé « historique »
 * sur un site de marché se lit spontanément comme un relevé d'opérations.
 */
function LocalHistory({
  history,
  onClear,
}: {
  history: SavedConversion[]
  onClear: () => void
}) {
  const locale = useLocale()
  const t = usePhrase()
  if (history.length === 0) return null

  return (
    <section className="mx-auto w-full max-w-md space-y-2" aria-labelledby="historique-conversions">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="historique-conversions" className="text-sm font-semibold text-ink">
          {t('Calculs gardés')}
        </h2>
        <button
          type="button"
          onClick={onClear}
          className="inline-flex min-h-8 items-center gap-1.5 text-xs text-ink-muted transition-colors hover:text-down"
        >
          <Trash2 className="size-3.5" aria-hidden="true" />
          Tout effacer
        </button>
      </div>

      <ul className="divide-y divide-border-subtle rounded-card border border-border-subtle bg-surface">
        {history.map((entry) => (
          <li key={entry.id} className="flex items-baseline justify-between gap-3 px-3 py-2">
            <span className="tabular min-w-0 flex-1 truncate text-sm text-ink">
              {new Intl.NumberFormat(locale, { maximumFractionDigits: 8 }).format(entry.amount)}{' '}
              {entry.from} ={' '}
              {new Intl.NumberFormat(locale, {
                maximumFractionDigits: entry.result >= 100 ? 2 : 8,
              }).format(entry.result)}{' '}
              {entry.to}
            </span>
            <span className="shrink-0 text-xs text-ink-muted">
              {new Date(entry.at).toLocaleString(locale, {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </li>
        ))}
      </ul>

      <p className="text-xs leading-relaxed text-ink-muted">
        {t('Ces calculs vivent dans votre navigateur et n’en sortent pas. Ce ne sont pas des opérations : ZENKUU n’exécute rien et ne détient rien.')}
      </p>
    </section>
  )
}

/**
 * Sélecteur de devise.
 *
 * Les devises sans taux publié restent VISIBLES mais désactivées, avec la raison
 * écrite dans l'option. Les retirer ferait chercher une devise qu'on sait exister ;
 * les laisser sélectionnables produirait un résultat vide sans explication.
 */
function CurrencySelect({
  value,
  onChange,
  currencies,
  rates,
}: {
  value: string
  onChange: (code: string) => void
  currencies: readonly SupportedCurrency[]
  rates: ExchangeRates | null
}) {
  const t = usePhrase()
  return (
    <NativeSelect
      aria-label={t('Devise')}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-9 w-auto rounded-pill border-0 bg-surface pl-3 pr-8 text-sm font-semibold text-ink"
    >
      {currencies.map((code) => {
        const missing = code !== 'EUR' && rates?.rates[code] === undefined
        return (
          <NativeSelectOption key={code} value={code} disabled={missing}>
            {missing ? `${code} — taux indisponible` : code}
          </NativeSelectOption>
        )
      })}
    </NativeSelect>
  )
}
