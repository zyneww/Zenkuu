import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * « L'AUDIT EST COMPLET » DOIT ÊTRE UNE COMMANDE, PAS UNE AFFIRMATION
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * COINGECKO_AUDIT.md se construit sur plusieurs sessions, une page par commit. Un
 * document de cette taille, relu à l'œil, laisse passer un champ vide ou une case
 * cochée sans entrée — et c'est précisément ce genre de trou qui se découvre en
 * phase d'implémentation, quand il coûte le plus cher.
 *
 * Ce script vérifie la STRUCTURE du document, pas la qualité de l'audit. Il ne sait
 * pas si une mesure est juste ; il sait qu'elle est présente, datée et rattachée à
 * une page de la liste.
 *
 * Usage :
 *   node scripts/audit-coingecko-doc.mjs            # structure seule
 *   node scripts/audit-coingecko-doc.mjs --strict   # exige AUSSI que tout soit coché
 */

/** Les dix champs du schéma d'entrée, dans l'ordre où ils doivent apparaître. */
export const CHAMPS = [
  'Date du relevé',
  'Rôle',
  'Priorité',
  'État',
  'Composants',
  'Fonctionnalités',
  'Interactions',
  'Données requises',
  'Écart avec ZENKUU',
  'Notes',
]

/** `- [x] Accueil — ` + une URL entre accents graves. */
const LIGNE_CASE = /^- \[( |x)\] .*?`(\/[^`]*)`/gm

/** `### Accueil — ` + la même URL. */
const TITRE_ENTREE = /^### .+?`(\/[^`]*)`\s*$/gm

/**
 * Découpe le corps d'une entrée en champs.
 *
 * La valeur d'un champ ne tient PAS forcément sur sa ligne : « Composants » est une
 * liste posée en dessous. Chaque champ court donc jusqu'au marqueur suivant, ce qui
 * absorbe naturellement les lignes de continuation.
 */
function champsDe(corps) {
  const table = new Map()
  const marqueurs = [...corps.matchAll(/^- \*\*(.+?)\*\* *:(.*)$/gm)]
  marqueurs.forEach((marqueur, index) => {
    const debut = marqueur.index + marqueur[0].length
    const fin = index + 1 < marqueurs.length ? marqueurs[index + 1].index : corps.length
    table.set(marqueur[1], (marqueur[2] + corps.slice(debut, fin)).trim())
  })
  return table
}

export function verifier(source) {
  const problemes = []

  const cases = new Map()
  for (const ligne of source.matchAll(LIGNE_CASE)) {
    cases.set(ligne[2], ligne[1] === 'x')
  }

  const titres = [...source.matchAll(TITRE_ENTREE)]
  const entrees = new Map()
  titres.forEach((titre, index) => {
    const debut = titre.index + titre[0].length
    const fin = index + 1 < titres.length ? titres[index + 1].index : source.length
    entrees.set(titre[1], source.slice(debut, fin))
  })

  if (cases.size === 0) {
    problemes.push('Aucune liste de pages : la section « Liste des pages » est vide ou absente.')
  }

  for (const [url, corps] of entrees) {
    if (!cases.has(url)) {
      problemes.push(`${url} : entrée présente mais absente de la liste des pages.`)
    }
    const champs = champsDe(corps)
    for (const champ of CHAMPS) {
      if (!champs.has(champ)) problemes.push(`${url} : champ « ${champ} » manquant.`)
      else if (champs.get(champ) === '') problemes.push(`${url} : champ « ${champ} » vide.`)
    }
    const date = champs.get('Date du relevé')
    if (date !== undefined && date !== '' && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      problemes.push(`${url} : « Date du relevé » n’est pas une date AAAA-MM-JJ.`)
    }
  }

  for (const [url, cochee] of cases) {
    if (cochee && !entrees.has(url)) {
      problemes.push(`${url} : case cochée sans entrée d’audit.`)
    }
  }

  const restantes = [...cases].filter(([, cochee]) => !cochee).map(([url]) => url)
  return { problemes, restantes, entrees: entrees.size }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const strict = process.argv.includes('--strict')
  const source = readFileSync(new URL('../COINGECKO_AUDIT.md', import.meta.url), 'utf8')
  const { problemes, restantes, entrees } = verifier(source)

  for (const probleme of problemes) console.error(`✗ ${probleme}`)
  console.log(`${entrees} entrée(s) · ${restantes.length} page(s) restante(s)`)

  const incomplet = strict && restantes.length > 0
  if (incomplet) {
    console.error(`✗ --strict : ${restantes.length} page(s) non auditée(s) — ${restantes.join(', ')}`)
  }
  process.exit(problemes.length > 0 || incomplet ? 1 : 0)
}
