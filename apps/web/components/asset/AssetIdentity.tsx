import type { AssetClass, AssetDetail } from '@zenkuu/data'
import { findUniverseEntryBySymbol } from '@zenkuu/data'
import { getPhrase } from '@/lib/content'

/**
 * Carte d'identité d'un actif boursier — secteur, pays, place, devise.
 *
 * ── POURQUOI ELLE EXISTE ──────────────────────────────────────────────────────
 *
 * La fiche d'une crypto se termine par une description et une fiche technique :
 * contrats, chaînes, explorateurs, liens officiels. Une action n'a rien de tout cela
 * chez Yahoo, et le bas de sa fiche restait donc vide — au moment précis où le
 * lecteur se demande « qu'est-ce que cette entreprise, au juste ? ».
 *
 * Ces quatre champs y répondent, et ils ne coûtent AUCUN appel réseau : ils sont
 * inscrits dans l'univers des symboles suivis, aux côtés de la liste elle-même.
 *
 * ── CE QU'ELLE N'AFFICHE PAS ──────────────────────────────────────────────────
 *
 * Ni capitalisation, ni PER, ni dividende : Yahoo ne les publie pas dans la réponse
 * que nous consommons. Les estimer serait de la donnée inventée (§5). Ils
 * apparaîtront le jour où une source de fondamentaux sera branchée, et ce bloc est
 * dimensionné pour les accueillir sans changer de forme.
 *
 * Le composant disparaît ENTIÈREMENT si l'actif n'est pas dans la table — ce qui est
 * le cas de toutes les cryptomonnaies, qui ont déjà leur propre fiche technique. Un
 * bloc de quatre tirets serait pire que rien : il ferait passer une absence de donnée
 * pour une donnée vide.
 */
export async function AssetIdentity({
  asset,
  assetClass,
}: {
  asset: AssetDetail
  assetClass: AssetClass
}) {
  const t = await getPhrase()
  const entry = findUniverseEntryBySymbol(asset.symbol)
  if (!entry) return null

  /*
   * NI PLACE DE COTATION, NI DEVISE — le rail de métriques les affiche déjà, depuis
   * la RÉPONSE DE LA SOURCE.
   *
   * Les inscrire ici aussi créerait deux sources de vérité pour un même fait, et le
   * défaut n'est pas théorique : vérifié dans le navigateur sur la fiche Apple, le
   * rail annonçait « NasdaqGS » quand cette table disait « NASDAQ ». Un lecteur ne
   * peut pas trancher entre les deux, et rien n'indique laquelle fait autorité.
   *
   * La source l'emporte : elle est plus précise, et elle se corrige d'elle-même le
   * jour où une valeur change de place — ce qu'une table écrite à la main ne fait
   * pas. Le champ `exchange` reste dans l'univers des symboles, où il sert au
   * bandeau des pages de classement, mais il ne s'affiche pas ici.
   *
   * Ne subsistent donc que secteur et pays : les deux seuls faits qu'aucune de nos
   * sources ne publie.
   */
  const rows = [
    { label: t('Secteur'), value: entry.sector },
    { label: t('Pays du siège'), value: entry.country },
  ].filter((row): row is { label: string; value: string } => Boolean(row.value))

  if (rows.length === 0) return null

  return (
    <section className="space-y-3">
      <h2 className="display-sm text-ink">{titleFor(assetClass)}</h2>

      {/* `<dl>` et non un tableau : ce sont des paires libellé/valeur, et c'est ce
          qui permet à un lecteur d'écran d'annoncer « Secteur : Technologie » plutôt
          que deux fragments sans lien. */}
      <dl className="grid grid-cols-1 gap-px border border-border-subtle bg-border-subtle sm:grid-cols-2">
        {rows.map((row) => (
          <div key={row.label} className="bg-surface px-4 py-2.5">
            <dt className="text-[0.6875rem] text-ink-muted">{row.label}</dt>
            <dd className="mt-0.5 text-sm font-medium text-ink">{row.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

/**
 * Le titre nomme la NATURE de l'objet décrit.
 *
 * « Identité de l'entreprise » sur un ETF serait faux — un fonds n'est pas une
 * entreprise — et « Identité » tout court n'apprendrait rien.
 */
function titleFor(assetClass: AssetClass): string {
  switch (assetClass) {
    case 'stock':
      return "Identité de l'entreprise"
    case 'etf':
      return 'Caractéristiques du fonds'
    case 'index':
      return "Caractéristiques de l'indice"
    case 'commodity':
      return 'Caractéristiques du contrat'
    default:
      return 'Caractéristiques'
  }
}
