'use client'

import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'

import { loadCountries, macroColor, toSphere, type CountryFeature, type MacroTone } from '@/components/market/geo'

/**
 * GLOBE TERRESTRE — les pays extrudés sur une sphère, colorés par leur valeur.
 *
 * ── POURQUOI DU VECTORIEL ET NON UNE TEXTURE SATELLITE ───────────────────────
 *
 * Une texture Blue Marble donnerait une Terre photographique, et il faudrait POURTANT
 * superposer les frontières en vecteur : sans elles, aucun survol ni aucun clic n'est
 * possible, et aucune valeur ne peut être peinte. On paierait donc trois à huit
 * mégaoctets de texture pour un décor, en plus de la géométrie qu'on doit charger de
 * toute façon.
 *
 * Le vectoriel coûte quarante-cinq kilo-octets compressés et porte à lui seul les
 * trois fonctions : le dessin, l'interaction et la donnée. C'est un instrument de
 * lecture, pas un planétarium.
 *
 * ── LA GÉOMÉTRIE EST CONSTRUITE UNE FOIS, LES COULEURS CHANGENT SEULES ───────
 *
 * Trianguler 177 pays coûte quelques dizaines de millisecondes ; le faire à chaque
 * changement d'année ferait tressauter le curseur temporel. Les maillages sont donc
 * bâtis au premier chargement et conservés dans une référence ; seul l'attribut de
 * couleur de leur matériau est réécrit ensuite.
 *
 * ── PAS D'ORBITCONTROLS ─────────────────────────────────────────────────────
 *
 * Le contrôleur officiel vit dans `three/examples`, un dossier que le paquet ne
 * publie pas dans son point d'entrée principal et dont les chemins d'import changent
 * d'une version à l'autre. Ce qu'il faut ici — glisser pour tourner, molette pour
 * zoomer — tient en une trentaine de lignes d'écouteurs, sans la caméra à inertie et
 * les modes qu'on n'utilise pas.
 */

export interface MacroGlobeDatum {
  iso: string
  country: string
  value: number
  year: number
}

/** Rayon du globe. Tout le reste — distance de caméra, bornes de zoom — s'y rapporte. */
const RADIUS = 1

/** Bornes de zoom, en distance de caméra. Au-delà, on traverse la sphère ou on la perd. */
const MIN_DISTANCE = 1.35
const MAX_DISTANCE = 4.5

