import { ZenkuuWordmark } from '@/components/BrandMark'
import { Link } from '@/i18n/navigation'

import { FOOTER_COLUMNS, LEGAL_LINKS } from '@/content/footer'
import { getContent, getPhrase } from '@/lib/content'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * PIED DE PAGE — L'IDENTITÉ À GAUCHE, QUATRE COLONNES À DROITE
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── D'OÙ VIENT CETTE FORME ──────────────────────────────────────────────────
 *
 * De tokenomist.ai, relevé au navigateur le 2026-09-04 : un bloc d'identité — la
 * marque puis une phrase qui dit ce que le site fait — occupe la gauche, QUATRE
 * colonnes de liens serrées occupent la droite, et une barre séparée d'un filet
 * ferme le pied avec les droits à gauche et un lien à droite.
 *
 * Mesuré chez elle : intitulés de colonne à 14 px / interligne 20 / graisse 500, un
 * `flex` de conteneur à 128 px de gouttière entre le bloc d'identité et le groupe de
 * colonnes, et quatre pistes d'environ 166 px. Ce sont ces valeurs qui sont posées
 * ici — `xl:gap-32` vaut exactement les 128 px du relevé.
 *
 * ── POURQUOI UN `flex` ET NON UNE GRILLE UNIQUE ─────────────────────────────
 *
 * La version précédente rangeait l'identité et les six colonnes dans UNE grille de
 * sept pistes égales. C'était juste tant que l'identité ne portait qu'un logo. Elle
 * porte maintenant un paragraphe, et un paragraphe n'a aucune raison de faire la
 * largeur d'une colonne de liens : dans une piste de 166 px, la description du site
 * tomberait sur douze lignes.
 *
 * Deux blocs, donc, avec la gouttière mesurée entre eux — c'est la forme de la
 * référence, et c'est celle qui laisse le texte respirer.
 *
 * ── LA COLONNE « PRODUIT » SE REND SUR DEUX PISTES ──────────────────────────
 *
 * Elle porte dix-neuf liens contre six, un et deux pour les trois autres ; la note
 * de `content/footer.ts` explique pourquoi ce déséquilibre est arithmétique et non
 * un oubli. Dix-neuf lignes d'affilée feraient un pied deux fois plus haut que son
 * bloc d'identité ; deux pistes de dix l'alignent dessus.
 *
 * Le seuil est porté par `PISTES_DOUBLES` plutôt que par un test sur le libellé :
 * une colonne longue se rendra ainsi correctement le jour où ce n'est plus
 * « Produit », et une colonne qui raccourcit reviendra seule sur une piste.
 *
 * ── CE QUI RESTE, ET NE PEUT PAS PARTIR ─────────────────────────────────────
 *
 * ⚠️ L'ATTRIBUTION COINGECKO EST CONTRACTUELLE (CGU §4.1.4, police d'au moins 10 px,
 * tous paliers y compris gratuit). Elle avait DISPARU du pied : la note d'en-tête
 * affirmait qu'elle vivait dans la barre légale, mais aucun rendu ne la produisait —
 * seule la page `embed/ticker` la portait encore. Elle est reposée ici, liée vers
 * coingecko.com comme les conditions l'exigent.
 *
 * L'avertissement « lecture seule » est ce qui tient Zenkuu à distance du conseil en
 * investissement : il reste dans la barre du bas, sous les droits.
 *
 * ── LES ICÔNES SOCIALES DEVIENNENT UNE COLONNE ──────────────────────────────
 *
 * Elles formaient une rangée de pastilles à droite de la barre du bas. Le modèle
 * range ses comptes dans une colonne de liens TEXTE nommée « Social », et
 * `FOOTER_COLUMNS` cite désormais `SOCIAL_LINKS` pour la remplir. Un compte social
 * écrit en toutes lettres se lit ; une pastille demande de reconnaître un glyphe.
 */

