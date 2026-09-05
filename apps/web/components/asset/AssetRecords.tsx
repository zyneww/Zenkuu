import type { AssetDetail } from '@zenkuu/data'

import { Money } from '@/components/locale/Money'
import { getPhrase } from '@/lib/content'
import { getFormatters } from '@/lib/formatters'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * RECORDS DE COURS — LE BLOC « PRICE HISTORY » DE dropstab.com
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Deux extrêmes, leurs dates, et la distance qui sépare le cours d'aujourd'hui de
 * chacun d'eux.
 *
 * ── LE MULTIPLE ET LE POURCENTAGE DISENT LA MÊME CHOSE, ET C'EST VOULU ──────
 *
 * La référence n'affiche QUE le multiple (« 2.85x to ATH »). Il est bon pour la
 * distance au plus haut, où l'on pense en « combien de fois » ; il devient illisible
 * pour la distance au plus bas, où la référence sort « 206.05x » — un nombre qu'on ne
 * se représente pas.
 *
 * Les deux figurent donc, mais ils ne viennent pas du même endroit et ce n'est pas un
 * détail : le POURCENTAGE est publié par la source (`athChangePercent`), le MULTIPLE
 * est calculé ici (`record ÷ cours`). Quand la source ne publie pas son écart, la
 * ligne perd son pourcentage et garde son multiple ; l'inverse n'arrive pas.
 *
 * ⚠️ IL N'Y A PAS DE « DATE DE PREMIÈRE COTATION », alors que la référence en pose
 * une. La source de la fiche n'en publie pas : son `genesis_date` est la date de
 * création du PROTOCOLE, pas celle du premier échange — `providers/coinpaprika.ts`
 * documente déjà l'écart, et c'est lui qui a fait introduire une seconde source pour
 * la page des nouvelles cotations. La reprendre ici afficherait « 2009 » sur une
 * fiche Bitcoin sous un intitulé qui promet autre chose, ou coûterait un appel de plus
 * par fiche pour un seul champ.
 *
 * ── L'INTITULÉ SUIT LA CLASSE D'ACTIF ────────────────────────────────────────
 *
 * `ath` porte le record ABSOLU pour une cryptomonnaie et le plus haut à CINQUANTE-DEUX
 * SEMAINES pour une valeur boursière — Yahoo ne publie pas d'historique complet. Le
 * même champ recouvre donc deux mesures, et les annoncer sous le même mot ferait lire
 * un record de toujours là où il n'y a qu'une année.
 */
export async function AssetRecords({
  asset,
  assetClass,
}: {
  asset: AssetDetail
  assetClass: string
}) {
  const t = await getPhrase()
  const nombres = await getFormatters()

  const absolus = assetClass === 'crypto'

  const records = [
    {
      cle: 'haut',
      titre: absolus ? t('Plus haut historique') : t('Plus haut sur 52 semaines'),
      valeur: asset.ath,
      date: asset.athDate,
      ecart: asset.athChangePercent,
      /* Combien il faudrait multiplier le cours pour retrouver le record. Au-dessus
         de 1 tant que le record n'est pas battu ; exactement 1 le jour où il l'est. */
      multiple: multipleVers(asset.ath, asset.price),
      legende: t('depuis le cours actuel'),
    },
    {
      cle: 'bas',
      titre: absolus ? t('Plus bas historique') : t('Plus bas sur 52 semaines'),
      valeur: asset.atl,
      date: asset.atlDate,
      ecart: asset.atlChangePercent,
      multiple: multipleVers(asset.price, asset.atl),
      legende: t('gagnés depuis ce point'),
    },
  ].filter((record) => record.valeur !== undefined)

  if (records.length === 0) return null

  return (
    <section aria-labelledby="records-titre" className="space-y-3">
      <h2 id="records-titre" className="display-sm text-ink">
        {t('Records de cours')}
      </h2>

      <dl className="grid gap-3 sm:grid-cols-2">
        {records.map((record) => (
          <div
            key={record.cle}
            className="rounded-card border border-border-subtle bg-surface p-4"
          >
            <dt className="text-xs font-medium text-ink-muted">{record.titre}</dt>

            <dd className="mt-1 space-y-1">
              {/* `Money` et non le formateur serveur : la devise d'affichage est une
                  préférence locale, et un montant écrit ici en euro voisinerait un rail
                  et un en-tête écrits en dollar. Voir la note de `AssetVsPeers`. */}
              <p className="tabular text-lg font-semibold leading-tight text-ink">
                <Money value={record.valeur} from={asset.currency} />
              </p>

              {record.date ? (
                <p className="tabular text-micro text-ink-muted">
                  {nombres.dateTime(record.date)}
                </p>
              ) : null}

              {/* Les deux mesures sur une ligne, séparées par un point médian : elles
                  répondent à la même question et se lisent d'un seul regard. */}
              <p className="tabular text-xs text-ink-muted">
                {record.multiple !== undefined ? (
                  <span className="font-medium text-ink">
                    {`×${nombres.fixed(record.multiple, 2) ?? '—'}`}
                  </span>
                ) : null}
                {record.multiple !== undefined ? ` ${record.legende}` : null}
                {record.multiple !== undefined && record.ecart !== undefined ? ' · ' : null}
                {record.ecart !== undefined
                  ? `${nombres.fixed(record.ecart, 1) ?? '—'} %`
                  : null}
              </p>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

/**
 * `numerateur ÷ denominateur`, ou `undefined` si le rapport n'a pas de sens.
 *
 * Un cours nul ou absent ne donne pas « l'infini » : il donne rien du tout, et une
 * carte qui affiche « ×Infinity » est un défaut plus voyant que la case vide qu'elle
 * remplace.
 */
function multipleVers(
  numerateur: number | undefined,
  denominateur: number | undefined,
): number | undefined {
  if (numerateur === undefined || denominateur === undefined) return undefined
  if (!Number.isFinite(numerateur) || !Number.isFinite(denominateur) || denominateur === 0) {
    return undefined
  }
  return numerateur / denominateur
}
