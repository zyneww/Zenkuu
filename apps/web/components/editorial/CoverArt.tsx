/**
 * Vignette de couverture GÉNÉRÉE, pour les contenus que nous écrivons nous-mêmes.
 *
 * ── POURQUOI PAS DE VRAIES IMAGES ─────────────────────────────────────────────
 *
 * Les références du secteur — Kraken, CoinGecko, Tokenomist — accompagnent chaque
 * article d'une illustration produite pour lui. Nous n'avons pas d'atelier
 * graphique, et les deux replis habituels sont pires que le mal : une banque
 * d'images génériques donne un site interchangeable, et un cadre gris « image à
 * venir » se lit comme une page inachevée.
 *
 * Le troisième chemin est de dériver le visuel du CONTENU. Chaque couverture est
 * ici un dégradé, un motif et une initiale calculés à partir du titre et de la
 * rubrique : deux articles différents ne se ressemblent jamais, le même article
 * garde sa couverture d'une visite à l'autre, et l'ensemble reste manifestement de
 * la même famille. C'est le compromis honnête entre « rien » et « faux ».
 *
 * ── CE QUE ÇA COÛTE : RIEN ────────────────────────────────────────────────────
 *
 * Aucun fichier, aucune requête réseau, aucun octet de JavaScript — du SVG rendu
 * par le serveur au milieu du HTML. Une grille de douze couvertures pèse ce que
 * pèserait UNE image JPEG de mauvaise qualité, et s'affiche avant elle.
 *
 * ── REMPLAÇABLE AU CAS PAR CAS ────────────────────────────────────────────────
 *
 * `imageUrl` court-circuite tout ce mécanisme. Le jour où un article mérite une
 * vraie illustration, on la lui donne sans toucher aux autres — la génération n'est
 * pas un choix définitif, c'est le comportement par défaut.
 */

/**
 * Empreinte NUMÉRIQUE STABLE d'une chaîne.
 *
 * Variante de djb2, choisie pour une raison précise : la somme naïve des codes de
 * caractères — ce que fait `BrandTile` dans le fil d'actualités, où trente sources
 * suffisent — donne le MÊME résultat à deux titres composés des mêmes lettres, et
 * surtout des valeurs très voisines pour deux titres proches. Sur une bibliothèque
 * de dizaines de fiches aux intitulés semblables (« Lire une capitalisation »,
 * « Lire un graphique »), les couvertures se ressembleraient toutes. Le décalage et
 * l'addition de djb2 dispersent au contraire des entrées voisines aux deux bouts de
 * l'échelle.
 *
 * `>>> 0` ramène dans les entiers non signés : sans lui, le décalage produit des
 * valeurs négatives, et un modulo négatif indexe hors du tableau.
 */
function hash(input: string): number {
  let value = 5381
  for (let index = 0; index < input.length; index += 1) {
    value = ((value << 5) + value + input.charCodeAt(index)) >>> 0
  }
  return value
}

/**
 * Six duos de teintes, puisés dans la palette de DONNÉES et non d'interface.
 *
 * Le même raisonnement que pour les pastilles du fil d'actualités : ces fonds
 * distinguent des sujets, ils ne signalent ni action ni état. Garder la palette
 * d'interface pour ce qui se clique est ce qui préserve la lisibilité du magenta
 * comme couleur du site.
 *
 * Les jetons sont interpolés dans le SVG, donc résolus par le navigateur à la
 * peinture : les couvertures suivent la bascule de thème sans être régénérées.
 */
const PAIRS = [
  ['var(--color-data-1)', 'var(--color-data-4)'],
  ['var(--color-data-2)', 'var(--color-data-5)'],
  ['var(--color-data-3)', 'var(--color-data-6)'],
  ['var(--color-data-4)', 'var(--color-data-2)'],
  ['var(--color-data-5)', 'var(--color-data-1)'],
  ['var(--color-data-6)', 'var(--color-data-3)'],
] as const

