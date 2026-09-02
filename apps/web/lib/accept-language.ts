/**
 * ══════════════════════════════════════════════════════════════════════════════
 * CE QUE LE NAVIGATEUR DIT DE LUI-MÊME — LANGUE ET DEVISE
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Un navigateur envoie son `Accept-Language` à chaque requête. Il porte deux
 * informations distinctes, et le projet ne se servait d'aucune des deux :
 *
 *   `fr-CA,fr;q=0.9,en;q=0.8`
 *    ▲  ▲        ▲
 *    │  │        └── les langues de repli, par ordre de préférence
 *    │  └─────────── la RÉGION : le Canada, donc le dollar canadien
 *    └────────────── la LANGUE : le français
 *
 * ── POURQUOI LA RÉGION EST UNE MEILLEURE SOURCE QUE L'ADRESSE IP ───────────
 *
 * L'IP dit où la connexion sort, ce qui n'est pas où l'utilisateur vit : un VPN, un
 * relais d'entreprise ou un opérateur mobile la déplacent d'un pays. `Accept-Language`
 * dit ce que la personne a RÉGLÉ dans son système. C'est une déclaration plutôt qu'une
 * mesure — moins précise en théorie, plus juste en pratique, et elle ne demande aucun
 * service tiers ni aucune donnée de localisation.
 *
 * ── CE QUE CE MODULE NE FAIT PAS ───────────────────────────────────────────
 *
 * Il ne décide rien : il LIT. Le choix explicite de l'utilisateur, mémorisé en
 * stockage local ou en cookie, prime toujours sur ce que l'en-tête suggère — un
 * réglage qu'on a pris la peine d'exprimer ne doit jamais être écrasé par une
 * déduction. Les appelants appliquent cette règle ; voir `CurrencyProvider`.
 */

/** Une préférence lue dans l'en-tête, avec son poids. */
type Preference = { readonly tag: string; readonly quality: number }

/**
 * Découpe l'en-tête en préférences ordonnées.
 *
 * ⚠️ L'ORDRE D'ÉCRITURE N'EST PAS L'ORDRE DE PRÉFÉRENCE. `en;q=0.5,de;q=0.9` place
 * l'anglais en premier dans la chaîne et l'allemand en premier dans l'intention. Une
 * lecture naïve qui prendrait le premier segment se tromperait sur ce cas, qui est
 * exactement celui d'un germanophone dont le système est en anglais.
 *
 * Le `q` par défaut est 1 (RFC 9110 §12.4.2), donc un segment sans `q` gagne toujours
 * contre un segment qui en porte un.
 */
export function parseAcceptLanguage(header: string | null | undefined): Preference[] {
  if (!header) return []

  return header
    .split(',')
    .map((part): Preference | null => {
      const [tag, ...params] = part.trim().split(';')
      if (tag === undefined || tag === '') return null

      const q = params
        .map((p) => p.trim())
        .find((p) => p.startsWith('q='))
        ?.slice(2)

      const quality = q === undefined ? 1 : Number.parseFloat(q)
      // Un `q` illisible vaut zéro par prudence : mieux vaut ignorer un segment
      // douteux que lui donner la priorité par accident.
      if (!Number.isFinite(quality) || quality <= 0) return null

      return { tag: tag.toLowerCase(), quality }
    })
    .filter((p): p is Preference => p !== null)
    .sort((a, b) => b.quality - a.quality)
}

/**
 * ── LA RÉGION VERS LA DEVISE ────────────────────────────────────────────────
 *
 * Ne figurent que les régions dont la devise est réellement proposée par le site : la
 * table de `frankfurter.ts` fait foi. Un pays absent d'ici retombe sur la devise de
 * référence plutôt que sur une devise que le convertisseur ne saurait pas afficher.
 *
 * ⚠️ LA ZONE EURO EST ÉNUMÉRÉE PAYS PAR PAYS, ET C'EST VOLONTAIRE. « Europe » n'est
 * pas une région au sens des étiquettes de langue, et surtout la Suède, la Pologne, la
 * Tchéquie, la Hongrie, la Roumanie, la Bulgarie et le Danemark sont dans l'Union sans
 * être dans l'euro. Une règle « UE ⇒ EUR » se tromperait sur sept pays.
 */
