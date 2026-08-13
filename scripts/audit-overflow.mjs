/**
 * Traque du coupable d'un débordement horizontal.
 *
 * ── POURQUOI UN SECOND OUTIL ─────────────────────────────────────────────────
 *
 * `audit-responsive.mjs` répond « cette page déborde de 260 px » et nomme les
 * éléments qui dépassent le bord droit. Sur deux pages il n'en trouve AUCUN, et le
 * document déborde quand même. Ce n'est pas une contradiction : un conteneur qui
 * défile horizontalement absorbe ses enfants trop larges, mais s'il ne peut pas
 * RÉTRÉCIR sous sa propre largeur intrinsèque, c'est LUI qui pousse le document.
 *
 * C'est le piège classique de la boîte flexible : un enfant de `flex` ou de `grid`
 * a une largeur minimale automatique égale à son contenu, et `overflow-x: auto` ne
 * s'applique jamais parce que la boîte ne descend jamais sous cette taille. La
 * correction tient en `min-width: 0` sur le bon ancêtre — encore faut-il savoir
 * lequel.
 *
 * Cet outil remonte donc depuis les feuilles : pour chaque élément, il compare sa
 * largeur de DÉFILEMENT à celle de son parent, et signale le premier endroit où le
 * contenu cesse de tenir. C'est là qu'il faut poser `min-w-0`.
 *
 *   node scripts/audit-overflow.mjs /crypto
 *   node scripts/audit-overflow.mjs /crypto --device=iphone-se
 */

import { chromium, devices } from 'playwright'

const BASE = process.env.AUDIT_BASE ?? 'http://localhost:3000'

const PROBE = `(() => {
  const de = document.documentElement
  const vw = de.clientWidth
  const out = []

  const name = (el) => {
    const cls = typeof el.className === 'string' ? el.className.trim().split(/\\s+/).slice(0, 8).join('.') : ''
    return el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (cls ? '.' + cls : '')
  }

  const chain = (el) => {
    const parts = []
    let p = el
    while (p && p !== document.body && parts.length < 5) {
      parts.push(name(p).slice(0, 60))
      p = p.parentElement
    }
    return parts
  }

  for (const el of document.querySelectorAll('body *')) {
    const st = getComputedStyle(el)
    if (st.display === 'none' || st.visibility === 'hidden') continue

    /* Un élément dont le contenu dépasse sa propre boîte est un CANDIDAT ; il ne
       devient coupable que si sa boîte, elle, dépasse déjà le viewport. Les deux
       ensemble décrivent exactement le cas ou la largeur intrinsèque a gagné. */
    const excess = el.scrollWidth - el.clientWidth
    if (excess <= 1) continue

    const r = el.getBoundingClientRect()
    const scrolls = st.overflowX === 'auto' || st.overflowX === 'scroll'

    out.push({
      el: name(el).slice(0, 90),
      excess,
      boxW: Math.round(r.width),
      scrollW: el.scrollWidth,
      scrolls,
      /* Le vrai signal : une boîte plus large que l'écran ALORS QU'elle est censée
         défiler. Elle n'a pas pu rétrécir, donc elle pousse le document. */
      guilty: Math.round(r.width) > vw + 1,
      chain: chain(el),
    })
  }

  /*
   * ── DESCENTE PAR EXTINCTION ────────────────────────────────────────────────
   *
   * Les mesures ci-dessus ne suffisent pas toujours. Un élément peut allonger le
   * document sans que sa propre boîte dépasse : une marge négative, une ombre
   * portée, un enfant en position absolue poussé vers la droite, un pseudo-élément.
   * Aucune propriété lue sur l'élément ne le révèle.
   *
   * On procède donc par ÉLIMINATION, comme on débranche les disjoncteurs un par un :
   * on masque chaque enfant, on remesure le document, on rétablit. Celui dont
   * l'extinction fait tomber la largeur EST le contributeur — c'est une preuve, pas
   * une corrélation. On recommence dans ses enfants jusqu'à la feuille.
   *
   * Coûteux (un recalcul de mise en page par nœud visité), mais borné : on ne
   * descend que dans la branche coupable, soit une dizaine de niveaux.
   */
  /*
   * ⚠️ ON MESURE LE CORPS, PAS LE DOCUMENT.
   *
   * documentElement.scrollWidth compte le contenu des conteneurs à défilement même
   * lorsqu'ils le clipent correctement : deux pages sur neuf du premier rapport
   * étaient de fausses alertes venues de là. document.body.scrollWidth ne compte que
   * ce qui élargit RÉELLEMENT la page — c'est-à-dire ce que le lecteur ne pourra pas
   * atteindre.
   */
  const blame = []
  const target = document.body.scrollWidth
  if (target > vw + 1) {
    let node = document.body
    let depth = 0
    while (node && depth < 14) {
      let next = null
      for (const child of Array.from(node.children)) {
        const prev = child.style.display
        child.style.display = 'none'
        const without = document.body.scrollWidth
        child.style.display = prev
        if (without < target - 1) {
          blame.push({ el: name(child).slice(0, 110), drops: target - without, depth })
          next = child
          break
        }
      }
      if (!next) break
      node = next
      depth += 1
    }
  }

  return { vw, docScroll: target, overflow: target - vw, candidates: out, blame }
})()`

const arg = (flag, fallback) => {
  const hit = process.argv.find((a) => a.startsWith('--' + flag + '='))
  return hit ? hit.slice(flag.length + 3) : fallback
}

async function main() {
  const route = process.argv[2] ?? '/'
  const deviceId = arg('device', 'iphone')
  const map = {
    'iphone-se': devices['iPhone SE'],
    iphone: devices['iPhone 15'],
    galaxy: devices['Galaxy S24'],
    ipad: devices['iPad (gen 7)'],
  }

  const browser = await chromium.launch()
  const context = await browser.newContext(map[deviceId] ?? devices['iPhone 15'])
  const page = await context.newPage()

  try {
    await page.goto(BASE + route, { waitUntil: 'networkidle', timeout: 45_000 })
  } catch {
    /* on mesure ce qui est affiché */
  }
  await page.waitForTimeout(1200)

  const result = await page.evaluate(PROBE)
  await browser.close()

  console.log(`\n${route} @ ${deviceId} — viewport ${result.vw}px, document ${result.docScroll}px (déborde de ${result.overflow}px)\n`)

  if (result.blame?.length) {
    console.log('CHEMIN DU COUPABLE — prouvé en masquant chaque nœud tour à tour :')
    for (const b of result.blame) {
      console.log(`${'  '.repeat(b.depth + 1)}↳ −${b.drops}px  ${b.el}`)
    }
    console.log()
  }

  const guilty = result.candidates.filter((c) => c.guilty)
  const rest = result.candidates.filter((c) => !c.guilty)

  if (guilty.length) {
    console.log('COUPABLES — boîte plus large que l’écran :')
    for (const c of guilty.slice(0, 10)) {
      console.log(`\n  ${c.el}`)
      console.log(`    boîte ${c.boxW}px, contenu ${c.scrollW}px, défile: ${c.scrolls}`)
      console.log(`    chaîne : ${c.chain.join('  ←  ')}`)
    }
  } else {
    console.log('Aucune boîte plus large que l’écran — le débordement vient d’un contenu qui déborde sans élargir sa boîte.')
  }

  console.log(`\n${rest.length} autres conteneurs dont le contenu dépasse (défilement normal) :`)
  for (const c of rest.slice(0, 12)) {
    console.log(`  ${c.scrolls ? '↔' : '✂'} +${c.excess}px  ${c.el.slice(0, 80)}`)
  }
  console.log()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
