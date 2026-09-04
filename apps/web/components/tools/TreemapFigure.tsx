import type { Formatters } from '@zenkuu/ui'


import {
  TILE_INK,
  BACKPACK_CLAMP,
  backpackTone,
  squarify,
  volatilityScaleSwatches,
  volatilityTone,
} from '@/components/tools/treemap'
import { Link, type AppHref } from '@/i18n/navigation'

/**
 * Cette figure ne connaît qu'un seul fond — celui de `heatTone`, toujours saturé — et
 * son encre est donc constante. Elle l'importe malgré tout de `treemap.ts` : c'est là
 * que vivent les mesures de contraste, et deux figures qui écrivent leurs couleurs en
 * dur chacune de son côté est exactement ce qui a laissé passer une valeur à 3,82:1.
 */
const INK = TILE_INK

/**
 * LA FIGURE, sans les commandes qui la pilotent.
 *
 * ── CE QUE CE COMPOSANT SÉPARE ────────────────────────────────────────────────
 *
 * `treemap.ts` calcule la GÉOMÉTRIE, ce fichier dessine les TUILES, et les appelants
 * apportent les COMMANDES. Trois couches parce qu'il y a désormais trois figures — le
 * marché, les trésoreries, les collections NFT — dont seule la première a besoin
 * d'être interactive.
 *
 * Cette séparation-là n'est pas gratuite : elle garde les deux autres figures en
 * composants SERVEUR. Une carte thermique sans sélecteur n'a aucune raison de
 * descendre du JavaScript au navigateur, et le pavage étant calculé au rendu, elle
 * s'affiche avant même l'hydratation.
 *
 * ── PAS DE `'use client'` ─────────────────────────────────────────────────────
 *
 * Ni état ni effet : le composant est compilé dans le paquet client quand un appelant
 * client l'utilise, et reste sur le serveur quand un appelant serveur l'utilise. Poser
 * la directive lui interdirait la seconde moitié.
 */

export interface TreemapTile {
  id: string
  /** Étiquette courte, affichée dans la tuile. Un symbole vaut mieux qu'un nom. */
  label: string
  /** Surface. Doit être positive — une tuile de valeur nulle n'a pas de place. */
  value: number
  /** Teinte. Absente, la tuile reste neutre : une lacune n'est pas une stabilité. */
  change?: number
  /**
   * Destination INTERNE du clic. Absente, la tuile n'est pas cliquable — sauf si
   * `externalHref` est présent.
   */
  href?: AppHref
  /**
   * Destination SORTANTE, quand la tuile mène hors du site (le site officiel d'une
   * collection NFT, par exemple).
   *
   * ── POURQUOI UN SECOND CHAMP PLUTÔT QUE `href.startsWith('http')` ──────────
   *
   * C'est ce que faisait la figure : un seul champ, et un test sur ses premières
   * lettres pour décider entre `<a>` et `<Link>`. Le test marchait, mais il déduisait
   * une INTENTION d'une orthographe — et depuis que les adresses internes s'écrivent
   * aussi en objet, il n'y a plus de premières lettres à tester.
   *
   * Deux champs disent la même chose sans rien deviner, et le type interdit d'envoyer
   * une URL absolue dans un `<Link>`.
   */
  externalHref?: string
  /** Nom complet, pour l'infobulle et les lecteurs d'écran. */
  title?: string
  /**
   * Complément d'infobulle, ajouté après la valeur et la variation.
   *
   * La légende de base dit ce que la figure PORTE — le nom, la surface, la teinte.
   * Elle ne dit pas ce qui n'est pas dessiné, et qu'on veut pourtant en survolant une
   * tuile : le cours du moment. C'est ce que ce champ transporte, sous forme déjà
   * rédigée par l'appelant — lui seul sait dans quelle devise il compte, et cette
   * figure n'a pas à apprendre à formater une monnaie pour l'occasion.
   */
  detail?: string
  /**
   * Logo de l'actif, affiché dans les tuiles ASSEZ GRANDES pour l'accueillir.
   *
   * Il ne remplace pas l'étiquette, il la précède : un logo seul n'identifie que ce
   * qu'on reconnaît déjà, et une carte thermique sert justement à repérer ce qu'on ne
   * cherchait pas. Sur les petites tuiles il disparaît — seize pixels d'image sur une
   * tuile de trente en largeur ne laisseraient plus la place au symbole.
   */
  image?: string
}

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * ANATOMIE D'UNE TUILE — jointive, centrée, sans arrondi
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Trois changements, tous relevés sur la carte de CoinGecko :
 *
 *   · PAS DE GOUTTIÈRE. Les tuiles portaient `border-2 border-surface`, une bordure de
 *     la couleur du fond qui tenait lieu d'espacement. Le procédé était défendable,
 *     mais la référence n'en a pas : ses rectangles se touchent, et c'est ce qui donne
 *     à la carte son aspect de pavage plein plutôt que de mosaïque. Sur les tuiles les
 *     plus petites, quatre pixels de bordure mangeaient d'ailleurs la moitié de la
 *     surface.
 *
 *   · PAS D'ARRONDI. `rounded-[4px]` sur une tuile de dix pixels de côté n'arrondit
 *     rien, il grignote. La référence pave en rectangles francs.
 *
 *   · TEXTE CENTRÉ, plus ancré en bas. Chez la référence, « BTC » et sa variation sont
 *     au centre de leur tuile — ce qui est la seule position qui reste correcte quand la
 *     police varie de sept à cinquante-six pixels. Ancré en bas, un grand texte se
 *     collait au bord inférieur et laissait un vide en haut.
 *
 * `overflow-hidden` reste indispensable : sans lui, une étiquette trop longue déborde
 * sur les tuiles voisines et rend la carte illisible aux petites tailles.
 */
