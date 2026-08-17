/**
 * PICTOGRAMMES D'IDENTITÉ — devises, indices, matières premières.
 *
 * ── LE PROBLÈME QUE CE FICHIER RÉSOUT ────────────────────────────────────────
 *
 * Trois classes d'actifs sur sept n'avaient aucune identité visuelle. Une paire de
 * devises, un indice et un contrat à terme tombaient tous sur le monogramme de repli :
 * une pastille violette portant deux lettres. Dans un tableau de cinquante lignes,
 * vingt pastilles identiques ne distinguent rien — elles occupent la place d'un repère
 * sans en être un.
 *
 * CoinGecko résout la même question avec des drapeaux pour les devises et des
 * pictogrammes pour les matières premières. On reprend le principe, pas les fichiers.
 *
 * ── POURQUOI DES SVG ÉCRITS ICI, ET NON DES IMAGES ───────────────────────────
 *
 * Trente et un pictogrammes en images, ce sont trente et une requêtes réseau au
 * premier rendu d'un tableau — ou un fichier de sprites à tenir à jour. Écrits en SVG
 * dans le paquet, ils arrivent avec le HTML, ne peuvent pas manquer, ne clignotent
 * pas, et se colorent depuis les jetons du thème.
 *
 * Cela leur donne surtout ce qu'aucune image ne donne : ils s'adaptent au thème. Un
 * PNG de drapeau est le même sur fond clair et sur fond sombre ; le cerne de nos
 * disques suit `--color-border-subtle`, donc le thème du lecteur.
 *
 * ── POURQUOI PAS D'ÉMOJIS, ALORS QUE LE PROJET EN UTILISE DÉJÀ ───────────────
 *
 * Les matières premières portaient `🥇 🛢️ 🌾`. C'était le bon arbitrage quand elles
 * étaient seules à en avoir besoin — mais un émoji est rendu par le SYSTÈME : la même
 * page montre des pastilles plates sur Windows, bombées sur macOS, et d'un troisième
 * dessin sur Android. Posés à côté des logos vectoriels des cryptoactifs, ils se
 * lisaient comme des corps étrangers. Les émojis restent en repli quand aucun
 * pictogramme n'existe (voir `CommodityGlyph`).
 *
 * ── LES DRAPEAUX SONT SIMPLIFIÉS, ET C'EST UN CHOIX ─────────────────────────
 *
 * À vingt-quatre pixels, la feuille d'érable canadienne fait quatre pixels de large :
 * elle ne se lit pas, elle salit. Chaque drapeau garde donc ses BANDES et sa
 * disposition — ce que l'œil reconnaît à cette taille — et perd ses détails
 * héraldiques. Ce n'est pas une reproduction fidèle et ne prétend pas l'être : c'est
 * un repère de couleur qui doit fonctionner dans une ligne de tableau.
 */

/* ── Drapeaux ─────────────────────────────────────────────────────────────── */

/**
 * Chaque drapeau est un fragment dessiné dans un carré de 24 × 24, découpé plus loin
 * par un masque circulaire. Le repère est fixe pour que les fragments se composent :
 * c'est ce qui permet à `PairGlyph` d'en superposer deux sans les redessiner.
 */