export function MacroGlobe({
  data,
  low,
  high,
  tone,
  selected,
  onSelect,
}: {
  data: MacroGlobeDatum[]
  low: number
  high: number
  tone: MacroTone
  selected: string | null
  onSelect: (iso: string | null) => void
}) {
  const mountRef = useRef<HTMLDivElement>(null)
  const [hovered, setHovered] = useState<{ iso: string; name: string; x: number; y: number } | null>(
    null,
  )
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  /*
   * LES DONNÉES VIVENT DANS UNE RÉFÉRENCE, PAS DANS LES DÉPENDANCES DE L'EFFET.
   *
   * La scène three.js est construite UNE fois et vit hors du cycle de rendu React.
   * Mettre `data` dans les dépendances de l'effet de construction la ferait démonter
   * et reconstruire à chaque changement d'année — soit une seconde de calcul par
   * position du curseur. La référence laisse la boucle d'animation lire toujours la
   * valeur courante sans que l'effet n'en dépende.
   */
  const paintRef = useRef<{ data: MacroGlobeDatum[]; low: number; high: number; tone: MacroTone }>({
    data,
    low,
    high,
    tone,
  })

  const selectedRef = useRef(selected)
  const onSelectRef = useRef(onSelect)

  /** Repeint les pays. Exposée par une référence, appelée depuis React comme depuis three. */
  const repaintRef = useRef<(() => void) | null>(null)

  /** Demande UNE image. Appelée après tout changement — rotation, zoom, couleurs. */
  const invalidateRef = useRef<(() => void) | null>(null)

  /*
   * LES RÉFÉRENCES SONT MISES À JOUR DANS UN EFFET, JAMAIS PENDANT LE RENDU.
   *
   * La première version les affectait à plat dans le corps du composant, ce que le
   * linter refuse — « Cannot access refs during render ». La règle n'est pas
   * formelle : React se réserve d'abandonner un rendu commencé (rendu concurrent,
   * `StrictMode`, transition interrompue), et une référence écrite pendant un rendu
   * abandonné garde une valeur qui n'a jamais été affichée. La scène three.js, qui la
   * lit à chaque image, peindrait alors un état fantôme.
   *
   * L'effet s'exécute après validation, donc seulement pour un rendu réellement
   * appliqué. Et comme c'est le même que celui qui repeint, l'ordre est garanti : les
   * valeurs sont à jour avant que `repaint` ne les lise, sur la ligne suivante.
   */
  useEffect(() => {
    paintRef.current = { data, low, high, tone }
    selectedRef.current = selected
    onSelectRef.current = onSelect
    repaintRef.current?.()
    // Repeindre ne suffit pas : sans boucle continue, il faut demander l'image qui
    // montrera les nouvelles couleurs.
    invalidateRef.current?.()
  }, [data, low, high, tone, selected, onSelect])

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    let disposed = false
    const scene = new THREE.Scene()

    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100)
    camera.position.set(0, 0, 2.6)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    mount.appendChild(renderer.domElement)

    /*
     * L'OCÉAN EST UNE SPHÈRE LÉGÈREMENT PLUS PETITE que les pays.
     *
     * Les deux au même rayon produiraient du `z-fighting` — le scintillement d'aliasing
     * de profondeur qui apparaît quand deux surfaces coplanaires se disputent le même
     * pixel. Un écart de un pour mille suffit, et il est invisible.
     */
    const ocean = new THREE.Mesh(
      new THREE.SphereGeometry(RADIUS * 0.999, 64, 48),
      new THREE.MeshBasicMaterial({ color: 0x0e2233 }),
    )
    scene.add(ocean)

    const countryGroup = new THREE.Group()
    scene.add(countryGroup)

    const meshes = new Map<string, THREE.Mesh>()

    /* Rotation courante, en radians. La caméra reste fixe et c'est le GLOBE qui tourne :
       faire orbiter la caméra imposerait de recalculer sa position par trigonométrie à
       chaque image, là où une rotation d'objet est une simple affectation. */
    const rotation = { x: 0, y: 0 }
    let distance = 2.6

    const raycaster = new THREE.Raycaster()
    const pointer = new THREE.Vector2()

    /* `mount` est capturé une fois hors de l'effet, mais TypeScript le voit comme
       possiblement nul dans une fonction imbriquée — la référence pouvant changer entre
       la vérification et l'appel. La liaison locale lève l'ambiguïté sans assertion. */
    const node = mount

    function resize() {
      const { clientWidth, clientHeight } = node
      if (clientWidth === 0 || clientHeight === 0) return

      /*
       * `updateStyle` LAISSÉ À SA VALEUR PAR DÉFAUT, c'est-à-dire vrai.
       *
       * La première version passait `false`, ce qui fixe la résolution du tampon mais
       * NE TOUCHE PAS au style CSS du canvas : celui-ci s'affichait donc à sa taille
       * intrinsèque en pixels physiques — mesuré, 1304 pixels CSS dans un conteneur de
       * 1630 — et le globe apparaissait décalé vers la gauche, dans un cadre plus
       * petit que le sien.
       *
       * `false` a un usage légitime : quand une feuille de style dimensionne déjà le
       * canvas en pourcentages. Ce n'est pas le cas ici, le conteneur étant seul à
       * porter la taille.
       */
      renderer.setSize(clientWidth, clientHeight)
      camera.aspect = clientWidth / clientHeight
      camera.updateProjectionMatrix()
      // Un redimensionnement change le tampon : sans nouvelle image, le canvas
      // afficherait l'ancienne, étirée à la nouvelle taille.
      invalidateRef.current?.()
    }

    function repaint() {
      const { data: rows, low: lowBound, high: highBound, tone: toneNow } = paintRef.current
      const byIso = new Map(rows.map((row) => [row.iso, row.value]))

      for (const [iso, mesh] of meshes) {
        const material = mesh.material as THREE.MeshBasicMaterial
        const value = byIso.get(iso)

        /*
         * LA COULEUR EST RÉSOLUE EN JAVASCRIPT, PAS PAR LE NAVIGATEUR.
         *
         * `macroColor` rend une chaîne `color-mix(…)` que le moteur CSS sait peindre —
         * mais WebGL ne connaît que des triplets. On la fait donc résoudre par un
         * élément détaché : c'est le seul moyen d'obtenir la valeur CALCULÉE d'une
         * couleur qui dépend des variables de thème, et il garantit que le globe suit
         * la bascule clair/sombre comme le reste du site.
         */
        material.color.set(resolveColor(macroColor(value, lowBound, highBound, toneNow)))

        const isSelected = selectedRef.current === iso
        material.opacity = value === undefined ? 0.45 : 1
        material.transparent = value === undefined || isSelected

        /* Le pays sélectionné est LÉGÈREMENT SOULEVÉ plutôt que cerné d'un contour :
           un trait de contour sur une sphère demande un second maillage par pays, et
           l'élévation se voit sous tous les angles. */
        mesh.scale.setScalar(isSelected ? 1.015 : 1)
      }
    }

    repaintRef.current = repaint

    loadCountries()
      .then((countries) => {
        if (disposed) return

        for (const country of countries) {
          const mesh = buildCountryMesh(country)
          if (!mesh) continue
          mesh.userData = { iso: country.iso, name: country.name }
          meshes.set(country.iso, mesh)
          countryGroup.add(mesh)
        }

        repaint()
        invalidate()
        setReady(true)
      })
      .catch((cause: Error) => {
        if (!disposed) setError(cause.message)
      })

    /* ── Interaction : glisser pour tourner, molette pour zoomer ─────────────── */

    let dragging = false
    let lastX = 0
    let lastY = 0
    let moved = 0

    function onPointerDown(event: PointerEvent) {
      dragging = true
      moved = 0
      lastX = event.clientX
      lastY = event.clientY
      renderer.domElement.setPointerCapture(event.pointerId)
    }

    function onPointerMove(event: PointerEvent) {
      const rect = renderer.domElement.getBoundingClientRect()

      if (dragging) {
        const dx = event.clientX - lastX
        const dy = event.clientY - lastY
        moved += Math.abs(dx) + Math.abs(dy)

        rotation.y += dx * 0.005
        /* L'inclinaison est BRIDÉE à ±85° : au-delà, on bascule par-dessus le pôle et
           le globe se retrouve à l'envers, état dont l'utilisateur ne sait pas revenir. */
        rotation.x = Math.max(-1.48, Math.min(1.48, rotation.x + dy * 0.005))

        lastX = event.clientX
        lastY = event.clientY
        setHovered(null)
        invalidate()
        return
      }

      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

      raycaster.setFromCamera(pointer, camera)
      const hit = raycaster.intersectObjects(countryGroup.children, false)[0]

      if (hit) {
        const { iso, name } = hit.object.userData as { iso: string; name: string }
        setHovered({ iso, name, x: event.clientX - rect.left, y: event.clientY - rect.top })
        renderer.domElement.style.cursor = 'pointer'
      } else {
        setHovered(null)
        renderer.domElement.style.cursor = 'grab'
      }
    }

    function onPointerUp(event: PointerEvent) {
      dragging = false
      renderer.domElement.releasePointerCapture(event.pointerId)

      /*
       * UN GLISSEMENT N'EST PAS UN CLIC — seuil mesuré à six pixels cumulés.
       *
       * Sans ce garde-fou, chaque rotation se termine par une sélection : on lâche le
       * bouton au-dessus d'un pays, et la barre latérale s'ouvre sur un pays qu'on ne
       * regardait pas. Le seuil est cumulé et non calculé de bout en bout, ce qui
       * attrape aussi les allers-retours qui reviennent au point de départ.
       */
      if (moved > 6) return

      const rect = renderer.domElement.getBoundingClientRect()
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

      raycaster.setFromCamera(pointer, camera)
      const hit = raycaster.intersectObjects(countryGroup.children, false)[0]

      onSelectRef.current(hit ? (hit.object.userData as { iso: string }).iso : null)
    }

    function onWheel(event: WheelEvent) {
      /* `preventDefault` sur un écouteur NON passif : sans lui, la molette ferait
         défiler la page pendant qu'on zoome, et le globe partirait hors de l'écran. */
      event.preventDefault()
      distance = Math.max(MIN_DISTANCE, Math.min(MAX_DISTANCE, distance + event.deltaY * 0.001))
      invalidate()
    }

    const canvas = renderer.domElement
    canvas.style.cursor = 'grab'
    canvas.style.touchAction = 'none'
    canvas.addEventListener('pointerdown', onPointerDown)
    canvas.addEventListener('pointermove', onPointerMove)
    canvas.addEventListener('pointerup', onPointerUp)
    canvas.addEventListener('pointerleave', () => setHovered(null))
    canvas.addEventListener('wheel', onWheel, { passive: false })

    const observer = new ResizeObserver(resize)
    observer.observe(mount)
    resize()

    /*
     * ── RENDU À LA DEMANDE, ET NON EN BOUCLE CONTINUE ─────────────────────────
     *
     * La première version appelait `requestAnimationFrame` en boucle : soixante images
     * par seconde, indéfiniment, pour une scène qui ne bouge que lorsqu'on la
     * manipule. Le coût est réel — un cœur de processeur graphique occupé en
     * permanence, et une batterie qui se vide sur une page qu'on a laissée ouverte.
     *
     * Il est aussi mesurable autrement : le thread principal restait assez chargé pour
     * que l'injection de script échoue à s'y glisser, au point qu'aucune capture
     * d'écran ne pouvait aboutir. Un onglet qu'un outil ne peut plus interroger est un
     * onglet qui répond mal à l'utilisateur.
     *
     * Une image n'est donc demandée qu'après un changement réel, et `frame` garantit
     * qu'une rafale d'événements de souris n'en programme qu'une seule.
     */
    let frame = 0

    function draw() {
      frame = 0
      countryGroup.rotation.set(rotation.x, rotation.y, 0)
      ocean.rotation.set(rotation.x, rotation.y, 0)
      camera.position.setZ(distance)
      renderer.render(scene, camera)
    }

    function invalidate() {
      if (frame === 0) frame = requestAnimationFrame(draw)
    }

    invalidateRef.current = invalidate
    invalidate()

    return () => {
      disposed = true
      cancelAnimationFrame(frame)
      observer.disconnect()
      canvas.removeEventListener('pointerdown', onPointerDown)
      canvas.removeEventListener('pointermove', onPointerMove)
      canvas.removeEventListener('pointerup', onPointerUp)
      canvas.removeEventListener('wheel', onWheel)

      /* Les ressources GPU ne sont PAS ramassées par le collecteur de JavaScript :
         sans ces libérations, chaque bascule vers la carte et retour laisserait derrière
         elle un contexte WebGL et 177 géométries en mémoire vidéo. */
      for (const mesh of meshes.values()) {
        mesh.geometry.dispose()
        ;(mesh.material as THREE.Material).dispose()
      }
      ocean.geometry.dispose()
      ;(ocean.material as THREE.Material).dispose()
      renderer.dispose()
      mount.removeChild(canvas)
    }
  }, [])

  return (
    <div className="relative h-full w-full overflow-hidden rounded-card border border-border-subtle bg-[#081420]">
      <div ref={mountRef} className="h-full w-full" />

      {!ready && !error ? (
        <p className="absolute inset-0 flex items-center justify-center text-xs text-ink-muted">
          Chargement du globe…
        </p>
      ) : null}

      {error ? (
        <p className="absolute inset-0 flex items-center justify-center px-6 text-center text-xs text-ink-muted">
          {error}
        </p>
      ) : null}

      {/*
        L'INFOBULLE SUIT LE CURSEUR, décalée de douze pixels.

        Centrée sous le pointeur, elle masquerait le pays qu'elle nomme. Le décalage la
        place hors du champ du curseur tout en restant assez proche pour qu'on ne la
        cherche pas. `pointer-events-none` est indispensable : sans lui, l'infobulle
        s'interposerait entre le curseur et le globe, et le survol s'annulerait de
        lui-même dès qu'elle apparaît — un clignotement sans fin.
      */}
      {hovered ? (
        <span
          className="pointer-events-none absolute z-10 rounded-control border border-border-subtle bg-overlay px-2 py-1 text-xs font-medium text-ink shadow-overlay"
          style={{ left: hovered.x + 12, top: hovered.y + 12 }}
        >
          {hovered.name}
        </span>
      ) : null}
    </div>
  )
}

