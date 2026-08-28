import type { TreasuryReport } from '@zenkuu/data'
import { formatCompact } from '@zenkuu/ui'

import { HeatmapFrame } from '@/components/tools/HeatmapFrame'
import {
  TreemapFigure,
  TreemapLegend,
  type TreemapTile,
} from '@/components/tools/TreemapFigure'
import { getPhrase } from '@/lib/content'

/**
 * VUE D'ENSEMBLE DES TRÉSORERIES — quatre nombres et une carte, avant les tableaux.
 *
 * ── CE QUE LES TABLEAUX NE DISENT PAS ─────────────────────────────────────────
 *
 * La page listait deux registres, l'un pour Bitcoin, l'autre pour Ethereum, chacun
 * précédé d'une ligne de total. C'est exact et illisible en l'état : rien ne dit
 * combien d'entités sont recensées au total, dans combien de pays, ni surtout comment
 * la détention se RÉPARTIT — or c'est la question qui compte, parce que la réponse est
 * « très mal ». Une poignée de sociétés détient l'essentiel, et deux cents lignes de
 * tableau trié par quantité le laissent deviner sans jamais le montrer.
 *
 * La référence ouvre sa page ainsi : quatre compteurs et une figure de répartition. On
 * reprend la forme, avec nos propres nombres.
 *
 * ── LES QUATRE COMPTEURS SONT DES DÉNOMBREMENTS, PAS DES ESTIMATIONS ──────────
 *
 * Entités, pays, actifs suivis, valeur totale : tous se comptent sur les lignes que la
 * source publie. Le seul point délicat est l'ENTITÉ, qu'on dénombre par nom distinct —
 * une société détenant à la fois du bitcoin et de l'ether apparaît dans les deux
 * registres et ne doit compter qu'une fois. Additionner les deux longueurs de liste
 * gonflerait le total sans que rien ne le signale.
 *
 * ── LA CARTE MONTRE LES DÉTENTEURS, PAS LES ACTIFS ────────────────────────────
 *
 * La référence pave par ACTIF — un grand rectangle Bitcoin, un petit Ethereum. Avec
 * deux actifs suivis, ce pavage n'est qu'une barre coupée en deux, et il n'apprend
 * rien qu'un compteur ne dise mieux.
 *
 * On pave donc par DÉTENTEUR, tous actifs confondus. La figure répond alors à la
 * question que le tableau esquive : la concentration. Un rectangle qui occupe la
 * moitié de la carte se voit ; « 640 000 BTC » en tête d'un tableau de deux cents
 * lignes, non.
 *
 * ── LA COULEUR PORTE LA PLUS-VALUE LATENTE ────────────────────────────────────
 *
 * Les autres cartes thermiques du site colorent une variation sur une FENÊTRE — 24 h,
 * 7 jours. Ce registre n'en a pas : il recense des positions déclarées, à la date de
 * leur annonce, sans historique. Les tuiles sont donc restées neutres un temps, au
 * motif qu'il n'y avait rien à peindre.
 *
 * C'était une conclusion trop rapide. Il y a bien une grandeur variable ici, et c'est
 * même la seule question qu'on pose à un tel registre : l'écart entre ce qu'une
 * société a PAYÉ (`entryValueUsd`) et ce que sa position VAUT aujourd'hui. Une carte
 * qui la peint répond d'un regard à « qui est en gain » ; une carte grise ne répond à
 * rien et laisse le lecteur diviser deux colonnes de tableau.
 *
 * L'objection qui avait fait renoncer — « la valeur d'entrée manque pour une partie
 * des lignes » — reste vraie et elle ne pèse pas ce qu'on croyait : `heatTone` rend un
 * gris de LACUNE, distinct des paliers rouges. Une tuile sans coût d'entrée se lit
 * donc « non communiqué », pas « à l'équilibre », et la note sous la figure le dit.
 * C'est exactement le traitement que la carte du marché applique à un actif dont la
 * source ne publie pas la fenêtre demandée.
 *
 * ⚠️ Ce n'est ni un résultat réalisé — la position n'a pas été vendue — ni une
 * performance boursière de la société. La note le précise, faute de quoi la carte se
 * lirait comme un palmarès d'actionnaires.
 */
