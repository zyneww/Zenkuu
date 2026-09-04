import { ExternalLink } from 'lucide-react'

import type { AssetClass, AssetDetail, AssetProfile } from '@zenkuu/data'
import { findUniverseEntryBySymbol } from '@zenkuu/data'

import { RailSection } from '@/components/ui/RailSection'
import { getPhrase } from '@/lib/content'
import { getFormatters } from '@/lib/formatters'

/**
 * FICHE TECHNIQUE D'UNE VALEUR BOURSIÈRE — l'équivalent de celle d'une cryptomonnaie.
 *
 * ── LE TROU QU'ELLE COMBLE, MESURÉ ────────────────────────────────────────────
 *
 * Relevé sur les pages réellement servies : la fiche du bitcoin porte 19 200
 * caractères de texte, celle d'Apple 8 200, celle du CAC 40 7 500. L'écart ne vient
 * pas d'un choix éditorial mais d'un manque de composants — la crypto a une « Fiche
 * technique » (contrats, chaînes, explorateurs, liens officiels), les autres classes
 * n'avaient rien à cet endroit du rail.
 *
 * Ce qui manquait le plus n'était même pas un chiffre : c'était le LIEN VERS LE SITE
 * OFFICIEL. Il était lu chez la source puis jeté par un défaut d'affectation dans
 * l'adaptateur (voir le champ `website` de `AssetProfile`), si bien qu'une fiche
 * d'action n'avait aucun lien sortant.
 *
 * ── CE QU'ELLE MONTRE, ET DANS QUEL ORDRE ─────────────────────────────────────
 *
 * De l'instrument vers l'émetteur : d'abord ce qui décrit LA LIGNE DE COTATION —
 * place, devise, type —, ensuite ce qui décrit CE QU'ELLE REPRÉSENTE — secteur,
 * industrie, siège, effectif, émetteur du fonds. C'est l'ordre dans lequel les
 * questions se posent quand on arrive d'un classement.
 *
 * ── DEUX SOURCES, ET LA PLUS PRÉCISE L'EMPORTE ────────────────────────────────
 *
 * La place de cotation existe à deux endroits : dans la réponse de la source
 * (« NasdaqGS ») et dans notre table de symboles (« NASDAQ »). C'est le même conflit
 * que celui déjà tranché dans `AssetIdentity`, et il se tranche pareil — la source
 * gagne, parce qu'elle est plus fine et qu'elle se corrige d'elle-même le jour où une
 * valeur change de place.
 *
 * ── AUCUN APPEL RÉSEAU ────────────────────────────────────────────────────────
 *
 * Tout vient du profil déjà chargé pour le rail de ratios, et de la table de symboles
 * qui vit dans le code. Ce bloc ne coûte rien de plus qu'un rendu.
 */

/** Ce que le libellé de classe annonce en tête de bloc. */
const TITLES: Partial<Record<AssetClass, string>> = {
  stock: 'Fiche technique',
  etf: 'Fiche technique',
  index: 'Fiche technique',
  commodity: 'Fiche technique',
}

/**
 * Nature de l'instrument, en français.
 *
 * La source publie un code (`EQUITY`, `ETF`, `INDEX`, `FUTURE`). L'afficher tel quel
 * donnerait une ligne en anglais et en capitales au milieu d'un rail francophone ;
 * l'omettre priverait le lecteur de la seule ligne qui dise ce qu'il regarde.
 */
const KINDS: Partial<Record<AssetClass, string>> = {
  stock: 'Action',
  etf: 'Fonds indiciel coté',
  index: 'Indice boursier',
  commodity: 'Contrat à terme',
  forex: 'Paire de devises',
}

export async function AssetMarketSheet({
  asset,
  assetClass,
  profile,
}: {
  asset: AssetDetail
  assetClass: AssetClass
  /** Profil de la source. `null` quand elle n'en publie pas — le bloc se réduit alors. */
  profile: AssetProfile | null
}) {
  const nombres = await getFormatters()

  const t = await getPhrase()
  /* Réservé aux classes boursières : une cryptomonnaie a déjà sa propre fiche
     technique, autrement plus riche (contrats, chaînes, explorateurs). */
  const title = TITLES[assetClass]
  if (!title) return null

  const entry = findUniverseEntryBySymbol(asset.symbol)

  const rows: { label: string; value: string; hint?: string }[] = []

  const kind = KINDS[assetClass]
  if (kind) rows.push({ label: t('Nature'), value: t(kind) })

  /* La source d'abord, notre table ensuite — voir l'en-tête sur le conflit des deux. */
  const venue = profile?.exchangeName ?? asset.exchange ?? entry?.exchange
  if (venue) rows.push({ label: t('Place de cotation'), value: venue })

  rows.push({ label: t('Devise de cotation'), value: asset.currency.toUpperCase() })

  if (asset.symbol) rows.push({ label: t('Code'), value: asset.symbol.toUpperCase() })

  const sector = profile?.sector ?? entry?.sector
  if (sector) rows.push({ label: t('Secteur'), value: sector })

  if (profile?.industry) rows.push({ label: t('Industrie'), value: profile.industry })

  /* Ville et pays réunis sur une ligne : deux lignes pour « Cupertino » et
     « États-Unis » dans une colonne de 288 pixels, c'est une ligne de trop pour ce
     que l'information vaut. */
  const place = [profile?.city, profile?.country ?? entry?.country]
    .filter((part): part is string => Boolean(part))
    .join(', ')
  if (place) rows.push({ label: t('Siège'), value: place })

  if (profile?.employees !== undefined) {
    rows.push({
      label: t('Effectif'),
      value: nombres.compact(profile.employees) ?? String(profile.employees),
      hint: t('salariés à temps plein déclarés'),
    })
  }

  if (profile?.family) rows.push({ label: t('Émetteur'), value: profile.family })
  if (profile?.category) rows.push({ label: t('Catégorie'), value: profile.category })

  const website = profile?.website ?? (entry?.domain ? `https://${entry.domain}` : undefined)

  if (rows.length === 0 && !website) return null

  return (
    <RailSection title={t(title)}>
      <dl>
        {rows.map((row) => (
          <div key={row.label} className="border-b border-border-subtle py-1.5 last:border-0">
            <div className="flex items-baseline justify-between gap-2">
              <dt className="shrink-0 text-xs text-ink-muted">{row.label}</dt>
              {/* La valeur peut être longue — « Consumer Electronics », « SPDR State
                  Street Global Advisors ». Elle passe donc à la ligne au lieu d'être
                  tronquée : dans un rail, une valeur coupée à mi-mot n'apprend rien,
                  et il n'y a pas de survol pour la révéler. */}
              <dd className="min-w-0 flex-1 text-right text-xs font-medium text-ink">
                {row.value}
              </dd>
            </div>
            {row.hint ? (
              <p className="text-micro leading-snug text-ink-muted opacity-80">{row.hint}</p>
            ) : null}
          </div>
        ))}
      </dl>

      {website ? (
        <a
          href={website}
          target="_blank"
          rel="nofollow noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1.5 rounded-card border border-border-subtle px-2.5 py-1.5 text-xs text-ink transition-colors hover:border-brand hover:text-brand"
        >
          {t('Site officiel')}
          <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
          <span className="sr-only">{t('(nouvelle fenêtre)')}</span>
        </a>
      ) : null}
    </RailSection>
  )
}
