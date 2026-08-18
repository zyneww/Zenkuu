import type { Metadata } from 'next'

import { CACHE_TTL_SECONDS, getDerivatives, type AssetClass } from '@zenkuu/data'
import { EmptyState, SourceNote } from '@zenkuu/ui'

import { BrowseTabs, DERIVATIVES_TAB, browseHref } from '@/components/market/BrowseTabs'
import { DerivativesPanel } from '@/components/market/DerivativesPanel'
import { MarketPageView } from '@/components/market/MarketPageView'
import { getContent } from '@/lib/content'
import { assetClassFromSegment } from '@/lib/asset-routes'
import { getPhrase } from '@/lib/content'

export const revalidate = 180
const _ttlGuard: typeof revalidate = CACHE_TTL_SECONDS
void _ttlGuard

export async function generateMetadata(): Promise<Metadata> {
  const fr = await getContent()
  return {
    title: 'Parcourir les marchés',
    description:
      `Les sept marchés suivis par ${fr.site.name} sur une seule page : cryptomonnaies, ` +
      'dérivés, ETF, actions, indices, devises et matières premières.',
    alternates: { canonical: '/marches' },
  }
}

/**
 * Classe demandée par l'URL, en lecture DÉFENSIVE.
 *
 * Le paramètre est saisissable à la main et finit dans une clé de cache côté données.
 * Une valeur inconnue retombe donc sur la crypto plutôt que d'ouvrir une requête sur
 * une classe qui n'existe pas.
 */
function readAssetClass(raw: string | string[] | undefined): AssetClass {
  const value = Array.isArray(raw) ? raw[0] : raw
  if (!value) return 'crypto'
  return assetClassFromSegment(value) ?? 'crypto'
}

/**
 * PARCOURIR — les sept marchés derrière une seule barre d'onglets.
 *
 * ── C'EST LA PAGE QUI A REMPLACÉ UN MENU ─────────────────────────────────────
 *
 * L'en-tête portait un menu « Marchés » de onze entrées, dont sept menaient à une
 * page de classement par classe d'actif. Ce menu a été supprimé au profit d'un bouton
 * unique qui ouvre celle-ci. Le raisonnement tient en une phrase : un menu dont chaque
 * entrée mène au même endroit avec un paramètre différent est une barre d'onglets qui
 * se cache — et qui oblige à choisir avant de voir.
 *
 * Les sept pages dédiées survivent et gardent leurs URL. Ce qui disparaît est
 * l'obligation de passer par un menu pour changer d'angle.
 *
 * ── LE BANDEAU ON-CHAIN NE S'AFFICHE QUE SUR LA CRYPTO ──────────────────────
 *
 * Une action Total n'a pas de pool de liquidité. Le bandeau est donc conditionnel, et
 * son absence sur les six autres onglets n'est pas un manque : c'est la nature de
 * l'actif.
 */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams

  /*
   * L'ONGLET DÉRIVÉS EST LU SUR UN PARAMÈTRE DISTINCT (`vue`), ET NON SUR `classe`.
   *
   * Les faire partager le même paramètre obligerait `readAssetClass` à connaître une
   * valeur qui n'est pas une classe d'actif, et donc à mentir sur son type de retour.
   * Deux paramètres pour deux natures : `classe` désigne un actif, `vue` un angle.
   */
  const view = Array.isArray(params['vue']) ? params['vue'][0] : params['vue']
  const isDerivatives = view === DERIVATIVES_TAB
  const assetClass = readAssetClass(params['classe'])

  /*
   * LA BARRE EST RENDUE UNE SEULE FOIS, AU-DESSUS DE L'EMBRANCHEMENT.
   *
   * Elle vivait dans chacune des deux branches. C'était invisible tant que l'onglet
   * actif se signalait par un aplat : chaque branche repeignait le sien, et personne
   * ne voyait que le composant avait été détruit entre-temps.
   *
   * Le trait glissant, lui, le rend visible. React ne conserve l'état d'un composant
   * — ici, la position mesurée du trait — que s'il occupe la MÊME PLACE dans l'arbre
   * d'un rendu à l'autre. Deux branches, deux places : le trait repartait de zéro et
   * SAUTAIT à sa nouvelle position au lieu de la rejoindre. Or c'est exactement le
   * passage « Dérivés → ETF » qui traverse cette frontière.
   *
   * La barre passe donc au-dessus du titre. Ce n'est pas un pis-aller : elle SÉLECTIONNE
   * ce que la page montre, et un sélecteur placé sous le titre de ce qu'il vient de
   * choisir se lit à l'envers.
   */
  const tabs = (
    <BrowseTabs
      current={isDerivatives ? DERIVATIVES_TAB : assetClass}
      hrefFor={browseHref}
    />
  )

  return (
    <div className="space-y-6">
      {tabs}

      {isDerivatives ? (
        <DerivativesView />
      ) : (
        <MarketPageView
          assetClass={assetClass}
          title="Parcourir les marchés"
          subtitle={
            'Les sept marchés suivis, triables et paginés sur une seule page. ' +
            'Lecture seule : aucun ordre ne part d’ici.'
          }
          searchParams={params}
          basePath={browseHref(assetClass)}
          /* `null` et non l'absence de prop : sans cela `AssetClassTabs` s'ajouterait
             sous celle du dessus, et la page porterait deux barres d'onglets qui
             disent la même chose en menant ailleurs. */
          tabs={null}
        >
          {/*
            ── DEUX BLOCS ONT DISPARU D'ICI, POUR DEUX RAISONS DIFFÉRENTES ──────

            LE BANDEAU DES POOLS ON-CHAIN ouvrait la page sur l'onglet crypto : dix
            paires de jetons éphémères à quatre-vingt-dix-neuf pour cent de baisse,
            placées AU-DESSUS du classement que le titre annonce. Le premier écran de
            « Parcourir les marchés » ne montrait donc pas les marchés. La donnée n'est
            pas perdue — `/graphiques` la porte, dans une page dont c'est le sujet.

            LE LIEN « PAGE DÉDIÉE À CETTE CLASSE » pointait vers `/etf`, `/actions`…
            Ces pages n'existent plus et redirigent ICI MÊME : le lien ramenait donc à
            la page depuis laquelle on cliquait. C'est pire qu'un lien mort, qui au
            moins se signale.
          */}
        </MarketPageView>
      )}
    </div>
  )
}

