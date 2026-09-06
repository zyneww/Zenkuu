import type { MarketAsset } from '@zenkuu/data'

import { ChangeBadge } from '@/components/locale/ChangeBadge'
import { getPhrase } from '@/lib/content'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * LE BANDEAU DE VARIATIONS — SIX FENÊTRES SOUS LE GRAPHIQUE
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Forme de CoinGecko, demandée d'après capture : une rangée d'intitulés — 1 h,
 * 24 h, 7 j, 14 j, 30 j, 1 an — et sous chacun sa variation, colorée et fléchée,
 * le tout dans un cadre à colonnes séparées par des filets.
 *
 * ── IL AVAIT ÉTÉ RETIRÉ, ET LA NOTE QUI LE RETIRAIT AVAIT UN ARGUMENT ────────
 *
 * `AssetPageView` a longtemps porté à cet endroit un bandeau équivalent, supprimé
 * sur demande. Le motif alors inscrit : « le RAIL DE GAUCHE porte déjà ces six
 * mêmes valeurs, sous le titre "Variations" ». C'est exact, et ça l'est encore.
 *
 * Ce que l'argument ne pesait pas, c'est la DISTANCE de lecture. Le rail répond à
 * « combien sur sept jours ? » posée à froid ; ce bandeau répond à la même question
 * posée EN REGARDANT la courbe, c'est-à-dire l'œil déjà sur le graphique. Sur une
 * colonne large, les deux points sont à sept cents pixels l'un de l'autre, et c'est
 * précisément le trajet que la référence évite en posant la rangée sous le tracé.
 *
 * Le doublon est donc assumé — comme celui du cours, présent à la fois dans la
 * bande de l'en-tête et sur le dernier point de la courbe.
 *
 * ── CE QU'IL NE FAIT PAS ─────────────────────────────────────────────────────
 *
 * Aucun appel, aucun calcul : les six champs arrivent dans la réponse de marché
 * déjà chargée par la fiche. Une fenêtre absente affiche un tiret plutôt que rien —
 * la grille a six colonnes fixes, et en escamoter une décalerait les cinq autres
 * d'un actif à l'autre.
 *
 * ⚠️ TOUTES LES SOURCES NE PUBLIENT PAS LES SIX. La BCE n'expose qu'un taux par
 * jour ouvré, Yahoo que la variation du jour (voir `MarketAsset`). Si AUCUNE des
 * six n'est renseignée, le bandeau ne se rend pas : six tirets sous six intitulés
 * ne renseignent sur rien et occupent la place d'une information.
 */
const FENETRES = [
  { cle: 'change1h', libelle: '1 h' },
  { cle: 'change24h', libelle: '24 h' },
  { cle: 'change7d', libelle: '7 j' },
  { cle: 'change14d', libelle: '14 j' },
  { cle: 'change30d', libelle: '30 j' },
  { cle: 'change1y', libelle: '1 an' },
] as const satisfies readonly { cle: keyof MarketAsset; libelle: string }[]

type CleFenetre = (typeof FENETRES)[number]['cle']

/**
 * Lecture défensive d'une fenêtre.
 *
 * `MarketAsset` type ces champs en `number | undefined`, mais ils viennent d'une
 * réponse réseau : un `null` ou une chaîne y passeraient le typage sans passer le
 * rendu. Le contrôle de finitude écarte aussi les `NaN` et les infinis, qu'une
 * division par zéro en amont peut produire.
 */
function lire(asset: MarketAsset, cle: CleFenetre): number | undefined {
  const valeur = asset[cle]
  return typeof valeur === 'number' && Number.isFinite(valeur) ? valeur : undefined
}

export async function AssetChangeStrip({ asset }: { asset: MarketAsset }) {
  const t = await getPhrase()

  const valeurs = FENETRES.map(({ cle, libelle }) => ({ libelle, valeur: lire(asset, cle) }))

  /* Aucune des six : voir l'en-tête. On ne rend pas un cadre de tirets. */
  if (valeurs.every(({ valeur }) => valeur === undefined)) return null

  return (
    /*
      ── UNE GRILLE, ET NON UN TABLEAU ─────────────────────────────────────────
      `AssetPerformanceMatrix` est un tableau parce qu'il croise DEUX axes — des
      paires en lignes, des fenêtres en colonnes — et qu'un lecteur d'écran doit
      pouvoir annoncer « BTC/ETH, 7 j ». Ici il n'y a qu'un axe : six couples
      « intitulé → valeur ». Un `<table>` d'une seule ligne de données forcerait à
      annoncer un en-tête de colonne pour chaque cellule, ce qui rallonge sans rien
      apprendre. Une liste de définitions dit exactement la structure réelle.

      `overflow-hidden` sur le cadre : les cellules portent des filets pleine
      hauteur, et sans lui les deux du bord dépasseraient l'arrondi des coins.
    */
    <dl className="grid grid-cols-3 overflow-hidden rounded-card border border-border-subtle bg-panel sm:grid-cols-6">
      {valeurs.map(({ libelle, valeur }) => (
        /*
          `border-l` sur toutes sauf la première de chaque rangée : le filet
          appartient à la cellule qui le suit, donc il disparaît avec elle si la
          grille se replie. `[&:nth-child(3n+1)]:border-l-0` couvre la grille à
          trois colonnes du téléphone, `sm:[&:nth-child(3n+1)]:border-l` la rétablit
          quand on repasse à six — sans quoi les colonnes 4 et 7 resteraient nues.

          `border-t` à partir de la deuxième rangée, en trois colonnes seulement :
          à six, il n'y a qu'une rangée et le trait n'aurait rien à séparer.
        */
        /*
          Le rembourrage est porté par `dt` et `dd`, PAS par la cellule : c'est ce
          qui permet au filet sous l'intitulé de traverser toute la colonne, d'un
          filet vertical à l'autre. Posé sur une cellule rembourrée, il se serait
          arrêté à douze pixels de chaque bord et se serait lu comme un
          soulignement de mot.

          L'intitulé porte aussi `bg-surface` : c'est la bande grise de la
          référence, celle qui distingue la rangée d'en-têtes de celle des valeurs
          sans avoir à changer la graisse du texte.
        */
        <div
          key={libelle}
          className="border-l border-t border-border-subtle text-center [&:nth-child(-n+3)]:border-t-0 [&:nth-child(3n+1)]:border-l-0 sm:border-t-0 sm:[&:nth-child(3n+1)]:border-l sm:[&:nth-child(1)]:border-l-0"
        >
          <dt className="border-b border-border-subtle bg-surface px-3 py-1.5 text-micro font-medium leading-tight text-ink-muted">
            {t(libelle)}
          </dt>
          <dd className="px-3 py-2 leading-tight">
            {valeur === undefined ? (
              <span className="text-xs text-ink-muted">—</span>
            ) : (
              <ChangeBadge value={valeur} size="sm" />
            )}
          </dd>
        </div>
      ))}
    </dl>
  )
}
