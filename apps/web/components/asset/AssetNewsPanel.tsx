import type { NewsItem } from '@zenkuu/data'

import { NewsFeed } from '@/components/news/NewsFeed'
import { getPhrase } from '@/lib/content'
import { Panel } from '@/components/ui/Panel'
import { mentioning } from '@/lib/mentions'

/**
 * Articles mentionnant l'actif.
 *
 * ── LE TITRE DU PANNEAU EST LA MOITIÉ DE LA FONCTIONNALITÉ ────────────────────
 *
 * « Articles mentionnant X » et non « Actualité de X ». Nos flux ne rattachent
 * aucun article à un actif : la sélection se fait en cherchant le nom dans le titre
 * (voir `lib/mentions.ts`). C'est une RECHERCHE, exacte mot pour mot, et non un
 * classement éditorial — un article qui cite l'actif en passant apparaîtra ici.
 *
 * Promettre « l'actualité de Hyperliquid » laisserait croire à une sélection
 * éditoriale que personne n'a faite, et à une exhaustivité qu'aucune recherche par
 * nom ne peut atteindre. Le titre dit exactement ce que le panneau fait.
 *
 * ── ET IL DISPARAÎT PLUTÔT QUE DE MONTRER SA DÉCEPTION ────────────────────────
 *
 * Aucune mention trouvée : le panneau ne s'affiche pas. Un encadré « aucun article »
 * sur une fiche d'actif suggère qu'il ne se passe rien, alors qu'il dit seulement
 * que nos vingt-neuf sources n'ont pas écrit ce nom récemment (§5).
 */
export async function AssetNewsPanel({
  news,
  name,
  symbol,
  limit = 6,
  fallback,
}: {
  news: NewsItem[]
  name: string
  symbol?: string
  limit?: number
  /** Rendu de remplacement quand aucun article ne mentionne l'actif. */
  fallback?: React.ReactNode
}) {
  const t = await getPhrase()

  // La règle de sélection vit dans `lib/mentions.ts` — le rail chronologique de la
  // même fiche l'applique aussi, et deux listes censées être identiques ne peuvent pas
  // se permettre deux implémentations.
  const matched = mentioning(news, { name, ...(symbol ? { symbol } : {}) }).slice(0, limit)

  /*
    AUCUNE MENTION : le panneau ne se rend pas, et l'appelant décide de la suite.

    Il disparaissait purement et simplement, ce qui est le bon comportement DANS un
    rail — un encadré « aucun article » y suggérerait qu'il ne se passe rien, alors
    qu'il dit seulement que nos vingt-neuf sources n'ont pas écrit ce nom récemment.

    Mais ce composant remplit désormais un ONGLET entier. Y renvoyer `null` laisse une
    colonne de mille pixels parfaitement blanche sous une rangée d'onglets, ce qui se
    lit comme une page cassée et non comme une absence. Le `fallback` permet à
    l'appelant de trancher selon l'endroit — voir `AssetPageView`.
  */
  if (matched.length === 0) return fallback ?? null

  /*
    ── LA PRÉSENTATION EST CELLE DE LA PAGE GLOBALE, ET C'EST TOUT L'INTÉRÊT ─────

    Ce panneau rendait sa propre liste : un titre par ligne, la source, l'ancienneté.
    Correct, mais c'était un SECOND gabarit d'actualité pour le même contenu — sans
    vignette, sans chapeau, sans rubrique, sans tri. Deux façons de lire un article
    selon la page où on l'ouvre, et deux endroits à retoucher à chaque évolution.

    `NewsFeed` est le composant de `/actualites`. Il reçoit ici le sous-ensemble déjà
    filtré sur l'actif : la sélection reste faite en amont — c'est la seule chose que
    ce panneau sait faire et que le fil global ignore — et le RENDU, lui, est
    strictement partagé. Les vignettes, la mise en avant du premier article, les
    filtres de source et de langue et le tri arrivent avec, sans les réécrire.

    `NewsFeed` conserve son propre filtre par actif mentionné. Il ne proposera ici
    qu'une entrée — celle de la fiche — ce qui est cohérent plutôt que redondant : il
    dit au lecteur sur quoi la liste est bornée.
  */
  return (
    <Panel title={t('Articles mentionnant {nom}').replace('{nom}', name)}>
      <p className="mb-3 text-[0.6875rem] leading-relaxed text-ink-muted">
        {t(
          'Sélection par recherche du nom dans le titre et le chapeau, pas par classement éditorial. Un article qui cite {nom} en passant apparaît donc ici.',
        ).replace('{nom}', name)}
      </p>

      <NewsFeed articles={matched} />
    </Panel>
  )
}
