import { getMarketCapSeriesState } from '@zenkuu/data'
import { Rss } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { ButtonLink } from '@/components/ui/ButtonLink'

import { ZenkuuWordmark } from '@/components/BrandMark'
import { RelativeTime } from '@/components/home/RelativeTime'
import { LocaleBadge } from '@/components/settings/LocaleBadge'
import { Link } from '@/i18n/navigation'

import { DATA_SOURCES, FOOTER_COLUMNS, SOCIAL_LINKS } from '@/content/footer'
import { getContent, getPhrase } from '@/lib/content'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * PIED DE PAGE — UNE COLONNE D'IDENTITÉ, QUATRE COLONNES D'ANNUAIRE
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── LA COMPOSITION DEMANDÉE, ET CE QU'ELLE DÉPLACE ──────────────────────────
 *
 * Le modèle est le pied de TradingView. Sa structure tient en une phrase : une COLONNE
 * ÉTROITE À GAUCHE porte tout ce qui parle du site lui-même — marque, comptes, langue,
 * mentions légales, droits — et la largeur restante porte un ANNUAIRE en quatre
 * colonnes de groupes titrés. Rien n'est empilé en pleine largeur.
 *
 * Ce n'est pas un simple réarrangement : c'est une hiérarchie différente.
 *
 * 1. LA BARRE DU BAS DISPARAÎT. Elle alignait quatre blocs hétérogènes — droits, état
 *    du marché, langue, sources — par un `justify-between` qui ne tenait que tant
 *    qu'ils tenaient sur une ligne. Sous 900 px ils s'enroulaient dans un ordre que
 *    personne n'avait choisi. Empilés dans la colonne de gauche, ils se lisent de haut
 *    en bas, dans le même ordre à toutes les largeurs.
 *
 * 2. LES MENTIONS REMONTENT AVEC EUX. Clause de non-responsabilité, attribution
 *    CoinGecko, crédits de sources : trois textes qui parlent de la PROVENANCE des
 *    données, désormais voisins au lieu d'être répartis entre deux bandes séparées par
 *    un filet.
 *
 * 3. L'ANNUAIRE GAGNE UN NIVEAU. Les colonnes n'ont plus de titre visible ; ce sont les
 *    groupes qui en portent un. Voir `content/footer.ts` pour ce que ce niveau permet
 *    de ranger et que la version à plat forçait à mélanger.
 *
 * ── L'ABONNEMENT AU FLUX RESTE, ET CHANGE DE PLACE ─────────────────────────
 *
 * Il occupait un bandeau de tête sur toute la largeur. Le modèle n'a pas de bandeau de
 * tête, et le flux n'a pas à en réclamer un : c'est une manière de suivre le site,
 * exactement comme les comptes sociaux et le choix de langue, avec lesquels il se range
 * maintenant dans la colonne de gauche.
 *
 * ⚠️ CE N'EST TOUJOURS PAS UNE INFOLETTRE. Zenkuu n'a ni liste d'abonnés, ni registre
 * de consentements, ni lien de désinscription. Le flux RSS, lui, existe et fonctionne
 * aujourd'hui — il tient le même rôle sans emprunter une promesse.
 *
 * ── CE QUI NE BOUGE PAS, ET NE DOIT PAS ────────────────────────────────────
 *
 * L'avertissement « lecture seule » n'est pas décoratif : c'est ce qui tient ZENKUU à
 * distance du conseil en investissement. Il figure en bas de CHAQUE page, y compris les
 * fiches d'actif, là où les plateformes d'échange placent au contraire leur bouton
 * d'achat.
 *
 * La pastille d'état dit ce qu'elle SAIT et non ce qui rassure. Les grands sites
 * affichent « All Systems Operational » — une affirmation qu'un site sans supervision
 * ne peut pas faire, et qui resterait verte pendant une panne. La nôtre annonce un fait
 * vérifiable : la date du dernier relevé de marché réellement enregistré.
 * `getMarketCapSeriesState` lit une série tenue EN MÉMOIRE, sans requête ni cache —
 * c'est ce qui rend la pastille tenable sur toutes les pages.
 */
