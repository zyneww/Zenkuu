/**
 * Relevé d'une page CoinGecko (ou ZENKUU en local) : six captures et un jeu de mesures.
 *
 * ── POURQUOI CE SCRIPT ET PAS LE MCP DE NAVIGATION ───────────────────────────────
 *
 * Le MCP `chrome-devtools` partage un unique profil Chrome entre toutes les sessions
 * de la machine, sans `--isolated` : deux sessions y entrent en collision sur le
 * verrou de profil. Playwright est déjà une dépendance du dépôt, déjà piloté par
 * `scripts/audit-responsive.mjs`, et `chromium.launch()` isole son profil par
 * exécution — cette classe d'incident disparaît. Une commande par page remplace
 * aussi la dizaine d'allers-retours qu'exigeait le MCP.
 *
 * ── LA BASCULE DE THÈME ───────────────────────────────────────────────────────
 *
 * CoinGecko ne lit pas une préférence en `localStorage` : il persiste le thème dans
 * un COOKIE `is_dark` (`"true"` ou `"false"`), sur le domaine de la page. Un script
 * intégré tout en haut du `<body>` lit ce cookie et ajoute `darktheme`/`tw-dark` au
 * corps du document avant que le reste du HTML ne s'affiche, pour éviter un flash.
 *
 * Relevé le 2026-08-29, en ouvrant https://www.coingecko.com/fr avec Playwright et
 * en déclenchant le contrôleur Stimulus `settings#toggleDarkMode` : `document.cookie`
 * gagne `is_dark=true` après la première bascule, `is_dark=false` après la seconde.
 * On pose donc ce cookie AVANT `page.goto`, plutôt que d'ajouter une classe CSS après
 * coup — une classe forcée produirait une capture qui ne correspond à aucun état réel
 * du site. C'est une valeur observée sur un site tiers : elle peut changer, à vérifier
 * si les captures cessent un jour de refléter le thème demandé.
 *
 * ── USAGE ────────────────────────────────────────────────────────────────────
 *
 *   node scripts/audit-coingecko-page.mjs --url=/fr --slug=accueil
 *   node scripts/audit-coingecko-page.mjs --url=/fr --slug=accueil --selectors="body,a,button"
 *   node scripts/audit-coingecko-page.mjs --url=/ --slug=z --base=http://localhost:3000
 */

import { chromium } from 'playwright'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const RACINE_REFERENCES = 'docs/references/coingecko'
const LARGEURS = [360, 768, 1440]
const THEMES = ['clair', 'sombre']
/** Largeur et thème sur lesquels le relevé `getComputedStyle` est effectué : le
 *  rendu desktop clair est la référence pour les jetons de design du projet. */
const REFERENCE_MESURES = { largeur: 1440, theme: 'clair' }

const arg = (argv, flag, fallback) => {
  const hit = argv.find((a) => a.startsWith(`--${flag}=`))
  return hit ? hit.slice(flag.length + 3) : fallback
}

export function lireArguments(argv) {
  const url = arg(argv, 'url', null)
  const slug = arg(argv, 'slug', null)
  if (!url) throw new Error('Argument requis manquant : --url')
  if (!slug) throw new Error('Argument requis manquant : --slug')

  /* Un slug est un nom de dossier, pas un chemin : sans ce garde-fou,
     `--slug=../../..` écrirait des captures n'importe où dans le dépôt. */
  const dossier = path.resolve(RACINE_REFERENCES, slug)
  const racine = path.resolve(RACINE_REFERENCES)
  if (dossier !== racine && !dossier.startsWith(racine + path.sep)) {
    throw new Error(`slug invalide : « ${slug} » sortirait du dossier de références`)
  }

  const base = arg(argv, 'base', 'https://www.coingecko.com')
  const selectorsArg = arg(argv, 'selectors', null)
  const selectors = selectorsArg ? selectorsArg.split(',') : []

  return { url, slug, base, selectors }
}

export function cheminsDeCapture(slug) {
  const chemins = []
  for (const largeur of LARGEURS) {
    for (const theme of THEMES) {
      chemins.push({
        largeur,
        theme,
        fichier: `${RACINE_REFERENCES}/${slug}/${largeur}-${theme}.png`,
      })
    }
  }
  return chemins
}

