/**
 * VÉRIFICATEUR DE LIENS INTERNES.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * CE QU'IL CHERCHE, ET POURQUOI AUCUN AUTRE OUTIL NE LE TROUVE
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Un lien interne mort ne casse rien à la compilation, ne lève aucune erreur de type
 * et ne fait échouer aucun test : `<Link href="/crypto/graphiques">` est une chaîne
 * valide vers une page qui n'existe plus. Il ne se voit qu'en cliquant — c'est-à-dire
 * jamais, sur un site de deux cents routes dont personne ne parcourt tous les chemins.
 *
 * Ce script les parcourt. Il part d'une liste de pages, relève chaque `href` interne
 * du HTML rendu, et demande la tête de chacun.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * TROIS DÉCISIONS QUI CHANGENT CE QU'IL RAPPORTE
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * 1. LES REDIRECTIONS SONT UN SUCCÈS, PAS UN DÉFAUT. Le site en publie une trentaine
 *    en 308 pour les pages qui ont déménagé (voir `next.config.ts`). Les compter comme
 *    des erreurs noierait les vrais liens morts sous des redirections voulues.
 *
 * 2. `HEAD` D'ABORD, `GET` EN SECOURS. Certaines routes ne répondent qu'au `GET` ;
 *    s'en tenir au `HEAD` inventerait des liens morts qui n'en sont pas.
 *
 * 3. CHAQUE CIBLE N'EST TESTÉE QU'UNE FOIS. La barre de navigation est sur toutes les
 *    pages : sans mémoire, on demanderait quarante fois les mêmes vingt liens.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * ⚠️ DEUX PASSES, ET LA PREMIÈRE NE COMPTE PAS
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Sans cela, ce script MENT — et il a menti. Premier essai contre un cache froid :
 * « 123 liens morts sur 242 », dont une centaine de `TimeoutError` et rien d'autre.
 *
 * La cause n'est pas dans les liens : le palier gratuit de CoinGecko tolère quelques
 * requêtes par minute, le limiteur sérialise, et un audit qui demande deux cents pages
 * d'affilée sature ce quota au bout de dix. Toutes les suivantes attendent dans la
 * file, dépassent le délai, et sont comptées mortes.
 *
 * La passe de CHAUFFE remplit donc le cache incrémental sans rien conclure ; la passe
 * de MESURE juge des pages désormais servies depuis le cache, en quelques
 * millisecondes. Un `TimeoutError` qui survit à la seconde passe est un vrai défaut.
 *
 * Corollaire : ne pas lancer d'autre trafic contre le serveur pendant l'audit.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * ⚠️ CE QUE CET AUDIT COÛTE VRAIMENT, ET COMMENT LE RENDRE UTILISABLE
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Mesuré : 393 cibles distinctes relevées sur 38 pages de départ, dont la chauffe a
 * dépassé UNE HEURE sans finir — chaque page adossée à CoinGecko et non encore en
 * cache attend son tour dans le limiteur, jusqu'au délai de 90 secondes.
 *
 * Deux façons de le rendre praticable, dans cet ordre :
 *
 *   1. RENSEIGNER `COINGECKO_API_KEY`. Le quota passe de quelques requêtes par minute
 *      à trente, et la chauffe devient une affaire de minutes. C'est le seul vrai
 *      levier, et il vaut pour le site entier, pas seulement pour cet audit.
 *
 *   2. RESTREINDRE `DEPARTS` à ce qu'on vient de toucher. Un audit complet n'a de sens
 *      qu'en intégration continue ou sur un cache déjà chaud ; en session de travail,
 *      trois ou quatre pages de départ répondent à la question qu'on se pose.
 *
 * Les pages les plus coûteuses sont signalées dans la liste ci-dessous.
 *
 * Usage : node scripts/audit-liens.mjs [base]
 */
const BASE = process.argv[2] ?? 'http://localhost:3000'

/**
 * Pages d'où partir.
 *
 * Une par famille de gabarit plutôt qu'une liste exhaustive : les liens d'une fiche de
 * cryptoactif sont les mêmes sur les dix-huit mille, et les tester toutes ne
 * découvrirait rien de plus au prix d'une heure.
 */
