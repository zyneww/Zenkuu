import type { Metadata } from 'next'
import { Link } from '@/i18n/navigation'
import { ButtonLink } from '@/components/ui/ButtonLink'

import { getRanking, type AssetClass, type MarketAsset } from '@zenkuu/data'
import { DB_ENABLED, listWatchlist } from '@zenkuu/db'
import { ChangeBadge, EmptyState } from '@zenkuu/ui'

import { AssetLogo } from '@/components/asset/AssetLogo'
import { DashboardPreferences } from '@/components/dashboard/DashboardPreferences'
import { Money } from '@/components/locale/Money'
import { assetHref } from '@/lib/asset-routes'
import { ownerId } from '@/lib/session'
import { getPhrase } from '@/lib/content'

/**
 * Métadonnées DÉRIVÉES DE LA LANGUE, d'où la fonction plutôt que la constante.
 *
 * Un `export const metadata` est évalué une fois au chargement du module : il ne
 * peut pas connaître la locale de la requête, et servait donc un titre français sur
 * les pages traduites. `generateMetadata` est appelée par requête.
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getPhrase()

  return {
    title: t('Tableau de bord'),
    // Page strictement personnelle : rien à indexer, et son contenu diffère pour
    // chaque visiteur.
    robots: { index: false, follow: false },
  }
}

/**
 * Tableau de bord — ce que le compte apporte, réuni sur une page.
 *
 * ⚠️ EN QUOI IL DIFFÈRE DE `/suivi`, ET POURQUOI LES DEUX EXISTENT.
 *
 * `/suivi` est une LISTE : les actifs suivis, sans un seul cours, parce qu'afficher
 * trente cours y coûterait trente appels externes par chargement. Le tableau de bord,
 * lui, est une VUE D'ENSEMBLE — il montre les cours, mais seulement pour les actifs
 * suivis qui figurent déjà dans un classement chargé par ailleurs.
 *
 * C'est ce qui rend la page tenable : elle ne déclenche AUCUN appel dédié. Elle lit le
 * classement crypto — le même que `/crypto`, donc servi par le cache — et n'en garde
 * que les lignes suivies. Un actif suivi hors de ce classement apparaît sans cours,
 * avec un lien vers sa fiche : c'est un manque annoncé, pas un chiffre inventé (§5).
 */
