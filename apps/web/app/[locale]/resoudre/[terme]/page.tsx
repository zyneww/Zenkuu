import { getPhrase } from '@/lib/content'
import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'

import { searchAssets } from '@zenkuu/data'
import { EmptyState } from '@zenkuu/ui'

import { assetHref } from '@/lib/asset-routes'
import { AssetLogo } from '@/components/asset/AssetLogo'
import { Link } from '@/i18n/navigation'

/**
 * RÉSOLVEUR — d'un nom d'actif vers sa fiche, quand l'identifiant ne correspond pas.
 *
 * ── LE PROBLÈME QU'IL RÈGLE ──────────────────────────────────────────────────
 *
 * Les cotations récentes viennent de Coinpaprika (`apr-apriori`), les fiches de
 * CoinGecko (`apriori`). `lib/listing-match.ts` rapproche les deux quand l'actif
 * figure dans nos 250 premières capitalisations — soit une ligne sur deux. Les autres
 * restaient inertes, et c'est précisément le cas le plus fréquent sur une page dont
 * le sujet EST le nouvel arrivant : un actif coté il y a trois jours n'est presque
 * jamais dans les 250 premiers.
 *
 * Cette route résout à la demande : elle cherche, prend le premier cryptoactif trouvé,
 * et redirige. Un appel de recherche par CLIC, mis en cache, au lieu de trois cents
 * résolutions à chaque rendu de page.
 *
 * ── POURQUOI UNE PAGE ET NON UNE ROUTE D'API ─────────────────────────────────
 *
 * `redirect()` d'une page produit une vraie navigation : l'adresse finale s'affiche
 * dans la barre, le bouton « précédent » revient à la liste, et le lien se partage.
 * Une route d'API obligerait le composant à devenir client, à attendre la réponse et
 * à pousser lui-même l'historique — trois mécanismes pour ce que le serveur fait en
 * une ligne.
 *
 * ── LA REDIRECTION EST TEMPORAIRE, ET C'EST VOULU ────────────────────────────
 *
 * `redirect()` émet un 307 par défaut. C'est le bon code ici : la correspondance
 * dépend de ce que la recherche trouve aujourd'hui, pas d'une équivalence permanente
 * entre deux identifiants. Un 308 ferait mémoriser au navigateur — et aux moteurs —
 * une association qui peut changer.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * L'ÉCHEC NE REND PLUS UNE 404 MUETTE, ET VOICI CE QUI L'A DÉCIDÉ
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Un vérificateur de liens interne a relevé sept adresses de cette route rendant 404
 * depuis `/nouvelles-cotations`, toutes du même genre :
 *
 *     /resoudre/SpaceX Tokenized Stock (Ondo)
 *     /resoudre/Marvell Tokenized Stock (Reality)
 *     /resoudre/Invesco QQQ Tokenized Stock (Reality)
 *
 * Ce sont des actions tokenisées, dont Coinpaprika publie le nom complet — émetteur
 * entre parenthèses compris — et que l'index de CoinGecko ne connaît pas sous cette
 * forme. Le lecteur cliquait une ligne et tombait sur « Page introuvable, retour à
 * l'accueil » : il perdait la liste qu'il consultait et n'apprenait rien.
 *
 * ── CE QUI A ÉTÉ ESSAYÉ, MESURÉ, ET REFUSÉ ──────────────────────────────────
 *
 * Réessayer avec une requête raccourcie. Mesuré chez la source :
 *
 *     « SpaceX Tokenized Stock (Ondo) »  → aucun résultat
 *     « SpaceX Tokenized Stock »         → aucun résultat
 *     « SpaceX »                         → SpaceX (bStocks Tokenized Stock),
 *                                          SpaceX xStock,
 *                                          SpaceX (Republic Pre-IPO)
 *
 * Trois jetons, TROIS ÉMETTEURS DIFFÉRENTS, et aucun n'est celui d'Ondo qu'on a
 * cliqué. Rediriger sur le premier aurait remplacé une 404 visible par une fiche
 * plausible et fausse — précisément l'erreur silencieuse que cette route refuse déjà
 * pour les homonymes boursiers, et le §5 en toutes lettres.
 *
 * ── CE QUI EST FAIT À LA PLACE : PROPOSER, PAS DEVINER ──────────────────────
 *
 * La recherche raccourcie a lieu, mais son résultat est PRÉSENTÉ, jamais suivi. Le
 * lecteur voit les candidats, voit qu'ils sont approchants, et choisit — ou repart
 * vers la liste. C'est la seule issue qui ne mente pas : nous ne savons pas lequel
 * est le bon, et lui le sait.
 *
 * ── POURQUOI UN 200 ET NON UN 404 ───────────────────────────────────────────
 *
 * Cette page-ci EXISTE : elle rend un contenu utile sur un terme donné. `robots:
 * noindex` la garde hors des index, ce qui règle la seule chose que le 404 apportait.
 * Le 404 reste pour le terme MALFORMÉ, qui ne décrit rien du tout.
 */

/** Deux caractères : sous ce seuil, `searchAssets` ne part même pas en réseau. */
const MIN_TERM_LENGTH = 2

/**
 * Mots d'habillage d'un nom d'action tokenisée.
 *
 * Ils décrivent le VÉHICULE, pas le sujet — exactement comme les mots de structure
 * d'un nom de fonds dans `lib/mentions.ts`, et retirés pour la même raison : aucune
 * source ne les emploie pour désigner l'actif.
 */
