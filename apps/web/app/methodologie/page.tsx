import type { Metadata } from 'next'

import { getAvailability } from '@zenith/data'

import { fr } from '@/content/fr'

export const metadata: Metadata = {
  title: fr.pages.methodology,
  description:
    'D’où viennent les chiffres affichés sur ZENITH, à quelle fréquence ils sont actualisés, et ce que nous choisissons de ne pas afficher faute de source fiable.',
}

/**
 * Page méthodologie — vrai contenu, pas un stub.
 *
 * C'est la contrepartie publique de la règle « zéro donnée factice » (§5) : une
 * règle interne que personne ne peut vérifier ne vaut pas grand-chose. La page
 * énonce donc chaque source, sa fréquence, et surtout ce que nous n'affichons PAS.
 *
 * Le tableau de couverture est généré depuis le registre lui-même : il ne peut donc
 * pas se désynchroniser du code. Brancher une nouvelle source la fait apparaître
 * ici sans que personne ait à y penser.
 */
export default function MethodologiePage() {
  const availability = getAvailability()

  return (
    <article className="mx-auto max-w-3xl space-y-10 py-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-ink">
          Méthodologie &amp; sources
        </h1>
        <p className="text-sm leading-relaxed text-ink-muted">
          ZENITH ne produit aucune donnée de marché : nous agrégeons des sources
          publiques et nous indiquons systématiquement laquelle alimente quoi. Cette
          page décrit ce fonctionnement, y compris ses limites.
        </p>
      </header>

      <Section title="D’où viennent les chiffres">
        <p>
          Chaque module du site indique sa source et l’horodatage publié par
          celle-ci — pas l’heure à laquelle vous chargez la page. La distinction
          compte : derrière un cache de cinq minutes, l’heure de rendu ne dirait rien
          de la fraîcheur réelle de la donnée.
        </p>

        <div className="mt-4 overflow-x-auto rounded-card border border-border-subtle">
          <table className="w-full min-w-[520px] border-collapse text-sm">
            <caption className="sr-only">Source retenue par classe d’actif</caption>
            <thead>
              <tr className="border-b border-border-subtle bg-surface-muted text-left text-xs text-ink-muted">
                <th scope="col" className="px-3 py-2 font-medium">
                  Classe d’actif
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Source
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  État
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle bg-surface">
              {availability.map((entry) => (
                <tr key={entry.assetClass}>
                  <th scope="row" className="px-3 py-2 text-left font-medium text-ink">
                    {fr.assetClass[entry.assetClass]}
                  </th>
                  <td className="px-3 py-2 text-ink-muted">
                    {entry.attributionUrl && entry.providerLabel ? (
                      <a
                        href={entry.attributionUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline underline-offset-2 hover:text-brand-strong"
                      >
                        {entry.providerLabel}
                      </a>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded-md px-1.5 py-0.5 text-xs font-medium ${
                        entry.available
                          ? 'bg-up-soft text-up'
                          : 'bg-surface-muted text-ink-muted'
                      }`}
                    >
                      {entry.available ? fr.states.connected : fr.states.pending}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="À quelle fréquence">
        <ul className="space-y-1.5">
          <li>
            <strong className="text-ink">Cours et classements</strong> — actualisés
            toutes les 5 minutes.
          </li>
          <li>
            <strong className="text-ink">Actualités</strong> — toutes les 3 minutes.
          </li>
          <li>
            <strong className="text-ink">Tendances</strong> — toutes les 10 minutes.
          </li>
          <li>
            <strong className="text-ink">Catégories et sentiment</strong> — toutes les
            30 minutes ; ces agrégats évoluent lentement et les redemander plus souvent
            gaspillerait des quotas gratuits sans rien apporter.
          </li>
          <li>
            <strong className="text-ink">Taux de change</strong> — la Banque centrale
            européenne ne publie qu’un taux par jour ouvré. Nous n’affichons donc
            aucune variation « sur 24 h » pour les devises, mais « depuis le taux BCE
            précédent ».
          </li>
        </ul>
      </Section>

      <Section title="Ce que nous n’affichons pas">
        <p>
          Quand une donnée n’est pas disponible gratuitement, nous la laissons
          manquante plutôt que de l’estimer. Concrètement, sur ce site aujourd’hui :
        </p>
        <ul className="mt-3 space-y-1.5">
          <li>
            La <strong className="text-ink">capitalisation des actions et ETF</strong>{' '}
            n’est pas affichée : notre source boursière ne l’expose pas sans
            authentification.
          </li>
          <li>
            Le panneau <strong className="text-ink">Tendances</strong> ne montre pas de
            prix : la source ne les cote qu’en dollars, et les convertir nous-mêmes
            produirait un montant que personne ne publie.
          </li>
          <li>
            Les <strong className="text-ink">plus fortes hausses et baisses</strong>{' '}
            portent sur un univers annoncé (les cent plus grandes capitalisations), et
            non sur le marché entier : une variation de +900 % sur un jeton sans
            liquidité n’informe personne.
          </li>
          <li>
            Les <strong className="text-ink">capitalisations sectorielles</strong> sont
            affichées en dollars, parce que la source ne les publie que dans cette
            devise.
          </li>
        </ul>
      </Section>

      <Section title="Ce que ZENITH n’est pas">
        <p>
          ZENITH est un site d’information. Nous n’exécutons aucun ordre, ne détenons
          aucun fonds, et ne proposons aucune recommandation d’investissement. Les
          indicateurs de sentiment que nous relayons décrivent un état de marché
          observé par un tiers ; ils ne prédisent rien.
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
