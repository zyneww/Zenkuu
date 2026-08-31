/**
 * ══════════════════════════════════════════════════════════════════════════════
 * LE PANNEAU GAUCHE DES PAGES D'AUTHENTIFICATION
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Un aplat nocturne, un ciel étoilé qui scintille lentement, un slogan en haut à
 * gauche et un écu au centre. C'est la composition de la référence.
 *
 * ── LE BOUCLIER EST DESSINÉ ICI, ET C'EST OBLIGATOIRE ──────────────────────
 *
 * ⚠️ Celui de la référence porte SON logotype et sa facture métallique : le reprendre
 * serait copier un actif de marque. Celui-ci est un tracé SVG écrit dans le dépôt, aux
 * proportions d'un écu ordinaire, portant le monogramme ZENKUU. Rien n'en est importé.
 *
 * ── LE CIEL EST CALCULÉ, PAS UNE IMAGE ─────────────────────────────────────
 *
 * Une photographie de ciel étoilé pèserait quelques centaines de kilooctets pour un
 * fond décoratif, et il faudrait en tenir les droits. Deux cents étoiles en SVG pèsent
 * quelques kilooctets et se redimensionnent sans flou.
 *
 * ⚠️ LEURS POSITIONS SONT DÉTERMINISTES. `Math.random()` produirait un ciel différent
 * au rendu serveur et au rendu client — React signalerait un écart d'hydratation sur
 * deux cents éléments. Le générateur ci-dessous part d'une graine fixe : même suite à
 * chaque appel, donc même ciel des deux côtés.
 *
 * ── LE SCINTILLEMENT RESPECTE `prefers-reduced-motion` ─────────────────────
 *
 * Deux cents points qui palpitent sont exactement le genre d'animation d'ambiance que
 * ce réglage existe pour éteindre. Voir la règle dans `globals.css` : les étoiles
 * restent, seule leur pulsation s'arrête.
 */

/** Nombre d'étoiles. Au-delà, le ciel devient un aplat gris. */
const STAR_COUNT = 180

/**
 * Suite pseudo-aléatoire REPRODUCTIBLE — un générateur congruentiel linéaire.
 *
 * Les constantes sont celles de `glibc`. Ce n'est pas de la cryptographie : on veut
 * seulement une suite qui ne se répète pas à l'œil et qui rende la MÊME chose à chaque
 * exécution, ce que `Math.random()` ne peut pas garantir.
 */
function seeded(seed: number): () => number {
  let state = seed
  return () => {
    state = (state * 1103515245 + 12345) % 2147483648
    return state / 2147483648
  }
}

function stars() {
  const next = seeded(20260829)
  return Array.from({ length: STAR_COUNT }, () => {
    const size = next() * 1.6 + 0.4
    return {
      cx: next() * 100,
      cy: next() * 100,
      r: size,
      /* Les plus petites étoiles sont les plus pâles : c'est ce qui donne une
         profondeur au ciel plutôt qu'un semis uniforme. */
      opacity: 0.25 + size / 4,
      /* Décalage de la pulsation, pour qu'elles ne scintillent pas en chœur. */
      delay: next() * 6,
    }
  })
}

