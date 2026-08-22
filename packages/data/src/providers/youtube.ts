/**
 * Vidéos pédagogiques — API YouTube Data v3.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * POURQUOI UNE RECHERCHE PLUTÔT QU'UNE LISTE ÉCRITE À LA MAIN
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * L'alternative évidente était d'inscrire deux ou trois identifiants de vidéo par
 * fiche, directement dans le contenu. Elle a été écartée pour une raison mesurable :
 * une vidéo YouTube disparaît. Elle est supprimée, passée en privé, ou son auteur
 * désactive l'intégration — et le lecteur intégré affiche alors un rectangle noir
 * portant « Vidéo indisponible », sur une page que personne ne pensait à relire.
 * Quinze fiches figées, c'est quinze occasions d'afficher une panne sans le savoir.
 *
 * La recherche, elle, rend ce qui EXISTE au moment du rendu. Le filtre
 * `videoEmbeddable` écarte en outre à la source ce qui ne pourrait pas être joué.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * LE QUOTA, ET CE QUI LE BORNE RÉELLEMENT
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Le palier gratuit — sans carte bancaire, §7 — accorde DEUX allocations distinctes,
 * et c'est le point à ne pas confondre : 100 appels `search.list` par jour, dans leur
 * propre compartiment, PLUS 10 000 unités par jour pour tout le reste (`videos.list`
 * y coûte 1 unité, quelles que soient les parties demandées).
 *
 * C'est donc le compartiment de RECHERCHE qui borne, pas les unités : une fiche
 * consomme un appel de recherche, la bibliothèque entière en consomme quatorze.
 *
 * Le TTL de 24 heures (`LESSON_VIDEO_TTL_SECONDS`, côté `queries.ts`) fait que ce
 * coût est payé au plus une fois par jour et par fiche. Deux marges à connaître :
 * la bibliothèque pourrait approcher la centaine de fiches avant de saturer, et un
 * BUILD COMPLET repart d'un cache froid — soit environ sept builds par jour avant de
 * toucher le plafond. Au-delà, la recherche est refusée et la section disparaît, ce
 * qui est le comportement voulu (§5) mais reste une régression silencieuse.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * DEUX APPELS ET NON UN — CE QUE LE SECOND APPORTE
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * `search.list` ne rend NI la durée, NI l'état d'intégration réel. Sans le second
 * appel, on afficherait des vignettes de trente secondes à côté de conférences de
 * trois heures, sans pouvoir l'indiquer — et un lecteur ne sait pas dans quoi il
 * s'engage. Le second appel coûte UNE unité, prise dans le compartiment abondant :
 * c'est le meilleur rapport du fichier.
 *
 * ⚠️ `part=snippet` EST OBLIGATOIRE sur `search.list`, et ce n'est pas du gaspillage
 * de bande passante à corriger : la documentation n'admet aucune autre valeur, alors
 * même que seul `id.videoId` est lu ici. Un `part=id` échoue.
 */

import { createHttpClient } from '../http'
import { ProviderError } from '../types'

const PROVIDER_ID = 'youtube'

/**
 * Clé lue à CHAQUE appel plutôt qu'au chargement du module.
 *
 * `packages/data` est importé par des scripts et des tests qui ne chargent pas
 * forcément l'environnement au même instant que Next. Figer la valeur à l'import
 * ferait dépendre le comportement de l'ordre des imports — un défaut qui ne se
 * manifeste qu'en production, et seulement parfois.
 */
export function hasYoutubeKey(): boolean {
  return Boolean(process.env.YOUTUBE_API_KEY)
}

const http = createHttpClient({
  providerId: PROVIDER_ID,
  baseUrl: 'https://www.googleapis.com/youtube/v3',
  // Le quota de YouTube s'exprime en unités par JOUR, pas en requêtes par minute :
  // ce limiteur ne protège donc pas d'un dépassement de quota, il protège d'une
  // rafale si plusieurs fiches sont rendues en même temps (génération statique).
  maxRequestsPerWindow: 30,
  minIntervalMs: 200,
  revalidateSeconds: 86_400,
})

