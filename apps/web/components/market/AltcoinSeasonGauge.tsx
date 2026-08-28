import { Link } from '@/i18n/navigation'
import { weave } from '@/components/locale/emphasise'
import { getPhrase } from '@/lib/content'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * SAISON DES ALTCOINS — UNE PROPORTION, POSÉE SUR UNE RÉGLETTE
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── CE QUE L'INDICE MESURE, EXACTEMENT ──────────────────────────────────────
 *
 * La part des cent premières capitalisations qui a FAIT MIEUX QUE BITCOIN sur la
 * fenêtre. C'est tout : ni une prévision, ni un signal, ni un indice propriétaire —
 * un comptage, que n'importe qui peut refaire à partir du classement.
 *
 * ⚠️ LA FENÊTRE EST DE TRENTE JOURS, LÀ OÙ LA RÉFÉRENCE EN UTILISE QUATRE-VINGT-DIX,
 * et il faut le savoir en lisant le chiffre. Nos sources publient les variations à
 * 1 h, 24 h, 7 j, 14 j, 30 j et 1 an — pas 90 jours. Trois options existaient :
 *
 *   · recomposer 90 jours à partir de 90 séries quotidiennes, soit une centaine
 *     d'appels sur une source plafonnée à quelques-uns par minute ;
 *   · rebaptiser la variation à 1 an « 90 jours », ce qui serait un mensonge ;
 *   · annoncer la fenêtre réellement utilisée.
 *
 * La troisième est retenue, et la fenêtre est écrite partout où le chiffre apparaît.
 * Un indice sur trente jours réagit plus vite que le même sur quatre-vingt-dix : il
 * dit « ce mois-ci », pas « ce trimestre ». Les deux sont des lectures valides, elles
 * ne sont simplement pas la même — d'où la mention, et non une note de bas de page.
 *
 * ── LES SEUILS SONT CEUX DE LA CONVENTION, ET ILS SONT ARBITRAIRES ──────────
 *
 * 75 % et 25 % ne sortent d'aucune démonstration : ce sont les bornes qu'emploie la
 * référence, reprises pour que le chiffre se compare à celui qu'on lit ailleurs. La
 * réglette les MONTRE plutôt que de les cacher derrière un verdict, ce qui laisse le
 * lecteur juger d'un 74 % autrement que d'un 26 %.
 */
export async function AltcoinSeasonGauge({
  value,
  outperformers,
  universe,
  windowDays,
}: {
  /** Part des altcoins en tête, de 0 à 100. */
  value: number
  outperformers: number
  universe: number
  windowDays: number
}) {
  /* Bornée pour le seul POSITIONNEMENT du curseur : une valeur hors [0, 100] est
     impossible ici — c'est une proportion — mais un `left` négatif sortirait le
     curseur de la réglette sans que rien ne le signale. Le NOMBRE affiché, lui,
     reste celui qui a été calculé. */
  const position = Math.min(100, Math.max(0, value))

  const t = await getPhrase()
  const season = t(
    value >= 75 ? 'Saison des altcoins' : value <= 25 ? 'Saison de Bitcoin' : 'Aucune des deux',
  )

  return (
    <div className="rounded-card border border-border-subtle bg-surface p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="tabular display-lg leading-none text-ink">
            {Math.round(value)}
            <span className="text-lg font-normal text-ink-muted"> /100</span>
          </p>
          <p className="mt-1.5 text-sm text-ink-muted">
            {t('{n} des {u} premières capitalisations ont fait mieux que Bitcoin sur {d} jours.')
              .replace('{n}', String(outperformers))
              .replace('{u}', String(universe))
              .replace('{d}', String(windowDays))}
          </p>
        </div>

        <p className="text-sm font-semibold text-ink">{season}</p>
      </div>

      {/* ── LA RÉGLETTE ────────────────────────────────────────────────────
          Un dégradé en trois zones plutôt que trois blocs juxtaposés : les seuils
          ne sont pas des frontières nettes, et trois aplats séparés par un trait
          leur donneraient une précision qu'ils n'ont pas. */}
      <div className="mt-5">
        <div className="relative h-2 rounded-pill bg-gradient-to-r from-down via-ink-muted/40 to-brand">
          <span
            aria-hidden="true"
            className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-pill border-2 border-canvas bg-ink shadow-sm"
            style={{ left: `${position}%` }}
          />
        </div>

        <div className="mt-2 flex justify-between text-xs text-ink-muted">
          <span>{t('Saison de Bitcoin')}</span>
          <span>{t('Saison des altcoins')}</span>
        </div>
      </div>

      <p className="mt-5 border-t border-border-subtle pt-4 text-xs leading-relaxed text-ink-muted">
        {weave(
          t(
            'Comptage brut sur les {n} premières capitalisations, hors Bitcoin lui-même et hors stablecoins — dont la variation ne mesure rien d’autre que l’écart à leur ancrage. Ce n’est pas un signal d’achat ni de vente : voir [ce que ZENKUU ne fait pas](/aide/pas-de-conseil).',
          ).replace('{n}', String(universe)),
          (href, label, key) => (
            <Link
              key={key}
              href={href}
              className="underline underline-offset-2 hover:text-ink"
            >
              {label}
            </Link>
          ),
        )}
      </p>
    </div>
  )
}