/*
 * `heat-tile` fait de chaque tuile un CONTENEUR DE REQUÊTE — c'est ce qui permet à
 * son texte de se dimensionner sur sa taille réelle en pixels plutôt que sur des
 * pourcentages de deux axes différents (voir la note sur `cqmin` plus bas, et
 * `globals.css` pour les règles).
 */
/*
 * ══════════════════════════════════════════════════════════════════════════════
 * ⚠️ LE PAVAGE CHANGE DE RÉFÉRENCE : BACKPACK, ET NON PLUS COINGECKO
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * La note ci-dessus décrit le pavage de CoinGecko — tuiles JOINTIVES, sans arrondi.
 * Elle reste vraie de CoinGecko. Elle n'est plus ce que cette figure dessine.
 *
 * Backpack, relevé le 2026-09-02 : rayon 5 px et 4 px d'écart entre voisines. Le fond
 * de la carte passe donc entre les tuiles, et chacune se lit comme un objet posé
 * plutôt que comme une case d'un damier.
 *
 * ── L'ÉCART SE FAIT PAR UNE BORDURE, ET C'EST LE SEUL MOYEN ICI ────────────
 *
 * Chez eux, les tuiles sont placées en PIXELS et l'écart est soustrait du calcul :
 * `left: 8px; width: 325.702px`. Les nôtres sont placées en POURCENTAGE, et on ne peut
 * pas retrancher quatre pixels d'un pourcentage.
 *
 * `border-2 border-transparent` avec `bg-clip-padding` résout cela sans toucher au
 * pavage : le fond s'arrête au bord intérieur, la bordure laisse voir le conteneur, et
 * deux voisines montrent donc 2 + 2 = 4 px de fond entre elles. Exactement leur écart,
 * obtenu par une propriété au lieu d'un moteur de placement réécrit.
 *
 * ⚠️ CE PROCÉDÉ A UNE LIMITE, ET ELLE EST CONNUE. Quatre pixels pris sur une tuile de
 * dix, c'est 40 % de sa surface — le reproche exact que la note du dessus adressait aux
 * bordures. Il ne s'applique pas ici parce que la carte plafonne à cent tuiles, ce qui
 * laisse aux plus petites une trentaine de pixels. Au-delà, il faudrait repasser au
 * placement en pixels.
 */
