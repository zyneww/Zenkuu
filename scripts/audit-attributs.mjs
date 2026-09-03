/**
 * ══════════════════════════════════════════════════════════════════════════════
 * AUDIT DES ATTRIBUTS — CE QU'UNE SYNTHÈSE VOCALE ANNONCE, ET QUE L'ŒIL NE VOIT PAS
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * `.notes/bugs-a-traiter.md`, point 4 : « Les attributs d'accessibilité sont restés
 * en français. » Le comparateur fr/en de l'époque découpait le HTML sur les balises
 * et ne regardait jamais dans les attributs ; les sondes qui ont suivi lisaient
 * `innerText`, ce qui revient au même. Tout `aria-label`, `title` et `placeholder`
 * français échappait aux deux.
 *
 * ── POURQUOI DES MOTS-OUTILS ET NON UNE LISTE DE LIBELLÉS ──────────────────
 *
 * La première version cherchait vingt-cinq libellés d'interface — « Fermer »,
 * « Devise », « Paramètres ». Elle a laissé passer les trois défauts réels du site :
 * « Depuis le 1ᵉʳ janvier », « Variation sur 24 heures », et une phrase entière sur
 * l'absence d'historique. Aucun de ces textes n'était dans la liste, et aucune liste
 * de libellés ne pouvait les contenir : ce sont des PHRASES, pas des boutons.
 *
 * Les mots-outils, eux, trahissent une phrase française quelle qu'elle soit — « le »,
 * « des », « pour », « depuis », « cet ». Ils sont peu nombreux, très fréquents, et
 * aucun n'est un mot anglais. C'est ce qui les rend fiables là où une liste de
 * libellés est condamnée à être incomplète.
 *
 * ── POURQUOI EN HTTP ET NON AU NAVIGATEUR ──────────────────────────────────
 *
 * Les attributs sont dans le HTML rendu par le serveur : aucun besoin d'exécuter la
 * page. Quarante-neuf routes en quelques secondes contre vingt minutes pour un
 * passage Playwright — assez rapide pour être lancé à chaque fois, ce qui est la
 * seule qualité qui compte pour un contrôle de ce genre.
 *
 * ⚠️ CE QUI ÉCHAPPE À CE CHOIX : les attributs posés APRÈS l'hydratation, par une
 * bibliothèque cliente. `audit-interactif` les voit, lui, puisqu'il mesure le DOM
 * vivant. Les deux sondes se complètent, aucune ne remplace l'autre.
 */

import { chromium } from 'playwright'
import { routesAudit } from './routes-audit.mjs'

const BASE = process.env.AUDIT_BASE ?? 'http://localhost:3000'

/**
 * ⚠️ DES MOTS QUI N'EXISTENT PAS EN ANGLAIS, ET QUI SONT PARTOUT EN FRANÇAIS.
 *
 * Pas « format », « distance » ni « attribution », identiques dans les deux langues.
 * Pas « sur » seul non plus — il faut la limite de mot, sans quoi « sur » s'accroche
 * dans « surface » et « measure ».
 */
const OUTILS = [
  'le', 'la', 'les', 'un', 'une', 'des', 'du', 'aux',
  'pour', 'sur', 'sans', 'avec', 'depuis', 'entre', 'vers', 'chez',
  'ce', 'cet', 'cette', 'ces', 'son', 'sa', 'ses', 'leur',
  'est', 'sont', 'était', 'sera', 'pas', 'plus', 'très', 'aucun', 'aucune',
  'que', 'qui', 'dont', 'où', 'et', 'ou', 'mais', 'donc',
]

const ATTRIBUTS = ['aria-label', 'title', 'placeholder', 'aria-description']

/*
 * ⚠️ `alt` EST HORS DU CHAMP, ET C'EST DÉLIBÉRÉ. Les vignettes d'actualité portent
 * le titre de l'article, en français chez les rédactions françaises : c'est du
 * contenu, pas de l'interface. Le traduire reviendrait à réécrire l'article d'autrui.
 */

/** Deux mots-outils au moins : un seul se rencontre dans un nom propre ou un sigle. */
function estFrancais(valeur) {
  const mots = valeur.toLowerCase().match(/[\p{L}’']+/gu) ?? []
  const trouves = new Set(mots.filter((m) => OUTILS.includes(m)))
  return trouves.size >= 2 ? [...trouves] : null
}

const navigateur = await chromium.launch()
const page = await (await navigateur.newContext()).newPage()
const { routes } = await routesAudit(page, BASE)
await navigateur.close()

console.log(`${routes.length} routes anglaises, attributs ${ATTRIBUTS.join(' / ')}\n`)

const vus = new Map()
let total = 0
for (const route of routes) {
  const url = BASE + '/en' + (route === '/' ? '' : route)
  let html
  try {
    const r = await fetch(url, { redirect: 'follow' })
    html = await r.text()
  } catch (error) {
    console.log(`${route.padEnd(34)} ÉCHEC ${String(error).slice(0, 50)}`)
    continue
  }

  const fautifs = []
  for (const attribut of ATTRIBUTS) {
    for (const m of html.matchAll(new RegExp(`${attribut}="([^"]{8,200})"`, 'g'))) {
      const valeur = m[1].replace(/&#x27;|&apos;/g, '’').replace(/&amp;/g, '&').replace(/&quot;/g, '"')
      if (!estFrancais(valeur)) continue
      const cle = attribut + '|' + valeur
      if (vus.has(cle)) continue
      vus.set(cle, route)
      fautifs.push(`${attribut}="${valeur.slice(0, 78)}"`)
    }
  }
  total += fautifs.length
  if (fautifs.length) console.log(`${route}\n  ` + fautifs.join('\n  '))
}

console.log(
  '\n' + (total === 0
    ? 'Aucun attribut français sur les pages anglaises.'
    : `${total} attributs français à traduire.`),
)
