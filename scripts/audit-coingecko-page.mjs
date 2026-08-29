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
 * Le mécanisme dépend du site visé — CoinGecko et ZENKUU ne persistent pas leur
 * préférence de la même façon :
 *
 *   - CoinGecko ne lit pas `localStorage` : il persiste le thème dans un COOKIE
 *     `is_dark` (`"true"` ou `"false"`), sur le domaine de la page. Un script
 *     intégré tout en haut du `<body>` lit ce cookie et ajoute `darktheme`/`tw-dark`
 *     au corps du document avant que le reste du HTML ne s'affiche, pour éviter un
 *     flash. Relevé le 2026-08-29, en ouvrant https://www.coingecko.com/fr avec
 *     Playwright et en déclenchant le contrôleur Stimulus `settings#toggleDarkMode` :
 *     `document.cookie` gagne `is_dark=true` après la première bascule,
 *     `is_dark=false` après la seconde. C'est une valeur observée sur un site
 *     tiers : elle peut changer, à vérifier si les captures cessent un jour de
 *     refléter le thème demandé.
 *
 *   - ZENKUU lit `localStorage['zenkuu-theme']` (`'dark'` / `'light'` / absente —
 *     absente veut dire « suivre le système »), posée par
 *     `apps/web/components/ThemeScript.tsx`, qui ajoute la classe `dark` sur
 *     `<html>` avant la première peinture. La clé est lue dans le code du dépôt,
 *     pas devinée.
 *
 * Dans les deux cas, la préférence est posée AVANT `page.goto`, plutôt qu'une classe
 * CSS ajoutée après coup — une classe forcée produirait une capture qui ne
 * correspond à aucun état réel du site. Et dans les deux cas, l'état RÉEL de la page
 * est recontrôlé après chargement (`themeReel`) : si la bascule n'a pas pris, le
 * script échoue bruyamment plutôt que de produire deux captures identiques prises
 * pour une preuve d'invariance qui n'en serait pas une.
 *
 * ── USAGE ────────────────────────────────────────────────────────────────────
 *
 *   node scripts/audit-coingecko-page.mjs --url=/fr --slug=accueil
 *   node scripts/audit-coingecko-page.mjs --url=/fr --slug=accueil --selectors="body,a,button"
 *   node scripts/audit-coingecko-page.mjs --url=/ --slug=z --base=http://localhost:3000
 */

import { chromium } from 'playwright'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const RACINE_REFERENCES = 'docs/references/coingecko'
const LARGEURS = [360, 768, 1440]
const THEMES = ['clair', 'sombre']

/** Le rendu canonique pour l'extraction des jetons (tâche 6) : les cinq autres
 *  relevés servent à lire la densité (hauteur de ligne, rembourrage) et les points
 *  d'arrêt en comparant les largeurs et les thèmes entre eux — ils affinent la
 *  référence, ils ne la remplacent pas. */
const REFERENCE_MESURES = { largeur: 1440, theme: 'clair' }

/** Clé localStorage brute lue par ThemeScript AVANT l'hydratation — voir
 *  apps/web/components/ThemeScript.tsx. */
const ZENKUU_THEME_STORAGE_KEY = 'zenkuu-theme'

/** Clé du store zustand/persist qui rehydrate ENSUITE et réapplique le thème — voir
 *  apps/web/lib/stores/settings.ts. Sans elle, son état par défaut ('system')
 *  écraserait la classe posée par ThemeScript quelques centaines de millisecondes
 *  après le chargement. */
const ZENKUU_SETTINGS_STORAGE_KEY = 'zenkuu-settings'

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

/**
 * Le mécanisme de bascule dépend du site visé, pas de la commande : logique pure,
 * testable sans navigateur. `www.coingecko.com` et tout sous-domaine de
 * `coingecko.com` utilisent le cookie ; tout le reste — ZENKUU en local ou en
 * production — utilise `localStorage`.
 */