const FLAGS: Record<string, React.ReactNode> = {
  /** Union européenne — bleu, et douze étoiles réduites à leur cercle. */
  EUR: (
    <>
      <rect width="24" height="24" fill="#039" />
      {/* Douze étoiles à cette taille donneraient douze taches de deux pixels. Le
          cercle qu'elles forment est ce que l'œil retient du drapeau : on le dessine
          lui, en pointillé, ce qui rend la même impression à un dixième du bruit. */}
      <circle
        cx="12"
        cy="12"
        r="6"
        fill="none"
        stroke="#FC0"
        strokeWidth="2.6"
        strokeDasharray="1 2.14"
        strokeLinecap="round"
      />
    </>
  ),

  /** États-Unis — treize bandes ramenées à sept, canton bleu. */
  USD: (
    <>
      <rect width="24" height="24" fill="#fff" />
      {[0, 2, 4, 6, 8, 10].map((index) => (
        <rect key={index} y={index * 3.7} width="24" height="1.85" fill="#B22234" />
      ))}
      <rect width="11" height="13" fill="#3C3B6E" />
    </>
  ),

  /** Royaume-Uni — Union Jack, croix droite et croix de Saint-André. */
  GBP: (
    <>
      <rect width="24" height="24" fill="#012169" />
      <path d="M0 0 24 24M24 0 0 24" stroke="#fff" strokeWidth="5" />
      <path d="M0 0 24 24M24 0 0 24" stroke="#C8102E" strokeWidth="2.4" />
      <path d="M12 0v24M0 12h24" stroke="#fff" strokeWidth="7" />
      <path d="M12 0v24M0 12h24" stroke="#C8102E" strokeWidth="4" />
    </>
  ),

  /** Japon — disque rouge centré. */
  JPY: (
    <>
      <rect width="24" height="24" fill="#fff" />
      <circle cx="12" cy="12" r="6.4" fill="#BC002D" />
    </>
  ),

  /** Suisse — croix blanche sur fond rouge. */
  CHF: (
    <>
      <rect width="24" height="24" fill="#D52B1E" />
      <path d="M12 5.5v13M5.5 12h13" stroke="#fff" strokeWidth="3.6" />
    </>
  ),

  /** Canada — bandes verticales, feuille réduite à une silhouette. */
  CAD: (
    <>
      <rect width="24" height="24" fill="#fff" />
      <rect width="6.5" height="24" fill="#D80621" />
      <rect x="17.5" width="6.5" height="24" fill="#D80621" />
      <path
        d="M12 6.5l1.5 3.4 2.6-1-1 2.9 2.4.6-2.6 2 .5 1.6-2.6-.6.3 3.1h-1.2l.3-3.1-2.6.6.5-1.6-2.6-2 2.4-.6-1-2.9 2.6 1z"
        fill="#D80621"
      />
    </>
  ),

  /** Australie — bleu, Union Jack au canton, Croix du Sud simplifiée. */
  AUD: (
    <>
      <rect width="24" height="24" fill="#00247D" />
      <g>
        <path d="M0 0 12 12M12 0 0 12" stroke="#fff" strokeWidth="2.6" />
        <path d="M6 0v12M0 6h12" stroke="#fff" strokeWidth="3.6" />
        <path d="M6 0v12M0 6h12" stroke="#C8102E" strokeWidth="2" />
      </g>
      <circle cx="6" cy="18" r="1.6" fill="#fff" />
      <circle cx="18" cy="6.5" r="1.1" fill="#fff" />
      <circle cx="18.5" cy="13" r="1.1" fill="#fff" />
      <circle cx="15.5" cy="18.5" r="1" fill="#fff" />
      <circle cx="20.5" cy="19" r="0.9" fill="#fff" />
    </>
  ),

  /** Chine — rouge, une grande étoile et quatre petites. */
  CNY: (
    <>
      <rect width="24" height="24" fill="#EE1C25" />
      <circle cx="7" cy="7.5" r="3.1" fill="#FF0" />
      <circle cx="13.5" cy="3.5" r="1.1" fill="#FF0" />
      <circle cx="16.5" cy="6.5" r="1.1" fill="#FF0" />
      <circle cx="16.5" cy="10.5" r="1.1" fill="#FF0" />
      <circle cx="13.5" cy="13.5" r="1.1" fill="#FF0" />
    </>
  ),

  /** Suède — croix scandinave, décentrée vers la hampe comme il se doit. */
  SEK: (
    <>
      <rect width="24" height="24" fill="#006AA7" />
      <path d="M9 0v24M0 12h24" stroke="#FECC00" strokeWidth="4.4" />
    </>
  ),

  /** Allemagne — noir, rouge, or. */
  DEU: (
    <>
      <rect width="24" height="8" fill="#000" />
      <rect y="8" width="24" height="8" fill="#DD0000" />
      <rect y="16" width="24" height="8" fill="#FFCE00" />
    </>
  ),

  /** France — bleu, blanc, rouge. */
  FRA: (
    <>
      <rect width="8" height="24" fill="#002395" />
      <rect x="8" width="8" height="24" fill="#fff" />
      <rect x="16" width="8" height="24" fill="#ED2939" />
    </>
  ),

  /** Hong Kong — rouge, fleur de bauhinia réduite à cinq pétales. */
  HKG: (
    <>
      <rect width="24" height="24" fill="#DE2910" />
      {[0, 72, 144, 216, 288].map((angle) => (
        <ellipse
          key={angle}
          cx="12"
          cy="7.4"
          rx="1.9"
          ry="4.1"
          fill="#fff"
          transform={`rotate(${angle} 12 12)`}
        />
      ))}
    </>
  ),
}

