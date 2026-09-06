/**
 * GROUPE DU RAIL — un titre, des lignes, et une carte de nouveau.
 *
 * ── LA NOTE QUI SUIT EST CONSERVÉE, ET ELLE A ÉTÉ RENVERSÉE ───────────────────
 *
 * Elle explique pourquoi le rail avait PERDU ses cartes. Son raisonnement est juste
 * et son arithmétique était exacte au jour où elle a été écrite. Ce qui a changé est
 * son point de départ : elle mesurait CoinGecko, dont la colonne latérale est
 * effectivement plate. La référence de ce chantier est Tokenomist, et sa colonne est
 * faite de cartes — relevé le 2026-09-06 : cinq d'entre elles, 480 px de large,
 * rayon 8, rembourrage 16, écart interne 16, fond de panneau.
 *
 * Son argument de coût méritait d'être revérifié plutôt que cru sur parole. Mesuré
 * sur `/fr/crypto/bitcoin` le 2026-09-06, avant tout changement :
 *
 *     rail        424 × 778
 *     graphique   912 × 806
 *
 * Le rail est donc 28 px PLUS COURT que le graphique, et non « deux écrans plus
 * long ». La note décrivait l'état à sept cartes ; il n'y en a plus que trois
 * groupes de métriques et l'offre. Le coût réel du retour aux cartes :
 *
 *     4 blocs × (12 haut + 12 bas + 1 filet)      + 100
 *     intervalle entre groupes ramené de 24 à 8    −  48
 *     ─────────────────────────────────────────────────
 *     net                                          +  52
 *
 * Cinquante-deux pixels sur une colonne qui en a vingt-huit d'avance : le rail
 * dépasse le graphique d'environ vingt-cinq pixels. C'est sans conséquence ici,
 * parce que le rail FLOTTE (voir `AssetLayoutFrame`) et que le contenu reprend la
 * pleine largeur sous lui — c'est précisément pour cela que le flottant a été choisi
 * contre une grille.
 *
 * ⚠️ LE REMBOURRAGE EST 12 ET NON 16, ET C'EST LA SEULE ENTORSE À LA RÉFÉRENCE.
 * Sa colonne fait 480 px, la nôtre 408. Seize de chaque côté y coûtent 6,7 % de la
 * largeur, ici 7,8 %, et surtout 128 px de hauteur au lieu de 96. Douze rend la
 * carte sans le tiers de son coût vertical.
 *
 * ── CE QUE DISAIT LA NOTE D'ORIGINE, MOT POUR MOT ─────────────────────────────
 *
 * « Une carte prélève 32 pixels de marge interne, 2 de bordure et 12 d'intervalle.
 *   Sept cartes, c'est plus de trois cents pixels de hauteur dépensés en
 *   encadrements — dans la colonne la plus étroite de la page, celle dont tout
 *   l'intérêt est de tenir vingt chiffres dans la hauteur du graphique.
 *
 *   Et le bénéfice se payait deux fois : sur 288 pixels, sept bordures verticales
 *   dessinent sept fois le même rectangle. L'œil ne les lit plus comme des
 *   frontières, il les lit comme une texture. »
 *
 * Le second point tient toujours, et c'est lui qui borne ce retour en arrière :
 * QUATRE cartes ne font pas une texture, sept oui. Si le rail devait regagner des
 * groupes, c'est cette limite-là qu'il faudrait rouvrir, pas le rembourrage.
 *
 * ── LE FILET SOUS LE TITRE EST PARTI ──────────────────────────────────────────
 *
 * Il séparait le titre des lignes quand rien d'autre ne le faisait. Le bord de la
 * carte tient désormais ce rôle, et la référence n'en met aucun : son en-tête de
 * carte est une rangée de 24 px, puis le corps, sans trait entre les deux.
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
    <section className="rounded-card border border-border-subtle bg-surface p-3">
      {title !== undefined ? (
        <div className="mb-2 flex items-baseline justify-between gap-2">
          {/*
            Le titre est PLUS PETIT que les valeurs qu'il coiffe, et c'est délibéré.
            Dans une carte, il portait 14 pixels et une graisse forte : il devenait
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