const WRAPPER_WORDS = /\b(tokenized|stock|stocks|token|shares?|pre-ipo)\b/gi

/**
 * Requête de repli — le nom débarrassé de son habillage.
 *
 * Rend `null` quand il ne reste rien d'exploitable, ce qui évite de relancer une
 * recherche sur une chaîne vide ou sur le nom inchangé (auquel cas on connaît déjà la
 * réponse : aucun résultat).
 */
function fallbackQuery(term: string): string | null {
  const stripped = term
    .replace(/\([^)]*\)/g, ' ')
    .replace(WRAPPER_WORDS, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (stripped.length < MIN_TERM_LENGTH) return null
  if (stripped.toLowerCase() === term.trim().toLowerCase()) return null
  return stripped
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ terme: string }>
}): Promise<Metadata> {
  const { terme } = await params
  return {
    title: `Résolution de « ${decodeURIComponent(terme)} »`,
    /* Une page de résolution n'a rien à faire dans un index : elle n'existe que le
       temps d'un clic, et son adresse porte un nom d'actif brut de fournisseur. */
    robots: { index: false, follow: false },
  }
}

export default async function Page({ params }: { params: Promise<{ terme: string }> }) {
  const t = await getPhrase()
  const { terme } = await params
  const query = decodeURIComponent(terme).trim()

  // Sous deux caractères, la recherche ne part pas en réseau (voir `MIN_QUERY_LENGTH`)
  // et renverrait de toute façon un résultat vide. Un terme aussi court ne décrit rien :
  // c'est le seul cas qui mérite encore un vrai 404.
  if (query.length < MIN_TERM_LENGTH) notFound()

  const found = await searchAssets(query)

  /*
   * On ne retient que les CRYPTOACTIFS.
   *
   * Cette route n'est appelée que depuis les cotations crypto récentes. Rediriger vers
   * une action homonyme — « Mantle » l'entreprise plutôt que « Mantle » le jeton —
   * serait une erreur silencieuse et parfaitement plausible, donc du même ordre que
   * l'appariement par symbole que `listing-match.ts` refuse.
   */
  const target = found.crypto[0]
  if (target) redirect(assetHref(target.assetClass, target.id))

  /*
   * ── ÉCHEC : ON CHERCHE DES CANDIDATS, ON NE LES SUIT PAS ──────────────────
   *
   * Le repli n'a lieu QUE sur ce chemin — jamais sur celui du succès — donc il ne
   * coûte rien au cas courant. Et son résultat est affiché, pas suivi : voir l'en-tête
   * pour la mesure qui l'a décidé.
   *
   * La panne de la source est distinguée de l'absence de résultat : `cryptoIndisponible`
   * dit « nous n'avons pas pu chercher », ce qui n'est pas « nous n'avons rien trouvé ».
   * Confondre les deux ferait conclure à l'inexistence d'un actif pour un quota atteint.
   */
  const fallback = found.cryptoIndisponible ? null : fallbackQuery(query)
  const candidates = fallback ? (await searchAssets(fallback)).crypto.slice(0, 6) : []

  return (
    <div className="space-y-6 py-10">
      {found.cryptoIndisponible ? (
        <EmptyState
          title={t('Recherche momentanément indisponible')}
          description={`Nous n’avons pas pu interroger la source pour « ${query} ». Ce n’est pas la preuve que cet actif n’a pas de fiche — seulement que la recherche n’a pas répondu. Réessayez dans une minute.`}
          tone="warning"
        />
      ) : (
        <EmptyState
          title={`Aucune fiche ne correspond à « ${query} »`}
          description="Ce nom est celui que publie la source des cotations récentes ; notre source de fiches ne le référence pas sous cette forme. C’est fréquent pour les actions tokenisées, dont le nom porte l’émetteur entre parenthèses."
        />
      )}

      {candidates.length > 0 ? (
        <section className="space-y-3">
          {/*
            « APPROCHANTS » EST LE MOT QUI COMPTE.

            Ces candidats viennent d'une recherche VOLONTAIREMENT élargie : le nom
            complet ne donnait rien, on a cherché sans son habillage. Trois jetons de
            trois émetteurs peuvent en sortir, et rien ne dit lequel correspond à la
            ligne cliquée. Le titre et la note le disent avant la liste, pas après.
          */}
          <h2 className="display-sm text-ink">{t('Actifs approchants')}</h2>
          <p className="max-w-2xl text-sm leading-relaxed text-ink-muted">
            Résultats d’une recherche élargie à «&nbsp;{fallback}&nbsp;». Ils portent un
            nom voisin, ce qui ne veut pas dire qu’ils désignent le même actif — plusieurs
            émetteurs publient des jetons de même nom. À vous de reconnaître le bon.
          </p>

          <ul className="divide-y divide-border-subtle overflow-hidden rounded-card">
            {candidates.map((candidate) => (
              <li key={candidate.id}>
                <Link
                  href={assetHref(candidate.assetClass, candidate.id)}
                  className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-muted"
                >
                  <AssetLogo asset={candidate} size={24} />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">
                    {candidate.name}
                  </span>
                  <span className="tabular shrink-0 text-xs uppercase text-ink-muted">
                    {candidate.symbol}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Le retour à la LISTE et non à l'accueil : c'est de là qu'on vient, et une page
          d'échec qui renvoie à la racine fait perdre le contexte de lecture. */}
      <p className="text-sm text-ink-muted">
        <Link href="/nouvelles-cotations" className="text-ink hover:underline">
          Revenir aux cotations récentes
        </Link>
      </p>
    </div>
  )
}
