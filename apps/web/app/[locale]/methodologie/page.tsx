import type { Metadata } from 'next'

import { getAvailability } from '@zenkuu/data'

import { emphasise } from '@/components/locale/emphasise'
import { getContent, getPhrase, getSeo } from '@/lib/content'

/**
 * Métadonnées DÉRIVÉES DE LA LANGUE, d'où la fonction plutôt que la constante.
 *
 * Un `export const metadata` est évalué une fois au chargement du module : il ne
 * peut pas connaître la locale de la requête, et servait donc un titre français sur
 * les pages anglaises. `generateMetadata` est appelée par requête.
 */
export async function generateMetadata(): Promise<Metadata> {
  const fr = await getContent()
  const seo = await getSeo()
  return {
  title: fr.pages.methodology,
  description: seo(
    '/methodologie',
    'D’où viennent les chiffres affichés sur ZENKUU, à quelle fréquence ils sont actualisés, et ce que nous choisissons de ne pas afficher faute de source fiable.',
  ),
  }
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
export default async function MethodologiePage() {
  const t = await getPhrase()
  const fr = await getContent()
  const availability = getAvailability()

  return (
    <article className="mx-auto max-w-3xl space-y-10 py-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-ink">{t('Méthodologie & sources')}</h1>
        <p className="text-sm leading-relaxed text-ink-muted">{t('ZENKUU ne produit aucune donnée de marché : nous agrégeons des sources publiques et nous indiquons systématiquement laquelle alimente quoi. Cette page décrit ce fonctionnement, y compris ses limites.')}</p>
      </header>

      <Section title={t('D’où viennent les chiffres')}>
        <p>{t('Chaque module du site indique sa source et l’horodatage publié par celle-ci — pas l’heure à laquelle vous chargez la page. La distinction compte : derrière un cache de cinq minutes, l’heure de rendu ne dirait rien de la fraîcheur réelle de la donnée.')}</p>

        <div className="mt-4 overflow-x-auto rounded-card border border-border-subtle">
          {/* Trois colonnes courtes : le plancher de 520 pixels tombe sous `sm`, elles
              se resserrent et les en-têtes reviennent à la ligne. Rien à masquer — une
              source sans son état, ou l'inverse, ne dit plus rien. */}
          <table className="w-full border-collapse text-sm sm:min-w-[520px]">
            <caption className="sr-only">{t('Source retenue par classe d’actif')}</caption>
            <thead>
              <tr className="border-b border-border-subtle bg-surface-muted text-left text-xs text-ink-muted">
                <th scope="col" className="px-3 py-2 font-medium">{t('Classe d’actif')}</th>
                <th scope="col" className="px-3 py-2 font-medium">
                  {t('Source')}
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  {t('État')}
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

      <Section title={t('À quelle fréquence')}>
        <ul className="space-y-1.5">
          <li>
            {emphasise(t('**Cours et classements** — actualisés toutes les 5 minutes.'))}
          </li>
          <li>
            {emphasise(t('**Actualités** — toutes les 3 minutes.'))}
          </li>
          <li>
            {emphasise(t('**Tendances** — toutes les 10 minutes.'))}
          </li>
          <li>
            {emphasise(t('**Catégories et sentiment** — toutes les 30 minutes ; ces agrégats évoluent lentement et les redemander plus souvent gaspillerait des quotas gratuits sans rien apporter.'))}
          </li>
          <li>
            {emphasise(t('**Taux de change** — la Banque centrale européenne ne publie qu’un taux par jour ouvré. Nous n’affichons donc aucune variation « sur 24 h » pour les devises, mais « depuis le taux BCE précédent ».'))}
          </li>
        </ul>
      </Section>

      <Section title={t('Comment chaque chiffre est calculé')}>
        <p>{t('Aucun des nombres de ce site n’est calculé par ZENKUU. Ils sont repris tels que nos sources les publient — et comme la principale d’entre elles, CoinGecko, documente publiquement ses méthodes, il n’y a aucune raison de ne pas les reprendre ici : ce que vous lisez sur une fiche est le résultat de ces règles-là, pas des nôtres.')}</p>

        <dl className="space-y-4">
          <Formula term={t('Cours d’une cryptomonnaie')}>{emphasise(t('La source part d’un indice de référence du bitcoin en dollars, calculé comme un **prix moyen pondéré par les volumes** sur une sélection de plateformes. Toutes les autres paires y sont ramenées — les paires crypto contre crypto par un chemin de conversion, les paires en monnaie par le taux de change. C’est ce qui explique qu’un cours affiché puisse différer de celui d’une plateforme prise isolément : ce n’est pas le prix d’un carnet d’ordres, c’est une moyenne de marché.'))}</Formula>

          <Formula term={t('Capitalisation')}>{t('Cours × offre en circulation. L’offre en circulation exclut les jetons verrouillés, réservés ou brûlés. Nous ne la recalculons jamais : une capitalisation reconstruite à partir de l’offre totale donnerait un chiffre supérieur à celui publié partout ailleurs.')}</Formula>

          <Formula term={t('Valorisation diluée')}>{t('Cours × offre maximale. Elle répond à « combien vaudrait le projet si tous les jetons prévus circulaient », et l’écart avec la capitalisation mesure ce qui reste à émettre. Reprise telle quelle : la source applique ses propres règles sur les jetons brûlés.')}</Formula>

          <Formula term={t('Écart au plus haut historique')}>{emphasise(t('(plus haut − cours actuel) ÷ plus haut. Le plus haut est celui de toute l’histoire cotée de l’actif, pas celui de la fenêtre affichée sur le graphique.'))}</Formula>

          <Formula term={t('Volume sur 24 heures')}>{t('Somme des volumes déclarés par les plateformes, sur une fenêtre glissante de vingt-quatre heures — jamais une journée calendaire. Deux relevés à douze heures d’écart portent donc sur deux périodes qui se chevauchent.')}</Formula>

          <Formula term={t('Capitalisation d’un secteur')}>{t('Somme des capitalisations des actifs que la source y range. Un même actif appartenant à plusieurs secteurs y compte plusieurs fois : les parts de secteurs ne s’additionnent donc pas à 100 %, et nous ne les présentons jamais comme une répartition.')}</Formula>

          <Formula term={t('Variation d’une valeur boursière')}>{t('Dernier cours contre la clôture de la séance précédente, et non contre le cours d’il y a vingt-quatre heures. Une bourse ferme : « +2 % sur 24 h » n’a pas de sens un lundi matin, « +2 % depuis la clôture de vendredi » en a un.')}</Formula>
        </dl>
      </Section>

      <Section title={t('Le volume douteux ne compte pas')}>
        <p>{t('CoinGecko note chaque paire de cotation au vert, au jaune ou au rouge — son « Trust Score » — à partir du trafic de la plateforme, de l’écart et de la profondeur du carnet à ±2 %, de la fréquence réelle des transactions et d’un contrôle de valeurs aberrantes. Le rouge signale un volume que la source elle-même juge non fiable.')}</p>
        <p>{t('Nous reprenons cette notation à deux endroits, et c’est le seul cas où une méthodologie extérieure change un chiffre de ce site plutôt qu’un texte :')}</p>
        <ul className="mt-3 space-y-1.5">
          <li>{t('Le tableau « où se négocie » affiche la pastille de couleur, paire par paire.')}</li>
          <li>
            {emphasise(t('Les **anneaux de répartition du volume** écartent les paires notées rouge du calcul. Sans ce filtre, une plateforme au volume gonflé apparaît comme la première place de cotation d’un jeton, avec un pourcentage à deux chiffres tiré d’échanges que personne ne considère réels. Le nombre de paires écartées est indiqué sous l’anneau — retirer une donnée en silence serait la même faute que l’inventer.'))}
          </li>
        </ul>
      </Section>

      <Section title={t('Ce que nous ne reprenons pas de nos sources')}>
        <p>{t('Documenter une méthode n’oblige pas à l’adopter. Trois des leurs restent hors de ce site, et il vaut mieux dire pourquoi :')}</p>
        <ul className="mt-3 space-y-1.5">
          <li>
            {emphasise(t('**Le classement des plateformes par confiance.** Il repose en partie sur des statistiques de trafic web achetées à un tiers. Nous relayons la note d’une PAIRE, qui décrit un carnet d’ordres observable, pas un palmarès d’entreprises.'))}
          </li>
          <li>
            {emphasise(t('**Les scores composites de projet.** Développeurs, communauté, liquidité agrégés en une note unique : le chiffre est simple à lire et impossible à vérifier. Nous affichons les composantes — commits, contributeurs, abonnés — et laissons la synthèse au lecteur.'))}
          </li>
          <li>
            {emphasise(t('**Toute prévision.** Les objectifs de cours des analystes sont affichés sur les fiches d’actions parce qu’ils sont un FAIT publié — untel a écrit tel chiffre — jamais comme une valeur attendue.'))}
          </li>
        </ul>
      </Section>

      <Section title={t('Ce que nous n’affichons pas')}>
        <p>{t('Quand une donnée n’est pas disponible gratuitement, nous la laissons manquante plutôt que de l’estimer. Concrètement, sur ce site aujourd’hui :')}</p>
        <ul className="mt-3 space-y-1.5">
          <li>
            {emphasise(t('La **capitalisation des actions et ETF** n’est pas affichée : notre source boursière ne l’expose pas sans authentification.'))}
          </li>
          <li>
            {emphasise(t('Le panneau **Tendances** ne montre pas de prix : la source ne les cote qu’en dollars, et les convertir nous-mêmes produirait un montant que personne ne publie.'))}
          </li>
          <li>
            {emphasise(t('Les **plus fortes hausses et baisses** portent sur un univers annoncé (les cent plus grandes capitalisations), et non sur le marché entier : une variation de +900 % sur un jeton sans liquidité n’informe personne.'))}
          </li>
          <li>
            {emphasise(t('Les **capitalisations sectorielles** sont affichées en dollars, parce que la source ne les publie que dans cette devise.'))}
          </li>
        </ul>
      </Section>

      <Section title={t('Ce que ZENKUU n’est pas')}>
        <p>{t('ZENKUU est un site d’information. Nous n’exécutons aucun ordre, ne détenons aucun fonds, et ne proposons aucune recommandation d’investissement. Les indicateurs de sentiment que nous relayons décrivent un état de marché observé par un tiers ; ils ne prédisent rien.')}</p>
      </Section>
    </article>
  )
}

/**
 * Une formule, en paire terme / définition.
 *
 * `<dl>` et non une liste à puces : ce sont des DÉFINITIONS, et le balisage le dit —
 * un lecteur d'écran annonce « Capitalisation : cours multiplié par… » d'un seul
 * tenant, là où deux paragraphes voisins ne se rattachent l'un à l'autre que par la
 * mise en page.
 */
function Formula({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <div className="border-l-2 border-border-subtle pl-4">
      <dt className="text-sm font-semibold text-ink">{term}</dt>
      <dd className="mt-1 text-sm leading-relaxed text-ink-muted">{children}</dd>
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
