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
    <footer className="mt-16 border-t border-border-subtle bg-surface">
      {/* ── LE CORPS ─────────────────────────────────────────────────────────
          L'ANNUAIRE PASSE À GAUCHE ET L'IDENTITÉ À DROITE, à la manière du bloc
          « Footer With Big Text » repris ici : les colonnes de liens ouvrent le pied,
          et le pavé de marque le referme juste au-dessus du grand mot.

          `lg:flex-row` et non une grille commune : les deux blocs n'ont pas de largeur
          partagée — l'identité est un pavé de texte, l'annuaire une grille — et sous
          `lg` ils doivent s'empiler dans l'ordre du document. */}
      <div className="shell flex flex-col gap-10 py-12 lg:flex-row lg:justify-between lg:gap-16">
        {/* ── L'ANNUAIRE ─────────────────────────────────────────────────
            Deux colonnes sur téléphone, quatre dès `sm`. Les titres ne sont plus
            muets : ce sont eux qui permettent de choisir la colonne où chercher. */}
        <nav
          aria-label={t('Plan du site')}
          className="grid grid-cols-2 gap-x-8 gap-y-8 sm:grid-cols-4 lg:gap-x-14"
        >
          {FOOTER_COLUMNS.map((column) => (
            <div key={column.label}>
              <h2 className="text-xs font-medium text-ink-muted">{t(column.label)}</h2>
              <ul className="mt-4 flex flex-col gap-2.5">
                {/* Les groupes sont fondus — voir l'en-tête. `flatMap` plutôt qu'une
                    double boucle : le niveau intermédiaire n'a plus de rendu, et le
                    conserver dans le balisage produirait des `<div>` vides. */}
                {column.groups
                  .flatMap((group) => group.links)
                  .map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-xs text-ink transition-colors duration-150 hover:text-brand"
                      >
                        {t(link.label)}
                      </Link>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </nav>

        {/* ── L'IDENTITÉ ─────────────────────────────────────────────────
            `max-w-md` : la phrase est du TEXTE COURANT, et au-delà d'une mesure
            l'œil ne retrouve plus le début de la ligne suivante. C'est la même
            contrainte que `.prose-measure`, en plus serré parce qu'on est en 12 px. */}
        <div className="max-w-md shrink-0 lg:max-w-xs">
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
