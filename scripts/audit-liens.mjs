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

const BASE = process.env.AUDIT_BASE ?? 'http://localhost:3000'

const ROUTES = [
  '/', '/marches', '/crypto', '/crypto/bitcoin', '/crypto/all-coins',
  '/crypto/nouvelles', '/actions', '/actions/aapl', '/categories',
  '/comparateur', '/convertisseur', '/screener', '/actualites', '/heatmap',
  '/sentiment', '/tableau-de-bord', '/aide', '/bien-demarrer',
  '/pourquoi-zenkuu', '/a-propos', '/nouveautes', '/parametres', '/connexion',
  '/graphiques', '/places', '/classements',
]

const navigateur = await chromium.launch()
const page = await (await navigateur.newContext({ viewport: { width: 1440, height: 900 } })).newPage()

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
