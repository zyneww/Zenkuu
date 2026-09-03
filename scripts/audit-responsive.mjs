/**
 * Audit responsive et multi-moteurs.
 *
 * ── CE QU'IL MESURE, ET POURQUOI CES QUATRE CHOSES ───────────────────────────
 *
 * Un audit visuel à l'œil rate systématiquement les mêmes défauts, parce qu'ils ne
 * se voient qu'en cherchant. Ceux-ci se mesurent :
 *
 *   1. DÉBORDEMENT HORIZONTAL. Le défaut mobile le plus répandu et le plus visible :
 *      la page se décale sous le doigt, l'en-tête se désaligne du contenu. Il suffit
 *      d'un élément trop large pour contaminer toute la page — d'où le relevé du
 *      COUPABLE et pas seulement du symptôme. Les conteneurs à défilement horizontal
 *      assumé (tableaux) sont exclus : chez eux, déborder est le comportement voulu.
 *
 *   2. CIBLES TACTILES. Un lien de 16 px de haut se rate au doigt une fois sur trois.
 *      Le seuil retenu est 24 px — le minimum du critère WCAG 2.2 AA 2.5.8 (Target
 *      Size Minimum). Les 44 px des recommandations d'Apple restent la cible IDÉALE ;
 *      24 px est le plancher NORMATIF en dessous duquel un contrôle cesse d'être
 *      conforme.
 *
 *      ⚠️ CE SEUIL ÉTAIT À 32 PX, et l'abaisser est une décision, pas un relâchement.
 *      La référence dont ce site reproduit la structure descend sous 32 px sur ses
 *      contrôles (bouton mesuré à ~31 px, voir DESIGN_SYSTEM.md) : garder 32 px
 *      interdisait la fidélité sur toute une famille de composants. L'exploitant a
 *      tranché pour la fidélité le 2026-08-30. On ne DESCEND PAS jusqu'à désactiver
 *      le contrôle : 24 px reste un plancher réel, et une cible en dessous est un
 *      défaut d'accessibilité, pas une question de goût.
 *
 *   3. TEXTE MINUSCULE. Sous 11 px, un chiffre de marché n'est plus lisible sur un
 *      écran tenu à bout de bras.
 *
 *   4. ERREURS CONSOLE. Un écart d'hydratation ou une image en échec ne se voit pas
 *      sur une capture, et casse pourtant la page.
 *
 * ── POURQUOI TROIS MOTEURS ET NON TROIS NAVIGATEURS ──────────────────────────
 *
 * Chrome, Edge, Opera et Brave partagent Blink : les tester tous les quatre revient
 * à tester le même moteur quatre fois. Ce qui diffère réellement, ce sont les trois
 * moteurs — Blink (Chrome), Gecko (Firefox) et WebKit (Safari, ET tout navigateur
 * sur iOS, où Apple impose son moteur même à Chrome). WebKit est de loin le plus
 * exigeant : c'est lui qui refuse les propriétés récentes et calcule `100vh`
 * autrement.
 *
 * ── USAGE ────────────────────────────────────────────────────────────────────
 *
 *   node scripts/audit-responsive.mjs                    # Chromium, tous formats
 *   node scripts/audit-responsive.mjs --engine=webkit    # Safari
 *   node scripts/audit-responsive.mjs --device=iphone    # un seul format
 *   node scripts/audit-responsive.mjs --routes=/,/crypto # un sous-ensemble
 *   node scripts/audit-responsive.mjs --shot=/crypto     # capture en plus
 */

import { chromium, firefox, webkit, devices } from 'playwright'
import { routesAudit } from './routes-audit.mjs'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const BASE = process.env.AUDIT_BASE ?? 'http://localhost:3000'
const OUT = path.join(process.cwd(), '.audit')

/**
 * Formats testés.
 *
 * Choisis pour leurs BORNES et non pour leur popularité : le plus étroit du marché
 * (iPhone SE, 375), le plus courant (iPhone 15 / Pixel, 390-412), la tablette en
 * portrait où les grilles à deux colonnes basculent (768), la tablette en paysage qui
 * frôle le seuil desktop (1024), et le paysage téléphone — 844×390, où la hauteur
 * disponible tombe sous 400 px et où tout ce qui est collé en haut ET en bas mange
 * l'écran entier.
 */
const VIEWPORTS = [
  { id: 'iphone-se', label: 'iPhone SE (portrait)', ...devices['iPhone SE'] },
  { id: 'iphone', label: 'iPhone 15 (portrait)', ...devices['iPhone 15'] },
  { id: 'iphone-paysage', label: 'iPhone 15 (paysage)', ...devices['iPhone 15 landscape'] },
  { id: 'galaxy', label: 'Galaxy S24 (portrait)', ...devices['Galaxy S24'] },
  { id: 'ipad', label: 'iPad (portrait)', ...devices['iPad (gen 7)'] },
  { id: 'ipad-paysage', label: 'iPad (paysage)', ...devices['iPad (gen 7) landscape'] },
]