/* Les indices n'ont pas de devise mais un PAYS DE COTATION : la table ci-dessous
   rattache chacun au drapeau qui l'identifie. `EUR` pour l'Euro Stoxx 50, qui est
   paneuropéen et n'appartient à aucune place nationale. */
const FLAG_ALIAS: Record<string, string> = {
  USA: 'USD',
  GBR: 'GBP',
  JPN: 'JPY',
  CHE: 'CHF',
  CAN: 'CAD',
  AUS: 'AUD',
  CHN: 'CNY',
  SWE: 'SEK',
}

function resolveFlag(code: string): React.ReactNode | undefined {
  const key = code.toUpperCase()
  return FLAGS[key] ?? FLAGS[FLAG_ALIAS[key] ?? '']
}

/** Un drapeau seul, dans un disque cerné. */
export function CurrencyFlag({ code, size = 24 }: { code: string; size?: number }) {
  const flag = resolveFlag(code)
  if (!flag) return null

  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className="shrink-0"
      aria-hidden="true"
      focusable="false"
    >
      {/*
        LE MASQUE EST DÉCLARÉ PAR CODE, et l'identifiant doit donc être unique dans la
        page. Deux `<clipPath id="rond">` dans un même document se recouvrent, et tous
        les drapeaux se découperaient alors sur le premier — invisible tant qu'ils sont
        tous ronds, fatal dès qu'un seul change de forme. Le code de la devise ne peut
        pas collider : c'est une clé, pas un compteur.
      */}
      <clipPath id={`zk-flag-${code}`}>
        <circle cx="12" cy="12" r="12" />
      </clipPath>
      <g clipPath={`url(#zk-flag-${code})`}>{flag}</g>
      {/* Le cerne empêche un drapeau à bord blanc (Japon, États-Unis) de se dissoudre
          dans un fond clair. `r=11.5` et non 12 : un contour est centré sur son
          tracé, la moitié externe serait rognée par le `viewBox`. */}
      <circle
        cx="12"
        cy="12"
        r="11.5"
        fill="none"
        stroke="var(--color-border-subtle)"
        strokeWidth="1"
      />
    </svg>
  )
}

/**
 * PAIRE DE DEVISES — deux drapeaux, celui de la base en retrait.
 *
 * Le second chevauche le premier plutôt que de se poser à côté : une paire est UNE
 * cotation, pas deux actifs voisins. La superposition dit ce rapport, et tient dans
 * la largeur d'un logo simple — condition pour que la colonne « Actif » garde le même
 * gabarit sur toutes les classes.
 *
 * La devise COTÉE est devant. Sur `EUR/USD`, c'est le dollar qui varie et l'euro qui
 * sert de mesure : mettre l'euro au premier plan désignerait le mauvais des deux.
 */
export function PairGlyph({
  base,
  quote,
  size = 24,
}: {
  base: string
  quote: string
  size?: number
}) {
  if (!resolveFlag(base) || !resolveFlag(quote)) return null

  return (
    <span
      className="relative inline-flex shrink-0 items-center"
      style={{ width: size * 1.42, height: size }}
    >
      <span className="absolute left-0 top-0 opacity-60">
        <CurrencyFlag code={base} size={size} />
      </span>
      <span className="absolute right-0 top-0">
        <CurrencyFlag code={quote} size={size} />
      </span>
    </span>
  )
}

/* ── Matières premières ───────────────────────────────────────────────────── */

/**
 * Un pictogramme par matière, et sa teinte.
 *
 * Les tracés sont dessinés au TRAIT et non en aplat, pour la même raison que
 * `lucide-react` — déjà présent dans le projet — le fait : à petite taille, un contour
 * reste lisible là où un aplat devient une tache. L'épaisseur de 1,7 est celle de
 * lucide, pour que ces pictogrammes ne se distinguent pas des icônes voisines.
 *
 * La couleur est celle de la MATIÈRE et non de sa famille : l'or est doré, le cuivre
 * cuivré, le pétrole sombre. C'est le seul endroit du site où une couleur désigne un
 * objet plutôt qu'un état, et cela se défend — ces teintes sont la première chose que
 * l'œil associe à ces matières, bien avant leur nom.
 */
