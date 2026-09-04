import { ZenkuuWordmark } from '@/components/BrandMark'
import { Link } from '@/i18n/navigation'

import { FOOTER_COLUMNS, SOCIAL_LINKS } from '@/content/footer'
import { getContent, getPhrase } from '@/lib/content'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * PIED DE PAGE — LA MARQUE À GAUCHE, L'ANNUAIRE EN COLONNES À DROITE
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── D'OÙ VIENT CETTE FORME ──────────────────────────────────────────────────
 *
 * Elle est reprise du modèle demandé (tokenomist.ai) : un bloc d'identité — marque
 * puis une phrase qui dit ce que le site fait — occupant la moitié gauche, et
 * QUATRE colonnes de liens serrées à droite, puis une barre légale séparée d'un
 * filet, droits à gauche et mentions à droite.
 *
 * ── CE QU'ELLE REMPLACE, ET POURQUOI LE REPLI PART ──────────────────────────
 *
 * Le pied précédent tenait sur une bande unique dont chaque rubrique cachait ses
 * liens derrière un panneau ouvert au SURVOL. Deux défauts, et le second est le vrai :
 *
 *   · un panneau au survol n'existe pas au doigt — sur téléphone et sur tablette,
 *     l'annuaire entier était donc inatteignable ;
 *   · un pied de page est l'endroit où l'on va CHERCHER une page dont on ne connaît
 *     pas le chemin. Le replier oblige à savoir sous quelle rubrique regarder avant
 *     d'avoir vu la liste — c'est-à-dire à connaître la réponse pour poser la question.
 *
 * Les liens sont donc tous VISIBLES. C'est plus haut, et c'est le prix normal d'un
 * annuaire ; la grille à quatre colonnes le contient sans faire défiler.
 *
 * ── LES GROUPES SONT APLATIS ────────────────────────────────────────────────
 *
 * `content/footer.ts` range ses liens en colonnes de GROUPES titrés — deux niveaux.
 * Le modèle n'en a qu'un : un titre par colonne, puis la liste. Les groupes sont donc
 * fondus, et c'est l'étiquette de la colonne — jusqu'ici réservée à la synthèse
 * vocale — qui devient le titre visible. Aucun lien n'est perdu ni ajouté.
 *
 * ── CE QUI RESTE, ET NE PEUT PAS PARTIR ─────────────────────────────────────
 *
 * L'attribution CoinGecko est EXIGÉE par ses conditions d'utilisation (§4.1.4), dans
 * une police d'au moins 10 px, sur tous les paliers y compris gratuit. L'avertissement
 * « lecture seule » est ce qui tient Zenkuu à distance du conseil en investissement.
 * Le premier vit dans la barre légale, le second sert de phrase d'identité sous la
 * marque — c'est-à-dire à l'endroit le plus lu du bloc, et non enterré en dernière
 * ligne.
 *
 * La pastille d'état dit ce qu'elle SAIT : la date du dernier relevé réellement
 * enregistré, et non un « All Systems Operational » qu'un site sans supervision ne
 * peut pas affirmer.
 */
