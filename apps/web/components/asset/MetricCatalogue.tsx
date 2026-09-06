'use client'

import { Tab, TabGroup, TabList, TabPanel, TabPanels } from '@headlessui/react'

import { InfoTip } from '@/components/ui/InfoTip'
import { Link, type AppHref } from '@/i18n/navigation'
import { usePhrase } from '@/components/locale/ContentProvider'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * LE CATALOGUE DES MÉTRIQUES, EN CARTES FILTRABLES
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Relevé sur `tokenterminal.com/explorer/projects/hyperliquid`, onglet « Metrics » :
 * un titre, une rangée de filtres portant chacun son décompte (« All 34 · Activity 4 ·
 * Financials 4 · Users 8 … »), puis une grille de cartes.
 *
 * ── C'EST ICI QUE `Tabs` DE HEADLESS UI EST LE BON OUTIL, ET PAS AILLEURS ───
 *
 * La rangée d'onglets de la fiche ne pouvait pas l'être : ses onglets sont des LIENS
 * vers des adresses distinctes, et `role="tab"` y annoncerait un composant qui n'existe
 * pas (voir `AssetShell`). Ces filtres-ci sont l'inverse exact — de vrais panneaux d'un
 * même document, sans navigation, dont le contenu est déjà chargé.
 *
 * Ce que le composant apporte, et qui aurait dû être écrit à la main : `role="tablist"`,
 * `aria-selected`, le lien `aria-controls`/`aria-labelledby` entre chaque onglet et son
 * panneau, le déplacement aux flèches ← →, `Home`/`End`, et un seul onglet dans l'ordre
 * de tabulation — c'est le contrat que décrit la fiche « Tabs » de Component Gallery, et
 * il fait une soixantaine de lignes de gestion clavier quand on le refait soi-même.
 *
 * ── LES CARTES NE PORTENT PAS DE COURBE, ET C'EST UNE ABSENCE DE DONNÉE ────
 *
 * Chaque carte de la référence montre une mini-courbe. Trois de nos vingt et une
 * métriques seulement ont une série réelle — le cours, la capitalisation et le volume,
 * transportées par la même réponse `market_chart`. Les dix-huit autres n'existent qu'à
 * l'instant présent chez la source (§5). Dessiner dix-huit courbes plates pour la
 * symétrie inventerait une histoire que personne n'a publiée ; les cartes portent donc
 * la valeur du jour, son explication et son lien.
 *
 * ── LES VALEURS ARRIVENT DÉJÀ RENDUES ─────────────────────────────────────
 *
 * `MetricValue` et `ChangeBadge` sont des composants SERVEUR (le premier lit les
 * formateurs de locale, qui sont asynchrones). Ils ne peuvent pas être appelés d'ici.
 * La vue serveur les rend donc en amont et passe les nœuds en propriété — c'est le
 * motif de « fente » habituel entre un composant serveur et un composant client, et il
 * évite de rapatrier toute la mécanique de formatage côté navigateur.
 */

export interface MetricCard {
  slug: string
  label: string
  /** L'explication de la mesure, telle que la porte déjà l'infobulle du rail. */
  help: string
  href: AppHref
  /** La valeur du jour, rendue côté serveur — voir la note d'en-tête. */
  value: React.ReactNode
}

export interface MetricCatalogueGroup {
  key: string
  label: string
  cards: MetricCard[]
}

