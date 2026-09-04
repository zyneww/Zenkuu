import type { Metadata } from 'next'

import { RELEASES, RELEASE_TAG_LABELS } from '@/content/nouveautes'
import { getContent, getSeo } from '@/lib/content'
import { getPhrase } from '@/lib/content'
import { pageAlternates } from '@/lib/site'

/**
 * Métadonnées DÉRIVÉES DE LA LANGUE, d'où la fonction plutôt que la constante.
 *
 * Un `export const metadata` est évalué une fois au chargement du module : il ne
 * peut pas connaître la locale de la requête, et servait donc un titre français sur
 * les pages anglaises.
 */
export async function generateMetadata(): Promise<Metadata> {
  const fr = await getContent()
  const seo = await getSeo()
  return {
  title: fr.pages.changelog,
  description: seo(
    '/nouveautes',
    'Journal des évolutions de ZENKUU : fonctionnalités livrées, sources de données ajoutées et limites connues.',
  ),
  alternates: await pageAlternates('/nouveautes'),
  }
}

/**
 * Journal des nouveautés.
 *
 * ⚠️ LA TABLE A DÉMÉNAGÉ dans `content/nouveautes.ts` : le centre d'aide en a besoin
 * lui aussi, pour la section « Annonces » de sa référence. La recopier là-bas aurait
 * garanti que les deux versions divergent à la première livraison.
 */

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * LE JOURNAL, EN DEUX COLONNES — LA FORME DE feather.so/changelog
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── CE QUE C'ÉTAIT, ET POURQUOI LA FRISE TOMBE ─────────────────────────────
 *
 * Une FRISE VERTICALE : un filet à gauche, une pastille par entrée, et sous chaque
 * pastille la date, le titre et la liste. Le motif est joli et il coûte cher — les
 * vingt pixels de gouttière qu'il réserve valent pour toutes les lignes de toutes les
 * entrées, pour dire une chose que l'ordre du document dit déjà : ceci suit cela.
 *
 * La référence range autrement, et mieux : DEUX COLONNES. À gauche la date et le
 * titre, à droite les étiquettes et le détail. Ce qui identifie l'entrée tient donc
 * dans une colonne étroite qu'on parcourt d'un regard vertical, et le détail ne se lit
 * que là où l'œil s'arrête. On balaye une colonne au lieu de sauter par-dessus des
 * paragraphes.
 *
 * ── LES MESURES SONT CELLES DE LA RÉFÉRENCE ────────────────────────────────
 *
 * Relevées au navigateur : colonne de gauche à 384 px, 64 px de respiration
 * verticale par entrée, titre de page à 60 px / 700, sous-titre à 20 px / 400 gris,
 * date à 16 px / 500 gris.
 *
 * ⚠️ CE QUI N'EST PAS REPRIS : la VIGNETTE. Chaque entrée de la référence porte une
 * image de prévisualisation qui occupe le haut de la colonne droite. ZENKUU n'a pas
 * d'illustration par livraison, et en fabriquer une — capture, dégradé, motif — serait
 * un placeholder décoratif au sommet de la page qui raconte ce que le site a livré. Le
 * détail commence donc directement.
 *
 * ⚠️ NI LE « READ MORE ». Il mène chez eux à une page par entrée ; ici la liste EST
 * l'entrée complète. Un lien qui rouvrirait le même texte serait un lien mort déguisé.
 */
export default async function NouveautesPage() {
  const t = await getPhrase()
  return (
    <div className="mx-auto max-w-5xl py-6">
      {/* `max-w-2xl` sur le sous-titre et non sur l'en-tête : le titre doit pouvoir
          courir sur la largeur, la phrase doit se couper à une longueur lisible. */}
      <header className="space-y-3">
        <h1 className="display-xl text-ink">{t('Quoi de neuf sur ZENKUU ?')}</h1>
        <p className="max-w-2xl text-lg leading-relaxed text-ink-muted">
          {t(
            'Ce qui a été livré, dans l’ordre. Les limites connues sont signalées au même titre que les ajouts — une fonctionnalité partielle est annoncée comme telle.',
          )}
        </p>
      </header>

      {/* `divide-y` plutôt qu'une bordure par entrée : le filet ne paraît QU'ENTRE
          deux livraisons, jamais avant la première ni après la dernière. Écrit sur
          chaque `<li>`, il faudrait le retirer du premier à la main. */}
      <ol className="mt-12 divide-y divide-border-subtle">
        {RELEASES.map((release, index) => (
          <li
            key={index}
            /* 64 px de respiration, la mesure de la référence — et `first:pt-0` pour
               que la première entrée ne s'éloigne pas du titre de la page. */
            className="grid gap-x-10 gap-y-4 py-16 first:pt-0 md:grid-cols-[minmax(0,20rem)_1fr]"
          >
            {/* ── LA COLONNE D'IDENTITÉ ────────────────────────────────────
                Elle ne porte QUE ce qui distingue l'entrée des autres. Y ajouter la
                moindre phrase de détail casserait le balayage vertical qui fait tout
                l'intérêt de cette disposition. */}
            <div className="space-y-2">
              <time dateTime={release.date} className="block text-sm font-medium text-ink-muted">
                {t(release.label)}
              </time>
              <h2 className="text-xl font-semibold leading-snug text-ink">{t(release.title)}</h2>
            </div>

            <div className="space-y-4">
              {/* ── LES ÉTIQUETTES ───────────────────────────────────────────
                  Elles répondent à la question qu'on se pose AVANT de lire : « est-ce
                  que ça change ce que je sais faire, ou ce que je faisais déjà ? »
                  D'où leur place en tête de la colonne de détail, et non sous le titre
                  — sous le titre, elles se liraient comme un sous-titre. */}
              <ul className="flex flex-wrap gap-1.5">
                {release.tags.map((tag) => (
                  <li
                    key={tag}
                    className="rounded-control bg-surface-muted px-2 py-1 text-micro font-medium text-ink-muted"
                  >
                    {t(RELEASE_TAG_LABELS[tag])}
                  </li>
                ))}
              </ul>

              <ul className="space-y-2 text-sm leading-relaxed text-ink-muted">
                {release.items.map((item, itemIndex) => (
                  <li key={itemIndex} className="flex gap-2.5">
                    {/* Le point est un ornement et disparaît pour la synthèse vocale :
                        la liste porte déjà sa sémantique, et l'entendre annoncer
                        « point » avant chaque ligne serait du bruit. */}
                    <span aria-hidden="true" className="mt-2 h-1 w-1 shrink-0 rounded-pill bg-ink-muted" />
                    <span>{t(item)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}
