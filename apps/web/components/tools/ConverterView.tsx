'use client'

import { ArrowDownUp, ChevronDown } from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { useMemo, useState } from 'react'

import type { ExchangeRates, MarketAsset, SupportedCurrency } from '@zenkuu/data'

import { IconButton } from '@/components/ui/IconButton'
import { AssetLogo } from '@/components/asset/AssetLogo'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { AssetPicker } from '@/components/tools/AssetPicker'

/**
 * Un nombre lisible quel que soit son ORDRE DE GRANDEUR.
 *
 * La réciproque d'un cours élevé est un nombre minuscule : 1 euro vaut 0,0000181 BTC.
 * Deux décimales l'écriraient « 0,00 », c'est-à-dire un zéro affiché là où il y a une
 * valeur. La précision suit donc la grandeur, jusqu'à huit décimales.
 */
function formatUnit(value: number): string {
  const digits = value >= 100 ? 2 : value >= 1 ? 4 : 8
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: digits }).format(value)
}

/**
 * Convertisseur crypto.
 *
 * ── CE QUI A ÉTÉ DÉ-COPIÉ, ET POURQUOI ────────────────────────────────────────
 *
 * La version précédente reprenait la mise en page d'OKX trait pour trait : deux
 * panneaux SYMÉTRIQUES posés côte à côte, un bouton d'inversion suspendu entre les
 * deux, une ligne de taux réciproque centrée dessous, puis une grille de pastilles
 * « BTC en EUR · 55 139 € ». C'était leur page, pas la nôtre.
 *
 * Trois choses changent, et chacune se justifie autrement que par « ne pas copier » :
 *
 *   1. LA PILE REMPLACE LA RANGÉE. Un convertisseur se lit de haut en bas — on donne,
 *      on reçoit — et l'écrire horizontalement force à choisir un côté « source » par
 *      convention de lecture. La pile porte le même geste sans convention, et tient
 *      sur un téléphone sans se réorganiser.
 *
 *   2. LE RÉSULTAT EST UN CHAMP, PAS UN AFFICHAGE. Il porte le style de saisie du
 *      champ du haut, en lecture seule. C'est ce qui rend le bouton d'inversion
 *      lisible : les deux cases sont de même nature, échanger leur rôle a un sens.
 *      Deux formes différentes feraient de l'inversion un mystère.
 *
 *   3. LA GRILLE DE PASTILLES DEVIENT UN TABLEAU MULTI-DEVISES. C'est le seul endroit
 *      où l'on fait mieux que la référence, et c'est notre moteur de change qui le
 *      permet : le montant saisi converti d'un coup dans toutes les devises servies,
 *      dans la grammaire de tableau dense du site. Leur grille répondait à « combien
 *      vaut un bitcoin » ; celle-ci répond à « combien vaut CE montant, partout ».
 *
 * ── DEUX HORODATAGES DANS UN SEUL NOMBRE ─────────────────────────────────────
 *
 * Les actifs sont cotés en euros par leur source ; passer à une autre devise applique
 * un taux de la BCE, publié une fois par jour ouvré. Le résultat combine donc un cours
 * de l'instant et un taux de la veille. Ce n'est pas contournable — aucune source
 * gratuite ne cote chaque actif dans les soixante-deux devises — mais c'est dicible,
 * et c'est écrit sous le résultat plutôt que tu.
 *
 * Tout est calculé sur des cours DÉJÀ CHARGÉS : la frappe ne déclenche aucun appel
 * réseau, et le quota de la source n'est pas entamé.
 */