/**
 * Routes auditées — une par FORME de page, pas une par URL.
 *
 * Le site en compte cinquante-huit, mais elles se rangent en une quinzaine de gabarits :
 * les six classements partagent `MarketPageView`, les six fiches d'actif partagent
 * `AssetPageView`. Auditer les cinquante-huit multiplierait le temps par quatre pour
 * retrouver les mêmes défauts sous six noms différents.
 *
 * Chaque gabarit est représenté par sa page la PLUS CHARGÉE : c'est là que le
 * responsive casse, jamais sur la variante vide.
 */
/**
 * ⚠️ ÉTATS À PARAMÈTRES — LE SEUL MORCEAU DE LISTE ENCORE ÉCRIT ICI.
 *
 * Ces adresses ouvrent une page sur un état que sa route nue ne montre pas : un
 * autre onglet, une autre vue. Elles ne peuvent pas être découvertes par la lecture
 * de `app/[locale]`, qui ne connaît que des chemins, ni par la pêche aux liens, qui
 * rendrait autant de variantes qu'il existe d'onglets.
 *
 * Le reste — toutes les routes statiques, plus un exemplaire vivant de chaque motif
 * dynamique — vient de `routes-audit.mjs`.
 *
 * ── POURQUOI LA LISTE PAR GABARIT A ÉTÉ ABANDONNÉE ─────────────────────────
 *
 * Elle tenait vingt-six routes, au motif que les cinquante-huit se rangeaient « en
 * une quinzaine de gabarits ». Vérification faite en lisant les vues importées par
 * chaque `page.tsx` : SEULES QUATORZE routes en partagent une. Les six fiches
 * d'actif partagent `AssetPageView`, les six pages de métrique `MetricPageView`,
 * `/connexion` et `/inscription` `AuthPageView` — et c'est tout. Les quarante-six
 * autres composent leur mise en page sur place.
 *
 * Le raisonnement était bon, sa prémisse fausse : une vingtaine de mises en page
 * distinctes n'étaient mesurées à aucun format. Or c'est précisément sur les pages
 * de contenu — `/glossaire`, `/macro`, `/rachats` — qu'un tableau large ou une
 * chaîne insécable déborde.
 *
 * Le regroupement subsiste là où il est VRAI : `routes-audit.mjs` ne rend qu'un seul
 * exemplaire par motif dynamique, ce qui replie bien les douze fiches en deux.
 */
const ETATS = [
  /* ⚠️ `/marches?vue=derives` A ÉTÉ RETIRÉ : `/marches` rend un 308 vers `/crypto`
     et la chaîne de requête se perd en route. L'audit mesurait donc `/crypto` une
     seconde fois en croyant mesurer les dérivés. */
  '/crypto?vue=derives',
  '/crypto/bitcoin?onglet=places',
]