export async function Footer() {
  const fr = await getContent()
  const t = await getPhrase()
  const year = new Date().getFullYear()

  const series = getMarketCapSeriesState('EUR')
  const lastReading = series.points[series.points.length - 1]?.timestamp

  return (
    <footer className="mt-16 border-t border-border-subtle bg-surface">
      {/*
        ── LA GRILLE MAÎTRESSE ───────────────────────────────────────────────

        `minmax(0,20rem)` pour la colonne d'identité, et non `20rem` sec : les
        paragraphes de mentions qu'elle contient sont longs, et une piste rigide les
        laisserait déborder sur l'annuaire aux largeurs intermédiaires. Le `minmax`
        autorise la piste à se réduire sous sa taille idéale plutôt qu'à pousser la
        grille.

        Sous `lg`, tout retombe en une colonne : l'identité d'abord, l'annuaire
        ensuite. C'est l'ordre du document, et c'est aussi le bon ordre de lecture —
        on sait de quel site il s'agit avant de lire trente liens.
      */}
      <div className="shell grid gap-x-8 gap-y-12 py-14 lg:grid-cols-[minmax(0,20rem)_repeat(4,minmax(0,1fr))]">
        <div className="flex flex-col gap-6">
          {/* `self-start` EST OBLIGATOIRE, et son absence ne ressemble pas à un défaut
              d'alignement — elle ressemble à un logo géant centré.

              Le conteneur est un `flex flex-col`, dont l'alignement transversal par
              défaut est `stretch` : le `<svg>` s'étire donc sur toute la largeur. Sa
              hauteur restant fixée à 24 px, `preserveAspectRatio` fait ce pour quoi il
              existe — il centre le tracé dans la boîte au lieu de le déformer.

              Le composant pose lui-même son `aria-hidden` — voir `BrandMark`. Le nom
              est déjà annoncé par le lien du logo de l'en-tête. */}
          <ZenkuuWordmark className="h-6 w-auto self-start text-ink" />

          {/* `footer.positioning` est la seule phrase du pied qui dise ce qu'EST ce
              site — le reste énumère des pages. Elle ne double pas la clause plus
              bas : celle-ci décharge, celle-là situe. */}
          <p className="text-sm leading-relaxed text-ink-muted">{fr.footer.positioning}</p>

          {/* ── LES COMPTES, RÉDUITS À LEURS GLYPHES ────────────────────────
              Ils formaient une sixième colonne d'annuaire, avec intitulés. Le modèle en
              fait une rangée d'icônes sous la marque, et c'est plus juste : ce ne sont
              pas des pages du site mais des endroits où le retrouver ailleurs.

              Le nom du réseau et l'identifiant partent dans `aria-label` — l'icône
              seule ne dit rien à une synthèse vocale. La rangée disparaît entièrement
              si aucun compte n'existe : cf. `SOCIAL_LINKS`, où l'on n'affiche que ce
              qui est réellement ouvert. */}
          {SOCIAL_LINKS.length > 0 ? (
            <ul className="flex flex-wrap items-center gap-1" aria-label={fr.footer.community}>
              {SOCIAL_LINKS.map((link) => {
                const Icon = link.icon
                return (
                  <li key={link.href}>
                    <Button asChild variant="ghost" size="icon-sm" className="text-ink-muted">
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${t(link.label)} — ${link.handle}`}
                      >
                        <Icon className="h-4 w-4" />
                      </a>
                    </Button>
                  </li>
                )
              })}
            </ul>
          ) : null}

          {/* Langue et flux côte à côte : deux manières de régler comment on reçoit ce
              site, et deux contrôles de même poids. */}
          <div className="flex flex-wrap items-center gap-2">
            <LocaleBadge hint={fr.footer.localeHint} />

            {/* `ButtonLink` et non un `<a>` : l'adresse du flux est préfixée par la
                locale comme le reste du site — `/fr/blog/rss.xml` sert les articles
                français. Un `<a href>` nu renverrait tout le monde vers la version par
                défaut. */}
            <ButtonLink href="/blog/rss.xml" variant="outline" size="sm">
              <Rss aria-hidden="true" />
              {t('S’abonner au flux RSS')}
            </ButtonLink>
          </div>

          {/* ── LES MENTIONS ─────────────────────────────────────────────────
              `text-micro` (11 px) pour l'ensemble, à une exception chiffrée près, plus
              bas. Ce sont des textes qu'on lit une fois, quand on les cherche. */}
          <div className="mt-2 flex flex-col gap-3 border-t border-border-subtle pt-6">
            <p className="flex items-center gap-2 text-micro text-ink-muted">
              <span
                aria-hidden="true"
                className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                  lastReading === undefined ? 'bg-ink-muted' : 'bg-status'
                }`}
              />
              {lastReading === undefined ? (
                t('Premier relevé en cours')
              ) : (
                <>
                  {t('Marché relevé')} <RelativeTime iso={new Date(lastReading).toISOString()} />
                </>
              )}
            </p>

            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-micro leading-relaxed text-ink-muted">
              <span>{t('Sources')}</span>
              {DATA_SOURCES.map((source) => (
                <a
                  key={source.href}
                  href={source.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2 transition-colors duration-150 hover:text-ink"
                >
                  {source.label}
                </a>
              ))}
            </p>

            <p className="text-micro leading-relaxed text-ink-muted">{fr.footer.disclaimer}</p>

            {/*
              Attribution EXIGÉE par les CGU de l'API CoinGecko (§4.1.4) : la mention
              « Powered by CoinGecko » doit apparaître dans une police lisible d'au
              moins 10 px, et cette obligation ne distingue pas le palier gratuit des
              offres payantes. Aucun plan n'autorise son retrait.

              D'où `text-xs` (12 px) et non le `text-micro` (11 px) des lignes
              voisines : la contrainte est chiffrée, on garde une marge au-dessus du
              minimum.
            */}
            <p className="text-xs text-ink-muted">
              <a
                href="https://www.coingecko.com/en/api"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 transition-colors duration-150 hover:text-ink"
              >
                {fr.footer.poweredByCoinGecko}
              </a>
            </p>

            <p className="text-micro text-ink-muted">{fr.footer.rights(year)}</p>
          </div>
        </div>

        {/* ── L'ANNUAIRE ───────────────────────────────────────────────────
            Deux colonnes sur mobile et non une : les intitulés sont courts, et une
            seule colonne ferait défiler le pied sur deux écrans entiers.

            `contents` sous `lg` — non : chaque colonne reste une cellule de la grille
            maîtresse, ce qui aligne les quatre en tête sans qu'aucune n'ait à connaître
            la hauteur des autres. L'enveloppe `col-span-2` n'existe que pour le
            repli mobile, où les cinq pistes n'ont plus cours. */}
        <div className="col-span-full grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-4 lg:contents">
          {FOOTER_COLUMNS.map((column) => (
            <nav key={column.label} aria-label={t(column.label)} className="flex flex-col gap-8">
              {column.groups.map((group) => (
                <div key={group.title}>
                  {/* Intertitre en capitales et non en gras : à onze groupes, un gras
                      par groupe pèserait autant que les liens qu'il coiffe. La casse et
                      l'interlettrage suffisent à le détacher, et le laissent plus clair
                      que ses liens — c'est la hiérarchie du modèle. */}
                  <h2 className="mb-4 text-[0.625rem] font-semibold uppercase tracking-widest text-ink-muted">
                    {t(group.title)}
                  </h2>
                  <ul className="flex flex-col gap-2.5">
                    {group.links.map((link) => (
                      <li key={link.href}>
                        <Link
                          href={link.href}
                          className="text-xs text-ink transition-colors duration-150 hover:text-brand"
                        >
                          {t(link.label)}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </nav>
          ))}
        </div>
      </div>
    </footer>
  )
}
