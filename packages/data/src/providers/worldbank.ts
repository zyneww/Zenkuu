import { createHttpClient } from '../http'
import { ProviderError } from '../types'

/**
 * INDICATEURS MACROÉCONOMIQUES PAR PAYS — API de la Banque mondiale.
 *
 * ── POURQUOI CETTE SOURCE ET PAS UNE AUTRE ────────────────────────────────────
 *
 * Elle est publique, sans clé, sans quota annoncé, et surtout : ses séries sont
 * DOCUMENTÉES et harmonisées entre pays. C'est le point qui décide, parce qu'une
 * carte macro compare des pays entre eux — et comparer une inflation calculée sur
 * un panier français avec une inflation calculée sur un panier argentin par une
 * autre méthode ne compare rien.
 *
 * ── CE QU'ELLE NE PEUT PAS DONNER, ET IL FAUT LE DIRE ─────────────────────────
 *
 * Une donnée ANNUELLE, et publiée avec retard. L'inflation d'un pays y est celle de
 * l'année civile close, pas celle du mois dernier ; certains pays ont un an de plus
 * de retard que d'autres. Chaque valeur porte donc son ANNÉE, et l'interface doit
 * l'afficher — sans elle, deux pays côte à côte peuvent décrire deux moments
 * différents sans que rien ne le signale (§5).
 *
 * C'est aussi ce qui distingue cette page d'une carte macro de plateforme de
 * trading : celles-ci affichent des taux directeurs à la journée, obtenus par des
 * abonnements payants. Nous affichons ce qui est vérifiable et gratuit, en le
 * nommant pour ce qu'il est.
 *
 * ── UN APPEL PAR INDICATEUR, POUR TOUS LES PAYS ───────────────────────────────
 *
 * `country/all` rend les 265 entités en une requête. C'est ce qui rend la page
 * tenable : une requête par pays en ferait deux cent soixante-cinq.
 */

const PROVIDER_ID = 'worldbank'

export const WORLDBANK_SOURCE = {
  label: 'Banque mondiale',
  attributionUrl: 'https://data.worldbank.org/',
} as const

/*
 * `/v2/fr` ET NON `/v2` — la source publie ses libellés en français.
 *
 * C'est le détail qui évite une table de traduction maison de deux cents pays et de
 * sept régions. Une telle table aurait été fausse dès le premier changement de nom —
 * la Turquie est devenue « Türkiye » dans les catalogues internationaux en 2022, la
 * Macdoine du Nord en 2019 — et personne ne l'aurait remarqué avant de lire la carte.
 * En passant par le préfixe de langue, c'est la source qui tient le libellé, et elle
 * le corrige pour nous.
 *
 * Les codes ISO et le discriminant d'agrégat (`region.id === 'NA'`) sont identiques
 * dans les deux langues : rien d'autre ne change.
 */
const http = createHttpClient({
  providerId: PROVIDER_ID,
  baseUrl: 'https://api.worldbank.org/v2/fr',
  /*
   * La Banque mondiale ne publie AUCUN quota, et le débit obtenu en pratique est
   * confortable. Le plafond posé ici n'est donc pas une contrainte de la source mais
   * une prudence de notre côté : une page qui appelle cinq indicateurs à la suite doit
   * rester loin de tout seuil qu'un serveur public pourrait appliquer sans le dire.
   *
   * Le vrai garde-fou est ailleurs : ces séries sont ANNUELLES, et le cache applicatif
   * les garde six heures (voir `getMacroIndicator`). En régime normal, cette source
   * est interrogée quelques fois par jour.
   */
  maxRequestsPerWindow: 30,
  /* Les réponses font plusieurs centaines de kilo-octets et changent une fois par an :
     le cache HTTP de Next.js n'a rien à y gagner, et le cache applicatif prend le
     relais avec un TTL bien plus long. */
  bypassNextCache: true,
  /*
   * ── UN ÉCHEC RAPIDE PLUTÔT QU'UNE PAGE QUI ATTEND ────────────────────────
   *
   * Ce service RÉPOND MAL PAR MOMENTS, et c'est mesuré : des séries qui rendent 265
   * lignes en une seconde, puis des 502 sur TOUTES les séries pendant plusieurs
   * minutes — y compris celles qui venaient de fonctionner. Ce n'est donc pas un
   * indicateur cassé, c'est un serveur public qui plie sous la charge.
   *
   * Avec les valeurs par défaut, une panne coûtait vingt et une secondes d'attente
   * avant l'état vide — dix pour le délai, dix pour la reprise. Relevé sur
   * `/macro?indicateur=dette`. C'est le pire des deux mondes : le lecteur attend, et
   * il finit quand même par lire « indisponible ».
   *
   * Huit secondes, sans reprise. La reprise part en premier parce qu'elle ne sert à
   * rien ici : quand ce service tombe, il tombe pour plusieurs minutes, pas pour une
   * requête. Les reprises après 429 et 5xx restent actives — elles sont immédiates.
   */
  timeoutMs: 8_000,
  retryOnTimeout: false,
})

