import type { ReactNode } from 'react'

import { AreaSpark, type SparkFormat } from '@/components/charts/AreaSpark'

/**
 * Carte de métrique — le widget signature d'un tableau de bord de données.
 *
 * Structure : libellé discret, grand nombre dans la teinte de la carte, précision,
 * puis courbe en aire collée au bas. Cet ordre n'est pas décoratif — il suit le
 * parcours du regard : « de quoi parle-t-on », « combien », « depuis quand ».
 *
 * La courbe est calée AU BAS de la carte et déborde jusqu'aux bords, sans marge.
 * C'est ce qui la fait lire comme un fond de carte plutôt que comme un graphique
 * miniature, et c'est ce qui distingue ce motif d'une simple carte avec vignette.
 *
 * `color` est la teinte de la métrique : elle colore le nombre ET la courbe.
 * L'accord des deux est ce qui rattache le chiffre à sa forme quand plusieurs
 * cartes s'alignent — sans lui, quatre cartes multicolores deviennent illisibles.
 */
export function MetricCard({
  label,
  value,
  hint,
  color = 'var(--color-data-1)',
  icon,
  series,
  sparkHeight = 56,
  format,
  pending,
  action,
}: {
  label: string
  value: ReactNode
  hint?: ReactNode
  color?: string
  icon?: ReactNode
  series?: { x: string | number; y: number }[]
  /**
   * Hauteur de la courbe : pixels, ou `'fill'` pour occuper toute la place restante.
   *
   * Réglable parce que cette carte sert dans deux contextes très différents. Dans une
   * colonne étroite, 56 px suffisent à donner la forme de la série.
   *
   * Dans une BANDE DE CARTES ALIGNÉES, une hauteur fixe ne convient pas, et le
   * contournement précédent — passer 128 au lieu de 56 — ne faisait que déplacer le
   * problème. La carte est étirée à la hauteur de sa voisine la plus haute ; comme
   * c'est le bloc de texte qui porte le `flex-1`, c'est LUI qui grandit, et tout
   * l'étirement devient du blanc entre le chiffre et le tracé calé en bas. Sur
   * l'accueil, le panneau d'actualités imposait 455 px : 128 en laissait encore 250
   * de vide, et aucune valeur en dur n'aurait tenu, puisqu'elle dépend du contenu
   * d'un composant voisin.
   *
   * `'fill'` règle la question à la source — c'est la courbe qui absorbe l'étirement.
   */
  sparkHeight?: number | 'fill'
  /** Format de l'infobulle de la courbe — un mot-clé, non une fonction (voir `AreaSpark`). */
  format?: SparkFormat
  /**
   * Ce qu'on affiche À LA PLACE de la courbe tant qu'elle n'existe pas.
   *
   * Absent, la carte ne montre rien : c'est le cas d'une mesure qui n'a pas de
   * série par nature. Fourni, la raison de l'absence remplit la place que le tracé
   * occuperait — voir le rendu plus bas.
   */
  pending?: string
  action?: ReactNode
}) {
  /*
   * En mode `'fill'`, le `flex-1` CHANGE DE MAIN.
   *
   * C'est tout le correctif : par défaut il porte sur le bloc de texte, qui absorbe
   * donc l'étirement en blanc. Ici il passe à la courbe, qui l'absorbe en tracé. Le
   * `min-h-0` est indispensable — sans lui, un enfant flex refuse de descendre sous
   * sa hauteur de contenu et l'étirement repartirait dans le texte.
   *
   * `min-h-[56px]` garde le plancher du mode pixels : dans une carte courte, une
   * courbe de douze pixels ne dit plus rien de la série.
   */
  const fills = sparkHeight === 'fill'

  return (
    /* `graduated` : la carte de mesure est LE module de chiffres du site, et donc
       l'endroit où la signature se justifie. Voir `.graduated` dans globals.css. */
    <article className="graduated flex flex-col overflow-hidden rounded-card border border-border-subtle bg-surface transition-colors duration-150 hover:border-ink-muted/40">
      <div className={`flex flex-col gap-1 p-4 ${fills ? 'shrink-0' : 'flex-1'}`}>
        <div className="flex items-center justify-between gap-2">
          <h3 className="flex items-center gap-1.5 text-xs font-medium text-ink-muted">
            {icon ? (
              <span className="flex h-4 w-4 items-center justify-center" style={{ color }}>
                {icon}
              </span>
            ) : null}
            {label}
          </h3>
          {action}
        </div>

        {/* ── LE NOMBRE EST EN ENCRE, ET LA COULEUR RESTE À L'ICÔNE ───────────
            Il portait la couleur de la métrique. Cette couleur vient de la palette
            de DONNÉES, celle des séries de graphiques : posée sur une capitalisation
            ou un volume, elle disait « série » là où il n'y a qu'une valeur, et
            elle entrait en concurrence avec la seule couleur qui signifie quelque
            chose ici — celle de la hausse et de la baisse.

            La couleur reste sur l'ICÔNE et sur la courbe, où elle identifie la
            métrique sans rien prétendre du marché. Voir la doctrine de l'accent
            dans `globals.css`.

            `.figure` et non `.tabular` : à vingt-quatre pixels, l'espace des
            milliers d'une chasse fixe coupe le nombre en deux. */}
        <p className="figure text-2xl font-semibold leading-tight text-ink">{value}</p>

        {hint ? <p className="text-xs text-ink-muted">{hint}</p> : null}
      </div>

      {series && series.length > 1 ? (
        <div className={fills ? 'min-h-[56px] min-w-0 flex-1' : ''}>
          <AreaSpark data={series} color={color} height={sparkHeight} {...(format ? { format } : {})} />
        </div>
      ) : pending ? (
        /* ── LA COURBE QUI N'EXISTE PAS ENCORE LE DIT ────────────────────────
           Cette carte est étirée à la hauteur de sa voisine, et son tracé — calé
           en bas — occupe le vide comme un fond. Sans série, la hauteur restait
           et le contenu disparaissait : un trou de cent vingt pixels sous le
           chiffre, que rien n'expliquait.

           Un trou muet contredit la règle du produit — une donnée manquante se
           voit. La bande porte donc la même hachure que les valeurs absentes,
           avec la raison écrite dessus. Elle n'apparaît QUE si l'appelant fournit
           `pending` : une carte sans courbe par nature n'a rien à annoncer.

           EN MODE `'fill'`, LA HACHURE S'ÉTIRE au lieu de rester une bande basse.
           C'est la cohérence du motif : la hachure occupe la place que le tracé
           occuperait, donc toute la place quand le tracé la prendrait toute. Calée
           en bas dans une carte étirée, elle laissait au-dessus d'elle le trou
           qu'elle est justement chargée d'expliquer. */
        <div
          className={`mt-auto flex px-4 pb-3 ${
            fills ? 'min-h-[56px] flex-1 items-stretch' : 'items-end'
          }`}
          {...(fills ? {} : { style: { height: sparkHeight ?? 56 } })}
        >
          <p
            className={`w-full border-t border-border-subtle pt-2 text-[0.6875rem] leading-relaxed text-ink-muted ${
              fills ? 'flex-1' : ''
            }`}
            style={{
              backgroundImage:
                'repeating-linear-gradient(-45deg, var(--color-border-subtle) 0 1px, transparent 1px 5px)',
              backgroundSize: '100% 100%',
              backgroundClip: 'content-box',
            }}
          >
            <span className="bg-surface pr-1">{pending}</span>
          </p>
        </div>
      ) : null}
    </article>
  )
}