/** Sonde exécutée DANS la page. Elle ne voit que le DOM, jamais notre code. */
const PROBE = `(() => {
  const de = document.documentElement
  const vw = de.clientWidth

  /* Un élément à l'intérieur d'un conteneur qui défile horizontalement DOIT pouvoir
     dépasser : c'est le principe même d'un tableau large qu'on fait glisser. On
     remonte donc la chaîne des ancêtres avant d'accuser qui que ce soit. */
  const inScroller = (el) => {
    let p = el.parentElement
    while (p && p !== document.body) {
      const s = getComputedStyle(p)
      if ((s.overflowX === 'auto' || s.overflowX === 'scroll') && p.scrollWidth > p.clientWidth + 1) return true
      p = p.parentElement
    }
    return false
  }

  const name = (el) => {
    const cls = typeof el.className === 'string' ? el.className.trim().split(/\\s+/).slice(0, 6).join(' ') : ''
    return el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (cls ? '.' + cls.replace(/ /g, '.') : '')
  }

  /* Ce qui est caché aux lecteurs d'écran est décoratif : les flèches ▲/▼ des
     variations, les traits de séparation. Leur demander 11 px et 32 px de haut
     noierait le rapport sous des faux positifs. Idem pour ce qui n'existe QUE pour
     les lecteurs d'écran (classe sr-only), invisible par construction. */
  const decorative = (el) =>
    el.closest('[aria-hidden="true"]') !== null || el.closest('.sr-only') !== null

  const wide = []
  const small = []
  const tiny = []

  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect()
    if (r.width === 0 || r.height === 0) continue
    const st = getComputedStyle(el)
    if (st.visibility === 'hidden') continue

    /* Un élément en position fixe n'allonge pas le document, mais s'il dépasse il
       ROGNE ses propres contrôles — un en-tête collé dont le bouton de compte sort de
       l'écran est inatteignable. On le signale, en le distinguant.

       ⚠️ Cette sonde est une CHAÎNE GABARIT côté Node : aucun accent grave ne peut y
       figurer, pas même dans un commentaire, sous peine de la clore au milieu. */
    const over = Math.round(r.right - vw)
    if ((over > 1 || r.left < -1) && !inScroller(el)) {
      wide.push({
        el: name(el),
        over,
        left: Math.round(r.left),
        w: Math.round(r.width),
        ...(st.position === 'fixed' ? { fixed: true } : {}),
      })
    }

    const size = parseFloat(st.fontSize)
    if (
      size > 0 &&
      size < 11 &&
      el.childElementCount === 0 &&
      (el.textContent || '').trim() &&
      !decorative(el)
    ) {
      tiny.push({ el: name(el), size: +size.toFixed(1), text: el.textContent.trim().slice(0, 24) })
    }
  }

  for (const el of document.querySelectorAll('a[href], button, [role="button"], input:not([type="hidden"]), select, summary')) {
    const r = el.getBoundingClientRect()
    if (r.width === 0 || r.height === 0) continue
    const st = getComputedStyle(el)
    if (st.visibility === 'hidden' || decorative(el)) continue
    /* Un lien à l'intérieur d'un paragraphe n'est pas un bouton : on ne lui demande
       pas 32 px de haut, il suit la ligne de texte. Le test porte donc sur ce qui se
       comporte en bloc ou en boîte. */
    if (el.tagName === 'A' && st.display === 'inline' && el.closest('p, li, td, th, caption')) continue
    /* La ligne d'un TABLEAU DENSE est une cible acceptable à 24 px : c'est la
       grammaire du site, et l'épaissir de moitié rendrait un classement de cinquante
       lignes interminable. On ne la mesure donc pas au même aune qu'un bouton. */
    const inRow = el.closest('td, th') !== null
    const minH = 24
    if (r.height < minH || r.width < 24) {
      small.push({ el: name(el), text: (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 28), w: Math.round(r.width), h: Math.round(r.height) })
    }
  }

  /*
   * ── LA MESURE DE VÉRITÉ EST CELLE DU CORPS, PAS CELLE DU DOCUMENT ─────────
   *
   * documentElement.scrollWidth compte aussi le contenu débordant DES CONTENEURS À
   * DÉFILEMENT, alors même qu'ils le clipent correctement. Mesuré : une page dont
   * chaque boîte tient dans l'écran et dont un tableau glisse normalement était
   * annoncée « déborde de 260 px ». Deux pages sur neuf du premier rapport étaient
   * de fausses alertes venues de là.
   *
   * document.body.scrollWidth ne compte que ce qui élargit RÉELLEMENT la page —
   * c'est-à-dire ce que le lecteur ne pourra pas atteindre.
   */
  return {
    vw,
    scrollW: document.body.scrollWidth,
    overflowPx: Math.max(0, document.body.scrollWidth - vw),
    wide: wide.slice(0, 8),
    wideCount: wide.length,
    small: small.slice(0, 8),
    smallCount: small.length,
    tiny: tiny.slice(0, 5),
    tinyCount: tiny.length,
  }
})()`

const arg = (flag, fallback) => {
  const hit = process.argv.find((a) => a.startsWith(`--${flag}=`))
  return hit ? hit.slice(flag.length + 3) : fallback
}

const ENGINES = { chromium, firefox, webkit }

