import { getRanking, type AssetClass } from '@zenkuu/data'

import { ClassBoard, type ClassBoardEntry } from '@/components/home/ClassBoard'
import { TrendingBoard } from '@/components/home/TrendingBoard'
import { marketHref } from '@/lib/asset-routes'
import { getContent } from '@/lib/content'

/**
 * L'ORDRE DES PASTILLES EST ÉCRIT ICI, ET IL N'EST PAS CELUI DU DOMAINE.
 *
 * `ASSET_CLASSES` range les sept classes dans l'ordre où les fournisseurs ont été
 * ajoutés au registre — un ordre d'implémentation, qui n'a aucune raison d'être celui
 * que lit un visiteur. Celui-ci va du plus consulté au moins consulté, ce qui met la
 * crypto en tête (elle ouvre la page) et les NFT en queue (aucune source ne les
 * alimente aujourd'hui, voir `registry.ts`).
 */
const ORDER: readonly AssetClass[] = [
  'crypto',
  'stock',
  'etf',
  'index',
  'forex',
  'commodity',
  'nft',
]

/**
 * Lignes par classe.
 *
 * Quinze et non cinquante : ces sept classements voyagent ENSEMBLE dans le paquet de
 * la page, puisque changer de pastille ne déclenche aucune requête (voir l'en-tête de
 * `ClassBoard`). À cinquante lignes chacun, l'accueil transporterait trois cent
 * cinquante actifs pour n'en montrer que quinze. « Tout voir » mène au classement
 * complet, qui est fait pour ça.
 */
const PER_CLASS = 15

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * LE BLOC LOURD DE L'ACCUEIL — SEPT CLASSEMENTS, DEUX LECTURES
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Rendu sous `<Suspense>` par `page.tsx` : la date, les trois cartes de tête et les
 * actualités s'affichent sans l'attendre. C'est le même découpage que la page portait
 * déjà, appliqué à un contenu différent.
 *
 * ── SEPT APPELS, ET POURQUOI CE N'EST PAS SEPT FOIS LE PRIX ─────────────────
 *
 * Ils partent EN PARALLÈLE et touchent trois fournisseurs distincts — CoinGecko pour
 * la crypto, Yahoo pour les quatre classes boursières, la BCE pour les devises. Le
 * temps de la grappe est donc celui du plus lent, pas la somme. Chacun est mis en
 * cache pour la même durée que la page (`CACHE_TTL_SECONDS`), et la classe NFT ne
 * coûte rien du tout : sans fournisseur déclaré, `getRanking` rend son état vide sans
 * sortir du processus.
 *
 * ── UNE SEULE SOURCE POUR DEUX BLOCS ────────────────────────────────────────
 *
 * Le tableau et les cartes « en tendance » lisent les MÊMES listes. Demander des
 * tendances à part aurait doublé le coût de la page pour dire la même chose sous un
 * autre tri — voir `topMovers` dans `TrendingBoard`.
 */
export async function ClassSection() {
  const fr = await getContent()

  const results = await Promise.all(
    ORDER.map((assetClass) =>
      getRanking({ assetClass, page: 1, perPage: PER_CLASS, currency: 'eur' }),
    ),
  )

  const boards: ClassBoardEntry[] = ORDER.map((assetClass, index) => {
    const result = results[index]
    return {
      assetClass,
      label: fr.assetClass[assetClass],
      href: marketHref(assetClass),
      assets: result?.ok ? result.data : [],
      /* `reason` porte la phrase du fournisseur, jamais une phrase inventée : c'est
         elle qui distingue « aucune source configurée » d'« la source n'a pas
         répondu », et le lecteur n'a pas à deviner laquelle des deux il lit (§5). */
      reason: result && !result.ok ? result.reason : null,
    }
  })

  return (
    <>
      <ClassBoard boards={boards} />
      <TrendingBoard
        classes={boards.map(({ assetClass, label, href, assets }) => ({
          assetClass,
          label,
          href,
          assets,
        }))}
      />
    </>
  )
}
