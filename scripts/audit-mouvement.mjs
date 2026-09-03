/**
 * ══════════════════════════════════════════════════════════════════════════════
 * AUDIT DU MOUVEMENT — `prefers-reduced-motion` EST-IL VRAIMENT HONORÉ ?
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Le code du site le dit : onze blocs `@media (prefers-reduced-motion: reduce)`
 * dans `globals.css`, quinze modules qui appellent `useReducedMotion`. Mais une
 * règle écrite n'est pas une règle appliquée — c'est exactement l'erreur que
 * `audit-interactif` a été écrit pour ne plus commettre, et sa propre en-tête
 * annonçait ce contrôle sans qu'aucune ligne ne l'exécute.
 *
 * ── CE QU'IL MESURE ────────────────────────────────────────────────────────
 *
 * Deux chargements de la MÊME page dans deux contextes, l'un neutre, l'autre en
 * `reducedMotion: 'reduce'`. Pour chaque élément animé, on relève `transitionDuration`
 * et `animationDuration` CALCULÉES. Un élément qui garde la même durée sous
 * `reduce` n'honore pas la préférence.
 *
 * ⚠️ LE SEUIL EST À 100 ms, PAS À ZÉRO. Couper net n'est pas l'objectif :
 * l'usage recommandé est de ramener le mouvement à une durée imperceptible
 * plutôt que de le supprimer, ce qui casserait les composants dont un
 * gestionnaire `transitionend` attend la fin. Le site emploie déjà `0.01ms`
 * à plusieurs endroits, ce qui passe ce seuil.
 *
 * ⚠️ ET IL IGNORE LES DURÉES DÉJÀ NULLES AU REPOS. Un élément sans transition
 * dans les deux cas n'est pas un défaut : il n'anime rien, il n'a rien à couper.
 * Les compter noierait le relevé sous des milliers de lignes inertes.
 */

import { chromium } from 'playwright'
import { routesAudit } from './routes-audit.mjs'

const BASE = process.env.AUDIT_BASE ?? 'http://localhost:3000'
const SEUIL_MS = 100

/*
 * ⚠️ LA LISTE VIENT DE `routes-audit.mjs`, ET N'EST PAS RECOPIÉE ICI.
 *
 * Une liste écrite à la main ne suit pas une application qui grandit : celle qui
 * vivait dans ces fichiers en couvrait moins de la moitié, et l'omission ne se
 * signale pas — une page non visitée passe pour saine.
 */
let ROUTES = []

const releve = (page) =>
  page.evaluate(() => {
    const ms = (v) =>
      Math.max(0, ...String(v).split(',').map((x) => {
        const n = parseFloat(x)
        return Number.isNaN(n) ? 0 : /ms$/.test(x.trim()) ? n : n * 1000
      }))
    const out = {}
    for (const el of document.querySelectorAll('body *')) {
      const s = getComputedStyle(el)
      const d = Math.max(ms(s.transitionDuration), ms(s.animationDuration))
      if (d === 0) continue
      /* La clé décrit le COMPOSANT, pas l'instance : sans cela, une table de
         cent lignes produit cent relevés du même défaut. */
      const cle = el.tagName.toLowerCase() + '.' + String(el.className || '').split(' ').slice(0, 3).join('.')
      out[cle] = Math.max(out[cle] ?? 0, d)
    }
    return out
  })

const navigateur = await chromium.launch()
const neutre = await navigateur.newContext({ viewport: { width: 1440, height: 900 } })
const sobre = await navigateur.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })
const pNeutre = await neutre.newPage()
const pSobre = await sobre.newPage()

/* La liste est découverte à l'ouverture : routes statiques lues dans `app/[locale]`,
   plus un exemplaire vivant de chaque motif dynamique, pêché dans les liens rendus. */
const decouverte = await routesAudit(pNeutre, BASE)
ROUTES = decouverte.routes
if (decouverte.manquantes.length)
  console.log('motifs sans exemplaire vivant : ' + decouverte.manquantes.join(', '))
console.log(ROUTES.length + ' routes à parcourir.\n')

let total = 0
for (const route of ROUTES) {
  const url = BASE + '/en' + (route === '/' ? '' : route)
  const opts = { waitUntil: 'domcontentloaded', timeout: 120_000 }
  /*
   * ⚠️ UN DÉLAI DÉPASSÉ N'INTERROMPT PLUS LE PASSAGE.
   *
   * Sans ce filet, la première page lente emportait tout : `page.goto` levait, et les
   * QUARANTE-HUIT routes suivantes n'étaient jamais mesurées. C'est le pire mode de
   * défaillance pour un audit — il ne rend pas un rapport partiel, il n'en rend aucun,
   * et le travail des vingt minutes précédentes part avec.
   */
  try {
    await Promise.all([pNeutre.goto(url, opts), pSobre.goto(url, opts)])
  } catch (error) {
    console.log(route.padEnd(20) + 'ÉCHEC ' + String(error.message).slice(0, 60))
    continue
  }
  await pNeutre.waitForTimeout(6000)

  const [a, b] = await Promise.all([releve(pNeutre), releve(pSobre)])
  const fautifs = Object.entries(b)
    .filter(([cle, d]) => d > SEUIL_MS && (a[cle] ?? 0) > 0)
    .sort((x, y) => y[1] - x[1])
    .slice(0, 6)

  total += fautifs.length
  console.log(
    route.padEnd(20) +
      (fautifs.length === 0
        ? `✓  ${Object.keys(a).length} animés, tous coupés`
        : `${fautifs.length} non coupés : ` +
          fautifs.map(([c, d]) => `${c.slice(0, 34)} ${Math.round(d)}ms`).join(' | ')),
  )
}

await navigateur.close()
console.log('\n' + (total === 0 ? 'Mouvement réduit honoré partout.' : total + ' à corriger.'))