/**
 * Maillage d'un pays, plaqué sur la sphère.
 *
 * ── TRIANGULATION EN ÉVENTAIL AUTOUR DU CENTROÏDE ────────────────────────────
 *
 * Une triangulation générale — l'algorithme des oreilles — gère les polygones
 * concaves, et il en existe ici : le Chili, la Norvège, l'Indonésie. L'éventail les
 * approxime, et ce que l'approximation coûte est mesurable : quelques triangles
 * débordent légèrement sur la mer voisine.
 *
 * C'est acceptable POUR CE QU'ON EN FAIT. Les triangles servent à peindre une couleur
 * et à recevoir un rayon de survol ; personne ne lit une frontière au pixel près sur
 * un globe tournant, et l'erreur reste sous le degré — soit sous le pixel aux zooms
 * pratiqués. L'algorithme des oreilles demanderait deux cents lignes et un test de
 * robustesse pour un gain invisible.
 *
 * Les anneaux de moins de trois points, et les micro-îles que la simplification a
 * réduites à un trait, sont écartés : ils produisent des triangles dégénérés que le
 * raycaster traverse sans jamais les toucher.
 */
function buildCountryMesh(country: CountryFeature): THREE.Mesh | null {
  const positions: number[] = []

  for (const ring of country.rings) {
    if (ring.length < 3) continue

    let lonSum = 0
    let latSum = 0
    for (const [lon, lat] of ring) {
      lonSum += lon
      latSum += lat
    }

    const centroid = toSphere(lonSum / ring.length, latSum / ring.length, RADIUS)

    for (let index = 0; index < ring.length; index += 1) {
      const current = ring[index] as [number, number]
      const next = ring[(index + 1) % ring.length] as [number, number]

      const a = toSphere(current[0], current[1], RADIUS)
      const b = toSphere(next[0], next[1], RADIUS)

      positions.push(centroid[0], centroid[1], centroid[2], a[0], a[1], a[2], b[0], b[1], b[2])
    }
  }

  if (positions.length === 0) return null

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.computeVertexNormals()

  /* `MeshBasicMaterial` et non un matériau éclairé : un globe de DONNÉES ne doit pas
     avoir de côté sombre. Une lumière directionnelle rendrait la moitié des pays
     illisibles selon l'angle, et leur couleur — qui EST l'information — dépendrait de
     la rotation. */
  const material = new THREE.MeshBasicMaterial({
    color: 0x2a3b4d,
    side: THREE.DoubleSide,
  })

  return new THREE.Mesh(geometry, material)
}

