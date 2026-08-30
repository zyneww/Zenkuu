import { getCryptoGlobalStats } from '@zenkuu/data'
import { ChangeBadge } from '@zenkuu/ui'

import { Money } from '@/components/locale/Money'
import { Link } from '@/i18n/navigation'
import { getPhrase } from '@/lib/content'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * LE BANDEAU DE STATISTIQUES GLOBALES — EN TÊTE DE CHAQUE PAGE
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── POURQUOI IL MONTE DANS L'EN-TÊTE ───────────────────────────────────────
 *
 * ZENKUU affichait déjà ces chiffres, mais sur l'accueil et sur `/crypto`
 * seulement (`GlobalStatsBar`, en cartes). Relevé le 2026-08-30 sur la référence :
 * ils vivent dans le `<header>`, première rangée de 52 px dans un en-tête de 118,
 * sur TOUTES les pages. Une fiche d'actif ou une page de catégorie y porte donc
 * l'état du marché en permanence.
 *
 * Les deux rôles coexistent chez eux, et ce n'est pas un doublon : le bandeau est
 * une ligne de repères qu'on lit sans quitter la page où l'on est ; les cartes de
 * l'accueil sont un bloc qu'on vient consulter, avec courbes et bascule.
 *
 * ── LES VALEURS SONT MESURÉES ──────────────────────────────────────────────
 *
 *   rangée     52 px de haut, rembourrage `10px 15px`
 *   libellé    12 px, graisse 400, encre atténuée
 *   valeur     12 px, graisse 600, encre
 *
 * `--v2-space-4` vaut exactement les 10 px verticaux relevés, et `--v2-text-2xs` les
 * 12 px — l'échelle ZENKUU n'a pas de cran à 12 px hors de cette couche, `text-xs`
 * valant 13. La gouttière horizontale vient de `shell` (24 px) plutôt que des 15 px
 * de la référence : c'est celle de toutes les autres rangées du site, et deux
 * rangées du même en-tête ne peuvent pas commencer à deux abscisses différentes.
 *
 * ── DEUX DE LEURS SIX REPÈRES N'ONT PAS DE SOURCE ICI ──────────────────────
 *
 * Leur bandeau porte : monnaies, plateformes, capitalisation, volume 24 h,
 * dominance, prix du gaz Ethereum. `GlobalMarketStats` fournit les quatre premiers
 * — `activeAssets`, `totalMarketCap` avec sa variation, `totalVolume24h`,
 * `dominance` — mais NI le nombre de plateformes NI le prix du gaz.
 *
 * Ils sont donc absents plutôt qu'approchés. Compter les plateformes demanderait une
 * lecture que rien d'autre sur le site ne réclame, et le prix du gaz vient d'un nœud
 * Ethereum, pas d'une source de cotation. Les inventer serait de la fausse donnée,
 * ce que le projet interdit.
 *
 * ── IL NE REND RIEN PLUTÔT QU'UNE LIGNE DE TIRETS ──────────────────────────
 *
 * Si la lecture échoue, le bandeau disparaît et l'en-tête reprend sa hauteur d'une
 * rangée. Une barre de repères vides en tête de CHAQUE page dirait « le site est
 * cassé » partout à la fois, pour une donnée qui n'est pas le sujet de la page qu'on
 * regarde.
 */
export async function GlobalTicker() {
  const [t, stats] = await Promise.all([getPhrase(), getCryptoGlobalStats('eur')])

  if (!stats.ok) return null

  const { totalMarketCap, totalVolume24h, marketCapChange24h, dominance, activeAssets, currency } =
    stats.data

  const btc = dominance?.btc
  const eth = dominance?.eth

  return (
    <div className="border-b border-border-subtle">
      {/* `overflow-x-auto` : quatre repères ne tiennent pas sur 360 px. La référence
          laisse la rangée défiler horizontalement plutôt que de la replier — c'est ce
          qui garde le même ordre de lecture à toutes les largeurs.

          `shell` reprend la gouttière et la largeur maximale du reste du site : le
          bandeau doit s'aligner sur la barre de navigation en dessous, sinon deux
          rangées du même en-tête commenceraient à deux abscisses différentes. */}
      <div className="shell scrollbar-none flex items-center gap-5 overflow-x-auto py-[var(--v2-space-4)] text-[length:var(--v2-text-2xs)]">
        <Repere label={t('Actifs')} href="/crypto">
          <span className="tabular font-semibold text-ink">{activeAssets.toLocaleString('fr-FR')}</span>
        </Repere>

        <Repere label={t('Capitalisation')} href="/graphiques">
          <span className="tabular font-semibold text-ink">
            <Money value={totalMarketCap} from={currency} compact />
          </span>
          <ChangeBadge value={marketCapChange24h} size="sm" />
        </Repere>

        <Repere label={t('Volume 24 h')} href="/graphiques">
          <span className="tabular font-semibold text-ink">
            <Money value={totalVolume24h} from={currency} compact />
          </span>
        </Repere>

        {btc !== undefined && eth !== undefined ? (
          <Repere label={t('Dominance')} href="/graphiques/dominance">
            <span className="tabular font-semibold text-ink">
              {`BTC ${btc.toFixed(1)} % · ETH ${eth.toFixed(1)} %`}
            </span>
          </Repere>
        ) : null}
      </div>
    </div>
  )
}

/**
 * Un repère : libellé atténué, puis sa valeur.
 *
 * Le tout est un LIEN, comme chez la référence — chaque chiffre de son bandeau mène à
 * la page qui le développe. C'est ce qui distingue un bandeau de repères d'une ligne
 * de texte : on y va d'un clic depuis n'importe quelle page.
 */
function Repere({
  label,
  href,
  children,
}: {
  label: string
  href: string
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className="flex shrink-0 items-center gap-1.5 whitespace-nowrap text-ink-muted transition-colors duration-150 hover:text-ink"
    >
      <span className="font-normal">{label}</span>
      {children}
    </Link>
  )
}
