'use client'

import { Check, Search } from 'lucide-react'
import { useMemo, useState } from 'react'

import type { AssetClass, MarketAsset } from '@zenkuu/data'

import { AssetLogo } from '@/components/asset/AssetLogo'
import {
  Combobox,
  ComboboxContent,
  ComboboxGroup,
  ComboboxInput,
  ComboboxItem,
  ComboboxLabel,
  ComboboxList,
  ComboboxTrigger,
} from '@/components/ui/combobox'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * SÉLECTEUR D'ACTIF — un champ de recherche, des groupes, une liste
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── CE QU'IL SERT ────────────────────────────────────────────────────────────
 *
 * Deux appelants aux besoins voisins mais distincts : le CONVERTISSEUR choisit UN
 * actif et referme, le COMPARATEUR en accumule jusqu'à six et reste ouvert. Trois
 * réglages suffisent à couvrir les deux : `mode` décide si le panneau se ferme,
 * `selectedIds` coche ce qui est déjà retenu, `disabledReason` explique ce qui est
 * hors d'atteinte.
 *
 * ── CE QUE `Combobox` REMPLACE, ET POURQUOI ÇA COMPTE ────────────────────────
 *
 * Ce fichier faisait 367 lignes. Il portait son propre champ de recherche, son
 * filtrage, un index d'entrée active tenu à la main, un `scrollIntoView` sur cet
 * index, un `aria-activedescendant` recalculé, un écouteur de clic extérieur, un
 * état de présence pour l'animation, et un compteur `flatIndex` qui faisait le lien
 * entre une liste GROUPÉE à l'affichage et une liste À PLAT pour le clavier.
 *
 * Ce compteur est l'endroit exact où ce genre de code se casse : il dépendait de
 * l'ordre de rendu, et toute insertion de groupe le désynchronisait de ce que le
 * lecteur voit. `Combobox` tient la sélection lui-même, quels que soient les groupes.
 *
 * S'y ajoute ce que la version maison n'avait pas :
 *
 *   · LE FILTRAGE EST CELUI DU COMPOSANT, appliqué à la liste fournie. On garde le
 *     tri par classe puis par capitalisation — c'est notre règle, pas la sienne.
 *   · LE PANNEAU SE RETOURNE quand il touche le bas de la fenêtre. L'ancien était
 *     `absolute top-full` : sur un déclencheur en bas d'écran, la liste sortait de
 *     la vue et l'on ne pouvait pas la parcourir.
 *   · LE FOCUS REVIENT au déclencheur à la fermeture.
 *
 * ⚠️ `filter={null}` : la recherche est faite ICI, dans `matches`, parce qu'elle
 * cherche sur le nom ET le symbole et trie ensuite selon nos propres règles. Laisser
 * le filtre intégré s'y ajouter retaillerait une seconde fois un résultat déjà
 * pertinent — le même piège que sur la recherche globale (voir `SearchResults`).
 */

/**
 * Ordre des classes dans la liste.
 *
 * La crypto d'abord : c'est l'univers le plus consulté du site, et le plus large.
 * Les devises et les NFT ferment la marche — on les cherche en les nommant, pas en
 * les parcourant.
 */
const CLASS_ORDER: AssetClass[] = ['crypto', 'stock', 'etf', 'index', 'commodity', 'forex', 'nft']

const CLASS_LABELS: Record<AssetClass, string> = {
  crypto: 'Cryptomonnaies',
  stock: 'Actions',
  etf: 'ETF',
  index: 'Indices',
  commodity: 'Matières premières',
  forex: 'Devises',
  nft: 'NFT',
}

