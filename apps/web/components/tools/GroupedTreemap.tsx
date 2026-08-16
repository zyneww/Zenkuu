import { formatCompact, formatPercent } from '@zenkuu/ui'

import {
  categoryEdge,
  categoryTone,
  heatTone,
  squarifyGrouped,
  type TreemapGroupInput,
} from '@/components/tools/treemap'
import { Link } from '@/i18n/navigation'
import type { TreemapTile } from '@/components/tools/TreemapFigure'

export type HeatmapColorMode = 'categorical' | 'change'

export interface TreemapGroup {
  id: string
  label: string
  tiles: TreemapTile[]
}

/**
 * CARTE THERMIQUE GROUPÉE — la figure de Token Terminal.
 *
 * ── CE QU'ELLE AJOUTE À `TreemapFigure` ──────────────────────────────────────
 *
 * Un étage. La figure plate range cent actifs par taille décroissante et rien
 * d'autre : on y voit qui pèse lourd, on n'y voit pas que les six premières tuiles
 * sont toutes des émetteurs de stablecoins. L'information de STRUCTURE est dans les
 * données et absente du dessin.
 *
 * Chaque secteur reçoit donc son cadre et son titre, et ses actifs sont pavés à
 * l'intérieur. La lecture change du tout au tout : la composition du marché se voit
 * avant les montants.
 *
 * ── ANATOMIE DE TUILE, RELEVÉE SUR LA RÉFÉRENCE ──────────────────────────────
 *
 * Mesurée au navigateur plutôt que décrite de mémoire : cadre de groupe à 8 pixels de
 * rayon et 20 % d'opacité, tuile à 4 pixels et 10 %, et une bordure de 4 pixels qui
 * TIENT LIEU DE GOUTTIÈRE — les tuiles ne sont pas espacées, elles sont bordées, ce
 * qui laisse toute la surface au pavage sans que les rectangles ne se touchent. La
 * valeur est en 12 pixels à demi-opacité, sous une étiquette pleine.
 *
 * ── DEUX COLORATIONS, UN SEUL DESSIN ─────────────────────────────────────────
 *
 * `categorical` identifie par famille, `change` mesure le mouvement du jour. Les deux
 * questions sont distinctes — « de quoi ce marché est-il fait » contre « qu'est-ce qui
 * monte » — et la référence propose les deux. Seule la fonction de teinte change ;
 * la géométrie, elle, est calculée une fois.
 */
