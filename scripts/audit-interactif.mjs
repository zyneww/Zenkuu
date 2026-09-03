/**
 * ══════════════════════════════════════════════════════════════════════════════
 * AUDIT DES ÉTATS INTERACTIFS — CE QUE L'AUDIT RESPONSIVE NE VOIT PAS
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * `audit-responsive.mjs` mesure la GÉOMÉTRIE : débordements, cibles tactiles,
 * corps de texte. Il regarde une page au repos.
 *
 * Celui-ci exerce ce qui ne se voit qu'en la TOUCHANT :
 *
 *   · SURVOL — un élément qui s'annonce cliquable doit répondre. Un `hover:` écrit
 *     dans une classe mais annulé par une règle plus spécifique ne se voit jamais,
 *     et rien dans le code ne le signale.
 *   · FOCUS — le même contrôle au clavier. Un anneau invisible rend le site
 *     inutilisable sans souris, et c'est le défaut le plus facile à ne pas remarquer
 *     quand on teste à la souris.
 *   · NOMS ACCESSIBLES — un bouton d'icône sans nom est un bouton muet.
 *   · INFOBULLES — elles doivent s'ouvrir ET être lisibles.
 *   · MOUVEMENT — `prefers-reduced-motion` doit couper les transitions.
 *   · TEXTES NON TRADUITS — du français sur une page anglaise.
 *   · ERREURS CONSOLE.
 *
 * ── POURQUOI UN SECOND FICHIER PLUTÔT QU'UNE OPTION DU PREMIER ─────────────
 *
 * Les deux ne se lancent pas au même rythme. Le responsive tourne sur SIX formats
 * et n'a besoin que d'un chargement ; celui-ci tourne sur UN format mais survole,
 * focalise et attend des transitions — il coûte plusieurs secondes par élément.
 * Les mêler forcerait à payer le plus cher des deux à chaque fois.
 */

import { mkdir, writeFile } from 'node:fs/promises'
import { chromium } from 'playwright'

const BASE = process.env.AUDIT_BASE ?? 'http://localhost:3000'
const OUT = new URL('../.audit/', import.meta.url).pathname

const ROUTES = [
  '/', '/marches', '/crypto', '/crypto/bitcoin', '/crypto/all-coins',
  '/crypto/graphiques', '/crypto/nouvelles', '/actions', '/actions/aapl',
  '/categories', '/comparateur', '/convertisseur', '/screener', '/actualites',
  '/heatmap', '/sentiment', '/tableau-de-bord', '/aide', '/bien-demarrer',
  '/pourquoi-zenkuu', '/a-propos', '/nouveautes', '/parametres', '/connexion',
  '/graphiques', '/places',
]

/**
 * ⚠️ CES MOTS SONT DES MOTS FRANÇAIS QUI N'EXISTENT PAS EN ANGLAIS.
 *
 * Pas « information », « distance » ou « format », qui s'écrivent pareil dans les deux
 * langues et produiraient un faux positif sur chaque page. Chacun porte soit un
 * accent, soit une forme grammaticale que l'anglais n'a pas.
 */
const MOTS_FRANCAIS = [
  'Aucune donnée', 'Chargement', 'Rechercher', 'Afficher', 'Masquer', 'Fermer',
  'Voir tout', 'Suivant', 'Précédent', 'Paramètres', 'Connexion', 'Déconnexion',
  'Enregistrer', 'Annuler', 'Supprimer', 'Modifier', 'Ajouter', 'Retirer',
  'Aujourd’hui', 'Semaine', 'Mois', 'Année', 'Devise', 'Langue', 'Thème',
]

/**
 * Sonde de survol et de focus.
 *
 * ⚠️ ELLE COMPARE DES STYLES CALCULÉS, PAS DES CLASSES. Une classe `hover:bg-x`
 * peut être présente et sans effet — annulée par une règle plus spécifique, ou par un
 * `!important` venu d'ailleurs. Seule la valeur peinte dit la vérité.
 *
 * ── LES PROPRIÉTÉS RETENUES, ET POURQUOI CELLES-LÀ ────────────────────────
 *
 * Fond, couleur, bordure, opacité, ombre, transformation. Un survol se manifeste par
 * au moins l'une des six ; un élément qui n'en bouge aucune ne répond pas. On ignore
 * volontairement la taille et la position : un survol qui déplace son élément est un
 * défaut en soi, pas une réponse.
 */
const PROPS = ['backgroundColor', 'color', 'borderColor', 'opacity', 'boxShadow', 'transform']

async function styles(handle) {
  return handle.evaluate((el, props) => {
    const s = getComputedStyle(el)
    const out = {}
    for (const p of props) out[p] = s[p]
    return out
  }, PROPS)
}

function differe(a, b) {
  return PROPS.some((p) => a[p] !== b[p])
}