/**
 * Quatre familles de motif, pour que la couleur ne porte pas seule la distinction.
 *
 * Deux articles peuvent tomber sur le même duo de teintes ; ils tomberont rarement
 * aussi sur le même motif. Surtout, un lecteur daltonien ne distingue pas six duos
 * de couleurs — la forme, elle, reste lisible pour tout le monde. C'est la même
 * règle que celle qui interdit de coder une hausse par la seule couleur verte.
 */
type Motif = 'dots' | 'rings' | 'waves' | 'grid'

const MOTIFS: Motif[] = ['dots', 'rings', 'waves', 'grid']

export interface CoverArtProps {
  /** Graine du tirage — le slug, stable dans le temps, plutôt que le titre. */
  seed: string
  /** Étiquette lisible posée en bas à gauche (rubrique, niveau). */
  label?: string
  /** Image réelle, si elle existe. Elle court-circuite toute la génération. */
  imageUrl?: string
  /**
   * Rapport de cadrage. La grille du blog impose 16/9, le héros de liste 16/10.
   *
   * `21/9` existe pour le bandeau EN TÊTE D'ARTICLE, et la raison est arithmétique :
   * la colonne d'article fait 56 rem, où un 16/10 mesure 560 px de haut — il occupait
   * plus de la moitié du premier écran, pour une image qui n'informe de rien. Au même
   * endroit, un 21/9 en fait 384, comparable à la référence du secteur.
   */
  ratio?: '21/9' | '16/9' | '16/10' | '4/3'
  className?: string
}

const RATIOS = {
  '21/9': 'aspect-[21/9]',
  '16/9': 'aspect-[16/9]',
  '16/10': 'aspect-[16/10]',
  '4/3': 'aspect-[4/3]',
} as const

