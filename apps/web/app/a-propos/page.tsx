import type { Metadata } from 'next'
import Link from 'next/link'

import { fr } from '@/content/fr'

export const metadata: Metadata = {
  title: fr.pages.about,
  description:
    'ZENITH est une plateforme d’analyse de marché multi-actifs, en lecture seule : ni courtier, ni plateforme d’échange, ni conseiller en investissement.',
}

/**
 * Page « À propos » — vrai contenu.
 *
 * Elle énonce le positionnement du §1 et surtout ses NON-objectifs. Sur un site qui
 * affiche des cours, dire clairement ce qu'on ne fait pas n'est pas une précaution
 * juridique de façade : c'est ce qui distingue un site d'information d'un
 * intermédiaire financier, et cela conditionne le cadre réglementaire applicable.
 */
export default function AProposPage() {
  return (
    <article className="mx-auto max-w-3xl space-y-10 py-6">
      <header className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight text-ink">À propos de ZENITH</h1>
        <p className="text-base leading-relaxed text-ink-muted">
          ZENITH réunit au même endroit les cryptomonnaies, les devises, les actions,
          les ETF, les matières premières et les indices — avec la même profondeur de
          lecture pour chacun, et sans jamais vous demander d’ouvrir un compte pour
          consulter un cours.
        </p>
      </header>

      <Section title="Pourquoi ce site">
        <p>
          La plupart des sites de suivi de marché sont mono-actif : l’un couvre la
          crypto, l’autre la bourse, un troisième les devises. Suivre un portefeuille
          diversifié impose donc d’ouvrir trois onglets et de jongler entre trois
          conventions d’affichage. ZENITH part de l’intuition inverse : une seule
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
            <strong className="text-ink">Aucune donnée inventée.</strong> Quand une
            information n’est pas disponible, elle apparaît comme absente plutôt que
            comblée par une estimation. Le détail se trouve dans la{' '}
            <Link href="/methodologie" className="underline underline-offset-2 hover:text-brand-strong">
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
          ZENITH est publié en français, avec l’euro comme devise de référence. Les
          cours des actifs cotés à l’étranger sont affichés dans leur devise
          d’origine plutôt que convertis à la volée, afin qu’un cours affiché
          corresponde toujours à un cours réellement publié.
        </p>
      </Section>
    </article>
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