/** Sonde exécutée DANS la page : un `getComputedStyle` par sélecteur, en un seul
 *  aller-retour. Un sélecteur sans correspondance est consigné comme tel, jamais
 *  omis en silence. */
function mesurerSelecteurs(selectors) {
  return selectors.map((selecteur) => {
    let el
    try {
      el = document.querySelector(selecteur)
    } catch (erreur) {
      return { selecteur, trouve: false, erreur: String(erreur).slice(0, 160) }
    }
    if (!el) return { selecteur, trouve: false }

    const st = getComputedStyle(el)
    const cote = (prop) => ({
      haut: st[`${prop}Top`],
      droite: st[`${prop}Right`],
      bas: st[`${prop}Bottom`],
      gauche: st[`${prop}Left`],
    })

    return {
      selecteur,
      trouve: true,
      texte: (el.textContent || '').trim().slice(0, 60),
      style: {
        policeFamille: st.fontFamily,
        policeGraisse: st.fontWeight,
        taille: st.fontSize,
        interligne: st.lineHeight,
        interlettrage: st.letterSpacing,
        couleur: st.color,
        fond: st.backgroundColor,
        filet: { epaisseur: st.borderTopWidth, style: st.borderTopStyle, couleur: st.borderTopColor },
        rayon: st.borderRadius,
        ombre: st.boxShadow,
        rembourrages: cote('padding'),
        marges: cote('margin'),
        transitionDuree: st.transitionDuration,
        transitionCourbe: st.transitionTimingFunction,
      },
    }
  })
}

async function chargerAvecTheme(context, base, url, theme) {
  /* Le cookie est posé AVANT le chargement : le script anti-flash de CoinGecko le
     lit dès les premiers octets du <body>. */
  await context.addCookies([{ name: 'is_dark', value: theme === 'sombre' ? 'true' : 'false', url: base }])
  const page = await context.newPage()
  try {
    await page.goto(base + url, { waitUntil: 'networkidle', timeout: 45_000 })
  } catch {
    // `networkidle` expire sur les pages à flux continu : le DOM est là, on capture.
  }
  await page.waitForTimeout(1200)
  try {
    await page.waitForLoadState('domcontentloaded', { timeout: 10_000 })
  } catch {
    /* rien : on mesure ce qui est affiché */
  }
  return page
}

async function main() {
  const { url, slug, base, selectors } = lireArguments(process.argv.slice(2))
  const chemins = cheminsDeCapture(slug)
  const dossier = path.join(RACINE_REFERENCES, slug)
  await mkdir(dossier, { recursive: true })

  let browser
  try {
    browser = await chromium.launch()
  } catch (erreur) {
    // Aucune tentative de libérer un verrou ou de tuer un processus : le blocage se
    // remonte, il ne se force pas.
    throw new Error(`Chromium n'a pas pu démarrer : ${erreur.message}`)
  }

  let mesures = null

  for (const { largeur, theme, fichier } of chemins) {
    const context = await browser.newContext({ viewport: { width: largeur, height: 900 } })
    const page = await chargerAvecTheme(context, base, url, theme)

    await page.screenshot({ path: path.join(process.cwd(), fichier), fullPage: true })

    if (selectors.length > 0 && largeur === REFERENCE_MESURES.largeur && theme === REFERENCE_MESURES.theme) {
      mesures = await page.evaluate(mesurerSelecteurs, selectors)
    }

    await context.close()
  }

  if (selectors.length > 0) {
    const releve = {
      url,
      base,
      releveLe: new Date().toISOString(),
      reference: REFERENCE_MESURES,
      mesures: mesures ?? selectors.map((selecteur) => ({ selecteur, trouve: false })),
    }
    await writeFile(path.join(dossier, 'mesures.json'), JSON.stringify(releve, null, 2))
  }

  await browser.close()

  console.log(`${chemins.length} captures et ${selectors.length ? 'un' : 'aucun'} relevé écrits dans ${dossier}/`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error)
    process.exit(1)
  })
}
