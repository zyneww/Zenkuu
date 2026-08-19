import type { Metadata } from 'next'
import { Link } from '@/i18n/navigation'

import { weave } from '@/components/locale/emphasise'
import { getContent, getPhrase, getSeo } from '@/lib/content'

/**
 * Métadonnées DÉRIVÉES DE LA LANGUE, d'où la fonction plutôt que la constante.
 *
 * Un `export const metadata` est évalué une fois au chargement du module : il ne
 * peut pas connaître la locale de la requête, et servait donc un titre français sur
 * les pages anglaises.
 */
export async function generateMetadata(): Promise<Metadata> {
  const fr = await getContent()
  const seo = await getSeo()
  return {
  title: fr.pages.developers,
  description: seo(
    '/developpeurs',
    'Les routes internes de ZENKUU, les sources de données publiques utilisées, et l’état réel d’une API publique ZENKUU.',
  ),
  alternates: { canonical: '/developpeurs' },
  }
}

/**
 * Page développeurs — volontairement factuelle.
 *
 * Elle documente les routes qui EXISTENT et dit explicitement qu'aucune API publique
 * n'est ouverte. Annoncer une API à venir avec une adresse et un format inventés
 * serait exactement le genre de contenu de remplissage que le §5 proscrit — et ici
 * le lecteur est un développeur, qui s'en apercevrait immédiatement.
 */

const ROUTES = [
  {
    path: '/api/recherche',
    params: 'q',
    description:
      'Recherche universelle sur les actifs. Alimente l’overlay de l’en-tête ; renvoie identité et rang, sans cours.',
  },
  {
    path: '/api/historique',
    params: 'classe, id, jours, devise',
    description:
      'Série de prix d’un actif sur la fenêtre demandée. Inclut le volume quand la source le publie dans la même réponse.',
  },
  {
    path: '/api/bougies',
    params: 'classe, id, jours, devise',
    description:
      'Bougies OHLC. Route distincte de l’historique : chez certaines sources elle coûte un appel externe supplémentaire, on ne la déclenche donc qu’à la demande.',
  },
  {
    path: '/api/tendances',
    params: '—',
    description: 'Actifs en tendance, chargés à la demande par l’overlay de recherche.',
  },
]

const SOURCES = [
  { name: 'CoinGecko', usage: 'Cryptomonnaies : classements, fiches, historiques, catégories', url: 'https://www.coingecko.com/en/api' },
  { name: 'Frankfurter / BCE', usage: 'Taux de change de référence, quotidiens', url: 'https://frankfurter.dev' },
  { name: 'Yahoo Finance', usage: 'Actions, ETF, indices, matières premières', url: 'https://finance.yahoo.com' },
  { name: 'Alternative.me', usage: 'Indice de peur et d’avidité', url: 'https://alternative.me/crypto/fear-and-greed-index/' },
]

export default async function DeveloppeursPage() {
  const t = await getPhrase()
  return (
    <div className="mx-auto max-w-3xl space-y-10 py-6">
      <header className="space-y-3">
        <h1 className="display-lg text-ink">{t('API & développeurs')}</h1>
        <p className="text-base leading-relaxed text-ink-muted">
          ZENKUU n’expose <strong className="text-ink">aucune API publique</strong>{t('à ce jour. Les routes ci-dessous sont internes : elles servent les pages du site, ne sont pas versionnées et peuvent changer sans préavis. Elles sont documentées par transparence, pas comme un contrat.')}</p>
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-ink">Routes internes</h2>
        <div className="overflow-x-auto">
          {/* Trois colonnes de PROSE : rien à masquer, tout à laisser revenir à la
              ligne. Le plancher de 576 pixels tombe sous `sm` et les chemins passent en
              `break-all`, faute de quoi une route sans espace refuserait de se couper. */}
          <table className="w-full border-collapse text-left text-sm sm:min-w-[36rem]">
            <thead>
              <tr className="border-b border-border-subtle text-xs uppercase tracking-wide text-ink-muted">
                <th scope="col" className="py-2 pr-3 font-medium">Route</th>
                <th scope="col" className="py-2 pr-3 font-medium">{t('Paramètres')}</th>
                <th scope="col" className="py-2 font-medium">Rôle</th>
              </tr>
            </thead>
            <tbody>
              {ROUTES.map((route) => (
                <tr key={route.path} className="border-b border-border-subtle align-top">
                  <td className="py-2.5 pr-3">
                    <code className="rounded bg-surface-muted px-1.5 py-0.5 text-xs text-ink break-all">
                      {route.path}
                    </code>
                  </td>
                  <td className="py-2.5 pr-3 text-xs text-ink-muted">{route.params}</td>
                  <td className="py-2.5 text-xs leading-relaxed text-ink-muted">
                    {t(route.description)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-ink">{t('Sources de données')}</h2>
        <p className="text-sm leading-relaxed text-ink-muted">{t('ZENKUU ne produit aucune cotation. Si vous avez besoin de données brutes, adressez-vous directement aux sources — c’est plus fiable que de passer par un intermédiaire, et leurs conditions d’utilisation s’appliquent.')}</p>
        <ul className="space-y-2">
          {SOURCES.map((source) => (
            <li
              key={source.name}
              className="flex flex-wrap items-baseline justify-between gap-2 rounded-card border border-border-subtle bg-surface px-3 py-2.5"
            >
              <span className="text-sm font-medium text-ink">{source.name}</span>
              <span className="text-xs text-ink-muted">{source.usage}</span>
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-brand-strong underline underline-offset-2"
              >
                Documentation
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-ink">{t('Limites de débit')}</h2>
        <p className="text-sm leading-relaxed text-ink-muted">{t('Les sources gratuites imposent des plafonds stricts, et ZENKUU s’y astreint par une limitation de débit à fenêtre glissante côté serveur. Sans clé, CoinGecko refuse au-delà d’environ cinq requêtes par minute — un plafond mesuré, pas estimé. C’est ce qui explique les durées de cache de 5 à 30 minutes et l’absence de cotation en continu.')}</p>
        <p className="text-sm leading-relaxed text-ink-muted">
          {weave(
            t('Le détail est publié sur la [page Méthodologie](/methodologie).'),
            (href, label, key) => (
              <Link
                key={key}
                href={href}
                className="underline underline-offset-2 hover:text-brand-strong"
              >
                {label}
              </Link>
            ),
          )}
        </p>
      </section>
    </div>
  )
}