/**
 * Onglet DÉRIVÉS — contrats perpétuels et à échéance.
 *
 * Il ne passe pas par `MarketPageView` et ne le pouvait pas : cette vue ne liste pas
 * des ACTIFS mais des CONTRATS, qui n'ont ni capitalisation, ni offre, ni fiche à
 * ouvrir. Tri, pagination et colonnes du classement n'auraient rien à trier.
 */
async function DerivativesView() {
  const t = await getPhrase()
  const derivatives = await getDerivatives(100)

  return (
    <div className="space-y-5">
      <header className="max-w-3xl space-y-3">
        <h1 className="display-xl text-ink">{t("Dérivés")}</h1>
        <p className="text-lg leading-relaxed text-ink-muted">{t("Les contrats les plus actifs, leur intérêt ouvert et leur taux de financement. Un contrat perpétuel n’a pas d’échéance : son taux de financement est ce qui le raccroche au cours au comptant.")}</p>
      </header>

      {derivatives.ok && derivatives.data.length > 0 ? (
        <>
          <DerivativesPanel markets={derivatives.data} />
          <SourceNote
            label={`${derivatives.source.label} · montants en USD`}
            href={derivatives.source.attributionUrl}
          />
        </>
      ) : (
        <EmptyState
          title="Dérivés momentanément indisponibles"
          description={derivatives.ok ? null : derivatives.reason}
          source={derivatives.source?.label ?? null}
          tone={derivatives.ok ? 'neutral' : 'warning'}
        />
      )}

      <p className="max-w-2xl text-xs leading-relaxed text-ink-muted">
        ZENKUU ne référence aucun carnet d’ordres et ne permet aucune transaction. Un
        produit dérivé porte un effet de levier : ce tableau situe l’exposition du
        marché, il n’y donne pas accès.
      </p>
    </div>
  )
}

/*
 * `OnChainBand` VIVAIT ICI, et part avec le bloc qu'il rendait.
 *
 * Il listait les dix pools de liquidité les plus actifs, toutes chaînes confondues.
 * `DexPoolTable` reste en place et sert `/graphiques` : c'est le composant qui portait
 * la valeur, pas ce bandeau qui le posait au mauvais endroit.
 */