export function MetricCatalogue({ groups }: { groups: MetricCatalogueGroup[] }) {
  const t = usePhrase()

  /* « Toutes » ouvre la liste, comme le « All » de la référence : on arrive sur le
     catalogue pour voir CE QU'IL Y A, et un filtre actif d'emblée cacherait les trois
     quarts des mesures à qui ne sait pas encore ce qu'il cherche. */
  const onglets: MetricCatalogueGroup[] = [
    { key: 'toutes', label: t('Toutes'), cards: groups.flatMap((group) => group.cards) },
    ...groups,
  ]

  return (
    <TabGroup>
      {/* ⚠️ `overflow-x-auto` + `whitespace-nowrap`, COMME LA RANGÉE D'ONGLETS DE LA
          FICHE, et pour le défaut qu'elle a déjà rencontré : à 375 px, cinq filtres
          portant chacun un décompte passent sur deux lignes et le filet du bas ne
          souligne plus que la seconde. */}
      <TabList className="scrollbar-none mb-4 flex items-center gap-1 overflow-x-auto whitespace-nowrap border-b border-border-subtle">
        {onglets.map((onglet) => (
          <Tab
            key={onglet.key}
            /* `data-selected` est l'attribut que Headless UI pose sur l'onglet actif —
               on s'y branche plutôt que de tenir un état à la main. L'encre pleine et
               le trait sous l'onglet reprennent la rangée de la fiche : deux jeux
               d'onglets sur la même page doivent se ressembler. */
            /* `rounded-t-control` N'EST PAS DÉCORATIF : l'anneau de focus épouse le
               rayon de l'élément, et sur une boîte à angles droits il dessinait un
               rectangle qui traversait le filet de la rangée. Arrondi en haut
               seulement, il se lit comme une languette et laisse le trait du bas
               porter la sélection. */
            className="flex shrink-0 items-center gap-1.5 rounded-t-control border-b-2 border-transparent px-3 py-2 text-sm font-semibold leading-5 text-ink-muted transition-colors duration-150 outline-none hover:text-ink data-[selected]:border-brand-strong data-[selected]:text-ink focus-visible:ring-2 focus-visible:ring-brand-strong/40"
          >
            {onglet.label}
            {/* Le décompte, comme chez la référence : il dit combien de mesures se
                cachent derrière un filtre avant qu'on l'ouvre. */}
            <span className="tabular text-xs font-medium text-ink-muted">
              {onglet.cards.length}
            </span>
          </Tab>
        ))}
      </TabList>

      <TabPanels>
        {onglets.map((onglet) => (
          <TabPanel key={onglet.key} className="outline-none">
            {/* Trois colonnes au plus : une carte porte un libellé et un nombre, et
                au-delà de trois par rangée les nombres deviennent trop proches pour se
                comparer d'un regard — c'est aussi la grille de la référence. */}
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {onglet.cards.map((card) => (
                <li key={card.slug}>
                  {/*
                    LA CARTE ENTIÈRE EST LE LIEN, SAUF L'INFOBULLE.

                    ⚠️ L'INFOBULLE EST POSÉE HORS DU LIEN, ET C'EST OBLIGATOIRE. Elle
                    rend un bouton ; un bouton dans un lien est du HTML invalide, que
                    les navigateurs réparent en sortant l'un des deux du flux — le
                    résultat dépend alors du moteur. Le lien couvre donc le corps de la
                    carte, l'infobulle vit dans son en-tête, à côté.
                  */}
                  <div className="flex h-full flex-col rounded-card border border-border-subtle p-3 transition-colors hover:border-brand-strong">
                    {/* ⚠️ PAS DE `flex-1` SUR LE LIBELLÉ. Il en portait un, ce qui
                        poussait l'infobulle au bord droit de la carte — à cinquante
                        pixels du mot qu'elle explique, relevé au navigateur. Une aide
                        qu'on ne rattache pas à son terme n'aide personne. Sans `flex-1`,
                        le libellé se dimensionne sur son texte et l'icône le suit ;
                        `min-w-0` garde la troncature quand la rangée déborde. */}
                    <div className="mb-2 flex items-center gap-1">
                      <Link
                        href={card.href}
                        className="min-w-0 truncate text-sm font-medium text-ink-muted transition-colors hover:text-brand-strong"
                      >
                        {card.label}
                      </Link>
                      <InfoTip
                        content={card.help}
                        label={t('À propos de : {nom}').replace('{nom}', card.label)}
                      />
                    </div>

                    <Link href={card.href} className="tabular text-lg font-semibold text-ink">
                      {card.value}
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          </TabPanel>
        ))}
      </TabPanels>
    </TabGroup>
  )
}