const REGION_CURRENCY: Readonly<Record<string, string>> = {
  // ── Zone euro ─────────────────────────────────────────────────────────────
  AT: 'EUR', BE: 'EUR', CY: 'EUR', DE: 'EUR', EE: 'EUR', ES: 'EUR', FI: 'EUR',
  FR: 'EUR', GR: 'EUR', HR: 'EUR', IE: 'EUR', IT: 'EUR', LT: 'EUR', LU: 'EUR',
  LV: 'EUR', MT: 'EUR', NL: 'EUR', PT: 'EUR', SI: 'EUR', SK: 'EUR',

  // ── Dollar américain, et les pays qui l'ont adopté ───────────────────────
  US: 'USD', EC: 'USD', SV: 'USD', PA: 'USD',

  // ── Les autres majeures ──────────────────────────────────────────────────
  GB: 'GBP', JP: 'JPY', CH: 'CHF', CA: 'CAD', AU: 'AUD', CN: 'CNY', NZ: 'NZD',

  // ── Europe hors euro ─────────────────────────────────────────────────────
  SE: 'SEK', NO: 'NOK', DK: 'DKK', PL: 'PLN', CZ: 'CZK', HU: 'HUF',
  RO: 'RON', BG: 'BGN', IS: 'ISK', TR: 'TRY',

  // ── Reste du monde, dans les limites de la table du convertisseur ────────
  BR: 'BRL', MX: 'MXN', IN: 'INR', ID: 'IDR', KR: 'KRW', MY: 'MYR',
  PH: 'PHP', SG: 'SGD', TH: 'THB', ZA: 'ZAR', IL: 'ILS', HK: 'HKD',
}

/**
 * La devise que l'en-tête suggère, ou `undefined` s'il ne suggère rien d'utilisable.
 *
 * `undefined` PLUTÔT QU'UNE VALEUR PAR DÉFAUT : l'appelant seul sait quoi faire d'une
 * absence — garder son réglage courant, ou retomber sur la devise de référence. Rendre
 * « EUR » ici confondrait « le visiteur est en zone euro » avec « on ne sait pas », et
 * ces deux cas ne se traitent pas pareil.
 */
export function currencyFromAcceptLanguage(header: string | null | undefined): string | undefined {
  for (const { tag } of parseAcceptLanguage(header)) {
    // `fr-CA` → « CA ». Une étiquette sans région (`fr`) ne dit rien du pays : on
    // passe à la suivante plutôt que de deviner la France depuis le français, ce qui
    // se tromperait sur la Belgique, la Suisse et le Canada.
    const region = tag.split('-')[1]
    if (region === undefined) continue

    const currency = REGION_CURRENCY[region.toUpperCase()]
    if (currency !== undefined) return currency
  }

  return undefined
}

/**
 * La langue que l'en-tête suggère, parmi celles que le site traduit.
 *
 * `zh-Hant-TW` porte trois sous-étiquettes ; seule la première nous intéresse, le site
 * ne distinguant pas les écritures. `pt-BR` est l'exception — c'est une locale du
 * projet à part entière — d'où l'essai de l'étiquette COMPLÈTE avant sa racine.
 */
export function localeFromAcceptLanguage(
  header: string | null | undefined,
  supported: readonly string[],
): string | undefined {
  const connues = new Set(supported.map((l) => l.toLowerCase()))

  for (const { tag } of parseAcceptLanguage(header)) {
    if (connues.has(tag)) return supported.find((l) => l.toLowerCase() === tag)

    const racine = tag.split('-')[0]
    if (racine !== undefined && connues.has(racine)) {
      return supported.find((l) => l.toLowerCase() === racine)
    }
  }

  return undefined
}
