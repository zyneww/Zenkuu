/**
 * GROUPE DU RAIL — un titre, des lignes, et PLUS DE CARTE.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * TROISIÈME ÉTAT DE CE COMPOSANT, ET LES DEUX NOTES PRÉCÉDENTES AVAIENT RAISON
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Il a porté une carte, l'a perdue, l'a reprise, et la reperd. Ce n'est pas une
 * hésitation : à chaque fois la RÉFÉRENCE avait changé, et chacune des deux notes
 * disait vrai de la sienne.
 *
 *   · sans carte  — la référence était CoinGecko, dont la colonne est plate ;
 *   · avec carte  — la référence était Tokenomist, dont la colonne est en cartes ;
 *   · sans carte  — la référence redevient CoinGecko, sur demande explicite.
 *
 * ── CE QUE LA RÉFÉRENCE MET RÉELLEMENT ICI ───────────────────────────────────
 *
 * Relevé au navigateur sur `coingecko.com/en/coins/hyperliquid` le 2026-09-06, en
 * remontant les ancêtres du libellé « Market Cap » :
 *
 *     <div class="grid grid-cols-1 divide-y divide-gray-200">   ← le filet ENTRE
 *       <div class="flex justify-between py-3">                 ← 12 px haut et bas
 *         <span class="text-gray-500 font-medium">Market Cap</span>
 *         <span>$67.007B</span>
 *
 * Aucun fond, aucun bord, aucun rayon, aucune ombre. Le seul trait de toute la
 * colonne est le `divide-y` entre deux lignes, à `#eff2f5`.
 *
 * ── L'ARGUMENT DE COÛT DE LA PREMIÈRE NOTE, QUI RESSORT INTACT ───────────────
 *
 * Elle disait : « Une carte prélève 32 pixels de marge interne, 2 de bordure et 12
 * d'intervalle. […] Et le bénéfice se payait deux fois : sur 288 pixels, sept
 * bordures verticales dessinent sept fois le même rectangle. L'œil ne les lit plus
 * comme des frontières, il les lit comme une texture. »
 *
 * C'est exactement ce que le retrait rend : la colonne regagne la centaine de
 * pixels que quatre cartes lui prenaient, et la frontière entre deux groupes
 * redevient du BLANC — ce qui est aussi la façon dont la référence sépare son bloc
 * de repères de son bloc « Info ».
 *
 * ⚠️ LE TITRE RESTE, ALORS QUE LA RÉFÉRENCE N'EN A PAS SUR SES REPÈRES. Elle aligne
 * une seule liste de dix lignes ; nous en avons une vingtaine réparties en quatre
 * groupes (fondamentaux, amplitude, variations, offre), et une liste de vingt lignes
 * sans intertitre n'est plus lisible. Elle en pose d'ailleurs un — « Info » — dès
 * qu'un second bloc commence dans cette colonne : c'est le même motif, appliqué une
 * fois de plus.
 */

export function RailSection({
  title,
  subtitle,
  action,
  children,
}: {
  /** Titre du groupe. Absent, le bloc n'a pas d'en-tête. */
  title?: React.ReactNode
  /** Ligne d'explication sous le titre. */
  subtitle?: React.ReactNode
  /** Lien ou bouton aligné à droite du titre — « Tout voir », « Explorer ». */
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    /* Aucune classe de surface : ni fond, ni bord, ni rayon, ni rembourrage. La
       section n'existe plus que comme regroupement sémantique et comme porteuse de
       son titre. `mb-5` — 20 px, l'écart que la référence met entre deux blocs de sa
       colonne (`tw-mb-5` relevé sur le conteneur des repères). */
    <section className="mb-5 last:mb-0">
      {title !== undefined ? (
        <div className="mb-2 flex items-baseline justify-between gap-2">
          {/*
            Le titre est PLUS PETIT que les valeurs qu'il coiffe, et c'est délibéré.
            Il portait 14 pixels et une graisse forte : il devenait
            l'élément le plus visible du bloc, alors qu'il n'est qu'une étiquette de
            rangement — personne ne vient lire le mot « Fondamentaux ». Ce sont les
            chiffres qu'on vient lire, et ils doivent gagner. La référence range son
            titre de section au même endroit : 12 px, graisse 600, encre atténuée,
            sous des valeurs de 13.

            ⚠️ NI CAPITALES NI INTERLETTRAGE, ET C'EST UN RELEVÉ QUI TRANCHE.
            Ce titre portait `uppercase tracking-wide` — mesuré à 11 px, +0,275 px
            d'interlettrage, tout en capitales. Relevé le 2026-09-04 sur la fiche
            Bitcoin de CoinGecko : « Bitcoin Price Chart (BTC) » sort en 12/16/600,
            `letter-spacing: normal`, `text-transform: none`. Aucun texte de sa page
            n'est en capitales forcées, et aucun ne porte d'interlettrage.

            Le petit intertitre en capitales espacées est la signature la plus
            reconnaissable d'une interface engendrée par défaut ; elle n'est pas dans
            la référence, et l'arbitrage retenu pour ce chantier est que la référence
            l'emporte.

            ⚠️ ET LE CRAN DE DOUZE EXISTE — j'avais écrit ici qu'il manquait, et qu'il
            fallait donc s'en tenir aux onze pixels de `--text-micro`. C'est
            `--v2-text-2xs` (12 px, interligne 16), posé par le sous-projet A des jetons
            relevés chez la référence, et déjà consommé par les en-têtes de tableau et
            les cartes de statistiques. `--text-micro` vaut 11, `--text-xs` vaut 13 :
            c'est en ne regardant que l'ANCIENNE échelle qu'on ne trouve rien entre les
            deux, et c'est l'erreur que faisait cette note.

            Le titre tombe donc exactement sur la valeur relevée, sans rien déplacer.
          */}
          <h2 className="text-[length:var(--v2-text-2xs)] font-semibold leading-4 text-ink-muted">
            {title}
          </h2>
          {action !== undefined ? <div className="shrink-0">{action}</div> : null}
        </div>
      ) : null}

      {subtitle !== undefined ? (
        <p className="mb-1.5 text-micro leading-snug text-ink-muted">{subtitle}</p>
      ) : null}

      {children}
    </section>
  )
}