const COMMODITY_GLYPHS: Record<string, { color: string; path: React.ReactNode }> = {
  /** Or — lingot en perspective. */
  'GC=F': {
    color: '#D4A017',
    path: <path d="M4 16h16l-2-5H6zM7 11l1.5-4h7L17 11" />,
  },
  /** Argent — même lingot, teinte froide : c'est la même forme physique. */
  'SI=F': {
    color: '#9CA3AF',
    path: <path d="M4 16h16l-2-5H6zM7 11l1.5-4h7L17 11" />,
  },
  /** Platine — lingot plus étroit, la matière étant vendue en barres fines. */
  'PL=F': {
    color: '#8FA3B0',
    path: <path d="M5 16h14l-1.6-5H6.6zM7.6 11l1.2-4h6.4l1.2 4" />,
  },
  /** Cuivre — bobine de fil, l'usage qui fait son cours. */
  'HG=F': {
    color: '#C87533',
    path: (
      <>
        <ellipse cx="12" cy="7" rx="6" ry="2.5" />
        <path d="M6 7v10c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5V7" />
        <path d="M6 12c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5" />
      </>
    ),
  },
  /** Pétrole WTI — derrick, la production terrestre américaine. */
  'CL=F': {
    color: '#5B6472',
    path: (
      <>
        <path d="M8 20h8M9.5 20 12 4l2.5 16" />
        <path d="M10.2 14h3.6M9.6 10h4.8" />
      </>
    ),
  },
  /** Brent — goutte, la référence maritime : pas de derrick en mer du Nord à 24 px. */
  'BZ=F': {
    color: '#3F4854',
    path: <path d="M12 3.5c3.4 4 5.5 6.8 5.5 9.8a5.5 5.5 0 0 1-11 0c0-3 2.1-5.8 5.5-9.8z" />,
  },
  /** Gaz naturel — flamme. */
  'NG=F': {
    color: '#3B82F6',
    path: (
      <>
        <path d="M12 3c1 3.4-.6 4.6-1.9 6.2C8.4 11.2 7 12.9 7 15a5 5 0 0 0 10 0c0-2.6-1.4-4.3-2.6-6" />
        <path d="M12 20a2.6 2.6 0 0 0 2.6-2.6c0-1.4-1.2-2.3-2.6-4-1.4 1.7-2.6 2.6-2.6 4A2.6 2.6 0 0 0 12 20z" />
      </>
    ),
  },
  /** Blé — épi. */
  'ZW=F': {
    color: '#C9A227',
    path: (
      <>
        <path d="M12 21V8" />
        <path d="M12 8c0-2 1.4-3.4 3-4 .4 2-.6 3.6-3 4zM12 8c0-2-1.4-3.4-3-4-.4 2 .6 3.6 3 4z" />
        <path d="M12 13c0-2 1.4-3.4 3-4 .4 2-.6 3.6-3 4zM12 13c0-2-1.4-3.4-3-4-.4 2 .6 3.6 3 4z" />
        <path d="M12 18c0-2 1.4-3.4 3-4 .4 2-.6 3.6-3 4zM12 18c0-2-1.4-3.4-3-4-.4 2 .6 3.6 3 4z" />
      </>
    ),
  },
  /** Maïs — épi et ses feuilles. */
  'ZC=F': {
    color: '#E3A008',
    path: (
      <>
        <path d="M12 21c-2.5 0-4-2.6-4-7s1.5-9 4-9 4 4.6 4 9-1.5 7-4 7z" />
        <path d="M12 5v16M9 9h6M9 13h6M9 17h6" />
      </>
    ),
  },
  /** Café — grain, et son sillon. */
  'KC=F': {
    color: '#8B5E3C',
    path: (
      <>
        <ellipse cx="12" cy="12" rx="5.5" ry="8" transform="rotate(35 12 12)" />
        <path d="M8.6 15.4c2.4-2.4 4.4-4.4 6.8-6.8" />
      </>
    ),
  },
  /** Sucre — cristaux cubiques. */
  'SB=F': {
    color: '#D8DEE9',
    path: (
      <>
        <rect x="4" y="10" width="8" height="8" rx="1" />
        <rect x="12" y="6" width="8" height="8" rx="1" />
      </>
    ),
  },
  /** Cacao — cabosse et son sillon. */
  'CC=F': {
    color: '#7B4B2A',
    path: (
      <>
        <path d="M12 3.5c3.6 0 6.5 3.8 6.5 8.5S15.6 20.5 12 20.5 5.5 16.7 5.5 12 8.4 3.5 12 3.5z" />
        <path d="M12 4v16M9 5.5v13M15 5.5v13" />
      </>
    ),
  },
}