export function ConverterView({
  assets,
  rates,
  currencies,
}: {
  assets: MarketAsset[]
  rates: ExchangeRates | null
  currencies: readonly SupportedCurrency[]
}) {
  const [amount, setAmount] = useState('1')
  const [assetId, setAssetId] = useState(assets[0]?.id ?? '')
  const [currency, setCurrency] = useState<string>('EUR')
  const [reversed, setReversed] = useState(false)

  const asset = useMemo(
    () => assets.find((entry) => entry.id === assetId) ?? assets[0],
    [assets, assetId],
  )

  const parsed = Number(amount.replace(/\s/g, '').replace(',', '.'))
  const rate = currency === 'EUR' ? 1 : rates?.rates[currency]

  /** Prix d'UNE unité de l'actif dans la devise choisie — la base des deux sens. */
  const unitPrice = asset && rate !== undefined ? asset.price * rate : undefined

  const result = useMemo(() => {
    if (!asset || !Number.isFinite(parsed) || parsed < 0 || rate === undefined) return undefined

    const priceInCurrency = asset.price * rate
    if (priceInCurrency <= 0) return undefined

    return reversed ? parsed / priceInCurrency : parsed * priceInCurrency
  }, [asset, parsed, rate, reversed])

  /*
   * LE MÊME MONTANT DANS LES AUTRES DEVISES.
   *
   * Calculé sur la VALEUR EN EUROS et non sur le résultat affiché : repartir du
   * résultat enchaînerait deux conversions (euro → devise choisie → autre devise) et
   * accumulerait deux arrondis là où un seul suffit. L'euro est le pivot parce que
   * c'est la devise dans laquelle la BCE publie, donc celle où le taux vaut 1.
   *
   * Les devises sans taux publié sont ÉCARTÉES plutôt qu'affichées à zéro : une ligne
   * à zéro dans un tableau de conversion se lit comme une valeur, pas comme une
   * absence (§5).
   */
  const elsewhere = useMemo(() => {
    if (!asset || !rates || !Number.isFinite(parsed) || parsed < 0 || reversed) return []

    const inEuro = parsed * asset.price
    if (inEuro <= 0) return []

    return currencies
      .map((code) => ({ code, rate: code === 'EUR' ? 1 : rates.rates[code] }))
      .filter((entry): entry is { code: string; rate: number } => entry.rate !== undefined)
      .filter((entry) => entry.code !== currency)
      .map((entry) => ({ code: entry.code, value: inEuro * entry.rate }))
  }, [asset, rates, parsed, currencies, currency, reversed])

  if (!asset) return null

  const fromLabel = reversed ? currency : asset.symbol.toUpperCase()
  const toLabel = reversed ? asset.symbol.toUpperCase() : currency

  const formattedResult =
    result === undefined
      ? '—'
      : new Intl.NumberFormat('fr-FR', {
          maximumFractionDigits: result >= 100 ? 2 : 8,
        }).format(result)

  return (
    <div className="space-y-6">
      <div className="max-w-xl space-y-3 rounded-card border border-border-subtle bg-surface p-5">
        {/* ── CE QU'ON DONNE ────────────────────────────────────────────────── */}
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-ink-muted">
            Montant en {fromLabel}
          </span>
          <div className="flex items-stretch gap-2">
            <Input
              size="lg"
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              aria-label={`Montant en ${fromLabel}`}
              className="tabular min-w-0 flex-1"
            />

            {/* Le sélecteur est COLLÉ au champ qu'il qualifie, pas posé en dessous :
                un montant et son unité forment une seule saisie, et les séparer fait
                relire deux fois pour savoir dans quoi l'on compte. */}
            <div className="w-40 shrink-0">
              {reversed ? (
                <CurrencySelect
                  value={currency}
                  onChange={setCurrency}
                  currencies={currencies}
                  rates={rates}
                />
              ) : (
                <AssetPicker
                  assets={assets}
                  selectedIds={[asset.id]}
                  onSelect={(entry) => setAssetId(entry.id)}
                  label="Actif"
                >
                  {(open) => <PickerFace asset={asset} open={open} />}
                </AssetPicker>
              )}
            </div>
          </div>
        </label>

        {/* ── L'INVERSION ───────────────────────────────────────────────────────
            Une flèche VERTICALE, puisque les deux cases sont l'une au-dessus de
            l'autre. L'horizontale de la version précédente décrivait une disposition
            qui n'existe plus. */}
        <div className="flex items-center gap-3">
          <Separator className="flex-1 bg-border-subtle" />
          {/* `IconButton` — le bouton-icône bordé du système. `tooltip` pose à
              la fois l'`aria-label` et une bulle qui, elle, existe au clavier. */}
          <IconButton
            variant="outline"
            onClick={() => setReversed((value) => !value)}
            label="Inverser le sens de conversion"
            icon={ArrowDownUp}
          />
          <Separator className="flex-1 bg-border-subtle" />
        </div>

        {/* ── CE QU'ON REÇOIT ───────────────────────────────────────────────── */}
        <div>
          <span className="mb-1.5 block text-xs font-medium text-ink-muted">
            Résultat en {toLabel}
          </span>
          <div className="flex items-stretch gap-2">
            {/*
              Un `<output>` et non un `<p>` : l'élément existe précisément pour porter
              le résultat d'un calcul, et les lecteurs d'écran l'annoncent à chaque
              changement sans qu'on ait à poser `aria-live` à la main.
            */}
            <output className="tabular min-w-0 flex-1 truncate rounded-control border border-border-subtle bg-canvas px-3 py-2.5 text-lg font-semibold text-ink">
              {formattedResult}
            </output>

            <div className="w-40 shrink-0">
              {reversed ? (
                <AssetPicker
                  assets={assets}
                  selectedIds={[asset.id]}
                  onSelect={(entry) => setAssetId(entry.id)}
                  label="Actif"
                >
                  {(open) => <PickerFace asset={asset} open={open} />}
                </AssetPicker>
              ) : (
                <CurrencySelect
                  value={currency}
                  onChange={setCurrency}
                  currencies={currencies}
                  rates={rates}
                />
              )}
            </div>
          </div>
        </div>

        {/* La ligne réciproque est DANS le panneau, en pied. Centrée sous les deux
            colonnes, elle appartenait à la mise en page symétrique qu'on vient de
            retirer ; ici elle qualifie le calcul qui la précède. */}
        {unitPrice !== undefined && unitPrice > 0 ? (
          <p className="tabular border-t border-border-subtle pt-3 text-xs text-ink-muted">
            1 {asset.name} ≈ {formatUnit(unitPrice)} {currency}
            <span className="mx-2 text-border-subtle">·</span>1 {currency} ≈{' '}
            {formatUnit(1 / unitPrice)} {asset.symbol.toUpperCase()}
          </p>
        ) : null}
      </div>

      <div className="max-w-xl border-l-2 border-border-subtle pl-4 text-xs leading-relaxed text-ink-muted">
        <p>
          Cours de <strong className="text-ink">{asset.name}</strong> relevé le{' '}
          {new Date(asset.lastUpdated).toLocaleString('fr-FR', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          })}
          , coté en euros par la source.
        </p>
        {currency !== 'EUR' ? (
          <p className="mt-1">
            Converti au taux BCE{' '}
            {rates?.date ? `du ${new Date(rates.date).toLocaleDateString('fr-FR')}` : ''} — le
            résultat combine donc un cours de l’instant et un taux publié une fois par jour
            ouvré. Un montant converti n’est pas un cours coté.
          </p>
        ) : (
          <p className="mt-1">
            Aucune conversion de devise n’est appliquée : le résultat porte le seul
            horodatage du cours.
          </p>
        )}
      </div>

      {/* ── LE MÊME MONTANT AILLEURS ──────────────────────────────────────────
          Le bloc qui remplace la grille de pastilles de la référence. Il répond à une
          autre question, et à une question qu'eux ne posent pas : leur grille dit
          « combien vaut un bitcoin » — une réponse unique, la même pour tout le monde.
          Celle-ci dit « combien vaut CE montant, partout », ce qui n'a de sens que
          parce qu'on suit soixante-deux devises. */}
      {elsewhere.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-ink">
            {formatUnit(parsed)} {asset.symbol.toUpperCase()} dans les autres devises
          </h2>

          <div className="overflow-hidden rounded-card border border-border-subtle">
            <ul className="grid grid-cols-2 gap-px bg-border-subtle sm:grid-cols-3 lg:grid-cols-4">
              {elsewhere.map((entry) => (
                <li
                  key={entry.code}
                  className="flex items-baseline justify-between gap-3 bg-surface px-3 py-2"
                >
                  <span className="text-xs font-medium text-ink-muted">{entry.code}</span>
                  <span className="tabular truncate text-sm text-ink">
                    {formatUnit(entry.value)}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-xs text-ink-muted">
            Converti depuis la valeur en euros et non depuis le résultat affiché : enchaîner
            deux conversions accumulerait deux arrondis là où un seul suffit.
          </p>
        </section>
      ) : null}
    </div>
  )
}

/**
 * Face visible du sélecteur d'actif.
 *
 * Elle appartient à l'appelant depuis que `AssetPicker` sert aussi le comparateur,
 * où le déclencheur n'est pas une case de formulaire mais une carte d'ajout. Le
 * panneau, lui, reste commun — c'est la partie qu'on ne veut pas voir diverger.
 */
function PickerFace({ asset, open }: { asset: MarketAsset; open: boolean }) {
  return (
    <>
      <AssetLogo asset={asset} size={22} />
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{asset.name}</span>
      <span className="shrink-0 text-xs uppercase text-ink-muted">{asset.symbol}</span>
      <ChevronDown
        className={`h-3.5 w-3.5 shrink-0 text-ink-muted transition-transform ${open ? 'rotate-180' : ''}`}
        aria-hidden="true"
      />
    </>
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
  return (
    /* ⚠️ `disabled` SUR L'OPTION, ET C'EST LA SEULE CHOSE À NE PAS PERDRE ICI.
       Une devise sans taux publié doit rester VISIBLE et INSÉLECTIONNABLE : la
       retirer ferait chercher une devise qu'on sait exister, la laisser choisissable
       viderait le résultat sans explication. `NativeSelectOption` n'est qu'un
       `<option>` habillé — l'attribut le traverse. */
    <NativeSelect
      aria-label="Devise"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-full"
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
