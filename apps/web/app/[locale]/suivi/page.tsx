import type { Metadata } from 'next'
import { Link } from '@/i18n/navigation'

import { DB_ENABLED, listWatchlist } from '@zenkuu/db'
import { EmptyState } from '@zenkuu/ui'

import {
  WatchlistBoard,
  type BoardItem,
  type BoardList,
} from '@/components/watchlist/WatchlistBoard'
import { assetHref } from '@/lib/asset-routes'
import { WATCHLIST_ASSET_LIMIT, WATCHLIST_COUNT_LIMIT } from '@/lib/limits'
import { currentAccount, ownerId } from '@/lib/session'
import type { AssetClass } from '@zenkuu/data'
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
    title: t('Ma liste de suivi'),
    // Page strictement personnelle : rien à indexer, et son contenu diffère pour
    // chaque visiteur.
    robots: { index: false, follow: false },
  }
}

/**
 * Liste de suivi persistée.
 *
 * Elle n'affiche AUCUN cours. Les libellés viennent de la base ; les chiffres, eux,
 * restent sur les fiches. Afficher trente cours ici coûterait trente appels externes
 * à chaque chargement, très au-delà du quota mesuré — et un prix mis en cache en
 * base serait périmé dès la minute suivante (§5).
 *
 * ── CE QUE LE RETRAIT DES COMPTES OBLIGATOIRES A CHANGÉ ───────────────────────
 *
 * La page s'ouvrait sur deux refus : pas d'authentification configurée, pas de
 * session. Le second a disparu — suivre un actif ne demande plus de compte, la liste
 * étant rangée sous le cookie anonyme du navigateur (`lib/visitor.ts`). Il ne reste
 * que la base, qui est la seule chose dont cette page dépende encore réellement.
 *
 * En contrepartie, la page DOIT dire à un visiteur anonyme que sa liste vit dans son
 * navigateur et non ailleurs. Sans cela, un nettoyage de cookies se lirait comme une
 * perte de données de notre fait.
 */
export default async function SuiviPage() {
  const t = await getPhrase()
  if (!DB_ENABLED) {
    return (
      <Shell>
        <EmptyState
          title={t('Base de données non configurée')}
          description={t('Les listes de suivi sont conservées en base. Tant qu’aucune n’est configurée sur cette instance, elles ne peuvent pas l’être.')}
          action={<HomeLink />}
        />
      </Shell>
    )
  }

  const [owner, account] = await Promise.all([ownerId(), currentAccount()])
  const signedIn = account !== null

  /* Aucun identifiant : ce visiteur n'a jamais rien suivi depuis ce navigateur. Cela
     se traite comme une liste vide, pas comme un refus — c'est l'état d'une première
     visite, et il n'y a rien à lui demander pour en sortir. */
  const result = owner ? await listWatchlist(owner) : null

  if (result && !result.ok) {
    return (
      <Shell>
        <EmptyState
          title={t('Liste de suivi indisponible')}
          description={result.reason}
          action={<HomeLink />}
        />
      </Shell>
    )
  }

  const items = result?.ok ? result.data : []

  if (items.length === 0) {
    return (
      <Shell signedIn={signedIn}>
        <EmptyState
          title="Aucun actif suivi"
          description={t('Ouvrez la fiche d’un actif et utilisez le bouton « Suivre » pour l’ajouter ici. Aucun compte n’est nécessaire.')}
          action={
            <Link
              href="/marches"
              className="inline-block rounded-control bg-brand px-5 py-2.5 text-sm font-medium text-on-brand transition-colors hover:bg-brand-strong"
            >{t('Parcourir les cryptomonnaies')}</Link>
          }
        />
      </Shell>
    )
  }

  /*
   * Compteur de plafond, affiché SEULEMENT quand la liste s'en approche.
   *
   * Une jauge « 2 / 200 » permanente transformerait la page en rappel de quota à
   * chaque visite, pour une contrainte que le lecteur ne rencontrera peut-être jamais.
   * Les dix derniers créneaux sont le moment où l'information devient utile plutôt
   * qu'insistante — assez tôt pour ne pas être une surprise, assez tard pour ne pas
   * être du bruit.
   */
  const nearCap = items.length >= WATCHLIST_ASSET_LIMIT - 10

  const dateFormat = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short' })

  /*
   * Regroupement par liste, fait ICI plutôt qu'en base.
   *
   * Une requête par liste multiplierait les allers-retours pour un jeu de données
   * qu'une seule requête ramène déjà en entier — et dont la taille est bornée par le
   * plafond du site. L'ordre des listes suit celui de leur activité, la plus
   * récemment enrichie en tête.
   */
  const grouped = new Map<string, BoardItem[]>()
  for (const item of items) {
    const bucket = grouped.get(item.listName)
    const row: BoardItem = {
      href: assetHref(item.assetClass as AssetClass, item.assetId),
      label: item.label,
      symbol: item.symbol,
      assetClass: item.assetClass,
      assetId: item.assetId,
      addedAt: dateFormat.format(item.createdAt),
    }
    if (bucket) bucket.push(row)
    else grouped.set(item.listName, [row])
  }

  const lists: BoardList[] = [...grouped].map(([name, items_]) => ({ name, items: items_ }))

  return (
    <Shell signedIn={signedIn}>
      {nearCap ? (
        <p className="rounded-card border border-border-subtle bg-surface px-4 py-3 text-sm text-ink-muted">
          <span className="tabular text-ink">
            {items.length} / {WATCHLIST_ASSET_LIMIT}
          </span>{' '}
          actifs suivis — le plafond du site.
        </p>
      ) : null}

      <WatchlistBoard lists={lists} canCreateList={lists.length < WATCHLIST_COUNT_LIMIT} />
    </Shell>
  )
}

async function Shell({
  children,
  signedIn = true,
}: {
  children: React.ReactNode
  /**
   * Décide du rappel de portabilité.
   *
   * Il n'est montré qu'aux visiteurs ANONYMES : leur liste vit dans un cookie, et un
   * nettoyage du navigateur l'efface. Le dire est une obligation d'honnêteté, pas une
   * invitation commerciale — d'où le ton, et d'où sa disparition dès qu'un compte
   * existe. Par défaut `true`, pour que les écrans d'indisponibilité ne l'affichent
   * pas : ils décrivent une panne, pas un mode de rangement.
   */
  signedIn?: boolean
}) {
  const t = await getPhrase()
  return (
    <div className="mx-auto max-w-2xl space-y-6 py-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-ink">{t('Ma liste de suivi')}</h1>
        <p className="text-sm leading-relaxed text-ink-muted">{t('Les actifs que vous suivez. Les cours ne sont pas repris ici : ils vivent sur les fiches, où ils sont toujours à jour.')}</p>
      </header>

      {!signedIn ? (
        <p className="rounded-card border border-border-subtle bg-surface-muted px-4 py-3 text-xs leading-relaxed text-ink-muted">
          Cette liste est rattachée à{' '}
          <strong className="font-medium text-ink">ce navigateur</strong>, pas à un compte. Elle ne
          suivra pas sur un autre appareil et disparaîtra si vous effacez vos données de navigation.
          Se connecter la rattache à une adresse, et la récupère telle quelle.
        </p>
      ) : null}

      {children}
    </div>
  )
}

async function HomeLink() {
  const t = await getPhrase()
  return (
    <Link
      href="/"
      className="inline-block rounded-control bg-brand px-5 py-2.5 text-sm font-medium text-on-brand transition-colors hover:bg-brand-strong"
    >{t('Retour à l’accueil')}</Link>
  )
}
