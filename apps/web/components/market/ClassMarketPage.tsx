import type { Metadata } from 'next'

import type { AssetClass } from '@zenkuu/data'

import { MarketPageView } from '@/components/market/MarketPageView'
import { marketHref, marketPath } from '@/lib/asset-routes'
import { getContent, getPhrase, getSeo } from '@/lib/content'
import { pageAlternates } from '@/lib/site'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * UNE CLASSE D'ACTIF, UNE PAGE — LE RETOUR DES SIX ROUTES DÉDIÉES
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── CE QUE CE FICHIER RÉTABLIT, ET POURQUOI LE MOTIF INVERSE NE TIENT PLUS ───
 *
 * Les six pages de classe (`/crypto`, `/actions`, `/etf`, `/indices`, `/devises`,
 * `/matieres-premieres`) avaient été supprimées et redirigées vers `/marches?classe=…`
 * — une page unique portant les sept classes en onglets. Le motif était juste à
 * l'époque : deux surfaces pour un même tableau, c'est deux endroits où corriger un
 * défaut de colonne.
 *
 * Il ne tient plus, parce que l'ARBITRE a changé. Le choix de classe ne se fait plus
 * dans une barre d'onglets posée sur une page qu'il faut d'abord atteindre : il se
 * fait dans le menu « Parcourir » de l'en-tête, disponible depuis n'importe quelle
 * page du site. Une entrée de menu a besoin d'une DESTINATION, pas d'un paramètre de
 * requête sur une page tierce — `/actions` se partage, s'indexe et se lit ; `/marches?
 * classe=actions` fait les trois moins bien.
 *
 * Et la duplication redoutée n'existe pas : ces six pages sont SIX APPELS du même
 * composant. Un défaut de colonne se corrige toujours à un seul endroit.
 *
 * ── LA BARRE D'ONGLETS RESTE, ET N'EST PLUS LE SEUL CHEMIN ──────────────────
 *
 * `MarketPageView` pose `AssetClassTabs` par défaut, qui renvoie vers ces mêmes six
 * pages. Passer d'une classe à l'autre sans revenir au menu reste donc possible ;
 * c'est le menu qui devient le chemin d'ENTRÉE, la barre celui du parcours latéral.
 */

/**
 * Sous-titre de la page, par classe.
 *
 * Écrit ici plutôt que dans `content/fr.ts` : ces six phrases n'existent que pour
 * cette page et n'ont aucun autre appelant. Les faire transiter par le dictionnaire
 * partagé ajouterait six clés à treize langues pour un texte que `t()` traduit de
 * toute façon au rendu.
 */
const SUBTITLE: Record<AssetClass, string> = {
  crypto:
    'Les cryptomonnaies classées par capitalisation, triables et paginées. ' +
    'Lecture seule : aucun ordre ne part d’ici.',
  stock:
    'Les actions suivies par Zenkuu, leur cours et leur variation. ' +
    'Lecture seule : aucun ordre ne part d’ici.',
  etf:
    'Les fonds indiciels cotés suivis par Zenkuu, leur cours et leur variation. ' +
    'Lecture seule : aucun ordre ne part d’ici.',
  index:
    'Les grands indices boursiers et leur variation, dans la même grille que le reste ' +
    'du site.',
  forex:
    'Les paires de devises majeures et leur variation. Les taux affichés sont ' +
    'indicatifs et ne valent pas cotation.',
  commodity:
    'Les matières premières cotées — énergie, métaux, agricoles — et leur variation.',
  nft: 'Aucune source n’alimente encore cette classe.',
}

export function classMetadata(assetClass: AssetClass): () => Promise<Metadata> {
  return async () => {
    const fr = await getContent()
    const seo = await getSeo()
    /* Le chemin INTERNE sert deux choses distinctes : il indexe la table des
       descriptions de référencement, qui est clée par route française, et il désigne
       la route dont `pageAlternates` tirera l'adresse publique de chaque langue. */
    const route = marketHref(assetClass)
    const path = marketPath(assetClass)
    return {
      title: fr.assetClass[assetClass],
      description: seo(path, SUBTITLE[assetClass]),
      alternates: await pageAlternates(route),
    }
  }
}

export async function ClassMarketPage({
  assetClass,
  searchParams,
}: {
  assetClass: AssetClass
  searchParams: Record<string, string | string[] | undefined>
}) {
  const fr = await getContent()
  const t = await getPhrase()

  return (
    <MarketPageView
      assetClass={assetClass}
      title={fr.assetClass[assetClass]}
      subtitle={t(SUBTITLE[assetClass])}
      searchParams={searchParams}
      /* La mise en page relevée sur `cryptorank.io/all-coins-list` — chiffres globaux,
         grille de catalogue, fourchettes, FAQ. Portée ICI et non dans `MarketPageView`
         parce que ces six routes sont les seules concernées : `/classements` et
         `/derives` passent par le même composant et gardent la page ordinaire. */
      catalogue
    />
  )
}
