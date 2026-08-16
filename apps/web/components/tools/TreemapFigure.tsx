import { formatCompact, formatPercent } from '@zenkuu/ui'

import { HEATMAP_CLAMP, heatTone, squarify } from '@/components/tools/treemap'
import { Link } from '@/i18n/navigation'

/**
 * LA FIGURE, sans les commandes qui la pilotent.
 *
 * ── CE QUE CE COMPOSANT SÉPARE ────────────────────────────────────────────────
 *
 * `treemap.ts` calcule la GÉOMÉTRIE, ce fichier dessine les TUILES, et les appelants
 * apportent les COMMANDES. Trois couches parce qu'il y a désormais trois figures — le
 * marché, les trésoreries, les collections NFT — dont seule la première a besoin
 * d'être interactive.
 *
 * Cette séparation-là n'est pas gratuite : elle garde les deux autres figures en
 * composants SERVEUR. Une carte thermique sans sélecteur n'a aucune raison de
 * descendre du JavaScript au navigateur, et le pavage étant calculé au rendu, elle
 * s'affiche avant même l'hydratation.
 *
 * ── PAS DE `'use client'` ─────────────────────────────────────────────────────
 *
 * Ni état ni effet : le composant est compilé dans le paquet client quand un appelant
 * client l'utilise, et reste sur le serveur quand un appelant serveur l'utilise. Poser
 * la directive lui interdirait la seconde moitié.
 */

export interface TreemapTile {
  id: string
  /** Étiquette courte, affichée dans la tuile. Un symbole vaut mieux qu'un nom. */
  label: string
  /** Surface. Doit être positive — une tuile de valeur nulle n'a pas de place. */
  value: number
  /** Teinte. Absente, la tuile reste neutre : une lacune n'est pas une stabilité. */
  change?: number
  /** Destination du clic. Absente, la tuile n'est pas cliquable. */
  href?: string
  /** Nom complet, pour l'infobulle et les lecteurs d'écran. */
  title?: string
}

export function TreemapFigure({
  tiles,
  periodLabel,
  height = 'min(70vh, 560px)',
  valueUnit = '',
}: {
  tiles: TreemapTile[]
  /** Fenêtre décrite par la couleur, reprise dans l'infobulle. */
  periodLabel: string
  height?: string
  /** Suffixe des montants dans l'infobulle, ex. « $ ». */
  valueUnit?: string
}) {
  const usable = tiles.filter((tile) => tile.value > 0)
  const boxes = squarify(usable.map((tile) => ({ id: tile.id, value: tile.value })))
  if (boxes.length === 0) return null

  const byId = new Map(usable.map((tile) => [tile.id, tile]))

  /*
   * LA LIGNE DE VARIATION EXISTE OU N'EXISTE PAS POUR TOUTE LA FIGURE.
   *
   * Elle affichait un tiret dès qu'une tuile n'avait pas de variation. C'est le bon
   * comportement sur la carte du marché, où le tiret DISTINGUE une fenêtre non publiée
   * de ses voisines chiffrées ; c'en est un mauvais sur la carte des trésoreries, où
   * AUCUNE tuile n'a de variation et où deux cents tirets alignés annoncent une colonne
   * vide plutôt qu'une dimension absente.
   *
   * La distinction se déduit donc de la figure entière plutôt que de se déclarer : si
   * pas une seule tuile ne porte de variation, la ligne disparaît. Un appelant ne peut
   * pas se tromper sur un réglage qu'il n'a pas à faire.
   */
  const hasChange = usable.some((tile) => tile.change !== undefined)

  return (
    /* Hauteur fixe en pixels, positions en pourcentages : la figure s'adapte en largeur
       sans que rien ne soit recalculé, et reste lisible en hauteur. */
    <div
      className="relative w-full overflow-hidden rounded-card border border-border-subtle bg-surface"
      style={{ height }}
    >
      {boxes.map((box) => {
        const tile = byId.get(box.id)
        if (!tile) return null

        const caption = `${tile.title ?? tile.label} — ${formatCompact(tile.value)}${valueUnit}${
          tile.change !== undefined
            ? `, ${formatPercent(tile.change)} sur ${periodLabel}`
            : ''
        }`

        const style = {
          left: `${box.x}%`,
          top: `${box.y}%`,
          width: `${box.width}%`,
          height: `${box.height}%`,
          backgroundColor: heatTone(tile.change),
        }

        const body = (
          <>
            {/* Étiquettes toujours présentes dans le DOM — donc lisibles par un lecteur
                d'écran et par un moteur — mais masquées visuellement quand la tuile est
                trop petite, pour ne pas déborder sur ses voisines. */}
            <span className="block truncate text-[0.6875rem] font-medium leading-tight text-ink">
              {tile.label}
            </span>
            {hasChange && box.height > 6 ? (
              <span className="tabular block truncate text-micro leading-tight text-ink-muted">
                {tile.change !== undefined ? formatPercent(tile.change) : '—'}
              </span>
            ) : null}
            {/* Le seuil du montant s'ABAISSE quand la figure n'a pas de variation : la
                ligne libérée par celle-ci lui laisse la place, et une tuile de trente
                pixels de haut peut porter deux lignes au lieu de trois. */}
            {(hasChange ? box.height > 12 && box.width > 12 : box.height > 6) ? (
              <span className="tabular block truncate text-micro leading-tight text-ink-muted">
                {formatCompact(tile.value)}
                {valueUnit}
              </span>
            ) : null}
          </>
        )

        /* Une tuile sans destination reste une `div` et non un lien inerte : un lien
           qui ne mène nulle part est atteignable au clavier et ne fait rien, ce qui est
           la définition d'un piège de tabulation utile à personne. */
        return tile.href !== undefined ? (
          <Link
            key={box.id}
            href={tile.href}
            title={caption}
            className="absolute block overflow-hidden border border-canvas p-1.5 transition-opacity duration-150 hover:opacity-80"
            style={style}
          >
            {body}
          </Link>
        ) : (
          <div
            key={box.id}
            title={caption}
            className="absolute block overflow-hidden border border-canvas p-1.5"
            style={style}
          >
            {body}
          </div>
        )
      })}
    </div>
  )
}

/** Échelle de couleurs, à poser à côté de la figure. */
export function TreemapLegend() {
  return (
    <div className="flex items-center gap-2 text-[0.6875rem] text-ink-muted">
      <span>−{HEATMAP_CLAMP} %</span>
      <span
        className="flex h-2.5 w-32 overflow-hidden rounded-pill border border-border-subtle"
        aria-hidden="true"
      >
        {[-10, -6, -3, 0, 3, 6, 10].map((step) => (
          <span key={step} className="flex-1" style={{ backgroundColor: heatTone(step) }} />
        ))}
      </span>
      <span>+{HEATMAP_CLAMP} %</span>
    </div>
  )
}
