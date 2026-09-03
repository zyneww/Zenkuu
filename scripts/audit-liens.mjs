/**
 * ══════════════════════════════════════════════════════════════════════════════
 * AUDIT DES LIENS — CHAQUE DESTINATION RENDUE EXISTE-T-ELLE ?
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ⚠️ IL LIT LES LIENS RENDUS, PAS LE CODE SOURCE.
 *
 * Une extraction statique des `href="/…"` ne trouve que les destinations écrites
 * en clair : sur ce site elles sont vingt-cinq, quand une seule page en rend
 * davantage. Presque tous les liens sont construits — `href={route}`,
 * `` href={`/crypto/${id}`} `` — et sortent du champ d'un `grep`. Pire, le seul
 * relevé qu'une telle extraction a produit était un exemple dans un commentaire.
 *
 * On charge donc les pages et on ramasse ce que le navigateur a réellement posé
 * dans le document.
 *
 * ── CE QU'IL VÉRIFIE, ET CE QU'IL LAISSE ───────────────────────────────────
 *
 * Les destinations INTERNES uniquement. Un lien sortant qui répond 403 ne dit rien
 * de ZENKUU : les éditeurs de presse refusent couramment une requête sans
 * navigateur, et l'on passerait la journée à poursuivre des refus qui n'en sont
 * pas — c'est déjà arrivé sur `/actualites`.
 *
 * ⚠️ ET IL SUIT LES REDIRECTIONS. Une ancienne route qui renvoie 308 vers sa
 * remplaçante n'est pas cassée : c'est précisément le contrat que le projet s'est
 * donné en déplaçant ses pages.
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

const navigateur = await chromium.launch()
const page = await (await navigateur.newContext({ viewport: { width: 1440, height: 900 } })).newPage()

/* La liste est découverte à l'ouverture : routes statiques lues dans `app/[locale]`,
   plus un exemplaire vivant de chaque motif dynamique, pêché dans les liens rendus. */
const decouverte = await routesAudit(page, BASE)
ROUTES = decouverte.routes
if (decouverte.manquantes.length)
  console.log('motifs sans exemplaire vivant : ' + decouverte.manquantes.join(', '))
console.log(ROUTES.length + ' routes à parcourir.\n')

const destinations = new Map()
for (const route of ROUTES) {
  try {
    await page.goto(BASE + '/fr' + (route === '/' ? '' : route), {
      waitUntil: 'domcontentloaded',
      timeout: 120_000,
    })
    await page.waitForTimeout(4000)
    const liens = await page.evaluate(() =>
      [...document.querySelectorAll('a[href]')]
        .map((a) => a.getAttribute('href'))
        .filter((h) => h && h.startsWith('/')),
    )
    for (const l of liens) {
      const propre = l.split('#')[0].split('?')[0]
      if (propre.length > 1 && !destinations.has(propre)) destinations.set(propre, route)
    }
    console.log(`${route.padEnd(22)} ${liens.length} liens`)
  } catch (error) {
    console.log(`${route.padEnd(22)} ÉCHEC ${String(error.message).slice(0, 60)}`)
  }
}

await navigateur.close()

console.log(`\n${destinations.size} destinations internes distinctes — vérification…\n`)
const casses = []
for (const [dest, depuis] of [...destinations].sort()) {
  try {
    const r = await fetch(BASE + dest, { redirect: 'follow' })
    if (!r.ok) casses.push(`${r.status}  ${dest.padEnd(40)} (rendu sur ${depuis})`)
  } catch (error) {
    casses.push(`ERR  ${dest.padEnd(40)} (rendu sur ${depuis})  ${String(error).slice(0, 40)}`)
  }
}
console.log(casses.length ? casses.join('\n') : 'Toutes les destinations répondent.')
