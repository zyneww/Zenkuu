'use client'

import { Code2, Download } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useLocale } from 'next-intl'

import { ChangeBadge, formatCompact, formatCurrency } from '@zenkuu/ui'

import { AreaPlot } from '@/components/charts/AreaPlot'
import { AGGREGATE_TONE } from '@/components/charts/chart-theme'
import { CopyButton } from '@/components/asset/CopyButton'
import { IconButton } from '@/components/ui/IconButton'
import { InfoTip } from '@/components/ui/InfoTip'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { usePhrase } from '@/components/locale/ContentProvider'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * UNE COURBE GLOBALE, DANS UN CADRE QUI PORTE SES PROPRES COMMANDES
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── CE QUE CE COMPOSANT REMPLACE ─────────────────────────────────────────────
 *
 * La page des graphiques globaux empilait des blocs de nature différente : une bande
 * de chiffres, une carte d'aperçu, un explorateur à trois sélecteurs partagés, un
 * panier à quatre vues, une courbe de sentiment. Chacun avait sa forme, ses commandes
 * et sa place dans le flux ; on ne pouvait comparer deux séries qu'en faisant défiler.
 *
 * CoinGecko — la référence demandée — pose au contraire des CADRES ÉGAUX : un titre,
 * la valeur courante, ses propres paliers de période à droite, la courbe, et
 * éventuellement une ligne de totaux dessous. Le grand cadre ouvre la page, les autres
 * se rangent en grille à deux colonnes.
 *
 * ── LES PALIERS NE COÛTENT AUCUN APPEL ───────────────────────────────────────
 *
 * Chaque cadre reçoit sa série ENTIÈRE et découpe dedans. C'est ce qui permet à
 * chaque carte d'avoir ses propres paliers sans multiplier les requêtes : changer de
 * période est un `filter` sur un tableau déjà en mémoire, pas un aller-retour.
 *
 * ⚠️ LES FORMATS SONT DÉSIGNÉS PAR UN MOT, PAS PAR UNE FONCTION. Ce composant est
 * rendu depuis un composant SERVEUR : une fonction de formatage passée en prop ne
 * traverse pas la frontière. D'où `format` et `currency`, deux chaînes, et le
 * formatage fait ici.
 */

export interface GlobalChartPoint {
  /** Millisecondes depuis l'époque. */
  t: number
  y: number
}

/**
 * Paliers proposés, du plus court au plus long. `null` = toute la série.
 *
 * Les six de la référence, `24H` et `14J` compris. Ils ne sont pas tous OFFERTS pour
 * autant : voir `offered` dans le composant — un palier qui ne trouverait pas deux
 * points dans la série n'est pas affiché.
 */
const RANGES: { id: string; label: string; days: number | null }[] = [
  { id: '24h', label: '24H', days: 1 },
  { id: '7d', label: '7J', days: 7 },
  { id: '14d', label: '14J', days: 14 },
  { id: '1m', label: '1M', days: 30 },
  { id: '3m', label: '3M', days: 90 },
  { id: 'max', label: 'MAX', days: null },
]

/** Points d'une fenêtre, comptés depuis le DERNIER relevé — voir `shown`. */
function windowOf(points: GlobalChartPoint[], days: number | null): GlobalChartPoint[] {
  if (!days) return points
  const latest = points[points.length - 1]?.t
  if (latest === undefined) return points
  const cutoff = latest - days * 86_400_000
  return points.filter((point) => point.t >= cutoff)
}