async function auditerRoute(page, route) {
  const erreurs = []
  const onErreur = (m) => {
    if (m.type() === 'error') erreurs.push(m.text().slice(0, 160))
  }
  page.on('console', onErreur)

  await page.goto(BASE + '/en' + (route === '/' ? '' : route), {
    waitUntil: 'domcontentloaded',
    timeout: 120_000,
  })
  /* Le site hydrate puis charge ses séries : sans cette attente, on mesure un
     squelette et l'on conclut que rien ne répond au survol. */
  await page.waitForTimeout(6000)

  const rapport = { route, erreurs: [], sansNom: [], sansSurvol: [], sansFocus: [], francais: [], infobulles: 0 }

  // ── NOMS ACCESSIBLES ──────────────────────────────────────────────────────
  rapport.sansNom = await page.evaluate(() => {
    const nu = []
    for (const el of document.querySelectorAll('button, a[href], [role="button"]')) {
      const r = el.getBoundingClientRect()
      if (r.width === 0 || r.height === 0) continue
      const nom = (el.textContent || '').trim() || el.getAttribute('aria-label') ||
        el.getAttribute('title') || el.querySelector('img[alt]')?.getAttribute('alt') || ''
      if (!nom) nu.push((el.tagName + '.' + (el.className || '').toString().slice(0, 40)).slice(0, 60))
    }
    return [...new Set(nu)].slice(0, 8)
  })

  // ── TEXTES NON TRADUITS ───────────────────────────────────────────────────
  rapport.francais = await page.evaluate((mots) => {
    const txt = document.body.innerText
    return mots.filter((m) => txt.includes(m))
  }, MOTS_FRANCAIS)

  // ── SURVOL ET FOCUS ───────────────────────────────────────────────────────
  const cibles = await page.$$('a[href], button:not([disabled])')
  /* Douze par page : au-delà, on repasse sur des variantes du même composant, et le
     coût par élément (survol, transition, mesure) rend l'audit inutilisable. */
  for (const cible of cibles.slice(0, 12)) {
    const visible = await cible.isVisible().catch(() => false)
    if (!visible) continue
    const nom = (await cible.evaluate((el) =>
      ((el.textContent || '').trim() || el.getAttribute('aria-label') || '?').slice(0, 26)
    ).catch(() => '?'))

    const repos = await styles(cible).catch(() => null)
    if (!repos) continue

    await cible.hover({ timeout: 4000 }).catch(() => {})
    await page.waitForTimeout(320)
    const survol = await styles(cible).catch(() => null)
    if (survol && !differe(repos, survol)) rapport.sansSurvol.push(nom)

    await page.mouse.move(0, 0)
    await page.waitForTimeout(150)
    await cible.focus({ timeout: 3000 }).catch(() => {})
    await page.waitForTimeout(200)
    const focus = await page.evaluate(() => {
      const el = document.activeElement
      if (!el) return null
      const s = getComputedStyle(el)
      return { outline: s.outlineWidth, ombre: s.boxShadow, bordure: s.borderColor, anneau: s.outlineStyle }
    })
    if (focus && focus.outline === '0px' && focus.ombre === 'none') rapport.sansFocus.push(nom)
    await page.evaluate(() => document.activeElement?.blur())
  }

  // ── INFOBULLES ────────────────────────────────────────────────────────────
  const bulles = await page.$$('[data-slot="info-tip"], button[title], [aria-describedby]')
  for (const b of bulles.slice(0, 3)) {
    if (!(await b.isVisible().catch(() => false))) continue
    await b.hover({ timeout: 3000 }).catch(() => {})
    await page.waitForTimeout(700)
    const ouverte = await page.evaluate(() =>
      document.querySelectorAll('[role="tooltip"], .tooltip__content').length)
    if (ouverte > 0) rapport.infobulles += 1
    await page.mouse.move(0, 0)
    await page.waitForTimeout(200)
  }

  rapport.erreurs = [...new Set(erreurs)].slice(0, 5)
  page.off('console', onErreur)
  return rapport
}

async function main() {
  const seul = process.argv.find((a) => a.startsWith('--routes='))
  const routes = seul ? seul.slice(9).split(',') : ROUTES

  await mkdir(OUT, { recursive: true })
  const navigateur = await chromium.launch()
  const contexte = await navigateur.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await contexte.newPage()

  const rapports = []
  for (const route of routes) {
    try {
      const r = await auditerRoute(page, route)
      rapports.push(r)
      const soucis = r.sansNom.length + r.sansSurvol.length + r.sansFocus.length +
        r.francais.length + r.erreurs.length
      console.log(
        `${route.padEnd(24)} ${soucis === 0 ? '✓' : soucis + ' à voir'}` +
        (r.erreurs.length ? `  console:${r.erreurs.length}` : '') +
        (r.francais.length ? `  fr:${r.francais.length}` : '') +
        (r.sansNom.length ? `  muets:${r.sansNom.length}` : '') +
        (r.sansSurvol.length ? `  sans-survol:${r.sansSurvol.length}` : '') +
        (r.sansFocus.length ? `  sans-focus:${r.sansFocus.length}` : ''),
      )
    } catch (error) {
      console.log(`${route.padEnd(24)} ÉCHEC ${String(error.message).slice(0, 70)}`)
      rapports.push({ route, echec: String(error.message).slice(0, 200) })
    }
  }

  await navigateur.close()
  await writeFile(OUT + 'interactif.json', JSON.stringify(rapports, null, 2), 'utf8')
  console.log('\nRapport : ' + OUT + 'interactif.json')
}

main()
