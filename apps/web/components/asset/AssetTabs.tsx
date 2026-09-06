import { History, LineChart, Scissors } from 'lucide-react'

import { Link } from '@/i18n/navigation'
import { getPhrase } from '@/lib/content'
import type { AssetClass } from '@zenkuu/data'

/**
 * RANGÉE D'ONGLETS DE LA FICHE D'ACTIF.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * TROIS SOUS-ROUTES EXISTAIENT SANS QU'AUCUN LIEN N'Y MÈNE
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * `/crypto/[id]/historique` et `/crypto/[id]/halving` sont écrites, servies, et
 * n'étaient joignables qu'en tapant leur adresse — ni lien, ni entrée de sitemap.
 * Cette rangée les rend atteignables, et donne à la fiche la silhouette de la
 * référence : une rangée d'onglets pleine largeur, sous l'en-tête, au-dessus des
 * deux colonnes.
 *
 * ⚠️ LA GÉOMÉTRIE A ÉTÉ RELEVÉE DEUX FOIS, SUR DEUX RÉFÉRENCES.
 *
 * Sur tokenomist.ai/bitcoin d'abord : rangée de 48 px, corps 16, graisse 400, une
 * icône de 16 px à gauche de l'intitulé.
 *
 * Sur `coingecko.com/en/coins/bitcoin` ensuite, le 2026-09-06, qui redevient la
 * référence sur demande — et sa rangée est nettement plus serrée :
 *
 *     <nav class="flex overflow-x-auto shadow-[inset_0_-1px_0_0_#EFF2F5]">   h=37
 *       <a class="selected relative z-[1]" p="8px 16px">
 *         <span class="font-semibold text-sm leading-5">Overview</span>
 *
 * Soit 14/20/600 et un rembourrage de 8/16, contre 16/24/400 et 48 px de haut. Onze
 * pixels de rangée en moins, et un intitulé qui gagne en graisse ce qu'il perd en
 * taille : c'est le CONTRASTE DE GRAISSE qui désigne l'onglet actif chez elle.
 *
 * ⚠️ L'ENCRE ACTIVE PASSE DE LA MARQUE À L'ENCRE PLEINE. Chez la référence, l'onglet
 * sélectionné sort en `#0f172a` — son encre la plus sombre — et c'est le SOULIGNEMENT
 * seul qui porte la couleur de marque. L'onglet actif portait ici les deux, ce qui
 * faisait de la couleur le seul signal et affaiblissait le texte : `brand-strong`
 * tient AA, mais il tient moins bien que l'encre pleine.
 *
 * Le trait, lui, garde l'azur : la référence y met son vert, nous y mettons notre
 * marque. C'est la seule chose qui ne se copie pas.
 *
 * ── CE QUI N'EST PAS ICI, ET POURQUOI ─────────────────────────────────────────
 *
 * ⚠️ PAS D'ONGLET « MÉTRIQUES », ALORS QUE VINGT ET UNE PAGES DE MÉTRIQUE EXISTENT.
 *
 * Elles vivent sous `/crypto/[id]/metriques/[metrique]` : il n'y a donc pas UNE
 * destination mais vingt et une, et aucune n'est canonique. Un onglet intitulé
 * « Métriques » qui ouvrirait `capitalisation` mentirait sur ce qu'il promet.
 *
 * Surtout, `AssetMetricRail` a délibérément DÉLIÉ ses vingt libellés, et sa note
 * dit pourquoi : « ces pages n'existent plus comme destination de premier plan —
 * le catalogue "Toutes les métriques" a été retiré de la fiche ». Un onglet les y
 * remettrait en tête, ce qui contredirait cette décision sans la discuter.
 *
 * ⚠️ PAS D'ONGLETS « TOKENOMICS » NI « UNLOCK EVENTS », que la référence porte.
 * Aucune donnée derrière : ni allocation par catégorie, ni calendrier de
 * déverrouillage, ni courbe d'émission. `AssetSupply` le consigne déjà — les
 * afficher supposerait de les ESTIMER.
 *
 * ── LA RANGÉE NE PARAÎT PAS À UN SEUL ONGLET ──────────────────────────────────
 *
 * Les sous-routes n'existent QUE pour la crypto : les cinq autres classes d'actifs
 * n'ont que leur aperçu. Une rangée à un onglet n'est pas une navigation, c'est un
 * titre déguisé en commande — elle ne se rend donc pas. C'est aussi ce qui arrive à
 * toute cryptomonnaie autre que le bitcoin si l'historique venait à manquer.
 */

type TabKey = 'apercu' | 'historique' | 'halving'

