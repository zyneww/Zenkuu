'use client'

import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

/**
 * Rangée de pastilles de sélection, avec son intitulé.
 *
 * ── CE QUE C'EST DEVENU ──────────────────────────────────────────────────────
 *
 * Le dessin — un rail bordé, une pastille pleine pour l'option retenue — était écrit
 * ici, en classes. C'est maintenant le `ToggleGroup` de shadcn/ui, c'est-à-dire celui
 * de Radix : un vrai groupe à sélection unique, avec les flèches directionnelles,
 * Origine/Fin, et un état de sélection que la synthèse vocale annonce. L'ancienne
 * version ne donnait que `aria-pressed` sur des boutons indépendants, que rien ne
 * reliait entre eux.
 *
 * ── LA SÉLECTION REMONTE AU GROUPE, ET C'EST LA SEULE RUPTURE D'API ──────────
 *
 * `Chip` portait `active` et `onClick` ; il ne porte plus qu'une `value`. Ce n'est pas
 * un choix de style : dans Radix, un `ToggleGroupItem` LIT sa sélection dans le
 * contexte du groupe. Tenir l'état sur la pastille aurait produit un contrôle dont
 * l'apparence et le comportement divergent.
 *
 * ── LA SÉLECTION VIDE N'EXISTE PAS ICI ───────────────────────────────────────
 *
 * ⚠️ Radix n'a pas de `disallowEmptySelection` : recliquer la pastille active appelle
 * `onValueChange` avec la CHAÎNE VIDE. Un graphique sans période, sans découpage ni
 * taille de tuile n'a pas d'état de repli — le garde `if (next)` ci-dessous ignore
 * donc ce cas, et la pastille reste allumée. Sans lui, un double-clic distrait vide la
 * barre du treemap et le graphique disparaît.
 *
 * ── RADIX NE CONNAÎT QUE DES CHAÎNES, LES APPELANTS NON ─────────────────────
 *
 * `ToggleGroup` est une union discriminée sur `type` : en `single` il parle de
 * `string`, en `multiple` de `string[]`. Trois appelants, eux, identifient leurs
 * pastilles par un NOMBRE — le nombre de jours d'une période, la taille d'une tuile.
 * Les faire passer à la chaîne à chaque site aurait dispersé la même conversion en six
 * endroits, dont trois `Number(...)` au retour qu'il aurait fallu ne pas oublier.
 *
 * La sérialisation vit donc ICI, en un point : `String()` à l'aller, et un
 * `serialise`/`parse` symétrique au retour. Le générique `T extends string | number`
 * rend l'union littérale de l'appelant intacte de bout en bout — c'est lui qui décide
 * du type de ses identifiants, pas la bibliothèque de rendu.
 *
 * ⚠️ Corollaire : deux pastilles dont les identifiants ont la MÊME écriture décimale
 * (`1` et `'1'`) sont indiscernables une fois sérialisées. Aucun groupe du site ne
 * mélange les deux types, et il ne faut pas commencer.
 */

/**
 * Intitulé + rangée de pastilles.
 *
 * Les DEUX niveaux s'enroulent, et il faut les deux : à 320 px, l'intitulé tient sur
 * une ligne et la rangée sur la suivante ; à 360, la rangée elle-même se coupe en
 * deux. Sans le second `flex-wrap`, la boîte des pastilles débordait de la sienne et
 * poussait la page — neuf pixels, mesurés sur iPhone SE.
 */
export function ChipGroup<T extends string | number>({
  label,
  value,
  onChange,
  children,
}: {
  label: string
  /** Identifiant de la pastille retenue. */
  value: T
  onChange: (value: T) => void
  children: React.ReactNode
}) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <span className="text-[0.6875rem] uppercase tracking-wide text-ink-muted">{label}</span>
      <ToggleGroup
        type="single"
        size="sm"
        variant="outline"
        aria-label={label}
        value={String(value)}
        onValueChange={(next) => {
          if (!next) return
          // Le type de sortie suit celui de l'entrée : un groupe indexé par nombres
          // rend des nombres. C'est `value` qui fait foi, jamais la chaîne de Radix.
          onChange((typeof value === 'number' ? Number(next) : next) as T)
        }}
        /* La largeur reste intrinsèque par défaut, ce qui empêche l'enroulement alors
           que quatre rangées se suivent sur la barre du treemap et doivent pouvoir se
           couper. `flex-wrap` seul ne suffit pas tant que la largeur ne plafonne pas. */
        className="max-w-full flex-wrap"
      >
        {children}
      </ToggleGroup>
    </div>
  )
}

export function Chip({ id, label }: { id: string | number; label: string }) {
  return (
    <ToggleGroupItem value={String(id)} aria-label={label}>
      {label}
    </ToggleGroupItem>
  )
}
