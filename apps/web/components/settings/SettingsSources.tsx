import Link from 'next/link'

/**
 * Rubrique « Données & sources ».
 *
 * Elle n'existe chez aucune plateforme d'échange — et c'est précisément pourquoi elle
 * est ici. Sur un site dont la promesse est « aucun chiffre non sourcé », l'endroit où
 * l'on règle son affichage est aussi celui où l'on doit pouvoir vérifier d'où vient ce
 * qu'on affiche.
 *
 * Aucun réglage : ces informations ne se paramètrent pas, elles se lisent. Un
 * interrupteur « afficher les sources » laisserait croire qu'on peut les masquer,
 * alors que l'attribution est une obligation des conditions d'utilisation de chaque
 * fournisseur.
 */
const SOURCES = [
  {
    name: 'CoinGecko',
    scope: 'Cryptomonnaies — cours, capitalisations, secteurs, places, dérivés',
    note: 'Rafraîchi toutes les 5 minutes. Les secteurs et les places, plus lents, toutes les 30 minutes à 1 heure.',
    href: 'https://www.coingecko.com',
  },
  {
    name: 'Yahoo Finance',
    scope: 'Actions, ETF, indices, matières premières',
    note: 'Univers fixe. Un symbole hors de cet univers n’a pas de fiche.',
    href: 'https://finance.yahoo.com',
  },
  {
    name: 'Frankfurter (BCE)',
    scope: 'Devises — taux de référence',
    note: 'Un seul taux par jour ouvré, publié par la Banque centrale européenne. Ni intraday, ni volume.',
    href: 'https://frankfurter.dev',
  },
  {
    name: 'Coinpaprika',
    scope: 'Date du premier relevé de prix des cryptomonnaies',
    note: 'Seule source gratuite de cette donnée. Elle alimente la page des nouvelles cotations.',
    href: 'https://coinpaprika.com',
  },
  {
    name: 'Alternative.me',
    scope: 'Indice de sentiment (Fear & Greed)',
    note: 'Composition propriétaire d’un tiers, publiée une fois par jour. Affichée telle quelle, jamais présentée comme un signal.',
    href: 'https://alternative.me/crypto/fear-and-greed-index/',
  },
] as const

export function SettingsSources() {
  return (
    <section className="space-y-6" aria-labelledby="sources-titre">
      <div className="space-y-1">
        <h2 id="sources-titre" className="display-sm text-ink">
          Données &amp; sources
        </h2>
        <p className="text-sm leading-relaxed text-ink-muted">
          Chaque chiffre affiché sur ZENITH vient de l’une de ces sources et lui est
          attribué à l’endroit où il apparaît. Aucune valeur n’est estimée, interpolée
          ni comblée : une donnée absente est rendue comme absente.
        </p>
      </div>

      <ul className="divide-y divide-border-subtle border border-border-subtle">
        {SOURCES.map((source) => (
          <li key={source.name} className="p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-sm font-medium text-ink">{source.name}</h3>
              <a
                href={source.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-brand hover:underline"
              >
                Site de la source
              </a>
            </div>
            <p className="mt-1 text-xs text-ink-muted">{source.scope}</p>
            <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">{source.note}</p>
          </li>
        ))}
      </ul>

      <div className="border-l-2 border-accent bg-surface-muted p-4">
        <p className="text-xs leading-relaxed text-ink-muted">
          <strong className="text-ink">Ce que ZENITH ne fait pas.</strong> Aucun ordre
          n’est exécuté, aucun fonds n’est détenu, aucun portefeuille n’est connecté et
          aucune donnée personnelle n’est revendue. Les liens vers des plateformes
          tierces sont cités sans recommandation.
        </p>
      </div>

      <p className="text-sm text-ink-muted">
        Le détail des méthodes de calcul et des limites connues est sur la page{' '}
        <Link href="/methodologie" className="text-brand hover:underline">
          méthodologie
        </Link>
        .
      </p>
    </section>
  )
}
