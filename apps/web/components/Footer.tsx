import { getMarketCapSeriesState } from '@zenkuu/data'

import { ZenkuuWordmark } from '@/components/BrandMark'
import { RelativeTime } from '@/components/home/RelativeTime'
import { Link } from '@/i18n/navigation'

import { DATA_SOURCES, FOOTER_COLUMNS, LEGAL_LINKS, SOCIAL_LINKS } from '@/content/footer'
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
  const year = new Date().getFullYear()

  const series = getMarketCapSeriesState('EUR')
  const lastReading = series.points[series.points.length - 1]?.timestamp

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
      <div className="shell grid grid-cols-2 gap-8 py-12 sm:grid-cols-3 lg:grid-cols-5">
        {/* ── L'IDENTITÉ, PREMIÈRE COLONNE ───────────────────────────────
            Elle OUVRE le pied et ne le referme plus. C'est l'ordre du modèle, et c'est
            aussi l'ordre de lecture : on reconnaît le site avant de chercher une page.

            `col-span-2` sous `sm` : la phrase de non-conseil est du texte courant, et
            une colonne de moitié d'écran la couperait tous les trois mots. */}
        <div className="col-span-2 sm:col-span-3 lg:col-span-1">
          <ZenkuuWordmark className="h-5 w-auto text-ink" />
          <p className="mt-4 text-xs leading-relaxed text-ink-muted">{fr.footer.disclaimer}</p>

          {/*
            LES COMPTES SOCIAUX REDEVIENNENT DES ICÔNES, ET REJOIGNENT LA MARQUE.

            Ils terminaient la dernière colonne de l'annuaire, en liens nommés, au
            motif qu'un nom se lit là où un glyphe se devine. Le modèle repris les
            groupe sous la marque, en rangée d'icônes — et l'argument tombe ici parce
            que le nom reste lisible : il est porté par `aria-label` pour la synthèse
            vocale et par l'infobulle pour l'œil qui hésite.

            La rangée disparaît entièrement si aucun compte n'est ouvert. On
            n'affiche PAS d'icône vers un réseau où le site n'existe pas.
          */}
          {SOCIAL_LINKS.length > 0 ? (
            <ul className="mt-5 flex items-center gap-2">
              {SOCIAL_LINKS.map((link) => {
                const Glyph = link.icon

                return (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
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
        {FOOTER_COLUMNS.map((column) => (
          <nav key={column.label} aria-label={t(column.label)} className="flex flex-col gap-3">
            <h2 className="text-sm font-medium text-ink">{t(column.label)}</h2>

            {/* Les groupes sont fondus — voir l'en-tête. `flatMap` plutôt qu'une double
                boucle : le niveau intermédiaire n'a plus de rendu, et le conserver dans
                le balisage produirait des `<div>` vides. */}
            <ul className="flex flex-col gap-3">
              {column.groups
                .flatMap((group) => group.links)
                .map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-sm text-ink-muted hover:text-ink">
                      {t(link.label)}
                    </Link>
                  </li>
                ))}
            </ul>
          </nav>
        ))}
      </div>

      {/* ── LA BARRE LÉGALE ──────────────────────────────────────────────────
          Séparée par un filet et non fondue dans le corps : ce sont des textes qu'on
          lit une fois, quand on les cherche. Droits à gauche, mentions à droite —
          la disposition du modèle. */}
      <div className="border-t border-border-subtle">
        <div className="shell flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-3 text-micro leading-relaxed text-ink-muted">
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>{fr.footer.rights(year)}</span>

            <span className="flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                  lastReading === undefined ? 'bg-ink-muted' : 'bg-status'
                }`}
              />
              {lastReading === undefined ? (
                t('Premier relevé en cours')
              ) : (
                <>
                  {t('Marché relevé')} <RelativeTime iso={new Date(lastReading).toISOString()} />
                </>
              )}
            </span>
          </span>

          <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="flex flex-wrap items-center gap-x-2">
              <span>{t('Sources')}</span>
              {DATA_SOURCES.map((source) => (
                <a
                  key={source.href}
                  href={source.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2 transition-colors duration-150 hover:text-ink"
                >
                  {source.label}
                </a>
              ))}
            </span>

            {/*
              `text-xs` (12 px) et non le `text-micro` (11 px) de la ligne : l'attribution
              CoinGecko doit rester lisible dans une police d'au moins 10 px selon ses
              CGU, et l'on garde une marge au-dessus du minimum. Aucun palier n'autorise
              son retrait.
            */}
            <a
              href="https://www.coingecko.com/en/api"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs underline underline-offset-2 transition-colors duration-150 hover:text-ink"
            >
              {fr.footer.poweredByCoinGecko}
            </a>

            {LEGAL_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="transition-colors duration-150 hover:text-ink"
              >
                {t(link.label)}
              </Link>
            ))}
          </span>
        </div>
      </div>

      {/*
        ══════════════════════════════════════════════════════════════════════
        LE GRAND MOT — repris du bloc « Footer With Big Text » d'Aceternity
        ══════════════════════════════════════════════════════════════════════

        ── CE QU'IL FAIT, ET CE QU'IL NE DOIT PAS FAIRE ──────────────────────

        Il signe la page sans rien y ajouter à lire. D'où trois contraintes, qui
        expliquent chacune un attribut ci-dessous :

          · `aria-hidden` ET une valeur de contraste très basse. Ce n'est PAS un
            titre : le nom du site est déjà donné par la marque au-dessus et par
            l'en-tête. Annoncé une troisième fois à la synthèse vocale, il
            deviendrait du bruit en fin de chaque page.
          · `select-none` : un mot de cette taille se retrouve sinon dans toute
            copie de la page faite au clavier depuis le bas.
          · `overflow-hidden` sur le conteneur, et une marge basse NÉGATIVE sur le
            mot. C'est ce qui produit la coupe de la référence — les lettres sortent
            par le bas du cadre au lieu de s'y poser. Sans elle, le mot flotterait
            au-dessus d'un vide, et le pied de page aurait l'air inachevé.

        ── LA TAILLE EST UNE FONCTION DE LA LARGEUR, ET NON UNE ÉCHELLE ──────

        `clamp()` plutôt qu'une suite de paliers : six lettres capitales doivent
        remplir la fenêtre à toute largeur, et une taille par point de rupture
        laisserait le mot trop court juste avant chacun d'eux. Le plafond de 15 rem
        évite qu'il ne dépasse la hauteur d'un écran d'ordinateur portable.

        La couleur est `text-ink` à faible opacité, et non un gris posé à la main :
        c'est ce qui la fait suivre les deux thèmes sans qu'un second jeton existe.
      */}
      <div
        aria-hidden="true"
        className="pointer-events-none select-none overflow-hidden px-4"
      >
        {/* `uppercase` en CSS et non « ZENKUU » écrit en dur : le nom reste lu dans
            `content/fr.ts`, où il s'écrit « Zenkuu ». Deux orthographes du même nom
            dans le code finiraient par diverger. */}
        <p className="-mb-[0.22em] text-center text-[clamp(2.75rem,25vw,22rem)] font-bold uppercase leading-none tracking-tighter text-ink/10">
          {fr.site.name}
        </p>
      </div>
    </footer>
  )
}
