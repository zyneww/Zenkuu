import { getRanking, rankMovers, type AssetClass, type MarketAsset } from '@zenkuu/data'
import { EmptyState, SourceNote } from '@zenkuu/ui'

import { HighlightPanel } from '@/components/home/HighlightPanel'
import { getContent } from '@/lib/content'
import { marketHref } from '@/lib/asset-routes'
import { getPhrase } from '@/lib/content'

/**
 * Nombre de lignes ramenées pour construire les trois palmarès d'une classe.
 *
 * VINGT, et ce chiffre est contraint des deux côtés.
 *
 * Vers le bas : chaque palmarès montre cinq lignes, et les trois se recouvrent
 * partiellement — un actif peut être à la fois en tête des volumes et des hausses.
 * Sous une quinzaine de lignes, les listes finiraient par se répéter d'un panneau à
 * l'autre, ce qui donnerait l'impression d'un bug plutôt que d'une corrélation.
 *
 * Vers le haut : `20` est aussi la taille de page des classements dédiés
 * (`/actions`, `/etf`, `/indices`, `/matieres-premieres`). La CLÉ DE CACHE est donc
 * partagée avec eux — voir `getRanking`, qui fait entrer `perPage` dans sa clé. Une
 * taille propre à l'accueil ouvrirait une seconde entrée pour la même donnée, et
 * chez Yahoo un classement se construit symbole par symbole : ce serait vingt appels
 * sortants de plus, à chaque régénération, pour un contenu déjà en cache.
 */
export const RANKING_SIZE = 20

/**
 * Les trois palmarès d'une classe d'actif — hausses, baisses, volumes.
 *
 * ── UN SEUL APPEL POUR TROIS PANNEAUX ────────────────────────────────────────
 *
 * C'est le point de conception de ce composant, et il vaut d'être explicite : les
 * trois palmarès sont DÉRIVÉS EN MÉMOIRE d'un unique classement, pas obtenus par
 * trois requêtes triées différemment.
 *
 * `getRanking` accepte pourtant `sortBy: 'volume24h' | 'change24h'`, et l'appeler
 * trois fois aurait été la lecture naïve du besoin. Le calcul l'écarte : sept
 * sections de classe × trois tris = vingt et une requêtes par rendu d'accueil, là où
 * la dérivation en coûte sept. Et le multiplicateur est bien pire qu'il n'y paraît —
 * l'adaptateur Yahoo construit un classement SYMBOLE PAR SYMBOLE, si bien qu'un tri
 * supplémentaire sur une classe Yahoo ne coûte pas un appel sortant mais vingt.
 *
 * La dérivation ne perd RIEN au passage : trier vingt lignes déjà en mémoire donne
 * exactement le même résultat que demander à la source de les trier. Le seul écart
 * serait sur un palmarès qui déborderait des vingt premières capitalisations — d'où
 * la mention de périmètre affichée sous chaque titre, qui dit précisément cela plutôt
 * que de laisser croire à une exhaustivité.
 */
export async function ClassMoversGrid({
  assetClass,
  currency = 'eur',
}: {
  assetClass: AssetClass
  currency?: string
}) {
  const t = await getPhrase()
  const fr = await getContent()
  const ranking = await getRanking({ assetClass, currency, perPage: RANKING_SIZE })

  if (!ranking.ok) {
    return (
      <EmptyState
        title={fr.states.unavailableTitle}
        description={ranking.reason}
        source={ranking.source?.label ?? null}
        tone={ranking.kind === 'unconfigured' ? 'neutral' : 'warning'}
      />
    )
  }

  const assets = ranking.data

  if (assets.length === 0) {
    return <EmptyState title={fr.states.unavailableTitle} description={null} compact />
  }

  // `rankMovers` découpe PAR SIGNE et non aux deux extrémités : les jours où toute la
  // classe monte, « plus fortes baisses » rend une liste courte plutôt que de se
  // remplir d'actifs en hausse. Voir son commentaire — c'est un piège qu'un
  // `slice(-5)` naïf reproduirait ici mot pour mot.
  const { gainers, losers } = rankMovers(assets, '24h', 5)

  const volumeLeaders = byVolume(assets)

  const hint = fr.home.classMoversHint(assets.length)
  const href = marketHref(assetClass)

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <HighlightPanel
          title={fr.home.gainersTitle}
          hint={hint}
          assets={gainers}
          href={href}
        />

        <HighlightPanel title={fr.home.losersTitle} hint={hint} assets={losers} href={href} />

        <HighlightPanel
          title={fr.home.volumeLeadersTitle}
          hint={hint}
          assets={volumeLeaders}
          href={href}
        />
      </div>

      <SourceNote
            strings={{ source: t('Source :'), dated: t('données du {date}') }}
        label={ranking.source.label}
        href={ranking.source.attributionUrl}
        updatedAt={assets[0]?.lastUpdated}
      />
    </>
  )
}

/**
 * Classement par volume négocié, les lignes sans volume ÉCARTÉES.
 *
 * Le filtre précède le tri, et l'ordre compte. Traiter un volume absent comme un zéro
 * — ce que fait `(a.volume24h ?? 0)` glissé dans le comparateur — remplirait le bas
 * du palmarès d'actifs dont on ne sait rien, présentés comme les moins échangés. Or
 * les indices n'ont pas de volume publié chez Yahoo : la classe entière serait
 * affichée à zéro, dans un panneau intitulé « Plus forts volumes ».
 *
 * Écartés, ils rendent une liste vide, et le panneau dit alors franchement qu'il n'a
 * rien à montrer (§5) — ce qui est l'information exacte.
 */
function byVolume(assets: readonly MarketAsset[]): MarketAsset[] {
  return assets
    .filter((asset) => typeof asset.volume24h === 'number' && asset.volume24h > 0)
    .sort((a, b) => (b.volume24h as number) - (a.volume24h as number))
    .slice(0, 5)
}
