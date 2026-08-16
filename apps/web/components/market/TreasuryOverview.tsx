import type { TreasuryReport } from '@zenkuu/data'
import { formatCompact } from '@zenkuu/ui'

/* `TreemapLegend` n'est délibérément PAS importée — voir la note sur la couleur dans
   l'en-tête ci-dessous : sans variation à peindre, une échelle de couleurs décrirait
   quelque chose qui n'existe pas sur la figure. */
import { TreemapFigure, type TreemapTile } from '@/components/tools/TreemapFigure'

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
 * ── LA COULEUR N'EST PAS UNE VARIATION, ET C'EST POURQUOI ELLE EST ABSENTE ────
 *
 * Les autres cartes thermiques du site colorent une variation sur une fenêtre. Ce
 * registre n'en a pas : il recense des positions DÉCLARÉES, à la date de leur annonce,
 * sans historique. Colorer par plus-value latente serait tentant et faux — la valeur
 * d'entrée manque pour une partie des lignes, et une tuile grise au milieu de tuiles
 * vertes se lirait comme une perte.
 *
 * Les tuiles restent donc neutres, et la légende disparaît avec la couleur.
 */
export function TreasuryOverview({
  reports,
}: {
  /** Registres disponibles, un par actif suivi. Un registre en échec n'y figure pas. */
  reports: { coin: string; label: string; unit: string; report: TreasuryReport }[]
}) {
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

      tiles.push({
        id: `${entry.coin}:${holder.name}`,
        label: holder.ticker?.split('.')[0] ?? holder.name,
        title: `${holder.name} · ${formatCompact(holder.holdings)} ${entry.unit}`,
        value,
      })
    }
  }

  tiles.sort((a, b) => b.value - a.value)

  return (
    <section className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Entités recensées" value={String(entities.size)} hint="sociétés et fonds distincts" />
        <Stat
          label="Pays"
          value={countries.size > 0 ? String(countries.size) : '—'}
          hint="tels que déclarés à la source"
        />
        <Stat
          label="Actifs suivis"
          value={String(reports.length)}
          hint={reports.map((entry) => entry.unit).join(' · ')}
        />
        <Stat
          label="Valeur totale"
          value={`${formatCompact(totalValueUsd)} $`}
          hint="au cours du jour"
        />
      </div>

      {tiles.length > 1 ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="display-sm text-ink">Répartition par détenteur</h2>
            <p className="text-xs text-ink-muted">
              {tiles.length} positions · surface = valeur au cours du jour
            </p>
          </div>

          {/* Plus basse que les cartes thermiques du marché : celle-ci n'a que quelques
              dizaines de tuiles, et une hauteur de sept cents pixels y laisserait des
              rectangles démesurés pour des positions marginales. */}
          <TreemapFigure
            tiles={tiles.slice(0, 60)}
            periodLabel=""
            height="min(50vh, 400px)"
            valueUnit=" $"
          />

          <p className="max-w-4xl text-xs leading-relaxed text-ink-muted">
            Surface : valeur de la position au cours du jour. Les tuiles ne sont pas
            colorées, et c’est délibéré : ce registre recense des positions{' '}
            <strong className="text-ink">déclarées</strong>, à la date de leur annonce, sans
            historique — il n’existe aucune variation à peindre. Une société qui aurait vendu
            sans le publier y figure encore. Montants en dollars.
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
      <p className="tabular mt-1 text-xl font-semibold leading-tight text-ink">{value}</p>
      <p className="mt-1 text-micro leading-snug text-ink-muted">{hint}</p>
    </div>
  )
}
