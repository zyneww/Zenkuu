'use client'

import { ExternalLink } from 'lucide-react'
import { Table, TableBody, TableHeader } from '@/components/ui/table'
import { useMemo, useState } from 'react'

import type { AssetTicker } from '@zenkuu/data'
import { formatCurrency, formatPercent } from '@zenkuu/ui'

import { ExchangeLogo } from '@/components/asset/ExchangeLogo'
import { Money } from '@/components/locale/Money'
import { useRelativeTime } from '@/components/locale/useRelativeTime'
import { TablePagination } from '@/components/ui/TablePagination'
import { usePhrase } from '@/components/locale/ContentProvider'

/**
 * Places de cotation d'un actif.
 *
 * Seul module de la fiche à coûter un appel réseau dédié, d'où sa mise en cache à
 * 30 minutes : la liste des places et leur poids relatif bougent à l'échelle de la
 * journée, pas de la minute.
 *
 * LIENS SORTANTS ASSUMÉS. Ils orientent vers des lieux de transaction, ce que le §8
 * prévoit explicitement (« liens sortants vers des exchanges tiers — jamais de
 * widget de trading intégré »). La distinction tient : ZENKUU n'exécute rien, ne
 * détient rien et n'intègre aucun tunnel d'achat ; il cite où un actif se négocie.
 * `nofollow` marque l'absence de caution éditoriale, `noopener` empêche la page
 * ouverte d'accéder à `window.opener`.
 *
 * Les cotations périmées ou aberrantes sont écartées EN AMONT, dans l'adaptateur :
 * la source les signale elle-même, et un prix faux à côté de prix justes est pire
 * que pas de prix du tout — le lecteur n'a aucun moyen de les distinguer.
 *
 * ── CE QUI A ÉTÉ AJOUTÉ, ET CE QUI NE PEUT PAS L'ÊTRE ──────────────────────────
 *
 * Ajouté : la PROFONDEUR à ±2 %, la note de confiance par paire, la fraîcheur de la
 * cotation, le filtre par devise de cotation et la pagination. Les deux premiers
 * voyageaient déjà dans la réponse et étaient jetés.
 *
 * La profondeur mérite un mot : c'est la mesure de liquidité qui manquait. L'écart
 * acheteur-vendeur dit ce que coûte une petite transaction ; la profondeur dit ce que
 * le carnet absorbe. Deux places au même écart peuvent différer d'un facteur cent.
 *
 * NON REPRIS, faute de donnée : la distinction plateforme centralisée / décentralisée.
 * La source ne publie aucun indicateur du genre sur cet endpoint, et la déduire du nom
 * de la place serait une classification inventée (§5). Le filtre porte donc sur la
 * DEVISE DE COTATION, qui est, elle, réellement publiée — et qui répond à la même
 * question pratique : « à quel prix, dans quelle monnaie ».
 */

const PAGE_SIZES = [10, 25, 50] as const

