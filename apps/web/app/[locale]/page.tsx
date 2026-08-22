import { getLocale } from 'next-intl/server'
import { Suspense } from 'react'

import {
  CACHE_TTL_SECONDS,
  getCryptoGlobalStats,
  getCryptoOverview,
  getMarketCapSeriesState,
  getNewListings,
  getNews,
} from '@zenkuu/data'

import { ClassSection } from '@/components/home/ClassSection'
import { FavoritesPanel, type FavoriteSuggestion } from '@/components/home/FavoritesPanel'
import { MarketDate } from '@/components/home/MarketDate'
import { MarketOverviewCard } from '@/components/home/MarketOverviewCard'
import { NewsBoard } from '@/components/home/NewsBoard'
import { RecentlyAdded } from '@/components/home/RecentlyAdded'
import { SectionLabel } from '@/components/home/SectionLabel'
import { Link } from '@/i18n/navigation'
import { assetHref } from '@/lib/asset-routes'
import { getContent, getPhrase } from '@/lib/content'

// Régénération alignée sur le TTL du cache applicatif : les deux durées de vie doivent
// coïncider, sinon la fraîcheur affichée devient imprévisible (§9).
//
// Next.js analyse `revalidate` statiquement et refuse une constante importée : la valeur
// doit donc être écrite en clair. Le garde-fou juste en dessous fait échouer le typecheck
// si CACHE_TTL_SECONDS s'en écarte — les deux ne peuvent pas diverger en silence.
export const revalidate = 180
const _ttlGuard: typeof revalidate = CACHE_TTL_SECONDS
void _ttlGuard

/** Nombre d'actifs proposés au suivi dans la carte des favoris. */
const SUGGESTION_COUNT = 5

/**
 * Titre écrit en entier, contrairement aux autres pages.
 *
 * Le gabarit « Zenkuu | %s » du layout ne s'applique qu'aux segments ENFANTS.
 * `app/page.tsx` partageant le segment racine avec `app/layout.tsx`, un titre simple y
 * remplacerait le gabarit au lieu de le traverser — l'onglet afficherait « Accueil »
 * tout court. La forme `absolute` lève l'ambiguïté.
 */
export async function generateMetadata() {
  const fr = await getContent()
  return {
    title: { absolute: `${fr.site.name} | ${fr.pages.home}` },
  }
}

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * ACCUEIL — UN TABLEAU DE BORD DE MARCHÉ, REPRIS DE ZÉRO
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── L'ORDRE DES BLOCS, ET CE QU'IL REMPLACE ─────────────────────────────────
 *
 * La page était un EXPLORATEUR : en-tête daté flanqué de compteurs, rail de
 * raccourcis, recherche pleine largeur, trois cartes, puis une grille d'analyse
 * (carte des secteurs, trois palmarès, panneau éditorial). Elle est refaite sur le
 * modèle de tokenomist.ai/overview, dont l'ordre a été relevé écran par écran :
 *
 *     1. LIGNE DE DATE      centrée, seule, avec l'heure de fraîcheur
 *     2. RANG DE TÊTE       trois cartes LÉGÈRES, rendues sans attendre
 *     3. CLASSES + TABLEAU  sept pastilles au-dessus d'un tableau dense
 *     4. EN TENDANCE        une carte par classe, pleine largeur
 *     5. ACTUALITÉS         quatre cartes, pleine largeur
 *
 * ── CE QUI DISPARAÎT, ET POURQUOI ───────────────────────────────────────────
 *
 *   · les COMPTEURS DE COUVERTURE (« actifs suivis », « capitalisation suivie ») :
 *     un argument de vente posé à hauteur de la date, qui pesait autant qu'elle ;
 *   · le RAIL DE RACCOURCIS : il doublait la navigation de l'en-tête entrée pour
 *     entrée ;
 *   · la RECHERCHE PLEINE LARGEUR : la référence n'en porte pas sur cette page, la
 *     recherche vivant dans l'en-tête. C'est le point à surveiller de cette refonte —
 *     le champ de l'en-tête est REPLIÉ par défaut, et la recherche perd donc en
 *     visibilité ce que la page gagne en densité ;
 *   · la CARTE DES SECTEURS et les TROIS PALMARÈS : remplacés par le tableau de
 *     cotations, qui répond à la même question — « qu'est-ce qui cote quoi » — sans
 *     demander au lecteur de choisir entre trois classements avant de voir un prix.
 *     Ils vivent toujours sur `/heatmap` et `/classements`.
 *
 * ── LE DÉCOUPAGE SOUS `<Suspense>` NE CHANGE PAS DE PRINCIPE ────────────────
 *
 * Les quatre requêtes de tête sont légères : deux listes courtes, un agrégat, un fil
 * d'actualités. Les SEPT classements, eux, touchent trois fournisseurs distants — ils
 * vivent donc dans `ClassSection`, sous `<Suspense>`, et le haut de la page se peint
 * sans les attendre.
 *
 * ── AUCUNE ENTRÉE PROPRE AU VISITEUR ────────────────────────────────────────
 *
 * Ni `searchParams`, ni cookie : ce que rend cette page est le même pour tout le
 * monde, et `revalidate = 180` gouverne donc réellement la fraîcheur de ses données.
 * C'est aussi la raison pour laquelle les pastilles de classe changent le tableau par
 * un ÉTAT LOCAL et non par l'URL — voir l'en-tête de `ClassBoard`.
 *
 * Le seul bloc qui dépend du visiteur — les favoris — va chercher son état depuis le
 * navigateur, par l'action serveur qui existe déjà. Ce n'est pas gratuit en lignes,
 * et ça vaut la peine : une lecture de cookie dans l'arbre serveur marquerait le
 * rendu comme non partageable, ce qui retirerait au reste de la page le bénéfice du
 * cache pour cinq étoiles. Voir l'en-tête de `FavoritesPanel`.
 */