export function AuthAside({
  slogan,
  tagline,
  shieldLabel,
}: {
  slogan: string
  tagline: string
  /* L'étiquette de l'écu suit le chemin de `slogan` et `tagline` : ce fichier n'a
     aucun import et ne traduit rien lui-même — ses textes lui arrivent traduits. */
  shieldLabel: string
}) {
  const sky = stars()

  return (
    /*
      `hidden lg:flex` : sous 1024 px, le formulaire prend l'écran entier. Un panneau
      décoratif qui occuperait la moitié d'un téléphone repousserait le champ de saisie
      sous la ligne de flottaison — c'est aussi ce que fait la référence.

      Le fond est écrit EN DUR et ne bascule pas avec le thème. Ce panneau est nocturne
      par nature : un ciel étoilé sur fond crème n'est pas un ciel. C'est le même
      raisonnement que les jetons `heat-*`, qui portent leur propre contraste.
    */
    <aside className="relative hidden overflow-hidden bg-[#05070d] lg:flex lg:flex-col lg:justify-between lg:p-12">
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        {sky.map((star, index) => (
          <circle
            key={index}
            cx={star.cx}
            cy={star.cy}
            /* `r` en unités de viewBox avec `preserveAspectRatio="none"` donnerait des
               ellipses : le rayon est donc divisé par cent et exprimé en pourcentage de
               la plus petite dimension, ce que `vector-effect` ne sait pas faire. On
               accepte l'étirement, imperceptible sur des points de deux pixels. */
            r={star.r / 10}
            fill="#ffffff"
            opacity={star.opacity}
            className="auth-star"
            style={{ animationDelay: `${star.delay}s` }}
          />
        ))}
      </svg>

      <div className="relative">
        <p className="display-sm text-white">{slogan}</p>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-white/70">{tagline}</p>
      </div>

      <div className="relative flex flex-1 items-center justify-center">
        <ZenkuuShield label={shieldLabel} />
      </div>

      {/* Un rappel du cadre, en bas du panneau : c'est la première page que voit
          quelqu'un qui arrive par un lien de connexion, et la seule chose qu'il doive
          savoir avant de saisir une adresse. */}
      <p className="relative max-w-sm text-xs leading-relaxed text-white/45">
        ZENKUU est un site d’information en lecture seule. Aucun dépôt, aucun retrait,
        aucun ordre — le compte ne sert qu’à retrouver vos listes de suivi.
      </p>
    </aside>
  )
}

/**
 * L'écu ZENKUU — un tracé, pas une image.
 *
 * Le dégradé va du gris clair au gris sombre pour donner le relief que la référence
 * obtient par une texture métallique. Le monogramme est posé en creux, dans la teinte
 * du fond du panneau : c'est ce qui le fait lire comme gravé plutôt que collé.
 */
function ZenkuuShield({ label }: { label: string }) {
  return (
    <svg
      viewBox="0 0 200 240"
      className="h-auto w-56 max-w-full drop-shadow-[0_18px_40px_rgba(0,0,0,0.55)]"
      role="img"
      aria-label={label}
    >
      <defs>
        <linearGradient id="zenkuu-shield-face" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f4f6fa" />
          <stop offset="45%" stopColor="#b9c0cc" />
          <stop offset="100%" stopColor="#6d7684" />
        </linearGradient>
        <linearGradient id="zenkuu-shield-edge" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#4a515c" stopOpacity="0.9" />
        </linearGradient>
      </defs>

      {/* Le contour de l'écu : deux épaules droites, des flancs qui se resserrent, une
          pointe basse. Le second tracé, légèrement réduit, fait le liseré. */}
      <path
        d="M100 6 L188 40 V120 C188 176 148 214 100 234 C52 214 12 176 12 120 V40 Z"
        fill="url(#zenkuu-shield-edge)"
      />
      <path
        d="M100 18 L176 48 V120 C176 168 142 202 100 220 C58 202 24 168 24 120 V48 Z"
        fill="url(#zenkuu-shield-face)"
      />

      {/*
        Le monogramme, en creux : la teinte du fond du panneau, pas du noir pur.

        ⚠️ `fontSize` EST UN ATTRIBUT SVG, PAS UNE CLASSE. Une classe `text-[54px]`
        poserait 54 pixels CSS — donc une taille fixe qui ne suivrait pas la mise à
        l'échelle du `viewBox`, et qui n'a de toute façon rien à faire sur l'échelle
        typographique du design system : ce sont 54 unités de dessin, pas du texte
        de lecture.
      */}
      <text
        x="100"
        y="132"
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#05070d"
        fillOpacity="0.82"
        fontSize="54"
        fontWeight="700"
        letterSpacing="-1"
      >
        ZK
      </text>
    </svg>
  )
}
