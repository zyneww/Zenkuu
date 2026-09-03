/**
 * Lance la découverte des routes et remplit son cache, sans rien auditer.
 *
 * ⚠️ ELLE MÉRITE SA PROPRE COMMANDE. C'est le seul morceau LENT de la trousse —
 * une vingtaine de chargements, dont plusieurs sur des pages que le serveur de
 * développement compile à la demande. La lancer d'abord, seule, donne aux quatre
 * sondes un cache tiède et rend leur durée prévisible ; l'échec de la découverte
 * cesse aussi de se confondre avec l'échec d'un audit.
 */
import { chromium } from 'playwright'
import { routesAudit } from './routes-audit.mjs'

const BASE = process.env.AUDIT_BASE ?? 'http://localhost:3000'
const navigateur = await chromium.launch()
const page = await (await navigateur.newContext({ viewport: { width: 1440, height: 900 } })).newPage()
page.on('console', () => {})

const t0 = Date.now()
const { routes, manquantes } = await routesAudit(page, BASE)
await navigateur.close()

console.log(routes.join('\n'))
console.log(`\n${routes.length} routes en ${Math.round((Date.now() - t0) / 1000)} s`)
if (manquantes.length) console.log('motifs sans exemplaire vivant : ' + manquantes.join(', '))