export default async function DashboardPage() {
  const t = await getPhrase()
  if (!DB_ENABLED) {
    return (
      <Shell>
        <EmptyState
          title={t('Base de données non configurée')}
          description={t('La liste de suivi est conservée en base, et c’est elle que cette page réunit. Vos préférences d’affichage, elles, restent enregistrées sur cet appareil.')}
          action={<HomeLink />}
        />
        <DashboardPreferences />
      </Shell>
    )
  }

  const owner = await ownerId()

  // Les deux partent ensemble : la liste vient de notre base, le classement de la
  // source externe, et aucune ne dépend de l'autre.
  //
  // Sans identifiant — première visite, rien n'a encore été suivi — la requête base
  // est SAUTÉE plutôt qu'exécutée sur une clé nulle : elle ne rendrait rien, et une
  // requête réseau pour un résultat connu d'avance est une requête de trop.
  const [watchlist, ranking] = await Promise.all([
    owner ? listWatchlist(owner) : null,
    getRanking({ assetClass: 'crypto', currency: 'eur', perPage: 50 }),
  ])

  const followed = watchlist?.ok ? watchlist.data : []

  /* Le motif de panne est extrait ICI plutôt que lu dans le JSX : `watchlist` y est
     une union à trois branches — `null`, succès, échec — que le rétrécissement de
     TypeScript ne traverse pas à l'intérieur d'un ternaire imbriqué. */
  const watchlistError = watchlist && !watchlist.ok ? watchlist.reason : null

  // Index par identifiant : sans lui, chaque ligne suivie balaierait les cinquante
  // du classement. Négligeable ici, mais c'est le genre de boucle imbriquée qui
  // devient coûteuse dès qu'une liste s'allonge.
  const quotes = new Map<string, MarketAsset>(
    ranking.ok ? ranking.data.map((asset) => [asset.id, asset]) : [],
  )

  return (
    <Shell>
      <section className="space-y-4" aria-labelledby="suivi-titre">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="suivi-titre" className="display-sm text-ink">{t('Ma liste de suivi')}</h2>
            <p className="mt-1 text-sm text-ink-muted">
              {followed.length > 0
                ? `${followed.length} actif${followed.length > 1 ? 's' : ''} suivi${followed.length > 1 ? 's' : ''}.`
                : 'Aucun actif suivi pour le moment.'}
            </p>
          </div>
          {/* ⚠️ LE LIEN « VUE DÉTAILLÉE » A DISPARU AVEC `/suivi`, supprimée sur
              demande explicite. Cette section EST désormais la vue de la liste de
              suivi : rien ne renvoie plus ailleurs parce qu'il n'y a plus d'ailleurs. */}
        </div>

        {watchlistError ? (
          <EmptyState title={t('Liste de suivi indisponible')} description={watchlistError} />
        ) : followed.length === 0 ? (
          <EmptyState
            title={t('Aucun actif suivi')}
            description={t('Ouvrez la fiche d’un actif et utilisez le bouton « Suivre » pour l’ajouter ici.')}
            action={
              <ButtonLink href="/crypto">{t('Parcourir les cryptomonnaies')}</ButtonLink>
            }
          />
        ) : (
          <ul className="divide-y divide-border-subtle rounded-card border border-border-subtle">
            {followed.map((item) => {
              const quote = quotes.get(item.assetId)

              return (
                <li key={item.id}>
                  <Link
                    href={assetHref(item.assetClass as AssetClass, item.assetId)}
                    className="group flex items-center gap-3 rounded-sm px-4 py-3 transition-colors duration-150 hover:bg-surface-muted"
                  >
                    {quote ? (
                      <AssetLogo asset={quote} size={24} />
                    ) : (
                      <span
                        className="h-6 w-6 shrink-0 rounded-pill bg-surface-muted"
                        aria-hidden="true"
                      />
                    )}

                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-ink group-hover:text-brand">
                        {item.label}
                      </span>
                      {item.symbol ? (
                        <span className="block text-xs uppercase text-ink-muted">
                          {item.symbol}
                        </span>
                      ) : null}
                    </span>

                    {quote ? (
                      <>
                        <span className="tabular shrink-0 text-sm text-ink">
                          <Money value={quote.price} from={quote.currency} />
                        </span>
                        <span className="w-20 shrink-0 text-right">
                          <ChangeBadge value={quote.change24h} size="sm" />
                        </span>
                      </>
                    ) : (
                      /* Cours absent du classement chargé : on le DIT, plutôt que
                         d'afficher un tiret qui passerait pour une valeur nulle. */
                      <span className="shrink-0 text-xs text-ink-muted">
                        cours sur la fiche
                      </span>
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <DashboardPreferences />
    </Shell>
  )
}

async function Shell({ children }: { children: React.ReactNode }) {
  const t = await getPhrase()

  return (
    <div className="mx-auto max-w-3xl space-y-10 py-6">
      <header className="space-y-2">
        <h1 className="display-xl text-ink">{t("Tableau de bord")}</h1>
        <p className="text-sm leading-relaxed text-ink-muted">{t("Vos actifs suivis et vos préférences d’affichage. ZENKUU n’exécute aucun ordre et ne détient aucun fonds : il n’y a donc ici ni solde, ni portefeuille, ni performance — seulement ce que vous avez choisi de suivre.")}</p>
      </header>
      {children}
    </div>
  )
}

async function HomeLink() {
  const t = await getPhrase()
  return (
    <ButtonLink href="/">{t('Retour à l’accueil')}</ButtonLink>
  )
}