const TILE_CLASS =
  'heat-tile absolute flex flex-col items-center justify-center overflow-hidden rounded-[5px] border-[2px] border-transparent bg-clip-padding px-1 text-center'

export function TreemapFigure({
  tiles,
  periodLabel,
  nombres,
  height = 'min(70vh, 560px)',
  valueUnit = '',
  tone = 'change',
}: {
  tiles: TreemapTile[]
  /**
   * Formateurs de la langue rendue.
   *
   * ⚠️ EN PROPRIÉTÉ ET NON PAR UN CROCHET, pour la raison exacte que porte déjà
   * `TreemapLegend` plus bas : cette figure est rendue depuis `MarketHeatmap` (client)
   * ET depuis `TreasuryOverview` et `NftOverview` (serveur). Un crochet client
   * échouerait dans les seconds, un `await` dans le premier — la propriété est la seule
   * forme qui traverse les deux mondes.
   */
  nombres: Formatters
  /** Fenêtre décrite par la couleur, reprise dans l'infobulle. */
  periodLabel: string
  height?: string
  /** Suffixe des montants dans l'infobulle, ex. « $ ». */
  valueUnit?: string
  /**
   * ÉCHELLE DE COULEUR, et il y en a deux parce qu'il y a deux natures de grandeur.
   *
   * `change` — le défaut — est SIGNÉE : vert quand ça monte, rouge quand ça
   * descend, gris quand rien n'est publié.
   *
   * `volatility` est une INTENSITÉ : une dispersion n'a pas de sens de variation, et
   * la peindre en vert ferait lire « tout le marché monte » là où la figure dit
   * « tout le marché bouge ». Voir `volatilityTone`, qui porte le raisonnement
   * complet et la raison pour laquelle son échelle est relative au lot affiché.
   */
  tone?: 'change' | 'volatility'
}) {
  const usable = tiles.filter((tile) => tile.value > 0)
  const boxes = squarify(usable.map((tile) => ({ id: tile.id, value: tile.value })))
  if (boxes.length === 0) return null

  const byId = new Map(usable.map((tile) => [tile.id, tile]))

  /* Dénominateur des parts. Calculé sur les tuiles RETENUES, donc sur ce que la figure
     montre réellement — un appelant qui n'en passe que soixante sur deux cents ne doit
     pas afficher des parts rapportées à un total invisible. */

  /*
   * LA LIGNE DE VARIATION EXISTE OU N'EXISTE PAS POUR TOUTE LA FIGURE.
   *
   * Elle affichait un tiret dès qu'une tuile n'avait pas de variation. C'est le bon
   * comportement sur la carte du marché, où le tiret DISTINGUE une fenêtre non publiée
   * de ses voisines chiffrées ; c'en est un mauvais sur la carte des trésoreries, où
   * AUCUNE tuile n'a de variation et où deux cents tirets alignés annoncent une colonne
   * vide plutôt qu'une dimension absente.
   *
   * La distinction se déduit donc de la figure entière plutôt que de se déclarer : si
   * pas une seule tuile ne porte de variation, la ligne disparaît. Un appelant ne peut
   * pas se tromper sur un réglage qu'il n'a pas à faire.
   */
  const hasChange = usable.some((tile) => tile.change !== undefined)

  /* Haut de la rampe d'intensité — le plus agité du lot AFFICHÉ, pas d'un maximum
     théorique. Voir `volatilityTone` : c'est ce qui empêche la carte entière de tomber
     dans le premier palier quand les volatilités du jour sont toutes basses. */
  const peak =
    tone === 'volatility'
      ? usable.reduce((max, tile) => Math.max(max, tile.change ?? 0), 0)
      : 0

  return (
    /* Hauteur fixe en pixels, positions en pourcentages : la figure s'adapte en largeur
       sans que rien ne soit recalculé, et reste lisible en hauteur.

       Le CADRE garde son arrondi et sa bordure — c'est un bloc de la page. Ce sont les
       TUILES qui les perdent, voir `TILE_CLASS`. */
    <div
      /* ── LE FOND DE LA CARTE EST SOMBRE DANS LES DEUX THÈMES ──────────────

         Il l'est parce que les TUILES le sont : leur rampe ne bascule pas avec le
         thème, puisque leur encre est blanche des deux côtés. Un conteneur clair
         montrerait donc quatre pixels de blanc entre des tuiles sombres — un
         quadrillage, là où l'écart doit se lire comme du fond.

         `#14151b`, mesuré chez eux, et leur rayon de 12 px. */
      className="relative w-full overflow-hidden rounded-[12px] border border-border-subtle bg-[#14151b] p-2"
      style={{ height }}
    >
      {boxes.map((box) => {
        const tile = byId.get(box.id)
        if (!tile) return null

        const caption = `${tile.title ?? tile.label} — ${nombres.compact(tile.value)}${valueUnit}${
          tile.change !== undefined
            ? `, ${nombres.percent(tile.change)} sur ${periodLabel}`
            : ''
        }${tile.detail ? `, ${tile.detail}` : ''}`

        const style = {
          left: `${box.x}%`,
          top: `${box.y}%`,
          width: `${box.width}%`,
          height: `${box.height}%`,
          /* `backpackTone` et non `heatTone` : rampe CONTINUE bornée à ±3 %, sombre et
             désaturée. La différence et ses trois raisons sont dans sa note. */
          backgroundColor:
            tone === 'volatility' ? volatilityTone(tile.change, peak) : backpackTone(tile.change),
        }


        /*
          ══════════════════════════════════════════════════════════════════════
          LA TYPOGRAPHIE SUIT L'AIRE DE LA TUILE — c'est la signature de CoinGecko
          ══════════════════════════════════════════════════════════════════════

          Toutes les étiquettes faisaient 11 pixels, quelle que soit la tuile. Sur la
          référence, « BTC » remplit sa tuile de bord à bord tandis que les jetons du
          coin portent des caractères de six pixels — et cette hiérarchie EST
          l'information : on voit le poids du marché avant d'avoir lu un chiffre.

          ══════════════════════════════════════════════════════════════════════
          ⚠️ ELLE SE CALCULE EN CSS, ET PAS ICI — LE POURQUOI EST UN BUG RÉEL
          ══════════════════════════════════════════════════════════════════════

          Elle se calculait en JavaScript : `sqrt(box.width * box.height) * 0.42`.

          C'était FAUX, et le défaut a survécu longtemps parce qu'un plancher le
          masquait. `box.width` et `box.height` sont des POURCENTAGES — le pavage pose
          ses tuiles en pourcentages de la boîte, c'est ce qui lui permet de s'adapter
          en largeur sans rien recalculer. Or 1 % de largeur et 1 % de hauteur ne
          mesurent pas la même longueur : sur un cadre de 1 448 × 632, le premier vaut
          14,5 px et le second 6,3. La moyenne géométrique de deux unités différentes
          ne décrit aucune grandeur.

          Conséquence relevée au navigateur : une tuile de 182 × 157 PIXELS — largement
          de quoi porter son nom — recevait un calibrage de 7,4, sous le seuil
          d'affichage. La carte se retrouvait muette partout sauf sur ses trois plus
          grandes tuiles.

          `cqmin` règle la question à la racine : chaque tuile devient un CONTENEUR, et
          l'unité vaut un centième de sa plus petite dimension RÉELLE, en pixels. Le
          navigateur la résout à la peinture, donc après le calcul de la mise en page —
          ce qu'aucun calcul au rendu ne peut faire.

          Le douzième (`8.5cqmin`) et la borne à 56 px sont réglés pour que la plus
          grande tuile n'excède pas une hauteur de titre. La plus PETITE dimension est
          le bon repère : un rectangle très plat ne peut pas porter un texte plus haut
          que lui.

          ── SOUS ONZE PIXELS, ON N'ÉCRIT PLUS RIEN ──────────────────────────

          Le plancher de lisibilité du projet. En dessous, un chiffre de marché n'est
          plus lisible : il reste du bruit qui salit la tuile sans rien apprendre. La
          règle est portée par une requête de conteneur dans `globals.css`, seule à
          connaître la taille réelle. La couleur et l'infobulle continuent de porter
          l'information — c'est aussi ce que font les cartes thermiques de référence,
          dont les plus petites tuiles sont muettes.
        */

        /*
          ── L'ICÔNE NE PARAÎT QUE SI ELLE TIENT VRAIMENT ────────────────────
          
          Le seuil porte sur la taille d'étiquette calculée, donc sur l'aire réelle de
          la tuile : à 16 pixels de police, la tuile fait au moins 38 × 38 et une
          vignette de 20 px y laisse encore la place au symbole. En dessous, l'icône
          chasserait le texte — et un logo sans nom n'identifie que ce qu'on reconnaît
          déjà, alors qu'une carte thermique sert à repérer ce qu'on ne cherchait pas.

          Servie en `<img>` brut et non par l'optimiseur : ces vignettes viennent de
          domaines d'éditeurs NFT non déclarés dans `next.config.ts`, et l'optimiseur
          lèverait au rendu. `onError` n'est pas nécessaire — une image absente laisse
          simplement l'étiquette, qui suffit.

          ⚠️ SA TAILLE AUSSI EST EN `cqmin`, et son affichage est décidé par la même
          requête de conteneur que le texte — voir `globals.css`. La calculer ici
          retomberait dans le défaut d'unités décrit plus haut.
        */
        const body = (
          <>
            {tile.image !== undefined ? (
              // eslint-disable-next-line @next/next/no-img-element -- domaines d'éditeurs non déclarés
              <img
                src={tile.image}
                alt=""
                className="tile-logo mb-1 shrink-0 rounded-pill object-cover ring-1 ring-white/25"
                loading="lazy"
              />
            ) : null}

            {/* Étiquettes toujours présentes dans le DOM — donc lisibles par un lecteur
                d'écran et par un moteur — mais dimensionnées à la tuile pour ne pas
                déborder sur ses voisines. */}
            <span
              className={`tile-label block max-w-full truncate font-semibold leading-none ${INK.label}`}
            >
              {tile.label}
            </span>
            {/*
              MONTANT, PART ET VARIATION SUR UNE SEULE LIGNE — l'anatomie de la
              référence, relevée au navigateur.

              Ils occupaient jusqu'ici deux lignes distinctes, chacune avec son propre
              seuil d'affichage : une tuile moyenne montrait donc sa variation sans son
              montant, ou l'inverse selon ses proportions. Réunis, ils partagent un seul
              seuil et se lisent d'un trait — « 158 Md $ (8,5 %) · +0,08 % ».

              La PART est ce qui manquait le plus : un montant seul ne se situe pas,
              « 439 Md $ » ne dit pas si c'est beaucoup. Elle est omise sous 0,1 %, où
              elle n'apprendrait rien et allongerait la ligne pour rien.

              Le SEUIL est celui de la requête de conteneur : cette ligne demande plus
              de place que le nom seul, et n'apparaît donc qu'au-dessus d'une tuile plus
              grande — voir `globals.css`.
            */}
            {/*
              ══════════════════════════════════════════════════════════════════
              ⚠️ LA VARIATION SEULE — LE MONTANT ET LA PART SONT RETIRÉS
              ══════════════════════════════════════════════════════════════════

              Cette ligne portait « 158 Md € (7,0 %) · −1,28 % », et la note ci-dessus
              défendait chacun des trois : le montant situe, la part le situe encore
              mieux, la variation colore.

              Backpack n'affiche que le ticker et la variation. C'est ce que la capture
              de référence montre, et c'est ce que cette figure dessine désormais.

              ── ET CE N'EST PAS QU'UNE QUESTION DE FIDÉLITÉ ──────────────────

              Le montant et la part sont déjà dans la figure : c'est L'AIRE de la tuile
              qui les porte, et c'est toute la raison d'être d'un pavage proportionnel.
              Les réécrire en chiffres au centre de chaque tuile, c'est dire deux fois
              la même chose — une fois par la géométrie, une fois par le texte — et
              allonger la ligne au point qu'elle se tronque sur les tuiles moyennes.

              La variation, elle, n'est PAS dans la géométrie : elle est dans la
              couleur, qu'un œil lit en gros mais pas au dixième près. Elle est donc la
              seule des trois que le texte apporte vraiment.

              ⚠️ LES CHIFFRES NE SONT PAS PERDUS POUR AUTANT : ils restent dans le
              `title` de la tuile — voir `caption` plus haut — donc au survol et pour
              les lecteurs d'écran. C'est l'affichage permanent qui disparaît, pas la
              donnée.
            */}
            {hasChange && tile.change !== undefined ? (
              <span className={`tile-value tabular block truncate leading-tight ${INK.value}`}>
                {nombres.percent(tile.change)}
              </span>
            ) : null}
          </>
        )

        /*
          ══════════════════════════════════════════════════════════════════════
          TROIS RENDUS POSSIBLES, ET LE CHOIX N'EST PAS COSMÉTIQUE
          ══════════════════════════════════════════════════════════════════════

          · SANS destination → une `div`. Un lien qui ne mène nulle part reste
            atteignable au clavier et ne fait rien : c'est la définition d'un piège de
            tabulation utile à personne.

          · destination INTERNE → le `Link` de next-intl, qui préfixe la locale
            courante (`/fr/crypto/bitcoin`) et précharge la route.

          · destination EXTERNE → une balise `<a>` NUE, et c'est indispensable. Passer
            une URL absolue au `Link` de next-intl lui fait préfixer la locale :
            `https://cryptopunks.app/` deviendrait `/fr/https://cryptopunks.app/`, un
            chemin interne qui répond 404. Le défaut n'existait pas tant qu'aucune tuile
            ne pointait dehors — les collections NFT sont les premières.

            `nofollow` : nous citons une collection, nous ne la recommandons pas — même
            règle que les liens de places de cotation. `noopener noreferrer` ferme
            l'accès à notre fenêtre depuis la page ouverte.
        */
        const tileClass = TILE_CLASS + ' transition-opacity duration-150 hover:opacity-80'

        /* Trois sorties écrites l'une après l'autre plutôt qu'en ternaires imbriqués :
           chaque `return` restreint ce qui reste, si bien que le dernier sait que
           `tile.href` est défini sans qu'on ait à l'affirmer. */
        if (tile.externalHref !== undefined) {
          return (
            <a
              key={box.id}
              href={tile.externalHref}
              target="_blank"
              rel="nofollow noopener noreferrer"
              title={caption}
              className={tileClass}
              style={style}
            >
              {body}
            </a>
          )
        }

        if (tile.href === undefined) {
          return (
            <div key={box.id} title={caption} className={TILE_CLASS} style={style}>
              {body}
            </div>
          )
        }

        return (
          <Link key={box.id} href={tile.href} title={caption} className={tileClass} style={style}>
            {body}
          </Link>
        )
      })}
    </div>
  )
}