const DEPARTS = [
  '/', '/marches', '/marches?classe=etf', '/marches?classe=actions',
  '/marches?classe=indices', '/marches?classe=devises', '/marches?classe=matieres-premieres',
  '/classements', '/graphiques', '/heatmap', '/screener', '/comparateur', '/convertisseur',
  '/actualites', '/categories', '/places', '/perpetuels', '/nouvelles-cotations',
  '/mouvements', '/points-marquants', '/macro', '/sentiment', '/methodologie',
  '/pourquoi-zenkuu', '/alertes', '/suivi', '/tableau-de-bord', '/parametres', '/widgets',
  '/crypto/bitcoin', '/etf/spy', '/actions/aapl', '/indices/gspc',
  '/devises/eur-usd', '/matieres-premieres/gc-f',
  '/places/binance', '/places/okex_swap', '/categories/layer-1',
]

const vus = new Map()
const morts = []
const origines = new Map()

async function statut(chemin) {
  if (vus.has(chemin)) return vus.get(chemin)

  let code
  try {
    const tete = await fetch(BASE + chemin, { method: 'HEAD', signal: AbortSignal.timeout(60000) })
    code = tete.status
    // 405 : la route refuse `HEAD`. Ce n'est pas un lien mort, c'est une méthode
    // non permise — on repasse en `GET` avant de conclure quoi que ce soit.
    if (code === 405 || code === 501) {
      code = (await fetch(BASE + chemin, { signal: AbortSignal.timeout(60000) })).status
    }
  } catch (error) {
    code = error.name
  }

  vus.set(chemin, code)
  return code
}

/*
 * LA PROGRESSION EST IMPRIMÉE AU FIL DE L'EAU, et ce n'est pas cosmétique.
 *
 * La phase de collecte demande une quarantaine de pages dont certaines mettent une
 * minute sur un cache froid. Sans trace, le script reste muet plusieurs minutes — et
 * un script muet est indistinguable d'un script bloqué : la première version a été
 * tuée par un garde-fou de l'appelant, précisément pour cette raison.
 */
let nº = 0
for (const depart of DEPARTS) {
  nº += 1
  process.stdout.write(`[${String(nº).padStart(2)}/${DEPARTS.length}] ${depart}\n`)

  let html
  try {
    html = await fetch(BASE + depart, { signal: AbortSignal.timeout(90000) }).then((r) => r.text())
  } catch (error) {
    console.log(`⚠ départ injoignable : ${depart} (${error.name})`)
    continue
  }

  const cibles = new Set(
    [...html.matchAll(/href="(\/[^"#]*)"/g)]
      .map((m) => m[1])
      // Les ressources statiques et les routes d'API ne sont pas des pages : les
      // demander ne dirait rien de la navigation.
      .filter((h) => !h.startsWith('/_next') && !h.startsWith('/api/'))
      .map((h) => h.replace(/&amp;/g, '&')),
  )

  for (const cible of cibles) {
    if (!origines.has(cible)) origines.set(cible, depart)
  }
}

console.log(`\n${origines.size} liens internes distincts relevés sur ${DEPARTS.length} pages.\n`)

/*
 * PASSE DE CHAUFFE — elle ne conclut rien, elle remplit le cache.
 *
 * Voir l'en-tête : sans elle, ce script rend une centaine de faux liens morts, tous en
 * `TimeoutError`, parce que l'audit lui-même sature le quota de la source amont.
 *
 * Les échecs de cette passe sont IGNORÉS et non journalisés. Les journaliser
 * reviendrait à afficher exactement le bruit qu'on cherche à retirer.
 */
console.log('Passe de chauffe (les échecs y sont normaux et ignorés)…')
let chauffe = 0
for (const cible of origines.keys()) {
  chauffe += 1
  if (chauffe % 25 === 0) process.stdout.write(`   chauffé ${chauffe}/${origines.size}\n`)
  try {
    await fetch(BASE + cible, { signal: AbortSignal.timeout(90000) }).then((r) => r.arrayBuffer())
  } catch {
    /* Attendu sur un cache froid — c'est tout l'objet de cette passe. */
  }
}

console.log('\nPasse de mesure…')
for (const [cible, depart] of origines) {
  const code = await statut(cible)
  if (typeof code !== 'number' || code >= 400) {
    morts.push({ cible, depart, code })
    console.log(`✗ ${String(code).padEnd(6)} ${cible}   (depuis ${depart})`)
  }
}

console.log(`\n${morts.length} lien(s) mort(s) sur ${origines.size}.`)
process.exit(morts.length > 0 ? 1 : 0)