export interface LessonVideo {
  /** Identifiant YouTube — sert d'URL de vignette, d'intégration et de clé React. */
  id: string
  title: string
  channel: string
  /** Durée en secondes, affichée sur la vignette. */
  durationSeconds: number
  /** Date de mise en ligne, ISO 8601. */
  publishedAt: string
}

export const YOUTUBE_SOURCE = {
  label: 'YouTube',
  attributionUrl: 'https://www.youtube.com',
}

/**
 * Bornes de durée retenues.
 *
 * Le plancher écarte les Shorts et les bandes-annonces : une notion de marché ne
 * s'explique pas en cinquante secondes, et ces formats remontent haut dans la
 * pertinence parce qu'ils sont vus, pas parce qu'ils expliquent.
 *
 * Le plafond écarte les conférences et les rediffusions de direct, qui traitent le
 * sujet quelque part au milieu de deux heures — les proposer comme illustration
 * d'une fiche de cinq minutes de lecture serait une fausse promesse.
 */
const MIN_DURATION_SECONDS = 150
const MAX_DURATION_SECONDS = 45 * 60

/**
 * Titres écartés — les promesses de gain.
 *
 * ⚠️ CE FILTRE N'EST PAS UN CONFORT ÉDITORIAL, il découle du §7. ZENKUU ne délivre
 * aucun conseil en investissement ; poser sous une fiche « Lire une capitalisation »
 * une vidéo intitulée « les 3 cryptos qui vont exploser » reviendrait à en délivrer
 * un par procuration, sur notre page et sous notre mise en forme.
 *
 * La liste vise des PROMESSES, pas des sujets : « arnaque », « bulle » ou « krach »
 * n'y figurent pas, ce sont des thèmes légitimes d'explication.
 */
const BAIT = new RegExp(
  [
    'x\\s?\\d{2,}', // « x10 », « x 100 »
    '\\bsignaux?\\b',
    '\\bpump\\b',
    '\\bmoon(shot)?\\b',
    'va (exploser|décoller|s\'envoler)',
    'vont exploser',
    'devenir (riche|millionnaire)',
    'gagner de l\'argent',
    'argent facile',
    'meilleur[es]* (crypto|action|investissement)s? (à|a) (acheter|prendre)',
    '\\b(100|1000)\\s?%\\s?(de\\s?)?(gain|profit)',
  ].join('|'),
  'i',
)

/**
 * Durée ISO 8601 (`PT12M4S`) en secondes.
 *
 * Rend `null` plutôt que 0 sur une entrée illisible : zéro passerait le plancher de
 * durée à l'envers — la vidéo serait écartée, mais pour la mauvaise raison, et un
 * changement de format chez YouTube viderait la section sans rien signaler.
 *
 * Le jour (`P1DT…`) est traité bien qu'il soit hors bornes : mieux vaut le lire et
 * l'écarter sur sa durée que le lire comme une durée nulle.
 */
export function parseIsoDuration(value: string | undefined): number | null {
  if (!value) return null

  const match = /^P(?:(\d+)D)?T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(value)
  if (!match) return null

  const [, days, hours, minutes, seconds] = match
  // Les quatre groupes sont facultatifs : `PT` seul est syntaxiquement valide et ne
  // décrit aucune durée. On le refuse plutôt que de rendre 0.
  if (!days && !hours && !minutes && !seconds) return null

  return (
    Number(days ?? 0) * 86_400 +
    Number(hours ?? 0) * 3_600 +
    Number(minutes ?? 0) * 60 +
    Number(seconds ?? 0)
  )
}