export async function AssetTabs({
  assetClass,
  id,
  active,
}: {
  assetClass: AssetClass
  id: string
  /** L'onglet de la page qui rend cette rangée. */
  active: TabKey
}) {
  const t = await getPhrase()

  /* Les sous-routes sont déclarées pour la crypto seule dans `i18n/pathnames.ts` :
     hors crypto, il n'y a rien à ouvrir, et le typage des routes le dirait de toute
     façon avant l'exécution. */
  if (assetClass !== 'crypto') return null

  const tabs = [
    {
      key: 'apercu' as const,
      /* « Aperçu » et « Valeurs historiques » SONT DÉJÀ DANS LA TABLE DE PHRASES, et
         c'est la raison de ce choix d'intitulés. La table est indexée par le texte
         français et `phrases.test.ts` exige que les douze locales portent exactement
         les mêmes clés : un mot inventé ici, ce sont douze traductions à écrire, ou
         un onglet qui sort en français sur les onze autres langues.

         « Halving » n'y est pas, et reste tel quel : c'est le terme employé sans
         traduction dans la plupart des langues, et c'est déjà celui qu'affiche le fil
         d'Ariane de la page elle-même. */
      label: t('Aperçu'),
      icon: LineChart,
      href: { pathname: '/crypto/[id]' as const, params: { id } },
    },
    {
      key: 'historique' as const,
      label: t('Valeurs historiques'),
      icon: History,
      href: { pathname: '/crypto/[id]/historique' as const, params: { id } },
    },
    /* Le halving est une règle du protocole du bitcoin, et la route le vérifie :
       `if (id !== 'bitcoin') notFound()`. L'onglet suit la même condition, sinon il
       promettrait une page qui répond 404. */
    ...(id === 'bitcoin'
      ? [
          {
            key: 'halving' as const,
            label: t('Halving'),
            icon: Scissors,
            href: { pathname: '/crypto/[id]/halving' as const, params: { id } },
          },
        ]
      : []),
  ]

  if (tabs.length < 2) return null

  return (
    /* Le filet du bas est celui de la RANGÉE, pas des onglets : il court sur toute la
       largeur et l'onglet actif pose son propre filet de 2 px par-dessus. C'est ce
       qui fait que l'onglet sélectionné semble découpé dans la ligne plutôt que posé
       dessus — et c'est la seule bordure de 2 px du site, parce qu'elle porte un ÉTAT
       et non une séparation. */
    /* ⚠️ LA RANGÉE DÉFILE PLUTÔT QUE DE SE REPLIER, ET C'EST UN DÉFAUT MESURÉ.
       À 375 px, « Valeurs historiques » passait sur deux lignes et « Halving »
       sortait du cadre : la rangée faisait deux hauteurs, et son filet du bas ne
       soulignait plus que la seconde. Un onglet coupé en deux n'est plus une cible,
       et un onglet hors cadre n'existe pas.

       `overflow-x-auto` + `whitespace-nowrap` : la rangée garde UNE hauteur et se
       fait glisser au doigt, ce qui est le geste attendu d'une rangée d'onglets sur
       téléphone. `scrollbar-none` retire la barre — le débordement se voit au
       troisième onglet tronqué, qui est l'indice habituel.

       ⚠️ `shrink-0` SUR CHAQUE ONGLET EST INDISPENSABLE : sans lui, un conteneur
       défilant comprime quand même ses enfants flexibles jusqu'à leur contenu, et
       `whitespace-nowrap` n'empêche que la coupure des mots, pas l'écrasement de la
       boîte. */
    <nav
      aria-label={t('Aperçu')}
      /* L'écart entre onglets est passé de `gap-6` au rembourrage de chacun : la
         référence n'espace pas ses onglets, elle les rembourre, ce qui agrandit la
         CIBLE au lieu du vide entre deux cibles. */
      className="scrollbar-none mb-4 flex items-center overflow-x-auto whitespace-nowrap border-b border-border-subtle"
    >
      {tabs.map(({ key, label, icon: Icon, href }) => {
        const selected = key === active
        return (
          <Link
            key={key}
            href={href}
            aria-current={selected ? 'page' : undefined}
            /* ⚠️ `brand-strong` ET NON `brand` POUR L'ENCRE COMME POUR LE FILET.
               L'azur de marque tient 1,52:1 sur le canvas clair — c'est un écart
               assumé de longue date, consigné dans `palette.test.ts`, et il vaut pour
               les APLATS. En texte de 16 px il serait illisible. `brand-strong` passe
               le seuil AA en clair et vaut exactement `brand` en sombre : une seule
               classe, correcte dans les deux thèmes. */
            /* `py-2 px-4` plutôt qu'une hauteur écrite : c'est le rembourrage de la
               référence (8/16), et il produit les 37 px de sa rangée sans que personne
               ait à tenir ce nombre à jour si le corps change. */
            className={`-mb-px flex shrink-0 items-center gap-1.5 border-b-2 px-4 py-2 text-sm font-semibold leading-5 transition-colors duration-150 ${
              selected
                ? 'border-brand-strong text-ink'
                : 'border-transparent text-ink-muted hover:text-ink'
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