/**
 * À partir de combien de liens une colonne se scinde en deux pistes.
 *
 * Dix : c'est la hauteur du bloc d'identité — marque plus trois lignes de
 * description — au-delà de laquelle une colonne commence à tirer le pied vers le bas
 * toute seule.
 */
const PISTES_DOUBLES = 10

export async function Footer() {
  const fr = await getContent()
  const t = await getPhrase()

  return (
    /* ── LE PIED NE SE DÉTACHE PAS DU FOND ────────────────────────────────
       Il portait `bg-surface` : un pavé plus clair que la page, sur toute la
       largeur, à la fin de chaque écran. Relevé le 2026-08-30 sur la référence :
       son `<footer>` n'a AUCUN fond propre — la couleur qu'on y voit est celle du
       `<body>`. Ce qui sépare le pied du contenu est le seul filet.

       ⚠️ ET NON UN FOND SOMBRE FIXE. Le brief décrit « fond sombre » parce que la
       capture est prise sur un site qui n'a qu'un thème. Zenkuu en a deux : un pied
       toujours sombre poserait un pavé noir en bas d'une page claire. La réponse
       retenue est de SUIVRE LE THÈME — les jetons ci-dessous le font seuls. */
    <footer className="mt-16 border-t-[1.25px] border-border-subtle">
      <div className="shell flex flex-col gap-10 py-12 xl:flex-row xl:items-start xl:gap-32">
        {/* ── LE BLOC D'IDENTITÉ ─────────────────────────────────────────
            La marque, puis la phrase qui dit ce que le site fait. C'est la
            description déjà servie aux moteurs (`site.description`) : la même
            phrase à l'écran et dans les métadonnées, pas deux formulations qui
            divergeront.

            `max-w-[26rem]` : la mesure de confort typographique, autour de 60
            signes par ligne. Sans elle, le paragraphe s'étirerait sur toute la
            largeur restante sous `xl` et deviendrait illisible. */}
        <div className="flex max-w-[26rem] flex-col gap-4 xl:w-[22rem] xl:shrink-0">
          <ZenkuuWordmark className="h-5 w-auto text-ink" />
          <p className="text-sm leading-relaxed text-ink-muted">{fr.site.description}</p>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            LES QUATRE COLONNES

            ── LA HIÉRARCHIE TIENT EN UNE COULEUR ──────────────────────────

            Le TITRE est à l'encre pleine, les LIENS à l'encre atténuée. Pas deux
            teintes sans rapport — une encre et sa dilution, ce que `text-ink` et
            `text-ink-muted` portent déjà dans les deux thèmes. C'est ce qui fait
            qu'on lit d'abord les quatre titres, puis la colonne choisie, au lieu
            de lire vingt-huit liens.

            ── LES PISTES NE SONT PAS ÉGALES ───────────────────────────────

            `2fr` pour la première, `1fr` pour les trois autres : « Produit » se rend
            sur deux pistes internes, il lui faut donc deux fois la largeur. Des
            pistes égales l'auraient écrasé sur des colonnes de 83 px.

            ⚠️ LA TRANSITION EST DÉJÀ POSÉE. `color 0.15s` est le filet de sécurité
            de `globals.css` sur tout `<a>` : rien à écrire ici. */}
        <div className="grid flex-1 grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-[2fr_1fr_1fr_1fr] sm:gap-x-12">
          {FOOTER_COLUMNS.map((column) => {
            const large = column.links.length >= PISTES_DOUBLES

            return (
              <nav
                key={column.label}
                aria-label={t(column.label)}
                /* La colonne large prend les deux pistes du téléphone : c'est ce qui
                   permet à sa liste de s'y rendre elle-même sur deux tracks. */
                className={`flex flex-col gap-4${large ? ' col-span-2 sm:col-span-1' : ''}`}
              >
                {/* `<h2>` malgré l'apparence discrète : la synthèse vocale s'en sert
                    pour sauter d'une colonne à l'autre, et un texte en encre pleine
                    n'est pas une structure. La graisse n'a jamais fait le titre — la
                    balise si. 14 px / graisse 500, les valeurs du relevé. */}
                <h2 className="text-sm font-medium leading-5 text-ink">{t(column.label)}</h2>

                {/* ⚠️ LE SENS DE REMPLISSAGE EST EXPLICITE, ET IL A DÛ L'ÊTRE.
                    Une grille à deux colonnes remplit EN LIGNE : les dix-neuf liens
                    de « Produit » se lisaient alors en travers — classes d'actifs et
                    outils alternant d'une piste à l'autre — alors que l'ordre du
                    tableau les groupe par famille du haut vers le bas. Mesuré au
                    navigateur avant correction.

                    `grid-flow-col` avec un nombre de rangées CALCULÉ remplit la
                    première piste avant d'entamer la seconde. Le calcul plutôt qu'un
                    `grid-rows-10` figé : une liste qui grandit passerait sinon à une
                    troisième piste sans que personne ne le demande. */}
                <ul
                  className={
                    large ? 'grid grid-flow-col gap-x-8 gap-y-3' : 'flex flex-col gap-3'
                  }
                  style={
                    large
                      ? {
                          gridTemplateRows: `repeat(${Math.ceil(column.links.length / 2)}, auto)`,
                        }
                      : undefined
                  }
                >
                  {column.links.map((link) => (
                    /* La clé passe du `href` au libellé : un `href` n'est plus
                       forcément une chaîne — une route à paramètre s'écrit en objet
                       — et les libellés sont uniques dans une colonne. */
                    <li key={link.label}>
                      {/* Le branchement suit l'union de `FooterLink` : c'est lui qui
                          rétrécit `href`, et c'est pourquoi une URL absolue ne peut
                          pas atterrir dans un `<Link>`. */}
                      {link.external ? (
                        <a
                          href={link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-ink-muted hover:text-ink"
                        >
                          {t(link.label)}
                        </a>
                      ) : (
                        <Link href={link.href} className="text-sm text-ink-muted hover:text-ink">
                          {t(link.label)}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </nav>
            )
          })}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          LA BARRE DU BAS — DROITS À GAUCHE, LIEN À DROITE

          C'est la forme du modèle. Ce qu'il met à droite est « Terms of Service » ;
          cette page N'EXISTE PAS ici, et un 404 depuis le pied de page est le pire
          endroit où en avoir un — c'est là qu'on va quand on cherche justement les
          conditions. `LEGAL_LINKS` porte donc les pages réelles qui répondent à la
          question posée à cet endroit.

          L'attribution CoinGecko accompagne les droits plutôt que d'occuper une
          ligne à elle : les deux disent qui publie, et elle doit rester lisible
          (10 px minimum contractuels — `text-xs` en fait 12).
          ══════════════════════════════════════════════════════════════════════ */}
      <div className="border-t border-border-subtle">
        <div className="shell flex flex-col gap-4 py-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="flex flex-wrap items-center gap-x-2 text-xs text-ink">
              <span>
                {t('ZENKUU © {annee}').replace('{annee}', String(new Date().getFullYear()))}
              </span>
              <span aria-hidden className="text-ink-muted">
                ·
              </span>
              <a
                href="https://www.coingecko.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-ink-muted hover:text-ink"
              >
                {fr.footer.poweredByCoinGecko}
              </a>
            </p>
            {/* La mention de non-conseil reste avec les droits : les deux disent qui
                parle et à quel titre, elles se lisent ensemble. */}
            <p className="mt-2 max-w-2xl text-xs leading-relaxed text-ink-muted">
              {fr.footer.disclaimer}
            </p>
          </div>

          <ul className="flex shrink-0 items-center gap-4">
            {LEGAL_LINKS.map((link) => (
              <li key={link.label}>
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
        </div>
      </div>
    </footer>
  )
}
