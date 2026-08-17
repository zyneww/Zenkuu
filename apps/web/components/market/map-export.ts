/**
 * EXPORT D'UNE FIGURE SVG EN IMAGE MATRICIELLE.
 *
 * ── LE PIÈGE QUE CE FICHIER EXISTE POUR CONTOURNER ───────────────────────────
 *
 * Un SVG sérialisé puis rechargé par `new Image()` est DÉTACHÉ du document. Il n'a
 * plus de feuille de style, plus d'élément racine, donc plus aucune variable CSS :
 * tout `var(--color-up)` devient invalide, et `color-mix(in srgb, var(…) 40%, …)`
 * avec lui. La carte s'exporterait entièrement en noir — sans erreur, ce qui est le
 * pire des cas.
 *
 * Le remède est de recopier sur le clone les couleurs CALCULÉES. Le navigateur a
 * déjà résolu les variables et le `color-mix` pour peindre à l'écran ;
 * `getComputedStyle(node).fill` rend un `rgb(…)` littéral, qui survit à la
 * sérialisation parce qu'il ne dépend plus de rien.
 *
 * ── POURQUOI PAS UNE BIBLIOTHÈQUE ────────────────────────────────────────────
 *
 * `html-to-image` et consorts pèsent une trentaine de kilo-octets et résolvent des
 * problèmes qu'on n'a pas : polices web à embarquer, images distantes, pseudo-éléments.
 * La figure exportée ici est un `<svg>` de chemins pleins, sans texte ni image. Les
 * quatre-vingts lignes ci-dessous couvrent exactement ce cas.
 */

/** Propriétés de peinture recopiées depuis le style calculé, dans cet ordre. */
const PAINT = ['fill', 'stroke', 'stroke-width', 'stroke-linejoin', 'opacity'] as const

/**
 * Rend un SVG du document en PNG.
 *
 * @param svg     Le nœud à exporter, tel qu'il est peint à l'écran.
 * @param scale   Facteur de suréchantillonnage. 2 donne une image nette sur écran
 *                haute densité et à l'impression, pour quatre fois les pixels.
 * @param background Couleur de fond, appliquée sous la figure. Sans elle, le PNG est
 *                transparent — ce qui donne une carte illisible collée dans un
 *                document à fond sombre, ou l'inverse.
 */
export async function svgToPngBlob(
  svg: SVGSVGElement,
  { scale = 2, background }: { scale?: number; background: string },
): Promise<Blob> {
  const viewBox = svg.viewBox.baseVal
  const width = viewBox.width || svg.clientWidth
  const height = viewBox.height || svg.clientHeight

  const clone = svg.cloneNode(true) as SVGSVGElement

  /*
   * PARCOURS EN PARALLÈLE de l'original et du clone.
   *
   * `querySelectorAll('*')` rend les nœuds dans l'ordre du document, et le clone est
   * structurellement identique : les deux listes s'alignent index par index. C'est
   * fragile en apparence et sûr en pratique — un `cloneNode(true)` ne réordonne rien.
   */
  const sources = svg.querySelectorAll<SVGElement>('*')
  const targets = clone.querySelectorAll<SVGElement>('*')

  for (let index = 0; index < sources.length; index += 1) {
    const source = sources[index]
    const target = targets[index]
    if (!source || !target) continue

    const computed = getComputedStyle(source)
    for (const property of PAINT) {
      const value = computed.getPropertyValue(property)
      if (value && value !== 'none') target.setAttribute(property, value)
    }
  }

  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  clone.setAttribute('width', String(width))
  clone.setAttribute('height', String(height))

  /* Le fond est un rectangle INSÉRÉ EN PREMIER plutôt qu'un `style` sur le `<svg>` :
     un fond porté par la racine n'est pas peint par `drawImage`, qui ne rend que le
     contenu. */
  const backdrop = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
  backdrop.setAttribute('x', '0')
  backdrop.setAttribute('y', '0')
  backdrop.setAttribute('width', String(width))
  backdrop.setAttribute('height', String(height))
  backdrop.setAttribute('fill', background)
  clone.insertBefore(backdrop, clone.firstChild)

  const markup = new XMLSerializer().serializeToString(clone)

  /*
   * `encodeURIComponent` et non `btoa`.
   *
   * `btoa` lève sur tout caractère hors Latin-1, et les noms de pays du fond de carte
   * en contiennent (Côte d'Ivoire, Åland). Le `data:` URI non encodé en base64 est
   * accepté partout et évite entièrement la question.
   */
  const source = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`

  const image = new Image()
  image.decoding = 'sync'

  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve()
    image.onerror = () => reject(new Error('La figure n’a pas pu être rendue en image.'))
    image.src = source
  })

  const canvas = document.createElement('canvas')
  canvas.width = Math.round(width * scale)
  canvas.height = Math.round(height * scale)

  const context = canvas.getContext('2d')
  if (!context) throw new Error('Le canevas n’est pas disponible dans ce navigateur.')

  context.drawImage(image, 0, 0, canvas.width, canvas.height)

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('L’image n’a pas pu être encodée.'))
    }, 'image/png')
  })
}

/** Déclenche le téléchargement d'un blob sous un nom donné. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()

  /* La révocation est DIFFÉRÉE : révoquer dans la foulée du `click()` annule le
     téléchargement sur Safari, qui lit l'URL de façon asynchrone. */
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

/**
 * Copie une image dans le presse-papiers.
 *
 * Rend `false` plutôt que de lever quand l'API manque : Firefox n'implémente
 * `ClipboardItem` que derrière un drapeau, et Safari exige que la promesse du blob
 * soit passée SYNCHRONEMENT dans le geste utilisateur. L'appelant affiche alors un
 * repli plutôt qu'une erreur.
 */
export async function copyBlobToClipboard(blob: Blob): Promise<boolean> {
  if (typeof ClipboardItem === 'undefined' || !navigator.clipboard?.write) return false

  try {
    await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })])
    return true
  } catch {
    return false
  }
}
