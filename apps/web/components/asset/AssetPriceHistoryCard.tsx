import type { AssetDetail } from '@zenkuu/data'
import { formatCurrency } from '@zenkuu/ui'

import { getPhrase } from '@/lib/content'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * HISTORIQUE DES COURS — LES DEUX EXTRÊMES, ET LA DISTANCE QUI EN SÉPARE
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── CE QUE LA CARTE AJOUTE À DEUX NOMBRES ───────────────────────────────────
 *
 * Le plus haut et le plus bas historiques figuraient déjà dans le rail de gauche, avec
 * leur écart en pourcentage. Un pourcentage répond mal à la question qu'on se pose
 * réellement devant un plus haut : « combien de fois faut-il que ça monte pour y
 * revenir ? » — et « −43,76 % » ne se convertit pas de tête en « ×1,78 ».
 *
 * La carte donne donc les deux extrêmes avec leur date, et sous chacun le MULTIPLE qui
 * l'en sépare : `×1,78 jusqu'au plus haut`, `×3,83 depuis le plus bas`. C'est la forme
 * de la référence, et c'est la lecture qui manquait.
 *
 * ── ⚠️ LES DEUX MULTIPLES NE SE CALCULENT PAS DANS LE MÊME SENS ─────────────
 *
 * Vers le HAUT : `plus haut / cours` — combien il faut multiplier le cours actuel pour
 * atteindre le record. C'est un objectif, il est devant.
 *
 * Depuis le BAS : `cours / plus bas` — combien le cours vaut de fois son plancher.
 * C'est un chemin déjà parcouru, il est derrière.
 *
 * Les inverser donnerait deux nombres plausibles et faux, et rien à l'écran ne le
 * signalerait : c'est exactement le genre d'erreur que ce commentaire existe pour
 * empêcher.
 *
 * ── LA DATE DE LANCEMENT VIENT DU PLUS BAS, ET C'EST UNE APPROXIMATION ──────
 *
 * La source ne publie pas de date de première cotation. Elle publie la date du plus
 * bas historique, qui pour la grande majorité des actifs tombe dans les premiers jours
 * de cotation — mais pas pour tous. La carte n'affiche donc PAS de « date de
 * lancement » : elle affiche « plus bas historique, le … », ce qui est exactement ce
 * que la donnée dit. Annoncer une date de lancement qu'on n'a pas serait l'inventer.
 */
export async function AssetPriceHistoryCard({ asset }: { asset: AssetDetail }) {
  const t = await getPhrase()

  const { ath, athDate, atl, atlDate, price, currency } = asset
  if (ath === undefined && atl === undefined) return null

  /* Voir l'avertissement : le sens du rapport n'est pas le même des deux côtés. */
  const toAth = ath !== undefined && price > 0 ? ath / price : null
  const fromAtl = atl !== undefined && atl > 0 ? price / atl : null

  return (
    <section aria-labelledby="historique-titre" className="space-y-3">
      <h2 id="historique-titre" className="display-sm text-ink">
        {t('Historique des cours')}
      </h2>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Extreme
          label={t('Plus haut historique')}
          value={formatCurrency(ath, currency)}
          date={athDate}
          multiple={toAth}
          /* « jusqu'au » et non « depuis » : la nuance porte tout le sens du chiffre. */
          note={t('jusqu’au plus haut')}
          tone="up"
        />

        <Extreme
          label={t('Plus bas historique')}
          value={formatCurrency(atl, currency)}
          date={atlDate}
          multiple={fromAtl}
          note={t('depuis le plus bas')}
          tone="down"
        />
      </div>
    </section>
  )
}

function Extreme({
  label,
  value,
  date,
  multiple,
  note,
  tone,
}: {
  label: string
  value: string | null
  date: string | undefined
  multiple: number | null
  note: string
  tone: 'up' | 'down'
}) {
  if (!value) return null

  return (
    <div className="space-y-2 rounded-card border border-border-subtle bg-surface p-4">
      <p className="text-xs text-ink-muted">{label}</p>
      <p className="tabular text-xl font-bold text-ink">{value}</p>

      {date ? (
        <p className="text-xs text-ink-muted">
          {new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' }).format(new Date(date))}
        </p>
      ) : null}

      {/* La pastille n'apparaît que si le rapport se calcule. Un actif au plus haut
          exact donne ×1,0 — ce qui est juste et se lit bien : « il y est ». */}
      {multiple !== null && Number.isFinite(multiple) ? (
        <p
          className={`tabular inline-flex rounded-control px-2 py-1 text-xs font-semibold ${
            tone === 'up' ? 'bg-up-soft text-up' : 'bg-down-soft text-down'
          }`}
        >
          ×{multiple >= 100 ? Math.round(multiple).toLocaleString('fr-FR') : multiple.toFixed(2)}{' '}
          <span className="ml-1 font-normal opacity-80">{note}</span>
        </p>
      ) : null}
    </div>
  )
}
