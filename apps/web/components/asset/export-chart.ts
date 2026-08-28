import type { ExportFormat } from '@/components/asset/ChartToolbar'

/**
 * Export du graphique en PNG, JPEG, SVG ou PDF — SANS AUCUNE DÉPENDANCE.
 *
 * ── POURQUOI PAS jsPDF NI canvas-to-svg ───────────────────────────────────────
 *
 * Les deux bibliothèques habituelles pèsent respectivement 350 Ko et 90 Ko, pour
 * une fonctionnalité qu'un lecteur utilise une fois sur cent visites. Les ajouter
 * au paquet servi à tout le monde annulerait à elle seule les 472 Ko gagnés en
 * retirant `recharts`.
 *
 * Or `lightweight-charts` rend en CANVAS, et un canvas sait déjà s'exporter en PNG
 * et en JPEG nativement. Les deux formats restants s'obtiennent en enveloppant
 * cette image :
 *
 *   • SVG — une balise `<image>` portant l'image en base64. Le fichier est un vrai
 *     SVG, ouvrable partout, mais son contenu reste une image de pixels : on ne
 *     retouchera pas une courbe au vecteur. C'est une limite ASSUMÉE et énoncée,
 *     parce que le graphique n'existe jamais sous forme vectorielle — le canvas est
 *     sa seule représentation.
 *
 *   • PDF — un document minimal écrit à la main. Un PDF d'une page contenant une
 *     image tient en sept objets ; le seul point délicat est la table de références
 *     croisées, qui exige les décalages en octets de chaque objet, comptés depuis
 *     le début du fichier.
 *
 * Coût total : ce fichier, chargé à la demande.
 */

/** Nom de fichier lisible, sans accent ni espace. */
function fileName(asset: string, format: ExportFormat): string {
  const slug = asset
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return `zenkuu-${slug || 'graphique'}.${format}`
}

function download(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.click()
  /* La libération est différée d'une image : révoquer immédiatement retire l'URL
     sous les pieds du téléchargement dans Safari, qui la lit de façon asynchrone. */
  requestAnimationFrame(() => URL.revokeObjectURL(url))
}

/**
 * Repeint le canvas sur un FOND OPAQUE.
 *
 * Indispensable pour le JPEG et le PDF, qui ne connaissent pas la transparence :
 * sans ce fond, les zones transparentes deviennent NOIRES, ce qui rend un graphique
 * en thème clair parfaitement illisible. La couleur est lue sur le thème courant
 * plutôt que fixée, pour que l'export ressemble à ce qui était affiché.
 */
function flatten(source: HTMLCanvasElement): HTMLCanvasElement {
  const target = document.createElement('canvas')
  target.width = source.width
  target.height = source.height

  const context = target.getContext('2d')
  if (!context) return source

  const background =
    getComputedStyle(document.documentElement).getPropertyValue('--color-panel').trim() || '#ffffff'

  context.fillStyle = background
  context.fillRect(0, 0, target.width, target.height)
  context.drawImage(source, 0, 0)
  return target
}

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * CE QUE L'IMAGE PORTE EN PLUS DU TRACÉ
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * La toile d'amCharts ne contient QUE le tracé, ses deux échelles et l'histogramme
 * de volume : le nom de l'actif, la période regardée, la source et la signature du
 * site sont du HTML posé autour, et ils ne partaient donc pas dans le fichier. Une
 * courbe sans son actif ni sa période est illisible dès qu'elle quitte la page —
 * c'est la première chose que CoinGecko inscrit sur ses propres exports.
 *
 * On ENVELOPPE donc la toile : bande de titre en haut, signature en bas à droite.
 * Rien n'est redessiné du tracé lui-même, qui est recopié tel quel.
 */
export interface ChartExportMeta {
  /** Nom et symbole de l'actif — « Bitcoin (BTC) ». */
  title: string
  /** Lecture, période, devise — « Prix · MAX · USD ». */
  subtitle: string
  /** Provenance de la série, telle qu'affichée sous le graphique. */
  source?: string
}

function frame(canvas: HTMLCanvasElement, meta: ChartExportMeta): HTMLCanvasElement {
  /* Toutes les mesures suivent la LARGEUR de la toile : celle-ci varie avec la
     densité de pixels de l'écran (mesuré : 755 px pour 944 px CSS), et des tailles
     fixes donneraient un titre minuscule sur un export en haute densité. */
  const pad = Math.round(canvas.width * 0.025)
  const titleSize = Math.round(canvas.width * 0.026)
  const metaSize = Math.round(canvas.width * 0.017)
  const header = pad * 2 + titleSize + metaSize

  const target = document.createElement('canvas')
  target.width = canvas.width
  target.height = canvas.height + header

  const context = target.getContext('2d')
  if (!context) return canvas

  const style = getComputedStyle(document.documentElement)
  const read = (token: string, fallback: string) =>
    style.getPropertyValue(token).trim() || fallback

  const background = read('--color-panel', '#ffffff')
  const ink = read('--color-ink', '#111827')
  const muted = read('--color-ink-muted', '#6b7280')

  context.fillStyle = background
  context.fillRect(0, 0, target.width, target.height)

  context.textBaseline = 'top'
  context.fillStyle = ink
  context.font = `600 ${titleSize}px system-ui, -apple-system, "Segoe UI", sans-serif`
  context.fillText(meta.title, pad, pad)

  context.fillStyle = muted
  context.font = `${metaSize}px system-ui, -apple-system, "Segoe UI", sans-serif`
  context.fillText(meta.subtitle, pad, pad + titleSize + Math.round(pad * 0.35))

  /* La source se range à DROITE de la même bande : c'est une mention, pas un titre,
     et elle ne doit pas repousser la période. */
  if (meta.source) {
    context.textAlign = 'right'
    context.fillText(meta.source, target.width - pad, pad + titleSize + Math.round(pad * 0.35))
    context.textAlign = 'left'
  }

  context.drawImage(canvas, 0, header)

  /* ── LA SIGNATURE ────────────────────────────────────────────────────────
     Elle existe à l'écran en HTML, dans le coin bas-droit du tracé, et c'est
     précisément là qu'on l'attend sur une capture qui circule. */
  context.fillStyle = muted
  context.globalAlpha = 0.6
  context.font = `600 ${metaSize}px system-ui, -apple-system, "Segoe UI", sans-serif`
  context.textAlign = 'right'
  context.fillText('zenkuu.com', target.width - pad, target.height - pad - metaSize)
  context.globalAlpha = 1
  context.textAlign = 'left'

  return target
}

