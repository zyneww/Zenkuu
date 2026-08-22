import type { DataResult, NewsItem } from '@zenkuu/data'
import { EmptyState } from '@zenkuu/ui'

import { CoverArt } from '@/components/editorial/CoverArt'
import { Link } from '@/i18n/navigation'
import { getContent, getPhrase } from '@/lib/content'

/** Quatre cartes : une rangée pleine à 1280, deux à 768, une sur téléphone. */
const COUNT = 4

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * ACTUALITÉS — UNE RANGÉE DE CARTES, PLEINE LARGEUR, EN BAS DE PAGE
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── POURQUOI PAS `DiscoverPanel` ────────────────────────────────────────────
 *
 * Il existe déjà et rend bien la même donnée, mais dans une forme qui suppose une
 * COLONNE : un article de tête large flanqué d'une pile de brèves étroites. Cette
 * forme était juste quand le bloc occupait un tiers de la page ; posée sur toute la
 * largeur, elle donne une image de 900 pixels de large à côté de trois lignes de
 * texte — une hiérarchie qui n'a plus d'objet, puisque le lecteur arrivé jusqu'ici a
 * fini de regarder les chiffres et n'a plus à être orienté vers UN article.
 *
 * Quatre cartes égales disent l'inverse, et c'est ce qu'on veut dire : voilà ce qui
 * s'est écrit aujourd'hui, à vous de choisir.
 *
 * ── LA COUVERTURE EST ENGENDRÉE, JAMAIS EMPRUNTÉE ───────────────────────────
 *
 * `CoverArt` sait afficher une image distante ; on ne lui en passe pas. Une vignette
 * d'éditeur affichée ici ferait appeler son serveur depuis le navigateur du lecteur,
 * et `CoverArt` — contrairement au fil d'actualités, qui pose `referrerPolicy` — ne
 * masque pas la page d'origine. Le dégradé engendré à partir de l'identifiant de
 * l'article ne coûte aucune requête et ne dit rien à personne.
 */
export async function NewsBoard({ result }: { result: DataResult<NewsItem[]> }) {
  const fr = await getContent()
  const t = await getPhrase()

  const items = result.ok ? result.data.slice(0, COUNT) : []

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-normal text-ink-muted">{t('Actualités récentes')}</h2>
        <Link
          href="/actualites"
          className="shrink-0 text-sm text-brand transition-colors hover:text-brand-strong"
        >
          {t('Tout voir')} <span aria-hidden="true">→</span>
        </Link>
      </div>

      {items.length === 0 ? (
        <EmptyState
          title={fr.states.unavailableTitle}
          description={result.ok ? null : result.reason}
          compact
        />
      ) : (
        <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]">
          {items.map((item) => (
            /* `<a>` natif et non `<Link>` : la destination est un site tiers, hors du
               routeur. `nofollow` en plus de `noopener noreferrer` — nous citons ces
               éditeurs, nous ne leur transmettons pas de signal de classement. */
            <a
              key={item.id}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="group flex flex-col overflow-hidden rounded-panel border border-border-subtle bg-panel transition-colors duration-150 hover:border-brand/50"
            >
              <CoverArt seed={item.id} label={item.source} ratio="16/9" />

              <span className="flex flex-1 flex-col gap-1.5 p-3">
                <span className="line-clamp-3 text-sm font-medium leading-snug text-ink group-hover:text-brand-strong">
                  {item.title}
                </span>
                {/* `mt-auto` : les quatre cartes d'une rangée sont étirées à la hauteur
                    de la plus haute, et sans cela la ligne de source flotterait au
                    milieu du vide sous les titres courts. */}
                <span className="mt-auto text-micro text-ink-muted">
                  {item.source}
                  {item.publishedAt ? ` · ${item.publishedAt.slice(0, 10)}` : ''}
                </span>
              </span>
            </a>
          ))}
        </div>
      )}
    </section>
  )
}