/** Une vidéo est-elle utilisable comme illustration d'une fiche ? */
export function isSuitableVideo(video: {
  title: string
  durationSeconds: number | null
  embeddable: boolean
  live: boolean
}): boolean {
  if (!video.embeddable || video.live) return false
  if (video.durationSeconds === null) return false
  if (video.durationSeconds < MIN_DURATION_SECONDS) return false
  if (video.durationSeconds > MAX_DURATION_SECONDS) return false
  return !BAIT.test(video.title)
}

interface SearchResponse {
  items?: { id?: { videoId?: string } }[]
}

interface VideosResponse {
  items?: {
    id?: string
    snippet?: { title?: string; channelTitle?: string; publishedAt?: string; liveBroadcastContent?: string }
    contentDetails?: { duration?: string }
    status?: { embeddable?: boolean; privacyStatus?: string }
  }[]
}

/**
 * Vidéos pertinentes pour une requête, déjà filtrées et bornées.
 *
 * L'ORDRE DE YOUTUBE EST CONSERVÉ. On ne reclasse pas par nombre de vues : ce
 * classement-là favorise l'ancienneté virale plutôt que la qualité d'explication, et
 * substituerait notre jugement — que nous n'avons pas les moyens de porter — à celui
 * du moteur. On se contente d'ÉCARTER, ce qui se justifie ligne à ligne.
 */
export async function fetchLessonVideos(query: string, limit: number): Promise<LessonVideo[]> {
  const key = process.env.YOUTUBE_API_KEY
  if (!key) throw new ProviderError(PROVIDER_ID, 'YOUTUBE_API_KEY absente')

  // On demande large et on rend étroit : le filtre écarte typiquement la moitié des
  // résultats (Shorts, directs, appâts), et une seconde recherche coûterait 100
  // unités de plus là où des résultats supplémentaires n'en coûtent aucune.
  const search = await http.getJson<SearchResponse>('search', {
    part: 'snippet',
    q: query,
    type: 'video',
    maxResults: 15,
    order: 'relevance',
    relevanceLanguage: 'fr',
    regionCode: 'FR',
    safeSearch: 'strict',
    videoEmbeddable: 'true',
    videoSyndicated: 'true',
    key,
  })

  const ids = (search.items ?? [])
    .map((item) => item.id?.videoId)
    .filter((id): id is string => Boolean(id))

  if (ids.length === 0) {
    throw new ProviderError(PROVIDER_ID, `Aucune vidéo pour « ${query} »`)
  }

  const details = await http.getJson<VideosResponse>('videos', {
    part: 'snippet,contentDetails,status',
    id: ids.join(','),
    key,
  })

  /* `videos.list` ne garantit PAS de rendre ses éléments dans l'ordre du paramètre
     `id` — on reparcourt donc `ids`, qui porte l'ordre de pertinence de la recherche.
     Sans cela, l'ordre affiché serait celui, non spécifié, de la seconde réponse. */
  const byId = new Map((details.items ?? []).map((item) => [item.id, item]))

  const videos: LessonVideo[] = []

  for (const id of ids) {
    const item = byId.get(id)
    const title = item?.snippet?.title
    if (!item || !title) continue

    const durationSeconds = parseIsoDuration(item.contentDetails?.duration)

    const suitable = isSuitableVideo({
      title,
      durationSeconds,
      // `status.embeddable` est la vérité, `videoEmbeddable` de la recherche n'étant
      // qu'un filtre d'index. Un `undefined` est traité comme un refus : afficher un
      // lecteur qui ne démarre pas est pire que de ne rien afficher (§5).
      embeddable: item.status?.embeddable === true && item.status.privacyStatus === 'public',
      live: item.snippet?.liveBroadcastContent === 'live',
    })

    if (!suitable || durationSeconds === null) continue

    videos.push({
      id,
      title,
      channel: item.snippet?.channelTitle ?? '',
      durationSeconds,
      publishedAt: item.snippet?.publishedAt ?? '',
    })

    if (videos.length >= limit) break
  }

  if (videos.length === 0) {
    throw new ProviderError(PROVIDER_ID, `Aucune vidéo exploitable pour « ${query} »`)
  }

  return videos
}