export function exportChart(
  canvas: HTMLCanvasElement,
  format: ExportFormat,
  assetName: string,
  meta?: ChartExportMeta,
): void {
  const name = fileName(assetName, format)
  if (meta) canvas = frame(canvas, meta)

  if (format === 'png') {
    canvas.toBlob((blob) => {
      if (blob) download(blob, name)
    }, 'image/png')
    return
  }

  if (format === 'jpeg') {
    flatten(canvas).toBlob(
      (blob) => {
        if (blob) download(blob, name)
      },
      'image/jpeg',
      0.92,
    )
    return
  }

  if (format === 'svg') {
    const data = canvas.toDataURL('image/png')
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ` +
      `width="${canvas.width}" height="${canvas.height}" viewBox="0 0 ${canvas.width} ${canvas.height}">` +
      `<image width="${canvas.width}" height="${canvas.height}" xlink:href="${data}"/>` +
      `</svg>`
    download(new Blob([svg], { type: 'image/svg+xml' }), name)
    return
  }

  download(buildPdf(flatten(canvas)), name)
}

/**
 * PDF d'une page contenant l'image, écrit octet par octet.
 *
 * La structure est celle d'un PDF 1.4 minimal : catalogue, arbre de pages, page,
 * flux de contenu, image, et la table de références croisées qui donne le décalage
 * de chaque objet DEPUIS LE DÉBUT DU FICHIER. C'est cette table qui rend l'exercice
 * délicat — un décalage faux et le document est refusé par tous les lecteurs, sans
 * message utile.
 *
 * L'image est incorporée telle quelle en JPEG (`DCTDecode`), format que le PDF sait
 * décoder nativement : c'est ce qui évite d'avoir à compresser quoi que ce soit
 * ici. La page prend exactement les dimensions de l'image, en points — le graphique
 * n'a pas de format papier naturel, et l'inscrire de force dans un A4 ajouterait des
 * marges arbitraires.
 */
function buildPdf(canvas: HTMLCanvasElement): Blob {
  const jpeg = canvas.toDataURL('image/jpeg', 0.92).split(',')[1] ?? ''
  const binary = atob(jpeg)
  const width = canvas.width
  const height = canvas.height

  const header = '%PDF-1.4\n'
  const objects: string[] = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] ` +
      `/Resources << /XObject << /Im0 5 0 R >> >> /Contents 4 0 R >>\nendobj\n`,
  ]

  const content = `q\n${width} 0 0 ${height} 0 0 cm\n/Im0 Do\nQ\n`
  objects.push(`4 0 obj\n<< /Length ${content.length} >>\nstream\n${content}endstream\nendobj\n`)
  objects.push(
    `5 0 obj\n<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} ` +
      `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${binary.length} >>\n` +
      `stream\n${binary}\nendstream\nendobj\n`,
  )

  /*
   * Les décalages sont comptés en OCTETS et non en caractères.
   *
   * Le flux JPEG contient des octets au-delà de 127 ; mesurer sa longueur avec
   * `String.length` compterait des unités UTF-16 et donnerait des décalages faux
   * dès le premier octet haut. Chaque fragment est donc converti en octets avant
   * d'être mesuré, et le fichier est assemblé à partir de ces octets-là.
   */
  const encoder = new TextEncoder()
  const toBytes = (text: string) => {
    const bytes = new Uint8Array(text.length)
    for (let index = 0; index < text.length; index += 1) bytes[index] = text.charCodeAt(index) & 0xff
    return bytes
  }

  const parts: Uint8Array[] = [encoder.encode(header)]
  const offsets: number[] = []
  let position = encoder.encode(header).length

  for (const object of objects) {
    offsets.push(position)
    const bytes = toBytes(object)
    parts.push(bytes)
    position += bytes.length
  }

  const count = objects.length + 1
  let xref = `xref\n0 ${count}\n0000000000 65535 f \n`
  for (const offset of offsets) {
    xref += `${String(offset).padStart(10, '0')} 00000 n \n`
  }
  xref += `trailer\n<< /Size ${count} /Root 1 0 R >>\nstartxref\n${position}\n%%EOF\n`

  parts.push(encoder.encode(xref))

  return new Blob(parts as BlobPart[], { type: 'application/pdf' })
}
