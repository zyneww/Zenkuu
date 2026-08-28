'use client'

import { ArrowRightLeft, ChevronDown } from 'lucide-react'
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
   * ⚠️ LA GRILLE « LE MÊME MONTANT DANS LES AUTRES DEVISES » A ÉTÉ RETIRÉE.
   *
   * Elle affichait le montant converti dans les soixante et une devises restantes,
   * en quatre colonnes de pastilles sous le convertisseur — un pavé de deux cents
   * lignes qui occupait deux écrans sous une carte de calcul de trois champs.
   *
   * La refonte reprend la composition de CoinGecko (capture de référence), et son
   * apport tient en un mot : la SIMPLICITÉ. Une page d'outil répond à une question à
   * la fois. Les soixante et une autres réponses n'avaient été demandées par
   * personne, et elles reléguaient la seule qu'on venait chercher — le résultat — en
   * haut d'un mur de chiffres.
   *
   * Ce que la page garde de contenu indexable est le tableau « Cours de référence en
   * euros », rendu CÔTÉ SERVEUR (voir la page) : c'est lui qui portait le
   * référencement, pas cette grille, qui n'existait que dans le paquet client.
   */

  if (!asset) return null

  const fromLabel = reversed ? currency : asset.symbol.toUpperCase()
  const toLabel = reversed ? asset.symbol.toUpperCase() : currency

  const formattedResult =
    result === undefined
      ? '—'
      : new Intl.NumberFormat('fr-FR', {
          maximumFractionDigits: result >= 100 ? 2 : 8,
        }).format(result)

  /* Le montant saisi, RÉÉCRIT dans la même grammaire que le résultat. La référence
     écrit « ₿1.000000 = $79,984.79 » : les deux membres de l'égalité doivent se lire
     comme deux mesures du même objet, ce qu'un « 1 » brut à gauche et un nombre
     formaté à droite ne font pas. */
  const formattedAmount = Number.isFinite(parsed)
    ? new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 6, maximumFractionDigits: 6 }).format(
        parsed,
      )
    : amount

  const stamp = new Date(asset.lastUpdated).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  })

  /*
   * Le sélecteur d'actif, rendu à l'une ou l'autre place selon le sens.
   *
   * ⚠️ SANS `label`, ET C'EST DÉLIBÉRÉ. `AssetPicker` sait poser son propre intitulé
   * au-dessus de lui ; la grille ci-dessous en pose déjà un pour chacune de ses trois
   * colonnes. Les deux ensemble empilaient « Cryptomonnaie » sur « Actif », et
   * décalaient le champ de vingt pixels vers le bas — les trois cases ne tombaient
   * plus sur la même ligne de base. Un seul intitulé, et c'est celui de la grille,
   * qui est le même pour les trois colonnes.
   */
  const picker = (
    <AssetPicker
      assets={assets}
      selectedIds={[asset.id]}
      onSelect={(entry) => setAssetId(entry.id)}
    >
      {(open) => <PickerFace asset={asset} open={open} />}
    </AssetPicker>
  )

  const money = (
    <CurrencySelect
      value={currency}
      onChange={setCurrency}
      currencies={currencies}
      rates={rates}
    />
  )

  return (
    <div className="space-y-6">
      {/*
        ══════════════════════════════════════════════════════════════════════════
        UNE SEULE CARTE, TROIS CHAMPS SUR UNE LIGNE
        ══════════════════════════════════════════════════════════════════════════

        ── CE QUE CELA REMPLACE ────────────────────────────────────────────────

        Deux cases EMPILÉES — « Montant en BTC » puis « Résultat en EUR » — séparées
        par une flèche verticale posée entre deux filets, chacune portant son
        sélecteur collé à droite. La disposition disait « ceci devient cela », de haut
        en bas, comme un formulaire de virement.

        La référence (CoinGecko) pose les trois champs SUR UNE LIGNE et sort le
        résultat de la zone de saisie : « voici une équation, en voici les deux
        membres ». La différence n'est pas cosmétique — le résultat cesse d'être une
        case de formulaire qu'on pourrait croire modifiable, et devient une PHRASE.

        ── LA LARGEUR N'EST PLUS BORNÉE À 36rem ────────────────────────────────

        `max-w-xl` tenait deux champs superposés. Trois champs côte à côte demandent
        la largeur du contenu ; la carte prend donc celle de la page, et la grille
        s'effondre en colonne sous `md` — où trois sélecteurs sur 375 pixels seraient
        illisibles.
      */}
      <div className="rounded-card border border-border-subtle bg-surface p-5 sm:p-6">
        <div className="grid items-end gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_minmax(0,1fr)]">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-ink-muted">
              {`Montant en ${fromLabel}`}
            </span>
            <Input
              size="lg"
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              aria-label={`Montant en ${fromLabel}`}
              className="tabular w-full"
            />
          </label>

          <div>
            <span className="mb-1.5 block text-xs font-medium text-ink-muted">
              {reversed ? 'Devise de départ' : 'Cryptomonnaie'}
            </span>
            {reversed ? money : picker}
          </div>

          {/* ── L'INVERSION ────────────────────────────────────────────────────
              Une flèche HORIZONTALE, puisque les deux sélecteurs sont côte à côte.
              La verticale de la version précédente décrivait une disposition qui
              n'existe plus.

              `mb-1` aligne le bouton sur la ligne de base des deux champs qu'il
              sépare : `items-end` cale le bas des boîtes, et un bouton carré de 36
              pixels y tombe un cheveu trop bas sans ce rattrapage. */}
          <div className="mb-1 flex justify-center md:block">
            <IconButton
              variant="outline"
              onClick={() => setReversed((value) => !value)}
              label="Inverser le sens de conversion"
              icon={ArrowRightLeft}
            />
          </div>

          <div>
            <span className="mb-1.5 block text-xs font-medium text-ink-muted">
              {reversed ? 'Cryptomonnaie' : 'Devise'}
            </span>
            {reversed ? picker : money}
          </div>
        </div>

        {/*
          ── LE RÉSULTAT EST UNE PHRASE, PAS UNE CASE ──────────────────────────

          Un `<output>` et non un `<p>` : l'élément existe précisément pour porter le
          résultat d'un calcul, et les lecteurs d'écran l'annoncent à chaque
          changement sans qu'on ait à poser `aria-live` à la main.

          L'horodatage le SUIT sur la même ligne, en petit — c'est la place de la
          référence, et elle est juste : « à quand remonte ce chiffre » est une
          question qu'on se pose EN LISANT le chiffre, pas avant.
        */}
        <output className="tabular mt-5 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-2xl font-bold text-ink">
          {formattedAmount} {fromLabel} = {formattedResult} {toLabel}
          <span className="text-xs font-normal text-ink-muted">
            Dernière mise à jour à {stamp}
          </span>
        </output>

        {/* La ligne réciproque ferme la carte : elle donne le taux unitaire dans les
            deux sens, ce que le résultat ne dit pas dès que le montant n'est pas 1. */}
        {unitPrice !== undefined && unitPrice > 0 ? (
          <p className="tabular mt-3 border-t border-border-subtle pt-3 text-xs text-ink-muted">
            1 {asset.name} ≈ {formatUnit(unitPrice)} {currency}
            <span className="mx-2 text-border-subtle">·</span>1 {currency} ≈{' '}
            {formatUnit(1 / unitPrice)} {asset.symbol.toUpperCase()}
          </p>
        ) : null}
      </div>

      <div className="max-w-2xl border-l-2 border-border-subtle pl-4 text-xs leading-relaxed text-ink-muted">
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
      /* `w-full` : la case occupe désormais sa colonne de grille, comme les deux
         autres. Sans lui, elle se dimensionnait sur son contenu — trois lettres — et
         la troisième colonne de la carte se lisait comme un accessoire à côté de deux
         vrais champs, là où la référence leur donne la même largeur. */
      className="h-full w-full"
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
