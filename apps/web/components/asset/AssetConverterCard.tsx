'use client'

import { useId, useState } from 'react'

import type { AssetDetail } from '@zenkuu/data'

import { AssetLogo } from '@/components/asset/AssetLogo'
import { BASE_CURRENCY, useCurrency } from '@/components/locale/CurrencyProvider'
import { usePhrase } from '@/components/locale/ContentProvider'
import { useFormatters } from '@/components/locale/useFormatters'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * CONVERTISSEUR DE FICHE — LE BLOC « SOL TO USD CONVERTER » DE dropstab.com
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Deux champs face à face, l'un dans l'unité de l'actif, l'autre dans la devise
 * d'affichage. Saisir dans l'un remplit l'autre.
 *
 * ── IL NE DOUBLE PAS `/convertisseur`, ET LA DIFFÉRENCE EST LA QUESTION POSÉE ─
 *
 * L'outil du site convertit N'IMPORTE QUEL couple : on y arrive en sachant ce qu'on
 * veut convertir. Ici, un des deux membres est déjà fixé par la page qu'on lit, et la
 * question n'est pas « combien vaut X en Y » mais « combien ça fait, ce que j'ai ».
 * C'est un geste de lecture, pas une visite d'outil — d'où sa place sur la fiche.
 *
 * ── LE TAUX PRÉFÈRE UNE COTATION RÉELLE À UNE CONVERSION ────────────────────
 *
 * ⚠️ DEUX CHEMINS MÈNENT AU MÊME NOMBRE, ET ILS NE SE VALENT PAS.
 *
 * Le site convertit tous ses montants depuis l'euro par un taux BCE unique — c'est le
 * rôle de `useCurrency().convert`, et c'est le bon compromis pour un tableau de deux
 * cents lignes qu'on ne va pas recharger devise par devise.
 *
 * Mais la source publie, pour CET actif, un prix par devise : `pricesByCurrency` porte
 * des COTATIONS, pas des produits. Le commentaire du champ le dit déjà — « elles sont
 * donc préférables à un produit par un taux de change, qui introduirait un second
 * niveau d'approximation ». Sur un convertisseur, dont le nombre affiché EST le
 * résultat, cette préférence cesse d'être théorique.
 *
 * L'ordre est donc : cotation native si la source en publie une pour la devise
 * choisie, conversion depuis l'euro sinon. Le pied du bloc dit lequel des deux a
 * servi — sans quoi deux visiteurs sur deux devises liraient deux précisions
 * différentes sans le savoir.
 */
export function AssetConverterCard({ asset }: { asset: AssetDetail }) {
  const t = usePhrase()
  const nombres = useFormatters()
  const { currency, convert } = useCurrency()

  const champBase = useId()
  const champCible = useId()

  /* La quantité saisie vit en TEXTE et non en nombre : « 1, » et « 1,5 » sont deux
     états d'une même frappe, et un état numérique effacerait la virgule dès qu'on la
     tape. La conversion en nombre n'a lieu qu'au calcul. */
  const [quantite, setQuantite] = useState('1')

  /* ── LA COTATION NATIVE D'ABORD — voir l'en-tête ────────────────────────── */
  const cotation = asset.pricesByCurrency?.[currency.toLowerCase()]
  const native = typeof cotation === 'number' && Number.isFinite(cotation)
  const prixUnitaire = native ? cotation : convert(asset.price, asset.currency)

  const saisie = Number(quantite.replace(',', '.'))
  const valide = quantite.trim() !== '' && Number.isFinite(saisie)
  const montant = valide ? saisie * prixUnitaire : undefined

  return (
    <section aria-labelledby="convertisseur-titre" className="space-y-3">
      <h2 id="convertisseur-titre" className="display-sm text-ink">
        {t('Convertir {symbole}').replace('{symbole}', asset.symbol.toUpperCase())}
      </h2>

      <div className="rounded-card border border-border-subtle bg-surface">
        <div className="flex items-center gap-3 px-4 py-3">
          <AssetLogo asset={asset} size={22} />
          <label
            htmlFor={champBase}
            className="shrink-0 text-sm font-medium uppercase text-ink"
          >
            {asset.symbol}
          </label>
          {/* `inputMode="decimal"` : le clavier tactile ouvre sur les chiffres, avec
              le séparateur décimal de la langue. Le type reste `text` — un
              `type="number"` refuse la virgule dans les locales qui l'utilisent. */}
          <input
            id={champBase}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={quantite}
            onChange={(event) => setQuantite(event.target.value)}
            aria-invalid={!valide}
            className="tabular min-w-0 flex-1 bg-transparent text-right text-sm font-semibold text-ink outline-none placeholder:text-ink-muted focus-visible:underline"
          />
        </div>

        <div className="flex items-center gap-3 border-t border-border-subtle px-4 py-3">
          {/* ── UNE GOUTTIÈRE VIDE, ET NON UNE INITIALE ─────────────────────────
              La place du logo portait la première lettre du code — « U » pour USD.
              Mesuré au navigateur : la ligne se lisait « U USD 103,17 $US », et ce
              « U » solitaire ressemblait à une image qui n'a pas chargé plutôt qu'à un
              repère. Une devise n'a pas de logo ; la gouttière garde simplement la
              largeur pour que les deux lignes s'alignent. */}
          <span aria-hidden="true" className="w-[22px] shrink-0" />
          <span id={champCible} className="shrink-0 text-sm font-medium uppercase text-ink">
            {currency}
          </span>
          <output
            htmlFor={champBase}
            aria-labelledby={champCible}
            className="tabular min-w-0 flex-1 truncate text-right text-sm font-semibold text-ink"
          >
            {nombres.currency(montant, currency) ?? '—'}
          </output>
        </div>
      </div>

      <p className="text-micro text-ink-muted">
        {native
          ? t('Cours coté directement en {devise} par la source.').replace('{devise}', currency)
          : t('Converti depuis {base} au taux du jour : la source ne cote pas cet actif en {devise}.')
              .replace('{base}', BASE_CURRENCY)
              .replace('{devise}', currency)}
      </p>
    </section>
  )
}
