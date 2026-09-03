/**
 * ══════════════════════════════════════════════════════════════════════════════
 * LA LISTE DES ROUTES À AUDITER — DÉRIVÉE, JAMAIS RECOPIÉE
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ⚠️ POURQUOI CE FICHIER EXISTE.
 *
 * Chaque script d'audit portait sa propre liste, écrite à la main. Elles comptaient
 * vingt-six routes quand l'application en sert SOIXANTE : `/derives`, `/devises`,
 * `/etf`, `/glossaire`, `/indices`, `/macro`, `/perpetuels`, `/rachats`, les cinq
 * pages de `/graphiques`… — toutes vivantes, aucune mesurée. Une liste recopiée à
 * la main ne suit pas une application qui grandit, et elle échoue en silence : un
 * audit qui ne visite pas une page la déclare saine.
 *
 * Les routes STATIQUES sont donc lues dans `app/[locale]`, à la source. Ajouter une
 * page suffit à la faire auditer ; en supprimer une la retire.
 *
 * ── LES ROUTES DYNAMIQUES ──────────────────────────────────────────────────
 *
 * `/crypto/[id]` n'est pas une adresse : il en faut une VRAIE, et l'écrire en dur
 * la ferait pourrir le jour où l'actif choisi disparaît de la source. On prend donc
 * un exemplaire vivant dans les liens que le site rend lui-même — c'est le seul
 * endroit où l'on est certain que l'adresse existe ET que le site y mène.
 *
 * ⚠️ LES ROUTES D'EMBARQUEMENT SONT ÉCARTÉES. `/embed/*` rend un fragment sans
 * en-tête ni pied de page, destiné à un `<iframe>` chez un tiers : le contrôle des
 * noms accessibles et du lien d'évitement n'y a pas de sens, et il n'y produirait
 * que du bruit.
 */

import { readdir } from 'node:fs/promises'
import { join } from 'node:path'

const APP = new URL('../apps/web/app/[locale]/', import.meta.url).pathname

/** Les segments dynamiques, repérés à leurs crochets. */
const DYNAMIQUE = /^\[.+\]$/

async function parcourir(dir, prefixe = '', statiques = [], motifs = []) {
  const entrees = await readdir(dir, { withFileTypes: true })
  const aUnePage = entrees.some((e) => e.isFile() && e.name === 'page.tsx')
  if (aUnePage) (prefixe.includes('[') ? motifs : statiques).push(prefixe || '/')

  for (const e of entrees) {
    if (!e.isDirectory()) continue
    /* Les groupes de routes `(nom)` n'apparaissent pas dans l'URL. */
    const segment = /^\(.+\)$/.test(e.name) ? '' : '/' + e.name
    await parcourir(join(dir, e.name), prefixe + segment, statiques, motifs)
  }
  return { statiques, motifs }
}

/**
 * Transforme un motif en expression : `/crypto/[id]/halving` accepte
 * `/crypto/bitcoin/halving` mais refuse `/crypto/bitcoin`.
 */
function versExpression(motif) {
  return new RegExp(
    '^' + motif.split('/').map((s) => (DYNAMIQUE.test(s) ? '[^/]+' : s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))).join('/') + '$',
  )
}

/**
 * La liste complète : toutes les routes statiques, plus un exemplaire vivant de
 * chaque motif dynamique, pêché dans les liens rendus par le site.
 *
 * @param {import('playwright').Page} page — déjà ouverte, pour la pêche.
 * @param {string} base — l'origine du serveur.
 */
export async function routesAudit(page, base = 'http://localhost:3000') {
  const { statiques, motifs } = await parcourir(APP)
  const utiles = statiques.filter((r) => !r.startsWith('/embed'))
  const aTrouver = motifs.filter((m) => !m.startsWith('/embed')).map((m) => ({ motif: m, exp: versExpression(m), url: null }))

  /* On pêche dans les pages d'INDEX : ce sont elles qui listent les fiches. Une
     page de fiche mène surtout à ses voisines, donc au même motif. */
  const viviers = ['/', '/crypto', '/actions', '/etf', '/indices', '/devises',
    '/matieres-premieres', '/categories', '/places', '/classements', '/aide', '/graphiques']

  async function pecher(vivier) {
    try {
      await page.goto(base + '/fr' + (vivier === '/' ? '' : vivier), { waitUntil: 'domcontentloaded', timeout: 120_000 })
      await page.waitForTimeout(3500)
      const liens = await page.evaluate(() =>
        [...document.querySelectorAll('a[href^="/"]')].map((a) => a.getAttribute('href')),
      )
      for (const brut of liens) {
        const l = String(brut).split('#')[0].split('?')[0].replace(/^\/(fr|en)(?=\/|$)/, '') || '/'
        for (const m of aTrouver) if (!m.url && m.exp.test(l)) m.url = l
      }
    } catch {
      /* Un vivier muet n'est pas une erreur : les autres suffisent en général. */
    }
  }

  for (const vivier of viviers) {
    if (aTrouver.every((m) => m.url)) break
    if (!utiles.includes(vivier) && vivier !== '/') continue
    await pecher(vivier)
  }

  /*
   * ⚠️ UNE SECONDE PASSE, SUR LES FICHES CETTE FOIS — ET ELLE EST NÉCESSAIRE.
   *
   * Neuf motifs ne se laissent pas prendre depuis un index, parce qu'AUCUN index n'y
   * mène : `/crypto/[id]/halving`, `/crypto/[id]/historique` et les six variantes de
   * `/metriques/[metrique]` ne sont liées que depuis la fiche de l'actif lui-même.
   * Les pêcher exige donc d'ouvrir d'abord une fiche — c'est-à-dire d'utiliser le
   * résultat de la première passe comme vivier de la seconde.
   *
   * Deux passes suffisent : la profondeur du site est de deux niveaux sous une fiche,
   * et une troisième ne ferait que revisiter des voisines du même motif.
   */
  for (const fiche of aTrouver.filter((m) => m.url).map((m) => m.url)) {
    if (aTrouver.every((m) => m.url)) break
    await pecher(fiche)
  }

  const trouvees = aTrouver.filter((m) => m.url).map((m) => m.url)
  const manquantes = aTrouver.filter((m) => !m.url).map((m) => m.motif)
  return { routes: [...utiles.sort(), ...trouvees.sort()], manquantes }
}