async function main() {
  const engineName = arg('engine', 'chromium')
  const engine = ENGINES[engineName]
  if (!engine) throw new Error(`Moteur inconnu : ${engineName}`)

  const only = arg('device', null)
  const viewports = only ? VIEWPORTS.filter((v) => v.id === only) : VIEWPORTS
  const routesArg = arg('routes', null)
  const shot = arg('shot', null)

  await mkdir(OUT, { recursive: true })

  const browser = await engine.launch()

  /* La découverte a besoin d'une page : on l'ouvre dans un contexte de bureau, le
     seul format où tous les liens sont rendus — un menu replié sous téléphone
     cacherait la moitié des fiches à pêcher. */
  let routes
  if (routesArg) {
    routes = routesArg.split(',')
  } else {
    const bureau = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    const sonde = await bureau.newPage()
    const decouverte = await routesAudit(sonde, BASE)
    await bureau.close()
    routes = [...decouverte.routes, ...ETATS]
    if (decouverte.manquantes.length)
      console.log('motifs sans exemplaire vivant : ' + decouverte.manquantes.join(', '))
    console.log(`${routes.length} routes × ${viewports.length} formats\n`)
  }
  const report = []

  for (const viewport of viewports) {
    const { id, label, ...device } = viewport
    /* WebKit et Firefox refusent `isMobile`/`hasTouch` selon les versions : on
       retire ce que le moteur ne sait pas porter plutôt que de perdre le format. */
    const opts = { ...device }
    if (engineName !== 'chromium') {
      delete opts.isMobile
      delete opts.deviceScaleFactor
    }

    const context = await browser.newContext(opts)
    const page = await context.newPage()

    for (const route of routes) {
      const errors = []
      page.removeAllListeners('console')
      page.removeAllListeners('pageerror')
      page.on('console', (m) => {
        if (m.type() === 'error') errors.push(m.text().slice(0, 200))
      })
      page.on('pageerror', (e) => errors.push(`UNCAUGHT ${e.message}`.slice(0, 200)))

      try {
        await page.goto(BASE + route, { waitUntil: 'networkidle', timeout: 45_000 })
      } catch {
        // `networkidle` expire sur les pages à flux continu : le DOM est là, on mesure.
      }

      /*
       * ATTENDRE QUE LA PAGE SE TAISE.
       *
       * Plusieurs pages se réécrivent après leur premier rendu — flux `Suspense`,
       * redirection d'une recherche, hydratation d'un îlot client. Mesurer pendant ce
       * remaniement détruit le contexte d'exécution sous la sonde, et l'audit rend
       * « Execution context was destroyed » au lieu d'un relevé. On laisse donc le
       * temps aux redirections, puis on vérifie que le document est encore là.
       */
      await page.waitForTimeout(1200)
      try {
        await page.waitForLoadState('domcontentloaded', { timeout: 10_000 })
      } catch {
        /* rien : on mesure ce qui est affiché */
      }

      let probe
      try {
        probe = await page.evaluate(PROBE)
      } catch (error) {
        report.push({ engine: engineName, device: id, label, route, failed: String(error).slice(0, 160) })
        continue
      }

      report.push({ engine: engineName, device: id, label, route, ...probe, errors: errors.slice(0, 5) })

      if (shot && route === shot) {
        await page.screenshot({ path: path.join(OUT, `${engineName}-${id}${route.replace(/\W+/g, '_')}.png`), fullPage: true })
      }
    }

    await context.close()
  }

  await browser.close()

  const file = path.join(OUT, `${engineName}.json`)
  await writeFile(file, JSON.stringify(report, null, 2))

  /* ── SORTIE : LES DÉFAUTS SEULS ────────────────────────────────────────────
     Une liste de deux cents lignes dont cent quatre-vingt-dix disent « rien à
     signaler » se lit comme du bruit. On n'imprime que ce qui cloche, trié par
     gravité — le débordement d'abord, parce qu'il se voit dès l'ouverture. */
  const bad = report.filter(
    (r) => r.failed || r.overflowPx > 0 || (r.errors?.length ?? 0) > 0 || r.smallCount > 0 || r.tinyCount > 0,
  )

  console.log(`\n${engineName} — ${report.length} relevés, ${bad.length} à corriger\n`)

  for (const r of bad.sort((a, b) => (b.overflowPx ?? 0) - (a.overflowPx ?? 0))) {
    if (r.failed) {
      console.log(`✖ ${r.device} ${r.route} — SONDE EN ÉCHEC : ${r.failed}`)
      continue
    }
    const flags = [
      r.overflowPx > 0 ? `déborde de ${r.overflowPx}px (${r.wideCount} él.)` : null,
      r.smallCount > 0 ? `${r.smallCount} cibles < 24px` : null,
      r.tinyCount > 0 ? `${r.tinyCount} textes < 11px` : null,
      r.errors?.length ? `${r.errors.length} erreurs console` : null,
    ].filter(Boolean)

    console.log(`\n▸ ${r.device.padEnd(14)} ${r.route}`)
    console.log(`  ${flags.join(' · ')}`)
    for (const w of r.wide ?? []) console.log(`    ⤷ +${w.over}px  ${w.el}`)
    for (const s of (r.small ?? []).slice(0, 4)) console.log(`    ⤷ ${s.w}×${s.h}  ${s.text || s.el}`)
    for (const t of (r.tiny ?? []).slice(0, 3)) console.log(`    ⤷ ${t.size}px  « ${t.text} »`)
    for (const e of r.errors ?? []) console.log(`    ⚠ ${e}`)
  }

  console.log(`\nRapport complet : ${file}\n`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
