/**
 * ══════════════════════════════════════════════════════════════════════════════
 * AUDIT DES SURFACES — LES FONDS PEINTS APPARTIENNENT-ILS À LA RAMPE ?
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * DESIGN_BACKPACK.md décrit une obsidienne à cinq niveaux — L0 la page, L1 les
 * cartes et les surfaces flottantes, L2 les blocs imbriqués, L3 le survol, L4
 * l'état actif — et un pendant clair. Une surface hors rampe ne se voit pas :
 * deux gris voisins se ressemblent, et c'est justement pourquoi les écarts
 * survivent aux relectures. Le premier relevé de ce type a trouvé un menu de
 * recherche et un calendrier peints dans un bleu qui n'appartenait à personne.
 *
 * ── CE QU'IL MESURE ────────────────────────────────────────────────────────
 *
 * Les fonds CALCULÉS des surfaces empilées — cartes, panneaux, boîtes de dialogue,
 * menus — dans les DEUX thèmes, comparés aux valeurs des jetons lues sur la page
 * elle-même. Rien n'est écrit en dur ici : la rampe de référence vient de
 * `getComputedStyle(document.documentElement)`, si bien que le contrôle suit le
 * design system au lieu d'en figer une copie qui dériverait en silence.
 *
 * ⚠️ LES FONDS TRANSPARENTS SONT IGNORÉS. `rgba(0,0,0,0)` n'est pas une surface :
 * l'élément laisse voir celle du dessous, qui est elle-même mesurée. Les compter
 * ferait du bruit sur chaque `<div>` de mise en page.
 *
 * ⚠️ ET LES VOILES NON PLUS. Un fond semi-transparent — le rideau d'une modale, une
 * barre translucide — est un effet assumé, pas un niveau de la rampe : sa couleur
 * peinte dépend de ce qu'il recouvre et ne peut pas, par construction, tomber sur
 * une valeur de jeton.
 */

import { chromium } from 'playwright'
import { routesAudit } from './routes-audit.mjs'

const BASE = process.env.AUDIT_BASE ?? 'http://localhost:3000'

/*
 * ⚠️ LA LISTE VIENT DE `routes-audit.mjs`, ET N'EST PAS RECOPIÉE ICI.
 *
 * Une liste écrite à la main ne suit pas une application qui grandit : celle qui
 * vivait dans ces fichiers en couvrait moins de la moitié, et l'omission ne se
 * signale pas — une page non visitée passe pour saine.
 */
let ROUTES = []

/* Les jetons qui décrivent une surface. Les autres — encre, bordures, accents —
   n'ont rien à faire dans un fond, et leur présence serait elle-même un défaut. */
const JETONS = [
  '--color-canvas', '--color-surface', '--color-surface-muted',
  '--color-surface-raised', '--color-overlay', '--color-hover',
  '--color-active', '--color-brand', '--color-up', '--color-down',
]

const mesurer = (page) =>
  page.evaluate((jetons) => {
    const racine = getComputedStyle(document.documentElement)
    /* La rampe de référence est LUE, jamais recopiée : le contrôle suit le design
       system au lieu d'en figer une copie qui dériverait sans qu'on le voie. */
    const sonde = document.createElement('span')
    sonde.style.display = 'none'
    document.body.appendChild(sonde)
    const rampe = new Set()
    for (const j of jetons) {
      const v = racine.getPropertyValue(j).trim()
      if (!v) continue
      sonde.style.backgroundColor = v
      const peint = getComputedStyle(sonde).backgroundColor
      if (peint && peint !== 'rgba(0, 0, 0, 0)') rampe.add(peint)
    }
    sonde.remove()

    const hors = {}
    for (const el of document.querySelectorAll('body *')) {
      const s = getComputedStyle(el)
      const fond = s.backgroundColor
      if (!fond || fond === 'rgba(0, 0, 0, 0)') continue
      /* Un voile est un effet, pas un niveau : sa couleur peinte dépend de ce
         qu'il recouvre et ne peut pas tomber sur une valeur de jeton. */
      if (/^rgba\(.*,\s*(0(\.\d+)?)\)$/.test(fond)) continue
      if (rampe.has(fond)) continue
      const r = el.getBoundingClientRect()
      if (r.width < 24 || r.height < 16) continue
      const cle = fond + '  ' + el.tagName.toLowerCase() + '.' +
        String(el.className || '').split(' ').slice(0, 2).join('.')
      hors[cle] = (hors[cle] ?? 0) + 1
    }
    return { rampe: [...rampe], hors: Object.entries(hors).sort((a, b) => b[1] - a[1]).slice(0, 5) }
  }, JETONS)

const navigateur = await chromium.launch()
const contexte = await navigateur.newContext({ viewport: { width: 1440, height: 900 } })
const page = await contexte.newPage()

/* La liste est découverte à l'ouverture : routes statiques lues dans `app/[locale]`,
   plus un exemplaire vivant de chaque motif dynamique, pêché dans les liens rendus. */
const decouverte = await routesAudit(page, BASE)
ROUTES = decouverte.routes
if (decouverte.manquantes.length)
  console.log('motifs sans exemplaire vivant : ' + decouverte.manquantes.join(', '))
console.log(ROUTES.length + ' routes à parcourir.\n')

let total = 0
for (const theme of ['sombre', 'clair']) {
  console.log('\n══ THÈME ' + theme.toUpperCase() + ' ' + '═'.repeat(46))
  for (const route of ROUTES) {
    try {
      await page.goto(BASE + '/fr' + (route === '/' ? '' : route), {
        waitUntil: 'domcontentloaded',
        timeout: 120_000,
      })
      await page.evaluate((t) => {
        document.documentElement.classList.toggle('dark', t === 'sombre')
      }, theme)
      await page.waitForTimeout(4500)
      const { rampe, hors } = await mesurer(page)
      total += hors.length
      console.log(
        route.padEnd(20) +
          (hors.length === 0
            ? `✓  rampe de ${rampe.length} teintes, aucun écart`
            : hors.map(([c, n]) => `${n}× ${c.slice(0, 52)}`).join('\n' + ' '.repeat(20))),
      )
    } catch (error) {
      console.log(route.padEnd(20) + 'ÉCHEC ' + String(error.message).slice(0, 60))
    }
  }
}

await navigateur.close()
console.log('\n' + (total === 0 ? 'Toutes les surfaces sont dans la rampe.' : total + ' écarts à juger.'))