export function CoverArt({ seed, label, imageUrl, ratio = '16/9', className = '' }: CoverArtProps) {
  const shape = `block w-full overflow-hidden ${RATIOS[ratio]} ${className}`

  if (imageUrl) {
    return (
      <span className={shape}>
        {/* eslint-disable-next-line @next/next/no-img-element -- illustration locale déjà dimensionnée */}
        <img src={imageUrl} alt="" aria-hidden="true" loading="lazy" className="h-full w-full object-cover" />
      </span>
    )
  }

  const fingerprint = hash(seed)
  const pair = PAIRS[fingerprint % PAIRS.length] as readonly [string, string]

  /*
   * DÉCALAGES NON SIGNÉS (`>>>`), et c'est un correctif et non un détail de style.
   *
   * `hash` rend un entier non signé sur 32 bits, donc jusqu'à 4,29 milliards. Le
   * décalage SIGNÉ `>>` réinterprète ce nombre en complément à deux : tout ce qui
   * dépasse 2³¹ redevient négatif, et un modulo négatif indexe hors du tableau.
   * Mesuré sur les neuf fiches de la bibliothèque avant correction : QUATRE
   * couvertures recevaient `MOTIFS[-1]`, c'est-à-dire `undefined`, et s'affichaient
   * sans motif — un dégradé nu, sans que rien ne signale l'erreur.
   *
   * Les bits sont lus à trois profondeurs différentes pour que teinte, motif et
   * angle varient INDÉPENDAMMENT. Puisés au même endroit, ils changeraient ensemble
   * et le tirage n'aurait plus qu'une dimension au lieu de trois.
   */
  const motif = MOTIFS[(fingerprint >>> 3) % MOTIFS.length] as Motif
  const angle = 25 + ((fingerprint >>> 6) % 12) * 10

  /* `seed` sert aussi d'identifiant SVG. Deux couvertures sur une page partageraient
     sinon leurs `<defs>`, et toutes prendraient l'apparence de la première déclarée —
     le défaut classique des dégradés SVG, d'autant plus déroutant qu'il est partiel. */
  const uid = `cover-${fingerprint.toString(36)}`

  return (
    <span className={shape} aria-hidden="true">
      <svg
        viewBox="0 0 320 180"
        /*
         * ANCRÉ EN BAS (`YMax`) et non centré, à cause de l'étiquette.
         *
         * Le dessin est en 16/9. Dans un cadre PLUS LARGE que cela — le 21/9 du
         * bandeau d'article — `slice` déborde en hauteur et rogne : centré, il
         * retirait 21 unités en haut et 21 en bas, ce qui coupait net le bandeau
         * sombre et son étiquette, tracés entre y=130 et y=180. Ancré en bas, la
         * rognure part entièrement du haut, où il n'y a qu'un dégradé.
         *
         * Sans effet sur les cadres plus HAUTS que 16/9 (16/10, 4/3), où le
         * débordement est horizontal et `xMid` continue de centrer.
         */
        preserveAspectRatio="xMidYMax slice"
        className="h-full w-full"
        role="presentation"
      >
        <defs>
          <linearGradient id={`${uid}-g`} gradientTransform={`rotate(${angle})`}>
            <stop offset="0%" stopColor={pair[0]} stopOpacity="0.78" />
            <stop offset="100%" stopColor={pair[1]} stopOpacity="0.34" />
          </linearGradient>
          <Pattern id={`${uid}-p`} motif={motif} />
        </defs>

        {/* ── LA COUVERTURE EST POSÉE SUR UN PLATEAU SOMBRE, DANS LES DEUX THÈMES ──

            Le dégradé était peint sur le VIDE : il se composait donc sur le fond de la
            carte qui le porte, blanc en thème clair et presque noir en thème sombre.
            La même graine rendait ainsi deux couvertures d'allure opposée — pastel
            d'un côté, saturée de l'autre — alors que rien dans l'article ne change.

            `--color-tile-ground` existe précisément pour ça, et il est le seul jeton
            de la palette à NE PAS basculer avec le thème (voir globals.css, où les
            tuiles de la carte thermique s'en servent pour la même raison). Le duo de
            teintes se compose désormais toujours sur le même plateau : la couverture
            d'un article est la même partout, et le texte blanc de l'étiquette garde
            son contraste sans dépendre du thème.

            Les opacités descendent avec lui. À 0,9/0,55 sur un plateau sombre, le
            dégradé redevenait le point le plus lumineux de la page — quatre aplats
            saturés en bas d'un tableau de bord qui n'en porte aucun ailleurs. */}
        <rect width="320" height="180" fill="var(--color-tile-ground)" />
        <rect width="320" height="180" fill={`url(#${uid}-g)`} />
        <rect width="320" height="180" fill={`url(#${uid}-p)`} />

        {/* Voile sombre EN BAS uniquement : l'étiquette y est posée, et un texte clair
            sur un dégradé clair passerait sous le seuil de contraste à cet endroit
            précis. Voiler toute la surface ternirait la couverture pour régler un
            problème qui n'existe que sur une bande de trente pixels. */}
        {label ? (
          <>
            <rect y="130" width="320" height="50" fill="rgb(0 0 0 / 0.35)" />
            <text x="14" y="160" fill="#ffffff" fontSize="13" fontWeight="600" letterSpacing="0.3">
              {label}
            </text>
          </>
        ) : null}
      </svg>
    </span>
  )
}

/** Motifs, chacun décrit une fois puis répété par le moteur de rendu SVG. */
function Pattern({ id, motif }: { id: string; motif: Motif }) {
  const common = { id, patternUnits: 'userSpaceOnUse' as const }
  const ink = 'rgb(255 255 255 / 0.22)'

  if (motif === 'dots') {
    return (
      <pattern {...common} width="18" height="18">
        <circle cx="4" cy="4" r="1.8" fill={ink} />
      </pattern>
    )
  }

  if (motif === 'rings') {
    return (
      <pattern {...common} width="44" height="44">
        <circle cx="22" cy="22" r="15" fill="none" stroke={ink} strokeWidth="1.4" />
        <circle cx="22" cy="22" r="7" fill="none" stroke={ink} strokeWidth="1.4" />
      </pattern>
    )
  }

  if (motif === 'waves') {
    return (
      <pattern {...common} width="52" height="26">
        <path d="M0 20 Q13 4 26 20 T52 20" fill="none" stroke={ink} strokeWidth="1.6" />
      </pattern>
    )
  }

  return (
    <pattern {...common} width="26" height="26">
      <path d="M26 0 L0 0 0 26" fill="none" stroke={ink} strokeWidth="1.1" />
    </pattern>
  )
}
