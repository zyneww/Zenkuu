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

/*
 * ⚠️ LA RAMPE N'EST PLUS UNE LISTE, ELLE EST ÉNUMÉRÉE SUR LA PAGE.
 *
 * Dix jetons étaient nommés ici à la main. Le site en déclare plus de cent, et le
 * premier passage a signalé comme « hors rampe » `bg-brand-soft` (102 fois sur
 * `/actualites`), `--color-border-subtle` employé en fond, et les variantes douces
 * de hausse et de baisse. Tous appartiennent au design system ; c'était ma liste qui
 * ne le connaissait pas.
 *
 * C'est la troisième fois dans cette session qu'une énumération écrite à la main
 * remplace une source lisible — après la liste des routes et la « forme » d'une
 * adresse. La règle qui s'en dégage : quand le programme peut LIRE ce qu'il vérifie,
 * l'écrire à la main n'est pas une simplification, c'est un second bogue en attente.
 */

const mesurer = (page) =>
  page.evaluate(() => {
    const racine = getComputedStyle(document.documentElement)
    /* Toutes les propriétés `--color-*` déclarées, quelles qu'elles soient : c'est le
       design system lui-même qui dit ce qui est une teinte légitime. */
    const jetons = [...racine].filter((nom) => nom.startsWith('--color-'))

    const sonde = document.createElement('span')
    sonde.style.display = 'none'
    document.body.appendChild(sonde)
    const rampe = new Set()
    for (const j of jetons) {
      const v = racine.getPropertyValue(j).trim()
      if (!v) continue
      sonde.style.backgroundColor = ''
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
      /*
       * Un voile est un effet, pas un niveau : sa couleur peinte dépend de ce qu'il
       * recouvre et ne peut pas tomber sur une valeur de jeton.
       *
       * ⚠️ LE TEST NE PEUT PAS SUPPOSER LA SYNTAXE `rgba()`. Chrome rend les couleurs
       * issues d'un mélange en `oklab(L a b / α)` — c'est sous cette forme que les
       * fonds translucides du site sont revenus, et l'ancien test, qui n'attendait que
       * `rgba(…)`, les laissait tous passer pour des écarts. On cherche donc l'alpha
       * là où il se trouve dans les DEUX écritures : après une barre oblique, ou en
       * quatrième argument.
       */
      const apresBarre = fond.match(/\/\s*([\d.]+)\s*\)/)
      const quatrieme = fond.match(/^rgba?\([^)]*,\s*([\d.]+)\s*\)$/)
      const alpha = Number(apresBarre?.[1] ?? quatrieme?.[1] ?? 1)
      if (Number.isFinite(alpha) && alpha < 1) continue
      if (rampe.has(fond)) continue
      const r = el.getBoundingClientRect()
      if (r.width < 24 || r.height < 16) continue
      const cle = fond + '  ' + el.tagName.toLowerCase() + '.' +
        String(el.className || '').split(' ').slice(0, 2).join('.')
      hors[cle] = (hors[cle] ?? 0) + 1
    }
    return { rampe: [...rampe], hors: Object.entries(hors).sort((a, b) => b[1] - a[1]).slice(0, 5) }
  })

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