export async function TreasuryOverview({
  reports,
}: {
  /** Registres disponibles, un par actif suivi. Un registre en échec n'y figure pas. */
  reports: { coin: string; label: string; unit: string; report: TreasuryReport }[]
}) {
  const t = await getPhrase()
  if (reports.length === 0) return null

  /* Entités DISTINCTES : une société présente dans les deux registres ne compte qu'une
     fois. Le rapprochement se fait sur le nom normalisé, faute d'identifiant commun —
     la source n'en publie pas. */
  const entities = new Set<string>()
  const countries = new Set<string>()
  let totalValueUsd = 0

  for (const entry of reports) {
    for (const holder of entry.report.holders) {
      entities.add(holder.name.trim().toLowerCase())
      if (holder.country) countries.add(holder.country.trim().toUpperCase())
      totalValueUsd += holder.currentValueUsd ?? 0
    }
  }

  /*
   * Une tuile par POSITION et non par société : une même société détenant du bitcoin et
   * de l'ether a deux lignes, et les fusionner ferait perdre l'actif. Le libellé porte
   * donc le ticker boursier quand il existe — c'est ce qui tient sur une petite tuile —
   * et l'infobulle porte le nom complet avec la quantité dans son unité.
   */
  const tiles: TreemapTile[] = []
  for (const entry of reports) {
    for (const holder of entry.report.holders) {
      const value = holder.currentValueUsd
      if (value === undefined || value <= 0) continue

      /*
       * ── LA COULEUR PORTE LA PLUS-VALUE LATENTE ────────────────────────────
       *
       * `entryValueUsd` est ce que la société déclare avoir payé ; la tuile peint
       * l'écart avec ce que la position vaut aujourd'hui, en pourcentage du coût.
       * C'est la seule grandeur variable de ce registre, et c'est la question qu'on
       * lui pose réellement : qui est en gain, qui est en perte.
       *
       * ⚠️ ABSENT N'EST PAS ZÉRO. La source publie `0` pour « non communiqué » ;
       * l'adaptateur a déjà traduit ce zéro en champ manquant (voir
       * `TreasuryHolder.entryValueUsd`), et le laisser passer donnerait une
       * plus-value infinie. Sans coût d'entrée, la tuile reste donc GRISE — ce que
       * `heatTone` fait d'une variation absente, et qui se lit comme « on ne sait
       * pas » plutôt que comme « stable ».
       */
      const cost = holder.entryValueUsd
      const gain = cost !== undefined && cost > 0 ? ((value - cost) / cost) * 100 : undefined

      tiles.push({
        id: `${entry.coin}:${holder.name}`,
        label: holder.ticker?.split('.')[0] ?? holder.name,
        title: `${holder.name} · ${formatCompact(holder.holdings)} ${entry.unit}`,
        value,
        ...(gain !== undefined ? { change: gain } : {}),
      })
    }
  }

  tiles.sort((a, b) => b.value - a.value)

  return (
    <section className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label={t('Entités recensées')} value={String(entities.size)} hint={t('sociétés et fonds distincts')} />
        <Stat
          label={t('Pays')}
          value={countries.size > 0 ? String(countries.size) : '—'}
          hint={t('tels que déclarés à la source')}
        />
        <Stat
          label={t('Actifs suivis')}
          value={String(reports.length)}
          hint={reports.map((entry) => entry.unit).join(' · ')}
        />
        <Stat
          label={t('Valeur totale')}
          value={`${formatCompact(totalValueUsd)} $`}
          hint={t('au cours du jour')}
        />
      </div>

      {tiles.length > 1 ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="display-sm text-ink">{t('Répartition par détenteur')}</h2>
            <TreemapLegend />
          </div>

          {/* LA MÊME HAUTEUR que la carte des collections et celle du marché : ces trois
              figures sont le même objet, et une hauteur qui varierait de l'une à l'autre
              se verrait en passant de page en page. */}
          <HeatmapFrame>
            <TreemapFigure
              tiles={tiles.slice(0, 60)}
              periodLabel="l’acquisition"
              height="min(62vh, 520px)"
              valueUnit=" $"
            />
          </HeatmapFrame>

          <p className="max-w-4xl text-xs leading-relaxed text-ink-muted">
            {tiles.length} positions. Surface : valeur au cours du jour. Couleur :{' '}
            <strong className="text-ink">plus-value latente</strong> — l’écart entre cette
            valeur et le coût d’acquisition déclaré, rapporté à ce coût. Ce n’est ni un
            résultat réalisé ni une performance boursière : la position n’a pas été vendue.
            Une tuile <strong className="text-ink">grise</strong> signale une société qui n’a
            pas communiqué son coût d’entrée — l’absence est affichée comme telle, jamais
            remplacée par zéro. Ce registre recense enfin des positions{' '}
            <strong className="text-ink">déclarées</strong>, à la date de leur annonce : une
            société qui aurait vendu sans le publier y figure encore. Montants en dollars.
          </p>
        </div>
      ) : null}
    </section>
  )
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-card border border-border-subtle bg-panel p-4">
      <p className="text-xs text-ink-muted">{label}</p>
      <p className="figure mt-1 text-xl font-semibold leading-tight text-ink">{value}</p>
      <p className="mt-1 text-micro leading-snug text-ink-muted">{hint}</p>
    </div>
  )
}