/** Pourcentage SANS signe, pour les grandeurs qui n'ont pas de direction. */
function unsigned(formatted: string | null): string {
  return formatted?.replace('+', '') ?? '—'
}

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * UNE PLATEFORME DÉCENTRALISÉE NOMME SES PAIRES PAR ADRESSE DE CONTRAT
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Sur une place centralisée, `base` et `target` sont des codes — « BTC », « USDT ».
 * Sur un pool, la source publie l'ADRESSE des deux jetons : quarante-deux caractères
 * hexadécimaux sur les chaînes EVM, quarante-quatre en base58 sur Solana.
 *
 * Relevé au navigateur sur la table des marchés tokenisés de NVIDIA : une seule ligne
 * de pool écrivait quatre-vingt-six caractères dans la colonne « Paire », ce qui
 * étirait le tableau bien au-delà de sa colonne et lui donnait un ascenseur horizontal
 * — et les mêmes adresses se retrouvaient en pastilles dans le filtre par devise, où
 * elles occupaient trois lignes pour des valeurs illisibles.
 *
 * ── POURQUOI TRONQUER PLUTÔT QUE TRADUIRE ────────────────────────────────────
 *
 * Traduire une adresse en symbole demanderait d'interroger la chaîne, ou de tenir une
 * table d'adresses — pour une colonne d'appoint. La forme « 0x02FC…7436 » est celle
 * qu'emploient les explorateurs de blocs : elle reste RECONNAISSABLE et copiable
 * (l'adresse complète vit dans le `title`), sans rien inventer.
 */
function shortenAddress(value: string): string {
  const raw = value.trim()
  if (raw.length <= 12) return raw.toUpperCase()
  /* Une adresse n'a ni espace ni barre oblique : c'est ce qui la distingue d'un libellé
     long qu'on aurait tort de tronquer. */
  if (/[\s/]/.test(raw)) return raw
  return `${raw.slice(0, 6)}…${raw.slice(-4)}`
}

/** Un `target` est-il un CODE de devise, ou une adresse de contrat ? */
function isCurrencyCode(value: string): boolean {
  return value.trim().length <= 12 && !/^0x/i.test(value.trim())
}

/**
 * Fraîcheur de la cotation, en clair.
 *
 * Déléguée à `useRelativeTime` à la suite d'un ÉCART D'HYDRATATION repéré par
 * Sentry : la version précédente appelait `Date.now()` pendant le rendu, qui a lieu
 * une fois sur le serveur et une fois dans le navigateur. Une minute écoulée entre
 * les deux suffisait à produire « il y a 23 min » d'un côté et « 22 » de l'autre,
 * ce qui faisait rejeter et reconstruire tout le tableau. Voir l'en-tête du crochet.
 *
 * Un composant plutôt qu'un appel de fonction, parce qu'un crochet ne s'appelle pas
 * dans une boucle de rendu de lignes.
 */
function Freshness({ iso }: { iso: string | undefined }) {
  return <>{useRelativeTime(iso)}</>
}

const TRUST_LABEL: Record<'green' | 'yellow' | 'red', string> = {
  green: 'Volume jugé crédible par la source',
  yellow: 'Volume à considérer avec prudence',
  red: 'Volume jugé douteux par la source',
}

const TRUST_CLASS: Record<'green' | 'yellow' | 'red', string> = {
  green: 'bg-up',
  yellow: 'bg-gold',
  red: 'bg-down',
}

export function AssetTickers({
  tickers,
  assetName,
  exchangeImages,
  title,
  description,
}: {
  tickers: AssetTicker[]
  assetName: string
  /**
   * Titre et chapeau de la section, quand l'appelant en veut d'autres.
   *
   * ── POURQUOI DEUX PROPS PLUTÔT QU'UN SECOND COMPOSANT ────────────────────
   *
   * Cette table sert désormais deux sujets. Sur une cryptomonnaie, ce sont les places
   * qui cotent l'actif lui-même ; sur une action, celles qui cotent ses versions
   * TOKENISÉES — et le chapeau doit alors nommer les émissions interrogées, ainsi que
   * celles qui ne l'ont pas été. Les colonnes, le filtre par devise, la pagination et
   * la mention de source sont EXACTEMENT les mêmes : dupliquer le composant pour deux
   * phrases produirait deux tableaux condamnés à diverger au premier ajustement.
   *
   * Absents, les libellés d'origine s'appliquent.
   */
  title?: string
  description?: React.ReactNode
  /**
   * Logos des places, indexés par leur identifiant chez la source.
   *
   * Passé en TABLE et non résolu ligne par ligne : les cent cotations d'un actif se
   * répartissent sur quelques dizaines de places seulement, et la table est construite
   * une fois côté serveur à partir d'un appel partagé par toutes les fiches du site.
   *
   * Facultative : une place absente du palmarès — ou le palmarès indisponible — rend
   * son monogramme, et le tableau reste complet.
   */
  exchangeImages?: Record<string, string>
}) {
  const t = usePhrase()
  const [target, setTarget] = useState<string>('toutes')
  const [pageSize, setPageSize] = useState<number>(10)
  const [page, setPage] = useState(1)

  // Devises de cotation réellement présentes, classées par nombre de paires : le
  // filtre ne propose que ce qui existe, jamais une liste théorique qui renverrait
  // un tableau vide.
  const targets = useMemo(() => {
    const counts = new Map<string, number>()
    for (const ticker of tickers) {
      /* Les ADRESSES DE CONTRAT sont écartées du filtre. Une pastille « devise de
         cotation » portant quarante-deux caractères hexadécimaux ne désigne rien pour
         le lecteur, et n'en filtre qu'une ligne — voir `isCurrencyCode`. */
      if (!isCurrencyCode(ticker.target)) continue
      counts.set(ticker.target, (counts.get(ticker.target) ?? 0) + 1)
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([code]) => code)
  }, [tickers])

  const filtered = useMemo(
    () => (target === 'toutes' ? tickers : tickers.filter((ticker) => ticker.target === target)),
    [tickers, target],
  )

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  // Le changement de filtre peut rendre la page courante inexistante : on la borne
  // au rendu plutôt qu'en effet de bord, ce qui évite un rendu intermédiaire vide.
  const currentPage = Math.min(page, pageCount)
  const rows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  if (tickers.length === 0) return null

  const hasSpread = tickers.some((ticker) => ticker.spreadPercent !== undefined)
  const hasDepth = tickers.some((ticker) => ticker.depthUpUsd !== undefined)
  const hasTrust = tickers.some((ticker) => ticker.trust !== undefined)

  return (
    <section aria-labelledby="places-titre" className="space-y-3">
      <div className="space-y-1">
        <h2 id="places-titre" className="display-sm text-ink">
          {title ?? `Où se négocie ${assetName}`}
        </h2>
        <p className="text-sm leading-relaxed text-ink-muted">
          {description ?? (
            <>
              Les {tickers.length} places les plus actives, classées par volume. Les parts
              affichées se rapportent à ces {tickers.length} places seulement, pas à
              l’ensemble du marché.
            </>
          )}
        </p>
      </div>

      {/* Le sélecteur de lignes qui accompagnait ces filtres est descendu dans la barre
          de pagination, où il rejoint le compteur et les numéros. Une taille de page se
          règle en regardant où l'on en est, pas avant d'avoir commencé à lire. */}
      <div className="flex flex-wrap items-center gap-1" role="group" aria-label={t('Devise de cotation')}>
        <FilterChip
          active={target === 'toutes'}
          onClick={() => {
            setTarget('toutes')
            setPage(1)
          }}
          label="Toutes"
        />
        {targets.map((code) => (
          <FilterChip
            key={code}
            active={target === code}
            onClick={() => {
              setTarget(code)
              setPage(1)
            }}
            label={code}
          />
        ))}
      </div>

      <div className="rounded-card">
        {/* Colonnes prioritaires sous `sm` — voir la note de `MarketTable`. Sur un
            téléphone il reste la place, la paire et le prix : c'est ce qu'on vient
            vérifier ici, « combien coûte-t-il où ». Le volume, qui sert à juger si la
            cotation est sérieuse, revient dès la première largeur supplémentaire. */}
        <Table className="border-collapse sm:min-w-[720px]">
          <caption className="sr-only">{t('Places de cotation de {a}').replace('{a}', assetName)}</caption>
          <TableHeader className="[&_tr]:border-b-0">
            <tr className="border-b border-border-subtle bg-surface-muted/35 text-left text-xs text-ink-muted">
              {/*
                LE RANG N'EST PAS DÉCORATIF ICI, contrairement à celui d'un classement.

                Sur un tableau trié par capitalisation, le numéro redit ce que l'ORDRE
                des lignes dit déjà, et il avait été retiré pour cela. Ici il répond à
                une autre question : « à quelle place se situe celle-ci quand j'en suis
                à la troisième page ? » — la numérotation traverse les pages et ne
                repart pas à un, ce que l'ordre seul ne peut pas dire.
              */}
              <th scope="col" className="w-10 px-3 py-2.5 text-right font-semibold">#</th>
              <th scope="col" className="px-3 py-2.5 font-semibold">{t('Place')}</th>
              <th scope="col" className="px-3 py-2.5 font-semibold">{t('Paire')}</th>
              <th scope="col" className="px-3 py-2.5 text-right font-semibold">{t('Prix')}</th>
              {hasSpread ? (
                <th scope="col" className="hidden px-3 py-2.5 text-right font-semibold sm:table-cell">
                  {t('Écart')}
                </th>
              ) : null}
              {hasDepth ? (
                <th scope="col" className="hidden px-3 py-2.5 text-right font-semibold lg:table-cell">
                  {t('Profondeur ±2 %')}
                </th>
              ) : null}
              <th scope="col" className="hidden px-3 py-2.5 text-right font-semibold sm:table-cell">
                {t('Volume 24 h')}
              </th>
              <th scope="col" className="hidden px-3 py-2.5 text-right font-semibold md:table-cell">
                {t('Part')}
              </th>
              <th scope="col" className="hidden px-3 py-2.5 text-right font-semibold xl:table-cell">
                {t('Cotée')}
              </th>
            </tr>
          </TableHeader>

          <TableBody className="divide-y divide-border-subtle">
            {rows.map((ticker, index) => (
              <tr
                /*
                 * L'INDEX fait partie de la clé, et il le faut.
                 *
                 * `place + paire` n'est pas unique : une place décentralisée cote la
                 * même paire sur plusieurs pools, et la source les publie comme
                 * autant de lignes distinctes. Vu à l'écran dès le passage de dix à
                 * cent lignes — React signalait deux enfants de même clé, ce qui
                 * l'autorise à dupliquer ou à omettre des lignes silencieusement.
                 *
                 * L'index est stable ici parce que l'ordre l'est : la liste est triée
                 * par volume côté serveur, et le filtre ne fait que retrancher.
                 */
                key={`${ticker.exchange}-${ticker.base}-${ticker.target}-${index}`}
                className="transition-colors duration-150 hover:bg-surface-muted/60"
              >
                {/* Le rang ABSOLU, pas l'index de page : `(page - 1) × taille + i + 1`.
                    Sans le décalage, la page 3 recommencerait à 1 et l'on croirait
                    avoir changé de tableau. */}
                <td className="tabular px-3 py-2.5 text-right text-xs text-ink-muted/70">
                  {(currentPage - 1) * pageSize + index + 1}
                </td>

                <th scope="row" className="px-3 py-2.5 text-left font-medium text-ink">
                  <span className="inline-flex items-center gap-1.5">
                    {hasTrust && ticker.trust ? (
                      <span
                        className={`h-1.5 w-1.5 shrink-0 rounded-pill ${TRUST_CLASS[ticker.trust]}`}
                        title={t(TRUST_LABEL[ticker.trust])}
                        role="img"
                        aria-label={t(TRUST_LABEL[ticker.trust])}
                      />
                    ) : null}

                    {/*
                      L'ICÔNE EST HORS DU LIEN, et l'endroit compte.

                      Placée dedans, elle agrandirait la cible cliquable d'une image
                      décorative sans nom accessible — un lecteur d'écran annoncerait le
                      lien, puis rien, puis son libellé. À côté, le lien reste le seul
                      texte et l'icône reste ce qu'elle est : un repère visuel.
                    */}
                    <ExchangeLogo
                      name={ticker.exchange}
                      {...(ticker.exchangeId && exchangeImages?.[ticker.exchangeId]
                        ? { src: exchangeImages[ticker.exchangeId] }
                        : {})}
                    />

                    {ticker.tradeUrl ? (
                      <a
                        href={ticker.tradeUrl}
                        target="_blank"
                        rel="nofollow noopener noreferrer"
                        className="inline-flex items-center gap-1.5 hover:text-brand"
                      >
                        {ticker.exchange}
                        <ExternalLink
                          className="h-3 w-3 shrink-0 text-ink-muted"
                          aria-hidden="true"
                        />
                        <span className="sr-only">{t('(nouvelle fenêtre)')}</span>
                      </a>
                    ) : (
                      ticker.exchange
                    )}
                  </span>
                </th>

                {/*
                  ── LA PAIRE EST CLIQUABLE QUAND LA SOURCE DONNE UNE ADRESSE ──────

                  Le nom de la place l'était déjà, mais c'est la PAIRE qu'on vise quand
                  on veut aller voir : « BTC/USDT chez Binance » n'est pas la page
                  d'accueil de Binance, c'est un carnet précis, et `tradeUrl` pointe
                  justement dessus. Deux cibles pour la même adresse, oui — et c'est ce
                  que fait la référence, parce que l'œil part tantôt du nom, tantôt de
                  la paire.

                  `nofollow` : ce sont des liens sortants vers des places de marché, en
                  nombre, et rien ne justifie de leur transmettre du signal.
                */}
                {/* La paire COMPLÈTE vit dans le `title` : c'est là qu'on va chercher
                    une adresse de contrat quand on en a besoin, et elle reste
                    sélectionnable à la souris. Voir `shortenAddress`. */}
                <td
                  className="px-3 py-2.5 text-xs text-ink-muted"
                  title={`${ticker.base}/${ticker.target}`}
                >
                  {ticker.tradeUrl ? (
                    <a
                      href={ticker.tradeUrl}
                      target="_blank"
                      rel="nofollow noopener noreferrer"
                      className="inline-flex items-center gap-1 whitespace-nowrap hover:text-brand"
                    >
                      {shortenAddress(ticker.base)}/{shortenAddress(ticker.target)}
                      <ExternalLink className="h-3 w-3 shrink-0 opacity-60" aria-hidden="true" />
                      <span className="sr-only">{t('(nouvelle fenêtre)')}</span>
                    </a>
                  ) : (
                    <span className="whitespace-nowrap">
                      {shortenAddress(ticker.base)}/{shortenAddress(ticker.target)}
                    </span>
                  )}
                </td>

                <td className="tabular px-3 py-2.5 text-right text-ink">
                  <Money value={ticker.price} from={ticker.currency} />
                </td>

                {hasSpread ? (
                  <td className="tabular hidden px-3 py-2.5 text-right text-ink-muted sm:table-cell">
                    {/* Signe retiré : `formatPercent` préfixe « + » parce qu'il sert
                        d'abord aux VARIATIONS, où le sens compte. Un écart
                        acheteur-vendeur est une largeur, toujours positive — « +0,01 % »
                        laisserait croire à une hausse de l'écart. */}
                    {unsigned(formatPercent(ticker.spreadPercent))}
                  </td>
                ) : null}

                {hasDepth ? (
                  <td className="tabular hidden px-3 py-2.5 text-right text-ink-muted lg:table-cell">
                    {/* Les deux sens sont montrés séparément : un carnet asymétrique —
                        beaucoup d'acheteurs, peu de vendeurs — est une information que
                        la moyenne des deux effacerait. En dollars, unité de la source. */}
                    <span className="whitespace-nowrap">
                      {formatCurrency(ticker.depthUpUsd, 'USD', { compact: true }) ?? '—'}
                      <span className="mx-1 text-ink-muted/60">/</span>
                      {formatCurrency(ticker.depthDownUsd, 'USD', { compact: true }) ?? '—'}
                    </span>
                  </td>
                ) : null}

                <td className="tabular hidden px-3 py-2.5 text-right text-ink-muted sm:table-cell">
                  <Money value={ticker.volume24h} from={ticker.currency} compact />
                </td>

                <td className="tabular hidden px-3 py-2.5 text-right text-ink-muted md:table-cell">
                  {unsigned(formatPercent(ticker.volumePercent))}
                </td>

                <td className="hidden px-3 py-2.5 text-right text-xs text-ink-muted xl:table-cell">
                  <Freshness iso={ticker.lastTraded} />
                </td>
              </tr>
            ))}
          </TableBody>
        </Table>
      </div>

      <TablePagination
        page={currentPage}
        perPage={pageSize}
        total={filtered.length}
        unit="paire"
        perPageChoices={PAGE_SIZES}
        onPageChange={setPage}
        onPerPageChange={(size) => {
          setPageSize(size)
          // Repartir en page 1 : la page 7 de dix lignes n'a pas d'équivalent en
          // cinquante, et y rester ferait sauter le lecteur au milieu de la liste.
          setPage(1)
        }}
      />

      <p className="text-xs leading-relaxed text-ink-muted">
        {t('La pastille de couleur reprend le jugement de la source sur la crédibilité du volume annoncé — ce n’est pas un avis de ZENKUU. La profondeur ±2 % est le montant qu’il faudrait exécuter pour déplacer le cours de deux pour cent, à l’achat puis à la vente, en dollars.')}
      </p>

      <p className="text-xs text-ink-muted">
        {t('ZENKUU n’exécute aucun ordre et ne détient aucun fonds. Ces liens mènent à des plateformes tierces, citées sans recommandation.')}
      </p>
    </section>
  )
}

function FilterChip({
  active,
  onClick,
  label,
}: {
  active: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-control border px-2.5 py-1 text-xs font-medium transition-colors duration-150 ${
        active
          ? 'border-brand bg-brand text-on-brand'
          : 'border-border-subtle bg-surface text-ink-muted hover:border-brand hover:text-ink'
      }`}
    >
      {label}
    </button>
  )
}