interface Props {
  assets: MarketAsset[]
  onSelect: (asset: MarketAsset) => void
  /** Identifiants déjà retenus : cochés dans la liste. */
  selectedIds: string[]
  /**
   * `single` referme le panneau au choix, `multiple` le laisse ouvert.
   *
   * Ce n'est pas un détail : accumuler quatre actifs en rouvrant le panneau quatre
   * fois est quatre fois le même geste inutile, et on perd la recherche en cours à
   * chaque fermeture.
   */
  mode?: 'single' | 'multiple'
  /** Libellé au-dessus du déclencheur. Absent, rien n'est écrit. */
  label?: string
  /**
   * Actifs qu'on ne peut pas ajouter, et la raison — affichée sur la ligne.
   *
   * Une ligne grisée SANS explication laisse croire à une panne. Le comparateur s'en
   * sert pour dire « limite atteinte » plutôt que d'ignorer le clic en silence.
   */
  disabledReason?: (asset: MarketAsset) => string | null
  /** Contenu du bouton qui ouvre le panneau. Reçoit l'état d'ouverture. */
  children: (open: boolean) => React.ReactNode
  /** Classes du bouton déclencheur — sa forme appartient à l'appelant. */
  triggerClassName?: string
}

export function AssetPicker({
  assets,
  onSelect,
  selectedIds,
  mode = 'single',
  label,
  disabledReason,
  children,
  triggerClassName = 'flex w-full items-center gap-2 border border-border-subtle bg-surface px-3 py-2.5 text-left transition-colors hover:border-brand focus:border-brand focus:outline-none',
}: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  /*
   * Résultats filtrés PUIS triés, groupés pour l'affichage.
   *
   * Le tri est le nôtre et il compte : classe d'abord (voir `CLASS_ORDER`), puis
   * capitalisation décroissante. Un tri alphabétique ferait remonter « Aave » devant
   * « Bitcoin », ce qui est exact et inutile — on cherche d'abord ce qui pèse.
   */
  const groups = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const pool = needle
      ? assets.filter((asset) =>
          `${asset.name} ${asset.symbol}`.toLowerCase().includes(needle),
        )
      : assets

    const sorted = [...pool].sort((a, b) => {
      const classDiff = CLASS_ORDER.indexOf(a.assetClass) - CLASS_ORDER.indexOf(b.assetClass)
      if (classDiff !== 0) return classDiff
      return (b.marketCap ?? 0) - (a.marketCap ?? 0)
    })

    const map = new Map<AssetClass, MarketAsset[]>()
    for (const asset of sorted) {
      const bucket = map.get(asset.assetClass)
      if (bucket) bucket.push(asset)
      else map.set(asset.assetClass, [asset])
    }
    return [...map.entries()]
  }, [assets, query])

  function choose(asset: MarketAsset) {
    if (disabledReason?.(asset)) return
    onSelect(asset)

    /* En mode multiple, le panneau reste ouvert MAIS la recherche est effacée : le
       terme qui a servi à trouver le premier actif ne sert plus à trouver le second,
       et le laisser ferait croire que la liste est vide. */
    if (mode === 'single') setOpen(false)
    else setQuery('')
  }

  return (
    <div className="relative">
      {label ? <span className="mb-1 block text-xs text-ink-muted">{label}</span> : null}

      {/*
        `items={[]}` et `filter={null}` : la liste et son filtrage vivent dans
        `groups` ci-dessus. Le composant ne sert ici qu'à tenir l'ouverture, la
        sélection au clavier et le positionnement — voir l'en-tête du fichier.

        `openOnInputClick` : le déclencheur EST le champ visuel pour l'appelant, et
        un clic dessus doit ouvrir la liste sans passer par une seconde cible.
      */}
      <Combobox
        open={open}
        onOpenChange={setOpen}
        inputValue={query}
        onInputValueChange={setQuery}
        filter={null}
        items={[]}
      >
        <ComboboxTrigger
          render={<button type="button" className={triggerClassName} />}
          showIcon={false}
        >
          {children(open)}
        </ComboboxTrigger>

        {/* `min-w-full` : en mode multiple le déclencheur est une petite carte
            d'ajout, et un panneau calé sur sa largeur serait trop étroit pour lire un
            nom d'actif. */}
        <ComboboxContent className="min-w-[min(22rem,90vw)] border border-border-subtle bg-overlay shadow-overlay">
          {/*
            ══════════════════════════════════════════════════════════════════════
            ⚠️ `showTrigger={false}` — SANS LUI LE PANNEAU S'ANCRAIT SUR LUI-MÊME
            ══════════════════════════════════════════════════════════════════════

            Notre `ComboboxInput` enveloppe la primitive dans un `InputGroup` et lui
            ajoute, PAR DÉFAUT, un chevron qui est un second `Combobox.Trigger`. Utile
            quand le champ est le déclencheur ; ici le champ vit DANS le panneau, et ce
            second déclencheur y vit avec lui.

            Base UI ne garde qu'un `triggerElement` dans son magasin : le dernier monté
            gagne, c'est-à-dire celui du panneau. Or son positionneur s'ancre justement
            sur `triggerElement` dès que le champ est à l'intérieur du panneau — le
            panneau s'ancrait donc SUR UN ÉLÉMENT DE LUI-MÊME. Relevé au navigateur sur
            `/comparateur` : la liste s'ouvrait à trois cents pixels de la carte
            « Ajouter un actif », dérivait, et se refermait au moindre clic à côté —
            d'où l'impression d'un menu qui disparaît tout seul.

            Le chevron ne manque à personne : la carte d'ajout porte déjà le sien.
          */}
          <div className="flex items-center gap-2 border-b border-border-subtle px-3 py-2">
            <Search className="h-3.5 w-3.5 shrink-0 text-ink-muted" aria-hidden="true" />
            <ComboboxInput
              showTrigger={false}
              placeholder="Rechercher un actif…"
              aria-label="Rechercher un actif"
              className="w-full border-0 bg-transparent py-1 text-sm text-ink shadow-none focus-visible:ring-0"
            />
          </div>

          <ComboboxList className="max-h-72">
            {/*
              ⚠️ `Combobox.Empty` A ÉTÉ REMPLACÉ PAR UNE CONDITION À NOUS.

              Il se règle sur la collection que Base UI connaît, et cette collection est
              `items={[]}` — la liste et son filtrage vivent ici (voir l'en-tête). Le
              composant tenait donc TOUJOURS la liste pour vide : « Aucun actif ne
              correspond à «  » » s'affichait en permanence, en tête d'une liste de cent
              quarante entrées bien visibles juste en dessous.

              `groups` est la seule source qui sache ce qui est réellement rendu.
            */}
            {groups.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-ink-muted">
                Aucun actif ne correspond à « {query} ».
              </p>
            ) : null}

            {groups.map(([assetClass, entries]) => (
              <ComboboxGroup key={assetClass}>
                {/* En-tête COLLÉ : sur une liste de trois cents entrées, la section
                    courante disparaît en haut du panneau dès le premier défilement,
                    et le lecteur ne sait plus ce qu'il parcourt. */}
                <ComboboxLabel className="sticky top-0 z-10 bg-overlay px-3 py-1.5 text-micro font-semibold uppercase tracking-wide text-ink-muted">
                  {CLASS_LABELS[assetClass]}
                </ComboboxLabel>

                {entries.map((asset) => {
                  const isSelected = selectedIds.includes(asset.id)
                  const blocked = disabledReason?.(asset) ?? null

                  return (
                    <ComboboxItem
                      key={asset.id}
                      value={asset.id}
                      disabled={blocked !== null}
                      onClick={() => choose(asset)}
                      className="flex items-center gap-2.5 px-3 py-2"
                    >
                      <AssetLogo asset={asset} size={20} />
                      <span className="min-w-0 flex-1 truncate text-sm text-ink">
                        {asset.name}
                      </span>
                      {blocked ? (
                        <span className="shrink-0 text-micro text-ink-muted">{blocked}</span>
                      ) : (
                        <span className="shrink-0 text-xs uppercase text-ink-muted">
                          {asset.symbol}
                        </span>
                      )}
                      {isSelected ? (
                        <Check className="h-3.5 w-3.5 shrink-0 text-brand" aria-hidden="true" />
                      ) : null}
                    </ComboboxItem>
                  )
                })}
              </ComboboxGroup>
            ))}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </div>
  )
}