/**
 * Résout une couleur CSS — `color-mix` et variables de thème comprises — en un
 * triplet que three.js accepte.
 *
 * ── DEUX PIÈGES, ET LE SECOND EST SILENCIEUX ────────────────────────────────
 *
 * Le premier est connu : `getComputedStyle` d'un nœud HORS DOCUMENT rend une chaîne
 * vide, et les variables de thème ne se résolvent que sous un ancêtre qui les
 * déclare. La sonde est donc attachée le temps du calcul.
 *
 * Le second a coûté un globe entièrement gris. Les navigateurs récents résolvent
 * `color-mix(in srgb, …)` non pas en `rgb(…)` mais en `color(srgb 0.15 0.52 0.39)` —
 * mesuré dans Chrome. Or `THREE.Color.set()` ne connaît pas cette syntaxe : il
 * n'échoue pas, il IGNORE la valeur et laisse la couleur précédente. Aucune erreur,
 * aucun avertissement, et cent soixante-dix-sept pays de la teinte par défaut.
 *
 * On convertit donc nous-mêmes ce cas, qui est de simples fractions à multiplier
 * par 255.
 */
/**
 * Résolutions déjà obtenues, MÉMORISÉES — et ce cache n'est pas une optimisation de
 * confort, c'est ce qui rend le globe utilisable.
 *
 * Chaque résolution attache un élément au document, lit son style calculé, puis le
 * retire : trois opérations qui forcent le navigateur à recalculer la mise en page
 * SYNCHRONIQUEMENT. Multiplié par cent soixante-dix-sept pays et refait à chaque
 * repeint, le coût gèle l'onglet — constaté à l'écran, la page ne répondait plus assez
 * longtemps pour qu'une capture aboutisse.
 *
 * Or l'échelle de couleur ne produit qu'une poignée de teintes distinctes : la même
 * chaîne revient des dizaines de fois par repeint, et une seule mesure suffit.
 *
 * ⚠️ Le cache est vidé à la bascule de thème — voir `clearColorCache`. Sans cela, un
 * globe ouvert au moment du basculement garderait les couleurs de l'ancien thème.
 */
const COLOR_CACHE = new Map<string, string>()

export function clearColorCache(): void {
  COLOR_CACHE.clear()
}

function resolveColor(css: string): string {
  const cached = COLOR_CACHE.get(css)
  if (cached) return cached

  const probe = document.createElement('span')
  probe.style.color = css
  probe.style.display = 'none'
  document.body.appendChild(probe)
  const resolved = getComputedStyle(probe).color
  probe.remove()

  if (!resolved) return '#2a3b4d'

  const srgb = resolved.match(/^color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/)

  const out = srgb
    ? `#${[srgb[1], srgb[2], srgb[3]]
        .map((raw) =>
          Math.max(0, Math.min(255, Math.round(Number(raw) * 255)))
            .toString(16)
            .padStart(2, '0'),
        )
        .join('')}`
    : resolved

  COLOR_CACHE.set(css, out)
  return out
}
