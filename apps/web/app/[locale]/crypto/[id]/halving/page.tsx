import { getLocale } from 'next-intl/server'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { halvingSchedule } from '@/content/halving'
import { Link } from '@/i18n/navigation'
import { getPhrase, getSeo } from '@/lib/content'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * LE CALENDRIER DES HALVINGS
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── POURQUOI CETTE PAGE EXISTE, ET POURQUOI ELLE SEULE ─────────────────────
 *
 * L'audit a identifié `/coins/bitcoin/bitcoin-halving` comme la SEULE page de la
 * référence qu'un site de cotation puisse construire sans source externe : le
 * protocole est public, les dates passées sont vérifiables sur la chaîne, et la
 * suivante est un calcul. Toutes les autres pages manquantes butent sur une donnée
 * qu'il faudrait acheter ou agréger à la main.
 *
 * ── ELLE NE VAUT QUE POUR LE BITCOIN, ET LA ROUTE LE DIT ───────────────────
 *
 * Le segment `[id]` est dynamique par cohérence avec `/crypto/[id]`, mais un
 * calendrier de halving n'a de sens que pour un actif dont le protocole en prévoit
 * un. Rendre cette page pour un jeton quelconque afficherait un tableau inventé.
 * Tout `id` autre que `bitcoin` est donc un 404 franc — voir `generateStaticParams`,
 * qui n'en pré-rend qu'un.
 *
 * ⚠️ CE N'EST PAS UNE LIMITE TECHNIQUE. Litecoin, Bitcoin Cash et d'autres ont leur
 * propre calendrier, avec d'autres constantes. Les ajouter demande leurs paramètres
 * de protocole, pas une refonte : `halvingSchedule` prend déjà son nombre de rangs
 * en argument.
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getPhrase()
  const seo = await getSeo()
  return {
    title: t('Halving du bitcoin'),
    description: seo(
      '/crypto/bitcoin/halving',
      'Le calendrier des divisions par deux de la récompense de bloc : dates observées, hauteurs de bloc et récompenses, calculés depuis les règles du protocole.',
    ),
  }
}

/** Seul le bitcoin a un calendrier de halving sur ce site — voir l'en-tête. */
export function generateStaticParams() {
  return [{ id: 'bitcoin' }]
}

export default async function HalvingPage({ params }: { params: Promise<{ id: string }> }) {
  const locale = await getLocale()

  const { id } = await params
  if (id !== 'bitcoin') notFound()

  const t = await getPhrase()
  const rows = halvingSchedule()

  return (
    <div className="space-y-6">
      <nav aria-label={t('Fil d’Ariane')} className="text-xs text-ink-muted">
        <Link href="/crypto" className="transition-colors hover:text-ink">
          {t('Cryptomonnaies')}
        </Link>
        <span className="mx-1.5" aria-hidden="true">
          /
        </span>
        <Link
          href={{ pathname: '/crypto/[id]', params: { id: 'bitcoin' } }}
          className="transition-colors hover:text-ink"
        >
          Bitcoin
        </Link>
        <span className="mx-1.5" aria-hidden="true">
          /
        </span>
        <span className="text-ink">{t('Halving')}</span>
      </nav>

      <header className="max-w-3xl space-y-3">
        <h1 className="display-xl text-ink">{t('Halving du bitcoin')}</h1>
        <p className="text-lg leading-relaxed text-ink-muted">
          {t(
            'Tous les 210 000 blocs, la récompense versée aux mineurs est divisée par deux. C’est une règle du protocole, pas une décision : elle borne l’émission totale à 21 millions de bitcoins.',
          )}
        </p>
      </header>

      <div className="overflow-x-auto rounded-card">
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">{t('Calendrier des halvings du bitcoin')}</caption>
          <thead>
            <tr className="border-b border-border-subtle text-left text-[length:var(--v2-text-2xs)] font-semibold text-ink-muted">
              <th scope="col" className="px-3 py-2.5">
                {t('Rang')}
              </th>
              <th scope="col" className="px-3 py-2.5">
                {t('Date')}
              </th>
              <th scope="col" className="px-3 py-2.5 text-right">
                {t('Hauteur de bloc')}
              </th>
              <th scope="col" className="px-3 py-2.5 text-right">
                {t('Récompense avant')}
              </th>
              <th scope="col" className="px-3 py-2.5 text-right">
                {t('Récompense après')}
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-border-subtle">
            {rows.map((row) => (
              <tr key={row.count} className="transition-colors hover:bg-surface-muted">
                <td className="tabular px-3 py-2.5 text-ink">{row.count}</td>
                <td className="px-3 py-2.5 text-ink">
                  {row.date}
                  {/* Une date projetée est marquée SUR LA LIGNE, pas en note de bas de
                      tableau : un lecteur qui balaie la colonne doit voir laquelle est
                      un fait et laquelle est une hypothèse, sans chercher ailleurs. */}
                  {row.estimated ? (
                    <span className="ml-2 text-xs text-ink-muted">{t('estimée')}</span>
                  ) : null}
                </td>
                <td className="tabular px-3 py-2.5 text-right text-ink">
                  {row.height.toLocaleString(locale)}
                </td>
                <td className="tabular px-3 py-2.5 text-right text-ink-muted">
                  {row.rewardBefore} BTC
                </td>
                <td className="tabular px-3 py-2.5 text-right text-ink">{row.rewardAfter} BTC</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="max-w-2xl text-xs leading-relaxed text-ink-muted">
        {t(
          'Les dates passées sont observées sur la chaîne et vérifiables à la hauteur de bloc indiquée. Les suivantes sont des projections : un bloc vise dix minutes, mais la difficulté s’ajuste avec retard et le rythme réel dérive de quelques jours par an. Les récompenses, elles, sont exactes — elles se déduisent de la règle du protocole.',
        )}
      </p>
    </div>
  )
}
