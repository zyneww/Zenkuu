import { getLocale } from 'next-intl/server'
import type { DataResult, GlobalMarketStats } from '@zenkuu/data'

import { GlobalStatsBar } from '@/components/home/GlobalStatsBar'
import { getPhrase } from '@/lib/content'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * L'EN-TÊTE DE LA PAGE — TITRE, SOUS-TITRE, CINQ CHIFFRES
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── LE TITRE EST VISIBLE, ET IL NE L'ÉTAIT PAS ─────────────────────────────
 *
 * La version précédente cachait son `<h1>` derrière `sr-only` et ouvrait sur une
 * ligne de date centrée. La référence fait l'inverse : un titre lisible, un
 * sous-titre qui dit ce que la page couvre, puis les chiffres.
 *
 * C'est aussi ce que demande le référencement d'une page de cotations : « Cours des
 * cryptomonnaies » est la requête, et elle doit être écrite quelque part que l'œil
 * ET l'indexeur atteignent. Un `h1` masqué ne vaut pas moins pour l'indexeur, mais
 * il laisse la page s'ouvrir sur un chiffre sans phrase pour le nommer.
 *
 * ── LA DATE A DISPARU DE L'OUVERTURE ───────────────────────────────────────
 *
 * `MarketDate` posait le jour en toutes lettres, centré, au-dessus de tout. Sa
 * fonction — dire à quand remontent les chiffres — est reprise ici en une ligne de
 * sous-titre, à côté du nombre d'actifs couverts. Le composant reste au dépôt pour
 * les pages qui ouvrent sur une date.
 *
 * ── LE SOUS-TITRE COMPTE CE QU'IL ANNONCE ──────────────────────────────────
 *
 * « Suivez le cours de N cryptomonnaies » où N vient de `stats.activeAssets`, et non
 * d'un nombre rond écrit à la main : ce catalogue grossit de quelques unités par
 * jour, et une constante figée devient fausse en une semaine.
 */
export async function PriceHeader({ globals }: { globals: DataResult<GlobalMarketStats> }) {
  const locale = await getLocale()
  const t = await getPhrase()

  const stats = globals.ok ? globals.data : null

  return (
    <header className="flex flex-col gap-6">
      <div className="max-w-3xl space-y-2">
        <h1 className="display-xl text-ink">{t('Cours et prix des cryptomonnaies en temps réel')}</h1>
        <p className="text-base leading-relaxed text-ink-muted">
          {stats
            ? t(
                'Suivez le cours de {count} cryptomonnaies, classées par capitalisation boursière. Prix, variations et volumes, rafraîchis toutes les trois minutes.',
              ).replace('{count}', stats.activeAssets.toLocaleString(locale))
            : t(
                'Suivez le cours des cryptomonnaies, classées par capitalisation boursière. Prix, variations et volumes, rafraîchis toutes les trois minutes.',
              )}
        </p>
      </div>

      {/* Le bandeau se retire ENTIÈREMENT quand l'agrégat manque, plutôt que de rendre
          cinq tirets. Cinq emplacements vides sous un titre se lisent comme une page
          cassée ; leur absence laisse simplement le tableau plus haut. La raison de
          l'absence, elle, est portée par le tableau qui suit — il touche le même
          fournisseur et affiche son propre motif d'indisponibilité. */}
      {stats ? <GlobalStatsBar stats={stats} /> : null}
    </header>
  )
}