/**
 * Les cinq indicateurs retenus.
 *
 * Ce sont ceux qu'une carte macro montre partout, à une nuance près qui doit être
 * dite : le « taux d'intérêt » des plateformes de trading est le TAUX DIRECTEUR de la
 * banque centrale, publié à la journée et vendu par abonnement. La Banque mondiale
 * publie un taux d'intérêt RÉEL — le taux prêteur diminué de l'inflation — qui est une
 * grandeur différente, annuelle, et gratuite. Le libellé le nomme précisément plutôt
 * que d'emprunter le nom de l'autre.
 */
export const MACRO_INDICATORS = [
  {
    id: 'inflation',
    code: 'FP.CPI.TOTL.ZG',
    label: 'Inflation',
    unit: '%',
    hint: 'Hausse des prix à la consommation sur l’année, telle que publiée par chaque institut national et harmonisée par la Banque mondiale.',
    /** Sens de lecture : une valeur haute est-elle plutôt bonne ou mauvaise ? */
    tone: 'high-bad',
  },
  {
    id: 'chomage',
    code: 'SL.UEM.TOTL.ZS',
    label: 'Chômage',
    unit: '%',
    hint: 'Part de la population active sans emploi, estimation harmonisée du Bureau international du travail. Elle peut différer du chiffre national, qui suit d’autres définitions.',
    tone: 'high-bad',
  },
  {
    id: 'croissance',
    code: 'NY.GDP.MKTP.KD.ZG',
    label: 'Croissance du PIB',
    unit: '%',
    hint: 'Variation annuelle du produit intérieur brut en volume, donc corrigée de l’inflation.',
    tone: 'high-good',
  },
  {
    id: 'dette',
    code: 'GC.DOD.TOTL.GD.ZS',
    label: 'Dette publique',
    unit: '% du PIB',
    hint: 'Dette de l’administration centrale rapportée au PIB. Elle exclut les collectivités locales et la sécurité sociale, et se compare donc mal aux chiffres de Maastricht.',
    tone: 'high-bad',
  },
  {
    id: 'interets',
    code: 'FR.INR.RINR',
    label: 'Taux d’intérêt réel',
    unit: '%',
    hint: 'Taux prêteur diminué de l’inflation. Ce n’est PAS le taux directeur de la banque centrale, que la Banque mondiale ne publie pas.',
    tone: 'neutral',
  },
] as const

export type MacroIndicatorId = (typeof MACRO_INDICATORS)[number]['id']

export interface MacroObservation {
  /** Code ISO 3166-1 alpha-3 — `FRA`, `USA`. */
  iso3: string
  country: string
  /** Région Banque mondiale, pour le regroupement géographique. */
  region: string
  /** Année de l'observation. Elle DIFFÈRE d'un pays à l'autre — voir l'en-tête. */
  year: number
  value: number
}

/* ── Forme brute ─────────────────────────────────────────────────────────── */

interface RawCountry {
  id: string
  iso2Code: string
  name: string
  region: { id: string; value: string }
}

interface RawObservation {
  countryiso3code: string
  country: { value: string }
  date: string
  value: number | null
}