export function mecanismeTheme(base) {
  let hostname
  try {
    hostname = new URL(base).hostname
  } catch {
    return 'zenkuu'
  }
  return hostname === 'coingecko.com' || hostname.endsWith('.coingecko.com') ? 'coingecko' : 'zenkuu'
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

/** Pose la préférence de thème AVANT le chargement, par le mécanisme réel du site
 *  visé — jamais en forçant une classe CSS après coup. */
async function poserTheme(context, base, theme) {
  if (mecanismeTheme(base) === 'coingecko') {
    await context.addCookies([{ name: 'is_dark', value: theme === 'sombre' ? 'true' : 'false', url: base }])
  } else {
    const valeur = theme === 'sombre' ? 'dark' : 'light'
    /* Deux clés, pas une : `ThemeScript` lit la clé brute AVANT l'hydratation, mais
       le store `zustand/persist` ('zenkuu-settings') rehydrate ENSUITE avec son
       propre état par défaut ('system') et le réapplique via `onRehydrateStorage`
       — sans cette seconde écriture, il écrase la classe posée par `ThemeScript`
       moins de deux secondes après le chargement. Constaté dans ce même script, en
       observant `localStorage` et la classe de `<html>` se réinitialiser ~1,5 s
       après le chargement. Voir apps/web/lib/stores/settings.ts. */
    await context.addInitScript(
      ([cleThemeScript, cleStore, v]) => {
        localStorage.setItem(cleThemeScript, v)
        localStorage.setItem(cleStore, JSON.stringify({ state: { theme: v }, version: 0 }))
      },
      [ZENKUU_THEME_STORAGE_KEY, ZENKUU_SETTINGS_STORAGE_KEY, valeur],
    )
  }
}

/**
 * Signal de dernier recours : la couleur de fond CALCULÉE de `<body>`, utilisée
 * seulement à ses deux extrêmes.
 *
 * Un fond entièrement TRANSPARENT (`rgba(0, 0, 0, 0)`) veut dire qu'aucune couleur
 * n'y a été peinte — observé sur `/fr` en clair, où `body` ne porte pas sa propre
 * teinte. Un fond QUASI NOIR veut dire qu'une surface sombre y a explicitement été
 * peinte — observé sur `/fr` en sombre (`rgb(13, 18, 23)`).
 *
 * Entre les deux, une couleur opaque de luminance intermédiaire N'EST PAS un signal
 * fiable : elle peut être un bandeau de marque propre au gabarit, sans rapport avec
 * le thème choisi. Constaté sur une fiche d'actif (`/fr/coins/bitcoin`) : `body` y
 * reste teinté d'un bleu-nuit `rgb(33, 45, 59)` — capture vérifiée OCTET POUR OCTET
 * identique quel que soit le cookie `is_dark`. Rendre `null` dans ce cas dit « pas
 * de signal exploitable ici », plutôt que de deviner et de faire lever le contrôle
 * à tort sur un gabarit dont le thème n'a simplement aucun marqueur détectable par
 * cette méthode.
 */
export function signalDeFond(couleurCalculee) {
  const nombres = (couleurCalculee || '').match(/[\d.]+/g)
  if (!nombres || nombres.length < 3) return null
  const [r, g, b, alpha = 1] = nombres.map(Number)
  if (alpha === 0) return 'clair'
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  if (luminance < 0.15) return 'sombre'
  if (luminance > 0.85) return 'clair'
  return null
}

/**
 * Décide si CE chargement porte le thème sombre, à partir de signaux relevés dans
 * la page — logique pure, testable sans navigateur. Peut rendre `null` : « aucun
 * signal exploitable », pas « clair par défaut ».
 *
 * CoinGecko pose SOIT `darktheme` SOIT `tw-dark` sur `<body>` selon le gabarit (les
 * deux ont été vues co-posées sur `/fr`, mais rien ne garantit que les 68 pages
 * suivent la même convention) : exiger l'une en particulier ferait lever le
 * contrôle à tort sur une page parfaitement basculée. Quand NI L'UNE NI L'AUTRE
 * n'apparaît, on ne conclut pas au clair pour autant — un gabarit peut très bien ne
 * pas suivre cette convention tout en étant réellement sombre — et on retombe sur
 * la couleur de fond.
 */
export function themeDepuisSignaux({ classesBody, fondBody }) {
  if (classesBody.includes('darktheme') || classesBody.includes('tw-dark')) return 'sombre'
  return signalDeFond(fondBody)
}

/**
 * Le contrôle de vérité, celui qui ne dépend d'aucune convention de nommage ni
 * d'aucun seuil calibré : deux captures OCTET POUR OCTET identiques ne peuvent pas
 * survenir par hasard sur un site qui rafraîchit ses cours en continu, quel que
 * soit le gabarit. `themeDepuisSignaux` échoue TÔT, avant de dépenser six passes ;
 * celui-ci échoue TARD mais sûrement, y compris sur les pages où aucun signal de
 * classe ou de fond n'existe (constaté sur `/fr/coins/bitcoin`, qui ne pose aucun
 * marqueur détectable par les deux). Les deux se complètent, l'un ne remplace pas
 * l'autre.
 *
 * Égalité STRICTE, pas une ressemblance seuillée : deux pixels qui bougent d'une
 * capture à l'autre sur une page vivante ne prouvent rien, mais deux fichiers
 * rigoureusement identiques prouvent que rien n'a changé — y compris le thème.
 */
export function capturesIdentiques(a, b) {
  return Buffer.compare(a, b) === 0
}

/** Contrôle l'état RÉEL du thème après chargement — pas ce qu'on a demandé, ce que
 *  la page a effectivement rendu. */
async function themeReel(page, base) {
  if (mecanismeTheme(base) === 'coingecko') {
    const { classesBody, fondBody } = await page.evaluate(() => ({
      classesBody: document.body.className,
      fondBody: getComputedStyle(document.body).backgroundColor,
    }))
    return themeDepuisSignaux({ classesBody, fondBody })
  }
  /* ZENKUU : une seule classe, sur un site qu'on contrôle — pas 68 gabarits tiers
     dont la convention peut diverger. */
  const sombre = await page.evaluate(() => document.documentElement.classList.contains('dark'))
  return sombre ? 'sombre' : 'clair'
}

async function chargerAvecTheme(context, base, url, theme) {
  await poserTheme(context, base, theme)
  const page = await context.newPage()
  /*
   * `networkidle`, PAS ICI. `audit-responsive.mjs` l'utilise à raison contre ZENKUU
   * en local, dont les pages se stabilisent. Le site visé ici est un site de
   * cotations qui rafraîchit ses cours en continu (WebSocket, polling) :
   * `networkidle` n'y survient JAMAIS, et son délai de 45 s serait consommé en
   * entier à chaque passe. Sur une campagne de 68 pages à 6 passes, ça se chiffre
   * en heures d'attente pure pour un gain nul — `domcontentloaded` fournit un
   * signal qui se produit réellement sur ce type de page, et le plafond est réduit
   * d'autant : il ne sert plus qu'à distinguer une page lente d'une page cassée.
   */
  try {
    await page.goto(base + url, { waitUntil: 'domcontentloaded', timeout: 15_000 })
  } catch {
    // Page anormalement lente ou cassée : le DOM disponible est capturé quand même.
  }
  await page.waitForTimeout(1200)

  /* La bascule est vérifiée ICI, pas supposée : deux captures identiques prises pour
     une preuve d'invariance sont exactement la donnée factice que le projet
     interdit. Un mécanisme muet doit casser bruyamment, pas produire un doublon.
     `themeReel` peut aussi rendre `null` — « aucun signal exploitable sur ce
     gabarit », jamais rencontré comme « clair par défaut » — auquel cas on
     poursuit sans verdict plutôt que d'arrêter les 68 pages sur un faux positif. */
  const obtenu = await themeReel(page, base)
  if (obtenu !== null && obtenu !== theme) {
    throw new Error(
      `Bascule de thème sans effet sur ${new URL(base).hostname} : attendu « ${theme} », obtenu « ${obtenu} ».`,
    )
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

  const releves = []

  for (const { largeur, theme, fichier } of chemins) {
    const context = await browser.newContext({ viewport: { width: largeur, height: 900 } })
    const page = await chargerAvecTheme(context, base, url, theme)

    await page.screenshot({ path: path.join(process.cwd(), fichier), fullPage: true })

    if (selectors.length > 0) {
      /* Les familles « densité » (hauteur de ligne, rembourrage) et « grille et
         points d'arrêt » se lisent en comparant les largeurs et les thèmes entre
         eux : un relevé unique à 1440/clair les rendrait invisibles. On mesure donc
         à chaque passe — la page est déjà chargée pour la capture, le coût marginal
         est nul. */
      const valeurs = await page.evaluate(mesurerSelecteurs, selectors)
      releves.push({ largeur, theme, valeurs })
    }

    await context.close()
  }

  /* Le contrôle par octets, après coup : il ne dépend d'aucun signal intermédiaire,
     seulement des fichiers réellement écrits. Comparé pour chaque largeur, une
     fois les deux captures du couple sur disque. */
  for (const largeur of LARGEURS) {
    const clair = chemins.find((c) => c.largeur === largeur && c.theme === 'clair').fichier
    const sombre = chemins.find((c) => c.largeur === largeur && c.theme === 'sombre').fichier
    const [bufClair, bufSombre] = await Promise.all([
      readFile(path.join(process.cwd(), clair)),
      readFile(path.join(process.cwd(), sombre)),
    ])
    if (capturesIdentiques(bufClair, bufSombre)) {
      throw new Error(
        `Captures clair et sombre identiques à ${largeur}px sur ${url} (${slug}) : le thème n'a pas basculé.`,
      )
    }
  }

  if (selectors.length > 0) {
    const releve = {
      url,
      base,
      releveLe: new Date().toISOString(),
      reference: REFERENCE_MESURES,
      mesures: releves,
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
