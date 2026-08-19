import type { ReactNode } from 'react'

/**
 * Rend une phrase traduite dont une portion est mise en évidence.
 *
 * ── LE PROBLÈME ──────────────────────────────────────────────────────────────
 *
 * Une balise à l'intérieur d'un paragraphe coupe la phrase en morceaux :
 *
 *     <p>Un ETF <strong>européen n’y figure pas</strong> — la sélection est américaine.</p>
 *
 * Traduire ce paragraphe demande de traduire « Un ETF », puis « européen n'y figure
 * pas », puis « — la sélection est américaine ». Aucun de ces morceaux n'est une
 * phrase, et l'ordre dans lequel ils se recollent est celui du FRANÇAIS : en japonais
 * le verbe part à la fin, en allemand aussi, et le résultat n'a plus de sens.
 *
 * ── LA SOLUTION ──────────────────────────────────────────────────────────────
 *
 * La phrase reste ENTIÈRE dans la table, et porte son emphase en clair :
 *
 *     t('Un ETF **européen n’y figure pas** — la sélection est américaine.')
 *
 * Le traducteur déplace les astérisques où sa langue les veut. Le rendu les convertit
 * en `<strong>`. Une phrase, une entrée, un ordre libre.
 *
 * Le choix de `**` vient de Markdown : c'est la notation d'emphase que tout traducteur
 * reconnaît, et elle n'apparaît dans aucun texte financier courant — au contraire de
 * `*`, qui sert d'appel de note.
 */
export function emphasise(text: string, className = 'text-ink'): ReactNode[] {
  /*
   * Un nombre PAIR de segments signifie un `**` non refermé. On rend alors le texte
   * tel quel plutôt que d'ouvrir un `<strong>` qui avalerait la fin du paragraphe :
   * une emphase manquante se remarque à peine, une emphase qui déborde saute aux yeux.
   */
  const parts = text.split('**')
  if (parts.length % 2 === 0) return [text]

  return parts.map((part, index) =>
    index % 2 === 1 ? (
      <strong key={index} className={className}>
        {part}
      </strong>
    ) : (
      part
    ),
  )
}

/**
 * Même principe que `emphasise`, étendu aux liens.
 *
 * Un paragraphe de note se termine presque toujours par un renvoi — « voir tous les
 * secteurs », « filtrer avec le screener ». Le lien coupe la phrase exactement comme
 * le faisait `<strong>`, avec la même conséquence : trois fragments dont l'ordre est
 * celui du français. La phrase reste donc entière et porte ses liens en notation
 * Markdown :
 *
 *     t('Le détail de chaque narratif est sur sa page — voir [tous les secteurs](/categories).')
 *
 * ── POURQUOI LES CIBLES NE SONT PAS TRADUISIBLES ─────────────────────────────
 *
 * Le chemin vit DANS la phrase, et un traducteur pourrait le changer. C'est voulu :
 * les routes du site sont en français (`/categories`, `/marches`) et identiques dans
 * les treize langues — le préfixe de locale est ajouté par `Link`. Un chemin modifié
 * par erreur donne un lien mort, visible au premier clic ; l'alternative, une liste
 * de cibles numérotées à côté de la phrase, redonnerait au traducteur un texte à
 * trous. On préfère la faute visible à la faute invisible.
 */
export function weave(
  text: string,
  link: (href: string, label: string, key: number) => ReactNode,
  className = 'text-ink',
): ReactNode[] {
  const nodes: ReactNode[] = []
  const pattern = /\[([^\]]+)\]\(([^)]+)\)/g
  let last = 0
  let match: RegExpExecArray | null
  let key = 0

  while ((match = pattern.exec(text))) {
    if (match.index > last) nodes.push(...emphasise(text.slice(last, match.index), className))
    /* Les deux groupes sont obligatoires dans le motif ; `noUncheckedIndexedAccess`
       l'ignore, d'où le repli sur la chaîne vide plutôt qu'une assertion. */
    nodes.push(link(match[2] ?? '', match[1] ?? '', key++))
    last = match.index + match[0].length
  }
  if (last < text.length) nodes.push(...emphasise(text.slice(last), className))

  return nodes
}
