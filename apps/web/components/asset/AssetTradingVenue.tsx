import { Clock, Globe, Landmark } from 'lucide-react'

import type { AssetClass, AssetDetail } from '@zenkuu/data'
import { findUniverseEntryBySymbol } from '@zenkuu/data'

import { Panel } from '@/components/ui/Panel'

/**
 * OÙ SE NÉGOCIE UNE VALEUR BOURSIÈRE — la place, la devise, la séance.
 *
 * ── LE VIDE QU'ELLE REMPLACE, ET POURQUOI IL ÉTAIT TROMPEUR ───────────────────
 *
 * L'onglet « Places » d'une cryptomonnaie liste des dizaines de plateformes avec leur
 * volume et leur écart. Celui d'une action affichait « Aucune place de cotation
 * publiée par la source ». C'était exact au mot près, et faux dans ce que le lecteur
 * en comprenait : une action N'A PAS de places multiples, elle a UNE place, connue et
 * réglementée. Le message décrivait une absence de données là où il y avait une
 * différence de nature entre deux marchés.
 *
 * ── LA SÉANCE EST LE VRAI SUJET ───────────────────────────────────────────────
 *
 * Une bourse ferme. Le cours d'une action un dimanche a dix-huit heures, et ce n'est
 * pas une donnée périmée : c'est le dernier cours coté. Sans horaires affichés, rien
 * ne permet au lecteur de faire la différence — et il n'y a pas de question plus
 * fréquente sur une fiche boursière que « pourquoi ça ne bouge pas ».
 *
 * Le marché crypto n'a pas ce problème, et c'est justement pourquoi ce bloc n'existe
 * que là où il apprend quelque chose.
 *
 * ── LES HEURES SONT CELLES DE LA PLACE, PAS CELLES DU LECTEUR ─────────────────
 *
 * Une séance affichée dans le fuseau du visiteur serait plus « pratique » et
 * beaucoup moins juste : « le CAC 40 ouvre à 3 h du matin » est vrai pour qui lit
 * depuis New York et n'apprend rien sur la Bourse de Paris. Le fuseau est donc nommé
 * à côté des heures, et les heures sont locales À LA PLACE.
 */

/** Ce que la classe d'actif appelle son lieu de cotation. */
const HEADINGS: Partial<Record<AssetClass, string>> = {
  stock: 'Où se négocie cette action',
  etf: 'Où se négocie ce fonds',
  index: 'Comment cet indice est calculé',
  commodity: 'Où se négocie ce contrat',
}

const NOTES: Partial<Record<AssetClass, string>> = {
  stock:
    'Une action se négocie sur sa place de cotation principale, aux heures de séance. Elle peut aussi s’échanger sur des plateformes alternatives et de gré à gré, dont notre source ne publie pas le détail.',
  etf: 'Un fonds indiciel coté s’échange comme une action, sur la place où il est admis. Sa valeur liquidative, elle, est calculée une fois par jour à la clôture et peut s’écarter légèrement du cours.',
  index:
    'Un indice ne se négocie pas : il est CALCULÉ à partir des cours de ses composantes, en continu pendant la séance de la place de référence. Ce qui s’achète, ce sont des fonds et des dérivés qui le suivent.',
  commodity:
    'Le cours affiché est celui du contrat à terme le plus proche de son échéance, celui qui concentre les échanges. Il change de contrat sous-jacent à chaque expiration, ce qui crée de petits sauts sans mouvement de marché réel.',
}

export function AssetTradingVenue({
  asset,
  assetClass,
}: {
  asset: AssetDetail
  assetClass: AssetClass
}) {
  const heading = HEADINGS[assetClass]
  if (!heading) return null

  const entry = findUniverseEntryBySymbol(asset.symbol)
  const venue = asset.exchange ?? entry?.exchange
  const session = asset.session

  const hours = session ? formatSession(session) : null

  return (
    <Panel title={heading}>
      <dl className="grid grid-cols-1 gap-px bg-border-subtle sm:grid-cols-3">
        <Cell
          icon={<Landmark className="h-3.5 w-3.5" aria-hidden="true" />}
          label={assetClass === 'index' ? 'Place de référence' : 'Place de cotation'}
          value={venue ?? 'Non publiée'}
        />
        <Cell
          icon={<Globe className="h-3.5 w-3.5" aria-hidden="true" />}
          label="Devise de cotation"
          value={asset.currency.toUpperCase()}
        />
        <Cell
          icon={<Clock className="h-3.5 w-3.5" aria-hidden="true" />}
          label="Séance"
          value={hours ?? 'Non publiée'}
          {...(session ? { hint: readableZone(session.timezone) } : {})}
        />
      </dl>

      <p className="mt-3 max-w-3xl text-xs leading-relaxed text-ink-muted">
        {NOTES[assetClass]}
      </p>
    </Panel>
  )
}

function Cell({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode
  label: string
  value: string
  hint?: string
}) {
  return (
    <div className="bg-surface px-4 py-3">
      <dt className="flex items-center gap-1.5 text-[0.6875rem] text-ink-muted">
        <span className="shrink-0">{icon}</span>
        {label}
      </dt>
      <dd className="mt-1 text-sm font-medium text-ink">{value}</dd>
      {hint ? <p className="text-micro text-ink-muted opacity-80">{hint}</p> : null}
    </div>
  )
}

/**
 * « 09:00 – 17:30 », dans le fuseau de la PLACE.
 *
 * `timeZone` est passé explicitement à `Intl` : sans lui, le formateur emploierait
 * celui du serveur qui rend la page, ce qui donnerait des horaires différents selon
 * la région d'hébergement — et faux dans tous les cas sauf un.
 */
function formatSession(session: NonNullable<AssetDetail['session']>): string | null {
  if (!session.opensAt || !session.closesAt) return null

  try {
    const format = new Intl.DateTimeFormat('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: session.timezone,
    })
    return `${format.format(new Date(session.opensAt))} – ${format.format(new Date(session.closesAt))}`
  } catch {
    // Fuseau inconnu du moteur : on préfère taire l'horaire plutôt que d'en afficher
    // un rapporté au mauvais méridien.
    return null
  }
}

/** « America/New_York » → « heure de New York ». */
function readableZone(timezone: string): string {
  const city = timezone.split('/').pop()?.replace(/_/g, ' ')
  return city ? `heure de ${city}` : timezone
}