/**
 * Symboles réellement dessinés.
 *
 * Exposé pour que l'appelant sache AVANT d'appeler s'il obtiendra un pictogramme ou
 * `null`. Sans cela, il devrait rendre le composant puis inspecter le résultat pour
 * décider s'il faut essayer le repli — ce qu'un rendu React ne permet pas de faire
 * proprement.
 */
export const COMMODITY_DRAWN: ReadonlySet<string> = new Set(Object.keys(COMMODITY_GLYPHS))

/**
 * Pictogramme d'une matière première.
 *
 * Rend `null` si le symbole n'en a pas : l'appelant retombe alors sur l'émoji, puis
 * sur le monogramme. Une chaîne de replis plutôt qu'un pictogramme générique — une
 * icône « matière première » indifférenciée ne distinguerait rien et laisserait croire
 * que le dessin est celui de la matière.
 */
export function CommodityGlyph({ symbol, size = 24 }: { symbol: string; size?: number }) {
  const glyph = COMMODITY_GLYPHS[symbol]
  if (!glyph) return null

  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-pill bg-surface-muted"
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 24 24"
        width={Math.round(size * 0.68)}
        height={Math.round(size * 0.68)}
        fill="none"
        stroke={glyph.color}
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
      >
        {glyph.path}
      </svg>
    </span>
  )
}

/**
 * INDICE — le drapeau de sa place de cotation, et son monogramme par-dessus.
 *
 * ── POURQUOI LES DEUX, ALORS QU'UN DRAPEAU SUFFIRAIT ────────────────────────
 *
 * Parce qu'une place en porte plusieurs. Le S&P 500, le Dow Jones, le Nasdaq et le VIX
 * partagent le drapeau américain : quatre lignes du tableau des indices porteraient
 * exactement la même vignette. Le drapeau donne la GÉOGRAPHIE d'un regard, le
 * monogramme distingue à l'intérieur — aucun des deux ne fait le travail seul.
 *
 * Le monogramme est posé en pastille dans le coin, comme un écusson. Superposé au
 * centre, il masquerait la partie du drapeau qui l'identifie.
 */
export function IndexGlyph({
  country,
  label,
  size = 24,
}: {
  /** Pays ou zone, en toutes lettres — tel que le porte `UniverseEntry.country`. */
  country: string | undefined
  /** Une à deux lettres, déjà calculées par l'appelant. */
  label: string
  size?: number
}) {
  const code = country ? COUNTRY_TO_FLAG[country] : undefined
  if (!code || !resolveFlag(code)) return null

  return (
    <span className="relative inline-flex shrink-0" style={{ width: size, height: size }}>
      <CurrencyFlag code={code} size={size} />
      <span
        className="absolute -bottom-0.5 -right-0.5 flex items-center justify-center rounded-pill bg-surface font-bold text-ink ring-1 ring-border-subtle"
        style={{
          width: Math.round(size * 0.58),
          height: Math.round(size * 0.58),
          fontSize: Math.round(size * 0.32),
        }}
        aria-hidden="true"
      >
        {label.slice(0, 2)}
      </span>
    </span>
  )
}

/**
 * Pays de cotation → drapeau.
 *
 * Écrit en toutes lettres et en français parce que c'est la forme que porte
 * `UniverseEntry.country` — y ajouter un code ISO obligerait à tenir deux clés pour
 * les mêmes dix indices, avec la certitude qu'elles divergeraient.
 */
const COUNTRY_TO_FLAG: Record<string, string> = {
  France: 'FRA',
  'États-Unis': 'USA',
  Allemagne: 'DEU',
  'Royaume-Uni': 'GBR',
  'Zone euro': 'EUR',
  Japon: 'JPN',
  'Hong Kong': 'HKG',
  Suisse: 'CHE',
  Canada: 'CAN',
  Australie: 'AUS',
  Chine: 'CHN',
  Suède: 'SEK',
  'Pays-Bas': 'EUR',
  Irlande: 'EUR',
}

/** Pays pour lesquels `IndexGlyph` rendra bien quelque chose — même usage que
    `COMMODITY_DRAWN`, et même motif. */
export const INDEX_FLAGGED: ReadonlySet<string> = new Set(Object.keys(COUNTRY_TO_FLAG))