export function GroupedTreemap({
  groups,
  colorMode,
  periodLabel,
  height = 'min(78vh, 640px)',
  valueUnit = '',
}: {
  groups: TreemapGroup[]
  colorMode: HeatmapColorMode
  periodLabel: string
  height?: string
  valueUnit?: string
}) {
  const input: TreemapGroupInput[] = groups.map((group) => ({
    id: group.id,
    label: group.label,
    items: group.tiles.map((tile) => ({ id: tile.id, value: tile.value })),
  }))

  const boxes = squarifyGrouped(input)
  if (boxes.length === 0) return null

  const tilesById = new Map(groups.flatMap((group) => group.tiles.map((tile) => [tile.id, tile])))

  /* Dénominateur des parts affichées : la somme de TOUTES les tuiles de la figure, pas
     de celles du groupe. Une part rapportée au groupe dirait « 62 % » d'un secteur
     minuscule, ce qui se lirait comme 62 % du marché. */
  const total = groups.reduce(
    (sum, group) => sum + group.tiles.reduce((inner, tile) => inner + tile.value, 0),
    0,
  )

  /* L'index de teinte suit l'ordre des groupes TELS QU'ILS ARRIVENT, et non l'ordre du
     pavage : ce dernier réordonne par surface, si bien qu'un même secteur changerait de
     couleur d'une période à l'autre. Une couleur identifiante doit être stable. */
  const toneIndex = new Map(groups.map((group, index) => [group.id, index]))

  return (
    <div
      className="relative w-full overflow-hidden rounded-card border border-border-subtle bg-surface"
      style={{ height }}
    >
      {boxes.map((box) => {
        const index = toneIndex.get(box.id) ?? 0

        return (
          <div
            key={box.id}
            className="absolute overflow-hidden rounded-[8px]"
            style={{
              left: `${box.x}%`,
              top: `${box.y}%`,
              width: `${box.width}%`,
              height: `${box.height}%`,
              backgroundColor: categoryTone(index, 'group'),
              /* La bordure du cadre reprend la teinte du groupe, même en coloration par
                 variation : c'est elle qui délimite les familles, et l'y remplacer par
                 un gris ferait disparaître le groupement dès qu'on bascule de mode. */
              boxShadow: `inset 0 0 0 1px ${categoryEdge(index)}`,
            }}
          >
            {/* Le titre du secteur, dans sa bande. `truncate` plutôt qu'un retour à la
                ligne : un nom sur deux lignes mangerait la moitié d'un petit groupe. */}
            <span className="absolute left-2 top-1 truncate pr-2 text-[0.6875rem] font-medium leading-tight text-ink">
              {box.label}
            </span>

            {box.children.map((child) => {
              const tile = tilesById.get(child.id)
              if (!tile) return null

              /* Les coordonnées des enfants sont absolues DANS LA FIGURE ; le cadre du
                 groupe étant lui-même positionné, on les ramène à son repère. */
              const local = {
                left: `${((child.x - box.x) / box.width) * 100}%`,
                top: `${((child.y - box.y) / box.height) * 100}%`,
                width: `${(child.width / box.width) * 100}%`,
                height: `${(child.height / box.height) * 100}%`,
              }

              const background =
                colorMode === 'change' ? heatTone(tile.change) : categoryTone(index, 'tile')

              const caption = `${tile.title ?? tile.label} — ${formatCompact(tile.value)}${valueUnit}${
                tile.change !== undefined ? `, ${formatPercent(tile.change)} sur ${periodLabel}` : ''
              }`

              const share = total > 0 ? (tile.value / total) * 100 : 0

              const body = (
                <>
                  <span className="block truncate text-[0.6875rem] font-medium leading-tight text-ink">
                    {tile.label}
                  </span>
                  {/* La valeur à DEMI-OPACITÉ, comme sur la référence : elle doit se
                      lire quand on la cherche, sans concurrencer l'étiquette. Masquée
                      sous une certaine taille, faute de quoi elle déborderait.

                      LA PART EST DONNÉE ENTRE PARENTHÈSES, et c'est ce que fait Token
                      Terminal. Un montant seul ne se situe pas — « 439 Md $ » ne dit
                      pas si c'est beaucoup — alors qu'une surface accompagnée de sa
                      part se lit sans revenir aux autres tuiles. */}
                  {child.height > 4 && child.width > 5 ? (
                    <span className="tabular block truncate text-micro leading-tight text-ink-muted">
                      {formatCompact(tile.value)}
                      {valueUnit}
                      {share >= 0.1 ? ` (${share.toFixed(1).replace('.', ',')} %)` : ''}
                      {colorMode === 'change' && tile.change !== undefined
                        ? ` · ${formatPercent(tile.change)}`
                        : ''}
                    </span>
                  ) : null}
                </>
              )

              const style = {
                ...local,
                backgroundColor: background,
                /* LA BORDURE EST LA GOUTTIÈRE. Quatre pixels de la couleur du fond
                   séparent les tuiles sans qu'aucune surface ne soit retranchée au
                   pavage — le procédé exact de la référence, et la raison pour laquelle
                   ses tuiles semblent flotter dans leur cadre. */
                border: '2px solid var(--color-surface)',
              }

              return tile.href !== undefined ? (
                <Link
                  key={child.id}
                  href={tile.href}
                  title={caption}
                  className="absolute flex flex-col justify-end overflow-hidden rounded-[4px] p-1 transition-opacity duration-150 hover:opacity-75"
                  style={style}
                >
                  {body}
                </Link>
              ) : (
                <div
                  key={child.id}
                  title={caption}
                  className="absolute flex flex-col justify-end overflow-hidden rounded-[4px] p-1"
                  style={style}
                >
                  {body}
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}