export function GlobalChartCard({
  title,
  hint,
  points,
  format,
  currency = 'EUR',
  colorIndex = 5,
  bars = false,
  footer,
  note,
  defaultRange = 'max',
  large = false,
  info,
  embedId,
}: {
  title: string
  /** Une phrase courte sous le titre — ce que la courbe mesure vraiment. */
  hint?: string
  points: GlobalChartPoint[]
  /** Comment lire l'ordonnée : montant, pourcentage, ou nombre nu. */
  format: 'money' | 'percent' | 'plain'
  currency?: string
  /** Rang dans la palette de données — voir `chart-theme`. */
  colorIndex?: number
  /**
   * Tracé en BARRES plutôt qu'en aire — voir la note de `bars` dans `AreaPlot`.
   *
   * À réserver aux séries qui mesurent une QUANTITÉ PAR PÉRIODE : un volume quotidien,
   * un revenu mensuel. Une aire y relierait deux jours par une pente qui n'existe pas.
   * Un cours ou une capitalisation, qui existent à chaque instant, gardent l'aire.
   */
  bars?: boolean
  /** Ligne de totaux sous la courbe, à la manière de la référence. */
  footer?: React.ReactNode
  /** Mention de provenance ou de méthode, en petit sous le cadre. */
  note?: React.ReactNode
  defaultRange?: string
  /** Le cadre d'ouverture est plus haut que ceux de la grille. */
  large?: boolean
  /** Explication du ⓘ posé après le titre. Absente, l'icône ne paraît pas. */
  info?: string
  /**
   * Identifiant de série pour `/embed/graphique`. Absent, le bouton `</>` ne paraît
   * pas — il n'y a pas d'adresse à proposer, et un bouton qui offrirait un code
   * d'intégration vers une page inexistante serait pire que son absence.
   */
  embedId?: string
}) {
  const t = usePhrase()
  /* Les mois de l'axe suivent la LANGUE lue, pas celle du code : « 24 nov. » sous une
     page anglaise se remarque autant qu'un titre non traduit. */
  const locale = useLocale()
  const [rangeId, setRangeId] = useState(defaultRange)

  /*
   * ══════════════════════════════════════════════════════════════════════════
   * UN PALIER N'EST OFFERT QUE S'IL A DE QUOI SE TRACER
   * ══════════════════════════════════════════════════════════════════════════
   *
   * ⚠️ CORRECTION D'UN MENSONGE DISCRET. La version précédente proposait les cinq
   * paliers quelle que soit la série, et retombait sur la série ENTIÈRE quand la
   * fenêtre demandée ne contenait pas deux points — en laissant le bouton allumé.
   * Cliquer « 7J » sur une série qui n'a qu'un point par semaine affichait donc un an
   * de données sous une étiquette qui annonçait sept jours.
   *
   * Un palier qui ne trouve pas deux points est désormais ABSENT. La rangée dit ainsi
   * ce que la série permet, ce qui est aussi une information : une courbe qui n'offre
   * que « MAX » annonce d'elle-même qu'elle est courte.
   */
  const offered = useMemo(
    () => RANGES.filter((preset) => !preset.days || windowOf(points, preset.days).length > 1),
    [points],
  )

  /* Le palier demandé peut ne pas être offert par CETTE série — le dernier de la
     liste offerte est alors le plus proche de l'intention « le plus large ». */
  const active = offered.some((preset) => preset.id === rangeId)
    ? rangeId
    : (offered[offered.length - 1]?.id ?? 'max')

  const shown = useMemo(() => {
    /*
     * ⚠️ LA FENÊTRE PART DU DERNIER POINT, PAS DE L'HEURE COURANTE.
     *
     * `Date.now()` pendant le rendu est une fonction IMPURE : deux rendus successifs
     * du même composant donneraient deux découpages différents, et le linter de React
     * le refuse — à raison, c'est la définition d'un rendu non idempotent.
     *
     * Le dernier point est de toute façon le bon repère. Une série quotidienne se
     * termine à la clôture de la veille : compter « sept jours avant maintenant »
     * amputait la fenêtre d'un point sur les séries qui ne vont pas jusqu'à l'instant
     * présent — et de plusieurs sur une série de marché fermé le week-end.
     */
    const preset = RANGES.find((entry) => entry.id === active)
    return windowOf(points, preset?.days ?? null)
  }, [points, active])

  const first = shown[0]?.y
  const last = shown[shown.length - 1]?.y
  const change =
    typeof first === 'number' && typeof last === 'number' && first !== 0
      ? ((last - first) / first) * 100
      : undefined

  /*
   * ── AU-DELÀ DE MILLE POUR CENT, ON COMPTE EN MULTIPLES ────────────────────
   *
   * ⚠️ Relevé au navigateur sur la série des stablecoins, dont la source remonte à
   * 2017 : le cadre annonçait « +280 956 173,19 % ». Le chiffre est exact et
   * illisible — personne ne convertit huit chiffres en ordre de grandeur.
   *
   * « ×2 810 » dit la même chose et se lit. Le seuil est posé à mille pour cent,
   * c'est-à-dire là où le pourcentage cesse d'être une intuition : en dessous, « +340 % »
   * se comprend encore d'un coup d'œil.
   */
  const multiple =
    change !== undefined && change > 1_000 && typeof first === 'number' && typeof last === 'number'
      ? last / first
      : undefined

  /*
   * ── L'AXE PORTE L'ANNÉE DÈS QUE LA FENÊTRE DÉPASSE DIX-HUIT MOIS ──────────
   *
   * Il écrivait « 5 févr. » sans millésime quelle que soit la profondeur. Sur une
   * série de huit ans, les graduations devenaient indéchiffrables : trois dates sans
   * année sur une courbe qui traverse une décennie ne situent rien.
   */
  const span =
    shown.length > 1 ? (shown[shown.length - 1] as GlobalChartPoint).t - (shown[0] as GlobalChartPoint).t : 0
  const longSpan = span > 18 * 30 * 86_400_000

  const value =
    typeof last !== 'number'
      ? '—'
      : format === 'percent'
        ? `${last.toFixed(2)} %`
        : format === 'money'
          ? (formatCurrency(last, currency, { compact: true }) ?? '—')
          : (formatCompact(last) ?? '—')

  /* ── UNE SEULE TEINTE POUR TOUTES LES FIGURES D'AGRÉGAT ────────────────────

     `colorIndex` distribuait six couleurs — violet pour la capitalisation, orange pour
     le volume, rose pour la dominance. Six teintes sur six cartes qui portent chacune
     UNE série : la couleur ne distinguait donc rien que le cadre et le titre ne
     disaient déjà, et la page se lisait comme six catégories qui n'en sont pas.

     ASXN emploie la MÊME teinte partout (voir `AGGREGATE_TONE`). C'est ce qui donne à
     leur tableau de bord son unité, et c'est ce qui manquait ici.

     `colorIndex` reste accepté et ignoré : une quinzaine d'appelants le passent, et le
     retirer partout ne changerait rien à l'écran. Il documente encore quelle carte est
     laquelle à la lecture. */
  void colorIndex
  const color = AGGREGATE_TONE

  /* Bornes imposées quand la série est entièrement positive — voir la note sur
     `yDomain` plus bas. Le plafond garde une marge de 6 %, pour que le sommet de la
     courbe ne touche pas le bord du cadre. */
  const values = shown.map((point) => point.y)
  const lowest = values.length > 0 ? Math.min(...values) : 0
  const highest = values.length > 0 ? Math.max(...values) : 0
  /* ⚠️ SAUF EN POURCENTAGE. Une part qui vit entre 64 et 68 % sur un axe partant de
     zéro devient une droite : c'est le seul cas où l'échelle doit se resserrer sur les
     données. Les montants, eux, partent de zéro — c'est ce que fait la référence sur
     sa capitalisation totale, et cela évite de lire une baisse de 3 % comme un
     effondrement. */
  const floor = format !== 'percent' && lowest >= 0 ? 0 : undefined
  const ceiling = highest > 0 ? highest * 1.06 : 1

  return (
    /* ── LES TROIS MESURES D'ASXN, ET RIEN DE PLUS ───────────────────────────

       Cette carte portait DÉJÀ leur structure — titre et périodes sur une ligne,
       valeur et variation sur la suivante, graphique en dessous. Ce sont les trois
       rangées relevées chez eux, et elles étaient là avant le relevé.

       Trois valeurs seulement diffèrent, mesurées sur leur grande carte le
       2026-09-02 : rayon 14 px (contre 12 pour `rounded-card`), rembourrage 20 px
       (contre 16), gouttière 8 px entre les rangées.

       Deux pixels de rayon et quatre de rembourrage ne se voient pas isolément. Sur
       une page qui en aligne six à côté des bandes de `StatCard`, la
       différence se lit comme deux familles de cartes au lieu d'une. */
    <section className="flex flex-col gap-2 rounded-[14px] border border-border-subtle bg-surface p-5">
      {/* ── EN-TÊTE : LE TITRE À GAUCHE, LES PALIERS À DROITE ────────────────
          C'est la disposition de la référence, et elle tient parce que les paliers
          n'appartiennent qu'à CE cadre : les poser ailleurs ferait croire qu'ils
          commandent la page entière, ce que faisait l'ancien explorateur. */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-1 text-sm font-semibold text-ink">
            {t(title)}
            {/* Le ⓘ de la référence : il porte ce que le titre ne peut pas dire en
                trois mots — l'assiette de la courbe, ses limites. */}
            {info ? <InfoTip content={t(info)} label={t(title)} /> : null}
          </h2>
          {hint ? <p className="mt-0.5 text-xs text-ink-muted">{t(hint)}</p> : null}
        </div>

        {/* ⚠️ `w-full` SOUS `sm`, ET C'EST UNE CORRECTION DE DÉBORDEMENT. Six paliers
            et deux boutons d'action font environ trois cents pixels : sur un écran de
            375, posés à droite du titre, ils poussaient la carte hors du cadre de
            24 px — relevé par `audit-responsive` sur l'iPhone SE. Sur les petits
            écrans la barre prend donc sa propre ligne, et le groupe de paliers peut
            lui-même se replier. */}
        <div className="flex w-full shrink-0 flex-wrap items-center gap-1.5 sm:w-auto sm:justify-end">
          <div className="flex flex-wrap items-center gap-0.5 rounded-control bg-surface-muted p-0.5">
            {offered.map((preset) => (
              <button
                key={preset.id}
                type="button"
                aria-pressed={preset.id === active}
                onClick={() => setRangeId(preset.id)}
                className={`rounded-control px-2 py-1 text-micro font-semibold transition-colors duration-150 ${
                  preset.id === active
                    ? 'bg-surface text-ink shadow-sm'
                    : 'text-ink-muted hover:text-ink'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* ── EXPORT ET INTÉGRATION, comme sur la référence ─────────────────
              L'export porte sur la FENÊTRE AFFICHÉE et non sur la série entière :
              c'est ce qu'on regarde, et un fichier qui contiendrait autre chose que
              le graphique d'où on l'a tiré serait un piège. */}
          <IconButton
            size="icon-xs"
            variant="ghost"
            label={t('Télécharger les données affichées (CSV)')}
            icon={Download}
            onClick={() => downloadCsv(t(title), shown, format, currency)}
          />

          {embedId ? <EmbedButton embedId={embedId} title={t(title)} /> : null}
        </div>
      </div>

      {/* La VALEUR COURANTE et la variation SUR LA FENÊTRE choisie. La seconde suit le
          palier — c'est ce qui rend les boutons utiles au-delà du tracé : « +12 % sur
          trois mois » se lit sans mesurer la pente à l'œil. */}
      {/* Plus de `mt-2` : la gouttière de 8 px du conteneur flex l'a remplacée.
          Deux mécanismes d'espacement sur la même pile finissent par diverger. */}
      <div className="flex items-baseline gap-2">
        {/* 3xl (30 px) et non 2xl (28) : la valeur mesurée chez eux fait 30 px en
            graisse 600. C'est ce rapport d'un à deux et demi avec l'intitulé qui fait
            qu'on lit le chiffre AVANT de savoir ce qu'il mesure. */}
        <p className="figure text-3xl font-semibold leading-tight text-ink">{value}</p>
        {multiple !== undefined ? (
          <span className="tabular text-sm font-medium text-up">
            ×{new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(multiple)}
          </span>
        ) : change !== undefined ? (
          <ChangeBadge value={change} />
        ) : null}
      </div>

      <div className="mt-1">
        <AreaPlot
          /* Le filigrane suit la TAILLE et non la carte : la même figure sert de
             grande vignette (320) et de petite (200), et un mot posé derrière deux
             cents pixels recouvre la courbe au lieu de la tramer. */
          height={large ? 320 : 200}
          watermark={large}
          {...(bars ? { bars: true } : {})}
          /* Le dégradé n'a de sens que sous une AIRE : il prolonge la courbe vers le
             bas. Sous des barres, il peindrait un voile derrière elles sans rien
             ajouter — leur aplat porte déjà toute la surface. */
          fill={!bars}
          axes
          grid
          /* ⚠️ PAS DE GRADUATION NÉGATIVE SOUS UNE SÉRIE QUI NE PEUT PAS L'ÊTRE.
             `AreaPlot` déduit ses bornes des données avec une marge, et sur un volume
             très irrégulier cette marge passait sous zéro : l'axe écrivait
             « −9,66 Md € » sous une courbe de volumes. Le plancher est donc posé à
             zéro dès que la série est entièrement positive — jamais autrement, une
             série qui contient de vraies valeurs négatives doit les montrer. */
          {...(floor === undefined ? {} : { yDomain: [floor, ceiling] as [number, number] })}
          ariaLabel={t(title)}
          series={[{ id: 'serie', label: t(title), color, points: shown.map((p) => ({ x: p.t, y: p.y })) }]}
          formatX={(x) =>
            new Intl.DateTimeFormat(
              locale,
              longSpan
                ? { month: 'short', year: 'numeric' }
                : { day: 'numeric', month: 'short' },
            ).format(new Date(x))
          }
          formatY={(y) =>
            format === 'percent'
              ? `${Math.round(y)} %`
              : format === 'money'
                ? (formatCurrency(y, currency, { compact: true }) ?? '')
                : (formatCompact(y) ?? '')
          }
          formatTooltipX={(x) =>
            new Intl.DateTimeFormat(locale, {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            }).format(new Date(x))
          }
          formatTooltipY={(y) =>
            format === 'percent'
              ? `${y.toFixed(2)} %`
              : format === 'money'
                ? (formatCurrency(y, currency, { compact: true }) ?? '')
                : (formatCompact(y) ?? '')
          }
        />
      </div>

      {/* ── LA LIGNE DE TOTAUX ───────────────────────────────────────────────
          La référence ferme son grand cadre par « 17 569 pièces · 1 494 places ·
          754 catégories ». Ce n'est pas de la décoration : ces trois nombres disent
          l'ASSIETTE de la courbe au-dessus, c'est-à-dire ce qu'elle compte. */}
      {footer ? (
        <div className="mt-3 border-t border-border-subtle pt-3 text-center text-xs text-ink-muted">
          {footer}
        </div>
      ) : null}

      {note ? <div className="mt-3 text-xs leading-relaxed text-ink-muted">{note}</div> : null}
    </section>
  )
}

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * EXPORT CSV — LA FENÊTRE AFFICHÉE, PAS LA SÉRIE ENTIÈRE
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── UN SEUL FORMAT, ET C'EST UN CHOIX ─────────────────────────────────────
 *
 * La référence propose CSV et Excel. Le second demanderait une bibliothèque de
 * plusieurs centaines de kilooctets pour produire un fichier qu'Excel ouvre déjà
 * depuis le premier. Un bouton de plus qui télécharge le même contenu serait un
 * doublon déguisé ; il n'y en a donc qu'un.
 *
 * ── LE SÉPARATEUR EST LE POINT-VIRGULE ────────────────────────────────────
 *
 * ⚠️ Excel en locale française lit un `.csv` séparé par des VIRGULES comme une seule
 * colonne — c'est la cause première des « exports cassés » signalés par les
 * utilisateurs francophones. Le point-virgule est ce que cette locale attend, et la
 * ligne `sep=;` en tête le dit explicitement aux versions qui ne le devinent pas.
 *
 * Les valeurs gardent le POINT décimal : le fichier reste lisible par un tableur
 * anglophone, par `pandas` et par un `awk`, là où une virgule décimale ne serait
 * lisible que par la moitié d'entre eux.
 */
function downloadCsv(
  title: string,
  points: GlobalChartPoint[],
  format: 'money' | 'percent' | 'plain',
  currency: string,
) {
  /* `toUpperCase` : la devise circule en minuscules dans les réponses des sources
     (`eur`), et un en-tête « valeur (eur) » se lit comme une faute. */
  const unit = format === 'money' ? currency.toUpperCase() : format === 'percent' ? '%' : ''
  const header = `valeur${unit ? ` (${unit})` : ''}`

  const lines = [
    'sep=;',
    `date;${header}`,
    ...points.map((point) => `${new Date(point.t).toISOString().slice(0, 10)};${point.y}`),
  ]

  /* `﻿` en tête : sans cette marque d'ordre des octets, Excel lit le fichier en
     ANSI et les accents des en-têtes sortent en mojibake.

     ⚠️ NE PAS TENTER DE LE VÉRIFIER AVEC `blob.text()`. Ce décodeur RETIRE la marque
     en tête, conformément à la spécification : le test rend alors « pas de BOM » sur
     un fichier qui en porte un. C'est `arrayBuffer()` qui dit la vérité — les trois
     premiers octets doivent être EF BB BF, ce qui a été vérifié au navigateur. */
  const BOM = '﻿'
  const blob = new Blob([`${BOM}${lines.join('\n')}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = `zenkuu-${slug(title)}.csv`
  link.click()

  /*
   * ⚠️ LA RÉVOCATION EST DIFFÉRÉE D'UN TOUR DE BOUCLE, ET CE N'EST PAS DE LA
   * PRUDENCE DÉCORATIVE.
   *
   * Elle suivait `click()` immédiatement. Vérifié au navigateur en interceptant le
   * lien : l'URL était DÉJÀ invalide quand on tentait de la relire — le navigateur
   * n'a pas fini de lire le blob au retour de `click()`, qui ne fait qu'inscrire le
   * téléchargement dans la file.
   *
   * `setTimeout(…, 0)` laisse la file se vider avant de libérer la mémoire. Ne jamais
   * révoquer fuirait le blob à chaque export.
   */
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

function slug(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * Le bouton `</>` de la référence — le code d'intégration de CETTE courbe.
 *
 * L'adresse pointe vers `/embed/graphique`, une route réelle et sans habillage. Le
 * code est donné à copier plutôt qu'à retenir, et il est affiché en entier : un champ
 * tronqué obligerait à faire confiance au bouton.
 */
function EmbedButton({ embedId, title }: { embedId: string; title: string }) {
  const t = usePhrase()
  /* `origin` est lu à la volée et non au rendu : ce composant est hydraté côté
     client, et le serveur ne connaît pas le domaine sous lequel il est servi. */
  const [snippet, setSnippet] = useState('')

  return (
    <Popover
      onOpenChange={(open) => {
        if (open) {
          setSnippet(
            `<iframe src="${window.location.origin}/embed/graphique?serie=${embedId}" width="100%" height="320" frameborder="0" title="${title} — ZENKUU"></iframe>`,
          )
        }
      }}
    >
      {/* ⚠️ `PopoverTrigger` EST LE BOUTON. Ce popover vient de Radix, dont le
          déclencheur rend lui-même un `<button>` : y glisser notre `IconButton` par
          `asChild` empilerait deux boutons — HTML invalide, et un piège au clavier.
          Les classes reprennent celles d'`IconButton` pour que les trois boutons de
          la barre d'outils se ressemblent. */}
      <PopoverTrigger
        aria-label={t('Code d’intégration')}
        className="inline-flex size-6 shrink-0 items-center justify-center rounded-control text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Code2 className="size-3.5" aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent className="w-[min(28rem,90vw)] space-y-2">
        <p className="text-xs font-semibold text-ink">{t('Intégrer ce graphique')}</p>
        <div className="flex items-start gap-2">
          <code className="tabular block max-h-24 flex-1 overflow-auto rounded-card bg-surface-muted p-2 text-micro leading-relaxed text-ink-muted">
            {snippet}
          </code>
          <CopyButton value={snippet} label={t('Copier le code d’intégration')} />
        </div>
        <p className="text-micro text-ink-muted">
          {t('Le graphique se met à jour tout seul : le cadre affiche toujours les dernières données.')}
        </p>
      </PopoverContent>
    </Popover>
  )
}