/** Échelle de couleurs, à poser à côté de la figure. */
/* ⚠️ LES DEUX LIBELLÉS ARRIVENT EN PROPRIÉTÉS, ET C'EST OBLIGÉ. Cette légende est
   rendue depuis `MarketHeatmap` (client) ET depuis `TreasuryOverview` et
   `NftOverview` (serveur). Un crochet client échouerait dans les seconds, une
   fonction asynchrone dans le premier : la propriété est la seule forme qui traverse
   les deux mondes. */
export function TreemapLegend({
  tone = 'change',
  calmLabel = 'Calme',
  choppyLabel = 'Agité',
  scaleLabel,
}: {
  tone?: 'change' | 'volatility'
  calmLabel?: string
  choppyLabel?: string
  /** Phrase pour lecteurs d'écran, déjà traduite et ses bornes déjà écrites. */
  scaleLabel?: string
} = {}) {
  /* La légende d'INTENSITÉ ne porte pas de bornes chiffrées, et ne peut pas en
     porter : l'échelle est relative au lot affiché (voir `volatilityTone`). Elle
     nomme donc ses deux extrémités en toutes lettres, ce qui est exactement ce
     qu'elle sait dire de vrai. */
  if (tone === 'volatility') {
    return (
      <div className="flex items-center gap-2 text-micro text-ink-muted">
        <span>{calmLabel}</span>
        <span
          className="flex h-2.5 w-32 overflow-hidden rounded-pill border border-border-subtle"
          aria-hidden="true"
        >
          {volatilityScaleSwatches().map((swatch, index) => (
            <span key={index} className="flex-1" style={{ backgroundColor: swatch }} />
          ))}
        </span>
        <span>{choppyLabel}</span>
      </div>
    )
  }

  /*
   * ══════════════════════════════════════════════════════════════════════════
   * ⚠️ LA LÉGENDE REDEVIENT UN RUBAN, ET C'EST SA PROPRE NOTE QUI L'EXIGE
   * ══════════════════════════════════════════════════════════════════════════
   *
   * Sa version précédente était SEGMENTÉE — sept pastilles chiffrées, à la manière de
   * TradingView — et sa raison était explicite : « l'échelle de cette carte procède par
   * PALIERS, un ruban continu promet un dégradé que la figure ne dessine pas ».
   *
   * L'argument était juste, et il se retourne mot pour mot. `backpackTone` est
   * CONTINUE : chaque dixième de pour cent a sa nuance. Ce sont les pastilles qui
   * mentiraient maintenant, en promettant sept teintes là où la figure en dessine mille.
   *
   * Le ruban est donc rendu par le MÊME code que les tuiles — vingt-cinq arrêts pris
   * sur `backpackTone` elle-même, et non un dégradé CSS écrit à la main. Une légende
   * qui recopierait ses couleurs pourrait diverger de la figure sans que rien ne le
   * signale ; celle-ci ne le peut pas.
   *
   * Relevé chez Backpack : bornes à gauche et à droite du ruban, en minuscules.
   */
  const ARRETS = 25
  const ruban = Array.from({ length: ARRETS }, (_, i) => {
    const change = -BACKPACK_CLAMP + (i / (ARRETS - 1)) * BACKPACK_CLAMP * 2
    return backpackTone(change)
  })

  return (
    <div className="flex items-center gap-2 text-micro text-ink-muted">
      <span className="tabular">−{BACKPACK_CLAMP} %</span>
      <span
        aria-hidden="true"
        className="flex h-2 w-28 overflow-hidden rounded-[2px]"
      >
        {ruban.map((teinte, index) => (
          <span key={index} className="flex-1" style={{ backgroundColor: teinte }} />
        ))}
      </span>
      <span className="tabular">+{BACKPACK_CLAMP} %</span>

      <span className="sr-only">
        {scaleLabel ??
          `Échelle de couleur : du rouge à −${BACKPACK_CLAMP} % ou moins, au vert à +${BACKPACK_CLAMP} % ou plus.`}
      </span>
    </div>
  )
}

