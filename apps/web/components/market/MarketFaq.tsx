import type { AssetClass } from '@zenkuu/data'

import { weave } from '@/components/locale/emphasise'
import { Link } from '@/i18n/navigation'
import { getPhrase } from '@/lib/content'

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * LA FAQ DE BAS DE PAGE
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Reprise structurelle de Cryptorank, qui ferme sa liste par sept questions. Ce n'est
 * pas un ornement : une page de catalogue est atteinte par des requêtes du type
 * « combien de cryptomonnaies existe-t-il », et y répondre en toutes lettres sous le
 * tableau est ce qui fait la différence entre une grille de chiffres et une page
 * qu'on peut citer.
 *
 * ── LES RÉPONSES SONT ÉCRITES POUR ZENKUU, PAS TRADUITES DE LA RÉFÉRENCE ────
 *
 * Et c'est une obligation, pas une préférence : les réponses de la référence portent
 * SES faits — le nombre d'actifs qu'elle suit, sa fréquence de rafraîchissement, ses
 * fonctions. Les traduire ferait de cette page une déclaration fausse sur elle-même.
 * Chaque réponse ci-dessous est vérifiable dans ce dépôt :
 *
 *     « toutes les trois minutes »   →  `revalidate = 180` sur les six routes
 *     « aucun ordre ne part d'ici »  →  le site n'a pas de fonction d'échange
 *     le nombre d'actifs             →  passé en paramètre, jamais écrit en dur
 *
 * ── `<details>` PLUTÔT QU'UN ACCORDÉON CLIENT ──────────────────────────────
 *
 * L'élément natif porte l'état ouvert/fermé, le navigateur l'anime, la recherche du
 * navigateur (Ctrl+F) trouve le texte replié depuis Chrome 120, et rien n'est envoyé
 * au client. Un accordéon en JavaScript coûterait un îlot pour un comportement que le
 * HTML tient seul — c'est le même arbitrage que l'ancienne rangée de repères.
 */

interface Entry {
  question: string
  /** Réponse en Markdown minimal : `[libellé](/chemin)` devient un lien. */
  answer: string
  /** Restreint l'entrée aux classes nommées. Absent : toutes les classes. */
  only?: AssetClass[]
}

/**
 * Les sept questions, dans l'ordre de la référence.
 *
 * `{n}`, `{classe}` et `{source}` sont des emplacements NOMMÉS et non des fragments
 * concaténés : leur position change d'une langue à l'autre, et un texte coupé en trois
 * autour d'une variable ne peut pas se réordonner à la traduction.
 */
const ENTRIES: Entry[] = [
  {
    question: 'Combien d’actifs cette page recense-t-elle ?',
    answer:
      'Le compteur sous le tableau donne le nombre exact au moment où vous lisez, et il vient de la source — il n’est jamais écrit en dur. Le tableau en sert une tranche à la fois ; le sélecteur « Lignes » décide de sa taille, et la pagination parcourt le reste.',
  },
  {
    question: 'Comment le classement est-il ordonné ?',
    answer:
      'Par capitalisation boursière décroissante par défaut, c’est-à-dire du plus grand au plus petit. Cliquer l’intitulé d’une colonne réordonne la liste sur cette colonne, et un second clic inverse le sens. Les valeurs absentes vont toujours en dernier, dans les deux sens : « pas de donnée » n’est pas « zéro ».',
  },
  {
    question: 'Qu’est-ce que la capitalisation boursière, et pourquoi compte-t-elle ?',
    answer:
      'C’est le cours multiplié par l’offre en circulation — les deux dernières colonnes du tableau. Elle mesure ce que vaudrait l’ensemble des unités existantes au cours actuel, et sert de repère de taille plutôt que de valeur : une capitalisation élevée ne dit rien de la liquidité réelle, qui se lit sur le volume 24 h.',
    only: ['crypto', 'stock', 'etf'],
  },
  {
    question: 'Quelle est la différence entre une pièce et un jeton ?',
    answer:
      'Une pièce (coin) a sa propre chaîne — Bitcoin, Ether. Un jeton (token) est émis sur la chaîne d’une autre — la plupart des lignes de ce tableau. La distinction n’a pas de colonne ici parce que notre source ne la publie pas : l’inventer par déduction donnerait une classification approximative présentée comme un fait.',
    only: ['crypto'],
  },
  {
    question: 'À quelle fréquence les données sont-elles mises à jour ?',
    answer:
      'Toutes les trois minutes. La page est rendue une fois pour tous les visiteurs puis resservie depuis le cache jusqu’à expiration de ce délai — c’est ce qui permet de la servir sans épuiser le quota de la source. La date du dernier relevé est écrite sous le tableau, à côté du nom de la source.',
  },
  {
    question: 'Puis-je chercher un actif précis ou filtrer la liste ?',
    answer:
      'Deux outils, deux portées, et la différence compte. Le champ « Filtrer » au-dessus du tableau ne porte que sur les lignes CHARGÉES, et le décompte le dit dès qu’il est actif. La loupe de l’en-tête du site, elle, interroge l’ensemble du catalogue. Les fourchettes de capitalisation, de volume et de variation filtrent également les lignes chargées.',
  },
  {
    question: 'Qu’est-ce qui distingue ZENKUU d’une autre plateforme de données ?',
    answer:
      'Une règle tenue partout : rien n’est affiché qui ne soit sourcé. Une donnée que le fournisseur ne publie pas laisse un tiret ou fait disparaître sa colonne, jamais un zéro ni une estimation. La page [à propos](/a-propos) détaille cet engagement, et la source de chaque tableau est nommée juste en dessous de lui. ZENKUU publie des chiffres, ne recommande rien, et ne propose aucune fonction d’achat ou de vente.',
  },
]

export async function MarketFaq({ assetClass }: { assetClass: AssetClass }) {
  const t = await getPhrase()

  const entries = ENTRIES.filter((entry) => !entry.only || entry.only.includes(assetClass))

  return (
    <section className="space-y-3 border-t border-border-subtle pt-8">
      {/* `h2` et non `h3` : c'est une section de premier rang de la page, au même
          niveau que le tableau. Le niveau de titre est une structure, pas une taille —
          le rétrograder pour qu'il paraisse plus discret casserait le plan du document
          pour les lecteurs d'écran, qui s'en servent pour naviguer. */}
      <h2 className="text-lg font-semibold text-ink">{t('Questions fréquentes')}</h2>

      <div className="divide-y divide-border-subtle border-y border-border-subtle">
        {entries.map((entry) => (
          <details key={entry.question} className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-3.5 text-sm font-medium text-ink transition-colors hover:text-brand marker:hidden [&::-webkit-details-marker]:hidden">
              {t(entry.question)}
              {/* Le chevron TOURNE plutôt que de changer de glyphe : deux caractères
                  différents sautent d'un rendu à l'autre, une rotation se suit à
                  l'œil et dit dans quel sens le bloc va s'ouvrir. */}
              <span
                aria-hidden="true"
                className="shrink-0 text-ink-muted transition-transform duration-200 group-open:rotate-180"
              >
                ⌄
              </span>
            </summary>
            <p className="pb-4 pr-8 text-sm leading-relaxed text-ink-muted">
              {weave(t(entry.answer), (href, label, key) => (
                <Link key={key} href={href} className="text-ink hover:underline">
                  {label}
                </Link>
              ))}
            </p>
          </details>
        ))}
      </div>
    </section>
  )
}
