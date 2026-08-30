import type { DataResult, NewsItem } from '@zenkuu/data'
import { EmptyState } from '@zenkuu/ui'

import { CoverArt } from '@/components/editorial/CoverArt'
import { getContent, getPhrase } from '@/lib/content'

/**
 * DÉCOUVRIR — le seul bloc éditorial de l'explorateur, et le dernier de la page.
 *
 * ── POURQUOI IL REMPLACE LE PANNEAU D'ACTUALITÉS ────────────────────────────
 *
 * L'ancienne page portait un panneau « Dernières actualités » de cinq titres empilés,
 * coincé entre deux blocs de chiffres. Cinq lignes de texte au milieu d'un tableau de
 * bord se lisent comme un encart : on les saute. Le même contenu, tiré en une image
 * de tête et trois brèves EN BAS de page, cesse d'interrompre la lecture des données
 * et devient ce qu'il est — une sortie, pour qui a fini de regarder les chiffres.
 *
 * ── LA COUVERTURE EST ENGENDRÉE, JAMAIS EMPRUNTÉE ───────────────────────────
 *
 * `CoverArt` sait afficher une image distante ; on ne lui en passe pas. Une vignette
 * d'éditeur affichée ici ferait appeler son serveur depuis le navigateur du lecteur,
 * et `CoverArt` — contrairement au fil d'actualités, qui pose `referrerPolicy` — ne
 * masque pas la page d'origine. Le dégradé engendré à partir de l'identifiant de
 * l'article ne coûte aucune requête et ne dit rien à personne.
 */
export async function DiscoverPanel({ result }: { result: DataResult<NewsItem[]> }) {
  const fr = await getContent()
  const t = await getPhrase()

  const items = result.ok ? result.data : []
  const featured = items[0]
  const rest = items.slice(1, 4)

  if (!featured) {
    return (
      <EmptyState
        title={fr.states.unavailableTitle}
        description={result.ok ? null : result.reason}
        compact
      />
    )
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
      {/* ── L'ARTICLE DE TÊTE ───────────────────────────────────────────────
          `group` sur l'ancre entière : le titre change de couleur quand le survol
          porte sur l'image, ce qui dit qu'il n'y a qu'une seule cible cliquable. */}
      <a
        href={featured.url}
        target="_blank"
        rel="noopener noreferrer nofollow"
        className="group relative flex flex-col overflow-hidden rounded-panel border border-border-subtle bg-panel transition-colors duration-150 hover:border-brand/50"
      >
        {/* `21/9` ET NON `16/10`. Le dessin de `CoverArt` est en 16/9 et s'ancre en
            bas ; dans un cadre plus HAUT que cela, il déborde latéralement et rogne
            l'étiquette par les deux bords — mesuré : « Crypto Briefing » coupé net à
            gauche. Le 21/9 est le format pour lequel son ancrage a été réglé, et il
            ramène au passage la couverture de 390 à 270 pixels, ce qui est la hauteur
            que la carte voisine peut remplir. */}
        <CoverArt seed={featured.id} label={featured.source} ratio="21/9" />

        <span className="absolute left-3 top-3 rounded-xs bg-canvas/80 px-1.5 py-0.5 text-micro font-semibold uppercase tracking-wide text-ink">
          {t('À la une')}
        </span>

        <span className="flex flex-1 flex-col gap-1 p-4">
          <span className="text-base font-semibold leading-snug text-ink group-hover:text-brand">
            {featured.title}
          </span>
          <span className="text-xs text-ink-muted">
            {featured.source}
            {featured.publishedAt ? ` · ${featured.publishedAt.slice(0, 10)}` : ''}
          </span>

          {featured.excerpt ? (
            <span className="mt-1 line-clamp-2 text-xs leading-relaxed text-ink-muted">
              {featured.excerpt}
            </span>
          ) : null}

          <span className="mt-auto pt-3 text-xs font-medium text-ink">
            {t('Lire l’article')} <span aria-hidden="true">→</span>
          </span>
        </span>
      </a>

      {/* ── LES BRÈVES ──────────────────────────────────────────────────────
          Trois et non cinq : la carte est haute de l'article de tête, et une
          quatrième ligne l'allongerait au-delà de lui. */}
      {/* `self-start` : la carte s'arrête à ses trois brèves au lieu d'être étirée à
          la hauteur de l'article de tête, où elle laissait 200 pixels de blanc. */}
      <section className="self-start rounded-panel border border-border-subtle bg-panel p-4">
        <h3 className="pb-1 text-sm font-medium text-ink">{t('Récemment publié')}</h3>

        <ul className="divide-y divide-border-subtle">
          {rest.map((item) => (
            <li key={item.id} className="py-2.5">
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="group block"
              >
                <span className="block text-xs font-medium leading-snug text-ink group-hover:text-brand">
                  {item.title}
                </span>
                <span className="mt-0.5 block text-micro text-ink-muted">
                  {item.source}
                  {item.publishedAt ? ` · ${item.publishedAt.slice(0, 10)}` : ''}
                </span>
              </a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