/**
 * Catalogue des pays, et le filtre qui écarte les AGRÉGATS.
 *
 * La réponse mêle des pays et des ensembles — « Monde arabe », « Zone euro »,
 * « Revenu élevé ». Les laisser passer mettrait « Union européenne » à côté de
 * « France » dans un classement, où elle écraserait tout sans être comparable.
 *
 * La Banque mondiale les marque d'une région `NA`, ce qui est exactement le
 * discriminant qu'il faut : il vient de la source et se corrige avec elle, à la
 * différence d'une liste de codes écrite à la main qui se périmerait au premier
 * ensemble ajouté.
 */
async function fetchCountries(): Promise<Map<string, { name: string; region: string }>> {
  const body = await http.getJson<[unknown, RawCountry[] | null]>(
    '/country?format=json&per_page=400',
  )

  const rows = body?.[1]
  if (!Array.isArray(rows)) {
    throw new ProviderError(PROVIDER_ID, 'Catalogue de pays illisible', { retryable: true })
  }

  const map = new Map<string, { name: string; region: string }>()
  for (const row of rows) {
    if (!row?.id || row.region?.id === 'NA') continue
    map.set(row.id, { name: row.name, region: row.region?.value ?? 'Autres' })
  }

  return map
}

/**
 * Dernière observation connue de chaque pays, pour un indicateur.
 *
 * `mrv=1` — « most recent value » — laisse la source choisir l'année la plus récente
 * PAYS PAR PAYS. C'est le bon comportement : figer une année commune ferait
 * disparaître tous les pays qui ne l'ont pas encore publiée, et une carte dont un
 * tiers des pays est vide n'informe plus.
 */
/**
 * Profondeur d'historique demandée quand l'appelant en veut un.
 *
 * QUINZE ANNÉES, et le nombre est contraint des deux côtés. Vers le bas, un curseur
 * qui ne remonte pas au-delà d'un cycle économique n'apprend rien : 2008 et 2020 sont
 * précisément les années qu'on veut pouvoir comparer au présent. Vers le haut, la
 * réponse grossit du produit `pays × années` — 260 × 15 tient dans une seule requête,
 * 260 × 60 en demanderait quatre et pèserait deux mégaoctets pour des séries que la
 * plupart des pays ne renseignent pas si loin.
 */
export const MACRO_HISTORY_YEARS = 15

export async function fetchMacroIndicator(
  code: string,
  /**
   * Nombre d'années remontées PAR PAYS.
   *
   * `1` conserve le comportement d'origine — la dernière valeur connue de chacun, ce
   * qui suffit à une carte d'instantané. Au-delà, la réponse porte une observation par
   * pays et par année, et c'est l'appelant qui choisit celle qu'il affiche.
   *
   * Le paramètre entre dans la CLÉ DE CACHE de `getMacroIndicator` : demander
   * l'historique ne remplace donc pas l'instantané déjà mémorisé, et les pages qui
   * n'ont besoin que du dernier point ne paient pas le surcoût.
   */
  years = 1,
): Promise<MacroObservation[]> {
  /* `per_page` suit la profondeur : à quinze ans, 400 lignes ne couvriraient que
     vingt-six pays, et la source paginerait en silence — on obtiendrait une carte
     amputée sans qu'aucune erreur ne le signale. */
  const perPage = Math.max(400, years * 400)

  const [countries, body] = await Promise.all([
    fetchCountries(),
    http.getJson<[unknown, RawObservation[] | null]>(
      `/country/all/indicator/${encodeURIComponent(code)}?format=json&mrv=${years}&per_page=${perPage}`,
    ),
  ])

  const rows = body?.[1]
  if (!Array.isArray(rows)) {
    throw new ProviderError(PROVIDER_ID, `Indicateur ${code} illisible`, { retryable: true })
  }

  const out: MacroObservation[] = []
  for (const row of rows) {
    // Une valeur nulle signifie « non publiée » et non « zéro » : la ligne disparaît.
    if (row?.value === null || row?.value === undefined || !Number.isFinite(row.value)) continue

    const known = countries.get(row.countryiso3code)
    if (!known) continue

    const year = Number(row.date)
    if (!Number.isFinite(year)) continue

    out.push({
      iso3: row.countryiso3code,
      country: known.name,
      region: known.region,
      year,
      value: row.value,
    })
  }

  return out
}
