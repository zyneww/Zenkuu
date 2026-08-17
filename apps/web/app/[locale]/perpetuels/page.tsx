import type { Metadata } from 'next'

import { getDerivativeExchanges } from '@zenkuu/data'
import { EmptyState, SourceNote } from '@zenkuu/ui'

import { BrowseTabs, PERPETUALS_TAB, browseHref } from '@/components/market/BrowseTabs'
import { DerivativeExchangesExplorer } from '@/components/market/DerivativeExchangesExplorer'

/* Dix minutes, comme le TTL de la donnée elle-même : l'intérêt ouvert est une
   position, et une position se déplace dans la journée. */
export const revalidate = 600

export const metadata: Metadata = {
  title: 'Places de produits dérivés',
  description:
    'Les places de contrats perpétuels classées par intérêt ouvert : exposition portée, volume sur 24 heures, rotation, nombre de contrats. Plateformes décentralisées et dépositaires distinguées. ZENKUU ne référence aucun carnet d’ordres et ne permet aucune transaction.',
  alternates: { canonical: '/perpetuels' },
}

/**
 * PLACES DE PRODUITS DÉRIVÉS.
 *
 * ── POURQUOI UNE PAGE, ALORS QUE « DÉRIVÉS » EXISTE DÉJÀ DANS /marches ──────
 *
 * L'onglet « Dérivés » de `/marches` liste des CONTRATS : BTCUSDT perpétuel sur
 * Binance, son taux de financement, son écart à l'indice. Cette page-ci liste les
 * PLACES qui les cotent. Ce sont deux questions qu'on ne se pose pas au même moment —
 * « quel contrat suivre ? » d'un côté, « où se concentre l'exposition, et sur quelle
 * infrastructure ? » de l'autre.
 *
 * La seconde question est celle que CoinGecko traite sur sa page des dérivés
 * décentralisés, et elle n'avait aucune surface ici : le site savait montrer huit
 * cents contrats sans jamais dire que la moitié de l'intérêt ouvert mondial tient sur
 * trois plateformes.
 *
 * ── LA DISTINCTION DEX / CEX EST LA NÔTRE, ET LA PAGE LE DIT ────────────────
 *
 * La source ne publie aucun indicateur de décentralisation (voir
 * `DerivativeExchange.kind` pour les deux pistes essayées et écartées). Le classement
 * vient donc de nous, et la note de bas de page l'attribue explicitement à ZENKUU —
 * le §5 interdit d'inventer un chiffre, pas de classer, à condition de dire d'où
 * vient le classement.
 */
export default async function PerpetuelsPage() {
  const exchanges = await getDerivativeExchanges(100)

  return (
    <div className="space-y-8 py-6">
      {/* La barre des marchés SUIT le lecteur jusqu'ici. Sans elle, cliquer sur
          « Perpétuels » depuis `/marches` déposerait sur une page sans retour visible
          vers les autres onglets — le seul chemin serait le bouton précédent. */}
      <BrowseTabs current={PERPETUALS_TAB} hrefFor={browseHref} />

      <header className="max-w-3xl space-y-3">
        <h1 className="display-xl text-ink">Où se portent les positions à effet de levier</h1>
        <p className="text-lg leading-relaxed text-ink-muted">
          Les places de contrats perpétuels, classées par l’exposition qu’elles portent
          réellement — l’intérêt ouvert — et non par le volume qu’elles affichent. ZENKUU
          ne référence aucun carnet d’ordres et ne permet aucune transaction : ce
          registre situe l’activité, il n’y donne pas accès.
        </p>
      </header>

      {exchanges.ok && exchanges.data.length > 0 ? (
        <>
          <DerivativeExchangesExplorer exchanges={exchanges.data} />
          <SourceNote label={exchanges.source.label} href={exchanges.source.attributionUrl} />
        </>
      ) : (
        <EmptyState
          title="Classement des places de dérivés indisponible"
          description={exchanges.ok ? 'La source ne publie aucune place.' : exchanges.reason}
          source={exchanges.source?.label ?? null}
          tone={exchanges.ok ? 'neutral' : 'warning'}
        />
      )}

      <section className="max-w-3xl space-y-2">
        <h2 className="text-base font-semibold text-ink">Comment lire ce classement</h2>

        <p className="text-sm leading-relaxed text-ink-muted">
          L’<strong className="text-ink">intérêt ouvert</strong> est la somme des
          positions non dénouées. C’est l’exposition qui reste ouverte à l’instant du
          relevé, et donc ce qui peut se liquider en cascade lors d’un mouvement brutal.
          Le volume, lui, compte aussi les allers-retours refermés dans la minute :
          une place peut en afficher beaucoup sans qu’aucune position ne subsiste le
          soir. La colonne <strong className="text-ink">rotation</strong> rapporte le
          second au premier.
        </p>

        <p className="text-sm leading-relaxed text-ink-muted">
          Les <strong className="text-ink">montants sont en bitcoin</strong>, unité dans
          laquelle la source les publie. Les convertir en euros supposerait de choisir un
          cours et un instant — une mesure deviendrait une estimation.
        </p>

        <p className="text-sm leading-relaxed text-ink-muted">
          Un <strong className="text-ink">contrat perpétuel</strong> n’a pas d’échéance :
          il ne se règle jamais, et c’est un taux de financement échangé entre acheteurs
          et vendeurs — toutes les huit heures chez la plupart des places — qui le
          raccroche au cours au comptant. Les contrats à échéance, minoritaires ici,
          sont comptés à part dans la colonne des contrats.
        </p>

        <p className="text-sm leading-relaxed text-ink-muted">
          La distinction entre place{' '}
          <strong className="text-ink">décentralisée et dépositaire</strong> est établie
          par ZENKUU et non par la source, qui ne la publie pas. Le critère est le
          règlement des positions : sur une place décentralisée, la marge est déposée
          dans un contrat autonome ; sur une place dépositaire, les fonds sont détenus
          par l’opérateur. Les places que nous n’avons pas encore classées sont
          affichées comme telles plutôt que rangées par défaut d’un côté.
        </p>
      </section>
    </div>
  )
}
