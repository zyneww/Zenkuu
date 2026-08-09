import type { Metadata } from 'next'
import Link from 'next/link'
import { Compass, Layers, ShieldCheck } from 'lucide-react'

import { KeyFigures } from '@/components/about/KeyFigures'
import { fr } from '@/content/fr'

export const metadata: Metadata = {
  title: fr.pages.about,
  description:
    'ZENITH est une plateforme d’analyse de marché multi-actifs, en lecture seule : ni courtier, ni plateforme d’échange, ni conseiller en investissement.',
  alternates: { canonical: '/a-propos' },
}

/**
 * Page « À propos ».
 *
 * Refonte : la page enchaînait des paragraphes de même poids. Elle suit désormais la
 * progression d'une page institutionnelle — mission en tête, principes, chiffres
 * clés, ce que le site n'est pas, puis points d'entrée.
 *
 * Deux écarts assumés par rapport à la référence :
 *  • pas de section équipe. Elle supposerait de nommer de vraies personnes ; en
 *    inventer serait trompeur pour le visiteur, et ZENITH n'a pas d'équipe publique
 *    à présenter à ce stade ;
 *  • les chiffres clés décrivent le PRODUIT et non l'entreprise — voir la note dans
 *    `KeyFigures`.
 */

const PRINCIPLES = [
  {
    icon: Layers,
    title: 'Une grille de lecture, toutes les classes d’actifs',
    body: 'Les mêmes colonnes, les mêmes graphiques et les mêmes conventions d’affichage, qu’il s’agisse d’une cryptomonnaie, d’une action ou d’une paire de devises. Comparer ne devrait pas imposer de changer de site ni de repères.',
  },
  {
    icon: ShieldCheck,
    title: 'Une donnée absente reste absente',
    body: 'Quand une source ne publie pas une information, elle apparaît comme indisponible. Aucune estimation, aucune valeur de remplissage. La règle est portée par la structure du code, pas laissée à la vigilance de qui l’écrit.',
  },
  {
    icon: Compass,
    title: 'Aucun intérêt à ce que vous agissiez',
    body: 'ZENITH n’exécute pas d’ordres et ne détient pas de fonds. Le site ne gagne rien à ce que vous achetiez ou vendiez quoi que ce soit, ce qui lui permet d’afficher les chiffres sans les orienter.',
  },
]

export default function AProposPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-12 py-6">
      <header className="space-y-4">
        <p className="text-xs font-medium uppercase tracking-wide text-brand-strong">
          Notre mission
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">
          Rendre lisible n’importe quel marché, au même endroit
        </h1>
        <p className="max-w-2xl text-base leading-relaxed text-ink-muted">
          ZENITH réunit les cryptomonnaies, les devises, les actions, les ETF, les
          matières premières et les indices — avec la même profondeur de lecture pour
          chacun, et sans jamais vous demander d’ouvrir un compte pour consulter un
          cours.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        {PRINCIPLES.map((principle) => (
          <article
            key={principle.title}
            className="space-y-2 rounded-card border border-border-subtle bg-surface p-5"
          >
            <principle.icon className="h-5 w-5 text-brand-strong" aria-hidden="true" />
            <h2 className="text-sm font-semibold leading-snug text-ink">{principle.title}</h2>
            <p className="text-sm leading-relaxed text-ink-muted">{principle.body}</p>
          </article>
        ))}
      </section>

      <KeyFigures />

      <Section title="Pourquoi ce site existe">
        <p>
          La plupart des sites de suivi de marché sont mono-actif : l’un couvre la
          crypto, l’autre la bourse, un troisième les devises. Suivre un patrimoine
          diversifié impose donc d’ouvrir trois onglets et de jongler entre trois
          conventions d’affichage. ZENITH part de l’intuition inverse — une seule
          grille de lecture, appliquée à toutes les classes d’actifs.
        </p>
      </Section>

      <Section title="Ce que nous ne faisons pas">
        <ul className="space-y-2">
          <li>
            <strong className="text-ink">Aucune exécution d’ordre.</strong> Vous ne
            trouverez nulle part sur ce site un bouton d’achat, de vente ou de dépôt.
            Ce n’est pas une fonctionnalité manquante, c’est un choix de départ.
          </li>
          <li>
            <strong className="text-ink">Aucune conservation de fonds.</strong> ZENITH
            ne se connecte à aucun portefeuille ni à aucun courtier.
          </li>
          <li>
            <strong className="text-ink">Aucun conseil en investissement.</strong> Nous
            affichons des données et des indicateurs publiés par des tiers. Rien de ce
            que vous lisez ici ne constitue une recommandation personnalisée.
          </li>
          <li>
            <strong className="text-ink">Aucune donnée inventée.</strong> Le détail se
            trouve dans la{' '}
            <Link
              href="/methodologie"
              className="underline underline-offset-2 hover:text-brand-strong"
            >
              page Méthodologie
            </Link>
            .
          </li>
        </ul>
      </Section>

      <Section title="Comment nous nous finançons">
        <p>
          Le site est gratuit à l’usage. Il pourra à terme être financé par de la
          publicité display, un abonnement optionnel sans publicité, et des liens
          d’affiliation vers des plateformes tierces clairement identifiés comme tels.
          Aucun de ces leviers ne modifiera les chiffres affichés ni l’ordre des
          classements.
        </p>
      </Section>

      <Section title="Langue et devise">
        <p>
          ZENITH est publié en français, avec l’euro comme devise de référence. Quand
          une conversion est appliquée, la devise d’origine et la date du taux utilisé
          sont affichées à côté du montant, afin qu’un chiffre converti ne puisse
          jamais être confondu avec un cours réellement coté.
        </p>
      </Section>

      <section className="flex flex-wrap items-center gap-3 rounded-card border border-border-subtle bg-surface-muted p-6">
        <p className="flex-1 text-sm leading-relaxed text-ink-muted">
          Pour aller plus loin : les partis pris détaillés, ou les sources et leurs
          limites, source par source.
        </p>
        <Link
          href="/pourquoi-zenith"
          className="rounded-card bg-brand-strong px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-ink"
        >
          Pourquoi ZENITH
        </Link>
        <Link
          href="/methodologie"
          className="rounded-card border border-border-subtle bg-surface px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-brand"
        >
          Méthodologie
        </Link>
      </section>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-ink">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-ink-muted">{children}</div>
    </section>
  )
}