export async function Footer() {
  const fr = await getContent()
  const t = await getPhrase()

  return (
    /* ── LE PIED NE SE DÉTACHE PAS DU FOND ────────────────────────────────
       Il portait `bg-surface` : un pavé plus clair que la page, sur toute la
       largeur, à la fin de chaque écran. Relevé le 2026-08-30 sur la référence :
       son `<footer>` n'a AUCUN fond propre — la couleur qu'on y voit est celle du
       `<body>`, `rgb(13, 18, 23)`, c'est-à-dire le canevas. Ce qui sépare le pied
       du contenu chez elle est le seul filet, pas un changement de teinte.

       `border-t-[1.25px]` reprend la valeur mesurée sur ce filet, comme le panneau
       droit — c'est l'épaisseur qu'elle emploie partout où elle trace un trait. */
    <footer className="mt-16 border-t-[1.25px] border-border-subtle">
      {/* ── LE CORPS ─────────────────────────────────────────────────────────
          L'ANNUAIRE PASSE À GAUCHE ET L'IDENTITÉ À DROITE, à la manière du bloc
          « Footer With Big Text » repris ici : les colonnes de liens ouvrent le pied,
          et le pavé de marque le referme juste au-dessus du grand mot.

          `lg:flex-row` et non une grille commune : les deux blocs n'ont pas de largeur
          partagée — l'identité est un pavé de texte, l'annuaire une grille — et sous
          `lg` ils doivent s'empiler dans l'ordre du document. */}
      {/* ══════════════════════════════════════════════════════════════════════
          UNE SEULE GRILLE À CINQ COLONNES — L'IDENTITÉ EN EST LA PREMIÈRE

          ── CE QUE CELA REMPLACE ────────────────────────────────────────────

          Deux blocs côte à côte en `flex` : l'annuaire à gauche, un pavé d'identité à
          droite. Sa note disait « les deux blocs n'ont pas de largeur partagée », et
          c'était vrai — mais c'était aussi le défaut. Les colonnes de liens se
          partageaient l'espace restant après le pavé, donc leur largeur dépendait de la
          longueur d'un texte qui n'a rien à voir avec elles.

          ── LA MESURE ───────────────────────────────────────────────────────

          Relevé au navigateur sur openrouter.ai le 2026-09-02 : leur pied est UNE grille
          de cinq pistes égales de 230,4 px, `gap: 32px`. La première porte le logo et le
          copyright ; les quatre autres, les liens. Chaque colonne est un `flex` vertical
          à `gap: 12px`, et l'écart mesuré entre deux liens — 34,7 px — se retrouve
          exactement : 22,75 px d'interligne plus 12 de gouttière.

          `grid-cols-5` reproduit donc la géométrie, et l'identité cesse d'être un pavé
          à part pour devenir une colonne comme les autres.

          Sous `sm` : deux colonnes, l'identité prenant les deux — un logo à moitié de
          largeur d'écran ne se lit pas mieux qu'un logo entier.
          ══════════════════════════════════════════════════════════════════════ */}
      {/* SEPT pistes sous `xl` : l'identité, puis les six colonnes de Backpack. Sous
          `lg`, trois colonnes ; sous `sm`, deux — un annuaire de six colonnes sur un
          téléphone donne des libellés coupés en trois lignes. */}
      <div className="shell grid grid-cols-2 gap-8 py-12 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
        {/* ── L'IDENTITÉ, PREMIÈRE COLONNE ───────────────────────────────

            Le logo, et RIEN D'AUTRE. Elle portait aussi la mention de non-conseil et
            les icônes sociales ; les deux sont descendues dans la barre inférieure,
            où la référence les met — et où elles ont plus de sens : le haut du pied
            sert à atteindre une page, le bas à savoir qui parle.

            Cette colonne cesse donc d'être un pavé de texte à côté d'un annuaire, et
            redevient ce qu'elle est : une signature.

            `col-span-2` sous `sm` : un logo à moitié de largeur d'écran ne se lit pas
            mieux qu'un logo entier. */}
        <div className="col-span-2 sm:col-span-3 lg:col-span-4 xl:col-span-1">
          <ZenkuuWordmark className="h-5 w-auto text-ink" />
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            LES QUATRE COLONNES DE LIENS

            ── LA HIÉRARCHIE TIENT EN UNE OPACITÉ ──────────────────────────

            Mesuré chez la référence : le TITRE de colonne est à l'encre pleine
            (`rgb(252, 252, 254)`), les LIENS à la même encre mais à 62,7 %. Pas deux
            couleurs — une couleur et sa dilution. C'est ce qui fait qu'on lit d'abord
            les quatre titres, puis la colonne choisie, au lieu de lire trente liens.

            `text-ink` / `text-ink-muted` portent exactement ce rapport dans les deux
            thèmes du site, et le portaient déjà : l'ancien pied les avait juste posés à
            l'envers — titres en `ink-muted`, liens en `ink` —, ce qui donnait quatre
            en-têtes plus pâles que leur contenu.

            ── LES AUTRES MESURES ──────────────────────────────────────────

            Taille 14 px des deux côtés (`text-sm`), graisse 500 sur le titre, 450 sur
            les liens — ramenée à `font-normal` ici, 450 n'ayant pas de cran dans
            l'échelle du projet et la fonte du site n'étant pas variable.

            `gap-3` = 12 px, la gouttière relevée dans leurs colonnes.

            ⚠️ LEUR TRANSITION EST DÉJÀ LA NÔTRE. `color 0.15s cubic-bezier(0.4, 0, 0.2,
            1)` mesuré sur leurs liens, c'est `--duration-state` et `--ease-standard` au
            centième près — la même valeur qu'ASXN, relevée la veille. Le filet de
            sécurité de `globals.css` la pose déjà sur tout `<a>` : rien à écrire ici.
            ══════════════════════════════════════════════════════════════════ */}
        {/* ══════════════════════════════════════════════════════════════════
            LE TITRE ET LES LIENS ONT LA MÊME TAILLE ET LA MÊME GRAISSE

            Mesuré chez Backpack le 2026-09-02, et c'est le relevé qui m'a surpris :
            titre 12 px graisse 400 en encre pleine, lien 12 px graisse 400 en gris.
            SEULE LA COULEUR les distingue.

            Mon réflexe — et l'état précédent de ce fichier — mettait le titre en
            demi-gras et une taille au-dessus. C'est le choix par défaut, et il est
            plus lourd qu'il n'y paraît : six titres en demi-gras dans un pied de page
            forment six ancres visuelles qui se disputent l'attention avec le contenu
            au-dessus.

            L'encre pleine suffit à dire « ceci est un titre ». Le pied redevient ce
            qu'il doit être — un annuaire qu'on consulte, pas une section qu'on lit.
            ══════════════════════════════════════════════════════════════════ */}
        {FOOTER_COLUMNS.map((column) => (
          <nav key={column.label} aria-label={t(column.label)} className="flex flex-col gap-2.5">
            {/* `<h2>` malgré l'apparence discrète : la synthèse vocale s'en sert pour
                sauter d'une colonne à l'autre, et un texte en encre pleine n'est pas
                une structure. La graisse n'a jamais fait le titre — la balise si. */}
            <h2 className="text-xs font-normal text-ink">{t(column.label)}</h2>

            {/* `gap-2.5` = 10 px, l'écart mesuré entre deux de leurs liens. */}
            <ul className="flex flex-col gap-2.5">
              {column.links.map((link) => (
                /* La clé passe du `href` au libellé : un `href` n'est plus forcément
                   une chaîne — une route à paramètre s'écrit en objet — et les
                   libellés sont uniques dans une colonne. */
                <li key={link.label}>
                  {/* Le branchement suit l'union de `FooterLink` : c'est lui qui
                      rétrécit `href`, et c'est pourquoi une URL absolue ne peut plus
                      atterrir dans un `<Link>`. */}
                  {link.external ? (
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-ink-muted hover:text-ink"
                    >
                      {t(link.label)}
                    </a>
                  ) : (
                    <Link href={link.href} className="text-xs text-ink-muted hover:text-ink">
                      {t(link.label)}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          LA BARRE INFÉRIEURE — COPYRIGHT À GAUCHE, RÉSEAUX À DROITE

          Relevé chez Backpack le 2026-09-02 : « Backpack Exchange © 2026 » en 12 px
          encre pleine, les liens légaux à sa suite, la mention légale sur une seconde
          ligne en gris, et les icônes sociales à l'opposé.

          ── CE QUI N'Y FIGURE PAS, ET POURQUOI ─────────────────────────────

          ⚠️ PAS DE LIENS « MENTIONS LÉGALES » NI « CONFIDENTIALITÉ ». Le brief les
          demande, la référence en porte deux — mais ces pages N'EXISTENT PAS dans
          `app/[locale]/`, vérifié route par route. Les écrire produirait deux liens
          morts dans le bloc le plus visité du site, et un 404 depuis le pied de page
          est le pire endroit où en avoir un : c'est là qu'on va quand on cherche
          justement les conditions.

          Le jour où ces pages existent, elles se posent ici en trois lignes.

          ── LES ICÔNES DESCENDENT DE LA COLONNE D'IDENTITÉ ─────────────────

          Elles vivaient sous le logo. La référence les met ici, et c'est mieux : le
          haut du pied sert à ATTEINDRE une page, le bas à savoir qui parle. Un compte
          social ne mène pas à une page du site — il n'a rien à faire dans l'annuaire.
          ══════════════════════════════════════════════════════════════════════ */}
      <div className="border-t border-border-subtle">
        <div className="shell flex flex-col gap-4 py-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs text-ink">
              {t('ZENKUU © {annee}').replace('{annee}', String(new Date().getFullYear()))}
            </p>
            {/* La mention de non-conseil descend ici avec le copyright : les deux
                disent qui parle et à quel titre, elles se lisent ensemble. */}
            <p className="mt-2 max-w-2xl text-xs leading-relaxed text-ink-muted">
              {fr.footer.disclaimer}
            </p>
          </div>

          {/* La rangée disparaît entièrement si aucun compte n'est ouvert : on
              n'affiche pas d'icône vers un réseau où le site n'existe pas. */}
          {SOCIAL_LINKS.length > 0 ? (
            <ul className="flex shrink-0 items-center gap-2">
              {SOCIAL_LINKS.map((link) => {
                const Glyph = link.icon

                return (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      /* Le PSEUDO accompagne le nom du réseau : « Instagram —
                         @getzenkuu ». On sait alors vers quel compte on part avant de
                         cliquer, ce qu'un simple « Instagram » ne dit pas. */
                      aria-label={`${t(link.label)} — ${link.handle}`}
                      title={`${t(link.label)} · ${link.handle}`}
                      className="flex size-9 items-center justify-center rounded-control border border-border-subtle text-ink-muted transition-colors duration-150 hover:border-brand hover:text-brand"
                    >
                      <Glyph className="h-4 w-4" />
                    </a>
                  </li>
                )
              })}
            </ul>
          ) : null}
        </div>
      </div>

    </footer>
  )
}
