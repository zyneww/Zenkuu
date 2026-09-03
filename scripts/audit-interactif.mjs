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
import { routesAudit } from './routes-audit.mjs'

const BASE = process.env.AUDIT_BASE ?? 'http://localhost:3000'

/** `--theme=clair` ou `--theme=sombre` ; sombre par défaut, c'est celui du site. */
const THEME = (process.argv.find((a) => a.startsWith('--theme=')) ?? '--theme=sombre').slice(8)
const OUT = new URL('../.audit/', import.meta.url).pathname


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
  /*
   * ⚠️ LE THÈME EST IMPOSÉ, PARCE QUE LE LAISSER AU HASARD REVENAIT À N'EN MESURER
   * QU'UN SEUL SANS SAVOIR LEQUEL.
   *
   * `ThemeScript` choisit selon la préférence du système, et Playwright annonce
   * `light` par défaut. Sans cette ligne, l'audit mesurait donc le thème CLAIR —
   * en croyant mesurer « le site ». Le sombre, celui que la rampe d'obsidienne
   * décrit sur trois cents lignes, n'était jamais passé sous la sonde.
   *
   * On pose la classe APRÈS le chargement : `ThemeScript` s'exécute au premier
   * rendu et écraserait un réglage posé avant lui.
   */
  await page.evaluate((t) => {
    document.documentElement.classList.toggle('dark', t === 'sombre')
  }, THEME)

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

  // ── TEXTES ET ATTRIBUTS NON TRADUITS ──────────────────────────────────────
  /*
   * ⚠️ TROIS PRÉCAUTIONS, CHACUNE POUR UN FAUX POSITIF RÉELLEMENT RENCONTRÉ.
   *
   * La version naïve — `document.body.innerText.includes(mot)` — a signalé trois
   * fois du français sur des pages anglaises correctes :
   *
   *   · « Annuler une partie de la dette française… » : un TITRE DE PRESSE. ZENKUU
   *     agrège des rédactions françaises ; leurs titres restent dans leur langue,
   *     traduire l'article d'un tiers serait le réécrire. D'où l'exclusion des
   *     sous-arbres `<article>`, l'élément que le site emploie déjà pour eux.
   *   · « Investing.com Devises » : un NOM DE SOURCE. Un nom propre ne se traduit pas.
   *     C'est aussi pourquoi la recherche porte désormais sur le MOT ENTIER — « Devise »
   *     ne doit pas s'accrocher à l'intérieur de « Devises ».
   *   · Le contenu de `<script>`, où les charges utiles de Next.js transportent les
   *     chaînes françaises du site : jamais peintes, jamais lues par personne.
   *
   * ⚠️ ET LE RAPPORT PORTE L'EXTRAIT, PAS SEULEMENT LE MOT. Sans lui il a fallu, pour
   * chacun des trois, relancer un script de localisation pour découvrir qu'il n'y avait
   * rien à corriger. Un relevé qui ne se juge pas d'un coup d'œil coûte plus cher que
   * le défaut qu'il cherche.
   */
  rapport.francais = await page.evaluate((mots) => {
    const trouves = []
    const marcheur = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    let noeud
    while ((noeud = marcheur.nextNode())) {
      const parent = noeud.parentElement
      if (!parent || parent.closest('script, style, article')) continue
      const texte = (noeud.nodeValue || '').trim()
      if (!texte) continue
      for (const mot of mots) {
        const entier = new RegExp('(^|[^\\p{L}])' + mot + '($|[^\\p{L}])', 'u')
        if (entier.test(texte)) trouves.push(mot + ' — « ' + texte.slice(0, 44) + ' »')
      }
    }
    /*
     * ⚠️ LES ATTRIBUTS AUSSI, ET C'EST LE POINT AVEUGLE QUI A COÛTÉ LE PLUS CHER.
     *
     * `.notes/bugs-a-traiter.md` le décrit sous le point 4 : le comparateur fr/en
     * de l'époque découpait le HTML sur les balises et ne regardait JAMAIS dans les
     * attributs. Tout `aria-label`, `title` et `placeholder` en dur lui a échappé.
     *
     * Or ce sont exactement les libellés qu'une synthèse vocale annonce. Un
     * utilisateur japonais entendait « Fermer », « Repères chiffrés »,
     * « Regroupement plus fin » : la seule partie du site non traduite était celle
     * qui compte le plus pour qui ne voit pas l'écran. Un texte français visible se
     * remarque à la première relecture ; un `aria-label` français ne se remarque
     * jamais — il n'y a rien à voir.
     *
     * ⚠️ `alt` EST EXCLU. Les vignettes d'actualité portent le titre de l'article,
     * en français chez les rédactions françaises : c'est du contenu, pas de
     * l'interface, et le traduire reviendrait à réécrire l'article d'autrui.
     */
    for (const el of document.querySelectorAll('[aria-label], [title], [placeholder]')) {
      for (const attribut of ['aria-label', 'title', 'placeholder']) {
        const valeur = (el.getAttribute(attribut) || '').trim()
        if (!valeur) continue
        for (const mot of mots) {
          const entier = new RegExp('(^|[^\\p{L}])' + mot + '($|[^\\p{L}])', 'u')
          if (entier.test(valeur))
            trouves.push(`${mot} — ${attribut}="${valeur.slice(0, 40)}"`)
        }
      }
    }

    return [...new Set(trouves)].slice(0, 8)
  }, MOTS_FRANCAIS)

  // ── SURVOL ET FOCUS ───────────────────────────────────────────────────────
  /*
   * ⚠️ LE LIEN D'ÉVITEMENT EST ÉCARTÉ, ET C'EST UN FAUX POSITIF CORRIGÉ.
   *
   * « Skip to main content » était signalé « sans réponse au survol » sur les
   * VINGT-CINQ routes du premier passage. C'est son fonctionnement même : il vit hors
   * de l'écran et n'apparaît qu'au focus. On ne peut pas survoler ce qu'on ne peut pas
   * atteindre à la souris, et un survol qui ne fait rien est ici la bonne réponse.
   *
   * Vingt-cinq lignes de bruit rendent un rapport illisible, et l'on finit par ne plus
   * le lire — c'est le raisonnement déjà écrit dans `audit-responsive.mjs` à propos des
   * dix routes en 404 qu'il visitait.
   *
   * Le contrôle du FOCUS, lui, continue de porter sur ce lien : c'est là qu'il doit
   * répondre, et il répond.
   */
  const cibles = (await page.$$('a[href], button:not([disabled])')).slice()
  const horsSurvol = new Set()
  for (const c of cibles) {
    const horsEcran = await c
      .evaluate((el) => {
        const r = el.getBoundingClientRect()
        /*
          ⚠️ LES BORNES SONT LARGES (`<=`, `>=`), ET C'EST LE POINT.

          Mesuré, le lien d'évitement occupe `top:-1 left:-1 w:1 h:1` : son bord bas
          tombe exactement à 0. Un `< 0` strict le manquait d'un pixel et le rapport
          continuait de le citer sur chaque route — la correction ne servait à rien.

          On couvre les quatre côtés, pas seulement deux : un `sr-only` peut aussi être
          rejeté sous le pli ou à droite du cadre selon la technique retenue.
        */
        return r.bottom <= 0 || r.right <= 0 ||
          r.top >= innerHeight || r.left >= innerWidth
      })
      .catch(() => false)
    if (horsEcran) horsSurvol.add(c)
  }
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
    if (survol && !differe(repos, survol) && !horsSurvol.has(cible)) rapport.sansSurvol.push(nom)

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
  await mkdir(OUT, { recursive: true })
  const navigateur = await chromium.launch()
  const contexte = await navigateur.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await contexte.newPage()

  /*
   * ⚠️ LA LISTE N'EST PLUS ÉCRITE ICI, ET C'ÉTAIT UN DÉFAUT DE FOND.
   *
   * Celle qui vivait dans ce fichier comptait vingt-six routes quand l'application en
   * sert soixante. Onze pages entières — `/derives`, `/devises`, `/etf`, `/glossaire`,
   * `/indices`, `/macro`, `/perpetuels`, `/rachats` et les cinq de `/graphiques` —
   * n'avaient jamais été mesurées, et l'audit les déclarait saines par omission. Un
   * relevé qui ne visite pas une page ne dit rien d'elle ; il ne le dit pas non plus.
   *
   * `routes-audit.mjs` les lit dans `app/[locale]` : la liste ne peut plus diverger.
   */
  const seul = process.argv.find((a) => a.startsWith('--routes='))
  let routes
  if (seul) {
    routes = seul.slice(9).split(',')
  } else {
    const decouverte = await routesAudit(page, BASE)
    routes = decouverte.routes
    if (decouverte.manquantes.length)
      console.log('motifs sans exemplaire vivant : ' + decouverte.manquantes.join(', ') + '\n')
  }

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
  await writeFile(OUT + `interactif-${THEME}.json`, JSON.stringify(rapports, null, 2), 'utf8')
  console.log(`\nRapport (${THEME}) : ${OUT}interactif-${THEME}.json`)
}

main()