export default async function HomePage() {
  const fr = await getContent()
  const t = await getPhrase()
  const locale = await getLocale()

  const [overview, news, newListings, globals] = await Promise.all([
    getCryptoOverview('eur', SUGGESTION_COUNT),
    getNews(6),
    getNewListings(8),
    getCryptoGlobalStats('eur'),
  ])

  /* Série locale et non requête : `getMarketCapSeriesState` lit les relevés que le
     site enregistre lui-même. Synchrone, donc hors du `Promise.all`. */
  const series = getMarketCapSeriesState('EUR')

  const suggestions: FavoriteSuggestion[] = (overview.ok ? overview.data.topByMarketCap : [])
    .slice(0, SUGGESTION_COUNT)
    .map((asset) => ({
      assetClass: asset.assetClass,
      id: asset.id,
      name: asset.name,
      symbol: asset.symbol,
      href: assetHref(asset.assetClass, asset.id),
      ...(asset.image ? { image: asset.image } : {}),
    }))

  return (
    <div className="flex flex-col gap-7">
      <h1 className="sr-only">
        {t('{site} — explorer les marchés').replace('{site}', fr.site.name)}
      </h1>

      <MarketDate locale={locale} />

      {/* ── LE RANG DE TÊTE ──────────────────────────────────────────────────
          DEUX PARTS POUR LA PREMIÈRE CARTE, UNE POUR CHACUNE DES DEUX AUTRES.
          Mesuré sur la capture de la référence : leur carte de gauche fait 474 px
          quand les deux suivantes en font 238 et 231. Ce n'est pas une préférence
          de composition — c'est ce que le CONTENU impose. Les deux cartes de droite
          sont des listes de lignes courtes, qui n'ont rien à faire d'une largeur
          supplémentaire ; celle de gauche porte une courbe, dont la lisibilité est
          proportionnelle à sa largeur. Partager en trois parts égales prend au seul
          bloc qui en a besoin pour donner aux deux qui n'en ont que faire.

          `items-start` : les trois cartes ont des hauteurs indépendantes. Sans lui,
          la grille les étire toutes à la hauteur de la plus haute, et deux d'entre
          elles se terminent par un aplat vide de plusieurs centaines de pixels. */}
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <section className="flex flex-col gap-2">
          <SectionLabel>{t('Suivi du marché')}</SectionLabel>
          <MarketOverviewCard result={globals} series={series} />
        </section>

        <section className="flex flex-col gap-2">
          <SectionLabel
            action={
              <Link
                href="/nouvelles-cotations"
                className="shrink-0 text-sm text-brand transition-colors hover:text-brand-strong"
              >
                {t('Tout voir')}
              </Link>
            }
          >
            {t('Récemment cotés')}
          </SectionLabel>
          <RecentlyAdded result={newListings} />
        </section>

        <section className="flex flex-col gap-2">
          <SectionLabel>{t('Favoris')}</SectionLabel>
          <FavoritesPanel suggestions={suggestions} />
        </section>
      </div>

      <Suspense fallback={<BoardSkeleton />}>
        <ClassSection />
      </Suspense>

      <NewsBoard result={news} />
    </div>
  )
}

/**
 * Substitut du bloc de classements.
 *
 * HAUTEUR PROCHE DU CONTENU RÉEL, délibérément. Un substitut plus court que ce qu'il
 * remplace fait sauter tout le bas de la page à l'arrivée des données — le décalage de
 * mise en page que mesure Core Web Vitals.
 */
function BoardSkeleton() {
  return (
    <div className="flex flex-col gap-7" aria-hidden="true">
      <div className="flex flex-col gap-4">
        <div className="flex gap-1.5">
          {[0, 1, 2, 3, 4, 5, 6].map((index) => (
            <div key={index} className="h-[30px] w-24 animate-pulse rounded-pill bg-surface-muted" />
          ))}
        </div>
        <div className="h-[620px] animate-pulse rounded-panel border border-border-subtle bg-surface-muted" />
      </div>

      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(260px,1fr))]">
        {[0, 1, 2, 3].map((index) => (
          <div
            key={index}
            className="h-[260px] animate-pulse rounded-panel border border-border-subtle bg-surface-muted"
          />
        ))}
      </div>
    </div>
  )
}
