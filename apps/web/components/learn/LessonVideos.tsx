'use client'

import { Play } from 'lucide-react'
import { AspectRatio } from '@/components/ui/aspect-ratio'
import { useState } from 'react'

import type { LessonVideo } from '@zenkuu/data'

/**
 * Vidéos illustrant une fiche pédagogique.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * FAÇADE PLUTÔT QU'IFRAME — CE QUE ÇA ÉVITE
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Un `<iframe>` YouTube posé directement dans la page charge, à l'ouverture et sans
 * que personne n'ait cliqué, plusieurs centaines de kilo-octets de JavaScript tiers
 * et pose ses cookies. Sur une page de lecture, c'est payer le lecteur vidéo à chaque
 * visite pour l'usage d'une minorité — et c'est exactement le reproche que
 * `ShareButtons` fait aux boutons officiels de réseaux sociaux.
 *
 * La façade ne charge qu'une image. Le lecteur réel n'apparaît qu'au clic, et
 * `youtube-nocookie.com` est alors préféré : le domaine sans suivi de YouTube, qui
 * ne dépose rien tant que la lecture n'a pas commencé.
 *
 * ── UN SEUL LECTEUR, PLUSIEURS VIDÉOS ────────────────────────────────────────
 *
 * Trois lecteurs côte à côte tiendraient chacun dans un tiers de colonne, soit une
 * image trop petite pour qu'un graphique commenté y soit lisible — ce qui est
 * précisément ce qu'on vient chercher dans une vidéo pédagogique. La liste ci-dessous
 * SÉLECTIONNE donc, elle ne joue pas : une seule surface de lecture, à la largeur du
 * texte.
 */
export function LessonVideos({ videos }: { videos: LessonVideo[] }) {
  const [activeId, setActiveId] = useState(videos[0]?.id ?? '')
  const [playing, setPlaying] = useState(false)

  const active = videos.find((video) => video.id === activeId) ?? videos[0]
  if (!active) return null

  function select(video: LessonVideo) {
    // Sélectionner ET lancer : un lecteur qui redemanderait un clic après en avoir
    // reçu un ferait exactement le contraire de ce que le geste demandait.
    setActiveId(video.id)
    setPlaying(true)
  }

  return (
    <div className="space-y-4">
      {/*
        ── `AspectRatio` PLUTÔT QUE `aspect-video` SUR CHAQUE ENFANT ────────────

        Le rapport était posé DEUX FOIS — sur l'`<iframe>` et sur le bouton d'aperçu —
        et les deux devaient rester d'accord : le passage de l'un à l'autre se fait au
        clic, et un pixel d'écart y ferait sauter toute la page sous le curseur.

        `AspectRatio` le pose UNE fois, sur le cadre. Il le tient par la technique du
        remplissage relatif (`padding-bottom` proportionnel), qui fonctionne AVANT que
        le contenu soit chargé : le cadre réserve donc sa place dès le premier rendu,
        là où `aspect-video` sur une `<iframe>` distante laisse un vide qui se comble
        après coup — un décalage de mise en page que les mesures de performance
        pénalisent (§9).
      */}
      <AspectRatio ratio={16 / 9} className="overflow-hidden rounded-card bg-surface-muted">
        {playing ? (
          <iframe
            key={active.id}
            src={`https://www.youtube-nocookie.com/embed/${active.id}?autoplay=1&rel=0`}
            title={active.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="size-full border-0"
          />
        ) : (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            aria-label={`Lire la vidéo « ${active.title} » sur YouTube`}
            className="group relative block size-full"
          >
            <Thumbnail video={active} />
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-canvas/90 transition-transform group-hover:scale-105">
                <Play className="ml-0.5 h-6 w-6 fill-current text-brand-strong" aria-hidden="true" />
              </span>
            </span>
          </button>
        )}
      </AspectRatio>

      <div className="space-y-1">
        <p className="text-sm font-medium leading-snug text-ink">{active.title}</p>
        <p className="text-xs text-ink-muted">
          {active.channel}
          {active.channel ? ' · ' : ''}
          {formatDuration(active.durationSeconds)}
        </p>
      </div>

      {videos.length > 1 ? (
        <ul className="grid gap-3 sm:grid-cols-2">
          {videos
            .filter((video) => video.id !== active.id)
            .map((video) => (
              <li key={video.id}>
                <button
                  type="button"
                  onClick={() => select(video)}
                  className="group flex w-full items-start gap-3 text-left"
                >
                  <span className="relative w-28 shrink-0 overflow-hidden rounded-control">
                    <span className="block aspect-video">
                      <Thumbnail video={video} />
                    </span>
                  </span>
                  <span className="min-w-0 space-y-0.5">
                    <span className="block text-xs font-medium leading-snug text-ink group-hover:text-brand-strong">
                      {video.title}
                    </span>
                    <span className="block text-[0.6875rem] text-ink-muted">
                      {video.channel}
                      {video.channel ? ' · ' : ''}
                      {formatDuration(video.durationSeconds)}
                    </span>
                  </span>
                </button>
              </li>
            ))}
        </ul>
      ) : null}
    </div>
  )
}

/**
 * Vignette servie par YouTube.
 *
 * `hqdefault.jpg` et non `maxresdefault.jpg` : la seconde N'EXISTE PAS pour les
 * vidéos mises en ligne sous 1280×720, et YouTube répond alors une image d'erreur
 * grise de 120×90 étirée sur toute la surface. La première est générée pour toutes
 * les vidéos, sans exception.
 *
 * `<img>` natif et non `next/image` : l'optimiseur ferait transiter chaque vignette
 * par notre serveur — un coût de transformation pour une image déjà dimensionnée et
 * déjà servie par un CDN. C'est le même arbitrage que pour les vignettes du fil
 * d'actualités.
 */
function Thumbnail({ video }: { video: LessonVideo }) {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element -- vignette distante déjà dimensionnée, servie par le CDN de YouTube */}
      <img
        src={`https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`}
        alt=""
        aria-hidden="true"
        loading="lazy"
        className="h-full w-full object-cover"
      />
      <span className="absolute bottom-1.5 right-1.5 rounded bg-black/75 px-1.5 py-0.5 text-micro font-medium tabular-nums text-white">
        {formatDuration(video.durationSeconds)}
      </span>
    </>
  )
}

/** `12:04`, ou `1:02:11` au-delà de l'heure. */
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const rest = seconds % 60

  const pad = (value: number) => String(value).padStart(2, '0')

  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(rest)}` : `${minutes}:${pad(rest)}`
}
