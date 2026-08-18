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
