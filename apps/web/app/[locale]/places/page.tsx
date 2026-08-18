import type { Metadata } from 'next'

import { getSpotExchanges } from '@zenkuu/data'
import { EmptyState, SourceNote } from '@zenkuu/ui'

import { BrowseTabs, EXCHANGES_TAB, browseHref } from '@/components/market/BrowseTabs'
import { SpotExchangesExplorer } from '@/components/market/SpotExchangesExplorer'
import { getPhrase, getSeo } from '@/lib/content'

/*
 * Une heure, comme le TTL de la donnée elle-même (voir `getSpotExchanges`). Régénérer
 * plus souvent redemanderait une réponse que le cache de données rendrait à
 * l'identique — du travail pour rien.
 */
export const revalidate = 3600

/**
 * Métadonnées DÉRIVÉES DE LA LANGUE, d'où la fonction plutôt que la constante.
 *
 * Un `export const metadata` est évalué une fois au chargement du module : il ne
 * peut pas connaître la locale de la requête, et servait donc un titre français sur
 * les pages traduites. `generateMetadata` est appelée par requête.
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getPhrase()
  const seo = await getSeo()

  return {
    title: t('Places de cotation'),
    description: seo(
      '/places',
      'Les cent premières places d’échange au comptant classées par note de confiance : volume déclaré sur 24 heures, part du volume affiché, pays. ZENKUU ne référence aucun carnet d’ordres et ne permet aucune transaction.',
    ),
    alternates: { canonical: '/places' },
  }
}

/**
 * Registre des places de cotation.
 *
 * ── LA PAGE QUE LE MENU PROMETTAIT ───────────────────────────────────────────
 *
 * L'entrée « Places de cotation » pointait vers `/places` depuis la refonte du menu,
 * et `/places` renvoyait une 404 : le panneau existait, mais seulement enterré au
 * milieu de `/mouvements`, entre les agrégats macro et les dérivés. Un lien de
 * navigation qui ne mène nulle part est le pire des défauts d'un menu — il fait
 * douter du reste.
 *
 * ── CENT PLACES ICI, VINGT-CINQ LÀ-BAS ───────────────────────────────────────
 *
 * `/mouvements` garde son extrait de vingt-cinq lignes : sur une page qui
 * répond à « que fait le marché », savoir où il s'échange est un plan parmi quatre.
 * Ici, c'est la question elle-même, et l'on va donc au bout de ce que la source
 * publie utilement.
 *
 * ── CE QUE LA PAGE NE FAIT PAS ───────────────────────────────────────────────
 *
 * Aucun lien vers l'interface des plateformes, aucun bouton « s'inscrire », aucun
 * classement maison. Situer l'activité, pas y donner accès (§1) — et la note de
 * confiance reste attribuée à la source, puisque c'est un jugement et non une mesure.
 */
export default async function PlacesPage() {
  const t = await getPhrase()
  const exchanges = await getSpotExchanges(100)

  return (
    <div className="space-y-8 py-6">
      {/* Même barre que `/marches` et `/perpetuels` — voir la note de cette dernière. */}
      <BrowseTabs current={EXCHANGES_TAB} hrefFor={browseHref} />

      <header className="max-w-3xl space-y-3">
        <h1 className="display-xl text-ink">{t("Où s’échange le marché au comptant")}</h1>
        <p className="text-lg leading-relaxed text-ink-muted">{t("Les places d’échange classées par note de confiance, avec le volume qu’elles déclarent sur 24 heures et la part qu’il représente dans ce classement. ZENKUU ne référence aucun carnet d’ordres et ne permet aucune transaction : ce registre situe l’activité, il n’y donne pas accès.")}</p>
      </header>

      {exchanges.ok && exchanges.data.length > 0 ? (
        <>
          <SpotExchangesExplorer exchanges={exchanges.data} />
          <SourceNote label={exchanges.source.label} href={exchanges.source.attributionUrl} />
        </>
      ) : (
        <EmptyState
          title="Classement des places indisponible"
          description={exchanges.ok ? 'La source ne publie aucune place.' : exchanges.reason}
          source={exchanges.source?.label ?? null}
          tone={exchanges.ok ? 'neutral' : 'warning'}
        />
      )}

      <section className="max-w-3xl space-y-2">
        <h2 className="text-base font-semibold text-ink">Comment lire ce classement</h2>
        <p className="text-sm leading-relaxed text-ink-muted">
          La <strong className="text-ink">part du volume affiché</strong> rapporte chaque
          place au total des places de ce tableau, et non au marché mondial : la source
          en classe plusieurs centaines, on en montre cent. Écrire « part de marché »
          serait faux d’un facteur inconnu.
        </p>
        <p className="text-sm leading-relaxed text-ink-muted">
          Le <strong className="text-ink">volume est en bitcoin</strong>, unité dans
          laquelle la source le publie. Le convertir en euros supposerait de choisir un
          cours et un instant — une mesure deviendrait une estimation.
        </p>
        <p className="text-sm leading-relaxed text-ink-muted">
          La <strong className="text-ink">note de confiance</strong> est un jugement
          publié par la source sur la qualité de la liquidité déclarée. Ce n’est ni une
          mesure, ni un avis de ZENKUU.
        </p>
      </section>
    </div>
  )
}
